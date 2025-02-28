import React, { useState, useEffect, useRef } from 'react'; // ^18.2.0
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image
} from 'react-native'; // 0.72.x
import { Formik } from 'formik'; // ^2.4.2

// Internal imports
import { LoginFormValues } from '../../types/auth.types';
import useAuth from '../../hooks/useAuth';
import { Button, ButtonVariant, ButtonSize } from '../common/Button';
import { Input, InputType } from '../common/Input';
import BiometricPrompt from './BiometricPrompt';
import useBiometrics from '../../hooks/useBiometrics';
import { validateLoginForm } from '../../utils/validation';
import { Spinner, SpinnerSize } from '../common/Spinner';
import { SafeAreaView } from '../common/SafeAreaView';
import { colors } from '../../styles/colors';
import { textVariants } from '../../styles/typography';
import { useKeyboard } from '../../hooks/useKeyboard';

/**
 * Interface defining props for the LoginForm component
 */
export interface LoginFormProps {
  /**
   * Function called when login is successful
   */
  onSuccess: () => void;
  /**
   * Function called when the "Forgot Password" link is pressed
   */
  onForgotPassword: () => void;
  /**
   * Function called when the "Register" link is pressed
   */
  onRegister: () => void;
  /**
   * Test ID for automated testing
   */
  testID?: string;
}

/**
 * A form component for user authentication in the iOS application
 *
 * @param props - Component props
 * @returns Rendered login form component
 */
const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onForgotPassword,
  onRegister,
  testID = 'login-form',
}) => {
  // Get authentication functionality from useAuth hook
  const { login, loginWithBiometrics, error, loading, clearError } = useAuth();

  // Get biometric capabilities from useBiometrics hook
  const { isAvailable: isBiometricsSupported, biometricType } = useBiometrics();

  // Get keyboard management functions from useKeyboard hook
  const { dismissKeyboard } = useKeyboard();

  // Set up state for form validation errors and biometric prompt visibility
  const [isBiometricPromptVisible, setIsBiometricPromptVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Set up refs for email and password input fields
  const emailInputRef = useRef<Input>(null);
  const passwordInputRef = useRef<Input>(null);

  // Create handleLogin function to submit credentials after validation
  const handleLogin = async (values: LoginFormValues) => {
    dismissKeyboard();
    try {
      await login(values);
      onSuccess();
    } catch (e: any) {
      console.error('Login failed:', e);
    }
  };

  // Create handleBiometricLogin function to trigger biometric authentication
  const handleBiometricLogin = () => {
    dismissKeyboard();
    setIsBiometricPromptVisible(true);
  };

  // Create handleBiometricSuccess function to handle successful biometric authentication
  const handleBiometricSuccess = async () => {
    setIsBiometricPromptVisible(false);
    try {
      await loginWithBiometrics();
      onSuccess();
    } catch (e: any) {
      console.error('Biometric login failed:', e);
    }
  };

  // Create handleBiometricCancel function to handle canceled biometric authentication
  const handleBiometricCancel = () => {
    setIsBiometricPromptVisible(false);
  };

  // Create toggleBiometricPrompt function to show/hide biometric dialog
  const toggleBiometricPrompt = () => {
    setIsBiometricPromptVisible(!isBiometricPromptVisible);
  };

  // Create toggleRememberMe function to handle remember checkbox state
  const toggleRememberMe = () => {
    setRememberMe(!rememberMe);
  };

  // Apply appropriate accessibility labels to all interactive elements
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Formik
          initialValues={{ email: '', password: '', remember: false, useBiometrics: false }}
          validate={validateLoginForm}
          onSubmit={handleLogin}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors }) => (
            <View>
              {/* Render email and password Input components with validation */}
              <Input
                label="Email"
                value={values.email}
                onChangeText={handleChange('email')}
                onBlur={handleBlur('email')}
                placeholder="Enter your email"
                type={InputType.EMAIL}
                error={errors.email}
                isRequired
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                testID={`${testID}-email-input`}
                ref={emailInputRef}
              />
              <Input
                label="Password"
                value={values.password}
                onChangeText={handleChange('password')}
                onBlur={handleBlur('password')}
                placeholder="Enter your password"
                type={InputType.PASSWORD}
                error={errors.password}
                isRequired
                secureTextEntry
                textContentType="password"
                testID={`${testID}-password-input`}
                ref={passwordInputRef}
              />

              {/* Render remember me switch and forgot password link */}
              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={styles.rememberMeContainer}
                  onPress={toggleRememberMe}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: rememberMe }}
                  accessibilityLabel="Remember me"
                  testID={`${testID}-remember-me-button`}
                >
                  <Switch
                    value={rememberMe}
                    onValueChange={toggleRememberMe}
                    accessibilityRole="none"
                    testID={`${testID}-remember-me-switch`}
                  />
                  <Text style={styles.rememberMeText}>Remember me</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onForgotPassword}
                  accessibilityRole="button"
                  accessibilityLabel="Forgot password"
                  testID={`${testID}-forgot-password-button`}
                >
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              {/* Render biometric authentication option when available */}
              {isBiometricsSupported ? (
                <TouchableOpacity
                  style={styles.biometricButton}
                  onPress={handleBiometricLogin}
                  accessibilityRole="button"
                  accessibilityLabel={`Login with ${biometricType}`}
                  testID={`${testID}-biometric-button`}
                >
                  <Image
                    source={require('../../../assets/images/face-id-icon.png')} // Replace with appropriate icon
                    style={styles.biometricIcon}
                  />
                  <Text style={styles.biometricText}>Login with {biometricType}</Text>
                </TouchableOpacity>
              ) : null}

              {/* Render login button with loading state */}
              <Button
                text="Login"
                onPress={handleSubmit}
                disabled={loading}
                isLoading={loading}
                isFullWidth
                testID={`${testID}-login-button`}
              />
            </View>
          )}
        </Formik>

        {/* Render BiometricPrompt component when biometric authentication is requested */}
        <BiometricPrompt
          visible={isBiometricPromptVisible}
          onSuccess={handleBiometricSuccess}
          onCancel={handleBiometricCancel}
          onError={(e) => console.error('Biometric error', e)}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberMeText: {
    marginLeft: 5,
    ...textVariants.paragraphSmall,
  },
  forgotPasswordText: {
    ...textVariants.paragraphSmall,
    color: colors.primary[600],
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginBottom: 20,
    backgroundColor: colors.primary[100],
  },
  biometricIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  biometricText: {
    ...textVariants.buttonSmall,
    color: colors.primary[600],
  },
});

export default LoginForm;