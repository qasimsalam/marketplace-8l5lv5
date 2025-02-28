"""
Client utility module for interacting with the AI service to match jobs with freelancers.

This module provides a high-level interface for job matching, freelancer matching, and score
calculation while abstracting the complexity of embedding generation and vector search operations.
"""

import httpx  # v0.24.1
import asyncio  # standard library
import logging  # standard library
import json  # standard library
from typing import Dict, List, Any, Optional, Union  # standard library
import numpy as np  # v1.24.0
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type  # v8.2.2

from ..config import settings
from ..models.job import Job

# Set up logging
logger = logging.getLogger(__name__)

def format_job_for_matching(job_data: Dict) -> Dict:
    """
    Formats job data for the AI matching algorithm.
    
    Args:
        job_data: Raw job data dictionary
        
    Returns:
        Formatted job data optimized for matching
    """
    # If job_data is a Job instance, convert to dictionary using to_search_document
    if isinstance(job_data, Job):
        return job_data.to_search_document()
    
    # Extract relevant fields
    formatted_job = {
        "id": job_data.get("id"),
        "title": job_data.get("title", ""),
        "description": job_data.get("description", ""),
        "required_skills": [skill.get("name", "") for skill in job_data.get("required_skills", [])],
        "preferred_skills": [skill.get("name", "") for skill in job_data.get("preferred_skills", [])],
        "category": job_data.get("category", ""),
        "subcategory": job_data.get("subcategory", ""),
        "difficulty": job_data.get("difficulty", "")
    }
    
    # Create a full text field for improved matching
    full_text = f"{formatted_job['title']} {formatted_job['description']} " + \
                f"{' '.join(formatted_job['required_skills'])} " + \
                f"{' '.join(formatted_job['preferred_skills'])}"
    
    formatted_job["full_text"] = full_text
    
    return formatted_job

def format_profile_for_matching(profile_data: Dict) -> Dict:
    """
    Formats freelancer profile data for the AI matching algorithm.
    
    Args:
        profile_data: Raw profile data dictionary
        
    Returns:
        Formatted profile data optimized for matching
    """
    # Extract relevant fields
    formatted_profile = {
        "id": profile_data.get("id"),
        "name": profile_data.get("name", ""),
        "bio": profile_data.get("bio", ""),
        "skills": [skill.get("name", "") for skill in profile_data.get("skills", [])],
        "experience": profile_data.get("experience", []),
        "portfolio": profile_data.get("portfolio", [])
    }
    
    # Create a full text field for improved matching
    experience_text = " ".join([
        f"{exp.get('title', '')} {exp.get('description', '')}" 
        for exp in formatted_profile["experience"]
    ])
    
    portfolio_text = " ".join([
        f"{proj.get('title', '')} {proj.get('description', '')}" 
        for proj in formatted_profile["portfolio"]
    ])
    
    full_text = f"{formatted_profile['name']} {formatted_profile['bio']} " + \
                f"{' '.join(formatted_profile['skills'])} " + \
                f"{experience_text} {portfolio_text}"
    
    formatted_profile["full_text"] = full_text
    
    return formatted_profile

def extract_match_explanation(match_data: Dict) -> str:
    """
    Extracts user-friendly explanation from AI match response.
    
    Args:
        match_data: Match data containing explanation field
        
    Returns:
        Human-readable match explanation
    """
    explanation = match_data.get("explanation", "")
    
    if not explanation:
        return "No explanation provided by the AI matching service."
    
    # Clean up and format the explanation
    explanation = explanation.strip()
    
    return explanation

class AIMatchingClient:
    """
    Client for communicating with the AI service to perform job-freelancer matching.
    
    This client abstracts the complexity of embedding generation and vector search operations,
    providing a simple interface for matching jobs with freelancers.
    """
    
    def __init__(
        self, 
        base_url: Optional[str] = None,
        timeout: int = 30,
        retries: int = 3,
        match_threshold: Optional[int] = None,
        max_matches: Optional[int] = None
    ):
        """
        Initialize the AI matching client with connection parameters.
        
        Args:
            base_url: Base URL of the AI service. Defaults to settings.AI_SERVICE_URL
            timeout: Request timeout in seconds. Defaults to 30.
            retries: Number of retry attempts for failed requests. Defaults to 3.
            match_threshold: Minimum score (0-100) for matches. Defaults to settings.JOB_MATCH_THRESHOLD
            max_matches: Maximum number of matches to return. Defaults to settings.MAX_MATCHES
        """
        self.base_url = base_url or settings.AI_SERVICE_URL
        self.timeout = timeout
        self.retries = retries
        self.match_threshold = match_threshold or settings.JOB_MATCH_THRESHOLD
        self.max_matches = max_matches or settings.MAX_MATCHES
        
        # Initialize HTTP client
        self.client = httpx.AsyncClient(
            timeout=self.timeout,
            follow_redirects=True,
            headers={"Content-Type": "application/json"}
        )
        
        logger.info(f"Initialized AI matching client with base URL: {self.base_url}")
    
    async def find_matches_for_job(
        self,
        job_data: Dict,
        profiles: List[Dict],
        filters: Optional[Dict] = None,
        limit: Optional[int] = None,
        include_explanation: bool = False
    ) -> List[Dict]:
        """
        Find matching freelancer profiles for a job posting.
        
        Args:
            job_data: Job data dictionary
            profiles: List of profile dictionaries to match against
            filters: Additional filters to apply to results
            limit: Maximum number of matches to return (overrides instance setting)
            include_explanation: Whether to include match explanations
            
        Returns:
            List of matching profiles with scores and explanations
        """
        # Prepare job data
        formatted_job = format_job_for_matching(job_data)
        
        # Prepare profile data
        formatted_profiles = [format_profile_for_matching(profile) for profile in profiles]
        
        # Prepare request payload
        payload = {
            "target": formatted_job,
            "candidates": formatted_profiles,
            "threshold": self.match_threshold,
            "limit": limit or self.max_matches,
            "include_explanation": include_explanation
        }
        
        # Make request to AI service
        response = await self._make_request(
            method="POST",
            endpoint="/recommendations/freelancers",
            data=payload
        )
        
        # Process response
        matches = response.get("matches", [])
        
        # Apply additional filters if provided
        if filters:
            # Implementation would depend on filter structure
            # For simplicity, we'll just return all matches
            pass
        
        # Format matches
        return self._format_matches(matches, include_explanation)
    
    async def find_matches_for_profile(
        self,
        profile_data: Dict,
        jobs: List[Dict],
        filters: Optional[Dict] = None,
        limit: Optional[int] = None,
        include_explanation: bool = False
    ) -> List[Dict]:
        """
        Find matching job postings for a freelancer profile.
        
        Args:
            profile_data: Profile data dictionary
            jobs: List of job dictionaries to match against
            filters: Additional filters to apply to results
            limit: Maximum number of matches to return (overrides instance setting)
            include_explanation: Whether to include match explanations
            
        Returns:
            List of matching jobs with scores and explanations
        """
        # Prepare profile data
        formatted_profile = format_profile_for_matching(profile_data)
        
        # Prepare job data
        formatted_jobs = [format_job_for_matching(job) for job in jobs]
        
        # Prepare request payload
        payload = {
            "target": formatted_profile,
            "candidates": formatted_jobs,
            "threshold": self.match_threshold,
            "limit": limit or self.max_matches,
            "include_explanation": include_explanation
        }
        
        # Make request to AI service
        response = await self._make_request(
            method="POST",
            endpoint="/recommendations/jobs",
            data=payload
        )
        
        # Process response
        matches = response.get("matches", [])
        
        # Apply additional filters if provided
        if filters:
            # Implementation would depend on filter structure
            # For simplicity, we'll just return all matches
            pass
        
        # Format matches
        return self._format_matches(matches, include_explanation)
    
    async def calculate_match_score(
        self,
        job_data: Dict,
        profile_data: Dict,
        include_explanation: bool = True
    ) -> Dict:
        """
        Calculate match score between a specific job and profile.
        
        Args:
            job_data: Job data dictionary
            profile_data: Profile data dictionary
            include_explanation: Whether to include match explanation
            
        Returns:
            Match details with score and explanation
        """
        # Prepare data
        formatted_job = format_job_for_matching(job_data)
        formatted_profile = format_profile_for_matching(profile_data)
        
        # Prepare request payload
        payload = {
            "job": formatted_job,
            "profile": formatted_profile,
            "include_explanation": include_explanation
        }
        
        # Make request to AI service
        response = await self._make_request(
            method="POST",
            endpoint="/match/explain",
            data=payload
        )
        
        # Process response
        result = {
            "job_id": job_data.get("id"),
            "profile_id": profile_data.get("id"),
            "score": round(response.get("score", 0), 2),
        }
        
        if include_explanation:
            result["explanation"] = extract_match_explanation(response)
        
        return result
    
    async def find_similar_jobs(
        self,
        job_data: Dict,
        job_pool: List[Dict],
        limit: Optional[int] = None
    ) -> List[Dict]:
        """
        Find jobs similar to a specified job.
        
        Args:
            job_data: Reference job data dictionary
            job_pool: List of job dictionaries to find similarities from
            limit: Maximum number of similar jobs to return
            
        Returns:
            List of similar jobs with similarity scores
        """
        # Prepare job data
        formatted_job = format_job_for_matching(job_data)
        
        # Prepare job pool
        formatted_job_pool = [format_job_for_matching(job) for job in job_pool]
        
        # Prepare request payload
        payload = {
            "reference_job": formatted_job,
            "job_pool": formatted_job_pool,
            "limit": limit or self.max_matches
        }
        
        # Make request to AI service
        response = await self._make_request(
            method="POST",
            endpoint="/recommendations/similar-jobs",
            data=payload
        )
        
        # Process response
        similar_jobs = response.get("similar_jobs", [])
        
        result = []
        for job in similar_jobs:
            result.append({
                "job_id": job.get("id"),
                "similarity_score": round(job.get("similarity_score", 0), 2),
                "job_data": job.get("job_data", {})
            })
        
        return result
    
    async def analyze_job_skills(self, job_description: str) -> Dict:
        """
        Analyze job description to extract required skills.
        
        Args:
            job_description: Job description text
            
        Returns:
            Analysis with required and nice-to-have skills
        """
        # Prepare request payload
        payload = {
            "description": job_description
        }
        
        # Make request to AI service
        response = await self._make_request(
            method="POST",
            endpoint="/analysis/skills",
            data=payload
        )
        
        # Return skills analysis
        return {
            "required_skills": response.get("required_skills", []),
            "nice_to_have_skills": response.get("nice_to_have_skills", []),
            "confidence_score": response.get("confidence_score", 0)
        }
    
    async def batch_match_jobs(
        self,
        jobs: List[Dict],
        profiles: List[Dict],
        filters: Optional[Dict] = None,
        limit: Optional[int] = None
    ) -> Dict[str, List[Dict]]:
        """
        Process matches for multiple jobs in a batch operation.
        
        Args:
            jobs: List of job dictionaries
            profiles: List of profile dictionaries
            filters: Additional filters to apply to results
            limit: Maximum number of matches per job
            
        Returns:
            Mapping of job IDs to their matching profiles
        """
        batch_size = 10  # Process 10 jobs at a time
        results = {}
        
        # Format all profiles once
        formatted_profiles = [format_profile_for_matching(profile) for profile in profiles]
        
        # Process jobs in batches
        for i in range(0, len(jobs), batch_size):
            batch_jobs = jobs[i:i+batch_size]
            formatted_batch_jobs = [format_job_for_matching(job) for job in batch_jobs]
            
            # Prepare batch request payload
            payload = {
                "jobs": formatted_batch_jobs,
                "profiles": formatted_profiles,
                "threshold": self.match_threshold,
                "limit": limit or self.max_matches
            }
            
            # Make batch request
            response = await self._make_request(
                method="POST",
                endpoint="/recommendations/batch",
                data=payload
            )
            
            # Process batch response
            batch_results = response.get("results", {})
            
            for job_id, matches in batch_results.items():
                results[job_id] = self._format_matches(matches, include_explanation=False)
        
        return results
    
    async def get_ai_service_health(self) -> bool:
        """
        Check the health status of the AI matching service.
        
        Returns:
            True if service is healthy, False otherwise
        """
        try:
            response = await self._make_request(
                method="GET",
                endpoint="/health",
                data=None
            )
            return response.get("status") == "healthy"
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return False
    
    async def close(self) -> None:
        """
        Close the HTTP client and release resources.
        """
        if self.client:
            await self.client.aclose()
            logger.debug("Closed AI matching client")
    
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict:
        """
        Helper method to make HTTP requests with retry logic.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint
            data: Request data (for POST/PUT)
            params: Query parameters (for GET)
            
        Returns:
            API response data
            
        Raises:
            Exception: If the request fails after retries
        """
        url = f"{self.base_url}{endpoint}"
        
        @retry(
            stop=stop_after_attempt(self.retries),
            wait=wait_exponential(multiplier=1, min=2, max=10),
            retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException))
        )
        async def _execute_request():
            logger.debug(f"Making {method} request to {url}")
            
            if method.upper() == "GET":
                response = await self.client.get(url, params=params)
            elif method.upper() == "POST":
                response = await self.client.post(url, json=data)
            elif method.upper() == "PUT":
                response = await self.client.put(url, json=data)
            elif method.upper() == "DELETE":
                response = await self.client.delete(url, params=params)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            return response.json()
        
        try:
            return await _execute_request()
        except Exception as e:
            logger.error(f"Request to {url} failed after {self.retries} retries: {str(e)}")
            raise
    
    def _format_matches(self, matches: List[Dict], include_explanation: bool) -> List[Dict]:
        """
        Helper method to format match results consistently.
        
        Args:
            matches: List of raw match results
            include_explanation: Whether to include explanations
            
        Returns:
            Formatted match results
        """
        formatted_matches = []
        
        for match in matches:
            result = {
                "id": match.get("id"),
                "score": round(match.get("score", 0), 2),
                "data": match.get("data", {})
            }
            
            if include_explanation and "explanation" in match:
                result["explanation"] = extract_match_explanation(match)
            
            formatted_matches.append(result)
        
        return formatted_matches


class AIMatchingClientFactory:
    """
    Factory class for creating and managing AIMatchingClient instances.
    
    This implements the singleton pattern to reuse client instances.
    """
    
    _instance = None
    
    def __init__(self):
        """
        Initialize the factory class.
        """
        pass
    
    @classmethod
    def get_instance(cls) -> AIMatchingClient:
        """
        Get or create an AIMatchingClient instance (singleton pattern).
        
        Returns:
            An AIMatchingClient instance
        """
        if cls._instance is None:
            cls._instance = AIMatchingClient(
                base_url=settings.AI_SERVICE_URL,
                match_threshold=settings.JOB_MATCH_THRESHOLD,
                max_matches=settings.MAX_MATCHES
            )
        
        return cls._instance
    
    @classmethod
    def create_client(
        cls,
        base_url: Optional[str] = None,
        timeout: int = 30,
        retries: int = 3,
        match_threshold: Optional[int] = None,
        max_matches: Optional[int] = None
    ) -> AIMatchingClient:
        """
        Create a new AIMatchingClient instance with custom settings.
        
        Args:
            base_url: Base URL of the AI service
            timeout: Request timeout in seconds
            retries: Number of retry attempts
            match_threshold: Minimum score for matches
            max_matches: Maximum number of matches to return
            
        Returns:
            A new AIMatchingClient instance
        """
        return AIMatchingClient(
            base_url=base_url,
            timeout=timeout,
            retries=retries,
            match_threshold=match_threshold,
            max_matches=max_matches
        )