/**
 * Card Component
 * 
 * A reusable and customizable card component for the AI Talent Marketplace iOS application.
 * This component provides a container with consistent styling, elevation levels, and touch
 * interaction capabilities. It serves as the foundation for various card-based UI elements
 * throughout the application such as job listings, user profiles, and dashboard statistics.
 * 
 * @version react-native 0.72.x
 */

import React, { useMemo, useCallback } from 'react'; // v18.x
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform
} from 'react-native'; // v0.72.x
import { Gesture, GestureDetector } from 'react-native-gesture-handler'; // v2.12.0

import { colors } from '../../styles/colors';
import { shadow, border, layout, getSpacing } from '../../styles/layout';
import { useTheme } from '../../styles/theme';

/**
 * Card variant types for different visual styles
 */
export enum CardVariant {
  DEFAULT = 'DEFAULT',
  OUTLINED = 'OUTLINED',
  FLAT = 'FLAT',
  INTERACTIVE = 'INTERACTIVE'
}

/**
 * Card elevation levels for shadow intensity
 */
export enum CardElevation {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

/**
 * Card component props interface
 */
export interface CardProps {
  /** Content to render inside the card */
  children: React.ReactNode;
  /** Visual style variant of the card */
  variant?: CardVariant;
  /** Shadow elevation level */
  elevation?: CardElevation;
  /** Function called when the card is pressed */
  onPress?: () => void;
  /** Additional styles for the card container */
  style?: StyleProp<ViewStyle>;
  /** Additional styles for the card content area */
  contentStyle?: StyleProp<ViewStyle>;
  /** Test ID for automated testing */
  testID?: string;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
  /** Whether the card is disabled (affects touch interactions) */
  disabled?: boolean;
}

/**
 * Generates shadow styles based on the card elevation level
 * @param elevation The elevation level to apply
 * @returns Shadow style object with platform-specific implementation
 */
const getCardElevationStyle = (elevation: CardElevation): ViewStyle => {
  switch (elevation) {
    case CardElevation.NONE:
      return {};
    case CardElevation.LOW:
      return Platform.OS === 'ios' ? shadow.light : { elevation: 2 };
    case CardElevation.MEDIUM:
      return Platform.OS === 'ios' ? shadow.medium : { elevation: 4 };
    case CardElevation.HIGH:
      return Platform.OS === 'ios' ? shadow.heavy : { elevation: 8 };
    default:
      return Platform.OS === 'ios' ? shadow.light : { elevation: 2 };
  }
};

/**
 * Generates styles based on the card variant type
 * @param variant The card variant
 * @returns Style object for the specified card variant
 */
const getCardVariantStyle = (variant: CardVariant): ViewStyle => {
  switch (variant) {
    case CardVariant.DEFAULT:
      return {
        backgroundColor: colors.background.elevated,
        padding: getSpacing(2),
        ...border.roundedLarge
      };
    case CardVariant.OUTLINED:
      return {
        backgroundColor: colors.background.primary,
        padding: getSpacing(2),
        borderWidth: 1,
        borderColor: colors.border.default,
        ...border.roundedLarge
      };
    case CardVariant.FLAT:
      return {
        backgroundColor: colors.background.primary,
        padding: getSpacing(2),
        ...border.roundedLarge
      };
    case CardVariant.INTERACTIVE:
      return {
        backgroundColor: colors.background.elevated,
        padding: getSpacing(2),
        ...border.roundedLarge
      };
    default:
      return {
        backgroundColor: colors.background.elevated,
        padding: getSpacing(2),
        ...border.roundedLarge
      };
  }
};

/**
 * Card component that renders a customizable container with various style options
 */
export const Card: React.FC<CardProps> = ({
  children,
  variant = CardVariant.DEFAULT,
  elevation = CardElevation.LOW,
  onPress,
  style,
  contentStyle,
  testID,
  accessibilityLabel,
  disabled = false
}) => {
  // Access current theme
  const theme = useTheme();
  
  // Calculate combined styles
  const cardStyle = useMemo(() => {
    const variantStyle = getCardVariantStyle(variant);
    const elevationStyle = getCardElevationStyle(elevation);
    
    return [
      styles.container,
      variantStyle,
      elevation !== CardElevation.NONE && elevationStyle,
      style
    ];
  }, [variant, elevation, style]);
  
  // Handle press event
  const handlePress = useCallback(() => {
    if (onPress && !disabled) {
      onPress();
    }
  }, [onPress, disabled]);
  
  // Determine if the card should be touchable
  const isInteractive = !!onPress && !disabled;
  
  // Set appropriate accessibility props
  const accessibilityProps = {
    accessible: true,
    accessibilityRole: isInteractive ? 'button' : 'none',
    accessibilityLabel: accessibilityLabel,
    accessibilityState: {
      disabled
    }
  };
  
  // For interactive card variant with enhanced gestures
  if (isInteractive && variant === CardVariant.INTERACTIVE) {
    // Create a tap gesture
    const tapGesture = Gesture.Tap()
      .enabled(!disabled)
      .onEnd(() => {
        handlePress();
      });
    
    return (
      <GestureDetector gesture={tapGesture}>
        <View
          style={cardStyle}
          testID={testID}
          {...accessibilityProps}
        >
          {contentStyle ? (
            <View style={contentStyle}>{children}</View>
          ) : (
            children
          )}
        </View>
      </GestureDetector>
    );
  }
  
  // Standard interactive card
  if (isInteractive) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={disabled}
        testID={testID}
        {...accessibilityProps}
      >
        {contentStyle ? (
          <View style={contentStyle}>{children}</View>
        ) : (
          children
        )}
      </TouchableOpacity>
    );
  }
  
  // Non-interactive card
  return (
    <View
      style={cardStyle}
      testID={testID}
      {...accessibilityProps}
    >
      {contentStyle ? (
        <View style={contentStyle}>{children}</View>
      ) : (
        children
      )}
    </View>
  );
};

/**
 * Styles for the Card component
 */
const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    margin: getSpacing(1),
  }
});