/**
 * Main entry point for exporting shared TypeScript type definitions
 * used across the AI Talent Marketplace backend services.
 * 
 * This file re-exports all types from specialized type modules to provide
 * a single import point for consuming services, ensuring type consistency
 * across the microservices architecture.
 * 
 * @version 1.0.0
 */

// Re-export all user-related type definitions
export * from './user.types';

// Re-export all job-related type definitions
export * from './job.types';

// Re-export all payment-related type definitions
export * from './payment.types';