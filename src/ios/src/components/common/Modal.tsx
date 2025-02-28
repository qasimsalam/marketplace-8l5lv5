/**
 * A reusable and customizable modal component for the AI Talent Marketplace iOS application.
 * This component displays content in an overlay that appears above other content,
 * supporting various animation types, backdrop press handling, and accessibility features.
 * The modal includes support for different sizes, positions, and content layouts with proper iOS safe area handling.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'; // react 18.2.0
import {
  Modal as RNModal,
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  BackHandler,
  Easing,
  Text,
  Platform,
  StyleProp,
  ViewStyle,
  TextStyle,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from 'react-native'; // react-native 0.72.x

import { colors } from '../../styles/colors';
import { Button, ButtonVariant, ButtonSize } from './Button';
import { SafeAreaView, EdgeMode } from './SafeAreaView';
import { WINDOW_HEIGHT, WINDOW_WIDTH, IS_IPHONE_X } from '../../utils/dimensions';
import { useKeyboard } from '../../hooks/useKeyboard';

/**
 * Enum defining modal placement options on the screen
 */
export enum ModalPlacement {
  TOP = 'top',
  CENTER = 'center',
  BOTTOM = 'bottom',
}

/**
 * Enum defining modal size options
 */
export enum ModalSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  FULL = 'full',
}

/**
 * Interface defining props for the Modal component
 */
export interface ModalProps {
  /**
   * Controls whether the modal is visible
   */
  visible: boolean;
  
  /**
   * Function to call when the modal is closed
   */
  onClose: () => void;
  
  /**
   * Content to display inside the modal
   */
  children: React.ReactNode;
  
  /**
   * Title text to display in the modal header
   */
  title?: string;
  
  /**
   * Type of animation to use when showing/hiding the modal
   * @default 'fade'
   */
  animationType?: 'fade' | 'slide' | 'zoom';
  
  /**
   * Position of the modal on the screen
   * @default ModalPlacement.CENTER
   */
  placement?: ModalPlacement;
  
  /**
   * Size of the modal
   * @default ModalSize.MEDIUM
   */
  size?: ModalSize;
  
  /**
   * Whether to close the modal when the backdrop is pressed
   * @default true
   */
  closeOnBackdropPress?: boolean;
  
  /**
   * Whether to close the modal when the Escape key is pressed (hardware back on Android)
   * @default true
   */
  closeOnEscape?: boolean;
  
  /**
   * Custom function to render the modal header
   */
  renderHeader?: () => React.ReactNode;
  
  /**
   * Custom function to render the modal footer
   */
  renderFooter?: () => React.ReactNode;
  
  /**
   * Additional styles for the modal content container
   */
  contentStyle?: StyleProp<ViewStyle>;
  
  /**
   * Additional styles for the modal header
   */
  headerStyle?: StyleProp<ViewStyle>;
  
  /**
   * Additional styles for the modal footer
   */
  footerStyle?: StyleProp<ViewStyle>;
  
  /**
   * Additional styles for the modal backdrop
   */
  backdropStyle?: StyleProp<ViewStyle>;
  
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
 * Creates and manages the animated value for modal transitions
 * @param visible Current visibility state of the modal
 * @param animationType Type of animation to use
 * @returns Object containing animated value and derived styles
 */
const useAnimatedValue = (visible: boolean, animationType: string = 'fade') => {
  // Create animated value instance
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  // Animated configurations
  const animatedStyles = useMemo(() => {
    switch (animationType) {
      case 'slide':
        return {
          opacity: animatedValue,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [WINDOW_HEIGHT, 0],
              }),
            },
          ],
        };
      case 'zoom':
        return {
          opacity: animatedValue,
          transform: [
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1],
              }),
            },
          ],
        };
      case 'fade':
      default:
        return {
          opacity: animatedValue,
        };
    }
  }, [animationType, animatedValue]);
  
  // Run animation when visibility changes
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: visible ? 1 : 0,
      duration: 300,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [visible, animatedValue]);
  
  return { animatedValue, animatedStyles };
};

/**
 * Calculates modal position based on placement prop
 * @param placement Modal placement option
 * @param modalHeight Current height of the modal content
 * @param keyboardVisible Whether the keyboard is currently visible
 * @param keyboardHeight Current height of the keyboard
 * @returns StyleProp<ViewStyle> with positioning styles
 */
const getModalPosition = (
  placement: ModalPlacement,
  modalHeight: number,
  keyboardVisible: boolean,
  keyboardHeight: number,
): StyleProp<ViewStyle> => {
  const positionStyle: ViewStyle = {
    justifyContent: 'center',
    margin: 24,
  };
  
  switch (placement) {
    case ModalPlacement.TOP:
      positionStyle.justifyContent = 'flex-start';
      positionStyle.marginTop = 72;
      break;
    case ModalPlacement.BOTTOM:
      positionStyle.justifyContent = 'flex-end';
      positionStyle.marginBottom = keyboardVisible ? keyboardHeight + 16 : 72;
      break;
    case ModalPlacement.CENTER:
    default:
      // If keyboard is visible, adjust the position to ensure modal remains visible
      if (keyboardVisible && modalHeight > WINDOW_HEIGHT - keyboardHeight - 48) {
        positionStyle.justifyContent = 'flex-start';
        positionStyle.marginTop = 24;
      } else {
        positionStyle.justifyContent = 'center';
      }
      break;
  }
  
  return positionStyle;
};

/**
 * A reusable and customizable modal component for the AI Talent Marketplace iOS application
 * Supports various animation types, backdrop press handling, and accessibility features
 * 
 * @param props Modal component props
 * @returns Rendered modal component
 */
export const Modal: React.FC<ModalProps> = ({
  visible = false,
  onClose,
  children,
  title,
  animationType = 'fade',
  placement = ModalPlacement.CENTER,
  size = ModalSize.MEDIUM,
  closeOnBackdropPress = true,
  closeOnEscape = true,
  renderHeader,
  renderFooter,
  contentStyle,
  headerStyle,
  footerStyle,
  backdropStyle,
  testID,
  accessibilityLabel,
}) => {
  // Use animation hook to get animated value and styles
  const { animatedValue, animatedStyles } = useAnimatedValue(visible, animationType);
  
  // Create a ref to track if the animation has completed (for conditional rendering)
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Get keyboard state using custom hook
  const { keyboardShown, keyboardHeight } = useKeyboard();
  
  // Ref for storing modal content measurements
  const modalContentRef = useRef<View>(null);
  const [modalHeight, setModalHeight] = useState(0);
  
  // Handle measuring modal content height for position calculations
  const onModalContentLayout = () => {
    if (modalContentRef.current) {
      modalContentRef.current.measure((x, y, width, height) => {
        setModalHeight(height);
      });
    }
  };
  
  // Set up animation completion tracking
  useEffect(() => {
    if (visible) {
      setIsAnimating(true);
    } else {
      // Add delay to wait for hide animation to complete
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300); // Same as animation duration
      
      return () => clearTimeout(timer);
    }
  }, [visible]);
  
  // Handle back button press on Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      const handleBackPress = () => {
        if (visible && closeOnEscape) {
          onClose();
          return true;
        }
        return false;
      };
      
      BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      
      return () => {
        BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
      };
    }
  }, [visible, closeOnEscape, onClose]);
  
  // Memoize position style calculation
  const positionStyle = useMemo(() => 
    getModalPosition(placement, modalHeight, keyboardShown, keyboardHeight),
    [placement, modalHeight, keyboardShown, keyboardHeight]
  );
  
  // Memoize size style based on size prop
  const sizeStyle = useMemo(() => {
    switch (size) {
      case ModalSize.SMALL:
        return styles.smallModal;
      case ModalSize.LARGE:
        return styles.largeModal;
      case ModalSize.FULL:
        return styles.fullModal;
      case ModalSize.MEDIUM:
      default:
        return styles.mediumModal;
    }
  }, [size]);
  
  // Determine SafeAreaView edge mode based on modal size
  const edgeMode = useMemo(() => {
    if (size === ModalSize.FULL) {
      return EdgeMode.ALL;
    }
    
    if (placement === ModalPlacement.TOP) {
      return EdgeMode.TOP;
    }
    
    if (placement === ModalPlacement.BOTTOM) {
      return EdgeMode.BOTTOM;
    }
    
    return EdgeMode.NONE;
  }, [size, placement]);
  
  // If not visible and not animating, don't render anything
  if (!visible && !isAnimating) {
    return null;
  }
  
  // Render modal header
  const renderDefaultHeader = () => {
    if (!title) return null;
    
    return (
      <View style={[styles.modalHeader, headerStyle]}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close modal"
        >
          <Text>✕</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  // Render modal footer with default close button
  const renderDefaultFooter = () => {
    return (
      <View style={[styles.modalFooter, footerStyle]}>
        <Button 
          text="Close"
          variant={ButtonVariant.SECONDARY}
          size={ButtonSize.MEDIUM}
          onPress={onClose}
        />
      </View>
    );
  };
  
  return (
    <RNModal
      transparent
      visible={visible || isAnimating}
      statusBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={() => {
        if (closeOnEscape) {
          onClose();
        }
      }}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            if (closeOnBackdropPress) {
              onClose();
            }
          }}
        >
          <Animated.View
            style={[
              styles.backdrop,
              { opacity: animatedValue },
              backdropStyle,
            ]}
          />
        </TouchableWithoutFeedback>
        
        <Animated.View
          style={[
            styles.modalContainer,
            positionStyle,
            animatedStyles,
          ]}
          testID={testID || 'modal-component'}
          accessibilityLabel={accessibilityLabel || 'Modal'}
          accessibilityViewIsModal={true}
          accessibilityRole="dialog"
        >
          <TouchableWithoutFeedback>
            <View>
              <SafeAreaView 
                edges={edgeMode}
                style={[
                  styles.modalContent,
                  sizeStyle,
                  contentStyle,
                ]}
              >
                <View
                  ref={modalContentRef}
                  onLayout={onModalContentLayout}
                >
                  {renderHeader ? renderHeader() : renderDefaultHeader()}
                  <View style={styles.modalBody}>
                    {children}
                  </View>
                  {renderFooter ? renderFooter() : null}
                </View>
              </SafeAreaView>
            </View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </KeyboardAvoidingView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    flex: 1,
  },
  modalContent: {
    borderRadius: 12,
    backgroundColor: colors.background.primary,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    padding: 16,
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  // Size styles
  smallModal: {
    width: '70%',
    alignSelf: 'center',
  },
  mediumModal: {
    width: '85%',
    alignSelf: 'center',
  },
  largeModal: {
    width: '95%',
    alignSelf: 'center',
  },
  fullModal: {
    margin: 0,
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
});