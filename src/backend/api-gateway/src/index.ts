/**
 * API Gateway Entry Point
 * 
 * Main entry point for the API Gateway service that initializes the application server,
 * sets up graceful shutdown, and handles process-level error management.
 * 
 * @version 1.0.0
 */

import http from 'http'; // latest
import { app, startServer } from './app';
import { config } from './config';
import logger from './utils/logger';

/**
 * Main entry point that initializes and starts the server
 */
async function main(): Promise<void> {
  try {
    // Set up process-level error handlers
    process.on('uncaughtException', handleUncaughtException);
    process.on('unhandledRejection', handleUnhandledRejection);

    logger.info('Initializing API Gateway service...');

    // Start the Express server (which also sets up graceful shutdown)
    await startServer(app);
    
    logger.info(`API Gateway initialized successfully in ${config.env} mode`);
  } catch (error) {
    logger.error(`Failed to initialize API Gateway: ${(error as Error).message}`, { 
      error: (error as Error).stack
    });
    process.exit(1);
  }
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

/**
 * Handles uncaught exceptions at the process level
 * 
 * @param error - Error that was not caught
 */
function handleUncaughtException(error: Error): void {
  logger.error(`Uncaught Exception: ${error.message}`, {
    error: error.stack
  });

  // In production, exit the process after an uncaught exception
  if (!config.isDevelopment) {
    // Allow logs to be written before exiting
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  } else {
    // In development, log the error but don't exit to allow for debugging
    logger.warn('Application continuing in development mode despite uncaught exception');
  }
}

/**
 * Handles unhandled promise rejections at the process level
 * 
 * @param reason - Reason for the rejection
 * @param promise - Promise that was rejected
 */
function handleUnhandledRejection(reason: any, promise: Promise<any>): void {
  logger.error('Unhandled Promise Rejection', {
    reason: reason instanceof Error ? reason.stack : reason
  });

  // Convert unhandled rejections to uncaught exceptions
  // This ensures consistent error handling
  throw reason;
}

// Execute the main function to start the server
main().catch((error) => {
  logger.error(`Unhandled error in main function: ${error.message}`, { error });
  process.exit(1);
});