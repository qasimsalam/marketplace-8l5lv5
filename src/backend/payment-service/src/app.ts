/**
 * Payment Service Express Application
 * 
 * Core Express application setup for the Payment Service microservice of the AI Talent Marketplace platform.
 * This file configures middleware, routes, and error handling for the payment processing service,
 * integrating with Stripe for secure payment operations, escrow services, and milestone-based payments.
 * 
 * @version 1.0.0
 */

// External dependencies
import express from 'express'; // ^4.18.2
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^7.0.0
import compression from 'compression'; // ^1.7.4
import morgan from 'morgan'; // ^1.10.0
import pino from 'pino'; // ^8.14.1
import pinoHttp from 'pino-http'; // ^8.3.1
import { Pool } from 'pg'; // ^8.11.3

// Internal modules
import { config } from './config';
import createPaymentRoutes from './routes/payment.routes';
import { PaymentController } from './controllers/payment.controller';
import { PaymentModel } from './models/payment.model';
import { TransactionModel } from './models/transaction.model';
import { StripeService } from './services/stripe.service';
import { EscrowService } from './services/escrow.service';
import { formatErrorResponse } from '../../shared/src/utils/errors';
import { SERVICE_NAMES } from '../../shared/src/constants';

// Create Express application
const app = express();

/**
 * Configures Express middleware for the payment service
 * 
 * @param app - Express application instance
 */
function setupMiddleware(app: express.Application): void {
  // Configure CORS
  app.use(cors({
    origin: config.isDevelopment ? '*' : [/\.ai-talent-marketplace\.com$/],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'stripe-signature'],
    credentials: true,
    maxAge: 86400 // 24 hours
  }));

  // Security headers
  app.use(helmet());

  // Request body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Response compression
  app.use(compression());

  // Request logging in development
  if (config.isDevelopment) {
    app.use(morgan('dev'));
  }

  // Structured logging with Pino
  const logger = pino({
    name: SERVICE_NAMES.PAYMENT_SERVICE,
    level: config.logLevel || 'info',
  });

  app.use(pinoHttp({
    logger,
    genReqId: req => req.id || req.headers['x-request-id'] || '',
    autoLogging: {
      ignorePaths: ['/health', '/version']
    },
    customLogLevel: (req, res, err) => {
      if (err) return 'error';
      if (res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    }
  }));
}

/**
 * Configures API routes for the payment service
 * 
 * @param app - Express application instance
 * @param dependencies - Application dependencies
 */
function setupRoutes(app: express.Application, dependencies: any): void {
  const { paymentController } = dependencies;

  // Set up payment routes
  const paymentRoutes = createPaymentRoutes(paymentController);
  app.use('/api/v1/payments', paymentRoutes);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'ok', 
      service: SERVICE_NAMES.PAYMENT_SERVICE 
    });
  });

  // API version info endpoint
  app.get('/version', (req, res) => {
    res.status(200).json({
      service: SERVICE_NAMES.PAYMENT_SERVICE,
      version: config.version || '1.0.0',
      environment: config.env || 'development'
    });
  });
}

/**
 * Configures global error handling for the payment service
 * 
 * @param app - Express application instance
 */
function setupErrorHandling(app: express.Application): void {
  // 404 handler for unmatched routes
  app.use((req, res, next) => {
    res.status(404).json({
      status: 'error',
      code: 'RESOURCE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`
    });
  });

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Determine appropriate status code based on error type
    const statusCode = err.statusCode || 500;
    
    // Format error response using utility function
    const errorResponse = formatErrorResponse(err, config.isDevelopment);

    // Log error with appropriate severity
    if (statusCode >= 500) {
      req.log.error({ 
        err, 
        request: req.path, 
        method: req.method,
        query: req.query,
        body: config.isDevelopment ? req.body : undefined
      }, 'Server error');
    } else {
      req.log.warn({ 
        err, 
        request: req.path, 
        method: req.method 
      }, 'Request error');
    }

    // Send error response
    res.status(statusCode).json({
      status: 'error',
      ...errorResponse
    });
  });
}

/**
 * Initializes the payment service and starts the Express server
 */
async function initializeService(): Promise<void> {
  try {
    // Initialize database connection pool
    const dbPool = new Pool({
      connectionString: config.db.url,
      min: config.db.pool.min,
      max: config.db.pool.max,
      idleTimeoutMillis: config.db.timeout,
      connectionTimeoutMillis: config.db.timeout,
    });
    
    // Test database connection
    await dbPool.query('SELECT NOW()');
    console.log('Database connection established successfully');
    
    // Initialize models with database connection
    const paymentModel = new PaymentModel(dbPool);
    const transactionModel = new TransactionModel(dbPool);
    
    // Initialize Stripe service
    const stripeService = new StripeService();
    
    // Initialize escrow service with dependencies
    const escrowService = new EscrowService(
      paymentModel,
      transactionModel,
      stripeService
    );
    
    // Create payment controller with all dependencies
    const paymentController = new PaymentController(
      paymentModel,
      transactionModel,
      stripeService,
      escrowService
    );

    // Set up middleware, routes, and error handling
    setupMiddleware(app);
    setupRoutes(app, { paymentController });
    setupErrorHandling(app);

    // Start server
    app.listen(config.port, config.host, () => {
      console.log(`Payment Service running at http://${config.host}:${config.port}`);
      console.log(`Environment: ${config.env}`);
    });
  } catch (error) {
    console.error('Failed to initialize Payment Service:', error);
    process.exit(1);
  }
}

// Initialize service in production, but export for testing
if (process.env.NODE_ENV !== 'test') {
  initializeService();
}

// Export app for testing
export { app };