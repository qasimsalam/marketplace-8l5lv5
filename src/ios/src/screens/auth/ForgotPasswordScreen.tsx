import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableWithoutFeedback, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableOpacity,
  StatusBar,
  ScrollView
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Formik } from 'formik';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// Internal imports
import { SafeAreaView, EdgeMode } from '../../components/common/SafeAreaView';
import { Input, InputType } from '../../components/common/Input';
import { Button, ButtonVariant, ButtonSize } from '../../components/common/Button';
import { Spinner, SpinnerSize } from '../../components/common/Spinner';
import useAuth from '../../hooks/useAuth';
import { useKeyboard } from '../../hooks/useKeyboard';
import { colors } from '../../styles/colors';
import { validateForgotPasswordForm } from '../../utils/validation';
import { AuthStackParamList, ForgotPasswordFormValues } from '../../types/auth.types';

// Initial form values
const initialValues: ForgotPasswordFormValues = {
  email: '',
};

/**
 * Screen component for requesting a password reset link
 * 
 * This screen allows users to enter their email address to receive a password reset link.
 * It includes form validation, error handling, and accessibility features.
 */
const ForgotPasswordScreen = ({ 
  navigation 
}: StackScreenProps<AuthStackParamList, 'ForgotPassword'>) => {
  // Get auth functionality from useAuth hook
  const { forgotPassword, loading, error, clearError } = useAuth();
  
  // Get keyboard dismissal function
  const { dismissKeyboard } = useKeyboard();
  
  // State for success message
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Clear error when component unmounts or on navigation change
  useEffect(() => {
    return () => {
      if (error) {
        clearError();
      }
    };
  }, [clearError, error]);
  
  // Handle form submission
  const handleSubmit = useCallback(async (values: ForgotPasswordFormValues) => {
    // Clear previous error and success states
    if (error) clearError();
    setSuccessMessage(null);
    
    try {
      const result = await forgotPassword(values.email);
      if (result.success) {
        setSuccessMessage(result.message || 'Password reset email sent. Please check your inbox for further instructions.');
      }
    } catch (err) {
      // Error will be handled by useAuth hook
      console.error('Password reset request failed:', err);
    }
  }, [forgotPassword, error, clearError]);
  
  // Navigate back to login screen
  const handleBackToLogin = useCallback(() => {
    navigation.navigate('Login');
  }, [navigation]);

  // Validation function for Formik that uses validateForgotPasswordForm
  const validate = useCallback((values: ForgotPasswordFormValues) => {
    const validationResult = validateForgotPasswordForm(values);
    // Clear success message when user modifies the form after a successful submission
    if (successMessage && values.email.trim().length > 0) {
      setSuccessMessage(null);
    }
    return validationResult.isValid ? {} : validationResult.errors;
  }, [successMessage]);

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <SafeAreaView edges={EdgeMode.TOP} style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView 
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header with back button */}
            <View style={styles.headerContainer}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackToLogin}
                accessibilityLabel="Back to login"
                accessibilityRole="button"
                accessibilityHint="Navigate back to the login screen"
                testID="back-button"
              >
                <MaterialIcons
                  name="arrow-back-ios"
                  size={24}
                  color={colors.text.primary}
                />
              </TouchableOpacity>
              <Text 
                style={styles.title}
                accessibilityRole="header"
              >
                Forgot Password
              </Text>
            </View>
            
            <Text style={styles.description}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>
            
            {/* Success message */}
            {successMessage && (
              <View 
                style={styles.successMessage}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                <Text style={{ color: colors.success[500] }}>
                  {successMessage}
                </Text>
              </View>
            )}
            
            {/* Error message */}
            {error && (
              <View 
                style={styles.errorMessage}
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
              >
                <Text style={{ color: colors.error[500] }}>
                  {error}
                </Text>
              </View>
            )}
            
            {/* Form */}
            <Formik
              initialValues={initialValues}
              validate={validate}
              onSubmit={handleSubmit}
            >
              {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                <View style={styles.formContainer}>
                  <Input
                    label="Email Address"
                    placeholder="Enter your email"
                    value={values.email}
                    onChangeText={handleChange('email')}
                    onBlur={handleBlur('email')}
                    error={touched.email && errors.email ? errors.email : undefined}
                    type={InputType.EMAIL}
                    isRequired={true}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoCorrect={false}
                    testID="forgot-password-email-input"
                    accessibilityLabel="Email address input"
                  />
                  
                  <Button
                    text="Send Reset Link"
                    variant={ButtonVariant.PRIMARY}
                    size={ButtonSize.LARGE}
                    isFullWidth={true}
                    onPress={() => handleSubmit()}
                    isLoading={loading}
                    disabled={loading || !!successMessage}
                    testID="forgot-password-submit-button"
                    accessibilityLabel="Send password reset link"
                  />
                </View>
              )}
            </Formik>
            
            {/* Return to login link */}
            <View style={styles.loginLinkContainer}>
              <TouchableOpacity
                onPress={handleBackToLogin}
                testID="back-to-login-button"
                accessibilityLabel="Return to login"
                accessibilityRole="button"
                accessibilityHint="Navigate back to the login screen"
              >
                <Text style={styles.loginLinkText}>
                  Return to Login
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  contentContainer: {
    padding: 24,
    flexGrow: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  description: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 24,
  },
  formContainer: {
    marginTop: 12,
  },
  successMessage: {
    backgroundColor: colors.success[50],
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorMessage: {
    backgroundColor: colors.error[50],
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  loginLinkContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginLinkText: {
    color: colors.primary[600],
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;