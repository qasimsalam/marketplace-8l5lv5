/**
 * Main Routing Module
 * 
 * Central routing hub for the API Gateway that combines and exports all routes
 * and their associated middleware. This file serves as the entry point for API
 * request routing, configuring authentication, validation, rate limiting, and
 * service proxying for the microservices architecture.
 * 
 * @version 1.0.0
 */

import { Router, Request, Response } from 'express'; // ^4.18.2
import cors from 'cors'; // ^2.8.5
import swaggerUi from 'swagger-ui-express'; // ^4.6.2
import swaggerJsDoc from 'swagger-jsdoc'; // ^6.2.8

import createServiceRoutes from './proxy';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequestBody, validateRequestQuery } from '../middleware/validation';
import { getRoleLimiter } from '../middleware/rateLimit';
import { config } from '../config';
import logger from '../utils/logger';
import { UserRole } from '../../../shared/src/types/user.types';

/**
 * Creates and configures the main router for the API Gateway with all routes and middleware
 * 
 * @returns Configured Express router with all API routes and middleware
 */
function createRouter(): Router {
  logger.info('Initializing API Gateway router');
  
  // Create a new Express router
  const router = Router();
  
  // Apply CORS middleware with configuration from config
  router.use(cors({
    origin: config.cors.origins,
    methods: config.cors.methods,
    allowedHeaders: config.cors.allowedHeaders,
    credentials: true
  }));
  
  // Set up health check routes for the API Gateway
  setupHealthRoutes(router);
  
  // Set up authentication routes with appropriate middleware
  setupAuthRoutes(router);
  
  // Set up service proxy routes
  setupServiceProxies(router);
  
  // Set up Swagger documentation routes
  setupSwaggerDocs(router);
  
  logger.info('API Gateway router initialization complete');
  
  return router;
}

/**
 * Configures health check and readiness check routes for the API Gateway
 * 
 * @param router - Express router to add routes to
 */
function setupHealthRoutes(router: Router): void {
  logger.debug('Setting up health check routes');
  
  // Simple health check endpoint for the API Gateway itself
  router.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'api-gateway',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString()
    });
  });
  
  // Readiness check that includes checking dependencies
  router.get('/readiness', async (req: Request, res: Response) => {
    try {
      // In a full implementation, we would check Redis connection and service health
      // For now, just return a success response
      res.status(200).json({
        status: 'ready',
        service: 'api-gateway',
        dependencies: {
          redis: 'ok',
          services: {
            userService: 'ok',
            jobService: 'ok',
            paymentService: 'ok',
            collaborationService: 'ok',
            aiService: 'ok'
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        status: 'not ready',
        service: 'api-gateway',
        timestamp: new Date().toISOString(),
        error: (error as Error).message
      });
    }
  });
  
  logger.debug('Health check routes configured');
}

/**
 * Sets up authentication-related routes with appropriate middleware
 * 
 * @param router - Express router to add routes to
 */
function setupAuthRoutes(router: Router): void {
  logger.debug('Setting up authentication routes');
  
  const authPrefix = '/api/v1/auth';
  
  // Apply rate limiting to authentication endpoints to prevent brute force attacks
  router.use(authPrefix, getRoleLimiter);
  
  // Login route with validation
  router.post(
    `${authPrefix}/login`,
    validateRequestBody(/* Schema is imported dynamically in validation middleware */),
    (req: Request, res: Response, next) => next()
  );
  
  // Registration route with validation
  router.post(
    `${authPrefix}/register`,
    validateRequestBody(/* Schema is imported dynamically in validation middleware */),
    (req: Request, res: Response, next) => next()
  );
  
  // Refresh token route
  router.post(
    `${authPrefix}/refresh-token`,
    (req: Request, res: Response, next) => next()
  );
  
  // Logout route - requires authentication
  router.post(
    `${authPrefix}/logout`,
    authenticate,
    (req: Request, res: Response, next) => next()
  );
  
  // Forgot password route
  router.post(
    `${authPrefix}/forgot-password`,
    validateRequestBody(/* Schema is imported dynamically in validation middleware */),
    (req: Request, res: Response, next) => next()
  );
  
  // Reset password route
  router.post(
    `${authPrefix}/reset-password`,
    validateRequestBody(/* Schema is imported dynamically in validation middleware */),
    (req: Request, res: Response, next) => next()
  );
  
  logger.debug('Authentication routes configured');
}

/**
 * Configures proxy routes to microservices with appropriate middleware
 * 
 * @param router - Express router to add routes to
 */
function setupServiceProxies(router: Router): void {
  logger.debug('Setting up service proxy routes');
  
  // Get service routes from createServiceRoutes function
  const serviceRoutes = createServiceRoutes();
  
  // Apply global rate limiting to API routes based on user role
  router.use('/api/v1', getRoleLimiter);
  
  // Apply authentication and authorization middleware to protected routes
  
  // Admin routes - require admin role
  router.use('/api/v1/admin', authenticate, authorize([UserRole.ADMIN]));
  
  // User profile routes - require authentication
  router.use('/api/v1/users/profile', authenticate);
  
  // Job management routes - require employer or admin role for POST/PUT/DELETE
  router.post('/api/v1/jobs', authenticate, authorize([UserRole.EMPLOYER, UserRole.ADMIN]));
  router.put('/api/v1/jobs/:id', authenticate, authorize([UserRole.EMPLOYER, UserRole.ADMIN]));
  router.delete('/api/v1/jobs/:id', authenticate, authorize([UserRole.EMPLOYER, UserRole.ADMIN]));
  
  // Proposals routes - require freelancer or admin role
  router.use('/api/v1/proposals', authenticate, authorize([UserRole.FREELANCER, UserRole.ADMIN]));
  
  // Payment routes - require authentication
  router.use('/api/v1/payments', authenticate);
  
  // Contract routes - require authentication
  router.use('/api/v1/contracts', authenticate);
  
  // Apply validation middleware to routes that need it
  router.post('/api/v1/jobs', validateRequestBody());
  router.put('/api/v1/jobs/:id', validateRequestBody());
  router.get('/api/v1/jobs', validateRequestQuery());
  
  // Mount the service routes to the main router
  router.use('/', serviceRoutes);
  
  logger.debug('Service proxy routes configured');
}

/**
 * Configures Swagger UI routes for API documentation
 * 
 * @param router - Express router to add routes to
 */
function setupSwaggerDocs(router: Router): void {
  logger.debug('Setting up Swagger documentation routes');
  
  // Swagger configuration
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'AI Talent Marketplace API',
        version: '1.0.0',
        description: 'API documentation for the AI Talent Marketplace platform',
        contact: {
          name: 'API Support',
          email: 'support@aitalentmarketplace.com'
        }
      },
      servers: [
        {
          url: config.isDevelopment 
            ? `http://${config.host}:${config.port}` 
            : 'https://api.aitalentmarketplace.com',
          description: config.isDevelopment ? 'Development Server' : 'Production Server'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      },
      security: [
        {
          bearerAuth: []
        }
      ]
    },
    apis: ['./src/**/routes/*.ts', './src/**/controllers/*.ts', './src/**/models/*.ts'] // Path to the API docs
  };
  
  // Generate swagger specification
  const swaggerSpec = swaggerJsDoc(swaggerOptions);
  
  // Serve swagger UI
  router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true
  }));
  
  // Serve swagger specification as JSON
  router.get('/api-docs.json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  logger.debug('Swagger documentation routes configured');
}

// Export the main router creation function
export default createRouter;