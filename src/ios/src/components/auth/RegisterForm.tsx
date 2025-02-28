/**
 * A reusable registration form component for the AI Talent Marketplace iOS application.
 * Provides a comprehensive user registration interface with validation, role selection,
 * and biometric authentication setup options.
 */
import React, { useState, useEffect, useCallback } from 'react'; // ^18.2.0
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native'; // v0.72.x
import { useNavigation } from '@react-navigation/native'; // ^6.1.7
import { Formik } from 'formik'; // ^2.4.2

// Internal imports - types
import { RegisterFormValues, UserRole } from '../../types/auth.types';

// Internal imports - components
import { Input, InputType } from '../common/Input';
import { Button, ButtonVariant, ButtonSize } from '../common/Button';
import { SafeAreaView } from '../common/SafeAreaView';
import { Spinner } from '../common/Spinner';

// Internal imports - hooks and utilities
import useAuth from '../../hooks/useAuth';
import { validateRegisterForm } from '../../utils/validation';
import { colors } from '../../styles/colors';
import { textVariants } from '../../styles/typography';
import { layout, spacing } from '../../styles/layout';

/**
 * Props interface for the registration form component
 */
export interface RegisterFormProps {
  /**
   * Callback function to execute on successful registration
   */
  onSuccess?: () => void;
  
  /**
   * Callback function to navigate to login screen
   */
  redirectToLogin?: () => void;
}

/**
 * Registration form component with validation and role selection
 */
export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  redirectToLogin
}) => {
  // Initialize navigation for redirecting after registration
  const navigation = useNavigation();
  
  // Get authentication functionality from useAuth hook
  const { register, loading, error, biometricType } = useAuth();
  
  // State for biometric availability
  const [biometricsAvailable, setBiometricsAvailable] = useState<boolean>(biometricType !== 'none');
  
  // Update biometrics availability if biometricType changes
  useEffect(() => {
    setBiometricsAvailable(biometricType !== 'none');
  }, [biometricType]);
  
  // Define initial form values
  const initialValues: RegisterFormValues = {
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    role: UserRole.FREELANCER,
    agreeToTerms: false,
    enableBiometrics: false
  };
  
  // Handle form submission
  const handleSubmit = useCallback(async (values: RegisterFormValues) => {
    try {
      await register(values);
      
      // Show success message
      Alert.alert(
        'Registration Successful',
        'Your account has been created successfully!',
        [{ text: 'OK', onPress: onSuccess }]
      );
    } catch (error) {
      // Error handling is done by the useAuth hook
      console.error('Registration failed:', error);
    }
  }, [register, onSuccess]);
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.formContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Formik
          initialValues={initialValues}
          onSubmit={handleSubmit}
          validate={validateRegisterForm}
          validateOnBlur={true}
          validateOnChange={false}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => (
            <View style={styles.formContainer}>
              {/* Personal Information Section */}
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <View style={styles.fieldContainer}>
                <Input
                  label="First Name"
                  value={values.firstName}
                  onChangeText={handleChange('firstName')}
                  onBlur={handleBlur('firstName')}
                  placeholder="Enter your first name"
                  error={touched.firstName ? errors.firstName : undefined}
                  isRequired={true}
                  autoCapitalize="words"
                  testID="register-first-name"
                />
              </View>
              
              <View style={styles.fieldContainer}>
                <Input
                  label="Last Name"
                  value={values.lastName}
                  onChangeText={handleChange('lastName')}
                  onBlur={handleBlur('lastName')}
                  placeholder="Enter your last name"
                  error={touched.lastName ? errors.lastName : undefined}
                  isRequired={true}
                  autoCapitalize="words"
                  testID="register-last-name"
                />
              </View>
              
              {/* Account Information Section */}
              <Text style={styles.sectionTitle}>Account Information</Text>
              <View style={styles.fieldContainer}>
                <Input
                  label="Email Address"
                  value={values.email}
                  onChangeText={handleChange('email')}
                  onBlur={handleBlur('email')}
                  placeholder="Enter your email address"
                  error={touched.email ? errors.email : undefined}
                  type={InputType.EMAIL}
                  isRequired={true}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  testID="register-email"
                />
              </View>
              
              <View style={styles.fieldContainer}>
                <Input
                  label="Password"
                  value={values.password}
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                  placeholder="Create a password"
                  error={touched.password ? errors.password : undefined}
                  type={InputType.PASSWORD}
                  isRequired={true}
                  secureTextEntry={true}
                  testID="register-password"
                />
              </View>
              
              <View style={styles.fieldContainer}>
                <Input
                  label="Confirm Password"
                  value={values.confirmPassword}
                  onChangeText={handleChange('confirmPassword')}
                  onBlur={handleBlur('confirmPassword')}
                  placeholder="Confirm your password"
                  error={touched.confirmPassword ? errors.confirmPassword : undefined}
                  type={InputType.PASSWORD}
                  isRequired={true}
                  secureTextEntry={true}
                  testID="register-confirm-password"
                />
              </View>
              
              {/* Role Selection Section */}
              <Text style={styles.sectionTitle}>Select Your Role</Text>
              <View style={styles.roleSelector}>
                <TouchableOpacity 
                  style={[
                    styles.roleButton,
                    values.role === UserRole.FREELANCER && styles.roleButtonSelected
                  ]}
                  onPress={() => setFieldValue('role', UserRole.FREELANCER)}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: values.role === UserRole.FREELANCER }}
                  testID="register-role-freelancer"
                >
                  <Text style={styles.roleButtonText}>AI Professional</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.roleButton,
                    values.role === UserRole.EMPLOYER && styles.roleButtonSelected
                  ]}
                  onPress={() => setFieldValue('role', UserRole.EMPLOYER)}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: values.role === UserRole.EMPLOYER }}
                  testID="register-role-employer"
                >
                  <Text style={styles.roleButtonText}>Client</Text>
                </TouchableOpacity>
              </View>
              
              {/* Terms and Conditions Agreement */}
              <View style={styles.checkboxContainer}>
                <Switch
                  value={values.agreeToTerms}
                  onValueChange={(value) => setFieldValue('agreeToTerms', value)}
                  trackColor={{ false: colors.gray[300], true: colors.primary[500] }}
                  thumbColor={values.agreeToTerms ? colors.primary[600] : colors.gray[100]}
                  testID="register-agree-terms"
                />
                <Text style={[textVariants.paragraph, { marginLeft: 10 }]}>
                  I agree to the{' '}
                  <Text style={styles.link} onPress={() => Alert.alert('Terms & Conditions', 'Terms and conditions would be displayed here.')}>
                    Terms and Conditions
                  </Text>
                </Text>
              </View>
              {touched.agreeToTerms && errors.agreeToTerms && (
                <Text style={styles.errorText}>{errors.agreeToTerms}</Text>
              )}
              
              {/* Biometric Authentication Option */}
              {biometricsAvailable && (
                <View style={styles.checkboxContainer}>
                  <Switch
                    value={values.enableBiometrics}
                    onValueChange={(value) => setFieldValue('enableBiometrics', value)}
                    trackColor={{ false: colors.gray[300], true: colors.primary[500] }}
                    thumbColor={values.enableBiometrics ? colors.primary[600] : colors.gray[100]}
                    testID="register-enable-biometrics"
                  />
                  <Text style={[textVariants.paragraph, { marginLeft: 10 }]}>
                    Enable {biometricType === 'face' ? 'Face ID' : 'Touch ID'} for future logins
                  </Text>
                </View>
              )}
              
              {/* Display API error message if any */}
              {error && <Text style={styles.errorText}>{error}</Text>}
              
              {/* Register Button */}
              <Button
                text="Create Account"
                variant={ButtonVariant.PRIMARY}
                size={ButtonSize.LARGE}
                isFullWidth={true}
                onPress={handleSubmit}
                isLoading={loading}
                disabled={loading}
                style={{ marginTop: 20 }}
                testID="register-submit"
              />
              
              {/* Login Link */}
              <View style={styles.loginLinkContainer}>
                <Text style={textVariants.paragraph}>
                  Already have an account?{' '}
                </Text>
                <TouchableOpacity onPress={redirectToLogin} testID="register-to-login">
                  <Text style={styles.link}>Log In</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Formik>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  formContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    ...textVariants.heading5,
    marginTop: 20,
    marginBottom: 8,
  },
  checkboxContainer: {
    ...layout.row,
    alignItems: 'center',
    marginVertical: 16,
  },
  link: {
    color: colors.primary[600],
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  errorText: {
    ...textVariants.caption,
    color: colors.error[500],
    marginVertical: 4,
  },
  roleSelector: {
    ...layout.row,
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  roleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray[300],
    alignItems: 'center',
    marginHorizontal: 8,
  },
  roleButtonSelected: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[600],
  },
  roleButtonText: {
    ...textVariants.button,
    fontWeight: '500',
  },
  loginLinkContainer: {
    ...layout.row,
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
});