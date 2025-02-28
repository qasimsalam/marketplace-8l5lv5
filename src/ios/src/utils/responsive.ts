/**
 * Responsive Utility
 * 
 * A utility module that provides responsive scaling functions for consistent 
 * UI appearance across different iOS device sizes. This file acts as a foundation 
 * for the app's responsive design system by providing methods to scale dimensions, 
 * fonts, and spacing based on device screen dimensions.
 * 
 * @version react-native 0.72.x
 */

import { PixelRatio } from 'react-native'; // v0.72.x
import {
  WINDOW_WIDTH,
  WINDOW_HEIGHT,
  BASE_DEVICE_WIDTH,
  IS_SMALL_DEVICE,
  IS_LARGE_DEVICE,
  IS_TABLET
} from '../utils/dimensions';

// Reference dimensions for responsive scaling
const GUIDELINE_BASE_WIDTH = 375; // iPhone 6/7/8/SE2 width in points
const GUIDELINE_BASE_HEIGHT = 812; // iPhone X/XS height in points
const BASE_SCALE_FACTOR = 0.5; // Default factor for moderate scaling

// Standard spacing values based on 8-point grid system
export const spacingValues = {
  xxs: 2, // quarter spacing
  xs: 4,  // half spacing
  s: 8,   // standard base spacing
  m: 16,  // 2x base spacing
  l: 24,  // 3x base spacing
  xl: 32, // 4x base spacing
  xxl: 40 // 5x base spacing
};

/**
 * Scales a size value proportionally based on the device screen width
 * @param size The size to scale
 * @returns Scaled size value
 */
export const scale = (size: number): number => {
  // Calculate ratio of current width to guideline width
  const ratio = WINDOW_WIDTH / GUIDELINE_BASE_WIDTH;
  return size * ratio;
};

/**
 * Scales a size value proportionally based on the device screen height
 * @param size The size to scale
 * @returns Vertically scaled size value
 */
export const verticalScale = (size: number): number => {
  // Calculate ratio of current height to guideline height
  const ratio = WINDOW_HEIGHT / GUIDELINE_BASE_HEIGHT;
  return size * ratio;
};

/**
 * Scales a size with a factor to reduce the scaling effect on larger screens
 * @param size The size to scale
 * @param factor The factor to moderate scaling (defaults to BASE_SCALE_FACTOR)
 * @returns Moderately scaled size value
 */
export const moderateScale = (size: number, factor: number = BASE_SCALE_FACTOR): number => {
  // Calculate regular scale
  const regularScale = scale(size);
  // Apply moderating factor to reduce scaling effect
  const factorScale = size + (regularScale - size) * factor;
  return factorScale;
};

/**
 * Scales a height value with a factor to reduce the scaling effect on taller screens
 * @param size The size to scale
 * @param factor The factor to moderate scaling (defaults to BASE_SCALE_FACTOR)
 * @returns Moderately vertically scaled size value
 */
export const moderateVerticalScale = (size: number, factor: number = BASE_SCALE_FACTOR): number => {
  // Calculate regular vertical scale
  const regularScale = verticalScale(size);
  // Apply moderating factor to reduce scaling effect
  const factorScale = size + (regularScale - size) * factor;
  return factorScale;
};

/**
 * Calculates a width as a percentage of screen width
 * @param widthPercent Width as percentage of screen (0-100)
 * @returns Width in device-independent pixels
 */
export const responsiveWidth = (widthPercent: number): number => {
  // Convert percentage to decimal and multiply by screen width
  return WINDOW_WIDTH * (widthPercent / 100);
};

/**
 * Calculates a height as a percentage of screen height
 * @param heightPercent Height as percentage of screen (0-100)
 * @returns Height in device-independent pixels
 */
export const responsiveHeight = (heightPercent: number): number => {
  // Convert percentage to decimal and multiply by screen height
  return WINDOW_HEIGHT * (heightPercent / 100);
};

/**
 * Scales font sizes responsively with adjustments for pixel density
 * @param size Base font size
 * @returns Scaled font size value
 */
export const fontScale = (size: number): number => {
  // Get device pixel ratio for density adjustments
  const pixelRatio = PixelRatio.get();
  
  // Calculate font scale factor based on width and pixel density
  const fontScaleFactor = WINDOW_WIDTH / BASE_DEVICE_WIDTH;
  
  // Adjust scale factor based on pixel density to prevent fonts from being too large on high-res screens
  const adjustedScaleFactor = fontScaleFactor > 1 
    ? Math.min(fontScaleFactor, 1 + (pixelRatio * 0.1)) 
    : fontScaleFactor;
  
  // Apply scaling to input size
  const scaledSize = size * adjustedScaleFactor;
  
  // Round to nearest pixel for crisp rendering
  return Math.round(PixelRatio.roundToNearestPixel(scaledSize));
};

/**
 * Gets a responsive spacing value from the spacing scale
 * @param size Named spacing size or custom number
 * @returns Responsive spacing value
 */
export const getResponsiveSpacing = (size: keyof typeof spacingValues | number): number => {
  // If size is a string key in spacingValues
  if (typeof size === 'string' && size in spacingValues) {
    // Get base value from spacingValues
    const baseValue = spacingValues[size];
    // Apply scaling to make responsive
    return moderateScale(baseValue);
  }
  
  // If size is a number, use it directly
  if (typeof size === 'number') {
    return moderateScale(size);
  }
  
  // Default fallback
  return 0;
};

/**
 * Type definition for size-based responsive value mapping
 */
type ResponsiveValueMap<T> = {
  default: T;
  small?: T;
  large?: T;
  tablet?: T;
};

/**
 * Calculates a responsive value based on device size category
 * @param sizeMap Object with values for different device sizes
 * @returns The appropriate value from sizeMap for current device
 */
export const calculateResponsiveValue = <T>(sizeMap: ResponsiveValueMap<T>): T => {
  // Check device categories in order of specificity
  if (IS_TABLET && sizeMap.tablet !== undefined) {
    return sizeMap.tablet;
  }
  
  if (IS_LARGE_DEVICE && sizeMap.large !== undefined) {
    return sizeMap.large;
  }
  
  if (IS_SMALL_DEVICE && sizeMap.small !== undefined) {
    return sizeMap.small;
  }
  
  // Return default value
  return sizeMap.default;
};