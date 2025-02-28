/**
 * User Service Entry Point
 * 
 * This is the main entry point for the User Service microservice in the AI Talent Marketplace platform.
 * It initializes database connections, Redis cache, and starts the Express server.
 * 
 * @version 1.0.0
 */

import http from 'http';
import pino from 'pino'; // v8.14.1
import { Pool } from 'pg'; // v8.10.0
import Redis from 'ioredis'; // v5.3.2

import app from './app';
import { config } from './config';

// Initialize logger
const logger = pino({ 
  level: config.logLevel, 
  name: config.serviceName 
});

/**
 * Initializes connection to PostgreSQL database
 * @returns Promise resolving to database connection pool
 */
async function initDatabaseConnection(): Promise<Pool> {
  logger.info('Initializing database connection...');
  
  const pool = new Pool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.username,
    password: config.db.password,
    database: config.db.database,
    max: config.db.poolSize
  });

  try {
    // Test connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    logger.info({
      host: config.db.host,
      port: config.db.port,
      database: config.db.database
    }, 'Database connection established successfully');
    
    return pool;
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to database');
    throw error;
  }
}

/**
 * Initializes connection to Redis for caching and session management
 * @returns Promise resolving to Redis client instance
 */
async function initRedisConnection(): Promise<Redis> {
  logger.info('Initializing Redis connection...');
  
  const redisClient = new Redis({
    host: config.redis?.host || 'localhost',
    port: config.redis?.port || 6379,
    password: config.redis?.password,
    db: config.redis?.db || 0,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  });

  // Set up event handlers
  redisClient.on('error', (err) => {
    logger.error({ err }, 'Redis client error');
  });

  redisClient.on('connect', () => {
    logger.info({ 
      host: config.redis?.host || 'localhost',
      port: config.redis?.port || 6379
    }, 'Redis connection established');
  });

  try {
    // Test connection
    await redisClient.ping();
    logger.info('Redis connection test successful');
    return redisClient;
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to Redis');
    throw error;
  }
}

/**
 * Starts the Express server and listens for incoming requests
 * @returns Promise resolving when server starts successfully
 */
async function startServer(): Promise<http.Server> {
  return new Promise<http.Server>((resolve, reject) => {
    try {
      const server = http.createServer(app);
      
      server.listen(config.port, config.host, () => {
        logger.info(`${config.serviceName} running at http://${config.host}:${config.port}`);
        resolve(server);
      });

      server.on('error', (error) => {
        logger.error({ err: error }, 'Server startup error');
        reject(error);
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to start server');
      reject(error);
    }
  });
}

/**
 * Sets up handlers for graceful service shutdown
 * @param dbPool - Database connection pool
 * @param redisClient - Redis client
 * @param server - HTTP server
 */
function setupGracefulShutdown(dbPool: Pool, redisClient: Redis, server: http.Server): void {
  const shutdown = async () => {
    logger.info('Starting graceful shutdown...');

    // Set a timeout to forcefully exit if graceful shutdown takes too long
    const forceExitTimeout = setTimeout(() => {
      logger.error('Forceful shutdown initiated after timeout');
      process.exit(1);
    }, 30000); // 30 seconds
    
    try {
      // 1. Stop accepting new requests
      logger.info('Closing HTTP server...');
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            logger.error({ err }, 'Error closing HTTP server');
            reject(err);
          } else {
            logger.info('HTTP server closed');
            resolve();
          }
        });
      });
      
      // 2. Close database connections
      logger.info('Closing database connections...');
      await dbPool.end();
      logger.info('Database connections closed');
      
      // 3. Close Redis connections
      logger.info('Closing Redis connection...');
      await redisClient.quit();
      logger.info('Redis connection closed');
      
      // Cancel force exit timeout
      clearTimeout(forceExitTimeout);
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'Error during graceful shutdown');
      
      // Cancel force exit timeout and exit immediately
      clearTimeout(forceExitTimeout);
      process.exit(1);
    }
  };

  // Handle SIGTERM signal
  process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received');
    shutdown();
  });

  // Handle SIGINT signal
  process.on('SIGINT', () => {
    logger.info('SIGINT signal received');
    shutdown();
  });
}

/**
 * Main function that orchestrates the service startup sequence
 */
async function main(): Promise<void> {
  logger.info({
    env: config.env,
    nodeEnv: process.env.NODE_ENV,
    serviceName: config.serviceName,
    isDevelopment: config.isDevelopment
  }, 'Starting User Service');

  try {
    // Initialize database connection
    const dbPool = await initDatabaseConnection();
    
    // Initialize Redis connection
    const redisClient = await initRedisConnection();
    
    // Start HTTP server
    const server = await startServer();
    
    // Set up graceful shutdown handlers
    setupGracefulShutdown(dbPool, redisClient, server);
    
    logger.info(`${config.serviceName} initialized successfully`);
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to initialize User Service');
    process.exit(1);
  }
}

// Start the service
main().catch((error) => {
  logger.fatal({ err: error }, 'Unhandled error in main function');
  process.exit(1);
});