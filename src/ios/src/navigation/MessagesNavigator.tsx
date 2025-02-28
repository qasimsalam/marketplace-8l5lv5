import React from 'react'; // react ^18.2.0
import { Platform } from 'react-native'; // react-native 0.72.4
import { createStackNavigator, TransitionPresets, CardStyleInterpolators } from '@react-navigation/stack'; // @react-navigation/stack ^6.3.17
import Ionicons from 'react-native-vector-icons/Ionicons'; // react-native-vector-icons/Ionicons ^9.0.0

// Internal imports
import MessagesScreen from '../screens/messages/MessagesScreen'; // MessagesScreen component
import ChatScreen from '../screens/messages/ChatScreen'; // ChatScreen component
import useMessages from '../hooks/useMessages'; // useMessages hook
import { colors } from '../styles/colors'; // colors object

// Define the parameter list for the stack navigator
export interface MessagesStackParamList {
  MessagesHome: undefined;
  Chat: { conversationId: string; title?: string };
}

// Create the stack navigator
const Stack = createStackNavigator<MessagesStackParamList>();

/**
 * Creates and configures the stack navigator for message-related screens
 */
const MessagesNavigator = () => {
  // Get message status information from useMessages hook
  const { unreadConversationsCount } = useMessages();

  // Define screenOptions for all screens with consistent styling and animations
  const screenOptions = {
    headerStyle: {
      backgroundColor: colors.background.elevated,
      shadowColor: 'transparent',
      elevation: 0,
    },
    headerTintColor: colors.text.primary,
    headerTitleStyle: {
      fontWeight: 'bold',
    },
    headerBackTitleVisible: false,
    cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
    ...TransitionPresets.SlideFromRightIOS,
  };

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {/* Configure MessagesScreen as the initial route with appropriate header options */}
      <Stack.Screen
        name="MessagesHome"
        component={MessagesScreen}
        options={{
          title: 'Messages',
          headerShown: false, // Hide the default header
        }}
      />

      {/* Configure ChatScreen with slide animation and route parameters for conversation ID */}
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({
          title: route.params.title || 'Chat',
          headerBackTitleVisible: false,
          headerTintColor: colors.text.primary,
          headerStyle: {
            backgroundColor: colors.background.elevated,
          },
          // iOS-specific customizations
          ...(Platform.OS === 'ios'
            ? {
                headerTitleAlign: 'center',
                headerLargeTitle: false,
              }
            : {}),
        })}
      />
    </Stack.Navigator>
  );
};

export default MessagesNavigator;