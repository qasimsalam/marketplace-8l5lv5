import React from 'react';
import { SafeAreaView as RNSafeAreaView, View, StyleSheet, StyleProp, ViewStyle } from 'react-native'; // v0.72.x
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // ^4.6.3

import { colors } from '../../styles/colors';
import { containerStyles } from '../../styles/layout';
import { IS_IPHONE_X, STATUS_BAR_HEIGHT, BOTTOM_SPACE_HEIGHT } from '../../utils/dimensions';

/**
 * Enum for configuring which safe area edges to respect
 */
export enum EdgeMode {
  ALL = 'all',
  TOP = 'top',
  BOTTOM = 'bottom',
  NONE = 'none',
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
}

/**
 * A custom SafeAreaView component that handles device-specific safe areas,
 * especially for notched iOS devices. It provides configurable edge insets
 * and background color options.
 * 
 * @param props - Component props
 * @returns React component
 */
export const SafeAreaView: React.FC<SafeAreaViewProps> = ({
  children,
  style,
  edges = EdgeMode.ALL,
  backgroundColor = colors.background.primary,
  forceInset = false,
}) => {
  // Get safe area insets from react-native-safe-area-context
  const insets = useSafeAreaInsets();

  // Determine which insets to apply based on edges prop
  const topInset = (edges === EdgeMode.ALL || edges === EdgeMode.TOP) ? insets.top : 0;
  const bottomInset = (edges === EdgeMode.ALL || edges === EdgeMode.BOTTOM) ? insets.bottom : 0;

  // If not a notched device and not forcing insets, use regular ReactNative SafeAreaView
  if (!IS_IPHONE_X && !forceInset) {
    return (
      <RNSafeAreaView style={[styles.container, { backgroundColor }, style]}>
        {children}
      </RNSafeAreaView>
    );
  }

  // For notched devices or when forcing insets, use a View with calculated padding
  return (
    <View
      style={[
        styles.container,
        { backgroundColor },
        getSafeAreaPadding(topInset, bottomInset),
        style,
      ]}
    >
      {children}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    ...containerStyles.safeAreaContainer,
  },
});

/**
 * Creates padding style based on safe area insets
 */
const getSafeAreaPadding = (topInset: number, bottomInset: number): ViewStyle => ({
  paddingTop: topInset || STATUS_BAR_HEIGHT,
  paddingBottom: bottomInset || BOTTOM_SPACE_HEIGHT,
});