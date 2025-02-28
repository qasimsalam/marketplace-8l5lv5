/**
 * Android Secure Storage Keychain Utility
 * 
 * This module provides a secure interface for storing and retrieving sensitive 
 * information on Android devices, such as authentication tokens, user credentials, 
 * and biometric authentication data.
 * 
 * It acts as a wrapper around the native SecureStorageModule, offering a simplified
 * and consistent API for secure data storage throughout the application.
 * 
 * Security Features:
 * - Uses Android KeyStore system for AES-256 encryption
 * - Properly handles encryption/decryption of sensitive data
 * - Complies with GDPR and SOC 2 requirements for data protection
 * 
 * @version 1.0.0
 */

import { NativeModules, Platform } from 'react-native'; // react-native v0.72.x
import { AuthCredentials } from '../types/auth.types';

// Key constants for secure storage
const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_CREDENTIALS_KEY = 'user_credentials';
const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';
const SECURE_STORAGE_SERVICE = 'ai.talent.marketplace';

// Reference to the native SecureStorageModule
const SecureStorageModule = NativeModules.SecureStorageModule;

/**
 * Securely stores the authentication token in the Android secure storage
 * 
 * @param token The JWT authentication token to store
 * @returns Promise resolving to true if successful, false otherwise
 */
export const saveAuthToken = async (token: string): Promise<boolean> => {
  if (!token || token.trim() === '') {
    console.error('Cannot save empty auth token');
    return false;
  }

  try {
    await SecureStorageModule.setItem(AUTH_TOKEN_KEY, token, SECURE_STORAGE_SERVICE);
    return true;
  } catch (error) {
    console.error('Error saving auth token to secure storage:', error);
    return false;
  }
};

/**
 * Retrieves the authentication token from the Android secure storage
 * 
 * @returns Promise resolving to the token string if found, null otherwise
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    const token = await SecureStorageModule.getItem(AUTH_TOKEN_KEY, SECURE_STORAGE_SERVICE);
    return token || null;
  } catch (error) {
    console.error('Error retrieving auth token from secure storage:', error);
    return null;
  }
};

/**
 * Removes the authentication token from the Android secure storage
 * 
 * @returns Promise resolving to true if successfully deleted, false otherwise
 */
export const deleteAuthToken = async (): Promise<boolean> => {
  try {
    await SecureStorageModule.removeItem(AUTH_TOKEN_KEY, SECURE_STORAGE_SERVICE);
    return true;
  } catch (error) {
    console.error('Error deleting auth token from secure storage:', error);
    return false;
  }
};

/**
 * Securely stores the refresh token in the Android secure storage
 * 
 * @param refreshToken The JWT refresh token to store
 * @returns Promise resolving to true if successful, false otherwise
 */
export const saveRefreshToken = async (refreshToken: string): Promise<boolean> => {
  if (!refreshToken || refreshToken.trim() === '') {
    console.error('Cannot save empty refresh token');
    return false;
  }

  try {
    await SecureStorageModule.setItem(REFRESH_TOKEN_KEY, refreshToken, SECURE_STORAGE_SERVICE);
    return true;
  } catch (error) {
    console.error('Error saving refresh token to secure storage:', error);
    return false;
  }
};

/**
 * Retrieves the refresh token from the Android secure storage
 * 
 * @returns Promise resolving to the refresh token string if found, null otherwise
 */
export const getRefreshToken = async (): Promise<string | null> => {
  try {
    const token = await SecureStorageModule.getItem(REFRESH_TOKEN_KEY, SECURE_STORAGE_SERVICE);
    return token || null;
  } catch (error) {
    console.error('Error retrieving refresh token from secure storage:', error);
    return null;
  }
};

/**
 * Removes the refresh token from the Android secure storage
 * 
 * @returns Promise resolving to true if successfully deleted, false otherwise
 */
export const deleteRefreshToken = async (): Promise<boolean> => {
  try {
    await SecureStorageModule.removeItem(REFRESH_TOKEN_KEY, SECURE_STORAGE_SERVICE);
    return true;
  } catch (error) {
    console.error('Error deleting refresh token from secure storage:', error);
    return false;
  }
};

/**
 * Securely stores user login credentials in the Android secure storage
 * 
 * @param credentials The user credentials (email and password) to store
 * @returns Promise resolving to true if successful, false otherwise
 */
export const saveUserCredentials = async (credentials: AuthCredentials): Promise<boolean> => {
  if (!credentials || !credentials.email || !credentials.password) {
    console.error('Invalid credentials object');
    return false;
  }

  try {
    const credentialsString = JSON.stringify(credentials);
    await SecureStorageModule.setItem(USER_CREDENTIALS_KEY, credentialsString, SECURE_STORAGE_SERVICE);
    return true;
  } catch (error) {
    console.error('Error saving user credentials to secure storage:', error);
    return false;
  }
};

/**
 * Retrieves user login credentials from the Android secure storage
 * 
 * @returns Promise resolving to the credentials object if found, null otherwise
 */
export const getUserCredentials = async (): Promise<AuthCredentials | null> => {
  try {
    const credentialsString = await SecureStorageModule.getItem(USER_CREDENTIALS_KEY, SECURE_STORAGE_SERVICE);
    
    if (!credentialsString) {
      return null;
    }

    try {
      const credentials = JSON.parse(credentialsString) as AuthCredentials;
      
      // Validate the credentials object has required properties
      if (!credentials.email || !credentials.password) {
        return null;
      }
      
      return credentials;
    } catch (parseError) {
      console.error('Error parsing user credentials:', parseError);
      return null;
    }
  } catch (error) {
    console.error('Error retrieving user credentials from secure storage:', error);
    return null;
  }
};

/**
 * Removes user login credentials from the Android secure storage
 * 
 * @returns Promise resolving to true if successfully deleted, false otherwise
 */
export const deleteUserCredentials = async (): Promise<boolean> => {
  try {
    await SecureStorageModule.removeItem(USER_CREDENTIALS_KEY, SECURE_STORAGE_SERVICE);
    return true;
  } catch (error) {
    console.error('Error deleting user credentials from secure storage:', error);
    return false;
  }
};

/**
 * Securely stores credentials for biometric authentication in the Android secure storage
 * 
 * @param credentials The credentials to associate with biometric authentication
 * @returns Promise resolving to true if successful, false otherwise
 */
export const saveBiometricCredentials = async (credentials: AuthCredentials): Promise<boolean> => {
  if (!credentials || !credentials.email || !credentials.password) {
    console.error('Invalid biometric credentials object');
    return false;
  }

  try {
    const credentialsString = JSON.stringify(credentials);
    await SecureStorageModule.setItem(BIOMETRIC_CREDENTIALS_KEY, credentialsString, SECURE_STORAGE_SERVICE);
    return true;
  } catch (error) {
    console.error('Error saving biometric credentials to secure storage:', error);
    return false;
  }
};

/**
 * Retrieves credentials for biometric authentication from the Android secure storage
 * 
 * @returns Promise resolving to the credentials object if found, null otherwise
 */
export const getBiometricCredentials = async (): Promise<AuthCredentials | null> => {
  try {
    const credentialsString = await SecureStorageModule.getItem(BIOMETRIC_CREDENTIALS_KEY, SECURE_STORAGE_SERVICE);
    
    if (!credentialsString) {
      return null;
    }

    try {
      const credentials = JSON.parse(credentialsString) as AuthCredentials;
      
      // Validate the credentials object has required properties
      if (!credentials.email || !credentials.password) {
        return null;
      }
      
      return credentials;
    } catch (parseError) {
      console.error('Error parsing biometric credentials:', parseError);
      return null;
    }
  } catch (error) {
    console.error('Error retrieving biometric credentials from secure storage:', error);
    return null;
  }
};

/**
 * Removes biometric authentication credentials from the Android secure storage
 * 
 * @returns Promise resolving to true if successfully deleted, false otherwise
 */
export const deleteBiometricCredentials = async (): Promise<boolean> => {
  try {
    await SecureStorageModule.removeItem(BIOMETRIC_CREDENTIALS_KEY, SECURE_STORAGE_SERVICE);
    return true;
  } catch (error) {
    console.error('Error deleting biometric credentials from secure storage:', error);
    return false;
  }
};

/**
 * Generic method to securely store any sensitive data in the Android secure storage
 * 
 * @param key The key under which to store the value
 * @param value The value to be stored
 * @returns Promise resolving to true if successful, false otherwise
 */
export const saveSecureItem = async (key: string, value: any): Promise<boolean> => {
  if (!key || key.trim() === '') {
    console.error('Invalid key provided');
    return false;
  }

  try {
    // Convert value to string if it's not already
    const valueToStore = typeof value === 'string' ? value : JSON.stringify(value);
    
    await SecureStorageModule.setItem(key, valueToStore, SECURE_STORAGE_SERVICE);
    return true;
  } catch (error) {
    console.error(`Error saving secure item with key ${key}:`, error);
    return false;
  }
};

/**
 * Generic method to retrieve any sensitive data from the Android secure storage
 * 
 * @param key The key of the value to retrieve
 * @param parseJson Whether to parse the result as JSON (default: false)
 * @returns Promise resolving to the stored value if found, null otherwise
 */
export const getSecureItem = async (key: string, parseJson: boolean = false): Promise<any | null> => {
  if (!key || key.trim() === '') {
    console.error('Invalid key provided');
    return null;
  }

  try {
    const item = await SecureStorageModule.getItem(key, SECURE_STORAGE_SERVICE);
    
    if (!item) {
      return null;
    }

    if (parseJson) {
      try {
        return JSON.parse(item);
      } catch (parseError) {
        console.error(`Error parsing JSON for key ${key}:`, parseError);
        return item; // Return raw string if parsing fails
      }
    }
    
    return item;
  } catch (error) {
    console.error(`Error retrieving secure item with key ${key}:`, error);
    return null;
  }
};

/**
 * Generic method to remove any sensitive data from the Android secure storage
 * 
 * @param key The key of the value to delete
 * @returns Promise resolving to true if successfully deleted, false otherwise
 */
export const deleteSecureItem = async (key: string): Promise<boolean> => {
  if (!key || key.trim() === '') {
    console.error('Invalid key provided');
    return false;
  }

  try {
    await SecureStorageModule.removeItem(key, SECURE_STORAGE_SERVICE);
    return true;
  } catch (error) {
    console.error(`Error deleting secure item with key ${key}:`, error);
    return false;
  }
};

/**
 * Removes all sensitive data stored by the app from the Android secure storage
 * 
 * @returns Promise resolving to true if all items were deleted successfully, false otherwise
 */
export const clearAllSecureItems = async (): Promise<boolean> => {
  try {
    await SecureStorageModule.clear(SECURE_STORAGE_SERVICE);
    return true;
  } catch (error) {
    console.error('Error clearing all secure items:', error);
    return false;
  }
};

/**
 * Checks if the Android secure storage is available and accessible
 * 
 * @returns Promise resolving to true if secure storage is available, false otherwise
 */
export const isSecureStorageAvailable = async (): Promise<boolean> => {
  // Only available on Android platform
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    return await SecureStorageModule.isKeyStoreAvailable();
  } catch (error) {
    console.error('Error checking KeyStore availability:', error);
    return false;
  }
};