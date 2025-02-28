# recommendation.py - Core recommendation engine for AI Talent Marketplace

# External imports
import numpy as np  # numpy - version 1.24.0
from typing import List, Dict, Optional, Union, Any, Tuple  # Standard library
import logging  # Standard library
from dataclasses import dataclass  # Standard library
from enum import Enum  # Standard library

# Internal imports
from ..config import settings  # Import configuration settings
from ..models.embedding import EmbeddingModel, EmbeddingModelFactory  # Import embedding models
from ..services.elasticsearch_service import ElasticsearchService, ElasticsearchServiceFactory  # Import ES service
from ..services.openai_service import OpenAIService, OpenAIServiceFactory  # Import OpenAI service
from ..utils.vector_utils import cosine_similarity, top_k_similarities  # Import vector utilities

# Set up logger
logger = logging.getLogger(__name__)

def calculate_skill_match_score(job_skills: List[str], freelancer_skills: List[str]) -> float:
    """
    Calculates a match score between job required skills and freelancer skills
    
    Args:
        job_skills: List of skills required for the job
        freelancer_skills: List of skills possessed by the freelancer
        
    Returns:
        A normalized score between 0 and 1 representing skill match percentage
    """
    # Handle empty input cases
    if not job_skills:
        logger.warning("Empty job skills list provided for skill matching")
        return 0.0
    
    if not freelancer_skills:
        logger.warning("Empty freelancer skills list provided for skill matching")
        return 0.0
    
    # Convert both skill lists to sets for easier comparison
    job_skills_set = set(skill.lower() for skill in job_skills)
    freelancer_skills_set = set(skill.lower() for skill in freelancer_skills)
    
    # Calculate intersection of skills (matching skills)
    matching_skills = job_skills_set.intersection(freelancer_skills_set)
    
    # Divide by the number of job skills required to get a percentage match
    # This prioritizes covering all the job requirements
    match_score = len(matching_skills) / len(job_skills_set)
    
    # Ensure score is between 0 and 1
    match_score = max(0.0, min(1.0, match_score))
    
    logger.debug(f"Skill match score: {match_score:.2f} ({len(matching_skills)} of {len(job_skills_set)} skills matched)")
    
    return match_score

def adjust_recommendation_score(
    similarity_score: float, 
    job_data: Dict, 
    profile_data: Dict
) -> float:
    """
    Adjust raw similarity score based on business rules and additional factors
    
    Args:
        similarity_score: Raw vector similarity score
        job_data: Job posting data
        profile_data: Freelancer profile data
        
    Returns:
        Adjusted recommendation score between 0 and 1
    """
    # Extract skills for skill match calculation
    job_skills = job_data.get('skills', [])
    profile_skills = profile_data.get('skills', [])
    
    # Calculate skill match score
    skill_match_score = calculate_skill_match_score(job_skills, profile_skills)
    
    # Calculate experience level compatibility
    job_experience_level = job_data.get('experience_level', '').lower()
    profile_experience_level = profile_data.get('experience_level', '').lower()
    
    # Map experience levels to numeric values for comparison
    experience_levels = {
        'beginner': 1,
        'entry': 1,
        'intermediate': 2,
        'mid-level': 2,
        'expert': 3,
        'senior': 3,
        'advanced': 3
    }
    
    job_experience_value = experience_levels.get(job_experience_level, 2)  # default to intermediate
    profile_experience_value = experience_levels.get(profile_experience_level, 2)  # default to intermediate
    
    # Experience match is better when freelancer's level >= job required level
    # but not too much higher (overqualified might be too expensive or not interested)
    exp_diff = profile_experience_value - job_experience_value
    if exp_diff < 0:
        # Freelancer is underqualified
        experience_match_score = 0.5  # Partial match
    elif exp_diff == 0:
        # Perfect match
        experience_match_score = 1.0
    else:
        # Freelancer is overqualified
        experience_match_score = 0.8  # Good but not perfect match
    
    # Calculate rate/budget compatibility
    job_budget = job_data.get('budget', 0)
    profile_rate = profile_data.get('hourly_rate', 0)
    
    rate_match_score = 1.0  # Default to perfect match
    
    if job_budget > 0 and profile_rate > 0:
        if profile_rate > job_budget:
            # Freelancer's rate exceeds job budget
            # Calculate how much over budget (e.g., 20% over = 0.8 score)
            rate_ratio = job_budget / profile_rate
            rate_match_score = max(0.0, min(1.0, rate_ratio))
    
    # Apply weighted formula:
    # 50% similarity + 30% skills + 10% experience + 10% rate
    adjusted_score = (
        0.5 * similarity_score +
        0.3 * skill_match_score +
        0.1 * experience_match_score +
        0.1 * rate_match_score
    )
    
    # Ensure final score is between 0 and 1
    adjusted_score = max(0.0, min(1.0, adjusted_score))
    
    logger.debug(f"Adjusted score: {adjusted_score:.2f} (similarity: {similarity_score:.2f}, "
                f"skills: {skill_match_score:.2f}, experience: {experience_match_score:.2f}, "
                f"rate: {rate_match_score:.2f})")
    
    return adjusted_score

def filter_recommendations(
    recommendations: List[Dict], 
    threshold: float, 
    filters: Dict = None
) -> List[Dict]:
    """
    Filter recommendation results based on threshold and additional criteria
    
    Args:
        recommendations: List of recommendation results
        threshold: Minimum score threshold
        filters: Additional filter criteria
        
    Returns:
        Filtered recommendations sorted by score
    """
    # Start with threshold filter
    filtered_results = [rec for rec in recommendations if rec.get('score', 0) >= threshold]
    
    # Apply additional filters if provided
    if filters:
        for key, value in filters.items():
            if key == 'location':
                # Example: filter by location
                filtered_results = [
                    rec for rec in filtered_results 
                    if rec.get('data', {}).get('location', '').lower() == value.lower()
                ]
            elif key == 'availability':
                # Example: filter by availability
                filtered_results = [
                    rec for rec in filtered_results 
                    if rec.get('data', {}).get('availability', '') == value
                ]
            elif key == 'min_experience':
                # Example: filter by minimum experience years
                min_years = float(value)
                filtered_results = [
                    rec for rec in filtered_results 
                    if float(rec.get('data', {}).get('experience_years', 0)) >= min_years
                ]
            # Add more filters as needed
    
    # Sort by score in descending order
    filtered_results.sort(key=lambda x: x.get('score', 0), reverse=True)
    
    return filtered_results

def format_recommendation_result(
    raw_recommendations: List[Dict], 
    include_explanation: bool = False
) -> List[Dict]:
    """
    Format raw recommendation data into standardized response structure
    
    Args:
        raw_recommendations: Raw recommendation results
        include_explanation: Whether to include match explanations
        
    Returns:
        Formatted recommendation results
    """
    formatted_results = []
    
    for i, rec in enumerate(raw_recommendations):
        # Extract basic information
        item_id = rec.get('id') or rec.get('data', {}).get('id')
        score = rec.get('score', 0.0)
        data = rec.get('data', {})
        
        # Create standard format
        formatted_rec = {
            'id': item_id,
            'score': round(score, 4),
            'rank': i + 1,
            'data': data
        }
        
        # Add explanation if requested
        if include_explanation and 'explanation' in rec:
            formatted_rec['explanation'] = rec['explanation']
        
        formatted_results.append(formatted_rec)
    
    return formatted_results

class RecommendationEngine:
    """
    Core engine for generating AI-powered recommendations between jobs and profiles
    """
    
    def __init__(
        self,
        embedding_model: EmbeddingModel = None,
        es_service: ElasticsearchService = None,
        openai_service: OpenAIService = None,
        max_recommendations: int = None,
        min_score: float = None
    ):
        """
        Initialize the recommendation engine with required services
        
        Args:
            embedding_model: Model for generating embeddings
            es_service: ElasticSearch service for vector search
            openai_service: OpenAI service for generating explanations
            max_recommendations: Maximum number of recommendations to return
            min_score: Minimum score threshold for recommendations
        """
        # Set embedding model from parameter or get from factory
        self.embedding_model = embedding_model or EmbeddingModelFactory.get_instance()
        
        # Set ElasticSearch service from parameter or get from factory
        self.es_service = es_service or ElasticsearchServiceFactory.get_instance()
        
        # Set OpenAI service from parameter or get from factory
        self.openai_service = openai_service or OpenAIServiceFactory.get_instance()
        
        # Set max recommendations from parameter or settings
        self.max_recommendations = max_recommendations or settings.MAX_RECOMMENDATIONS
        
        # Set minimum score from parameter or settings
        self.min_score = min_score or settings.DEFAULT_MIN_SCORE
        
        logger.info(f"Initialized RecommendationEngine with max_recommendations={self.max_recommendations}, "
                   f"min_score={self.min_score}")
    
    def recommend_jobs_for_freelancer(
        self,
        profile_data: Dict,
        available_jobs: List[Dict],
        limit: int = None,
        filters: Dict = None,
        include_explanation: bool = False
    ) -> List[Dict]:
        """
        Find suitable jobs for a freelancer profile
        
        Args:
            profile_data: Freelancer profile data
            available_jobs: List of available jobs to match against
            limit: Maximum number of recommendations to return
            filters: Additional filter criteria
            include_explanation: Whether to include match explanations
            
        Returns:
            Ranked job recommendations with scores
        """
        # Set limit from parameter or default
        limit = limit or self.max_recommendations
        
        # Generate embedding for freelancer profile
        logger.debug(f"Generating embedding for profile {profile_data.get('id')}")
        profile_embedding = self.embedding_model.embed_profile(profile_data)
        
        # Initialize results
        results = []
        
        # Process each job to find matches
        for job in available_jobs:
            # Generate job embedding if not already present
            job_embedding = None
            if 'embedding' in job and isinstance(job['embedding'], list):
                job_embedding = np.array(job['embedding'])
            else:
                logger.debug(f"Generating embedding for job {job.get('id')}")
                job_embedding = self.embedding_model.embed_job(job)
            
            # Calculate similarity between profile embedding and job embedding
            similarity = self.embedding_model.calculate_similarity(profile_embedding, job_embedding)
            
            # Adjust score based on skill match and other factors
            adjusted_score = adjust_recommendation_score(similarity, job, profile_data)
            
            # Add to results
            results.append({
                'id': job.get('id'),
                'score': adjusted_score,
                'data': job
            })
        
        # Filter results based on minimum score and other criteria
        filtered_results = filter_recommendations(results, self.min_score, filters)
        
        # Limit results
        limited_results = filtered_results[:limit]
        
        # Generate explanations if requested
        if include_explanation and limited_results:
            for result in limited_results:
                job_data = result['data']
                score = result['score']
                
                explanation = self.generate_match_explanation(
                    job_data, 
                    profile_data, 
                    score, 
                    match_type='job_to_profile'
                )
                
                result['explanation'] = explanation
        
        # Format and return recommendations
        return format_recommendation_result(limited_results, include_explanation)
    
    def recommend_freelancers_for_job(
        self,
        job_data: Dict,
        available_profiles: List[Dict],
        limit: int = None,
        filters: Dict = None,
        include_explanation: bool = False
    ) -> List[Dict]:
        """
        Find suitable freelancers for a job posting
        
        Args:
            job_data: Job posting data
            available_profiles: List of available freelancer profiles to match against
            limit: Maximum number of recommendations to return
            filters: Additional filter criteria
            include_explanation: Whether to include match explanations
            
        Returns:
            Ranked freelancer recommendations with scores
        """
        # Set limit from parameter or default
        limit = limit or self.max_recommendations
        
        # Generate embedding for job posting
        logger.debug(f"Generating embedding for job {job_data.get('id')}")
        job_embedding = self.embedding_model.embed_job(job_data)
        
        # Initialize results
        results = []
        
        # Process each profile to find matches
        for profile in available_profiles:
            # Generate profile embedding if not already present
            profile_embedding = None
            if 'embedding' in profile and isinstance(profile['embedding'], list):
                profile_embedding = np.array(profile['embedding'])
            else:
                logger.debug(f"Generating embedding for profile {profile.get('id')}")
                profile_embedding = self.embedding_model.embed_profile(profile)
            
            # Calculate similarity between job embedding and profile embedding
            similarity = self.embedding_model.calculate_similarity(job_embedding, profile_embedding)
            
            # Adjust score based on skill match and other factors
            adjusted_score = adjust_recommendation_score(similarity, job_data, profile)
            
            # Add to results
            results.append({
                'id': profile.get('id'),
                'score': adjusted_score,
                'data': profile
            })
        
        # Filter results based on minimum score and other criteria
        filtered_results = filter_recommendations(results, self.min_score, filters)
        
        # Limit results
        limited_results = filtered_results[:limit]
        
        # Generate explanations if requested
        if include_explanation and limited_results:
            for result in limited_results:
                profile_data = result['data']
                score = result['score']
                
                explanation = self.generate_match_explanation(
                    job_data, 
                    profile_data, 
                    score, 
                    match_type='profile_to_job'
                )
                
                result['explanation'] = explanation
        
        # Format and return recommendations
        return format_recommendation_result(limited_results, include_explanation)
    
    def batch_recommend_jobs(
        self,
        profiles: List[Dict],
        available_jobs: List[Dict],
        limit: int = None,
        filters: Dict = None
    ) -> Dict:
        """
        Generate job recommendations for multiple freelancers in batch
        
        Args:
            profiles: List of freelancer profiles
            available_jobs: List of available jobs to match against
            limit: Maximum number of recommendations per profile
            filters: Additional filter criteria
            
        Returns:
            Dictionary mapping profile IDs to their job recommendations
        """
        # Initialize results dictionary
        results = {}
        
        # Process each profile
        for profile in profiles:
            profile_id = profile.get('id')
            if not profile_id:
                logger.warning("Profile without ID skipped in batch recommendation")
                continue
            
            # Get recommendations for this profile
            profile_results = self.recommend_jobs_for_freelancer(
                profile_data=profile,
                available_jobs=available_jobs,
                limit=limit,
                filters=filters
            )
            
            # Store recommendations for this profile
            results[profile_id] = profile_results
        
        return results
    
    def batch_recommend_freelancers(
        self,
        jobs: List[Dict],
        available_profiles: List[Dict],
        limit: int = None,
        filters: Dict = None
    ) -> Dict:
        """
        Generate freelancer recommendations for multiple jobs in batch
        
        Args:
            jobs: List of job postings
            available_profiles: List of available freelancer profiles to match against
            limit: Maximum number of recommendations per job
            filters: Additional filter criteria
            
        Returns:
            Dictionary mapping job IDs to their freelancer recommendations
        """
        # Initialize results dictionary
        results = {}
        
        # Process each job
        for job in jobs:
            job_id = job.get('id')
            if not job_id:
                logger.warning("Job without ID skipped in batch recommendation")
                continue
            
            # Get recommendations for this job
            job_results = self.recommend_freelancers_for_job(
                job_data=job,
                available_profiles=available_profiles,
                limit=limit,
                filters=filters
            )
            
            # Store recommendations for this job
            results[job_id] = job_results
        
        return results
    
    def similarity_search(
        self,
        query_embedding: np.ndarray,
        candidates: List[Dict],
        embedding_field: str = 'embedding',
        top_k: int = 10
    ) -> List[Dict]:
        """
        Perform a vector similarity search for items similar to a query
        
        Args:
            query_embedding: Query vector
            candidates: List of candidate items with embeddings
            embedding_field: Field name containing embeddings
            top_k: Number of top results to return
            
        Returns:
            Ranked list of similar items with similarity scores
        """
        # Ensure query embedding is properly formatted
        query_embedding = query_embedding.flatten()
        
        # Extract embeddings from candidates if not already in vector form
        candidate_embeddings = []
        
        for i, candidate in enumerate(candidates):
            embedding = candidate.get(embedding_field)
            
            # Handle different embedding formats
            if embedding is None:
                logger.warning(f"No embedding found for candidate at index {i}, skipping")
                continue
                
            if isinstance(embedding, list):
                # Convert list to numpy array
                embedding = np.array(embedding)
            
            # Ensure embedding is flattened
            embedding = embedding.flatten()
            
            candidate_embeddings.append(embedding)
        
        # If no valid embeddings found, return empty list
        if not candidate_embeddings:
            return []
        
        # Use top_k_similarities function to find most similar vectors
        similarities = top_k_similarities(
            query_vector=query_embedding,
            vector_list=candidate_embeddings,
            k=min(top_k, len(candidate_embeddings))
        )
        
        # Format results with item data and similarity scores
        results = []
        for idx, score in similarities:
            # Add candidate data and score to results
            results.append({
                'id': candidates[idx].get('id'),
                'score': score,
                'data': candidates[idx]
            })
        
        return results
    
    def get_similar_jobs(
        self,
        reference_job: Dict,
        job_pool: List[Dict],
        limit: int = 10
    ) -> List[Dict]:
        """
        Find jobs similar to a reference job
        
        Args:
            reference_job: Reference job to find similar jobs for
            job_pool: Pool of jobs to search through
            limit: Maximum number of similar jobs to return
            
        Returns:
            List of similar jobs with similarity scores
        """
        # Generate embedding for reference job if not present
        job_embedding = None
        if 'embedding' in reference_job and isinstance(reference_job['embedding'], list):
            job_embedding = np.array(reference_job['embedding'])
        else:
            job_embedding = self.embedding_model.embed_job(reference_job)
        
        # Remove reference job from job pool to avoid self-matching
        reference_job_id = reference_job.get('id')
        filtered_job_pool = [job for job in job_pool if job.get('id') != reference_job_id]
        
        # Perform similarity search
        similar_jobs = self.similarity_search(
            query_embedding=job_embedding,
            candidates=filtered_job_pool,
            embedding_field='embedding',
            top_k=limit
        )
        
        # Format results as job recommendations
        return format_recommendation_result(similar_jobs)
    
    def get_similar_profiles(
        self,
        reference_profile: Dict,
        profile_pool: List[Dict],
        limit: int = 10
    ) -> List[Dict]:
        """
        Find profiles similar to a reference profile
        
        Args:
            reference_profile: Reference profile to find similar profiles for
            profile_pool: Pool of profiles to search through
            limit: Maximum number of similar profiles to return
            
        Returns:
            List of similar profiles with similarity scores
        """
        # Generate embedding for reference profile if not present
        profile_embedding = None
        if 'embedding' in reference_profile and isinstance(reference_profile['embedding'], list):
            profile_embedding = np.array(reference_profile['embedding'])
        else:
            profile_embedding = self.embedding_model.embed_profile(reference_profile)
        
        # Remove reference profile from profile pool to avoid self-matching
        reference_profile_id = reference_profile.get('id')
        filtered_profile_pool = [profile for profile in profile_pool if profile.get('id') != reference_profile_id]
        
        # Perform similarity search
        similar_profiles = self.similarity_search(
            query_embedding=profile_embedding,
            candidates=filtered_profile_pool,
            embedding_field='embedding',
            top_k=limit
        )
        
        # Format results as profile recommendations
        return format_recommendation_result(similar_profiles)
    
    def generate_match_explanation(
        self,
        item1: Dict,
        item2: Dict,
        score: float,
        match_type: str
    ) -> str:
        """
        Generate human-readable explanation for a match
        
        Args:
            item1: First item (job or profile)
            item2: Second item (profile or job)
            score: Match score
            match_type: Type of match ('job_to_profile' or 'profile_to_profile')
            
        Returns:
            Human-readable explanation of the match
        """
        # Determine if match is job-to-profile or profile-to-profile
        if match_type == 'job_to_profile':
            job_data = item1
            profile_data = item2
        elif match_type == 'profile_to_job':
            job_data = item2
            profile_data = item1
        else:
            # Profile-to-profile match
            profile1_data = item1
            profile2_data = item2
            
            # Extract relevant data
            profile1_skills = profile1_data.get('skills', [])
            profile2_skills = profile2_data.get('skills', [])
            
            # Calculate skill overlap
            profile1_skills_set = set(skill.lower() for skill in profile1_skills)
            profile2_skills_set = set(skill.lower() for skill in profile2_skills)
            skill_overlap = profile1_skills_set.intersection(profile2_skills_set)
            
            # Generate explanation
            profile1_name = profile1_data.get('name', 'Profile 1')
            profile2_name = profile2_data.get('name', 'Profile 2')
            
            explanation = (
                f"{profile1_name} and {profile2_name} share {len(skill_overlap)} skills including: "
                f"{', '.join(list(skill_overlap)[:5])}. "
                f"Their profiles have a {int(score * 100)}% similarity based on their expertise and experience."
            )
            
            return explanation
        
        # For job-to-profile matches, use OpenAI to generate natural language explanation
        try:
            explanation = self.openai_service.generate_match_explanation(
                job_data=job_data,
                profile_data=profile_data,
                match_score=score
            )
            return explanation
        except Exception as e:
            logger.error(f"Error generating match explanation with OpenAI: {str(e)}")
            
            # Fallback explanation if OpenAI fails
            job_title = job_data.get('title', 'This job')
            profile_name = profile_data.get('name', 'This candidate')
            job_skills = job_data.get('skills', [])
            profile_skills = profile_data.get('skills', [])
            
            # Calculate skill overlap
            job_skills_set = set(skill.lower() for skill in job_skills)
            profile_skills_set = set(skill.lower() for skill in profile_skills)
            matching_skills = job_skills_set.intersection(profile_skills_set)
            
            # Generate basic explanation
            explanation = (
                f"{profile_name} matches {job_title} with a score of {int(score * 100)}%. "
                f"The candidate possesses {len(matching_skills)} of the {len(job_skills)} required skills, "
                f"including: {', '.join(list(matching_skills)[:5])}."
            )
            
            return explanation

class JobRecommender:
    """
    Specialized recommender for finding jobs for AI professionals
    """
    
    def __init__(
        self,
        engine: RecommendationEngine = None,
        recommendation_weights: Dict = None
    ):
        """
        Initialize the job recommender with recommendation engine
        
        Args:
            engine: Recommendation engine instance
            recommendation_weights: Custom weights for scoring factors
        """
        # Set engine from parameter or create new instance
        self.engine = engine or RecommendationEngine()
        
        # Set recommendation weights from parameter or use defaults
        default_weights = {
            'similarity': 0.5,
            'skills': 0.3,
            'experience': 0.1,
            'rate': 0.1
        }
        
        self.recommendation_weights = recommendation_weights or default_weights
        
        # Validate weights format and values
        weight_sum = sum(self.recommendation_weights.values())
        if abs(weight_sum - 1.0) > 0.001:  # Allow small floating point error
            logger.warning(f"Recommendation weights do not sum to 1.0 (sum: {weight_sum}). Normalizing weights.")
            # Normalize weights to sum to 1.0
            for key in self.recommendation_weights:
                self.recommendation_weights[key] /= weight_sum
        
        logger.info(f"Initialized JobRecommender with weights: {self.recommendation_weights}")
    
    def get_recommendations(
        self,
        profile: Dict,
        available_jobs: List[Dict],
        limit: int = None,
        filters: Dict = None
    ) -> List[Dict]:
        """
        Get job recommendations for a freelancer profile
        
        Args:
            profile: Freelancer profile data
            available_jobs: List of available jobs to match against
            limit: Maximum number of recommendations to return
            filters: Additional filter criteria
            
        Returns:
            Recommendations with scores and explanations
        """
        # Apply job-specific pre-filtering to available jobs
        # For example, filter out jobs that are closed or filled
        pre_filtered_jobs = [
            job for job in available_jobs
            if job.get('status', '').lower() in ['open', 'active']
        ]
        
        # Call engine to get recommendations
        recommendations = self.engine.recommend_jobs_for_freelancer(
            profile_data=profile,
            available_jobs=pre_filtered_jobs,
            limit=limit,
            filters=filters,
            include_explanation=True  # Always include explanations for job recommendations
        )
        
        # Apply job-specific post-filtering to results if needed
        # This could include additional business logic based on the results
        
        # Return formatted recommendations
        return recommendations
    
    def explain_match(
        self,
        job: Dict,
        profile: Dict,
        score: float
    ) -> Dict:
        """
        Generate detailed explanation for job-profile match
        
        Args:
            job: Job posting data
            profile: Freelancer profile data
            score: Match score
            
        Returns:
            Detailed explanation with matching factors
        """
        # Calculate skill match percentage
        job_skills = job.get('skills', [])
        profile_skills = profile.get('skills', [])
        
        skill_match = calculate_skill_match_score(job_skills, profile_skills)
        
        # Identify matching skills
        job_skills_set = set(skill.lower() for skill in job_skills)
        profile_skills_set = set(skill.lower() for skill in profile_skills)
        matching_skills = list(job_skills_set.intersection(profile_skills_set))
        missing_skills = list(job_skills_set - profile_skills_set)
        
        # Evaluate experience level match
        job_experience_level = job.get('experience_level', '').lower()
        profile_experience_level = profile.get('experience_level', '').lower()
        
        # Experience levels mapped to values
        exp_levels = {
            'beginner': 1, 'entry': 1,
            'intermediate': 2, 'mid-level': 2,
            'expert': 3, 'senior': 3, 'advanced': 3
        }
        
        job_exp_value = exp_levels.get(job_experience_level, 2)
        profile_exp_value = exp_levels.get(profile_experience_level, 2)
        
        experience_match = "Exact Match" if job_exp_value == profile_exp_value else (
            "Overqualified" if profile_exp_value > job_exp_value else "Underqualified"
        )
        
        # Check budget/rate compatibility
        job_budget = job.get('budget', 0)
        profile_rate = profile.get('hourly_rate', 0)
        
        rate_compatible = (job_budget == 0 or profile_rate == 0 or profile_rate <= job_budget)
        rate_diff = job_budget - profile_rate if (job_budget > 0 and profile_rate > 0) else 0
        
        # Generate natural language explanation using OpenAI
        try:
            nl_explanation = self.engine.generate_match_explanation(
                job, profile, score, match_type='job_to_profile'
            )
        except Exception as e:
            logger.error(f"Error generating natural language explanation: {str(e)}")
            nl_explanation = (
                f"This job matches the freelancer profile with a {int(score * 100)}% overall score. "
                f"The candidate has {len(matching_skills)} of the {len(job_skills)} required skills."
            )
        
        # Return detailed explanation with factors
        return {
            'score': score,
            'skill_match': skill_match,
            'matching_skills': matching_skills,
            'missing_skills': missing_skills,
            'experience_match': experience_match,
            'rate_compatible': rate_compatible,
            'rate_difference': rate_diff,
            'explanation': nl_explanation
        }

class FreelancerRecommender:
    """
    Specialized recommender for finding AI professionals for jobs
    """
    
    def __init__(
        self,
        engine: RecommendationEngine = None,
        recommendation_weights: Dict = None
    ):
        """
        Initialize the freelancer recommender with recommendation engine
        
        Args:
            engine: Recommendation engine instance
            recommendation_weights: Custom weights for scoring factors
        """
        # Set engine from parameter or create new instance
        self.engine = engine or RecommendationEngine()
        
        # Set recommendation weights from parameter or use defaults
        default_weights = {
            'similarity': 0.5,
            'skills': 0.3,
            'experience': 0.1,
            'rate': 0.1
        }
        
        self.recommendation_weights = recommendation_weights or default_weights
        
        # Validate weights format and values
        weight_sum = sum(self.recommendation_weights.values())
        if abs(weight_sum - 1.0) > 0.001:  # Allow small floating point error
            logger.warning(f"Recommendation weights do not sum to 1.0 (sum: {weight_sum}). Normalizing weights.")
            # Normalize weights to sum to 1.0
            for key in self.recommendation_weights:
                self.recommendation_weights[key] /= weight_sum
        
        logger.info(f"Initialized FreelancerRecommender with weights: {self.recommendation_weights}")
    
    def get_recommendations(
        self,
        job: Dict,
        available_profiles: List[Dict],
        limit: int = None,
        filters: Dict = None
    ) -> List[Dict]:
        """
        Get freelancer recommendations for a job
        
        Args:
            job: Job posting data
            available_profiles: List of available freelancer profiles to match against
            limit: Maximum number of recommendations to return
            filters: Additional filter criteria
            
        Returns:
            Recommendations with scores and explanations
        """
        # Apply profile-specific pre-filtering to available profiles
        # For example, filter out profiles that are not available
        pre_filtered_profiles = [
            profile for profile in available_profiles
            if profile.get('status', '').lower() in ['available', 'active']
        ]
        
        # Call engine to get recommendations
        recommendations = self.engine.recommend_freelancers_for_job(
            job_data=job,
            available_profiles=pre_filtered_profiles,
            limit=limit,
            filters=filters,
            include_explanation=True  # Always include explanations for freelancer recommendations
        )
        
        # Apply profile-specific post-filtering to results if needed
        if job.get('required_availability'):
            recommendations = self.filter_by_availability(
                recommendations, 
                job.get('required_availability')
            )
        
        # Return formatted recommendations
        return recommendations
    
    def explain_match(
        self,
        job: Dict,
        profile: Dict,
        score: float
    ) -> Dict:
        """
        Generate detailed explanation for job-profile match
        
        Args:
            job: Job posting data
            profile: Freelancer profile data
            score: Match score
            
        Returns:
            Detailed explanation with matching factors
        """
        # Calculate skill match percentage
        job_skills = job.get('skills', [])
        profile_skills = profile.get('skills', [])
        
        skill_match = calculate_skill_match_score(job_skills, profile_skills)
        
        # Identify matching skills
        job_skills_set = set(skill.lower() for skill in job_skills)
        profile_skills_set = set(skill.lower() for skill in profile_skills)
        matching_skills = list(job_skills_set.intersection(profile_skills_set))
        missing_skills = list(job_skills_set - profile_skills_set)
        additional_skills = list(profile_skills_set - job_skills_set)
        
        # Evaluate experience level match
        job_experience_level = job.get('experience_level', '').lower()
        profile_experience_level = profile.get('experience_level', '').lower()
        
        # Experience levels mapped to values
        exp_levels = {
            'beginner': 1, 'entry': 1,
            'intermediate': 2, 'mid-level': 2,
            'expert': 3, 'senior': 3, 'advanced': 3
        }
        
        job_exp_value = exp_levels.get(job_experience_level, 2)
        profile_exp_value = exp_levels.get(profile_experience_level, 2)
        
        experience_match = "Exact Match" if job_exp_value == profile_exp_value else (
            "Overqualified" if profile_exp_value > job_exp_value else "Underqualified"
        )
        
        # Check budget/rate compatibility
        job_budget = job.get('budget', 0)
        profile_rate = profile.get('hourly_rate', 0)
        
        rate_compatible = (job_budget == 0 or profile_rate == 0 or profile_rate <= job_budget)
        rate_diff = job_budget - profile_rate if (job_budget > 0 and profile_rate > 0) else 0
        
        # Generate natural language explanation using OpenAI
        try:
            nl_explanation = self.engine.generate_match_explanation(
                job, profile, score, match_type='profile_to_job'
            )
        except Exception as e:
            logger.error(f"Error generating natural language explanation: {str(e)}")
            nl_explanation = (
                f"This freelancer matches the job with a {int(score * 100)}% overall score. "
                f"The candidate has {len(matching_skills)} of the {len(job_skills)} required skills."
            )
        
        # Return detailed explanation with factors
        return {
            'score': score,
            'skill_match': skill_match,
            'matching_skills': matching_skills,
            'missing_skills': missing_skills,
            'additional_skills': additional_skills,
            'experience_match': experience_match,
            'rate_compatible': rate_compatible,
            'rate_difference': rate_diff,
            'explanation': nl_explanation
        }
    
    def filter_by_availability(
        self,
        recommendations: List[Dict],
        required_availability: str
    ) -> List[Dict]:
        """
        Filter freelancer recommendations by availability
        
        Args:
            recommendations: List of freelancer recommendations
            required_availability: Required availability (e.g., 'full-time', 'part-time')
            
        Returns:
            Filtered recommendations
        """
        # Parse required availability parameter
        # This could be more sophisticated, handling availability ranges, etc.
        required_availability = required_availability.lower()
        
        # Map common availability terms to standardized format
        availability_map = {
            'fulltime': 'full-time',
            'full time': 'full-time',
            'parttime': 'part-time',
            'part time': 'part-time'
        }
        
        standardized_required = availability_map.get(required_availability, required_availability)
        
        # Filter recommendations by availability
        filtered_results = []
        
        for rec in recommendations:
            profile_data = rec.get('data', {})
            profile_availability = profile_data.get('availability', '').lower()
            standardized_profile = availability_map.get(profile_availability, profile_availability)
            
            # Check compatibility
            # Full-time freelancers can work on part-time jobs, but not vice versa
            if (standardized_profile == standardized_required or 
                (standardized_profile == 'full-time' and standardized_required == 'part-time')):
                filtered_results.append(rec)
        
        return filtered_results

class RecommendationEngineFactory:
    """
    Factory class for creating and managing RecommendationEngine instances
    """
    _instance = None
    
    def __init__(self):
        """
        Initialize the factory
        """
        pass
    
    @classmethod
    def get_instance(cls) -> RecommendationEngine:
        """
        Get or create a RecommendationEngine instance (singleton pattern)
        
        Returns:
            A RecommendationEngine instance
        """
        if cls._instance is None:
            # Create new instance with default settings
            cls._instance = RecommendationEngine(
                embedding_model=EmbeddingModelFactory.get_instance(),
                es_service=ElasticsearchServiceFactory.get_instance(),
                openai_service=OpenAIServiceFactory.get_instance(),
                max_recommendations=settings.MAX_RECOMMENDATIONS,
                min_score=settings.DEFAULT_MIN_SCORE
            )
            logger.info("Created new RecommendationEngine instance through factory")
        
        return cls._instance
    
    @classmethod
    def create_engine(
        cls,
        embedding_model: EmbeddingModel = None,
        es_service: ElasticsearchService = None,
        openai_service: OpenAIService = None,
        max_recommendations: int = None,
        min_score: float = None
    ) -> RecommendationEngine:
        """
        Create a new RecommendationEngine instance with custom settings
        
        Args:
            embedding_model: Model for generating embeddings
            es_service: ElasticSearch service for vector search
            openai_service: OpenAI service for generating explanations
            max_recommendations: Maximum number of recommendations to return
            min_score: Minimum score threshold for recommendations
            
        Returns:
            A new RecommendationEngine instance
        """
        # Create and return new instance (not singleton)
        engine = RecommendationEngine(
            embedding_model=embedding_model,
            es_service=es_service,
            openai_service=openai_service,
            max_recommendations=max_recommendations,
            min_score=min_score
        )
        
        logger.info("Created custom RecommendationEngine instance through factory")
        return engine