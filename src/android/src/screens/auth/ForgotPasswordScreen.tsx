import React, { useState, useCallback, useEffect } from 'react'; // react ^18.2.0
import {
  StyleSheet,
  View,
  Text,
  TouchableWithoutFeedback,
  ScrollView,
  StatusBar,
} from 'react-native'; // react-native 0.72.x
import {
  useNavigation,
  NativeStackNavigationProp,
  useFocusEffect,
} from '@react-navigation/native'; // @react-navigation/native ^6.1.7
import {
  SafeAreaView,
  EdgeMode,
} from '../../components/common/SafeAreaView'; // src/android/src/components/common/SafeAreaView.tsx
import {
  Button,
  ButtonVariant,
} from '../../components/common/Button'; // src/android/src/components/common/Button.tsx
import {
  Input,
  InputType,
} from '../../components/common/Input'; // src/android/src/components/common/Input.tsx
import { useAuth } from '../../hooks/useAuth'; // src/android/src/hooks/useAuth.ts
import { ForgotPasswordFormValues } from '../../types/auth.types'; // src/android/src/types/auth.types.ts
import { colors } from '../../styles/colors'; // src/android/src/styles/colors.ts
import { useKeyboard } from '../../hooks/useKeyboard'; // src/android/src/hooks/useKeyboard.ts

/**
 * The main screen component that renders the forgot password form
 * @returns Rendered forgot password screen component
 */
export const ForgotPasswordScreen: React.FC = () => {
  // Initialize email state using useState hook
  const [email, setEmail] = useState<string>('');

  // Initialize formSubmitted state to track submission status
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);

  // Initialize success state to track successful submissions
  const [success, setSuccess] = useState<boolean>(false);

  // Get authentication functionality from useAuth hook
  const auth = useAuth();

  // Get keyboard handling utilities from useKeyboard hook
  const keyboard = useKeyboard();

  // Get navigation object using useNavigation hook
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  // Set up useFocusEffect to handle StatusBar styling when screen gains focus
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('dark-content');
      StatusBar.setBackgroundColor(colors.background.primary);
    }, [])
  );

  // Define form validation function to validate email input
  const validateForm = (): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Define handleSubmit function to submit the forgot password request
  const handleSubmit = async () => {
    setFormSubmitted(true);
    if (validateForm()) {
      try {
        await auth.forgotPassword(email);
        setSuccess(true);
      } catch (error) {
        // Error is handled by the useAuth hook
        setSuccess(false);
      }
    }
  };

  // Define handleBackToLogin function to navigate back to login screen
  const handleBackToLogin = () => {
    auth.clearError();
    navigation.goBack();
  };

  // Return JSX with TouchableWithoutFeedback to dismiss keyboard when tapping outside inputs
  return (
    <TouchableWithoutFeedback onPress={keyboard.dismissKeyboard}>
      {/* Render SafeAreaView as the container component with proper insets */}
      <SafeAreaView edges={[EdgeMode.TOP, EdgeMode.BOTTOM]} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Show a back button in the header to return to login screen */}
          <Button
            title="Back to Login"
            variant={ButtonVariant.LINK}
            onPress={handleBackToLogin}
            style={styles.backButton}
          />

          {/* Render the page title and instructions */}
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>

          {/* Render the email input field with validation */}
          <Input
            label="Email Address"
            placeholder="your.email@example.com"
            value={email}
            onChangeText={setEmail}
            type={InputType.EMAIL}
            isRequired
            error={formSubmitted && !validateForm() ? 'Please enter a valid email address' : auth.error || ''}
            style={styles.input}
            onSubmitEditing={handleSubmit}
            returnKeyType="send"
            blurOnSubmit={false}
          />

          {/* Render the submit button with loading state indication */}
          <Button
            title="Send Reset Link"
            onPress={handleSubmit}
            variant={ButtonVariant.PRIMARY}
            isDisabled={auth.isLoading}
            isLoading={auth.isLoading}
            style={styles.button}
          />

          {/* Show success message and back to login button when email is sent successfully */}
          {success && (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>
                A password reset link has been sent to your email address.
              </Text>
              <Button
                title="Back to Login"
                variant={ButtonVariant.SECONDARY}
                onPress={handleBackToLogin}
                style={styles.successButton}
              />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

// Component styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  backButton: {
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    color: colors.text.secondary,
  },
  input: {
    marginBottom: 20,
  },
  button: {
    marginTop: 10,
  },
  successContainer: {
    marginTop: 30,
    padding: 20,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
  },
  successText: {
    fontSize: 16,
    marginBottom: 20,
    color: colors.text.primary,
    textAlign: 'center',
  },
  successButton: {
    marginTop: 10,
  },
});

// Default export of the forgot password screen component for use in navigation
export default ForgotPasswordScreen;