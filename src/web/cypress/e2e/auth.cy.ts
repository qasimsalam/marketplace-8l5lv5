/**
 * Cypress end-to-end tests for authentication functionality
 * in the AI Talent Marketplace web application.
 * 
 * This test suite verifies login, registration, password management,
 * authentication state persistence, validation, and authorization features.
 * 
 * @packageDocumentation
 */

// Cypress - ^12.x.x
import 'cypress';

// Test user constants
const TEST_USER = { 
  email: 'test@example.com', 
  password: 'TestPassword123!', 
  firstName: 'Test', 
  lastName: 'User' 
};

const EMPLOYER_USER = { 
  email: 'employer@example.com', 
  password: 'EmployerTest123!', 
  firstName: 'Employer', 
  lastName: 'Test', 
  role: 'EMPLOYER' 
};

const FREELANCER_USER = { 
  email: 'freelancer@example.com', 
  password: 'FreelancerTest123!', 
  firstName: 'Freelancer', 
  lastName: 'Test', 
  role: 'FREELANCER' 
};

const INVALID_USER = { 
  email: 'invalid@example', 
  password: 'short', 
  firstName: '', 
  lastName: '' 
};

/**
 * Authentication test suite
 */
describe('Authentication', () => {
  
  /**
   * Setup function that runs before each test to prepare the environment
   */
  beforeEach(() => {
    // Intercept API calls to monitor auth-related requests
    cy.intercept('POST', '/api/v1/auth/login').as('loginRequest');
    cy.intercept('POST', '/api/v1/auth/register').as('registerRequest');
    cy.intercept('POST', '/api/v1/auth/forgot-password').as('forgotPasswordRequest');
    cy.intercept('POST', '/api/v1/auth/reset-password').as('resetPasswordRequest');
    cy.intercept('POST', '/api/v1/auth/logout').as('logoutRequest');
    cy.intercept('GET', '/api/v1/auth/me').as('meRequest');
    cy.intercept('POST', '/api/v1/auth/refresh-token').as('refreshTokenRequest');
    
    // Clear cookies and localStorage to ensure clean state for each test
    cy.clearCookies();
    cy.clearLocalStorage();
    
    // Preserve window to improve test performance
    Cypress.config('defaultCommandTimeout', 10000);
  });

  /**
   * Test suite for login functionality
   */
  describe('Login', () => {
    
    it('should navigate to the login page', () => {
      cy.visit('/login');
      cy.url().should('include', '/login');
      cy.title().should('contain', 'Login | AI Talent Marketplace');
    });

    it('should display all login UI elements', () => {
      cy.visit('/login');
      // Logo
      cy.get('[data-cy=logo]').should('be.visible');
      // Email field
      cy.get('[data-cy=email-input]').should('be.visible');
      // Password field
      cy.get('[data-cy=password-input]').should('be.visible');
      // Login button
      cy.get('[data-cy=login-button]').should('be.visible');
      // Forgot password link
      cy.get('[data-cy=forgot-password-link]').should('be.visible');
      // Register link
      cy.get('[data-cy=register-link]').should('be.visible');
      // Remember me checkbox
      cy.get('[data-cy=remember-me]').should('be.visible');
    });

    it('should successfully login with valid credentials', () => {
      cy.visit('/login');
      
      // Mock successful login response
      cy.intercept('POST', '/api/v1/auth/login', {
        statusCode: 200,
        body: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          user: {
            id: '1',
            email: TEST_USER.email,
            firstName: TEST_USER.firstName,
            lastName: TEST_USER.lastName,
            role: 'FREELANCER'
          }
        }
      }).as('loginRequest');
      
      // Fill form fields
      cy.get('[data-cy=email-input]').type(TEST_USER.email);
      cy.get('[data-cy=password-input]').type(TEST_USER.password);
      
      // Submit form
      cy.get('[data-cy=login-button]').click();
      
      // Wait for API call
      cy.wait('@loginRequest');
      
      // Check for redirect to dashboard
      cy.url().should('include', '/dashboard');
      
      // Verify that auth tokens were stored
      cy.window().then((window) => {
        expect(window.localStorage.getItem('accessToken')).to.exist;
      });
    });

    it('should show error message with invalid credentials', () => {
      cy.visit('/login');
      
      // Mock failed login response
      cy.intercept('POST', '/api/v1/auth/login', {
        statusCode: 401,
        body: {
          message: 'Invalid email or password'
        }
      }).as('loginRequest');
      
      // Fill form fields with invalid data
      cy.get('[data-cy=email-input]').type(INVALID_USER.email);
      cy.get('[data-cy=password-input]').type(INVALID_USER.password);
      
      // Submit form
      cy.get('[data-cy=login-button]').click();
      
      // Wait for API call
      cy.wait('@loginRequest');
      
      // Check for error message
      cy.get('[data-cy=form-error]').should('be.visible');
      cy.get('[data-cy=form-error]').should('contain', 'Invalid email or password');
      
      // URL should still be login (no redirect)
      cy.url().should('include', '/login');
    });

    it('should validate email format', () => {
      cy.visit('/login');
      
      // Type invalid email format
      cy.get('[data-cy=email-input]').type('invalid-email');
      cy.get('[data-cy=password-input]').type(TEST_USER.password);
      
      // Try to submit
      cy.get('[data-cy=login-button]').click();
      
      // Should show validation error
      cy.get('[data-cy=email-error]').should('be.visible');
      cy.get('[data-cy=email-error]').should('contain', 'valid email');
      
      // No API call should be made
      cy.get('@loginRequest.all').should('have.length', 0);
    });

    it('should validate required password', () => {
      cy.visit('/login');
      
      // Type email but no password
      cy.get('[data-cy=email-input]').type(TEST_USER.email);
      
      // Try to submit
      cy.get('[data-cy=login-button]').click();
      
      // Should show validation error
      cy.get('[data-cy=password-error]').should('be.visible');
      cy.get('[data-cy=password-error]').should('contain', 'Password is required');
      
      // No API call should be made
      cy.get('@loginRequest.all').should('have.length', 0);
    });

    it('should toggle password visibility', () => {
      cy.visit('/login');
      
      // Type password
      cy.get('[data-cy=password-input]').type(TEST_USER.password);
      
      // Password should be hidden by default
      cy.get('[data-cy=password-input]').should('have.attr', 'type', 'password');
      
      // Click visibility toggle
      cy.get('[data-cy=password-toggle]').click();
      
      // Password should now be visible
      cy.get('[data-cy=password-input]').should('have.attr', 'type', 'text');
      
      // Click again to hide
      cy.get('[data-cy=password-toggle]').click();
      
      // Password should be hidden again
      cy.get('[data-cy=password-input]').should('have.attr', 'type', 'password');
    });

    it('should display API errors', () => {
      cy.visit('/login');
      
      // Mock server error response
      cy.intercept('POST', '/api/v1/auth/login', {
        statusCode: 500,
        body: {
          message: 'Internal server error'
        }
      }).as('loginRequest');
      
      // Fill form fields
      cy.get('[data-cy=email-input]').type(TEST_USER.email);
      cy.get('[data-cy=password-input]').type(TEST_USER.password);
      
      // Submit form
      cy.get('[data-cy=login-button]').click();
      
      // Wait for API call
      cy.wait('@loginRequest');
      
      // Check for error message
      cy.get('[data-cy=form-error]').should('be.visible');
      cy.get('[data-cy=form-error]').should('contain', 'Internal server error');
    });

    it('should honor remember me setting', () => {
      cy.visit('/login');
      
      // Mock successful login response
      cy.intercept('POST', '/api/v1/auth/login', {
        statusCode: 200,
        body: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          user: {
            id: '1',
            email: TEST_USER.email,
            firstName: TEST_USER.firstName,
            lastName: TEST_USER.lastName
          }
        }
      }).as('loginRequest');
      
      // Fill form fields
      cy.get('[data-cy=email-input]').type(TEST_USER.email);
      cy.get('[data-cy=password-input]').type(TEST_USER.password);
      
      // Check remember me
      cy.get('[data-cy=remember-me]').check();
      
      // Submit form
      cy.get('[data-cy=login-button]').click();
      
      // Wait for API call
      cy.wait('@loginRequest');
      
      // Verify that long-lived token is stored
      cy.getCookie('refreshToken').should('exist');
      cy.getCookie('refreshToken').should('have.property', 'expiry');
    });

    it('should redirect to originally requested protected page after login', () => {
      // Try to visit a protected page
      cy.visit('/dashboard');
      
      // Should be redirected to login page
      cy.url().should('include', '/login');
      cy.url().should('include', 'redirect=/dashboard');
      
      // Mock successful login response
      cy.intercept('POST', '/api/v1/auth/login', {
        statusCode: 200,
        body: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          user: {
            id: '1',
            email: TEST_USER.email,
            firstName: TEST_USER.firstName,
            lastName: TEST_USER.lastName
          }
        }
      }).as('loginRequest');
      
      // Fill form fields
      cy.get('[data-cy=email-input]').type(TEST_USER.email);
      cy.get('[data-cy=password-input]').type(TEST_USER.password);
      
      // Submit form
      cy.get('[data-cy=login-button]').click();
      
      // Wait for API call
      cy.wait('@loginRequest');
      
      // Check for redirect to original protected page
      cy.url().should('include', '/dashboard');
    });
  });

  /**
   * Test suite for user registration functionality
   */
  describe('Registration', () => {
    it('should navigate to the registration page', () => {
      cy.visit('/register');
      cy.url().should('include', '/register');
      cy.title().should('contain', 'Register | AI Talent Marketplace');
    });

    it('should display all registration UI elements', () => {
      cy.visit('/register');
      
      // Logo
      cy.get('[data-cy=logo]').should('be.visible');
      // First name field
      cy.get('[data-cy=first-name-input]').should('be.visible');
      // Last name field
      cy.get('[data-cy=last-name-input]').should('be.visible');
      // Email field
      cy.get('[data-cy=email-input]').should('be.visible');
      // Password field
      cy.get('[data-cy=password-input]').should('be.visible');
      // Confirm password field
      cy.get('[data-cy=confirm-password-input]').should('be.visible');
      // Role selection
      cy.get('[data-cy=role-employer]').should('be.visible');
      cy.get('[data-cy=role-freelancer]').should('be.visible');
      // Terms checkbox
      cy.get('[data-cy=terms-checkbox]').should('be.visible');
      // Register button
      cy.get('[data-cy=register-button]').should('be.visible');
      // Login link
      cy.get('[data-cy=login-link]').should('be.visible');
    });

    it('should successfully register with valid information', () => {
      cy.visit('/register');
      
      // Create unique email to prevent duplicate registration issues
      const uniqueEmail = `test${Date.now()}@example.com`;
      
      // Mock successful registration response
      cy.intercept('POST', '/api/v1/auth/register', {
        statusCode: 201,
        body: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          user: {
            id: '1',
            email: uniqueEmail,
            firstName: TEST_USER.firstName,
            lastName: TEST_USER.lastName,
            role: 'FREELANCER'
          }
        }
      }).as('registerRequest');
      
      // Fill form fields
      cy.get('[data-cy=first-name-input]').type(TEST_USER.firstName);
      cy.get('[data-cy=last-name-input]').type(TEST_USER.lastName);
      cy.get('[data-cy=email-input]').type(uniqueEmail);
      cy.get('[data-cy=password-input]').type(TEST_USER.password);
      cy.get('[data-cy=confirm-password-input]').type(TEST_USER.password);
      cy.get('[data-cy=role-freelancer]').check();
      cy.get('[data-cy=terms-checkbox]').check();
      
      // Submit form
      cy.get('[data-cy=register-button]').click();
      
      // Wait for API call
      cy.wait('@registerRequest');
      
      // Check for redirect to onboarding or dashboard
      cy.url().should('include', '/onboarding');
      
      // Verify that auth tokens were stored
      cy.window().then((window) => {
        expect(window.localStorage.getItem('accessToken')).to.exist;
      });
    });

    it('should validate email format', () => {
      cy.visit('/register');
      
      // Fill form fields with invalid email
      cy.get('[data-cy=first-name-input]').type(TEST_USER.firstName);
      cy.get('[data-cy=last-name-input]').type(TEST_USER.lastName);
      cy.get('[data-cy=email-input]').type('invalid-email');
      cy.get('[data-cy=password-input]').type(TEST_USER.password);
      cy.get('[data-cy=confirm-password-input]').type(TEST_USER.password);
      cy.get('[data-cy=role-freelancer]').check();
      cy.get('[data-cy=terms-checkbox]').check();
      
      // Submit form
      cy.get('[data-cy=register-button]').click();
      
      // Should show validation error
      cy.get('[data-cy=email-error]').should('be.visible');
      cy.get('[data-cy=email-error]').should('contain', 'valid email');
      
      // No API call should be made
      cy.get('@registerRequest.all').should('have.length', 0);
    });

    it('should validate password requirements', () => {
      cy.visit('/register');
      
      // Fill form fields with weak password
      cy.get('[data-cy=first-name-input]').type(TEST_USER.firstName);
      cy.get('[data-cy=last-name-input]').type(TEST_USER.lastName);
      cy.get('[data-cy=email-input]').type(TEST_USER.email);
      cy.get('[data-cy=password-input]').type('weak');
      cy.get('[data-cy=confirm-password-input]').type('weak');
      cy.get('[data-cy=role-freelancer]').check();
      cy.get('[data-cy=terms-checkbox]').check();
      
      // Submit form
      cy.get('[data-cy=register-button]').click();
      
      // Should show validation error
      cy.get('[data-cy=password-error]').should('be.visible');
      cy.get('[data-cy=password-error]').should('contain', 'Password must');
      
      // No API call should be made
      cy.get('@registerRequest.all').should('have.length', 0);
    });

    it('should validate password confirmation match', () => {
      cy.visit('/register');
      
      // Fill form fields with mismatched passwords
      cy.get('[data-cy=first-name-input]').type(TEST_USER.firstName);
      cy.get('[data-cy=last-name-input]').type(TEST_USER.lastName);
      cy.get('[data-cy=email-input]').type(TEST_USER.email);
      cy.get('[data-cy=password-input]').type(TEST_USER.password);
      cy.get('[data-cy=confirm-password-input]').type(TEST_USER.password + '1');
      cy.get('[data-cy=role-freelancer]').check();
      cy.get('[data-cy=terms-checkbox]').check();
      
      // Submit form
      cy.get('[data-cy=register-button]').click();
      
      // Should show validation error
      cy.get('[data-cy=confirm-password-error]').should('be.visible');
      cy.get('[data-cy=confirm-password-error]').should('contain', 'Passwords must match');
      
      // No API call should be made
      cy.get('@registerRequest.all').should('have.length', 0);
    });

    it('should validate required fields', () => {
      cy.visit('/register');
      
      // Submit empty form
      cy.get('[data-cy=register-button]').click();
      
      // Should show validation errors for all required fields
      cy.get('[data-cy=first-name-error]').should('be.visible');
      cy.get('[data-cy=last-name-error]').should('be.visible');
      cy.get('[data-cy=email-error]').should('be.visible');
      cy.get('[data-cy=password-error]').should('be.visible');
      cy.get('[data-cy=role-error]').should('be.visible');
      cy.get('[data-cy=terms-error]').should('be.visible');
      
      // No API call should be made
      cy.get('@registerRequest.all').should('have.length', 0);
    });

    it('should allow role selection', () => {
      cy.visit('/register');
      
      // Check freelancer role
      cy.get('[data-cy=role-freelancer]').check();
      cy.get('[data-cy=role-freelancer]').should('be.checked');
      cy.get('[data-cy=role-employer]').should('not.be.checked');
      
      // Check employer role
      cy.get('[data-cy=role-employer]').check();
      cy.get('[data-cy=role-employer]').should('be.checked');
      cy.get('[data-cy=role-freelancer]').should('not.be.checked');
    });

    it('should require terms acceptance', () => {
      cy.visit('/register');
      
      // Fill form fields without checking terms
      cy.get('[data-cy=first-name-input]').type(TEST_USER.firstName);
      cy.get('[data-cy=last-name-input]').type(TEST_USER.lastName);
      cy.get('[data-cy=email-input]').type(TEST_USER.email);
      cy.get('[data-cy=password-input]').type(TEST_USER.password);
      cy.get('[data-cy=confirm-password-input]').type(TEST_USER.password);
      cy.get('[data-cy=role-freelancer]').check();
      
      // Submit form
      cy.get('[data-cy=register-button]').click();
      
      // Should show validation error for terms
      cy.get('[data-cy=terms-error]').should('be.visible');
      cy.get('[data-cy=terms-error]').should('contain', 'must accept terms');
      
      // No API call should be made
      cy.get('@registerRequest.all').should('have.length', 0);
    });

    it('should show error for duplicate email', () => {
      cy.visit('/register');
      
      // Mock duplicate email error response
      cy.intercept('POST', '/api/v1/auth/register', {
        statusCode: 409,
        body: {
          message: 'Email already in use'
        }
      }).as('registerRequest');
      
      // Fill form fields
      cy.get('[data-cy=first-name-input]').type(TEST_USER.firstName);
      cy.get('[data-cy=last-name-input]').type(TEST_USER.lastName);
      cy.get('[data-cy=email-input]').type(TEST_USER.email);
      cy.get('[data-cy=password-input]').type(TEST_USER.password);
      cy.get('[data-cy=confirm-password-input]').type(TEST_USER.password);
      cy.get('[data-cy=role-freelancer]').check();
      cy.get('[data-cy=terms-checkbox]').check();
      
      // Submit form
      cy.get('[data-cy=register-button]').click();
      
      // Wait for API call
      cy.wait('@registerRequest');
      
      // Check for error message
      cy.get('[data-cy=form-error]').should('be.visible');
      cy.get('[data-cy=form-error]').should('contain', 'Email already in use');
      
      // URL should still be register (no redirect)
      cy.url().should('include', '/register');
    });
  });

  /**
   * Test suite for password reset and recovery
   */
  describe('Password Management', () => {
    it('should navigate to forgot password page', () => {
      cy.visit('/login');
      cy.get('[data-cy=forgot-password-link]').click();
      cy.url().should('include', '/forgot-password');
      cy.title().should('contain', 'Forgot Password | AI Talent Marketplace');
    });

    it('should submit forgot password form with valid email', () => {
      cy.visit('/forgot-password');
      
      // Mock successful forgot password response
      cy.intercept('POST', '/api/v1/auth/forgot-password', {
        statusCode: 200,
        body: {
          message: 'Password reset email sent'
        }
      }).as('forgotPasswordRequest');
      
      // Fill form fields
      cy.get('[data-cy=email-input]').type(TEST_USER.email);
      
      // Submit form
      cy.get('[data-cy=submit-button]').click();
      
      // Wait for API call
      cy.wait('@forgotPasswordRequest');
      
      // Check for success message
      cy.get('[data-cy=success-message]').should('be.visible');
      cy.get('[data-cy=success-message]').should('contain', 'Password reset email sent');
    });

    it('should validate email format on forgot password form', () => {
      cy.visit('/forgot-password');
      
      // Fill form fields with invalid email
      cy.get('[data-cy=email-input]').type('invalid-email');
      
      // Submit form
      cy.get('[data-cy=submit-button]').click();
      
      // Should show validation error
      cy.get('[data-cy=email-error]').should('be.visible');
      cy.get('[data-cy=email-error]').should('contain', 'valid email');
      
      // No API call should be made
      cy.get('@forgotPasswordRequest.all').should('have.length', 0);
    });

    it('should display success message after forgot password submission', () => {
      cy.visit('/forgot-password');
      
      // Mock successful forgot password response
      cy.intercept('POST', '/api/v1/auth/forgot-password', {
        statusCode: 200,
        body: {
          message: 'Password reset email sent'
        }
      }).as('forgotPasswordRequest');
      
      // Fill form fields
      cy.get('[data-cy=email-input]').type(TEST_USER.email);
      
      // Submit form
      cy.get('[data-cy=submit-button]').click();
      
      // Wait for API call
      cy.wait('@forgotPasswordRequest');
      
      // Check for success message
      cy.get('[data-cy=success-message]').should('be.visible');
      cy.get('[data-cy=success-message]').should('contain', 'Password reset email sent');
      
      // Form should be hidden
      cy.get('[data-cy=email-input]').should('not.exist');
      
      // Should have back to login link
      cy.get('[data-cy=login-link]').should('be.visible');
    });

    it('should handle password reset with valid token', () => {
      // Visit reset password page with token
      cy.visit('/reset-password?token=valid-test-token');
      
      // Mock successful reset password response
      cy.intercept('POST', '/api/v1/auth/reset-password', {
        statusCode: 200,
        body: {
          message: 'Password reset successful'
        }
      }).as('resetPasswordRequest');
      
      // Fill form fields
      cy.get('[data-cy=password-input]').type('NewPassword123!');
      cy.get('[data-cy=confirm-password-input]').type('NewPassword123!');
      
      // Submit form
      cy.get('[data-cy=submit-button]').click();
      
      // Wait for API call
      cy.wait('@resetPasswordRequest');
      
      // Check for success message
      cy.get('[data-cy=success-message]').should('be.visible');
      cy.get('[data-cy=success-message]').should('contain', 'Password reset successful');
      
      // Should have login link
      cy.get('[data-cy=login-link]').should('be.visible');
    });

    it('should validate password requirements on reset form', () => {
      // Visit reset password page with token
      cy.visit('/reset-password?token=valid-test-token');
      
      // Fill form fields with weak password
      cy.get('[data-cy=password-input]').type('weak');
      cy.get('[data-cy=confirm-password-input]').type('weak');
      
      // Submit form
      cy.get('[data-cy=submit-button]').click();
      
      // Should show validation error
      cy.get('[data-cy=password-error]').should('be.visible');
      cy.get('[data-cy=password-error]').should('contain', 'Password must');
      
      // No API call should be made
      cy.get('@resetPasswordRequest.all').should('have.length', 0);
    });

    it('should validate password confirmation match on reset form', () => {
      // Visit reset password page with token
      cy.visit('/reset-password?token=valid-test-token');
      
      // Fill form fields with mismatched passwords
      cy.get('[data-cy=password-input]').type('NewPassword123!');
      cy.get('[data-cy=confirm-password-input]').type('DifferentPassword123!');
      
      // Submit form
      cy.get('[data-cy=submit-button]').click();
      
      // Should show validation error
      cy.get('[data-cy=confirm-password-error]').should('be.visible');
      cy.get('[data-cy=confirm-password-error]').should('contain', 'Passwords must match');
      
      // No API call should be made
      cy.get('@resetPasswordRequest.all').should('have.length', 0);
    });
  });

  /**
   * Test suite for persistence of authentication state
   */
  describe('Authentication Persistence', () => {
    it('should persist session after page reload when logged in', () => {
      // Set up mock for login request
      cy.intercept('POST', '/api/v1/auth/login', {
        statusCode: 200,
        body: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          user: {
            id: '1',
            email: TEST_USER.email,
            firstName: TEST_USER.firstName,
            lastName: TEST_USER.lastName,
            role: 'FREELANCER'
          }
        }
      }).as('loginRequest');
      
      // Set up mock for user profile request
      cy.intercept('GET', '/api/v1/auth/me', {
        statusCode: 200,
        body: {
          id: '1',
          email: TEST_USER.email,
          firstName: TEST_USER.firstName,
          lastName: TEST_USER.lastName,
          role: 'FREELANCER'
        }
      }).as('meRequest');
      
      // Log in the user
      cy.visit('/login');
      cy.get('[data-cy=email-input]').type(TEST_USER.email);
      cy.get('[data-cy=password-input]').type(TEST_USER.password);
      cy.get('[data-cy=login-button]').click();
      cy.wait('@loginRequest');
      
      // Reload the page
      cy.reload();
      
      // Wait for the user profile API call
      cy.wait('@meRequest');
      
      // User should still be on the dashboard
      cy.url().should('include', '/dashboard');
      
      // User info should be visible
      cy.get('[data-cy=user-menu]').should('contain', TEST_USER.firstName);
    });

    it('should clear session after logout', () => {
      // Set up mock for login request
      cy.intercept('POST', '/api/v1/auth/login', {
        statusCode: 200,
        body: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          user: {
            id: '1',
            email: TEST_USER.email,
            firstName: TEST_USER.firstName,
            lastName: TEST_USER.lastName,
            role: 'FREELANCER'
          }
        }
      }).as('loginRequest');
      
      // Set up mock for logout request
      cy.intercept('POST', '/api/v1/auth/logout', {
        statusCode: 200,
        body: {
          message: 'Logout successful'
        }
      }).as('logoutRequest');
      
      // Log in the user
      cy.visit('/login');
      cy.get('[data-cy=email-input]').type(TEST_USER.email);
      cy.get('[data-cy=password-input]').type(TEST_USER.password);
      cy.get('[data-cy=login-button]').click();
      cy.wait('@loginRequest');
      
      // User should be on dashboard
      cy.url().should('include', '/dashboard');
      
      // Log out the user
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=logout-button]').click();
      cy.wait('@logoutRequest');
      
      // User should be redirected to login page
      cy.url().should('include', '/login');
      
      // Try to access a protected route
      cy.visit('/dashboard');
      
      // Should be redirected back to login
      cy.url().should('include', '/login');
    });

    it('should automatically logout on token expiration', () => {
      // Set up mock for login request
      cy.intercept('POST', '/api/v1/auth/login', {
        statusCode: 200,
        body: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          user: {
            id: '1',
            email: TEST_USER.email,
            firstName: TEST_USER.firstName,
            lastName: TEST_USER.lastName,
            role: 'FREELANCER'
          }
        }
      }).as('loginRequest');
      
      // Set up mock for profile request that returns an expired token error
      cy.intercept('GET', '/api/v1/auth/me', {
        statusCode: 401,
        body: {
          message: 'Token expired'
        }
      }).as('meRequest');
      
      // Set up mock for refresh token that also fails
      cy.intercept('POST', '/api/v1/auth/refresh-token', {
        statusCode: 401,
        body: {
          message: 'Refresh token expired'
        }
      }).as('refreshTokenRequest');
      
      // Log in the user
      cy.visit('/login');
      cy.get('[data-cy=email-input]').type(TEST_USER.email);
      cy.get('[data-cy=password-input]').type(TEST_USER.password);
      cy.get('[data-cy=login-button]').click();
      cy.wait('@loginRequest');
      
      // Visit a protected route after token expiration
      cy.visit('/dashboard');
      
      // Should be redirected to login page
      cy.url().should('include', '/login');
      
      // Should see a message about session expiration
      cy.get('[data-cy=form-message]').should('be.visible');
      cy.get('[data-cy=form-message]').should('contain', 'session has expired');
    });

    it('should use refresh token to extend session', () => {
      // Set up mock for login request
      cy.intercept('POST', '/api/v1/auth/login', {
        statusCode: 200,
        body: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          user: {
            id: '1',
            email: TEST_USER.email,
            firstName: TEST_USER.firstName,
            lastName: TEST_USER.lastName,
            role: 'FREELANCER'
          }
        }
      }).as('loginRequest');
      
      // Set up mock for profile request that returns an expired token error
      cy.intercept('GET', '/api/v1/auth/me', {
        statusCode: 401,
        body: {
          message: 'Token expired'
        }
      }).as('meRequest');
      
      // Set up mock for refresh token success
      cy.intercept('POST', '/api/v1/auth/refresh-token', {
        statusCode: 200,
        body: {
          accessToken: 'new-test-access-token',
          refreshToken: 'new-test-refresh-token'
        }
      }).as('refreshTokenRequest');
      
      // Set up mock for profile request after token refresh
      cy.intercept('GET', '/api/v1/auth/me', {
        statusCode: 200,
        body: {
          id: '1',
          email: TEST_USER.email,
          firstName: TEST_USER.firstName,
          lastName: TEST_USER.lastName,
          role: 'FREELANCER'
        }
      }).as('meRequestAfterRefresh');
      
      // Log in the user
      cy.visit('/login');
      cy.get('[data-cy=email-input]').type(TEST_USER.email);
      cy.get('[data-cy=password-input]').type(TEST_USER.password);
      cy.get('[data-cy=login-button]').click();
      cy.wait('@loginRequest');
      
      // Visit dashboard with expired token (which should trigger refresh)
      cy.visit('/dashboard');
      
      // Should see refresh token request, followed by another me request
      cy.wait('@meRequest');
      cy.wait('@refreshTokenRequest');
      cy.wait('@meRequestAfterRefresh');
      
      // Should still be on dashboard
      cy.url().should('include', '/dashboard');
      
      // User info should be visible
      cy.get('[data-cy=user-menu]').should('contain', TEST_USER.firstName);
    });

    it('should remember user across browser sessions', () => {
      // Set up mock for login request with remember me
      cy.intercept('POST', '/api/v1/auth/login', {
        statusCode: 200,
        body: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          user: {
            id: '1',
            email: TEST_USER.email,
            firstName: TEST_USER.firstName,
            lastName: TEST_USER.lastName,
            role: 'FREELANCER'
          }
        }
      }).as('loginRequest');
      
      // Set up mock for user profile request
      cy.intercept('GET', '/api/v1/auth/me', {
        statusCode: 200,
        body: {
          id: '1',
          email: TEST_USER.email,
          firstName: TEST_USER.firstName,
          lastName: TEST_USER.lastName,
          role: 'FREELANCER'
        }
      }).as('meRequest');
      
      // Log in the user with remember me
      cy.visit('/login');
      cy.get('[data-cy=email-input]').type(TEST_USER.email);
      cy.get('[data-cy=password-input]').type(TEST_USER.password);
      cy.get('[data-cy=remember-me]').check();
      cy.get('[data-cy=login-button]').click();
      cy.wait('@loginRequest');
      
      // Verify persistent tokens in localStorage
      cy.window().then((window) => {
        expect(window.localStorage.getItem('accessToken')).to.exist;
        expect(window.localStorage.getItem('refreshToken')).to.exist;
      });
      
      // Simulate closing browser and opening a new session
      // by clearing cookies but not localStorage (which persists)
      cy.clearCookies();
      
      // Visit the site again
      cy.visit('/');
      
      // Should be automatically logged in and redirected to dashboard
      cy.wait('@meRequest');
      cy.url().should('include', '/dashboard');
      
      // User info should be visible
      cy.get('[data-cy=user-menu]').should('contain', TEST_USER.firstName);
    });
  });

  /**
   * Test suite for role-based access control
   */
  describe('Authorization', () => {
    it('should allow employer role to access employer-specific pages', () => {
      // Set up mock for login as employer
      cy.intercept('POST', '/api/v1/auth/login', {
        statusCode: 200,
        body: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          user: {
            id: '1',
            email: EMPLOYER_USER.email,
            firstName: EMPLOYER_USER.firstName,
            lastName: EMPLOYER_USER.lastName,
            role: 'EMPLOYER'
          }
        }
      }).as('loginRequest');
      
      // Log in as employer
      cy.visit('/login');
      cy.get('[data-cy=email-input]').type(EMPLOYER_USER.email);
      cy.get('[data-cy=password-input]').type(EMPLOYER_USER.password);
      cy.get('[data-cy=login-button]').click();
      cy.wait('@loginRequest');
      
      // Visit employer-specific page
      cy.visit('/employer/post-job');
      
      // Should be able to access the page
      cy.url().should('include', '/employer/post-job');
      cy.get('[data-cy=post-job-form]').should('be.visible');
    });

    it('should allow freelancer role to access freelancer-specific pages', () => {
      // Set up mock for login as freelancer
      cy.intercept('POST', '/api/v1/auth/login', {
        statusCode: 200,
        body: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          user: {
            id: '1',
            email: FREELANCER_USER.email,
            firstName: FREELANCER_USER.firstName,
            lastName: FREELANCER_USER.lastName,
            role: 'FREELANCER'
          }
        }
      }).as('loginRequest');
      
      // Log in as freelancer
      cy.visit('/login');
      cy.get('[data-cy=email-input]').type(FREELANCER_USER.email);
      cy.get('[data-cy=password-input]').type(FREELANCER_USER.password);
      cy.get('[data-cy=login-button]').click();
      cy.wait('@loginRequest');
      
      // Visit freelancer-specific page
      cy.visit('/freelancer/proposals');
      
      // Should be able to access the page
      cy.url().should('include', '/freelancer/proposals');
      cy.get('[data-cy=proposals-list]').should('be.visible');
    });

    it('should prevent employer role from accessing freelancer-only features', () => {
      // Set up mock for login as employer
      cy.intercept('POST', '/api/v1/auth/login', {
        statusCode: 200,
        body: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          user: {
            id: '1',
            email: EMPLOYER_USER.email,
            firstName: EMPLOYER_USER.firstName,
            lastName: EMPLOYER_USER.lastName,
            role: 'EMPLOYER'
          }
        }
      }).as('loginRequest');
      
      // Set up mock for user profile request
      cy.intercept('GET', '/api/v1/auth/me', {
        statusCode: 200,
        body: {
          id: '1',
          email: EMPLOYER_USER.email,
          firstName: EMPLOYER_USER.firstName,
          lastName: EMPLOYER_USER.lastName,
          role: 'EMPLOYER'
        }
      }).as('meRequest');
      
      // Log in as employer
      cy.visit('/login');
      cy.get('[data-cy=email-input]').type(EMPLOYER_USER.email);
      cy.get('[data-cy=password-input]').type(EMPLOYER_USER.password);
      cy.get('[data-cy=login-button]').click();
      cy.wait('@loginRequest');
      
      // Attempt to visit freelancer-specific page
      cy.visit('/freelancer/proposals');
      
      // Should be redirected to unauthorized page
      cy.url().should('include', '/unauthorized');
      cy.get('[data-cy=unauthorized-message]').should('be.visible');
    });

    it('should prevent freelancer role from accessing employer-only features', () => {
      // Set up mock for login as freelancer
      cy.intercept('POST', '/api/v1/auth/login', {
        statusCode: 200,
        body: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          user: {
            id: '1',
            email: FREELANCER_USER.email,
            firstName: FREELANCER_USER.firstName,
            lastName: FREELANCER_USER.lastName,
            role: 'FREELANCER'
          }
        }
      }).as('loginRequest');
      
      // Set up mock for user profile request
      cy.intercept('GET', '/api/v1/auth/me', {
        statusCode: 200,
        body: {
          id: '1',
          email: FREELANCER_USER.email,
          firstName: FREELANCER_USER.firstName,
          lastName: FREELANCER_USER.lastName,
          role: 'FREELANCER'
        }
      }).as('meRequest');
      
      // Log in as freelancer
      cy.visit('/login');
      cy.get('[data-cy=email-input]').type(FREELANCER_USER.email);
      cy.get('[data-cy=password-input]').type(FREELANCER_USER.password);
      cy.get('[data-cy=login-button]').click();
      cy.wait('@loginRequest');
      
      // Attempt to visit employer-specific page
      cy.visit('/employer/post-job');
      
      // Should be redirected to unauthorized page
      cy.url().should('include', '/unauthorized');
      cy.get('[data-cy=unauthorized-message]').should('be.visible');
    });

    it('should redirect unauthenticated users to login when accessing protected pages', () => {
      // Attempt to visit protected page
      cy.visit('/dashboard');
      
      // Should be redirected to login page
      cy.url().should('include', '/login');
      cy.url().should('include', 'redirect=/dashboard');
      
      // Should see login form
      cy.get('[data-cy=login-form]').should('be.visible');
    });

    it('should display error when accessing unauthorized resources via API', () => {
      // Set up mock for login as freelancer
      cy.intercept('POST', '/api/v1/auth/login', {
        statusCode: 200,
        body: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          user: {
            id: '1',
            email: FREELANCER_USER.email,
            firstName: FREELANCER_USER.firstName,
            lastName: FREELANCER_USER.lastName,
            role: 'FREELANCER'
          }
        }
      }).as('loginRequest');
      
      // Set up mock for unauthorized API request
      cy.intercept('GET', '/api/v1/employers/jobs/123', {
        statusCode: 403,
        body: {
          message: 'You do not have permission to access this resource'
        }
      }).as('unauthorizedRequest');
      
      // Log in as freelancer
      cy.visit('/login');
      cy.get('[data-cy=email-input]').type(FREELANCER_USER.email);
      cy.get('[data-cy=password-input]').type(FREELANCER_USER.password);
      cy.get('[data-cy=login-button]').click();
      cy.wait('@loginRequest');
      
      // Visit a page that makes an unauthorized API request
      cy.visit('/jobs/123/edit');
      
      // Wait for the unauthorized API request
      cy.wait('@unauthorizedRequest');
      
      // Should see error message
      cy.get('[data-cy=error-message]').should('be.visible');
      cy.get('[data-cy=error-message]').should('contain', 'You do not have permission');
    });
  });

  /**
   * Test suite for logout functionality
   */
  describe('Logout', () => {
    it('should successfully logout through UI', () => {
      // Set up mock for login request
      cy.intercept('POST', '/api/v1/auth/login', {
        statusCode: 200,
        body: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          user: {
            id: '1',
            email: TEST_USER.email,
            firstName: TEST_USER.firstName,
            lastName: TEST_USER.lastName,
            role: 'FREELANCER'
          }
        }
      }).as('loginRequest');
      
      // Set up mock for logout request
      cy.intercept('POST', '/api/v1/auth/logout', {
        statusCode: 200,
        body: {
          message: 'Logout successful'
        }
      }).as('logoutRequest');
      
      // Log in the user
      cy.visit('/login');
      cy.get('[data-cy=email-input]').type(TEST_USER.email);
      cy.get('[data-cy=password-input]').type(TEST_USER.password);
      cy.get('[data-cy=login-button]').click();
      cy.wait('@loginRequest');
      
      // User should be on dashboard
      cy.url().should('include', '/dashboard');
      
      // Log out the user
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=logout-button]').click();
      
      // Wait for API call
      cy.wait('@logoutRequest');
      
      // User should be redirected to login page
      cy.url().should('include', '/login');
    });

    it('should clear auth tokens on logout', () => {
      // Set up mock for login request
      cy.intercept('POST', '/api/v1/auth/login', {
        statusCode: 200,
        body: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          user: {
            id: '1',
            email: TEST_USER.email,
            firstName: TEST_USER.firstName,
            lastName: TEST_USER.lastName,
            role: 'FREELANCER'
          }
        }
      }).as('loginRequest');
      
      // Set up mock for logout request
      cy.intercept('POST', '/api/v1/auth/logout', {
        statusCode: 200,
        body: {
          message: 'Logout successful'
        }
      }).as('logoutRequest');
      
      // Log in the user
      cy.visit('/login');
      cy.get('[data-cy=email-input]').type(TEST_USER.email);
      cy.get('[data-cy=password-input]').type(TEST_USER.password);
      cy.get('[data-cy=login-button]').click();
      cy.wait('@loginRequest');
      
      // Verify tokens exist
      cy.window().then((window) => {
        expect(window.localStorage.getItem('accessToken')).to.exist;
      });
      
      // Log out the user
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=logout-button]').click();
      cy.wait('@logoutRequest');
      
      // Verify tokens are removed
      cy.window().then((window) => {
        expect(window.localStorage.getItem('accessToken')).to.be.null;
        expect(window.localStorage.getItem('refreshToken')).to.be.null;
      });
    });

    it('should prevent access to protected routes after logout', () => {
      // Set up mock for login request
      cy.intercept('POST', '/api/v1/auth/login', {
        statusCode: 200,
        body: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          user: {
            id: '1',
            email: TEST_USER.email,
            firstName: TEST_USER.firstName,
            lastName: TEST_USER.lastName,
            role: 'FREELANCER'
          }
        }
      }).as('loginRequest');
      
      // Set up mock for logout request
      cy.intercept('POST', '/api/v1/auth/logout', {
        statusCode: 200,
        body: {
          message: 'Logout successful'
        }
      }).as('logoutRequest');
      
      // Log in the user
      cy.visit('/login');
      cy.get('[data-cy=email-input]').type(TEST_USER.email);
      cy.get('[data-cy=password-input]').type(TEST_USER.password);
      cy.get('[data-cy=login-button]').click();
      cy.wait('@loginRequest');
      
      // User should be on dashboard
      cy.url().should('include', '/dashboard');
      
      // Log out the user
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=logout-button]').click();
      cy.wait('@logoutRequest');
      
      // Attempt to visit protected page
      cy.visit('/dashboard');
      
      // Should be redirected to login
      cy.url().should('include', '/login');
    });
  });

  /**
   * Test suite for authentication error scenarios
   */
  describe('Error Handling', () => {
    it('should display API error messages during login', () => {
      cy.visit('/login');
      
      // Mock server error response
      cy.intercept('POST', '/api/v1/auth/login', {
        statusCode: 500,
        body: {
          message: 'Internal server error'
        }
      }).as('loginRequest');
      
      // Fill form fields
      cy.get('[data-cy=email-input]').type(TEST_USER.email);
      cy.get('[data-cy=password-input]').type(TEST_USER.password);
      
      // Submit form
      cy.get('[data-cy=login-button]').click();
      
      // Wait for API call
      cy.wait('@loginRequest');
      
      // Check for error message
      cy.get('[data-cy=form-error]').should('be.visible');
      cy.get('[data-cy=form-error]').should('contain', 'Internal server error');
    });

    it('should display API error messages during registration', () => {
      cy.visit('/register');
      
      // Mock server error response
      cy.intercept('POST', '/api/v1/auth/register', {
        statusCode: 500,
        body: {
          message: 'Internal server error'
        }
      }).as('registerRequest');
      
      // Fill form fields
      cy.get('[data-cy=first-name-input]').type(TEST_USER.firstName);
      cy.get('[data-cy=last-name-input]').type(TEST_USER.lastName);
      cy.get('[data-cy=email-input]').type(TEST_USER.email);
      cy.get('[data-cy=password-input]').type(TEST_USER.password);
      cy.get('[data-cy=confirm-password-input]').type(TEST_USER.password);
      cy.get('[data-cy=role-freelancer]').check();
      cy.get('[data-cy=terms-checkbox]').check();
      
      // Submit form
      cy.get('[data-cy=register-button]').click();
      
      // Wait for API call
      cy.wait('@registerRequest');
      
      // Check for error message
      cy.get('[data-cy=form-error]').should('be.visible');
      cy.get('[data-cy=form-error]').should('contain', 'Internal server error');
    });

    it('should handle network failures during authentication', () => {
      cy.visit('/login');
      
      // Mock network failure
      cy.intercept('POST', '/api/v1/auth/login', {
        forceNetworkError: true
      }).as('loginRequest');
      
      // Fill form fields
      cy.get('[data-cy=email-input]').type(TEST_USER.email);
      cy.get('[data-cy=password-input]').type(TEST_USER.password);
      
      // Submit form
      cy.get('[data-cy=login-button]').click();
      
      // Check for network error message
      cy.get('[data-cy=form-error]').should('be.visible');
      cy.get('[data-cy=form-error]').should('contain', 'network');
    });

    it('should handle server errors (500 responses)', () => {
      cy.visit('/login');
      
      // Mock 500 error response with no message
      cy.intercept('POST', '/api/v1/auth/login', {
        statusCode: 500,
        body: {}
      }).as('loginRequest');
      
      // Fill form fields
      cy.get('[data-cy=email-input]').type(TEST_USER.email);
      cy.get('[data-cy=password-input]').type(TEST_USER.password);
      
      // Submit form
      cy.get('[data-cy=login-button]').click();
      
      // Wait for API call
      cy.wait('@loginRequest');
      
      // Check for generic error message
      cy.get('[data-cy=form-error]').should('be.visible');
      cy.get('[data-cy=form-error]').should('contain', 'Something went wrong');
    });

    it('should present form validation errors appropriately', () => {
      cy.visit('/register');
      
      // Submit empty form
      cy.get('[data-cy=register-button]').click();
      
      // Check that all error messages are visible and distinct
      cy.get('[data-cy=first-name-error]').should('be.visible');
      cy.get('[data-cy=last-name-error]').should('be.visible');
      cy.get('[data-cy=email-error]').should('be.visible');
      cy.get('[data-cy=password-error]').should('be.visible');
      cy.get('[data-cy=role-error]').should('be.visible');
      cy.get('[data-cy=terms-error]').should('be.visible');
      
      // Each error should be next to its field
      cy.get('[data-cy=first-name-input]')
        .should('have.attr', 'aria-invalid', 'true')
        .should('have.attr', 'aria-describedby')
        .and('include', 'first-name-error');
    });
  });

  /**
   * Test suite for responsive design of authentication pages
   */
  describe('Responsive Behavior', () => {
    it('should adapt login page layout on mobile viewport', () => {
      // Set viewport to mobile size
      cy.viewport('iphone-8');
      
      cy.visit('/login');
      
      // Check for mobile-specific layout
      cy.get('[data-cy=login-form]').should('have.css', 'width', '100%');
      cy.get('[data-cy=logo]').should('have.css', 'width').and('match', /\d+px/);
      
      // Elements should be stacked vertically
      cy.get('[data-cy=login-button]').should('have.css', 'width', '100%');
    });

    it('should adapt registration page layout on mobile viewport', () => {
      // Set viewport to mobile size
      cy.viewport('iphone-8');
      
      cy.visit('/register');
      
      // Check for mobile-specific layout
      cy.get('[data-cy=register-form]').should('have.css', 'width', '100%');
      
      // Elements should be stacked vertically
      cy.get('[data-cy=register-button]').should('have.css', 'width', '100%');
      
      // Role selection should be vertically stacked
      cy.get('[data-cy=role-selection]').should('have.css', 'flex-direction', 'column');
    });

    it('should adapt password reset pages on mobile viewport', () => {
      // Set viewport to mobile size
      cy.viewport('iphone-8');
      
      cy.visit('/forgot-password');
      
      // Check for mobile-specific layout
      cy.get('[data-cy=forgot-password-form]').should('have.css', 'width', '100%');
      cy.get('[data-cy=submit-button]').should('have.css', 'width', '100%');
    });

    it('should adapt to tablet viewport', () => {
      // Set viewport to tablet size
      cy.viewport('ipad-2');
      
      cy.visit('/login');
      
      // Check for tablet-specific layout
      cy.get('[data-cy=login-form]').should('have.css', 'max-width').and('match', /\d+px/);
      cy.get('[data-cy=login-form]').should('not.have.css', 'width', '100%');
      
      // Buttons should have appropriate width
      cy.get('[data-cy=login-button]').should('not.have.css', 'width', '100%');
    });

    it('should maintain accessibility on different viewports', () => {
      // Test mobile
      cy.viewport('iphone-8');
      cy.visit('/login');
      cy.get('[data-cy=email-input]').should('have.attr', 'aria-label');
      cy.get('[data-cy=password-input]').should('have.attr', 'aria-label');
      
      // Test tablet
      cy.viewport('ipad-2');
      cy.visit('/login');
      cy.get('[data-cy=email-input]').should('have.attr', 'aria-label');
      cy.get('[data-cy=password-input]').should('have.attr', 'aria-label');
      
      // Test desktop
      cy.viewport('macbook-16');
      cy.visit('/login');
      cy.get('[data-cy=email-input]').should('have.attr', 'aria-label');
      cy.get('[data-cy=password-input]').should('have.attr', 'aria-label');
    });
  });
});