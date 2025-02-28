/**
 * AI Talent Marketplace - Login Form Component
 *
 * A comprehensive login form component for the AI Talent Marketplace Android application
 * that handles user authentication including email/password login and biometric authentication.
 * The component features form validation, error handling, and a seamless integration with the authentication system.
 *
 * @version 1.0.0
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback, // v18.2.0
} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView, // v0.72.x
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // v^9.2.0
import { Formik } from 'formik'; // ^2.4.2

// Internal imports
import Button, { ButtonVariant, ButtonSize } from '../common/Button';
import Input, { InputType, InputRef } from '../common/Input';
import BiometricPrompt from './BiometricPrompt';
import { useAuth } from '../../hooks/useAuth';
import { useBiometrics } from '../../hooks/useBiometrics';
import { LoginFormValues } from '../../types/auth.types';
import { validateLoginForm, validateEmail } from '../../utils/validation';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/layout';

/**
 * Interface defining props for the LoginForm component
 */
export interface LoginFormProps {
  /**
   * Callback function to execute on successful login
   */
  onSuccess: () => void;

  /**
   * Callback function to execute when the "Forgot Password" link is pressed
   */
  onForgotPassword: () => void;

  /**
   * Callback function to execute when the "Register" link is pressed
   */
  onRegister: () => void;

  /**
   * Test ID for automated testing
   */
  testID?: string;
}

/**
 * The main login form component that handles user authentication
 *
 * @param props - The component props
 * @returns Rendered login form component
 */
export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onForgotPassword,
  onRegister,
  testID,
}) => {
  // Initialize useAuth hook to access authentication methods
  const auth = useAuth();

  // Initialize useBiometrics hook to access biometric authentication
  const biometrics = useBiometrics();

  // Create refs for email and password input fields
  const emailInputRef = useRef<InputRef>(null);
  const passwordInputRef = useRef<InputRef>(null);

  // Set up local state for form visibility, loading state, and biometric prompt
  const [isBiometricPromptVisible, setIsBiometricPromptVisible] = useState(false);

  // Create Formik initial values with empty email and password
  const initialValues: LoginFormValues = {
    email: '',
    password: '',
    remember: false,
    useBiometrics: false,
  };

  /**
   * Implement form submission handler that calls login function
   * @param values - Form values
   */
  const handleSubmit = async (values: LoginFormValues) => {
    const success = await auth.login(values);
    if (success) {
      onSuccess();
    }
  };

  /**
   * Implement biometric authentication handler
   */
  const handleBiometricLogin = () => {
    setIsBiometricPromptVisible(true);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : spacing.xl}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Biometric Prompt */}
        <BiometricPrompt
          visible={isBiometricPromptVisible}
          onSuccess={onSuccess}
          onCancel={() => setIsBiometricPromptVisible(false)}
          onError={(error) => auth.setError(error)}
        />

        {/* Formik Form */}
        <Formik
          initialValues={initialValues}
          validationSchema={undefined}
          validate={validateLoginForm}
          onSubmit={handleSubmit}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            touched,
            isValid,
          }) => (
            <View style={styles.formContainer}>
              {/* Email Input */}
              <Input
                label="Email"
                value={values.email}
                onChangeText={handleChange('email')}
                onBlur={handleBlur('email')}
                type={InputType.EMAIL}
                error={touched.email && errors.email ? errors.email : undefined}
                isRequired
                testID="email-input"
                accessibilityLabel="Email address"
                ref={emailInputRef}
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />

              {/* Password Input */}
              <Input
                label="Password"
                value={values.password}
                onChangeText={handleChange('password')}
                onBlur={handleBlur('password')}
                type={InputType.PASSWORD}
                error={
                  touched.password && errors.password ? errors.password : undefined
                }
                isRequired
                testID="password-input"
                accessibilityLabel="Password"
                ref={passwordInputRef}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />

              {/* Login Button */}
              <Button
                title="Login"
                onPress={handleSubmit}
                variant={ButtonVariant.PRIMARY}
                isDisabled={!isValid || auth.isLoading}
                isLoading={auth.isLoading}
                isFullWidth
                testID="login-button"
                accessibilityLabel="Login to your account"
              />

              {/* Biometric Login Option */}
              {biometrics.isAvailable && biometrics.isEnabled && (
                <Button
                  title="Login with Biometrics"
                  onPress={handleBiometricLogin}
                  variant={ButtonVariant.SECONDARY}
                  size={ButtonSize.MEDIUM}
                  isFullWidth
                  testID="biometric-login-button"
                  accessibilityLabel="Login with biometrics"
                  leftIcon={
                    <MaterialIcons
                      name="fingerprint"
                      size={20}
                      color={colors.white}
                    />
                  }
                />
              )}

              {/* Forgot Password Link */}
              <TouchableOpacity
                style={styles.linkContainer}
                onPress={onForgotPassword}
                testID="forgot-password-link"
                accessibilityRole="button"
                accessibilityLabel="Forgot password"
              >
                <Text style={styles.linkText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Register Link */}
              <TouchableOpacity
                style={styles.linkContainer}
                onPress={onRegister}
                testID="register-link"
                accessibilityRole="button"
                accessibilityLabel="Register for an account"
              >
                <Text style={styles.linkText}>Don't have an account? Register</Text>
              </TouchableOpacity>
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
    justifyContent: 'center',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.m,
  },
  formContainer: {
    width: '100%',
  },
  linkContainer: {
    marginTop: spacing.s,
    alignItems: 'center',
  },
  linkText: {
    color: colors.primary[500],
  },
});

export default LoginForm;