import React from 'react'; // react ^18.2.0
import { Platform } from 'react-native'; // 0.72.4
import { createStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack'; // @react-navigation/native-stack ^6.9.12
import Ionicons from 'react-native-vector-icons/Ionicons'; // react-native-vector-icons/Ionicons ^9.0.0

// Internal imports
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import useAuth from '../hooks/useAuth';
import { ProfileStackParamList } from '../types/profile.types';
import { colors } from '../styles/colors';

// Create stack navigator
const Stack = createStackNavigator<ProfileStackParamList>();

/**
 * Creates and configures the stack navigator for profile-related screens
 * @returns Configured stack navigator component
 */
const ProfileNavigator: React.FC = () => {
  // Get authentication state and user data
  const { user } = useAuth();

  // Define common screen options for consistent styling across profile screens
  const screenOptions: NativeStackNavigationOptions = {
    headerStyle: {
      backgroundColor: colors.background.primary,
    },
    headerTintColor: colors.text.primary,
    headerTitleStyle: {
      fontWeight: 'bold',
    },
    headerBackTitleVisible: false,
    headerShadowVisible: false,
    animation: 'slide_from_right',
    gestureEnabled: true,
    headerBackTitle: 'Back',
  };

  // Configure header styles, colors, and animations for iOS
  const iosHeaderOptions: NativeStackNavigationOptions = {
    headerBackTitleStyle: {
      fontFamily: 'System',
    },
    headerLargeTitleStyle: {
      fontFamily: 'System',
    },
    headerTitleAllowFontScaling: true,
    headerBackAllowFontScaling: true,
  };

  // Set up Profile screen as the initial route with appropriate header configuration
  // Set up EditProfile screen with custom header including back button and save functionality
  return (
    <Stack.Navigator
      initialRouteName="Profile"
      screenOptions={{
        ...screenOptions,
        ...(Platform.OS === 'ios' ? iosHeaderOptions : {}),
      }}
    >
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          title: 'Edit Profile',
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
};

export default ProfileNavigator;