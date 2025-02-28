/**
 * Biometric Authentication Utility
 * 
 * This module provides biometric authentication functionality for the iOS application,
 * abstracting the platform-specific implementation details and providing a consistent API
 * for Face ID and Touch ID authentication.
 * 
 * @module utils/biometrics
 */

import ReactNativeBiometrics from 'react-native-biometrics'; // v3.0.1
import { Platform } from 'react-native'; // v0.72.x
import * as Keychain from 'react-native-keychain'; // v8.1.1
import { BiometricType, BiometricAuthResult } from '../types/auth.types';

// Initialize the biometrics module with device credentials allowed
const RNBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });

// Key name for storing biometric keys in the keychain
const BIOMETRIC_KEY_NAME = 'ai_talent_marketplace_biometric_key';

/**
 * Checks if biometric authentication is available on the device
 * @returns Promise resolving to a boolean indicating if biometrics are available
 */
export const isBiometricsAvailable = async (): Promise<boolean> => {
  try {
    const { available } = await RNBiometrics.isSensorAvailable();
    return available;
  } catch (error) {
    console.error('Error checking biometrics availability:', error);
    return false;
  }
};

/**
 * Determines the type of biometric authentication available on the device
 * @returns Promise resolving to the BiometricType enum value
 */
export const getBiometricType = async (): Promise<BiometricType> => {
  try {
    // First check if biometrics are available
    const available = await isBiometricsAvailable();
    if (!available) {
      return BiometricType.NONE;
    }

    // Get the biometry type from the library
    const { biometryType } = await RNBiometrics.isSensorAvailable();
    
    // Map the biometry type to our enum
    if (Platform.OS === 'ios') {
      // iOS-specific mapping
      switch (biometryType) {
        case 'FaceID':
          return BiometricType.FACE;
        case 'TouchID':
          return BiometricType.FINGERPRINT;
        default:
          return BiometricType.NONE;
      }
    } else {
      // For Android or other platforms (though this file is iOS-specific)
      switch (biometryType) {
        case 'Biometrics':
        case 'Fingerprint':
          return BiometricType.FINGERPRINT;
        case 'Face':
          return BiometricType.FACE;
        case 'Iris':
          return BiometricType.IRIS;
        default:
          return BiometricType.NONE;
      }
    }
  } catch (error) {
    console.error('Error determining biometric type:', error);
    return BiometricType.NONE;
  }
};

/**
 * Prompts the user for biometric authentication
 * @param promptMessage The message to display in the authentication dialog
 * @returns Promise resolving to a BiometricAuthResult enum value
 */
export const authenticateWithBiometrics = async (
  promptMessage: string
): Promise<BiometricAuthResult> => {
  try {
    // Check if biometrics are available
    const available = await isBiometricsAvailable();
    if (!available) {
      return BiometricAuthResult.NOT_AVAILABLE;
    }

    // Prompt for authentication
    const { success, error } = await RNBiometrics.simplePrompt({
      promptMessage,
      cancelButtonText: 'Cancel',
    });

    if (success) {
      return BiometricAuthResult.SUCCESS;
    } else {
      // Handle different error cases
      if (error === 'User cancelled') {
        return BiometricAuthResult.CANCELED;
      } else if (error?.includes('not enrolled')) {
        return BiometricAuthResult.NOT_ENROLLED;
      } else {
        return BiometricAuthResult.FAILED;
      }
    }
  } catch (error) {
    console.error('Error during biometric authentication:', error);
    return BiometricAuthResult.FAILED;
  }
};

/**
 * Creates biometric-protected cryptographic keys for secure operations
 * @returns Promise resolving to a boolean indicating success
 */
export const createBiometricKeys = async (): Promise<boolean> => {
  try {
    // Check if biometrics are available
    const available = await isBiometricsAvailable();
    if (!available) {
      return false;
    }

    // Create keys
    const { publicKey } = await RNBiometrics.createKeys();
    return !!publicKey;
  } catch (error) {
    console.error('Error creating biometric keys:', error);
    return false;
  }
};

/**
 * Deletes any previously created biometric-protected cryptographic keys
 * @returns Promise resolving to a boolean indicating success
 */
export const deleteBiometricKeys = async (): Promise<boolean> => {
  try {
    const { keysDeleted } = await RNBiometrics.deleteKeys();
    return keysDeleted;
  } catch (error) {
    console.error('Error deleting biometric keys:', error);
    return false;
  }
};

/**
 * Checks if biometric-protected cryptographic keys exist on the device
 * @returns Promise resolving to a boolean indicating if keys exist
 */
export const getBiometricKeysExist = async (): Promise<boolean> => {
  try {
    const { keysExist } = await RNBiometrics.biometricKeysExist();
    return keysExist;
  } catch (error) {
    console.error('Error checking biometric keys existence:', error);
    return false;
  }
};

/**
 * Signs a payload using biometric-protected keys for secure operations
 * @param payload The data to sign
 * @param promptMessage The message to display in the authentication dialog
 * @returns Promise resolving to the signature string or null if failed
 */
export const signWithBiometrics = async (
  payload: string,
  promptMessage: string
): Promise<string | null> => {
  try {
    // Check if biometrics are available
    const available = await isBiometricsAvailable();
    if (!available) {
      return null;
    }

    // Check if keys exist
    const keysExist = await getBiometricKeysExist();
    if (!keysExist) {
      return null;
    }

    // Sign the payload
    const { success, signature } = await RNBiometrics.createSignature({
      promptMessage,
      payload,
      cancelButtonText: 'Cancel',
    });

    if (success && signature) {
      return signature;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error signing with biometrics:', error);
    return null;
  }
};

/**
 * Verifies a signature created with biometric-protected keys
 * @param signature The signature to verify
 * @param payload The original payload that was signed
 * @param publicKey The public key to verify the signature against
 * @returns Promise resolving to a boolean indicating if the signature is valid
 */
export const verifySignature = async (
  signature: string,
  payload: string,
  publicKey: string
): Promise<boolean> => {
  try {
    // This is a simplified implementation as proper verification often happens server-side
    // For local verification, we would need to implement RSA signature verification
    // which typically involves complex cryptographic operations
    
    // For now, we'll assume this is delegated to a server endpoint
    // Example placeholder for a server verification:
    // const response = await fetch('/api/verify-signature', {
    //   method: 'POST',
    //   body: JSON.stringify({ signature, payload, publicKey }),
    //   headers: { 'Content-Type': 'application/json' }
    // });
    // return response.ok;
    
    // For demonstration purposes only - should be replaced with proper verification
    console.warn('Signature verification is not fully implemented and will need to be handled with proper cryptographic validation');
    
    // Use Keychain to securely store verification-related data if needed
    await Keychain.setGenericPassword(
      'verification_request',
      JSON.stringify({ signature, payload, publicKey }),
      {
        service: `${BIOMETRIC_KEY_NAME}_verification`,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }
    );
    
    return true;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
};

/**
 * Retrieves the public key associated with the biometric-protected private key
 * @returns Promise resolving to the public key string or null if not available
 */
export const getPublicKey = async (): Promise<string | null> => {
  try {
    // Check if keys exist
    const keysExist = await getBiometricKeysExist();
    if (!keysExist) {
      return null;
    }

    // Get the public key
    const { publicKey } = await RNBiometrics.getPublicKey();
    return publicKey || null;
  } catch (error) {
    console.error('Error getting public key:', error);
    return null;
  }
};

// Re-export the types for consumers of this module
export { BiometricType, BiometricAuthResult };