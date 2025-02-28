/**
 * Typography System Module
 * 
 * Defines the typography system for the AI Talent Marketplace Android application,
 * including font families, sizes, weights, line heights, and letter spacing.
 * Provides responsive font scaling utilities and consistent typography definitions.
 * 
 * @version 1.0.0
 */

import { Platform, PixelRatio, AccessibilityInfo } from 'react-native'; // v0.72.x
import { normalizeFont } from '../utils/dimensions';
import { scale, moderateScale } from '../utils/responsive';

// Base font size in dp (density-independent pixels)
export const BASE_FONT_SIZE = 16;

/**
 * Font family definitions
 * Uses Inter font family with appropriate weights
 * Falls back to system fonts when necessary
 */
export const FONT_FAMILY = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  bold: 'Inter-Bold',
};

/**
 * Standard font size definitions in dp units
 * Scale from smallest (8dp) to largest (32dp)
 */
export const FONT_SIZE = {
  xxxs: 8,  // Extra extra extra small
  xxs: 10,  // Extra extra small
  xs: 12,   // Extra small
  sm: 14,   // Small
  md: 16,   // Medium (base)
  lg: 18,   // Large
  xl: 20,   // Extra large
  xxl: 24,  // Extra extra large
  xxxl: 32, // Extra extra extra large
};

/**
 * Font weight values for React Native text styling
 * Maps semantic names to numeric weight values
 */
export const FONT_WEIGHT = {
  thin: '200',     // Thin text
  regular: '400',  // Regular text (normal)
  medium: '500',   // Medium text
  semibold: '600', // Semi-bold text
  bold: '700',     // Bold text
};

/**
 * Line height multipliers for proper text spacing
 * Used as multipliers of the font size
 */
export const LINE_HEIGHT = {
  xs: 1.2, // Extra tight
  sm: 1.4, // Tight
  md: 1.5, // Normal
  lg: 1.6, // Spacious
  xl: 1.8, // Extra spacious
};

/**
 * Letter spacing values in pixels
 * Controls the spacing between characters
 */
export const LETTER_SPACING = {
  tight: -0.5, // Tighter than normal
  normal: 0,   // Default spacing
  wide: 0.5,   // Wider than normal
};

/**
 * Retrieves the system font scale factor set in accessibility settings
 * 
 * @returns System font scale factor or 1 as default
 */
export const getAccessibilityFontScale = (): number => {
  // Use PixelRatio.getFontScale() to get the font scale factor
  // that the user has set in their device's accessibility settings
  return PixelRatio.getFontScale();
};

/**
 * Calculates a responsive font size based on device dimensions and accessibility settings
 * 
 * @param size Base font size to scale
 * @returns Responsive font size value adjusted for the current device
 */
export const getResponsiveFontSize = (size: number): number => {
  // Apply normalizeFont to account for different device pixel densities
  const normalizedSize = normalizeFont(size);
  
  // Apply accessibility scaling for user-defined font sizes
  const accessibilityScale = getAccessibilityFontScale();
  
  // Apply additional scaling based on device type
  // Use moderateScale for smooth scaling that won't get too extreme on large/small devices
  const responsiveSize = moderateScale(normalizedSize, 0.5);
  
  // Return the responsive font size with accessibility adjustments
  return responsiveSize * accessibilityScale;
};