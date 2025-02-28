/**
 * Main Application Entry Point for User Service
 * 
 * This file configures the Express application, sets up middleware,
 * registers routes, implements error handling, and bootstraps the 
 * entire User Service for the AI Talent Marketplace platform.
 * 
 * @version 1.0.0
 */

import express, { Request, Response, NextFunction } from 'express'; // v4.18.2
import cors from 'cors'; // v2.8.5
import morgan from 'morgan'; // v1.10.0
import helmet from 'helmet'; // v6.1.5
import compression from 'compression'; // v1.7.4
import bodyParser from 'body-parser'; // v1.20.2
import Redis from 'ioredis'; // v5.3.2
import pino from 'pino'; // v8.14.1

// Import configuration
import { config } from './config';

// Import routers
import userRouter from './routes/user.routes';
import profileRouter from './routes/profile.routes';

// Import controllers
import { UserController } from './controllers/user.controller';
import { ProfileController } from './controllers/profile.controller';

// Import services
import { UserService } from './services/user.service';
import { AuthService } from './services/auth.service';

// Import error utilities
import { formatErrorResponse, mapErrorToStatusCode } from '../../shared/src/utils/errors';

// Extend Express Request interface to include a request ID
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

// Initialize Express app
const app = express();

// Initialize logger
const logger = pino({ level: config.logLevel });

/**
 * Configures middleware for the Express application
 * @param app - Express application instance
 */
function setupMiddleware(app: express.Application): void {
  // Configure CORS middleware with settings from config
  app.use(cors({
    origin: config.cors.origin,
    methods: config.cors.methods,
    credentials: true
  }));

  // Set up HTTP request logging with morgan
  app.use(morgan(config.isDevelopment ? 'dev' : 'combined'));

  // Configure security headers with helmet
  app.use(helmet());

  // Enable response compression
  app.use(compression());

  // Set up JSON body parsing with size limits
  app.use(bodyParser.json({ limit: '1mb' }));

  // Set up URL-encoded form data parsing
  app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));

  // Add request ID generation middleware
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.id = require('crypto').randomUUID();
    next();
  });
}

/**
 * Registers API routes and controllers for the application
 * @param app - Express application instance
 * @param userController - User controller instance
 * @param profileController - Profile controller instance
 */
function setupRoutes(
  app: express.Application,
  userController: UserController,
  profileController: ProfileController
): void {
  // Mount user router at /api/v1/users
  app.use('/api/v1', userRouter);

  // Mount profile router at /api/v1/profiles
  app.use('/api/v1', profileRouter(profileController));

  // Add health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: config.serviceName,
      timestamp: new Date().toISOString()
    });
  });

  // Add catch-all route for 404 Not Found responses
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource does not exist'
      }
    });
  });

  // Register global error handling middleware
  app.use(errorHandler);
}

/**
 * Initializes service instances with dependencies
 * @returns Object containing initialized service instances
 */
function initializeServices() {
  // Initialize Redis client with connection settings from config
  const redisClient = new Redis({
    host: config.redis?.host || 'localhost',
    port: config.redis?.port || 6379,
    password: config.redis?.password,
    db: config.redis?.db || 0
  });

  // Create UserService instance with database connection
  const userService = new UserService(redisClient);

  // Create AuthService instance with UserService and Redis client
  const authService = new AuthService(userService, redisClient);

  // Create UserController instance with UserService and AuthService
  const userController = new UserController(userService, authService);

  // Create ProfileController instance with UserService and AuthService
  const profileController = new ProfileController(userService, authService, redisClient);

  return {
    redisClient,
    userService,
    authService,
    userController,
    profileController
  };
}

/**
 * Starts the Express server and listens for requests
 * @param app - Express application instance
 * @returns Promise that resolves when server is started
 */
async function startServer(app: express.Application): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      const server = app.listen(config.port, config.host, () => {
        logger.info(`User Service running at http://${config.host}:${config.port}`);
        resolve();
      });

      // Set up graceful shutdown handlers for SIGTERM and SIGINT
      process.on('SIGTERM', () => {
        logger.info('SIGTERM received, shutting down gracefully');
        server.close(() => {
          logger.info('Server closed');
          process.exit(0);
        });
      });

      process.on('SIGINT', () => {
        logger.info('SIGINT received, shutting down gracefully');
        server.close(() => {
          logger.info('Server closed');
          process.exit(0);
        });
      });
    } catch (error) {
      logger.error('Error starting server:', error);
      reject(error);
    }
  });
}

/**
 * Global error handling middleware for the application
 * @param error - Error object
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error details with request context
  logger.error({
    err: error,
    reqId: req.id,
    method: req.method,
    path: req.path
  }, 'Request error');

  // Determine appropriate HTTP status code using mapErrorToStatusCode
  const statusCode = mapErrorToStatusCode(error);

  // Format error response using formatErrorResponse
  const formattedError = formatErrorResponse(error);

  // Include stack trace in development mode only
  const response = {
    success: false,
    error: formattedError
  };

  if (config.isDevelopment) {
    (response.error as any).stack = error.stack;
  }

  // Send response with status code and formatted error
  res.status(statusCode).json(response);

  // Monitor and report critical errors if necessary
  if (statusCode >= 500) {
    // In a production app, we would report to a monitoring service
    // such as Sentry, New Relic, etc.
  }
}

// Bootstrap the application
(async () => {
  try {
    // Initialize services
    const services = initializeServices();

    // Set up middleware
    setupMiddleware(app);

    // Set up routes
    setupRoutes(app, services.userController, services.profileController);

    // Start the server if not in test mode
    if (process.env.NODE_ENV !== 'test') {
      await startServer(app);
    }
  } catch (error) {
    logger.error('Failed to start User Service:', error);
    process.exit(1);
  }
})();

// Export the configured Express application for testing or external use
export { app };