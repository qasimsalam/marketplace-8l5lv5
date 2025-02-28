import logging
import re
import hashlib
from typing import List, Dict, Optional, Union

# openai - version 1.3.0
import openai

# numpy - version 1.24.0
import numpy as np

# tenacity - version 8.2.2
import tenacity

# Import configuration settings from config.py
from ..config import settings
from ..utils.vector_utils import normalize_vector, cosine_similarity, VectorCache

# Set up logger
logger = logging.getLogger(__name__)

def normalize_text(text: str) -> str:
    """
    Normalizes text input for consistent embedding generation.
    
    Args:
        text: Input text to normalize
        
    Returns:
        Normalized text string
    """
    if not text:
        return ""
    
    # Convert to lowercase
    text = text.lower()
    
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Remove special characters and normalize punctuation
    text = re.sub(r'[^\w\s\.\,\?\!\-]', '', text)
    
    # Trim leading/trailing whitespace
    text = text.strip()
    
    return text

def batch_texts(texts: List[str], batch_size: int) -> List[List[str]]:
    """
    Splits a list of texts into batches for efficient API processing.
    
    Args:
        texts: List of text strings to batch
        batch_size: Maximum size of each batch
        
    Returns:
        List of text batches
    """
    if not texts:
        return []
    
    return [texts[i:i + batch_size] for i in range(0, len(texts), batch_size)]

def generate_cache_key(text: str, model_name: str) -> str:
    """
    Generates a unique cache key for a text input to enable embedding caching.
    
    Args:
        text: Input text to generate key for
        model_name: Name of the model used for embedding
        
    Returns:
        MD5 hash key for the text and model combination
    """
    # Normalize the text
    normalized_text = normalize_text(text)
    
    # Create string combining text and model
    combined = f"{normalized_text}:{model_name}"
    
    # Generate MD5 hash
    hash_object = hashlib.md5(combined.encode())
    
    return hash_object.hexdigest()

class EmbeddingModel:
    """
    Class for generating and managing text embeddings using OpenAI models.
    """
    
    def __init__(
        self,
        api_key: str = None,
        model_name: str = None,
        embedding_dimension: int = None,
        cache_size: int = None,
        batch_size: int = None
    ):
        """
        Initialize the embedding model with API settings and cache.
        
        Args:
            api_key: OpenAI API key
            model_name: Name of the OpenAI embedding model
            embedding_dimension: Dimension of embedding vectors
            cache_size: Size of the embedding cache
            batch_size: Size of batches for API calls
        """
        # Set API key from parameter or settings
        self.api_key = api_key or settings.OPENAI_API_KEY
        if not self.api_key:
            logger.error("OpenAI API key not provided. Embedding functionality will not work.")
        
        # Set model name from parameter or settings
        self.model_name = model_name or settings.OPENAI_MODEL
        
        # Set embedding dimension from parameter or settings
        self.embedding_dimension = embedding_dimension or settings.EMBEDDING_DIMENSION
        
        # Set batch size from parameter or settings
        self.batch_size = batch_size or settings.DEFAULT_BATCH_SIZE
        
        # Initialize cache with specified size or default
        self.cache = VectorCache(cache_size or settings.DEFAULT_CACHE_SIZE)
        
        # Initialize OpenAI client
        self.client = openai.Client(api_key=self.api_key)
        
        logger.info(f"Initialized embedding model with model_name={self.model_name}, "
                   f"dimension={self.embedding_dimension}, batch_size={self.batch_size}")
    
    @tenacity.retry(stop=tenacity.stop_after_attempt(3), wait=tenacity.wait_exponential(min=1, max=10))
    def get_embedding(self, text: str, use_cache: bool = True) -> np.ndarray:
        """
        Generate an embedding vector for a single text input with caching.
        
        Args:
            text: Text to generate embedding for
            use_cache: Whether to use the embedding cache
            
        Returns:
            Embedding vector representation of the text
        """
        if not text:
            logger.warning("Empty text provided for embedding. Returning zero vector.")
            return np.zeros(self.embedding_dimension)
        
        # Normalize the input text
        normalized_text = normalize_text(text)
        
        if use_cache:
            # Generate cache key and check cache
            cache_key = generate_cache_key(normalized_text, self.model_name)
            cached_embedding = self.cache.get(cache_key)
            
            if cached_embedding is not None:
                logger.debug(f"Cache hit for text: {text[:20]}...")
                return cached_embedding
        
        try:
            # Call OpenAI API to generate embedding
            logger.debug(f"Generating embedding for text: {text[:50]}...")
            response = self.client.embeddings.create(
                model=self.model_name,
                input=normalized_text
            )
            
            # Extract embedding vector
            embedding_vector = np.array(response.data[0].embedding)
            
            # Normalize the vector
            embedding_vector = normalize_vector(embedding_vector)
            
            # Store in cache if enabled
            if use_cache:
                cache_key = generate_cache_key(normalized_text, self.model_name)
                self.cache.add(cache_key, embedding_vector)
            
            return embedding_vector
            
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            raise
    
    def get_embeddings(self, texts: List[str], use_cache: bool = True) -> List[np.ndarray]:
        """
        Generate embedding vectors for a batch of text inputs.
        
        Args:
            texts: List of texts to generate embeddings for
            use_cache: Whether to use the embedding cache
            
        Returns:
            List of embedding vectors
        """
        if not texts:
            return []
        
        # Split texts into batches
        batches = batch_texts(texts, self.batch_size)
        all_embeddings = []
        
        for batch in batches:
            # Process each batch
            batch_embeddings = []
            uncached_texts = []
            uncached_indices = []
            
            # Check cache first if enabled
            if use_cache:
                for i, text in enumerate(batch):
                    normalized_text = normalize_text(text)
                    cache_key = generate_cache_key(normalized_text, self.model_name)
                    cached_embedding = self.cache.get(cache_key)
                    
                    if cached_embedding is not None:
                        batch_embeddings.append(cached_embedding)
                    else:
                        uncached_texts.append(normalized_text)
                        uncached_indices.append(i)
                        # Add placeholder to maintain index order
                        batch_embeddings.append(None)
            else:
                # If cache disabled, process all texts in batch
                uncached_texts = [normalize_text(text) for text in batch]
                uncached_indices = list(range(len(batch)))
                batch_embeddings = [None] * len(batch)
            
            # If there are uncached texts, get their embeddings
            if uncached_texts:
                try:
                    logger.debug(f"Generating embeddings for {len(uncached_texts)} texts in batch")
                    response = self.client.embeddings.create(
                        model=self.model_name,
                        input=uncached_texts
                    )
                    
                    # Process response and update batch_embeddings
                    for i, embedding_data in enumerate(response.data):
                        # Get original index in batch
                        original_index = uncached_indices[i]
                        
                        # Extract and normalize embedding
                        embedding_vector = np.array(embedding_data.embedding)
                        embedding_vector = normalize_vector(embedding_vector)
                        
                        # Add to batch_embeddings at correct position
                        batch_embeddings[original_index] = embedding_vector
                        
                        # Add to cache if enabled
                        if use_cache:
                            original_text = batch[original_index]
                            normalized_text = normalize_text(original_text)
                            cache_key = generate_cache_key(normalized_text, self.model_name)
                            self.cache.add(cache_key, embedding_vector)
                    
                except Exception as e:
                    logger.error(f"Error generating batch embeddings: {str(e)}")
                    # Fill missing embeddings with zeros
                    for i in uncached_indices:
                        if batch_embeddings[i] is None:
                            batch_embeddings[i] = np.zeros(self.embedding_dimension)
            
            # Add batch embeddings to all_embeddings
            all_embeddings.extend(batch_embeddings)
        
        return all_embeddings
    
    def embed_job(self, job_data: Dict) -> np.ndarray:
        """
        Generate an embedding for a job posting that captures key attributes.
        
        Args:
            job_data: Dictionary containing job information
            
        Returns:
            Job embedding vector
        """
        # Extract relevant job data
        job_title = job_data.get('title', '')
        job_description = job_data.get('description', '')
        skills_required = job_data.get('skills', [])
        
        # Construct weighted text representation
        # Emphasize skills and requirements for better matching
        text_parts = [
            job_title.strip(),
            job_description.strip(),
            "Skills Required: " + ", ".join(skills_required),
            # Repeat skills to emphasize them in the embedding
            "Key Skills: " + ", ".join(skills_required)
        ]
        
        combined_text = " ".join(filter(None, text_parts))
        
        # Generate embedding for the combined text
        return self.get_embedding(combined_text)
    
    def embed_profile(self, profile_data: Dict) -> np.ndarray:
        """
        Generate an embedding for a freelancer profile that captures expertise.
        
        Args:
            profile_data: Dictionary containing profile information
            
        Returns:
            Profile embedding vector
        """
        # Extract relevant profile data
        name = profile_data.get('name', '')
        bio = profile_data.get('bio', '')
        skills = profile_data.get('skills', [])
        experience = profile_data.get('experience', [])
        
        # Extract experience descriptions
        experience_desc = []
        for exp in experience:
            exp_text = f"{exp.get('title', '')} {exp.get('description', '')}"
            if exp_text.strip():
                experience_desc.append(exp_text)
        
        # Construct weighted text representation
        # Emphasize skills and experience for better matching
        text_parts = [
            name.strip(),
            bio.strip(),
            "Skills: " + ", ".join(skills),
            # Repeat skills to emphasize them in the embedding
            "Expertise: " + ", ".join(skills),
            "Experience: " + " ".join(experience_desc)
        ]
        
        combined_text = " ".join(filter(None, text_parts))
        
        # Generate embedding for the combined text
        return self.get_embedding(combined_text)
    
    def embed_skills(self, skills: List[str]) -> np.ndarray:
        """
        Generate an embedding specifically for a list of skills.
        
        Args:
            skills: List of skill names
            
        Returns:
            Skills embedding vector
        """
        if not skills:
            logger.warning("Empty skills list provided for embedding")
            return np.zeros(self.embedding_dimension)
        
        # Join skills into text format
        skills_text = "Skills: " + ", ".join(skills)
        
        # Generate embedding for the skills text
        return self.get_embedding(skills_text)
    
    def calculate_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """
        Calculate similarity between two embeddings.
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
            
        Returns:
            Similarity score between 0 and 1
        """
        # Use cosine_similarity from vector_utils
        similarity = cosine_similarity(embedding1, embedding2)
        
        # Convert from [-1, 1] range to [0, 1] range
        return (similarity + 1) / 2
    
    def clear_cache(self) -> None:
        """
        Clear the embedding cache.
        """
        self.cache.clear()
        logger.info("Embedding cache cleared")
    
    def get_cache_stats(self) -> Dict:
        """
        Get statistics about the embedding cache.
        
        Returns:
            Dictionary with cache statistics
        """
        hit_rate = self.cache.get_hit_rate()
        
        return {
            "hit_rate": hit_rate,
            "size": self.cache.size(),
            "capacity": self.cache._capacity,
            "performance": "Good" if hit_rate > 0.7 else "Moderate" if hit_rate > 0.4 else "Poor"
        }

class EmbeddingModelFactory:
    """
    Factory class for creating and managing EmbeddingModel instances.
    """
    _instance = None
    
    def __init__(self):
        """
        Initialize the factory class.
        """
        pass
    
    @classmethod
    def get_instance(cls) -> EmbeddingModel:
        """
        Get or create an EmbeddingModel instance (singleton pattern).
        
        Returns:
            An EmbeddingModel instance
        """
        if cls._instance is None:
            logger.info("Creating new EmbeddingModel instance")
            cls._instance = EmbeddingModel(
                api_key=settings.OPENAI_API_KEY,
                model_name=settings.OPENAI_MODEL,
                embedding_dimension=settings.EMBEDDING_DIMENSION,
                cache_size=settings.DEFAULT_CACHE_SIZE,
                batch_size=settings.DEFAULT_BATCH_SIZE
            )
        
        return cls._instance
    
    @classmethod
    def create_model(
        cls,
        api_key: str = None,
        model_name: str = None,
        embedding_dimension: int = None,
        cache_size: int = None,
        batch_size: int = None
    ) -> EmbeddingModel:
        """
        Create a new EmbeddingModel instance with custom settings.
        
        Args:
            api_key: OpenAI API key
            model_name: Name of the OpenAI embedding model
            embedding_dimension: Dimension of embedding vectors
            cache_size: Size of the embedding cache
            batch_size: Size of batches for API calls
            
        Returns:
            A new EmbeddingModel instance
        """
        logger.info("Creating custom EmbeddingModel instance")
        return EmbeddingModel(
            api_key=api_key,
            model_name=model_name,
            embedding_dimension=embedding_dimension,
            cache_size=cache_size,
            batch_size=batch_size
        )