import contextlib
import json
import logging
import sys
from typing import AsyncGenerator

import sqlalchemy
import uvicorn
from fastapi import FastAPI, Request, status, Depends, HTTPException
from fastapi.exceptions import RequestValidationError, HTTPValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings, setup_logging
from .api.routes import router
from .api.dependencies import get_db, engine
from .utils.ai_matching import AIMatchingClientFactory

# Initialize logger
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION, debug=settings.DEBUG)

def configure_middleware():
    """Configure middleware for the FastAPI application"""
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # In production, this should be restricted to specific origins
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    # Add other middleware as needed

def configure_routers():
    """Configure API routers for the FastAPI application"""
    # Include main router from routes.py
    app.include_router(router, prefix=settings.API_PREFIX)

def configure_exception_handlers():
    """Configure custom exception handlers for the FastAPI application"""
    # Add handler for validation errors
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    # Add handler for general HTTP exceptions
    app.add_exception_handler(HTTPException, http_exception_handler)
    # Add handler for unexpected errors
    app.add_exception_handler(Exception, generic_exception_handler)

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors"""
    # Log validation error details
    logger.error(f"Validation error: {exc.errors()}")
    # Format validation errors in a consistent structure
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "message": "Validation error"},
    )

async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    # Log HTTP exception details
    logger.error(f"HTTP exception: {exc.detail}, status_code={exc.status_code}")
    # Format error in a consistent structure
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "message": "HTTP error"},
    )

async def generic_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    # Log unexpected exception details
    logger.error(f"Unexpected error: {str(exc)}", exc_info=True)
    # Format error in a consistent structure
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": str(exc), "message": "Internal server error"},
    )

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """Manage application lifecycle events (startup and shutdown)"""
    # On startup: Initialize database
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    
    initialize_database()
    
    # On startup: Initialize AI matching client
    ai_client = AIMatchingClientFactory.get_instance()
    logger.info("AI matching client initialized")
    
    # On startup: Log application startup message
    logger.info(f"{settings.APP_NAME} initialized in {settings.ENVIRONMENT} environment")
    
    # Yield control to application execution
    yield
    
    # On shutdown: Clean up AI matching client resources
    if ai_client:
        await ai_client.close()
        logger.info("AI matching client resources released")
    
    # On shutdown: Close database connections
    logger.info("Closing database connections")
    
    # On shutdown: Log application shutdown message
    logger.info(f"Shutting down {settings.APP_NAME}")

# Assign lifespan context manager to app
app.router.lifespan_context = lifespan

def initialize_database():
    """Initialize database tables and connections"""
    try:
        # Create database tables using SQLAlchemy models
        from .models.job import Base
        Base.metadata.create_all(engine)
        
        # Perform any necessary migrations
        # In a production environment, this would use a proper migration tool
        
        # Log database initialization status
        logger.info("Database tables initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        raise

def main():
    """Main function to run the FastAPI application"""
    # Set up application logging
    setup_logging()
    
    # Configure middleware, routers and exception handlers
    configure_middleware()
    configure_routers()
    configure_exception_handlers()
    
    # Start uvicorn server with app, host, and port
    logger.info(f"Starting {settings.APP_NAME} on port {settings.PORT}")
    try:
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=settings.PORT,
            log_level="debug" if settings.DEBUG else "info",
        )
    except KeyboardInterrupt:
        # Handle keyboard interrupt for clean shutdown
        logger.info("Server stopped by user")

if __name__ == "__main__":
    main()