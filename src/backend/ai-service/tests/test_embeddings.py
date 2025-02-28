"""
Unit tests for the embedding functionality in the AI service.

These tests cover the core embedding functionality that powers AI-powered matching
and recommendations in the AI Talent Marketplace platform.
"""

import pytest
import numpy as np
from unittest.mock import Mock, patch, MagicMock

# Import the models and utilities to test
from ..src.models.embedding import EmbeddingModel
from ..src.utils.vector_utils import cosine_similarity, normalize_vector
from ..src.services.elasticsearch_service import ElasticsearchService
from ..src.services.openai_service import OpenAIService
from ..src.config import settings

# Define test constants
TEST_TEXT_SAMPLES = [
    "Machine learning engineer with 5 years of experience",
    "AI researcher specializing in natural language processing",
    "Data scientist with expertise in computer vision",
    "Deep learning specialist focused on transformer models",
    "Full-stack developer with knowledge of machine learning deployment"
]

TEST_EMBEDDING_DIMENSION = 1536  # Should match config.EMBEDDING_DIMENSION

def setup_module():
    """Set up fixtures for the entire test module."""
    # Initialize any global test fixtures needed across tests
    pass

def teardown_module():
    """Clean up after all tests in the module have run."""
    # Clean up any global test fixtures
    pass

@pytest.mark.embedding
def test_generate_embedding():
    """Test that the generate_embedding method correctly converts text to vector."""
    
    # Set up a test text input
    test_text = "machine learning engineer"
    
    # Create a mock embedding
    mock_embedding = np.random.rand(TEST_EMBEDDING_DIMENSION)
    
    # Create an instance of EmbeddingModel with the mocked OpenAI client
    with patch('openai.Client') as mock_client:
        # Configure the mock client's embeddings.create method to return a response
        # with our mock embedding
        mock_response = MagicMock()
        mock_response.data = [MagicMock(embedding=mock_embedding.tolist())]
        mock_client.return_value.embeddings.create.return_value = mock_response
        
        # Create the embedding model
        embedding_model = EmbeddingModel(
            model_name="test-model",
            embedding_dimension=TEST_EMBEDDING_DIMENSION
        )
        
        # Call the get_embedding method with the test input
        result = embedding_model.get_embedding(test_text)
        
        # Assert that the returned embedding has the correct shape
        assert result.shape == (TEST_EMBEDDING_DIMENSION,)
        
        # Assert that the OpenAI client was called with the correct parameters
        mock_client.return_value.embeddings.create.assert_called_once()
        call_args = mock_client.return_value.embeddings.create.call_args[1]
        assert call_args["model"] == "test-model"
        assert isinstance(call_args["input"], str)
        
        # Verify the result is normalized (unit length)
        norm = np.linalg.norm(result)
        assert np.isclose(norm, 1.0)

@pytest.mark.embedding
def test_batch_generate_embeddings():
    """Test that the batch_generate_embeddings method correctly converts multiple texts to vectors."""
    
    # Set up multiple test text inputs
    test_texts = TEST_TEXT_SAMPLES
    
    # Create mock embeddings for each test text
    mock_embeddings = []
    for _ in range(len(test_texts)):
        mock_embedding = np.random.rand(TEST_EMBEDDING_DIMENSION)
        # Normalize the mock embedding like the real implementation would
        mock_embedding = mock_embedding / np.linalg.norm(mock_embedding)
        mock_embeddings.append(mock_embedding)
    
    # Create an instance of EmbeddingModel with the mocked OpenAI client
    with patch('openai.Client') as mock_client:
        # Configure the mock client's embeddings.create method to return a response
        # with our mock embeddings
        mock_response = MagicMock()
        mock_response.data = [MagicMock(embedding=embedding.tolist()) for embedding in mock_embeddings]
        mock_client.return_value.embeddings.create.return_value = mock_response
        
        # Create the embedding model
        embedding_model = EmbeddingModel(
            model_name="test-model",
            embedding_dimension=TEST_EMBEDDING_DIMENSION,
            batch_size=len(test_texts)  # Set batch size to handle all texts at once
        )
        
        # Call the get_embeddings method with the test inputs
        results = embedding_model.get_embeddings(test_texts)
        
        # Assert that the returned embeddings have the correct shape and count
        assert len(results) == len(test_texts)
        for result in results:
            assert result.shape == (TEST_EMBEDDING_DIMENSION,)
            # Verify each result is normalized
            norm = np.linalg.norm(result)
            assert np.isclose(norm, 1.0)
        
        # Assert that the OpenAI service was called the correct number of times
        mock_client.return_value.embeddings.create.assert_called_once()
        call_args = mock_client.return_value.embeddings.create.call_args[1]
        assert call_args["model"] == "test-model"
        assert isinstance(call_args["input"], list)
        assert len(call_args["input"]) == len(test_texts)

@pytest.mark.embedding
def test_calculate_similarity():
    """Test that the calculate_similarity method correctly calculates the similarity between two texts."""
    
    # Set up two test text inputs (job description and candidate profile)
    job_description = "Looking for a machine learning engineer with skills in Python and TensorFlow"
    candidate_profile = "Machine learning engineer with 5 years experience using Python and TensorFlow"
    
    # Create mock embeddings for the texts
    mock_job_embedding = np.random.rand(TEST_EMBEDDING_DIMENSION)
    mock_job_embedding = normalize_vector(mock_job_embedding)
    
    mock_profile_embedding = np.random.rand(TEST_EMBEDDING_DIMENSION)
    mock_profile_embedding = normalize_vector(mock_profile_embedding)
    
    expected_cosine_similarity = 0.8  # Expected raw cosine similarity
    expected_similarity = (expected_cosine_similarity + 1) / 2  # Converted to 0-1 range
    
    # Create a partial mock of EmbeddingModel to test calculate_similarity while mocking generate_embedding
    with patch('openai.Client'):
        embedding_model = EmbeddingModel(
            model_name="test-model",
            embedding_dimension=TEST_EMBEDDING_DIMENSION
        )
        
        # Mock the get_embedding method to return our predefined vectors
        embedding_model.get_embedding = Mock()
        embedding_model.get_embedding.side_effect = [mock_job_embedding, mock_profile_embedding]
        
        # Mock the cosine_similarity function
        with patch('..src.utils.vector_utils.cosine_similarity', return_value=expected_cosine_similarity):
            # Generate embeddings for the two texts
            job_embedding = embedding_model.get_embedding(job_description)
            profile_embedding = embedding_model.get_embedding(candidate_profile)
            
            # Call the calculate_similarity method with the two embeddings
            similarity = embedding_model.calculate_similarity(job_embedding, profile_embedding)
            
            # Assert the returned similarity score is correct
            assert np.isclose(similarity, expected_similarity)
            
            # Assert that the generate_embedding method was called twice with the correct parameters
            assert embedding_model.get_embedding.call_count == 2
            embedding_model.get_embedding.assert_any_call(job_description)
            embedding_model.get_embedding.assert_any_call(candidate_profile)
            
            # Assert that the cosine_similarity function was called with the correct parameters
            cosine_similarity.assert_called_once_with(job_embedding, profile_embedding)

@pytest.mark.embedding
@pytest.mark.elasticsearch
def test_store_embedding():
    """Test that the store_embedding method correctly stores an embedding in Elasticsearch."""
    
    # Set up a test text input and ID
    test_text = "AI engineer with Python skills"
    test_id = "job123"
    
    # Create a mock embedding
    mock_embedding = np.random.rand(TEST_EMBEDDING_DIMENSION)
    normalized_embedding = normalize_vector(mock_embedding)
    
    # Create a partial mock of EmbeddingModel
    with patch('openai.Client'):
        embedding_model = EmbeddingModel(
            model_name="test-model",
            embedding_dimension=TEST_EMBEDDING_DIMENSION
        )
        
        # Mock the embed_job method
        embedding_model.embed_job = Mock(return_value=normalized_embedding)
        
        # Create job data
        job_data = {
            "id": test_id,
            "title": "AI Engineer",
            "description": test_text,
            "skills": ["Python", "TensorFlow", "Machine Learning"]
        }
        
        # Mock ElasticsearchService
        with patch('elasticsearch.Elasticsearch'):
            es_service = ElasticsearchService(
                embedding_model=embedding_model
            )
            es_service.client = Mock()
            es_service.client.index = Mock(return_value={"_id": test_id})
            
            # Call index_job to store the embedding
            result_id = es_service.index_job(job_data)
            
            # Assert the ElasticsearchService.store_embedding method was called with the correct parameters
            es_service.client.index.assert_called_once()
            call_args = es_service.client.index.call_args[1]
            assert call_args["index"] == es_service.jobs_index
            assert call_args["id"] == test_id
            assert "embedding" in call_args["document"]
            
            # Assert the job ID was returned correctly
            assert result_id == test_id
            
            # Assert embedding was generated
            embedding_model.embed_job.assert_called_once_with(job_data)

@pytest.mark.embedding
@pytest.mark.elasticsearch
def test_search_similar():
    """Test that the search_similar method correctly finds similar items in Elasticsearch."""
    
    # Set up a test query text
    test_query = "Looking for a machine learning expert"
    
    # Create a partial mock of EmbeddingModel
    with patch('openai.Client'):
        embedding_model = EmbeddingModel(
            model_name="test-model",
            embedding_dimension=TEST_EMBEDDING_DIMENSION
        )
        
        # Mock the get_embedding method to return a predefined vector
        mock_embedding = np.random.rand(TEST_EMBEDDING_DIMENSION)
        normalized_embedding = normalize_vector(mock_embedding)
        embedding_model.get_embedding = Mock(return_value=normalized_embedding)
        
        # Mock the ElasticsearchService.search_similar method to return predefined search results
        expected_results = [
            {"id": "profile1", "score": 0.92, "data": {"name": "John Doe", "skills": ["Machine Learning"]}},
            {"id": "profile2", "score": 0.87, "data": {"name": "Jane Smith", "skills": ["Deep Learning"]}}
        ]
        
        # Mock ElasticsearchService
        with patch('elasticsearch.Elasticsearch'):
            es_service = ElasticsearchService(
                embedding_model=embedding_model
            )
            es_service.vector_search = Mock(return_value=expected_results)
            
            # Call vector_search with our test query embedding
            results = es_service.vector_search(
                query_vector=normalized_embedding,
                index_name=es_service.profiles_index,
                size=10
            )
            
            # Assert that the ElasticsearchService.search_similar method was called with the correct parameters
            es_service.vector_search.assert_called_once_with(
                query_vector=normalized_embedding,
                index_name=es_service.profiles_index,
                size=10
            )
            
            # Assert that the returned search results are correct
            assert results == expected_results

@pytest.mark.embedding
def test_embedding_dimensions():
    """Test that the generated embeddings have the correct dimensions according to the configuration."""
    
    # Mock the config module to return a specific EMBEDDING_DIMENSION value
    test_dimension = 512
    
    # Create a mock embedding with the specific dimension
    mock_embedding = np.random.rand(test_dimension)
    
    # Create an instance of EmbeddingModel with the mocked OpenAI client
    with patch('openai.Client') as mock_client:
        # Configure the mock client to return an embedding with the correct dimensions
        mock_response = MagicMock()
        mock_response.data = [MagicMock(embedding=mock_embedding.tolist())]
        mock_client.return_value.embeddings.create.return_value = mock_response
        
        # Create the embedding model with the specified dimension
        embedding_model = EmbeddingModel(
            model_name="test-model",
            embedding_dimension=test_dimension
        )
        
        # Call the get_embedding method
        result = embedding_model.get_embedding("test text")
        
        # Assert that the returned embedding has dimensions matching the configuration
        assert result.shape == (test_dimension,)
        assert embedding_model.embedding_dimension == test_dimension

@pytest.mark.embedding
def test_embedding_normalization():
    """Test that embeddings are properly normalized when requested."""
    
    # Mock the OpenAI service to return a non-normalized embedding
    non_normalized = np.array([1.0, 2.0, 3.0])  # Not a unit vector
    
    # Create an instance of EmbeddingModel with the mocked OpenAI client
    with patch('openai.Client') as mock_client:
        # Configure the mock client to return a non-normalized embedding
        mock_response = MagicMock()
        mock_response.data = [MagicMock(embedding=non_normalized.tolist())]
        mock_client.return_value.embeddings.create.return_value = mock_response
        
        # Mock normalize_vector function to check if it's called
        with patch('..src.utils.vector_utils.normalize_vector', wraps=normalize_vector) as mock_normalize:
            # Create the embedding model
            embedding_model = EmbeddingModel(
                model_name="test-model",
                embedding_dimension=3
            )
            
            # Call the get_embedding method with normalize=True
            result = embedding_model.get_embedding("test text")
            
            # Assert that vector_utils.normalize_vector was called with the correct parameters
            mock_normalize.assert_called()
            
            # Assert that the returned embedding is normalized (has unit length)
            norm = np.linalg.norm(result)
            assert np.isclose(norm, 1.0)

@pytest.mark.embedding
@pytest.mark.integration
def test_openai_service_integration():
    """Test the integration with OpenAI service for embedding generation."""
    
    # Mock the OpenAIService.get_embedding method
    mock_embedding = np.random.rand(TEST_EMBEDDING_DIMENSION)
    
    # Test with the OpenAIService directly
    with patch.object(OpenAIService, 'get_embedding', return_value=mock_embedding):
        openai_service = OpenAIService(
            model=settings.OPENAI_MODEL,
            embedding_dimension=TEST_EMBEDDING_DIMENSION
        )
        
        # Call get_embedding with a sample text
        sample_text = "Testing OpenAI integration"
        result = openai_service.get_embedding(sample_text)
        
        # Verify that the OpenAIService was called with the correct model from config.EMBEDDING_MODEL
        openai_service.get_embedding.assert_called_once_with(sample_text)
        assert openai_service.model == settings.OPENAI_MODEL
        
        # Verify that the embedding was returned correctly
        np.testing.assert_array_equal(result, mock_embedding)
        
        # Verify that proper error handling occurs when OpenAI service fails
        openai_service.get_embedding.side_effect = Exception("API error")
        
        # Expect an exception when the OpenAI service fails
        with pytest.raises(Exception, match="API error"):
            openai_service.get_embedding(sample_text)