"""
Dependency injection module for the Job Service API.

This module provides reusable dependencies for database connections, authentication,
service instances, and error handling to be used across API routes.
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, Request, SecurityScopes, status
from fastapi.security import HTTPBearer, OAuth2PasswordBearer
from jose import JWTError
from jose.jwt import decode as jwt_decode
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from elasticsearch import Elasticsearch

from ..config import settings
from ..services.job_service import JobService
from ..services.matching_service import MatchingService, MatchingServiceFactory
from ..models.job import Job

# Set up logging
logger = logging.getLogger(__name__)

# Create database engine and session factory
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Configure OAuth2 for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_PREFIX}/auth/token", auto_error=False)


def get_db():
    """
    Database session dependency that ensures session is always closed after use.
    
    Returns:
        Session: Database session for querying
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {str(e)}")
        raise
    finally:
        db.close()


def get_elasticsearch_client():
    """
    Create and provide an Elasticsearch client instance.
    
    Returns:
        Elasticsearch: Configured Elasticsearch client
    """
    es_client = None
    try:
        # Create credentials dict with username and password from settings
        credentials = {}
        if settings.ELASTICSEARCH_USERNAME and settings.ELASTICSEARCH_PASSWORD:
            credentials = {
                "http_auth": (settings.ELASTICSEARCH_USERNAME, settings.ELASTICSEARCH_PASSWORD)
            }
        
        # Initialize the Elasticsearch client with host, port, and credentials
        es_client = Elasticsearch(
            f"{settings.ELASTICSEARCH_HOST}:{settings.ELASTICSEARCH_PORT}", 
            **credentials
        )
        yield es_client
    finally:
        # Close the client connection in a finally block
        if es_client:
            es_client.close()


def get_job_service(db: Session = Depends(get_db), es_client: Elasticsearch = Depends(get_elasticsearch_client)):
    """
    Provide a JobService instance with necessary dependencies.
    
    Args:
        db (Session): Database session for data operations
        es_client (Elasticsearch): Elasticsearch client for search operations
        
    Returns:
        JobService: JobService instance for business logic
    """
    # Get the MatchingService instance using MatchingServiceFactory
    matching_service = MatchingServiceFactory.get_instance()
    
    # Initialize JobService with database session, matching service, and es client
    return JobService(Session=db, matching_service=matching_service, es_service=es_client)


def get_matching_service():
    """
    Provide a MatchingService instance.
    
    Returns:
        MatchingService: MatchingService instance for AI matching
    """
    # Get or create a MatchingService instance using MatchingServiceFactory
    return MatchingServiceFactory.get_instance()


def verify_token(token: str):
    """
    Verify and decode JWT token from Authorization header.
    
    Args:
        token (str): JWT token string
        
    Returns:
        dict: Decoded token payload
    """
    try:
        # Decode the JWT token using settings.JWT_SECRET_KEY and settings.JWT_ALGORITHM
        payload = jwt_decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        
        # Return decoded token payload if valid
        return payload
    except JWTError:
        # Raise HTTPException with 401 status code if token is invalid or expired
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(security_scopes: SecurityScopes, request: Request, token: str = Depends(oauth2_scheme)):
    """
    Get current authenticated user from JWT token.
    
    Args:
        security_scopes (SecurityScopes): Security scopes required for the endpoint
        request (Request): FastAPI request object
        token (str): JWT token from Authorization header
        
    Returns:
        dict: User information from the token
    """
    # Handle case where token is missing (return None for optional auth)
    if token is None:
        # Check if token is in Authorization header
        if "Authorization" in request.headers:
            auth = request.headers["Authorization"]
            try:
                scheme, param = auth.split()
                if scheme.lower() == "bearer":
                    token = param
            except ValueError:
                pass
        
        # If still no token, return None (for endpoints with optional auth)
        if token is None:
            return None
    
    # Prepare authentication value with scopes
    authenticate_value = f"Bearer scope=\"{security_scopes.scope_str}\""
    
    try:
        # Verify and decode the token using verify_token
        payload = verify_token(token)
        
        # Check user ID in token
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user identifier",
                headers={"WWW-Authenticate": authenticate_value},
            )
        
        # Validate that the token contains required scopes
        if security_scopes.scopes:
            token_scopes = payload.get("scopes", [])
            for scope in security_scopes.scopes:
                if scope not in token_scopes:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Not enough permissions. Required scope: {scope}",
                        headers={"WWW-Authenticate": authenticate_value},
                    )
        
        # Return user data from the token
        return payload
    except JWTError as e:
        # Handle JWTError with appropriate HTTP exceptions
        logger.error(f"JWT validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": authenticate_value},
        )


def get_user_id_from_token(token_data: dict = Depends(get_current_user)):
    """
    Extract user ID from the JWT token.
    
    Args:
        token_data (dict): Token data from get_current_user dependency
        
    Returns:
        UUID: User ID from token
    """
    # Extract sub (subject) claim from token_data
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = token_data.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User ID not found in token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Convert string ID to UUID type
    try:
        return UUID(user_id)
    except ValueError:
        # Handle case where sub claim is missing or invalid
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_job_by_id_dependency(job_id: UUID, job_service: JobService = Depends(get_job_service)):
    """
    Retrieve a job by ID with validation.
    
    Args:
        job_id (UUID): UUID of the job to retrieve
        job_service (JobService): JobService instance for data access
        
    Returns:
        dict: Job data if found
    """
    try:
        # Call job_service.get_job_by_id with the provided job_id
        job = job_service.get_job_by_id(job_id)
        
        # Return the job if found
        return job
    except HTTPException as e:
        # Handle case where job is not found with 404 error
        raise e
    except Exception as e:
        # Handle other exceptions with appropriate HTTP status codes
        logger.error(f"Error retrieving job {job_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve job: {str(e)}"
        )