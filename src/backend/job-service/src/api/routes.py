"""
API routes module for the Job Service that defines all endpoints for job posting, searching,
matching, and proposal management in the AI Talent Marketplace.

This file implements RESTful API endpoints to handle the entire job lifecycle from creation to completion.
"""

import logging
from typing import List, Dict, Optional, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, Body, Request, Response, SecurityScopes

from ..config import settings, API_PREFIX, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from .dependencies import (
    get_db, get_job_service, get_matching_service, get_elasticsearch_client,
    get_current_user, get_user_id_from_token, get_job_by_id_dependency
)
from ..models.job import Job, JobCreateSchema, JobUpdateSchema, JobStatus
from ..models.proposal import (
    Proposal, ProposalCreateSchema, ProposalUpdateSchema, 
    ProposalStatusUpdateSchema, ProposalStatus
)
from ..services.job_service import JobService
from ..services.matching_service import MatchingService

# Initialize logger
logger = logging.getLogger(__name__)

# Create API router
router = APIRouter(prefix=f"{API_PREFIX}", tags=["jobs"])


@router.get("/jobs")
async def get_jobs(
    current_user: Optional[Dict] = Depends(get_current_user),
    status: Optional[str] = None,
    category: Optional[str] = None, 
    search: Optional[str] = None,
    remote_only: Optional[bool] = None,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, description="Items per page"),
    job_service: JobService = Depends(get_job_service)
) -> Dict:
    """
    Retrieve a paginated list of jobs with optional filtering.
    
    Parameters:
    - status: Filter by job status (DRAFT, OPEN, IN_PROGRESS, etc.)
    - category: Filter by job category
    - search: Text search in title and description
    - remote_only: Filter to only show remote jobs
    - page: Page number (starts at 1)
    - page_size: Number of items per page
    
    Returns:
    - Paginated jobs with metadata
    """
    # Build filters dictionary
    filters = {}
    
    # Add status filter if provided
    if status:
        filters["status"] = status
    
    # Add category filter if provided
    if category:
        filters["category"] = category
    
    # Add remote_only filter if provided
    if remote_only is not None:
        filters["is_remote"] = remote_only
    
    # Add poster_id filter if requesting own jobs
    if current_user and search is None:
        # If search parameter is not provided, assume user wants their own jobs
        filters["poster_id"] = UUID(current_user.get("sub"))
    
    # Get jobs with filters and pagination
    result = job_service.get_jobs(
        filters=filters,
        page=page,
        page_size=page_size
    )
    
    logger.debug(f"Retrieved {len(result.get('items', []))} jobs with filters: {filters}")
    return result


@router.get("/jobs/search")
async def search_jobs(
    current_user: Optional[Dict] = Depends(get_current_user),
    q: str = Query(..., min_length=1, description="Search query"),
    status: Optional[str] = Query(JobStatus.OPEN.value, description="Job status filter"),
    category: Optional[str] = None,
    remote_only: Optional[bool] = None,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, description="Items per page"),
    job_service: JobService = Depends(get_job_service)
) -> Dict:
    """
    Search for jobs using a text query with AI-powered relevance.
    
    Parameters:
    - q: Search query text
    - status: Filter by job status (defaults to OPEN)
    - category: Filter by job category
    - remote_only: Filter to only show remote jobs
    - page: Page number (starts at 1)
    - page_size: Number of items per page
    
    Returns:
    - Search results with relevance scoring
    """
    # Build filters dictionary
    filters = {}
    
    # Add status filter, defaulting to OPEN if not provided
    if status:
        filters["status"] = status
    
    # Add category filter if provided
    if category:
        filters["category"] = category
    
    # Add remote_only filter if provided
    if remote_only is not None:
        filters["is_remote"] = remote_only
    
    # Search jobs with query, filters, and pagination
    result = job_service.search_jobs(
        query=q,
        filters=filters,
        page=page,
        page_size=page_size
    )
    
    logger.debug(f"Searched jobs with query '{q}', found {len(result.get('items', []))} results")
    return result


@router.post("/jobs", status_code=status.HTTP_201_CREATED)
async def create_job(
    current_user: Dict = Depends(get_current_user),
    job_data: JobCreateSchema = Body(...),
    job_service: JobService = Depends(get_job_service)
) -> Dict:
    """
    Create a new job posting.
    
    Parameters:
    - job_data: Job details for creation
    
    Returns:
    - Created job data with ID
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to create a job"
        )
    
    # Extract user_id from current_user token
    user_id = UUID(current_user.get("sub"))
    
    # Create job
    created_job = job_service.create_job(job_data=job_data.dict(), poster_id=user_id)
    
    logger.info(f"User {user_id} created job: {created_job.get('id')}")
    return created_job


@router.get("/jobs/{job_id}")
async def get_job_by_id(
    current_user: Optional[Dict] = Depends(get_current_user),
    job_id: UUID = Path(..., description="The ID of the job to retrieve"),
    job_service: JobService = Depends(get_job_service)
) -> Dict:
    """
    Retrieve a specific job by its ID.
    
    Parameters:
    - job_id: UUID of the job to retrieve
    
    Returns:
    - Job data if found
    """
    # Get job by ID (will raise HTTPException if not found)
    job = job_service.get_job_by_id(job_id)
    
    logger.debug(f"Retrieved job {job_id}")
    return job


@router.put("/jobs/{job_id}")
async def update_job(
    current_user: Dict = Depends(get_current_user),
    job_id: UUID = Path(..., description="The ID of the job to update"),
    job_data: JobUpdateSchema = Body(...),
    job_service: JobService = Depends(get_job_service)
) -> Dict:
    """
    Update an existing job posting.
    
    Parameters:
    - job_id: UUID of the job to update
    - job_data: Updated job details
    
    Returns:
    - Updated job data
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to update a job"
        )
    
    # Extract user_id from current_user token
    user_id = UUID(current_user.get("sub"))
    
    try:
        # Update job
        updated_job = job_service.update_job(
            job_id=job_id,
            job_data=job_data.dict(exclude_unset=True),
            user_id=user_id
        )
        
        logger.info(f"User {user_id} updated job: {job_id}")
        return updated_job
        
    except HTTPException as e:
        # Pass through HTTP exceptions from service
        raise e
    except Exception as e:
        # Log and transform other exceptions
        logger.error(f"Error updating job {job_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update job: {str(e)}"
        )


@router.delete("/jobs/{job_id}")
async def delete_job(
    current_user: Dict = Depends(get_current_user),
    job_id: UUID = Path(..., description="The ID of the job to delete"),
    job_service: JobService = Depends(get_job_service)
) -> Dict:
    """
    Delete (soft-delete) a job posting.
    
    Parameters:
    - job_id: UUID of the job to delete
    
    Returns:
    - Success message
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to delete a job"
        )
    
    # Extract user_id from current_user token
    user_id = UUID(current_user.get("sub"))
    
    try:
        # Delete job
        job_service.delete_job(job_id=job_id, user_id=user_id)
        
        logger.info(f"User {user_id} deleted job: {job_id}")
        return {"message": "Job deleted successfully"}
        
    except HTTPException as e:
        # Pass through HTTP exceptions from service
        raise e
    except Exception as e:
        # Log and transform other exceptions
        logger.error(f"Error deleting job {job_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete job: {str(e)}"
        )


@router.patch("/jobs/{job_id}/status")
async def change_job_status(
    current_user: Dict = Depends(get_current_user),
    job_id: UUID = Path(..., description="The ID of the job to update"),
    status_update: JobStatus = Body(..., embed=True),
    job_service: JobService = Depends(get_job_service)
) -> Dict:
    """
    Update the status of a job posting.
    
    Parameters:
    - job_id: UUID of the job to update
    - status_update: New status value
    
    Returns:
    - Updated job data
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to update job status"
        )
    
    # Extract user_id from current_user token
    user_id = UUID(current_user.get("sub"))
    
    try:
        # Change job status
        updated_job = job_service.change_job_status(
            job_id=job_id,
            new_status=status_update,
            user_id=user_id
        )
        
        logger.info(f"User {user_id} changed status of job {job_id} to {status_update}")
        return updated_job
        
    except HTTPException as e:
        # Pass through HTTP exceptions from service
        raise e
    except Exception as e:
        # Log and transform other exceptions
        logger.error(f"Error changing job status {job_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to change job status: {str(e)}"
        )


@router.post("/jobs/{job_id}/publish")
async def publish_job(
    current_user: Dict = Depends(get_current_user),
    job_id: UUID = Path(..., description="The ID of the job to publish"),
    job_service: JobService = Depends(get_job_service)
) -> Dict:
    """
    Publish a draft job to make it publicly available.
    
    Parameters:
    - job_id: UUID of the job to publish
    
    Returns:
    - Published job data
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to publish a job"
        )
    
    # Extract user_id from current_user token
    user_id = UUID(current_user.get("sub"))
    
    try:
        # Publish job
        published_job = job_service.publish_job(job_id=job_id, user_id=user_id)
        
        logger.info(f"User {user_id} published job: {job_id}")
        return published_job
        
    except HTTPException as e:
        # Pass through HTTP exceptions from service
        raise e
    except Exception as e:
        # Log and transform other exceptions
        logger.error(f"Error publishing job {job_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to publish job: {str(e)}"
        )


@router.post("/jobs/{job_id}/complete")
async def complete_job(
    current_user: Dict = Depends(get_current_user),
    job_id: UUID = Path(..., description="The ID of the job to complete"),
    job_service: JobService = Depends(get_job_service)
) -> Dict:
    """
    Mark a job as completed.
    
    Parameters:
    - job_id: UUID of the job to complete
    
    Returns:
    - Completed job data
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to complete a job"
        )
    
    # Extract user_id from current_user token
    user_id = UUID(current_user.get("sub"))
    
    try:
        # Complete job
        completed_job = job_service.complete_job(job_id=job_id, user_id=user_id)
        
        logger.info(f"User {user_id} completed job: {job_id}")
        return completed_job
        
    except HTTPException as e:
        # Pass through HTTP exceptions from service
        raise e
    except Exception as e:
        # Log and transform other exceptions
        logger.error(f"Error completing job {job_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to complete job: {str(e)}"
        )


@router.get("/jobs/{job_id}/matches")
async def get_matching_freelancers(
    current_user: Dict = Depends(get_current_user),
    job_id: UUID = Path(..., description="The ID of the job to find matches for"),
    limit: Optional[int] = Query(10, ge=1, le=100, description="Maximum number of matches to return"),
    include_explanation: Optional[bool] = Query(False, description="Include explanation of why each match was made"),
    job_service: JobService = Depends(get_job_service)
) -> Dict:
    """
    Find AI professionals that match a specific job using AI.
    
    Parameters:
    - job_id: UUID of the job to find matches for
    - limit: Maximum number of matches to return
    - include_explanation: Whether to include detailed explanations of matches
    
    Returns:
    - Matching freelancer profiles with relevance scores
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to find matching freelancers"
        )
    
    # Extract user_id from current_user token
    user_id = UUID(current_user.get("sub"))
    
    try:
        # Get job to verify access
        job = job_service.get_job_by_id(job_id)
        
        # Check if user is the job poster
        if UUID(job.get("poster_id")) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the job poster can view matching freelancers"
            )
        
        # Find matching freelancers
        matches = await job_service.find_matching_freelancers(
            job_id=job_id,
            filters={},
            limit=limit
        )
        
        logger.info(f"Found {len(matches)} matching freelancers for job: {job_id}")
        return {
            "job_id": str(job_id),
            "matches": matches,
            "include_explanation": include_explanation
        }
        
    except HTTPException as e:
        # Pass through HTTP exceptions from service
        raise e
    except Exception as e:
        # Log and transform other exceptions
        logger.error(f"Error finding matching freelancers for job {job_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to find matching freelancers: {str(e)}"
        )


@router.get("/jobs/{job_id}/proposals")
async def get_job_proposals(
    current_user: Dict = Depends(get_current_user),
    job_id: UUID = Path(..., description="The ID of the job to get proposals for"),
    status: Optional[str] = None,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, description="Items per page"),
    job_service: JobService = Depends(get_job_service)
) -> Dict:
    """
    Get all proposals for a specific job.
    
    Parameters:
    - job_id: UUID of the job to get proposals for
    - status: Filter by proposal status
    - page: Page number (starts at 1)
    - page_size: Number of items per page
    
    Returns:
    - Paginated proposals for the job
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to view job proposals"
        )
    
    # Extract user_id from current_user token
    user_id = UUID(current_user.get("sub"))
    
    try:
        # Build filters dictionary
        filters = {}
        if status:
            filters["status"] = status
        
        # Get job proposals
        proposals = job_service.get_job_proposals(
            job_id=job_id,
            user_id=user_id,
            filters=filters,
            page=page,
            page_size=page_size
        )
        
        logger.debug(f"Retrieved {len(proposals.get('items', []))} proposals for job {job_id}")
        return proposals
        
    except HTTPException as e:
        # Pass through HTTP exceptions from service
        raise e
    except Exception as e:
        # Log and transform other exceptions
        logger.error(f"Error retrieving proposals for job {job_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve job proposals: {str(e)}"
        )


@router.post("/proposals", status_code=status.HTTP_201_CREATED)
async def create_proposal(
    current_user: Dict = Depends(get_current_user),
    proposal_data: ProposalCreateSchema = Body(...),
    job_service: JobService = Depends(get_job_service)
) -> Dict:
    """
    Submit a proposal for a job from a freelancer.
    
    Parameters:
    - proposal_data: Proposal details
    
    Returns:
    - Created proposal data with ID
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to submit a proposal"
        )
    
    # Extract user_id from current_user token
    user_id = UUID(current_user.get("sub"))
    
    try:
        # Create proposal
        created_proposal = job_service.create_proposal(
            proposal_data=proposal_data.dict(),
            freelancer_id=user_id
        )
        
        logger.info(f"User {user_id} submitted proposal for job: {proposal_data.job_id}")
        return created_proposal
        
    except HTTPException as e:
        # Pass through HTTP exceptions from service
        raise e
    except Exception as e:
        # Log and transform other exceptions
        logger.error(f"Error creating proposal: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create proposal: {str(e)}"
        )


@router.get("/proposals/{proposal_id}")
async def get_proposal_by_id(
    current_user: Dict = Depends(get_current_user),
    proposal_id: UUID = Path(..., description="The ID of the proposal to retrieve"),
    job_service: JobService = Depends(get_job_service)
) -> Dict:
    """
    Retrieve a specific proposal by its ID.
    
    Parameters:
    - proposal_id: UUID of the proposal to retrieve
    
    Returns:
    - Proposal data if found
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to view a proposal"
        )
    
    # Extract user_id from current_user token
    user_id = UUID(current_user.get("sub"))
    
    try:
        # Get proposal by ID
        proposal = job_service.get_proposal_by_id(proposal_id)
        
        # Get the associated job
        job = job_service.get_job_by_id(UUID(proposal.get("job_id")))
        
        # Check if user has permission to view this proposal
        # User must be either the job poster or the proposal creator
        if UUID(job.get("poster_id")) != user_id and UUID(proposal.get("freelancer_id")) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view this proposal"
            )
            
        logger.debug(f"Retrieved proposal {proposal_id}")
        return proposal
        
    except HTTPException as e:
        # Pass through HTTP exceptions from service
        raise e
    except Exception as e:
        # Log and transform other exceptions
        logger.error(f"Error retrieving proposal {proposal_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve proposal: {str(e)}"
        )


@router.put("/proposals/{proposal_id}")
async def update_proposal(
    current_user: Dict = Depends(get_current_user),
    proposal_id: UUID = Path(..., description="The ID of the proposal to update"),
    proposal_data: ProposalUpdateSchema = Body(...),
    job_service: JobService = Depends(get_job_service)
) -> Dict:
    """
    Update an existing proposal.
    
    Parameters:
    - proposal_id: UUID of the proposal to update
    - proposal_data: Updated proposal details
    
    Returns:
    - Updated proposal data
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to update a proposal"
        )
    
    # Extract user_id from current_user token
    user_id = UUID(current_user.get("sub"))
    
    try:
        # Update proposal
        updated_proposal = job_service.update_proposal(
            proposal_id=proposal_id,
            proposal_data=proposal_data.dict(exclude_unset=True),
            user_id=user_id
        )
        
        logger.info(f"User {user_id} updated proposal: {proposal_id}")
        return updated_proposal
        
    except HTTPException as e:
        # Pass through HTTP exceptions from service
        raise e
    except Exception as e:
        # Log and transform other exceptions
        logger.error(f"Error updating proposal {proposal_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update proposal: {str(e)}"
        )


@router.patch("/proposals/{proposal_id}/status")
async def change_proposal_status(
    current_user: Dict = Depends(get_current_user),
    proposal_id: UUID = Path(..., description="The ID of the proposal to update"),
    status_update: ProposalStatusUpdateSchema = Body(...),
    job_service: JobService = Depends(get_job_service)
) -> Dict:
    """
    Update the status of a proposal (accept, reject, etc.).
    
    Parameters:
    - proposal_id: UUID of the proposal to update
    - status_update: New status value and optional reason
    
    Returns:
    - Updated proposal data
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to update proposal status"
        )
    
    # Extract user_id from current_user token
    user_id = UUID(current_user.get("sub"))
    
    try:
        # Change proposal status
        updated_proposal = job_service.change_proposal_status(
            proposal_id=proposal_id,
            new_status=status_update.status,
            user_id=user_id,
            reason=status_update.reason
        )
        
        logger.info(f"User {user_id} changed status of proposal {proposal_id} to {status_update.status}")
        return updated_proposal
        
    except HTTPException as e:
        # Pass through HTTP exceptions from service
        raise e
    except Exception as e:
        # Log and transform other exceptions
        logger.error(f"Error changing proposal status {proposal_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to change proposal status: {str(e)}"
        )


@router.get("/proposals/me")
async def get_my_proposals(
    current_user: Dict = Depends(get_current_user),
    status: Optional[str] = None,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, description="Items per page"),
    job_service: JobService = Depends(get_job_service)
) -> Dict:
    """
    Get all proposals submitted by the current user.
    
    Parameters:
    - status: Filter by proposal status
    - page: Page number (starts at 1)
    - page_size: Number of items per page
    
    Returns:
    - Paginated proposals from the current user
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to view your proposals"
        )
    
    # Extract user_id from current_user token
    user_id = UUID(current_user.get("sub"))
    
    # Build filters dictionary
    filters = {"freelancer_id": user_id}
    if status:
        filters["status"] = status
    
    try:
        # Get user's proposals - using filters to retrieve only proposals from this freelancer
        result = job_service.get_jobs(
            filters=filters,
            page=page,
            page_size=page_size
        )
        
        logger.debug(f"Retrieved {len(result.get('items', []))} proposals for user {user_id}")
        return result
        
    except Exception as e:
        # Log and transform exceptions
        logger.error(f"Error retrieving proposals for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve proposals: {str(e)}"
        )


@router.get("/jobs/matches/me")
async def find_matching_jobs(
    current_user: Dict = Depends(get_current_user),
    limit: Optional[int] = Query(10, ge=1, le=100, description="Maximum number of matches to return"),
    include_explanation: Optional[bool] = Query(False, description="Include explanation of why each match was made"),
    job_service: JobService = Depends(get_job_service)
) -> Dict:
    """
    Find jobs that match the current user's profile using AI.
    
    Parameters:
    - limit: Maximum number of matches to return
    - include_explanation: Whether to include detailed explanations of matches
    
    Returns:
    - Matching jobs with relevance scores
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to find matching jobs"
        )
    
    # Extract user_id from current_user token
    user_id = UUID(current_user.get("sub"))
    
    try:
        # In a real implementation, we would get the user's profile from a user service
        # For this implementation, we'll use a simplified profile
        profile_data = {"id": str(user_id), "name": "AI Professional", "skills": []}
        
        # Find matching jobs
        matches = await job_service.find_matching_jobs(
            profile_data=profile_data,
            filters={},
            limit=limit
        )
        
        logger.info(f"Found {len(matches)} matching jobs for user: {user_id}")
        return {
            "profile_id": str(user_id),
            "matches": matches,
            "include_explanation": include_explanation
        }
        
    except HTTPException as e:
        # Pass through HTTP exceptions from service
        raise e
    except Exception as e:
        # Log and transform other exceptions
        logger.error(f"Error finding matching jobs for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to find matching jobs: {str(e)}"
        )


@router.get("/matching/health")
async def get_matching_service_health(
    matching_service: MatchingService = Depends(get_matching_service)
) -> Dict:
    """
    Check the health of the AI matching service.
    
    Returns:
    - Health status of the matching service
    """
    try:
        # Check the health of the matching service
        health_status = await matching_service.health_check()
        
        logger.debug(f"Matching service health status: {health_status.get('status', 'unknown')}")
        return health_status
        
    except Exception as e:
        logger.error(f"Error checking matching service health: {str(e)}")
        return {
            "status": "error",
            "message": f"Error checking matching service health: {str(e)}"
        }


@router.get("/jobs/{job_id}/match/{profile_id}")
async def calculate_match_score(
    current_user: Dict = Depends(get_current_user),
    job_id: UUID = Path(..., description="The ID of the job"),
    profile_id: UUID = Path(..., description="The ID of the freelancer profile"),
    include_explanation: Optional[bool] = Query(False, description="Include explanation of the match score"),
    job_service: JobService = Depends(get_job_service),
    matching_service: MatchingService = Depends(get_matching_service)
) -> Dict:
    """
    Calculate match score between a job and freelancer profile.
    
    Parameters:
    - job_id: UUID of the job
    - profile_id: UUID of the freelancer profile
    - include_explanation: Whether to include detailed explanation of the match
    
    Returns:
    - Match details with score and explanation
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to calculate match score"
        )
    
    # Extract user_id from current_user token
    user_id = UUID(current_user.get("sub"))
    
    try:
        # Get job data
        job_data = job_service.get_job_by_id(job_id)
        
        # In a real implementation, we would get the profile from a user service
        # For this implementation, we'll use a simplified profile
        profile_data = {"id": str(profile_id), "name": "AI Professional", "skills": []}
        
        # Calculate match score
        match_details = await matching_service.calculate_match_score(
            job_data=job_data,
            profile_data=profile_data,
            include_explanation=include_explanation
        )
        
        logger.debug(f"Calculated match score between job {job_id} and profile {profile_id}: {match_details.get('score', 0)}")
        return match_details
        
    except HTTPException as e:
        # Pass through HTTP exceptions from service
        raise e
    except Exception as e:
        # Log and transform other exceptions
        logger.error(f"Error calculating match score: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate match score: {str(e)}"
        )