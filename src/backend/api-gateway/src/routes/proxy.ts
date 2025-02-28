/**
 * Proxy Routing Module
 * 
 * This module handles routing client requests to appropriate microservices in the
 * AI Talent Marketplace platform. It provides service discovery, request proxying,
 * authentication integration, and error handling for service communication.
 * 
 * @version 1.0.0
 */

import { Router, Request, Response, NextFunction, RequestHandler } from 'express'; // ^4.18.2
import { createProxyMiddleware, Options as ProxyOptions } from 'http-proxy-middleware'; // ^2.0.6
import axios from 'axios'; // ^1.3.4
import cors from 'cors'; // ^2.8.5

import { services, isDevelopment } from '../config';
import logger from '../utils/logger';
import { authenticate } from '../middleware/auth';
import { ServiceUnavailableError } from '../../../shared/src/utils/errors';
import { SERVICE_NAMES } from '../../../shared/src/constants';

// Constants for health check configuration
const HEALTH_CHECK_TIMEOUT = 3000; // 3 seconds
const HEALTH_CHECK_CACHE_TTL = 10000; // 10 seconds
const HEALTH_CHECK_PATH = '/health';
const MAX_FAILURE_COUNT = 3;

/**
 * Information about a microservice instance
 */
interface ServiceInfo {
  url: string;
  isHealthy: boolean;
  lastChecked: Date;
  failureCount: number;
}

/**
 * Configuration options for service proxies
 */
interface ProxyOptions {
  target: string;
  changeOrigin: boolean;
  pathRewrite?: object;
  logLevel?: string;
  timeout?: number;
}

/**
 * Class that manages service discovery and availability
 */
export class ServiceRegistry {
  private services: Record<string, ServiceInfo> = {};
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  /**
   * Initializes the service registry
   * 
   * @param serviceUrls - Record of service names to URLs
   * @param healthCheckIntervalMs - Interval between health checks in milliseconds
   */
  constructor(serviceUrls: Record<string, string>, healthCheckIntervalMs: number = 30000) {
    // Initialize services map from provided URLs
    Object.entries(serviceUrls).forEach(([name, url]) => {
      this.services[name] = {
        url,
        isHealthy: true, // Assume healthy initially
        lastChecked: new Date(),
        failureCount: 0
      };
    });
    
    // Start periodic health checks if not in development mode
    if (!isDevelopment) {
      this.startHealthChecks(healthCheckIntervalMs);
    }
    
    logger.info(`ServiceRegistry initialized with ${Object.keys(this.services).length} services`);
  }
  
  /**
   * Gets the URL for a service, considering health status
   * 
   * @param serviceName - Name of the service to get URL for
   * @returns URL of the service or null if unavailable
   */
  getServiceUrl(serviceName: string): string | null {
    const service = this.services[serviceName];
    
    if (!service) {
      logger.warn(`Service "${serviceName}" not found in registry`);
      return null;
    }
    
    // If service is unhealthy, return null
    if (!service.isHealthy) {
      logger.debug(`Service "${serviceName}" is marked as unhealthy`);
      return null;
    }
    
    return service.url;
  }
  
  /**
   * Updates the health status of a service
   * 
   * @param serviceName - Name of the service to update
   * @param isHealthy - New health status
   */
  updateServiceHealth(serviceName: string, isHealthy: boolean): void {
    const service = this.services[serviceName];
    
    if (!service) {
      logger.warn(`Cannot update health for unknown service "${serviceName}"`);
      return;
    }
    
    // Track health status changes for logging
    const statusChanged = service.isHealthy !== isHealthy;
    
    // Update service health info
    service.isHealthy = isHealthy;
    service.lastChecked = new Date();
    
    // Track consecutive failures
    if (!isHealthy) {
      service.failureCount += 1;
      
      // If max failures exceeded, log a critical error
      if (service.failureCount >= MAX_FAILURE_COUNT) {
        logger.error(
          `Service "${serviceName}" has failed ${service.failureCount} consecutive health checks`
        );
      }
    } else {
      // Reset failure count when service becomes healthy
      service.failureCount = 0;
    }
    
    // Log health status changes
    if (statusChanged) {
      if (isHealthy) {
        logger.info(`Service "${serviceName}" is now healthy`);
      } else {
        logger.warn(`Service "${serviceName}" is now unhealthy`);
      }
    }
  }
  
  /**
   * Starts periodic health checks for all services
   * 
   * @param intervalMs - Interval between health checks in milliseconds
   */
  startHealthChecks(intervalMs: number = 30000): void {
    // Clear any existing interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    logger.info(`Starting health checks with ${intervalMs}ms interval`);
    
    // Set up interval for checking all services
    this.healthCheckInterval = setInterval(async () => {
      logger.debug('Running periodic health checks');
      
      // Check all services in parallel
      const checks = Object.entries(this.services).map(async ([name, service]) => {
        try {
          const isHealthy = await checkServiceHealth(service.url, name);
          this.updateServiceHealth(name, isHealthy);
        } catch (error) {
          logger.error(
            `Health check failed for service "${name}": ${(error as Error).message}`,
            { error }
          );
          this.updateServiceHealth(name, false);
        }
      });
      
      await Promise.all(checks);
    }, intervalMs);
  }
}

/**
 * Performs health check on a microservice before proxying requests
 * 
 * @param serviceUrl - Base URL of the service
 * @param serviceName - Name of the service for logging
 * @returns Promise resolving to true if service is healthy, false otherwise
 */
export async function checkServiceHealth(
  serviceUrl: string,
  serviceName: string
): Promise<boolean> {
  try {
    // Construct health check URL - append health path to service URL
    const healthUrl = `${serviceUrl}${HEALTH_CHECK_PATH}`;
    logger.debug(`Checking health of ${serviceName} at ${healthUrl}`);
    
    // Make request to health endpoint with timeout
    const response = await axios.get(healthUrl, { 
      timeout: HEALTH_CHECK_TIMEOUT,
      headers: {
        'Accept': 'application/json',
        'X-Health-Check': 'true'
      }
    });
    
    // Return true for 2xx status codes
    const isHealthy = response.status >= 200 && response.status < 300;
    
    if (isHealthy) {
      logger.debug(`Service ${serviceName} is healthy`);
    } else {
      logger.warn(`Service ${serviceName} health check returned status ${response.status}`);
    }
    
    return isHealthy;
  } catch (error) {
    // Log the error and return false for any failures
    if (axios.isAxiosError(error)) {
      const message = error.response 
        ? `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`
        : `${error.message}`;
      
      logger.warn(`Health check failed for service ${serviceName}: ${message}`);
    } else {
      logger.warn(
        `Health check failed for service ${serviceName}: ${(error as Error).message}`
      );
    }
    
    return false;
  }
}

// Cache for health check results to prevent excessive checks
const healthCheckCache: Record<string, { isHealthy: boolean; timestamp: number }> = {};

/**
 * Middleware that checks service health before proxying requests
 * 
 * @param serviceName - Name of the service for the health check
 * @param serviceUrl - URL of the service to check
 * @returns Express middleware that checks service health
 */
export function serviceHealthMiddleware(
  serviceName: string,
  serviceUrl: string
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip health check in development for faster local development
    if (isDevelopment) {
      return next();
    }
    
    try {
      // Check cache first to avoid excessive health checks
      const cacheKey = `${serviceName}:${serviceUrl}`;
      const cachedResult = healthCheckCache[cacheKey];
      const now = Date.now();
      
      // Use cached result if available and not expired
      if (cachedResult && (now - cachedResult.timestamp) < HEALTH_CHECK_CACHE_TTL) {
        if (cachedResult.isHealthy) {
          return next();
        } else {
          throw new ServiceUnavailableError(
            `Service ${serviceName} is currently unavailable`, 
            serviceName
          );
        }
      }
      
      // Perform health check
      const isHealthy = await checkServiceHealth(serviceUrl, serviceName);
      
      // Cache result
      healthCheckCache[cacheKey] = {
        isHealthy,
        timestamp: now
      };
      
      if (isHealthy) {
        next();
      } else {
        throw new ServiceUnavailableError(
          `Service ${serviceName} is currently unavailable`,
          serviceName
        );
      }
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Utility function to rewrite request paths for the proxy
 * 
 * @param path - Original request path
 * @param servicePrefix - Service prefix to remove (e.g., '/users')
 * @returns Rewritten path for the target service
 */
export function rewritePath(path: string, servicePrefix: string): string {
  // Handle root path
  if (path === servicePrefix || path === `${servicePrefix}/`) {
    return '/';
  }
  
  // Remove service prefix and ensure path starts with /
  return path.startsWith(servicePrefix) 
    ? path.substring(servicePrefix.length) || '/'
    : path;
}

/**
 * Handles errors that occur during proxy requests to microservices
 * 
 * @param error - The error that occurred
 * @param req - Express request object
 * @param res - Express response object
 * @param serviceName - Name of the service that had an error
 */
export function handleProxyError(
  error: Error, 
  req: Request, 
  res: Response, 
  serviceName: string
): void {
  // Log the error with request details
  logger.error(
    `Proxy error for ${serviceName}: ${error.message}`, 
    {
      error,
      url: req.originalUrl,
      method: req.method,
      serviceName
    }
  );
  
  // Determine if this is a connection-related error
  const isConnectionError = error.message.includes('ECONNREFUSED') || 
                           error.message.includes('ETIMEDOUT') ||
                           error.message.includes('ENOTFOUND');
  
  // Create appropriate error based on type
  let serviceError;
  if (isConnectionError) {
    serviceError = new ServiceUnavailableError(
      `Cannot connect to ${serviceName}. Service may be down or unreachable.`,
      serviceName
    );
  } else {
    serviceError = new ServiceUnavailableError(
      `Error communicating with ${serviceName}: ${error.message}`,
      serviceName
    );
  }
  
  // Set status code and send error response
  res.status(503).json({
    error: {
      code: serviceError.code,
      message: serviceError.message,
      service: serviceName
    }
  });
}

/**
 * Creates a proxy middleware for a specific microservice
 * 
 * @param serviceName - Name of the service for logging and error handling
 * @param serviceUrl - URL of the service to proxy requests to
 * @param requiresAuth - Whether routes to this service require authentication
 * @returns Array of middleware including optional authentication and proxy
 */
export function createServiceProxy(
  serviceName: string,
  serviceUrl: string,
  requiresAuth: boolean = true
): RequestHandler[] {
  // Create middleware array
  const middleware: RequestHandler[] = [];
  
  // Add CORS middleware
  middleware.push(cors({
    origin: true,
    credentials: true
  }));
  
  // Add health check middleware
  middleware.push(serviceHealthMiddleware(serviceName, serviceUrl));
  
  // Add authentication middleware if required
  if (requiresAuth) {
    middleware.push(authenticate);
  }
  
  // Construct path rewrite pattern based on service name
  const pathRewrite: Record<string, string> = {};
  const pathPattern = `^/${serviceName}`;
  pathRewrite[pathPattern] = '';
  
  // Create and configure proxy middleware
  const proxy = createProxyMiddleware({
    target: serviceUrl,
    changeOrigin: true,
    pathRewrite,
    logLevel: isDevelopment ? 'debug' : 'error',
    timeout: 30000, // 30 second timeout
    onError: (err, req, res) => handleProxyError(err, req, res, serviceName),
    onProxyReq: (proxyReq, req, res) => {
      // Log proxy request for debugging
      logger.debug(`Proxying ${req.method} ${req.originalUrl} to ${serviceName}`);
      
      // Add request ID header if present on request
      const requestId = (req as any).requestId;
      if (requestId) {
        proxyReq.setHeader('X-Request-Id', requestId);
      }
      
      // Add authenticated user ID if available
      const user = (req as any).user;
      if (user?.id) {
        proxyReq.setHeader('X-User-Id', user.id);
        proxyReq.setHeader('X-User-Role', user.role);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      // Log proxy response for debugging
      logger.debug(
        `Proxy response from ${serviceName}: ${proxyRes.statusCode} for ${req.method} ${req.originalUrl}`
      );
    }
  });
  
  // Add proxy middleware
  middleware.push(proxy as RequestHandler);
  
  return middleware;
}

/**
 * Creates Express router with proxy routes for all microservices
 * 
 * @returns Express router with configured proxy routes for each microservice
 */
export function createServiceRoutes(): Router {
  // Create a new Express router
  const router = Router();
  
  // Initialize service registry
  const serviceRegistry = new ServiceRegistry({
    [SERVICE_NAMES.USER_SERVICE]: services.userService,
    [SERVICE_NAMES.JOB_SERVICE]: services.jobService,
    [SERVICE_NAMES.PAYMENT_SERVICE]: services.paymentService,
    [SERVICE_NAMES.COLLABORATION_SERVICE]: services.collaborationService,
    [SERVICE_NAMES.AI_SERVICE]: services.aiService
  });
  
  logger.info('Creating proxy routes for microservices');
  
  // User service routes - some public routes (registration, login) don't require auth
  router.use(
    `/users/auth`,
    createServiceProxy(SERVICE_NAMES.USER_SERVICE, services.userService, false)
  );
  
  // Protected user service routes
  router.use(
    `/users`,
    createServiceProxy(SERVICE_NAMES.USER_SERVICE, services.userService, true)
  );
  
  // Job service routes - public job browsing doesn't require auth
  router.use(
    `/jobs/public`,
    createServiceProxy(SERVICE_NAMES.JOB_SERVICE, services.jobService, false)
  );
  
  // Protected job service routes
  router.use(
    `/jobs`,
    createServiceProxy(SERVICE_NAMES.JOB_SERVICE, services.jobService, true)
  );
  
  // Payment service routes - all require authentication
  router.use(
    `/payments`,
    createServiceProxy(SERVICE_NAMES.PAYMENT_SERVICE, services.paymentService, true)
  );
  
  // Collaboration service routes - all require authentication
  router.use(
    `/collaboration`,
    createServiceProxy(SERVICE_NAMES.COLLABORATION_SERVICE, services.collaborationService, true)
  );
  
  // AI service routes - may have public and protected routes
  router.use(
    `/ai/public`,
    createServiceProxy(SERVICE_NAMES.AI_SERVICE, services.aiService, false)
  );
  
  // Protected AI service routes
  router.use(
    `/ai`,
    createServiceProxy(SERVICE_NAMES.AI_SERVICE, services.aiService, true)
  );
  
  logger.info('Service proxy routes initialized');
  
  return router;
}

// Export the main function as default
export default createServiceRoutes;