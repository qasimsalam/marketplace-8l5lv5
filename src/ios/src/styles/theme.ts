/**
 * Theme Configuration
 * 
 * A centralized theme configuration for the AI Talent Marketplace iOS application.
 * This file combines all styling elements into a cohesive theme with support for
 * both light and dark modes, and provides utilities for accessing the correct theme
 * based on device settings.
 * 
 * @version react-native 0.72.x
 */

import { Appearance } from 'react-native'; // v0.72.x
import { colors, getColorByTheme } from './colors';
import {
  FONT_FAMILY,
  FONT_SIZE,
  FONT_WEIGHT,
  LINE_HEIGHT,
  LETTER_SPACING,
  TEXT_VARIANT,
  getResponsiveFontSize
} from './fonts';
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

// Default theme mode when system preference can't be determined
const DEFAULT_THEME_MODE = 'light';

/**
 * Theme type definition that describes the structure of theme objects
 */
export interface ThemeType {
  colors: {
    primary: typeof colors.primary;
    secondary: typeof colors.secondary;
    accent: typeof colors.accent;
    success: typeof colors.success;
    warning: typeof colors.warning;
    error: typeof colors.error;
    info: typeof colors.info;
    gray: typeof colors.gray;
    text: typeof colors.text;
    background: typeof colors.background;
    border: typeof colors.border;
    transparent: string;
    black: string;
    white: string;
  };
  fonts: {
    family: typeof FONT_FAMILY;
    size: typeof FONT_SIZE;
    weight: typeof FONT_WEIGHT;
    lineHeight: typeof LINE_HEIGHT;
    letterSpacing: typeof LETTER_SPACING;
    variant: typeof TEXT_VARIANT;
  };
  spacing: typeof spacing;
  layout: typeof layout;
  shadows: typeof shadow;
  borders: typeof border;
  zIndices: typeof zIndex;
  screenPadding: typeof screenPadding;
  components: {
    button: {
      primary: Record<string, any>;
      secondary: Record<string, any>;
      outlined: Record<string, any>;
      disabled: Record<string, any>;
    };
    input: Record<string, any>;
    card: Record<string, any>;
    header: Record<string, any>;
    modal: Record<string, any>;
    toast: Record<string, any>;
    checkbox: Record<string, any>;
    radioButton: Record<string, any>;
    toggleSwitch: Record<string, any>;
    progressBar: Record<string, any>;
    avatar: Record<string, any>;
  };
}

/**
 * Gets the current device theme preference
 * @returns The current theme mode ('light' or 'dark')
 */
export const getSystemTheme = (): 'light' | 'dark' => {
  const colorScheme = Appearance.getColorScheme();
  return colorScheme === 'dark' ? 'dark' : 'light';
};

/**
 * Creates a complete theme object by combining all styling elements
 * @param mode The theme mode ('light' or 'dark')
 * @returns A complete theme object with all styling properties
 */
export const createTheme = (mode: 'light' | 'dark'): ThemeType => {
  const isDark = mode === 'dark';
  
  // Theme-specific colors
  const backgroundColor = isDark ? colors.gray[900] : colors.white;
  const textColor = isDark ? colors.gray[50] : colors.gray[900];
  const borderColor = isDark ? colors.gray[700] : colors.gray[200];
  const primaryColor = isDark ? colors.primary[400] : colors.primary[600];
  const secondaryColor = isDark ? colors.secondary[400] : colors.secondary[600];
  const accentColor = isDark ? colors.accent[400] : colors.accent[500];
  
  return {
    colors: {
      ...colors,
      // Override theme-specific colors if needed
    },
    fonts: {
      family: FONT_FAMILY,
      size: FONT_SIZE,
      weight: FONT_WEIGHT,
      lineHeight: LINE_HEIGHT,
      letterSpacing: LETTER_SPACING,
      variant: TEXT_VARIANT,
    },
    spacing,
    layout,
    shadows: shadow,
    borders: border,
    zIndices: zIndex,
    screenPadding,
    components: {
      button: {
        primary: {
          container: {
            backgroundColor: primaryColor,
            paddingVertical: spacing.m,
            paddingHorizontal: spacing.l,
            borderRadius: 8,
            ...layout.centered,
          },
          text: {
            color: colors.white,
            ...TEXT_VARIANT.button,
          },
          icon: {
            color: colors.white,
            marginRight: spacing.xs,
          },
        },
        secondary: {
          container: {
            backgroundColor: secondaryColor,
            paddingVertical: spacing.m,
            paddingHorizontal: spacing.l,
            borderRadius: 8,
            ...layout.centered,
          },
          text: {
            color: colors.white,
            ...TEXT_VARIANT.button,
          },
          icon: {
            color: colors.white,
            marginRight: spacing.xs,
          },
        },
        outlined: {
          container: {
            backgroundColor: 'transparent',
            paddingVertical: spacing.m,
            paddingHorizontal: spacing.l,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: primaryColor,
            ...layout.centered,
          },
          text: {
            color: primaryColor,
            ...TEXT_VARIANT.button,
          },
          icon: {
            color: primaryColor,
            marginRight: spacing.xs,
          },
        },
        disabled: {
          container: {
            backgroundColor: isDark ? colors.gray[800] : colors.gray[200],
            paddingVertical: spacing.m,
            paddingHorizontal: spacing.l,
            borderRadius: 8,
            ...layout.centered,
          },
          text: {
            color: isDark ? colors.gray[600] : colors.gray[400],
            ...TEXT_VARIANT.button,
          },
          icon: {
            color: isDark ? colors.gray[600] : colors.gray[400],
            marginRight: spacing.xs,
          },
        },
      },
      input: {
        container: {
          backgroundColor: isDark ? colors.gray[800] : colors.white,
          borderWidth: 1,
          borderColor: borderColor,
          borderRadius: 8,
          paddingHorizontal: spacing.m,
          paddingVertical: spacing.s,
          marginBottom: spacing.m,
        },
        label: {
          color: textColor,
          marginBottom: spacing.xs,
          ...TEXT_VARIANT.label,
        },
        text: {
          color: textColor,
          ...TEXT_VARIANT.input,
        },
        placeholder: {
          color: isDark ? colors.gray[500] : colors.gray[400],
        },
        error: {
          borderColor: colors.error[500],
          color: colors.error[500],
          marginTop: spacing.xxs,
          ...TEXT_VARIANT.caption,
        },
        success: {
          borderColor: colors.success[500],
          color: colors.success[500],
        },
        disabled: {
          backgroundColor: isDark ? colors.gray[900] : colors.gray[100],
          color: isDark ? colors.gray[600] : colors.gray[400],
        },
        icon: {
          color: isDark ? colors.gray[400] : colors.gray[500],
        },
      },
      card: {
        container: {
          backgroundColor: isDark ? colors.gray[800] : colors.white,
          borderRadius: 8,
          padding: spacing.m,
          ...shadow.medium,
        },
        header: {
          marginBottom: spacing.m,
        },
        content: {
          marginBottom: spacing.m,
        },
        footer: {
          marginTop: spacing.m,
        },
      },
      header: {
        container: {
          height: 56 + screenPadding.top,
          paddingTop: screenPadding.top,
          backgroundColor: isDark ? colors.gray[900] : colors.white,
          ...layout.rowBetween,
          paddingHorizontal: spacing.m,
          ...shadow.light,
        },
        title: {
          ...TEXT_VARIANT.heading4,
          color: textColor,
        },
        subtitle: {
          ...TEXT_VARIANT.caption,
          color: isDark ? colors.gray[300] : colors.gray[600],
        },
        icon: {
          color: textColor,
        },
      },
      modal: {
        backdrop: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          ...layout.centered,
          ...layout.fullScreen,
          zIndex: zIndex.modal,
        },
        container: {
          backgroundColor: isDark ? colors.gray[800] : colors.white,
          borderRadius: 12,
          width: '90%',
          maxWidth: 400,
          maxHeight: '80%',
          ...shadow.heavy,
        },
        header: {
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
          padding: spacing.m,
          ...layout.rowBetween,
        },
        content: {
          padding: spacing.m,
        },
        footer: {
          borderTopWidth: 1,
          borderTopColor: borderColor,
          padding: spacing.m,
        },
      },
      toast: {
        info: {
          backgroundColor: colors.info[isDark ? 800 : 100],
          borderLeftColor: colors.info[500],
          borderLeftWidth: 4,
        },
        success: {
          backgroundColor: colors.success[isDark ? 800 : 100],
          borderLeftColor: colors.success[500],
          borderLeftWidth: 4,
        },
        warning: {
          backgroundColor: colors.warning[isDark ? 800 : 100],
          borderLeftColor: colors.warning[500],
          borderLeftWidth: 4,
        },
        error: {
          backgroundColor: colors.error[isDark ? 800 : 100],
          borderLeftColor: colors.error[500],
          borderLeftWidth: 4,
        },
        container: {
          borderRadius: 8,
          padding: spacing.m,
          ...layout.row,
          alignItems: 'center',
          ...shadow.medium,
          marginHorizontal: spacing.m,
          marginBottom: spacing.m,
        },
        text: {
          flex: 1,
          marginLeft: spacing.s,
          color: textColor,
        },
        icon: {
          marginRight: spacing.s,
        },
      },
      checkbox: {
        container: {
          ...layout.row,
          alignItems: 'center',
          marginBottom: spacing.m,
        },
        box: {
          width: 20,
          height: 20,
          borderWidth: 1,
          borderRadius: 4,
          marginRight: spacing.s,
          ...layout.centered,
        },
        checked: {
          backgroundColor: primaryColor,
          borderColor: primaryColor,
        },
        unchecked: {
          backgroundColor: 'transparent',
          borderColor: borderColor,
        },
        disabled: {
          opacity: 0.5,
        },
        label: {
          color: textColor,
          ...TEXT_VARIANT.paragraph,
        },
      },
      radioButton: {
        container: {
          ...layout.row,
          alignItems: 'center',
          marginBottom: spacing.m,
        },
        circle: {
          width: 20,
          height: 20,
          borderWidth: 1,
          borderRadius: 10,
          marginRight: spacing.s,
          ...layout.centered,
        },
        selected: {
          borderColor: primaryColor,
        },
        unselected: {
          borderColor: borderColor,
        },
        disabled: {
          opacity: 0.5,
        },
        label: {
          color: textColor,
          ...TEXT_VARIANT.paragraph,
        },
      },
      toggleSwitch: {
        container: {
          ...layout.row,
          alignItems: 'center',
          marginBottom: spacing.m,
        },
        track: {
          width: 50,
          height: 28,
          borderRadius: 14,
          justifyContent: 'center',
        },
        thumb: {
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: colors.white,
          ...shadow.light,
        },
        on: {
          backgroundColor: primaryColor,
        },
        off: {
          backgroundColor: isDark ? colors.gray[700] : colors.gray[300],
        },
        disabled: {
          opacity: 0.5,
        },
      },
      progressBar: {
        container: {
          height: 8,
          backgroundColor: isDark ? colors.gray[700] : colors.gray[200],
          borderRadius: 4,
          overflow: 'hidden',
          marginVertical: spacing.m,
        },
        track: {
          flex: 1,
          backgroundColor: isDark ? colors.gray[600] : colors.gray[300],
        },
        fill: {
          height: '100%',
          backgroundColor: primaryColor,
        },
        text: {
          color: textColor,
          marginTop: spacing.xs,
          ...TEXT_VARIANT.caption,
        },
      },
      avatar: {
        container: {
          overflow: 'hidden',
          backgroundColor: isDark ? colors.gray[700] : colors.gray[200],
          ...layout.centered,
        },
        image: {
          width: '100%',
          height: '100%',
        },
        text: {
          color: isDark ? colors.gray[300] : colors.gray[700],
        },
        initials: {
          ...TEXT_VARIANT.button,
          color: isDark ? colors.gray[300] : colors.gray[700],
        },
      },
    },
  };
};

// Create light and dark themes
export const lightTheme = createTheme('light');
export const darkTheme = createTheme('dark');

// Get current system theme
const currentTheme = getSystemTheme();

// Create default theme based on system preference
export const defaultTheme = currentTheme === 'dark' ? darkTheme : lightTheme;

// Export all theme utilities and types
export type { ThemeType };