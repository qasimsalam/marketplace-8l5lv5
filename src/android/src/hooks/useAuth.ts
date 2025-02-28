/**
 * Custom React hook for authentication in the AI Talent Marketplace Android app
 * 
 * Provides a comprehensive set of authentication functions and state for the mobile application,
 * abstracting Redux interactions, handling navigation, integrating biometric authentication,
 * and implementing role-based permission checks.
 * 
 * @version 1.0.0
 */

import { useEffect, useCallback } from 'react'; // react ^18.2.0
import { useNavigation } from '@react-navigation/native'; // @react-navigation/native ^6.1.7

// Import Redux hooks and actions
import { useAppDispatch, useAppSelector } from '../store';
import { 
  loginUser, 
  loginWithBiometricsUser, 
  registerUser, 
  logoutUser, 
  forgotPasswordUser, 
  resetPasswordUser, 
  setupTwoFactorUser, 
  verifyTwoFactorUser, 
  disableTwoFactorUser, 
  loginWithProviderUser, 
  enableBiometricsUser, 
  disableBiometricsUser, 
  setError, 
  clearError 
} from '../store/slices/authSlice';

// Import biometric authentication hook
import { useBiometrics } from './useBiometrics';

// Import types and utilities
import { 
  LoginFormValues, 
  RegisterFormValues, 
  ForgotPasswordFormValues, 
  ResetPasswordFormValues, 
  AuthPermission, 
  AuthProvider 
} from '../types/auth.types';
import { hasPermission } from '../lib/auth';

/**
 * Custom hook that provides authentication functionality for the Android app
 * 
 * @returns Object containing authentication state and methods
 */
export function useAuth() {
  // Initialize Redux hooks
  const dispatch = useAppDispatch();
  const { 
    user, 
    isAuthenticated, 
    loading: isLoading, 
    error, 
    requiresTwoFactor, 
    biometricsEnabled 
  } = useAppSelector(state => state.auth);
  
  // Initialize navigation hook for redirects after auth events
  const navigation = useNavigation();
  
  // Initialize biometrics hook for fingerprint/face authentication
  const biometrics = useBiometrics();
  
  /**
   * Check authentication status on component mount
   */
  useEffect(() => {
    // If user is authenticated and navigation is redirected to login screen,
    // redirect back to the dashboard or appropriate screen
    if (isAuthenticated && user && navigation.getCurrentRoute()?.name === 'Login') {
      navigation.navigate('Dashboard' as never);
    }
  }, [isAuthenticated, user, navigation]);
  
  /**
   * Log in with email and password
   * 
   * @param credentials Login credentials
   * @returns Promise resolving to success status
   */
  const login = useCallback(async (credentials: LoginFormValues): Promise<boolean> => {
    try {
      const result = await dispatch(loginUser(credentials)).unwrap();
      return Boolean(result && result.user);
    } catch (error) {
      return false;
    }
  }, [dispatch]);
  
  /**
   * Log in with biometric authentication (fingerprint/face)
   * 
   * @returns Promise resolving to success status
   */
  const loginWithBiometrics = useCallback(async (): Promise<boolean> => {
    try {
      if (!biometricsEnabled) {
        dispatch(setError('Biometric authentication is not enabled'));
        return false;
      }
      
      const result = await dispatch(loginWithBiometricsUser()).unwrap();
      return Boolean(result && result.user);
    } catch (error) {
      return false;
    }
  }, [dispatch, biometricsEnabled]);
  
  /**
   * Register a new user account
   * 
   * @param userData Registration form data
   * @returns Promise resolving to success status
   */
  const register = useCallback(async (userData: RegisterFormValues): Promise<boolean> => {
    try {
      const result = await dispatch(registerUser(userData)).unwrap();
      return Boolean(result && result.user);
    } catch (error) {
      return false;
    }
  }, [dispatch]);
  
  /**
   * Log out the current user
   * 
   * @returns Promise resolving when logout completes
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      await dispatch(logoutUser()).unwrap();
      navigation.navigate('Login' as never);
    } catch (error) {
      // Even if server-side logout fails, we'll still navigate to login
      navigation.navigate('Login' as never);
    }
  }, [dispatch, navigation]);
  
  /**
   * Initiate password recovery process
   * 
   * @param email User's email address
   * @returns Promise resolving to result with success status and message
   */
  const forgotPassword = useCallback(async (email: string): Promise<{success: boolean; message: string}> => {
    try {
      const result = await dispatch(forgotPasswordUser(email)).unwrap();
      return {
        success: true,
        message: result?.message || 'Password reset instructions have been sent to your email'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An error occurred during password reset request'
      };
    }
  }, [dispatch]);
  
  /**
   * Reset password with token from email
   * 
   * @param data Password reset form data
   * @returns Promise resolving to result with success status and message
   */
  const resetPassword = useCallback(async (data: ResetPasswordFormValues): Promise<{success: boolean; message: string}> => {
    try {
      const result = await dispatch(resetPasswordUser(data)).unwrap();
      return {
        success: true,
        message: result?.message || 'Your password has been reset successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An error occurred during password reset'
      };
    }
  }, [dispatch]);
  
  /**
   * Login with a third-party provider (OAuth)
   * 
   * @param provider OAuth provider (GitHub, LinkedIn, Google)
   * @param code Authorization code from OAuth provider
   * @param redirectUri Redirect URI used in OAuth flow
   * @returns Promise resolving to success status
   */
  const loginWithProvider = useCallback(async (
    provider: AuthProvider,
    code: string,
    redirectUri: string
  ): Promise<boolean> => {
    try {
      const result = await dispatch(loginWithProviderUser({provider, code, redirectUri})).unwrap();
      return Boolean(result && result.user);
    } catch (error) {
      return false;
    }
  }, [dispatch]);
  
  /**
   * Set up two-factor authentication
   * 
   * @returns Promise resolving to 2FA setup information
   */
  const setupTwoFactor = useCallback(async (): Promise<{secret: string; qrCodeUrl: string}> => {
    try {
      const result = await dispatch(setupTwoFactorUser()).unwrap();
      return {
        secret: result.secret,
        qrCodeUrl: result.qrCodeUrl
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to set up two-factor authentication');
    }
  }, [dispatch]);
  
  /**
   * Verify and enable two-factor authentication
   * 
   * @param code Verification code from authenticator app
   * @returns Promise resolving to success status
   */
  const verifyTwoFactor = useCallback(async (code: string): Promise<boolean> => {
    try {
      const result = await dispatch(verifyTwoFactorUser(code)).unwrap();
      return result.success === true;
    } catch (error) {
      return false;
    }
  }, [dispatch]);
  
  /**
   * Disable two-factor authentication
   * 
   * @param code Verification code from authenticator app
   * @returns Promise resolving to success status
   */
  const disableTwoFactor = useCallback(async (code: string): Promise<boolean> => {
    try {
      const result = await dispatch(disableTwoFactorUser(code)).unwrap();
      return result.success === true;
    } catch (error) {
      return false;
    }
  }, [dispatch]);
  
  /**
   * Enable biometric authentication
   * 
   * @returns Promise resolving to success status
   */
  const enableBiometrics = useCallback(async (): Promise<boolean> => {
    try {
      // First check if biometrics are available
      if (!biometrics.isAvailable) {
        dispatch(setError('Biometric authentication is not available on this device'));
        return false;
      }
      
      // Request biometric authentication to verify user identity
      const authResult = await biometrics.authenticate({
        promptTitle: 'Enable Biometric Login',
        promptSubtitle: 'Verify your identity',
        promptDescription: 'This will allow you to log in using biometric authentication',
        cancelButtonText: 'Cancel'
      });
      
      if (authResult !== 'success') {
        return false;
      }
      
      // If authentication successful, enable biometrics
      const result = await dispatch(enableBiometricsUser()).unwrap();
      return result === true;
    } catch (error) {
      return false;
    }
  }, [dispatch, biometrics]);
  
  /**
   * Disable biometric authentication
   * 
   * @returns Promise resolving to success status
   */
  const disableBiometrics = useCallback(async (): Promise<boolean> => {
    try {
      const result = await dispatch(disableBiometricsUser()).unwrap();
      return result === true;
    } catch (error) {
      return false;
    }
  }, [dispatch]);
  
  /**
   * Check if user has a specific permission
   * 
   * @param permission The permission to check
   * @returns True if user has permission, false otherwise
   */
  const checkPermission = useCallback((permission: AuthPermission): boolean => {
    if (!isAuthenticated || !user) {
      return false;
    }
    return hasPermission(permission);
  }, [isAuthenticated, user]);
  
  /**
   * Clear any authentication errors
   */
  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);
  
  // Return auth state and methods in a memoized object
  return useCallback(() => ({
    // Auth state
    user,
    isAuthenticated,
    isLoading,
    error,
    requiresTwoFactor,
    biometricsEnabled,
    
    // Authentication methods
    login,
    loginWithBiometrics,
    register,
    logout,
    forgotPassword,
    resetPassword,
    loginWithProvider,
    
    // Two-factor authentication methods
    setupTwoFactor,
    verifyTwoFactor,
    disableTwoFactor,
    
    // Biometric authentication methods
    enableBiometrics,
    disableBiometrics,
    
    // Permission and error handling
    hasPermission: checkPermission,
    clearError: clearAuthError
  }), [
    user,
    isAuthenticated,
    isLoading,
    error,
    requiresTwoFactor,
    biometricsEnabled,
    login,
    loginWithBiometrics,
    register,
    logout,
    forgotPassword,
    resetPassword,
    loginWithProvider,
    setupTwoFactor,
    verifyTwoFactor,
    disableTwoFactor,
    enableBiometrics,
    disableBiometrics,
    checkPermission,
    clearAuthError
  ])();
}