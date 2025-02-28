import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, StatusBar } from 'react-native'; // v0.72.x
import { background } from '../../styles/colors';
import { containerStyles } from '../../styles/layout';
import { STATUS_BAR_HEIGHT, getStatusBarHeight, NAVIGATION_BAR_HEIGHT } from '../../utils/dimensions';

/**
 * Enum defining which edges should have safe area insets applied
 */
export enum EdgeMode {
  ALL = 'all',     // Apply safe area to all edges
  TOP = 'top',     // Apply safe area to top edge only
  BOTTOM = 'bottom', // Apply safe area to bottom edge only
  NONE = 'none',   // Don't apply safe area insets
}

/**
 * Props interface for the SafeAreaView component
 */
interface SafeAreaViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: EdgeMode;
  backgroundColor?: string;
  forceInset?: boolean;
  translucent?: boolean;
}

/**
 * A custom SafeAreaView component that handles device-specific safe areas for Android
 * 
 * This component ensures content is properly displayed within the visible area of the screen,
 * accounting for notches, status bars, and navigation bars on different Android devices.
 * Unlike iOS's built-in SafeAreaView, this focuses on Android-specific edge cases.
 * 
 * @param props Component props including:
 *   - children: Content to render inside the safe area
 *   - style: Additional styles to apply to the container
 *   - edges: Which edges to apply safe area insets to (ALL, TOP, BOTTOM, NONE)
 *   - backgroundColor: Background color of the safe area
 *   - forceInset: Whether to force insets even on devices without notches
 *   - translucent: Whether the StatusBar should be translucent (for immersive experiences)
 * @returns React component
 */
export const SafeAreaView: React.FC<SafeAreaViewProps> = ({
  children,
  style,
  edges = EdgeMode.ALL,
  backgroundColor = background.primary,
  forceInset = false,
  translucent = false,
}) => {
  // Configure StatusBar
  StatusBar.setBackgroundColor(backgroundColor);
  StatusBar.setTranslucent(translucent);

  // Calculate padding based on edge mode and device characteristics
  const safeAreaPadding: ViewStyle = {};
  
  // Calculate top padding
  if (edges === EdgeMode.ALL || edges === EdgeMode.TOP) {
    // When using a translucent status bar, content would render underneath it
    // without padding, so we always need top padding in this case
    if (translucent || forceInset) {
      safeAreaPadding.paddingTop = STATUS_BAR_HEIGHT || getStatusBarHeight();
    }
  }
  
  // Calculate bottom padding
  if (edges === EdgeMode.ALL || edges === EdgeMode.BOTTOM) {
    // Only add bottom padding if forceInset is true or there's a navigation bar
    if (forceInset || NAVIGATION_BAR_HEIGHT > 0) {
      safeAreaPadding.paddingBottom = NAVIGATION_BAR_HEIGHT;
    }
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor },
        safeAreaPadding,
        containerStyles.safeAreaContainer,
        style,
      ]}
    >
      {children}
    </View>
  );
};

/**
 * Component styles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});