"""
Core service module for AI-powered matching between jobs and AI professionals.
This module implements intelligent matching algorithms to connect jobs with AI freelancers
using embedding-based similarity scoring, skill analysis, and relevance filters.
"""

import logging
import asyncio
import uuid
from typing import List, Dict, Optional, Union

from ..config import settings
from ..models.job import Job
from ..utils.ai_matching import AIMatchingClient, AIMatchingClientFactory

# Set up logging
logger = logging.getLogger(__name__)


def filter_matches_by_criteria(matches: List[Dict], filters: Dict) -> List[Dict]:
    """
    Filter matches based on additional criteria beyond vector similarity.
    
    Args:
        matches: List of match dictionaries with scores and data
        filters: Dictionary of filtering criteria
        
    Returns:
        Filtered matches meeting the criteria
    """
    # If no filters or empty filters, return original matches
    if not filters:
        return matches
    
    filtered_matches = matches.copy()
    
    # Apply minimum score filter
    if 'min_score' in filters:
        min_score = filters['min_score']
        filtered_matches = [m for m in filtered_matches if m.get('score', 0) >= min_score]
    
    # Apply skills filter
    if 'required_skills' in filters:
        required_skills = filters['required_skills']
        filtered_matches = [
            m for m in filtered_matches 
            if all(skill in m.get('data', {}).get('skills', []) for skill in required_skills)
        ]
    
    # Apply location filter
    if 'location' in filters:
        location = filters['location']
        filtered_matches = [
            m for m in filtered_matches 
            if location.lower() in m.get('data', {}).get('location', '').lower()
        ]
    
    # Apply rate/budget filters
    if 'max_rate' in filters:
        max_rate = filters['max_rate']
        filtered_matches = [
            m for m in filtered_matches 
            if m.get('data', {}).get('hourly_rate', float('inf')) <= max_rate
        ]
    
    if 'min_rate' in filters:
        min_rate = filters['min_rate']
        filtered_matches = [
            m for m in filtered_matches 
            if m.get('data', {}).get('hourly_rate', 0) >= min_rate
        ]
    
    # Apply availability filter
    if 'available_from' in filters:
        available_from = filters['available_from']
        filtered_matches = [
            m for m in filtered_matches 
            if m.get('data', {}).get('available_from', '') <= available_from
        ]
    
    # Sort filtered matches by score in descending order
    filtered_matches.sort(key=lambda x: x.get('score', 0), reverse=True)
    
    return filtered_matches


def format_profile_for_matching(profile: Dict) -> Dict:
    """
    Format profile data structure for the matching algorithm.
    
    Args:
        profile: Raw profile data dictionary
        
    Returns:
        Formatted profile data ready for matching
    """
    formatted_profile = {
        "id": str(profile.get("id")) if profile.get("id") else None,
        "name": profile.get("name", ""),
        "bio": profile.get("bio", ""),
        "summary": profile.get("summary", ""),
        "skills": []
    }
    
    # Format skills
    skills = profile.get("skills", [])
    if skills:
        formatted_profile["skills"] = [
            skill.get("name") for skill in skills
            if isinstance(skill, dict) and "name" in skill
        ]
    
    # Add additional fields if available
    if "experience_years" in profile:
        formatted_profile["experience_years"] = profile["experience_years"]
    
    if "hourly_rate" in profile:
        formatted_profile["hourly_rate"] = profile["hourly_rate"]
    
    if "location" in profile:
        formatted_profile["location"] = profile["location"]
    
    if "availability" in profile:
        formatted_profile["availability"] = profile["availability"]
    
    # Add experience data if available
    if "experience" in profile and isinstance(profile["experience"], list):
        exp_data = []
        for exp in profile["experience"]:
            if isinstance(exp, dict):
                exp_data.append({
                    "title": exp.get("title", ""),
                    "company": exp.get("company", ""),
                    "description": exp.get("description", ""),
                    "skills": exp.get("skills", [])
                })
        formatted_profile["experience"] = exp_data
    
    return formatted_profile


def calculate_match_percentage(score: float) -> int:
    """
    Convert raw similarity score to a human-friendly percentage.
    
    Args:
        score: Raw similarity score (typically between 0-1)
        
    Returns:
        Integer percentage (0-100)
    """
    # Most similarity scores from vector embeddings range from -1 to 1
    # Convert to a 0-100 scale
    if score < 0:
        score = 0
    
    # Scale the score to a percentage
    percentage = score * 100
    
    # Apply a minimum threshold (don't show matches below 10%)
    if percentage < 10:
        percentage = 0
    
    # Round to nearest integer
    return round(percentage)


class MatchingService:
    """
    Service for matching jobs with freelancers using AI-powered vector similarity.
    
    This service provides methods for finding matching freelancers for jobs,
    matching jobs for freelancers, calculating match scores, and generating
    human-readable explanations of why matches were made.
    """
    
    def __init__(
        self,
        ai_client: Optional[AIMatchingClient] = None,
        match_threshold: Optional[int] = None,
        max_matches: Optional[int] = None
    ):
        """
        Initialize the matching service with required dependencies.
        
        Args:
            ai_client: Instance of AIMatchingClient, or None to use factory
            match_threshold: Minimum score threshold for matches (0-100)
            max_matches: Maximum number of matches to return
        """
        # Get AI client from factory if not provided
        self.ai_client = ai_client or AIMatchingClientFactory.get_instance()
        
        # Set configuration values
        self.match_threshold = match_threshold or settings.JOB_MATCH_THRESHOLD
        self.max_matches = max_matches or settings.MAX_MATCHES
        
        logger.info(f"MatchingService initialized with threshold: {self.match_threshold}, max_matches: {self.max_matches}")
    
    async def find_matching_freelancers(
        self,
        job_data: Dict,
        freelancer_profiles: List[Dict],
        filters: Dict = None,
        limit: int = None,
        include_explanation: bool = False
    ) -> List[Dict]:
        """
        Find freelancers that match a specific job using AI-powered matching.
        
        Args:
            job_data: Job data dictionary
            freelancer_profiles: List of freelancer profile dictionaries
            filters: Additional filters to apply beyond AI matching
            limit: Maximum number of results to return (overrides instance setting)
            include_explanation: Whether to include match explanations
            
        Returns:
            List of matching freelancer profiles with scores and explanations
        """
        try:
            # Ensure job data is in the right format for matching
            if isinstance(job_data, Job):
                job_data = job_data.to_search_document()
            
            # Format profiles for matching
            formatted_profiles = [format_profile_for_matching(profile) for profile in freelancer_profiles]
            
            # Get matches from AI client
            matches = await self.ai_client.find_matches_for_job(
                job_data=job_data,
                profiles=formatted_profiles,
                filters=filters,
                limit=limit or self.max_matches,
                include_explanation=include_explanation
            )
            
            # Apply additional filters if needed
            if filters:
                matches = filter_matches_by_criteria(matches, filters)
            
            # Limit results if necessary
            if limit and len(matches) > limit:
                matches = matches[:limit]
            
            # Calculate human-friendly percentages
            for match in matches:
                match['percentage'] = calculate_match_percentage(match.get('score', 0))
            
            logger.debug(f"Found {len(matches)} matching freelancers for job {job_data.get('id')}")
            return matches
            
        except Exception as e:
            logger.error(f"Error finding matching freelancers: {str(e)}")
            raise
    
    async def find_matching_jobs(
        self,
        profile_data: Dict,
        jobs: List[Dict],
        filters: Dict = None,
        limit: int = None,
        include_explanation: bool = False
    ) -> List[Dict]:
        """
        Find jobs that match a specific freelancer profile using AI-powered matching.
        
        Args:
            profile_data: Freelancer profile data dictionary
            jobs: List of job dictionaries
            filters: Additional filters to apply beyond AI matching
            limit: Maximum number of results to return (overrides instance setting)
            include_explanation: Whether to include match explanations
            
        Returns:
            List of matching jobs with scores and explanations
        """
        try:
            # Format profile for matching
            formatted_profile = format_profile_for_matching(profile_data)
            
            # Ensure jobs are in the right format for matching
            formatted_jobs = []
            for job in jobs:
                if isinstance(job, Job):
                    formatted_jobs.append(job.to_search_document())
                else:
                    formatted_jobs.append(job)
            
            # Get matches from AI client
            matches = await self.ai_client.find_matches_for_profile(
                profile_data=formatted_profile,
                jobs=formatted_jobs,
                filters=filters,
                limit=limit or self.max_matches,
                include_explanation=include_explanation
            )
            
            # Apply additional filters if needed
            if filters:
                matches = filter_matches_by_criteria(matches, filters)
            
            # Limit results if necessary
            if limit and len(matches) > limit:
                matches = matches[:limit]
            
            # Calculate human-friendly percentages
            for match in matches:
                match['percentage'] = calculate_match_percentage(match.get('score', 0))
            
            logger.debug(f"Found {len(matches)} matching jobs for profile {profile_data.get('id')}")
            return matches
            
        except Exception as e:
            logger.error(f"Error finding matching jobs: {str(e)}")
            raise
    
    async def calculate_match_score(
        self,
        job_data: Dict,
        profile_data: Dict,
        include_explanation: bool = False
    ) -> Dict:
        """
        Calculate a detailed match score between a specific job and freelancer profile.
        
        Args:
            job_data: Job data dictionary
            profile_data: Freelancer profile data dictionary
            include_explanation: Whether to include match explanation
            
        Returns:
            Match details with score, percentage and explanation
        """
        try:
            # Format job and profile data
            if isinstance(job_data, Job):
                job_data = job_data.to_search_document()
            
            formatted_profile = format_profile_for_matching(profile_data)
            
            # Get match score from AI client
            match_result = await self.ai_client.calculate_match_score(
                job_data=job_data,
                profile_data=formatted_profile,
                include_explanation=include_explanation
            )
            
            # Add human-friendly percentage
            match_result['percentage'] = calculate_match_percentage(match_result.get('score', 0))
            
            logger.debug(f"Calculated match between job {job_data.get('id')} and profile {profile_data.get('id')}: {match_result.get('percentage')}%")
            return match_result
            
        except Exception as e:
            logger.error(f"Error calculating match score: {str(e)}")
            raise
    
    async def find_similar_jobs(
        self,
        reference_job: Dict,
        job_pool: List[Dict],
        limit: int = None
    ) -> List[Dict]:
        """
        Find jobs similar to a reference job.
        
        Args:
            reference_job: Reference job data dictionary
            job_pool: List of job dictionaries to compare against
            limit: Maximum number of similar jobs to return
            
        Returns:
            List of similar jobs with similarity scores
        """
        try:
            # Format reference job
            if isinstance(reference_job, Job):
                reference_job = reference_job.to_search_document()
            
            # Format job pool
            formatted_job_pool = []
            for job in job_pool:
                if isinstance(job, Job):
                    formatted_job_pool.append(job.to_search_document())
                else:
                    formatted_job_pool.append(job)
            
            # Get similar jobs from AI client
            similar_jobs = await self.ai_client.find_similar_jobs(
                job_data=reference_job,
                job_pool=formatted_job_pool,
                limit=limit or self.max_matches
            )
            
            # Calculate human-friendly percentages
            for job in similar_jobs:
                job['percentage'] = calculate_match_percentage(job.get('similarity_score', 0))
            
            logger.debug(f"Found {len(similar_jobs)} similar jobs for job {reference_job.get('id')}")
            return similar_jobs
            
        except Exception as e:
            logger.error(f"Error finding similar jobs: {str(e)}")
            raise
    
    async def batch_match_jobs(
        self,
        jobs: List[Dict],
        profiles: List[Dict],
        filters: Dict = None,
        limit: int = None
    ) -> Dict:
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
        try:
            # Format jobs and profiles
            formatted_jobs = []
            for job in jobs:
                if isinstance(job, Job):
                    formatted_jobs.append(job.to_search_document())
                else:
                    formatted_jobs.append(job)
            
            formatted_profiles = [format_profile_for_matching(profile) for profile in profiles]
            
            # Perform batch matching
            batch_results = await self.ai_client.batch_match_jobs(
                jobs=formatted_jobs,
                profiles=formatted_profiles,
                filters=filters,
                limit=limit or self.max_matches
            )
            
            # Process results
            processed_results = {}
            for job_id, matches in batch_results.items():
                # Apply filters if needed
                if filters:
                    matches = filter_matches_by_criteria(matches, filters)
                
                # Calculate percentages
                for match in matches:
                    match['percentage'] = calculate_match_percentage(match.get('score', 0))
                
                processed_results[job_id] = matches
            
            logger.debug(f"Processed batch matching for {len(jobs)} jobs with {len(profiles)} profiles")
            return processed_results
            
        except Exception as e:
            logger.error(f"Error in batch job matching: {str(e)}")
            raise
    
    async def get_match_explanation(
        self,
        job_data: Dict,
        profile_data: Dict,
        match_score: float
    ) -> str:
        """
        Generate a human-readable explanation for why a job and profile match.
        
        Args:
            job_data: Job data dictionary
            profile_data: Profile data dictionary
            match_score: Match score between the job and profile
            
        Returns:
            Human-readable match explanation
        """
        try:
            # Check if match score is above threshold
            percentage = calculate_match_percentage(match_score)
            if percentage < self.match_threshold:
                return "Match score is below the required threshold."
            
            # Use calculate_match_score with include_explanation=True
            match_result = await self.calculate_match_score(
                job_data=job_data,
                profile_data=profile_data,
                include_explanation=True
            )
            
            # Extract explanation from result
            explanation = match_result.get('explanation', 'No explanation available.')
            
            return explanation
            
        except Exception as e:
            logger.error(f"Error generating match explanation: {str(e)}")
            return "Unable to generate explanation due to an error."
    
    async def health_check(self) -> Dict:
        """
        Check if the matching service and AI client are operational.
        
        Returns:
            Service health status information
        """
        try:
            ai_service_healthy = await self.ai_client.get_ai_service_health()
            
            return {
                "status": "healthy" if ai_service_healthy else "degraded",
                "ai_service_connection": ai_service_healthy,
                "match_threshold": self.match_threshold,
                "max_matches": self.max_matches
            }
            
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "ai_service_connection": False,
                "error": str(e)
            }


class MatchingServiceFactory:
    """
    Factory class for creating and managing MatchingService instances.
    
    This implements the singleton pattern to ensure only one instance
    of the MatchingService is created per application instance.
    """
    
    _instance = None
    
    def __init__(self):
        """Initialize the factory class."""
        pass
    
    @classmethod
    def get_instance(cls) -> MatchingService:
        """
        Get or create a MatchingService instance (singleton pattern).
        
        Returns:
            A MatchingService instance
        """
        if cls._instance is None:
            cls._instance = MatchingService()
        
        return cls._instance
    
    @classmethod
    def create_service(
        cls,
        ai_client: AIMatchingClient,
        match_threshold: int,
        max_matches: int
    ) -> MatchingService:
        """
        Create a new MatchingService instance with custom settings.
        
        Args:
            ai_client: Instance of AIMatchingClient
            match_threshold: Minimum score threshold for matches (0-100)
            max_matches: Maximum number of matches to return
            
        Returns:
            A new MatchingService instance
        """
        return MatchingService(
            ai_client=ai_client,
            match_threshold=match_threshold,
            max_matches=max_matches
        )