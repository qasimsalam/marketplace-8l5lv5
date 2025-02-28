import pytest
from unittest.mock import MagicMock, patch
import numpy as np
import random

# Import recommendation engine and related classes/functions
from ..src.models.recommendation import (
    RecommendationEngine,
    JobRecommender,
    FreelancerRecommender,
    calculate_skill_match_score,
    adjust_recommendation_score,
    filter_recommendations
)

# Import embedding model
from ..src.models.embedding import EmbeddingModel

# Import services
from ..src.services.elasticsearch_service import ElasticsearchService
from ..src.services.openai_service import OpenAIService

# Import utility functions
from ..src.utils.vector_utils import cosine_similarity

# Import configuration settings
from ..src.config import settings

# Sample data for testing
SAMPLE_JOB_DATA = [
    {
        "id": "job1",
        "title": "Machine Learning Engineer",
        "description": "Develop ML models for recommendation system",
        "required_skills": ["python", "tensorflow", "scikit-learn", "machine learning"],
        "budget": {"min": 50, "max": 100}
    },
    {
        "id": "job2",
        "title": "Computer Vision Specialist",
        "description": "Implement object detection models",
        "required_skills": ["python", "opencv", "tensorflow", "computer vision"],
        "budget": {"min": 60, "max": 120}
    },
    {
        "id": "job3",
        "title": "NLP Engineer",
        "description": "Build language processing pipeline",
        "required_skills": ["python", "nltk", "transformers", "nlp"],
        "budget": {"min": 70, "max": 130}
    }
]

SAMPLE_PROFILE_DATA = [
    {
        "id": "profile1",
        "name": "John Doe",
        "bio": "Experienced ML engineer with 5 years of experience",
        "skills": ["python", "tensorflow", "scikit-learn", "machine learning", "deep learning"],
        "rate": {"min": 50, "max": 100}
    },
    {
        "id": "profile2",
        "name": "Jane Smith",
        "bio": "Computer vision expert specialized in object detection",
        "skills": ["python", "opencv", "pytorch", "computer vision", "image processing"],
        "rate": {"min": 60, "max": 120}
    },
    {
        "id": "profile3",
        "name": "Alex Johnson",
        "bio": "NLP specialist with expertise in transformers",
        "skills": ["python", "nltk", "spacy", "transformers", "nlp", "bert"],
        "rate": {"min": 70, "max": 140}
    }
]


def test_skill_match_score_calculation():
    """Test that skill match scoring correctly calculates the overlap between skill sets"""
    # Test perfect match
    job_skills = ["python", "tensorflow", "scikit-learn"]
    freelancer_skills = ["python", "tensorflow", "scikit-learn", "keras"]
    score = calculate_skill_match_score(job_skills, freelancer_skills)
    assert score == 1.0, "Perfect skill match should return 1.0"
    
    # Test partial match
    job_skills = ["python", "tensorflow", "scikit-learn", "pytorch"]
    freelancer_skills = ["python", "tensorflow", "keras"]
    score = calculate_skill_match_score(job_skills, freelancer_skills)
    assert 0.4 < score < 0.6, f"Partial skill match should return fractional score, got {score}"
    
    # Test no match
    job_skills = ["ruby", "rails", "postgresql"]
    freelancer_skills = ["python", "django", "mongodb"]
    score = calculate_skill_match_score(job_skills, freelancer_skills)
    assert score == 0.0, "No skill match should return 0.0"
    
    # Test case insensitivity
    job_skills = ["Python", "TensorFlow", "scikit-learn"]
    freelancer_skills = ["python", "tensorflow", "Scikit-Learn"]
    score = calculate_skill_match_score(job_skills, freelancer_skills)
    assert score == 1.0, "Case differences should not affect matching"
    
    # Test empty lists
    score = calculate_skill_match_score([], ["python"])
    assert score == 0.0, "Empty job skills should return 0.0"
    
    score = calculate_skill_match_score(["python"], [])
    assert score == 0.0, "Empty freelancer skills should return 0.0"


def test_adjust_recommendation_score():
    """Test score adjustment based on skill match, experience, and budget compatibility"""
    # Define test data
    job_data = {
        "id": "job1",
        "title": "Senior ML Engineer",
        "skills": ["python", "tensorflow", "keras", "machine learning"],
        "experience_level": "expert",
        "budget": 100
    }
    
    # Test perfect match profile (good skills, experience, and rate)
    profile_data = {
        "id": "profile1",
        "name": "John Doe",
        "skills": ["python", "tensorflow", "keras", "machine learning", "deep learning"],
        "experience_level": "expert",
        "hourly_rate": 95
    }
    
    similarity_score = 0.9  # High vector similarity
    adjusted_score = adjust_recommendation_score(similarity_score, job_data, profile_data)
    assert adjusted_score > 0.85, f"Perfect match should have high adjusted score, got {adjusted_score}"
    
    # Test underqualified profile (good skills but junior)
    profile_data_junior = {
        "id": "profile2",
        "name": "Bob Smith",
        "skills": ["python", "tensorflow", "keras", "machine learning"],
        "experience_level": "beginner",
        "hourly_rate": 60
    }
    
    adjusted_score_junior = adjust_recommendation_score(similarity_score, job_data, profile_data_junior)
    assert adjusted_score > adjusted_score_junior, "Junior profile should score lower than expert"
    
    # Test overpriced profile (good skills, right experience, but expensive)
    profile_data_expensive = {
        "id": "profile3",
        "name": "Alice Brown",
        "skills": ["python", "tensorflow", "keras", "machine learning"],
        "experience_level": "expert",
        "hourly_rate": 200
    }
    
    adjusted_score_expensive = adjust_recommendation_score(similarity_score, job_data, profile_data_expensive)
    assert adjusted_score > adjusted_score_expensive, "Overpriced profile should score lower"
    
    # Test poor skill match
    profile_data_poor_skills = {
        "id": "profile4",
        "name": "Charlie Green",
        "skills": ["java", "spring", "sql"],
        "experience_level": "expert",
        "hourly_rate": 95
    }
    
    adjusted_score_poor_skills = adjust_recommendation_score(similarity_score, job_data, profile_data_poor_skills)
    assert adjusted_score > adjusted_score_poor_skills, "Poor skill match should score lower"


def test_filter_recommendations():
    """Test filtering recommendation results based on threshold and criteria"""
    # Create sample recommendations
    recommendations = [
        {"id": "rec1", "score": 0.95, "data": {"location": "remote", "availability": "full-time", "experience_years": 5}},
        {"id": "rec2", "score": 0.85, "data": {"location": "onsite", "availability": "part-time", "experience_years": 3}},
        {"id": "rec3", "score": 0.75, "data": {"location": "remote", "availability": "full-time", "experience_years": 2}},
        {"id": "rec4", "score": 0.65, "data": {"location": "remote", "availability": "contract", "experience_years": 7}},
        {"id": "rec5", "score": 0.55, "data": {"location": "onsite", "availability": "full-time", "experience_years": 10}}
    ]
    
    # Test threshold filtering
    threshold_results = filter_recommendations(recommendations, threshold=0.7)
    assert len(threshold_results) == 3, f"Expected 3 results above threshold 0.7, got {len(threshold_results)}"
    assert all(r["score"] >= 0.7 for r in threshold_results), "All results should be above threshold"
    
    # Test score ordering
    assert threshold_results[0]["score"] >= threshold_results[1]["score"] >= threshold_results[2]["score"], \
        "Results should be ordered by score in descending order"
    
    # Test location filter
    location_results = filter_recommendations(recommendations, threshold=0.5, filters={"location": "remote"})
    assert len(location_results) == 3, f"Expected 3 remote results, got {len(location_results)}"
    assert all(r["data"]["location"] == "remote" for r in location_results), "All results should be remote"
    
    # Test availability filter
    availability_results = filter_recommendations(recommendations, threshold=0.5, filters={"availability": "full-time"})
    assert len(availability_results) == 3, f"Expected 3 full-time results, got {len(availability_results)}"
    assert all(r["data"]["availability"] == "full-time" for r in availability_results), "All results should be full-time"
    
    # Test experience filter
    experience_results = filter_recommendations(recommendations, threshold=0.5, filters={"min_experience": 5})
    assert len(experience_results) == 3, f"Expected 3 results with 5+ years, got {len(experience_results)}"
    assert all(r["data"]["experience_years"] >= 5 for r in experience_results), "All results should have 5+ years experience"
    
    # Test combined filters
    combined_results = filter_recommendations(
        recommendations, 
        threshold=0.5, 
        filters={"location": "remote", "availability": "full-time"}
    )
    assert len(combined_results) == 2, f"Expected 2 results with combined filters, got {len(combined_results)}"
    assert all(r["data"]["location"] == "remote" and r["data"]["availability"] == "full-time" 
              for r in combined_results), "All results should match both filters"


def create_mock_embedding_model():
    """Helper function to create a mock embedding model for testing"""
    mock_embedding_model = MagicMock(spec=EmbeddingModel)
    
    # Configure embed_job to return a random unit vector
    def mock_embed_job(job_data):
        vector = np.random.random(settings.EMBEDDING_DIMENSION)
        return vector / np.linalg.norm(vector)  # Normalize to unit vector
    
    # Configure embed_profile to return a random unit vector
    def mock_embed_profile(profile_data):
        vector = np.random.random(settings.EMBEDDING_DIMENSION)
        return vector / np.linalg.norm(vector)  # Normalize to unit vector
    
    # Configure calculate_similarity with simple cosine similarity
    def mock_calculate_similarity(embedding1, embedding2):
        return (np.dot(embedding1, embedding2) + 1) / 2  # Map from [-1,1] to [0,1]
    
    mock_embedding_model.embed_job.side_effect = mock_embed_job
    mock_embedding_model.embed_profile.side_effect = mock_embed_profile
    mock_embedding_model.calculate_similarity.side_effect = mock_calculate_similarity
    
    return mock_embedding_model


def create_mock_elasticsearch_service():
    """Helper function to create a mock elasticsearch service for testing"""
    mock_es_service = MagicMock(spec=ElasticsearchService)
    
    # Configure vector_search to return sample results
    def mock_vector_search(query_vector, index_name, size=10, min_score=None, filters=None):
        if index_name.endswith("jobs"):
            results = [
                {"id": job["id"], "score": 0.9 - i*0.1, "data": job} 
                for i, job in enumerate(SAMPLE_JOB_DATA[:size])
            ]
        else:
            results = [
                {"id": profile["id"], "score": 0.9 - i*0.1, "data": profile} 
                for i, profile in enumerate(SAMPLE_PROFILE_DATA[:size])
            ]
        return results
    
    # Configure find_similar_jobs to return sample jobs
    def mock_find_similar_jobs(reference_job, limit=10, min_score=0.7):
        # Filter out the reference job
        other_jobs = [job for job in SAMPLE_JOB_DATA if job["id"] != reference_job.get("id")]
        results = [
            {"id": job["id"], "score": 0.9 - i*0.1, "data": job} 
            for i, job in enumerate(other_jobs[:limit])
        ]
        return results
    
    # Configure find_similar_profiles to return sample profiles
    def mock_find_similar_profiles(reference_profile, limit=10, min_score=0.7):
        # Filter out the reference profile
        other_profiles = [
            profile for profile in SAMPLE_PROFILE_DATA 
            if profile["id"] != reference_profile.get("id")
        ]
        results = [
            {"id": profile["id"], "score": 0.9 - i*0.1, "data": profile} 
            for i, profile in enumerate(other_profiles[:limit])
        ]
        return results
    
    mock_es_service.vector_search.side_effect = mock_vector_search
    mock_es_service.find_similar_jobs.side_effect = mock_find_similar_jobs
    mock_es_service.find_similar_profiles.side_effect = mock_find_similar_profiles
    
    return mock_es_service


def create_mock_openai_service():
    """Helper function to create a mock OpenAI service for testing"""
    mock_openai_service = MagicMock(spec=OpenAIService)
    
    # Configure generate_match_explanation to return sample explanations
    def mock_generate_match_explanation(job_data, profile_data, match_score):
        job_title = job_data.get("title", "Unknown Job")
        profile_name = profile_data.get("name", "Unknown Candidate")
        score_percentage = int(match_score * 100)
        
        explanation = (
            f"{profile_name} is a {score_percentage}% match for the {job_title} position. "
            f"The candidate has many of the required skills including programming languages "
            f"and relevant frameworks. Their experience aligns well with the job requirements."
        )
        return explanation
    
    mock_openai_service.generate_match_explanation.side_effect = mock_generate_match_explanation
    
    return mock_openai_service


class TestRecommendationEngine:
    """Test class for the core recommendation engine functionality"""
    
    def setup_method(self):
        """Setup method that runs before each test"""
        # Create mock services
        self.mock_embedding_model = create_mock_embedding_model()
        self.mock_es_service = create_mock_elasticsearch_service()
        self.mock_openai_service = create_mock_openai_service()
        
        # Create recommendation engine with mocks
        self.engine = RecommendationEngine(
            embedding_model=self.mock_embedding_model,
            es_service=self.mock_es_service,
            openai_service=self.mock_openai_service,
            max_recommendations=settings.MAX_RECOMMENDATIONS,
            min_score=settings.DEFAULT_MIN_SCORE
        )
        
        # Set up test data
        self.test_jobs = SAMPLE_JOB_DATA
        self.test_profiles = SAMPLE_PROFILE_DATA
    
    def test_recommend_jobs_for_freelancer(self):
        """Test that job recommendations for a freelancer profile work correctly"""
        # Set up test data
        test_profile = self.test_profiles[0]
        available_jobs = self.test_jobs
        
        # Configure mock to return specific similarity scores for jobs
        similarity_scores = [0.9, 0.8, 0.6]
        self.mock_embedding_model.calculate_similarity.side_effect = lambda profile, job: similarity_scores[
            min(available_jobs.index(job), len(similarity_scores) - 1)
        ]
        
        # Call the method under test
        recommendations = self.engine.recommend_jobs_for_freelancer(
            profile_data=test_profile,
            available_jobs=available_jobs,
            limit=2,
            include_explanation=True
        )
        
        # Assert expectations
        assert len(recommendations) <= 2, "Should respect the limit parameter"
        assert all("score" in rec for rec in recommendations), "All recommendations should have scores"
        assert all("id" in rec for rec in recommendations), "All recommendations should have IDs"
        assert all("data" in rec for rec in recommendations), "All recommendations should have data"
        assert all("explanation" in rec for rec in recommendations), "All recommendations should have explanations"
        assert recommendations[0]["score"] >= recommendations[-1]["score"], "Recommendations should be sorted by score"
        assert all(rec["score"] >= settings.DEFAULT_MIN_SCORE for rec in recommendations), \
            "All recommendations should be above minimum score"
        
        # Verify that embedding model was called
        assert self.mock_embedding_model.embed_profile.called, "Should call embed_profile"
        assert self.mock_embedding_model.embed_job.called, "Should call embed_job"
        assert self.mock_embedding_model.calculate_similarity.called, "Should call calculate_similarity"
    
    def test_recommend_freelancers_for_job(self):
        """Test that freelancer recommendations for a job posting work correctly"""
        # Set up test data
        test_job = self.test_jobs[0]
        available_profiles = self.test_profiles
        
        # Configure mock to return specific similarity scores for profiles
        similarity_scores = [0.95, 0.75, 0.65]
        self.mock_embedding_model.calculate_similarity.side_effect = lambda job, profile: similarity_scores[
            min(available_profiles.index(profile), len(similarity_scores) - 1)
        ]
        
        # Call the method under test
        recommendations = self.engine.recommend_freelancers_for_job(
            job_data=test_job,
            available_profiles=available_profiles,
            limit=2,
            include_explanation=True
        )
        
        # Assert expectations
        assert len(recommendations) <= 2, "Should respect the limit parameter"
        assert all("score" in rec for rec in recommendations), "All recommendations should have scores"
        assert all("id" in rec for rec in recommendations), "All recommendations should have IDs"
        assert all("data" in rec for rec in recommendations), "All recommendations should have data"
        assert all("explanation" in rec for rec in recommendations), "All recommendations should have explanations"
        assert recommendations[0]["score"] >= recommendations[-1]["score"], "Recommendations should be sorted by score"
        assert all(rec["score"] >= settings.DEFAULT_MIN_SCORE for rec in recommendations), \
            "All recommendations should be above minimum score"
        
        # Verify that embedding model was called
        assert self.mock_embedding_model.embed_job.called, "Should call embed_job"
        assert self.mock_embedding_model.embed_profile.called, "Should call embed_profile"
        assert self.mock_embedding_model.calculate_similarity.called, "Should call calculate_similarity"
    
    def test_similarity_search(self):
        """Test vector similarity search functionality"""
        # Create test data
        query_vector = np.random.random(settings.EMBEDDING_DIMENSION)
        query_vector = query_vector / np.linalg.norm(query_vector)  # Normalize
        
        candidates = [
            {"id": f"item{i}", "embedding": np.random.random(settings.EMBEDDING_DIMENSION)} 
            for i in range(5)
        ]
        
        # Normalize candidate embeddings
        for candidate in candidates:
            candidate["embedding"] = candidate["embedding"] / np.linalg.norm(candidate["embedding"])
        
        # Configure mock to return controlled similarity scores
        similarity_values = [0.9, 0.8, 0.7, 0.6, 0.5]
        self.mock_embedding_model.calculate_similarity.side_effect = lambda query, candidate: similarity_values[
            min(candidates.index({"id": candidate["id"], "embedding": candidate["embedding"]}), len(similarity_values) - 1)
        ]
        
        # Call the method under test
        results = self.engine.similarity_search(
            query_embedding=query_vector,
            candidates=candidates,
            embedding_field="embedding",
            top_k=3
        )
        
        # Assert expectations
        assert len(results) <= 3, "Should respect the top_k parameter"
        assert all("score" in result for result in results), "All results should have scores"
        assert all("id" in result for result in results), "All results should have IDs"
        assert all("data" in result for result in results), "All results should have data"
        assert results[0]["score"] >= results[-1]["score"], "Results should be sorted by score"
        assert all(0 <= result["score"] <= 1 for result in results), "Scores should be between 0 and 1"
    
    def test_get_similar_jobs(self):
        """Test finding jobs similar to a reference job"""
        # Set up test data
        reference_job = self.test_jobs[0]
        job_pool = self.test_jobs
        
        # Call the method under test
        similar_jobs = self.engine.get_similar_jobs(
            reference_job=reference_job,
            job_pool=job_pool,
            limit=2
        )
        
        # Assert expectations
        assert len(similar_jobs) <= 2, "Should respect the limit parameter"
        assert all("score" in job for job in similar_jobs), "All results should have scores"
        assert all("id" in job for job in similar_jobs), "All results should have IDs"
        assert all("data" in job for job in similar_jobs), "All results should have data"
        assert all(job["id"] != reference_job["id"] for job in similar_jobs), \
            "Reference job should not be in results"
        assert similar_jobs[0]["score"] >= similar_jobs[-1]["score"] if similar_jobs else True, \
            "Jobs should be ordered by similarity"
        
        # Verify that embedding model was called
        assert self.mock_embedding_model.embed_job.called or "embedding" in reference_job, \
            "Should call embed_job or use existing embedding"
    
    def test_get_similar_profiles(self):
        """Test finding profiles similar to a reference profile"""
        # Set up test data
        reference_profile = self.test_profiles[0]
        profile_pool = self.test_profiles
        
        # Call the method under test
        similar_profiles = self.engine.get_similar_profiles(
            reference_profile=reference_profile,
            profile_pool=profile_pool,
            limit=2
        )
        
        # Assert expectations
        assert len(similar_profiles) <= 2, "Should respect the limit parameter"
        assert all("score" in profile for profile in similar_profiles), "All results should have scores"
        assert all("id" in profile for profile in similar_profiles), "All results should have IDs"
        assert all("data" in profile for profile in similar_profiles), "All results should have data"
        assert all(profile["id"] != reference_profile["id"] for profile in similar_profiles), \
            "Reference profile should not be in results"
        assert similar_profiles[0]["score"] >= similar_profiles[-1]["score"] if similar_profiles else True, \
            "Profiles should be ordered by similarity"
        
        # Verify that embedding model was called
        assert self.mock_embedding_model.embed_profile.called or "embedding" in reference_profile, \
            "Should call embed_profile or use existing embedding"
    
    def test_generate_match_explanation(self):
        """Test generating human-readable match explanations"""
        # Set up test data
        test_job = self.test_jobs[0]
        test_profile = self.test_profiles[0]
        match_score = 0.85
        
        # Configure mock to return a specific explanation
        expected_explanation = (
            f"{test_profile['name']} is a 85% match for the {test_job['title']} position. "
            f"The candidate has many of the required skills including programming languages "
            f"and relevant frameworks. Their experience aligns well with the job requirements."
        )
        self.mock_openai_service.generate_match_explanation.return_value = expected_explanation
        
        # Call the method under test
        explanation = self.engine.generate_match_explanation(
            test_job, 
            test_profile, 
            match_score, 
            match_type='job_to_profile'
        )
        
        # Assert expectations
        assert explanation == expected_explanation, "Should return the expected explanation"
        assert test_profile['name'] in explanation, "Explanation should mention the candidate name"
        assert test_job['title'] in explanation, "Explanation should mention the job title"
        assert "85%" in explanation, "Explanation should mention the match percentage"
        
        # Verify that OpenAI service was called
        self.mock_openai_service.generate_match_explanation.assert_called_once_with(
            job_data=test_job,
            profile_data=test_profile,
            match_score=match_score
        )


class TestJobRecommender:
    """Test class for the specialized job recommender functionality"""
    
    def setup_method(self):
        """Setup method that runs before each test"""
        # Create mock recommendation engine
        self.mock_engine = MagicMock(spec=RecommendationEngine)
        
        # Create job recommender with mock engine
        self.job_recommender = JobRecommender(engine=self.mock_engine)
        
        # Set up test data
        self.test_jobs = SAMPLE_JOB_DATA
        self.test_profiles = SAMPLE_PROFILE_DATA
    
    def test_get_recommendations(self):
        """Test getting job recommendations for a freelancer profile"""
        # Set up test data
        test_profile = self.test_profiles[0]
        available_jobs = self.test_jobs
        
        # Configure mock to return specific recommendations
        sample_recommendations = [
            {
                "id": job["id"],
                "score": 0.9 - i*0.1,
                "rank": i+1,
                "data": job,
                "explanation": f"This is a good match for {job['title']}"
            }
            for i, job in enumerate(available_jobs)
        ]
        self.mock_engine.recommend_jobs_for_freelancer.return_value = sample_recommendations
        
        # Call the method under test
        recommendations = self.job_recommender.get_recommendations(
            profile=test_profile,
            available_jobs=available_jobs,
            limit=2
        )
        
        # Assert expectations
        assert len(recommendations) == len(sample_recommendations), "Should return all recommendations from engine"
        assert all("explanation" in rec for rec in recommendations), "All recommendations should have explanations"
        
        # Verify that engine was called with correct parameters
        self.mock_engine.recommend_jobs_for_freelancer.assert_called_once_with(
            profile_data=test_profile,
            available_jobs=[job for job in available_jobs if job.get('status', '').lower() in ['open', 'active']],
            limit=2,
            filters=None,
            include_explanation=True
        )
    
    def test_explain_match(self):
        """Test generating detailed explanation for job-profile match"""
        # Set up test data
        test_job = self.test_jobs[0]
        test_profile = self.test_profiles[0]
        match_score = 0.85
        
        # Configure mock to return a specific explanation
        expected_explanation = f"This is a detailed explanation of the match between {test_profile['name']} and {test_job['title']}"
        self.mock_engine.generate_match_explanation.return_value = expected_explanation
        
        # Call the method under test
        explanation = self.job_recommender.explain_match(
            job=test_job,
            profile=test_profile,
            score=match_score
        )
        
        # Assert expectations
        assert explanation["score"] == match_score, "Explanation should include the match score"
        assert "skill_match" in explanation, "Explanation should include skill match percentage"
        assert "matching_skills" in explanation, "Explanation should include matching skills"
        assert "missing_skills" in explanation, "Explanation should include missing skills"
        assert "experience_match" in explanation, "Explanation should include experience match assessment"
        assert "rate_compatible" in explanation, "Explanation should include rate compatibility"
        assert explanation["explanation"] == expected_explanation, "Should include the natural language explanation"
        
        # Verify that engine was called
        self.mock_engine.generate_match_explanation.assert_called_once_with(
            test_job, test_profile, match_score, match_type='job_to_profile'
        )


class TestFreelancerRecommender:
    """Test class for the specialized freelancer recommender functionality"""
    
    def setup_method(self):
        """Setup method that runs before each test"""
        # Create mock recommendation engine
        self.mock_engine = MagicMock(spec=RecommendationEngine)
        
        # Create freelancer recommender with mock engine
        self.freelancer_recommender = FreelancerRecommender(engine=self.mock_engine)
        
        # Set up test data
        self.test_jobs = SAMPLE_JOB_DATA
        self.test_profiles = SAMPLE_PROFILE_DATA
    
    def test_get_recommendations(self):
        """Test getting freelancer recommendations for a job"""
        # Set up test data
        test_job = self.test_jobs[0]
        available_profiles = self.test_profiles
        
        # Configure mock to return specific recommendations
        sample_recommendations = [
            {
                "id": profile["id"],
                "score": 0.9 - i*0.1,
                "rank": i+1,
                "data": profile,
                "explanation": f"This is a good match with {profile['name']}"
            }
            for i, profile in enumerate(available_profiles)
        ]
        self.mock_engine.recommend_freelancers_for_job.return_value = sample_recommendations
        
        # Call the method under test
        recommendations = self.freelancer_recommender.get_recommendations(
            job=test_job,
            available_profiles=available_profiles,
            limit=2
        )
        
        # Assert expectations
        assert len(recommendations) == len(sample_recommendations), "Should return all recommendations from engine"
        assert all("explanation" in rec for rec in recommendations), "All recommendations should have explanations"
        
        # Verify that engine was called with correct parameters
        self.mock_engine.recommend_freelancers_for_job.assert_called_once_with(
            job_data=test_job,
            available_profiles=[profile for profile in available_profiles if profile.get('status', '').lower() in ['available', 'active']],
            limit=2,
            filters=None,
            include_explanation=True
        )
    
    def test_filter_by_availability(self):
        """Test filtering recommendations by freelancer availability"""
        # Create sample recommendations with different availability values
        recommendations = [
            {
                "id": "rec1",
                "score": 0.9,
                "data": {"name": "John", "availability": "full-time"}
            },
            {
                "id": "rec2",
                "score": 0.8,
                "data": {"name": "Jane", "availability": "part-time"}
            },
            {
                "id": "rec3",
                "score": 0.7,
                "data": {"name": "Bob", "availability": "contract"}
            },
            {
                "id": "rec4",
                "score": 0.6,
                "data": {"name": "Alice", "availability": "full-time"}
            }
        ]
        
        # Test filtering for full-time
        full_time_results = self.freelancer_recommender.filter_by_availability(
            recommendations, "full-time"
        )
        assert len(full_time_results) == 2, "Should find 2 full-time recommendations"
        assert all(rec["data"]["availability"] == "full-time" for rec in full_time_results), \
            "All results should have full-time availability"
        
        # Test filtering for part-time
        part_time_results = self.freelancer_recommender.filter_by_availability(
            recommendations, "part-time"
        )
        assert len(part_time_results) == 1, "Should find 1 part-time recommendation"
        assert all(rec["data"]["availability"] == "part-time" for rec in part_time_results), \
            "All results should have part-time availability"
        
        # Test compatibility (full-time freelancers can work part-time)
        part_time_compatible = self.freelancer_recommender.filter_by_availability(
            [{"id": "rec1", "data": {"availability": "full-time"}}], "part-time"
        )
        assert len(part_time_compatible) == 1, "Full-time freelancers should be able to work part-time"
        
        # Test incompatibility (part-time freelancers cannot work full-time)
        full_time_incompatible = self.freelancer_recommender.filter_by_availability(
            [{"id": "rec2", "data": {"availability": "part-time"}}], "full-time"
        )
        assert len(full_time_incompatible) == 0, "Part-time freelancers should not be able to work full-time"
    
    def test_explain_match(self):
        """Test generating detailed explanation for job-profile match"""
        # Set up test data
        test_job = self.test_jobs[0]
        test_profile = self.test_profiles[0]
        match_score = 0.85
        
        # Configure mock to return a specific explanation
        expected_explanation = f"This is a detailed explanation of the match between {test_profile['name']} and {test_job['title']}"
        self.mock_engine.generate_match_explanation.return_value = expected_explanation
        
        # Call the method under test
        explanation = self.freelancer_recommender.explain_match(
            job=test_job,
            profile=test_profile,
            score=match_score
        )
        
        # Assert expectations
        assert explanation["score"] == match_score, "Explanation should include the match score"
        assert "skill_match" in explanation, "Explanation should include skill match percentage"
        assert "matching_skills" in explanation, "Explanation should include matching skills"
        assert "missing_skills" in explanation, "Explanation should include missing skills"
        assert "additional_skills" in explanation, "Explanation should include additional skills the freelancer has"
        assert "experience_match" in explanation, "Explanation should include experience match assessment"
        assert "rate_compatible" in explanation, "Explanation should include rate compatibility"
        assert explanation["explanation"] == expected_explanation, "Should include the natural language explanation"
        
        # Verify that engine was called
        self.mock_engine.generate_match_explanation.assert_called_once_with(
            test_job, test_profile, match_score, match_type='profile_to_job'
        )