/**
 * A navigation component that manages the profile-related screens in the AI Talent Marketplace Android application,
 * providing a stack-based navigation flow for viewing and editing user profiles with appropriate transitions and styling.
 *
 * @version 1.0.0
 */

import React from 'react'; // v18.2.0
import { Platform } from 'react-native'; // 0.72.x
import {
  createNativeStackNavigator, // ^6.9.13
  NativeStackNavigationOptions, // ^6.9.13
} from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // ^9.2.0

// Internal component imports
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import { ProfileType } from '../types/profile.types';
import { colors } from '../styles/colors';

/**
 * Type definition for the profile navigator route parameters
 */
export interface ProfileStackParamList {
  Profile: { profileId?: string; profileType?: ProfileType };
  EditProfile: { profileId?: string; profileType: ProfileType };
}

/**
 * Creates a native stack navigator for profile-related screens
 * @returns A Navigator component with profile screens
 */
const ProfileNavigator = () => {
  // Create a native stack navigator using createNativeStackNavigator with type safety
  const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

  // Configure default screen options for consistent styling
  const defaultScreenOptions: NativeStackNavigationOptions = {
    headerStyle: {
      backgroundColor: colors.background.primary,
    },
    headerTintColor: colors.text.primary,
    headerTitleStyle: {
      fontWeight: 'bold',
    },
    headerBackTitleVisible: false,
    headerShadowVisible: false,
    headerTitleAlign: 'center',
    headerBackImage: () => (
      <MaterialIcons name="arrow-back" size={24} color={colors.text.primary} />
    ),
  };

  // Define header styles with Android-specific adjustments
  const headerStyle = Platform.OS === 'android'
    ? { elevation: 0, shadowOpacity: 0 }
    : {};

  // Configure the Profile screen as the initial route
  // Configure EditProfile screen with appropriate transitions
  return (
    <ProfileStack.Navigator screenOptions={defaultScreenOptions}>
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          headerStyle,
        }}
      />
      <ProfileStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          title: 'Edit Profile',
          headerStyle,
          presentation: 'modal',
          animationTypeForReplace: 'push',
          animation: 'slide_from_bottom',
        }}
      />
    </ProfileStack.Navigator>
  );
};

// Export the profile navigator component for use in the dashboard navigator
export default ProfileNavigator;