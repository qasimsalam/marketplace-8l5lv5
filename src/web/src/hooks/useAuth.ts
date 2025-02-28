/**
 * Custom React hook that provides authentication functionality for the AI Talent Marketplace web application.
 * Simplifies interaction with Redux auth state and provides methods for login, registration, logout,
 * password management, OAuth authentication, and permission checking.
 * 
 * @version 1.0.0
 */

import { useEffect } from 'react'; // React v18.2.0
import { useAppDispatch, useAppSelector } from '../store';
import { 
  login, register, logout, getCurrentUser, forgotPassword, resetPassword, 
  loginWithProvider, setupTwoFactor, verifyTwoFactor, disableTwoFactor,
  selectAuth, selectUser, selectIsAuthenticated, selectAuthLoading, 
  selectAuthError, selectRequiresTwoFactor, clearError
} from '../store/slices/authSlice';
import useToast from './useToast';
import { 
  LoginFormValues, RegisterFormValues, ForgotPasswordFormValues, 
  ResetPasswordFormValues, AuthPermission 
} from '../types/auth';
import { User, UserRole, AuthProvider } from '../../../backend/shared/src/types/user.types';
import { hasPermission } from '../lib/auth';

/**
 * Custom hook that provides authentication functionality and state for the application
 * 
 * @returns Object containing auth state and authentication methods
 */
export const useAuth = () => {
  // Initialize Redux hooks
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const requiresTwoFactor = useAppSelector(selectRequiresTwoFactor);
  
  // Initialize toast notifications
  const toast = useToast();

  // Check user authentication status on component mount
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      dispatch(getCurrentUser())
        .unwrap()
        .catch(() => {
          // Silent failure - just means the user isn't logged in
          // No need to show error message to user
        });
    }
  }, [dispatch, isAuthenticated, isLoading]);

  /**
   * Logs a user in with email and password
   * 
   * @param credentials - Login credentials (email, password, remember)
   * @returns Promise resolving to the authenticated user or rejecting with error
   */
  const handleLogin = async (credentials: LoginFormValues): Promise<User> => {
    try {
      const result = await dispatch(login(credentials)).unwrap();
      toast.success('Logged in successfully');
      return result.user;
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Login failed. Please try again.';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Registers a new user
   * 
   * @param userData - Registration data
   * @returns Promise resolving to the registered user or rejecting with error
   */
  const handleRegister = async (userData: RegisterFormValues): Promise<User> => {
    try {
      const result = await dispatch(register(userData)).unwrap();
      toast.success('Registration successful');
      return result.user;
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Registration failed. Please try again.';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Logs the current user out
   * 
   * @returns Promise resolving when logout completes or rejecting with error
   */
  const handleLogout = async (): Promise<void> => {
    try {
      await dispatch(logout()).unwrap();
      toast.success('Logged out successfully');
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Logout failed. Please try again.';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Initiates password reset process
   * 
   * @param data - Email address for reset
   * @returns Promise resolving when request is sent or rejecting with error
   */
  const handleForgotPassword = async (data: ForgotPasswordFormValues): Promise<void> => {
    try {
      await dispatch(forgotPassword(data)).unwrap();
      toast.success('Password reset instructions sent to your email');
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Password reset request failed. Please try again.';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Completes password reset with token and new password
   * 
   * @param data - Reset token and new password
   * @returns Promise resolving when password is reset or rejecting with error
   */
  const handleResetPassword = async (data: ResetPasswordFormValues): Promise<void> => {
    try {
      await dispatch(resetPassword(data)).unwrap();
      toast.success('Password has been reset successfully. You can now log in.');
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Password reset failed. Please try again.';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Logs in using a third-party provider
   * 
   * @param provider - Authentication provider (GitHub, LinkedIn, Google)
   * @param code - Authorization code from provider
   * @returns Promise resolving to the authenticated user or rejecting with error
   */
  const handleLoginWithProvider = async (provider: AuthProvider, code: string): Promise<User> => {
    try {
      const result = await dispatch(loginWithProvider({ provider, code })).unwrap();
      toast.success(`Successfully authenticated with ${provider}`);
      return result.user;
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : `Authentication with ${provider} failed. Please try again.`;
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Initiates two-factor authentication setup
   * 
   * @returns Promise resolving to setup data or rejecting with error
   */
  const handleSetupTwoFactor = async (): Promise<{ secret: string; qrCodeUrl: string }> => {
    try {
      const result = await dispatch(setupTwoFactor()).unwrap();
      toast.info('Scan the QR code with an authenticator app');
      return result;
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Failed to set up two-factor authentication. Please try again.';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Verifies two-factor authentication setup with verification code
   * 
   * @param token - Verification code from authenticator app
   * @param secret - Secret key from setup
   * @returns Promise resolving when verification succeeds or rejecting with error
   */
  const handleVerifyTwoFactor = async (token: string, secret: string): Promise<void> => {
    try {
      await dispatch(verifyTwoFactor({ token, secret })).unwrap();
      toast.success('Two-factor authentication has been enabled');
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Verification failed. Please check your code and try again.';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Disables two-factor authentication
   * 
   * @param token - Verification code from authenticator app
   * @returns Promise resolving when 2FA is disabled or rejecting with error
   */
  const handleDisableTwoFactor = async (token: string): Promise<void> => {
    try {
      await dispatch(disableTwoFactor({ token })).unwrap();
      toast.success('Two-factor authentication has been disabled');
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Failed to disable two-factor authentication. Please try again.';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Checks if the current user has a specific permission
   * 
   * @param permission - Permission to check
   * @returns Whether the user has the specified permission
   */
  const checkPermission = (permission: AuthPermission): boolean => {
    return user ? hasPermission(user.role, permission) : false;
  };

  /**
   * Clears any authentication error
   */
  const handleClearError = (): void => {
    dispatch(clearError());
  };

  // Return auth state and methods
  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    requiresTwoFactor,
    
    // Auth methods
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    forgotPassword: handleForgotPassword,
    resetPassword: handleResetPassword,
    loginWithProvider: handleLoginWithProvider,
    setupTwoFactor: handleSetupTwoFactor,
    verifyTwoFactor: handleVerifyTwoFactor,
    disableTwoFactor: handleDisableTwoFactor,
    hasPermission: checkPermission,
    clearError: handleClearError
  };
};