/**
 * Authentication Library for Android Mobile Application
 * 
 * This module provides secure authentication services for the AI Talent Marketplace
 * mobile application, implementing login flows, token management, biometric authentication,
 * and role-based access control.
 * 
 * Security features:
 * - JWT token-based authentication with secure storage
 * - Biometric authentication (fingerprint, face recognition)
 * - Two-factor authentication support
 * - Offline authentication capabilities
 * - Permission-based access control
 * 
 * @version 1.0.0
 */

// Import type definitions
import { 
  LoginFormValues, 
  RegisterFormValues, 
  ForgotPasswordFormValues, 
  ResetPasswordFormValues, 
  ChangePasswordFormValues, 
  TwoFactorVerifyFormValues, 
  BiometricAuthResult, 
  BiometricType, 
  AuthProvider, 
  JwtPayload, 
  Permission, 
  AuthPermission, 
  AuthCredentials,
  AuthState
} from '../types/auth.types';

// Import API utilities
import api from './axios';
import { refreshAuthToken as refreshAuthTokenRequest, handleAxiosError } from './axios';

// Import secure storage utilities
import { 
  saveAuthToken, 
  getAuthToken, 
  deleteAuthToken, 
  saveRefreshToken, 
  getRefreshToken, 
  deleteRefreshToken, 
  saveUserCredentials, 
  getUserCredentials, 
  deleteUserCredentials, 
  saveBiometricCredentials, 
  getBiometricCredentials, 
  deleteBiometricCredentials, 
  clearAllSecureItems 
} from '../utils/keychain';

// Import biometric authentication utilities
import { 
  isBiometricAvailable, 
  getBiometricType, 
  authenticateWithBiometrics 
} from '../utils/biometrics';

// Import external libraries
import jwt_decode from 'jwt-decode'; // jwt-decode ^3.1.2
import AsyncStorage from '@react-native-async-storage/async-storage'; // @react-native-async-storage/async-storage ^1.19.1
import NetInfo from '@react-native-community/netinfo'; // @react-native-community/netinfo ^9.3.10

// API Endpoints for authentication
const API_ENDPOINTS = { 
  LOGIN: '/auth/login', 
  REGISTER: '/auth/register', 
  LOGOUT: '/auth/logout', 
  REFRESH_TOKEN: '/auth/refresh', 
  FORGOT_PASSWORD: '/auth/forgot-password', 
  RESET_PASSWORD: '/auth/reset-password', 
  CHANGE_PASSWORD: '/auth/change-password', 
  VERIFY_EMAIL: '/auth/verify-email', 
  TWO_FACTOR_SETUP: '/auth/2fa/setup', 
  TWO_FACTOR_VERIFY: '/auth/2fa/verify', 
  TWO_FACTOR_DISABLE: '/auth/2fa/disable', 
  OAUTH: '/auth/oauth' 
};

// Key for persisting auth state in AsyncStorage
const AUTH_PERSIST_KEY = 'auth_state';

// Threshold time before token expiry when refresh should occur (5 minutes)
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000;

// Timeout for offline authentication (5 days)
const OFFLINE_AUTH_TIMEOUT = 5 * 24 * 60 * 60 * 1000;

/**
 * Authenticates a user with email and password
 * 
 * @param credentials User login credentials
 * @returns Authentication result with user data and tokens
 */
export async function login(credentials: LoginFormValues): Promise<{ user: any; token: string; refreshToken: string }> {
  try {
    // Validate credentials format
    if (!credentials.email || !credentials.password) {
      throw new Error('Email and password are required');
    }
    
    // Check for offline mode if network is unavailable
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      const offlineResult = await handleOfflineAuthentication(credentials);
      if (offlineResult) {
        return offlineResult;
      }
      throw new Error('No network connection available and offline login failed');
    }
    
    // Send login request to server
    const response = await api.post(API_ENDPOINTS.LOGIN, {
      email: credentials.email,
      password: credentials.password
    });
    
    // Extract response data
    const { user, token, refreshToken } = response.data;
    
    // Store authentication tokens securely
    await saveAuthToken(token);
    await saveRefreshToken(refreshToken);
    
    // Store credentials for future use if remember is enabled
    if (credentials.remember) {
      await saveUserCredentials({
        email: credentials.email,
        password: credentials.password
      });
    }
    
    // Enable biometric authentication if requested
    if (credentials.useBiometrics) {
      await saveBiometricCredentials({
        email: credentials.email,
        password: credentials.password
      });
    }
    
    // Store auth state for offline access
    await AsyncStorage.setItem(AUTH_PERSIST_KEY, JSON.stringify({
      isAuthenticated: true,
      user,
      token,
      refreshToken,
      loading: false,
      error: null,
      requiresTwoFactor: false,
      biometricsEnabled: credentials.useBiometrics
    }));
    
    // Return authentication result
    return { user, token, refreshToken };
  } catch (error) {
    const errorDetails = handleAxiosError(error);
    throw new Error(errorDetails.message || 'Login failed. Please check your credentials and try again.');
  }
}

/**
 * Authenticates a user using biometric authentication (fingerprint, face)
 * 
 * @returns Authentication result or null if biometrics fail
 */
export async function loginWithBiometrics(): Promise<{ user: any; token: string; refreshToken: string } | null> {
  try {
    // Check if biometric authentication is available
    const isBiometricAvail = await isBiometricAvailable();
    if (!isBiometricAvail) {
      console.warn('Biometric authentication is not available on this device');
      return null;
    }
    
    // Get the type of biometric available
    const biometricType = await getBiometricType();
    if (biometricType === BiometricType.NONE) {
      console.warn('No biometric authentication methods available');
      return null;
    }
    
    // Prompt for biometric authentication
    const authResult = await authenticateWithBiometrics({
      promptTitle: 'Sign in to AI Talent Marketplace',
      promptSubtitle: `Authenticate using your ${biometricType.toLowerCase()}`,
      promptDescription: 'Please verify your identity to continue',
      cancelButtonText: 'Use Password Instead'
    });
    
    // Check the result of biometric authentication
    if (authResult !== BiometricAuthResult.SUCCESS) {
      console.warn('Biometric authentication failed or was cancelled');
      return null;
    }
    
    // Retrieve stored credentials for biometric authentication
    const credentials = await getBiometricCredentials();
    if (!credentials) {
      console.warn('No stored credentials for biometric authentication');
      return null;
    }
    
    // Use the stored credentials to log in
    return await login({
      email: credentials.email,
      password: credentials.password,
      remember: true,
      useBiometrics: true
    });
  } catch (error) {
    console.error('Error during biometric authentication:', error);
    return null;
  }
}

/**
 * Registers a new user account
 * 
 * @param userData Registration form data
 * @returns Registration result with user data and tokens
 */
export async function register(userData: RegisterFormValues): Promise<{ user: any; token: string; refreshToken: string }> {
  try {
    // Validate registration data
    if (!userData.email || !userData.password || !userData.confirmPassword) {
      throw new Error('Email and password are required');
    }
    
    if (userData.password !== userData.confirmPassword) {
      throw new Error('Passwords do not match');
    }
    
    if (!userData.agreeToTerms) {
      throw new Error('You must agree to the terms and conditions');
    }
    
    // Send registration request to server
    const response = await api.post(API_ENDPOINTS.REGISTER, {
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role
    });
    
    // Extract response data
    const { user, token, refreshToken } = response.data;
    
    // Store authentication tokens securely
    await saveAuthToken(token);
    await saveRefreshToken(refreshToken);
    
    // Store credentials for biometric authentication if enabled
    if (userData.enableBiometrics) {
      await saveBiometricCredentials({
        email: userData.email,
        password: userData.password
      });
    }
    
    // Store auth state for offline access
    await AsyncStorage.setItem(AUTH_PERSIST_KEY, JSON.stringify({
      isAuthenticated: true,
      user,
      token,
      refreshToken,
      loading: false,
      error: null,
      requiresTwoFactor: false,
      biometricsEnabled: userData.enableBiometrics
    }));
    
    // Return registration result
    return { user, token, refreshToken };
  } catch (error) {
    const errorDetails = handleAxiosError(error);
    throw new Error(errorDetails.message || 'Registration failed. Please try again.');
  }
}

/**
 * Logs out the current user
 * 
 * @returns True if logout successful
 */
export async function logout(): Promise<boolean> {
  try {
    // Get current refresh token
    const refreshToken = await getRefreshToken();
    
    // If there's a token, send logout request to invalidate it on server
    if (refreshToken) {
      try {
        await api.post(API_ENDPOINTS.LOGOUT, { refreshToken });
      } catch (error) {
        // Continue with local logout even if the server request fails
        console.warn('Server logout failed, continuing with local logout:', error);
      }
    }
    
    // Clear all authentication data from secure storage
    await deleteAuthToken();
    await deleteRefreshToken();
    await deleteUserCredentials();
    await deleteBiometricCredentials();
    
    // Clear persisted auth state
    await AsyncStorage.removeItem(AUTH_PERSIST_KEY);
    
    return true;
  } catch (error) {
    console.error('Error during logout:', error);
    // Still consider logout successful if we cleared local data
    return true;
  }
}

/**
 * Initiates password recovery process
 * 
 * @param email User's email address
 * @returns Result of password recovery request
 */
export async function forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
  try {
    // Validate email format
    if (!email || !email.includes('@')) {
      throw new Error('Valid email address is required');
    }
    
    // Send forgot password request to server
    const response = await api.post(API_ENDPOINTS.FORGOT_PASSWORD, { email });
    
    // Return success response
    return {
      success: true,
      message: response.data.message || 'Password reset instructions have been sent to your email'
    };
  } catch (error) {
    const errorDetails = handleAxiosError(error);
    return {
      success: false,
      message: errorDetails.message || 'Failed to process password reset request'
    };
  }
}

/**
 * Resets password using token from email
 * 
 * @param data Password reset data including token and new password
 * @returns Result of password reset
 */
export async function resetPassword(data: ResetPasswordFormValues): Promise<{ success: boolean; message: string }> {
  try {
    // Validate password format and matching
    if (!data.password || !data.confirmPassword) {
      throw new Error('Password and confirmation are required');
    }
    
    if (data.password !== data.confirmPassword) {
      throw new Error('Passwords do not match');
    }
    
    if (!data.token) {
      throw new Error('Reset token is required');
    }
    
    // Send password reset request to server
    const response = await api.post(API_ENDPOINTS.RESET_PASSWORD, {
      token: data.token,
      password: data.password
    });
    
    // Return success response
    return {
      success: true,
      message: response.data.message || 'Your password has been reset successfully'
    };
  } catch (error) {
    const errorDetails = handleAxiosError(error);
    return {
      success: false,
      message: errorDetails.message || 'Failed to reset password'
    };
  }
}

/**
 * Changes password for authenticated user
 * 
 * @param data Password change data including current and new password
 * @returns Result of password change
 */
export async function changePassword(data: ChangePasswordFormValues): Promise<{ success: boolean; message: string }> {
  try {
    // Validate password format and matching
    if (!data.currentPassword || !data.newPassword || !data.confirmPassword) {
      throw new Error('Current password and new password are required');
    }
    
    if (data.newPassword !== data.confirmPassword) {
      throw new Error('New passwords do not match');
    }
    
    // Get auth token for authenticated request
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // Send password change request to server
    const response = await api.put(API_ENDPOINTS.CHANGE_PASSWORD, {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword
    });
    
    // Update stored credentials if they exist
    const storedCredentials = await getUserCredentials();
    if (storedCredentials) {
      await saveUserCredentials({
        email: storedCredentials.email,
        password: data.newPassword
      });
    }
    
    // Update biometric credentials if they exist
    const biometricCredentials = await getBiometricCredentials();
    if (biometricCredentials) {
      await saveBiometricCredentials({
        email: biometricCredentials.email,
        password: data.newPassword
      });
    }
    
    // Return success response
    return {
      success: true,
      message: response.data.message || 'Your password has been changed successfully'
    };
  } catch (error) {
    const errorDetails = handleAxiosError(error);
    return {
      success: false,
      message: errorDetails.message || 'Failed to change password'
    };
  }
}

/**
 * Verifies email address using token from verification email
 * 
 * @param token Email verification token
 * @returns True if verification successful
 */
export async function verifyEmail(token: string): Promise<boolean> {
  try {
    // Validate token
    if (!token) {
      throw new Error('Verification token is required');
    }
    
    // Send email verification request to server
    await api.get(`${API_ENDPOINTS.VERIFY_EMAIL}?token=${encodeURIComponent(token)}`);
    
    // Return success
    return true;
  } catch (error) {
    console.error('Email verification failed:', error);
    return false;
  }
}

/**
 * Sets up two-factor authentication
 * 
 * @returns 2FA setup information
 */
export async function setupTwoFactor(): Promise<{ secret: string; qrCodeUrl: string }> {
  try {
    // Get auth token for authenticated request
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // Send 2FA setup request to server
    const response = await api.get(API_ENDPOINTS.TWO_FACTOR_SETUP);
    
    // Extract and return 2FA setup info
    const { secret, qrCodeUrl } = response.data;
    if (!secret || !qrCodeUrl) {
      throw new Error('Invalid server response for 2FA setup');
    }
    
    return { secret, qrCodeUrl };
  } catch (error) {
    const errorDetails = handleAxiosError(error);
    throw new Error(errorDetails.message || 'Failed to set up two-factor authentication');
  }
}

/**
 * Verifies and enables two-factor authentication
 * 
 * @param code Verification code from authenticator app
 * @returns True if verification successful
 */
export async function verifyTwoFactor(code: string): Promise<boolean> {
  try {
    // Validate verification code
    if (!code) {
      throw new Error('Verification code is required');
    }
    
    // Get auth token for authenticated request
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // Send 2FA verification request to server
    await api.post(API_ENDPOINTS.TWO_FACTOR_VERIFY, { code });
    
    // Update stored auth state with 2FA enabled
    const authStateString = await AsyncStorage.getItem(AUTH_PERSIST_KEY);
    if (authStateString) {
      const authState = JSON.parse(authStateString) as AuthState;
      if (authState.user) {
        authState.user.twoFactorEnabled = true;
        await AsyncStorage.setItem(AUTH_PERSIST_KEY, JSON.stringify(authState));
      }
    }
    
    // Return success
    return true;
  } catch (error) {
    console.error('Two-factor verification failed:', error);
    return false;
  }
}

/**
 * Disables two-factor authentication
 * 
 * @param code Verification code from authenticator app
 * @returns True if 2FA disabled successfully
 */
export async function disableTwoFactor(code: string): Promise<boolean> {
  try {
    // Validate verification code
    if (!code) {
      throw new Error('Verification code is required');
    }
    
    // Get auth token for authenticated request
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // Send 2FA disable request to server
    await api.post(API_ENDPOINTS.TWO_FACTOR_DISABLE, { code });
    
    // Update stored auth state with 2FA disabled
    const authStateString = await AsyncStorage.getItem(AUTH_PERSIST_KEY);
    if (authStateString) {
      const authState = JSON.parse(authStateString) as AuthState;
      if (authState.user) {
        authState.user.twoFactorEnabled = false;
        await AsyncStorage.setItem(AUTH_PERSIST_KEY, JSON.stringify(authState));
      }
    }
    
    // Return success
    return true;
  } catch (error) {
    console.error('Failed to disable two-factor authentication:', error);
    return false;
  }
}

/**
 * Authenticates user with a third-party OAuth provider
 * 
 * @param provider OAuth provider (GitHub, LinkedIn, Google)
 * @param code Authorization code from OAuth provider
 * @param redirectUri Redirect URI used in OAuth flow
 * @returns Authentication result with user data and tokens
 */
export async function loginWithProvider(
  provider: AuthProvider, 
  code: string, 
  redirectUri: string
): Promise<{ user: any; token: string; refreshToken: string }> {
  try {
    // Validate parameters
    if (!provider || !code || !redirectUri) {
      throw new Error('Provider, code, and redirectUri are required');
    }
    
    // Send OAuth authentication request to server
    const response = await api.post(API_ENDPOINTS.OAUTH, {
      provider,
      code,
      redirectUri
    });
    
    // Extract response data
    const { user, token, refreshToken } = response.data;
    
    // Store authentication tokens securely
    await saveAuthToken(token);
    await saveRefreshToken(refreshToken);
    
    // Store auth state for offline access
    await AsyncStorage.setItem(AUTH_PERSIST_KEY, JSON.stringify({
      isAuthenticated: true,
      user,
      token,
      refreshToken,
      loading: false,
      error: null,
      requiresTwoFactor: false,
      biometricsEnabled: false
    }));
    
    // Return authentication result
    return { user, token, refreshToken };
  } catch (error) {
    const errorDetails = handleAxiosError(error);
    throw new Error(errorDetails.message || `Failed to authenticate with ${provider}`);
  }
}

/**
 * Generates OAuth authorization URL for a provider
 * 
 * @param provider OAuth provider (GitHub, LinkedIn, Google)
 * @param redirectUri Redirect URI for OAuth callback
 * @param state Random state parameter for security
 * @returns OAuth authorization URL
 */
export async function getOAuthUrl(
  provider: AuthProvider, 
  redirectUri: string, 
  state: string
): Promise<string> {
  try {
    // Validate parameters
    if (!provider || !redirectUri || !state) {
      throw new Error('Provider, redirectUri, and state are required');
    }
    
    // Get OAuth URL from server
    const response = await api.get(
      `${API_ENDPOINTS.OAUTH}/url?provider=${provider}&redirectUri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`
    );
    
    // Return the OAuth URL
    return response.data.url;
  } catch (error) {
    const errorDetails = handleAxiosError(error);
    throw new Error(errorDetails.message || `Failed to get OAuth URL for ${provider}`);
  }
}

/**
 * Enables biometric authentication for the user
 * 
 * @returns Result of enabling biometrics
 */
export async function enableBiometrics(): Promise<BiometricAuthResult> {
  try {
    // Check if biometric authentication is available
    const isBiometricAvail = await isBiometricAvailable();
    if (!isBiometricAvail) {
      console.warn('Biometric authentication is not available on this device');
      return BiometricAuthResult.NOT_AVAILABLE;
    }
    
    // Get stored user credentials
    const credentials = await getUserCredentials();
    if (!credentials) {
      console.warn('No stored credentials available for biometric setup');
      return BiometricAuthResult.FAILED;
    }
    
    // Prompt for biometric authentication to verify identity
    const authResult = await authenticateWithBiometrics({
      promptTitle: 'Enable Biometric Login',
      promptSubtitle: 'Verify your identity',
      promptDescription: 'This will allow you to log in using biometric authentication',
      cancelButtonText: 'Cancel'
    });
    
    // If authentication successful, store credentials for biometric login
    if (authResult === BiometricAuthResult.SUCCESS) {
      await saveBiometricCredentials(credentials);
      
      // Update stored auth state with biometrics enabled
      const authStateString = await AsyncStorage.getItem(AUTH_PERSIST_KEY);
      if (authStateString) {
        const authState = JSON.parse(authStateString) as AuthState;
        authState.biometricsEnabled = true;
        await AsyncStorage.setItem(AUTH_PERSIST_KEY, JSON.stringify(authState));
      }
      
      return BiometricAuthResult.SUCCESS;
    }
    
    return authResult;
  } catch (error) {
    console.error('Error enabling biometric authentication:', error);
    return BiometricAuthResult.FAILED;
  }
}

/**
 * Disables biometric authentication for the user
 * 
 * @returns True if biometrics disabled successfully
 */
export async function disableBiometrics(): Promise<boolean> {
  try {
    // Delete stored biometric credentials
    await deleteBiometricCredentials();
    
    // Update stored auth state with biometrics disabled
    const authStateString = await AsyncStorage.getItem(AUTH_PERSIST_KEY);
    if (authStateString) {
      const authState = JSON.parse(authStateString) as AuthState;
      authState.biometricsEnabled = false;
      await AsyncStorage.setItem(AUTH_PERSIST_KEY, JSON.stringify(authState));
    }
    
    return true;
  } catch (error) {
    console.error('Error disabling biometric authentication:', error);
    return false;
  }
}

/**
 * Checks which biometric authentication methods are available on the device
 * 
 * @returns Type of available biometric authentication
 */
export async function availableBiometricType(): Promise<BiometricType> {
  try {
    return await getBiometricType();
  } catch (error) {
    console.error('Error getting available biometric type:', error);
    return BiometricType.NONE;
  }
}

/**
 * Refreshes authentication token when expired
 * 
 * @returns New token if refresh successful, null otherwise
 */
export async function refreshToken(): Promise<string | null> {
  try {
    // Get current refresh token
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      console.warn('No refresh token available');
      return null;
    }
    
    // Attempt to refresh the token
    const newToken = await refreshAuthTokenRequest();
    
    // If successful, update the auth state
    if (newToken) {
      const authStateString = await AsyncStorage.getItem(AUTH_PERSIST_KEY);
      if (authStateString) {
        const authState = JSON.parse(authStateString) as AuthState;
        authState.token = newToken;
        await AsyncStorage.setItem(AUTH_PERSIST_KEY, JSON.stringify(authState));
      }
    }
    
    // Return the new token if successful
    return newToken;
  } catch (error) {
    console.error('Token refresh failed:', error);
    
    // Clean up by deleting the tokens since they're no longer valid
    await deleteAuthToken();
    await deleteRefreshToken();
    
    return null;
  }
}

/**
 * Checks if current user has a specific permission
 * 
 * @param permission The permission to check
 * @returns True if user has permission, false otherwise
 */
export function hasPermission(permission: AuthPermission): boolean {
  try {
    // Get the cached auth state from memory
    // Note: In a real implementation, this would access a cached copy of permissions
    // that's updated whenever the auth state changes
    
    // This is a simplified implementation for demonstration purposes
    // In production, you would maintain a cached copy of the current user's permissions
    const cachedToken = localStorage.getItem('cached_token');
    if (!cachedToken) {
      return false;
    }
    
    try {
      // Decode the token to get user role
      const decoded = jwt_decode<JwtPayload>(cachedToken);
      
      // Check if the token is valid and contains role information
      if (!decoded || !decoded.role) {
        return false;
      }
      
      // Get permissions for the user's role and check if they include the requested permission
      const rolePermissions = RolePermissions[decoded.role];
      return rolePermissions.includes(permission);
    } catch (decodeError) {
      console.error('Error decoding token for permission check:', decodeError);
      return false;
    }
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Gets the current authentication state from secure storage
 * 
 * @returns Current auth state if available, null otherwise
 */
export async function getAuthState(): Promise<AuthState | null> {
  try {
    // Get current authentication token
    const token = await getAuthToken();
    if (!token) {
      return null;
    }
    
    try {
      // Decode the token to get user information
      const decoded = jwt_decode<JwtPayload>(token);
      
      // Check if token is expired
      const currentTime = Date.now() / 1000;
      
      // If token is expired, return null
      if (decoded.exp < currentTime) {
        console.warn('Token is expired');
        return null;
      }
      
      // If token is about to expire, try to refresh it
      if (decoded.exp - currentTime < TOKEN_REFRESH_THRESHOLD / 1000) {
        console.log('Token is about to expire, attempting to refresh');
        const newToken = await refreshToken();
        
        // If refresh successful, get new token information
        if (newToken) {
          const newDecoded = jwt_decode<JwtPayload>(newToken);
          
          // Get refresh token
          const refreshToken = await getRefreshToken();
          
          // Check if biometric authentication is enabled
          const biometricCredentials = await getBiometricCredentials();
          
          // Use previously stored auth state if available
          const authStateString = await AsyncStorage.getItem(AUTH_PERSIST_KEY);
          let user = null;
          
          if (authStateString) {
            const storedAuthState = JSON.parse(authStateString) as AuthState;
            user = storedAuthState.user;
          }
          
          // Return updated auth state
          return {
            isAuthenticated: true,
            user: user || {
              id: newDecoded.sub,
              email: newDecoded.email,
              role: newDecoded.role,
            },
            token: newToken,
            refreshToken,
            loading: false,
            error: null,
            requiresTwoFactor: false,
            biometricsEnabled: biometricCredentials !== null
          };
        }
      }
      
      // Get refresh token
      const refreshToken = await getRefreshToken();
      
      // Check if biometric authentication is enabled
      const biometricCredentials = await getBiometricCredentials();
      
      // Use previously stored auth state if available
      const authStateString = await AsyncStorage.getItem(AUTH_PERSIST_KEY);
      let user = null;
      
      if (authStateString) {
        const storedAuthState = JSON.parse(authStateString) as AuthState;
        user = storedAuthState.user;
      }
      
      // Store token in localStorage for permission checks
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('cached_token', token);
      }
      
      // Return current auth state
      return {
        isAuthenticated: true,
        user: user || {
          id: decoded.sub,
          email: decoded.email,
          role: decoded.role,
        },
        token,
        refreshToken,
        loading: false,
        error: null,
        requiresTwoFactor: false,
        biometricsEnabled: biometricCredentials !== null
      };
    } catch (decodeError) {
      console.error('Error decoding token:', decodeError);
      
      // Delete invalid token
      await deleteAuthToken();
      await deleteRefreshToken();
      
      return null;
    }
  } catch (error) {
    console.error('Error getting auth state:', error);
    return null;
  }
}

/**
 * Handles authentication when device is offline
 * 
 * @param credentials User login credentials
 * @returns Cached authentication data or null
 */
export async function handleOfflineAuthentication(
  credentials: LoginFormValues
): Promise<{ user: any; token: string; refreshToken: string } | null> {
  try {
    // Check if network is available
    const networkState = await NetInfo.fetch();
    if (networkState.isConnected) {
      // If network is available, don't use offline authentication
      return null;
    }
    
    // Get stored auth state
    const authStateString = await AsyncStorage.getItem(AUTH_PERSIST_KEY);
    if (!authStateString) {
      return null;
    }
    
    // Parse stored auth state
    const authState = JSON.parse(authStateString) as AuthState;
    
    // Get stored credentials
    const storedCredentials = await getUserCredentials();
    if (!storedCredentials) {
      return null;
    }
    
    // Verify that provided credentials match stored credentials
    if (
      credentials.email !== storedCredentials.email ||
      credentials.password !== storedCredentials.password
    ) {
      return null;
    }
    
    // Check if stored token is still valid for offline use
    try {
      if (!authState.token) {
        return null;
      }
      
      const decoded = jwt_decode<JwtPayload>(authState.token);
      const tokenIssueTime = decoded.iat * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      
      // Check if offline session is still valid within the timeout period
      if (currentTime - tokenIssueTime > OFFLINE_AUTH_TIMEOUT) {
        console.warn('Offline authentication session has expired');
        return null;
      }
      
      // Return cached authentication data
      return {
        user: authState.user!,
        token: authState.token,
        refreshToken: authState.refreshToken!
      };
    } catch (decodeError) {
      console.error('Error decoding offline token:', decodeError);
      return null;
    }
  } catch (error) {
    console.error('Error during offline authentication:', error);
    return null;
  }
}