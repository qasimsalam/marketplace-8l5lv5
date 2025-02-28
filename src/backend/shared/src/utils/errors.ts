/**
 * Error Utilities Module
 * 
 * This module provides standardized error classes and utilities for consistent
 * error handling across all backend services of the AI Talent Marketplace platform.
 * 
 * @version 1.0.0
 */

import { 
  ERROR_CODES, 
  HTTP_STATUS 
} from '../constants';

/**
 * Base error class that all custom API errors extend from
 */
export class BaseError extends Error {
  name: string;
  code: string;
  isOperational: boolean;
  details?: any;

  /**
   * Creates a new BaseError instance
   * 
   * @param message - Error message
   * @param code - Error code from ERROR_CODES
   * @param isOperational - Whether this is an operational error (true) or a programming error (false)
   * @param details - Additional details about the error
   */
  constructor(message: string, code: string, isOperational = true, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    
    // Capture stack trace, excluding the constructor call from the stack
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends BaseError {
  /**
   * Creates a new ValidationError
   * 
   * @param message - Error message
   * @param details - Validation error details, typically field-specific errors
   */
  constructor(message: string, details?: object) {
    super(message, ERROR_CODES.VALIDATION_ERROR, true, details);
  }
}

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends BaseError {
  /**
   * Creates a new AuthenticationError
   * 
   * @param message - Error message
   */
  constructor(message: string) {
    super(message, ERROR_CODES.AUTHENTICATION_ERROR, true);
  }
}

/**
 * Error thrown when a user lacks permission for an action
 */
export class AuthorizationError extends BaseError {
  /**
   * Creates a new AuthorizationError
   * 
   * @param message - Error message
   */
  constructor(message: string) {
    super(message, ERROR_CODES.AUTHORIZATION_ERROR, true);
  }
}

/**
 * Error thrown when a requested resource is not found
 */
export class ResourceNotFoundError extends BaseError {
  /**
   * Creates a new ResourceNotFoundError
   * 
   * @param message - Error message
   * @param resourceType - Type of resource that wasn't found (e.g., 'user', 'job')
   * @param resourceId - ID of the resource that wasn't found
   */
  constructor(message?: string, resourceType?: string, resourceId?: string) {
    const defaultMessage = resourceType && resourceId 
      ? `${resourceType} with ID ${resourceId} not found`
      : message || 'Resource not found';
    
    super(
      defaultMessage,
      ERROR_CODES.RESOURCE_NOT_FOUND,
      true,
      { resourceType, resourceId }
    );
  }
}

/**
 * Error thrown when there's a conflict with the current state of a resource
 */
export class ConflictError extends BaseError {
  /**
   * Creates a new ConflictError
   * 
   * @param message - Error message
   * @param resourceType - Type of resource with conflict
   * @param details - Additional conflict details
   */
  constructor(message: string, resourceType?: string, details?: any) {
    super(
      message,
      ERROR_CODES.CONFLICT_ERROR,
      true,
      { resourceType, ...details }
    );
  }
}

/**
 * Error thrown when a payment operation fails
 */
export class PaymentError extends BaseError {
  /**
   * Creates a new PaymentError
   * 
   * @param message - Error message
   * @param paymentId - ID of the payment that failed
   * @param details - Additional payment error details
   */
  constructor(message: string, paymentId?: string, details?: any) {
    super(
      message,
      ERROR_CODES.PAYMENT_ERROR,
      true,
      { paymentId, ...details }
    );
  }
}

/**
 * Error thrown when a rate limit is exceeded
 */
export class RateLimitError extends BaseError {
  /**
   * Creates a new RateLimitError
   * 
   * @param message - Error message
   * @param retryAfter - Seconds until the client can retry
   */
  constructor(message: string, retryAfter?: number) {
    super(
      message,
      // Using type assertion since RATE_LIMIT_ERROR exists in constants but isn't explicitly imported
      (ERROR_CODES as any).RATE_LIMIT_ERROR,
      true,
      { retryAfter }
    );
  }
}

/**
 * Error thrown when a service is temporarily unavailable
 */
export class ServiceUnavailableError extends BaseError {
  /**
   * Creates a new ServiceUnavailableError
   * 
   * @param message - Error message
   * @param serviceName - Name of the unavailable service
   */
  constructor(message: string, serviceName?: string) {
    super(
      message,
      ERROR_CODES.SERVICE_UNAVAILABLE,
      false,
      { serviceName }
    );
  }
}

/**
 * Error thrown for unexpected internal server errors
 */
export class InternalServerError extends BaseError {
  /**
   * Creates a new InternalServerError
   * 
   * @param message - Error message
   * @param details - Additional error details
   */
  constructor(message: string, details?: any) {
    super(message, ERROR_CODES.INTERNAL_ERROR, false, details);
  }
}

/**
 * Type guard to check if an error is a custom API error
 * 
 * @param error - The error to check
 * @returns Whether the error is a custom API error
 */
export function isCustomError(error: Error): error is BaseError {
  return error instanceof BaseError;
}

/**
 * Formats an error into a standardized error response object
 * suitable for API responses
 * 
 * @param error - The error to format
 * @param includeStack - Whether to include the stack trace in the response (defaults to false)
 * @returns Standardized error response object
 */
export function formatErrorResponse(error: Error, includeStack = false): object {
  const isDev = process.env.NODE_ENV === 'development';
  
  const response: {
    code: string;
    message: string;
    stack?: string;
    details?: any;
  } = {
    code: isCustomError(error) 
      ? error.code 
      : ERROR_CODES.INTERNAL_ERROR,
    message: error.message || 'An unexpected error occurred'
  };
  
  // Include the stack trace in development mode or if explicitly requested
  if ((isDev || includeStack) && error.stack) {
    response.stack = error.stack;
  }
  
  // Include additional details for custom errors
  if (isCustomError(error) && error.details) {
    response.details = error.details;
  }
  
  return response;
}

/**
 * Maps an error to an appropriate HTTP status code
 * 
 * @param error - The error to map
 * @returns HTTP status code
 */
export function mapErrorToStatusCode(error: Error): number {
  if (error instanceof ValidationError) {
    return HTTP_STATUS.BAD_REQUEST;
  }
  
  if (error instanceof AuthenticationError) {
    return HTTP_STATUS.UNAUTHORIZED;
  }
  
  if (error instanceof AuthorizationError) {
    return HTTP_STATUS.FORBIDDEN;
  }
  
  if (error instanceof ResourceNotFoundError) {
    return HTTP_STATUS.NOT_FOUND;
  }
  
  if (error instanceof ConflictError) {
    return HTTP_STATUS.CONFLICT;
  }
  
  if (error instanceof RateLimitError) {
    return HTTP_STATUS.TOO_MANY_REQUESTS;
  }
  
  if (error instanceof ServiceUnavailableError) {
    return HTTP_STATUS.SERVICE_UNAVAILABLE;
  }
  
  // Default for InternalServerError and any unhandled errors
  return HTTP_STATUS.INTERNAL_SERVER_ERROR;
}