/**
 * A React Native component that renders a scrollable, optimized list of messages in a conversation
 * for the AI Talent Marketplace iOS application. Supports real-time updates, pull-to-refresh,
 * infinite scrolling, and displays message bubbles with appropriate styling.
 */
import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react'; // ^18.2.0
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Platform,
  ImageBackground,
  Pressable,
  StyleProp,
  ViewStyle,
  TextStyle,
  ListRenderItemInfo,
  Clipboard
} from 'react-native'; // 0.72.x
import FastImage from 'react-native-fast-image'; // ^8.6.3

// Internal imports
import Avatar, { AvatarSize } from '../common/Avatar';
import Spinner, { SpinnerSize, SpinnerColor } from '../common/Spinner';
import { Message, MessageType, MessageStatus } from '../../types/message.types';
import useMessages from '../../hooks/useMessages';
import useAuth from '../../hooks/useAuth';
import { colors } from '../../styles/colors';
import { formatRelativeDateForMobile } from '../../utils/date';

// Time gap threshold for message grouping (5 minutes in milliseconds)
const MESSAGE_GROUP_TIME_GAP = 300000;

// Interface for MessageList props
export interface MessageListProps {
  conversationId: string;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  inverted?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  onMessagePress?: (message: Message) => void;
  onMessageLongPress?: (message: Message) => void;
  renderEmptyComponent?: () => React.ReactElement;
}

/**
 * Component that renders a scrollable list of messages with optimized performance
 */
const MessageList: React.FC<MessageListProps> = ({
  conversationId,
  style,
  contentContainerStyle,
  inverted = true,
  refreshing = false,
  onRefresh,
  onEndReached,
  onEndReachedThreshold = 0.5,
  onMessagePress,
  onMessageLongPress,
  renderEmptyComponent,
}) => {
  // Ref for the FlatList
  const listRef = useRef<FlatList<Message>>(null);
  
  // State for tracking if we should scroll to bottom
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  
  // Animated value for typing indicator
  const typingAnimation = useRef(new Animated.Value(0)).current;
  
  // Get auth context for current user
  const { user } = useAuth();
  
  // Get messages data and operations from hook
  const {
    messages,
    loading,
    typingUsers,
    markConversationAsRead,
    formatMessageTimestamp,
  } = useMessages();
  
  // Mark conversation as read when messages change
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      markConversationAsRead(conversationId);
    }
  }, [conversationId, messages, markConversationAsRead]);
  
  // Function to scroll to the end of the list
  const scrollToEnd = useCallback((animated = true) => {
    if (listRef.current) {
      // For inverted lists, scrollToEnd actually means scrollToTop (offset 0)
      if (inverted) {
        listRef.current.scrollToOffset({ offset: 0, animated });
      } else {
        listRef.current.scrollToEnd({ animated });
      }
    }
  }, [inverted]);
  
  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (shouldScrollToBottom && messages.length > 0 && !loading) {
      scrollToEnd(true);
    }
  }, [messages, loading, shouldScrollToBottom, scrollToEnd]);
  
  // Function to get the list ref
  const getListRef = useCallback(() => {
    return listRef;
  }, []);
  
  // Key extractor for FlatList items
  const keyExtractor = useCallback((item: Message) => {
    return item.id;
  }, []);
  
  /**
   * Determines if a message is from the same user as the previous message
   */
  const isMessageFromSameUser = useCallback(
    (currentMessage: Message, previousMessage: Message | undefined): boolean => {
      if (!previousMessage) {
        return false;
      }
      
      return currentMessage.senderId === previousMessage.senderId;
    },
    []
  );
  
  /**
   * Determines if timestamp should be rendered for a message
   */
  const shouldRenderTimestamp = useCallback(
    (currentMessage: Message, nextMessage: Message | undefined): boolean => {
      // Always show timestamp for last message in group
      if (!nextMessage) {
        return true;
      }
      
      // Check if messages are from different users
      if (currentMessage.senderId !== nextMessage.senderId) {
        return true;
      }
      
      // Check if time difference exceeds grouping threshold
      const currentTimestamp = new Date(currentMessage.createdAt).getTime();
      const nextTimestamp = new Date(nextMessage.createdAt).getTime();
      
      // For inverted lists, next message is actually earlier in time
      const timeDifference = inverted
        ? currentTimestamp - nextTimestamp
        : nextTimestamp - currentTimestamp;
      
      return timeDifference > MESSAGE_GROUP_TIME_GAP;
    },
    [inverted]
  );
  
  /**
   * Renders a text message bubble with appropriate styling
   */
  const renderTextMessage = useCallback(
    (message: Message, isCurrentUser: boolean): JSX.Element => {
      return (
        <View
          style={[
            styles.textBubble,
            isCurrentUser ? styles.currentUserTextBubble : styles.otherUserTextBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isCurrentUser ? styles.currentUserMessageText : styles.otherUserMessageText,
            ]}
          >
            {message.content}
          </Text>
        </View>
      );
    },
    []
  );
  
  /**
   * Renders a file attachment message with preview if available
   */
  const renderFileMessage = useCallback(
    (message: Message, isCurrentUser: boolean): JSX.Element => {
      const { attachment } = message;
      
      if (!attachment) {
        return renderTextMessage(message, isCurrentUser);
      }
      
      const isImage = attachment.type.startsWith('image/');
      
      return (
        <View
          style={[
            styles.fileBubble,
            isCurrentUser ? styles.currentUserFileBubble : styles.otherUserFileBubble,
          ]}
        >
          {isImage ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                // Handle image preview
                onMessagePress?.(message);
              }}
              style={styles.imageAttachment}
            >
              <FastImage
                source={{ uri: attachment.url }}
                style={styles.attachmentImage}
                resizeMode={FastImage.resizeMode.cover}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                // Handle file download/view
                onMessagePress?.(message);
              }}
              style={styles.fileAttachment}
            >
              <View style={styles.fileIconContainer}>
                <Image
                  source={require('../../assets/icons/file.png')}
                  style={styles.fileIcon}
                />
              </View>
              <View style={styles.fileInfo}>
                <Text
                  style={styles.fileName}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {attachment.name}
                </Text>
                <Text style={styles.fileSize}>
                  {(attachment.size / 1024).toFixed(1)} KB
                </Text>
              </View>
            </TouchableOpacity>
          )}
          
          {message.content ? (
            <Text
              style={[
                styles.fileMessageText,
                isCurrentUser ? styles.currentUserMessageText : styles.otherUserMessageText,
              ]}
            >
              {message.content}
            </Text>
          ) : null}
        </View>
      );
    },
    [renderTextMessage, onMessagePress]
  );
  
  /**
   * Renders a code snippet message with syntax highlighting
   */
  const renderCodeMessage = useCallback(
    (message: Message, isCurrentUser: boolean): JSX.Element => {
      const { codeSnippet } = message;
      
      if (!codeSnippet) {
        return renderTextMessage(message, isCurrentUser);
      }
      
      return (
        <View
          style={[
            styles.codeBubble,
            isCurrentUser ? styles.currentUserCodeBubble : styles.otherUserCodeBubble,
          ]}
        >
          <View style={styles.codeHeader}>
            <Text style={styles.codeLanguage}>{codeSnippet.language}</Text>
            {codeSnippet.title && (
              <Text style={styles.codeTitle}>{codeSnippet.title}</Text>
            )}
          </View>
          
          <View style={styles.codeContainer}>
            <Text
              style={styles.codeText}
              selectable
            >
              {codeSnippet.code}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.codeCopyButton}
            onPress={() => {
              // Handle code copy
              Clipboard.setString(codeSnippet.code);
            }}
          >
            <Image
              source={require('../../assets/icons/copy.png')}
              style={styles.codeCopyIcon}
            />
          </TouchableOpacity>
        </View>
      );
    },
    [renderTextMessage]
  );
  
  /**
   * Renders a date separator between messages from different days
   */
  const renderDaySeparator = useCallback((dateString: string): JSX.Element => {
    return (
      <View style={styles.daySeparator}>
        <View style={styles.daySeparatorLine} />
        <Text style={styles.daySeparatorText}>{dateString}</Text>
        <View style={styles.daySeparatorLine} />
      </View>
    );
  }, []);
  
  /**
   * Renders an animated typing indicator when someone is typing
   */
  const renderTypingIndicator = useCallback((): JSX.Element | null => {
    // Filter out current user from typing users
    const typingUserIds = Object.keys(typingUsers).filter(id => id !== user?.id);
    
    if (typingUserIds.length === 0) {
      return null;
    }
    
    // Create animated dots for typing indicator
    const dot1Opacity = typingAnimation.interpolate({
      inputRange: [0, 0.3, 1],
      outputRange: [0.3, 1, 0.3],
    });
    
    const dot2Opacity = typingAnimation.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.3, 1, 0.3],
    });
    
    const dot3Opacity = typingAnimation.interpolate({
      inputRange: [0, 0.7, 1],
      outputRange: [0.3, 1, 0.3],
    });
    
    return (
      <View style={styles.typingContainer}>
        <View style={styles.avatarContainer}>
          <View style={styles.typingAvatarPlaceholder} />
        </View>
        
        <View style={styles.typingBubble}>
          <Text style={styles.typingText}>
            {typingUserIds.length === 1
              ? `${typingUsers[typingUserIds[0]]} is typing...`
              : 'Multiple people are typing...'}
          </Text>
          <View style={styles.typingDotsContainer}>
            <Animated.View
              style={[styles.typingDot, { opacity: dot1Opacity }]}
            />
            <Animated.View
              style={[styles.typingDot, { opacity: dot2Opacity }]}
            />
            <Animated.View
              style={[styles.typingDot, { opacity: dot3Opacity }]}
            />
          </View>
        </View>
      </View>
    );
  }, [typingUsers, user?.id, typingAnimation]);
  
  // Start/stop typing animation based on typing users
  useEffect(() => {
    const typingUserIds = Object.keys(typingUsers).filter(id => id !== user?.id);
    
    if (typingUserIds.length > 0) {
      // Create repeating animation sequence
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnimation, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(typingAnimation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Stop animation when no one is typing
      typingAnimation.stopAnimation();
    }
    
    return () => {
      typingAnimation.stopAnimation();
    };
  }, [typingUsers, user?.id, typingAnimation]);
  
  /**
   * Renders a single message bubble with appropriate styling
   */
  const renderMessageBubble = useCallback(
    ({ item, index }: ListRenderItemInfo<Message>): JSX.Element => {
      const isCurrentUser = item.senderId === user?.id;
      
      // For inverted lists, previous and next indices are swapped
      const prevIndex = inverted ? index + 1 : index - 1;
      const nextIndex = inverted ? index - 1 : index + 1;
      
      const previousMessage = messages[prevIndex];
      const nextMessage = messages[nextIndex];
      
      const showAvatar = !isCurrentUser && !isMessageFromSameUser(item, previousMessage);
      const showTimestamp = shouldRenderTimestamp(item, nextMessage);
      
      const messageContent = () => {
        switch (item.type) {
          case MessageType.TEXT:
            return renderTextMessage(item, isCurrentUser);
          case MessageType.FILE:
            return renderFileMessage(item, isCurrentUser);
          case MessageType.CODE:
            return renderCodeMessage(item, isCurrentUser);
          default:
            return renderTextMessage(item, isCurrentUser);
        }
      };
      
      return (
        <TouchableOpacity
          activeOpacity={onMessagePress ? 0.8 : 1}
          onPress={() => onMessagePress?.(item)}
          onLongPress={() => onMessageLongPress?.(item)}
          style={[
            styles.messageContainer,
            isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer,
          ]}
          accessible
          accessibilityLabel={
            isCurrentUser ? 'Your message' : `Message from ${item.sender.firstName}`
          }
          accessibilityRole="text"
        >
          {/* Avatar - only show for other users and only for first message in a group */}
          {!isCurrentUser && (
            <View style={styles.avatarContainer}>
              {showAvatar ? (
                <Avatar
                  size={AvatarSize.SMALL}
                  firstName={item.sender.firstName}
                  lastName={item.sender.lastName}
                  source={item.sender.avatarUrl ? { uri: item.sender.avatarUrl } : undefined}
                />
              ) : (
                <View style={styles.avatarPlaceholder} />
              )}
            </View>
          )}
          
          <View
            style={[
              styles.bubbleContainer,
              isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
            ]}
          >
            {/* Message content */}
            {messageContent()}
            
            {/* Timestamp and status - only show for last message in a group */}
            {showTimestamp && (
              <View
                style={[
                  styles.timestampContainer,
                  isCurrentUser ? styles.timestampRight : styles.timestampLeft,
                ]}
              >
                <Text style={styles.timestampText}>
                  {formatMessageTimestamp(item.createdAt)}
                </Text>
                
                {/* Message status indicators for current user */}
                {isCurrentUser && (
                  <View style={styles.statusContainer}>
                    {item.status === MessageStatus.SENT && (
                      <Image
                        source={require('../../assets/icons/check.png')}
                        style={styles.statusIcon}
                      />
                    )}
                    {item.status === MessageStatus.DELIVERED && (
                      <Image
                        source={require('../../assets/icons/check-double.png')}
                        style={styles.statusIcon}
                      />
                    )}
                    {item.status === MessageStatus.READ && (
                      <Image
                        source={require('../../assets/icons/check-double.png')}
                        style={[styles.statusIcon, styles.readStatus]}
                      />
                    )}
                    {item.status === MessageStatus.FAILED && (
                      <Image
                        source={require('../../assets/icons/alert-circle.png')}
                        style={[styles.statusIcon, styles.errorStatus]}
                      />
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [
      user?.id,
      messages,
      inverted,
      isMessageFromSameUser,
      shouldRenderTimestamp,
      renderTextMessage,
      renderFileMessage,
      renderCodeMessage,
      onMessagePress,
      onMessageLongPress,
      formatMessageTimestamp,
    ]
  );
  
  // Determine if list is empty
  const isListEmpty = useMemo(() => {
    return !loading && messages.length === 0;
  }, [loading, messages.length]);
  
  return (
    <View style={[styles.container, style]}>
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderMessageBubble}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.contentContainer,
          !messages.length && styles.emptyContent,
          contentContainerStyle,
        ]}
        style={styles.list}
        inverted={inverted}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary[500]}
              colors={[colors.primary[500]]}
            />
          ) : undefined
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={onEndReachedThreshold}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <Spinner
                size={SpinnerSize.MEDIUM}
                color={SpinnerColor.PRIMARY}
              />
            </View>
          ) : renderEmptyComponent ? (
            renderEmptyComponent()
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No messages yet</Text>
            </View>
          )
        }
        ListFooterComponent={
          !isListEmpty ? (
            <>
              {loading && !refreshing ? (
                <View style={styles.footerLoading}>
                  <Spinner size={SpinnerSize.SMALL} color={SpinnerColor.PRIMARY} />
                </View>
              ) : null}
              {renderTypingIndicator()}
            </>
          ) : null
        }
        automaticallyAdjustContentInsets={false}
        showsVerticalScrollIndicator={true}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={11}
        removeClippedSubviews={Platform.OS === 'android'}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 100,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  list: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    color: colors.gray[500],
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  footerLoading: {
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Message containers
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 4,
  },
  currentUserContainer: {
    justifyContent: 'flex-end',
  },
  otherUserContainer: {
    justifyContent: 'flex-start',
  },
  
  // Avatar
  avatarContainer: {
    width: 32,
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  avatarPlaceholder: {
    width: 32,
    height: 0,
  },
  
  // Bubble container
  bubbleContainer: {
    maxWidth: '75%',
    borderRadius: 18,
    overflow: 'hidden',
  },
  currentUserBubble: {
    alignSelf: 'flex-end',
  },
  otherUserBubble: {
    alignSelf: 'flex-start',
  },
  
  // Text bubble
  textBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  currentUserTextBubble: {
    backgroundColor: colors.primary[500],
  },
  otherUserTextBubble: {
    backgroundColor: colors.gray[200],
  },
  
  // Message text
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  currentUserMessageText: {
    color: colors.white,
  },
  otherUserMessageText: {
    color: colors.text.primary,
  },
  
  // File bubble
  fileBubble: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  currentUserFileBubble: {
    backgroundColor: colors.primary[500],
  },
  otherUserFileBubble: {
    backgroundColor: colors.gray[200],
  },
  
  // Image attachment
  imageAttachment: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  attachmentImage: {
    width: '100%',
    aspectRatio: 1.5,
    borderRadius: 12,
  },
  
  // File attachment
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    marginBottom: 6,
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 8,
    marginRight: 10,
  },
  fileIcon: {
    width: 24,
    height: 24,
    tintColor: colors.primary[500],
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  fileMessageText: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  
  // Code snippet bubble
  codeBubble: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  currentUserCodeBubble: {
    backgroundColor: colors.primary[700],
  },
  otherUserCodeBubble: {
    backgroundColor: colors.gray[800],
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  codeLanguage: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
    textTransform: 'uppercase',
  },
  codeTitle: {
    fontSize: 12,
    color: colors.white,
    opacity: 0.8,
  },
  codeContainer: {
    padding: 10,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: colors.white,
  },
  codeCopyButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 13,
  },
  codeCopyIcon: {
    width: 16,
    height: 16,
    tintColor: colors.white,
  },
  
  // Timestamp
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  timestampLeft: {
    paddingLeft: 12,
    justifyContent: 'flex-start',
  },
  timestampRight: {
    paddingRight: 12,
    justifyContent: 'flex-end',
  },
  timestampText: {
    fontSize: 11,
    color: colors.gray[500],
  },
  
  // Status indicators
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  statusIcon: {
    width: 14,
    height: 14,
    tintColor: colors.gray[500],
  },
  readStatus: {
    tintColor: colors.primary[500],
  },
  errorStatus: {
    tintColor: colors.error[500],
  },
  
  // Day separator
  daySeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  daySeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray[300],
  },
  daySeparatorText: {
    fontSize: 12,
    color: colors.gray[500],
    marginHorizontal: 8,
  },
  
  // Typing indicator
  typingContainer: {
    flexDirection: 'row',
    marginTop: 8,
    paddingLeft: 40,
  },
  typingAvatarPlaceholder: {
    width: 32,
    height: 32,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[200],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    maxWidth: '75%',
  },
  typingText: {
    fontSize: 14,
    color: colors.gray[600],
    marginRight: 8,
  },
  typingDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gray[500],
    marginHorizontal: 2,
  },
});

export default MessageList;