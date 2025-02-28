/**
 * AI Talent Marketplace - Modal Component
 * 
 * A reusable modal dialog component for the Android application that provides 
 * an overlay for focused user interactions. Supports customizable headers, 
 * footers, sizes, and animations with accessibility features like focus management,
 * keyboard handling, and proper accessibility attributes.
 * 
 * @version 1.0.0
 */

import React, { useEffect, useRef, useState, useMemo } from 'react'; // v18.2.0
import {
  StyleSheet,
  View,
  Text,
  Modal as RNModal,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Animated,
  Pressable,
  Platform,
  BackHandler
} from 'react-native'; // v0.72.x
import { StyleProp, ViewStyle, TextStyle } from 'react-native'; // v0.72.x
import Ionicons from 'react-native-vector-icons/Ionicons'; // ^9.0.0

// Internal imports
import { Button, ButtonVariant } from '../common/Button';
import { SafeAreaView, EdgeMode } from '../common/SafeAreaView';
import { useTheme } from '../../styles/theme';
import { colors } from '../../styles/colors';
import { WINDOW_WIDTH, WINDOW_HEIGHT } from '../../utils/dimensions';
import { moderateScale } from '../../utils/responsive';

// Constants
const ANIMATION_DURATION = 300;
const BACKDROP_OPACITY = 0.5;

/**
 * Modal size options
 */
export enum ModalSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  FULL = 'FULL',
}

/**
 * Modal position options
 */
export enum ModalPosition {
  CENTER = 'CENTER',
  BOTTOM = 'BOTTOM',
}

/**
 * Props for the Modal component
 */
export interface ModalProps {
  /**
   * Whether the modal is visible
   */
  visible: boolean;

  /**
   * Function called when the modal is closed
   */
  onClose: () => void;

  /**
   * Optional title for the modal header
   */
  title?: string;

  /**
   * Content to render inside the modal
   */
  children: React.ReactNode;

  /**
   * Size of the modal
   * @default ModalSize.MEDIUM
   */
  size?: ModalSize;

  /**
   * Position of the modal
   * @default ModalPosition.CENTER
   */
  position?: ModalPosition;

  /**
   * Optional content to render in the modal footer
   */
  footer?: React.ReactNode;

  /**
   * Whether to close the modal when the backdrop is pressed
   * @default true
   */
  closeOnBackdropPress?: boolean;

  /**
   * Additional styles for the modal container
   */
  style?: StyleProp<ViewStyle>;

  /**
   * Additional styles for the modal content
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
   * Whether to show the close button in the header
   * @default true
   */
  showCloseButton?: boolean;

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
 * Calculates modal styles based on size and theme
 * 
 * @param size - Modal size
 * @param theme - Current theme
 * @returns Modal styles object
 */
const getModalStyles = (size: ModalSize, theme: any): object => {
  // Base styles for the modal
  const baseStyles: ViewStyle = {
    backgroundColor: colors.background.primary,
    borderRadius: moderateScale(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  };

  // Size-specific styles
  let sizeStyles: ViewStyle = {};
  const maxWidth = WINDOW_WIDTH * 0.9;
  const maxHeight = WINDOW_HEIGHT * 0.8;

  switch (size) {
    case ModalSize.SMALL:
      sizeStyles = {
        width: Math.min(moderateScale(300), maxWidth),
        maxHeight: Math.min(moderateScale(400), maxHeight),
      };
      break;
    case ModalSize.LARGE:
      sizeStyles = {
        width: Math.min(moderateScale(500), maxWidth),
        maxHeight: Math.min(moderateScale(600), maxHeight),
      };
      break;
    case ModalSize.FULL:
      sizeStyles = {
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
        borderRadius: 0,
      };
      break;
    case ModalSize.MEDIUM:
    default:
      sizeStyles = {
        width: Math.min(moderateScale(400), maxWidth),
        maxHeight: Math.min(moderateScale(500), maxHeight),
      };
  }

  return {
    ...baseStyles,
    ...sizeStyles,
  };
};

/**
 * A reusable modal dialog component for focused user interactions
 * 
 * @param props - Component props
 * @returns JSX.Element - Rendered modal component
 */
export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  size = ModalSize.MEDIUM,
  position = ModalPosition.CENTER,
  footer,
  closeOnBackdropPress = true,
  style,
  contentStyle,
  headerStyle,
  footerStyle,
  showCloseButton = true,
  testID,
  accessibilityLabel,
}) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(position === ModalPosition.BOTTOM ? WINDOW_HEIGHT : 0)).current;
  
  // Get current theme
  const theme = useTheme();
  
  // Content ref for focusing
  const contentRef = useRef<View>(null);
  
  // Track if modal is actually visible to prevent layout flash
  const [isRendered, setIsRendered] = useState(visible);
  
  // Memoize styles based on size, position, and theme
  const modalStyles = useMemo(() => 
    getModalStyles(size, theme), 
    [size, theme]
  );

  // Position style based on modal position
  const positionStyle = useMemo(() => 
    position === ModalPosition.BOTTOM
      ? { justifyContent: 'flex-end' as const }
      : { justifyContent: 'center' as const },
    [position]
  );
  
  // Check if we should show a header
  const showHeader = Boolean(title || showCloseButton);

  // Handle Android back button press
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (visible) {
        onClose();
        return true;
      }
      return false;
    });
    
    return () => backHandler.remove();
  }, [visible, onClose]);

  // Update isRendered state when visibility changes
  useEffect(() => {
    if (visible) {
      setIsRendered(true);
    }
  }, [visible]);

  // Run animations when visibility changes
  useEffect(() => {
    if (visible) {
      // Show animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: BACKDROP_OPACITY,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Focus the modal content for screen readers
      if (contentRef.current) {
        contentRef.current.setNativeProps({
          accessibilityViewIsModal: true,
          importantForAccessibility: 'yes',
        });
      }
    } else {
      // Hide animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: position === ModalPosition.BOTTOM ? WINDOW_HEIGHT : 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // When animation completes, update render state
        setIsRendered(false);
      });
    }
  }, [visible, fadeAnim, slideAnim, position]);

  // Handle backdrop press to close modal
  const handleBackdropPress = () => {
    if (closeOnBackdropPress) {
      onClose();
    }
  };

  // Calculate transform property based on position
  const getTransformStyle = useMemo(() => {
    if (position === ModalPosition.BOTTOM) {
      return { transform: [{ translateY: slideAnim }] };
    }
    
    // For center position, use a combination of scale and opacity
    return { 
      opacity: fadeAnim.interpolate({
        inputRange: [0, BACKDROP_OPACITY],
        outputRange: [0, 1],
      }),
      transform: [
        { scale: fadeAnim.interpolate({
          inputRange: [0, BACKDROP_OPACITY],
          outputRange: [0.9, 1],
        })},
      ],
    };
  }, [position, fadeAnim, slideAnim]);

  // If modal is not rendered and not visible, return null
  if (!isRendered && !visible) return null;

  return (
    <RNModal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
      statusBarTranslucent
      testID={testID}
      supportedOrientations={[
        'portrait',
        'portrait-upside-down',
        'landscape',
        'landscape-left',
        'landscape-right',
      ]}
    >
      <SafeAreaView edges={EdgeMode.ALL} translucent>
        <View style={[styles.container, positionStyle]}>
          {/* Backdrop */}
          <Animated.View
            style={[styles.backdrop, { opacity: fadeAnim }]}
          >
            <TouchableWithoutFeedback 
              onPress={handleBackdropPress}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
              accessibilityHint="Closes the modal when tapped"
            >
              <View style={styles.backdropTouchable} />
            </TouchableWithoutFeedback>
          </Animated.View>

          {/* Modal Content */}
          <Animated.View 
            ref={contentRef}
            style={[
              styles.modal,
              modalStyles,
              getTransformStyle,
              style
            ]}
            accessibilityViewIsModal={true}
            accessibilityRole="dialog"
            accessibilityLabel={accessibilityLabel || (title ? `${title} dialog` : 'Dialog')}
            importantForAccessibility="yes"
          >
            {/* Modal Header */}
            {showHeader && (
              <View style={[styles.header, headerStyle]}>
                {title ? (
                  <Text 
                    style={styles.title} 
                    numberOfLines={1}
                    accessibilityRole="header"
                  >
                    {title}
                  </Text>
                ) : <View style={styles.titlePlaceholder} />}
                
                {showCloseButton && (
                  <TouchableOpacity
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel="Close dialog"
                    accessibilityHint="Closes the dialog"
                    hitSlop={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  >
                    <Ionicons 
                      name="close" 
                      size={moderateScale(24)} 
                      color={colors.text.primary} 
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Modal Content */}
            <View style={[styles.content, contentStyle]}>
              {children}
            </View>

            {/* Modal Footer */}
            {footer && (
              <View style={[styles.footer, footerStyle]}>
                {footer}
              </View>
            )}
          </Animated.View>
        </View>
      </SafeAreaView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
  backdropTouchable: {
    flex: 1,
  },
  modal: {
    margin: moderateScale(16),
    backgroundColor: colors.background.primary,
    borderRadius: moderateScale(8),
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: moderateScale(16),
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  title: {
    flex: 1,
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: colors.text.primary,
    marginRight: moderateScale(16),
  },
  titlePlaceholder: {
    flex: 1,
  },
  content: {
    padding: moderateScale(16),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: moderateScale(16),
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
});

export default Modal;