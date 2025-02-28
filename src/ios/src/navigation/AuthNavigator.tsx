import React from 'react'; // ^18.2.0
import { createStackNavigator, CardStyleInterpolators, TransitionPresets } from '@react-navigation/stack'; // ^6.3.17

// Internal imports
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { AuthStackParamList } from '../types/auth.types';

// Create a stack navigator
const AuthStack = createStackNavigator<AuthStackParamList>();

/**
 * Stack navigator component for authentication screens
 * @returns Stack navigator for authentication flow
 */
export const AuthNavigator: React.FC = () => {
  return (
    <AuthStack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      }}
    >
      {/* Login Screen */}
      <AuthStack.Screen name="Login" component={LoginScreen} />

      {/* Register Screen */}
      <AuthStack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          ...TransitionPresets.SlideFromRightIOS,
        }}
      />

      {/* Forgot Password Screen */}
      <AuthStack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          ...TransitionPresets.SlideFromRightIOS,
        }}
      />

      {/* Reset Password Screen */}
      <AuthStack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{
          ...TransitionPresets.FadeInFromBottomAndroid,
        }}
      />
    </AuthStack.Navigator>
  );
};

// Export the AuthNavigator component
export default AuthNavigator;