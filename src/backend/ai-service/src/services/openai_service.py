"""
OpenAI Service module that interfaces with OpenAI's API to provide text embeddings,
completions, and AI-assisted features for the AI Talent Marketplace.
"""

# External imports
import openai  # openai - version 1.3.0
import numpy as np  # numpy - version 1.24.0
from typing import List, Dict, Optional, Union, Any  # typing - standard library
import logging  # logging - standard library
import json  # json - standard library
import hashlib  # hashlib - standard library
from tenacity import retry, stop_after_attempt, wait_exponential  # tenacity - version 8.2.2

# Internal imports
from ..config import settings  # Import OpenAI configuration settings
from ..utils.vector_utils import normalize_vector, cosine_similarity, VectorCache  # Import vector utilities

# Set up logger
logger = logging.getLogger(__name__)

def normalize_text(text: str) -> str:
    """
    Normalizes input text for consistent embedding generation
    
    Args:
        text: Input text to normalize
        
    Returns:
        Normalized text string
    """
    # Convert to string if not already
    if not isinstance(text, str):
        text = str(text)
    
    # Convert to lowercase
    text = text.lower()
    
    # Strip extra whitespace
    text = ' '.join(text.split())
    
    # Remove special characters (keeping alphanumeric, spaces, and basic punctuation)
    # We keep some punctuation as it can be semantically important for embeddings
    
    return text

def generate_embedding_prompt(text: str, context_type: str) -> str:
    """
    Creates a prompt specific for embedding generation with contextual information
    
    Args:
        text: The input text to format
        context_type: Type of context (job, profile, or skill)
        
    Returns:
        Enhanced prompt for embedding generation
    """
    if context_type == "job":
        prefix = "Job description: "
        formatted_text = f"{prefix}{text}\n\nThe key skills and requirements for this job are:"
    elif context_type == "profile":
        prefix = "Professional profile: "
        formatted_text = f"{prefix}{text}\n\nThis professional's key skills and expertise areas are:"
    elif context_type == "skill":
        prefix = "Technical skill: "
        formatted_text = f"{prefix}{text}\n\nThis skill involves knowledge of:"
    else:
        # Default generic formatting
        prefix = ""
        formatted_text = text
    
    return formatted_text

def generate_cache_key(text: str, model_name: str) -> str:
    """
    Generates a unique cache key for a text input to enable embedding caching
    
    Args:
        text: The input text to hash
        model_name: The model name used for embedding
        
    Returns:
        Hash key for the text and model combination
    """
    # Normalize text for consistent hashing
    normalized_text = normalize_text(text)
    
    # Combine text and model name
    combined = f"{normalized_text}|{model_name}"
    
    # Generate hash
    hash_obj = hashlib.md5(combined.encode('utf-8'))
    
    # Return hex digest
    return hash_obj.hexdigest()

class OpenAIService:
    """
    Service class for interfacing with OpenAI API, providing embeddings and completions
    """
    
    def __init__(self, api_key: str = None, model: str = None, 
                 embedding_dimension: int = None, cache_size: int = 1000):
        """
        Initialize the OpenAI service with API credentials and settings
        
        Args:
            api_key: OpenAI API key (defaults to settings.OPENAI_API_KEY)
            model: OpenAI model to use (defaults to settings.OPENAI_MODEL)
            embedding_dimension: Dimension of embeddings (defaults to settings.EMBEDDING_DIMENSION)
            cache_size: Size of the embedding cache
        """
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_MODEL
        self.embedding_dimension = embedding_dimension or settings.EMBEDDING_DIMENSION
        
        # Initialize embedding cache
        self.cache = VectorCache(capacity=cache_size)
        
        # Initialize OpenAI client
        self.client = openai.Client(api_key=self.api_key)
        
        logger.info(f"Initialized OpenAI service with model {self.model}")
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    def get_embedding(self, text: str, use_cache: bool = True) -> np.ndarray:
        """
        Generate an embedding vector for a text input with caching support
        
        Args:
            text: Text to generate embedding for
            use_cache: Whether to use cache for this embedding
            
        Returns:
            Numpy array containing the embedding vector
        """
        # Normalize input text
        normalized_text = normalize_text(text)
        
        # Check cache if enabled
        if use_cache:
            cache_key = generate_cache_key(normalized_text, self.model)
            cached_embedding = self.cache.get(cache_key)
            
            if cached_embedding is not None:
                logger.debug(f"Cache hit for text: {normalized_text[:20]}...")
                return cached_embedding
        
        # Call OpenAI API to generate embedding
        try:
            logger.debug(f"Generating embedding for text: {normalized_text[:20]}...")
            
            response = self.client.embeddings.create(
                model=self.model,
                input=normalized_text
            )
            
            # Extract embedding vector from response
            embedding = response.data[0].embedding
            
            # Convert to numpy array
            embedding_array = np.array(embedding, dtype=np.float32)
            
            # Normalize to unit length
            normalized_embedding = normalize_vector(embedding_array)
            
            # Add to cache if enabled
            if use_cache:
                cache_key = generate_cache_key(normalized_text, self.model)
                self.cache.add(cache_key, normalized_embedding)
            
            return normalized_embedding
            
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            raise
    
    def get_embeddings(self, texts: List[str], use_cache: bool = True) -> List[np.ndarray]:
        """
        Generate embeddings for multiple text inputs efficiently
        
        Args:
            texts: List of texts to generate embeddings for
            use_cache: Whether to use cache for embeddings
            
        Returns:
            List of embedding vectors
        """
        results = []
        
        # Process in batches for efficiency
        batch_size = settings.DEFAULT_BATCH_SIZE
        
        # Process each text
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i+batch_size]
            
            # Get embeddings for batch
            for text in batch_texts:
                embedding = self.get_embedding(text, use_cache=use_cache)
                results.append(embedding)
        
        return results
    
    def embed_job(self, job_data: Dict) -> np.ndarray:
        """
        Generate an embedding specifically optimized for job postings
        
        Args:
            job_data: Dictionary containing job posting data
            
        Returns:
            Embedding vector representing the job
        """
        # Extract relevant fields
        title = job_data.get('title', '')
        description = job_data.get('description', '')
        skills = job_data.get('required_skills', [])
        
        # Create weighted text representation
        skills_text = ", ".join(skills) if skills else ""
        
        # Combine fields with emphasis on important job aspects
        job_text = f"Title: {title}\n\nSkills: {skills_text}\n\nDescription: {description}"
        
        # Generate enhanced prompt
        enhanced_text = generate_embedding_prompt(job_text, "job")
        
        # Get embedding
        return self.get_embedding(enhanced_text)
    
    def embed_profile(self, profile_data: Dict) -> np.ndarray:
        """
        Generate an embedding specifically optimized for freelancer profiles
        
        Args:
            profile_data: Dictionary containing profile data
            
        Returns:
            Embedding vector representing the profile
        """
        # Extract relevant fields
        name = profile_data.get('name', '')
        bio = profile_data.get('bio', '')
        skills = profile_data.get('skills', [])
        experience = profile_data.get('experience', [])
        
        # Convert skills to text
        skills_text = ", ".join(skills) if skills else ""
        
        # Convert experience to text (assuming list of experience items)
        exp_text = ""
        if experience:
            for exp in experience:
                if isinstance(exp, dict):
                    role = exp.get('role', '')
                    desc = exp.get('description', '')
                    exp_text += f"{role}: {desc}\n"
                else:
                    exp_text += f"{exp}\n"
        
        # Combine fields with emphasis on skills and expertise
        profile_text = f"Name: {name}\n\nSkills: {skills_text}\n\nBio: {bio}\n\nExperience: {exp_text}"
        
        # Generate enhanced prompt
        enhanced_text = generate_embedding_prompt(profile_text, "profile")
        
        # Get embedding
        return self.get_embedding(enhanced_text)
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    def analyze_job_skills(self, job_description: str) -> Dict:
        """
        Analyze a job description to extract AI-related skills and requirements
        
        Args:
            job_description: The job description text to analyze
            
        Returns:
            Dictionary with analysis results including skills and recommendations
        """
        # Construct prompt for skill analysis
        prompt = f"""
        Analyze the following AI job description and extract:
        1. Required skills (must-have skills)
        2. Nice-to-have skills (preferred but not required)
        3. Level of expertise required (beginner, intermediate, expert)
        4. Key responsibilities
        5. Recommendations for candidates
        
        Format your response as a JSON object with these keys: required_skills, nice_to_have_skills, 
        expertise_level, key_responsibilities, recommendations.
        
        Job Description:
        {job_description}
        """
        
        try:
            # Call OpenAI completions API
            response = self.client.chat.completions.create(
                model="gpt-4",  # Using GPT-4 for better analysis
                messages=[
                    {"role": "system", "content": "You are an expert AI talent recruiter who analyzes job descriptions."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,  # Low temperature for more consistent results
                response_format={"type": "json_object"}  # Request JSON response
            )
            
            # Extract and parse JSON response
            result_text = response.choices[0].message.content
            results = json.loads(result_text)
            
            # Ensure expected fields are present
            required_fields = ['required_skills', 'nice_to_have_skills', 'expertise_level', 
                              'key_responsibilities', 'recommendations']
            
            for field in required_fields:
                if field not in results:
                    results[field] = []
            
            return results
            
        except Exception as e:
            logger.error(f"Error analyzing job skills: {str(e)}")
            # Return empty results in case of error
            return {
                'required_skills': [],
                'nice_to_have_skills': [],
                'expertise_level': '',
                'key_responsibilities': [],
                'recommendations': []
            }
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    def generate_job_description(self, title: str, skills: List[str], 
                                difficulty_level: str, additional_context: Dict = None) -> str:
        """
        Generate a professional job description based on provided parameters
        
        Args:
            title: Job title
            skills: List of required skills
            difficulty_level: Level of difficulty/expertise (beginner, intermediate, expert)
            additional_context: Additional context or requirements
            
        Returns:
            Generated job description text
        """
        # Format skills list
        skills_text = ", ".join(skills)
        
        # Format additional context
        context_text = ""
        if additional_context:
            for key, value in additional_context.items():
                context_text += f"{key}: {value}\n"
        
        # Construct prompt
        prompt = f"""
        Create a professional job description for an AI Talent Marketplace for the following position:
        
        Title: {title}
        Required Skills: {skills_text}
        Expertise Level: {difficulty_level}
        
        Additional Context:
        {context_text}
        
        The job description should include:
        1. A compelling overview of the role
        2. Key responsibilities
        3. Required skills and qualifications
        4. Preferred skills
        5. About the ideal candidate
        6. What the role offers
        
        Make it detailed, professional, and appealing to top AI talent.
        """
        
        try:
            # Call OpenAI completions API
            response = self.client.chat.completions.create(
                model="gpt-4",  # Using GPT-4 for quality content generation
                messages=[
                    {"role": "system", "content": "You are an expert technical recruiter specializing in AI roles."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,  # Higher temperature for more creative results
                max_tokens=1000  # Limit response length
            )
            
            # Extract response text
            job_description = response.choices[0].message.content
            
            return job_description
            
        except Exception as e:
            logger.error(f"Error generating job description: {str(e)}")
            # Return error message in case of failure
            return f"Error generating job description. Please try again later."
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    def generate_match_explanation(self, job_data: Dict, profile_data: Dict, match_score: float) -> str:
        """
        Generate a human-readable explanation for why a job and profile match
        
        Args:
            job_data: Dictionary containing job posting data
            profile_data: Dictionary containing profile data
            match_score: The computed match score
            
        Returns:
            Explanation of why the job and profile match
        """
        # Extract relevant job data
        job_title = job_data.get('title', '')
        job_skills = job_data.get('required_skills', [])
        job_description = job_data.get('description', '')
        
        # Extract relevant profile data
        profile_name = profile_data.get('name', '')
        profile_skills = profile_data.get('skills', [])
        profile_bio = profile_data.get('bio', '')
        
        # Calculate skill overlap
        job_skills_set = set(job_skills)
        profile_skills_set = set(profile_skills)
        matching_skills = job_skills_set.intersection(profile_skills_set)
        missing_skills = job_skills_set - profile_skills_set
        additional_skills = profile_skills_set - job_skills_set
        
        # Create skill overlap text
        matching_skills_text = ", ".join(matching_skills) if matching_skills else "none"
        missing_skills_text = ", ".join(missing_skills) if missing_skills else "none"
        additional_skills_text = ", ".join(additional_skills) if additional_skills else "none"
        
        # Construct prompt
        prompt = f"""
        Generate a human-readable explanation for why this job and candidate profile match.
        
        Job:
        - Title: {job_title}
        - Required Skills: {", ".join(job_skills)}
        - Description: {job_description[:300]}...
        
        Candidate:
        - Name: {profile_name}
        - Skills: {", ".join(profile_skills)}
        - Bio: {profile_bio[:300]}...
        
        Match Score: {match_score:.2f} out of 1.0
        
        Skill Analysis:
        - Matching Skills: {matching_skills_text}
        - Missing Skills: {missing_skills_text}
        - Additional Skills: {additional_skills_text}
        
        Provide a 3-4 paragraph explanation highlighting:
        1. Why this is a good match
        2. The candidate's strengths relative to the job
        3. Any areas where the candidate might need to develop
        4. Overall fit and potential for success
        """
        
        try:
            # Call OpenAI completions API
            response = self.client.chat.completions.create(
                model="gpt-4",  # Using GPT-4 for better analysis and explanation
                messages=[
                    {"role": "system", "content": "You are an expert talent matcher who explains why candidates and jobs are a good fit."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.4,  # Moderate temperature for balance of creativity and consistency
                max_tokens=500  # Limit response length
            )
            
            # Extract response text
            explanation = response.choices[0].message.content
            
            return explanation
            
        except Exception as e:
            logger.error(f"Error generating match explanation: {str(e)}")
            # Return basic explanation in case of error
            match_percent = int(match_score * 100)
            return f"This job and candidate have a {match_percent}% match based on skill overlap and expertise alignment. The candidate possesses {len(matching_skills)} of the required skills for this position."
    
    def clear_cache(self) -> None:
        """
        Clear the embedding cache
        """
        self.cache.clear()
        logger.info("Embedding cache cleared")
    
    def health_check(self) -> Dict:
        """
        Check the health and connectivity to the OpenAI API
        
        Returns:
            Dictionary with health status information
        """
        try:
            # Attempt a simple embedding generation
            test_embedding = self.get_embedding("test", use_cache=False)
            
            # Check if embedding has the correct dimension
            is_healthy = (test_embedding.shape[0] == self.embedding_dimension)
            
            return {
                "status": "healthy" if is_healthy else "degraded",
                "api_connection": "successful",
                "model": self.model,
                "embedding_dimension": self.embedding_dimension,
                "cache_size": self.cache.size(),
                "cache_hit_rate": self.cache.get_hit_rate()
            }
            
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            
            return {
                "status": "unhealthy",
                "api_connection": "failed",
                "error": str(e),
                "model": self.model,
                "cache_size": self.cache.size()
            }

class OpenAIServiceFactory:
    """
    Factory class for creating and managing OpenAIService instances
    """
    _instance = None
    
    def __init__(self):
        """
        Initialize the factory class
        """
        pass
    
    @classmethod
    def get_instance(cls) -> OpenAIService:
        """
        Get or create an OpenAIService instance (singleton pattern)
        
        Returns:
            An OpenAIService instance
        """
        if cls._instance is None:
            cls._instance = OpenAIService(
                api_key=settings.OPENAI_API_KEY,
                model=settings.OPENAI_MODEL,
                embedding_dimension=settings.EMBEDDING_DIMENSION,
                cache_size=settings.DEFAULT_CACHE_SIZE
            )
        
        return cls._instance
    
    @classmethod
    def create_service(cls, api_key: str, model: str, 
                      embedding_dimension: int, cache_size: int) -> OpenAIService:
        """
        Create a new OpenAIService instance with custom settings
        
        Args:
            api_key: OpenAI API key
            model: OpenAI model to use
            embedding_dimension: Dimension of embeddings
            cache_size: Size of the embedding cache
            
        Returns:
            A new OpenAIService instance
        """
        return OpenAIService(
            api_key=api_key,
            model=model,
            embedding_dimension=embedding_dimension,
            cache_size=cache_size
        )