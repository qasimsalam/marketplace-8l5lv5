/**
 * Local Storage Utility for iOS
 * 
 * This module provides a unified interface for persisting data using AsyncStorage.
 * It is designed to store non-sensitive application data such as user preferences,
 * cache, and other application state information.
 * 
 * For storing sensitive information such as authentication tokens and user credentials,
 * use the keychain utility module instead.
 * 
 * @version 1.0.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage'; // v1.18.2
import { Platform } from 'react-native'; // v0.72.x
import { isKeychainAvailable } from '../utils/keychain';

// Storage key constants with namespace prefix to avoid collisions
export const STORAGE_PREFIX = '@AITalentMarketplace:';
export const APP_SETTINGS_KEY = 'app_settings';
export const USER_PREFERENCES_KEY = 'user_preferences';
export const CACHE_STORAGE_KEY = 'cache';
export const JOB_CACHE_KEY = 'jobs_cache';
export const PROFILE_CACHE_KEY = 'profile_cache';
export const LAST_SYNC_KEY = 'last_sync';
export const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Stores data in AsyncStorage with the application prefix
 * 
 * @param key - The storage key (will be prefixed)
 * @param value - The value to store (will be JSON stringified if not a string)
 * @returns Promise resolving to true if data was stored successfully, false otherwise
 */
export const storeData = async (key: string, value: any): Promise<boolean> => {
  // Validate key
  if (!key || typeof key !== 'string') {
    console.error('Storage key must be a non-empty string');
    return false;
  }

  // Add prefix to key
  const prefixedKey = `${STORAGE_PREFIX}${key}`;
  
  // Convert value to string if it's not already
  const stringValue = typeof value === 'string' 
    ? value 
    : JSON.stringify(value);

  try {
    await AsyncStorage.setItem(prefixedKey, stringValue);
    return true;
  } catch (error) {
    console.error(`Error storing data for key '${key}':`, error);
    return false;
  }
};

/**
 * Retrieves data from AsyncStorage
 * 
 * @param key - The storage key (will be prefixed)
 * @param defaultValue - Default value to return if key is not found
 * @returns Promise resolving to the stored value or defaultValue if not found
 */
export const getData = async <T = any>(key: string, defaultValue: T = null as unknown as T): Promise<T> => {
  // Validate key
  if (!key || typeof key !== 'string') {
    console.error('Storage key must be a non-empty string');
    return defaultValue;
  }

  // Add prefix to key
  const prefixedKey = `${STORAGE_PREFIX}${key}`;

  try {
    const value = await AsyncStorage.getItem(prefixedKey);
    
    if (value === null) {
      return defaultValue;
    }
    
    try {
      // Attempt to parse as JSON
      return JSON.parse(value);
    } catch (parseError) {
      // If parsing fails, return as string
      return value as unknown as T;
    }
  } catch (error) {
    console.error(`Error retrieving data for key '${key}':`, error);
    return defaultValue;
  }
};

/**
 * Removes data from AsyncStorage
 * 
 * @param key - The storage key (will be prefixed)
 * @returns Promise resolving to true if data was removed successfully, false otherwise
 */
export const removeData = async (key: string): Promise<boolean> => {
  // Validate key
  if (!key || typeof key !== 'string') {
    console.error('Storage key must be a non-empty string');
    return false;
  }

  // Add prefix to key
  const prefixedKey = `${STORAGE_PREFIX}${key}`;

  try {
    await AsyncStorage.removeItem(prefixedKey);
    return true;
  } catch (error) {
    console.error(`Error removing data for key '${key}':`, error);
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
    // Get all keys from AsyncStorage
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Filter keys to only include those with our prefix
    const appKeys = allKeys.filter(key => key.startsWith(STORAGE_PREFIX));
    
    // Remove prefix from keys before returning
    return appKeys.map(key => key.replace(STORAGE_PREFIX, ''));
  } catch (error) {
    console.error('Error retrieving all storage keys:', error);
    return [];
  }
};

/**
 * Clears all application data from AsyncStorage
 * 
 * @returns Promise resolving to true if all data was cleared successfully, false otherwise
 */
export const clearAll = async (): Promise<boolean> => {
  try {
    // Get all keys for our application
    const keys = await getAllKeys();
    
    if (keys.length === 0) {
      return true; // No keys to remove
    }
    
    // Re-add prefix to keys
    const prefixedKeys = keys.map(key => `${STORAGE_PREFIX}${key}`);
    
    // Remove all keys in a single operation
    await AsyncStorage.multiRemove(prefixedKeys);
    return true;
  } catch (error) {
    console.error('Error clearing all application data:', error);
    return false;
  }
};

/**
 * Stores multiple key-value pairs in a single operation
 * 
 * @param keyValuePairs - Array of [key, value] pairs to store
 * @returns Promise resolving to true if all data was stored successfully, false otherwise
 */
export const multiSet = async (keyValuePairs: Array<[string, any]>): Promise<boolean> => {
  if (!Array.isArray(keyValuePairs)) {
    console.error('keyValuePairs must be an array');
    return false;
  }

  try {
    // Transform key-value pairs: add prefix and stringify values
    const transformedPairs = keyValuePairs.map(([key, value]) => {
      const prefixedKey = `${STORAGE_PREFIX}${key}`;
      const stringValue = typeof value === 'string' 
        ? value 
        : JSON.stringify(value);
      return [prefixedKey, stringValue];
    });

    // Store all pairs in a single operation
    await AsyncStorage.multiSet(transformedPairs as [string, string][]);
    return true;
  } catch (error) {
    console.error('Error storing multiple key-value pairs:', error);
    return false;
  }
};

/**
 * Retrieves multiple values in a single operation
 * 
 * @param keys - Array of keys to retrieve
 * @returns Promise resolving to object with key-value pairs of retrieved data
 */
export const multiGet = async (keys: string[]): Promise<Record<string, any>> => {
  if (!Array.isArray(keys)) {
    console.error('keys must be an array of strings');
    return {};
  }

  try {
    // Add prefix to keys
    const prefixedKeys = keys.map(key => `${STORAGE_PREFIX}${key}`);
    
    // Retrieve all values in a single operation
    const keyValuePairs = await AsyncStorage.multiGet(prefixedKeys);
    
    // Transform results into an object with original keys and parsed values
    const result: Record<string, any> = {};
    
    keyValuePairs.forEach(([key, value]) => {
      if (value === null) return;
      
      // Remove prefix from key
      const originalKey = key.replace(STORAGE_PREFIX, '');
      
      try {
        // Attempt to parse as JSON
        result[originalKey] = JSON.parse(value);
      } catch (parseError) {
        // If parsing fails, store as string
        result[originalKey] = value;
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
 * @param keys - Array of keys to remove
 * @returns Promise resolving to true if all items were removed successfully, false otherwise
 */
export const multiRemove = async (keys: string[]): Promise<boolean> => {
  if (!Array.isArray(keys)) {
    console.error('keys must be an array of strings');
    return false;
  }

  try {
    // Add prefix to keys
    const prefixedKeys = keys.map(key => `${STORAGE_PREFIX}${key}`);
    
    // Remove all keys in a single operation
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
 * @param settings - Settings object to store
 * @returns Promise resolving to true if settings were saved successfully, false otherwise
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
    
    // Save updated settings
    return await storeData(APP_SETTINGS_KEY, updatedSettings);
  } catch (error) {
    console.error('Error saving application settings:', error);
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
 * @param preferences - Preferences object to store
 * @returns Promise resolving to true if preferences were saved successfully, false otherwise
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
    
    // Save updated preferences
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
  // Check if caching is explicitly disabled, default to enabled
  return !(settings as any).disableCaching;
};

/**
 * Stores data in the cache with expiration time
 * 
 * @param key - Cache key
 * @param data - Data to cache
 * @param expiryTime - Cache expiry time in milliseconds (defaults to CACHE_EXPIRY_TIME)
 * @returns Promise resolving to true if data was cached successfully, false otherwise
 */
export const cacheData = async (
  key: string, 
  data: any, 
  expiryTime: number = CACHE_EXPIRY_TIME
): Promise<boolean> => {
  // Check if caching is enabled
  const isCachingEnabled = await cachingEnabled();
  if (!isCachingEnabled) {
    return false;
  }

  // Create cache object with data, timestamp and expiry
  const cacheObject = {
    data,
    timestamp: Date.now(),
    expiryTime,
  };
  
  // Store in cache
  return await storeData(`${CACHE_STORAGE_KEY}:${key}`, cacheObject);
};

/**
 * Retrieves data from cache if not expired
 * 
 * @param key - Cache key
 * @returns Promise resolving to cached data if valid, null if expired or not found
 */
export const getCachedData = async <T = any>(key: string): Promise<T | null> => {
  // Get cache object
  const cache = await getData(`${CACHE_STORAGE_KEY}:${key}`, null);
  
  if (!cache) {
    return null;
  }
  
  // Check if cache has expired
  const { data, timestamp, expiryTime } = cache;
  const now = Date.now();
  
  if (now - timestamp > expiryTime) {
    // Cache expired, remove it
    await removeData(`${CACHE_STORAGE_KEY}:${key}`);
    return null;
  }
  
  return data;
};

/**
 * Removes specific data from cache
 * 
 * @param key - Cache key
 * @returns Promise resolving to true if cache was removed successfully, false otherwise
 */
export const removeCachedData = async (key: string): Promise<boolean> => {
  return await removeData(`${CACHE_STORAGE_KEY}:${key}`);
};

/**
 * Removes all cached data
 * 
 * @returns Promise resolving to true if cache was cleared successfully, false otherwise
 */
export const clearCache = async (): Promise<boolean> => {
  try {
    // Get all keys
    const allKeys = await getAllKeys();
    
    // Filter cache keys
    const cacheKeys = allKeys.filter(key => 
      key.startsWith(`${CACHE_STORAGE_KEY}:`)
    );
    
    if (cacheKeys.length === 0) {
      return true; // No cache to clear
    }
    
    // Remove all cache keys
    return await multiRemove(cacheKeys);
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
};

/**
 * Caches job listing data for offline access
 * 
 * @param jobs - Array of job objects to cache
 * @returns Promise resolving to true if jobs were cached successfully, false otherwise
 */
export const cacheJobs = async (jobs: Array<object>): Promise<boolean> => {
  try {
    // Store jobs in cache
    const stored = await storeData(JOB_CACHE_KEY, jobs);
    
    // Update last sync time
    if (stored) {
      await updateLastSyncTime();
    }
    
    return stored;
  } catch (error) {
    console.error('Error caching jobs:', error);
    return false;
  }
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
 * @param profile - User profile object to cache
 * @returns Promise resolving to true if profile was cached successfully, false otherwise
 */
export const cacheUserProfile = async (profile: object): Promise<boolean> => {
  try {
    // Store profile in cache
    const stored = await storeData(PROFILE_CACHE_KEY, profile);
    
    // Update last sync time
    if (stored) {
      await updateLastSyncTime();
    }
    
    return stored;
  } catch (error) {
    console.error('Error caching user profile:', error);
    return false;
  }
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
 * @returns Promise resolving to true if timestamp was updated successfully, false otherwise
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
  const testKey = 'storage_test';
  const testValue = 'test_value';
  
  try {
    // Try to store a test value
    const stored = await storeData(testKey, testValue);
    if (!stored) return false;
    
    // Try to retrieve the test value
    const retrieved = await getData(testKey, null);
    if (retrieved !== testValue) return false;
    
    // Clean up
    await removeData(testKey);
    
    return true;
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
    // Get all keys
    const allKeys = await getAllKeys();
    
    // Count cache items
    const cacheCount = allKeys.filter(key => 
      key.startsWith(`${CACHE_STORAGE_KEY}:`)
    ).length;
    
    // Get last sync time
    const lastSync = await getLastSyncTime();
    
    return {
      totalItems: allKeys.length,
      cacheItems: cacheCount,
      settingsStored: (await getAppSettings() !== null),
      preferencesStored: (await getUserPreferences() !== null),
      lastSyncTime: lastSync,
      storageAvailable: await isStorageAvailable(),
      keychainAvailable: await isKeychainAvailable(),
      platform: Platform.OS,
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return {
      error: 'Failed to retrieve storage information',
      storageAvailable: false,
    };
  }
};