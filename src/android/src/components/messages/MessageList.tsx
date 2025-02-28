import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'; // react 18.2.0
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  Platform,
  StyleProp,
  ViewStyle,
  ListRenderItemInfo
} from 'react-native'; // react-native 0.72.x
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // react-native-vector-icons 9.2.0
import SyntaxHighlighter from 'react-native-syntax-highlighter'; // react-native-syntax-highlighter ^2.1.0

// Import types, hooks, and utilities
import {
  Message,
  MessageType,
  MessageStatus
} from '../../types/message.types';
import { useMessages } from '../../hooks/useMessages';
import { useAuth } from '../../hooks/useAuth';
import { Avatar, AvatarSize } from '../common/Avatar';
import { formatRelativeDateForMobile } from '../../utils/date';
import colors from '../../styles/colors';
import { layout } from '../../styles/layout';

// Global constants
const MESSAGES_PER_PAGE = 20;
const MAX_MESSAGES_TO_MARK_READ = 50;

// Define the props interface for the component
export interface MessageListProps {
  conversationId: string;
  style?: StyleProp<ViewStyle>;
  onMessagePress?: (message: Message) => void;
  onLoadMoreMessages?: () => void;
  initialScrollToBottom?: boolean;
}

// Type definition for the sectioned data
interface SectionedItem extends Message {
  type: 'message';
}

interface DateSectionItem {
  id: string;
  type: 'date';
  date: string;
}

type MessageListItem = SectionedItem | DateSectionItem;

// Helper function to get message grouping styles
const getMessageGroupStyles = (messages: Message[], index: number, currentUserId: string): ViewStyle => {
  const message = messages[index];
  const isFromCurrentUser = message.senderId === currentUserId;
  
  // Check if previous message exists and is from the same sender
  const prevMessage = index > 0 ? messages[index - 1] : null;
  const isPrevFromSameSender = prevMessage && prevMessage.senderId === message.senderId;
  
  // Check if next message exists and is from the same sender
  const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
  const isNextFromSameSender = nextMessage && nextMessage.senderId === message.senderId;
  
  // Base styles for all messages
  const baseStyles: ViewStyle = {
    flexDirection: 'row',
    marginBottom: isPrevFromSameSender && isNextFromSameSender ? 2 : 8,
    marginTop: !isPrevFromSameSender && isNextFromSameSender ? 8 : 2,
  };
  
  // Add specific styles based on sender and grouping
  if (isFromCurrentUser) {
    return {
      ...baseStyles,
      justifyContent: 'flex-end',
      paddingLeft: '15%', // Leave space on the left for user messages (right-aligned)
      paddingRight: 12,
    };
  } else {
    return {
      ...baseStyles,
      justifyContent: 'flex-start',
      paddingRight: '15%', // Leave space on the right for other users' messages (left-aligned)
      paddingLeft: 12,
    };
  }
};

// Helper function to get status icon based on message status
const getMessageStatusIcon = (status: MessageStatus): JSX.Element | null => {
  switch (status) {
    case MessageStatus.SENT:
      return <MaterialIcons name="done" size={14} color={colors.gray[400]} />;
    case MessageStatus.DELIVERED:
      return <MaterialIcons name="done-all" size={14} color={colors.gray[400]} />;
    case MessageStatus.READ:
      return <MaterialIcons name="done-all" size={14} color={colors.primary[500]} />;
    case MessageStatus.FAILED:
      return <MaterialIcons name="error-outline" size={14} color={colors.error[500]} />;
    default:
      return null;
  }
};

// Helper function to format typing indicator
const formatTypingIndicator = (typingUserNames: string[]): string => {
  if (!typingUserNames || typingUserNames.length === 0) {
    return '';
  }

  if (typingUserNames.length === 1) {
    return `${typingUserNames[0]} is typing...`;
  }

  if (typingUserNames.length === 2) {
    return `${typingUserNames[0]} and ${typingUserNames[1]} are typing...`;
  }

  // More than 2 typing users
  return `${typingUserNames[0]}, ${typingUserNames[1]}, and ${typingUserNames.length - 2} others are typing...`;
};

// Message List component implementation
const MessageList: React.FC<MessageListProps> = ({
  conversationId,
  style,
  onMessagePress,
  onLoadMoreMessages,
  initialScrollToBottom = true
}) => {
  // Get current authenticated user
  const { user } = useAuth();
  const currentUserId = user?.id || '';
  
  // Get messages-related hooks
  const {
    messages,
    isLoadingMessages,
    loadMessages,
    markAsRead,
    formatMessageTime,
    activeTypingUsers
  } = useMessages();
  
  // State for pagination
  const [page, setPage] = useState(1);
  
  // Refs for the FlatList
  const flatListRef = useRef<FlatList>(null);
  
  // Process messages to add sections based on dates
  const messagesWithSections = useMemo<MessageListItem[]>(() => {
    if (!messages || messages.length === 0) {
      return [];
    }
    
    // Group messages by date for section headers
    const sectioned: MessageListItem[] = [];
    let currentDate = '';
    
    messages.forEach((message) => {
      // Get the date string for this message (YYYY-MM-DD)
      const messageDate = new Date(message.createdAt).toISOString().split('T')[0];
      
      // If it's a new date, add a section header
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        sectioned.push({
          id: `date-${messageDate}`,
          type: 'date',
          date: messageDate
        });
      }
      
      // Add the message to the section
      sectioned.push({
        ...message,
        type: 'message'
      });
    });
    
    return sectioned;
  }, [messages]);
  
  // Initial load of messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      setPage(1);
      loadMessages(conversationId);
    }
  }, [conversationId, loadMessages]);
  
  // Mark messages as read when they appear
  useEffect(() => {
    if (conversationId && messages && messages.length > 0) {
      // Only mark a reasonable number of messages as read at once to avoid performance issues
      const messagesToMark = messages.slice(
        Math.max(0, messages.length - MAX_MESSAGES_TO_MARK_READ), 
        messages.length
      );
      
      const messageIds = messagesToMark
        .filter(msg => msg.status !== MessageStatus.READ && msg.senderId !== currentUserId)
        .map(msg => msg.id);
      
      if (messageIds.length > 0) {
        markAsRead(conversationId, messageIds);
      }
    }
  }, [conversationId, messages, markAsRead, currentUserId]);
  
  // Scroll to bottom on new messages if user is at the bottom
  useEffect(() => {
    if (
      flatListRef.current && 
      messages && 
      messages.length > 0 && 
      (initialScrollToBottom || messages[messages.length - 1].senderId === currentUserId)
    ) {
      // Use requestAnimationFrame for smoother scrolling on Android
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [messages, currentUserId, initialScrollToBottom]);
  
  // Handle loading more messages (pagination)
  const handleLoadMore = useCallback(() => {
    if (!isLoadingMessages && conversationId) {
      const nextPage = page + 1;
      setPage(nextPage);
      if (onLoadMoreMessages) {
        onLoadMoreMessages();
      }
    }
  }, [isLoadingMessages, conversationId, page, onLoadMoreMessages]);
  
  // Render a date separator
  const renderDateSeparator = useCallback((date: string) => {
    const formattedDate = formatRelativeDateForMobile(new Date(date));
    return (
      <View style={styles.dateSeparator}>
        <View style={styles.dateLine} />
        <Text style={styles.dateText}>{formattedDate}</Text>
        <View style={styles.dateLine} />
      </View>
    );
  }, []);
  
  // Render a code snippet
  const renderCodeSnippet = useCallback((codeSnippet: any) => {
    if (!codeSnippet) return null;
    
    return (
      <View style={styles.codeContainer}>
        {codeSnippet.title && (
          <Text style={styles.codeTitle}>{codeSnippet.title}</Text>
        )}
        <SyntaxHighlighter
          language={codeSnippet.language || 'javascript'}
          style={{}}
          customStyle={styles.codeSyntax}
          fontSize={14}
        >
          {codeSnippet.code}
        </SyntaxHighlighter>
      </View>
    );
  }, []);
  
  // Render a file attachment
  const renderFileAttachment = useCallback((attachment: any) => {
    if (!attachment) return null;
    
    return (
      <TouchableOpacity style={styles.fileContainer}>
        <MaterialIcons 
          name="insert-drive-file" 
          size={24} 
          color={colors.primary[500]} 
        />
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {attachment.name}
          </Text>
          <Text style={styles.fileSize}>
            {(attachment.size / 1024).toFixed(1)} KB
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, []);
  
  // Render the typing indicator
  const renderTypingIndicator = useCallback(() => {
    if (activeTypingUsers && activeTypingUsers.length > 0) {
      const typingMessage = formatTypingIndicator(activeTypingUsers);
      return (
        <View style={styles.typingContainer}>
          <ActivityIndicator size="small" color={colors.gray[400]} />
          <Text style={styles.typingText}>{typingMessage}</Text>
        </View>
      );
    }
    return null;
  }, [activeTypingUsers]);
  
  // Render an individual message
  const renderMessage = useCallback((message: Message, index: number) => {
    const isFromCurrentUser = message.senderId === currentUserId;
    const backgroundColor = isFromCurrentUser ? colors.primary[100] : colors.gray[200];
    
    return (
      <View style={getMessageGroupStyles(messages, index, currentUserId)}>
        {!isFromCurrentUser && (
          <Avatar
            imageUrl={message.sender?.avatarUrl}
            name={`${message.sender?.firstName || ''} ${message.sender?.lastName || ''}`}
            size={AvatarSize.SMALL}
            style={styles.avatar}
          />
        )}
        
        <Pressable
          style={[
            styles.messageBubble,
            { backgroundColor },
            isFromCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
          ]}
          onPress={() => onMessagePress && onMessagePress(message)}
        >
          {/* Message content based on type */}
          {message.type === MessageType.TEXT && (
            <Text style={styles.messageText}>{message.content}</Text>
          )}
          
          {message.type === MessageType.CODE && (
            renderCodeSnippet(message.codeSnippet)
          )}
          
          {message.type === MessageType.FILE && (
            renderFileAttachment(message.attachment)
          )}
          
          {/* Message timestamp and status */}
          <View style={styles.messageFooter}>
            <Text style={styles.messageTime}>
              {formatMessageTime(message.createdAt)}
            </Text>
            {isFromCurrentUser && getMessageStatusIcon(message.status)}
          </View>
        </Pressable>
      </View>
    );
  }, [messages, currentUserId, onMessagePress, formatMessageTime, renderCodeSnippet, renderFileAttachment]);
  
  // Render list item based on type (date or message)
  const renderItem = useCallback(({ item }: ListRenderItemInfo<MessageListItem>) => {
    if (item.type === 'date') {
      return renderDateSeparator((item as DateSectionItem).date);
    }
    return renderMessage(item as Message, messages.findIndex(m => m.id === item.id));
  }, [messages, renderDateSeparator, renderMessage]);
  
  // Render loading indicator
  const renderLoading = useCallback(() => {
    if (isLoadingMessages && page === 1) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary[500]} size="large" />
        </View>
      );
    }
    return null;
  }, [isLoadingMessages, page]);
  
  // Render list header (for loading older messages)
  const renderListHeader = useCallback(() => {
    if (isLoadingMessages && page > 1) {
      return (
        <View style={styles.loadMoreContainer}>
          <ActivityIndicator color={colors.primary[500]} size="small" />
        </View>
      );
    }
    return null;
  }, [isLoadingMessages, page]);
  
  // Render list footer (for typing indicator)
  const renderListFooter = useCallback(() => {
    return renderTypingIndicator();
  }, [renderTypingIndicator]);
  
  // If loading initial messages, show loading indicator
  if (isLoadingMessages && !messages.length) {
    return renderLoading();
  }
  
  return (
    <View style={[styles.container, style]}>
      <FlatList
        ref={flatListRef}
        data={messagesWithSections}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.2}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS === 'android'} // Optimize for Android
        updateCellsBatchingPeriod={50} // Optimize for Android
        viewabilityConfig={{
          minimumViewTime: 300,
          itemVisiblePercentThreshold: 10
        }}
        style={styles.flatList}
        contentContainerStyle={styles.contentContainer}
      />
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  flatList: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadMoreContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray[300],
  },
  dateText: {
    fontSize: 14,
    color: colors.gray[500],
    marginHorizontal: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 4,
    ...Platform.select({
      android: {
        elevation: 1, // subtle shadow on Android
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
      },
    }),
  },
  currentUserMessage: {
    borderBottomRightRadius: 4,
  },
  otherUserMessage: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 12,
    color: colors.gray[500],
    marginRight: 4,
  },
  avatar: {
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  typingText: {
    fontSize: 14,
    color: colors.gray[500],
    marginLeft: 8,
  },
  codeContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.gray[900],
  },
  codeTitle: {
    backgroundColor: colors.gray[800],
    color: colors.white,
    padding: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  codeSyntax: {
    borderRadius: 0,
    margin: 0,
    padding: 8,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: 8,
    padding: 8,
  },
  fileInfo: {
    marginLeft: 8,
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  fileSize: {
    fontSize: 12,
    color: colors.gray[500],
  }
});

export default MessageList;