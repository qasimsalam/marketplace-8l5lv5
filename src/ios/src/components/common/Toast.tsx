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
  AccessibilityInfo
} from 'react-native'; // v0.72.x
import { Ionicons } from '@expo/vector-icons'; // ^13.0.0

import { colors } from '../../styles/colors';
import {
  WINDOW_WIDTH,
  STATUS_BAR_HEIGHT,
  getBottomSpace
} from '../../utils/dimensions';
import { SafeAreaView, EdgeMode } from './SafeAreaView';
import { Spinner, SpinnerSize, SpinnerColor } from './Spinner';

// Global constants
const DEFAULT_DURATION = 4000; // 4 seconds
const TOAST_MAX_WIDTH = WINDOW_WIDTH * 0.9; // 90% of screen width

// Toast notification types
export enum ToastType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

// Toast position options
export enum ToastPosition {
  TOP = 'top',
  BOTTOM = 'bottom'
}

// Props for a single toast notification
export interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  position?: ToastPosition;
  onClose: (id: string) => void;
  isClosable?: boolean;
}

// Props for the toast container
export interface ToastContainerProps {
  toasts: ToastProps[];
  position: ToastPosition;
  onClose: (id: string) => void;
}

/**
 * Helper function to determine the appropriate icon based on toast type
 */
const getToastIcon = (type: ToastType) => {
  switch (type) {
    case ToastType.SUCCESS:
      return {
        name: 'checkmark-circle',
        color: colors.white
      };
    case ToastType.ERROR:
      return {
        name: 'close-circle',
        color: colors.white
      };
    case ToastType.WARNING:
      return {
        name: 'warning',
        color: colors.white
      };
    case ToastType.INFO:
    default:
      return {
        name: 'information-circle',
        color: colors.white
      };
  }
};

/**
 * Helper function to determine the appropriate background color based on toast type
 */
const getToastBackgroundColor = (type: ToastType): string => {
  switch (type) {
    case ToastType.SUCCESS:
      return colors.success[600];
    case ToastType.ERROR:
      return colors.error[600];
    case ToastType.WARNING:
      return colors.warning[600];
    case ToastType.INFO:
    default:
      return colors.info[600];
  }
};

/**
 * Helper function to generate position styles based on toast position
 */
const getPositionStyles = (position: ToastPosition): StyleProp<ViewStyle> => {
  switch (position) {
    case ToastPosition.TOP:
      return {
        top: STATUS_BAR_HEIGHT + 10,
      };
    case ToastPosition.BOTTOM:
      return {
        bottom: getBottomSpace() + 10,
      };
    default:
      return {
        top: STATUS_BAR_HEIGHT + 10,
      };
  }
};

/**
 * A single toast notification component that displays a message with an icon,
 * optional close button, and auto-dismissal
 */
export const Toast: React.FC<ToastProps> = ({
  id,
  message,
  type,
  duration = DEFAULT_DURATION,
  position = ToastPosition.TOP,
  onClose,
  isClosable = true
}) => {
  // Track if component is mounted to prevent state updates after unmounting
  const isMounted = useRef(true);
  
  // Animation value for fade and slide effects
  const [fadeAnim] = useState(new Animated.Value(0));
  
  // Animated styles
  const animatedStyles = {
    opacity: fadeAnim,
    transform: [{
      translateY: fadeAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [position === ToastPosition.TOP ? -20 : 20, 0]
      })
    }]
  };
  
  // Handle manual close
  const handleClose = () => {
    if (!isMounted.current) return;
    
    // Animate toast out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      if (isMounted.current) {
        onClose(id);
      }
    });
  };
  
  // Set up auto-dismiss timer with cleanup
  useEffect(() => {
    // Animate toast in
    const animateIn = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true
    });
    
    animateIn.start();
    
    // Set up timer for auto-dismissal
    const timer = setTimeout(() => {
      handleClose();
    }, duration);
    
    // Announce toast message to screen readers
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(`${type} alert: ${message}`);
    }
    
    // Clean up on unmount
    return () => {
      isMounted.current = false;
      clearTimeout(timer);
      animateIn.stop();
    };
  }, []);
  
  // Get icon and background color based on type
  const iconProps = getToastIcon(type);
  const backgroundColor = getToastBackgroundColor(type);
  
  return (
    <TouchableWithoutFeedback onPress={handleClose}>
      <Animated.View
        style={[
          styles.container,
          { backgroundColor },
          animatedStyles
        ]}
        accessible
        accessibilityRole="alert"
        accessibilityLabel={`${type} alert: ${message}`}
      >
        <View style={styles.contentContainer}>
          <Ionicons
            name={iconProps.name}
            size={20}
            color={iconProps.color}
            style={styles.icon}
          />
          <Text style={styles.message} numberOfLines={3}>
            {message}
          </Text>
          {isClosable && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close notification"
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Ionicons name="close" size={16} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>
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
  position,
  onClose
}) => {
  return (
    <View 
      style={[
        styles.containerWrapper,
        getPositionStyles(position)
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.toastsContainer} pointerEvents="box-none">
        {toasts.map((toast, index) => (
          <View
            key={toast.id}
            style={[
              styles.toastWrapper,
              index > 0 && { marginTop: 8 }
            ]}
            pointerEvents="auto"
          >
            <Toast
              {...toast}
              position={position}
              onClose={onClose}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  containerWrapper: {
    position: 'absolute',
    zIndex: 9999,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toastsContainer: {
    width: '100%',
    alignItems: 'center',
    maxWidth: TOAST_MAX_WIDTH,
    paddingHorizontal: 16,
  },
  toastWrapper: {
    width: '100%',
    marginBottom: 8,
  },
  container: {
    width: '100%',
    minHeight: 50,
    borderRadius: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  icon: {
    marginRight: 8,
  },
  message: {
    flex: 1,
    color: colors.white,
    fontSize: 15,
    fontWeight: '500',
  },
  closeButton: {
    marginLeft: 8,
    padding: 2,
  },
});