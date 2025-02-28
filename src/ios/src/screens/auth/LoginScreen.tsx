import React, { useState, useEffect, useCallback } from 'react'; // ^18.2.0
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
  KeyboardAvoidingView,
  ImageBackground,
  Animated,
  StatusBar,
} from 'react-native'; // 0.72.x
import { StackScreenProps } from '@react-navigation/stack'; // ^6.3.17
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // ^9.2.0

// Internal imports
import { SafeAreaView, EdgeMode } from '../../components/common/SafeAreaView';
import { LoginForm } from '../../components/auth/LoginForm';
import useAuth from '../../hooks/useAuth';
import useKeyboard from '../../hooks/useKeyboard';
import { colors } from '../../styles/colors';
import { AuthStackParamList } from '../../types/auth.types';

/**
 * Main component for the login screen in the iOS application
 *
 * @param navigation - Navigation object from React Navigation
 * @returns Rendered login screen component
 */
export const LoginScreen: React.FC<StackScreenProps<AuthStackParamList, 'Login'>> = ({
  navigation,
}) => {
  // Extract navigation object from props using destructuring
  const { replace } = navigation;

  // Get authentication state from useAuth hook to check if user is already logged in
  const { isAuthenticated } = useAuth();

  // Get keyboard dismissal function from useKeyboard hook
  const { dismissKeyboard } = useKeyboard();

  // Create animation values for logo and form fade-in effects
  const logoFadeAnim = useRef(new Animated.Value(0)).current;
  const formFadeAnim = useRef(new Animated.Value(0)).current;

  // Set up useEffect to start animations when component mounts
  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoFadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(formFadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, [logoFadeAnim, formFadeAnim]);

  // Define a function to handle successful login
  const handleLoginSuccess = useCallback(() => {
    // Navigate to the main app screen after successful login
    replace('Main');
  }, [replace]);

  // Define a function to navigate to registration screen
  const handleRegisterPress = useCallback(() => {
    // Navigate to the registration screen
    navigation.navigate('Register');
  }, [navigation]);

  // Define a function to navigate to forgot password screen
  const handleForgotPasswordPress = useCallback(() => {
    // Navigate to the forgot password screen
    navigation.navigate('ForgotPassword');
  }, [navigation]);

  // Create a TouchableWithoutFeedback wrapper to dismiss keyboard when tapping outside the form
  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
      {/* Render a SafeAreaView as the container with appropriate edge insets */}
      <SafeAreaView style={styles.container} edges={EdgeMode.NONE}>
        <StatusBar barStyle="light-content" backgroundColor={colors.transparent} translucent={true} />
        {/* Render a KeyboardAvoidingView to handle keyboard appearance */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* Render an ImageBackground with a branded background image */}
          <ImageBackground
            source={require('../../../assets/images/login-bg.png')} // Replace with your actual background image
            style={styles.backgroundImage}
            resizeMode="cover"
          >
            <View style={styles.content}>
              {/* Render an animated logo with the company brand */}
              <Animated.View style={[styles.logoContainer, { opacity: logoFadeAnim }]}>
                <Image
                  source={require('../../../assets/images/logo.png')} // Replace with your actual logo
                  style={styles.logo}
                  resizeMode="contain"
                  accessibilityLabel="AI Talent Marketplace Logo"
                />
              </Animated.View>

              {/* Render the LoginForm component with necessary props and callbacks */}
              <Animated.View style={[styles.formContainer, { opacity: formFadeAnim }]}>
                <LoginForm
                  onSuccess={handleLoginSuccess}
                  onForgotPassword={handleForgotPasswordPress}
                  onRegister={handleRegisterPress}
                />
              </Animated.View>

              {/* Render a registration prompt with a button to navigate to registration screen */}
              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>Don't have an account?</Text>
                <TouchableOpacity onPress={handleRegisterPress} testID="register-link">
                  <Text style={styles.registerLinkText}>Register</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ImageBackground>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

// Configure StatusBar appearance to match the design

// Styles for the LoginScreen component
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    marginBottom: 30,
  },
  logo: {
    width: 200,
    height: 100,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  registerText: {
    color: colors.white,
    marginRight: 5,
  },
  registerLinkText: {
    color: colors.accent[500],
    fontWeight: 'bold',
  },
});

// Export the LoginScreen component for use in navigation
export default LoginScreen;