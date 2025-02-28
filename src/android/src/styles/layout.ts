/**
 * Layout System
 * 
 * Defines the layout system for the AI Talent Marketplace Android application.
 * Provides spacing constants, common layout patterns, shadow utilities, border styles,
 * and responsive layout helpers to ensure consistent UI across different Android devices.
 * 
 * @version 1.0.0
 */

import { StyleSheet, Platform, ViewStyle, FlexStyle } from 'react-native'; // v0.72.x
import {
  WINDOW_WIDTH,
  WINDOW_HEIGHT,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  IS_SMALL_DEVICE,
  IS_LARGE_DEVICE,
  getStatusBarHeight
} from '../utils/dimensions';
import {
  scale,
  moderateScale,
  verticalScale,
  moderateVerticalScale,
  spacingValues,
  BASE_SPACING
} from '../utils/responsive';

// App navigation bar height (not the system navigation bar)
export const NAVIGATION_BAR_HEIGHT = IS_SMALL_DEVICE ? 48 : 56;

/**
 * Returns spacing value from predefined spacing scale or calculated based on multiplier
 * 
 * @param multiplier Named size or numeric multiplier of BASE_SPACING
 * @returns Spacing value appropriate for current device
 */
export const getSpacing = (multiplier: number | string): number => {
  // If it's a named size (xxs, xs, s, m, l, xl, xxl)
  if (typeof multiplier === 'string' && multiplier in spacingValues) {
    return moderateScale(spacingValues[multiplier as keyof typeof spacingValues]);
  }
  
  // If it's a numeric multiplier
  if (typeof multiplier === 'number') {
    return moderateScale(BASE_SPACING * multiplier);
  }
  
  // Default fallback
  return moderateScale(BASE_SPACING);
};

/**
 * Creates standardized shadow style with platform-specific implementations
 * 
 * @param elevation Shadow elevation (Android)
 * @param color Shadow color
 * @returns Platform-specific shadow style object
 */
export const createShadow = (elevation: number, color: string = '#000') => {
  // Platform-specific shadow implementation
  if (Platform.OS === 'android') {
    return {
      elevation,
      shadowColor: color,
    };
  }
  
  // For iOS, provide appropriate shadow properties
  // Different elevation values correspond to different shadow styles
  switch (elevation) {
    case 2: // small
      return {
        shadowColor: color,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
      };
    case 5: // medium
      return {
        shadowColor: color,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      };
    case 10: // large
      return {
        shadowColor: color,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 5.46,
      };
    default:
      // Default shadow
      return {
        shadowColor: color,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      };
  }
};

/**
 * Predefined spacing values based on 8-point grid
 */
export const spacing = {
  none: moderateScale(spacingValues.none), // 0
  xxs: moderateScale(spacingValues.xxs),   // 4
  xs: moderateScale(spacingValues.xs),     // 8
  s: moderateScale(spacingValues.s),       // 16
  m: moderateScale(spacingValues.m),       // 24
  l: moderateScale(spacingValues.l),       // 32
  xl: moderateScale(spacingValues.xl),     // 40
  xxl: moderateScale(spacingValues.xxl),   // 48
};

/**
 * Predefined layout patterns using flexbox
 */
export const layout = {
  // Full width and height utilities
  fullWidth: {
    width: '100%',
  } as ViewStyle,
  
  fullHeight: {
    height: '100%',
  } as ViewStyle,
  
  fill: {
    flex: 1,
  } as ViewStyle,
  
  // Centering utilities
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  
  // Row layouts
  row: {
    flexDirection: 'row',
  } as ViewStyle,
  
  rowCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as ViewStyle,
  
  // Column layouts
  column: {
    flexDirection: 'column',
  } as ViewStyle,
  
  columnCenter: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  
  columnBetween: {
    flexDirection: 'column',
    justifyContent: 'space-between',
  } as ViewStyle,
};

/**
 * Shadow styles with predefined shadow values
 */
export const shadow = {
  small: {
    ...(Platform.OS === 'android' ? { elevation: 2 } : {}),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  
  medium: {
    ...(Platform.OS === 'android' ? { elevation: 5 } : {}),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  
  large: {
    ...(Platform.OS === 'android' ? { elevation: 10 } : {}),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5.46,
  },
};

/**
 * Standardized border styles
 */
export const border = {
  thin: {
    borderWidth: 1,
  } as ViewStyle,
  
  normal: {
    borderWidth: 2,
  } as ViewStyle,
  
  thick: {
    borderWidth: 3,
  } as ViewStyle,
  
  rounded: {
    borderRadius: 8,
  } as ViewStyle,
  
  roundedLarge: {
    borderRadius: 16,
  } as ViewStyle,
  
  circle: {
    borderRadius: 9999,
  } as ViewStyle,
};

/**
 * Z-index values for controlling component stacking
 */
export const zIndex = {
  base: 1,
  card: 10,
  dropdown: 50,
  modal: 100,
  toast: 200,
  tooltip: 500,
};

/**
 * Screen padding values to maintain consistent spacing from screen edges
 */
export const screenPadding = {
  horizontal: IS_SMALL_DEVICE ? spacing.s : spacing.m,
  vertical: spacing.m,
  top: getStatusBarHeight() + spacing.s,
  bottom: spacing.m,
};

/**
 * Pre-configured container styles for common UI patterns
 */
export const containerStyles = {
  screenContainer: {
    flex: 1,
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: screenPadding.top,
    paddingBottom: screenPadding.bottom,
  } as ViewStyle,
  
  safeAreaContainer: {
    flex: 1,
    backgroundColor: '#FFF', // Should be provided by theme, using white as default
  } as ViewStyle,
  
  card: {
    padding: spacing.m,
    borderRadius: 8,
    backgroundColor: '#FFF', // Should be provided by theme
    ...shadow.small,
  } as ViewStyle,
  
  section: {
    marginVertical: spacing.m,
  } as ViewStyle,
};