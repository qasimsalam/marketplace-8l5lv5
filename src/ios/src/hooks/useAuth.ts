/**
 * Custom React hook for authentication in the AI Talent Marketplace iOS app
 * 
 * This hook provides comprehensive authentication functionality including login,
 * registration, session management, biometric authentication, and permission verification.
 * 
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react'; // ^18.2.0
import { AppState } from 'react-native'; // 0.72.x
import { useSelector, useDispatch } from 'react-redux'; // ^8.1.1

// Import types
import { 
  AuthState, 
  LoginFormValues, 
  RegisterFormValues, 
  ResetPasswordFormValues, 
  ChangePasswordFormValues, 
  Permission, 
  AuthPermission, 
  BiometricType 
} from '../types/auth.types';
import { RootState } from '../store';

// Import Redux actions
import { 
  loginUser, 
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
  loginWithBiometricsUser,
  setError,
  clearError 
} from '../store/slices/authSlice';

// Import biometrics hook
import useBiometrics from './useBiometrics';

// Import permission verification function
import { hasPermission } from '../lib/auth';

/**
 * Interface defining the return value of the useAuth hook
 */
export interface UseAuthResult {
  // State
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  requiresTwoFactor: boolean;
  biometricsEnabled: boolean;
  
  // Methods
  login: (credentials: LoginFormValues) => Promise<void>;
  loginWithBiometrics: () => Promise<void>;
  register: (userData: RegisterFormValues) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (data: ResetPasswordFormValues) => Promise<{ success: boolean; message: string }>;
  setupTwoFactor: () => Promise<{ secret: string; qrCodeUrl: string }>;
  verifyTwoFactor: (code: string) => Promise<void>;
  disableTwoFactor: (code: string) => Promise<void>;
  loginWithProvider: (provider: AuthProvider, code: string, redirectUri: string) => Promise<void>;
  enableBiometrics: () => Promise<BiometricAuthResult>;
  disableBiometrics: () => Promise<void>;
  hasPermission: (permission: AuthPermission) => boolean;
  clearError: () => void;
  
  // Biometric info
  biometricType: BiometricType;
}

/**
 * Custom hook that provides authentication functionality for the iOS application
 * 
 * @returns Authentication state and methods
 */
const useAuth = (): UseAuthResult => {
  // Get authentication state from Redux store
  const { 
    isAuthenticated, 
    user, 
    token, 
    loading, 
    error, 
    requiresTwoFactor, 
    biometricsEnabled 
  } = useSelector((state: RootState) => state.auth);
  
  // Get Redux dispatch function
  const dispatch = useDispatch();
  
  // Get biometrics functionality from useBiometrics hook
  const { 
    biometricType, 
    authenticate
  } = useBiometrics();
  
  /**
   * Logs in a user with email and password
   * 
   * @param credentials - Login credentials including email, password, and options
   */
  const login = useCallback(async (credentials: LoginFormValues): Promise<void> => {
    await dispatch(loginUser(credentials));
  }, [dispatch]);
  
  /**
   * Logs in a user with stored biometric credentials
   */
  const loginWithBiometrics = useCallback(async (): Promise<void> => {
    await dispatch(loginWithBiometricsUser());
  }, [dispatch]);
  
  /**
   * Registers a new user
   * 
   * @param userData - Registration form data
   */
  const register = useCallback(async (userData: RegisterFormValues): Promise<void> => {
    await dispatch(registerUser(userData));
  }, [dispatch]);
  
  /**
   * Logs out the current user
   */
  const logout = useCallback(async (): Promise<void> => {
    await dispatch(logoutUser());
  }, [dispatch]);
  
  /**
   * Initiates password recovery for a user
   * 
   * @param email - User's email address
   * @returns Object with success status and message
   */
  const forgotPassword = useCallback(async (email: string): Promise<{ success: boolean; message: string }> => {
    const resultAction = await dispatch(forgotPasswordUser(email));
    
    if (forgotPasswordUser.fulfilled.match(resultAction)) {
      return resultAction.payload;
    }
    
    throw new Error(resultAction.payload as string || 'Password recovery failed');
  }, [dispatch]);
  
  /**
   * Resets a user's password with a reset token
   * 
   * @param data - Reset password form data
   * @returns Object with success status and message
   */
  const resetPassword = useCallback(async (data: ResetPasswordFormValues): Promise<{ success: boolean; message: string }> => {
    const resultAction = await dispatch(resetPasswordUser(data));
    
    if (resetPasswordUser.fulfilled.match(resultAction)) {
      return resultAction.payload;
    }
    
    throw new Error(resultAction.payload as string || 'Password reset failed');
  }, [dispatch]);
  
  /**
   * Sets up two-factor authentication
   * 
   * @returns 2FA setup data (secret and QR code URL)
   */
  const setupTwoFactor = useCallback(async (): Promise<{ secret: string; qrCodeUrl: string }> => {
    const resultAction = await dispatch(setupTwoFactorUser());
    
    if (setupTwoFactorUser.fulfilled.match(resultAction)) {
      return resultAction.payload;
    }
    
    throw new Error(resultAction.payload as string || 'Two-factor setup failed');
  }, [dispatch]);
  
  /**
   * Verifies and enables two-factor authentication
   * 
   * @param code - Verification code from authenticator app
   */
  const verifyTwoFactor = useCallback(async (code: string): Promise<void> => {
    await dispatch(verifyTwoFactorUser(code));
  }, [dispatch]);
  
  /**
   * Disables two-factor authentication
   * 
   * @param code - Verification code from authenticator app
   */
  const disableTwoFactor = useCallback(async (code: string): Promise<void> => {
    await dispatch(disableTwoFactorUser(code));
  }, [dispatch]);
  
  /**
   * Authenticates a user with a third-party provider (OAuth)
   * 
   * @param provider - The authentication provider (GitHub, Google, LinkedIn)
   * @param code - The authorization code from the provider
   * @param redirectUri - The redirect URI used in the OAuth flow
   */
  const loginWithProvider = useCallback(async (
    provider: AuthProvider, 
    code: string, 
    redirectUri: string
  ): Promise<void> => {
    await dispatch(loginWithProviderUser({ provider, code, redirectUri }));
  }, [dispatch]);
  
  /**
   * Enables biometric authentication for the user
   * 
   * @returns Biometric authentication result
   */
  const enableBiometrics = useCallback(async (): Promise<BiometricAuthResult> => {
    // First authenticate with biometrics to confirm user identity
    const authResult = await authenticate('Authenticate to enable biometric login');
    
    if (authResult !== BiometricAuthResult.SUCCESS) {
      return authResult;
    }

    // Get stored credentials (in a real implementation, these would come from secure storage)
    const credentials = { 
      email: user?.email || '', 
      password: 'stored-password' // In a real app, this would be securely retrieved
    };
    
    const resultAction = await dispatch(enableBiometricsUser(credentials));
    
    if (enableBiometricsUser.fulfilled.match(resultAction)) {
      return resultAction.payload;
    }
    
    return BiometricAuthResult.FAILED;
  }, [dispatch, user, authenticate]);
  
  /**
   * Disables biometric authentication for the user
   */
  const disableBiometrics = useCallback(async (): Promise<void> => {
    await dispatch(disableBiometricsUser());
  }, [dispatch]);
  
  /**
   * Checks if the user has a specific permission
   * 
   * @param permission - The permission to check
   * @returns True if the user has the permission, false otherwise
   */
  const checkPermission = useCallback((permission: AuthPermission): boolean => {
    return hasPermission(permission);
  }, []);
  
  /**
   * Clears any authentication errors
   */
  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);
  
  // Set up AppState listener to check session validity when app comes to foreground
  useEffect(() => {
    if (isAuthenticated) {
      const subscription = AppState.addEventListener('change', nextAppState => {
        if (nextAppState === 'active') {
          // When app comes to foreground, check session validity
          // In a real implementation, we would dispatch a checkAuth action
          // Example: dispatch(checkAuth());
        }
      });
      
      return () => {
        subscription.remove();
      };
    }
  }, [isAuthenticated]);
  
  // Return authentication state and methods
  return {
    // State
    isAuthenticated,
    user,
    token,
    loading,
    error,
    requiresTwoFactor,
    biometricsEnabled,
    
    // Methods
    login,
    loginWithBiometrics,
    register,
    logout,
    forgotPassword,
    resetPassword,
    setupTwoFactor,
    verifyTwoFactor,
    disableTwoFactor,
    loginWithProvider,
    enableBiometrics,
    disableBiometrics,
    hasPermission: checkPermission,
    clearError: clearAuthError,
    
    // Biometric info
    biometricType
  };
};

export default useAuth;