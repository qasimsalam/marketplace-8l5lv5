/**
 * AI Talent Marketplace - Button Component
 * 
 * A customizable button component for the Android application that supports 
 * various styles, states, and sizes. This component follows the application's 
 * design system with full theme support, accessibility features, and responsive 
 * behavior across different device sizes.
 * 
 * @version 1.0.0
 */

import React, { useMemo } from 'react'; // v18.2.0
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform
} from 'react-native'; // v0.72.x

// Internal imports
import { colors } from '../../styles/colors';
import { textVariants } from '../../styles/typography';
import { layout, spacing, shadow, border } from '../../styles/layout';
import { useTheme } from '../../styles/theme';
import { moderateScale } from '../../utils/responsive';
import { Spinner, SpinnerSize } from '../common/Spinner';

/**
 * Button variant options
 */
export enum ButtonVariant {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  OUTLINE = 'OUTLINE',
  DANGER = 'DANGER',
  SUCCESS = 'SUCCESS',
  LINK = 'LINK',
}

/**
 * Button size options
 */
export enum ButtonSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
}

/**
 * Button props interface
 */
export interface ButtonProps {
  /**
   * Button text content
   */
  title: string;

  /**
   * Function to call when button is pressed
   */
  onPress: () => void;

  /**
   * Button styling variant
   * @default ButtonVariant.PRIMARY
   */
  variant?: ButtonVariant;

  /**
   * Button size
   * @default ButtonSize.MEDIUM
   */
  size?: ButtonSize;

  /**
   * Whether the button is disabled
   * @default false
   */
  isDisabled?: boolean;

  /**
   * Whether the button is in loading state
   * @default false
   */
  isLoading?: boolean;

  /**
   * Whether the button should take full width
   * @default false
   */
  isFullWidth?: boolean;

  /**
   * Optional icon to display on the left side of the button
   */
  leftIcon?: React.ReactNode;

  /**
   * Optional icon to display on the right side of the button
   */
  rightIcon?: React.ReactNode;

  /**
   * Additional styles for the button container
   */
  style?: StyleProp<ViewStyle>;

  /**
   * Additional styles for the button text
   */
  textStyle?: StyleProp<TextStyle>;

  /**
   * Test ID for automated testing
   */
  testID?: string;

  /**
   * Accessibility label for screen readers
   */
  accessibilityLabel?: string;
}

/**
 * Calculates button styles based on variant, size, and state
 * 
 * @param variant - Button variant
 * @param size - Button size 
 * @param isDisabled - Whether button is disabled
 * @param theme - Current theme
 * @returns Calculated button styles object
 */
const getButtonStyles = (
  variant: ButtonVariant,
  size: ButtonSize,
  isDisabled: boolean,
  theme: any
): object => {
  // Base styles for all buttons
  const baseStyles: ViewStyle = {
    ...layout.center,
    ...layout.row,
    ...border.rounded,
  };

  // Variant-specific styles
  let variantStyles: ViewStyle = {};

  switch (variant) {
    case ButtonVariant.PRIMARY:
      variantStyles = {
        backgroundColor: colors.primary[600],
        borderColor: colors.primary[700],
        borderWidth: 1,
      };
      break;
    case ButtonVariant.SECONDARY:
      variantStyles = {
        backgroundColor: colors.secondary[600],
        borderColor: colors.secondary[700],
        borderWidth: 1,
      };
      break;
    case ButtonVariant.OUTLINE:
      variantStyles = {
        backgroundColor: 'transparent',
        borderColor: colors.primary[600],
        borderWidth: 1,
      };
      break;
    case ButtonVariant.DANGER:
      variantStyles = {
        backgroundColor: colors.error[600],
        borderColor: colors.error[700],
        borderWidth: 1,
      };
      break;
    case ButtonVariant.SUCCESS:
      variantStyles = {
        backgroundColor: colors.success[600],
        borderColor: colors.success[700],
        borderWidth: 1,
      };
      break;
    case ButtonVariant.LINK:
      variantStyles = {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderWidth: 0,
        padding: 0,
        margin: 0,
      };
      break;
    default:
      variantStyles = {
        backgroundColor: colors.primary[600],
        borderColor: colors.primary[700],
        borderWidth: 1,
      };
  }

  // Size-specific styles
  let sizeStyles: ViewStyle = {};

  switch (size) {
    case ButtonSize.SMALL:
      sizeStyles = {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.s,
        minHeight: moderateScale(32),
      };
      break;
    case ButtonSize.LARGE:
      sizeStyles = {
        paddingVertical: spacing.m,
        paddingHorizontal: spacing.l,
        minHeight: moderateScale(48),
      };
      break;
    case ButtonSize.MEDIUM:
    default:
      sizeStyles = {
        paddingVertical: spacing.s,
        paddingHorizontal: spacing.m,
        minHeight: moderateScale(40),
      };
  }

  // Add shadow for elevated variants (not for OUTLINE or LINK)
  const shadowStyles = 
    variant !== ButtonVariant.OUTLINE && 
    variant !== ButtonVariant.LINK
      ? shadow.small
      : {};

  // Disabled styles
  const disabledStyles: ViewStyle = isDisabled
    ? {
        opacity: 0.5,
        backgroundColor: colors.gray[300],
        borderColor: colors.gray[400],
      }
    : {};

  return {
    ...baseStyles,
    ...variantStyles,
    ...sizeStyles,
    ...shadowStyles,
    ...disabledStyles,
  };
};

/**
 * Calculates text styles based on variant, size, and state
 * 
 * @param variant - Button variant
 * @param size - Button size
 * @param isDisabled - Whether button is disabled
 * @param theme - Current theme
 * @returns Calculated text styles object
 */
const getTextStyles = (
  variant: ButtonVariant,
  size: ButtonSize,
  isDisabled: boolean,
  theme: any
): object => {
  // Base text styles
  const baseTextStyles: TextStyle = size === ButtonSize.SMALL
    ? textVariants.buttonSmall
    : textVariants.button;

  // Variant-specific text styles
  let variantTextStyles: TextStyle = {};

  switch (variant) {
    case ButtonVariant.OUTLINE:
      variantTextStyles = {
        color: colors.primary[600],
      };
      break;
    case ButtonVariant.LINK:
      variantTextStyles = {
        color: colors.primary[600],
      };
      break;
    case ButtonVariant.PRIMARY:
    case ButtonVariant.SECONDARY:
    case ButtonVariant.DANGER:
    case ButtonVariant.SUCCESS:
    default:
      variantTextStyles = {
        color: colors.white,
      };
  }

  // Disabled text styles
  const disabledTextStyles: TextStyle = isDisabled
    ? {
        color: colors.gray[500],
      }
    : {};

  return {
    ...baseTextStyles,
    ...variantTextStyles,
    ...disabledTextStyles,
  };
};

/**
 * A customizable button component with various styles, states, and sizes
 * 
 * @param props - The component props
 * @returns Rendered button component
 */
export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = ButtonVariant.PRIMARY,
  size = ButtonSize.MEDIUM,
  isDisabled = false,
  isLoading = false,
  isFullWidth = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  testID,
  accessibilityLabel,
}) => {
  // Get current theme
  const theme = useTheme();

  // Calculate button and text styles
  const buttonStyles = useMemo(
    () => getButtonStyles(variant, size, isDisabled, theme),
    [variant, size, isDisabled, theme]
  );

  const textStyles = useMemo(
    () => getTextStyles(variant, size, isDisabled, theme),
    [variant, size, isDisabled, theme]
  );

  // Create combined styles with memoization
  const combinedButtonStyles = useMemo(
    () => [
      buttonStyles, 
      isFullWidth && styles.fullWidth,
      style
    ],
    [buttonStyles, isFullWidth, style]
  );

  const combinedTextStyles = useMemo(
    () => [textStyles, textStyle],
    [textStyles, textStyle]
  );

  // Get spinner size based on button size
  const spinnerSize = useMemo(() => {
    switch (size) {
      case ButtonSize.SMALL:
        return SpinnerSize.SMALL;
      case ButtonSize.LARGE:
        return SpinnerSize.LARGE;
      case ButtonSize.MEDIUM:
      default:
        return SpinnerSize.MEDIUM;
    }
  }, [size]);

  // Determine content padding based on presence of icons
  const contentPadding = useMemo(() => {
    return {
      paddingLeft: leftIcon ? spacing.xs : 0,
      paddingRight: rightIcon ? spacing.xs : 0,
    };
  }, [leftIcon, rightIcon]);

  return (
    <Pressable
      onPress={!isDisabled && !isLoading ? onPress : undefined}
      disabled={isDisabled || isLoading}
      style={({ pressed }) => [
        combinedButtonStyles,
        pressed && !isDisabled && !isLoading && styles.pressed,
      ]}
      testID={testID}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityRole="button"
      accessibilityState={{
        disabled: isDisabled || isLoading,
        busy: isLoading,
      }}
      accessibilityHint={`Activates ${title}`}
    >
      <View style={[styles.contentContainer, contentPadding]}>
        {isLoading ? (
          <Spinner
            size={spinnerSize}
            accessibilityLabel={`Loading ${title}`}
          />
        ) : (
          <>
            {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}
            <Text 
              style={combinedTextStyles} 
              numberOfLines={1}
              adjustsFontSizeToFit={size === ButtonSize.SMALL}
            >
              {title}
            </Text>
            {rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
          </>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  pressed: {
    opacity: 0.8,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIconContainer: {
    marginRight: spacing.xs,
  },
  rightIconContainer: {
    marginLeft: spacing.xs,
  },
});

export default Button;