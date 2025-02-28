/**
 * Core Authentication Library for iOS
 * 
 * This module provides comprehensive authentication functionality for the AI Talent Marketplace
 * iOS application, including email/password login, biometric authentication, OAuth integration,
 * token management, and permission verification.
 * 
 * @version 1.0.0
 */

import jwtDecode from 'jwt-decode'; // ^3.1.2
import { Linking, Platform } from 'react-native'; // 0.72.x

// Internal imports
import { User } from '../../../backend/shared/src/types/user.types';
import { 
  AuthState, 
  LoginFormValues, 
  RegisterFormValues, 
  ResetPasswordFormValues, 
  ChangePasswordFormValues, 
  JwtPayload, 
  Permission, 
  RolePermissions, 
  BiometricType, 
  BiometricAuthResult, 
  AuthProvider, 
  SessionStatus, 
  TwoFactorSetupResponse, 
  AuthPermission,
  AuthCredentials 
} from '../types/auth.types';

import { 
  saveAuthToken, 
  getAuthToken, 
  deleteAuthToken, 
  saveRefreshToken, 
  getRefreshToken, 
  deleteRefreshToken, 
  saveUserCredentials, 
  getUserCredentials,
  deleteBiometricCredentials,
  saveBiometricCredentials,
  getBiometricCredentials,
  clearAllSecureItems
} from '../utils/keychain';

import { 
  isBiometricsAvailable, 
  getBiometricType, 
  authenticateWithBiometrics,
  createBiometricKeys,
  deleteBiometricKeys,
  getBiometricKeysExist
} from '../utils/biometrics';

import api from './api';
import { isTokenExpired, API_BASE_URL } from './axios';

// Global constants
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
const AUTH_STORAGE_KEY = 'auth_session';
const BIOMETRICS_ENABLED_KEY = 'biometrics_enabled';
const OAUTH_REDIRECT_SCHEME = 'aitalent://auth';

// Cached token for synchronous permission checks
let cachedToken: string | null = null;

/**
 * Updates the cached token for synchronous operations
 */
const updateCachedToken = (token: string | null): void => {
  cachedToken = token;
};

/**
 * Authenticates a user with email and password
 * 
 * @param credentials - Login credentials (email, password, remember me flag)
 * @returns Promise resolving to authentication result with user data and tokens
 */
export const login = async (
  credentials: LoginFormValues
): Promise<{ user: User; token: string; refreshToken: string }> => {
  try {
    // Validate credentials
    if (!credentials.email || !credentials.password) {
      throw new Error('Email and password are required');
    }

    // Make API request to authenticate user
    const response = await api.auth.login(credentials);
    
    // Store authentication tokens securely
    await saveAuthToken(response.token);
    await saveRefreshToken(response.refreshToken);
    
    // Update cached token for synchronous operations
    updateCachedToken(response.token);
    
    // If remember me is enabled, store credentials for future use
    if (credentials.remember) {
      await saveUserCredentials({
        email: credentials.email,
        password: credentials.password
      });
    }
    
    // If biometrics requested, enable biometric authentication
    if (credentials.useBiometrics) {
      await enableBiometrics({
        email: credentials.email,
        password: credentials.password
      });
    }
    
    return response;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

/**
 * Authenticates a user with stored biometric credentials
 * 
 * @returns Promise resolving to authentication result or null if biometrics fail
 */
export const loginWithBiometrics = async (
): Promise<{ user: User; token: string; refreshToken: string } | null> => {
  try {
    // Check if biometric authentication is available and enabled
    const biometricsEnabled = await isBiometricsEnabled();
    if (!biometricsEnabled) {
      return null;
    }
    
    // Prompt user for biometric authentication
    const authResult = await authenticateWithBiometrics(
      'Authenticate to access your account'
    );
    
    if (authResult !== BiometricAuthResult.SUCCESS) {
      return null;
    }
    
    // Retrieve stored credentials
    const credentials = await getBiometricCredentials();
    if (!credentials) {
      return null;
    }
    
    // Use stored credentials to authenticate with backend
    const response = await api.auth.login({
      email: credentials.email,
      password: credentials.password,
      remember: true,
      useBiometrics: true
    });
    
    // Store new authentication tokens
    await saveAuthToken(response.token);
    await saveRefreshToken(response.refreshToken);
    
    // Update cached token for synchronous operations
    updateCachedToken(response.token);
    
    return response;
  } catch (error) {
    console.error('Biometric login failed:', error);
    return null;
  }
};

/**
 * Registers a new user account
 * 
 * @param userData - Registration form data
 * @returns Promise resolving to registration result with user data and tokens
 */
export const register = async (
  userData: RegisterFormValues
): Promise<{ user: User; token: string; refreshToken: string }> => {
  try {
    // Validate registration data
    if (!userData.email || !userData.password || !userData.confirmPassword) {
      throw new Error('Email and password are required');
    }
    
    if (userData.password !== userData.confirmPassword) {
      throw new Error('Passwords do not match');
    }
    
    // Make API request to create new user account
    const response = await api.auth.register(userData);
    
    // Store authentication tokens securely
    await saveAuthToken(response.token);
    await saveRefreshToken(response.refreshToken);
    
    // Update cached token for synchronous operations
    updateCachedToken(response.token);
    
    // If biometrics requested, enable biometric authentication
    if (userData.enableBiometrics) {
      await enableBiometrics({
        email: userData.email,
        password: userData.password
      });
    }
    
    return response;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
};

/**
 * Logs out the current user
 * 
 * @returns Promise resolving to void
 */
export const logout = async (): Promise<void> => {
  try {
    // Make API request to invalidate current session
    try {
      await api.auth.logout();
    } catch (error) {
      // Continue with local logout even if API call fails
      console.warn('Logout API call failed:', error);
    }
    
    // Delete authentication tokens from secure storage
    await deleteAuthToken();
    await deleteRefreshToken();
    
    // Update cached token for synchronous operations
    updateCachedToken(null);
    
    // Note: We don't delete user credentials or biometric credentials
    // as they may be used for future logins. Only the tokens are deleted.
  } catch (error) {
    console.error('Logout failed:', error);
    throw error;
  }
};

/**
 * Initiates the password recovery process
 * 
 * @param email - User's email address
 * @returns Promise resolving to result of password recovery request
 */
export const forgotPassword = async (
  email: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Validate email
    if (!email) {
      throw new Error('Email is required');
    }
    
    // Make API request to initiate password recovery
    return await api.auth.forgotPassword(email);
  } catch (error) {
    console.error('Forgot password request failed:', error);
    throw error;
  }
};

/**
 * Resets the user's password using a reset token
 * 
 * @param data - Reset password form data (token, new password)
 * @returns Promise resolving to result of password reset
 */
export const resetPassword = async (
  data: ResetPasswordFormValues
): Promise<{ success: boolean; message: string }> => {
  try {
    // Validate reset password data
    if (!data.token || !data.password || !data.confirmPassword) {
      throw new Error('Token and new password are required');
    }
    
    if (data.password !== data.confirmPassword) {
      throw new Error('Passwords do not match');
    }
    
    // Make API request to reset password
    return await api.auth.resetPassword(data);
  } catch (error) {
    console.error('Password reset failed:', error);
    throw error;
  }
};

/**
 * Changes the authenticated user's password
 * 
 * @param data - Change password form data (current password, new password)
 * @returns Promise resolving to result of password change
 */
export const changePassword = async (
  data: ChangePasswordFormValues
): Promise<{ success: boolean; message: string }> => {
  try {
    // Validate change password data
    if (!data.currentPassword || !data.newPassword || !data.confirmPassword) {
      throw new Error('Current password and new password are required');
    }
    
    if (data.newPassword !== data.confirmPassword) {
      throw new Error('Passwords do not match');
    }
    
    // Get current authentication token to ensure user is authenticated
    const token = await getAuthToken();
    if (!token) {
      throw new Error('User not authenticated');
    }
    
    // Make API request to change password
    return await api.auth.changePassword(data);
  } catch (error) {
    console.error('Password change failed:', error);
    throw error;
  }
};

/**
 * Sets up two-factor authentication for the user
 * 
 * @returns Promise resolving to 2FA setup information (secret, QR code URL)
 */
export const setupTwoFactor = async (): Promise<TwoFactorSetupResponse> => {
  try {
    // Get current authentication token to ensure user is authenticated
    const token = await getAuthToken();
    if (!token) {
      throw new Error('User not authenticated');
    }
    
    // Make API request to initialize 2FA setup
    return await api.auth.setupTwoFactor();
  } catch (error) {
    console.error('Two-factor authentication setup failed:', error);
    throw error;
  }
};

/**
 * Verifies and enables two-factor authentication
 * 
 * @param code - Verification code from authenticator app
 * @returns Promise resolving to void
 */
export const verifyTwoFactor = async (code: string): Promise<void> => {
  try {
    // Validate verification code
    if (!code) {
      throw new Error('Verification code is required');
    }
    
    // Get current authentication token to ensure user is authenticated
    const token = await getAuthToken();
    if (!token) {
      throw new Error('User not authenticated');
    }
    
    // Make API request to verify and enable 2FA
    await api.auth.verifyTwoFactor(code);
  } catch (error) {
    console.error('Two-factor verification failed:', error);
    throw error;
  }
};

/**
 * Disables two-factor authentication for the user
 * 
 * @param code - Verification code from authenticator app
 * @returns Promise resolving to void
 */
export const disableTwoFactor = async (code: string): Promise<void> => {
  try {
    // Validate verification code
    if (!code) {
      throw new Error('Verification code is required');
    }
    
    // Get current authentication token to ensure user is authenticated
    const token = await getAuthToken();
    if (!token) {
      throw new Error('User not authenticated');
    }
    
    // Make API request to disable 2FA
    await api.auth.disableTwoFactor(code);
  } catch (error) {
    console.error('Two-factor disabling failed:', error);
    throw error;
  }
};

/**
 * Handles OAuth authentication with third-party providers
 * 
 * @param provider - The authentication provider
 * @param code - The authorization code
 * @param redirectUri - The redirect URI used in the OAuth flow
 * @returns Promise resolving to authentication result with user data and tokens
 */
export const loginWithProvider = async (
  provider: AuthProvider,
  code: string,
  redirectUri: string
): Promise<{ user: User; token: string; refreshToken: string }> => {
  try {
    // Validate OAuth parameters
    if (!provider || !code || !redirectUri) {
      throw new Error('Provider, authorization code, and redirect URI are required');
    }
    
    // Make API request to authenticate with OAuth provider
    const response = await api.auth.loginWithProvider(provider, code, redirectUri);
    
    // Store authentication tokens securely
    await saveAuthToken(response.token);
    await saveRefreshToken(response.refreshToken);
    
    // Update cached token for synchronous operations
    updateCachedToken(response.token);
    
    return response;
  } catch (error) {
    console.error('OAuth login failed:', error);
    throw error;
  }
};

/**
 * Generates authorization URL for third-party authentication providers
 * 
 * @param provider - The authentication provider
 * @param redirectUri - The redirect URI for the OAuth flow
 * @returns Authorization URL for the specified provider
 */
export const getAuthProviderUrl = (
  provider: AuthProvider,
  redirectUri: string = `${OAUTH_REDIRECT_SCHEME}/${provider}`
): string => {
  // Create the OAuth URL based on the provider
  let url = '';
  const clientId = getClientIdForProvider(provider);
  
  switch (provider) {
    case AuthProvider.GITHUB:
      url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;
      break;
    case AuthProvider.GOOGLE:
      url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile`;
      break;
    case AuthProvider.LINKEDIN:
      url = `https://www.linkedin.com/oauth/v2/authorization?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=r_liteprofile%20r_emailaddress`;
      break;
    default:
      throw new Error(`Unsupported authentication provider: ${provider}`);
  }
  
  return url;
};

/**
 * Helper function to get client ID for the specified provider
 * 
 * @param provider - The authentication provider
 * @returns Client ID for the specified provider
 */
const getClientIdForProvider = (provider: AuthProvider): string => {
  // In real implementation, these would be stored securely or fetched from a configuration service
  // For now, we'll use placeholder values
  switch (provider) {
    case AuthProvider.GITHUB:
      return 'github_client_id';
    case AuthProvider.GOOGLE:
      return 'google_client_id';
    case AuthProvider.LINKEDIN:
      return 'linkedin_client_id';
    default:
      throw new Error(`Unsupported authentication provider: ${provider}`);
  }
};

/**
 * Handles OAuth redirect and extracts authorization code
 * 
 * @param url - The redirect URL with OAuth parameters
 * @returns Extracted OAuth parameters or null if invalid
 */
export const handleOAuthRedirect = (url: string): { code: string; state: string } | null => {
  try {
    // Parse the URL to extract query parameters
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    
    // Extract authorization code and state parameters
    const code = params.get('code');
    const state = params.get('state');
    
    if (!code) {
      return null;
    }
    
    return {
      code,
      state: state || ''
    };
  } catch (error) {
    console.error('Error handling OAuth redirect:', error);
    return null;
  }
};

/**
 * Enables biometric authentication for the user
 * 
 * @param credentials - User credentials to secure with biometrics
 * @returns Promise resolving to biometric authentication result
 */
export const enableBiometrics = async (
  credentials: AuthCredentials
): Promise<BiometricAuthResult> => {
  try {
    // Check if biometric authentication is available on the device
    const biometricsAvailable = await isBiometricsAvailable();
    if (!biometricsAvailable) {
      return BiometricAuthResult.NOT_AVAILABLE;
    }
    
    // Prompt user for biometric verification to confirm identity
    const authResult = await authenticateWithBiometrics(
      'Authenticate to enable biometric login'
    );
    
    if (authResult !== BiometricAuthResult.SUCCESS) {
      return authResult;
    }
    
    // Create biometric-protected cryptographic keys if needed
    const keysExist = await getBiometricKeysExist();
    if (!keysExist) {
      const keysCreated = await createBiometricKeys();
      if (!keysCreated) {
        return BiometricAuthResult.FAILED;
      }
    }
    
    // Store credentials securely with biometric protection
    const credentialsSaved = await saveBiometricCredentials(credentials);
    if (!credentialsSaved) {
      return BiometricAuthResult.FAILED;
    }
    
    return BiometricAuthResult.SUCCESS;
  } catch (error) {
    console.error('Enabling biometrics failed:', error);
    return BiometricAuthResult.FAILED;
  }
};

/**
 * Disables biometric authentication for the user
 * 
 * @returns Promise resolving to true if biometrics were successfully disabled
 */
export const disableBiometrics = async (): Promise<boolean> => {
  try {
    // Delete biometric-protected credentials from secure storage
    await deleteBiometricCredentials();
    
    // Delete biometric-protected cryptographic keys if they exist
    const keysExist = await getBiometricKeysExist();
    if (keysExist) {
      await deleteBiometricKeys();
    }
    
    return true;
  } catch (error) {
    console.error('Disabling biometrics failed:', error);
    return false;
  }
};

/**
 * Checks if biometric authentication is enabled for the user
 * 
 * @returns Promise resolving to true if biometrics are enabled
 */
export const isBiometricsEnabled = async (): Promise<boolean> => {
  try {
    // Check if biometrics are available on the device
    const biometricsAvailable = await isBiometricsAvailable();
    if (!biometricsAvailable) {
      return false;
    }
    
    // Check if biometric-protected credentials exist in secure storage
    const credentials = await getBiometricCredentials();
    return !!credentials;
  } catch (error) {
    console.error('Error checking if biometrics are enabled:', error);
    return false;
  }
};

/**
 * Determines the type of biometric authentication available on the device
 * 
 * @returns Promise resolving to the type of biometric authentication available
 */
export const availableBiometricType = async (): Promise<BiometricType> => {
  return await getBiometricType();
};

/**
 * Checks if the current user has a specific permission
 * 
 * This function uses the cached token for synchronous permission checks.
 * The cached token is updated by login, loginWithProvider, register, refreshSession, and logout.
 * 
 * @param permission - The permission to check
 * @returns True if the user has the specified permission, false otherwise
 */
export const hasPermission = (permission: AuthPermission): boolean => {
  try {
    // Use the cached token for synchronous permission checks
    if (!cachedToken) {
      return false;
    }
    
    // Decode the JWT token to get the user's role
    const decoded = jwtDecode<JwtPayload>(cachedToken);
    
    // Check if the token is valid and contains role information
    if (!decoded || !decoded.role) {
      return false;
    }
    
    // Look up the permissions for the user's role
    const rolePermissions = RolePermissions[decoded.role];
    if (!rolePermissions) {
      return false;
    }
    
    // Check if the specified permission is included in the role's permissions
    return rolePermissions.includes(permission);
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
};

/**
 * Checks the status of the current authentication session
 * 
 * @returns Promise resolving to the current session status
 */
export const getSessionStatus = async (): Promise<SessionStatus> => {
  try {
    // Retrieve authentication token
    const token = await getAuthToken();
    
    // If no token exists, session is invalid
    if (!token) {
      return SessionStatus.INVALID;
    }
    
    // Check if token is expired
    if (isTokenExpired(token)) {
      return SessionStatus.EXPIRED;
    }
    
    // Token exists and is not expired
    return SessionStatus.ACTIVE;
  } catch (error) {
    console.error('Error getting session status:', error);
    return SessionStatus.INVALID;
  }
};

/**
 * Refreshes the authentication session using the refresh token
 * 
 * @returns Promise resolving to true if session was successfully refreshed
 */
export const refreshSession = async (): Promise<boolean> => {
  try {
    // Get the current refresh token
    const refreshToken = await getRefreshToken();
    
    // If no refresh token exists, cannot refresh session
    if (!refreshToken) {
      return false;
    }
    
    // Make API request to refresh the authentication token
    const response = await api.auth.refreshToken(refreshToken);
    
    // Store new authentication and refresh tokens
    await saveAuthToken(response.token);
    await saveRefreshToken(response.refreshToken);
    
    // Update cached token for synchronous operations
    updateCachedToken(response.token);
    
    return true;
  } catch (error) {
    console.error('Session refresh failed:', error);
    return false;
  }
};

/**
 * Gets the currently authenticated user
 * 
 * @returns Promise resolving to the current user or null if not authenticated
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    // Retrieve authentication token
    const token = await getAuthToken();
    
    // If no token exists, user is not authenticated
    if (!token) {
      return null;
    }
    
    // Check if token is expired
    if (isTokenExpired(token)) {
      // Try to refresh the session
      const refreshed = await refreshSession();
      if (!refreshed) {
        return null;
      }
      
      // Get the new token after refresh
      const newToken = await getAuthToken();
      if (!newToken) {
        return null;
      }
      
      // Decode the new token to get user information
      const decoded = jwtDecode<JwtPayload>(newToken);
      
      // Return user object with essential fields from token
      // Full user object would typically be fetched from an API in a real implementation
      return {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        firstName: '', // These fields are not in the token but required by User type
        lastName: '',
        status: 'ACTIVE',
        authProvider: AuthProvider.LOCAL,
        authProviderId: '',
        twoFactorEnabled: false,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    // Decode the token to get user information
    const decoded = jwtDecode<JwtPayload>(token);
    
    // Return user object with essential fields from token
    // Full user object would typically be fetched from an API in a real implementation
    return {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      firstName: '', // These fields are not in the token but required by User type
      lastName: '',
      status: 'ACTIVE',
      authProvider: AuthProvider.LOCAL,
      authProviderId: '',
      twoFactorEnabled: false,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Re-export permission constants, role permission mappings, and authentication enums
export { 
  Permission, 
  RolePermissions, 
  AuthProvider, 
  BiometricType, 
  BiometricAuthResult, 
  SessionStatus 
};