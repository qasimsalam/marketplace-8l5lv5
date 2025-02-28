/**
 * Permission Management Utility
 * 
 * Provides comprehensive permission management for the AI Talent Marketplace Android app.
 * Handles checking, requesting, and monitoring various runtime permissions required by the app.
 * 
 * @packageDocumentation
 */

import { Platform, Linking, NativeModules } from 'react-native'; // v0.72.x
import { request, check, PERMISSIONS, RESULTS, Permission } from 'react-native-permissions'; // v3.8.0

const NotificationModule = NativeModules.NotificationModule;

/**
 * Enum representing the different types of permissions that the app might require
 */
export enum PermissionType {
  CAMERA = 'camera',
  PHOTO_LIBRARY = 'photoLibrary',
  STORAGE = 'storage',
  LOCATION = 'location',
  MICROPHONE = 'microphone',
  NOTIFICATIONS = 'notifications'
}

/**
 * Constants representing possible permission status results
 */
export const PERMISSION_RESULTS = {
  UNAVAILABLE: RESULTS.UNAVAILABLE,
  DENIED: RESULTS.DENIED,
  GRANTED: RESULTS.GRANTED,
  BLOCKED: RESULTS.BLOCKED,
  LIMITED: RESULTS.LIMITED
};

/**
 * Mapping of permission types to platform-specific permission identifiers
 */
const PERMISSION_MAP = {
  CAMERA: Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA,
  PHOTO_LIBRARY: Platform.OS === 'ios' ? PERMISSIONS.IOS.PHOTO_LIBRARY : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
  STORAGE: Platform.OS === 'ios' ? PERMISSIONS.IOS.PHOTO_LIBRARY : PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE,
  LOCATION: Platform.OS === 'ios' ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  MICROPHONE: Platform.OS === 'ios' ? PERMISSIONS.IOS.MICROPHONE : PERMISSIONS.ANDROID.RECORD_AUDIO,
  NOTIFICATIONS: Platform.OS === 'ios' ? PERMISSIONS.IOS.NOTIFICATIONS : null
};

/**
 * Checks if a specific permission is granted
 * 
 * @param permission - The permission to check
 * @returns A promise that resolves to true if the permission is granted, false otherwise
 */
export const checkPermission = async (permission: Permission): Promise<boolean> => {
  try {
    // Validate permission for the current platform
    if (!permission) {
      console.warn('Attempted to check an undefined permission');
      return false;
    }

    // Some permissions don't exist on certain platforms
    if (Platform.OS === 'android' && permission === PERMISSION_MAP.NOTIFICATIONS) {
      // Android notification permissions are handled differently
      return await checkNotificationPermission();
    }

    const status = await check(permission);
    
    // Return true if permission is either granted or limited (iOS 14+ photo library)
    return status === RESULTS.GRANTED || status === RESULTS.LIMITED;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
};

/**
 * Requests a specific permission from the user
 * 
 * @param permission - The permission to request
 * @returns A promise that resolves to true if the permission is granted, false otherwise
 */
export const requestPermission = async (permission: Permission): Promise<boolean> => {
  try {
    // Validate permission for the current platform
    if (!permission) {
      console.warn('Attempted to request an undefined permission');
      return false;
    }

    // Some permissions don't exist on certain platforms
    if (Platform.OS === 'android' && permission === PERMISSION_MAP.NOTIFICATIONS) {
      // Android notification permissions are handled differently
      return await requestNotificationPermission();
    }

    const status = await request(permission);
    
    // Return true if permission is either granted or limited (iOS 14+ photo library)
    return status === RESULTS.GRANTED || status === RESULTS.LIMITED;
  } catch (error) {
    console.error('Error requesting permission:', error);
    return false;
  }
};

/**
 * Requests multiple permissions at once
 * 
 * @param permissions - Array of permissions to request
 * @returns A map of permissions to their granted status
 */
export const requestMultiplePermissions = async (permissions: Permission[]): Promise<Record<Permission, boolean>> => {
  try {
    // Filter out any invalid permissions for the current platform
    const validPermissions = permissions.filter(permission => !!permission);
    
    const results: Record<Permission, boolean> = {} as Record<Permission, boolean>;
    
    // Request each permission sequentially
    for (const permission of validPermissions) {
      results[permission] = await requestPermission(permission);
    }
    
    return results;
  } catch (error) {
    console.error('Error requesting multiple permissions:', error);
    // Return a map with all permissions set to false
    return permissions.reduce((acc, permission) => {
      acc[permission] = false;
      return acc;
    }, {} as Record<Permission, boolean>);
  }
};

/**
 * Checks if camera permission is granted
 * 
 * @returns A promise that resolves to true if permission is granted, false otherwise
 */
export const checkCameraPermission = async (): Promise<boolean> => {
  return checkPermission(PERMISSION_MAP.CAMERA);
};

/**
 * Requests camera permission from the user
 * 
 * @returns A promise that resolves to true if permission is granted, false otherwise
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  return requestPermission(PERMISSION_MAP.CAMERA);
};

/**
 * Checks if photo library permission is granted
 * 
 * @returns A promise that resolves to true if permission is granted, false otherwise
 */
export const checkPhotoLibraryPermission = async (): Promise<boolean> => {
  return checkPermission(PERMISSION_MAP.PHOTO_LIBRARY);
};

/**
 * Requests photo library permission from the user
 * 
 * @returns A promise that resolves to true if permission is granted, false otherwise
 */
export const requestPhotoLibraryPermission = async (): Promise<boolean> => {
  return requestPermission(PERMISSION_MAP.PHOTO_LIBRARY);
};

/**
 * Checks if storage permission is granted (write external storage on Android)
 * 
 * @returns A promise that resolves to true if permission is granted, false otherwise
 */
export const checkStoragePermission = async (): Promise<boolean> => {
  return checkPermission(PERMISSION_MAP.STORAGE);
};

/**
 * Requests storage permission from the user (write external storage on Android)
 * 
 * @returns A promise that resolves to true if permission is granted, false otherwise
 */
export const requestStoragePermission = async (): Promise<boolean> => {
  return requestPermission(PERMISSION_MAP.STORAGE);
};

/**
 * Checks if location permission is granted
 * 
 * @returns A promise that resolves to true if permission is granted, false otherwise
 */
export const checkLocationPermission = async (): Promise<boolean> => {
  return checkPermission(PERMISSION_MAP.LOCATION);
};

/**
 * Requests location permission from the user
 * 
 * @returns A promise that resolves to true if permission is granted, false otherwise
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  return requestPermission(PERMISSION_MAP.LOCATION);
};

/**
 * Checks if microphone permission is granted
 * 
 * @returns A promise that resolves to true if permission is granted, false otherwise
 */
export const checkMicrophonePermission = async (): Promise<boolean> => {
  return checkPermission(PERMISSION_MAP.MICROPHONE);
};

/**
 * Requests microphone permission from the user
 * 
 * @returns A promise that resolves to true if permission is granted, false otherwise
 */
export const requestMicrophonePermission = async (): Promise<boolean> => {
  return requestPermission(PERMISSION_MAP.MICROPHONE);
};

/**
 * Checks if notification permission is granted
 * 
 * @returns A promise that resolves to true if permission is granted, false otherwise
 */
export const checkNotificationPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'ios') {
      // On iOS, we can use the permissions library
      const status = await check(PERMISSION_MAP.NOTIFICATIONS);
      return status === RESULTS.GRANTED;
    } else {
      // On Android, we need to use a custom module for Android 13+ (API 33+)
      // For older Android versions, notifications don't require runtime permission
      if (NotificationModule && NotificationModule.checkNotificationPermission) {
        return await NotificationModule.checkNotificationPermission();
      }
      // Default to true for earlier Android versions
      return true;
    }
  } catch (error) {
    console.error('Error checking notification permission:', error);
    return false;
  }
};

/**
 * Requests notification permission from the user
 * 
 * @returns A promise that resolves to true if permission is granted, false otherwise
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'ios') {
      // On iOS, we can use the permissions library
      const status = await request(PERMISSION_MAP.NOTIFICATIONS);
      return status === RESULTS.GRANTED;
    } else {
      // On Android, we need to use a custom module for Android 13+ (API 33+)
      // For older Android versions, notifications don't require runtime permission
      if (NotificationModule && NotificationModule.requestNotificationPermission) {
        return await NotificationModule.requestNotificationPermission();
      }
      // Default to true for earlier Android versions
      return true;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

/**
 * Opens the app settings page where the user can manage permissions
 * 
 * @returns A promise that resolves when settings are opened or rejects if there's an error
 */
export const openAppSettings = async (): Promise<void> => {
  try {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      await Linking.openSettings();
    }
  } catch (error) {
    console.error('Error opening app settings:', error);
    throw new Error('Could not open app settings');
  }
};

/**
 * Gets the detailed permission status beyond just granted/denied
 * 
 * @param permission - The permission to check
 * @returns A promise that resolves to one of the RESULTS constants
 */
export const getPermissionStatus = async (permission: Permission): Promise<string> => {
  try {
    // Validate permission for the current platform
    if (!permission) {
      console.warn('Attempted to check an undefined permission');
      return RESULTS.UNAVAILABLE;
    }

    // Handle Android notification permissions differently
    if (Platform.OS === 'android' && permission === PERMISSION_MAP.NOTIFICATIONS) {
      const isGranted = await checkNotificationPermission();
      return isGranted ? RESULTS.GRANTED : RESULTS.DENIED;
    }

    return await check(permission);
  } catch (error) {
    console.error('Error getting permission status:', error);
    return RESULTS.UNAVAILABLE;
  }
};

// Export everything needed for the public API
export {
  checkPermission,
  requestPermission,
  requestMultiplePermissions,
  checkCameraPermission,
  requestCameraPermission,
  checkPhotoLibraryPermission,
  requestPhotoLibraryPermission,
  checkStoragePermission,
  requestStoragePermission,
  checkLocationPermission,
  requestLocationPermission,
  checkMicrophonePermission,
  requestMicrophonePermission,
  checkNotificationPermission,
  requestNotificationPermission,
  openAppSettings,
  getPermissionStatus
};