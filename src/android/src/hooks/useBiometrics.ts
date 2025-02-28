/**
 * Custom React hook for biometric authentication in the AI Talent Marketplace Android app
 * 
 * Provides an interface for fingerprint and face recognition authentication, managing
 * biometric availability, user preferences, and authentication workflows.
 * 
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react'; // react v18.2.0
import { useDispatch, useSelector } from 'react-redux'; // react-redux v8.1.2
import { RootState } from '../store';
import { 
  enableBiometricsUser, 
  disableBiometricsUser, 
  checkBiometricAvailability 
} from '../store/slices/authSlice';
import { 
  BiometricType, 
  BiometricAuthResult, 
  BiometricAuthOptions 
} from '../types/auth.types';
import { 
  isBiometricAvailable, 
  getBiometricType, 
  authenticateWithBiometrics 
} from '../utils/biometrics';
import { 
  saveBiometricCredentials, 
  getBiometricCredentials, 
  deleteBiometricCredentials 
} from '../utils/keychain';

/**
 * Type definition for the return value of the useBiometrics hook
 */
export interface UseBiometricsReturnType {
  isAvailable: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  biometricType: BiometricType;
  checkAvailability: () => Promise<boolean>;
  authenticate: (options?: BiometricAuthOptions) => Promise<BiometricAuthResult>;
  enableBiometrics: () => Promise<boolean>;
  disableBiometrics: () => Promise<boolean>;
}

/**
 * Custom hook that provides biometric authentication functionality
 * 
 * @returns Object containing biometric state and functions for authentication management
 */
export function useBiometrics(): UseBiometricsReturnType {
  // Redux hooks
  const dispatch = useDispatch();
  const isEnabled = useSelector((state: RootState) => state.auth.biometricsEnabled);
  
  // Local state
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [biometricType, setBiometricType] = useState<BiometricType>(BiometricType.NONE);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Checks if biometric authentication is available on the device and determines type
   * 
   * @returns Promise resolving to true if biometric authentication is available
   */
  const checkAvailability = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if biometrics are available using the biometrics utility
      const available = await isBiometricAvailable();
      setIsAvailable(available);
      
      // If available, determine the type of biometric
      if (available) {
        const type = await getBiometricType();
        setBiometricType(type);
      } else {
        setBiometricType(BiometricType.NONE);
      }
      
      // Dispatch Redux action to update global state
      dispatch(checkBiometricAvailability());
      
      return available;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during biometric check';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  /**
   * Authenticates the user with biometrics (fingerprint, face, etc.)
   * 
   * @param options Optional configuration for the biometric prompt
   * @returns Promise resolving to the result of authentication
   */
  const authenticate = useCallback(async (
    options?: BiometricAuthOptions
  ): Promise<BiometricAuthResult> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if biometrics are available before attempting authentication
      if (!isAvailable) {
        return BiometricAuthResult.NOT_AVAILABLE;
      }
      
      // Perform biometric authentication with optional custom prompt settings
      const result = await authenticateWithBiometrics(options);
      
      // Clear error if authentication was successful
      if (result === BiometricAuthResult.SUCCESS) {
        setError(null);
      } else if (result === BiometricAuthResult.FAILED) {
        setError('Biometric authentication failed');
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error during biometric authentication';
      setError(errorMessage);
      return BiometricAuthResult.FAILED;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  /**
   * Enables biometric authentication for the user
   * 
   * @returns Promise resolving to true if biometrics were successfully enabled
   */
  const enableBiometrics = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if biometrics are available before enabling
      if (!isAvailable) {
        setError('Biometric authentication is not available on this device');
        return false;
      }
      
      // First authenticate the user with biometrics to verify identity
      const authResult = await authenticateWithBiometrics({
        promptTitle: 'Enable Biometric Login',
        promptSubtitle: 'Verify your identity',
        promptDescription: 'This will allow you to log in using biometric authentication',
        cancelButtonText: 'Cancel'
      });
      
      if (authResult !== BiometricAuthResult.SUCCESS) {
        if (authResult === BiometricAuthResult.CANCELED) {
          setError('Biometric setup was canceled');
        } else {
          setError('Biometric authentication failed');
        }
        return false;
      }
      
      // Check if we have the necessary credentials stored
      const credentials = await getBiometricCredentials();
      if (!credentials) {
        setError('No stored credentials available for biometric setup');
        return false;
      }
      
      // If authentication was successful, dispatch action to enable biometrics
      await dispatch(enableBiometricsUser());
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error enabling biometric authentication';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, isAvailable]);

  /**
   * Disables biometric authentication for the user
   * 
   * @returns Promise resolving to true if biometrics were successfully disabled
   */
  const disableBiometrics = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Dispatch action to disable biometrics in Redux state
      await dispatch(disableBiometricsUser());
      
      // Delete stored biometric credentials from secure storage
      await deleteBiometricCredentials();
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error disabling biometric authentication';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  // Check biometric availability when the component using this hook mounts
  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  // Return the hook API
  return {
    isAvailable,
    isEnabled,
    isLoading,
    error,
    biometricType,
    checkAvailability,
    authenticate,
    enableBiometrics,
    disableBiometrics
  };
}