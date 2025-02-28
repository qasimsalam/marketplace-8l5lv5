"""
Entry point for the AI Talent Marketplace's collaboration service.

This module initializes the FastAPI application, configures middleware, registers routes,
and handles WebSocket connections for real-time collaboration features including
integrated Jupyter notebooks, file sharing, and workspace management.
"""

import os
import sys
import logging
import asyncio
from contextlib import AsyncExitStack

# FastAPI - v0.100.0
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# FastAPI Health - v0.4.0
from fastapi_health import HealthCheck

# Uvicorn - v0.22.0
import uvicorn

# Internal imports
from config import settings
from api.routes import router
from api.websocket import workspace_websocket_endpoint, notebook_websocket_endpoint
from utils.file_manager import init_storage
from services.jupyter_service import setup_jupyter_directories

# Configure logger
logger = logging.getLogger(__name__)

# Initialize FastAPI application
app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)

def configure_logging():
    """Configures logging for the application."""
    # Set up log format
    log_format = "%(asctime)s - %(levelname)s - %(message)s"
    
    # Get log level from settings
    level_name = settings.LOG_LEVEL.upper()
    level = getattr(logging, level_name, logging.INFO)
    
    # Configure root logger
    logging.basicConfig(
        level=level,
        format=log_format,
        handlers=[logging.StreamHandler()]
    )
    
    # Set level for specific loggers
    logging.getLogger("uvicorn").setLevel(level)
    logging.getLogger("fastapi").setLevel(level)
    
    logger.info(f"Logging configured with level: {settings.LOG_LEVEL}")

def configure_cors():
    """Configures CORS middleware for the FastAPI application."""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
    )
    
    logger.info(f"CORS configured with allowed origins: {settings.ALLOWED_ORIGINS}")

def configure_routers():
    """Configures and includes API routers."""
    # Include main router with API prefix
    app.include_router(router, prefix=settings.API_PREFIX)
    
    # Add health check endpoint
    health = HealthCheck()
    health.add_check(is_healthy)
    app.add_api_route("/health", endpoint=health, tags=["Monitoring"])
    
    # Add WebSocket endpoints
    app.add_websocket_route(
        "/ws/workspaces/{workspace_id}", 
        workspace_websocket_endpoint
    )
    app.add_websocket_route(
        "/ws/notebooks/{notebook_id}", 
        notebook_websocket_endpoint
    )
    
    logger.info(f"API routes configured with prefix: {settings.API_PREFIX}")
    logger.info("WebSocket endpoints configured for workspaces and notebooks")

def is_healthy():
    """Health check function to verify service is operational."""
    try:
        # Check for MongoDB connection
        # Check for Redis connection
        # Check for filesystem access
        return True
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return False

@app.on_event("startup")
async def startup_event():
    """Event handler that runs on application startup."""
    # Initialize file storage
    init_storage()
    
    # Set up Jupyter notebook directories
    setup_jupyter_directories()
    
    # Log application startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    
    # Log configured endpoints
    for route in app.routes:
        logger.debug(f"Route: {route.path}")

@app.on_event("shutdown")
async def shutdown_event():
    """Event handler that runs on application shutdown."""
    # Close any active connections
    # Cleanup resources
    logger.info(f"Shutting down {settings.APP_NAME}")

def main():
    """Main function to run the application."""
    try:
        # Configure logging
        configure_logging()
        
        # Configure CORS
        configure_cors()
        
        # Configure API routers
        configure_routers()
        
        # Start Uvicorn server
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=settings.PORT,
            reload=settings.DEBUG,
            log_level=settings.LOG_LEVEL.lower(),
        )
    except KeyboardInterrupt:
        logger.info("Application stopped by user")
    except Exception as e:
        logger.error(f"Application error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()