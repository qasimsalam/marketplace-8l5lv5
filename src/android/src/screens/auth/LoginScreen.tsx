/**
 * AI Talent Marketplace - Login Screen
 *
 * A comprehensive login screen for the AI Talent Marketplace Android mobile application
 * that provides user authentication functionality. It presents a visually appealing
 * interface with email/password login and biometric authentication options, includes
 * validation, error handling, and navigation to other authentication-related screens.
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
  ScrollView, // v0.72.x
} from 'react-native';
import { useNavigation, NativeStackNavigationProp } from '@react-navigation/native'; // @react-navigation/native ^6.1.7, @react-navigation/native-stack ^6.9.13

// Internal imports
import LoginForm from '../../components/auth/LoginForm';
import SafeAreaView, { EdgeMode } from '../../components/common/SafeAreaView';
import { useAuth } from '../../hooks/useAuth';
import { useBiometrics } from '../../hooks/useBiometrics';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/layout';

/**
 * Type definition for the navigation prop
 */
type LoginScreenNavigationProp = NativeStackNavigationProp<any, 'Login'>;

/**
 * The main login screen component for the application
 *
 * @returns Rendered login screen component
 */
const LoginScreen: React.FC = () => {
  // Initialize navigation hook for navigating between screens
  const navigation = useNavigation<LoginScreenNavigationProp>();

  // Initialize authentication hook for detecting auth state
  const auth = useAuth();

  // Initialize biometrics hook to check for hardware availability
  const biometrics = useBiometrics();

  // Set up useEffect to handle authentication state changes
  useEffect(() => {
    if (auth.isAuthenticated) {
      // Navigate to the dashboard if already authenticated
      navigation.navigate('Dashboard' as never);
    }
  }, [auth.isAuthenticated, navigation]);

  // Set up useEffect to check biometric availability
  useEffect(() => {
    biometrics.checkAvailability();
  }, [biometrics]);

  /**
   * Define navigation handlers for register and forgot password
   */
  const handleRegisterPress = useCallback(() => {
    navigation.navigate('Register' as never);
  }, [navigation]);

  const handleForgotPasswordPress = useCallback(() => {
    navigation.navigate('ForgotPassword' as never);
  }, [navigation]);

  /**
   * Define login success handler to navigate to dashboard
   */
  const handleLoginSuccess = useCallback(() => {
    navigation.navigate('Dashboard' as never);
  }, [navigation]);

  return (
    <SafeAreaView edges={EdgeMode.ALL} style={styles.safeArea}>
      <StatusBar
        backgroundColor={colors.background.primary}
        barStyle="dark-content"
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : spacing.xl}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Background Image */}
          <Image
            source={require('../../../assets/images/login-bg.png')} // Replace with your actual image path
            style={styles.backgroundImage}
            resizeMode="cover"
          />

          {/* Application Logo */}
          <Image
            source={require('../../../assets/images/logo.png')} // Replace with your actual logo path
            style={styles.logo}
            resizeMode="contain"
          />

          {/* Welcome Text and Application Description */}
          <Text style={styles.welcomeText}>Welcome to AI Talent Marketplace</Text>
          <Text style={styles.descriptionText}>
            Find verified AI professionals for your projects.
          </Text>

          {/* LoginForm Component */}
          <LoginForm
            onSuccess={handleLoginSuccess}
            onForgotPassword={handleForgotPasswordPress}
            onRegister={handleRegisterPress}
            testID="login-form"
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.m,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  logo: {
    width: '80%',
    height: 100,
    marginBottom: spacing.l,
  },
  welcomeText: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.s,
    textAlign: 'center',
  },
  descriptionText: {
    fontSize: moderateScale(16),
    color: colors.text.secondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
});

export default LoginScreen;