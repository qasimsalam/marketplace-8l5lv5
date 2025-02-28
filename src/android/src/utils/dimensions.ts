import { Dimensions, PixelRatio, Platform, StatusBar } from 'react-native'; // v0.72.x

// Get window and screen dimensions
const window = Dimensions.get('window');
const screen = Dimensions.get('screen');

// Window dimensions (usable area)
export const WINDOW_WIDTH = window.width;
export const WINDOW_HEIGHT = window.height;

// Screen dimensions (including areas like status bar)
export const SCREEN_WIDTH = screen.width;
export const SCREEN_HEIGHT = screen.height;

// Pixel ratio
export const PIXEL_RATIO = PixelRatio.get();

/**
 * Retrieves the height of the device's status bar with platform-specific handling
 * @param skipAndroid If true, returns 0 for Android devices
 * @returns Height of the status bar in pixels
 */
export const getStatusBarHeight = (skipAndroid = false): number => {
  if (Platform.OS === 'ios') {
    // Different iOS devices have different status bar heights
    return Platform.isPad ? 20 : 44; // iPads have smaller status bars
  }
  
  // For Android
  if (skipAndroid) return 0;
  
  return StatusBar.currentHeight || 0;
};

// Calculate and export status bar height constant
export const STATUS_BAR_HEIGHT = getStatusBarHeight();

/**
 * Retrieves the height of the device's navigation bar with platform-specific handling
 * @returns Height of the navigation bar in pixels
 */
export const getNavigationBarHeight = (): number => {
  if (Platform.OS === 'ios') {
    // iOS standard navigation bar height
    return 44;
  }
  
  // For Android, calculate navigation bar height
  // This is an estimate as navigation bar sizes vary by device
  const navigationBarHeight = SCREEN_HEIGHT - WINDOW_HEIGHT - STATUS_BAR_HEIGHT;
  return navigationBarHeight > 0 ? navigationBarHeight : 0;
};

// Calculate and export navigation bar height constant
export const NAVIGATION_BAR_HEIGHT = getNavigationBarHeight();

/**
 * Determines if the device is currently in portrait orientation
 * @returns True if device is in portrait orientation
 */
export const isPortrait = (): boolean => {
  const { width, height } = window;
  return height >= width;
};

/**
 * Determines if the device is currently in landscape orientation
 * @returns True if device is in landscape orientation
 */
export const isLandscape = (): boolean => {
  const { width, height } = window;
  return width > height;
};

// Device size detection based on industry standard breakpoints
export const IS_SMALL_DEVICE = WINDOW_WIDTH < 375; // Smaller than iPhone 6/7/8
export const IS_LARGE_DEVICE = WINDOW_WIDTH > 428; // Larger than iPhone 12 Pro Max
export const IS_TABLET = WINDOW_WIDTH > 768; // iPad portrait and larger

/**
 * Normalizes font size across different device pixel densities
 * @param size Base font size
 * @returns Normalized font size for current device
 */
export const normalizeFont = (size: number): number => {
  // Scale based on device width vs. standard width (iPhone X/XS/11 Pro)
  const scale = Math.min(WINDOW_WIDTH / 375, WINDOW_HEIGHT / 812);
  const newSize = size * scale;
  
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  
  return newSize;
};