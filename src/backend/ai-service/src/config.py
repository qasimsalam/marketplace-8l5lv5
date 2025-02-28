import os
import logging

# python-dotenv - version 1.0.0
from dotenv import load_dotenv

# pydantic-settings - version 2.0.0
from pydantic_settings import BaseSettings

# pydantic - version 2.0.0
from pydantic import Field

# Define the base directory of the project
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Set up logger
logger = logging.getLogger(__name__)

def load_env_vars() -> None:
    """
    Loads environment variables from .env files based on environment.
    Prioritizes environment-specific files over the default .env file.
    """
    # Determine the environment (development, staging, production)
    env = os.environ.get('ENVIRONMENT', 'development').lower()
    
    # Define possible env files with priority
    env_files = [
        os.path.join(BASE_DIR, f".env.{env}"),
        os.path.join(BASE_DIR, ".env")
    ]
    
    # Set fallback to .env if environment-specific file not found
    loaded = False
    for env_file in env_files:
        if os.path.exists(env_file):
            load_dotenv(env_file)
            logger.info(f"Loaded environment variables from {env_file} for {env} environment")
            loaded = True
            break
    
    if not loaded:
        logger.warning("No .env file found. Using environment variables or defaults.")

def get_log_level(log_level: str) -> int:
    """
    Converts string log level to logging module level constant.
    
    Args:
        log_level: String representation of log level
        
    Returns:
        Logging level constant from logging module
    """
    # Convert input string to uppercase
    log_level = log_level.upper()
    
    # Match against logging level constants
    levels = {
        'DEBUG': logging.DEBUG,
        'INFO': logging.INFO,
        'WARNING': logging.WARNING,
        'ERROR': logging.ERROR,
        'CRITICAL': logging.CRITICAL
    }
    
    # Return corresponding logging level constant or default to INFO
    return levels.get(log_level, logging.INFO)

class Settings(BaseSettings):
    """
    Pydantic Settings class for application configuration with validation.
    Loads settings from environment variables with defaults.
    """
    # Application settings
    APP_NAME: str = Field("AI Talent Marketplace - AI Service", description="Name of the application")
    APP_VERSION: str = Field("1.0.0", description="Version of the application")
    DEBUG: bool = Field(False, description="Debug mode flag")
    PORT: int = Field(8001, description="Port to run the application on")
    LOG_LEVEL: str = Field("INFO", description="Logging level")
    API_PREFIX: str = Field("/api/v1", description="API prefix for all endpoints")
    ENVIRONMENT: str = Field("development", description="Environment (development, staging, production)")
    
    # OpenAI settings
    OPENAI_API_KEY: str = Field("", description="OpenAI API Key for embeddings and AI features")
    OPENAI_MODEL: str = Field("text-embedding-ada-002", description="OpenAI model to use for embeddings")
    EMBEDDING_DIMENSION: int = Field(1536, description="Dimension of the embedding vectors")
    
    # ElasticSearch settings
    ELASTICSEARCH_HOST: str = Field("localhost", description="ElasticSearch host")
    ELASTICSEARCH_PORT: int = Field(9200, description="ElasticSearch port")
    ELASTICSEARCH_USERNAME: str = Field("", description="ElasticSearch username")
    ELASTICSEARCH_PASSWORD: str = Field("", description="ElasticSearch password", exclude=True)
    ELASTICSEARCH_INDEX_PREFIX: str = Field("ai_talent_marketplace_", description="Prefix for ElasticSearch indices")
    
    # Recommendation settings
    MAX_RECOMMENDATIONS: int = Field(10, description="Maximum number of recommendations to return")
    DEFAULT_CACHE_SIZE: int = Field(1000, description="Default cache size for recommendations")
    DEFAULT_BATCH_SIZE: int = Field(100, description="Default batch size for processing items")
    DEFAULT_MIN_SCORE: float = Field(0.7, description="Default minimum score threshold for recommendations")
    
    def __init__(self, **kwargs):
        """
        Initialize settings with defaults and environment variables.
        """
        # Load environment variables using load_env_vars()
        load_env_vars()
        
        # Apply default values where environment variables are not set
        super().__init__(**kwargs)
        
        # Validate all settings values
        logger.info(f"Initialized settings for environment: {self.ENVIRONMENT}")
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "forbid"  # Prevent extra attributes
    }

# Singleton instance of the Settings class with loaded configuration
settings = Settings()

# Configure logging based on settings
logging.basicConfig(
    level=get_log_level(settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)