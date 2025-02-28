/**
 * Biometric Authentication Utility Module
 * 
 * Provides TypeScript wrapper functions for interacting with native Android biometric 
 * authentication features. This module bridges the React Native JavaScript layer with 
 * the native Java BiometricModule.
 * 
 * @version 1.0.0
 */

import { NativeModules, Platform } from 'react-native'; // react-native 0.72.x
import { BiometricType, BiometricAuthResult, BiometricAuthOptions } from '../types/auth.types';

// Reference to the native Android biometric module
const BiometricModule = NativeModules.BiometricModule;

// Default prompt texts for biometric authentication dialogs
const DEFAULT_BIOMETRIC_PROMPT_TITLE = 'Biometric Authentication';
const DEFAULT_BIOMETRIC_PROMPT_SUBTITLE = 'Verify your identity';
const DEFAULT_BIOMETRIC_PROMPT_DESCRIPTION = 'Authenticate using your biometric data';
const DEFAULT_BIOMETRIC_CANCEL_TEXT = 'Cancel';

/**
 * Checks if biometric authentication is available on the device
 * 
 * @returns {Promise<boolean>} A promise that resolves to true if biometric authentication is available
 */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    // Verify platform is Android
    if (Platform.OS !== 'android') {
      console.warn('Biometric authentication is only supported on Android');
      return false;
    }

    // Call the native module method
    return await BiometricModule.isBiometricAvailable();
  } catch (error) {
    console.error('Error checking biometric availability:', error);
    return false;
  }
}

/**
 * Determines the type of biometric authentication available on the device
 * 
 * @returns {Promise<BiometricType>} A promise that resolves to the type of biometric authentication available
 */
export async function getBiometricType(): Promise<BiometricType> {
  try {
    // Verify platform is Android
    if (Platform.OS !== 'android') {
      console.warn('Biometric authentication is only supported on Android');
      return BiometricType.NONE;
    }

    // Call the native module method
    const biometricType = await BiometricModule.getBiometricType();
    
    // Map the string response to the BiometricType enum
    switch (biometricType) {
      case 'fingerprint':
        return BiometricType.FINGERPRINT;
      case 'face':
        return BiometricType.FACE;
      case 'iris':
        return BiometricType.IRIS;
      default:
        return BiometricType.NONE;
    }
  } catch (error) {
    console.error('Error getting biometric type:', error);
    return BiometricType.NONE;
  }
}

/**
 * Prompts the user for biometric authentication with customizable options
 * 
 * @param {BiometricAuthOptions} options - Optional configuration for the biometric prompt
 * @returns {Promise<BiometricAuthResult>} A promise that resolves to the result of the authentication attempt
 */
export async function authenticateWithBiometrics(
  options?: Partial<BiometricAuthOptions>
): Promise<BiometricAuthResult> {
  try {
    // Verify platform is Android
    if (Platform.OS !== 'android') {
      console.warn('Biometric authentication is only supported on Android');
      return BiometricAuthResult.NOT_AVAILABLE;
    }

    // Merge provided options with defaults
    const authOptions: BiometricAuthOptions = {
      promptTitle: options?.promptTitle || DEFAULT_BIOMETRIC_PROMPT_TITLE,
      promptSubtitle: options?.promptSubtitle || DEFAULT_BIOMETRIC_PROMPT_SUBTITLE,
      promptDescription: options?.promptDescription || DEFAULT_BIOMETRIC_PROMPT_DESCRIPTION,
      cancelButtonText: options?.cancelButtonText || DEFAULT_BIOMETRIC_CANCEL_TEXT
    };

    // Call the native module method with options
    const result = await BiometricModule.authenticateWithBiometrics(authOptions);
    
    // Map the string response to the BiometricAuthResult enum
    switch (result) {
      case 'success':
        return BiometricAuthResult.SUCCESS;
      case 'canceled':
        return BiometricAuthResult.CANCELED;
      case 'not_available':
        return BiometricAuthResult.NOT_AVAILABLE;
      case 'not_enrolled':
        return BiometricAuthResult.NOT_ENROLLED;
      default:
        return BiometricAuthResult.FAILED;
    }
  } catch (error) {
    console.error('Error during biometric authentication:', error);
    return BiometricAuthResult.FAILED;
  }
}