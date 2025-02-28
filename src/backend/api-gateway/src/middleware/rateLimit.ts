/**
 * Rate Limiting Middleware
 * 
 * Implements configurable rate limiting for the API Gateway, protecting the platform
 * against abuse and ensuring fair resource allocation. Provides different rate limit
 * tiers based on user roles and endpoint categories.
 * 
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import rateLimit from 'express-rate-limit'; // ^6.7.0
import Redis from 'ioredis'; // ^5.3.2
import { RedisStore } from 'rate-limit-redis'; // ^3.0.0

import { rateLimit as rateLimitConfig, redis as redisConfig } from '../config';
import logger from '../utils/logger';
import { UserRole } from '../../../shared/src/types/user.types';
import { RateLimitError } from '../../../shared/src/utils/errors';
import { RATE_LIMITS, HTTP_STATUS } from '../../../shared/src/constants';

/**
 * Configuration options for creating a rate limiter
 */
interface RateLimiterOptions {
  /** Time window in milliseconds for the rate limit (default: 60000 ms = 1 minute) */
  windowMs: number;
  /** Maximum number of requests allowed within the window */
  max: number;
  /** Error message to send when rate limit is exceeded */
  message?: string;
  /** Whether to send standard rate limit headers (X-RateLimit-*) */
  standardHeaders?: boolean;
  /** Whether to send legacy rate limit headers (Retry-After, X-RateLimit-*) */
  legacyHeaders?: boolean;
  /** Function to determine whether to skip rate limiting for a request */
  skip?: (req: Request) => boolean;
}

/**
 * Collection of configured rate limiters for different API categories
 */
interface RateLimiters {
  /** Rate limiter for public API endpoints (100 req/min) */
  publicLimiter: (req: Request, res: Response, next: NextFunction) => void;
  /** Rate limiter for authenticated routes (1000 req/min) */
  authLimiter: (req: Request, res: Response, next: NextFunction) => void;
  /** Rate limiter for admin routes (5000 req/min) */
  adminLimiter: (req: Request, res: Response, next: NextFunction) => void;
  /** Rate limiter for webhook endpoints (10000 req/min) */
  webhookLimiter: (req: Request, res: Response, next: NextFunction) => void;
}

// Redis client for distributed rate limiting
let redisClient: Redis | null = null;

/**
 * Extracts a unique identifier for the client for rate limiting purposes
 * 
 * @param req - Express request object
 * @returns Unique identifier for the client (user ID or IP address)
 */
function getClientIdentifier(req: Request): string {
  // If user is authenticated, use user ID as identifier
  if (req.user && req.user.id) {
    return `user:${req.user.id}`;
  }
  
  // Otherwise, use IP address
  // Handle various ways the IP might be available (direct, proxied, etc.)
  const ip = req.ip || 
    (req.headers['x-forwarded-for'] as string || '').split(',')[0].trim() || 
    req.socket.remoteAddress || 
    'unknown';
    
  return `ip:${ip}`;
}

/**
 * Custom handler for when a rate limit is exceeded
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param options - Rate limiter options
 */
function handleRateLimitExceeded(req: Request, res: Response, options: any): void {
  const clientId = getClientIdentifier(req);
  const path = req.path || 'unknown';
  
  // Log rate limit violation
  logger.warn(`Rate limit exceeded for ${clientId} on ${path}`, {
    clientId,
    path,
    method: req.method,
    headers: req.headers,
    ip: req.ip
  });
  
  // Calculate retry-after time in seconds
  const retryAfter = Math.ceil(options.windowMs / 1000);
  
  // Create standardized error response
  const error = new RateLimitError(
    'Too many requests, please try again later.',
    retryAfter
  );
  
  // Set appropriate headers
  res.set('Retry-After', String(retryAfter));
  res.set('X-RateLimit-Limit', String(options.max));
  res.set('X-RateLimit-Remaining', '0');
  res.set('X-RateLimit-Reset', String(Math.ceil(Date.now() / 1000) + retryAfter));
  
  // Send error response
  res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
    status: 'error',
    code: error.code,
    message: error.message,
    retryAfter
  });
}

/**
 * Factory function that creates a rate limiter with specific configuration
 * 
 * @param options - Configuration options for the rate limiter
 * @returns Configured rate limiter middleware
 */
function createRateLimiter(options: Partial<RateLimiterOptions>) {
  // Default options
  const defaultOptions: RateLimiterOptions = {
    windowMs: 60 * 1000, // 1 minute by default
    max: 100, // 100 requests per minute by default
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => false
  };

  // Merge provided options with defaults
  const mergedOptions = { ...defaultOptions, ...options };

  // Initialize Redis client if not already done
  if (!redisClient) {
    redisClient = new Redis(redisConfig.url, redisConfig.options);
    
    // Handle Redis connection errors
    redisClient.on('error', (err) => {
      logger.error('Redis connection error in rate limiter', { error: err.message });
    });
  }

  // Create Redis store for distributed rate limiting
  const redisStore = new RedisStore({
    // @ts-expect-error - The types between ioredis and rate-limit-redis might not align perfectly
    client: redisClient,
    prefix: 'rl:', // Prefix for rate limit keys in Redis
    sendCommand: (...args: unknown[]) => {
      // @ts-expect-error - We're handling the args dynamically
      return redisClient.call(...args);
    }
  });

  // Create and configure the rate limiter
  return rateLimit({
    windowMs: mergedOptions.windowMs,
    max: mergedOptions.max,
    message: mergedOptions.message,
    standardHeaders: mergedOptions.standardHeaders,
    legacyHeaders: mergedOptions.legacyHeaders,
    skip: mergedOptions.skip,
    store: redisStore,
    keyGenerator: getClientIdentifier,
    handler: handleRateLimitExceeded
  });
}

/**
 * Initializes and configures all rate limiters for the API Gateway
 * 
 * @returns Object containing configured rate limiter middleware instances
 */
function initializeRateLimiters(): RateLimiters {
  logger.info('Initializing rate limiters');

  // Public API rate limiter (100 req/min)
  const publicLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: RATE_LIMITS.PUBLIC_API.POINTS,
    message: 'Too many requests from this IP, please try again after a minute'
  });

  // Authenticated API rate limiter (1000 req/min)
  const authLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: RATE_LIMITS.USER_API.POINTS,
    message: 'Too many requests, please try again after a minute'
  });

  // Admin API rate limiter (5000 req/min)
  const adminLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: rateLimitConfig.admin.points, // 5000 as per specifications
    message: 'Too many admin API requests, please try again after a minute'
  });

  // Webhook API rate limiter (10000 req/min)
  const webhookLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: rateLimitConfig.webhook.points, // 10000 as per specifications
    message: 'Too many webhook requests, please try again after a minute',
    // Optional: Skip for trusted webhook sources
    skip: (req) => {
      // Check if request is from a trusted source or contains a valid webhook signature
      const trustedSources = ['127.0.0.1', 'webhook.trusted-source.com'];
      const source = req.ip || 
        (req.headers['x-forwarded-for'] as string || '').split(',')[0].trim();
      
      return trustedSources.includes(source || '');
    }
  });

  logger.info('Rate limiters initialized successfully');

  return {
    publicLimiter,
    authLimiter,
    adminLimiter,
    webhookLimiter
  };
}

// Initialize rate limiters
const { publicLimiter, authLimiter, adminLimiter, webhookLimiter } = initializeRateLimiters();

/**
 * Determines the appropriate rate limiter based on the user's role
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
function getRoleLimiter(req: Request, res: Response, next: NextFunction): void {
  // Extract user information from request if available
  const userRole = req.user?.role;
  const path = req.path;
  
  // Log rate limit check
  logger.info('Applying rate limit check', { 
    path, 
    method: req.method, 
    userRole: userRole || 'unauthenticated',
    clientId: getClientIdentifier(req)
  });
  
  // Check if this is a webhook endpoint
  if (path && path.startsWith('/api/v1/webhooks')) {
    return webhookLimiter(req, res, next);
  }
  
  // Determine and apply appropriate rate limiter based on user role
  if (userRole === UserRole.ADMIN) {
    return adminLimiter(req, res, next);
  } else if (userRole === UserRole.EMPLOYER || userRole === UserRole.FREELANCER) {
    return authLimiter(req, res, next);
  } else {
    return publicLimiter(req, res, next);
  }
}

// Ensure Redis client is cleaned up on process exit
process.on('exit', () => {
  if (redisClient) {
    redisClient.quit();
    redisClient = null;
  }
});

// Export rate limiting middleware and rate limiters
export {
  initializeRateLimiters,
  getRoleLimiter,
  publicLimiter,
  authLimiter,
  adminLimiter,
  webhookLimiter
};