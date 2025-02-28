/**
 * permissions.ts
 * 
 * A comprehensive permissions management system for iOS applications.
 * Handles requesting, checking, and tracking various device permissions
 * required by the AI Talent Marketplace mobile application.
 * 
 * @version 1.0.0
 */

import { Platform, Linking, Alert } from 'react-native'; // v0.72.4
import { check, request, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions'; // v3.8.0
import AsyncStorage from '@react-native-async-storage/async-storage'; // v1.19.0

// Constants for AsyncStorage keys and threshold values
const PERMISSION_STORAGE_KEY = '@permissions_status';
const PERMISSION_PROMPT_THRESHOLD = 2;
const PERMISSION_BLOCKED_KEY = '@permissions_blocked';

/**
 * Enumeration of permission types used throughout the app
 */
export enum PermissionType {
  CAMERA = 'camera',
  PHOTO_LIBRARY = 'photo_library',
  LOCATION = 'location',
  MICROPHONE = 'microphone',
  NOTIFICATIONS = 'notifications',
  BIOMETRICS = 'biometrics',
  STORAGE = 'storage' // Not directly applicable on iOS but included for cross-platform compatibility
}

/**
 * Enumeration of possible permission statuses
 */
export enum PermissionStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  BLOCKED = 'blocked',
  UNAVAILABLE = 'unavailable',
  LIMITED = 'limited'
}

/**
 * Maps the generic permission type to iOS-specific permission from react-native-permissions
 * 
 * @param permission - Generic permission type to map
 * @returns iOS-specific permission constant or undefined if not applicable
 */
function mapToiOSPermission(permission: PermissionType): any {
  // Only return iOS permissions since this is the iOS-specific utility
  switch (permission) {
    case PermissionType.CAMERA:
      return PERMISSIONS.IOS.CAMERA;
    case PermissionType.PHOTO_LIBRARY:
      return PERMISSIONS.IOS.PHOTO_LIBRARY;
    case PermissionType.LOCATION:
      return PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
    case PermissionType.MICROPHONE:
      return PERMISSIONS.IOS.MICROPHONE;
    case PermissionType.NOTIFICATIONS:
      return PERMISSIONS.IOS.NOTIFICATIONS;
    case PermissionType.BIOMETRICS:
      return PERMISSIONS.IOS.FACE_ID;
    case PermissionType.STORAGE:
      // Storage permission doesn't exist directly on iOS
      return undefined;
    default:
      return undefined;
  }
}

/**
 * Maps the result from react-native-permissions to our standardized PermissionStatus
 * 
 * @param result - Result from react-native-permissions check or request
 * @returns Standardized permission status
 */
function mapPermissionResult(result: string): PermissionStatus {
  switch (result) {
    case RESULTS.GRANTED:
      return PermissionStatus.GRANTED;
    case RESULTS.DENIED:
      return PermissionStatus.DENIED;
    case RESULTS.BLOCKED:
      return PermissionStatus.BLOCKED;
    case RESULTS.UNAVAILABLE:
      return PermissionStatus.UNAVAILABLE;
    case RESULTS.LIMITED:
      return PermissionStatus.LIMITED;
    default:
      return PermissionStatus.DENIED;
  }
}

/**
 * Track permission status in AsyncStorage for future reference
 * 
 * @param permission - Permission type being tracked
 * @param status - Current status of the permission
 */
async function trackPermissionStatus(permission: PermissionType, status: PermissionStatus): Promise<void> {
  try {
    // Get existing permission statuses
    const storageData = await AsyncStorage.getItem(PERMISSION_STORAGE_KEY);
    const permissionData = storageData ? JSON.parse(storageData) : {};
    
    // Update with new status
    permissionData[permission] = status;
    
    // Store back to AsyncStorage
    await AsyncStorage.setItem(PERMISSION_STORAGE_KEY, JSON.stringify(permissionData));
  } catch (error) {
    console.error('Failed to store permission status:', error);
  }
}

/**
 * Track number of times permission has been requested
 * 
 * @param permission - Permission type being tracked
 */
async function incrementPermissionRequestCount(permission: PermissionType): Promise<void> {
  try {
    const countKey = `${PERMISSION_STORAGE_KEY}_${permission}_count`;
    const countData = await AsyncStorage.getItem(countKey);
    const count = countData ? parseInt(countData, 10) : 0;
    
    await AsyncStorage.setItem(countKey, (count + 1).toString());
  } catch (error) {
    console.error('Failed to track permission request count:', error);
  }
}

/**
 * Get the number of times a permission has been requested
 * 
 * @param permission - Permission type to check
 * @returns Number of times permission has been requested
 */
async function getPermissionRequestCount(permission: PermissionType): Promise<number> {
  try {
    const countKey = `${PERMISSION_STORAGE_KEY}_${permission}_count`;
    const countData = await AsyncStorage.getItem(countKey);
    return countData ? parseInt(countData, 10) : 0;
  } catch (error) {
    console.error('Failed to get permission request count:', error);
    return 0;
  }
}

/**
 * Track if a blocked alert has been shown for a permission
 * 
 * @param permission - Permission type to track
 */
async function trackBlockedAlertShown(permission: PermissionType): Promise<void> {
  try {
    const storageData = await AsyncStorage.getItem(PERMISSION_BLOCKED_KEY);
    const blockedData = storageData ? JSON.parse(storageData) : {};
    
    blockedData[permission] = true;
    
    await AsyncStorage.setItem(PERMISSION_BLOCKED_KEY, JSON.stringify(blockedData));
  } catch (error) {
    console.error('Failed to track blocked alert shown:', error);
  }
}

/**
 * Check if a blocked alert has been shown for a permission
 * 
 * @param permission - Permission type to check
 * @returns True if blocked alert has been shown, false otherwise
 */
async function hasBlockedAlertBeenShown(permission: PermissionType): Promise<boolean> {
  try {
    const storageData = await AsyncStorage.getItem(PERMISSION_BLOCKED_KEY);
    const blockedData = storageData ? JSON.parse(storageData) : {};
    
    return !!blockedData[permission];
  } catch (error) {
    console.error('Failed to check if blocked alert shown:', error);
    return false;
  }
}

/**
 * Gets a human-readable name for a permission type
 * 
 * @param permission - Permission type
 * @returns Human-readable permission name
 */
export function getPermissionTypeName(permission: PermissionType): string {
  switch (permission) {
    case PermissionType.CAMERA:
      return 'Camera';
    case PermissionType.PHOTO_LIBRARY:
      return 'Photo Library';
    case PermissionType.LOCATION:
      return 'Location';
    case PermissionType.MICROPHONE:
      return 'Microphone';
    case PermissionType.NOTIFICATIONS:
      return 'Notifications';
    case PermissionType.BIOMETRICS:
      return 'Face ID';
    case PermissionType.STORAGE:
      return 'Storage';
    default:
      return 'Unknown Permission';
  }
}

/**
 * Determines if a rationale should be shown before requesting permission
 * 
 * @param permission - Permission type to check
 * @returns True if rationale should be shown, false otherwise
 */
export async function shouldShowRationale(permission: PermissionType): Promise<boolean> {
  const count = await getPermissionRequestCount(permission);
  return count >= PERMISSION_PROMPT_THRESHOLD;
}

/**
 * Utility to check if a permission is granted
 * 
 * @param status - Permission status to check
 * @returns True if permission is granted, false otherwise
 */
export function isPermissionGranted(status: PermissionStatus): boolean {
  return status === PermissionStatus.GRANTED;
}

/**
 * Opens the application settings page for the user to manage permissions
 * 
 * @returns True if settings were opened successfully, false otherwise
 */
export async function openAppSettings(): Promise<boolean> {
  try {
    await openSettings();
    return true;
  } catch (error) {
    console.error('Failed to open app settings:', error);
    return false;
  }
}

/**
 * Shows an alert when permission is blocked, with option to open settings
 * 
 * @param permission - Blocked permission type
 * @param message - Custom message to show in the alert
 */
export async function showPermissionBlockedAlert(
  permission: PermissionType, 
  message: string
): Promise<void> {
  // Check if we've already shown a blocked alert for this permission
  const alreadyShown = await hasBlockedAlertBeenShown(permission);
  if (alreadyShown) {
    return;
  }
  
  const permissionName = getPermissionTypeName(permission);
  
  Alert.alert(
    `${permissionName} Access Required`,
    message || `Please enable ${permissionName} access in your device settings to use this feature.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Open Settings', 
        onPress: async () => {
          await openAppSettings();
        }
      }
    ]
  );
  
  // Track that we've shown the blocked alert
  await trackBlockedAlertShown(permission);
}

/**
 * Checks the current status of a specific permission
 * 
 * @param permission - Permission type to check
 * @returns Current status of the requested permission
 */
export async function checkPermission(permission: PermissionType): Promise<PermissionStatus> {
  // Storage permission doesn't exist directly on iOS, so return unavailable
  if (permission === PermissionType.STORAGE) {
    return PermissionStatus.UNAVAILABLE;
  }
  
  // Map to iOS-specific permission
  const iosPermission = mapToiOSPermission(permission);
  
  if (!iosPermission) {
    return PermissionStatus.UNAVAILABLE;
  }
  
  try {
    const result = await check(iosPermission);
    const status = mapPermissionResult(result);
    
    // Store status for tracking
    await trackPermissionStatus(permission, status);
    
    return status;
  } catch (error) {
    console.error(`Error checking ${permission} permission:`, error);
    return PermissionStatus.UNAVAILABLE;
  }
}

/**
 * Requests a specific permission from the user
 * 
 * @param permission - Permission type to request
 * @param rationale - Explanation of why the permission is needed
 * @returns Updated status after the request
 */
export async function requestPermission(
  permission: PermissionType, 
  rationale: string
): Promise<PermissionStatus> {
  // First check current status
  const currentStatus = await checkPermission(permission);
  
  // If already granted, no need to request again
  if (currentStatus === PermissionStatus.GRANTED) {
    return PermissionStatus.GRANTED;
  }
  
  // If blocked, show settings alert
  if (currentStatus === PermissionStatus.BLOCKED) {
    await showPermissionBlockedAlert(permission, rationale);
    return PermissionStatus.BLOCKED;
  }
  
  // Storage permission doesn't exist on iOS
  if (permission === PermissionType.STORAGE) {
    return PermissionStatus.UNAVAILABLE;
  }
  
  // Map to iOS-specific permission
  const iosPermission = mapToiOSPermission(permission);
  
  if (!iosPermission) {
    return PermissionStatus.UNAVAILABLE;
  }
  
  // Track this request attempt
  await incrementPermissionRequestCount(permission);
  
  // Show custom rationale dialog if threshold reached
  const shouldShowCustomRationale = await shouldShowRationale(permission);
  if (shouldShowCustomRationale) {
    const permissionName = getPermissionTypeName(permission);
    
    return new Promise((resolve) => {
      Alert.alert(
        `${permissionName} Access`,
        rationale || `This app needs ${permissionName} access to provide full functionality.`,
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => resolve(PermissionStatus.DENIED)
          },
          { 
            text: 'Continue', 
            onPress: async () => {
              try {
                const result = await request(iosPermission);
                const status = mapPermissionResult(result);
                
                // Store status for tracking
                await trackPermissionStatus(permission, status);
                
                // If blocked after request, suggest opening settings
                if (status === PermissionStatus.BLOCKED) {
                  await showPermissionBlockedAlert(permission, rationale);
                }
                
                resolve(status);
              } catch (error) {
                console.error(`Error requesting ${permission} permission:`, error);
                resolve(PermissionStatus.UNAVAILABLE);
              }
            }
          }
        ]
      );
    });
  }
  
  // Normal permission request flow
  try {
    const result = await request(iosPermission);
    const status = mapPermissionResult(result);
    
    // Store status for tracking
    await trackPermissionStatus(permission, status);
    
    // If blocked after request, suggest opening settings
    if (status === PermissionStatus.BLOCKED) {
      await showPermissionBlockedAlert(permission, rationale);
    }
    
    return status;
  } catch (error) {
    console.error(`Error requesting ${permission} permission:`, error);
    return PermissionStatus.UNAVAILABLE;
  }
}

/**
 * Checks the status of multiple permissions at once
 * 
 * @param permissions - Array of permission types to check
 * @returns Map of permissions to their current status
 */
export async function checkMultiplePermissions(
  permissions: PermissionType[]
): Promise<Record<PermissionType, PermissionStatus>> {
  const results: Record<PermissionType, PermissionStatus> = {};
  
  // Check each permission sequentially
  for (const permission of permissions) {
    results[permission] = await checkPermission(permission);
  }
  
  return results;
}

/**
 * Requests multiple permissions with a single operation
 * 
 * @param permissions - Array of permission types to request
 * @param rationales - Map of permission types to rationale strings
 * @returns Map of permissions to their updated status
 */
export async function requestMultiplePermissions(
  permissions: PermissionType[],
  rationales: Record<PermissionType, string>
): Promise<Record<PermissionType, PermissionStatus>> {
  const results: Record<PermissionType, PermissionStatus> = {};
  
  // Request each permission sequentially
  for (const permission of permissions) {
    const rationale = rationales[permission] || `This app needs ${getPermissionTypeName(permission)} access.`;
    results[permission] = await requestPermission(permission, rationale);
  }
  
  return results;
}

/**
 * Specialized function for requesting camera permissions
 * 
 * @param rationale - Optional custom rationale message
 * @returns Updated permission status
 */
export async function requestCameraPermission(rationale?: string): Promise<PermissionStatus> {
  return requestPermission(
    PermissionType.CAMERA, 
    rationale || 'Camera access is needed to take photos and scan documents for your portfolio and project submissions.'
  );
}

/**
 * Specialized function for requesting photo library permissions
 * 
 * @param rationale - Optional custom rationale message
 * @returns Updated permission status
 */
export async function requestPhotoLibraryPermission(rationale?: string): Promise<PermissionStatus> {
  return requestPermission(
    PermissionType.PHOTO_LIBRARY, 
    rationale || 'Photo Library access is needed to upload images for your portfolio and project submissions.'
  );
}

/**
 * Specialized function for requesting notification permissions
 * 
 * @param rationale - Optional custom rationale message
 * @returns Updated permission status
 */
export async function requestNotificationPermission(rationale?: string): Promise<PermissionStatus> {
  return requestPermission(
    PermissionType.NOTIFICATIONS, 
    rationale || 'Notifications are needed to alert you about new job matches, messages, and important updates.'
  );
}

/**
 * Specialized function for checking notification permissions
 * 
 * @returns Current notification permission status
 */
export async function checkNotificationPermission(): Promise<PermissionStatus> {
  return checkPermission(PermissionType.NOTIFICATIONS);
}

/**
 * Specialized function for requesting biometric permissions
 * 
 * @param rationale - Optional custom rationale message
 * @returns Updated permission status
 */
export async function requestBiometricPermission(rationale?: string): Promise<PermissionStatus> {
  return requestPermission(
    PermissionType.BIOMETRICS, 
    rationale || 'Face ID is used to securely authenticate you and protect your personal information.'
  );
}