import { defineConfig } from 'cypress'; // ^12.17.3

/**
 * Cypress configuration for AI Talent Marketplace
 * 
 * This configuration file sets up Cypress for end-to-end and component
 * testing of the AI Talent Marketplace web application.
 * 
 * It addresses requirements for:
 * - End-to-End Testing with a target of 100% pass rate
 * - Continuous Integration support for GitHub Actions
 * - Quality Assurance to support high user satisfaction targets (>4.5/5 rating)
 * - Accessibility testing for WCAG 2.1 Level AA compliance
 */
export default defineConfig({
  // End-to-end test configuration
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    // Timeouts to ensure tests don't fail on slower systems or networks
    defaultCommandTimeout: 10000, // 10 seconds
    requestTimeout: 15000, // 15 seconds
    responseTimeout: 15000, // 15 seconds
    pageLoadTimeout: 30000, // 30 seconds
    // Video recording for test review and debugging
    video: true,
    videoCompression: 15, // Lower value = higher quality
    screenshotOnRunFailure: true,
    trashAssetsBeforeRuns: true,
    // Retry failed tests to address flakiness
    retries: {
      runMode: 2, // Retry twice in CI
      openMode: 0, // No retries in dev mode
    },
    // Experimental features
    experimentalStudio: false,
    experimentalWebKitSupport: true, // Enable Safari testing
    chromeWebSecurity: false, // Allow cross-origin iframes for third-party integrations

    /**
     * Set up Node-based events for Cypress
     * Used for custom tasks, CI integration, and environment setup
     */
    setupNodeEvents(on, config) {
      // Configure plugin events and custom tasks for file operations
      on('task', {
        // Custom file operations for test data and artifacts
        readFileMaybe({ filename, defaultValue }) {
          try {
            return { contents: require('fs').readFileSync(filename, 'utf8') };
          } catch (error) {
            return { contents: defaultValue };
          }
        },
        writeFile({ filename, contents }) {
          require('fs').writeFileSync(filename, contents);
          return true;
        },
        // For logging within tests
        log(message) {
          console.log(message);
          return null;
        },
      });

      // Configure environment variables via dotenv for test-specific settings
      try {
        const dotenvPlugin = require('cypress-dotenv');
        config = dotenvPlugin(config, { path: '.env.test' }, true);
      } catch (error) {
        console.warn('Error loading cypress-dotenv plugin:', error.message);
      }

      // Set up custom reporting options for CI environments
      if (process.env.CI) {
        // Enable code coverage reports to ensure adequate test coverage
        try {
          require('@cypress/code-coverage/task')(on, config);
        } catch (error) {
          console.warn('Code coverage plugin not loaded:', error.message);
        }
        
        // Add accessibility testing plugin
        try {
          // Configure axe for accessibility testing (WCAG 2.1 AA compliance)
          require('cypress-axe')(on, config);
        } catch (error) {
          console.warn('Accessibility testing plugin not loaded:', error.message);
        }
        
        // Add reporters for CI integration
        on('after:run', (results) => {
          if (results) {
            // Configure JUnit reporter for GitHub Actions integration
            try {
              const reporterOptions = {
                mochaFile: 'cypress/reports/junit/test-results.[hash].xml',
                toConsole: false,
              };
              // Implementation would be completed here in the actual setup
            } catch (error) {
              console.warn('Error setting up JUnit reporter:', error.message);
            }
            
            // For tracking test stability metrics for quality assurance
            if (process.env.RECORD_TEST_METRICS) {
              // Logic to record test stability metrics
              // This would help track progress toward 100% pass rate goal
            }
          }
        });
      }

      // Configure test isolation and parallelization for CI
      on('before:browser:launch', (browser, launchOptions) => {
        // Optimize Chrome for CI environments
        if (browser.family === 'chromium' && browser.name !== 'electron') {
          // Prevent memory issues in CI containers
          launchOptions.args.push('--disable-dev-shm-usage');
          
          // Optimize for headless environments
          if (browser.isHeadless) {
            launchOptions.args.push('--disable-gpu');
            launchOptions.args.push('--no-sandbox');
          }
        }
        
        return launchOptions;
      });

      return config;
    },
  },

  // Component test configuration for React components
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
  },

  // Environment variables for tests
  env: {
    apiUrl: 'http://localhost:3000/api',
    authEnv: 'testing',
    mockResponses: true,
    testUser: {
      email: 'test@example.com',
      password: 'TestPassword123!',
    },
  },
});