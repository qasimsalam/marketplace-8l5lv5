/**
 * AI Talent Marketplace - Android App
 *
 * Registration Screen Component
 *
 * This component provides a user interface for new users to register on the platform.
 * It includes a form for email, password, name, and role selection, with validation
 * and error handling. It also supports biometric setup options.
 *
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react'; // react v18.2.0
import {
  StyleSheet,
  View,
  Text,
  Image,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native'; // react-native v0.72.x
import { useNavigation, NativeStackNavigationProp } from '@react-navigation/native-stack'; // @react-navigation/native v^6.1.7, @react-navigation/native-stack v^6.9.13

// Internal imports
import RegisterForm from '../../components/auth/RegisterForm';
import SafeAreaView, { EdgeMode } from '../../components/common/SafeAreaView';
import Button, { ButtonVariant } from '../../components/common/Button';
import { Toast, ToastType } from '../../components/common/Toast';
import { useAuth } from '../../hooks/useAuth';
import { useBiometrics } from '../../hooks/useBiometrics';
import { useNotifications } from '../../hooks/useNotifications';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/layout';

/**
 * Type definition for the navigation prop used in this screen
 */
type RegisterScreenNavigationProp = NativeStackNavigationProp<
  {
    Register: undefined;
  },
  'Register'
>;

/**
 * The main register screen component for the application
 *
 * @returns Rendered register screen component
 */
const RegisterScreen: React.FC = () => {
  // Initialize navigation hook for navigating between screens
  const navigation = useNavigation<RegisterScreenNavigationProp>();

  // Initialize authentication hook for accessing registration functionality
  const auth = useAuth();

  // Initialize biometrics hook to check for hardware availability
  const biometrics = useBiometrics();

  // Initialize notifications hook for permission requests during onboarding
  const notifications = useNotifications();

  // Set up local state for toast notifications
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  // Define navigation handlers for login navigation
  const handleLoginNavigation = () => {
    navigation.navigate('Login');
  };

  // Define registration success handler to navigate to dashboard
  const handleRegistrationSuccess = () => {
    setToast({ type: ToastType.SUCCESS, message: 'Registration successful!' });
    setTimeout(() => {
      navigation.navigate('Dashboard');
    }, 2000);
  };

  // Set up useEffect to handle biometric and notification permissions
  useEffect(() => {
    // Request notification permissions on mount
    notifications.requestPermission();
  }, [notifications]);

  // Render safe area view with appropriate edge insets
  return (
    <SafeAreaView edges={EdgeMode.ALL} style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Render background image and application logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../../assets/images/logo.png')} // Replace with your actual logo path
              style={styles.logo}
              resizeMode="contain"
              accessible={true}
              accessibilityLabel="AI Talent Marketplace Logo"
            />
          </View>

          {/* Render welcome text and application description */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join the AI Talent Marketplace and connect with top AI professionals.
            </Text>
          </View>

          {/* Render RegisterForm component with appropriate handlers */}
          <RegisterForm
            onSuccess={handleRegistrationSuccess}
            onLogin={handleLoginNavigation}
            testID="register-form"
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Render toast notifications for feedback */}
      {toast && (
        <Toast
          id="registration-toast"
          message={toast.message}
          type={toast.type}
          duration={3000}
          onClose={() => setToast(null)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: spacing.m,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  logo: {
    width: 200,
    height: 100,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.s,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

export default RegisterScreen;