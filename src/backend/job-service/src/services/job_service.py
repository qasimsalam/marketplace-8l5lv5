"""
Core service module for job management in the AI Talent Marketplace.

This module implements business logic for creating, retrieving, updating, and matching AI jobs
with qualified professionals, handling the entire job lifecycle from posting to completion.
"""

import uuid
from datetime import datetime
from typing import Dict, List, Optional, Union, Any

import logging
from fastapi import HTTPException
from sqlalchemy import and_, or_, desc, func
from sqlalchemy.orm import Session
from elasticsearch import Elasticsearch

from ..config import settings, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, ELASTICSEARCH_JOB_INDEX
from ..models.job import Job, JobStatus
from ..models.proposal import Proposal, ProposalStatus
from ..services.matching_service import MatchingServiceFactory

# Initialize logger
logger = logging.getLogger(__name__)

class JobService:
    """Service class that implements business logic for job management"""
    
    def __init__(
        self, 
        Session: Session, 
        matching_service: Optional["MatchingService"] = None, 
        es_service: Optional[Elasticsearch] = None
    ):
        """Initialize JobService with required dependencies
        
        Args:
            Session: SQLAlchemy database session for data operations
            matching_service: Optional matching service for AI-powered job matching
            es_service: Optional elasticsearch service for search operations
        """
        self.db = Session
        self.matching_service = matching_service or MatchingServiceFactory.get_instance()
        self.es_service = es_service
        logger.info("JobService initialized")

    def create_job(self, job_data: Dict, poster_id: uuid.UUID) -> Dict:
        """Create a new job posting
        
        Args:
            job_data: Dictionary containing job details
            poster_id: UUID of the user creating the job
            
        Returns:
            Dictionary containing the created job data with ID
            
        Raises:
            ValueError: If job data is invalid
        """
        try:
            # Create a Job instance from the DTO
            new_job = Job.from_dto(job_data, poster_id)
            
            # Add job to database
            self.db.add(new_job)
            self.db.commit()
            self.db.refresh(new_job)
            
            # Index in Elasticsearch if available
            if self.es_service:
                self._index_job_in_elasticsearch(new_job)
            
            logger.info(f"Job created: ID {new_job.id}")
            return new_job.to_dict()
        
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating job: {str(e)}")
            raise ValueError(f"Failed to create job: {str(e)}")

    def get_job_by_id(self, job_id: uuid.UUID) -> Dict:
        """Retrieve a job by its unique identifier
        
        Args:
            job_id: UUID of the job to retrieve
            
        Returns:
            Dictionary containing job data if found
            
        Raises:
            HTTPException: If job not found
        """
        job = self.db.query(Job).filter(
            Job.id == job_id,
            Job.deleted_at.is_(None)
        ).first()
        
        if not job:
            logger.warning(f"Job not found: ID {job_id}")
            raise HTTPException(status_code=404, detail="Job not found")
        
        logger.debug(f"Retrieved job: ID {job_id}")
        return job.to_dict()

    def get_jobs(
        self, 
        filters: Dict = None, 
        page: int = 1, 
        page_size: int = None
    ) -> Dict:
        """Retrieve jobs with optional filtering and pagination
        
        Args:
            filters: Dictionary of filter criteria
            page: Page number for pagination (starts at 1)
            page_size: Number of items per page
            
        Returns:
            Dictionary containing paginated jobs and metadata
        """
        filters = filters or {}
        page_size = min(page_size or DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
        offset = (page - 1) * page_size
        
        # Start building the query
        query = self.db.query(Job).filter(Job.deleted_at.is_(None))
        
        # Apply filters
        if 'status' in filters:
            status = filters.get('status')
            if isinstance(status, list):
                query = query.filter(Job.status.in_(status))
            else:
                query = query.filter(Job.status == status)
        
        if 'poster_id' in filters:
            query = query.filter(Job.poster_id == filters.get('poster_id'))
            
        if 'category' in filters:
            query = query.filter(Job.category == filters.get('category'))
            
        if 'subcategory' in filters:
            query = query.filter(Job.subcategory == filters.get('subcategory'))
            
        if 'difficulty' in filters:
            query = query.filter(Job.difficulty == filters.get('difficulty'))
            
        if 'is_remote' in filters:
            query = query.filter(Job.is_remote == filters.get('is_remote'))
            
        if 'location' in filters:
            query = query.filter(Job.location == filters.get('location'))
        
        # Get total count for pagination
        total_count = query.count()
        
        # Apply sorting
        query = query.order_by(desc(Job.created_at))
        
        # Apply pagination
        query = query.offset(offset).limit(page_size)
        
        # Execute query
        jobs = query.all()
        
        # Format results
        result = {
            "items": [job.to_dict() for job in jobs],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_count": total_count,
                "total_pages": (total_count + page_size - 1) // page_size
            }
        }
        
        logger.debug(f"Retrieved {len(jobs)} jobs (page {page}, size {page_size})")
        return result

    def update_job(self, job_id: uuid.UUID, job_data: Dict, user_id: uuid.UUID) -> Dict:
        """Update an existing job with new data
        
        Args:
            job_id: UUID of the job to update
            job_data: Dictionary containing updated job fields
            user_id: UUID of the user performing the update (for authorization)
            
        Returns:
            Dictionary containing the updated job data
            
        Raises:
            HTTPException: If job not found or user lacks permission
        """
        # Get the job
        job = self.db.query(Job).filter(
            Job.id == job_id, 
            Job.deleted_at.is_(None)
        ).first()
        
        if not job:
            logger.warning(f"Job not found: ID {job_id}")
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Check permissions
        if job.poster_id != user_id:
            logger.warning(f"User {user_id} attempted to update job {job_id} without permission")
            raise HTTPException(status_code=403, detail="You don't have permission to update this job")
        
        # Check if job is in editable state
        if not job.is_editable():
            logger.warning(f"Attempted to update job {job_id} that is not in editable state")
            raise HTTPException(status_code=400, detail="Job is not in an editable state")
        
        try:
            # Update job fields
            job.update(job_data)
            
            # Save changes
            self.db.commit()
            self.db.refresh(job)
            
            # Update in Elasticsearch if available
            if self.es_service:
                self._update_job_in_elasticsearch(job)
            
            logger.info(f"Job updated: ID {job_id}")
            return job.to_dict()
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating job: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Failed to update job: {str(e)}")

    def delete_job(self, job_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """Soft-delete a job posting
        
        Args:
            job_id: UUID of the job to delete
            user_id: UUID of the user performing the deletion (for authorization)
            
        Returns:
            True if job was successfully deleted
            
        Raises:
            HTTPException: If job not found or user lacks permission
        """
        # Get the job
        job = self.db.query(Job).filter(
            Job.id == job_id, 
            Job.deleted_at.is_(None)
        ).first()
        
        if not job:
            logger.warning(f"Job not found: ID {job_id}")
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Check permissions
        if job.poster_id != user_id:
            logger.warning(f"User {user_id} attempted to delete job {job_id} without permission")
            raise HTTPException(status_code=403, detail="You don't have permission to delete this job")
        
        try:
            # Soft delete the job
            job.soft_delete()
            
            # Save changes
            self.db.commit()
            
            # Remove from Elasticsearch if available
            if self.es_service:
                self._delete_job_from_elasticsearch(job_id)
            
            logger.info(f"Job deleted: ID {job_id}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting job: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Failed to delete job: {str(e)}")

    def change_job_status(
        self, 
        job_id: uuid.UUID, 
        new_status: JobStatus, 
        user_id: uuid.UUID
    ) -> Dict:
        """Update the status of a job posting
        
        Args:
            job_id: UUID of the job to update
            new_status: New JobStatus to apply
            user_id: UUID of the user performing the update (for authorization)
            
        Returns:
            Dictionary containing the updated job data
            
        Raises:
            HTTPException: If job not found, user lacks permission, or status transition is invalid
        """
        # Get the job
        job = self.db.query(Job).filter(
            Job.id == job_id, 
            Job.deleted_at.is_(None)
        ).first()
        
        if not job:
            logger.warning(f"Job not found: ID {job_id}")
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Check permissions
        if job.poster_id != user_id:
            logger.warning(f"User {user_id} attempted to change status of job {job_id} without permission")
            raise HTTPException(status_code=403, detail="You don't have permission to update this job")
        
        try:
            # Change status
            if not job.change_status(new_status):
                raise ValueError(f"Invalid status transition from {job.status} to {new_status}")
            
            # Save changes
            self.db.commit()
            self.db.refresh(job)
            
            # Update in Elasticsearch if available
            if self.es_service:
                self._update_job_in_elasticsearch(job)
            
            logger.info(f"Job status changed: ID {job_id}, new status: {new_status}")
            return job.to_dict()
            
        except ValueError as e:
            logger.warning(f"Invalid job status change: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error changing job status: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Failed to update job status: {str(e)}")

    def publish_job(self, job_id: uuid.UUID, user_id: uuid.UUID) -> Dict:
        """Change job status from DRAFT to OPEN to make it publicly available
        
        Args:
            job_id: UUID of the job to publish
            user_id: UUID of the user performing the action (for authorization)
            
        Returns:
            Dictionary containing the published job data
            
        Raises:
            HTTPException: If job not found, user lacks permission, or job validation fails
        """
        # Get the job
        job = self.db.query(Job).filter(
            Job.id == job_id, 
            Job.deleted_at.is_(None)
        ).first()
        
        if not job:
            logger.warning(f"Job not found: ID {job_id}")
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Check permissions
        if job.poster_id != user_id:
            logger.warning(f"User {user_id} attempted to publish job {job_id} without permission")
            raise HTTPException(status_code=403, detail="You don't have permission to publish this job")
        
        # Check if job is in DRAFT status
        if job.status != JobStatus.DRAFT.value:
            logger.warning(f"Attempted to publish job {job_id} with status {job.status}")
            raise HTTPException(status_code=400, detail="Only jobs in DRAFT status can be published")
        
        # Validate required fields
        validation_errors = []
        
        if not job.title or len(job.title) < 5:
            validation_errors.append("Title is required and must be at least 5 characters")
            
        if not job.description or len(job.description) < 100:
            validation_errors.append("Description is required and must be at least 100 characters")
            
        if not job.required_skills or len(job.required_skills) == 0:
            validation_errors.append("At least one required skill must be specified")
            
        if not job.validate_budget_fields():
            validation_errors.append("Budget information is invalid or incomplete")
        
        if validation_errors:
            error_message = "Job validation failed: " + "; ".join(validation_errors)
            logger.warning(f"Job validation failed: ID {job_id} - {error_message}")
            raise HTTPException(status_code=400, detail=error_message)
        
        try:
            # Change status to OPEN
            if not job.change_status(JobStatus.OPEN):
                raise ValueError(f"Invalid status transition from {job.status} to {JobStatus.OPEN.value}")
            
            # Save changes
            self.db.commit()
            self.db.refresh(job)
            
            # Index in Elasticsearch if available
            if self.es_service:
                self._index_job_in_elasticsearch(job)
            
            logger.info(f"Job published: ID {job_id}")
            return job.to_dict()
            
        except ValueError as e:
            logger.warning(f"Invalid job status change: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error publishing job: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Failed to publish job: {str(e)}")

    def search_jobs(
        self, 
        query: str = None, 
        filters: Dict = None, 
        page: int = 1, 
        page_size: int = None
    ) -> Dict:
        """Search for jobs using text query and optional filters
        
        Args:
            query: Text search query
            filters: Dictionary of filter criteria
            page: Page number for pagination (starts at 1)
            page_size: Number of items per page
            
        Returns:
            Dictionary containing search results with pagination metadata
            
        Raises:
            HTTPException: If Elasticsearch service is not available
        """
        if not self.es_service:
            logger.error("Elasticsearch service not available for job search")
            raise HTTPException(status_code=501, detail="Search functionality not available")
        
        filters = filters or {}
        page_size = min(page_size or DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
        
        try:
            # Use the Elasticsearch client to perform the search
            es_query = self._build_elasticsearch_query(query, filters)
            
            # Calculate pagination parameters
            from_val = (page - 1) * page_size
            
            # Execute search
            search_results = self.es_service.search(
                index=ELASTICSEARCH_JOB_INDEX,
                body=es_query,
                from_=from_val,
                size=page_size
            )
            
            # Process results
            hits = search_results.get('hits', {})
            total_count = hits.get('total', {}).get('value', 0)
            
            items = []
            for hit in hits.get('hits', []):
                item = hit.get('_source', {})
                # Add highlight snippets if available
                if 'highlight' in hit:
                    item['highlights'] = hit['highlight']
                # Add search score
                item['search_score'] = hit.get('_score')
                items.append(item)
            
            # Prepare result with pagination metadata
            result = {
                "items": items,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total_count": total_count,
                    "total_pages": (total_count + page_size - 1) // page_size
                }
            }
            
            logger.debug(f"Job search executed: query='{query}', found {total_count} results")
            return result
            
        except Exception as e:
            logger.error(f"Error searching jobs: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Search operation failed: {str(e)}")

    def get_job_proposals(
        self, 
        job_id: uuid.UUID, 
        user_id: uuid.UUID,
        filters: Dict = None, 
        page: int = 1, 
        page_size: int = None
    ) -> Dict:
        """Get all proposals for a specific job
        
        Args:
            job_id: UUID of the job to get proposals for
            user_id: UUID of the user requesting proposals (for authorization)
            filters: Dictionary of filter criteria
            page: Page number for pagination (starts at 1)
            page_size: Number of items per page
            
        Returns:
            Dictionary containing paginated proposals and metadata
            
        Raises:
            HTTPException: If job not found or user lacks permission
        """
        # Get the job
        job = self.db.query(Job).filter(
            Job.id == job_id, 
            Job.deleted_at.is_(None)
        ).first()
        
        if not job:
            logger.warning(f"Job not found: ID {job_id}")
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Check permissions
        # The job poster or the assigned freelancer can view proposals
        if job.poster_id != user_id and job.freelancer_id != user_id:
            logger.warning(f"User {user_id} attempted to view proposals for job {job_id} without permission")
            raise HTTPException(status_code=403, detail="You don't have permission to view proposals for this job")
        
        filters = filters or {}
        page_size = min(page_size or DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
        offset = (page - 1) * page_size
        
        # Start building the query
        query = self.db.query(Proposal).filter(Proposal.job_id == job_id)
        
        # Apply filters
        if 'status' in filters:
            status = filters.get('status')
            if isinstance(status, list):
                query = query.filter(Proposal.status.in_(status))
            else:
                query = query.filter(Proposal.status == status)
        
        if 'freelancer_id' in filters:
            query = query.filter(Proposal.freelancer_id == filters.get('freelancer_id'))
        
        # Get total count for pagination
        total_count = query.count()
        
        # Apply sorting (newest first by default)
        query = query.order_by(desc(Proposal.created_at))
        
        # Apply pagination
        query = query.offset(offset).limit(page_size)
        
        # Execute query
        proposals = query.all()
        
        # Format results
        result = {
            "items": [proposal.to_dict() for proposal in proposals],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_count": total_count,
                "total_pages": (total_count + page_size - 1) // page_size
            }
        }
        
        logger.debug(f"Retrieved {len(proposals)} proposals for job {job_id} (page {page}, size {page_size})")
        return result

    def create_proposal(self, proposal_data: Dict, freelancer_id: uuid.UUID) -> Dict:
        """Submit a proposal for a job from a freelancer
        
        Args:
            proposal_data: Dictionary containing proposal details
            freelancer_id: UUID of the freelancer submitting the proposal
            
        Returns:
            Dictionary containing the created proposal data with ID
            
        Raises:
            HTTPException: If job not found, is not open, or freelancer already applied
        """
        job_id = proposal_data.get('job_id')
        if not job_id:
            logger.warning("Proposal missing job_id")
            raise HTTPException(status_code=400, detail="Job ID is required")
        
        # Convert string to UUID if necessary
        if isinstance(job_id, str):
            try:
                job_id = uuid.UUID(job_id)
            except ValueError:
                logger.warning(f"Invalid job_id format: {job_id}")
                raise HTTPException(status_code=400, detail="Invalid job ID format")
        
        # Get the job
        job = self.db.query(Job).filter(
            Job.id == job_id, 
            Job.deleted_at.is_(None)
        ).first()
        
        if not job:
            logger.warning(f"Job not found: ID {job_id}")
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Check if job is OPEN
        if job.status != JobStatus.OPEN.value:
            logger.warning(f"Attempted to submit proposal for job {job_id} with status {job.status}")
            raise HTTPException(status_code=400, detail="Proposals can only be submitted for jobs with OPEN status")
        
        # Check if freelancer already has a proposal for this job
        existing_proposal = self.db.query(Proposal).filter(
            Proposal.job_id == job_id,
            Proposal.freelancer_id == freelancer_id
        ).first()
        
        if existing_proposal:
            logger.warning(f"Freelancer {freelancer_id} attempted to submit duplicate proposal for job {job_id}")
            raise HTTPException(status_code=400, detail="You have already submitted a proposal for this job")
        
        try:
            # Create proposal
            new_proposal = Proposal.from_dto(proposal_data, freelancer_id)
            
            # Calculate relevance score using matching service if available
            if self.matching_service:
                # This would be an async operation in production
                # For this implementation, we'll use a placeholder score
                new_proposal.relevance_score = 0.85  # Placeholder score
            
            # Add proposal to database
            self.db.add(new_proposal)
            self.db.commit()
            self.db.refresh(new_proposal)
            
            logger.info(f"Proposal created: ID {new_proposal.id} for job {job_id}")
            return new_proposal.to_dict()
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating proposal: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Failed to create proposal: {str(e)}")

    def get_proposal_by_id(self, proposal_id: uuid.UUID) -> Dict:
        """Retrieve a proposal by its unique identifier
        
        Args:
            proposal_id: UUID of the proposal to retrieve
            
        Returns:
            Dictionary containing proposal data if found
            
        Raises:
            HTTPException: If proposal not found
        """
        proposal = self.db.query(Proposal).filter(Proposal.id == proposal_id).first()
        
        if not proposal:
            logger.warning(f"Proposal not found: ID {proposal_id}")
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        logger.debug(f"Retrieved proposal: ID {proposal_id}")
        return proposal.to_dict()

    def update_proposal(
        self, 
        proposal_id: uuid.UUID, 
        proposal_data: Dict, 
        user_id: uuid.UUID
    ) -> Dict:
        """Update an existing proposal with new data
        
        Args:
            proposal_id: UUID of the proposal to update
            proposal_data: Dictionary containing updated proposal fields
            user_id: UUID of the user performing the update (for authorization)
            
        Returns:
            Dictionary containing the updated proposal data
            
        Raises:
            HTTPException: If proposal not found, user lacks permission, or proposal not editable
        """
        # Get the proposal
        proposal = self.db.query(Proposal).filter(Proposal.id == proposal_id).first()
        
        if not proposal:
            logger.warning(f"Proposal not found: ID {proposal_id}")
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        # Check permissions
        if proposal.freelancer_id != user_id:
            logger.warning(f"User {user_id} attempted to update proposal {proposal_id} without permission")
            raise HTTPException(status_code=403, detail="You don't have permission to update this proposal")
        
        # Check if proposal is editable
        if not proposal.is_editable():
            logger.warning(f"Attempted to update proposal {proposal_id} that is not in editable state")
            raise HTTPException(status_code=400, detail="Proposal is not in an editable state")
        
        try:
            # Update proposal fields
            proposal.update(proposal_data)
            
            # Recalculate relevance score if needed
            if self.matching_service and ('cover_letter' in proposal_data or 'milestones' in proposal_data):
                # This would be an async operation in production
                # For this implementation, we'll use a placeholder score
                proposal.relevance_score = 0.87  # Updated placeholder score
            
            # Save changes
            self.db.commit()
            self.db.refresh(proposal)
            
            logger.info(f"Proposal updated: ID {proposal_id}")
            return proposal.to_dict()
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating proposal: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Failed to update proposal: {str(e)}")

    def change_proposal_status(
        self, 
        proposal_id: uuid.UUID, 
        new_status: ProposalStatus, 
        user_id: uuid.UUID,
        reason: Optional[str] = None
    ) -> Dict:
        """Update the status of a proposal
        
        Args:
            proposal_id: UUID of the proposal to update
            new_status: New ProposalStatus to apply
            user_id: UUID of the user performing the update (for authorization)
            reason: Optional reason for status change (required for rejection)
            
        Returns:
            Dictionary containing the updated proposal data
            
        Raises:
            HTTPException: If proposal not found, user lacks permission, or status transition invalid
        """
        # Get the proposal
        proposal = self.db.query(Proposal).filter(Proposal.id == proposal_id).first()
        
        if not proposal:
            logger.warning(f"Proposal not found: ID {proposal_id}")
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        # Get the associated job
        job = self.db.query(Job).filter(
            Job.id == proposal.job_id, 
            Job.deleted_at.is_(None)
        ).first()
        
        if not job:
            logger.warning(f"Job not found for proposal: ID {proposal.job_id}")
            raise HTTPException(status_code=404, detail="Associated job not found")
        
        # Check permissions - only job poster can change proposal status
        # Exception: freelancer can withdraw their own proposal
        is_job_poster = job.poster_id == user_id
        is_own_proposal = proposal.freelancer_id == user_id and new_status == ProposalStatus.WITHDRAWN
        
        if not (is_job_poster or is_own_proposal):
            logger.warning(f"User {user_id} attempted to change status of proposal {proposal_id} without permission")
            raise HTTPException(status_code=403, detail="You don't have permission to update this proposal")
        
        try:
            # Change status
            if not proposal.change_status(new_status, reason):
                raise ValueError(f"Invalid status transition from {proposal.status} to {new_status.value}")
            
            # Handle job assignment when proposal is accepted
            if new_status == ProposalStatus.ACCEPTED:
                # Check if job is still available
                if job.status != JobStatus.OPEN.value:
                    raise ValueError("Job is no longer open for acceptance")
                
                # Assign the freelancer to the job
                job.assign_freelancer(proposal.freelancer_id)
                
                # Reject all other proposals
                other_proposals = self.db.query(Proposal).filter(
                    Proposal.job_id == job.id,
                    Proposal.id != proposal.id,
                    Proposal.status.in_([
                        ProposalStatus.PENDING.value,
                        ProposalStatus.UNDER_REVIEW.value
                    ])
                ).all()
                
                for other_proposal in other_proposals:
                    other_proposal.change_status(
                        ProposalStatus.REJECTED,
                        "Another proposal was accepted for this job"
                    )
            
            # Save changes
            self.db.commit()
            self.db.refresh(proposal)
            
            logger.info(f"Proposal status changed: ID {proposal_id}, new status: {new_status}")
            return proposal.to_dict()
            
        except ValueError as e:
            logger.warning(f"Invalid proposal status change: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error changing proposal status: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Failed to update proposal status: {str(e)}")

    async def find_matching_freelancers(
        self, 
        job_id: uuid.UUID, 
        filters: Dict = None, 
        limit: int = 10
    ) -> List:
        """Find freelancers that match a job using AI matching
        
        Args:
            job_id: UUID of the job to find matches for
            filters: Optional dictionary of additional filter criteria
            limit: Maximum number of matches to return
            
        Returns:
            List of matching freelancer profiles with scores
            
        Raises:
            HTTPException: If job not found or matching service unavailable
        """
        if not self.matching_service:
            logger.error("Matching service not available")
            raise HTTPException(status_code=501, detail="Matching functionality not available")
        
        # Get the job
        job = self.db.query(Job).filter(
            Job.id == job_id, 
            Job.deleted_at.is_(None)
        ).first()
        
        if not job:
            logger.warning(f"Job not found: ID {job_id}")
            raise HTTPException(status_code=404, detail="Job not found")
        
        try:
            # In a real implementation, we would:
            # 1. Fetch available freelancer profiles from user service
            # 2. Call matching service to find best matches
            # For this implementation, we'll use a simplified approach
            
            # Convert job to search document format
            job_data = job.to_search_document()
            
            # Mock freelancer profiles for demonstration
            # In a real implementation, these would come from a user service
            freelancer_profiles = []
            
            # Call matching service to find matching profiles
            matched_freelancers = await self.matching_service.find_matching_freelancers(
                job_data=job_data,
                freelancer_profiles=freelancer_profiles,
                filters=filters,
                limit=limit
            )
            
            logger.debug(f"Found {len(matched_freelancers)} matching freelancers for job {job_id}")
            return matched_freelancers
            
        except Exception as e:
            logger.error(f"Error finding matching freelancers: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Matching operation failed: {str(e)}")

    async def find_matching_jobs(
        self, 
        profile_data: Dict, 
        filters: Dict = None, 
        limit: int = 10
    ) -> List:
        """Find jobs that match a freelancer profile using AI matching
        
        Args:
            profile_data: Dictionary containing freelancer profile data
            filters: Optional dictionary of additional filter criteria
            limit: Maximum number of matches to return
            
        Returns:
            List of matching jobs with scores
            
        Raises:
            HTTPException: If matching service unavailable
        """
        if not self.matching_service:
            logger.error("Matching service not available")
            raise HTTPException(status_code=501, detail="Matching functionality not available")
        
        try:
            # Query to get available jobs (OPEN status)
            jobs_query = self.db.query(Job).filter(
                Job.status == JobStatus.OPEN.value,
                Job.deleted_at.is_(None)
            )
            
            # Apply additional filters if provided
            if filters:
                if 'category' in filters:
                    jobs_query = jobs_query.filter(Job.category == filters['category'])
                
                if 'is_remote' in filters:
                    jobs_query = jobs_query.filter(Job.is_remote == filters['is_remote'])
                
                if 'location' in filters:
                    jobs_query = jobs_query.filter(Job.location == filters['location'])
            
            # Retrieve job data
            jobs = jobs_query.all()
            
            if not jobs:
                logger.info("No open jobs found for matching")
                return []
            
            # Convert jobs to dictionary format
            job_data_list = [job.to_dict() for job in jobs]
            
            # Call matching service to find matching jobs
            matched_jobs = await self.matching_service.find_matching_jobs(
                profile_data=profile_data,
                jobs=job_data_list,
                filters=filters,
                limit=limit
            )
            
            logger.debug(f"Found {len(matched_jobs)} matching jobs for profile {profile_data.get('id')}")
            return matched_jobs
            
        except Exception as e:
            logger.error(f"Error finding matching jobs: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Matching operation failed: {str(e)}")

    def complete_job(self, job_id: uuid.UUID, user_id: uuid.UUID) -> Dict:
        """Mark a job as completed
        
        Args:
            job_id: UUID of the job to complete
            user_id: UUID of the user performing the action (for authorization)
            
        Returns:
            Dictionary containing the updated job data
            
        Raises:
            HTTPException: If job not found, user lacks permission, or job not in progress
        """
        # Get the job
        job = self.db.query(Job).filter(
            Job.id == job_id, 
            Job.deleted_at.is_(None)
        ).first()
        
        if not job:
            logger.warning(f"Job not found: ID {job_id}")
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Check permissions
        if job.poster_id != user_id:
            logger.warning(f"User {user_id} attempted to complete job {job_id} without permission")
            raise HTTPException(status_code=403, detail="You don't have permission to complete this job")
        
        # Check if job is IN_PROGRESS
        if job.status != JobStatus.IN_PROGRESS.value:
            logger.warning(f"Attempted to complete job {job_id} with status {job.status}")
            raise HTTPException(status_code=400, detail="Only jobs in IN_PROGRESS status can be completed")
        
        try:
            # Complete the job
            if not job.complete_job():
                raise ValueError(f"Invalid status transition from {job.status} to {JobStatus.COMPLETED.value}")
            
            # Save changes
            self.db.commit()
            self.db.refresh(job)
            
            # Update in Elasticsearch if available
            if self.es_service:
                self._update_job_in_elasticsearch(job)
            
            logger.info(f"Job completed: ID {job_id}")
            return job.to_dict()
            
        except ValueError as e:
            logger.warning(f"Invalid job completion: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error completing job: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Failed to complete job: {str(e)}")

    def cancel_job(
        self, 
        job_id: uuid.UUID, 
        user_id: uuid.UUID, 
        reason: Optional[str] = None
    ) -> Dict:
        """Cancel a job posting
        
        Args:
            job_id: UUID of the job to cancel
            user_id: UUID of the user performing the action (for authorization)
            reason: Optional reason for cancellation
            
        Returns:
            Dictionary containing the updated job data
            
        Raises:
            HTTPException: If job not found, user lacks permission, or cancellation fails
        """
        # Get the job
        job = self.db.query(Job).filter(
            Job.id == job_id, 
            Job.deleted_at.is_(None)
        ).first()
        
        if not job:
            logger.warning(f"Job not found: ID {job_id}")
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Check permissions
        if job.poster_id != user_id:
            logger.warning(f"User {user_id} attempted to cancel job {job_id} without permission")
            raise HTTPException(status_code=403, detail="You don't have permission to cancel this job")
        
        try:
            # Cancel the job
            if not job.cancel_job():
                raise ValueError(f"Cannot cancel job with status {job.status}")
            
            # Store cancellation reason if provided
            if reason:
                job.cancellation_reason = reason
            
            # Save changes
            self.db.commit()
            self.db.refresh(job)
            
            # Update in Elasticsearch if available
            if self.es_service:
                self._update_job_in_elasticsearch(job)
            
            logger.info(f"Job cancelled: ID {job_id}")
            return job.to_dict()
            
        except ValueError as e:
            logger.warning(f"Invalid job cancellation: {str(e)}")
            raise HTTPException(status_code=400, detail=str(e))
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error cancelling job: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Failed to cancel job: {str(e)}")

    # Helper methods for Elasticsearch operations
    def _index_job_in_elasticsearch(self, job: Job) -> None:
        """Index a job in Elasticsearch
        
        Args:
            job: Job model instance to index
        """
        try:
            # Convert job to search document format
            doc = job.to_search_document()
            
            # Index the document
            self.es_service.index(
                index=ELASTICSEARCH_JOB_INDEX,
                id=str(job.id),
                document=doc,
                refresh=True
            )
            
            logger.debug(f"Indexed job in Elasticsearch: ID {job.id}")
            
        except Exception as e:
            logger.error(f"Error indexing job in Elasticsearch: {str(e)}")
            # Don't propagate this error as it's not critical for the main flow

    def _update_job_in_elasticsearch(self, job: Job) -> None:
        """Update a job in Elasticsearch
        
        Args:
            job: Job model instance to update
        """
        try:
            # Convert job to search document format
            doc = job.to_search_document()
            
            # Check if document exists
            if self.es_service.exists(index=ELASTICSEARCH_JOB_INDEX, id=str(job.id)):
                # Update existing document
                self.es_service.update(
                    index=ELASTICSEARCH_JOB_INDEX,
                    id=str(job.id),
                    doc=doc,
                    refresh=True
                )
            else:
                # Create new document if it doesn't exist
                self._index_job_in_elasticsearch(job)
            
            logger.debug(f"Updated job in Elasticsearch: ID {job.id}")
            
        except Exception as e:
            logger.error(f"Error updating job in Elasticsearch: {str(e)}")
            # Don't propagate this error as it's not critical for the main flow

    def _delete_job_from_elasticsearch(self, job_id: uuid.UUID) -> None:
        """Delete a job from Elasticsearch
        
        Args:
            job_id: UUID of the job to delete
        """
        try:
            # Delete the document
            if self.es_service.exists(index=ELASTICSEARCH_JOB_INDEX, id=str(job_id)):
                self.es_service.delete(
                    index=ELASTICSEARCH_JOB_INDEX,
                    id=str(job_id),
                    refresh=True
                )
                
                logger.debug(f"Deleted job from Elasticsearch: ID {job_id}")
            
        except Exception as e:
            logger.error(f"Error deleting job from Elasticsearch: {str(e)}")
            # Don't propagate this error as it's not critical for the main flow

    def _build_elasticsearch_query(self, query: str = None, filters: Dict = None) -> Dict:
        """Build Elasticsearch query DSL based on search text and filters
        
        Args:
            query: Text search query
            filters: Dictionary of filter criteria
            
        Returns:
            Elasticsearch query DSL as dictionary
        """
        # Start with a match_all query as default
        es_query = {
            "query": {
                "bool": {
                    "must": [{"match_all": {}}],
                    "filter": []
                }
            },
            "highlight": {
                "fields": {
                    "title": {},
                    "description": {},
                    "required_skills.name": {}
                }
            }
        }
        
        # Replace match_all with text search if query provided
        if query:
            es_query["query"]["bool"]["must"] = [
                {
                    "multi_match": {
                        "query": query,
                        "fields": ["title^3", "description", "required_skills.name^2", "full_text"],
                        "type": "best_fields",
                        "fuzziness": "AUTO"
                    }
                }
            ]
        
        # Add filters if provided
        if filters:
            if 'status' in filters:
                es_query["query"]["bool"]["filter"].append(
                    {"term": {"status": filters['status']}}
                )
            
            if 'poster_id' in filters:
                es_query["query"]["bool"]["filter"].append(
                    {"term": {"poster_id": str(filters['poster_id'])}}
                )
                
            if 'category' in filters:
                es_query["query"]["bool"]["filter"].append(
                    {"term": {"category.keyword": filters['category']}}
                )
                
            if 'difficulty' in filters:
                es_query["query"]["bool"]["filter"].append(
                    {"term": {"difficulty.keyword": filters['difficulty']}}
                )
                
            if 'is_remote' in filters:
                es_query["query"]["bool"]["filter"].append(
                    {"term": {"is_remote": filters['is_remote']}}
                )
                
            if 'min_budget' in filters:
                es_query["query"]["bool"]["filter"].append(
                    {"range": {"budget": {"gte": filters['min_budget']}}}
                )
                
            if 'max_budget' in filters:
                es_query["query"]["bool"]["filter"].append(
                    {"range": {"budget": {"lte": filters['max_budget']}}}
                )
                
            if 'location' in filters:
                es_query["query"]["bool"]["filter"].append(
                    {"term": {"location.keyword": filters['location']}}
                )
        
        # Filter out deleted jobs
        es_query["query"]["bool"]["filter"].append(
            {"bool": {"must_not": {"exists": {"field": "deleted_at"}}}}
        )
        
        return es_query