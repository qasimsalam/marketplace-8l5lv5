import React from 'react'; // react v18.2.0
import { Platform } from 'react-native'; // react-native 0.72.x
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack'; // @react-navigation/native-stack ^6.9.13
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // react-native-vector-icons/MaterialIcons ^9.2.0

// Internal imports
import MessagesScreen from '../screens/messages/MessagesScreen';
import ChatScreen from '../screens/messages/ChatScreen';
import { MessagesStackParamList } from '../types/message.types';
import { colors } from '../styles/colors';
import { useMessages } from '../hooks/useMessages';

/**
 * Native stack navigator for messaging-related screens optimized for Android
 */
const MessagesNavigator: React.FC = () => {
  // Create a native stack navigator using createNativeStackNavigator
  const Stack = createNativeStackNavigator<MessagesStackParamList>();

  // Access message state to determine unread message count for badges
  const { getUnreadCount } = useMessages();

  // Set default screen options for consistent styling across all screens
  const defaultScreenOptions: NativeStackNavigationOptions = {
    headerStyle: {
      backgroundColor: colors.background.primary,
    },
    headerTintColor: colors.text.primary,
    headerTitleStyle: {
      fontWeight: 'bold',
    },
    headerBackTitleVisible: false,
    animation: 'slide_from_right', // Consistent animation
  };

  // Configure navigation header appearance with Android-specific styling
  const androidHeaderOptions: NativeStackNavigationOptions = {
    headerTitleAlign: 'left',
    headerShadowVisible: false,
  };

  return (
    <Stack.Navigator
      initialRouteName="Messages"
      screenOptions={{
        ...defaultScreenOptions,
        ...(Platform.OS === 'android' ? androidHeaderOptions : {}),
      }}
    >
      {/* Configure MessagesScreen as the initial route with customized header and unread message count indicator */}
      <Stack.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          title: 'Messages',
          headerRight: () => (
            <MaterialIcons
              name="mark-as-unread"
              size={24}
              color={colors.primary[500]}
              style={{ marginRight: 16 }}
              onPress={() => {
                // Implement mark all as read functionality
                console.log('Mark all as read pressed');
              }}
            />
          ),
        }}
      />

      {/* Configure ChatScreen with slide animation and dynamic header title based on conversation */}
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({
          title: `Chat`,
          animation: 'slide_from_right',
        })}
      />
    </Stack.Navigator>
  );
};

export default MessagesNavigator;