# vector_utils.py - Utility functions for vector operations

# numpy - version 1.24.0
import numpy as np
from typing import List, Dict, Union, Optional, Tuple
import logging
from functools import lru_cache
from collections import OrderedDict
import hashlib

# Import configuration settings
from ..config import settings

# Set up logger
logger = logging.getLogger(__name__)

def normalize_vector(vector: np.ndarray) -> np.ndarray:
    """
    Normalizes a vector to unit length (L2 norm)
    
    Args:
        vector: Input vector to normalize
        
    Returns:
        Normalized vector with length 1.0
    """
    norm = np.linalg.norm(vector)
    if norm > 0:
        return vector / norm
    return vector  # Return zero vector as is if norm is zero

def cosine_similarity(vector_a: np.ndarray, vector_b: np.ndarray) -> float:
    """
    Calculates cosine similarity between two vectors
    
    Args:
        vector_a: First vector
        vector_b: Second vector
        
    Returns:
        Similarity score between -1 and 1, where 1 indicates identical direction
    """
    # Ensure vectors are properly shaped (convert to 1D if needed)
    vector_a = vector_a.flatten()
    vector_b = vector_b.flatten()
    
    # Normalize both vectors
    vector_a_norm = normalize_vector(vector_a)
    vector_b_norm = normalize_vector(vector_b)
    
    # Calculate dot product
    similarity = np.dot(vector_a_norm, vector_b_norm)
    
    # Ensure result is within valid range due to floating point precision
    similarity = max(-1.0, min(1.0, similarity))
    
    return similarity

def euclidean_distance(vector_a: np.ndarray, vector_b: np.ndarray) -> float:
    """
    Calculates the Euclidean (L2) distance between two vectors
    
    Args:
        vector_a: First vector
        vector_b: Second vector
        
    Returns:
        Euclidean distance between vectors
    """
    # Ensure vectors are properly shaped (convert to 1D if needed)
    vector_a = vector_a.flatten()
    vector_b = vector_b.flatten()
    
    # Calculate element-wise difference and then L2 norm
    return np.linalg.norm(vector_a - vector_b)

def generate_vector_hash(vector: np.ndarray) -> str:
    """
    Generates a hash key for a vector to use in caching
    
    Args:
        vector: Input vector to hash
        
    Returns:
        MD5 hash string representing the vector
    """
    # Convert vector to bytes representation
    vector_bytes = vector.tobytes()
    
    # Apply MD5 hash
    hash_obj = hashlib.md5(vector_bytes)
    
    # Return hex digest
    return hash_obj.hexdigest()

def top_k_similarities(
    query_vector: np.ndarray, 
    vector_list: List[np.ndarray], 
    k: int = 5,
    normalize: bool = True
) -> List[Tuple[int, float]]:
    """
    Finds top K most similar vectors to a query vector
    
    Args:
        query_vector: The query vector to compare against
        vector_list: List of vectors to search through
        k: Number of top results to return
        normalize: Whether to normalize vectors before comparison
        
    Returns:
        List of (index, similarity_score) tuples for top K matches
    """
    # Normalize query vector if requested
    if normalize:
        query_vector = normalize_vector(query_vector)
    
    similarities = []
    for i, vector in enumerate(vector_list):
        # Normalize comparison vector if requested
        if normalize:
            vector = normalize_vector(vector)
        
        # Calculate similarity
        sim_score = cosine_similarity(query_vector, vector)
        similarities.append((i, sim_score))
    
    # Sort by similarity score in descending order
    similarities.sort(key=lambda x: x[1], reverse=True)
    
    # Return top K results
    return similarities[:k]

def batch_similarity_matrix(
    vectors_a: List[np.ndarray],
    vectors_b: List[np.ndarray],
    normalize: bool = True
) -> np.ndarray:
    """
    Calculates similarity matrix between two sets of vectors
    
    Args:
        vectors_a: First set of vectors
        vectors_b: Second set of vectors
        normalize: Whether to normalize vectors before comparison
        
    Returns:
        Matrix of similarity scores with shape (len(vectors_a), len(vectors_b))
    """
    # Convert lists to arrays for efficient computation
    if not vectors_a or not vectors_b:
        return np.array([])
    
    # Stack vectors into matrices
    matrix_a = np.vstack([v.flatten() for v in vectors_a])
    matrix_b = np.vstack([v.flatten() for v in vectors_b])
    
    # Normalize if requested
    if normalize:
        matrix_a = np.array([normalize_vector(v) for v in matrix_a])
        matrix_b = np.array([normalize_vector(v) for v in matrix_b])
    
    # Calculate similarity matrix using matrix multiplication
    # (dot product of normalized vectors gives cosine similarity)
    similarity_matrix = np.dot(matrix_a, matrix_b.T)
    
    # Ensure results are within valid range
    similarity_matrix = np.clip(similarity_matrix, -1.0, 1.0)
    
    return similarity_matrix

def aggregate_vectors(
    vectors: List[np.ndarray],
    weights: Optional[List[float]] = None
) -> np.ndarray:
    """
    Aggregates multiple vectors into a single representative vector
    
    Args:
        vectors: List of vectors to aggregate
        weights: Optional weights for each vector (must match length of vectors)
        
    Returns:
        Aggregated vector
    """
    if not vectors:
        raise ValueError("Cannot aggregate empty list of vectors")
    
    # Use equal weights if not provided
    if weights is None:
        weights = [1.0 / len(vectors)] * len(vectors)
    
    # Validate vectors and weights are compatible
    if len(vectors) != len(weights):
        raise ValueError("Number of vectors must match number of weights")
    
    # Weighted sum of vectors
    result = np.zeros_like(vectors[0])
    for vector, weight in zip(vectors, weights):
        result += vector * weight
    
    # Normalize the result
    return normalize_vector(result)

def dimension_reduction(
    vectors: List[np.ndarray],
    target_dim: int
) -> List[np.ndarray]:
    """
    Reduces the dimensionality of vectors using PCA
    
    Args:
        vectors: List of vectors to reduce
        target_dim: Target dimensionality
        
    Returns:
        List of reduced dimension vectors
    """
    from sklearn.decomposition import PCA
    
    if not vectors:
        return []
    
    # Stack vectors into a matrix
    matrix = np.vstack([v.flatten() for v in vectors])
    
    # Check if target dimension is valid
    original_dim = matrix.shape[1]
    if target_dim >= original_dim:
        logger.warning(f"Target dimension {target_dim} >= original dimension {original_dim}. No reduction performed.")
        return vectors
    
    # Apply PCA
    pca = PCA(n_components=target_dim)
    reduced_matrix = pca.fit_transform(matrix)
    
    # Convert back to list of vectors
    return [reduced_vector for reduced_vector in reduced_matrix]

class VectorCache:
    """
    Cache implementation for storing and retrieving vector embeddings
    """
    
    def __init__(self, capacity: int = None):
        """
        Initialize the vector cache with specified capacity
        
        Args:
            capacity: Maximum number of vectors to store in cache
        """
        self._capacity = capacity or settings.DEFAULT_CACHE_SIZE
        self._cache = OrderedDict()
        self._hits = 0
        self._misses = 0
        logger.info(f"Initialized vector cache with capacity {self._capacity}")
    
    def add(self, key: str, vector: np.ndarray) -> None:
        """
        Add a vector to the cache with a key
        
        Args:
            key: Cache key
            vector: Vector to cache
        """
        # If cache is at capacity, remove oldest item
        if len(self._cache) >= self._capacity:
            self._cache.popitem(last=False)  # FIFO - remove first item
        
        # Add new item
        self._cache[key] = vector
        logger.debug(f"Added vector to cache with key {key}")
    
    def get(self, key: str) -> Optional[np.ndarray]:
        """
        Retrieve a vector from the cache by key
        
        Args:
            key: Cache key to look up
            
        Returns:
            Cached vector if found, None otherwise
        """
        if key in self._cache:
            # Move to end (most recently used)
            vector = self._cache.pop(key)
            self._cache[key] = vector
            self._hits += 1
            return vector
        else:
            self._misses += 1
            return None
    
    def contains(self, key: str) -> bool:
        """
        Check if a key exists in the cache
        
        Args:
            key: Cache key to check
            
        Returns:
            True if key exists, False otherwise
        """
        return key in self._cache
    
    def clear(self) -> None:
        """
        Clear all items from the cache
        """
        self._cache.clear()
        self._hits = 0
        self._misses = 0
        logger.info("Vector cache cleared")
    
    def get_hit_rate(self) -> float:
        """
        Calculate the cache hit rate
        
        Returns:
            Cache hit rate between 0 and 1
        """
        total = self._hits + self._misses
        if total == 0:
            return 0.0
        return self._hits / total
    
    def size(self) -> int:
        """
        Get current size of the cache
        
        Returns:
            Number of items in cache
        """
        return len(self._cache)

class VectorQuantizer:
    """
    Utility class for vector quantization to optimize storage and searching
    """
    
    def __init__(self, n_centroids: int = 256):
        """
        Initialize vector quantizer with specified number of centroids
        
        Args:
            n_centroids: Number of centroids for quantization
        """
        self.n_centroids = n_centroids
        self.centroids = None
        self.is_trained = False
        logger.info(f"Initialized vector quantizer with {n_centroids} centroids")
    
    def train(self, vectors: List[np.ndarray], max_iterations: int = 100) -> bool:
        """
        Train the quantizer on a set of vectors
        
        Args:
            vectors: Training vectors
            max_iterations: Maximum K-means iterations
            
        Returns:
            True if training successful, False otherwise
        """
        from sklearn.cluster import KMeans
        
        if not vectors:
            logger.error("Cannot train quantizer on empty vector set")
            return False
        
        try:
            # Stack vectors into a matrix
            matrix = np.vstack([v.flatten() for v in vectors])
            
            # Apply K-means clustering
            kmeans = KMeans(n_clusters=min(self.n_centroids, len(vectors)), 
                           max_iter=max_iterations, 
                           n_init=10)
            kmeans.fit(matrix)
            
            # Store centroids
            self.centroids = kmeans.cluster_centers_
            self.is_trained = True
            
            logger.info(f"Successfully trained vector quantizer with {len(self.centroids)} centroids")
            return True
            
        except Exception as e:
            logger.error(f"Error training vector quantizer: {str(e)}")
            return False
    
    def quantize(self, vector: np.ndarray) -> Tuple[int, np.ndarray]:
        """
        Quantize a vector to its nearest centroid
        
        Args:
            vector: Vector to quantize
            
        Returns:
            Tuple of (centroid_index, quantized_vector)
        """
        if not self.is_trained:
            raise ValueError("Quantizer must be trained before quantizing vectors")
        
        # Find nearest centroid
        vector = vector.flatten()
        distances = np.array([euclidean_distance(vector, centroid) for centroid in self.centroids])
        centroid_index = np.argmin(distances)
        
        return centroid_index, self.centroids[centroid_index]
    
    def batch_quantize(self, vectors: List[np.ndarray]) -> List[Tuple[int, np.ndarray]]:
        """
        Quantize multiple vectors in a batch
        
        Args:
            vectors: List of vectors to quantize
            
        Returns:
            List of (centroid_index, quantized_vector) tuples
        """
        if not self.is_trained:
            raise ValueError("Quantizer must be trained before quantizing vectors")
        
        return [self.quantize(vector) for vector in vectors]