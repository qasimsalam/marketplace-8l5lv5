/**
 * Keychain Storage Utility for iOS
 * 
 * This module provides a secure wrapper around the iOS Keychain Service API for storing 
 * and retrieving sensitive data such as authentication tokens, user credentials, and biometric keys.
 * It ensures that sensitive information is stored securely using iOS native security capabilities.
 * 
 * @version 1.0.0
 */

import * as Keychain from 'react-native-keychain'; // v8.1.1
import { Platform } from 'react-native'; // v0.72.x
import { AuthCredentials } from '../types/auth.types';

// Keychain key constants
export const AUTH_TOKEN_KEY = 'auth_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const USER_CREDENTIALS_KEY = 'user_credentials';
export const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';
export const SECURE_STORAGE_SERVICE = 'ai.talent.marketplace';

/**
 * Securely stores the authentication token in the iOS keychain
 * 
 * @param token - The authentication token to store
 * @returns Promise resolving to true if successful, false otherwise
 */
export const saveAuthToken = async (token: string): Promise<boolean> => {
  if (!token) {
    return false;
  }

  try {
    await Keychain.setGenericPassword(
      AUTH_TOKEN_KEY,
      token,
      {
        service: SECURE_STORAGE_SERVICE,
        accessControl: Keychain.ACCESS_CONTROL.USER_PRESENCE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
      }
    );
    return true;
  } catch (error) {
    console.error('Error saving auth token to keychain:', error);
    return false;
  }
};

/**
 * Retrieves the authentication token from the iOS keychain
 * 
 * @returns Promise resolving to the token string if found, null otherwise
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: SECURE_STORAGE_SERVICE,
    });

    if (credentials && credentials.username === AUTH_TOKEN_KEY) {
      return credentials.password;
    }
    return null;
  } catch (error) {
    console.error('Error retrieving auth token from keychain:', error);
    return null;
  }
};

/**
 * Removes the authentication token from the iOS keychain
 * 
 * @returns Promise resolving to true if successful, false otherwise
 */
export const deleteAuthToken = async (): Promise<boolean> => {
  try {
    await Keychain.resetGenericPassword({
      service: SECURE_STORAGE_SERVICE,
    });
    return true;
  } catch (error) {
    console.error('Error deleting auth token from keychain:', error);
    return false;
  }
};

/**
 * Securely stores the refresh token in the iOS keychain
 * 
 * @param refreshToken - The refresh token to store
 * @returns Promise resolving to true if successful, false otherwise
 */
export const saveRefreshToken = async (refreshToken: string): Promise<boolean> => {
  if (!refreshToken) {
    return false;
  }

  try {
    await Keychain.setGenericPassword(
      REFRESH_TOKEN_KEY,
      refreshToken,
      {
        service: `${SECURE_STORAGE_SERVICE}.refresh`,
        accessControl: Keychain.ACCESS_CONTROL.USER_PRESENCE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
      }
    );
    return true;
  } catch (error) {
    console.error('Error saving refresh token to keychain:', error);
    return false;
  }
};

/**
 * Retrieves the refresh token from the iOS keychain
 * 
 * @returns Promise resolving to the refresh token string if found, null otherwise
 */
export const getRefreshToken = async (): Promise<string | null> => {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: `${SECURE_STORAGE_SERVICE}.refresh`,
    });

    if (credentials && credentials.username === REFRESH_TOKEN_KEY) {
      return credentials.password;
    }
    return null;
  } catch (error) {
    console.error('Error retrieving refresh token from keychain:', error);
    return null;
  }
};

/**
 * Removes the refresh token from the iOS keychain
 * 
 * @returns Promise resolving to true if successful, false otherwise
 */
export const deleteRefreshToken = async (): Promise<boolean> => {
  try {
    await Keychain.resetGenericPassword({
      service: `${SECURE_STORAGE_SERVICE}.refresh`,
    });
    return true;
  } catch (error) {
    console.error('Error deleting refresh token from keychain:', error);
    return false;
  }
};

/**
 * Securely stores user login credentials in the iOS keychain
 * 
 * @param credentials - The user credentials object containing email and password
 * @returns Promise resolving to true if successful, false otherwise
 */
export const saveUserCredentials = async (credentials: AuthCredentials): Promise<boolean> => {
  if (!credentials || !credentials.email || !credentials.password) {
    return false;
  }

  try {
    await Keychain.setGenericPassword(
      USER_CREDENTIALS_KEY,
      JSON.stringify(credentials),
      {
        service: `${SECURE_STORAGE_SERVICE}.credentials`,
        accessControl: Keychain.ACCESS_CONTROL.USER_PRESENCE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }
    );
    return true;
  } catch (error) {
    console.error('Error saving user credentials to keychain:', error);
    return false;
  }
};

/**
 * Retrieves user login credentials from the iOS keychain
 * 
 * @returns Promise resolving to the credentials object if found, null otherwise
 */
export const getUserCredentials = async (): Promise<AuthCredentials | null> => {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: `${SECURE_STORAGE_SERVICE}.credentials`,
    });

    if (credentials && credentials.username === USER_CREDENTIALS_KEY) {
      try {
        return JSON.parse(credentials.password);
      } catch (parseError) {
        console.error('Error parsing user credentials from keychain:', parseError);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error('Error retrieving user credentials from keychain:', error);
    return null;
  }
};

/**
 * Removes user login credentials from the iOS keychain
 * 
 * @returns Promise resolving to true if successful, false otherwise
 */
export const deleteUserCredentials = async (): Promise<boolean> => {
  try {
    await Keychain.resetGenericPassword({
      service: `${SECURE_STORAGE_SERVICE}.credentials`,
    });
    return true;
  } catch (error) {
    console.error('Error deleting user credentials from keychain:', error);
    return false;
  }
};

/**
 * Securely stores credentials for biometric authentication in the iOS keychain
 * 
 * @param credentials - The credentials object to store for biometric access
 * @returns Promise resolving to true if successful, false otherwise
 */
export const saveBiometricCredentials = async (credentials: AuthCredentials): Promise<boolean> => {
  if (!credentials || !credentials.email || !credentials.password) {
    return false;
  }

  try {
    await Keychain.setGenericPassword(
      BIOMETRIC_CREDENTIALS_KEY,
      JSON.stringify(credentials),
      {
        service: `${SECURE_STORAGE_SERVICE}.biometric`,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
      }
    );
    return true;
  } catch (error) {
    console.error('Error saving biometric credentials to keychain:', error);
    return false;
  }
};

/**
 * Retrieves credentials for biometric authentication from the iOS keychain
 * This will trigger the biometric prompt on the device
 * 
 * @returns Promise resolving to the credentials object if found and biometric auth succeeds, null otherwise
 */
export const getBiometricCredentials = async (): Promise<AuthCredentials | null> => {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: `${SECURE_STORAGE_SERVICE}.biometric`,
      authenticationPrompt: {
        title: 'Authentication Required',
        subtitle: 'Use your biometric to access your account',
        description: 'Please authenticate to access your saved login details',
        cancel: 'Cancel',
      },
    });

    if (credentials && credentials.username === BIOMETRIC_CREDENTIALS_KEY) {
      try {
        return JSON.parse(credentials.password);
      } catch (parseError) {
        console.error('Error parsing biometric credentials from keychain:', parseError);
        return null;
      }
    }
    return null;
  } catch (error) {
    // Handle different error cases, including user cancellation
    if (error.code === 'USER_CANCELED') {
      console.log('User canceled biometric authentication');
    } else if (error.code === 'BIOMETRIC_NOT_AVAILABLE') {
      console.error('Biometric authentication not available on this device');
    } else {
      console.error('Error retrieving biometric credentials from keychain:', error);
    }
    return null;
  }
};

/**
 * Removes biometric authentication credentials from the iOS keychain
 * 
 * @returns Promise resolving to true if successful, false otherwise
 */
export const deleteBiometricCredentials = async (): Promise<boolean> => {
  try {
    await Keychain.resetGenericPassword({
      service: `${SECURE_STORAGE_SERVICE}.biometric`,
    });
    return true;
  } catch (error) {
    console.error('Error deleting biometric credentials from keychain:', error);
    return false;
  }
};

/**
 * Generic method to securely store any sensitive data in the iOS keychain
 * 
 * @param key - Unique identifier for the stored item
 * @param value - The value to store (will be JSON stringified if not a string)
 * @param options - Additional keychain options
 * @returns Promise resolving to true if successful, false otherwise
 */
export const saveSecureItem = async (
  key: string, 
  value: any, 
  options: Keychain.Options = {}
): Promise<boolean> => {
  if (!key) {
    return false;
  }

  const valueToStore = typeof value === 'string' ? value : JSON.stringify(value);
  
  try {
    const defaultOptions: Keychain.Options = {
      service: `${SECURE_STORAGE_SERVICE}.${key}`,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
    };

    await Keychain.setGenericPassword(
      key,
      valueToStore,
      { ...defaultOptions, ...options }
    );
    return true;
  } catch (error) {
    console.error(`Error saving secure item '${key}' to keychain:`, error);
    return false;
  }
};

/**
 * Generic method to retrieve any sensitive data from the iOS keychain
 * 
 * @param key - Unique identifier for the stored item
 * @param options - Additional keychain options
 * @returns Promise resolving to the stored value if found, null otherwise
 */
export const getSecureItem = async (
  key: string, 
  options: Keychain.Options = {}
): Promise<any | null> => {
  if (!key) {
    return null;
  }

  try {
    const defaultOptions: Keychain.Options = {
      service: `${SECURE_STORAGE_SERVICE}.${key}`,
    };

    const credentials = await Keychain.getGenericPassword({
      ...defaultOptions,
      ...options,
    });

    if (credentials && credentials.username === key) {
      try {
        // Attempt to parse as JSON, if it fails, return as a string
        return JSON.parse(credentials.password);
      } catch (e) {
        // Not a JSON string, return as is
        return credentials.password;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error retrieving secure item '${key}' from keychain:`, error);
    return null;
  }
};

/**
 * Generic method to remove any sensitive data from the iOS keychain
 * 
 * @param key - Unique identifier for the stored item
 * @returns Promise resolving to true if successful, false otherwise
 */
export const deleteSecureItem = async (key: string): Promise<boolean> => {
  if (!key) {
    return false;
  }

  try {
    await Keychain.resetGenericPassword({
      service: `${SECURE_STORAGE_SERVICE}.${key}`,
    });
    return true;
  } catch (error) {
    console.error(`Error deleting secure item '${key}' from keychain:`, error);
    return false;
  }
};

/**
 * Removes all sensitive data stored by the app from the iOS keychain
 * 
 * @returns Promise resolving to true if all items were deleted successfully, false otherwise
 */
export const clearAllSecureItems = async (): Promise<boolean> => {
  try {
    const deletionPromises = [
      deleteAuthToken(),
      deleteRefreshToken(),
      deleteUserCredentials(),
      deleteBiometricCredentials(),
    ];

    await Promise.all(deletionPromises);
    return true;
  } catch (error) {
    console.error('Error clearing all secure items from keychain:', error);
    return false;
  }
};

/**
 * Checks if the iOS keychain is available and accessible
 * 
 * @returns Promise resolving to true if keychain is available, false otherwise
 */
export const isKeychainAvailable = async (): Promise<boolean> => {
  // Early return for non-iOS platforms
  if (Platform.OS !== 'ios') {
    return false;
  }

  const testKey = 'keychain_test';
  const testValue = 'test_value';

  try {
    // Try to save a test value
    await Keychain.setGenericPassword(
      testKey,
      testValue,
      {
        service: `${SECURE_STORAGE_SERVICE}.test`,
      }
    );

    // Try to retrieve the test value
    const credentials = await Keychain.getGenericPassword({
      service: `${SECURE_STORAGE_SERVICE}.test`,
    });

    // Clean up
    await Keychain.resetGenericPassword({
      service: `${SECURE_STORAGE_SERVICE}.test`,
    });

    return credentials && credentials.password === testValue;
  } catch (error) {
    console.error('Keychain is not available:', error);
    return false;
  }
};