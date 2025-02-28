import type { Config } from 'jest'; // jest ^29.6.2

/**
 * Creates the Jest configuration object
 * @returns The Jest configuration object
 */
const createJestConfig = (): Config => {
  return {
    // Use ts-jest preset for TypeScript support
    preset: 'ts-jest',
    
    // Use jsdom for browser-like environment
    testEnvironment: 'jsdom',
    
    // Setup files to run after Jest is initialized
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    
    // Configure TypeScript transformations
    transform: {
      '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
    },
    
    // Module name mappers for path aliases and static assets
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/src/$1',
      '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
    },
    
    // File extensions to consider
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    
    // Configure code coverage collection
    collectCoverageFrom: [
      'src/**/*.{js,jsx,ts,tsx}',
      '!src/**/*.d.ts',
      '!src/**/*.stories.{js,jsx,ts,tsx}',
      '!**/node_modules/**',
    ],
    
    // Enforce 80% code coverage requirement
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    
    // Patterns to ignore for testing
    testPathIgnorePatterns: [
      '/node_modules/',
      '/.next/',
      '/out/',
      '/cypress/',
    ],
    
    // Clear and reset mocks automatically
    clearMocks: true,
    resetMocks: true,
  };
};

// Export the configuration
export default createJestConfig();