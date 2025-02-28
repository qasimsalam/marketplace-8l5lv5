/**
 * AI Talent Marketplace - Android App
 *
 * Registration Form Component
 *
 * This component provides a user interface for new users to register on the platform.
 * It includes fields for email, password, name, and role selection, with validation
 * and error handling. It also supports biometric setup options.
 *
 * @version 1.0.0
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react'; // react v18.2.0
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native'; // react-native v0.72.x
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // react-native-vector-icons v^9.2.0
import { Formik } from 'formik'; // formik v^2.4.2
import { Picker } from '@react-native-picker/picker'; // @react-native-picker/picker v^2.4.10

// Internal imports
import Button, { ButtonVariant, ButtonSize } from '../common/Button';
import Input, { InputType, InputRef } from '../common/Input';
import BiometricPrompt from './BiometricPrompt';
import { useAuth } from '../../hooks/useAuth';
import { useBiometrics } from '../../hooks/useBiometrics';
import { RegisterFormValues, UserRole } from '../../types/auth.types';
import { validateRegisterForm, validateEmail } from '../../utils/validation';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/layout';

/**
 * Interface defining props for the RegisterForm component
 */
export interface RegisterFormProps {
  /**
   * Callback function to execute on successful registration
   */
  onSuccess: () => void;

  /**
   * Callback function to execute when the user navigates to the login screen
   */
  onLogin: () => void;

  /**
   * Test ID for automated testing
   */
  testID?: string;
}

/**
 * The main registration form component that handles user registration
 *
 * @param props - The component props
 * @returns Rendered registration form component
 */
export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onLogin,
  testID,
}) => {
  // Initialize useAuth hook to access registration methods
  const auth = useAuth();

  // Initialize useBiometrics hook to check biometric capabilities
  const biometrics = useBiometrics();

  // Create refs for input fields (email, password, confirmPassword, firstName, lastName)
  const emailInputRef = useRef<InputRef>(null);
  const passwordInputRef = useRef<InputRef>(null);
  const confirmPasswordInputRef = useRef<InputRef>(null);
  const firstNameInputRef = useRef<InputRef>(null);
  const lastNameInputRef = useRef<InputRef>(null);

  // Set up local state for form visibility, loading state, and biometric prompt
  const [isBiometricPromptVisible, setIsBiometricPromptVisible] =
    useState<boolean>(false);

  // Create Formik initial values with empty fields and default values
  const initialValues: RegisterFormValues = {
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: UserRole.FREELANCER,
    agreeToTerms: false,
    enableBiometrics: false,
  };

  // Implement form submission handler that calls register function
  const handleSubmit = async (values: RegisterFormValues) => {
    if (values.enableBiometrics && !biometrics.isAvailable) {
      setIsBiometricPromptVisible(true);
      return;
    }

    const success = await auth.register(values);
    if (success) {
      onSuccess();
    }
  };

  // Handle biometric setup options based on device capabilities
  const handleBiometricSetup = () => {
    setIsBiometricPromptVisible(false);
  };

  // Render form with all required input fields (email, password, name fields)
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Formik
          initialValues={initialValues}
          validate={validateRegisterForm}
          onSubmit={handleSubmit}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            touched,
            setFieldValue,
          }) => (
            <View style={styles.form}>
              {/* Email Input */}
              <Input
                label="Email"
                placeholder="Enter your email"
                onChangeText={handleChange('email')}
                onBlur={handleBlur('email')}
                value={values.email}
                error={touched.email && errors.email}
                type={InputType.EMAIL}
                isRequired
                testID="email-input"
                ref={emailInputRef}
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                returnKeyType="next"
              />

              {/* Password Input */}
              <Input
                label="Password"
                placeholder="Enter your password"
                onChangeText={handleChange('password')}
                onBlur={handleBlur('password')}
                value={values.password}
                error={touched.password && errors.password}
                type={InputType.PASSWORD}
                isRequired
                testID="password-input"
                ref={passwordInputRef}
                onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                returnKeyType="next"
              />

              {/* Confirm Password Input */}
              <Input
                label="Confirm Password"
                placeholder="Confirm your password"
                onChangeText={handleChange('confirmPassword')}
                onBlur={handleBlur('confirmPassword')}
                value={values.confirmPassword}
                error={touched.confirmPassword && errors.confirmPassword}
                type={InputType.PASSWORD}
                isRequired
                testID="confirm-password-input"
                ref={confirmPasswordInputRef}
                onSubmitEditing={() => firstNameInputRef.current?.focus()}
                returnKeyType="next"
              />

              {/* First Name Input */}
              <Input
                label="First Name"
                placeholder="Enter your first name"
                onChangeText={handleChange('firstName')}
                onBlur={handleBlur('firstName')}
                value={values.firstName}
                error={touched.firstName && errors.firstName}
                type={InputType.TEXT}
                isRequired
                testID="first-name-input"
                ref={firstNameInputRef}
                onSubmitEditing={() => lastNameInputRef.current?.focus()}
                returnKeyType="next"
              />

              {/* Last Name Input */}
              <Input
                label="Last Name"
                placeholder="Enter your last name"
                onChangeText={handleChange('lastName')}
                onBlur={handleBlur('lastName')}
                value={values.lastName}
                error={touched.lastName && errors.lastName}
                type={InputType.TEXT}
                isRequired
                testID="last-name-input"
                ref={lastNameInputRef}
                returnKeyType="done"
              />

              {/* Role Selection Dropdown with all available roles */}
              <View style={styles.roleContainer}>
                <Text style={styles.roleLabel}>Role</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={values.role}
                    onValueChange={(itemValue) => {
                      if (itemValue) {
                        setFieldValue('role', itemValue);
                      }
                    }}
                    style={styles.picker}
                    dropdownIconColor={colors.primary[600]}
                    testID="role-picker"
                  >
                    <Picker.Item
                      label="Freelancer"
                      value={UserRole.FREELANCER}
                    />
                    <Picker.Item label="Employer" value={UserRole.EMPLOYER} />
                  </Picker>
                </View>
              </View>

              {/* Terms Agreement Checkbox with link to terms page */}
              <View style={styles.termsContainer}>
                <Switch
                  value={values.agreeToTerms}
                  onValueChange={(value) => setFieldValue('agreeToTerms', value)}
                  trackColor={{
                    false: colors.gray[400],
                    true: colors.primary[600],
                  }}
                  thumbColor={
                    values.agreeToTerms ? colors.white : colors.gray[100]
                  }
                  testID="terms-switch"
                />
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <TouchableOpacity>
                    <Text style={styles.termsLink}>Terms and Conditions</Text>
                  </TouchableOpacity>
                </Text>
                {touched.agreeToTerms && errors.agreeToTerms ? (
                  <Text style={styles.errorText}>{errors.agreeToTerms}</Text>
                ) : null}
              </View>

              {/* Biometric Setup Option if available on device */}
              {biometrics.isAvailable && (
                <View style={styles.biometricsContainer}>
                  <Text style={styles.biometricsLabel}>Enable Biometrics?</Text>
                  <Switch
                    value={values.enableBiometrics}
                    onValueChange={(value) => {
                      setFieldValue('enableBiometrics', value);
                    }}
                    trackColor={{
                      false: colors.gray[400],
                      true: colors.primary[600],
                    }}
                    thumbColor={
                      values.enableBiometrics ? colors.white : colors.gray[100]
                    }
                    testID="biometrics-switch"
                  />
                </View>
              )}

              {/* Register Button with loading state */}
              <Button
                title="Register"
                onPress={handleSubmit}
                variant={ButtonVariant.PRIMARY}
                size={ButtonSize.LARGE}
                isDisabled={auth.isLoading}
                isLoading={auth.isLoading}
                testID="register-button"
              />

              {/* Provide login alternative option for existing users */}
              <TouchableOpacity
                style={styles.loginLinkContainer}
                onPress={onLogin}
                testID="login-link"
              >
                <Text style={styles.loginLinkText}>
                  Already have an account? <Text style={styles.loginLink}>Login</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Formik>
      </ScrollView>

      {/* Implement form validation with validateRegisterForm */}
      <BiometricPrompt
        visible={isBiometricPromptVisible}
        onClose={() => setIsBiometricPromptVisible(false)}
        onSuccess={handleBiometricSetup}
        onError={(error) => console.error('Biometric setup error:', error)}
        testID="biometric-prompt"
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: spacing.m,
    justifyContent: 'center',
  },
  form: {
    width: '100%',
  },
  roleContainer: {
    marginBottom: spacing.m,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.gray[400],
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: colors.text.primary,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  termsText: {
    marginLeft: spacing.s,
    fontSize: 14,
    color: colors.text.secondary,
  },
  termsLink: {
    color: colors.primary[600],
    textDecorationLine: 'underline',
  },
  biometricsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.m,
  },
  biometricsLabel: {
    fontSize: 16,
    color: colors.text.primary,
  },
  loginLinkContainer: {
    marginTop: spacing.m,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  loginLink: {
    color: colors.primary[600],
    textDecorationLine: 'underline',
  },
  errorText: {
    color: colors.error[500],
    marginTop: spacing.xs,
  },
});

export default RegisterForm;