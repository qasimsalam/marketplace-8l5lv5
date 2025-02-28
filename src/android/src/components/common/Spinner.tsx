import React from 'react'; // v18.2.0
import { ActivityIndicator, StyleSheet, View, ViewStyle, StyleProp } from 'react-native'; // v0.72.x
import { colors } from '../../styles/colors';
import { moderateScale } from '../../utils/responsive';

/**
 * Enum for spinner size options
 */
export enum SpinnerSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
}

/**
 * Enum for spinner color options
 */
export enum SpinnerColor {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  WHITE = 'white',
}

/**
 * Props interface for the Spinner component
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
 * 
 * @param size - Size enum value for the spinner
 * @param color - Color enum value for the spinner
 * @returns Object containing container and indicator styles
 */
const getSpinnerStyles = (size: SpinnerSize, color: SpinnerColor) => {
  // Determine size dimensions and native size value
  let containerSize: number;
  let nativeSize: 'small' | 'large' | number;
  
  switch (size) {
    case SpinnerSize.SMALL:
      containerSize = moderateScale(24);
      nativeSize = 'small'; // Use React Native's built-in small size
      break;
    case SpinnerSize.LARGE:
      containerSize = moderateScale(48);
      nativeSize = 'large'; // Use React Native's built-in large size
      break;
    case SpinnerSize.MEDIUM:
    default:
      containerSize = moderateScale(32);
      nativeSize = moderateScale(24); // Custom numeric size for medium
      break;
  }
  
  // Determine color based on the color enum
  let spinnerColor: string;
  
  switch (color) {
    case SpinnerColor.PRIMARY:
      spinnerColor = colors.primary[600]; // Using primary color
      break;
    case SpinnerColor.SECONDARY:
      spinnerColor = colors.secondary[600]; // Using secondary color
      break;
    case SpinnerColor.WHITE:
      spinnerColor = colors.white; // Using white color
      break;
    default:
      spinnerColor = colors.primary[600];
      break;
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
 * A customizable loading indicator component for showing loading states
 * throughout the application.
 * 
 * @param props - The component props
 * @returns A spinner component with customized appearance
 */
export const Spinner: React.FC<SpinnerProps> = ({
  size = SpinnerSize.MEDIUM,
  color = SpinnerColor.PRIMARY,
  style,
  testID,
  accessibilityLabel = 'Loading',
}) => {
  const spinnerStyles = getSpinnerStyles(size, color);
  
  return (
    <View 
      style={[styles.container, spinnerStyles.container, style]}
      testID={testID || 'spinner-loading-indicator'}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      importantForAccessibility="yes"
    >
      <ActivityIndicator 
        color={spinnerStyles.indicator.color}
        size={spinnerStyles.indicator.size}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Spinner;