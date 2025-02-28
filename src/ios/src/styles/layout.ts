/**
 * Layout System
 * 
 * Defines the layout system for the AI Talent Marketplace iOS application.
 * This module provides reusable layout patterns, spacing constants, responsive sizing
 * utilities, and flexbox-based style presets to ensure consistent UI layouts 
 * across different device sizes and orientations.
 * 
 * @version react-native 0.72.x
 */

import { Platform, StyleSheet, ViewStyle, FlexStyle } from 'react-native'; // v0.72.x
import {
  WINDOW_WIDTH,
  WINDOW_HEIGHT,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  IS_IPHONE_X,
  IS_TABLET,
  getResponsiveWidth,
  getResponsiveHeight,
  getStatusBarHeight
} from '../utils/dimensions';
import {
  scale,
  moderateScale,
  verticalScale,
  moderateVerticalScale,
  spacingValues
} from '../utils/responsive';

// Base spacing unit (8-point grid system)
const BASE_SPACING = 8;

// Safe area bottom height for notched devices
const SAFE_AREA_BOTTOM = IS_IPHONE_X ? 34 : 0;

/**
 * Calculates responsive size based on device dimensions
 * @param size The size to be made responsive
 * @param isHeight Whether the size is a height value (true) or width value (false)
 * @returns A responsively scaled size
 */
export const getResponsiveSize = (size: number, isHeight: boolean = false): number => {
  return isHeight ? verticalScale(size) : scale(size);
};

/**
 * Returns spacing value from predefined spacing scale
 * @param multiplier Number or string representing spacing scale multiplier
 * @returns Calculated spacing value
 */
export const getSpacing = (multiplier: number | string): number => {
  // If multiplier is a named spacing size
  if (typeof multiplier === 'string' && multiplier in spacingValues) {
    return scale(spacingValues[multiplier as keyof typeof spacingValues]);
  }

  // If multiplier is a number
  if (typeof multiplier === 'number') {
    return scale(BASE_SPACING * multiplier);
  }

  // Default fallback
  return 0;
};

/**
 * Creates standardized shadow style with platform-specific implementations
 * @param elevation Shadow elevation (0-24)
 * @param color Shadow color
 * @returns Platform-specific shadow style object
 */
export const createShadow = (elevation: number = 2, color: string = 'rgba(0, 0, 0, 0.2)') => {
  if (Platform.OS === 'ios') {
    return {
      shadowColor: color,
      shadowOffset: {
        width: 0,
        height: elevation,
      },
      shadowOpacity: 0.25,
      shadowRadius: elevation * 0.75,
    };
  }

  // Android
  return {
    elevation,
  };
};

// ========================
// Spacing scale
// ========================
export const spacing = {
  xxs: getSpacing('xxs'),
  xs: getSpacing('xs'),
  s: getSpacing('s'),
  m: getSpacing('m'),
  l: getSpacing('l'),
  xl: getSpacing('xl'),
  xxl: getSpacing('xxl'),
};

// ========================
// Common layout patterns
// ========================
export const layout = {
  fullScreen: {
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
  } as ViewStyle,
  
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  
  row: {
    flexDirection: 'row',
  } as ViewStyle,
  
  rowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  
  column: {
    flexDirection: 'column',
  } as ViewStyle,
  
  columnCentered: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  
  columnBetween: {
    flexDirection: 'column',
    justifyContent: 'space-between',
  } as ViewStyle,
  
  fill: {
    flex: 1,
  } as ViewStyle,
};

// ========================
// Shadow presets
// ========================
export const shadow = {
  light: createShadow(2),
  medium: createShadow(4),
  heavy: createShadow(8),
};

// ========================
// Border presets
// ========================
export const border = {
  thin: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  normal: {
    borderWidth: 1,
  },
  thick: {
    borderWidth: 2,
  },
  rounded: {
    borderRadius: 4,
  },
  roundedLarge: {
    borderRadius: 8,
  },
  circle: {
    borderRadius: 9999,
  },
};

// ========================
// Z-index values
// ========================
export const zIndex = {
  base: 1,
  card: 10,
  dropdown: 100,
  modal: 1000,
  toast: 2000,
  tooltip: 3000,
};

// ========================
// Screen padding presets
// ========================
export const screenPadding = {
  horizontal: getSpacing(2), // 16
  vertical: getSpacing(2),   // 16
  top: getSpacing(2) + getStatusBarHeight(),
  bottom: getSpacing(2) + SAFE_AREA_BOTTOM,
};

// ========================
// Container style presets
// ========================
export const containerStyles = {
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  } as ViewStyle,
  
  safeAreaContainer: {
    flex: 1,
    paddingTop: getStatusBarHeight(),
    paddingBottom: SAFE_AREA_BOTTOM,
  } as ViewStyle,
  
  card: {
    padding: spacing.m,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    ...shadow.light,
  } as ViewStyle,
  
  section: {
    marginVertical: spacing.m,
  } as ViewStyle,
};