/**
 * Authentication and Authorization Middleware
 * 
 * This module provides middleware functions for authentication and authorization in the API Gateway.
 * It verifies JWT tokens, implements role-based access control, and manages user authentication state.
 * 
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import jwt from 'jsonwebtoken'; // ^9.0.0
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

import { jwt as jwtConfig } from '../config';
import logger from '../utils/logger';
import { UserRole, User } from '../../../shared/src/types/user.types';
import { AuthenticationError, AuthorizationError } from '../../../shared/src/utils/errors';
import { ROLES, JWT_EXPIRY } from '../../../shared/src/constants';

/**
 * Extended Express Request interface that includes authenticated user data
 */
interface AuthenticatedRequest extends Request {
  user: User;
  requestId: string;
}

/**
 * Structure of the decoded JWT token payload
 */
interface TokenPayload {
  id: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/**
 * Middleware that authenticates requests by verifying the JWT token in the Authorization header.
 * Extracts user data from the token and adds it to the request object.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  // Generate request ID for tracing authentication flow
  const requestId = uuidv4();
  
  // Create child logger with request ID for context
  const authLogger = logger.child({ requestId, middleware: 'authenticate' });
  
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req);
    
    if (!token) {
      authLogger.debug('No authentication token provided');
      throw new AuthenticationError('Authentication required. Please provide a valid token.');
    }
    
    authLogger.debug('Verifying token');
    
    // Verify token using JWT.verify with jwt config settings
    const decoded = verifyToken(token);
    
    // Extract user data from decoded token
    const { id, email, role } = decoded;
    
    // Attach user data to request.user object
    (req as AuthenticatedRequest).user = {
      id,
      email,
      role: role as UserRole,
      // Other user properties will be undefined since we only get limited info from the token
    } as User;
    
    // Add request ID to request for tracing
    (req as AuthenticatedRequest).requestId = requestId;
    
    authLogger.info(`User ${id} with role ${role} authenticated successfully`);
    
    // Call next() to proceed to next middleware/handler
    next();
  } catch (error) {
    // Handle authentication errors with appropriate error types
    const authError = handleAuthErrors(error as Error, requestId);
    next(authError);
  }
};

/**
 * Factory function that creates middleware to verify if the authenticated user has one of the required roles.
 * Used for role-based access control to routes.
 * 
 * @param allowedRoles - Array of roles allowed to access the route
 * @returns Middleware function that checks if user role is in allowed roles list
 */
export const authorize = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const authReq = req as AuthenticatedRequest;
      
      // Check if request has user object (should be added by authenticate middleware)
      if (!authReq.user) {
        throw new AuthenticationError('User not authenticated. Ensure authentication middleware is used.');
      }
      
      // Extract user role from request.user object
      const { role } = authReq.user;
      
      // Check if user's role is included in allowedRoles array
      if (allowedRoles.includes(role)) {
        next();
      } else {
        const roleLogger = logger.child({ 
          requestId: authReq.requestId,
          userId: authReq.user.id,
          userRole: role,
          allowedRoles,
          middleware: 'authorize'
        });
        
        roleLogger.debug('Authorization failed: insufficient permissions');
        
        // If role not allowed, throw AuthorizationError with descriptive message
        throw new AuthorizationError(
          `Access denied. Required role: ${allowedRoles.join(' or ')}, User role: ${role}`
        );
      }
    } catch (error) {
      // Catch any errors and pass to Express error handler
      next(error);
    }
  };
};

/**
 * Helper function that extracts JWT token from the Authorization header
 * 
 * @param req - Express request object
 * @returns Extracted token or null if not present/valid format
 */
export const extractTokenFromHeader = (req: Request): string | null => {
  // Get Authorization header from request
  const authHeader = req.headers.authorization;
  
  // If no Authorization header, return null
  if (!authHeader) {
    return null;
  }
  
  // Check if header starts with 'Bearer '
  if (authHeader.startsWith('Bearer ')) {
    // If valid format, extract token part (after 'Bearer ')
    return authHeader.substring(7);
  }
  
  // If invalid format, return null
  return null;
};

/**
 * Verifies a JWT token and returns the decoded payload, handling different error cases
 * 
 * @param token - JWT token to verify
 * @returns Decoded token payload with user information
 * @throws AuthenticationError for invalid or expired tokens
 */
const verifyToken = (token: string): TokenPayload => {
  try {
    // Use jwt.verify with token and jwt.secret
    return jwt.verify(token, jwtConfig.secret, {
      algorithms: [jwtConfig.algorithm as jwt.Algorithm],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    }) as TokenPayload;
  } catch (error) {
    // Handle TokenExpiredError with specific error message
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError(`Token expired at ${new Date((error as jwt.TokenExpiredError).expiredAt).toISOString()}. Please re-authenticate.`);
    // Handle JsonWebTokenError with appropriate error message 
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError(`Invalid token: ${error.message}. Please provide a valid token.`);
    // Handle other errors as general authentication failures
    } else {
      throw new AuthenticationError(`Authentication failed: ${(error as Error).message}`);
    }
  }
};

/**
 * Centralized error handler for authentication and authorization errors
 * 
 * @param error - Error that occurred during authentication
 * @param requestId - Request ID for tracing
 * @returns Appropriate error object for the specific authentication error
 */
const handleAuthErrors = (error: Error, requestId: string): Error => {
  // Log error details with request ID for tracing
  logger.error({ 
    requestId, 
    error: error.message, 
    stack: error.stack,
    middleware: 'auth'
  }, 'Authentication error');
  
  // For token expiration errors, return AuthenticationError with expiry message
  if (error instanceof jwt.TokenExpiredError) {
    return new AuthenticationError(`Token expired at ${new Date((error as jwt.TokenExpiredError).expiredAt).toISOString()}. Token lifetime is ${JWT_EXPIRY.ACCESS_TOKEN}.`);
  }
  
  // For token validation errors, return AuthenticationError with invalid token message
  if (error instanceof jwt.JsonWebTokenError) {
    return new AuthenticationError(`Invalid token: ${error.message}`);
  }
  
  // For role permission errors, return AuthorizationError with permission message
  if (error instanceof AuthorizationError) {
    return error; // Already the right type
  }
  
  // For other auth errors, return the original AuthenticationError
  if (error instanceof AuthenticationError) {
    return error; // Already the right type
  }
  
  // For other errors, return generic AuthenticationError
  // Include request ID in error details for tracing
  const authError = new AuthenticationError(`Authentication failed: ${error.message}`);
  (authError as any).requestId = requestId;
  return authError;
};