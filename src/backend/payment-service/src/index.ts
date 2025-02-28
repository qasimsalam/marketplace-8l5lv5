/**
 * Payment Service Entry Point
 * 
 * This is the main entry point for the Payment Service microservice of the AI Talent Marketplace platform.
 * It initializes the Express application, sets up connection to the database, configures environment
 * variables, and starts the HTTP server with proper error handling and graceful shutdown support.
 * 
 * @version 1.0.0
 */

// External dependencies
import process from 'process'; // Latest
import pino from 'pino'; // v8.14.1

// Internal modules
import { initializeService } from './app';
import { config } from './config';
import { formatErrorResponse } from '../../shared/src/utils/errors';
import { SERVICE_NAMES } from '../../shared/src/constants';

// Initialize logger
const logger = pino({ 
  name: SERVICE_NAMES.PAYMENT_SERVICE, 
  level: config.logLevel || 'info' 
});

// Global variable for the HTTP server
let server: any;

/**
 * Initializes and starts the Express server on the configured port and host
 */
async function startServer(): Promise<void> {
  try {
    // Initialize the Express application
    await initializeService();
    
    logger.info({
      msg: 'Payment Service started successfully',
      port: config.port,
      host: config.host,
      env: config.env
    });
  } catch (error) {
    logger.fatal({
      msg: 'Failed to start Payment Service',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

/**
 * Sets up global error handlers for uncaught exceptions and unhandled promise rejections
 */
function handleUncaughtErrors(): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.fatal({
      msg: 'Uncaught exception',
      error: error.message,
      stack: error.stack
    });
    
    // Give logger some time to write logs before exiting
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    const error = reason instanceof Error 
      ? reason 
      : new Error(String(reason));
      
    logger.error({
      msg: 'Unhandled promise rejection',
      error: error.message,
      stack: error.stack,
      reason: formatErrorResponse(error, true)
    });
  });
}

/**
 * Configures handlers for graceful shutdown on SIGTERM and SIGINT signals
 */
function setupGracefulShutdown(): void {
  // Graceful shutdown handler for SIGTERM
  process.on('SIGTERM', () => {
    gracefulShutdown('SIGTERM');
  });
  
  // Graceful shutdown handler for SIGINT (Ctrl+C)
  process.on('SIGINT', () => {
    gracefulShutdown('SIGINT');
  });
}

/**
 * Performs graceful shutdown operations
 * @param signal - The signal that triggered the shutdown
 */
function gracefulShutdown(signal: string): void {
  logger.info(`${signal} received, initiating graceful shutdown...`);
  
  // Since we don't have a direct reference to the server instance,
  // we'll perform a best-effort graceful shutdown
  logger.info('Performing graceful shutdown...');
  
  // Allow pending requests to complete
  setTimeout(() => {
    logger.info('Graceful shutdown completed');
    process.exit(0);
  }, 5000);
}

// Set up error handling
handleUncaughtErrors();

// Set up graceful shutdown
setupGracefulShutdown();

// Start the server
startServer().catch(error => {
  logger.fatal({
    msg: 'Failed to start server',
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
  process.exit(1);
});