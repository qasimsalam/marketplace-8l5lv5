/**
 * API Gateway Application Entry Point
 * 
 * This file bootstraps the API Gateway service for the AI Talent Marketplace platform.
 * It configures the Express application with middleware, security features, routes, 
 * error handling, and graceful shutdown procedures.
 * 
 * The API Gateway serves as the centralized entry point for client requests to the
 * microservices architecture, handling authentication, routing, and request transformation.
 * 
 * @version 1.0.0
 */

// Import required modules
import 'express-async-errors'; // v3.1.1 - Handle async errors in Express routes
import express, { Request, Response, NextFunction, Express } from 'express'; // v4.18.2
import cors from 'cors'; // v2.8.5
import helmet from 'helmet'; // v7.0.0
import compression from 'compression'; // v1.7.4
import morgan from 'morgan'; // v1.10.0
import hpp from 'hpp'; // v0.2.3
import http from 'http';

// Import application components
import { config } from './config';
import logger from './utils/logger';
import createRouter from './routes';
import { initializeRateLimiters } from './middleware/rateLimit';
import { 
  formatErrorResponse, 
  mapErrorToStatusCode, 
  isCustomError 
} from '../../shared/src/utils/errors';

/**
 * Creates and configures the Express application with all middleware and routes
 * 
 * @returns Configured Express application ready to start
 */
function createApp(): Express {
  logger.info('Initializing API Gateway application');

  // Create Express application
  const app = express();

  // Apply security middleware
  app.use(helmet()); // Set security headers
  app.use(hpp()); // Protect against parameter pollution
  app.use(cors(config.cors)); // Configure CORS based on config

  // Configure request parsing
  app.use(express.json({ limit: '1mb' })); // Parse JSON request bodies
  app.use(express.urlencoded({ extended: true, limit: '1mb' })); // Parse URL-encoded bodies

  // Enable response compression
  app.use(compression());

  // Configure request logging
  const morganFormat = config.isDevelopment ? 'dev' : 'combined';
  app.use(morgan(morganFormat, {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      }
    },
    skip: (req: Request) => {
      // Skip logging for health check endpoints to reduce noise
      return req.url.includes('/health') || req.url.includes('/readiness');
    }
  }));

  // Initialize rate limiters
  initializeRateLimiters();

  // Add main API routes
  app.use(createRouter());

  // Configure 404 handler for undefined routes
  app.use(notFoundHandler);

  // Configure global error handling middleware
  app.use(errorHandler);

  logger.info('API Gateway application initialization completed');

  return app;
}

/**
 * Starts the Express server on the configured port and host
 * 
 * @param app - Configured Express application
 * @returns Promise that resolves when server starts successfully
 */
async function startServer(app: Express): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Create HTTP server
      const server = http.createServer(app);

      // Start server on configured port and host
      server.listen(config.port, config.host, () => {
        const address = server.address();
        const addressInfo = typeof address === 'string' 
          ? address 
          : `${address?.address}:${address?.port}`;
        
        logger.info(`API Gateway server started at ${addressInfo}`);
        
        // Configure graceful shutdown
        setupGracefulShutdown(server);
        
        resolve();
      });

      // Handle server errors
      server.on('error', (error: Error) => {
        logger.error(`Failed to start API Gateway server: ${error.message}`, { error });
        reject(error);
      });
    } catch (error) {
      logger.error(`Error starting API Gateway server: ${(error as Error).message}`, { error });
      reject(error);
    }
  });
}

/**
 * Global error handling middleware for the Express application
 * 
 * @param err - Error object
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  // If headers already sent, delegate to Express default error handler
  if (res.headersSent) {
    return next(err);
  }

  // Log error with request details
  logger.error(`Error handling request to ${req.method} ${req.url}: ${err.message}`, {
    error: err.stack,
    user: (req as any).user?.id || 'unauthenticated',
    requestId: (req as any).requestId || 'unknown',
    ip: req.ip,
    method: req.method,
    url: req.originalUrl
  });

  // Determine HTTP status code for response
  const statusCode = mapErrorToStatusCode(err);

  // Format error response
  const errorResponse = formatErrorResponse(err, config.isDevelopment);

  // Send error response
  res.status(statusCode).json({ 
    status: 'error',
    ...errorResponse
  });
}

/**
 * Middleware that handles requests to non-existent routes
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  logger.info(`404 Not Found: ${req.method} ${req.url}`, {
    ip: req.ip,
    headers: req.headers,
    params: req.params,
    query: req.query
  });

  // Create 404 response
  res.status(404).json({
    status: 'error',
    code: 'RESOURCE_NOT_FOUND',
    message: `Route not found: ${req.method} ${req.path}`
  });
}

/**
 * Configures graceful shutdown for the server on termination signals
 * 
 * @param server - HTTP server instance
 */
function setupGracefulShutdown(server: http.Server): void {
  // Time to wait for connections to close gracefully (30 seconds)
  const SHUTDOWN_TIMEOUT = 30000;

  // Handler for shutdown signals
  const shutdownHandler = (signal: string) => {
    logger.info(`${signal} received, shutting down API Gateway gracefully`);

    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed, cleaning up resources');

      try {
        // Perform cleanup tasks here (e.g., close database connections)
        // For future implementation

        logger.info('Cleanup completed, exiting process');
        process.exit(0);
      } catch (error) {
        logger.error(`Error during cleanup: ${(error as Error).message}`, { error });
        process.exit(1);
      }
    });

    // Force shutdown after timeout
    setTimeout(() => {
      logger.error(`Shutdown timed out after ${SHUTDOWN_TIMEOUT}ms, forcing exit`);
      process.exit(1);
    }, SHUTDOWN_TIMEOUT);
  };

  // Register shutdown handlers for SIGTERM and SIGINT
  process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
  process.on('SIGINT', () => shutdownHandler('SIGINT'));
}

// Create the Express application
const app = createApp();

// Export app and start function for testing and direct usage
export { app, startServer };

// Start the server if this file is run directly
if (require.main === module) {
  startServer(app).catch((error) => {
    logger.error(`Failed to start server: ${error.message}`, { error });
    process.exit(1);
  });
}