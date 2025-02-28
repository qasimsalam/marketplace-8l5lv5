/**
 * Responsive Utility Module
 * 
 * This module provides utility functions for responsive design in the Android application.
 * It implements scale-based responsive sizing to ensure UI elements maintain appropriate
 * proportions across different device sizes, orientations, and pixel densities.
 * 
 * @version 1.0.0
 */

import { Dimensions, PixelRatio, Platform } from 'react-native'; // v0.72.x
import {
  WINDOW_WIDTH,
  WINDOW_HEIGHT,
  IS_SMALL_DEVICE,
  IS_LARGE_DEVICE,
  IS_TABLET,
  PIXEL_RATIO
} from './dimensions';

// Base constants for design system
export const BASE_SPACING = 8;
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

/**
 * Standard spacing values based on 8-point grid system
 */
export const spacingValues = {
  none: 0,
  xxs: 4,    // BASE_SPACING / 2
  xs: 8,     // BASE_SPACING
  s: 16,     // BASE_SPACING * 2
  m: 24,     // BASE_SPACING * 3
  l: 32,     // BASE_SPACING * 4
  xl: 40,    // BASE_SPACING * 5
  xxl: 48    // BASE_SPACING * 6
};

/**
 * Scales the input size horizontally for width-based measurements
 * relative to the guideline base width (375px)
 * 
 * @param size Size to scale
 * @returns Scaled size based on current device width
 */
export const scale = (size: number): number => {
  return (WINDOW_WIDTH / guidelineBaseWidth) * size;
};

/**
 * Scales the input size vertically for height-based measurements
 * relative to the guideline base height (812px)
 * 
 * @param size Size to scale
 * @returns Scaled size based on current device height
 */
export const verticalScale = (size: number): number => {
  return (WINDOW_HEIGHT / guidelineBaseHeight) * size;
};

/**
 * Scales the input size with a moderation factor to prevent extreme scaling
 * on very large or small screens
 * 
 * @param size Size to scale
 * @param factor Moderation factor (default: 0.5)
 * @returns Moderately scaled size based on device width with applied factor
 */
export const moderateScale = (size: number, factor: number = 0.5): number => {
  return size + (scale(size) - size) * factor;
};

/**
 * Scales the input size vertically with a moderation factor to prevent extreme scaling
 * on very tall or short screens
 * 
 * @param size Size to scale
 * @param factor Moderation factor (default: 0.5)
 * @returns Moderately scaled size based on device height with applied factor
 */
export const moderateVerticalScale = (size: number, factor: number = 0.5): number => {
  return size + (verticalScale(size) - size) * factor;
};

/**
 * Calculates a responsive width as a percentage of the screen width
 * 
 * @param widthPercent Width as a percentage (0-100)
 * @returns Width in pixels corresponding to the given percentage of screen width
 */
export const responsiveWidth = (widthPercent: number): number => {
  return (widthPercent / 100) * WINDOW_WIDTH;
};

/**
 * Calculates a responsive height as a percentage of the screen height
 * 
 * @param heightPercent Height as a percentage (0-100)
 * @returns Height in pixels corresponding to the given percentage of screen height
 */
export const responsiveHeight = (heightPercent: number): number => {
  return (heightPercent / 100) * WINDOW_HEIGHT;
};

/**
 * Scales font sizes based on device size and accessibility settings
 * 
 * @param fontSize Base font size to scale
 * @returns Scaled font size appropriate for the current device
 */
export const fontScale = (fontSize: number): number => {
  // Get the current accessibility font scale
  const accessibilityFontScale = PixelRatio.getFontScale();
  
  // Apply moderate scaling to prevent extreme scaling
  const scaledSize = moderateScale(fontSize);
  
  // Apply the accessibility font scale for users who have changed their system font size
  return scaledSize * accessibilityFontScale;
};

/**
 * Returns responsive spacing value from predefined spacing scale
 * or calculated based on multiplier
 * 
 * @param spacing Named spacing size or numeric multiplier of BASE_SPACING
 * @returns Responsive spacing value appropriate for current device
 */
export const getResponsiveSpacing = (spacing: number | string): number => {
  // If it's a named size (xxs, xs, s, m, l, xl, xxl)
  if (typeof spacing === 'string' && spacing in spacingValues) {
    return moderateScale(spacingValues[spacing as keyof typeof spacingValues]);
  }
  
  // If it's a numeric multiplier
  if (typeof spacing === 'number') {
    return moderateScale(BASE_SPACING * spacing);
  }
  
  // Default fallback
  return moderateScale(BASE_SPACING);
};

/**
 * Interface for responsive value options based on device size
 */
interface ResponsiveValueOptions<T> {
  small?: T;
  normal: T;
  large?: T;
  tablet?: T;
}

/**
 * Returns different values based on device size (small, normal, large, tablet)
 * 
 * @param options Object containing values for different device sizes
 * @returns Appropriate value for the current device size
 */
export const getResponsiveValue = <T>(options: ResponsiveValueOptions<T>): T => {
  if (IS_TABLET && options.tablet !== undefined) {
    return options.tablet;
  }
  
  if (IS_LARGE_DEVICE && options.large !== undefined) {
    return options.large;
  }
  
  if (IS_SMALL_DEVICE && options.small !== undefined) {
    return options.small;
  }
  
  // Default/normal case
  return options.normal;
};

/**
 * Returns different values based on device orientation (portrait or landscape)
 * 
 * @param portraitValue Value to use in portrait orientation
 * @param landscapeValue Value to use in landscape orientation
 * @returns Appropriate value for the current device orientation
 */
export const handleOrientationValue = <T>(portraitValue: T, landscapeValue: T): T => {
  const isLandscape = WINDOW_WIDTH > WINDOW_HEIGHT;
  return isLandscape ? landscapeValue : portraitValue;
};