/**
 * A flexible, accessible and reusable button component for the AI Talent Marketplace iOS application.
 * This component supports multiple variants, sizes, loading states and other interactive features,
 * matching the design system specifications and maintaining consistency with the web application's button component.
 */
import React from 'react'; // v18.x
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native'; // v0.72.x

import { primary, text } from '../../styles/colors';
import { button, buttonSmall } from '../../styles/typography';
import { Spinner, SpinnerSize } from './Spinner';
import { moderateScale } from '../../utils/responsive';

/**
 * Enum defining available button variant options
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
 * Enum defining available button size options
 */
export enum ButtonSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
}

/**
 * Interface defining props for the Button component
 */
export interface ButtonProps {
  /**
   * Optional child elements to render inside the button instead of text
   */
  children?: React.ReactNode;
  
  /**
   * Text to display on the button
   */
  text?: string;
  
  /**
   * The visual style variant of the button
   * @default ButtonVariant.PRIMARY
   */
  variant?: ButtonVariant;
  
  /**
   * The size variant of the button
   * @default ButtonSize.MEDIUM
   */
  size?: ButtonSize;
  
  /**
   * Whether the button is in a disabled state
   * @default false
   */
  disabled?: boolean;
  
  /**
   * Whether the button is in a loading state
   * @default false
   */
  isLoading?: boolean;
  
  /**
   * Whether the button should take up the full width of its container
   * @default false
   */
  isFullWidth?: boolean;
  
  /**
   * Function to call when the button is pressed
   */
  onPress?: () => void;
  
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
 * Generates button styles based on variant, size, and other properties
 * @param variant - The button variant
 * @param size - The button size
 * @param isFullWidth - Whether the button should take full width
 * @param disabled - Whether the button is disabled
 * @returns Combined styles for the button container
 */
const getButtonStyles = (
  variant: ButtonVariant,
  size: ButtonSize,
  isFullWidth: boolean,
  disabled: boolean,
): object => {
  // Start with base styles
  const baseStyles = [styles.base];
  
  // Add variant-specific styles
  switch (variant) {
    case ButtonVariant.PRIMARY:
      baseStyles.push(styles.primary);
      break;
    case ButtonVariant.SECONDARY:
      baseStyles.push(styles.secondary);
      break;
    case ButtonVariant.OUTLINE:
      baseStyles.push(styles.outline);
      break;
    case ButtonVariant.DANGER:
      baseStyles.push(styles.danger);
      break;
    case ButtonVariant.SUCCESS:
      baseStyles.push(styles.success);
      break;
    case ButtonVariant.LINK:
      baseStyles.push(styles.link);
      break;
    default:
      baseStyles.push(styles.primary);
  }
  
  // Add size-specific styles
  switch (size) {
    case ButtonSize.SMALL:
      baseStyles.push(styles.small);
      break;
    case ButtonSize.LARGE:
      baseStyles.push(styles.large);
      break;
    case ButtonSize.MEDIUM:
    default:
      baseStyles.push(styles.medium);
  }
  
  // Add full width style if needed
  if (isFullWidth) {
    baseStyles.push(styles.fullWidth);
  }
  
  // Add disabled style if needed
  if (disabled) {
    baseStyles.push(styles.disabled);
  }
  
  return baseStyles;
};

/**
 * Generates text styles based on button variant and size
 * @param variant - The button variant
 * @param size - The button size
 * @param disabled - Whether the button is disabled
 * @returns Text style for button label
 */
const getTextStyles = (
  variant: ButtonVariant,
  size: ButtonSize,
  disabled: boolean,
): TextStyle => {
  // Determine base text style based on size
  const baseTextStyle = size === ButtonSize.SMALL ? buttonSmall : button;
  
  // Start with size-appropriate base text style
  const textStyles: TextStyle = {
    ...baseTextStyle,
  };
  
  // Apply variant-specific text color
  switch (variant) {
    case ButtonVariant.PRIMARY:
      textStyles.color = text.inverse;
      break;
    case ButtonVariant.SECONDARY:
      textStyles.color = text.primary;
      break;
    case ButtonVariant.OUTLINE:
      textStyles.color = primary[600];
      break;
    case ButtonVariant.DANGER:
      textStyles.color = text.inverse;
      break;
    case ButtonVariant.SUCCESS:
      textStyles.color = text.inverse;
      break;
    case ButtonVariant.LINK:
      textStyles.color = primary[600];
      break;
    default:
      textStyles.color = text.inverse;
  }
  
  // Apply disabled text color if needed
  if (disabled) {
    textStyles.color = text.disabled;
  }
  
  return textStyles;
};

/**
 * A reusable button component that renders a touchable element with customizable appearance and behavior.
 * Supports multiple variants, sizes, loading states, and accessibility features.
 * 
 * @param props - Component props including variant, size, text/children, and event handlers
 * @returns Rendered button component
 */
export const Button = ({
  children,
  text,
  variant = ButtonVariant.PRIMARY,
  size = ButtonSize.MEDIUM,
  disabled = false,
  isLoading = false,
  isFullWidth = false,
  onPress,
  style,
  textStyle,
  testID,
  accessibilityLabel,
}: ButtonProps): JSX.Element => {
  // Generate button and text styles based on props
  const buttonStyles = getButtonStyles(variant, size, isFullWidth, disabled);
  const buttonTextStyles = getTextStyles(variant, size, disabled);
  
  // Create a handler that prevents interaction when the button is disabled or loading
  const handlePress = () => {
    if (!disabled && !isLoading && onPress) {
      onPress();
    }
  };
  
  // Set up accessibility props
  const accessibilityState = {
    disabled: disabled || isLoading,
    busy: isLoading,
  };
  
  // Create a default accessibility label if none is provided
  const buttonAccessibilityLabel = accessibilityLabel || text;
  
  // Determine appropriate spinner size based on button size
  const spinnerSize = size === ButtonSize.SMALL 
    ? SpinnerSize.SMALL 
    : SpinnerSize.MEDIUM;
  
  return (
    <TouchableOpacity
      style={[buttonStyles, style]}
      onPress={handlePress}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      accessibilityLabel={buttonAccessibilityLabel}
      testID={testID || 'button-component'}
    >
      {isLoading ? (
        <Spinner
          size={spinnerSize}
          color={
            variant === ButtonVariant.PRIMARY ||
            variant === ButtonVariant.DANGER ||
            variant === ButtonVariant.SUCCESS
              ? SpinnerSize.WHITE
              : SpinnerSize.PRIMARY
          }
          accessibilityLabel="Loading"
        />
      ) : children ? (
        children
      ) : (
        <Text style={[buttonTextStyles, textStyle]}>{text}</Text>
      )}
    </TouchableOpacity>
  );
};

/**
 * Styles for the Button component
 */
const styles = StyleSheet.create({
  // Base button styles
  base: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: moderateScale(8),
  },
  
  // Variant styles
  primary: {
    backgroundColor: primary[600],
    borderWidth: 0,
  },
  secondary: {
    backgroundColor: primary[100],
    borderWidth: 0,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: primary[600],
  },
  danger: {
    backgroundColor: '#dc2626', // error[600] - hardcoded since we only import primary from colors
    borderWidth: 0,
  },
  success: {
    backgroundColor: '#16a34a', // success[600] - hardcoded since we only import primary from colors
    borderWidth: 0,
  },
  link: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderWidth: 0,
  },
  
  // Size styles
  small: {
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(6),
    minHeight: moderateScale(32),
  },
  medium: {
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(10),
    minHeight: moderateScale(40),
  },
  large: {
    paddingHorizontal: moderateScale(20),
    paddingVertical: moderateScale(12),
    minHeight: moderateScale(48),
  },
  
  // Layout styles
  fullWidth: {
    width: '100%',
  },
  
  // State styles
  disabled: {
    opacity: 0.5,
  },
});