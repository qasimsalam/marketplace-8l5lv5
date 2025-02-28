/**
 * AI Talent Marketplace - Theme System
 * 
 * A centralized theme configuration for the Android application that combines all styling
 * elements into a cohesive theme. Provides theme objects for both light and dark modes,
 * with utilities for accessing the correct theme based on device settings.
 * 
 * Integrates colors, typography, spacing, layout and other design system components
 * into a unified theme interface that can be consumed throughout the application.
 * 
 * @version 1.0.0
 */

import { Appearance, StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native'; // v0.72.x
import { colors, getColorByTheme } from './colors';
import { typography, textVariants, textStates, getResponsiveTextStyle } from './typography';
import {
  spacing,
  layout,
  shadow,
  border,
  zIndex,
  screenPadding,
  containerStyles,
  getSpacing
} from './layout';
import { IS_SMALL_DEVICE, IS_LARGE_DEVICE, IS_TABLET } from '../utils/dimensions';
import { getResponsiveValue, handleOrientationValue } from '../utils/responsive';

// Default theme mode when system preference cannot be determined
const DEFAULT_THEME_MODE = 'light';

/**
 * Theme type definition for TypeScript type checking
 */
export type ThemeType = {
  colors: typeof colors & {
    mode: 'light' | 'dark';
    primary: Record<string | number, string>;
    secondary: Record<string | number, string>;
    accent: Record<string | number, string>;
    success: Record<string | number, string>;
    warning: Record<string | number, string>;
    error: Record<string | number, string>;
    info: Record<string | number, string>;
    gray: Record<string | number, string>;
    text: Record<string, string>;
    background: Record<string, string>;
    border: Record<string, string>;
    transparent: string;
    black: string;
    white: string;
  };
  typography: typeof typography & {
    variants: typeof textVariants;
    states: typeof textStates;
  };
  spacing: typeof spacing & {
    getSpacing: typeof getSpacing;
  };
  layout: typeof layout;
  shadows: typeof shadow;
  borders: typeof border;
  zIndex: typeof zIndex;
  screenPadding: typeof screenPadding;
  containers: typeof containerStyles;
  components: {
    button: {
      variants: {
        primary: ViewStyle;
        secondary: ViewStyle;
        outline: ViewStyle;
        ghost: ViewStyle;
        link: ViewStyle;
      };
      states: {
        default: ViewStyle;
        pressed: ViewStyle;
        disabled: ViewStyle;
        loading: ViewStyle;
        success: ViewStyle;
        error: ViewStyle;
      };
      sizes: {
        small: ViewStyle;
        medium: ViewStyle;
        large: ViewStyle;
      };
    };
    input: {
      variants: {
        outlined: ViewStyle;
        filled: ViewStyle;
        underlined: ViewStyle;
      };
      states: {
        default: ViewStyle;
        focused: ViewStyle;
        error: ViewStyle;
        disabled: ViewStyle;
        success: ViewStyle;
      };
      sizes: {
        small: ViewStyle;
        medium: ViewStyle;
        large: ViewStyle;
      };
    };
    card: {
      variants: {
        elevated: ViewStyle;
        outlined: ViewStyle;
        filled: ViewStyle;
      };
      states: {
        default: ViewStyle;
        pressed: ViewStyle;
        disabled: ViewStyle;
      };
      sizes: {
        small: ViewStyle;
        medium: ViewStyle;
        large: ViewStyle;
      };
    };
    avatar: {
      variants: {
        circle: ViewStyle;
        rounded: ViewStyle;
        square: ViewStyle;
      };
      states: {
        default: ViewStyle;
        loading: ViewStyle;
      };
      sizes: {
        xsmall: ViewStyle;
        small: ViewStyle;
        medium: ViewStyle;
        large: ViewStyle;
        xlarge: ViewStyle;
      };
    };
    checkbox: {
      variants: {
        filled: ViewStyle;
        outlined: ViewStyle;
      };
      states: {
        unchecked: ViewStyle;
        checked: ViewStyle;
        indeterminate: ViewStyle;
        disabled: ViewStyle;
      };
      sizes: {
        small: ViewStyle;
        medium: ViewStyle;
        large: ViewStyle;
      };
    };
    radioButton: {
      variants: {
        filled: ViewStyle;
        outlined: ViewStyle;
      };
      states: {
        unchecked: ViewStyle;
        checked: ViewStyle;
        disabled: ViewStyle;
      };
      sizes: {
        small: ViewStyle;
        medium: ViewStyle;
        large: ViewStyle;
      };
    };
    toggle: {
      variants: {
        default: ViewStyle;
        'ios-style': ViewStyle;
        'material-style': ViewStyle;
      };
      states: {
        off: ViewStyle;
        on: ViewStyle;
        disabled: ViewStyle;
      };
      sizes: {
        small: ViewStyle;
        medium: ViewStyle;
        large: ViewStyle;
      };
    };
    modal: {
      variants: {
        center: ViewStyle;
        bottom: ViewStyle;
        fullscreen: ViewStyle;
      };
      states: {
        opening: ViewStyle;
        open: ViewStyle;
        closing: ViewStyle;
        closed: ViewStyle;
      };
      sizes: {
        small: ViewStyle;
        medium: ViewStyle;
        large: ViewStyle;
        fullscreen: ViewStyle;
      };
    };
    toast: {
      variants: {
        default: ViewStyle;
        success: ViewStyle;
        error: ViewStyle;
        warning: ViewStyle;
        info: ViewStyle;
      };
      states: {
        showing: ViewStyle;
        hiding: ViewStyle;
      };
      sizes: {
        small: ViewStyle;
        medium: ViewStyle;
        large: ViewStyle;
      };
    };
  };
};

/**
 * Gets the current device theme preference
 * 
 * @returns The current theme mode ('light' or 'dark')
 */
export const getSystemTheme = (): 'light' | 'dark' => {
  const colorScheme = Appearance.getColorScheme();
  return colorScheme === 'dark' ? 'dark' : 'light';
};

/**
 * Creates a complete theme object by combining all styling elements
 * 
 * @param mode - The theme mode ('light' or 'dark')
 * @returns A complete theme object with all styling properties
 */
export const createTheme = (mode: 'light' | 'dark'): ThemeType => {
  const isDark = mode === 'dark';
  
  // Create theme-specific color references
  const themeColors = {
    ...colors,
    mode,
    // Override theme-specific colors for foreground and background elements
    text: {
      primary: isDark ? colors.gray[50] : colors.gray[900],
      secondary: isDark ? colors.gray[300] : colors.gray[700],
      tertiary: isDark ? colors.gray[400] : colors.gray[500],
      disabled: isDark ? colors.gray[600] : colors.gray[400],
      inverse: isDark ? colors.gray[900] : colors.gray[50],
    },
    background: {
      primary: isDark ? colors.gray[900] : colors.white,
      secondary: isDark ? colors.gray[800] : colors.gray[50],
      tertiary: isDark ? colors.gray[700] : colors.gray[100],
      elevated: isDark ? colors.gray[800] : colors.white,
      disabled: isDark ? colors.gray[700] : colors.gray[100],
    },
    border: {
      default: isDark ? colors.gray[700] : colors.gray[200],
      strong: isDark ? colors.gray[600] : colors.gray[400],
      focus: isDark ? colors.primary[400] : colors.primary[500],
    },
  };

  // Create component styles based on the current theme mode
  const componentStyles = {
    button: {
      variants: {
        primary: {
          backgroundColor: themeColors.primary[500],
          borderColor: themeColors.primary[500],
          borderWidth: 1,
          ...border.rounded,
        } as ViewStyle,
        secondary: {
          backgroundColor: themeColors.secondary[500],
          borderColor: themeColors.secondary[500],
          borderWidth: 1,
          ...border.rounded,
        } as ViewStyle,
        outline: {
          backgroundColor: 'transparent',
          borderColor: themeColors.primary[500],
          borderWidth: 1,
          ...border.rounded,
        } as ViewStyle,
        ghost: {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          borderWidth: 1,
        } as ViewStyle,
        link: {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          borderWidth: 0,
        } as ViewStyle,
      },
      states: {
        default: {} as ViewStyle,
        pressed: {
          opacity: 0.8,
        } as ViewStyle,
        disabled: {
          opacity: 0.5,
          backgroundColor: isDark ? themeColors.gray[700] : themeColors.gray[300],
          borderColor: isDark ? themeColors.gray[700] : themeColors.gray[300],
        } as ViewStyle,
        loading: {
          opacity: 0.8,
        } as ViewStyle,
        success: {
          backgroundColor: themeColors.success[500],
          borderColor: themeColors.success[500],
        } as ViewStyle,
        error: {
          backgroundColor: themeColors.error[500],
          borderColor: themeColors.error[500],
        } as ViewStyle,
      },
      sizes: {
        small: {
          paddingVertical: spacing.xxs,
          paddingHorizontal: spacing.xs,
          minHeight: 32,
        } as ViewStyle,
        medium: {
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.s,
          minHeight: 40,
        } as ViewStyle,
        large: {
          paddingVertical: spacing.s,
          paddingHorizontal: spacing.m,
          minHeight: 48,
        } as ViewStyle,
      },
    },
    input: {
      variants: {
        outlined: {
          backgroundColor: 'transparent',
          borderColor: themeColors.border.default,
          borderWidth: 1,
          ...border.rounded,
        } as ViewStyle,
        filled: {
          backgroundColor: isDark ? themeColors.gray[800] : themeColors.gray[100],
          borderColor: 'transparent',
          borderWidth: 1,
          ...border.rounded,
        } as ViewStyle,
        underlined: {
          backgroundColor: 'transparent',
          borderBottomColor: themeColors.border.default,
          borderBottomWidth: 1,
          borderRadius: 0,
        } as ViewStyle,
      },
      states: {
        default: {} as ViewStyle,
        focused: {
          borderColor: themeColors.primary[500],
        } as ViewStyle,
        error: {
          borderColor: themeColors.error[500],
        } as ViewStyle,
        disabled: {
          opacity: 0.5,
          backgroundColor: isDark ? themeColors.gray[800] : themeColors.gray[100],
        } as ViewStyle,
        success: {
          borderColor: themeColors.success[500],
        } as ViewStyle,
      },
      sizes: {
        small: {
          paddingVertical: spacing.xxs,
          paddingHorizontal: spacing.xs,
          minHeight: 32,
        } as ViewStyle,
        medium: {
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.s,
          minHeight: 40,
        } as ViewStyle,
        large: {
          paddingVertical: spacing.s,
          paddingHorizontal: spacing.m,
          minHeight: 48,
        } as ViewStyle,
      },
    },
    card: {
      variants: {
        elevated: {
          backgroundColor: themeColors.background.elevated,
          ...shadow.medium,
          ...border.rounded,
        } as ViewStyle,
        outlined: {
          backgroundColor: themeColors.background.primary,
          borderColor: themeColors.border.default,
          borderWidth: 1,
          ...border.rounded,
        } as ViewStyle,
        filled: {
          backgroundColor: isDark ? themeColors.gray[800] : themeColors.gray[100],
          ...border.rounded,
        } as ViewStyle,
      },
      states: {
        default: {} as ViewStyle,
        pressed: {
          opacity: 0.9,
        } as ViewStyle,
        disabled: {
          opacity: 0.5,
        } as ViewStyle,
      },
      sizes: {
        small: {
          padding: spacing.xs,
        } as ViewStyle,
        medium: {
          padding: spacing.s,
        } as ViewStyle,
        large: {
          padding: spacing.m,
        } as ViewStyle,
      },
    },
    avatar: {
      variants: {
        circle: {
          ...border.circle,
          overflow: 'hidden',
        } as ViewStyle,
        rounded: {
          ...border.rounded,
          overflow: 'hidden',
        } as ViewStyle,
        square: {
          overflow: 'hidden',
        } as ViewStyle,
      },
      states: {
        default: {} as ViewStyle,
        loading: {
          backgroundColor: isDark ? themeColors.gray[700] : themeColors.gray[300],
        } as ViewStyle,
      },
      sizes: {
        xsmall: {
          width: 24,
          height: 24,
        } as ViewStyle,
        small: {
          width: 32,
          height: 32,
        } as ViewStyle,
        medium: {
          width: 40,
          height: 40,
        } as ViewStyle,
        large: {
          width: 48,
          height: 48,
        } as ViewStyle,
        xlarge: {
          width: 64,
          height: 64,
        } as ViewStyle,
      },
    },
    checkbox: {
      variants: {
        filled: {
          backgroundColor: isDark ? themeColors.gray[800] : themeColors.white,
          borderColor: themeColors.border.default,
          borderWidth: 1,
          ...border.rounded,
        } as ViewStyle,
        outlined: {
          backgroundColor: 'transparent',
          borderColor: themeColors.border.default,
          borderWidth: 1,
          ...border.rounded,
        } as ViewStyle,
      },
      states: {
        unchecked: {} as ViewStyle,
        checked: {
          backgroundColor: themeColors.primary[500],
          borderColor: themeColors.primary[500],
        } as ViewStyle,
        indeterminate: {
          backgroundColor: themeColors.primary[500],
          borderColor: themeColors.primary[500],
          opacity: 0.8,
        } as ViewStyle,
        disabled: {
          opacity: 0.5,
          backgroundColor: isDark ? themeColors.gray[700] : themeColors.gray[300],
        } as ViewStyle,
      },
      sizes: {
        small: {
          width: 16,
          height: 16,
        } as ViewStyle,
        medium: {
          width: 20,
          height: 20,
        } as ViewStyle,
        large: {
          width: 24,
          height: 24,
        } as ViewStyle,
      },
    },
    radioButton: {
      variants: {
        filled: {
          backgroundColor: isDark ? themeColors.gray[800] : themeColors.white,
          borderColor: themeColors.border.default,
          borderWidth: 1,
          ...border.circle,
        } as ViewStyle,
        outlined: {
          backgroundColor: 'transparent',
          borderColor: themeColors.border.default,
          borderWidth: 1,
          ...border.circle,
        } as ViewStyle,
      },
      states: {
        unchecked: {} as ViewStyle,
        checked: {
          borderColor: themeColors.primary[500],
          // Inner circle handled separately with nested view
        } as ViewStyle,
        disabled: {
          opacity: 0.5,
          backgroundColor: isDark ? themeColors.gray[700] : themeColors.gray[300],
        } as ViewStyle,
      },
      sizes: {
        small: {
          width: 16,
          height: 16,
        } as ViewStyle,
        medium: {
          width: 20,
          height: 20,
        } as ViewStyle,
        large: {
          width: 24,
          height: 24,
        } as ViewStyle,
      },
    },
    toggle: {
      variants: {
        default: {
          backgroundColor: isDark ? themeColors.gray[700] : themeColors.gray[300],
          borderColor: isDark ? themeColors.gray[600] : themeColors.gray[400],
          borderWidth: 1,
          ...border.circle,
        } as ViewStyle,
        'ios-style': {
          backgroundColor: isDark ? themeColors.gray[700] : themeColors.gray[300],
          borderColor: isDark ? themeColors.gray[600] : themeColors.gray[400],
          borderWidth: 0,
          ...border.roundedLarge,
        } as ViewStyle,
        'material-style': {
          backgroundColor: isDark ? themeColors.gray[700] : themeColors.gray[300],
          borderColor: 'transparent',
          borderWidth: 0,
          ...border.rounded,
        } as ViewStyle,
      },
      states: {
        off: {} as ViewStyle,
        on: {
          backgroundColor: themeColors.primary[500],
          borderColor: themeColors.primary[600],
        } as ViewStyle,
        disabled: {
          opacity: 0.5,
          backgroundColor: isDark ? themeColors.gray[800] : themeColors.gray[300],
        } as ViewStyle,
      },
      sizes: {
        small: {
          width: 36,
          height: 20,
        } as ViewStyle,
        medium: {
          width: 44,
          height: 24,
        } as ViewStyle,
        large: {
          width: 52,
          height: 28,
        } as ViewStyle,
      },
    },
    modal: {
      variants: {
        center: {
          margin: spacing.m,
          ...border.rounded,
          backgroundColor: themeColors.background.primary,
        } as ViewStyle,
        bottom: {
          margin: 0,
          marginTop: spacing.xl,
          ...border.rounded,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          backgroundColor: themeColors.background.primary,
        } as ViewStyle,
        fullscreen: {
          margin: 0,
          backgroundColor: themeColors.background.primary,
        } as ViewStyle,
      },
      states: {
        opening: {
          opacity: 0.5,
        } as ViewStyle,
        open: {
          opacity: 1,
        } as ViewStyle,
        closing: {
          opacity: 0.5,
        } as ViewStyle,
        closed: {
          opacity: 0,
          display: 'none',
        } as ViewStyle,
      },
      sizes: {
        small: {
          width: '80%',
          maxWidth: 400,
        } as ViewStyle,
        medium: {
          width: '90%',
          maxWidth: 500,
        } as ViewStyle,
        large: {
          width: '95%',
          maxWidth: 600,
        } as ViewStyle,
        fullscreen: {
          width: '100%',
          height: '100%',
        } as ViewStyle,
      },
    },
    toast: {
      variants: {
        default: {
          backgroundColor: isDark ? themeColors.gray[800] : themeColors.gray[100],
          ...border.rounded,
          ...shadow.medium,
        } as ViewStyle,
        success: {
          backgroundColor: isDark ? themeColors.success[900] : themeColors.success[100],
          borderLeftColor: themeColors.success[500],
          borderLeftWidth: 4,
          ...border.rounded,
          ...shadow.medium,
        } as ViewStyle,
        error: {
          backgroundColor: isDark ? themeColors.error[900] : themeColors.error[100],
          borderLeftColor: themeColors.error[500],
          borderLeftWidth: 4,
          ...border.rounded,
          ...shadow.medium,
        } as ViewStyle,
        warning: {
          backgroundColor: isDark ? themeColors.warning[900] : themeColors.warning[100],
          borderLeftColor: themeColors.warning[500],
          borderLeftWidth: 4,
          ...border.rounded,
          ...shadow.medium,
        } as ViewStyle,
        info: {
          backgroundColor: isDark ? themeColors.info[900] : themeColors.info[100],
          borderLeftColor: themeColors.info[500],
          borderLeftWidth: 4,
          ...border.rounded,
          ...shadow.medium,
        } as ViewStyle,
      },
      states: {
        showing: {
          opacity: 1,
        } as ViewStyle,
        hiding: {
          opacity: 0,
        } as ViewStyle,
      },
      sizes: {
        small: {
          padding: spacing.xs,
          width: '80%',
          maxWidth: 300,
        } as ViewStyle,
        medium: {
          padding: spacing.s,
          width: '90%',
          maxWidth: 350,
        } as ViewStyle,
        large: {
          padding: spacing.m,
          width: '95%',
          maxWidth: 400,
        } as ViewStyle,
      },
    },
  };

  // Construct and return the complete theme object
  return {
    colors: themeColors,
    typography: {
      ...typography,
      variants: textVariants,
      states: textStates,
    },
    spacing: {
      ...spacing,
      getSpacing,
    },
    layout,
    shadows: shadow,
    borders: border,
    zIndex,
    screenPadding,
    containers: containerStyles,
    components: componentStyles,
  };
};

/**
 * A helper function for getting component-specific styles based on theme and component state
 * 
 * @param componentName - The name of the component (button, input, etc.)
 * @param state - The component state (default, pressed, etc.)
 * @param mode - The theme mode (light or dark)
 * @returns Component-specific style object for the given state and theme
 */
export const getThemeStyles = (
  componentName: string,
  state: string,
  mode: 'light' | 'dark' = getSystemTheme()
): ViewStyle => {
  // Get the appropriate theme
  const theme = mode === 'dark' ? darkTheme : lightTheme;
  
  // Check if component exists in theme
  if (!theme.components[componentName as keyof typeof theme.components]) {
    console.warn(`Component "${componentName}" not found in theme`);
    return {} as ViewStyle;
  }
  
  // Get the component from theme
  const component = theme.components[componentName as keyof typeof theme.components];
  
  // Check if state exists for component
  if (!component.states || !component.states[state as keyof typeof component.states]) {
    console.warn(`State "${state}" not found for component "${componentName}"`);
    return component.states.default || {};
  }
  
  // Return the state-specific styles
  return {
    ...component.states[state as keyof typeof component.states],
  };
};

// Create light and dark theme objects
export const lightTheme = createTheme('light');
export const darkTheme = createTheme('dark');

// Default theme based on system preference
export const defaultTheme = getSystemTheme() === 'dark' ? darkTheme : lightTheme;

// Re-export the theme type for consumers
export { ThemeType };