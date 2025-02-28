import React, { useState, useEffect, useCallback } from 'react'; // ^18.2.0
import { StyleSheet, View, Platform, BackHandler, Alert } from 'react-native'; // 0.72.x
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native'; // ^6.1.7
import { StackNavigationProp } from '@react-navigation/stack'; // ^6.3.17
import { useFocusEffect } from '@react-navigation/native'; // ^6.1.7

// Internal components
import ChatWindow from '../../components/messages/ChatWindow';
import SafeAreaView from '../../components/common/SafeAreaView';

// Hooks
import useMessages from '../../hooks/useMessages';

// Styles
import { colors } from '../../styles/colors';

// Define route parameters type
type RootStackParamList = {
  ChatScreen: { conversationId: string };
};

// Define navigation properties type
type ChatScreenRouteProp = RouteProp<RootStackParamList, 'ChatScreen'>;
type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ChatScreen'>;

/**
 * Main component for displaying an individual chat conversation
 */
const ChatScreen: React.FC = () => {
  // LD1: Extract conversation ID from route parameters
  const route = useRoute<ChatScreenRouteProp>();
  const { conversationId } = route.params;

  // LD1: Access navigation functions for header customization
  const navigation = useNavigation<ChatScreenNavigationProp>();

  // LD1: Get messaging state and functions from useMessages hook
  const { loadConversation } = useMessages();

  // LD1: Set up state for loading status
  const [loading, setLoading] = useState(false);

  // LD1: Implement loadConversationData to load conversation data when screen is focused
  const loadConversationData = useCallback(async () => {
    // LD1: Set loading state to true
    setLoading(true);
    try {
      // LD1: Call loadConversation with the conversation ID from route params
      await loadConversation(conversationId);
    } catch (error) {
      // LD1: Handle any errors that occur during loading
      console.error('Error loading conversation:', error);
      Alert.alert('Error', 'Failed to load conversation. Please try again.');
    } finally {
      // LD1: Set loading state to false when complete
      setLoading(false);
    }
  }, [conversationId, loadConversation]);

  // LD1: Implement back button handling for Android hardware back button
  const handleBackPress = useCallback(() => {
    // LD1: Execute navigation.goBack() to return to the previous screen
    navigation.goBack();
    // LD1: Return true to indicate that the event has been handled
    return true;
  }, [navigation]);

  // LD1: Set up useEffect to update navigation header when conversation data changes
  const updateHeader = useCallback(() => {
    navigation.setOptions({
      title: 'Chat',
    });
  }, [navigation]);

  // LD1: Set up useFocusEffect to load conversation data when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadConversationData();

      // Add back button listener for Android
      if (Platform.OS === 'android') {
        BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      }

      return () => {
        // Remove back button listener
        if (Platform.OS === 'android') {
          BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
        }
      };
    }, [loadConversationData, handleBackPress])
  );

  // LD1: Set up useEffect to update navigation header when conversation data changes
  useEffect(() => {
    updateHeader();
  }, [updateHeader]);

  // LD1: Return SafeAreaView container with ChatWindow component
  return (
    <SafeAreaView style={styles.container} edges={SafeAreaView.EdgeMode.ALL}>
      {/* LD1: Pass conversation ID and other props to ChatWindow */}
      <ChatWindow
        conversationId={conversationId}
        inputPlaceholder="Type your message..."
      />
    </SafeAreaView>
  );
};

// LD1: Apply appropriate styling with proper platform-specific adjustments
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContainer: {
    flex: 1,
  },
});

// IE3: Export the ChatScreen component as the default export
export default ChatScreen;