"""
Main entry point for the AI Talent Marketplace's AI service.

This module initializes and configures the FastAPI application that provides
AI-powered matching, recommendation, and embedding generation capabilities.
"""

# External imports
import fastapi  # fastapi - version 0.100.0
import uvicorn  # uvicorn - version 0.22.0
import logging  # logging - standard library
import time  # time - standard library
import sys  # sys - standard library
from fastapi.middleware.cors import CORSMiddleware  # fastapi.middleware.cors - version 0.100.0

# Internal imports
from config import settings  # Import configuration settings
from api.routes import router  # Import API routes
from models.embedding import EmbeddingModelFactory  # Import embedding model factory
from models.recommendation import RecommendationEngineFactory  # Import recommendation engine factory

# Set up logger
logger = logging.getLogger(__name__)

# Create FastAPI application
app = fastapi.FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)

def configure_logging() -> None:
    """
    Configures the logging system for the application
    """
    # Set logging level based on settings
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    
    # Configure logging format with timestamp, level, and message
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[logging.StreamHandler()]
    )
    
    # Log application startup with configured logging
    logger.info(f"Logging configured with level: {settings.LOG_LEVEL}")

def configure_cors() -> None:
    """
    Configure CORS middleware for the FastAPI application
    """
    # Set up allowed origins based on environment
    if settings.DEBUG:
        # In debug mode, allow all origins
        origins = ["*"]
    else:
        # In production, restrict to specific domains
        origins = [
            "https://aitalentmarketplace.com",
            "https://www.aitalentmarketplace.com",
            # Add more domains as needed
        ]
    
    # Add CORSMiddleware to app
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
    
    logger.info(f"CORS configured with origins: {origins}")

def initialize_services() -> None:
    """
    Initialize required services and models for the application
    """
    # Initialize embedding model
    embedding_model = EmbeddingModelFactory.get_instance()
    logger.info("Embedding model initialized")
    
    # Initialize recommendation engine
    recommendation_engine = RecommendationEngineFactory.get_instance()
    logger.info("Recommendation engine initialized")

def setup_middleware() -> None:
    """
    Sets up middleware for request processing
    """
    # Add request timing middleware
    app.middleware("http")(request_timer_middleware)
    logger.info("Request timer middleware configured")
    
    # Additional middleware could be added here
    # Such as error handling, authentication, etc.

def setup_routers() -> None:
    """
    Sets up API routers and registers endpoints
    """
    # Include router from api/routes.py with API prefix
    app.include_router(router)
    logger.info(f"API routes registered with prefix: {settings.API_PREFIX}")
    
    # Add root endpoint for service information
    # This is already defined as root_endpoint function with @app.get("/") decorator

def get_app() -> fastapi.FastAPI:
    """
    Creates and configures the FastAPI application
    
    Returns:
        Configured FastAPI application instance
    """
    # Configure logging
    configure_logging()
    
    # Configure CORS
    configure_cors()
    
    # Initialize services
    initialize_services()
    
    # Setup middleware
    setup_middleware()
    
    # Setup routers
    setup_routers()
    
    logger.info(f"FastAPI application '{settings.APP_NAME}' configured successfully")
    
    return app

async def request_timer_middleware(request: fastapi.Request, call_next) -> fastapi.Response:
    """
    Middleware to time request processing duration
    
    Args:
        request: The incoming request
        call_next: The next middleware or endpoint handler
        
    Returns:
        Response from the next middleware or endpoint
    """
    # Record start time before request processing
    start_time = time.time()
    
    # Process request using call_next
    response = await call_next(request)
    
    # Record end time after processing
    end_time = time.time()
    
    # Calculate and log request duration
    duration = end_time - start_time
    logger.debug(f"Request to {request.url.path} took {duration:.4f} seconds")
    
    # Add custom header with processing time
    response.headers["X-Process-Time"] = str(duration)
    
    return response

@app.on_event("startup")
async def startup_event() -> None:
    """
    Handler for application startup event
    """
    logger.info(f"Starting up {settings.APP_NAME} v{settings.APP_VERSION}")
    
    # Initialize services if not already initialized during setup
    try:
        initialize_services()
        
        # Perform health check of dependencies
        # This could include checking connections to databases, etc.
        logger.info("All services initialized successfully")
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")
        # In a production environment, we might want to terminate the app
        # if critical services fail to initialize

@app.on_event("shutdown")
async def shutdown_event() -> None:
    """
    Handler for application shutdown event
    """
    logger.info(f"Shutting down {settings.APP_NAME}")
    
    # Perform cleanup of resources
    # Close any open connections or sessions
    logger.info("Resources cleaned up successfully")

@app.get("/")
async def root_endpoint() -> dict:
    """
    Root endpoint handler returning service information
    
    Returns:
        Service information including name, version, status
    """
    # Compile service information
    service_info = {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "up",
        "api_prefix": settings.API_PREFIX,
        "environment": settings.ENVIRONMENT,
        "timestamp": time.time()
    }
    
    return service_info

def main() -> None:
    """
    Main entry point for running the application directly
    """
    # Configure logging
    configure_logging()
    
    # Start uvicorn server
    logger.info(f"Starting uvicorn server on port {settings.PORT}")
    try:
        uvicorn.run(
            "main:app",  # This module's name and the app variable
            host="0.0.0.0",
            port=settings.PORT,
            reload=settings.DEBUG,
            log_level=settings.LOG_LEVEL.lower()
        )
    except KeyboardInterrupt:
        logger.info("Server stopped by keyboard interrupt")
    except Exception as e:
        logger.error(f"Error starting server: {str(e)}")
        sys.exit(1)

# Run the app if the script is executed directly
if __name__ == "__main__":
    main()