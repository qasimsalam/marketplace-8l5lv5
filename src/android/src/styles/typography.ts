/**
 * Typography System Module
 * 
 * Defines the typography system for the AI Talent Marketplace Android application,
 * providing standardized text styling including font sizes, weights, families, 
 * line heights, and letter spacing. This central file ensures consistent text 
 * appearance across all UI components with support for responsive sizing and 
 * accessibility considerations.
 *
 * @version 1.0.0
 */

import { Platform, TextStyle, AccessibilityInfo } from 'react-native'; // v0.72.x
import { colors } from './colors';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, LINE_HEIGHT, LETTER_SPACING } from './fonts';
import { normalizeFont } from '../utils/dimensions';
import { scale, moderateScale } from '../utils/responsive';

// Base line height ratio used for calculating appropriate line heights
const BASE_LINE_HEIGHT_RATIO = 1.2;

/**
 * Creates a responsive text style with normalized font sizes and appropriate line heights
 * 
 * @param fontSize Font size to apply
 * @param fontWeight Font weight to apply
 * @param fontFamily Font family to apply
 * @param letterSpacing Letter spacing to apply
 * @returns TextStyle object with responsive text styling
 */
export const getResponsiveTextStyle = (
  fontSize: number,
  fontWeight: string,
  fontFamily: string,
  letterSpacing: number
): TextStyle => {
  // Apply font size normalization and responsive scaling
  const responsiveFontSize = moderateScale(normalizeFont(fontSize));
  
  // Calculate appropriate line height based on font size
  const lineHeight = Math.round(responsiveFontSize * BASE_LINE_HEIGHT_RATIO);
  
  // Determine platform-specific font family handling
  const platformFontFamily = Platform.select({
    ios: fontFamily,
    android: fontFamily, // Android may require different handling depending on the font
    default: fontFamily,
  });
  
  // Construct and return the text style
  return {
    fontSize: responsiveFontSize,
    fontWeight,
    fontFamily: platformFontFamily,
    lineHeight,
    letterSpacing: moderateScale(letterSpacing),
  };
};

/**
 * Applies the system accessibility font scaling to a base font size
 * 
 * @param size Base font size
 * @returns Font size adjusted according to system accessibility settings
 */
export const applyAccessibilityScaling = (size: number): number => {
  let fontScale = 1;
  
  try {
    // Try to get font scale using modern API if available
    if (typeof AccessibilityInfo.getFontScale === 'function') {
      fontScale = AccessibilityInfo.getFontScale() || 1;
    }
    // Fallback to recommended multiplier if available
    else if (typeof AccessibilityInfo.getRecommendedFontSizeMultiplier === 'function') {
      // This is async, but we'll use it synchronously for simplicity
      // In a real app, you might want to handle this asynchronously
      AccessibilityInfo.getRecommendedFontSizeMultiplier().then(multiplier => {
        fontScale = multiplier || 1;
      });
    }
  } catch (error) {
    console.warn('Error getting accessibility font scale:', error);
  }
  
  // Apply the scale factor to the base size
  return size * fontScale;
};

/**
 * Predefined text style configurations for different UI elements
 */
export const textVariants = {
  heading1: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.bold,
    fontFamily: FONT_FAMILY.bold,
    lineHeight: Math.round(FONT_SIZE.xxxl * LINE_HEIGHT.xl),
    letterSpacing: LETTER_SPACING.tight,
    color: colors.text.primary,
  } as TextStyle,
  
  heading2: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    fontFamily: FONT_FAMILY.bold,
    lineHeight: Math.round(FONT_SIZE.xxl * LINE_HEIGHT.lg),
    letterSpacing: LETTER_SPACING.tight,
    color: colors.text.primary,
  } as TextStyle,
  
  heading3: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    fontFamily: FONT_FAMILY.medium,
    lineHeight: Math.round(FONT_SIZE.xl * LINE_HEIGHT.lg),
    letterSpacing: LETTER_SPACING.normal,
    color: colors.text.primary,
  } as TextStyle,
  
  heading4: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    fontFamily: FONT_FAMILY.medium,
    lineHeight: Math.round(FONT_SIZE.lg * LINE_HEIGHT.md),
    letterSpacing: LETTER_SPACING.normal,
    color: colors.text.primary,
  } as TextStyle,
  
  heading5: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
    fontFamily: FONT_FAMILY.medium,
    lineHeight: Math.round(FONT_SIZE.md * LINE_HEIGHT.md),
    letterSpacing: LETTER_SPACING.normal,
    color: colors.text.primary,
  } as TextStyle,
  
  heading6: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    fontFamily: FONT_FAMILY.medium,
    lineHeight: Math.round(FONT_SIZE.sm * LINE_HEIGHT.sm),
    letterSpacing: LETTER_SPACING.normal,
    color: colors.text.primary,
  } as TextStyle,
  
  paragraph: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: Math.round(FONT_SIZE.md * LINE_HEIGHT.md),
    letterSpacing: LETTER_SPACING.normal,
    color: colors.text.primary,
  } as TextStyle,
  
  paragraphSmall: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: Math.round(FONT_SIZE.sm * LINE_HEIGHT.sm),
    letterSpacing: LETTER_SPACING.normal,
    color: colors.text.secondary,
  } as TextStyle,
  
  caption: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.regular,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: Math.round(FONT_SIZE.xs * LINE_HEIGHT.xs),
    letterSpacing: LETTER_SPACING.normal,
    color: colors.text.tertiary,
  } as TextStyle,
  
  button: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
    fontFamily: FONT_FAMILY.medium,
    lineHeight: Math.round(FONT_SIZE.md * LINE_HEIGHT.md),
    letterSpacing: LETTER_SPACING.normal,
    color: colors.text.inverse,
  } as TextStyle,
  
  buttonSmall: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    fontFamily: FONT_FAMILY.medium,
    lineHeight: Math.round(FONT_SIZE.sm * LINE_HEIGHT.sm),
    letterSpacing: LETTER_SPACING.normal,
    color: colors.text.inverse,
  } as TextStyle,
  
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    fontFamily: FONT_FAMILY.medium,
    lineHeight: Math.round(FONT_SIZE.sm * LINE_HEIGHT.xs),
    letterSpacing: LETTER_SPACING.normal,
    color: colors.text.secondary,
  } as TextStyle,
  
  input: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: Math.round(FONT_SIZE.md * LINE_HEIGHT.md),
    letterSpacing: LETTER_SPACING.normal,
    color: colors.text.primary,
  } as TextStyle,
};

/**
 * Returns predefined text styles for common UI elements
 * 
 * @param variant The text variant name
 * @returns Text style configuration for the specified variant
 */
export const getTextVariant = (variant: string): TextStyle => {
  if (variant in textVariants) {
    return textVariants[variant as keyof typeof textVariants];
  }
  
  // Default to paragraph style if variant not found
  return textVariants.paragraph;
};

/**
 * Text style definitions for different interactive states
 */
export const textStates = {
  default: {
    color: colors.text.primary,
  } as TextStyle,
  
  focused: {
    color: colors.primary[600],
  } as TextStyle,
  
  error: {
    color: colors.error[500],
  } as TextStyle,
  
  disabled: {
    color: colors.text.disabled,
  } as TextStyle,
  
  success: {
    color: colors.success[500],
  } as TextStyle,
};

/**
 * Main typography object containing standardized text style components
 */
export const typography = {
  fontFamily: FONT_FAMILY,
  fontSize: FONT_SIZE,
  fontWeight: FONT_WEIGHT,
  lineHeight: LINE_HEIGHT,
  letterSpacing: LETTER_SPACING,
};

export default typography;