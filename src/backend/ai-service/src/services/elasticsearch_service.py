"""
Elasticsearch Service for AI Talent Marketplace

This module provides an Elasticsearch service implementation for the 
AI Talent Marketplace platform, handling vector search capabilities
and AI-powered matching between jobs and freelancer profiles.
"""

import logging
import json
from typing import List, Dict, Optional, Union, Any
from datetime import datetime

# elasticsearch - version 8.10.0
from elasticsearch import Elasticsearch, NotFoundError, TransportError

# numpy - version 1.24.0
import numpy as np

# tenacity - version 8.2.2
import tenacity

# Import settings
from ..config import settings

# Import embedding model
from ..models.embedding import EmbeddingModel, EmbeddingModelFactory

# Import vector utilities
from ..utils.vector_utils import cosine_similarity, normalize_vector

# Set up logger
logger = logging.getLogger(__name__)


def create_index_name(index_type: str) -> str:
    """
    Creates a properly formatted index name with prefix
    
    Args:
        index_type: Type of index (e.g., 'jobs', 'profiles')
        
    Returns:
        Formatted index name
    """
    return f"{settings.ELASTICSEARCH_INDEX_PREFIX}{index_type.lower()}"


def create_index_mapping(index_type: str, embedding_dimension: int) -> dict:
    """
    Creates Elasticsearch mapping for vector search capabilities
    
    Args:
        index_type: Type of index ('jobs' or 'profiles')
        embedding_dimension: Dimension of embedding vectors
        
    Returns:
        Elasticsearch mapping configuration
    """
    # Base mapping with common fields
    base_mapping = {
        "dynamic": "strict",
        "properties": {
            "id": {"type": "keyword"},
            "embedding": {
                "type": "dense_vector",
                "dims": embedding_dimension,
                "index": True,
                "similarity": "cosine"
            },
            "created_at": {"type": "date"},
            "updated_at": {"type": "date"},
            "skills": {"type": "keyword"}
        }
    }
    
    # Add specific fields based on index type
    if index_type == "jobs":
        base_mapping["properties"].update({
            "title": {
                "type": "text",
                "analyzer": "english",
                "fields": {
                    "keyword": {"type": "keyword"}
                }
            },
            "description": {
                "type": "text",
                "analyzer": "english"
            },
            "budget": {"type": "float"},
            "duration": {"type": "integer"},
            "client_id": {"type": "keyword"},
            "status": {"type": "keyword"},
            "location": {"type": "keyword"},
            "job_type": {"type": "keyword"},
            "experience_level": {"type": "keyword"}
        })
    elif index_type == "profiles":
        base_mapping["properties"].update({
            "name": {
                "type": "text",
                "fields": {
                    "keyword": {"type": "keyword"}
                }
            },
            "bio": {"type": "text", "analyzer": "english"},
            "hourly_rate": {"type": "float"},
            "user_id": {"type": "keyword"},
            "experience": {
                "type": "nested",
                "properties": {
                    "title": {"type": "text"},
                    "description": {"type": "text"},
                    "duration": {"type": "integer"}
                }
            },
            "availability": {"type": "keyword"},
            "location": {"type": "keyword"},
            "languages": {"type": "keyword"},
            "verification_level": {"type": "keyword"}
        })
    
    return base_mapping


def format_search_results(es_response: dict) -> List[dict]:
    """
    Formats Elasticsearch search results into standardized response format
    
    Args:
        es_response: Raw Elasticsearch response
        
    Returns:
        Formatted search results with scores
    """
    hits = es_response.get("hits", {}).get("hits", [])
    results = []
    
    for hit in hits:
        source = hit.get("_source", {})
        # Remove embedding from result to reduce payload size
        if "embedding" in source:
            del source["embedding"]
            
        results.append({
            "id": hit.get("_id"),
            "score": hit.get("_score", 0.0),
            "data": source
        })
    
    return results


class ElasticsearchService:
    """
    Service class for interacting with Elasticsearch for vector search and matching
    """
    
    def __init__(
        self,
        host: str = None,
        port: int = None,
        username: str = None,
        password: str = None,
        index_prefix: str = None,
        embedding_dimension: int = None,
        embedding_model: EmbeddingModel = None
    ):
        """
        Initialize Elasticsearch service with connection parameters and indices
        
        Args:
            host: Elasticsearch host address
            port: Elasticsearch port
            username: Elasticsearch username
            password: Elasticsearch password
            index_prefix: Prefix for Elasticsearch indices
            embedding_dimension: Dimension of embedding vectors
            embedding_model: Model for generating embeddings
        """
        # Set connection parameters from args or settings
        self.host = host or settings.ELASTICSEARCH_HOST
        self.port = port or settings.ELASTICSEARCH_PORT
        self.username = username or settings.ELASTICSEARCH_USERNAME
        self.password = password or settings.ELASTICSEARCH_PASSWORD
        self.index_prefix = index_prefix or settings.ELASTICSEARCH_INDEX_PREFIX
        self.embedding_dimension = embedding_dimension or settings.EMBEDDING_DIMENSION
        
        # Set index names
        self.jobs_index = create_index_name("jobs")
        self.profiles_index = create_index_name("profiles")
        
        # Initialize embedding model
        self.embedding_model = embedding_model or EmbeddingModelFactory.get_instance()
        
        # Connect to Elasticsearch
        self.client = self.connect()
        
        # Initialize indices
        self.initialize_indices()
        
        logger.info(f"Elasticsearch service initialized with indices: {self.jobs_index}, {self.profiles_index}")
    
    @tenacity.retry(stop=tenacity.stop_after_attempt(5), wait=tenacity.wait_exponential(min=1, max=10))
    def connect(self) -> Elasticsearch:
        """
        Connect to Elasticsearch cluster
        
        Returns:
            Elasticsearch client instance
        """
        # Construct URL based on whether auth is provided
        url = f"http://{self.host}:{self.port}"
        
        # Create client with authentication if provided
        if self.username and self.password:
            client = Elasticsearch(
                [url],
                basic_auth=(self.username, self.password),
                verify_certs=False
            )
        else:
            client = Elasticsearch([url], verify_certs=False)
        
        # Test connection
        info = client.info()
        logger.info(f"Connected to Elasticsearch cluster: {info['cluster_name']}")
        
        return client
    
    def initialize_indices(self) -> None:
        """
        Ensure required indices exist with proper mappings
        """
        # Check and create indices if they don't exist
        for index_type in ["jobs", "profiles"]:
            index_name = create_index_name(index_type)
            
            if not self.client.indices.exists(index=index_name):
                # Create index with mapping
                mapping = create_index_mapping(index_type, self.embedding_dimension)
                self.client.indices.create(
                    index=index_name,
                    body={
                        "settings": {
                            "number_of_shards": 3,
                            "number_of_replicas": 1
                        },
                        "mappings": mapping
                    }
                )
                logger.info(f"Created index: {index_name} with vector search capabilities")
            else:
                logger.info(f"Index already exists: {index_name}")
    
    @tenacity.retry(stop=tenacity.stop_after_attempt(3), wait=tenacity.wait_exponential(min=1, max=10))
    def index_job(self, job_data: dict, embedding: np.ndarray = None) -> str:
        """
        Index a job with its embedding vector for search
        
        Args:
            job_data: Job data to index
            embedding: Pre-generated embedding vector (optional)
            
        Returns:
            Indexed job ID
        """
        # Generate embedding if not provided
        if embedding is None:
            embedding = self.embedding_model.embed_job(job_data)
        
        # Ensure embedding is properly formatted
        embedding = normalize_vector(embedding)
        
        # Prepare document for indexing
        job_id = job_data.get("id", None)
        document = {
            **job_data,
            "embedding": embedding.tolist(),
            "updated_at": job_data.get("updated_at", None) or datetime.now().isoformat()
        }
        
        # Add created_at if not present
        if "created_at" not in document:
            document["created_at"] = document["updated_at"]
        
        # Index document
        response = self.client.index(
            index=self.jobs_index,
            id=job_id,
            document=document
        )
        
        logger.info(f"Indexed job with ID: {response['_id']}")
        return response["_id"]
    
    @tenacity.retry(stop=tenacity.stop_after_attempt(3), wait=tenacity.wait_exponential(min=1, max=10))
    def index_profile(self, profile_data: dict, embedding: np.ndarray = None) -> str:
        """
        Index a freelancer profile with its embedding vector for search
        
        Args:
            profile_data: Profile data to index
            embedding: Pre-generated embedding vector (optional)
            
        Returns:
            Indexed profile ID
        """
        # Generate embedding if not provided
        if embedding is None:
            embedding = self.embedding_model.embed_profile(profile_data)
        
        # Ensure embedding is properly formatted
        embedding = normalize_vector(embedding)
        
        # Prepare document for indexing
        profile_id = profile_data.get("id", None)
        document = {
            **profile_data,
            "embedding": embedding.tolist(),
            "updated_at": profile_data.get("updated_at", None) or datetime.now().isoformat()
        }
        
        # Add created_at if not present
        if "created_at" not in document:
            document["created_at"] = document["updated_at"]
        
        # Index document
        response = self.client.index(
            index=self.profiles_index,
            id=profile_id,
            document=document
        )
        
        logger.info(f"Indexed profile with ID: {response['_id']}")
        return response["_id"]
    
    @tenacity.retry(stop=tenacity.stop_after_attempt(3), wait=tenacity.wait_exponential(min=1, max=10))
    def update_job(self, job_data: dict, regenerate_embedding: bool = False) -> str:
        """
        Update an existing job document in Elasticsearch
        
        Args:
            job_data: Updated job data
            regenerate_embedding: Whether to regenerate the embedding
            
        Returns:
            Updated job ID
        """
        job_id = job_data.get("id")
        if not job_id:
            raise ValueError("Job ID must be provided for update")
        
        try:
            # Check if document exists
            existing_job = self.client.get(index=self.jobs_index, id=job_id)
            
            # Update document
            document = {**job_data}
            
            # Update embedding if requested
            if regenerate_embedding:
                embedding = self.embedding_model.embed_job(job_data)
                document["embedding"] = embedding.tolist()
            elif "embedding" not in document and "embedding" in existing_job["_source"]:
                # Keep existing embedding if not regenerating
                document["embedding"] = existing_job["_source"]["embedding"]
            
            # Update timestamps
            document["updated_at"] = datetime.now().isoformat()
            if "created_at" not in document and "created_at" in existing_job["_source"]:
                document["created_at"] = existing_job["_source"]["created_at"]
            
            # Update document
            response = self.client.index(
                index=self.jobs_index,
                id=job_id,
                document=document
            )
            
            logger.info(f"Updated job with ID: {response['_id']}")
            return response["_id"]
            
        except NotFoundError:
            logger.warning(f"Job with ID {job_id} not found for update, creating new document")
            return self.index_job(job_data)
    
    @tenacity.retry(stop=tenacity.stop_after_attempt(3), wait=tenacity.wait_exponential(min=1, max=10))
    def update_profile(self, profile_data: dict, regenerate_embedding: bool = False) -> str:
        """
        Update an existing profile document in Elasticsearch
        
        Args:
            profile_data: Updated profile data
            regenerate_embedding: Whether to regenerate the embedding
            
        Returns:
            Updated profile ID
        """
        profile_id = profile_data.get("id")
        if not profile_id:
            raise ValueError("Profile ID must be provided for update")
        
        try:
            # Check if document exists
            existing_profile = self.client.get(index=self.profiles_index, id=profile_id)
            
            # Update document
            document = {**profile_data}
            
            # Update embedding if requested
            if regenerate_embedding:
                embedding = self.embedding_model.embed_profile(profile_data)
                document["embedding"] = embedding.tolist()
            elif "embedding" not in document and "embedding" in existing_profile["_source"]:
                # Keep existing embedding if not regenerating
                document["embedding"] = existing_profile["_source"]["embedding"]
            
            # Update timestamps
            document["updated_at"] = datetime.now().isoformat()
            if "created_at" not in document and "created_at" in existing_profile["_source"]:
                document["created_at"] = existing_profile["_source"]["created_at"]
            
            # Update document
            response = self.client.index(
                index=self.profiles_index,
                id=profile_id,
                document=document
            )
            
            logger.info(f"Updated profile with ID: {response['_id']}")
            return response["_id"]
            
        except NotFoundError:
            logger.warning(f"Profile with ID {profile_id} not found for update, creating new document")
            return self.index_profile(profile_data)
    
    @tenacity.retry(stop=tenacity.stop_after_attempt(3), wait=tenacity.wait_exponential(min=1, max=10))
    def delete_job(self, job_id: str) -> bool:
        """
        Delete a job document from Elasticsearch
        
        Args:
            job_id: ID of job to delete
            
        Returns:
            Success status
        """
        try:
            # Delete document
            response = self.client.delete(index=self.jobs_index, id=job_id)
            logger.info(f"Deleted job with ID: {job_id}")
            return response["result"] == "deleted"
        except NotFoundError:
            logger.warning(f"Job with ID {job_id} not found for deletion")
            return False
    
    @tenacity.retry(stop=tenacity.stop_after_attempt(3), wait=tenacity.wait_exponential(min=1, max=10))
    def delete_profile(self, profile_id: str) -> bool:
        """
        Delete a profile document from Elasticsearch
        
        Args:
            profile_id: ID of profile to delete
            
        Returns:
            Success status
        """
        try:
            # Delete document
            response = self.client.delete(index=self.profiles_index, id=profile_id)
            logger.info(f"Deleted profile with ID: {profile_id}")
            return response["result"] == "deleted"
        except NotFoundError:
            logger.warning(f"Profile with ID {profile_id} not found for deletion")
            return False
    
    @tenacity.retry(stop=tenacity.stop_after_attempt(3), wait=tenacity.wait_exponential(min=1, max=10))
    def get_job(self, job_id: str) -> dict:
        """
        Retrieve a job document by ID
        
        Args:
            job_id: ID of job to retrieve
            
        Returns:
            Job document with embedding
        """
        try:
            # Get document
            response = self.client.get(index=self.jobs_index, id=job_id)
            logger.debug(f"Retrieved job with ID: {job_id}")
            return response["_source"]
        except NotFoundError:
            logger.warning(f"Job with ID {job_id} not found")
            return None
    
    @tenacity.retry(stop=tenacity.stop_after_attempt(3), wait=tenacity.wait_exponential(min=1, max=10))
    def get_profile(self, profile_id: str) -> dict:
        """
        Retrieve a profile document by ID
        
        Args:
            profile_id: ID of profile to retrieve
            
        Returns:
            Profile document with embedding
        """
        try:
            # Get document
            response = self.client.get(index=self.profiles_index, id=profile_id)
            logger.debug(f"Retrieved profile with ID: {profile_id}")
            return response["_source"]
        except NotFoundError:
            logger.warning(f"Profile with ID {profile_id} not found")
            return None
    
    @tenacity.retry(stop=tenacity.stop_after_attempt(3), wait=tenacity.wait_exponential(min=1, max=10))
    def vector_search(
        self, 
        query_vector: np.ndarray, 
        index_name: str, 
        size: int = 10,
        min_score: float = None,
        filters: dict = None
    ) -> List[dict]:
        """
        Perform embedding-based vector search
        
        Args:
            query_vector: Vector representation for similarity search
            index_name: Index to search against
            size: Number of results to return
            min_score: Minimum similarity score threshold
            filters: Additional query filters
            
        Returns:
            Search results with similarity scores
        """
        # Set default min_score if not provided
        min_score = min_score or settings.DEFAULT_MIN_SCORE
        
        # Create base query
        query = {
            "knn": {
                "field": "embedding",
                "query_vector": query_vector.tolist(),
                "k": size,
                "num_candidates": size * 2
            }
        }
        
        # Add filters if provided
        if filters:
            query = {
                "function_score": {
                    "query": {
                        "bool": {
                            "must": [
                                query,
                                {"bool": {"filter": []}}
                            ]
                        }
                    }
                }
            }
            
            # Add each filter
            for field, value in filters.items():
                if isinstance(value, list):
                    query["function_score"]["query"]["bool"]["must"][1]["bool"]["filter"].append(
                        {"terms": {field: value}}
                    )
                else:
                    query["function_score"]["query"]["bool"]["must"][1]["bool"]["filter"].append(
                        {"term": {field: value}}
                    )
        
        # Execute search
        response = self.client.search(
            index=index_name,
            body={
                "query": query,
                "_source": {"excludes": ["embedding"]},
                "size": size
            }
        )
        
        # Format and filter results
        results = format_search_results(response)
        
        # Filter by min_score
        results = [r for r in results if r["score"] >= min_score]
        
        return results
    
    @tenacity.retry(stop=tenacity.stop_after_attempt(3), wait=tenacity.wait_exponential(min=1, max=10))
    def text_search(
        self, 
        query_text: str, 
        index_name: str, 
        fields: List[str] = None,
        size: int = 10,
        filters: dict = None
    ) -> List[dict]:
        """
        Perform text-based search
        
        Args:
            query_text: Text query to search for
            index_name: Index to search against
            fields: Fields to search in
            size: Number of results to return
            filters: Additional query filters
            
        Returns:
            Search results with relevance scores
        """
        # Set default fields if not provided
        if not fields:
            if index_name == self.jobs_index:
                fields = ["title^3", "description", "skills^2"]
            else:
                fields = ["name^3", "bio", "skills^2"]
        
        # Create base query
        query = {
            "multi_match": {
                "query": query_text,
                "fields": fields,
                "type": "best_fields",
                "fuzziness": "AUTO"
            }
        }
        
        # Add filters if provided
        if filters:
            query = {
                "bool": {
                    "must": [query],
                    "filter": []
                }
            }
            
            # Add each filter
            for field, value in filters.items():
                if isinstance(value, list):
                    query["bool"]["filter"].append(
                        {"terms": {field: value}}
                    )
                else:
                    query["bool"]["filter"].append(
                        {"term": {field: value}}
                    )
        
        # Execute search
        response = self.client.search(
            index=index_name,
            body={
                "query": query,
                "_source": {"excludes": ["embedding"]},
                "size": size
            }
        )
        
        # Format results
        results = format_search_results(response)
        
        return results
    
    @tenacity.retry(stop=tenacity.stop_after_attempt(3), wait=tenacity.wait_exponential(min=1, max=10))
    def hybrid_search(
        self, 
        query_vector: np.ndarray, 
        query_text: str, 
        index_name: str, 
        size: int = 10,
        min_score: float = None,
        filters: dict = None,
        vector_weight: float = 0.7,
        text_weight: float = 0.3
    ) -> List[dict]:
        """
        Perform combined vector and text search for better results
        
        Args:
            query_vector: Vector representation for similarity search
            query_text: Text query to search for
            index_name: Index to search against
            size: Number of results to return
            min_score: Minimum similarity score threshold
            filters: Additional query filters
            vector_weight: Weight for vector similarity (0.0-1.0)
            text_weight: Weight for text relevance (0.0-1.0)
            
        Returns:
            Search results with combined scores
        """
        # Set default min_score if not provided
        min_score = min_score or settings.DEFAULT_MIN_SCORE
        
        # Create base query with both vector and text components
        query = {
            "function_score": {
                "query": {
                    "bool": {
                        "should": [
                            {
                                "multi_match": {
                                    "query": query_text,
                                    "fields": ["title^3", "description", "skills^2"] if index_name == self.jobs_index 
                                            else ["name^3", "bio", "skills^2"],
                                    "type": "best_fields",
                                    "fuzziness": "AUTO"
                                }
                            }
                        ]
                    }
                },
                "functions": [
                    {
                        "script_score": {
                            "script": {
                                "source": "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                                "params": {
                                    "query_vector": query_vector.tolist()
                                }
                            }
                        },
                        "weight": vector_weight
                    }
                ],
                "score_mode": "sum",
                "boost_mode": "multiply"
            }
        }
        
        # Add text weight
        query["function_score"]["query"]["bool"]["boost"] = text_weight
        
        # Add filters if provided
        if filters:
            query["function_score"]["query"]["bool"]["filter"] = []
            
            # Add each filter
            for field, value in filters.items():
                if isinstance(value, list):
                    query["function_score"]["query"]["bool"]["filter"].append(
                        {"terms": {field: value}}
                    )
                else:
                    query["function_score"]["query"]["bool"]["filter"].append(
                        {"term": {field: value}}
                    )
        
        # Execute search
        response = self.client.search(
            index=index_name,
            body={
                "query": query,
                "_source": {"excludes": ["embedding"]},
                "size": size
            }
        )
        
        # Format and filter results
        results = format_search_results(response)
        
        # Filter by min_score
        results = [r for r in results if r["score"] >= min_score]
        
        return results
    
    def find_matching_jobs_for_profile(
        self, 
        profile_data: dict, 
        limit: int = None, 
        min_score: float = None,
        filters: dict = None
    ) -> List[dict]:
        """
        Find suitable jobs for a freelancer profile using vector similarity
        
        Args:
            profile_data: Profile data to find matches for
            limit: Maximum number of matches to return
            min_score: Minimum similarity score threshold
            filters: Additional query filters
            
        Returns:
            Matching jobs with similarity scores
        """
        # Set defaults
        limit = limit or settings.MAX_RECOMMENDATIONS
        min_score = min_score or settings.DEFAULT_MIN_SCORE
        
        # Generate profile embedding if not already in the data
        embedding = None
        if "embedding" in profile_data and isinstance(profile_data["embedding"], list):
            embedding = np.array(profile_data["embedding"])
        else:
            embedding = self.embedding_model.embed_profile(profile_data)
        
        # Create job-specific filters based on profile attributes
        if filters is None:
            filters = {}
        
        # Add any profile-specific filtering logic here
        # For example, filter by skills, experience level, etc.
        
        # Perform vector search
        results = self.vector_search(
            query_vector=embedding,
            index_name=self.jobs_index,
            size=limit,
            min_score=min_score,
            filters=filters
        )
        
        return results
    
    def find_matching_profiles_for_job(
        self, 
        job_data: dict, 
        limit: int = None, 
        min_score: float = None,
        filters: dict = None
    ) -> List[dict]:
        """
        Find suitable freelancers for a job using vector similarity
        
        Args:
            job_data: Job data to find matches for
            limit: Maximum number of matches to return
            min_score: Minimum similarity score threshold
            filters: Additional query filters
            
        Returns:
            Matching profiles with similarity scores
        """
        # Set defaults
        limit = limit or settings.MAX_RECOMMENDATIONS
        min_score = min_score or settings.DEFAULT_MIN_SCORE
        
        # Generate job embedding if not already in the data
        embedding = None
        if "embedding" in job_data and isinstance(job_data["embedding"], list):
            embedding = np.array(job_data["embedding"])
        else:
            embedding = self.embedding_model.embed_job(job_data)
        
        # Create profile-specific filters based on job requirements
        if filters is None:
            filters = {}
        
        # Add any job-specific filtering logic here
        # For example, filter by skills, availability, etc.
        
        # Perform vector search
        results = self.vector_search(
            query_vector=embedding,
            index_name=self.profiles_index,
            size=limit,
            min_score=min_score,
            filters=filters
        )
        
        return results
    
    def find_similar_jobs(
        self, 
        reference_job: dict, 
        limit: int = 10, 
        min_score: float = 0.7
    ) -> List[dict]:
        """
        Find jobs similar to a reference job
        
        Args:
            reference_job: Reference job to find similar jobs for
            limit: Maximum number of similar jobs to return
            min_score: Minimum similarity score threshold
            
        Returns:
            Similar jobs with similarity scores
        """
        # Generate job embedding if not already in the data
        embedding = None
        if "embedding" in reference_job and isinstance(reference_job["embedding"], list):
            embedding = np.array(reference_job["embedding"])
        else:
            embedding = self.embedding_model.embed_job(reference_job)
        
        # Create filter to exclude the reference job itself
        filters = {}
        if "id" in reference_job:
            filters["id"] = {"must_not": reference_job["id"]}
        
        # Perform vector search
        results = self.vector_search(
            query_vector=embedding,
            index_name=self.jobs_index,
            size=limit,
            min_score=min_score,
            filters=filters
        )
        
        return results
    
    def find_similar_profiles(
        self, 
        reference_profile: dict, 
        limit: int = 10, 
        min_score: float = 0.7
    ) -> List[dict]:
        """
        Find profiles similar to a reference profile
        
        Args:
            reference_profile: Reference profile to find similar profiles for
            limit: Maximum number of similar profiles to return
            min_score: Minimum similarity score threshold
            
        Returns:
            Similar profiles with similarity scores
        """
        # Generate profile embedding if not already in the data
        embedding = None
        if "embedding" in reference_profile and isinstance(reference_profile["embedding"], list):
            embedding = np.array(reference_profile["embedding"])
        else:
            embedding = self.embedding_model.embed_profile(reference_profile)
        
        # Create filter to exclude the reference profile itself
        filters = {}
        if "id" in reference_profile:
            filters["id"] = {"must_not": reference_profile["id"]}
        
        # Perform vector search
        results = self.vector_search(
            query_vector=embedding,
            index_name=self.profiles_index,
            size=limit,
            min_score=min_score,
            filters=filters
        )
        
        return results
    
    def search_jobs_by_text(
        self, 
        query_text: str, 
        limit: int = 10, 
        filters: dict = None
    ) -> List[dict]:
        """
        Search jobs using text query
        
        Args:
            query_text: Text query for search
            limit: Maximum number of results to return
            filters: Additional query filters
            
        Returns:
            Matching jobs with relevance scores
        """
        # Perform text search
        results = self.text_search(
            query_text=query_text,
            index_name=self.jobs_index,
            fields=["title^3", "description", "skills^2"],
            size=limit,
            filters=filters
        )
        
        return results
    
    def search_profiles_by_text(
        self, 
        query_text: str, 
        limit: int = 10, 
        filters: dict = None
    ) -> List[dict]:
        """
        Search profiles using text query
        
        Args:
            query_text: Text query for search
            limit: Maximum number of results to return
            filters: Additional query filters
            
        Returns:
            Matching profiles with relevance scores
        """
        # Perform text search
        results = self.text_search(
            query_text=query_text,
            index_name=self.profiles_index,
            fields=["name^3", "bio", "skills^2"],
            size=limit,
            filters=filters
        )
        
        return results
    
    def search_by_skills(
        self, 
        skills: List[str], 
        index_name: str, 
        limit: int = 10, 
        filters: dict = None
    ) -> List[dict]:
        """
        Find jobs or profiles matching specific skills
        
        Args:
            skills: List of skills to match
            index_name: Index to search against
            limit: Maximum number of results to return
            filters: Additional query filters
            
        Returns:
            Matching documents with relevance scores
        """
        # Generate skills embedding
        skills_embedding = self.embedding_model.embed_skills(skills)
        
        # Construct skills text query
        skills_text = ", ".join(skills)
        
        # Perform hybrid search with both vector and skills text
        results = self.hybrid_search(
            query_vector=skills_embedding,
            query_text=skills_text,
            index_name=index_name,
            size=limit,
            filters=filters,
            vector_weight=0.6,  # Higher weight to vector similarity
            text_weight=0.4     # Lower weight to text matching
        )
        
        return results
    
    @tenacity.retry(stop=tenacity.stop_after_attempt(3), wait=tenacity.wait_exponential(min=1, max=10))
    def bulk_index_jobs(self, jobs: List[dict], generate_embeddings: bool = True) -> dict:
        """
        Index multiple jobs in a single bulk operation
        
        Args:
            jobs: List of job data objects to index
            generate_embeddings: Whether to generate embeddings for each job
            
        Returns:
            Bulk indexing operation results
        """
        # Prepare bulk operations
        operations = []
        
        for job in jobs:
            job_id = job.get("id")
            
            # Generate embedding if requested
            if generate_embeddings:
                embedding = self.embedding_model.embed_job(job)
                job["embedding"] = embedding.tolist()
            
            # Add timestamp if not present
            if "updated_at" not in job:
                job["updated_at"] = datetime.now().isoformat()
            if "created_at" not in job:
                job["created_at"] = job["updated_at"]
            
            # Add index operation
            operations.append({"index": {"_index": self.jobs_index, "_id": job_id}})
            operations.append(job)
        
        # Execute bulk operation
        if operations:
            response = self.client.bulk(body=operations)
            logger.info(f"Bulk indexed {len(jobs)} jobs")
            return response
        
        return {"errors": False, "took": 0, "items": []}
    
    @tenacity.retry(stop=tenacity.stop_after_attempt(3), wait=tenacity.wait_exponential(min=1, max=10))
    def bulk_index_profiles(self, profiles: List[dict], generate_embeddings: bool = True) -> dict:
        """
        Index multiple profiles in a single bulk operation
        
        Args:
            profiles: List of profile data objects to index
            generate_embeddings: Whether to generate embeddings for each profile
            
        Returns:
            Bulk indexing operation results
        """
        # Prepare bulk operations
        operations = []
        
        for profile in profiles:
            profile_id = profile.get("id")
            
            # Generate embedding if requested
            if generate_embeddings:
                embedding = self.embedding_model.embed_profile(profile)
                profile["embedding"] = embedding.tolist()
            
            # Add timestamp if not present
            if "updated_at" not in profile:
                profile["updated_at"] = datetime.now().isoformat()
            if "created_at" not in profile:
                profile["created_at"] = profile["updated_at"]
            
            # Add index operation
            operations.append({"index": {"_index": self.profiles_index, "_id": profile_id}})
            operations.append(profile)
        
        # Execute bulk operation
        if operations:
            response = self.client.bulk(body=operations)
            logger.info(f"Bulk indexed {len(profiles)} profiles")
            return response
        
        return {"errors": False, "took": 0, "items": []}
    
    def health_check(self) -> dict:
        """
        Check Elasticsearch cluster health and connection
        
        Returns:
            Health status information
        """
        try:
            # Check connection
            info = self.client.info()
            
            # Check cluster health
            health = self.client.cluster.health()
            
            # Check indices
            indices_stats = {
                "jobs": self.client.count(index=self.jobs_index)["count"],
                "profiles": self.client.count(index=self.profiles_index)["count"]
            }
            
            return {
                "status": "healthy" if health["status"] in ["green", "yellow"] else "unhealthy",
                "cluster_name": info["cluster_name"],
                "elasticsearch_version": info["version"]["number"],
                "cluster_status": health["status"],
                "indices": indices_stats
            }
            
        except Exception as e:
            logger.error(f"Error checking Elasticsearch health: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e)
            }


class ElasticsearchServiceFactory:
    """
    Factory class for creating and managing ElasticsearchService instances
    """
    _instance = None
    
    def __init__(self):
        """
        Initialize the factory class
        """
        pass
    
    @classmethod
    def get_instance(cls) -> ElasticsearchService:
        """
        Get or create an ElasticsearchService instance (singleton pattern)
        
        Returns:
            An ElasticsearchService instance
        """
        if cls._instance is None:
            logger.info("Creating new ElasticsearchService instance")
            cls._instance = ElasticsearchService(
                host=settings.ELASTICSEARCH_HOST,
                port=settings.ELASTICSEARCH_PORT,
                username=settings.ELASTICSEARCH_USERNAME,
                password=settings.ELASTICSEARCH_PASSWORD,
                index_prefix=settings.ELASTICSEARCH_INDEX_PREFIX,
                embedding_dimension=settings.EMBEDDING_DIMENSION
            )
        
        return cls._instance
    
    @classmethod
    def create_service(
        cls,
        host: str = None,
        port: int = None,
        username: str = None,
        password: str = None,
        index_prefix: str = None,
        embedding_dimension: int = None,
        embedding_model: EmbeddingModel = None
    ) -> ElasticsearchService:
        """
        Create a new ElasticsearchService instance with custom settings
        
        Args:
            host: Elasticsearch host address
            port: Elasticsearch port
            username: Elasticsearch username
            password: Elasticsearch password
            index_prefix: Prefix for Elasticsearch indices
            embedding_dimension: Dimension of embedding vectors
            embedding_model: Model for generating embeddings
            
        Returns:
            A new ElasticsearchService instance
        """
        logger.info("Creating custom ElasticsearchService instance")
        return ElasticsearchService(
            host=host,
            port=port,
            username=username,
            password=password,
            index_prefix=index_prefix,
            embedding_dimension=embedding_dimension,
            embedding_model=embedding_model
        )