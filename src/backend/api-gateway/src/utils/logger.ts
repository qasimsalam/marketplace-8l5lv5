/**
 * Logger Utility
 * 
 * Centralized logging utility for the API Gateway service providing structured logging 
 * with different severity levels, request context preservation, and environment-specific formatting.
 * This module serves as the logging interface for all components of the API Gateway.
 * 
 * The logger is configured based on the environment:
 * - Development: Pretty printed, colorized logs for better readability
 * - Production: JSON formatted logs for structured log aggregation
 * 
 * Usage:
 * ```
 * import logger from './utils/logger';
 * 
 * // Basic logging
 * logger.info('Server started');
 * logger.error('Failed to connect to database', { error: err });
 * 
 * // Context-specific logging
 * const requestLogger = logger.child({ requestId: '123', userId: '456' });
 * requestLogger.info('Processing request');
 * ```
 * 
 * @version 1.0.0
 */

import pino from 'pino'; // ^8.8.0
import pinoPretty from 'pino-pretty'; // ^9.1.1
import { config } from '../config';
import { SERVICE_NAMES } from '../../../shared/src/constants';

/**
 * Configuration options for the logger
 */
interface LoggerOptions {
  /** Minimum log level to output (debug, info, warn, error, fatal) */
  level: string;
  /** Custom transport configuration for development pretty printing */
  transport?: object;
  /** Custom formatters for log output */
  formatters?: object;
  /** Base properties to include in all log records */
  base?: object;
}

/**
 * Creates and configures a Pino logger instance based on environment
 * @returns Configured Pino logger instance
 */
function createLogger(): pino.Logger {
  const baseOptions: LoggerOptions = {
    level: config.logLevel,
    base: {
      service: SERVICE_NAMES.API_GATEWAY,
      env: config.isProduction ? 'production' : (config.isDevelopment ? 'development' : 'test'),
      version: process.env.npm_package_version || '1.0.0'
    }
  };

  // For development, use pretty printing for better readability
  if (config.isDevelopment) {
    baseOptions.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'hostname,pid',
        messageFormat: '{service} - {msg}'
      }
    };
  }

  // For production, use JSON formatting for better structured logs
  if (config.isProduction) {
    baseOptions.formatters = {
      level: (label: string) => {
        return { level: label };
      },
      // Add timestamp in ISO format for better log aggregation
      bindings: (bindings) => {
        return {
          ...bindings,
          timestamp: new Date().toISOString()
        };
      }
    };
  }

  return pino(baseOptions);
}

/**
 * Creates a child logger with additional context
 * @param bindings - Object containing additional properties to include in log records
 * @returns Child logger instance with context
 */
export function createChildLogger(bindings: Record<string, unknown>): pino.Logger {
  return logger.child(bindings);
}

// Create the default logger instance
const logger = createLogger();

// Export the logger as the default export
export default logger;