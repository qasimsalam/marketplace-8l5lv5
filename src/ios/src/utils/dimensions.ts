/**
 * Dimensions Utility
 * 
 * A utility module providing essential device dimension information,
 * responsive measurement functions, and device characteristic detection
 * for the iOS application. Handles orientation changes and provides 
 * consistent measurement utilities that adapt to different iPhone and 
 * iPad models.
 * 
 * @version react-native 0.72.x
 */

import { Dimensions, Platform, PixelRatio, StatusBar, ScaledSize } from 'react-native';

// Initial dimensions
const initialWindow = Dimensions.get('window');
const initialScreen = Dimensions.get('screen');

// iPhone model heights (in points)
const IPHONE_X_HEIGHT = 812;
const IPHONE_XR_HEIGHT = 896;
const IPHONE_12_HEIGHT = 844;
const IPHONE_12_MAX_HEIGHT = 926;
const IPHONE_14_PRO_HEIGHT = 852;
const IPHONE_14_PRO_MAX_HEIGHT = 932;

// Base device width for scaling calculations
export const BASE_DEVICE_WIDTH = 375; // iPhone 6/7/8/SE2 width

// Initialize dimension values
let WINDOW_WIDTH = initialWindow.width;
let WINDOW_HEIGHT = initialWindow.height;
let SCREEN_WIDTH = initialScreen.width;
let SCREEN_HEIGHT = initialScreen.height;

/**
 * Gets the current window dimensions
 * @returns Current window dimensions object
 */
export const getWindowDimensions = (): ScaledSize => {
  return Dimensions.get('window');
};

/**
 * Gets the current screen dimensions
 * @returns Current screen dimensions object
 */
export const getScreenDimensions = (): ScaledSize => {
  return Dimensions.get('screen');
};

/**
 * Determines if the device is in portrait orientation
 * @returns True if device is in portrait mode
 */
export const isPortrait = (): boolean => {
  const { height, width } = getWindowDimensions();
  return height > width;
};

/**
 * Determines if the device is in landscape orientation
 * @returns True if device is in landscape mode
 */
export const isLandscape = (): boolean => {
  const { height, width } = getWindowDimensions();
  return width > height;
};

/**
 * Detects if the device is an iPhone X or newer model with a notch
 * @returns True if device is iPhone X or newer
 */
export const isIphoneXOrNewer = (): boolean => {
  if (Platform.OS !== 'ios' || Platform.isPad) {
    return false;
  }
  
  const { height, width } = getWindowDimensions();
  // Account for both portrait and landscape orientations
  const deviceHeight = Math.max(height, width);
  
  return (
    deviceHeight === IPHONE_X_HEIGHT ||
    deviceHeight === IPHONE_XR_HEIGHT ||
    deviceHeight === IPHONE_12_HEIGHT ||
    deviceHeight === IPHONE_12_MAX_HEIGHT ||
    deviceHeight === IPHONE_14_PRO_HEIGHT ||
    deviceHeight === IPHONE_14_PRO_MAX_HEIGHT
  );
};

/**
 * Gets the current status bar height with iOS-specific handling
 * @returns Status bar height in pixels
 */
export const getStatusBarHeight = (): number => {
  if (Platform.OS === 'ios') {
    return isIphoneXOrNewer() ? 44 : 20;
  }
  
  return StatusBar.currentHeight || 0;
};

/**
 * Gets the bottom safe area inset for notched devices
 * @returns Bottom safe area inset height
 */
export const getBottomSpace = (): number => {
  return isIphoneXOrNewer() ? 34 : 0;
};

/**
 * Calculates width as a percentage of screen width
 * @param percentageWidth Percentage of screen width (0-100)
 * @returns Width in device pixels
 */
export const getResponsiveWidth = (percentageWidth: number): number => {
  const { width } = getWindowDimensions();
  return (width * percentageWidth) / 100;
};

/**
 * Calculates height as a percentage of screen height
 * @param percentageHeight Percentage of screen height (0-100)
 * @returns Height in device pixels
 */
export const getResponsiveHeight = (percentageHeight: number): number => {
  const { height } = getWindowDimensions();
  return (height * percentageHeight) / 100;
};

/**
 * Normalizes font size across different iOS devices
 * @param size Base font size
 * @returns Normalized font size
 */
export const normalizeFont = (size: number): number => {
  const { width } = getWindowDimensions();
  const scale = width / BASE_DEVICE_WIDTH;
  
  const newSize = size * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  
  return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
};

/**
 * Updates dimension values when device orientation changes
 * @param dimensions Updated dimensions object
 */
export const handleDimensionsChange = ({ window, screen }: { window: ScaledSize; screen: ScaledSize }): void => {
  // Update stored dimensions
  WINDOW_WIDTH = window.width;
  WINDOW_HEIGHT = window.height;
  SCREEN_WIDTH = screen.width;
  SCREEN_HEIGHT = screen.height;
};

// Register dimension change listener
Dimensions.addEventListener('change', handleDimensionsChange);

// Computed properties and flags
export const IS_IPHONE_X = isIphoneXOrNewer();
export const STATUS_BAR_HEIGHT = getStatusBarHeight();
export const BOTTOM_SPACE_HEIGHT = getBottomSpace();
export const IS_SMALL_DEVICE = WINDOW_WIDTH < 375;
export const IS_LARGE_DEVICE = WINDOW_WIDTH >= 768;
export const IS_TABLET = Platform.isPad || (Platform.OS === 'ios' && WINDOW_WIDTH >= 768 && WINDOW_HEIGHT >= 768);

// Export current dimension values
export { WINDOW_WIDTH, WINDOW_HEIGHT, SCREEN_WIDTH, SCREEN_HEIGHT };