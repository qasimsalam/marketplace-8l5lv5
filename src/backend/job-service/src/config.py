import os
import logging
from dotenv import load_dotenv  # python-dotenv v1.0.0
from pydantic_settings import BaseSettings  # pydantic-settings v2.0.0
from pydantic import Field  # pydantic v2.0.0

# Define base directory for relative paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Initialize logger
logger = logging.getLogger(__name__)

def load_env_vars():
    """
    Loads environment variables from .env files based on environment.
    
    The function will attempt to load from environment-specific .env files:
    - .env.development
    - .env.staging
    - .env.production
    
    If an environment-specific file is not found, falls back to .env
    """
    environment = os.getenv("ENVIRONMENT", "development").lower()
    env_file = f".env.{environment}"
    
    # Try to load environment-specific file first
    if os.path.exists(os.path.join(BASE_DIR, env_file)):
        load_dotenv(os.path.join(BASE_DIR, env_file))
        logger.info(f"Loaded configuration from {env_file}")
    # Fall back to default .env
    else:
        load_dotenv(os.path.join(BASE_DIR, ".env"))
        logger.info(f"Environment-specific config not found. Loaded configuration from .env")
        
    logger.info(f"Running in {environment} environment")

def get_log_level(log_level: str) -> int:
    """
    Converts string log level to logging module level constant.
    
    Args:
        log_level (str): String representation of log level (debug, info, warning, error, critical)
        
    Returns:
        int: Logging level constant from logging module
    """
    log_level = log_level.upper()
    
    levels = {
        "DEBUG": logging.DEBUG,
        "INFO": logging.INFO,
        "WARNING": logging.WARNING,
        "ERROR": logging.ERROR,
        "CRITICAL": logging.CRITICAL
    }
    
    return levels.get(log_level, logging.INFO)

def setup_logging():
    """
    Configures logging for the application based on settings.
    
    Sets up console and file handlers with appropriate formatters.
    """
    log_level = get_log_level(os.getenv("LOG_LEVEL", "INFO"))
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remove existing handlers to avoid duplicates
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Create console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    
    # Create formatter
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # Create file handler if LOG_FILE is set
    log_file = os.getenv("LOG_FILE")
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(log_level)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)
    
    logger.info(f"Logging configured with level: {logging.getLevelName(log_level)}")

class Settings(BaseSettings):
    """
    Pydantic Settings class for application configuration with validation.
    
    This class centralizes all configuration parameters for the Job Service,
    providing validation, default values, and easy access to configuration.
    """
    # Application settings
    APP_NAME: str = Field(default="AI Talent Marketplace - Job Service")
    APP_VERSION: str = Field(default="1.0.0")
    DEBUG: bool = Field(default=False)
    PORT: int = Field(default=8000)
    LOG_LEVEL: str = Field(default="INFO")
    API_PREFIX: str = Field(default="/api/v1")
    ENVIRONMENT: str = Field(default="development")
    
    # Database settings
    DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/job_service",
        description="PostgreSQL connection string"
    )
    
    # Elasticsearch settings
    ELASTICSEARCH_HOST: str = Field(default="localhost")
    ELASTICSEARCH_PORT: int = Field(default=9200)
    ELASTICSEARCH_USERNAME: str = Field(default="")
    ELASTICSEARCH_PASSWORD: str = Field(default="")
    ELASTICSEARCH_JOB_INDEX: str = Field(default="jobs")
    ELASTICSEARCH_PROFILE_INDEX: str = Field(default="profiles")
    
    # Service URLs
    AI_SERVICE_URL: str = Field(default="http://ai-service:8001")
    USER_SERVICE_URL: str = Field(default="http://user-service:8002")
    
    # Pagination settings
    DEFAULT_PAGE_SIZE: int = Field(default=20)
    MAX_PAGE_SIZE: int = Field(default=100)
    
    # Job matching settings
    JOB_MATCH_THRESHOLD: int = Field(default=70, description="Minimum matching score percentage (0-100)")
    MAX_MATCHES: int = Field(default=50, description="Maximum number of matches to return")
    
    # JWT Authentication settings
    JWT_SECRET_KEY: str = Field(default="")
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30)
    
    # Model configuration (Pydantic v2 style)
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore"
    }
    
    def __init__(self, **data):
        """
        Initialize settings with defaults and environment variables.
        
        Loads environment variables before initializing fields.
        """
        load_env_vars()
        super().__init__(**data)

# Create a settings instance
settings = Settings()

# Configure logging
setup_logging()

# Log important configuration details (but ensure no sensitive data is logged)
logger.info(f"Initialized {settings.APP_NAME} v{settings.APP_VERSION}")
logger.info(f"Running in {settings.ENVIRONMENT} environment on port {settings.PORT}")