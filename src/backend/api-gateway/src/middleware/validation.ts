/**
 * API Request Validation Middleware
 * 
 * A middleware for validating API requests against predefined schemas before processing.
 * This validation layer ensures data integrity, security, and format consistency 
 * across all API endpoints in the API Gateway.
 * 
 * Features:
 * - Schema validation using Zod
 * - Input sanitization to prevent injection attacks
 * - Consistent error responses for validation failures
 * - Detailed validation error logging
 * - Request tracing with unique IDs
 * 
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import { z } from 'zod'; // ^3.22.2
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

import logger from '../utils/logger';
import { ValidationError } from '../../../shared/src/utils/errors';
import { 
  validateSchema, 
  formatZodError, 
  sanitizeData,
  userSchemas,
  jobSchemas,
  paymentSchemas
} from '../../../shared/src/utils/validation';
import { HTTP_STATUS } from '../../../shared/src/constants';

/**
 * Enum-like type for validation targets in the request object
 */
export type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Mapping between endpoint patterns and their validation schemas
 */
export interface SchemaMap {
  /** URL pattern to match against the request path */
  pattern: RegExp;
  /** HTTP method(s) that this schema applies to */
  method: string | string[];
  /** Zod schema to validate against */
  schema: z.ZodSchema;
  /** Which part of the request to validate */
  target: ValidationTarget;
}

/**
 * Factory function that creates validation middleware for a specific Zod schema
 * 
 * @param schema - Zod schema to validate against
 * @param target - Request property to validate (body, query, params)
 * @returns Express middleware function that validates request data against the schema
 */
function validationMiddleware(schema: z.ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    // Generate request ID for tracing validation process
    const requestId = uuidv4();
    
    try {
      // Extract data from request based on target
      const data = req[target];
      
      // Skip validation if no data is present and the schema allows undefined
      if (data === undefined) {
        logger.debug({
          message: 'Skipping validation, no data present',
          path: req.path,
          method: req.method,
          target,
          requestId
        });
        next();
        return;
      }
      
      // Sanitize input data to prevent injection attacks
      const sanitizedData = sanitizeData(data);
      
      // Validate data against provided schema
      const result = validateSchema(sanitizedData, schema);
      
      if (!result.success) {
        // Format the validation errors into a user-friendly structure
        const formattedErrors = formatZodError(result.error!);
        
        // Create validation error with formatted details
        const validationError = new ValidationError('Validation failed', formattedErrors);
        
        // Log the validation error with detailed context
        logValidationError(validationError, req, requestId);
        
        // Pass error to Express error handler
        next(validationError);
        return;
      }
      
      // Replace request data with validated and sanitized data
      req[target] = result.data;
      
      // Log successful validation
      logger.debug({
        message: 'Request validation successful',
        path: req.path,
        method: req.method,
        target,
        requestId
      });
      
      // Proceed to next middleware/handler
      next();
    } catch (error) {
      // For unexpected errors, create a ValidationError
      const validationError = new ValidationError(
        'Unexpected validation error',
        { message: (error as Error).message }
      );
      
      // Log the error with context
      logValidationError(validationError, req, requestId);
      
      // Pass to error handler middleware
      next(validationError);
    }
  };
}

/**
 * Shorthand middleware for validating request body data
 * 
 * @param schema - Zod schema to validate against
 * @returns Express middleware function that validates request body
 */
export function validateRequestBody(schema: z.ZodSchema) {
  return validationMiddleware(schema, 'body');
}

/**
 * Shorthand middleware for validating request query parameters
 * 
 * @param schema - Zod schema to validate against
 * @returns Express middleware function that validates request query parameters
 */
export function validateRequestQuery(schema: z.ZodSchema) {
  return validationMiddleware(schema, 'query');
}

/**
 * Shorthand middleware for validating request URL parameters
 * 
 * @param schema - Zod schema to validate against
 * @returns Express middleware function that validates request URL parameters
 */
export function validateRequestParams(schema: z.ZodSchema) {
  return validationMiddleware(schema, 'params');
}

/**
 * Pre-defined schema maps for common API endpoints
 * This allows for quick schema lookups based on endpoint and method
 */
const schemaMapping: SchemaMap[] = [
  // User endpoints
  { 
    pattern: /^\/api\/v1\/users\/login$/i, 
    method: 'POST', 
    schema: userSchemas.loginSchema,
    target: 'body'
  },
  { 
    pattern: /^\/api\/v1\/users\/register$/i, 
    method: 'POST', 
    schema: userSchemas.registerSchema,
    target: 'body'
  },
  { 
    pattern: /^\/api\/v1\/users\/profile$/i, 
    method: 'PUT', 
    schema: userSchemas.updateProfileSchema,
    target: 'body'
  },
  { 
    pattern: /^\/api\/v1\/users\/password$/i, 
    method: 'PUT', 
    schema: userSchemas.changePasswordSchema,
    target: 'body'
  },
  { 
    pattern: /^\/api\/v1\/users\/[a-f0-9-]+$/i, 
    method: 'PUT', 
    schema: userSchemas.updateUserSchema,
    target: 'body'
  },
  
  // Job endpoints
  { 
    pattern: /^\/api\/v1\/jobs$/i, 
    method: 'POST', 
    schema: jobSchemas.createJobSchema,
    target: 'body'
  },
  { 
    pattern: /^\/api\/v1\/jobs\/[a-f0-9-]+$/i, 
    method: 'PUT', 
    schema: jobSchemas.updateJobSchema,
    target: 'body'
  },
  { 
    pattern: /^\/api\/v1\/jobs\/[a-f0-9-]+\/proposals$/i, 
    method: 'POST', 
    schema: jobSchemas.createProposalSchema,
    target: 'body'
  },
  { 
    pattern: /^\/api\/v1\/jobs$/i, 
    method: 'GET', 
    schema: jobSchemas.jobSearchParamsSchema,
    target: 'query'
  },
  
  // Payment endpoints
  { 
    pattern: /^\/api\/v1\/payments$/i, 
    method: 'POST', 
    schema: paymentSchemas.createPaymentSchema,
    target: 'body'
  },
  { 
    pattern: /^\/api\/v1\/contracts$/i, 
    method: 'POST', 
    schema: paymentSchemas.createContractSchema,
    target: 'body'
  },
  { 
    pattern: /^\/api\/v1\/milestones$/i, 
    method: 'POST', 
    schema: paymentSchemas.createMilestoneSchema,
    target: 'body'
  }
];

/**
 * Helper function to get the appropriate validation schema for a given endpoint
 * 
 * @param endpoint - API endpoint path
 * @param method - HTTP method (GET, POST, PUT, etc.)
 * @returns The schema for the endpoint or null if not found
 */
export function getSchemaByEndpoint(endpoint: string, method: string): z.ZodSchema | null {
  // Find a matching schema in the schema mapping
  const matchingSchema = schemaMapping.find(mapping => {
    // Check if the pattern matches the endpoint
    if (!mapping.pattern.test(endpoint)) {
      return false;
    }
    
    // Check if the method matches (can be a string or array of strings)
    if (typeof mapping.method === 'string') {
      return mapping.method.toUpperCase() === method.toUpperCase();
    } else {
      return mapping.method.some(m => m.toUpperCase() === method.toUpperCase());
    }
  });
  
  // Return the schema if found, otherwise null
  return matchingSchema ? matchingSchema.schema : null;
}

/**
 * Logs validation errors with detailed context
 * 
 * @param error - The validation error
 * @param req - Express request object
 * @param requestId - Unique ID for request tracing
 */
function logValidationError(error: Error, req: Request, requestId: string): void {
  // Extract validation error details
  const errorDetails = error instanceof ValidationError ? error.details : {};
  
  // Extract relevant request information
  const requestInfo = {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: (req as any).user?.id || 'unauthenticated',
  };
  
  // Log the validation error with context for debugging
  logger.error({
    message: 'Validation error',
    error: error.message,
    errorDetails,
    request: requestInfo,
    requestId
  });
}

// Default export
export default validationMiddleware;