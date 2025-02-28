/**
 * A versatile and customizable loading indicator component for the AI Talent Marketplace iOS application.
 * This spinner component supports different sizes, colors, and behaviors to provide visual feedback
 * during asynchronous operations throughout the app.
 */
import React from 'react'; // v18.x
import {
  ActivityIndicator,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native'; // v0.72.x
import { colors } from '../../styles/colors';
import { moderateScale } from '../../utils/responsive';

/**
 * Enum defining available spinner size options
 */
export enum SpinnerSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
}

/**
 * Enum defining available spinner color options
 */
export enum SpinnerColor {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  WHITE = 'white',
}

/**
 * Interface defining props for the Spinner component
 */
export interface SpinnerProps {
  /**
   * Size of the spinner
   * @default SpinnerSize.MEDIUM
   */
  size?: SpinnerSize;
  
  /**
   * Color of the spinner
   * @default SpinnerColor.PRIMARY
   */
  color?: SpinnerColor;
  
  /**
   * Additional styles for the spinner container
   */
  style?: StyleProp<ViewStyle>;
  
  /**
   * Test ID for automated testing
   */
  testID?: string;
  
  /**
   * Accessibility label for screen readers
   * @default "Loading"
   */
  accessibilityLabel?: string;
}

/**
 * Generates spinner styles based on size and color props
 * @param size - The size of the spinner
 * @param color - The color of the spinner
 * @returns Object containing container and indicator styles
 */
const getSpinnerStyles = (size: SpinnerSize, color: SpinnerColor) => {
  // Determine spinner color
  let spinnerColor;
  switch (color) {
    case SpinnerColor.PRIMARY:
      spinnerColor = colors.primary[600];
      break;
    case SpinnerColor.SECONDARY:
      spinnerColor = colors.secondary[600];
      break;
    case SpinnerColor.WHITE:
      spinnerColor = colors.white;
      break;
    default:
      spinnerColor = colors.primary[600];
  }
  
  // Calculate container size based on spinner size
  let containerSize;
  let nativeSize: 'small' | 'large';
  
  switch (size) {
    case SpinnerSize.SMALL:
      containerSize = moderateScale(24);
      nativeSize = 'small';
      break;
    case SpinnerSize.LARGE:
      containerSize = moderateScale(56);
      nativeSize = 'large';
      break;
    case SpinnerSize.MEDIUM:
    default:
      containerSize = moderateScale(40);
      nativeSize = 'large';
  }
  
  return {
    container: {
      width: containerSize,
      height: containerSize,
    },
    indicator: {
      color: spinnerColor,
      size: nativeSize,
    },
  };
};

/**
 * A customizable loading indicator component for showing loading states in the application.
 * Supports multiple sizes and colors to match the app's design system.
 * Implements accessibility features for screen readers.
 * 
 * @param props - Component props including size, color, and style
 * @returns Rendered spinner component
 */
export const Spinner = ({
  size = SpinnerSize.MEDIUM,
  color = SpinnerColor.PRIMARY,
  style,
  testID,
  accessibilityLabel = 'Loading',
}: SpinnerProps): JSX.Element => {
  const styles = getSpinnerStyles(size, color);
  
  return (
    <View
      style={[baseStyles.container, styles.container, style]}
      testID={testID || 'spinner-component'}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
    >
      <ActivityIndicator
        size={styles.indicator.size}
        color={styles.indicator.color}
      />
    </View>
  );
};

/**
 * Base styles for the spinner component
 */
const baseStyles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});