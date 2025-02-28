/**
 * Typography Styles
 * 
 * Defines comprehensive typography styles for the AI Talent Marketplace iOS application,
 * providing responsive text styling with accessibility consideration. This central file 
 * supports the application's text styling needs with consistent font sizes, weights, 
 * and line heights, ensuring visual coherence across all UI components.
 *
 * @version react-native 0.72.x
 */

import { Platform, TextStyle } from 'react-native'; // v0.72.x
import { text } from './colors';
import { FONT_FAMILY, FONT_SIZE, FONT_WEIGHT, LINE_HEIGHT, LETTER_SPACING } from './fonts';
import { normalizeFont } from '../utils/dimensions';
import { scale, moderateScale } from '../utils/responsive';

// Base line height ratio for calculating consistent line heights
const BASE_LINE_HEIGHT_RATIO = 1.2;

/**
 * Creates a responsive text style with normalized font sizes and appropriate line heights
 * @param fontSize Base font size to use
 * @param fontWeight Font weight to apply
 * @param fontFamily Font family to use
 * @param letterSpacing Letter spacing value to apply
 * @returns React Native TextStyle object with responsive text styling
 */
export const getResponsiveTextStyle = (
  fontSize: number,
  fontWeight: string,
  fontFamily: string,
  letterSpacing: number = 0
): TextStyle => {
  // Apply normalizeFont to calculate the responsive font size
  const responsiveFontSize = normalizeFont(fontSize);
  
  // Calculate appropriate line height using BASE_LINE_HEIGHT_RATIO
  const calculatedLineHeight = Math.round(responsiveFontSize * BASE_LINE_HEIGHT_RATIO);
  
  // Determine font family based on weight and platform
  let fontFamilyToUse = fontFamily;
  if (Platform.OS === 'ios') {
    // iOS uses system font with dynamic weights
    fontFamilyToUse = 'System';
  }
  
  // Return the complete text style
  return {
    fontSize: responsiveFontSize,
    fontWeight: fontWeight,
    fontFamily: fontFamilyToUse,
    lineHeight: calculatedLineHeight,
    letterSpacing: letterSpacing,
  };
};

/**
 * Typography constants for use throughout the application
 */
export const typography = {
  fontFamily: FONT_FAMILY,
  fontSize: FONT_SIZE,
  fontWeight: FONT_WEIGHT,
  lineHeight: LINE_HEIGHT,
  letterSpacing: LETTER_SPACING,
};

/**
 * Predefined text styles for common UI elements
 */
export const textVariants = {
  // Headings
  heading1: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.xl,
    letterSpacing: typography.letterSpacing.tight,
    color: text.primary,
  } as TextStyle,
  
  heading2: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.l,
    letterSpacing: typography.letterSpacing.tight,
    color: text.primary,
  } as TextStyle,
  
  heading3: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    lineHeight: typography.lineHeight.l,
    letterSpacing: typography.letterSpacing.tight,
    color: text.primary,
  } as TextStyle,
  
  heading4: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.l,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.m,
    letterSpacing: typography.letterSpacing.tight,
    color: text.primary,
  } as TextStyle,
  
  heading5: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.m,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.m,
    letterSpacing: typography.letterSpacing.normal,
    color: text.primary,
  } as TextStyle,
  
  heading6: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.s,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.s,
    letterSpacing: typography.letterSpacing.normal,
    color: text.primary,
  } as TextStyle,
  
  // Body text
  paragraph: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.m,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.m,
    letterSpacing: typography.letterSpacing.normal,
    color: text.primary,
  } as TextStyle,
  
  paragraphSmall: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.s,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.s,
    letterSpacing: typography.letterSpacing.normal,
    color: text.secondary,
  } as TextStyle,
  
  caption: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.xs,
    letterSpacing: typography.letterSpacing.wide,
    color: text.tertiary,
  } as TextStyle,
  
  // Interactive elements
  button: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.m,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.m,
    letterSpacing: typography.letterSpacing.normal,
    color: text.primary,
  } as TextStyle,
  
  buttonSmall: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.s,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.s,
    letterSpacing: typography.letterSpacing.normal,
    color: text.primary,
  } as TextStyle,
  
  // Form elements
  label: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.fontSize.s,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.s,
    letterSpacing: typography.letterSpacing.normal,
    color: text.primary,
  } as TextStyle,
  
  input: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.fontSize.m,
    fontWeight: typography.fontWeight.regular,
    lineHeight: typography.lineHeight.m,
    letterSpacing: typography.letterSpacing.normal,
    color: text.primary,
  } as TextStyle,
};

/**
 * Text styles for different interactive states
 * Note: Ideally, we would import and use colors.error and colors.success for the error and success states.
 * However, according to the import specification, we are only importing 'text' from colors.ts.
 * Therefore, we use hardcoded color values that match the palette from colors.ts.
 */
export const textStates = {
  default: {
    color: text.primary,
  } as TextStyle,
  
  focused: {
    color: text.primary,
  } as TextStyle,
  
  error: {
    color: '#ef4444', // Equivalent to colors.error[500]
  } as TextStyle,
  
  disabled: {
    color: text.disabled,
  } as TextStyle,
  
  success: {
    color: '#22c55e', // Equivalent to colors.success[500]
  } as TextStyle,
};

/**
 * Returns predefined text styles for common UI elements
 * @param variant The name of the text variant to retrieve
 * @returns Text style configuration for the specified variant
 */
export const getTextVariant = (variant: keyof typeof textVariants): TextStyle => {
  if (variant in textVariants) {
    return textVariants[variant];
  }
  // Default to paragraph style if variant not found
  return textVariants.paragraph;
};