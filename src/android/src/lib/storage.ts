/**
 * Local Storage Utility for Android
 * 
 * This module provides a unified interface for persisting non-sensitive data
 * using AsyncStorage. It handles storing, retrieving, and managing application data
 * such as user preferences, cache, and application state.
 * 
 * For sensitive data like authentication tokens and credentials, use the keychain
 * utility instead.
 * 
 * Features:
 * - Namespaced storage keys
 * - JSON serialization/deserialization
 * - Caching with expiration
 * - Batch operations
 * - Error handling
 * 
 * @version 1.0.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage'; // ^1.18.2
import { Platform } from 'react-native'; // 0.72.x
import { isSecureStorageAvailable } from '../utils/keychain';

// Storage constants
export const STORAGE_PREFIX = '@AITalentMarketplace:';
export const APP_SETTINGS_KEY = 'app_settings';
export const USER_PREFERENCES_KEY = 'user_preferences';
export const CACHE_STORAGE_KEY = 'cache';
export const JOB_CACHE_KEY = 'jobs_cache';
export const PROFILE_CACHE_KEY = 'profile_cache';
export const LAST_SYNC_KEY = 'last_sync';
export const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Types for internal use
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiryTime: number;
}

/**
 * Stores data in AsyncStorage with the application prefix
 * 
 * @param key The key under which to store the value
 * @param value The value to be stored
 * @returns Promise resolving to true if successful, false otherwise
 */
export const storeData = async (key: string, value: any): Promise<boolean> => {
  if (!key || key.trim() === '') {
    console.error('Cannot store data with empty key');
    return false;
  }

  const storageKey = `${STORAGE_PREFIX}${key}`;

  try {
    // Convert value to JSON string if it's not already a string
    const valueToStore = typeof value === 'string' ? value : JSON.stringify(value);
    
    await AsyncStorage.setItem(storageKey, valueToStore);
    return true;
  } catch (error) {
    console.error(`Error storing data for key ${key}:`, error);
    return false;
  }
};

/**
 * Retrieves data from AsyncStorage
 * 
 * @param key The key of the value to retrieve
 * @param defaultValue Default value to return if not found
 * @returns Promise resolving to the stored value or defaultValue if not found
 */
export const getData = async <T>(key: string, defaultValue?: T): Promise<T | null> => {
  if (!key || key.trim() === '') {
    console.error('Cannot retrieve data with empty key');
    return defaultValue || null;
  }

  const storageKey = `${STORAGE_PREFIX}${key}`;

  try {
    const value = await AsyncStorage.getItem(storageKey);
    
    if (value === null) {
      return defaultValue || null;
    }

    try {
      // Attempt to parse as JSON
      return JSON.parse(value);
    } catch (parseError) {
      // Return as is if not valid JSON
      return value as unknown as T;
    }
  } catch (error) {
    console.error(`Error retrieving data for key ${key}:`, error);
    return defaultValue || null;
  }
};

/**
 * Removes data from AsyncStorage
 * 
 * @param key The key of the value to remove
 * @returns Promise resolving to true if successful, false otherwise
 */
export const removeData = async (key: string): Promise<boolean> => {
  if (!key || key.trim() === '') {
    console.error('Cannot remove data with empty key');
    return false;
  }

  const storageKey = `${STORAGE_PREFIX}${key}`;

  try {
    await AsyncStorage.removeItem(storageKey);
    return true;
  } catch (error) {
    console.error(`Error removing data for key ${key}:`, error);
    return false;
  }
};

/**
 * Retrieves all storage keys used by the application
 * 
 * @returns Promise resolving to array of all storage keys (without prefix)
 */
export const getAllKeys = async (): Promise<string[]> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    // Filter keys that start with our app prefix
    const appKeys = allKeys.filter(key => key.startsWith(STORAGE_PREFIX));
    // Remove the prefix
    return appKeys.map(key => key.substring(STORAGE_PREFIX.length));
  } catch (error) {
    console.error('Error retrieving all storage keys:', error);
    return [];
  }
};

/**
 * Clears all application data from AsyncStorage
 * 
 * @returns Promise resolving to true if successful, false otherwise
 */
export const clearAll = async (): Promise<boolean> => {
  try {
    const keys = await getAllKeys();
    const prefixedKeys = keys.map(key => `${STORAGE_PREFIX}${key}`);
    
    if (prefixedKeys.length > 0) {
      await AsyncStorage.multiRemove(prefixedKeys);
    }
    
    return true;
  } catch (error) {
    console.error('Error clearing all storage data:', error);
    return false;
  }
};

/**
 * Stores multiple key-value pairs in a single operation
 * 
 * @param keyValuePairs Array of key-value pairs to store
 * @returns Promise resolving to true if successful, false otherwise
 */
export const multiSet = async (keyValuePairs: Array<[string, any]>): Promise<boolean> => {
  if (!Array.isArray(keyValuePairs) || keyValuePairs.length === 0) {
    console.error('Cannot store empty or non-array data');
    return false;
  }

  try {
    // Transform values to strings and add prefix to keys
    const transformedPairs = keyValuePairs.map(([key, value]) => [
      `${STORAGE_PREFIX}${key}`,
      typeof value === 'string' ? value : JSON.stringify(value)
    ]);

    await AsyncStorage.multiSet(transformedPairs as Array<[string, string]>);
    return true;
  } catch (error) {
    console.error('Error storing multiple key-value pairs:', error);
    return false;
  }
};

/**
 * Retrieves multiple values in a single operation
 * 
 * @param keys Array of keys to retrieve
 * @returns Promise resolving to object with key-value pairs of retrieved data
 */
export const multiGet = async (keys: string[]): Promise<Record<string, any>> => {
  if (!Array.isArray(keys) || keys.length === 0) {
    console.error('Cannot retrieve empty or non-array keys');
    return {};
  }

  try {
    // Add prefix to keys
    const prefixedKeys = keys.map(key => `${STORAGE_PREFIX}${key}`);
    
    // Get all values
    const keyValuePairs = await AsyncStorage.multiGet(prefixedKeys);
    
    // Convert to object and parse JSON values
    const result: Record<string, any> = {};
    
    keyValuePairs.forEach(([prefixedKey, value]) => {
      if (value !== null) {
        // Remove prefix from key
        const key = prefixedKey.substring(STORAGE_PREFIX.length);
        
        try {
          // Try to parse JSON
          result[key] = JSON.parse(value);
        } catch (parseError) {
          // Use as-is if not valid JSON
          result[key] = value;
        }
      }
    });
    
    return result;
  } catch (error) {
    console.error('Error retrieving multiple values:', error);
    return {};
  }
};

/**
 * Removes multiple stored items in a single operation
 * 
 * @param keys Array of keys to remove
 * @returns Promise resolving to true if successful, false otherwise
 */
export const multiRemove = async (keys: string[]): Promise<boolean> => {
  if (!Array.isArray(keys) || keys.length === 0) {
    console.error('Cannot remove empty or non-array keys');
    return false;
  }

  try {
    // Add prefix to keys
    const prefixedKeys = keys.map(key => `${STORAGE_PREFIX}${key}`);
    
    await AsyncStorage.multiRemove(prefixedKeys);
    return true;
  } catch (error) {
    console.error('Error removing multiple items:', error);
    return false;
  }
};

/**
 * Stores application settings in AsyncStorage
 * 
 * @param settings Settings object to store
 * @returns Promise resolving to true if successful, false otherwise
 */
export const saveAppSettings = async (settings: object): Promise<boolean> => {
  try {
    // Get existing settings
    const existingSettings = await getData(APP_SETTINGS_KEY, {});
    
    // Merge with new settings
    const updatedSettings = {
      ...existingSettings,
      ...settings,
    };
    
    return await storeData(APP_SETTINGS_KEY, updatedSettings);
  } catch (error) {
    console.error('Error saving app settings:', error);
    return false;
  }
};

/**
 * Retrieves application settings from AsyncStorage
 * 
 * @returns Promise resolving to application settings object
 */
export const getAppSettings = async (): Promise<object> => {
  return await getData(APP_SETTINGS_KEY, {});
};

/**
 * Stores user preferences in AsyncStorage
 * 
 * @param preferences User preferences object to store
 * @returns Promise resolving to true if successful, false otherwise
 */
export const saveUserPreferences = async (preferences: object): Promise<boolean> => {
  try {
    // Get existing preferences
    const existingPreferences = await getData(USER_PREFERENCES_KEY, {});
    
    // Merge with new preferences
    const updatedPreferences = {
      ...existingPreferences,
      ...preferences,
    };
    
    return await storeData(USER_PREFERENCES_KEY, updatedPreferences);
  } catch (error) {
    console.error('Error saving user preferences:', error);
    return false;
  }
};

/**
 * Retrieves user preferences from AsyncStorage
 * 
 * @returns Promise resolving to user preferences object
 */
export const getUserPreferences = async (): Promise<object> => {
  return await getData(USER_PREFERENCES_KEY, {});
};

/**
 * Checks if data caching is enabled in application settings
 * 
 * @returns Promise resolving to true if caching is enabled, false otherwise
 */
export const cachingEnabled = async (): Promise<boolean> => {
  const settings = await getAppSettings();
  
  // @ts-ignore - We don't have a strict type for settings
  return settings.disableCaching !== true;
};

/**
 * Stores data in the cache with expiration time
 * 
 * @param key Cache key
 * @param data Data to cache
 * @param expiryTime Expiration time in milliseconds (default: 24 hours)
 * @returns Promise resolving to true if successful, false otherwise
 */
export const cacheData = async <T>(
  key: string, 
  data: T, 
  expiryTime: number = CACHE_EXPIRY_TIME
): Promise<boolean> => {
  if (!key || key.trim() === '') {
    console.error('Cannot cache data with empty key');
    return false;
  }

  // Check if caching is enabled
  const isCachingEnabled = await cachingEnabled();
  if (!isCachingEnabled) {
    return false;
  }

  const cacheKey = `${CACHE_STORAGE_KEY}:${key}`;
  
  // Create cache object
  const cacheItem: CacheItem<T> = {
    data,
    timestamp: Date.now(),
    expiryTime,
  };
  
  return await storeData(cacheKey, cacheItem);
};

/**
 * Retrieves data from cache if not expired
 * 
 * @param key Cache key
 * @returns Promise resolving to cached data if valid, null if expired or not found
 */
export const getCachedData = async <T>(key: string): Promise<T | null> => {
  if (!key || key.trim() === '') {
    console.error('Cannot retrieve cache with empty key');
    return null;
  }

  const cacheKey = `${CACHE_STORAGE_KEY}:${key}`;
  
  // Get cache item
  const cacheItem = await getData<CacheItem<T>>(cacheKey, null);
  
  if (!cacheItem) {
    return null;
  }
  
  // Check if cache has expired
  const now = Date.now();
  const expireAt = cacheItem.timestamp + cacheItem.expiryTime;
  
  if (now > expireAt) {
    // Cache expired, remove it
    await removeData(cacheKey);
    return null;
  }
  
  return cacheItem.data;
};

/**
 * Removes specific data from cache
 * 
 * @param key Cache key
 * @returns Promise resolving to true if successful, false otherwise
 */
export const removeCachedData = async (key: string): Promise<boolean> => {
  if (!key || key.trim() === '') {
    console.error('Cannot remove cache with empty key');
    return false;
  }

  const cacheKey = `${CACHE_STORAGE_KEY}:${key}`;
  return await removeData(cacheKey);
};

/**
 * Removes all cached data
 * 
 * @returns Promise resolving to true if successful, false otherwise
 */
export const clearCache = async (): Promise<boolean> => {
  try {
    const allKeys = await getAllKeys();
    const cacheKeys = allKeys.filter(key => key.startsWith(`${CACHE_STORAGE_KEY}:`));
    
    if (cacheKeys.length > 0) {
      return await multiRemove(cacheKeys);
    }
    
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
};

/**
 * Caches job listing data for offline access
 * 
 * @param jobs Array of job objects
 * @returns Promise resolving to true if successful, false otherwise
 */
export const cacheJobs = async (jobs: Array<object>): Promise<boolean> => {
  if (!Array.isArray(jobs)) {
    console.error('Jobs must be an array');
    return false;
  }
  
  const result = await storeData(JOB_CACHE_KEY, jobs);
  
  if (result) {
    await updateLastSyncTime();
  }
  
  return result;
};

/**
 * Retrieves cached job listings
 * 
 * @returns Promise resolving to cached jobs if available, null otherwise
 */
export const getCachedJobs = async (): Promise<Array<object> | null> => {
  return await getData(JOB_CACHE_KEY, null);
};

/**
 * Caches user profile data for offline access
 * 
 * @param profile User profile object
 * @returns Promise resolving to true if successful, false otherwise
 */
export const cacheUserProfile = async (profile: object): Promise<boolean> => {
  if (!profile || typeof profile !== 'object') {
    console.error('Invalid profile object');
    return false;
  }
  
  const result = await storeData(PROFILE_CACHE_KEY, profile);
  
  if (result) {
    await updateLastSyncTime();
  }
  
  return result;
};

/**
 * Retrieves cached user profile
 * 
 * @returns Promise resolving to cached profile if available, null otherwise
 */
export const getCachedUserProfile = async (): Promise<object | null> => {
  return await getData(PROFILE_CACHE_KEY, null);
};

/**
 * Updates the timestamp of the last data synchronization
 * 
 * @returns Promise resolving to true if successful, false otherwise
 */
export const updateLastSyncTime = async (): Promise<boolean> => {
  return await storeData(LAST_SYNC_KEY, Date.now());
};

/**
 * Retrieves the timestamp of the last data synchronization
 * 
 * @returns Promise resolving to timestamp of last sync, or null if never synced
 */
export const getLastSyncTime = async (): Promise<number | null> => {
  return await getData(LAST_SYNC_KEY, null);
};

/**
 * Checks if AsyncStorage is available and working properly
 * 
 * @returns Promise resolving to true if storage is available, false otherwise
 */
export const isStorageAvailable = async (): Promise<boolean> => {
  try {
    const testKey = `${STORAGE_PREFIX}storage_test`;
    const testValue = 'test_value';
    
    // Try to write to storage
    await AsyncStorage.setItem(testKey, testValue);
    
    // Try to read from storage
    const retrievedValue = await AsyncStorage.getItem(testKey);
    
    // Clean up test value
    await AsyncStorage.removeItem(testKey);
    
    return retrievedValue === testValue;
  } catch (error) {
    console.error('AsyncStorage is not available:', error);
    return false;
  }
};

/**
 * Retrieves information about storage usage
 * 
 * @returns Promise resolving to storage usage information
 */
export const getStorageInfo = async (): Promise<object> => {
  try {
    const allKeys = await getAllKeys();
    const cacheKeys = allKeys.filter(key => key.startsWith(`${CACHE_STORAGE_KEY}:`));
    const lastSyncTime = await getLastSyncTime();
    
    const isSecureAvailable = await isSecureStorageAvailable();
    
    return {
      totalItems: allKeys.length,
      cacheItems: cacheKeys.length,
      lastSyncTime,
      isStorageAvailable: true,
      isSecureStorageAvailable: isSecureAvailable,
      platform: Platform.OS,
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return {
      error: 'Failed to retrieve storage information',
      isStorageAvailable: false,
    };
  }
};