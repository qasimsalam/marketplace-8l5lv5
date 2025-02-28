/**
 * Browser Storage Utility
 * v1.0.0 - TypeScript + Browser Storage API
 * 
 * Provides utilities for managing browser storage (localStorage, sessionStorage, cookies)
 * with type safety and error handling for the AI Talent Marketplace.
 * 
 * Supports session management, user preferences, and application state persistence.
 */

// Global storage keys
export const AUTH_TOKEN_KEY = 'ai_talent_auth_token';
export const USER_PREFERENCES_KEY = 'ai_talent_user_preferences';
export const SESSION_EXPIRY_KEY = 'ai_talent_session_expiry';

// Storage type enum
export enum StorageType {
  Local = 'localStorage',
  Session = 'sessionStorage'
}

// Cookie options interface
export interface CookieOptions {
  expires?: Date | number;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

// User preferences interface
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  highContrast: boolean;
  reducedMotion: boolean;
}

// Default user preferences
const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'system',
  fontSize: 'medium',
  highContrast: false,
  reducedMotion: false
};

/**
 * Stores a value in browser storage with automatic serialization and error handling
 * 
 * @param key - Storage key
 * @param value - Value to store (will be JSON serialized if not a primitive)
 * @param storageType - Which storage to use (localStorage or sessionStorage)
 * @returns Success or failure of the storage operation
 */
export function setItem<T>(key: string, value: T, storageType: StorageType = StorageType.Local): boolean {
  if (!key || typeof key !== 'string') {
    console.error('Storage key must be a non-empty string');
    return false;
  }

  if (!isStorageAvailable(storageType)) {
    console.error(`${storageType} is not available in this browser`);
    return false;
  }

  try {
    const storage = window[storageType];
    const valueToStore = typeof value === 'object' ? JSON.stringify(value) : String(value);
    storage.setItem(key, valueToStore);
    return true;
  } catch (error) {
    console.error(`Error storing ${key} in ${storageType}:`, error);
    return false;
  }
}

/**
 * Retrieves a value from browser storage with automatic deserialization and type casting
 * 
 * @param key - Storage key
 * @param defaultValue - Default value to return if key not found
 * @param storageType - Which storage to use (localStorage or sessionStorage)
 * @returns Retrieved value or defaultValue if not found
 */
export function getItem<T>(key: string, defaultValue: T | null = null, storageType: StorageType = StorageType.Local): T | null {
  if (!key || typeof key !== 'string') {
    console.error('Storage key must be a non-empty string');
    return defaultValue;
  }

  if (!isStorageAvailable(storageType)) {
    console.error(`${storageType} is not available in this browser`);
    return defaultValue;
  }

  try {
    const storage = window[storageType];
    const item = storage.getItem(key);
    
    if (item === null) {
      return defaultValue;
    }

    try {
      // Attempt to parse as JSON
      return JSON.parse(item) as T;
    } catch (e) {
      // If parsing fails, return as is
      return item as unknown as T;
    }
  } catch (error) {
    console.error(`Error retrieving ${key} from ${storageType}:`, error);
    return defaultValue;
  }
}

/**
 * Removes an item from browser storage
 * 
 * @param key - Storage key to remove
 * @param storageType - Which storage to use (localStorage or sessionStorage)
 * @returns Success or failure of the removal operation
 */
export function removeItem(key: string, storageType: StorageType = StorageType.Local): boolean {
  if (!key || typeof key !== 'string') {
    console.error('Storage key must be a non-empty string');
    return false;
  }

  if (!isStorageAvailable(storageType)) {
    console.error(`${storageType} is not available in this browser`);
    return false;
  }

  try {
    const storage = window[storageType];
    storage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing ${key} from ${storageType}:`, error);
    return false;
  }
}

/**
 * Clears all items from the specified storage
 * 
 * @param storageType - Which storage to clear (localStorage or sessionStorage)
 * @returns Success or failure of the clear operation
 */
export function clear(storageType: StorageType = StorageType.Local): boolean {
  if (!isStorageAvailable(storageType)) {
    console.error(`${storageType} is not available in this browser`);
    return false;
  }

  try {
    const storage = window[storageType];
    storage.clear();
    return true;
  } catch (error) {
    console.error(`Error clearing ${storageType}:`, error);
    return false;
  }
}

/**
 * Stores authentication token in browser storage with appropriate security measures
 * 
 * @param token - JWT authentication token
 * @param remember - Whether to persist token in localStorage (true) or sessionStorage (false)
 * @returns Success or failure of the token storage operation
 */
export function setAuthToken(token: string, remember: boolean = false): boolean {
  if (!token) {
    console.error('Authentication token cannot be empty');
    return false;
  }

  try {
    // Clear any existing token from both storages
    removeAuthToken();
    
    // Store in the appropriate storage type
    const storageType = remember ? StorageType.Local : StorageType.Session;
    
    if (remember) {
      // If remembering, set an expiry timestamp (30 days)
      const expiryTime = Date.now() + (30 * 24 * 60 * 60 * 1000);
      setItem(SESSION_EXPIRY_KEY, expiryTime, StorageType.Local);
    }
    
    return setItem(AUTH_TOKEN_KEY, token, storageType);
  } catch (error) {
    console.error('Error storing authentication token:', error);
    return false;
  }
}

/**
 * Retrieves authentication token from browser storage and validates expiry
 * 
 * @returns Auth token or null if not found or expired
 */
export function getAuthToken(): string | null {
  try {
    // Check localStorage first
    if (isStorageAvailable(StorageType.Local)) {
      const token = getItem<string>(AUTH_TOKEN_KEY, null, StorageType.Local);
      
      if (token) {
        // Check if the token has expired
        const expiryTime = getItem<number>(SESSION_EXPIRY_KEY, 0, StorageType.Local);
        if (expiryTime && Date.now() < expiryTime) {
          return token;
        } else {
          // Token expired, clean up
          removeItem(AUTH_TOKEN_KEY, StorageType.Local);
          removeItem(SESSION_EXPIRY_KEY, StorageType.Local);
        }
      }
    }
    
    // Fallback to sessionStorage
    if (isStorageAvailable(StorageType.Session)) {
      return getItem<string>(AUTH_TOKEN_KEY, null, StorageType.Session);
    }
    
    return null;
  } catch (error) {
    console.error('Error retrieving authentication token:', error);
    return null;
  }
}

/**
 * Removes authentication token from browser storage
 * 
 * @returns Success or failure of the removal operation
 */
export function removeAuthToken(): boolean {
  let success = false;
  
  // Remove from localStorage if available
  if (isStorageAvailable(StorageType.Local)) {
    success = removeItem(AUTH_TOKEN_KEY, StorageType.Local) || success;
    removeItem(SESSION_EXPIRY_KEY, StorageType.Local);
  }
  
  // Remove from sessionStorage if available
  if (isStorageAvailable(StorageType.Session)) {
    success = removeItem(AUTH_TOKEN_KEY, StorageType.Session) || success;
  }
  
  return success;
}

/**
 * Stores user preferences in localStorage
 * 
 * @param preferences - User preferences to store
 * @returns Success or failure of storage operation
 */
export function setUserPreferences(preferences: Partial<UserPreferences>): boolean {
  try {
    // Get current preferences and merge with new ones
    const currentPreferences = getUserPreferences();
    const mergedPreferences: UserPreferences = {
      ...currentPreferences,
      ...preferences
    };
    
    return setItem(USER_PREFERENCES_KEY, mergedPreferences, StorageType.Local);
  } catch (error) {
    console.error('Error storing user preferences:', error);
    return false;
  }
}

/**
 * Retrieves user preferences from localStorage
 * 
 * @returns User preferences object or default preferences
 */
export function getUserPreferences(): UserPreferences {
  try {
    const preferences = getItem<UserPreferences>(
      USER_PREFERENCES_KEY, 
      DEFAULT_USER_PREFERENCES, 
      StorageType.Local
    );
    
    return preferences || DEFAULT_USER_PREFERENCES;
  } catch (error) {
    console.error('Error retrieving user preferences:', error);
    return DEFAULT_USER_PREFERENCES;
  }
}

/**
 * Sets a browser cookie with configurable options
 * 
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Configuration options (expires, path, domain, secure, sameSite)
 */
export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  if (!name || !value) {
    console.error('Cookie name and value are required');
    return;
  }

  try {
    const cookieOptions: CookieOptions = {
      path: '/',
      ...options
    };

    let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

    if (cookieOptions.expires) {
      if (typeof cookieOptions.expires === 'number') {
        // If expires is a number, treat it as days from now
        const date = new Date();
        date.setTime(date.getTime() + (cookieOptions.expires * 24 * 60 * 60 * 1000));
        cookieOptions.expires = date;
      }
      cookieString += `; expires=${cookieOptions.expires.toUTCString()}`;
    }

    if (cookieOptions.path) {
      cookieString += `; path=${cookieOptions.path}`;
    }

    if (cookieOptions.domain) {
      cookieString += `; domain=${cookieOptions.domain}`;
    }

    if (cookieOptions.secure) {
      cookieString += '; secure';
    }

    if (cookieOptions.sameSite) {
      cookieString += `; samesite=${cookieOptions.sameSite}`;
    }

    document.cookie = cookieString;
  } catch (error) {
    console.error(`Error setting cookie ${name}:`, error);
  }
}

/**
 * Retrieves a cookie value by name
 * 
 * @param name - Cookie name
 * @returns Cookie value or null if not found
 */
export function getCookie(name: string): string | null {
  if (!name) {
    console.error('Cookie name is required');
    return null;
  }

  try {
    const cookies = document.cookie.split(';');
    const encodedName = encodeURIComponent(name);
    
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      
      // Check if this cookie starts with the name we're looking for
      if (cookie.indexOf(`${encodedName}=`) === 0) {
        return decodeURIComponent(
          cookie.substring(encodedName.length + 1, cookie.length)
        );
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting cookie ${name}:`, error);
    return null;
  }
}

/**
 * Removes a cookie by setting its expiry to a past date
 * 
 * @param name - Cookie name
 * @param options - Cookie options (path and domain must match the original cookie)
 */
export function removeCookie(name: string, options: CookieOptions = {}): void {
  if (!name) {
    console.error('Cookie name is required');
    return;
  }

  try {
    // Set expiry to a date in the past to delete the cookie
    const deletionOptions: CookieOptions = {
      ...options,
      expires: new Date(0) // Unix epoch
    };
    
    setCookie(name, '', deletionOptions);
  } catch (error) {
    console.error(`Error removing cookie ${name}:`, error);
  }
}

/**
 * Checks if a specified storage type is available in the browser
 * 
 * @param type - Storage type to check
 * @returns Whether the storage is available
 */
export function isStorageAvailable(type: StorageType): boolean {
  try {
    const storage = window[type];
    const testKey = '__storage_test__';
    
    storage.setItem(testKey, testKey);
    const result = storage.getItem(testKey) === testKey;
    storage.removeItem(testKey);
    
    return result;
  } catch (e) {
    // Storage might be unavailable or restricted (e.g. private browsing)
    return false;
  }
}