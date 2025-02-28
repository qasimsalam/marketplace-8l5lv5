import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  TouchableWithoutFeedback,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
  AccessibilityInfo,
} from 'react-native'; // v0.72.x
import { MaterialIcons } from '@expo/vector-icons'; // v13.0.0
import {
  success,
  error,
  warning,
  info,
  white,
  text,
} from '../../styles/colors';
import {
  WINDOW_WIDTH,
  STATUS_BAR_HEIGHT,
  getStatusBarHeight,
} from '../../utils/dimensions';
import { SafeAreaView, EdgeMode } from './SafeAreaView';
import { Spinner, SpinnerSize, SpinnerColor } from './Spinner';

// Define constants
const DEFAULT_DURATION = 4000; // 4 seconds
const TOAST_MAX_WIDTH = WINDOW_WIDTH * 0.9; // 90% of screen width

/**
 * Enum defining the available toast notification types
 */
export enum ToastType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

/**
 * Enum defining the available toast notification positions
 */
export enum ToastPosition {
  TOP = 'top',
  BOTTOM = 'bottom',
}

/**
 * Interface for toast notification props
 */
export interface ToastProps {
  /** Unique identifier for the toast */
  id: string;
  /** Message to display in the toast */
  message: string;
  /** Type of toast notification */
  type: ToastType;
  /** Duration in milliseconds before auto-dismissal (default: 4000ms) */
  duration?: number;
  /** Position on screen (default: TOP) */
  position?: ToastPosition;
  /** Callback function when toast is closed */
  onClose: (id: string) => void;
  /** Whether to show close button (default: true) */
  isClosable?: boolean;
}

/**
 * Interface for toast container props
 */
export interface ToastContainerProps {
  /** Array of toast notifications to display */
  toasts: ToastProps[];
  /** Position on screen (default: TOP) */
  position?: ToastPosition;
  /** Callback function when a toast is closed */
  onClose: (id: string) => void;
}

/**
 * Determines the appropriate icon based on toast type
 * 
 * @param type - Type of toast notification
 * @returns Object containing icon name and color
 */
const getToastIcon = (type: ToastType): { name: string; color: string } => {
  switch (type) {
    case ToastType.SUCCESS:
      return { name: 'check-circle', color: success[500] };
    case ToastType.ERROR:
      return { name: 'error', color: error[500] };
    case ToastType.WARNING:
      return { name: 'warning', color: warning[500] };
    case ToastType.INFO:
      return { name: 'info', color: info[500] };
    default:
      return { name: 'info', color: info[500] };
  }
};

/**
 * Determines the appropriate background color based on toast type
 * 
 * @param type - Type of toast notification
 * @returns Background color string
 */
const getToastBackgroundColor = (type: ToastType): string => {
  switch (type) {
    case ToastType.SUCCESS:
      return success[50];
    case ToastType.ERROR:
      return error[50];
    case ToastType.WARNING:
      return warning[50];
    case ToastType.INFO:
      return info[50];
    default:
      return info[50];
  }
};

/**
 * Generates position styles based on toast position
 * 
 * @param position - Position of toast on screen
 * @returns Style object for positioning
 */
const getPositionStyles = (position: ToastPosition): StyleProp<ViewStyle> => {
  switch (position) {
    case ToastPosition.TOP:
      return {
        top: STATUS_BAR_HEIGHT + 16,
      };
    case ToastPosition.BOTTOM:
      return {
        bottom: 16,
      };
    default:
      return {
        top: STATUS_BAR_HEIGHT + 16,
      };
  }
};

/**
 * A toast notification component that displays a temporary message
 * with optional auto-dismissal and manual close button
 */
export const Toast: React.FC<ToastProps> = ({
  id,
  message,
  type,
  duration = DEFAULT_DURATION,
  position = ToastPosition.TOP,
  onClose,
  isClosable = true,
}) => {
  // Track whether component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  // Animation value for fade and slide effects
  const animation = useRef(new Animated.Value(0)).current;
  
  // Handle cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Set up animation sequence and auto-dismissal
  useEffect(() => {
    // Announce to screen readers
    AccessibilityInfo.announceForAccessibility(`${type} alert: ${message}`);
    
    // Animation sequence
    Animated.sequence([
      // 1. Fade in and slide
      Animated.timing(animation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // 2. Wait for duration
      Animated.delay(duration - 600), // Subtract animation times
      // 3. Fade out and slide
      Animated.timing(animation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Only call onClose if component is still mounted
      if (isMounted.current) {
        onClose(id);
      }
    });
  }, [animation, duration, id, message, onClose, type]);

  // Handle manual close
  const handleClose = () => {
    // Animate out
    Animated.timing(animation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      // Only call onClose if component is still mounted
      if (isMounted.current) {
        onClose(id);
      }
    });
  };

  // Get icon and background color based on type
  const icon = getToastIcon(type);
  const backgroundColor = getToastBackgroundColor(type);
  
  // Create animated styles for entrance and exit animations
  const animatedStyles = {
    opacity: animation,
    transform: [
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [position === ToastPosition.TOP ? -20 : 20, 0],
        }),
      },
    ],
  };

  return (
    <TouchableWithoutFeedback
      onPress={isClosable ? handleClose : undefined}
      accessibilityRole="alert"
      accessible={true}
    >
      <Animated.View
        style={[
          styles.container,
          { backgroundColor },
          animatedStyles,
        ]}
        accessibilityLiveRegion="polite"
      >
        <MaterialIcons 
          name={icon.name} 
          size={24} 
          color={icon.color} 
          accessibilityRole="image"
          accessibilityLabel={`${type} icon`}
        />
        <Text 
          style={styles.message}
          accessibilityRole="text"
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {message}
        </Text>
        {isClosable && (
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
            accessibilityRole="button"
            accessibilityLabel="Close notification"
            accessibilityHint="Dismisses the current notification"
          >
            <MaterialIcons name="close" size={20} color={text.tertiary} />
          </TouchableOpacity>
        )}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

/**
 * Container component that manages multiple toast notifications
 * and positions them on the screen
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  position = ToastPosition.TOP,
  onClose,
}) => {
  const positionStyles = getPositionStyles(position);
  
  return (
    <SafeAreaView
      edges={position === ToastPosition.TOP ? EdgeMode.TOP : EdgeMode.BOTTOM}
      style={[styles.containerWrapper, positionStyles]}
      forceInset={position === ToastPosition.TOP}
      backgroundColor="transparent"
      translucent={true}
    >
      {toasts.map((toast, index) => (
        <View
          key={toast.id}
          style={[
            styles.toastWrapper,
            { marginTop: index > 0 && position === ToastPosition.TOP ? 8 : 0 },
            { marginBottom: index > 0 && position === ToastPosition.BOTTOM ? 8 : 0 },
          ]}
        >
          <Toast {...toast} position={position} onClose={onClose} />
        </View>
      ))}
    </SafeAreaView>
  );
};

// Styles
const styles = StyleSheet.create({
  containerWrapper: {
    position: 'absolute',
    width: '100%',
    zIndex: 200, // Using toast z-index value
    alignItems: 'center',
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
  },
  toastWrapper: {
    alignSelf: 'center',
    maxWidth: TOAST_MAX_WIDTH,
    width: '100%',
    marginHorizontal: 16,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 200,
    maxWidth: '100%',
  },
  message: {
    flex: 1,
    color: text.primary,
    marginLeft: 12,
    marginRight: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});