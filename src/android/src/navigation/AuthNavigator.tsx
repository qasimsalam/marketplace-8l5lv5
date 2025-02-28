import React from 'react'; // react v18.2.0
import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack'; // @react-navigation/native-stack ^6.9.13
import { Platform } from 'react-native'; // react-native 0.72.x

// Internal imports for authentication screens
import LoginScreen from '../screens/auth/LoginScreen'; // src/android/src/screens/auth/LoginScreen.tsx
import RegisterScreen from '../screens/auth/RegisterScreen'; // src/android/src/screens/auth/RegisterScreen.tsx
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen'; // src/android/src/screens/auth/ForgotPasswordScreen.tsx
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen'; // src/android/src/screens/auth/ResetPasswordScreen.tsx

// Internal imports for type definitions
import { AuthStackParamList } from '../types/auth.types'; // src/android/src/types/auth.types.ts

// Internal imports for styling
import { colors } from '../styles/colors'; // src/android/src/styles/colors.ts

// Create native stack navigator
const AuthStackNavigator = createNativeStackNavigator<AuthStackParamList>();

/**
 * Native stack navigator component for authentication screens optimized for Android
 * @returns Native stack navigator for authentication flow
 */
const AuthNavigator: React.FC = () => {
  // Define default screen options for consistent styling across all screens
  const defaultScreenOptions: NativeStackNavigationOptions = {
    headerStyle: {
      backgroundColor: colors.background.primary,
    },
    headerTintColor: colors.text.primary,
    headerTitleStyle: {
      fontWeight: 'bold',
    },
    headerBackTitleVisible: false,
    animation: 'slide_from_right',
  };

  // Configure navigation header appearance with Android-specific styling
  if (Platform.OS === 'android') {
    defaultScreenOptions.headerTitleAlign = 'center';
  }

  return (
    <AuthStackNavigator.Navigator screenOptions={defaultScreenOptions}>
      {/* Configure Login screen as the initial route with no header */}
      <AuthStackNavigator.Screen
        name="Login"
        component={LoginScreen}
        options={{
          headerShown: false,
          animation: 'fade',
        }}
      />

      {/* Configure Register screen with slide animation and back button */}
      <AuthStackNavigator.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          title: 'Create Account',
          animation: 'slide_from_right',
        }}
      />

      {/* Configure ForgotPassword screen with slide animation and back button */}
      <AuthStackNavigator.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          title: 'Forgot Password',
          animation: 'slide_from_right',
        }}
      />

      {/* Configure ResetPassword screen with fade animation and back button */}
      <AuthStackNavigator.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{
          title: 'Reset Password',
          animation: 'fade',
        }}
      />
    </AuthStackNavigator.Navigator>
  );
};

export default AuthNavigator;