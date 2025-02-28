/**
 * A reusable component that renders a modal prompt for biometric authentication (Face ID or Touch ID) on iOS devices.
 * This component provides a user-friendly interface for requesting and handling biometric verification with appropriate visual feedback.
 */

import React, { useState, useEffect, useCallback } from 'react'; // ^18.2.0
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  StyleProp, 
  ViewStyle, 
  Platform 
} from 'react-native'; // react-native 0.72.x
import Haptics from 'react-native-haptic-feedback'; // ^2.0.0

// Internal imports
import { Modal, ModalPlacement, ModalSize } from '../common/Modal';
import { Button, ButtonVariant, ButtonSize } from '../common/Button';
import { Spinner, SpinnerSize } from '../common/Spinner';
import { SafeAreaView, EdgeMode } from '../common/SafeAreaView';
import { colors } from '../../styles/colors';
import useBiometrics from '../../hooks/useBiometrics';
import { BiometricType, BiometricAuthResult } from '../../types/auth.types';

// Biometric icon assets
const BIOMETRIC_ICONS = {
  FACE: require('../../../assets/images/face-id-icon.png'),
  FINGERPRINT: require('../../../assets/images/touch-id-icon.png'),
  NONE: null
};

/**
 * Interface defining props for the BiometricPrompt component
 */
export interface BiometricPromptProps {
  /**
   * Controls whether the biometric prompt is visible
   */
  visible: boolean;
  
  /**
   * Function called when biometric authentication is successful
   */
  onSuccess: () => void;
  
  /**
   * Function called when the user cancels biometric authentication
   */
  onCancel: () => void;
  
  /**
   * Function called when biometric authentication encounters an error
   */
  onError: (error: string) => void;
  
  /**
   * Custom message to display in the biometric prompt
   * @default "Authenticate to continue"
   */
  promptMessage?: string;
  
  /**
   * Text for the cancel button
   * @default "Cancel"
   */
  cancelButtonText?: string;
  
  /**
   * Additional styles for the component
   */
  style?: StyleProp<ViewStyle>;
  
  /**
   * Test ID for automated testing
   */
  testID?: string;
}

/**
 * Authentication status states for the biometric prompt
 */
enum AuthStatus {
  IDLE = 'idle',
  AUTHENTICATING = 'authenticating',
  SUCCESS = 'success',
  ERROR = 'error',
}

/**
 * Returns the appropriate biometric icon based on the device's biometric type
 * @param biometricType The type of biometric authentication available on the device
 * @returns The image source for the biometric icon
 */
const getBiometricIcon = (biometricType: BiometricType): any => {
  switch (biometricType) {
    case BiometricType.FACE:
      return BIOMETRIC_ICONS.FACE;
    case BiometricType.FINGERPRINT:
      return BIOMETRIC_ICONS.FINGERPRINT;
    default:
      return BIOMETRIC_ICONS.NONE;
  }
};

/**
 * Returns appropriate text prompts based on the biometric type
 * @param biometricType The type of biometric authentication available on the device
 * @returns Object containing title and description text
 */
const getBiometricPromptText = (biometricType: BiometricType): { title: string; description: string } => {
  switch (biometricType) {
    case BiometricType.FACE:
      return {
        title: 'Face ID',
        description: 'Authenticate with Face ID to continue'
      };
    case BiometricType.FINGERPRINT:
      return {
        title: 'Touch ID',
        description: 'Authenticate with Touch ID to continue'
      };
    default:
      return {
        title: 'Biometric Authentication',
        description: 'Authenticate to continue'
      };
  }
};

/**
 * A modal component that prompts the user for biometric authentication
 * 
 * @param props Component props
 * @returns The rendered biometric prompt component
 */
const BiometricPrompt: React.FC<BiometricPromptProps> = ({
  visible,
  onSuccess,
  onCancel,
  onError,
  promptMessage,
  cancelButtonText = 'Cancel',
  style,
  testID = 'biometric-prompt',
}) => {
  // Get biometric functionality
  const { biometricType, authenticate } = useBiometrics();
  
  // Track authentication status
  const [authStatus, setAuthStatus] = useState<AuthStatus>(AuthStatus.IDLE);
  
  // Get appropriate icon and text based on biometric type
  const icon = getBiometricIcon(biometricType);
  const { title, description } = getBiometricPromptText(biometricType);
  
  // Handle authentication when modal becomes visible
  useEffect(() => {
    if (visible && authStatus === AuthStatus.IDLE) {
      handleAuthenticate();
    }
  }, [visible]);
  
  // Reset status when modal is hidden
  useEffect(() => {
    if (!visible) {
      setAuthStatus(AuthStatus.IDLE);
    }
  }, [visible]);
  
  // Handle biometric authentication
  const handleAuthenticate = useCallback(async () => {
    try {
      // Update state to authenticating
      setAuthStatus(AuthStatus.AUTHENTICATING);
      
      // Attempt authentication with the provided prompt message or default
      const result = await authenticate(promptMessage || description);
      
      // Handle different authentication results
      switch (result) {
        case BiometricAuthResult.SUCCESS:
          // Trigger haptic feedback for success
          Haptics.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
          
          // Update state and notify parent component
          setAuthStatus(AuthStatus.SUCCESS);
          onSuccess();
          break;
          
        case BiometricAuthResult.CANCELED:
          // User canceled authentication, reset state and notify parent
          setAuthStatus(AuthStatus.IDLE);
          onCancel();
          break;
          
        case BiometricAuthResult.NOT_AVAILABLE:
          // Biometrics not available on this device
          const notAvailableError = 'Biometric authentication is not available on this device.';
          setAuthStatus(AuthStatus.ERROR);
          onError(notAvailableError);
          break;
          
        case BiometricAuthResult.NOT_ENROLLED:
          // Biometrics not set up on this device
          const notEnrolledError = 'Biometric authentication is not set up on this device.';
          setAuthStatus(AuthStatus.ERROR);
          onError(notEnrolledError);
          break;
          
        case BiometricAuthResult.FAILED:
        default:
          // Authentication failed
          Haptics.trigger('notificationError', { ignoreAndroidSystemSettings: false });
          const failedError = 'Biometric authentication failed. Please try again.';
          setAuthStatus(AuthStatus.ERROR);
          onError(failedError);
          break;
      }
    } catch (error) {
      // Unexpected error during authentication
      console.error('Error in biometric authentication:', error);
      
      // Trigger haptic feedback for error
      Haptics.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      
      // Update state and notify parent component
      setAuthStatus(AuthStatus.ERROR);
      onError('An unexpected error occurred during authentication.');
    }
  }, [authenticate, promptMessage, description, onSuccess, onCancel, onError]);
  
  // Handle cancel button press
  const handleCancel = useCallback(() => {
    setAuthStatus(AuthStatus.IDLE);
    onCancel();
  }, [onCancel]);
  
  // Handle retry button press
  const handleRetry = useCallback(() => {
    setAuthStatus(AuthStatus.IDLE);
    handleAuthenticate();
  }, [handleAuthenticate]);
  
  return (
    <Modal
      visible={visible}
      onClose={onCancel}
      placement={ModalPlacement.CENTER}
      size={ModalSize.SMALL}
      animationType="zoom"
      closeOnBackdropPress={false}
      closeOnEscape={false}
      testID={testID}
      accessibilityLabel={`${title} authentication prompt`}
      contentStyle={[styles.modalContent, style]}
      renderHeader={() => null}
      renderFooter={() => null}
    >
      <SafeAreaView edges={EdgeMode.NONE}>
        <View style={styles.container}>
          {/* Biometric icon */}
          {icon && (
            <Image
              source={icon}
              style={styles.icon}
              accessibilityLabel={`${title} icon`}
              testID={`${testID}-icon`}
            />
          )}
          
          {/* Title and description */}
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.description} accessibilityLabel={promptMessage || description}>
            {promptMessage || description}
          </Text>
          
          {/* Authentication status feedback */}
          <View style={styles.statusContainer}>
            {authStatus === AuthStatus.AUTHENTICATING && (
              <Spinner
                size={SpinnerSize.MEDIUM}
                testID={`${testID}-spinner`}
                accessibilityLabel="Authenticating with biometrics"
              />
            )}
            
            {authStatus === AuthStatus.ERROR && (
              <Text style={styles.errorText} accessibilityRole="alert">
                Authentication failed. Please try again.
              </Text>
            )}
          </View>
          
          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            <Button
              text={cancelButtonText}
              variant={ButtonVariant.SECONDARY}
              size={ButtonSize.MEDIUM}
              onPress={handleCancel}
              testID={`${testID}-cancel-button`}
              accessibilityLabel={`Cancel ${title} authentication`}
              accessibilityHint="Cancels the biometric authentication prompt"
            />
            
            {authStatus === AuthStatus.ERROR && (
              <Button
                text="Try Again"
                variant={ButtonVariant.PRIMARY}
                size={ButtonSize.MEDIUM}
                onPress={handleRetry}
                testID={`${testID}-retry-button`}
                accessibilityLabel="Try again"
                accessibilityHint="Attempts biometric authentication again"
                style={styles.retryButton}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// Component styles
const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden'
  },
  container: {
    padding: 24,
    alignItems: 'center'
  },
  icon: {
    width: 64,
    height: 64,
    marginBottom: 16,
    resizeMode: 'contain'
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center'
  },
  description: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 20,
    textAlign: 'center'
  },
  statusContainer: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  errorText: {
    color: '#ef4444', // error color
    textAlign: 'center',
    marginBottom: 8
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginTop: 8
  },
  retryButton: {
    marginLeft: 12
  }
});

export default BiometricPrompt;