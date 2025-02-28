/**
 * Configuration Module for User Service
 * 
 * This module loads environment variables, validates them, and exports a typed
 * configuration object for use throughout the User Service. It provides a single
 * source of truth for all configurable parameters.
 * 
 * @version 1.0.0
 */

import dotenv from 'dotenv'; // v16.0.3
import path from 'path';
import * as z from 'zod'; // v3.22.2

import { 
  SERVICE_NAMES,
  RATE_LIMITS,
  JWT_EXPIRY,
  ROLES,
  FILE_UPLOAD_LIMITS
} from '../../shared/src/constants';

// ==============================
// Interface Definitions
// ==============================

/**
 * Database configuration interface
 */
interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  poolSize: number;
}

/**
 * JWT configuration interface
 */
interface JwtConfig {
  secret: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  issuer: string;
  audience: string;
  algorithm: string;
}

/**
 * OAuth provider configuration interface
 */
interface OAuthConfig {
  github: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
  linkedin: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
  google: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
}

/**
 * Authentication configuration interface
 */
interface AuthConfig {
  jwt: JwtConfig;
  providers: OAuthConfig;
  passwordReset: {
    tokenExpiry: string;
    tokenLength: number;
  };
  twoFactor: {
    enabled: boolean;
    issuer: string;
  };
  rateLimits: {
    login: {
      maxAttempts: number;
      window: number;
      lockoutDuration: number;
    };
  };
}

/**
 * User management configuration interface
 */
interface UserConfig {
  roles: {
    default: string;
    allowedRoles: string[];
  };
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    saltRounds: number;
  };
  verificationPolicy: {
    requireEmailVerification: boolean;
    verificationTokenExpiry: string;
  };
  avatarSettings: {
    maxSize: number;
    allowedTypes: string[];
    defaultAvatar: string;
  };
}

// ==============================
// Schema Definition
// ==============================

/**
 * Zod schema for environment variable validation
 */
const envSchema = z.object({
  // Base configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(val => parseInt(val, 10)),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
  
  // Database configuration
  DB_HOST: z.string(),
  DB_PORT: z.string().transform(val => parseInt(val, 10)),
  DB_USERNAME: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  DB_POOL_SIZE: z.string().default('10').transform(val => parseInt(val, 10)),
  
  // CORS configuration
  CORS_ORIGIN: z.string().default('*'),
  CORS_METHODS: z.string().default('GET,HEAD,PUT,PATCH,POST,DELETE'),
  
  // JWT configuration
  JWT_SECRET: z.string(),
  JWT_ISSUER: z.string().default('ai-talent-marketplace'),
  JWT_AUDIENCE: z.string().default('ai-talent-marketplace-users'),
  JWT_ALGORITHM: z.string().default('HS256'),
  
  // OAuth providers
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_CALLBACK_URL: z.string().optional(),
  
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_CALLBACK_URL: z.string().optional(),
  
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),
  
  // Password and security settings
  PASSWORD_MIN_LENGTH: z.string().default('8').transform(val => parseInt(val, 10)),
  PASSWORD_REQUIRE_UPPERCASE: z.string().default('true').transform(val => val === 'true'),
  PASSWORD_REQUIRE_LOWERCASE: z.string().default('true').transform(val => val === 'true'),
  PASSWORD_REQUIRE_NUMBERS: z.string().default('true').transform(val => val === 'true'),
  PASSWORD_REQUIRE_SPECIAL_CHARS: z.string().default('true').transform(val => val === 'true'),
  PASSWORD_SALT_ROUNDS: z.string().default('10').transform(val => parseInt(val, 10)),
  
  // Email settings
  EMAIL_FROM: z.string(),
  EMAIL_REQUIRE_VERIFICATION: z.string().default('true').transform(val => val === 'true'),
  
  // Two-factor authentication
  ENABLE_2FA: z.string().default('false').transform(val => val === 'true'),
  TOTP_ISSUER: z.string().default('AI Talent Marketplace'),
  
  // Storage settings
  STORAGE_TYPE: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_PATH: z.string().default('./uploads'),
  STORAGE_S3_BUCKET: z.string().optional(),
  STORAGE_S3_REGION: z.string().optional(),
  STORAGE_S3_ACCESS_KEY: z.string().optional(),
  STORAGE_S3_SECRET_KEY: z.string().optional(),
  
  // Security headers
  SECURITY_ENABLE_HELMET: z.string().default('true').transform(val => val === 'true'),
  SECURITY_ENABLE_XSS_PROTECTION: z.string().default('true').transform(val => val === 'true'),
  SECURITY_ENABLE_CONTENT_SECURITY_POLICY: z.string().default('true').transform(val => val === 'true')
});

// ==============================
// Functions
// ==============================

/**
 * Loads environment variables from the appropriate .env file
 * based on the current NODE_ENV
 */
function loadEnvConfig(): void {
  // Default to development environment if not specified
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Determine the appropriate .env file to load
  const envFile = nodeEnv === 'test' 
    ? '.env.test'
    : nodeEnv === 'production'
      ? '.env.production'
      : '.env.development';
      
  // Resolve the path to the env file
  const envPath = path.resolve(process.cwd(), envFile);
  
  // Load environment variables from the env file
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    // If the specific env file isn't found, try to load the default .env file
    const defaultEnvPath = path.resolve(process.cwd(), '.env');
    dotenv.config({ path: defaultEnvPath });
    
    console.warn(`Warning: ${envFile} not found. Using default .env file or system environment variables.`);
  } else {
    console.info(`Environment variables loaded from ${envFile}`);
  }
}

/**
 * Validates environment variables against the schema
 * and returns a typed configuration object
 * 
 * @param env - Process environment variables
 * @returns Validated and typed configuration object
 */
function validateConfig(env: NodeJS.ProcessEnv) {
  try {
    // Parse and validate environment variables using the schema
    const validatedEnv = envSchema.parse(env);
    
    // Create the typed configuration object
    return {
      // Environment information
      env: validatedEnv.NODE_ENV,
      isDevelopment: validatedEnv.NODE_ENV === 'development',
      isProduction: validatedEnv.NODE_ENV === 'production',
      isTest: validatedEnv.NODE_ENV === 'test',
      
      // Server configuration
      port: validatedEnv.PORT,
      host: validatedEnv.HOST,
      logLevel: validatedEnv.LOG_LEVEL,
      serviceName: SERVICE_NAMES.USER_SERVICE,
      
      // Database configuration
      db: {
        host: validatedEnv.DB_HOST,
        port: validatedEnv.DB_PORT,
        username: validatedEnv.DB_USERNAME,
        password: validatedEnv.DB_PASSWORD,
        database: validatedEnv.DB_NAME,
        poolSize: validatedEnv.DB_POOL_SIZE
      } as DatabaseConfig,
      
      // CORS configuration
      cors: {
        origin: validatedEnv.CORS_ORIGIN,
        methods: validatedEnv.CORS_METHODS
      },
      
      // Authentication configuration
      auth: {
        jwt: {
          secret: validatedEnv.JWT_SECRET,
          accessTokenExpiry: JWT_EXPIRY.ACCESS_TOKEN,
          refreshTokenExpiry: JWT_EXPIRY.REFRESH_TOKEN,
          issuer: validatedEnv.JWT_ISSUER,
          audience: validatedEnv.JWT_AUDIENCE,
          algorithm: validatedEnv.JWT_ALGORITHM
        },
        providers: {
          github: {
            clientId: validatedEnv.GITHUB_CLIENT_ID || '',
            clientSecret: validatedEnv.GITHUB_CLIENT_SECRET || '',
            callbackUrl: validatedEnv.GITHUB_CALLBACK_URL || ''
          },
          linkedin: {
            clientId: validatedEnv.LINKEDIN_CLIENT_ID || '',
            clientSecret: validatedEnv.LINKEDIN_CLIENT_SECRET || '',
            callbackUrl: validatedEnv.LINKEDIN_CALLBACK_URL || ''
          },
          google: {
            clientId: validatedEnv.GOOGLE_CLIENT_ID || '',
            clientSecret: validatedEnv.GOOGLE_CLIENT_SECRET || '',
            callbackUrl: validatedEnv.GOOGLE_CALLBACK_URL || ''
          }
        },
        passwordReset: {
          tokenExpiry: JWT_EXPIRY.PASSWORD_RESET,
          tokenLength: 64
        },
        twoFactor: {
          enabled: validatedEnv.ENABLE_2FA,
          issuer: validatedEnv.TOTP_ISSUER
        },
        rateLimits: {
          login: {
            maxAttempts: RATE_LIMITS.LOGIN_ATTEMPTS.MAX_ATTEMPTS,
            window: RATE_LIMITS.LOGIN_ATTEMPTS.WINDOW,
            lockoutDuration: RATE_LIMITS.LOGIN_ATTEMPTS.LOCKOUT_DURATION
          }
        }
      } as AuthConfig,
      
      // Security configuration
      security: {
        helmet: validatedEnv.SECURITY_ENABLE_HELMET,
        xssProtection: validatedEnv.SECURITY_ENABLE_XSS_PROTECTION,
        contentSecurityPolicy: validatedEnv.SECURITY_ENABLE_CONTENT_SECURITY_POLICY,
        rateLimits: {
          auth: RATE_LIMITS.AUTH_API,
          user: RATE_LIMITS.USER_API
        }
      },
      
      // User management configuration
      user: {
        roles: {
          default: ROLES.FREELANCER,
          allowedRoles: [ROLES.ADMIN, ROLES.FREELANCER]
        },
        passwordPolicy: {
          minLength: validatedEnv.PASSWORD_MIN_LENGTH,
          requireUppercase: validatedEnv.PASSWORD_REQUIRE_UPPERCASE,
          requireLowercase: validatedEnv.PASSWORD_REQUIRE_LOWERCASE,
          requireNumbers: validatedEnv.PASSWORD_REQUIRE_NUMBERS,
          requireSpecialChars: validatedEnv.PASSWORD_REQUIRE_SPECIAL_CHARS,
          saltRounds: validatedEnv.PASSWORD_SALT_ROUNDS
        },
        verificationPolicy: {
          requireEmailVerification: validatedEnv.EMAIL_REQUIRE_VERIFICATION,
          verificationTokenExpiry: JWT_EXPIRY.EMAIL_VERIFICATION
        },
        avatarSettings: {
          maxSize: FILE_UPLOAD_LIMITS.MAX_FILE_SIZE,
          allowedTypes: FILE_UPLOAD_LIMITS.ALLOWED_FILE_TYPES.filter(type => 
            type.startsWith('image/')),
          defaultAvatar: '/assets/default-avatar.png'
        }
      } as UserConfig,
      
      // Email configuration
      email: {
        from: validatedEnv.EMAIL_FROM,
        templates: {
          welcomeEmail: 'welcome-email',
          passwordReset: 'password-reset',
          emailVerification: 'email-verification'
        }
      },
      
      // Storage configuration
      storage: {
        type: validatedEnv.STORAGE_TYPE,
        local: {
          path: validatedEnv.STORAGE_LOCAL_PATH
        },
        s3: {
          bucket: validatedEnv.STORAGE_S3_BUCKET || '',
          region: validatedEnv.STORAGE_S3_REGION || '',
          accessKey: validatedEnv.STORAGE_S3_ACCESS_KEY || '',
          secretKey: validatedEnv.STORAGE_S3_SECRET_KEY || ''
        }
      }
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formatError = error.format();
      const errorMessage = JSON.stringify(formatError, null, 2);
      throw new Error(`Configuration validation failed: ${errorMessage}`);
    }
    throw error;
  }
}

// ==============================
// Initialize Config
// ==============================

// Load environment variables
loadEnvConfig();

// Validate environment variables and create the configuration object
export const config = validateConfig(process.env);