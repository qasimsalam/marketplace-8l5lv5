/**
 * Typography System
 * 
 * Defines the typography system for the AI Talent Marketplace iOS application,
 * including font families, sizes, weights, and responsive scaling utilities.
 * This file provides consistent typography definitions that are used throughout
 * the application to maintain visual cohesion across different components and screens.
 * 
 * @version react-native 0.72.x
 */

import { Platform } from 'react-native'; // v0.72.x
import { normalizeFont } from '../utils/dimensions';
import { scale, moderateScale } from '../utils/responsive';

// Base font size for the application
const BASE_FONT_SIZE = 16;

/**
 * Calculates a responsive font size based on device dimensions and accessibility settings
 * @param size Base font size to scale
 * @returns Responsive font size value adjusted for the current device
 */
export const getResponsiveFontSize = (size: number): number => {
  // Apply normalizeFont to adjust for device width
  const normalizedSize = normalizeFont(size);
  
  // Apply additional moderate scaling to ensure fonts don't get too large on tablets
  return moderateScale(normalizedSize, 0.3);
};

/**
 * Returns the appropriate font family name for the specified weight, handling platform differences
 * @param weight Font weight identifier
 * @returns Font family name appropriate for the platform and weight
 */
export const getFontFamily = (weight: string): string => {
  // iOS uses the system font with dynamic weight specification
  if (Platform.OS === 'ios') {
    switch (weight) {
      case 'thin':
        return 'System';
      case 'regular':
        return 'System';
      case 'medium':
        return 'System';
      case 'semibold':
        return 'System';
      case 'bold':
        return 'System';
      default:
        return 'System';
    }
  }
  
  // Android uses specific font files for different weights
  // These would typically be custom fonts or Roboto variants
  switch (weight) {
    case 'thin':
      return 'Roboto-Thin';
    case 'regular':
      return 'Roboto-Regular';
    case 'medium':
      return 'Roboto-Medium';
    case 'semibold':
      return 'Roboto-SemiBold';
    case 'bold':
      return 'Roboto-Bold';
    default:
      return 'Roboto-Regular';
  }
};

/**
 * Font family definitions for different font weights
 */
export const FONT_FAMILY = {
  regular: getFontFamily('regular'),
  medium: getFontFamily('medium'),
  bold: getFontFamily('bold'),
};

/**
 * Font size scale following an 8-point grid system
 * with responsive adjustments
 */
export const FONT_SIZE = {
  xxs: getResponsiveFontSize(10),  // Extra extra small text
  xs: getResponsiveFontSize(12),   // Extra small text, captions
  s: getResponsiveFontSize(14),    // Small text, secondary content
  m: getResponsiveFontSize(BASE_FONT_SIZE), // Base body text
  l: getResponsiveFontSize(18),    // Large text, subtitles
  xl: getResponsiveFontSize(20),   // Extra large text, titles
  xxl: getResponsiveFontSize(24),  // Heading text
  xxxl: getResponsiveFontSize(32), // Display text
};

/**
 * Font weight constants for various text styles
 * Maps to font-weight values in a platform-appropriate way
 */
export const FONT_WEIGHT = {
  thin: Platform.OS === 'ios' ? '200' : 'normal',      // Thin text
  regular: Platform.OS === 'ios' ? '400' : 'normal',   // Regular text
  medium: Platform.OS === 'ios' ? '500' : 'normal',    // Medium emphasis
  semibold: Platform.OS === 'ios' ? '600' : 'bold',    // Semi-bold, for subtitles
  bold: Platform.OS === 'ios' ? '700' : 'bold',        // Bold text, high emphasis
};

/**
 * Line height values for text elements
 * Based on accessibility best practices for optimal readability
 */
export const LINE_HEIGHT = {
  xs: scale(16),     // For smallest text
  s: scale(20),      // For small text
  m: scale(24),      // For medium/body text
  l: scale(32),      // For large/title text
  xl: scale(40),     // For extra large/heading text
};

/**
 * Letter spacing values for different text styles
 * Improves readability and follows HIG guidelines
 */
export const LETTER_SPACING = {
  tight: -0.24,     // Tighter spacing for headings
  normal: 0,        // Default spacing
  wide: 0.5,        // Wider spacing for improved readability in small text
};

/**
 * Predefined text styles for common UI elements
 * Provides consistent typography across the app
 */
export const TEXT_VARIANT = {
  // Headings
  heading1: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: LINE_HEIGHT.xl,
    letterSpacing: LETTER_SPACING.tight,
  },
  heading2: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: LINE_HEIGHT.l,
    letterSpacing: LETTER_SPACING.tight,
  },
  heading3: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: LINE_HEIGHT.l,
    letterSpacing: LETTER_SPACING.tight,
  },
  heading4: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: FONT_SIZE.l,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: LINE_HEIGHT.m,
    letterSpacing: LETTER_SPACING.tight,
  },
  heading5: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: FONT_SIZE.m,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: LINE_HEIGHT.m,
    letterSpacing: LETTER_SPACING.normal,
  },
  heading6: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: FONT_SIZE.s,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: LINE_HEIGHT.s,
    letterSpacing: LETTER_SPACING.normal,
  },
  
  // Body text
  paragraph: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: FONT_SIZE.m,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: LINE_HEIGHT.m,
    letterSpacing: LETTER_SPACING.normal,
  },
  paragraphSmall: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: FONT_SIZE.s,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: LINE_HEIGHT.s,
    letterSpacing: LETTER_SPACING.normal,
  },
  caption: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: LINE_HEIGHT.xs,
    letterSpacing: LETTER_SPACING.wide,
  },
  
  // Interactive elements
  button: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: FONT_SIZE.m,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: LINE_HEIGHT.m,
    letterSpacing: LETTER_SPACING.normal,
  },
  buttonSmall: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: FONT_SIZE.s,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: LINE_HEIGHT.s,
    letterSpacing: LETTER_SPACING.normal,
  },
  
  // Form elements
  label: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: FONT_SIZE.s,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: LINE_HEIGHT.s,
    letterSpacing: LETTER_SPACING.normal,
  },
  input: {
    fontFamily: FONT_FAMILY.regular,
    fontSize: FONT_SIZE.m,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: LINE_HEIGHT.m,
    letterSpacing: LETTER_SPACING.normal,
  },
};