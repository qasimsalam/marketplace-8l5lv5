import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react'; // react 18.2.0
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
  Dimensions,
  RefreshControl,
} from 'react-native'; // react-native 0.72.x
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // react-native-vector-icons/MaterialIcons 9.2.0

// Internal imports
import MessageList from './MessageList';
import { MessageInput, MessageInputProps } from './MessageInput';
import { SafeAreaView, EdgeMode } from '../common/SafeAreaView';
import { Spinner } from '../common/Spinner';
import {
  Message,
  MessageType,
  ConnectionState,
} from '../../types/message.types';
import { useMessages } from '../../hooks/useMessages';
import { useAuth } from '../../hooks/useAuth';
import { useKeyboard } from '../../hooks/useKeyboard';
import colors from '../../styles/colors';

// Global constants
const MESSAGES_PER_PAGE = 20;
const TYPING_INDICATOR_TIMEOUT = 10000;

/**
 * Props interface for the ChatWindow component
 */
export interface ChatWindowProps {
  /**
   * The ID of the conversation to display
   */
  conversationId: string;
  /**
   * Optional custom styles for the chat window
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * The main chat window component that displays messages and input area for a conversation
 *
 * @param props - The component props
 * @returns Rendered chat window component
 */
export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversationId,
  style,
}) => {
  // Initialize message list state
  const [messages, setMessages] = useState<Message[]>([]);
  // Track loading states
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  // Initialize pagination state
  const [hasMore, setHasMore] = useState<boolean>(true);

  // Get current authenticated user
  const { user } = useAuth();
  const currentUserId = user?.id || '';

  // Get messaging functionality from useMessages hook
  const {
    loadMessages,
    sendMessage,
    markAsRead,
    isConnected,
    connectionState,
    activeTypingUsers,
  } = useMessages();

  // Initialize message list ref
  const messageListRef = useRef<MessageList>(null);

  // Use useKeyboard hook to handle Android keyboard appearance
  const { keyboardHeight, isKeyboardVisible } = useKeyboard();

  /**
   * Loads the initial messages for the conversation
   */
  const loadInitialMessages = useCallback(async () => {
    setLoadingInitial(true);
    try {
      await loadMessages(conversationId);
    } finally {
      setLoadingInitial(false);
    }
  }, [conversationId, loadMessages]);

  /**
   * Loads more messages for pagination
   */
  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || loadingMore) return;

    setLoadingMore(true);
    try {
      // TODO: Implement pagination logic
      // const newMessages = await loadMessages(conversationId, page + 1);
      // setMessages(prevMessages => [...prevMessages, ...newMessages]);
      // setPage(page => page + 1);
      // setHasMore(newMessages.length > 0);
    } finally {
      setLoadingMore(false);
    }
  }, [conversationId, hasMore, loadingMore, loadMessages]);

  /**
   * Handles sending a new message
   * @param text The message text to send
   */
  const handleSendMessage = useCallback(
    async (text: string) => {
      try {
        await sendMessage({
          conversationId: conversationId,
          type: MessageType.TEXT,
          content: text,
          attachmentId: null,
          codeSnippet: null,
        });
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    },
    [conversationId, sendMessage]
  );

  /**
   * Handles pull-to-refresh functionality
   */
  const handleRefresh = useCallback(async () => {
    setLoadingInitial(true);
    try {
      await loadMessages(conversationId);
    } finally {
      setLoadingInitial(false);
    }
  }, [conversationId, loadMessages]);

  // Load initial messages when component mounts
  useEffect(() => {
    loadInitialMessages();
  }, [loadInitialMessages]);

  // Mark messages as read when viewed
  useEffect(() => {
    if (messages.length > 0) {
      markAsRead(conversationId);
    }
  }, [conversationId, messages, markAsRead]);

  // Handle connection state changes
  useEffect(() => {
    console.log('Connection state changed:', connectionState);
  }, [connectionState]);

  /**
   * Renders an indicator showing which users are currently typing
   * @param typingUsers Array of user IDs who are typing
   * @returns Typing indicator component or null if no one is typing
   */
  const renderTypingIndicator = useCallback(
    (typingUsers: string[]): JSX.Element | null => {
      if (!typingUsers || typingUsers.length === 0) {
        return null;
      }

      const userNames = typingUsers.map((userId) => {
        // TODO: Fetch user names from user IDs
        return `User ${userId}`;
      });

      let typingMessage = '';
      if (userNames.length === 1) {
        typingMessage = `${userNames[0]} is typing...`;
      } else {
        typingMessage = `${userNames.join(', ')} are typing...`;
      }

      return (
        <View style={styles.typingIndicator}>
          <Text>{typingMessage}</Text>
        </View>
      );
    },
    []
  );

  /**
   * Renders an indicator for connection state (offline, reconnecting)
   * @param connectionState The current connection state
   * @param isConnected Whether the WebSocket is connected
   * @returns Connection state indicator or null if connected
   */
  const renderConnectionState = useCallback(
    (connectionState: ConnectionState, isConnected: boolean): JSX.Element | null => {
      if (connectionState === ConnectionState.CONNECTED) {
        return null;
      }

      let message = '';
      let iconName = 'wifi';
      let color = colors.warning[500];

      if (connectionState === ConnectionState.DISCONNECTED) {
        message = 'Offline';
        iconName = 'wifi-off';
        color = colors.error[500];
      } else if (connectionState === ConnectionState.CONNECTING) {
        message = 'Connecting...';
        iconName = 'wifi';
        color = colors.warning[500];
      } else if (connectionState === ConnectionState.RECONNECTING) {
        message = 'Reconnecting...';
        iconName = 'wifi';
        color = colors.warning[500];
      }

      return (
        <View style={styles.connectionState}>
          <MaterialIcons name={iconName} size={20} color={color} />
          <Text style={{ color: color, marginLeft: 8 }}>{message}</Text>
        </View>
      );
    },
    []
  );

  // Create layout adjustments based on keyboard visibility
  const bottomInset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(bottomInset, {
      toValue: isKeyboardVisible ? keyboardHeight : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [isKeyboardVisible, keyboardHeight, bottomInset]);

  return (
    <SafeAreaView style={style} edges={EdgeMode.BOTTOM}>
      {renderConnectionState(connectionState, isConnected)}
      {loadingInitial ? (
        <Spinner />
      ) : (
        <MessageList
          conversationId={conversationId}
          messages={messages}
          isLoadingMessages={loadingMore}
          onLoadMoreMessages={loadMoreMessages}
        />
      )}
      {renderTypingIndicator(activeTypingUsers)}
      <Animated.View style={{ bottom: bottomInset }}>
        <MessageInput
          conversationId={conversationId}
          onMessageSent={handleSendMessage}
        />
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  connectionState: {
    backgroundColor: colors.warning[100],
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingIndicator: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.gray[100],
  },
});

export default ChatWindow;