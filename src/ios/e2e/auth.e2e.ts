import { device, element, expect, by, waitFor } from 'detox'; // ^20.0.0
import { 
  LoginFormValues, 
  RegisterFormValues, 
  ForgotPasswordFormValues,
  UserRole,
  BiometricType
} from '../src/types/auth.types';

// Test constants
const TEST_EMPLOYER_USER = {
  email: 'employer@example.com', 
  password: 'EmployerTest1234!', 
  firstName: 'Test', 
  lastName: 'Employer', 
  role: UserRole.EMPLOYER
};

const TEST_FREELANCER_USER = {
  email: 'freelancer@example.com',
  password: 'FreelancerTest1234!',
  firstName: 'Test',
  lastName: 'Freelancer',
  role: UserRole.FREELANCER
};

const INVALID_EMAIL = 'invalid-email';
const WEAK_PASSWORD = 'weak';
const VALID_EMAIL = 'test@example.com';

/**
 * Setup function that runs before all authentication tests
 */
beforeAll(async () => {
  // Initialize Detox device configuration
  await device.launchApp({
    newInstance: true,
    permissions: { 
      notifications: 'YES',
      faceid: 'YES'  // For biometric testing
    }
  });
  
  // Clear app storage and cache for clean test runs
  await device.clearKeychain();
  
  // Set up mock responses for authentication API calls
  // This would be implemented using Detox configurations and may
  // vary depending on how the app's API communication is structured
});

/**
 * Cleanup function that runs after all authentication tests
 */
afterAll(async () => {
  // Clean up any test artifacts
  await device.clearKeychain();
  
  // Close the application
  await device.terminateApp();
});

/**
 * Setup function that runs before each test
 */
beforeEach(async () => {
  // Reset app to launch screen
  await device.reloadReactNative();
  
  // Navigate to the login screen if not already there
  await navigateToLoginScreen();
});

/**
 * Test suite for login functionality
 */
describe('Login Functionality', () => {
  it('should login with valid email and password', async () => {
    const loginData: LoginFormValues = {
      email: TEST_EMPLOYER_USER.email,
      password: TEST_EMPLOYER_USER.password,
      remember: true,
      useBiometrics: false
    };
    
    await fillLoginForm(loginData);
    await element(by.id('login-button')).tap();
    
    // Verify successful login by checking if dashboard is shown
    await expect(element(by.id('dashboard-screen'))).toBeVisible();
    
    // Cleanup - logout for next tests
    await logout();
  });
  
  it('should show error for invalid email format', async () => {
    const loginData: LoginFormValues = {
      email: INVALID_EMAIL,
      password: TEST_EMPLOYER_USER.password,
      remember: false,
      useBiometrics: false
    };
    
    await fillLoginForm(loginData);
    await element(by.id('login-button')).tap();
    
    // Verify error message is shown
    await expect(element(by.text('Please enter a valid email address'))).toBeVisible();
  });
  
  it('should show error for invalid password', async () => {
    const loginData: LoginFormValues = {
      email: TEST_EMPLOYER_USER.email,
      password: WEAK_PASSWORD,
      remember: false,
      useBiometrics: false
    };
    
    await fillLoginForm(loginData);
    await element(by.id('login-button')).tap();
    
    // Verify error message is shown
    await expect(element(by.text('Invalid credentials'))).toBeVisible();
  });
  
  it('should show error for non-existent user', async () => {
    const loginData: LoginFormValues = {
      email: 'nonexistent@example.com',
      password: 'ValidPassword123!',
      remember: false,
      useBiometrics: false
    };
    
    await fillLoginForm(loginData);
    await element(by.id('login-button')).tap();
    
    // Verify error message is shown
    await expect(element(by.text('User not found'))).toBeVisible();
  });
  
  it('should remember login session when remember me is checked', async () => {
    const loginData: LoginFormValues = {
      email: TEST_EMPLOYER_USER.email,
      password: TEST_EMPLOYER_USER.password,
      remember: true,
      useBiometrics: false
    };
    
    await fillLoginForm(loginData);
    await element(by.id('login-button')).tap();
    
    // Verify successful login
    await expect(element(by.id('dashboard-screen'))).toBeVisible();
    
    // Background and reopen app to test session persistence
    await device.sendToHome();
    await device.launchApp({ newInstance: false });
    
    // Verify still logged in
    await expect(element(by.id('dashboard-screen'))).toBeVisible();
    
    // Cleanup
    await logout();
  });

  it('should use biometric authentication if available', async () => {
    // Check if biometric authentication is available
    if (await element(by.id('biometric-login-option')).isVisible()) {
      await element(by.id('biometric-login-button')).tap();
      
      // Simulate successful biometric auth
      await device.matchFace();
      
      // Verify successful login
      await expect(element(by.id('dashboard-screen'))).toBeVisible();
      
      // Cleanup
      await logout();
    }
  });
  
  it('should show appropriate error messages and UI feedback', async () => {
    // Test empty form submission
    await element(by.id('login-button')).tap();
    
    // Should show validation errors for required fields
    await expect(element(by.text('Email is required'))).toBeVisible();
    await expect(element(by.text('Password is required'))).toBeVisible();
    
    // Test error message disappears when correcting the error
    await element(by.id('email-input')).tap();
    await element(by.id('email-input')).typeText(TEST_EMPLOYER_USER.email);
    
    // Email error should disappear
    await expect(element(by.text('Email is required'))).not.toBeVisible();
  });
});

/**
 * Test suite for registration functionality
 */
describe('Registration Functionality', () => {
  beforeEach(async () => {
    // Navigate to registration screen before each test
    await navigateToRegistrationScreen();
    await expect(element(by.id('registration-screen'))).toBeVisible();
  });
  
  it('should register a valid employer account', async () => {
    const registerData: RegisterFormValues = {
      ...TEST_EMPLOYER_USER,
      confirmPassword: TEST_EMPLOYER_USER.password,
      agreeToTerms: true,
      enableBiometrics: false
    };
    
    await fillRegistrationForm(registerData);
    await element(by.id('register-button')).tap();
    
    // Verify successful registration by checking for dashboard or onboarding
    await expect(element(by.id('onboarding-screen')).or(by.id('dashboard-screen'))).toBeVisible();
    
    // Cleanup
    await logout();
  });
  
  it('should register a valid freelancer account', async () => {
    const registerData: RegisterFormValues = {
      ...TEST_FREELANCER_USER,
      confirmPassword: TEST_FREELANCER_USER.password,
      agreeToTerms: true,
      enableBiometrics: false
    };
    
    await fillRegistrationForm(registerData);
    await element(by.id('register-button')).tap();
    
    // Verify successful registration by checking for dashboard or onboarding
    await expect(element(by.id('onboarding-screen')).or(by.id('dashboard-screen'))).toBeVisible();
    
    // Cleanup
    await logout();
  });
  
  it('should show error when registering with an existing email', async () => {
    // Use an email that's already registered
    const registerData: RegisterFormValues = {
      ...TEST_EMPLOYER_USER,
      confirmPassword: TEST_EMPLOYER_USER.password,
      agreeToTerms: true,
      enableBiometrics: false
    };
    
    await fillRegistrationForm(registerData);
    await element(by.id('register-button')).tap();
    
    // Verify error message
    await expect(element(by.text('Email is already in use'))).toBeVisible();
  });
  
  it('should validate password strength', async () => {
    const weakPasswordUser: RegisterFormValues = {
      ...TEST_EMPLOYER_USER,
      password: WEAK_PASSWORD,
      confirmPassword: WEAK_PASSWORD,
      agreeToTerms: true,
      enableBiometrics: false
    };
    
    await fillRegistrationForm(weakPasswordUser);
    await element(by.id('register-button')).tap();
    
    // Verify password strength error
    await expect(element(by.text('Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters'))).toBeVisible();
  });
  
  it('should validate password matching', async () => {
    const mismatchedPasswordUser: RegisterFormValues = {
      ...TEST_EMPLOYER_USER,
      confirmPassword: 'DifferentPassword123!',
      agreeToTerms: true,
      enableBiometrics: false
    };
    
    await fillRegistrationForm(mismatchedPasswordUser);
    await element(by.id('register-button')).tap();
    
    // Verify password mismatch error
    await expect(element(by.text('Passwords do not match'))).toBeVisible();
  });
  
  it('should require terms agreement', async () => {
    const noTermsUser: RegisterFormValues = {
      ...TEST_EMPLOYER_USER,
      confirmPassword: TEST_EMPLOYER_USER.password,
      agreeToTerms: false,
      enableBiometrics: false
    };
    
    await fillRegistrationForm(noTermsUser);
    await element(by.id('register-button')).tap();
    
    // Verify terms agreement error
    await expect(element(by.text('You must agree to the terms and conditions'))).toBeVisible();
  });
  
  it('should validate all registration form fields', async () => {
    // Submit empty form
    await element(by.id('register-button')).tap();
    
    // Verify validation errors for all required fields
    await expect(element(by.text('First name is required'))).toBeVisible();
    await expect(element(by.text('Last name is required'))).toBeVisible();
    await expect(element(by.text('Email is required'))).toBeVisible();
    await expect(element(by.text('Password is required'))).toBeVisible();
    await expect(element(by.text('You must select a role'))).toBeVisible();
    await expect(element(by.text('You must agree to the terms and conditions'))).toBeVisible();
  });
});

/**
 * Test suite for password recovery
 */
describe('Password Recovery', () => {
  beforeEach(async () => {
    await navigateToForgotPasswordScreen();
    await expect(element(by.id('forgot-password-screen'))).toBeVisible();
  });
  
  it('should send password reset request with valid email', async () => {
    await fillForgotPasswordForm(VALID_EMAIL);
    await element(by.id('reset-password-button')).tap();
    
    // Verify success message
    await expect(element(by.text('Password reset instructions have been sent to your email'))).toBeVisible();
  });
  
  it('should show error for invalid email format', async () => {
    await fillForgotPasswordForm(INVALID_EMAIL);
    await element(by.id('reset-password-button')).tap();
    
    // Verify error message
    await expect(element(by.text('Please enter a valid email address'))).toBeVisible();
  });
  
  it('should show error for non-existent email', async () => {
    await fillForgotPasswordForm('nonexistent@example.com');
    await element(by.id('reset-password-button')).tap();
    
    // Verify error message
    await expect(element(by.text('No account found with this email address'))).toBeVisible();
  });
  
  it('should display success confirmation', async () => {
    await fillForgotPasswordForm(VALID_EMAIL);
    await element(by.id('reset-password-button')).tap();
    
    // Verify success confirmation
    await expect(element(by.text('Password reset instructions have been sent to your email'))).toBeVisible();
    await expect(element(by.text('Please check your inbox and follow the instructions'))).toBeVisible();
  });
  
  it('should navigate back to login screen', async () => {
    await element(by.id('back-to-login-button')).tap();
    
    // Verify login screen is shown
    await expect(element(by.id('login-screen'))).toBeVisible();
  });
});

/**
 * Test suite for authentication state management
 */
describe('Authentication State', () => {
  it('should persist session when app is in background', async () => {
    // Login first
    const loginData: LoginFormValues = {
      email: TEST_EMPLOYER_USER.email,
      password: TEST_EMPLOYER_USER.password,
      remember: true,
      useBiometrics: false
    };
    
    await fillLoginForm(loginData);
    await element(by.id('login-button')).tap();
    
    // Verify successful login
    await expect(element(by.id('dashboard-screen'))).toBeVisible();
    
    // Background app and bring it back
    await device.sendToHome();
    await device.launchApp({ newInstance: false });
    
    // Verify still logged in
    await expect(element(by.id('dashboard-screen'))).toBeVisible();
    
    // Cleanup
    await logout();
  });
  
  it('should automatically redirect to dashboard for authenticated users', async () => {
    // Login first
    const loginData: LoginFormValues = {
      email: TEST_EMPLOYER_USER.email,
      password: TEST_EMPLOYER_USER.password,
      remember: true,
      useBiometrics: false
    };
    
    await fillLoginForm(loginData);
    await element(by.id('login-button')).tap();
    
    // Restart the app
    await device.reloadReactNative();
    
    // Should go directly to dashboard
    await expect(element(by.id('dashboard-screen'))).toBeVisible();
    
    // Cleanup
    await logout();
  });
  
  it('should perform logout successfully', async () => {
    // Login first
    const loginData: LoginFormValues = {
      email: TEST_EMPLOYER_USER.email,
      password: TEST_EMPLOYER_USER.password,
      remember: false,
      useBiometrics: false
    };
    
    await fillLoginForm(loginData);
    await element(by.id('login-button')).tap();
    
    // Logout
    await logout();
    
    // Verify logged out - login screen should be visible
    await expect(element(by.id('login-screen'))).toBeVisible();
  });
  
  it('should handle session expiration', async () => {
    // Login first
    const loginData: LoginFormValues = {
      email: TEST_EMPLOYER_USER.email,
      password: TEST_EMPLOYER_USER.password,
      remember: true,
      useBiometrics: false
    };
    
    await fillLoginForm(loginData);
    await element(by.id('login-button')).tap();
    
    // Verify successful login
    await expect(element(by.id('dashboard-screen'))).toBeVisible();
    
    // Simulate session expiration (implementation-specific)
    // For testing purposes, mock an expired token response
    
    // Try to navigate to a protected resource
    await element(by.id('jobs-tab')).tap();
    
    // Should be redirected to login screen
    await expect(element(by.id('login-screen'))).toBeVisible();
    
    // Should show session expired message
    await expect(element(by.text('Your session has expired. Please login again.'))).toBeVisible();
  });
});

/**
 * Test suite for biometric authentication
 */
describe('Biometric Authentication', () => {
  it('should detect biometric authentication availability', async () => {
    // Check if biometric option is displayed
    const isBiometricAvailable = await element(by.id('biometric-login-option')).isVisible();
    
    // This test might be device-dependent, so we just record the result
    if (isBiometricAvailable) {
      console.log('Biometric authentication is available on this device');
    } else {
      console.log('Biometric authentication is not available on this device');
    }
  });
  
  it('should enable biometric authentication', async () => {
    // Login first with biometrics enabled
    const loginData: LoginFormValues = {
      email: TEST_EMPLOYER_USER.email,
      password: TEST_EMPLOYER_USER.password,
      remember: true,
      useBiometrics: true
    };
    
    await fillLoginForm(loginData);
    await element(by.id('login-button')).tap();
    
    // We should see a prompt asking to enable biometrics
    if (await element(by.text('Enable biometric login?')).isVisible()) {
      await element(by.text('Yes')).tap();
      
      // Verify biometrics was enabled
      await expect(element(by.text('Biometric login enabled'))).toBeVisible();
    }
    
    // Cleanup
    await logout();
  });
  
  it('should login with biometrics', async () => {
    // First ensure biometrics is set up from previous test
    
    // Tap biometric login button
    if (await element(by.id('biometric-login-button')).isVisible()) {
      await element(by.id('biometric-login-button')).tap();
      
      // Simulate successful biometric auth (using Detox test helpers)
      await device.matchFace();
      
      // Should be logged in and on dashboard
      await expect(element(by.id('dashboard-screen'))).toBeVisible();
      
      // Cleanup
      await logout();
    } else {
      console.log('Biometric login button not available on this device or not properly set up');
    }
  });
  
  it('should handle biometric authentication failure', async () => {
    // Tap biometric login button if available
    if (await element(by.id('biometric-login-button')).isVisible()) {
      await element(by.id('biometric-login-button')).tap();
      
      // Simulate failed biometric auth
      await device.unmatchFace();
      
      // Should show error message
      await expect(element(by.text('Biometric authentication failed'))).toBeVisible();
      
      // Should still be on login screen
      await expect(element(by.id('login-screen'))).toBeVisible();
    } else {
      console.log('Biometric login button not available on this device or not properly set up');
    }
  });
  
  it('should allow disabling biometric authentication', async () => {
    // First login
    const loginData: LoginFormValues = {
      email: TEST_EMPLOYER_USER.email,
      password: TEST_EMPLOYER_USER.password,
      remember: true,
      useBiometrics: false
    };
    
    await fillLoginForm(loginData);
    await element(by.id('login-button')).tap();
    
    // Go to settings
    await element(by.id('profile-tab')).tap();
    await element(by.id('settings-button')).tap();
    
    // Find and disable biometrics
    await element(by.id('biometric-login-toggle')).tap();
    
    // Should show confirmation dialog
    await expect(element(by.text('Disable biometric login?'))).toBeVisible();
    await element(by.text('Yes')).tap();
    
    // Should show success message
    await expect(element(by.text('Biometric login disabled'))).toBeVisible();
    
    // Cleanup
    await element(by.id('back-button')).tap();
    await logout();
  });
});

/**
 * Helper function to fill the login form with credentials
 * @param credentials - Login credentials to fill in the form
 */
async function fillLoginForm(credentials: LoginFormValues): Promise<void> {
  await element(by.id('email-input')).tap();
  await element(by.id('email-input')).typeText(credentials.email);
  
  await element(by.id('password-input')).tap();
  await element(by.id('password-input')).typeText(credentials.password);
  
  if (credentials.remember) {
    await element(by.id('remember-checkbox')).tap();
  }
  
  if (credentials.useBiometrics) {
    await element(by.id('biometrics-checkbox')).tap();
  }
}

/**
 * Helper function to fill the registration form with user data
 * @param userData - User registration data to fill in the form
 */
async function fillRegistrationForm(userData: RegisterFormValues): Promise<void> {
  await element(by.id('first-name-input')).tap();
  await element(by.id('first-name-input')).typeText(userData.firstName);
  
  await element(by.id('last-name-input')).tap();
  await element(by.id('last-name-input')).typeText(userData.lastName);
  
  await element(by.id('email-input')).tap();
  await element(by.id('email-input')).typeText(userData.email);
  
  await element(by.id('password-input')).tap();
  await element(by.id('password-input')).typeText(userData.password);
  
  await element(by.id('confirm-password-input')).tap();
  await element(by.id('confirm-password-input')).typeText(userData.confirmPassword);
  
  // Select role
  if (userData.role === UserRole.EMPLOYER) {
    await element(by.id('employer-role-radio')).tap();
  } else {
    await element(by.id('freelancer-role-radio')).tap();
  }
  
  // Terms checkbox
  if (userData.agreeToTerms) {
    await element(by.id('terms-checkbox')).tap();
  }
  
  // Biometrics checkbox if applicable
  if (userData.enableBiometrics) {
    await element(by.id('biometrics-checkbox')).tap();
  }
}

/**
 * Helper function to fill the forgot password form
 * @param email - Email to fill in the form
 */
async function fillForgotPasswordForm(email: string): Promise<void> {
  await element(by.id('email-input')).tap();
  await element(by.id('email-input')).typeText(email);
}

/**
 * Helper function to navigate to the login screen
 */
async function navigateToLoginScreen(): Promise<void> {
  // Check current screen
  const isOnLoginScreen = await element(by.id('login-screen')).isVisible();
  if (isOnLoginScreen) {
    return;
  }
  
  // If on dashboard, log out first
  const isOnDashboard = await element(by.id('dashboard-screen')).isVisible();
  if (isOnDashboard) {
    await logout();
    return;
  }
  
  // If on registration screen, tap login link
  const isOnRegisterScreen = await element(by.id('registration-screen')).isVisible();
  if (isOnRegisterScreen) {
    await element(by.id('login-link')).tap();
    await waitFor(element(by.id('login-screen'))).toBeVisible().withTimeout(5000);
    return;
  }
  
  // If on forgot password screen, tap back button
  const isOnForgotPasswordScreen = await element(by.id('forgot-password-screen')).isVisible();
  if (isOnForgotPasswordScreen) {
    await element(by.id('back-to-login-button')).tap();
    await waitFor(element(by.id('login-screen'))).toBeVisible().withTimeout(5000);
    return;
  }
  
  // Otherwise reload the app
  await device.reloadReactNative();
  await waitFor(element(by.id('login-screen'))).toBeVisible().withTimeout(5000);
}

/**
 * Helper function to navigate to the registration screen
 */
async function navigateToRegistrationScreen(): Promise<void> {
  // Ensure on login screen first
  await navigateToLoginScreen();
  
  // Tap on register link button
  await element(by.id('register-link')).tap();
  
  // Wait for registration screen to appear
  await waitFor(element(by.id('registration-screen'))).toBeVisible().withTimeout(5000);
}

/**
 * Helper function to navigate to the forgot password screen
 */
async function navigateToForgotPasswordScreen(): Promise<void> {
  // Ensure on login screen first
  await navigateToLoginScreen();
  
  // Tap on forgot password link
  await element(by.id('forgot-password-link')).tap();
  
  // Wait for forgot password screen to appear
  await waitFor(element(by.id('forgot-password-screen'))).toBeVisible().withTimeout(5000);
}

/**
 * Helper function to log out of the application
 */
async function logout(): Promise<void> {
  // Tap on profile tab
  await element(by.id('profile-tab')).tap();
  
  // Scroll to find logout button
  await element(by.id('profile-screen')).scrollTo('bottom');
  
  // Tap on logout button
  await element(by.id('logout-button')).tap();
  
  // Confirm logout in dialog
  await element(by.text('Confirm')).tap();
  
  // Wait for login screen to appear
  await waitFor(element(by.id('login-screen'))).toBeVisible().withTimeout(5000);
}