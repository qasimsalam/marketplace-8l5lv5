import type { Config } from 'jest'; // jest v29.6.2

/**
 * Root Jest configuration file for the AI Talent Marketplace backend.
 * Configures Jest for testing all microservices including API Gateway, User Service, 
 * Payment Service, Job Service, Collaboration Service, and AI Service.
 * 
 * This file provides default settings for test environment, coverage reporting, 
 * and TypeScript integration.
 */
const config: Config = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',
  
  // Set Node.js as the test environment
  testEnvironment: 'node',
  
  // File extensions to consider for tests
  moduleFileExtensions: ['js', 'json', 'ts'],
  
  // Transform TypeScript files using ts-jest
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  
  // Patterns to collect coverage from
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/*.config.ts',
    '!**/coverage/**',
    '!**/test/**',
  ],
  
  // Directory to output coverage reports
  coverageDirectory: './coverage',
  
  // Patterns to identify test files
  testMatch: ['**/*.test.ts'],
  
  // Configure projects for microservices
  projects: [
    {
      displayName: 'shared',
      testMatch: ['<rootDir>/shared/**/*.test.ts'],
      moduleNameMapper: {
        '@shared/(.*)': '<rootDir>/shared/src/$1',
      },
    },
    {
      displayName: 'api-gateway',
      testMatch: ['<rootDir>/api-gateway/test/**/*.test.ts'],
      moduleNameMapper: {
        '@shared/(.*)': '<rootDir>/shared/src/$1',
      },
    },
    {
      displayName: 'user-service',
      testMatch: ['<rootDir>/user-service/test/**/*.test.ts'],
      moduleNameMapper: {
        '@shared/(.*)': '<rootDir>/shared/src/$1',
      },
    },
    {
      displayName: 'payment-service',
      testMatch: ['<rootDir>/payment-service/test/**/*.test.ts'],
      moduleNameMapper: {
        '@shared/(.*)': '<rootDir>/shared/src/$1',
      },
    },
  ],
  
  // Module name mapping for imports
  moduleNameMapper: {
    '@shared/(.*)': '<rootDir>/shared/src/$1',
  },
  
  // Setup files to run after Jest is initialized
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  
  // Verbose output for detailed test results
  verbose: true,
  
  // Detect any open handles after tests complete
  detectOpenHandles: true,
  
  // Force exit after all tests complete
  forceExit: true,
  
  // Coverage reporters configuration
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  
  // Coverage thresholds to enforce code quality
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Root directory for resolving paths
  rootDir: '.',
  
  // Paths to ignore when looking for tests
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  
  // Global configuration for ts-jest
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
};

export default config;