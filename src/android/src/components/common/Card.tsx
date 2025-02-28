/**
 * A versatile, reusable card component for the Android application that provides
 * a styled container with customizable elevation, borders, and interaction capabilities.
 * Serves as a fundamental building block for displaying structured content throughout
 * the AI Talent Marketplace mobile application.
 *
 * @version 1.0.0
 */

import React, { useMemo } from 'react'; // v18.2.0
import { View, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native'; // v0.72.x
import { background, border as borderColors } from '../../styles/colors';
import { spacing, shadow, border } from '../../styles/layout';
import { useTheme } from '../../styles/theme';

/**
 * Available card style variants
 */
export enum CardVariant {
  DEFAULT = 'default',
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  DANGER = 'danger',
}

/**
 * Shadow elevation levels for the card
 */
export enum CardElevation {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/**
 * Props for the Card component
 */
export interface CardProps {
  /** Card content */
  children: React.ReactNode;
  /** Additional styles to apply to the card */
  style?: StyleProp<ViewStyle>;
  /** Card style variant */
  variant?: CardVariant;
  /** Shadow elevation level */
  elevation?: CardElevation;
  /** Whether to show a border */
  bordered?: boolean;
  /** Whether to use rounded corners */
  rounded?: boolean;
  /** Function to call when the card is pressed */
  onPress?: () => void;
  /** Whether the card is disabled */
  disabled?: boolean;
  /** Optional header content to display at the top of the card */
  header?: React.ReactNode;
  /** Optional footer content to display at the bottom of the card */
  footer?: React.ReactNode;
  /** Test ID for testing */
  testID?: string;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
}

/**
 * Calculates card styles based on variant, elevation, and other props
 * 
 * @param variant - The card style variant
 * @param elevation - The shadow elevation level
 * @param bordered - Whether to show a border
 * @param rounded - Whether to use rounded corners
 * @param theme - The current theme
 * @returns Calculated card styles object
 */
const getCardStyles = (
  variant: CardVariant,
  elevation: CardElevation,
  bordered: boolean,
  rounded: boolean,
  theme: any
): ViewStyle => {
  // Base card styles
  const baseStyles: ViewStyle = {
    backgroundColor: theme.colors.background.primary,
    padding: spacing.m,
  };

  // Variant-specific styles
  let variantStyles: ViewStyle = {};
  switch (variant) {
    case CardVariant.PRIMARY:
      variantStyles = {
        backgroundColor: theme.colors.primary[theme.colors.mode === 'dark' ? 900 : 50],
        borderColor: theme.colors.primary[theme.colors.mode === 'dark' ? 700 : 200],
      };
      break;
    case CardVariant.SECONDARY:
      variantStyles = {
        backgroundColor: theme.colors.secondary[theme.colors.mode === 'dark' ? 900 : 50],
        borderColor: theme.colors.secondary[theme.colors.mode === 'dark' ? 700 : 200],
      };
      break;
    case CardVariant.INFO:
      variantStyles = {
        backgroundColor: theme.colors.info[theme.colors.mode === 'dark' ? 900 : 50],
        borderColor: theme.colors.info[theme.colors.mode === 'dark' ? 700 : 200],
      };
      break;
    case CardVariant.SUCCESS:
      variantStyles = {
        backgroundColor: theme.colors.success[theme.colors.mode === 'dark' ? 900 : 50],
        borderColor: theme.colors.success[theme.colors.mode === 'dark' ? 700 : 200],
      };
      break;
    case CardVariant.WARNING:
      variantStyles = {
        backgroundColor: theme.colors.warning[theme.colors.mode === 'dark' ? 900 : 50],
        borderColor: theme.colors.warning[theme.colors.mode === 'dark' ? 700 : 200],
      };
      break;
    case CardVariant.DANGER:
      variantStyles = {
        backgroundColor: theme.colors.error[theme.colors.mode === 'dark' ? 900 : 50],
        borderColor: theme.colors.error[theme.colors.mode === 'dark' ? 700 : 200],
      };
      break;
    default:
      variantStyles = {
        backgroundColor: theme.colors.background.primary,
        borderColor: theme.colors.border.default,
      };
  }

  // Elevation-specific shadow styles
  let shadowStyles: ViewStyle = {};
  switch (elevation) {
    case CardElevation.HIGH:
      shadowStyles = shadow.large;
      break;
    case CardElevation.MEDIUM:
      shadowStyles = shadow.medium;
      break;
    case CardElevation.LOW:
      shadowStyles = shadow.small;
      break;
    default:
      // No shadow for NONE
      shadowStyles = {};
  }

  // Border styles
  const borderStyles: ViewStyle = bordered
    ? {
        borderWidth: 1,
        borderColor: variantStyles.borderColor || theme.colors.border.default,
      }
    : {};

  // Rounded corner styles
  const roundedStyles: ViewStyle = rounded ? border.rounded : {};

  return {
    ...baseStyles,
    ...variantStyles,
    ...shadowStyles,
    ...borderStyles,
    ...roundedStyles,
  };
};

/**
 * A customizable card component that displays content in an elevated container 
 * with various styling options
 */
const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = CardVariant.DEFAULT,
  elevation = CardElevation.LOW,
  bordered = false,
  rounded = true,
  onPress,
  disabled = false,
  header,
  footer,
  testID,
  accessibilityLabel,
}) => {
  const theme = useTheme();

  // Memoize styles for better performance
  const cardStyles = useMemo(
    () => getCardStyles(variant, elevation, bordered, rounded, theme),
    [variant, elevation, bordered, rounded, theme]
  );

  // Determine if card should be touchable
  const isTouchable = !!onPress && !disabled;

  // Content wrapper for consistent structure
  const contentWrapper = (
    <>
      {header && <View style={styles.headerContainer}>{header}</View>}
      <View style={styles.childrenContainer}>{children}</View>
      {footer && <View style={styles.footerContainer}>{footer}</View>}
    </>
  );

  // Render touchable card if onPress is provided, otherwise render regular view
  if (isTouchable) {
    return (
      <TouchableOpacity
        style={[styles.container, cardStyles, disabled && styles.disabled, style]}
        onPress={onPress}
        disabled={disabled}
        testID={testID}
        accessibilityLabel={accessibilityLabel || `Card, ${variant} variant`}
        activeOpacity={0.7}
      >
        {contentWrapper}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[styles.container, cardStyles, disabled && styles.disabled, style]}
      testID={testID}
      accessibilityLabel={accessibilityLabel || `Card, ${variant} variant`}
    >
      {contentWrapper}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  headerContainer: {
    marginBottom: spacing.s,
  },
  childrenContainer: {
    flex: 0, // Changed from 1 to avoid stretching content unnecessarily
  },
  footerContainer: {
    marginTop: spacing.s,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default Card;