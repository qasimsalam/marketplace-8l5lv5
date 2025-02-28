/**
 * API Gateway Configuration
 * 
 * Central configuration module for the API Gateway service that loads, validates, 
 * and exports configuration settings from environment variables. This file provides 
 * a single source of truth for all configurable parameters in the API Gateway,
 * including server settings, security options, logging, rate limiting, and service connections.
 * 
 * @version 1.0.0
 */

import * as dotenv from 'dotenv'; // v16.0.3
import * as path from 'path';
import { z } from 'zod'; // v3.22.2
import { RATE_LIMITS, SERVICE_NAMES } from '../../shared/src/constants';

/**
 * Interface representing all environment variables required by the API Gateway
 */
export interface EnvConfig {
  NODE_ENV: string;
  HOST: string;
  PORT: number;
  LOG_LEVEL: string;
  CORS_ORIGINS: string;
  JWT_SECRET: string;
  JWT_EXPIRY: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  REDIS_URL: string;
  RATE_LIMIT_WINDOW: string;
  RATE_LIMIT_MAX_REQUESTS: number;
}

/**
 * JWT authentication configuration
 */
export interface JwtConfig {
  secret: string;
  expiry: string;
  algorithm: string;
  issuer: string;
  audience: string;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  redis: {
    url: string;
  };
  public: {
    points: number;
    duration: number;
    blockDuration: number;
  };
  authenticated: {
    points: number;
    duration: number;
    blockDuration: number;
  };
  admin: {
    points: number;
    duration: number;
    blockDuration: number;
  };
  webhook: {
    points: number;
    duration: number;
    blockDuration: number;
  };
}

/**
 * URLs for backend microservices
 */
export interface ServiceUrls {
  userService: string;
  jobService: string;
  paymentService: string;
  collaborationService: string;
  aiService: string;
}

/**
 * Loads environment variables from .env file based on current NODE_ENV
 */
function loadEnvConfig(): void {
  const environment = process.env.NODE_ENV || 'development';
  const envPath = path.resolve(process.cwd(), `.env.${environment}`);
  const defaultEnvPath = path.resolve(process.cwd(), '.env');
  
  // Try to load environment-specific .env file, fall back to default .env
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    // If specific environment file not found, try the default .env file
    const defaultResult = dotenv.config({ path: defaultEnvPath });
    if (defaultResult.error) {
      console.warn(`Warning: No .env file found for environment ${environment}`);
    } else {
      console.log(`Loaded environment variables from default .env file`);
    }
  } else {
    console.log(`Loaded environment variables from .env.${environment}`);
  }
}

/**
 * Validates environment variables against schema to ensure all required values exist with correct types
 * @param env - The environment variables object (process.env)
 * @returns Validated and typed configuration object
 * @throws Error if validation fails
 */
function validateConfig(env: NodeJS.ProcessEnv): EnvConfig {
  // Define schema for environment variables using Zod
  const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    HOST: z.string().default('localhost'),
    PORT: z.string().transform(val => parseInt(val, 10)).default('3000'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:8080'),
    JWT_SECRET: z.string().min(32).default('this_is_not_secure_change_in_production_environment'),
    JWT_EXPIRY: z.string().default('15m'),
    JWT_ISSUER: z.string().default('ai-talent-marketplace'),
    JWT_AUDIENCE: z.string().default('ai-talent-marketplace-api'),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    RATE_LIMIT_WINDOW: z.string().default('60s'),
    RATE_LIMIT_MAX_REQUESTS: z.string().transform(val => parseInt(val, 10)).default('100')
  });

  try {
    // Parse and validate the environment variables
    return envSchema.parse(env);
  } catch (error) {
    console.error('Configuration validation failed:', error);
    throw new Error('Invalid configuration. Check environment variables.');
  }
}

/**
 * Constructs service URLs for microservices based on environment variables
 * @returns Object containing service URLs
 */
function getServiceUrls(): Record<string, string> {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const serviceUrls: Record<string, string> = {};
  
  // Extract service host and port from environment variables or use defaults
  Object.values(SERVICE_NAMES).forEach((service) => {
    if (service === SERVICE_NAMES.API_GATEWAY) return; // Skip API Gateway itself
    
    const hostKey = `${service.toUpperCase().replace(/-/g, '_')}_HOST`;
    const portKey = `${service.toUpperCase().replace(/-/g, '_')}_PORT`;
    
    const host = process.env[hostKey] || 'localhost';
    const port = process.env[portKey] || getDefaultPortForService(service);
    
    serviceUrls[service] = `${protocol}://${host}:${port}`;
  });
  
  return {
    userService: serviceUrls[SERVICE_NAMES.USER_SERVICE],
    jobService: serviceUrls[SERVICE_NAMES.JOB_SERVICE],
    paymentService: serviceUrls[SERVICE_NAMES.PAYMENT_SERVICE],
    collaborationService: serviceUrls[SERVICE_NAMES.COLLABORATION_SERVICE],
    aiService: serviceUrls[SERVICE_NAMES.AI_SERVICE]
  };
}

/**
 * Get the default port for a service if not defined in environment variables
 * @param service - The service name
 * @returns The default port number as a string
 */
function getDefaultPortForService(service: string): string {
  const servicePorts: Record<string, string> = {
    [SERVICE_NAMES.USER_SERVICE]: '3001',
    [SERVICE_NAMES.JOB_SERVICE]: '3002',
    [SERVICE_NAMES.PAYMENT_SERVICE]: '3003',
    [SERVICE_NAMES.COLLABORATION_SERVICE]: '3004',
    [SERVICE_NAMES.AI_SERVICE]: '3005'
  };
  
  return servicePorts[service] || '3000';
}

// Load environment variables
loadEnvConfig();

// Validate configuration
const validatedConfig = validateConfig(process.env);

// Build and export configuration object
export const config = {
  // Environment
  env: validatedConfig.NODE_ENV,
  isDevelopment: validatedConfig.NODE_ENV === 'development',
  isProduction: validatedConfig.NODE_ENV === 'production',
  isTest: validatedConfig.NODE_ENV === 'test',
  
  // Server configuration
  port: validatedConfig.PORT,
  host: validatedConfig.HOST,
  
  // Logging
  logLevel: validatedConfig.LOG_LEVEL,
  
  // CORS configuration
  cors: {
    origins: validatedConfig.CORS_ORIGINS.split(',').map(origin => origin.trim()),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  },
  
  // JWT configuration - Using RS256 algorithm for high security
  jwt: {
    secret: validatedConfig.JWT_SECRET,
    expiry: validatedConfig.JWT_EXPIRY,
    algorithm: 'RS256', // As specified in the security requirements
    issuer: validatedConfig.JWT_ISSUER,
    audience: validatedConfig.JWT_AUDIENCE
  } as JwtConfig,
  
  // Rate limiting configuration - Using values from shared constants
  rateLimit: {
    redis: {
      url: validatedConfig.REDIS_URL
    },
    // Public API rate limits (unauthenticated requests)
    public: {
      points: RATE_LIMITS.PUBLIC_API.POINTS,
      duration: RATE_LIMITS.PUBLIC_API.DURATION,
      blockDuration: RATE_LIMITS.PUBLIC_API.BLOCK_DURATION
    },
    // Authenticated user API rate limits
    authenticated: {
      points: RATE_LIMITS.USER_API.POINTS,
      duration: RATE_LIMITS.USER_API.DURATION,
      blockDuration: RATE_LIMITS.USER_API.BLOCK_DURATION
    },
    // Admin API rate limits (higher thresholds)
    admin: {
      points: 5000, // As per specification
      duration: 60,
      blockDuration: 300
    },
    // Webhook rate limits (highest thresholds)
    webhook: {
      points: 10000, // As per specification
      duration: 60,
      blockDuration: 300
    }
  } as RateLimitConfig,
  
  // Service URLs for all microservices
  services: getServiceUrls(),
  
  // Redis configuration for caching and rate limiting
  redis: {
    url: validatedConfig.REDIS_URL,
    options: {
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
      connectTimeout: 10000,
      maxRetriesPerRequest: 5
    }
  }
};