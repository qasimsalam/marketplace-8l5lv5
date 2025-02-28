import pytest  # v7.3.1
import uuid
from datetime import datetime
from unittest.mock import MagicMock, patch
import asyncio
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Dict, List, Optional, Any

from ..src.services.job_service import JobService
from ..src.models.job import Job, JobType, JobStatus, JobDifficulty
from ..src.models.proposal import Proposal, ProposalStatus
from ..src.config import settings
from ..src.services.matching_service import MatchingService

# Mock data for test use
MOCK_JOB_DATA = {
    "title": "Machine Learning Engineer",
    "description": "We need an experienced ML engineer to develop models for our product. This requires experience with Python, TensorFlow, and deep learning techniques.",
    "type": "FIXED_PRICE",
    "budget": 5000,
    "difficulty": "INTERMEDIATE",
    "required_skills": [
        {"id": "python", "name": "Python", "level": "EXPERT"},
        {"id": "tensorflow", "name": "TensorFlow", "level": "INTERMEDIATE"},
        {"id": "machine-learning", "name": "Machine Learning", "level": "ADVANCED"}
    ],
    "preferred_skills": [
        {"id": "pytorch", "name": "PyTorch", "level": "BEGINNER"},
        {"id": "computer-vision", "name": "Computer Vision", "level": "INTERMEDIATE"}
    ],
    "location": "Remote",
    "is_remote": True,
    "category": "Artificial Intelligence",
    "subcategory": "Machine Learning"
}

MOCK_PROPOSAL_DATA = {
    "job_id": "placeholder-uuid",  # Will be replaced during tests
    "cover_letter": "I am an experienced ML engineer with 5 years of industry experience. I have worked on similar projects before and I'm confident I can deliver excellent results.",
    "proposed_budget": 4800,
    "estimated_duration": 30,
    "attachments": [
        {"name": "portfolio.pdf", "url": "https://example.com/files/portfolio.pdf"}
    ]
}

# Helper functions
def create_test_session() -> Session:
    """Creates an in-memory SQLite session for testing"""
    from ..src.models.job import Base
    engine = create_engine('sqlite:///:memory:')
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()

def create_mock_job(custom_data: Dict = None, poster_id: uuid.UUID = None) -> Job:
    """Creates a mock job for testing"""
    # Start with base data
    job_data = MOCK_JOB_DATA.copy()
    
    # Override with custom data if provided
    if custom_data:
        job_data.update(custom_data)
    
    # Create a new job
    job = Job.from_dto(job_data, poster_id or uuid.uuid4())
    
    return job

def create_mock_proposal(custom_data: Dict = None, freelancer_id: uuid.UUID = None) -> Proposal:
    """Creates a mock proposal for testing"""
    # Start with base data
    proposal_data = MOCK_PROPOSAL_DATA.copy()
    
    # Override with custom data if provided
    if custom_data:
        proposal_data.update(custom_data)
    
    # Create a new proposal
    proposal = Proposal.from_dto(proposal_data, freelancer_id or uuid.uuid4())
    
    return proposal

class TestJobService:
    """Test suite for the JobService class methods"""
    
    def setup_method(self, method):
        """Setup method that runs before each test"""
        # Create a test database session
        self.db_session = create_test_session()
        
        # Mock ElasticsearchService
        self.es_service = MagicMock()
        
        # Mock MatchingService
        self.matching_service = MagicMock()
        
        # Initialize the JobService
        self.job_service = JobService(
            Session=self.db_session,
            es_service=self.es_service,
            matching_service=self.matching_service
        )
        
        # Create test user IDs
        self.poster_id = uuid.uuid4()
        self.freelancer_id = uuid.uuid4()
    
    def teardown_method(self, method):
        """Teardown method that runs after each test"""
        # Close the database session
        self.db_session.close()
    
    def test_create_job(self):
        """Tests job creation functionality"""
        # Prepare test data
        job_data = MOCK_JOB_DATA.copy()
        
        # Call the method
        created_job = self.job_service.create_job(job_data, self.poster_id)
        
        # Verify results
        assert created_job is not None
        assert created_job["title"] == job_data["title"]
        assert created_job["description"] == job_data["description"]
        assert created_job["poster_id"] == str(self.poster_id)
        assert created_job["status"] == JobStatus.DRAFT.value
        
        # Verify Elasticsearch indexing was called
        self.es_service._index_job_in_elasticsearch.assert_called_once()
    
    def test_get_job_by_id(self):
        """Tests retrieving a job by ID"""
        # Create a test job
        job = create_mock_job(poster_id=self.poster_id)
        self.db_session.add(job)
        self.db_session.commit()
        
        # Call the method
        retrieved_job = self.job_service.get_job_by_id(job.id)
        
        # Verify results
        assert retrieved_job is not None
        assert retrieved_job["id"] == str(job.id)
        assert retrieved_job["title"] == job.title
        
        # Test with non-existent ID
        non_existent_id = uuid.uuid4()
        with pytest.raises(HTTPException) as excinfo:
            self.job_service.get_job_by_id(non_existent_id)
        
        assert excinfo.value.status_code == 404
    
    def test_get_jobs(self):
        """Tests retrieving multiple jobs with filtering and pagination"""
        # Create multiple test jobs
        job1 = create_mock_job(
            {"status": JobStatus.DRAFT.value, "category": "AI"},
            self.poster_id
        )
        job2 = create_mock_job(
            {"status": JobStatus.OPEN.value, "category": "Machine Learning"},
            self.poster_id
        )
        job3 = create_mock_job(
            {"status": JobStatus.OPEN.value, "category": "AI", "is_remote": False},
            uuid.uuid4()  # Different poster
        )
        
        # Add jobs to the database
        self.db_session.add_all([job1, job2, job3])
        self.db_session.commit()
        
        # Test retrieval with no filters
        result = self.job_service.get_jobs()
        assert result["pagination"]["total_count"] == 3
        
        # Test filtering by status
        result = self.job_service.get_jobs(filters={"status": JobStatus.OPEN.value})
        assert result["pagination"]["total_count"] == 2
        
        # Test filtering by poster_id
        result = self.job_service.get_jobs(filters={"poster_id": self.poster_id})
        assert result["pagination"]["total_count"] == 2
        
        # Test filtering by category
        result = self.job_service.get_jobs(filters={"category": "AI"})
        assert result["pagination"]["total_count"] == 2
        
        # Test filtering by multiple criteria
        result = self.job_service.get_jobs(filters={
            "status": JobStatus.OPEN.value,
            "category": "AI"
        })
        assert result["pagination"]["total_count"] == 1
        
        # Test pagination
        result = self.job_service.get_jobs(page=1, page_size=2)
        assert len(result["items"]) == 2
        assert result["pagination"]["total_pages"] == 2
        
        result = self.job_service.get_jobs(page=2, page_size=2)
        assert len(result["items"]) == 1
        assert result["pagination"]["total_pages"] == 2
    
    def test_update_job(self):
        """Tests job update functionality"""
        # Create a test job
        job = create_mock_job(poster_id=self.poster_id)
        self.db_session.add(job)
        self.db_session.commit()
        
        # Prepare update data
        update_data = {
            "title": "Updated Job Title",
            "budget": 6000,
            "difficulty": JobDifficulty.ADVANCED.value
        }
        
        # Call the method
        updated_job = self.job_service.update_job(job.id, update_data, self.poster_id)
        
        # Verify results
        assert updated_job["title"] == update_data["title"]
        assert float(updated_job["budget"]) == update_data["budget"]
        assert updated_job["difficulty"] == update_data["difficulty"]
        
        # Verify Elasticsearch update
        self.es_service._update_job_in_elasticsearch.assert_called_once()
        
        # Test unauthorized update attempt
        other_user_id = uuid.uuid4()
        with pytest.raises(HTTPException) as excinfo:
            self.job_service.update_job(job.id, update_data, other_user_id)
        
        assert excinfo.value.status_code == 403
    
    def test_delete_job(self):
        """Tests job deletion functionality"""
        # Create a test job
        job = create_mock_job(poster_id=self.poster_id)
        self.db_session.add(job)
        self.db_session.commit()
        
        # Call the method
        result = self.job_service.delete_job(job.id, self.poster_id)
        
        # Verify results
        assert result is True
        
        # Verify the job is soft-deleted
        deleted_job = self.db_session.query(Job).filter(Job.id == job.id).first()
        assert deleted_job.deleted_at is not None
        
        # Verify Elasticsearch deletion
        self.es_service._delete_job_from_elasticsearch.assert_called_once()
        
        # Test unauthorized deletion attempt
        other_job = create_mock_job(poster_id=self.poster_id)
        self.db_session.add(other_job)
        self.db_session.commit()
        
        other_user_id = uuid.uuid4()
        with pytest.raises(HTTPException) as excinfo:
            self.job_service.delete_job(other_job.id, other_user_id)
        
        assert excinfo.value.status_code == 403
    
    def test_change_job_status(self):
        """Tests changing a job's status"""
        # Create a test job
        job = create_mock_job(poster_id=self.poster_id)
        self.db_session.add(job)
        self.db_session.commit()
        
        # Test transition from DRAFT to OPEN
        updated_job = self.job_service.change_job_status(
            job.id, 
            JobStatus.OPEN, 
            self.poster_id
        )
        
        assert updated_job["status"] == JobStatus.OPEN.value
        
        # Test transition from OPEN to IN_PROGRESS
        updated_job = self.job_service.change_job_status(
            job.id, 
            JobStatus.IN_PROGRESS, 
            self.poster_id
        )
        
        assert updated_job["status"] == JobStatus.IN_PROGRESS.value
        
        # Test invalid transition (IN_PROGRESS to DRAFT)
        with pytest.raises(HTTPException) as excinfo:
            self.job_service.change_job_status(
                job.id, 
                JobStatus.DRAFT, 
                self.poster_id
            )
        
        assert excinfo.value.status_code == 400
        
        # Test unauthorized status change
        other_user_id = uuid.uuid4()
        with pytest.raises(HTTPException) as excinfo:
            self.job_service.change_job_status(
                job.id, 
                JobStatus.COMPLETED, 
                other_user_id
            )
        
        assert excinfo.value.status_code == 403
    
    def test_publish_job(self):
        """Tests publishing a job (DRAFT to OPEN)"""
        # Create a test job with DRAFT status
        job = create_mock_job(poster_id=self.poster_id)
        self.db_session.add(job)
        self.db_session.commit()
        
        # Call the method
        published_job = self.job_service.publish_job(job.id, self.poster_id)
        
        # Verify results
        assert published_job["status"] == JobStatus.OPEN.value
        
        # Test job with missing required fields
        incomplete_job = create_mock_job(
            {
                "title": "Short",  # Too short title
                "description": "Short description",  # Too short description
                "required_skills": []  # No required skills
            },
            self.poster_id
        )
        self.db_session.add(incomplete_job)
        self.db_session.commit()
        
        with pytest.raises(HTTPException) as excinfo:
            self.job_service.publish_job(incomplete_job.id, self.poster_id)
        
        assert excinfo.value.status_code == 400
    
    def test_search_jobs(self):
        """Tests searching for jobs"""
        # Mock Elasticsearch search response
        self.es_service.search.return_value = {
            "hits": {
                "total": {"value": 2},
                "hits": [
                    {
                        "_score": 0.95,
                        "_source": {
                            "id": str(uuid.uuid4()),
                            "title": "ML Engineer",
                            "description": "Machine learning job"
                        },
                        "highlight": {
                            "title": ["<em>ML</em> Engineer"]
                        }
                    },
                    {
                        "_score": 0.85,
                        "_source": {
                            "id": str(uuid.uuid4()),
                            "title": "AI Developer",
                            "description": "AI and machine learning job"
                        },
                        "highlight": {
                            "description": ["AI and <em>machine learning</em> job"]
                        }
                    }
                ]
            }
        }
        
        # Call the method
        result = self.job_service.search_jobs(query="machine learning")
        
        # Verify results
        assert len(result["items"]) == 2
        assert result["pagination"]["total_count"] == 2
        assert "search_score" in result["items"][0]
        assert "highlights" in result["items"][0]
        
        # Verify ES query
        self.es_service.search.assert_called_once()
        
        # Test with filters
        self.job_service.search_jobs(
            query="machine learning",
            filters={"category": "AI", "is_remote": True}
        )
        
        # Elasticsearch service should be called with appropriate filters
        call_args = self.es_service.search.call_args[1]
        assert "body" in call_args
        assert "filter" in call_args["body"]["query"]["bool"]
    
    def test_create_proposal(self):
        """Tests proposal creation functionality"""
        # Create a test job with OPEN status
        job = create_mock_job(
            {"status": JobStatus.OPEN.value},
            self.poster_id
        )
        self.db_session.add(job)
        self.db_session.commit()
        
        # Prepare proposal data
        proposal_data = MOCK_PROPOSAL_DATA.copy()
        proposal_data["job_id"] = job.id
        
        # Mock the matching service
        self.matching_service.calculate_match_score.return_value = 0.85
        
        # Call the method
        created_proposal = self.job_service.create_proposal(proposal_data, self.freelancer_id)
        
        # Verify results
        assert created_proposal is not None
        assert created_proposal["job_id"] == str(job.id)
        assert created_proposal["freelancer_id"] == str(self.freelancer_id)
        assert created_proposal["status"] == ProposalStatus.PENDING.value
        
        # Test for job that is not OPEN
        closed_job = create_mock_job(
            {"status": JobStatus.IN_PROGRESS.value},
            self.poster_id
        )
        self.db_session.add(closed_job)
        self.db_session.commit()
        
        proposal_data["job_id"] = closed_job.id
        
        with pytest.raises(HTTPException) as excinfo:
            self.job_service.create_proposal(proposal_data, self.freelancer_id)
        
        assert excinfo.value.status_code == 400
        
        # Test duplicate proposal
        proposal_data["job_id"] = job.id
        
        with pytest.raises(HTTPException) as excinfo:
            self.job_service.create_proposal(proposal_data, self.freelancer_id)
        
        assert excinfo.value.status_code == 400
    
    def test_get_job_proposals(self):
        """Tests retrieving proposals for a job"""
        # Create a test job
        job = create_mock_job(
            {"status": JobStatus.OPEN.value},
            self.poster_id
        )
        self.db_session.add(job)
        self.db_session.commit()
        
        # Create multiple proposals
        proposal1 = create_mock_proposal(
            {"job_id": job.id, "status": ProposalStatus.PENDING.value},
            self.freelancer_id
        )
        proposal2 = create_mock_proposal(
            {"job_id": job.id, "status": ProposalStatus.UNDER_REVIEW.value},
            uuid.uuid4()  # Different freelancer
        )
        
        self.db_session.add_all([proposal1, proposal2])
        self.db_session.commit()
        
        # Call the method
        result = self.job_service.get_job_proposals(job.id, self.poster_id)
        
        # Verify results
        assert result["pagination"]["total_count"] == 2
        
        # Test filtering by status
        result = self.job_service.get_job_proposals(
            job.id,
            self.poster_id,
            filters={"status": ProposalStatus.PENDING.value}
        )
        
        assert result["pagination"]["total_count"] == 1
        
        # Test filtering by freelancer_id
        result = self.job_service.get_job_proposals(
            job.id,
            self.poster_id,
            filters={"freelancer_id": self.freelancer_id}
        )
        
        assert result["pagination"]["total_count"] == 1
        
        # Test pagination
        result = self.job_service.get_job_proposals(
            job.id,
            self.poster_id,
            page=1,
            page_size=1
        )
        
        assert len(result["items"]) == 1
        assert result["pagination"]["total_pages"] == 2
        
        # Test unauthorized access
        other_user_id = uuid.uuid4()
        with pytest.raises(HTTPException) as excinfo:
            self.job_service.get_job_proposals(job.id, other_user_id)
        
        assert excinfo.value.status_code == 403
    
    def test_change_proposal_status(self):
        """Tests changing a proposal's status"""
        # Create a test job and proposal
        job = create_mock_job(
            {"status": JobStatus.OPEN.value},
            self.poster_id
        )
        self.db_session.add(job)
        self.db_session.commit()
        
        proposal = create_mock_proposal(
            {"job_id": job.id, "status": ProposalStatus.PENDING.value},
            self.freelancer_id
        )
        self.db_session.add(proposal)
        self.db_session.commit()
        
        # Test changing status to UNDER_REVIEW
        updated_proposal = self.job_service.change_proposal_status(
            proposal.id,
            ProposalStatus.UNDER_REVIEW,
            self.poster_id
        )
        
        assert updated_proposal["status"] == ProposalStatus.UNDER_REVIEW.value
        
        # Test accepting a proposal
        updated_proposal = self.job_service.change_proposal_status(
            proposal.id,
            ProposalStatus.ACCEPTED,
            self.poster_id
        )
        
        assert updated_proposal["status"] == ProposalStatus.ACCEPTED.value
        
        # Verify job assignment when proposal is accepted
        updated_job = self.db_session.query(Job).filter(Job.id == job.id).first()
        assert updated_job.freelancer_id == self.freelancer_id
        assert updated_job.status == JobStatus.IN_PROGRESS.value
        
        # Test rejecting a proposal with reason
        another_job = create_mock_job(
            {"status": JobStatus.OPEN.value},
            self.poster_id
        )
        self.db_session.add(another_job)
        self.db_session.commit()
        
        another_proposal = create_mock_proposal(
            {"job_id": another_job.id, "status": ProposalStatus.PENDING.value},
            uuid.uuid4()
        )
        self.db_session.add(another_proposal)
        self.db_session.commit()
        
        rejection_reason = "Not the right fit for this project"
        updated_proposal = self.job_service.change_proposal_status(
            another_proposal.id,
            ProposalStatus.REJECTED,
            self.poster_id,
            rejection_reason
        )
        
        assert updated_proposal["status"] == ProposalStatus.REJECTED.value
        assert updated_proposal["rejection_reason"] == rejection_reason
        
        # Test unauthorized status change attempt
        other_user_id = uuid.uuid4()
        with pytest.raises(HTTPException) as excinfo:
            self.job_service.change_proposal_status(
                another_proposal.id,
                ProposalStatus.ACCEPTED,
                other_user_id
            )
        
        assert excinfo.value.status_code == 403
    
    @pytest.mark.asyncio
    async def test_find_matching_freelancers(self):
        """Tests finding matching freelancers for a job"""
        # Create a test job
        job = create_mock_job(poster_id=self.poster_id)
        self.db_session.add(job)
        self.db_session.commit()
        
        # Mock matching service response
        mock_matches = [
            {
                "id": str(uuid.uuid4()),
                "score": 0.92,
                "data": {
                    "name": "John Doe",
                    "skills": ["Python", "TensorFlow", "Machine Learning"]
                }
            },
            {
                "id": str(uuid.uuid4()),
                "score": 0.85,
                "data": {
                    "name": "Jane Smith",
                    "skills": ["Python", "PyTorch", "Computer Vision"]
                }
            }
        ]
        
        # Set up async mock
        future = asyncio.Future()
        future.set_result(mock_matches)
        self.matching_service.find_matching_freelancers.return_value = future
        
        # Call the method
        result = await self.job_service.find_matching_freelancers(job.id)
        
        # Verify results
        assert len(result) == 2
        assert result[0]["score"] == 0.92
        assert "name" in result[0]["data"]
        
        # Test with filters
        filters = {"min_score": 0.9, "skills": ["TensorFlow"]}
        # Reset mock for next call
        future = asyncio.Future()
        future.set_result(mock_matches)
        self.matching_service.find_matching_freelancers.return_value = future
        await self.job_service.find_matching_freelancers(job.id, filters)
        
        # Verify matching service was called with filters
        self.matching_service.find_matching_freelancers.assert_called_with(
            job_data=job.to_search_document(),
            freelancer_profiles=[],
            filters=filters,
            limit=10
        )
    
    @pytest.mark.asyncio
    async def test_find_matching_jobs(self):
        """Tests finding matching jobs for a freelancer profile"""
        # Create multiple test jobs
        job1 = create_mock_job(
            {"status": JobStatus.OPEN.value, "category": "AI"},
            self.poster_id
        )
        job2 = create_mock_job(
            {"status": JobStatus.OPEN.value, "category": "Machine Learning"},
            uuid.uuid4()
        )
        
        self.db_session.add_all([job1, job2])
        self.db_session.commit()
        
        # Prepare test freelancer profile data
        profile_data = {
            "id": str(self.freelancer_id),
            "name": "John Developer",
            "bio": "Experienced machine learning engineer",
            "skills": [
                {"id": "python", "name": "Python", "level": "Expert"},
                {"id": "tensorflow", "name": "TensorFlow", "level": "Advanced"}
            ]
        }
        
        # Mock matching service response
        mock_matches = [
            {
                "id": str(job1.id),
                "score": 0.88,
                "data": job1.to_dict()
            },
            {
                "id": str(job2.id),
                "score": 0.76,
                "data": job2.to_dict()
            }
        ]
        
        # Set up async mock
        future = asyncio.Future()
        future.set_result(mock_matches)
        self.matching_service.find_matching_jobs.return_value = future
        
        # Call the method
        result = await self.job_service.find_matching_jobs(profile_data)
        
        # Verify results
        assert len(result) == 2
        assert result[0]["score"] == 0.88
        
        # Test with filters
        filters = {"category": "AI", "is_remote": True}
        # Reset mock for next call
        future = asyncio.Future()
        future.set_result(mock_matches)
        self.matching_service.find_matching_jobs.return_value = future
        await self.job_service.find_matching_jobs(profile_data, filters)
        
        # Verify matching service was called with filters
        self.matching_service.find_matching_jobs.assert_called()
    
    def test_exception_handling(self):
        """Tests error handling in the service"""
        # Test database errors (session failures)
        with patch.object(self.db_session, 'commit', side_effect=Exception("Database error")):
            with pytest.raises(ValueError):
                self.job_service.create_job(MOCK_JOB_DATA, self.poster_id)
        
        # Test Elasticsearch errors
        self.es_service.search.side_effect = Exception("Elasticsearch error")
        
        with pytest.raises(HTTPException) as excinfo:
            self.job_service.search_jobs(query="machine learning")
        
        assert excinfo.value.status_code == 500
        
        # Test validation errors with invalid input
        invalid_job_data = {
            "title": "",  # Invalid empty title
            "description": "Too short",  # Too short description
            "type": "INVALID_TYPE"  # Invalid job type
        }
        
        with pytest.raises(ValueError):
            self.job_service.create_job(invalid_job_data, self.poster_id)