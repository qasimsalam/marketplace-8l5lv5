import React, { useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableWithoutFeedback, 
  StatusBar,
  Platform 
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native'; // ^6.1.7
import { StackNavigationProp } from '@react-navigation/stack'; // ^6.3.17
import { Toast } from 'react-native-toast-message'; // ^2.1.6

import { ResetPasswordFormValues } from '../../types/auth.types';
import PasswordResetForm from '../../components/auth/PasswordResetForm';
import { SafeAreaView, EdgeMode } from '../../components/common/SafeAreaView';
import { colors } from '../../styles/colors';
import useAuth from '../../hooks/useAuth';
import { useKeyboard } from '../../hooks/useKeyboard';

/**
 * Screen component for resetting a user's password in the iOS application
 * Handles the password reset form display and navigation flow after successful reset
 * 
 * @returns Rendered password reset screen
 */
const ResetPasswordScreen: React.FC = () => {
  // Extract token from route params
  const route = useRoute<RouteProp<{ params: { token: string } }, 'params'>>();
  const token = route.params?.token;
  
  // Get navigation methods
  const navigation = useNavigation<StackNavigationProp<any>>();
  
  // Get auth functionality
  const { resetPassword } = useAuth();
  
  // Get keyboard utilities
  const { dismissKeyboard } = useKeyboard();
  
  /**
   * Handles successful password reset by showing a toast notification
   * and navigating to the login screen
   */
  const handleSuccess = useCallback(() => {
    Toast.show({
      type: 'success',
      text1: 'Password Reset Successful',
      text2: 'You can now log in with your new password',
      position: 'bottom',
    });
    
    // Navigate to login screen after a short delay to allow the user to see the success message
    setTimeout(() => {
      navigation.navigate('Login');
    }, 1500);
  }, [navigation]);
  
  return (
    <SafeAreaView edges={EdgeMode.ALL} style={styles.container}>
      {/* Use light content for iOS status bar */}
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.background.primary}
      />
      
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={styles.content}>
          <Text style={styles.title}>Reset Your Password</Text>
          <Text style={styles.subtitle}>
            Please create a new secure password for your account
          </Text>
          
          <PasswordResetForm
            token={token}
            onSuccess={handleSuccess}
            testID="reset-password-form"
          />
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 24,
  },
});

export default ResetPasswordScreen;