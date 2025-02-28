"""
Unit and integration tests for the AI-powered matching system in the AI Talent Marketplace.
This test suite verifies that the matching algorithms correctly identify suitable
freelancers for jobs and vice versa based on skills, preferences, and other criteria.
"""

import pytest
import uuid
import json
from unittest.mock import MagicMock, patch
import httpx
import pytest_asyncio

# Internal imports
from ..src.utils.ai_matching import AIMatchingClient, AIMatchingClientFactory
from ..src.services.matching_service import MatchingService, MatchingServiceFactory
from ..src.models.job import Job, JobType
from ..src.config import settings

# Mock data for testing
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

MOCK_PROFILE_DATA = {
    "id": "placeholder-uuid",
    "name": "Jane Smith",
    "title": "Senior ML Engineer",
    "bio": "Experienced machine learning specialist with 5+ years of industry experience in Python, TensorFlow, and deep learning projects.",
    "skills": [
        {"id": "python", "name": "Python", "level": "EXPERT"},
        {"id": "tensorflow", "name": "TensorFlow", "level": "ADVANCED"},
        {"id": "machine-learning", "name": "Machine Learning", "level": "ADVANCED"}
    ],
    "experience": "5+ years",
    "hourly_rate": 80,
    "availability": "Full-time",
    "location": "Remote"
}

MOCK_MATCH_RESPONSE = {
    "matches": [
        {"id": "profile-id-1", "score": 0.89, "explanation": "Strong match in Python and ML skills"},
        {"id": "profile-id-2", "score": 0.78, "explanation": "Good match in required skills but missing some preferred skills"},
        {"id": "profile-id-3", "score": 0.65, "explanation": "Partial match with some experience in required areas"}
    ]
}


def create_mock_job(custom_data=None, poster_id=None):
    """Creates a mock job object for testing"""
    job_data = MOCK_JOB_DATA.copy()
    
    # Update with custom data if provided
    if custom_data and isinstance(custom_data, dict):
        job_data.update(custom_data)
    
    # Set poster_id
    if poster_id:
        job_data["poster_id"] = str(poster_id)
    else:
        job_data["poster_id"] = str(uuid.uuid4())
    
    # Add an ID if not present
    if "id" not in job_data:
        job_data["id"] = str(uuid.uuid4())
    
    return job_data


def create_mock_profile(custom_data=None):
    """Creates a mock freelancer profile for testing"""
    profile_data = MOCK_PROFILE_DATA.copy()
    
    # Update with custom data if provided
    if custom_data and isinstance(custom_data, dict):
        profile_data.update(custom_data)
    
    # Generate UUID if not provided in custom data
    if profile_data["id"] == "placeholder-uuid":
        profile_data["id"] = str(uuid.uuid4())
    
    return profile_data


def create_mock_match_response(count=3, min_score=0.6, max_score=0.95):
    """Creates a mock matching response for testing"""
    matches = []
    
    # Generate specified number of matches
    for i in range(count):
        # Calculate score based on position (first matches have higher scores)
        score = max_score - ((max_score - min_score) * (i / max(1, count - 1)))
        
        matches.append({
            "id": f"profile-id-{i+1}",
            "score": round(score, 2),
            "explanation": f"Match {i+1} with score {score:.2f}",
            "data": {
                "name": f"Freelancer {i+1}",
                "skills": ["Python", "TensorFlow", "Machine Learning"]
            }
        })
    
    return {"matches": matches}


class TestAIMatchingClient:
    """Test suite for the AIMatchingClient class"""
    
    def setup_method(self, method):
        """Setup method that runs before each test"""
        # Create mock for httpx.AsyncClient
        self.mock_httpx_client = MagicMock()
        
        # Patch the httpx.AsyncClient to return our mock
        self.httpx_patch = patch('httpx.AsyncClient', return_value=self.mock_httpx_client)
        self.httpx_patch.start()
        
        # Initialize AIMatchingClient with test settings
        self.client = AIMatchingClient(
            base_url="http://test-ai-service:8001",
            timeout=10,
            retries=2,
            match_threshold=70,
            max_matches=5
        )
        
        # Configure mock responses
        self.mock_httpx_client.post.return_value.json.return_value = MOCK_MATCH_RESPONSE
        self.mock_httpx_client.post.return_value.raise_for_status = MagicMock()
        self.mock_httpx_client.get.return_value.json.return_value = {"status": "healthy"}
        self.mock_httpx_client.get.return_value.raise_for_status = MagicMock()
    
    def teardown_method(self, method):
        """Teardown method that runs after each test"""
        # Stop patches
        self.httpx_patch.stop()
    
    @pytest.mark.asyncio
    async def test_initialization(self):
        """Tests client initialization with parameters"""
        # Test that the client was initialized with the correct parameters
        assert self.client.base_url == "http://test-ai-service:8001"
        assert self.client.timeout == 10
        assert self.client.retries == 2
        assert self.client.match_threshold == 70
        assert self.client.max_matches == 5
        
        # Test default initialization
        default_client = AIMatchingClient()
        assert default_client.base_url == settings.AI_SERVICE_URL
        assert default_client.match_threshold == settings.JOB_MATCH_THRESHOLD
        assert default_client.max_matches == settings.MAX_MATCHES
    
    @pytest.mark.asyncio
    async def test_find_matches_for_job(self):
        """Tests finding matching profiles for a job"""
        # Prepare test data
        job = create_mock_job()
        profiles = [create_mock_profile() for _ in range(3)]
        
        # Configure mock response
        match_response = create_mock_match_response(count=3)
        self.mock_httpx_client.post.return_value.json.return_value = match_response
        
        # Call method under test
        result = await self.client.find_matches_for_job(
            job_data=job,
            profiles=profiles,
            include_explanation=True
        )
        
        # Verify results
        assert len(result) == 3
        assert all('id' in match for match in result)
        assert all('score' in match for match in result)
        assert all('explanation' in match for match in result)
        
        # Verify HTTP request
        self.mock_httpx_client.post.assert_called_once()
        call_args = self.mock_httpx_client.post.call_args[0]
        assert "http://test-ai-service:8001/recommendations/freelancers" in call_args[0]
    
    @pytest.mark.asyncio
    async def test_find_matches_for_profile(self):
        """Tests finding matching jobs for a profile"""
        # Prepare test data
        profile = create_mock_profile()
        jobs = [create_mock_job() for _ in range(3)]
        
        # Configure mock response
        match_response = create_mock_match_response(count=3)
        self.mock_httpx_client.post.return_value.json.return_value = match_response
        
        # Call method under test
        result = await self.client.find_matches_for_profile(
            profile_data=profile,
            jobs=jobs,
            include_explanation=True
        )
        
        # Verify results
        assert len(result) == 3
        assert all('id' in match for match in result)
        assert all('score' in match for match in result)
        assert all('explanation' in match for match in result)
        
        # Verify HTTP request
        self.mock_httpx_client.post.assert_called_once()
        call_args = self.mock_httpx_client.post.call_args[0]
        assert "http://test-ai-service:8001/recommendations/jobs" in call_args[0]
    
    @pytest.mark.asyncio
    async def test_calculate_match_score(self):
        """Tests calculating match score between a job and profile"""
        # Prepare test data
        job = create_mock_job()
        profile = create_mock_profile()
        
        # Configure mock response
        self.mock_httpx_client.post.return_value.json.return_value = {
            "score": 0.85,
            "explanation": "Strong match based on Python and TensorFlow skills"
        }
        
        # Call method under test
        result = await self.client.calculate_match_score(
            job_data=job,
            profile_data=profile,
            include_explanation=True
        )
        
        # Verify results
        assert 'job_id' in result
        assert 'profile_id' in result
        assert 'score' in result
        assert 'explanation' in result
        assert result['score'] == 0.85
        assert "Strong match" in result['explanation']
        
        # Verify HTTP request
        self.mock_httpx_client.post.assert_called_once()
        call_args = self.mock_httpx_client.post.call_args[0]
        assert "http://test-ai-service:8001/match/explain" in call_args[0]
    
    @pytest.mark.asyncio
    async def test_find_similar_jobs(self):
        """Tests finding similar jobs"""
        # Prepare test data
        job = create_mock_job()
        job_pool = [create_mock_job() for _ in range(5)]
        
        # Configure mock response
        self.mock_httpx_client.post.return_value.json.return_value = {
            "similar_jobs": [
                {"id": str(uuid.uuid4()), "similarity_score": 0.92, "job_data": {}},
                {"id": str(uuid.uuid4()), "similarity_score": 0.87, "job_data": {}},
                {"id": str(uuid.uuid4()), "similarity_score": 0.76, "job_data": {}}
            ]
        }
        
        # Call method under test
        result = await self.client.find_similar_jobs(
            job_data=job,
            job_pool=job_pool,
            limit=3
        )
        
        # Verify results
        assert len(result) == 3
        assert all('job_id' in item for item in result)
        assert all('similarity_score' in item for item in result)
        
        # Verify HTTP request
        self.mock_httpx_client.post.assert_called_once()
        call_args = self.mock_httpx_client.post.call_args[0]
        assert "http://test-ai-service:8001/recommendations/similar-jobs" in call_args[0]
    
    @pytest.mark.asyncio
    async def test_analyze_job_skills(self):
        """Tests job description skill analysis"""
        # Prepare test data
        job_description = "Looking for a Python developer with TensorFlow experience."
        
        # Configure mock response
        self.mock_httpx_client.post.return_value.json.return_value = {
            "required_skills": ["Python", "TensorFlow"],
            "nice_to_have_skills": ["PyTorch", "Computer Vision"],
            "confidence_score": 0.92
        }
        
        # Call method under test
        result = await self.client.analyze_job_skills(job_description)
        
        # Verify results
        assert 'required_skills' in result
        assert 'nice_to_have_skills' in result
        assert 'confidence_score' in result
        assert "Python" in result['required_skills']
        assert "PyTorch" in result['nice_to_have_skills']
        
        # Verify HTTP request
        self.mock_httpx_client.post.assert_called_once()
        call_args = self.mock_httpx_client.post.call_args[0]
        assert "http://test-ai-service:8001/analysis/skills" in call_args[0]
    
    @pytest.mark.asyncio
    async def test_batch_match_jobs(self):
        """Tests batch job matching functionality"""
        # Prepare test data
        jobs = [create_mock_job() for _ in range(3)]
        profiles = [create_mock_profile() for _ in range(5)]
        
        # Configure mock response
        batch_response = {
            "results": {
                str(uuid.uuid4()): [{"id": "profile-1", "score": 0.91}],
                str(uuid.uuid4()): [{"id": "profile-2", "score": 0.85}],
                str(uuid.uuid4()): [{"id": "profile-3", "score": 0.78}]
            }
        }
        self.mock_httpx_client.post.return_value.json.return_value = batch_response
        
        # Call method under test
        result = await self.client.batch_match_jobs(
            jobs=jobs,
            profiles=profiles,
            limit=2
        )
        
        # Verify results
        assert len(result) == 3  # Should have results for 3 jobs
        
        # Verify HTTP request
        self.mock_httpx_client.post.assert_called_once()
        call_args = self.mock_httpx_client.post.call_args[0]
        assert "http://test-ai-service:8001/recommendations/batch" in call_args[0]
    
    @pytest.mark.asyncio
    async def test_retry_mechanism(self):
        """Tests retry functionality on transient errors"""
        # Reset the mock to clear call history
        self.mock_httpx_client.reset_mock()
        
        # Configure mock to fail with connection error first time
        error_response = httpx.RequestError("Connection error", request=MagicMock())
        success_response = MagicMock()
        success_response.json.return_value = {"status": "healthy"}
        success_response.raise_for_status = MagicMock()
        
        self.mock_httpx_client.get.side_effect = [error_response, success_response]
        
        # Call method under test
        result = await self.client.get_ai_service_health()
        
        # Verify retry happened and eventually succeeded
        assert result is True
        assert self.mock_httpx_client.get.call_count == 2
    
    @pytest.mark.asyncio
    async def test_error_handling(self):
        """Tests client error handling"""
        # Reset the mock to clear call history
        self.mock_httpx_client.reset_mock()
        
        # Test HTTP error
        http_error = httpx.HTTPStatusError(
            "Internal Server Error", 
            request=MagicMock(), 
            response=MagicMock(status_code=500)
        )
        self.mock_httpx_client.post.side_effect = http_error
        
        # Call method and expect exception
        with pytest.raises(httpx.HTTPStatusError):
            await self.client.find_matches_for_job(
                job_data=create_mock_job(),
                profiles=[create_mock_profile()]
            )
        
        # Test connection error with max retries
        self.mock_httpx_client.reset_mock()
        connection_error = httpx.RequestError("Connection failed", request=MagicMock())
        self.mock_httpx_client.post.side_effect = [connection_error, connection_error, connection_error]
        
        # Call method and expect exception after retries
        with pytest.raises(httpx.RequestError):
            await self.client.find_matches_for_job(
                job_data=create_mock_job(),
                profiles=[create_mock_profile()]
            )
    
    @pytest.mark.asyncio
    async def test_client_close(self):
        """Tests client resource cleanup"""
        # Reset mock to track aclose() calls
        self.mock_httpx_client.reset_mock()
        
        # Call close method
        await self.client.close()
        
        # Verify aclose was called
        self.mock_httpx_client.aclose.assert_called_once()


class TestAIMatchingClientFactory:
    """Test suite for the AIMatchingClientFactory class"""
    
    def test_get_instance(self):
        """Tests singleton instance retrieval"""
        # Reset singleton instance
        AIMatchingClientFactory._instance = None
        
        # Get an instance
        client1 = AIMatchingClientFactory.get_instance()
        
        # Verify instance is created with correct parameters
        assert client1 is not None
        assert client1.base_url == settings.AI_SERVICE_URL
        assert client1.match_threshold == settings.JOB_MATCH_THRESHOLD
        assert client1.max_matches == settings.MAX_MATCHES
        
        # Get another instance and verify it's the same
        client2 = AIMatchingClientFactory.get_instance()
        assert client2 is client1
    
    def test_create_client(self):
        """Tests creation of custom client instances"""
        # Create a custom client
        custom_client = AIMatchingClientFactory.create_client(
            base_url="http://custom-ai-service:9000",
            timeout=15,
            retries=5,
            match_threshold=80,
            max_matches=10
        )
        
        # Verify custom parameters
        assert custom_client is not None
        assert custom_client.base_url == "http://custom-ai-service:9000"
        assert custom_client.timeout == 15
        assert custom_client.retries == 5
        assert custom_client.match_threshold == 80
        assert custom_client.max_matches == 10
        
        # Verify this is not the singleton instance
        singleton = AIMatchingClientFactory.get_instance()
        assert custom_client is not singleton


class TestMatchingService:
    """Test suite for the MatchingService class"""
    
    def setup_method(self, method):
        """Setup method that runs before each test"""
        # Create mock for AIMatchingClient
        self.mock_ai_client = MagicMock()
        
        # Initialize MatchingService with mocked client
        self.service = MatchingService(
            ai_client=self.mock_ai_client,
            match_threshold=75,
            max_matches=10
        )
        
        # Set up default responses for client methods
        self.mock_ai_client.find_matches_for_job.return_value = [
            {"id": "profile-1", "score": 0.91, "data": {}},
            {"id": "profile-2", "score": 0.85, "data": {}},
            {"id": "profile-3", "score": 0.78, "data": {}}
        ]
        
        self.mock_ai_client.find_matches_for_profile.return_value = [
            {"id": "job-1", "score": 0.92, "data": {}},
            {"id": "job-2", "score": 0.87, "data": {}},
            {"id": "job-3", "score": 0.79, "data": {}}
        ]
        
        self.mock_ai_client.calculate_match_score.return_value = {
            "job_id": "job-1",
            "profile_id": "profile-1",
            "score": 0.89,
            "explanation": "Strong match on required skills"
        }
        
        self.mock_ai_client.find_similar_jobs.return_value = [
            {"job_id": "job-2", "similarity_score": 0.95, "job_data": {}},
            {"job_id": "job-3", "similarity_score": 0.88, "job_data": {}},
            {"job_id": "job-4", "similarity_score": 0.76, "job_data": {}}
        ]
        
        self.mock_ai_client.get_ai_service_health.return_value = True
    
    def teardown_method(self, method):
        """Teardown method that runs after each test"""
        # Reset mocks
        self.mock_ai_client.reset_mock()
    
    def test_initialization(self):
        """Tests service initialization with parameters"""
        # Verify parameters were set correctly
        assert self.service.match_threshold == 75
        assert self.service.max_matches == 10
        assert self.service.ai_client is self.mock_ai_client
        
        # Test default initialization with factory
        with patch.object(AIMatchingClientFactory, 'get_instance') as mock_factory:
            mock_factory.return_value = MagicMock()
            default_service = MatchingService()
            assert default_service.match_threshold == settings.JOB_MATCH_THRESHOLD
            assert default_service.max_matches == settings.MAX_MATCHES
            assert default_service.ai_client is mock_factory.return_value
    
    @pytest.mark.asyncio
    async def test_find_matching_freelancers(self):
        """Tests finding matching freelancers for a job"""
        # Prepare test data
        job = create_mock_job()
        profiles = [create_mock_profile() for _ in range(3)]
        
        # Call method under test
        result = await self.service.find_matching_freelancers(
            job_data=job,
            freelancer_profiles=profiles,
            include_explanation=True
        )
        
        # Verify client was called with correct parameters
        self.mock_ai_client.find_matches_for_job.assert_called_once()
        
        # Verify results include percentages
        assert len(result) == 3
        assert all('percentage' in match for match in result)
        
        # Test filtering capability
        filters = {"min_score": 0.8}
        self.mock_ai_client.find_matches_for_job.return_value = [
            {"id": "profile-1", "score": 0.91, "data": {}},
            {"id": "profile-2", "score": 0.85, "data": {}},
            {"id": "profile-3", "score": 0.65, "data": {}}  # Below filter threshold
        ]
        
        result = await self.service.find_matching_freelancers(
            job_data=job,
            freelancer_profiles=profiles,
            filters=filters
        )
        
        # Verify filtering worked
        assert len(result) == 2  # Only 2 profiles above 0.8 threshold
    
    @pytest.mark.asyncio
    async def test_find_matching_jobs(self):
        """Tests finding matching jobs for a profile"""
        # Prepare test data
        profile = create_mock_profile()
        jobs = [create_mock_job() for _ in range(3)]
        
        # Call method under test
        result = await self.service.find_matching_jobs(
            profile_data=profile,
            jobs=jobs,
            include_explanation=True
        )
        
        # Verify client was called with correct parameters
        self.mock_ai_client.find_matches_for_profile.assert_called_once()
        
        # Verify results include percentages
        assert len(result) == 3
        assert all('percentage' in match for match in result)
        
        # Test limit parameter
        result = await self.service.find_matching_jobs(
            profile_data=profile,
            jobs=jobs,
            limit=2
        )
        
        # Verify limit was applied
        assert len(result) <= 2
    
    @pytest.mark.asyncio
    async def test_calculate_match_score(self):
        """Tests calculating match score with percentages"""
        # Prepare test data
        job = create_mock_job()
        profile = create_mock_profile()
        
        # Call method under test
        result = await self.service.calculate_match_score(
            job_data=job,
            profile_data=profile,
            include_explanation=True
        )
        
        # Verify client was called with correct parameters
        self.mock_ai_client.calculate_match_score.assert_called_once()
        
        # Verify result has percentage
        assert 'percentage' in result
        assert result['percentage'] == 89  # 0.89 * 100 = 89%
        assert 'explanation' in result
    
    @pytest.mark.asyncio
    async def test_find_similar_jobs(self):
        """Tests finding similar jobs with percentages"""
        # Prepare test data
        job = create_mock_job()
        job_pool = [create_mock_job() for _ in range(5)]
        
        # Call method under test
        result = await self.service.find_similar_jobs(
            reference_job=job,
            job_pool=job_pool,
            limit=3
        )
        
        # Verify client was called with correct parameters
        self.mock_ai_client.find_similar_jobs.assert_called_once()
        
        # Verify results include percentages
        assert len(result) == 3
        assert all('percentage' in job for job in result)
        
        # Test that Job objects can be passed
        # Create a Job object (using a simplified approach for testing)
        job_obj = MagicMock(spec=Job)
        job_obj.to_search_document.return_value = job
        
        await self.service.find_similar_jobs(
            reference_job=job_obj,
            job_pool=[job_obj, job_obj]
        )
        
        # Verify to_search_document was called
        job_obj.to_search_document.assert_called()
    
    @pytest.mark.asyncio
    async def test_batch_match_jobs(self):
        """Tests batch processing of job matches"""
        # Prepare test data
        jobs = [create_mock_job() for _ in range(3)]
        profiles = [create_mock_profile() for _ in range(5)]
        
        # Configure mock response
        batch_results = {
            str(uuid.uuid4()): [{"id": "profile-1", "score": 0.91, "data": {}}],
            str(uuid.uuid4()): [{"id": "profile-2", "score": 0.85, "data": {}}],
            str(uuid.uuid4()): [{"id": "profile-3", "score": 0.78, "data": {}}]
        }
        self.mock_ai_client.batch_match_jobs.return_value = batch_results
        
        # Call method under test
        result = await self.service.batch_match_jobs(
            jobs=jobs,
            profiles=profiles,
            limit=2
        )
        
        # Verify client was called with correct parameters
        self.mock_ai_client.batch_match_jobs.assert_called_once()
        
        # Verify results structure and percentages
        assert len(result) == 3  # Results for 3 jobs
        for job_id, matches in result.items():
            assert len(matches) == 1  # Each job has one match
            assert all('percentage' in match for match in matches)
    
    @pytest.mark.asyncio
    async def test_get_match_explanation(self):
        """Tests generation of human-readable match explanations"""
        # Prepare test data
        job = create_mock_job()
        profile = create_mock_profile()
        
        # Configure calculate_match_score response
        self.mock_ai_client.calculate_match_score.return_value = {
            "job_id": job["id"],
            "profile_id": profile["id"],
            "score": 0.92,
            "explanation": "This is a strong match because the freelancer has expertise in all required skills."
        }
        
        # Call method under test
        explanation = await self.service.get_match_explanation(
            job_data=job,
            profile_data=profile,
            match_score=0.92
        )
        
        # Verify client was called
        self.mock_ai_client.calculate_match_score.assert_called_once()
        
        # Verify explanation was returned
        assert explanation is not None
        assert "strong match" in explanation.lower()
        
        # Test with low match score
        explanation = await self.service.get_match_explanation(
            job_data=job,
            profile_data=profile,
            match_score=0.5  # Below threshold
        )
        
        # Should return default explanation for low scores
        assert "below the required threshold" in explanation
    
    def test_filter_matches_by_criteria(self):
        """Tests filtering matches by various criteria"""
        from ..src.services.matching_service import filter_matches_by_criteria
        
        # Prepare mock matches with various attributes
        matches = [
            {
                "id": "profile-1",
                "score": 0.95,
                "data": {
                    "skills": ["Python", "TensorFlow", "Machine Learning"],
                    "location": "Remote",
                    "hourly_rate": 75,
                    "available_from": "2023-01-15"
                }
            },
            {
                "id": "profile-2",
                "score": 0.85,
                "data": {
                    "skills": ["Python", "PyTorch"],
                    "location": "New York",
                    "hourly_rate": 95,
                    "available_from": "2023-02-01"
                }
            },
            {
                "id": "profile-3",
                "score": 0.75,
                "data": {
                    "skills": ["Java", "TensorFlow"],
                    "location": "Remote",
                    "hourly_rate": 65,
                    "available_from": "2023-01-10"
                }
            }
        ]
        
        # Test min_score filter
        filtered = filter_matches_by_criteria(matches, {"min_score": 0.8})
        assert len(filtered) == 2
        assert [m["id"] for m in filtered] == ["profile-1", "profile-2"]
        
        # Test required_skills filter
        filtered = filter_matches_by_criteria(
            matches, {"required_skills": ["Python"]}
        )
        assert len(filtered) == 2
        assert [m["id"] for m in filtered] == ["profile-1", "profile-2"]
        
        # Test location filter
        filtered = filter_matches_by_criteria(matches, {"location": "Remote"})
        assert len(filtered) == 2
        assert [m["id"] for m in filtered] == ["profile-1", "profile-3"]
        
        # Test rate filter
        filtered = filter_matches_by_criteria(matches, {"max_rate": 80})
        assert len(filtered) == 2
        assert [m["id"] for m in filtered] == ["profile-1", "profile-3"]
        
        # Test combined filters
        filtered = filter_matches_by_criteria(
            matches, 
            {
                "min_score": 0.8,
                "location": "Remote"
            }
        )
        assert len(filtered) == 1
        assert filtered[0]["id"] == "profile-1"
    
    @pytest.mark.asyncio
    async def test_health_check(self):
        """Tests service health check functionality"""
        # Test healthy response
        self.mock_ai_client.get_ai_service_health.return_value = True
        
        health_status = await self.service.health_check()
        
        assert health_status["status"] == "healthy"
        assert health_status["ai_service_connection"] is True
        assert "match_threshold" in health_status
        assert "max_matches" in health_status
        
        # Test unhealthy response
        self.mock_ai_client.get_ai_service_health.return_value = False
        
        health_status = await self.service.health_check()
        
        assert health_status["status"] == "degraded"
        assert health_status["ai_service_connection"] is False
        
        # Test exception handling
        self.mock_ai_client.get_ai_service_health.side_effect = Exception("Service unavailable")
        
        health_status = await self.service.health_check()
        
        assert health_status["status"] == "unhealthy"
        assert "error" in health_status


class TestMatchingServiceFactory:
    """Test suite for the MatchingServiceFactory class"""
    
    def test_get_instance(self):
        """Tests singleton instance retrieval"""
        # Reset singleton instance
        MatchingServiceFactory._instance = None
        
        # Patch the AIMatchingClientFactory.get_instance
        with patch.object(AIMatchingClientFactory, 'get_instance') as mock_factory:
            mock_factory.return_value = MagicMock()
            
            # Get an instance
            service1 = MatchingServiceFactory.get_instance()
            
            # Verify instance is created
            assert service1 is not None
            assert service1.match_threshold == settings.JOB_MATCH_THRESHOLD
            assert service1.max_matches == settings.MAX_MATCHES
            
            # Get another instance and verify it's the same
            service2 = MatchingServiceFactory.get_instance()
            assert service2 is service1
    
    def test_create_service(self):
        """Tests creation of custom service instances"""
        # Create a mock AI client
        mock_ai_client = MagicMock()
        
        # Create a custom service
        custom_service = MatchingServiceFactory.create_service(
            ai_client=mock_ai_client,
            match_threshold=85,
            max_matches=20
        )
        
        # Verify custom parameters
        assert custom_service is not None
        assert custom_service.ai_client is mock_ai_client
        assert custom_service.match_threshold == 85
        assert custom_service.max_matches == 20
        
        # Verify this is not the singleton instance
        singleton = MatchingServiceFactory.get_instance()
        assert custom_service is not singleton