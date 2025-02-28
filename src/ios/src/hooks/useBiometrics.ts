import { useState, useEffect, useCallback, useMemo } from 'react'; // ^18.2.0
import { 
  isBiometricsAvailable, 
  getBiometricType,
  authenticateWithBiometrics,
  createBiometricKeys,
  deleteBiometricKeys,
  getBiometricKeysExist,
  signWithBiometrics,
  getPublicKey
} from '../utils/biometrics';
import { BiometricType, BiometricAuthResult } from '../types/auth.types';

// Error messages for biometric operations
const BIOMETRIC_ERROR_MESSAGES = {
  NOT_AVAILABLE: 'Biometric authentication is not available on this device.',
  NOT_ENROLLED: 'Biometric authentication is not set up on this device.',
  CANCELED: 'Biometric authentication was canceled.',
  FAILED: 'Biometric authentication failed. Please try again.'
};

/**
 * Interface defining the return value of the useBiometrics hook
 */
export interface BiometricHookResult {
  // State
  isAvailable: boolean;
  biometricType: BiometricType;
  isLoading: boolean;
  error: string | null;
  
  // Methods
  checkAvailability: () => Promise<void>;
  authenticate: (promptMessage: string) => Promise<BiometricAuthResult>;
  setupBiometrics: () => Promise<boolean>;
  removeBiometrics: () => Promise<boolean>;
  signData: (payload: string, promptMessage: string) => Promise<string | null>;
  getPublicKeyForVerification: () => Promise<string | null>;
}

/**
 * A custom React hook that provides biometric authentication functionality.
 * This hook encapsulates Face ID and Touch ID capabilities for iOS devices,
 * providing a simplified interface for components to use device biometrics.
 * 
 * @returns An object containing biometric state and authentication methods
 */
const useBiometrics = (): BiometricHookResult => {
  // State for tracking biometric availability
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  
  // State for tracking biometric type (Face ID or Touch ID)
  const [biometricType, setBiometricType] = useState<BiometricType>(BiometricType.NONE);
  
  // State for tracking loading status during biometric operations
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // State for tracking error messages
  const [error, setError] = useState<string | null>(null);

  /**
   * Checks if biometrics are available on the device and determines the type
   */
  const checkAvailability = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if biometrics are available
      const available = await isBiometricsAvailable();
      setIsAvailable(available);
      
      if (available) {
        // Determine the type of biometrics (Face ID or Touch ID)
        const type = await getBiometricType();
        setBiometricType(type);
      } else {
        setBiometricType(BiometricType.NONE);
      }
    } catch (err) {
      console.error('Error checking biometric availability:', err);
      setError('Failed to check biometric availability.');
      setIsAvailable(false);
      setBiometricType(BiometricType.NONE);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Authenticates the user using biometrics (Face ID or Touch ID)
   * 
   * @param promptMessage - The message to display in the biometric prompt
   * @returns A Promise resolving to the BiometricAuthResult
   */
  const authenticate = useCallback(async (
    promptMessage: string
  ): Promise<BiometricAuthResult> => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!isAvailable) {
        setError(BIOMETRIC_ERROR_MESSAGES.NOT_AVAILABLE);
        return BiometricAuthResult.NOT_AVAILABLE;
      }
      
      const result = await authenticateWithBiometrics(promptMessage);
      
      // Handle authentication result
      switch (result) {
        case BiometricAuthResult.SUCCESS:
          return result;
        case BiometricAuthResult.NOT_AVAILABLE:
          setError(BIOMETRIC_ERROR_MESSAGES.NOT_AVAILABLE);
          return result;
        case BiometricAuthResult.NOT_ENROLLED:
          setError(BIOMETRIC_ERROR_MESSAGES.NOT_ENROLLED);
          return result;
        case BiometricAuthResult.CANCELED:
          setError(BIOMETRIC_ERROR_MESSAGES.CANCELED);
          return result;
        case BiometricAuthResult.FAILED:
        default:
          setError(BIOMETRIC_ERROR_MESSAGES.FAILED);
          return result;
      }
    } catch (err) {
      console.error('Error during biometric authentication:', err);
      setError('An unexpected error occurred during authentication.');
      return BiometricAuthResult.FAILED;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  /**
   * Sets up biometric keys for secure operations
   * Creates cryptographic keys protected by biometric authentication
   * 
   * @returns A Promise resolving to a boolean indicating success
   */
  const setupBiometrics = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!isAvailable) {
        setError(BIOMETRIC_ERROR_MESSAGES.NOT_AVAILABLE);
        return false;
      }
      
      // Check if keys already exist
      const keysExist = await getBiometricKeysExist();
      if (keysExist) {
        // Keys already exist, no need to create new ones
        return true;
      }
      
      // Create new biometric keys
      const result = await createBiometricKeys();
      
      if (!result) {
        setError('Failed to set up biometric authentication.');
      }
      
      return result;
    } catch (err) {
      console.error('Error setting up biometrics:', err);
      setError('An unexpected error occurred while setting up biometric authentication.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  /**
   * Removes biometric keys from the device
   * 
   * @returns A Promise resolving to a boolean indicating success
   */
  const removeBiometrics = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Delete biometric keys
      const result = await deleteBiometricKeys();
      
      if (!result) {
        setError('Failed to remove biometric authentication.');
      }
      
      return result;
    } catch (err) {
      console.error('Error removing biometrics:', err);
      setError('An unexpected error occurred while removing biometric authentication.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Signs data using biometric authentication
   * Requires user to authenticate with biometrics before signing
   * 
   * @param payload - The data to sign
   * @param promptMessage - The message to display in the biometric prompt
   * @returns A Promise resolving to the signature or null if failed
   */
  const signData = useCallback(async (
    payload: string,
    promptMessage: string
  ): Promise<string | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!isAvailable) {
        setError(BIOMETRIC_ERROR_MESSAGES.NOT_AVAILABLE);
        return null;
      }
      
      // Check if keys exist
      const keysExist = await getBiometricKeysExist();
      if (!keysExist) {
        // Try to create keys if they don't exist
        const keysCreated = await setupBiometrics();
        if (!keysCreated) {
          setError('Biometric keys not available. Please set up biometric authentication first.');
          return null;
        }
      }
      
      // Sign the data with biometrics
      const signature = await signWithBiometrics(payload, promptMessage);
      
      if (!signature) {
        setError('Failed to sign data with biometric authentication.');
      }
      
      return signature;
    } catch (err) {
      console.error('Error signing data with biometrics:', err);
      setError('An unexpected error occurred while signing data.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, setupBiometrics]);

  /**
   * Gets the public key for verification
   * This key can be used for server-side signature verification
   * 
   * @returns A Promise resolving to the public key or null if not available
   */
  const getPublicKeyForVerification = useCallback(async (): Promise<string | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!isAvailable) {
        setError(BIOMETRIC_ERROR_MESSAGES.NOT_AVAILABLE);
        return null;
      }
      
      // Check if keys exist
      const keysExist = await getBiometricKeysExist();
      if (!keysExist) {
        setError('Biometric keys not available. Please set up biometric authentication first.');
        return null;
      }
      
      // Get public key
      const publicKey = await getPublicKey();
      
      if (!publicKey) {
        setError('Failed to retrieve public key for verification.');
      }
      
      return publicKey;
    } catch (err) {
      console.error('Error getting public key:', err);
      setError('An unexpected error occurred while retrieving the public key.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  // Check biometric availability on mount
  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  // Return state and methods
  return {
    // State
    isAvailable,
    biometricType,
    isLoading,
    error,
    
    // Methods
    checkAvailability,
    authenticate,
    setupBiometrics,
    removeBiometrics,
    signData,
    getPublicKeyForVerification,
  };
};

export default useBiometrics;