import React, { useState, useEffect, useRef, useCallback } from 'react'; // ^18.2.0
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  Animated,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  StatusBar,
  StyleProp,
  ViewStyle
} from 'react-native'; // 0.72.x
import { useFocusEffect } from '@react-navigation/native'; // ^6.1.7
import NetInfo from '@react-native-community/netinfo'; // ^9.3.10

// Internal components
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import SafeAreaView from '../common/SafeAreaView';
import Spinner from '../common/Spinner';

// Hooks
import useMessages from '../../hooks/useMessages';

// Styles
import { colors } from '../../styles/colors';

// Types
import { ConnectionState } from '../../types/message.types';

/**
 * Interface defining the props for the ChatWindow component
 */
export interface ChatWindowProps {
  conversationId: string;
  initialMessage?: string;
  style?: StyleProp<ViewStyle>;
  inputPlaceholder?: string;
  onMessageSent?: () => void;
}

/**
 * A component that displays a full chat interface with message history and input field
 */
const ChatWindow: React.FC<ChatWindowProps> = ({
  conversationId,
  initialMessage,
  style,
  inputPlaceholder,
  onMessageSent
}) => {
  // State for refreshing and keyboard visibility
  const [refreshing, setRefreshing] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Get message-related data and functions from useMessages hook
  const {
    messages,
    loading,
    loadMessages,
    loadMoreMessages,
    joinConversationRoom,
    leaveConversationRoom,
    isConnected,
    connectionState
  } = useMessages();

  // Animated value for connection status bar
  const connectionStatusHeight = useRef(new Animated.Value(0)).current;

  // Set up connection status animation based on connection state
  useEffect(() => {
    Animated.timing(connectionStatusHeight, {
      toValue: isConnected ? 0 : 30,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isConnected, connectionStatusHeight]);

  // Load messages when component mounts
  useEffect(() => {
    loadMessages(conversationId);
  }, [conversationId, loadMessages]);

  // Join WebSocket conversation room when focused
  useFocusEffect(
    useCallback(() => {
      joinConversationRoom(conversationId);
      return () => leaveConversationRoom(conversationId);
    }, [conversationId, joinConversationRoom, leaveConversationRoom])
  );

  // Handle keyboard events
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  /**
   * Handles the pull-to-refresh gesture on the message list
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadMessages(conversationId);
    } catch (error) {
      console.error('Error refreshing messages:', error);
    } finally {
      setRefreshing(false);
    }
  }, [conversationId, loadMessages]);

  /**
   * Handles loading more messages when user scrolls to the top of the list
   */
  const handleLoadMore = useCallback(async () => {
    try {
      await loadMoreMessages();
    } catch (error) {
      console.error('Error loading more messages:', error);
    }
  }, [loadMoreMessages]);

  /**
   * Renders a connection status bar indicating WebSocket connection state
   */
  const renderConnectionStatus = useCallback(() => {
    let statusText = '';
    let statusColor = colors.warning[500];

    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return null;
      case ConnectionState.CONNECTING:
        statusText = 'Connecting...';
        break;
      case ConnectionState.RECONNECTING:
        statusText = 'Reconnecting...';
        break;
      case ConnectionState.DISCONNECTED:
        statusText = 'Disconnected. Reconnecting...';
        break;
      default:
        statusText = 'Unknown connection state';
        statusColor = colors.error[500];
    }

    return (
      <Animated.View
        style={[
          styles.connectionStatus,
          { height: connectionStatusHeight, backgroundColor: statusColor },
        ]}
        accessible={true}
        accessibilityLabel={`Connection Status: ${statusText}`}
        accessibilityRole="alert"
      >
        <Text style={styles.connectionText}>{statusText}</Text>
      </Animated.View>
    );
  }, [connectionState, connectionStatusHeight]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <SafeAreaView style={[styles.container, style]} edges={SafeAreaView.EdgeMode.ALL}>
        {/* Render connection status bar at the top if necessary */}
        {renderConnectionStatus()}

        {/* Render MessageList component with message history */}
        <MessageList
          conversationId={conversationId}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
        />

        {/* Render loading spinner when in loading state */}
        {loading && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Spinner size="large" centered={true} />
          </View>
        ) : null}

        {/* Render MessageInput component at the bottom */}
        <MessageInput
          conversationId={conversationId}
          placeholder={inputPlaceholder}
          onMessageSent={onMessageSent}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

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
  connectionStatus: {
    backgroundColor: colors.warning[500],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  connectionText: {
    color: colors.text.inverse,
    fontSize: 12,
  },
});

export default ChatWindow;