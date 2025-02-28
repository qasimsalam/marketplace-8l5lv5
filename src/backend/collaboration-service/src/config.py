"""
Configuration module for the Collaboration Service.

This module centralizes all environment variables, application settings, and service parameters
for the real-time collaboration features of the AI Talent Marketplace platform, including
Jupyter notebook integration, workspace management, and file sharing capabilities.
"""
import os
import logging
from typing import List, Dict, Any, Optional

# python-dotenv v1.0.0
from dotenv import load_dotenv
# pydantic-settings v2.0.0
from pydantic_settings import BaseSettings
# pydantic v2.0.0
from pydantic import Field

# Base directory of the application
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Configure logger for this module
logger = logging.getLogger(__name__)

def load_env_vars() -> None:
    """
    Loads environment variables from .env files based on environment.
    
    The function determines the current environment (development, staging, production)
    from the ENV environment variable and loads the appropriate .env file.
    If the environment-specific file doesn't exist, it falls back to the default .env file.
    """
    env = os.getenv("ENV", "development").lower()
    env_file = f".env.{env}"
    
    # Try to load environment-specific .env file
    if os.path.exists(env_file):
        load_dotenv(env_file)
        logger.info(f"Loaded environment variables from {env_file}")
    else:
        # Fall back to default .env file
        load_dotenv()
        logger.info("Loaded environment variables from .env")
    
    logger.info(f"Running in {env} environment")

def get_log_level(log_level: str) -> int:
    """
    Converts string log level to logging module level constant.
    
    Args:
        log_level: String representation of log level (e.g., 'DEBUG', 'INFO')
        
    Returns:
        Logging level constant from logging module
    """
    log_level = log_level.upper()
    
    levels = {
        'DEBUG': logging.DEBUG,
        'INFO': logging.INFO,
        'WARNING': logging.WARNING,
        'ERROR': logging.ERROR,
        'CRITICAL': logging.CRITICAL
    }
    
    return levels.get(log_level, logging.INFO)

class Settings(BaseSettings):
    """
    Pydantic Settings class for application configuration with validation.
    
    This class handles all configuration parameters for the Collaboration Service,
    including database connections, file storage, Jupyter notebook settings,
    and real-time communication parameters.
    """
    # Application settings
    APP_NAME: str = Field("AI Talent Marketplace - Collaboration Service", description="Name of the application")
    APP_VERSION: str = Field("1.0.0", description="Version of the application")
    DEBUG: bool = Field(False, description="Debug mode flag")
    PORT: int = Field(8002, description="Port on which the service runs")
    LOG_LEVEL: str = Field("INFO", description="Logging level")
    API_PREFIX: str = Field("/api/v1", description="API URL prefix")
    ENVIRONMENT: str = Field("development", description="Environment (development, staging, production)")
    
    # Database settings
    MONGODB_URI: str = Field("mongodb://localhost:27017", description="MongoDB connection URI")
    MONGODB_DB_NAME: str = Field("collaboration_service", description="MongoDB database name")
    
    # Redis settings (for real-time features)
    REDIS_HOST: str = Field("localhost", description="Redis host")
    REDIS_PORT: int = Field(6379, description="Redis port")
    REDIS_PASSWORD: str = Field("", description="Redis password")
    
    # File storage settings
    FILE_STORAGE_PATH: str = Field("./data/files", description="Path to store files")
    JUPYTER_NOTEBOOK_DIR: str = Field("./data/notebooks", description="Path to store Jupyter notebooks")
    ALLOWED_FILE_TYPES: List[str] = Field(
        ["py", "ipynb", "md", "txt", "csv", "json", "yaml", "yml", "pdf", "png", "jpg", "jpeg", "gif"],
        description="List of allowed file extensions"
    )
    MAX_FILE_SIZE_MB: int = Field(50, description="Maximum allowed file size in MB")
    
    # Workspace settings
    WORKSPACE_INACTIVITY_TIMEOUT: int = Field(604800, description="Workspace inactivity timeout in seconds (7 days)")
    
    # CORS settings
    ALLOWED_ORIGINS: List[str] = Field(["http://localhost:3000"], description="List of allowed CORS origins")
    
    # Jupyter settings
    JUPYTER_KERNEL_TIMEOUT: int = Field(3600, description="Jupyter kernel timeout in seconds (1 hour)")
    JUPYTER_EXECUTION_TIMEOUT: int = Field(300, description="Jupyter cell execution timeout in seconds (5 minutes)")
    
    # Real-time communication settings
    REAL_TIME_MESSAGE_HISTORY: int = Field(100, description="Number of real-time messages to keep in history")
    
    # S3 storage settings (optional)
    S3_BUCKET_NAME: str = Field("ai-talent-marketplace-files", description="S3 bucket name for file storage")
    USE_S3_STORAGE: bool = Field(False, description="Flag to use S3 for file storage instead of local filesystem")
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
    }
    
    def __init__(self, **kwargs):
        """
        Initialize settings with defaults and environment variables.
        
        This constructor loads environment variables, applies default values
        where environment variables are not set, and validates all settings.
        """
        # Load environment variables
        load_env_vars()
        super().__init__(**kwargs)
        
        # Ensure storage directories exist
        os.makedirs(self.FILE_STORAGE_PATH, exist_ok=True)
        os.makedirs(self.JUPYTER_NOTEBOOK_DIR, exist_ok=True)

# Create a singleton instance of Settings
settings = Settings()