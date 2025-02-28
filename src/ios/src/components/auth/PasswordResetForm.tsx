import React, { useState, useEffect, useRef } from 'react'; // ^18.2.0
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView 
} from 'react-native'; // 0.72.x
import { Formik } from 'formik'; // ^2.4.2

import { ResetPasswordFormValues } from '../../types/auth.types';
import useAuth from '../../hooks/useAuth';
import { Button, ButtonVariant, ButtonSize } from '../common/Button';
import { Input, InputType } from '../common/Input';
import { Spinner, SpinnerSize } from '../common/Spinner';
import { validateResetPasswordForm } from '../../utils/validation';
import { colors } from '../../styles/colors';
import { useKeyboard } from '../../hooks/useKeyboard';

/**
 * Interface defining props for the PasswordResetForm component
 */
export interface PasswordResetFormProps {
  /** The password reset token received via email or deeplink */
  token: string;
  /** Callback function to be called when password reset is successful */
  onSuccess: () => void;
  /** Optional test ID for automated testing */
  testID?: string;
}

// Initial form values (without token)
const initialValues = {
  password: '',
  confirmPassword: ''
};

/**
 * A form component for resetting user password in the iOS application
 * 
 * This component allows users to create a new password after requesting
 * a password reset. It handles validation, error display, and integration
 * with the authentication system.
 */
const PasswordResetForm: React.FC<PasswordResetFormProps> = ({
  token,
  onSuccess,
  testID = 'password-reset-form'
}) => {
  // Get auth-related functionality from the useAuth hook
  const { resetPassword, error, loading, clearError } = useAuth();
  
  // Get keyboard management functionality
  const { dismissKeyboard } = useKeyboard();
  
  // Local state for form validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // References for input fields to allow programmatic focus
  const passwordInputRef = useRef<any>(null);
  const confirmPasswordInputRef = useRef<any>(null);
  
  // Clear authentication errors when component unmounts
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);
  
  /**
   * Handles form submission and password reset process
   * @param values Form values containing password and confirmPassword
   */
  const handleResetPassword = async (values: { password: string; confirmPassword: string }) => {
    // Dismiss keyboard for better UX
    dismissKeyboard();
    
    // Create complete form values with token from props
    const formValues: ResetPasswordFormValues = {
      token,
      password: values.password,
      confirmPassword: values.confirmPassword
    };
    
    // Validate the form using validation utility
    const validation = validateResetPasswordForm(formValues);
    
    // If validation fails, display errors
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }
    
    // Clear form errors if validation passes
    setFormErrors({});
    
    try {
      // Call the resetPassword function from useAuth
      const result = await resetPassword(formValues);
      
      // If request is successful, call the onSuccess callback
      if (result.success) {
        onSuccess();
      }
    } catch (err) {
      // Error handling is managed by the useAuth hook (sets error state)
      console.error('Password reset failed:', err);
    }
  };
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        testID={testID}
        accessible={true}
        accessibilityLabel="Password reset form"
      >
        <Formik
          initialValues={initialValues}
          onSubmit={handleResetPassword}
        >
          {({ values, handleChange, handleSubmit, errors: formikErrors }) => (
            <View style={styles.formContainer}>
              <Text style={styles.title} accessibilityRole="header">Reset Password</Text>
              <Text style={styles.subtitle}>
                Please enter your new password below.
              </Text>
              
              {/* Password input */}
              <Input
                ref={passwordInputRef}
                label="New Password"
                value={values.password}
                onChangeText={handleChange('password')}
                placeholder="Enter new password"
                type={InputType.PASSWORD}
                isRequired
                error={formErrors.password || formikErrors.password}
                maxLength={64}
                autoCapitalize="none"
                autoCorrect={false}
                testID={`${testID}-password-input`}
                accessibilityLabel="New Password"
                onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
              />
              
              {/* Confirm Password input */}
              <Input
                ref={confirmPasswordInputRef}
                label="Confirm Password"
                value={values.confirmPassword}
                onChangeText={handleChange('confirmPassword')}
                placeholder="Confirm new password"
                type={InputType.PASSWORD}
                isRequired
                error={formErrors.confirmPassword || formikErrors.confirmPassword}
                maxLength={64}
                autoCapitalize="none"
                autoCorrect={false}
                testID={`${testID}-confirm-password-input`}
                accessibilityLabel="Confirm Password"
                onSubmitEditing={() => handleSubmit()}
              />
              
              {/* Password requirements helper text */}
              <Text style={styles.helperText} accessibilityLabel="Password requirements">
                Password must be at least 8 characters and include uppercase, lowercase, 
                number, and special character.
              </Text>
              
              {/* API error message */}
              {error && (
                <View style={styles.errorContainer} accessibilityLiveRegion="polite">
                  <Text style={styles.errorText} testID={`${testID}-error-message`}>
                    {error}
                  </Text>
                </View>
              )}
              
              {/* Submit button */}
              <Button
                text="Reset Password"
                isLoading={loading}
                onPress={handleSubmit}
                variant={ButtonVariant.PRIMARY}
                size={ButtonSize.LARGE}
                isFullWidth
                style={styles.button}
                testID={`${testID}-submit-button`}
                accessibilityLabel="Reset Password Button"
                disabled={loading}
              />
            </View>
          )}
        </Formik>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.background.primary
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24
  },
  formContainer: {
    width: '100%'
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 24
  },
  helperText: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: 8,
    marginBottom: 24
  },
  errorContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.error[50]
  },
  errorText: {
    color: colors.error[600],
    fontSize: 14
  },
  button: {
    marginTop: 16
  }
});

export default PasswordResetForm;