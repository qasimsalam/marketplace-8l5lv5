/**
 * Payment Service Configuration
 * 
 * This module centralizes all configurable parameters for the Payment Service including
 * server settings, database connections, Stripe API integration, fee structures, and
 * escrow settings. It loads environment variables, validates them, and exports a typed
 * configuration object used throughout the payment service.
 * 
 * @version 1.0.0
 */

import * as dotenv from 'dotenv'; // v16.0.3
import * as path from 'path';
import * as z from 'zod'; // v3.22.2
import { FEES, ESCROW, SERVICE_NAMES } from '../../shared/src/constants';

// Define environment schema with Zod for validation
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Server configuration
  PORT: z.string().transform(val => parseInt(val, 10)).default('4003'),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  API_VERSION: z.string().default('v1'),
  
  // Database configuration
  DATABASE_URL: z.string(),
  DATABASE_POOL_MIN: z.string().transform(val => parseInt(val, 10)).default('2'),
  DATABASE_POOL_MAX: z.string().transform(val => parseInt(val, 10)).default('10'),
  DATABASE_TIMEOUT_MS: z.string().transform(val => parseInt(val, 10)).default('30000'),
  
  // Stripe configuration
  STRIPE_API_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),
  STRIPE_ACCOUNT_COUNTRY: z.string().default('US'),
  STRIPE_API_TIMEOUT_MS: z.string().transform(val => parseInt(val, 10)).default('30000'),
  
  // Payment configuration
  CURRENCY_CODE: z.string().default('USD'),
  
  // Rate limiting
  RATE_LIMIT_MAX: z.string().transform(val => parseInt(val, 10)).default('100'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(val => parseInt(val, 10)).default('60000'),
  
  // Security configuration
  API_SECRET_KEY: z.string(),
  JWT_SECRET: z.string(),
  ENCRYPT_SECRET_KEY: z.string()
});

/**
 * Loads environment variables from .env file based on current NODE_ENV
 */
function loadEnvConfig(): void {
  const environment = process.env.NODE_ENV || 'development';
  const envFilePath = path.resolve(process.cwd(), `.env.${environment}`);
  const defaultEnvFilePath = path.resolve(process.cwd(), '.env');
  
  // Load environment-specific .env file or fall back to default .env
  let result = dotenv.config({ path: envFilePath });
  
  if (result.error) {
    result = dotenv.config({ path: defaultEnvFilePath });
    
    if (!result.error) {
      console.info(`Loaded environment variables from ${defaultEnvFilePath}`);
    } else {
      console.warn(`Failed to load environment variables: ${result.error.message}`);
    }
  } else {
    console.info(`Loaded environment variables from ${envFilePath}`);
  }
}

/**
 * Validates environment variables against schema to ensure all required values exist with correct types
 * @param env Environment variables object
 * @returns Validated and typed configuration object
 */
function validateConfig(env: NodeJS.ProcessEnv) {
  try {
    // Parse and validate environment variables
    const validatedEnv = envSchema.parse(env);
    
    // Create and return the configuration object
    return {
      env: validatedEnv.NODE_ENV,
      isDevelopment: validatedEnv.NODE_ENV === 'development',
      isProduction: validatedEnv.NODE_ENV === 'production',
      isTest: validatedEnv.NODE_ENV === 'test',
      service: SERVICE_NAMES.PAYMENT_SERVICE,
      version: validatedEnv.API_VERSION,
      
      // Server settings
      port: validatedEnv.PORT,
      host: validatedEnv.HOST,
      logLevel: validatedEnv.LOG_LEVEL,
      
      // Database settings
      db: {
        url: validatedEnv.DATABASE_URL,
        pool: {
          min: validatedEnv.DATABASE_POOL_MIN,
          max: validatedEnv.DATABASE_POOL_MAX
        },
        timeout: validatedEnv.DATABASE_TIMEOUT_MS
      },
      
      // Stripe settings
      stripe: {
        apiKey: validatedEnv.STRIPE_API_KEY,
        webhookSecret: validatedEnv.STRIPE_WEBHOOK_SECRET,
        accountCountry: validatedEnv.STRIPE_ACCOUNT_COUNTRY,
        timeout: validatedEnv.STRIPE_API_TIMEOUT_MS
      },
      
      // Payment settings
      currency: {
        code: validatedEnv.CURRENCY_CODE
      },
      
      // Fee structure settings
      fees: {
        platformFeePercent: FEES.PLATFORM_FEE_PERCENT,
        processingFeePercent: FEES.PAYMENT_PROCESSING_FEE_PERCENT,
        processingFeeFlat: FEES.PAYMENT_PROCESSING_FEE_FLAT
      },
      
      // Escrow settings
      escrow: {
        defaultHoldPeriodDays: ESCROW.DEFAULT_HOLD_PERIOD_DAYS,
        disputeWindowDays: ESCROW.DISPUTE_WINDOW_DAYS,
        autoReleaseEnabled: ESCROW.AUTO_RELEASE_ENABLED
      },
      
      // Rate limiting
      rateLimit: {
        max: validatedEnv.RATE_LIMIT_MAX,
        windowMs: validatedEnv.RATE_LIMIT_WINDOW_MS
      },
      
      // Security settings
      security: {
        apiSecretKey: validatedEnv.API_SECRET_KEY,
        jwtSecret: validatedEnv.JWT_SECRET,
        encryptionKey: validatedEnv.ENCRYPT_SECRET_KEY
      }
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Environment validation failed:', JSON.stringify(error.format(), null, 2));
      throw new Error('Invalid configuration. Check server logs for details.');
    }
    throw error;
  }
}

// Load environment variables
loadEnvConfig();

// Validate and create configuration object
export const config = validateConfig(process.env);