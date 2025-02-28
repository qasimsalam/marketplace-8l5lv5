# External imports
from fastapi import APIRouter, Depends, HTTPException, Body, Query, Path, Request
from typing import List, Dict, Optional, Union, Any
import numpy as np
import logging
from datetime import datetime

# Pydantic imports
from pydantic import BaseModel, Field

# Internal imports
from ..config import settings
from ..models.embedding import EmbeddingModelFactory
from ..models.recommendation import RecommendationEngineFactory, JobRecommender, FreelancerRecommender
from ..services.elasticsearch_service import ElasticsearchServiceFactory
from ..services.openai_service import OpenAIServiceFactory
from ..utils.vector_utils import normalize_vector

# Set up logger
logger = logging.getLogger(__name__)

# Initialize router with API prefix from settings
router = APIRouter(prefix=settings.API_PREFIX)

# Utility functions
def validate_min_score(min_score: float) -> float:
    """
    Validates that the provided minimum score is within valid range (0-1)
    
    Args:
        min_score: Minimum score threshold
        
    Returns:
        Validated minimum score
    """
    if min_score < 0:
        return 0.0
    elif min_score > 1:
        return 1.0
    return min_score

def apply_filters(query_params: dict) -> dict:
    """
    Applies filters to recommendation requests based on query parameters
    
    Args:
        query_params: Query parameters dictionary
        
    Returns:
        Formatted filters dictionary
    """
    filters = {}
    
    # Extract filter parameters
    for param, value in query_params.items():
        if param.startswith('filter_'):
            # Extract filter name (remove 'filter_' prefix)
            filter_name = param[7:]
            filters[filter_name] = value
    
    # Handle special filter types and conversions
    if 'skills' in filters and isinstance(filters['skills'], str):
        # Convert comma-separated skills to list
        filters['skills'] = [skill.strip() for skill in filters['skills'].split(',')]
    
    if 'experience_level' in filters:
        # Normalize experience level
        filters['experience_level'] = filters['experience_level'].lower()
    
    if 'min_rate' in filters:
        # Convert to float
        try:
            filters['min_rate'] = float(filters['min_rate'])
        except (ValueError, TypeError):
            del filters['min_rate']
    
    if 'max_rate' in filters:
        # Convert to float
        try:
            filters['max_rate'] = float(filters['max_rate'])
        except (ValueError, TypeError):
            del filters['max_rate']
    
    return filters

# Pydantic models
class JobEmbeddingRequest(BaseModel):
    """
    Pydantic model for job embedding request body validation
    """
    id: str
    title: str
    description: str
    required_skills: List[str]
    experience_level: str
    min_budget: float
    max_budget: float
    
    def to_dict(self) -> Dict:
        """
        Convert to dictionary format
        
        Returns:
            Job data dictionary
        """
        return self.model_dump()

class ProfileEmbeddingRequest(BaseModel):
    """
    Pydantic model for profile embedding request body validation
    """
    id: str
    name: str
    bio: str
    skills: List[str]
    experience: List[Dict]
    hourly_rate: float
    
    def to_dict(self) -> Dict:
        """
        Convert to dictionary format
        
        Returns:
            Profile data dictionary
        """
        return self.model_dump()

class EmbeddingResponse(BaseModel):
    """
    Pydantic model for embedding generation response
    """
    id: str
    embedding: List[float]
    dimension: int

class RecommendationRequest(BaseModel):
    """
    Pydantic model for recommendation request body validation
    """
    target: Dict
    candidates: List[Dict]
    limit: int = Field(default=settings.MAX_RECOMMENDATIONS)
    min_score: float = Field(default=settings.DEFAULT_MIN_SCORE)
    include_explanation: bool = Field(default=False)

class RecommendationResponse(BaseModel):
    """
    Pydantic model for recommendation response
    """
    recommendations: List[Dict]
    count: int
    metadata: Dict

class SkillsAnalysisRequest(BaseModel):
    """
    Pydantic model for skills analysis request body validation
    """
    job_description: str

class SkillsAnalysisResponse(BaseModel):
    """
    Pydantic model for skills analysis response
    """
    required_skills: List[str]
    nice_to_have_skills: List[str]
    recommendations: List[str]

# API Endpoints
@router.get("/health", summary="Health check endpoint")
async def health_check():
    """
    Returns the health status of the AI service and its dependencies
    """
    logger.info("Health check requested")
    
    try:
        # Initialize services
        embedding_service = EmbeddingModelFactory.get_instance()
        es_service = ElasticsearchServiceFactory.get_instance()
        openai_service = OpenAIServiceFactory.get_instance()
        
        # Collect health status from all services
        embedding_health = {
            "status": "healthy",
            "cache_stats": embedding_service.get_cache_stats()
        }
        
        es_health = es_service.health_check()
        openai_health = openai_service.health_check()
        
        # Aggregate health status
        overall_status = "healthy"
        if es_health.get("status") != "healthy" or openai_health.get("status") != "healthy":
            overall_status = "degraded"
        
        response = {
            "status": overall_status,
            "embedding_service": embedding_health,
            "elasticsearch_service": es_health,
            "openai_service": openai_health,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"Health check completed with status: {overall_status}")
        return response
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@router.post("/embeddings/job", response_model=EmbeddingResponse, summary="Generate job embedding")
async def generate_job_embedding(job_data: JobEmbeddingRequest):
    """
    Generates an embedding vector representation for a job posting
    """
    logger.info(f"Generating embedding for job: {job_data.id}")
    
    try:
        # Get embedding model
        embedding_model = EmbeddingModelFactory.get_instance()
        
        # Generate embedding
        job_dict = job_data.to_dict()
        embedding_vector = embedding_model.embed_job(job_dict)
        
        # Convert numpy array to list for JSON serialization
        embedding_list = embedding_vector.tolist()
        
        response = EmbeddingResponse(
            id=job_data.id,
            embedding=embedding_list,
            dimension=len(embedding_list)
        )
        
        logger.info(f"Successfully generated embedding for job: {job_data.id}")
        return response
        
    except Exception as e:
        logger.error(f"Error generating job embedding: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {str(e)}")

@router.post("/embeddings/profile", response_model=EmbeddingResponse, summary="Generate profile embedding")
async def generate_profile_embedding(profile_data: ProfileEmbeddingRequest):
    """
    Generates an embedding vector representation for a freelancer profile
    """
    logger.info(f"Generating embedding for profile: {profile_data.id}")
    
    try:
        # Get embedding model
        embedding_model = EmbeddingModelFactory.get_instance()
        
        # Generate embedding
        profile_dict = profile_data.to_dict()
        embedding_vector = embedding_model.embed_profile(profile_dict)
        
        # Convert numpy array to list for JSON serialization
        embedding_list = embedding_vector.tolist()
        
        response = EmbeddingResponse(
            id=profile_data.id,
            embedding=embedding_list,
            dimension=len(embedding_list)
        )
        
        logger.info(f"Successfully generated embedding for profile: {profile_data.id}")
        return response
        
    except Exception as e:
        logger.error(f"Error generating profile embedding: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {str(e)}")

@router.post("/embeddings/skills", response_model=EmbeddingResponse, summary="Generate skills embedding")
async def generate_skills_embedding(skills: List[str] = Body(...), id: str = Body("skills")):
    """
    Generates an embedding vector representation for a list of skills
    """
    logger.info(f"Generating embedding for skills list with {len(skills)} skills")
    
    try:
        # Get embedding model
        embedding_model = EmbeddingModelFactory.get_instance()
        
        # Generate embedding
        embedding_vector = embedding_model.embed_skills(skills)
        
        # Convert numpy array to list for JSON serialization
        embedding_list = embedding_vector.tolist()
        
        response = EmbeddingResponse(
            id=id,
            embedding=embedding_list,
            dimension=len(embedding_list)
        )
        
        logger.info(f"Successfully generated embedding for {len(skills)} skills")
        return response
        
    except Exception as e:
        logger.error(f"Error generating skills embedding: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {str(e)}")

@router.post("/recommendations/jobs", response_model=RecommendationResponse, summary="Recommend jobs for freelancer")
async def recommend_jobs_for_freelancer(request: RecommendationRequest):
    """
    Recommends suitable jobs for a freelancer profile based on AI matching
    """
    logger.info(f"Finding job recommendations for freelancer profile")
    
    try:
        # Validate min_score
        min_score = validate_min_score(request.min_score)
        
        # Get job recommender
        job_recommender = JobRecommender(
            engine=RecommendationEngineFactory.get_instance()
        )
        
        # Get recommendations
        recommendations = job_recommender.get_recommendations(
            profile=request.target,
            available_jobs=request.candidates,
            limit=request.limit,
            filters=None
        )
        
        # Prepare response
        response = RecommendationResponse(
            recommendations=recommendations,
            count=len(recommendations),
            metadata={
                "target_id": request.target.get("id"),
                "min_score": min_score,
                "include_explanation": request.include_explanation
            }
        )
        
        logger.info(f"Found {len(recommendations)} job recommendations for profile {request.target.get('id', 'unknown')}")
        return response
        
    except Exception as e:
        logger.error(f"Error generating job recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendations: {str(e)}")

@router.post("/recommendations/freelancers", response_model=RecommendationResponse, summary="Recommend freelancers for job")
async def recommend_freelancers_for_job(request: RecommendationRequest):
    """
    Recommends suitable freelancers for a job posting based on AI matching
    """
    logger.info(f"Finding freelancer recommendations for job")
    
    try:
        # Validate min_score
        min_score = validate_min_score(request.min_score)
        
        # Get freelancer recommender
        freelancer_recommender = FreelancerRecommender(
            engine=RecommendationEngineFactory.get_instance()
        )
        
        # Get recommendations
        recommendations = freelancer_recommender.get_recommendations(
            job=request.target,
            available_profiles=request.candidates,
            limit=request.limit,
            filters=None
        )
        
        # Prepare response
        response = RecommendationResponse(
            recommendations=recommendations,
            count=len(recommendations),
            metadata={
                "target_id": request.target.get("id"),
                "min_score": min_score,
                "include_explanation": request.include_explanation
            }
        )
        
        logger.info(f"Found {len(recommendations)} freelancer recommendations for job {request.target.get('id', 'unknown')}")
        return response
        
    except Exception as e:
        logger.error(f"Error generating freelancer recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendations: {str(e)}")

@router.post("/recommendations/similar-jobs", response_model=RecommendationResponse, summary="Find similar jobs")
async def find_similar_jobs(request: RecommendationRequest):
    """
    Finds jobs similar to a reference job posting
    """
    logger.info(f"Finding similar jobs for reference job")
    
    try:
        # Validate min_score
        min_score = validate_min_score(request.min_score)
        
        # Get recommendation engine
        recommendation_engine = RecommendationEngineFactory.get_instance()
        
        # Get similar jobs
        similar_jobs = recommendation_engine.get_similar_jobs(
            reference_job=request.target,
            job_pool=request.candidates,
            limit=request.limit
        )
        
        # Prepare response
        response = RecommendationResponse(
            recommendations=similar_jobs,
            count=len(similar_jobs),
            metadata={
                "target_id": request.target.get("id"),
                "min_score": min_score
            }
        )
        
        logger.info(f"Found {len(similar_jobs)} similar jobs for job {request.target.get('id', 'unknown')}")
        return response
        
    except Exception as e:
        logger.error(f"Error finding similar jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to find similar jobs: {str(e)}")

@router.post("/recommendations/similar-profiles", response_model=RecommendationResponse, summary="Find similar profiles")
async def find_similar_profiles(request: RecommendationRequest):
    """
    Finds freelancer profiles similar to a reference profile
    """
    logger.info(f"Finding similar profiles for reference profile")
    
    try:
        # Validate min_score
        min_score = validate_min_score(request.min_score)
        
        # Get recommendation engine
        recommendation_engine = RecommendationEngineFactory.get_instance()
        
        # Get similar profiles
        similar_profiles = recommendation_engine.get_similar_profiles(
            reference_profile=request.target,
            profile_pool=request.candidates,
            limit=request.limit
        )
        
        # Prepare response
        response = RecommendationResponse(
            recommendations=similar_profiles,
            count=len(similar_profiles),
            metadata={
                "target_id": request.target.get("id"),
                "min_score": min_score
            }
        )
        
        logger.info(f"Found {len(similar_profiles)} similar profiles for profile {request.target.get('id', 'unknown')}")
        return response
        
    except Exception as e:
        logger.error(f"Error finding similar profiles: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to find similar profiles: {str(e)}")

@router.post("/analysis/skills", response_model=SkillsAnalysisResponse, summary="Analyze job skills")
async def analyze_job_skills(request: SkillsAnalysisRequest):
    """
    Analyzes a job description to extract required and nice-to-have AI skills
    """
    logger.info(f"Analyzing job description for skills")
    
    try:
        # Get OpenAI service
        openai_service = OpenAIServiceFactory.get_instance()
        
        # Analyze job description
        analysis_result = openai_service.analyze_job_skills(request.job_description)
        
        # Extract relevant data
        required_skills = analysis_result.get("required_skills", [])
        nice_to_have_skills = analysis_result.get("nice_to_have_skills", [])
        recommendations = analysis_result.get("recommendations", [])
        
        response = SkillsAnalysisResponse(
            required_skills=required_skills,
            nice_to_have_skills=nice_to_have_skills,
            recommendations=recommendations
        )
        
        logger.info(f"Successfully analyzed job description and extracted {len(required_skills)} required skills")
        return response
        
    except Exception as e:
        logger.error(f"Error analyzing job skills: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze job skills: {str(e)}")

@router.post("/match/explain", summary="Explain match")
async def explain_match(
    job_data: Dict = Body(...),
    profile_data: Dict = Body(...),
    score: float = Body(...)
):
    """
    Generates a human-readable explanation for a job-freelancer match
    """
    logger.info(f"Generating match explanation between job and profile")
    
    try:
        # Get OpenAI service
        openai_service = OpenAIServiceFactory.get_instance()
        
        # Generate explanation
        explanation = openai_service.generate_match_explanation(
            job_data=job_data,
            profile_data=profile_data,
            match_score=score
        )
        
        response = {
            "job_id": job_data.get("id"),
            "profile_id": profile_data.get("id"),
            "score": score,
            "explanation": explanation
        }
        
        logger.info(f"Successfully generated match explanation")
        return response
        
    except Exception as e:
        logger.error(f"Error generating match explanation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate match explanation: {str(e)}")

@router.post("/search/vector", summary="Vector search")
async def perform_vector_search(
    vector: List[float] = Body(...),
    index: str = Body(...),
    size: int = Body(10),
    min_score: float = Body(settings.DEFAULT_MIN_SCORE),
    filters: Dict = Body(None)
):
    """
    Performs a vector similarity search using the provided embedding
    """
    logger.info(f"Performing vector search on index: {index}")
    
    try:
        # Get Elasticsearch service
        es_service = ElasticsearchServiceFactory.get_instance()
        
        # Convert list to numpy array
        query_vector = np.array(vector)
        
        # Normalize vector
        query_vector = normalize_vector(query_vector)
        
        # Perform vector search
        results = es_service.vector_search(
            query_vector=query_vector,
            index_name=index,
            size=size,
            min_score=min_score,
            filters=filters
        )
        
        logger.info(f"Vector search completed with {len(results)} results")
        return results
        
    except Exception as e:
        logger.error(f"Error performing vector search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to perform vector search: {str(e)}")

@router.get("/search/text", summary="Text search")
async def perform_text_search(
    request: Request,
    query: str = Query(...),
    index: str = Query(...),
    fields: Optional[str] = Query(None),
    size: int = Query(10)
):
    """
    Performs a text-based search for jobs or profiles
    """
    logger.info(f"Performing text search on index: {index} with query: {query}")
    
    try:
        # Get Elasticsearch service
        es_service = ElasticsearchServiceFactory.get_instance()
        
        # Parse fields if provided
        search_fields = None
        if fields:
            search_fields = [field.strip() for field in fields.split(',')]
        
        # Convert query params to dict
        query_params = dict(request.query_params)
        
        # Prepare filters from query parameters
        filters = apply_filters(query_params)
        
        # Perform text search
        results = es_service.text_search(
            query_text=query,
            index_name=index,
            fields=search_fields,
            size=size,
            filters=filters
        )
        
        logger.info(f"Text search completed with {len(results)} results")
        return results
        
    except Exception as e:
        logger.error(f"Error performing text search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to perform text search: {str(e)}")

@router.get("/search/skills", summary="Skills search")
async def search_by_skills(
    request: Request,
    skills: str = Query(...),
    index: str = Query(...),
    size: int = Query(10)
):
    """
    Searches for jobs or profiles matching specific skills
    """
    logger.info(f"Performing skills search on index: {index} with skills: {skills}")
    
    try:
        # Get Elasticsearch service
        es_service = ElasticsearchServiceFactory.get_instance()
        
        # Parse skills
        skills_list = [skill.strip() for skill in skills.split(',')]
        
        # Convert query params to dict
        query_params = dict(request.query_params)
        
        # Prepare filters from query parameters
        filters = apply_filters(query_params)
        
        # Perform skills search
        results = es_service.search_by_skills(
            skills=skills_list,
            index_name=index,
            limit=size,
            filters=filters
        )
        
        logger.info(f"Skills search completed with {len(results)} results")
        return results
        
    except Exception as e:
        logger.error(f"Error performing skills search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to perform skills search: {str(e)}")