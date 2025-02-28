/**
 * Biometric Authentication Prompt Component for AI Talent Marketplace Android app
 * 
 * Provides a user-friendly interface for fingerprint and face recognition authentication,
 * abstracting away the complexities of biometric APIs behind a simple component.
 *
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react'; // react v18.2.0
import { StyleSheet, Text, View, Image } from 'react-native'; // react-native v0.72.x
import Ionicons from 'react-native-vector-icons/Ionicons'; // ^9.0.0

// Internal imports
import { useBiometrics } from '../../hooks/useBiometrics';
import { useAuth } from '../../hooks/useAuth';
import { BiometricType, BiometricAuthResult, BiometricAuthOptions } from '../../types/auth.types';
import Button, { ButtonVariant } from '../common/Button';
import Modal, { ModalSize } from '../common/Modal';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/layout';
import { moderateScale } from '../../utils/responsive';

// Default text constants for the component
const DEFAULT_BIOMETRIC_PROMPT_TITLE = 'Biometric Authentication';
const DEFAULT_BIOMETRIC_PROMPT_SUBTITLE = 'Securely access your account';
const DEFAULT_BIOMETRIC_PROMPT_DESCRIPTION = 'Use your biometric data to quickly and securely log in';
const DEFAULT_BIOMETRIC_CANCEL_TEXT = 'Cancel';
const DEFAULT_BIOMETRIC_SUCCESS_TEXT = 'Authentication Successful';
const DEFAULT_BIOMETRIC_FAILURE_TEXT = 'Authentication Failed';

/**
 * Enum to track the current status of biometric authentication
 */
export enum BiometricStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

/**
 * Props interface for the BiometricPrompt component
 */
export interface BiometricPromptProps {
  /**
   * Whether the biometric prompt is visible
   */
  visible: boolean;
  
  /**
   * Title displayed in the biometric prompt
   * @default "Biometric Authentication"
   */
  title?: string;
  
  /**
   * Subtitle displayed in the biometric prompt
   * @default "Securely access your account"
   */
  subtitle?: string;
  
  /**
   * Description text explaining the biometric prompt
   * @default "Use your biometric data to quickly and securely log in"
   */
  description?: string;
  
  /**
   * Text for the cancel button
   * @default "Cancel"
   */
  cancelText?: string;
  
  /**
   * Function called when user cancels the prompt
   */
  onCancel?: () => void;
  
  /**
   * Function called on successful authentication
   */
  onSuccess?: () => void;
  
  /**
   * Function called on authentication error
   * @param error Error message
   */
  onError?: (error: string) => void;
  
  /**
   * Whether to automatically initiate authentication when the component mounts
   * @default false
   */
  authenticateOnMount?: boolean;
  
  /**
   * Test ID for automated testing
   */
  testID?: string;
}

/**
 * Helper function to get the appropriate Ionicon based on biometric type
 * 
 * @param biometricType Type of biometric hardware available on the device
 * @returns Ionicons name string for the appropriate biometric icon
 */
const getBiometricIcon = (biometricType: BiometricType): string => {
  switch (biometricType) {
    case BiometricType.FINGERPRINT:
      return 'finger-print';
    case BiometricType.FACE:
      return 'person';
    case BiometricType.IRIS:
      return 'eye';
    case BiometricType.NONE:
    default:
      return 'key'; // Fallback icon
  }
};

/**
 * A customizable biometric authentication dialog component
 * 
 * @param props Component props
 * @returns JSX.Element Rendered component
 */
const BiometricPrompt: React.FC<BiometricPromptProps> = ({
  visible,
  title = DEFAULT_BIOMETRIC_PROMPT_TITLE,
  subtitle = DEFAULT_BIOMETRIC_PROMPT_SUBTITLE,
  description = DEFAULT_BIOMETRIC_PROMPT_DESCRIPTION,
  cancelText = DEFAULT_BIOMETRIC_CANCEL_TEXT,
  onCancel,
  onSuccess,
  onError,
  authenticateOnMount = false,
  testID,
}) => {
  // Component state
  const [status, setStatus] = useState<BiometricStatus>(BiometricStatus.IDLE);
  const [message, setMessage] = useState<string>('');
  
  // Get biometric and auth hooks
  const { biometricType, authenticate, isAvailable } = useBiometrics();
  const { loginWithBiometrics } = useAuth();
  
  /**
   * Initiates biometric authentication and handles the result
   */
  const handleAuthenticate = useCallback(async (): Promise<void> => {
    if (!isAvailable) {
      setStatus(BiometricStatus.ERROR);
      setMessage('Biometric authentication is not available on this device');
      onError?.('Biometric authentication is not available on this device');
      return;
    }
    
    setStatus(BiometricStatus.PROCESSING);
    setMessage('');
    
    try {
      const authOptions: BiometricAuthOptions = {
        promptTitle: title,
        promptSubtitle: subtitle,
        promptDescription: description,
        cancelButtonText: cancelText,
      };
      
      const authResult = await authenticate(authOptions);
      
      if (authResult === BiometricAuthResult.SUCCESS) {
        setStatus(BiometricStatus.SUCCESS);
        setMessage(DEFAULT_BIOMETRIC_SUCCESS_TEXT);
        
        // Attempt to log in with biometrics
        const loginSuccess = await loginWithBiometrics();
        
        if (loginSuccess) {
          // Call the onSuccess callback
          onSuccess?.();
        } else {
          throw new Error('Login failed after successful biometric authentication');
        }
      } else if (authResult === BiometricAuthResult.CANCELED) {
        setStatus(BiometricStatus.IDLE);
        // User canceled, no error message needed
        onCancel?.();
      } else {
        setStatus(BiometricStatus.ERROR);
        
        // Set appropriate error message based on result
        let errorMessage: string;
        switch (authResult) {
          case BiometricAuthResult.FAILED:
            errorMessage = 'Authentication failed. Please try again.';
            break;
          case BiometricAuthResult.NOT_AVAILABLE:
            errorMessage = 'Biometric authentication is not available on this device.';
            break;
          case BiometricAuthResult.NOT_ENROLLED:
            errorMessage = 'No biometric data is enrolled on this device.';
            break;
          default:
            errorMessage = 'An unknown error occurred during authentication.';
        }
        
        setMessage(errorMessage);
        onError?.(errorMessage);
      }
    } catch (error) {
      setStatus(BiometricStatus.ERROR);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setMessage(errorMessage);
      onError?.(errorMessage);
    }
  }, [
    isAvailable,
    authenticate,
    title,
    subtitle,
    description,
    cancelText,
    onSuccess,
    onError,
    onCancel,
    loginWithBiometrics,
  ]);
  
  // Reset state when visibility changes
  useEffect(() => {
    if (visible) {
      setStatus(BiometricStatus.IDLE);
      setMessage('');
    }
  }, [visible]);
  
  // Automatically authenticate on mount if enabled
  useEffect(() => {
    if (authenticateOnMount && visible && status === BiometricStatus.IDLE) {
      handleAuthenticate();
    }
  }, [authenticateOnMount, visible, status, handleAuthenticate]);
  
  // Handle manual authentication request
  const handleAuthenticatePress = (): void => {
    if (status !== BiometricStatus.PROCESSING) {
      handleAuthenticate();
    }
  };
  
  // Determine icon based on biometric type and status
  const iconName = getBiometricIcon(biometricType);
  const iconColor = status === BiometricStatus.ERROR ? colors.error[600] : 
                    status === BiometricStatus.SUCCESS ? colors.success[600] : 
                    colors.primary[600];
  
  return (
    <Modal
      visible={visible}
      onClose={onCancel}
      title={title}
      size={ModalSize.SMALL}
      testID={testID || 'biometric-prompt-modal'}
      accessibilityLabel={title}
      showCloseButton={false}
    >
      <View style={styles.container}>
        {/* Biometric Icon */}
        <View style={styles.iconContainer}>
          <Ionicons
            name={iconName}
            size={moderateScale(64)}
            color={iconColor}
            style={styles.icon}
            testID="biometric-type-icon"
            accessible
            accessibilityLabel={`${biometricType} authentication`}
          />
        </View>
        
        {/* Prompt Content */}
        <View style={styles.contentContainer}>
          <Text 
            style={styles.subtitle} 
            testID="biometric-subtitle"
            accessibilityLabel={subtitle}
          >
            {subtitle}
          </Text>
          
          <Text 
            style={styles.description} 
            testID="biometric-description"
            accessibilityLabel={description}
          >
            {description}
          </Text>
          
          {/* Status Message */}
          {message !== '' && (
            <Text
              style={[
                styles.message,
                status === BiometricStatus.ERROR && styles.errorMessage,
                status === BiometricStatus.SUCCESS && styles.successMessage,
              ]}
              testID="biometric-message"
              accessibilityLabel={message}
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
            >
              {message}
            </Text>
          )}
        </View>
        
        {/* Actions */}
        <View style={styles.actionsContainer}>
          {status === BiometricStatus.IDLE && (
            <Button
              title="Authenticate"
              onPress={handleAuthenticatePress}
              variant={ButtonVariant.PRIMARY}
              isFullWidth
              testID="authenticate-button"
              accessibilityLabel="Authenticate using biometrics"
              accessibilityHint="Double tap to initiate biometric authentication"
            />
          )}
          
          <Button
            title={cancelText}
            onPress={onCancel}
            variant={ButtonVariant.OUTLINE}
            isFullWidth
            testID="cancel-button"
            accessibilityLabel="Cancel biometric authentication"
            accessibilityHint="Double tap to cancel and close this dialog"
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.m,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing.l,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginBottom: spacing.xs,
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  subtitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    marginBottom: spacing.xs,
    textAlign: 'center',
    color: colors.text.primary,
  },
  description: {
    fontSize: moderateScale(14),
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.s,
  },
  message: {
    fontSize: moderateScale(14),
    textAlign: 'center',
    marginTop: spacing.xs,
    padding: spacing.xs,
    borderRadius: moderateScale(4),
  },
  errorMessage: {
    color: colors.error[700],
    backgroundColor: colors.error[100],
  },
  successMessage: {
    color: colors.success[700],
    backgroundColor: colors.success[100],
  },
  actionsContainer: {
    width: '100%',
    gap: spacing.s,
  },
});

export default BiometricPrompt;