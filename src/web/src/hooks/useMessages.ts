import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import debounce from 'lodash'; // lodash v4.17.21

import { 
  messagesSlice, 
  selectCurrentConversation, 
  selectConversationMessages, 
  selectMessagesLoading, 
  selectMessagesError,
  selectConversations,
  getMessages,
  getConversations,
  createConversation,
  sendMessage,
  markMessagesAsRead,
  joinConversation,
  leaveConversation,
  setCurrentConversation,
  addMessage,
  updateMessageStatus,
  sendTypingIndicator
} from '../store/slices/messagesSlice';

import { messagesAPI } from '../lib/api';
import { messageSocketService } from '../lib/websocket';
import { useMessageWebSocket } from './useWebSocket';
import useAuth from './useAuth';

import { 
  Message, 
  Conversation, 
  CreateMessageDTO, 
  CreateConversationDTO, 
  MessageType, 
  TypingIndicator, 
  FileAttachment, 
  CodeSnippet, 
  MessageStatus 
} from '../types/message';

import { formatDateTimeForDisplay } from '../utils/date';

// Constants for typing indicators
const TYPING_INDICATOR_THROTTLE = 1000; // ms
const TYPING_INDICATOR_TIMEOUT = 3000; // ms

/**
 * Custom hook for managing messaging state and operations in the application
 * 
 * @param options - Configuration options
 * @returns Message-related state and functions for use in React components
 */
export const useMessages = (options = {}) => {
  // Initialize Redux dispatch and hooks
  const dispatch = useDispatch();
  const { user } = useAuth();
  
  // Get WebSocket functionality for messaging
  const {
    joinConversation: wsJoinConversation,
    leaveConversation: wsLeaveConversation,
    sendMessage: wsSendMessage,
    markAsRead: wsMarkAsRead,
    sendTypingIndicator: wsSendTypingIndicator,
    onMessageReceived,
    onTypingIndicator,
    activeTypers
  } = useMessageWebSocket();
  
  // Local state for typing indicators and file uploads
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [fileUploads, setFileUploads] = useState<Map<string, { progress: number, error: string | null }>>(
    new Map()
  );
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Select data from Redux state
  const currentConversation = useSelector(selectCurrentConversation);
  const messages = useSelector(selectConversationMessages);
  const isLoading = useSelector(selectMessagesLoading);
  const error = useSelector(selectMessagesError);
  const conversations = useSelector(selectConversations);
  
  /**
   * Load messages for a specific conversation
   * @param conversationId - ID of the conversation to load messages for
   */
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      // Fetch messages through Redux thunk
      await dispatch(getMessages({ conversationId })).unwrap();
      
      // Join WebSocket room for real-time updates
      await dispatch(joinConversation(conversationId)).unwrap();
      await wsJoinConversation(conversationId);
      
      // Mark messages as read
      if (messages.length > 0) {
        const unreadMessages = messages
          .filter(msg => 
            msg.senderId !== user?.id && 
            msg.status !== MessageStatus.READ
          )
          .map(msg => msg.id);
          
        if (unreadMessages.length > 0) {
          await dispatch(markMessagesAsRead({ 
            conversationId, 
            messageIds: unreadMessages 
          })).unwrap();
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, [dispatch, wsJoinConversation, messages, user]);
  
  /**
   * Load all conversations for the current user
   */
  const loadConversations = useCallback(async () => {
    try {
      await dispatch(getConversations()).unwrap();
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, [dispatch]);
  
  /**
   * Create a new conversation
   * @param data - Conversation creation data
   * @returns New conversation or null if creation failed
   */
  const createNewConversation = useCallback(async (data: CreateConversationDTO): Promise<Conversation | null> => {
    try {
      const conversation = await dispatch(createConversation(data)).unwrap();
      
      // Set as current conversation
      dispatch(setCurrentConversation(conversation));
      
      // Join WebSocket room for real-time updates
      await dispatch(joinConversation(conversation.id)).unwrap();
      await wsJoinConversation(conversation.id);
      
      return conversation;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      return null;
    }
  }, [dispatch, wsJoinConversation]);
  
  /**
   * Set the current active conversation
   * @param conversation - Conversation to set as active
   */
  const setActiveConversation = useCallback((conversation: Conversation | null) => {
    // Leave current conversation WebSocket room if we have one
    if (currentConversation && conversation?.id !== currentConversation.id) {
      dispatch(leaveConversation(currentConversation.id));
      wsLeaveConversation(currentConversation.id);
    }
    
    // Set new conversation
    dispatch(setCurrentConversation(conversation));
    
    // Join new conversation WebSocket room if needed
    if (conversation) {
      loadMessages(conversation.id);
    }
  }, [dispatch, currentConversation, wsLeaveConversation, loadMessages]);
  
  /**
   * Send a text message in the current conversation
   * @param text - Text message content
   * @returns Promise resolving to sent message or null if failed
   */
  const sendTextMessage = useCallback(async (text: string): Promise<Message | null> => {
    if (!currentConversation) {
      console.error('No active conversation');
      return null;
    }
    
    try {
      const messageData: CreateMessageDTO = {
        conversationId: currentConversation.id,
        type: MessageType.TEXT,
        content: text,
        attachmentId: null,
        codeSnippet: null
      };
      
      const newMessage = await dispatch(sendMessage(messageData)).unwrap();
      return newMessage;
    } catch (error) {
      console.error('Failed to send message:', error);
      return null;
    }
  }, [dispatch, currentConversation]);
  
  /**
   * Send a file message in the current conversation
   * @param file - File to send
   * @param caption - Optional caption for the file
   * @returns Promise resolving to sent message or null if failed
   */
  const sendFileMessage = useCallback(async (file: File, caption?: string): Promise<Message | null> => {
    if (!currentConversation) {
      console.error('No active conversation');
      return null;
    }
    
    // Generate a temporary ID for tracking upload progress
    const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Initialize progress tracking
    setFileUploads(prev => {
      const newMap = new Map(prev);
      newMap.set(uploadId, { progress: 0, error: null });
      return newMap;
    });
    
    try {
      // Upload file with progress tracking
      const attachment = await messagesAPI.uploadAttachment(
        file, 
        currentConversation.id,
        (progress) => {
          setFileUploads(prev => {
            const newMap = new Map(prev);
            newMap.set(uploadId, { progress, error: null });
            return newMap;
          });
        }
      );
      
      // Create and send message with file attachment
      const messageData: CreateMessageDTO = {
        conversationId: currentConversation.id,
        type: MessageType.FILE,
        content: caption || file.name,
        attachmentId: attachment.id,
        codeSnippet: null
      };
      
      const newMessage = await dispatch(sendMessage(messageData)).unwrap();
      
      // Remove from progress tracking
      setFileUploads(prev => {
        const newMap = new Map(prev);
        newMap.delete(uploadId);
        return newMap;
      });
      
      return newMessage;
    } catch (error) {
      // Update error state
      setFileUploads(prev => {
        const newMap = new Map(prev);
        newMap.set(uploadId, { 
          progress: 0, 
          error: error instanceof Error ? error.message : 'File upload failed' 
        });
        return newMap;
      });
      
      console.error('Failed to upload file:', error);
      return null;
    }
  }, [dispatch, currentConversation]);
  
  /**
   * Send a code snippet message in the current conversation
   * @param code - Code content
   * @param language - Programming language
   * @param title - Optional title for the snippet
   * @returns Promise resolving to sent message or null if failed
   */
  const sendCodeMessage = useCallback(async (
    code: string, 
    language: string, 
    title?: string
  ): Promise<Message | null> => {
    if (!currentConversation) {
      console.error('No active conversation');
      return null;
    }
    
    try {
      const codeSnippet: CodeSnippet = {
        code,
        language,
        title: title || 'Code Snippet'
      };
      
      const messageData: CreateMessageDTO = {
        conversationId: currentConversation.id,
        type: MessageType.CODE,
        content: '',
        attachmentId: null,
        codeSnippet
      };
      
      const newMessage = await dispatch(sendMessage(messageData)).unwrap();
      return newMessage;
    } catch (error) {
      console.error('Failed to send code snippet:', error);
      return null;
    }
  }, [dispatch, currentConversation]);
  
  /**
   * Mark messages as read in the current conversation
   * @returns Promise resolving when messages are marked as read
   */
  const markAsRead = useCallback(async () => {
    if (!currentConversation) return;
    
    const unreadMessages = messages
      .filter(msg => 
        msg.senderId !== user?.id && 
        msg.status !== MessageStatus.READ
      )
      .map(msg => msg.id);
      
    if (unreadMessages.length > 0) {
      try {
        await dispatch(markMessagesAsRead({ 
          conversationId: currentConversation.id, 
          messageIds: unreadMessages 
        })).unwrap();
        
        // Also send via WebSocket for immediate syncing
        await wsMarkAsRead(currentConversation.id, unreadMessages);
      } catch (error) {
        console.error('Failed to mark messages as read:', error);
      }
    }
  }, [dispatch, currentConversation, messages, user, wsMarkAsRead]);
  
  /**
   * Handle typing indicator with debouncing
   */
  const debouncedTypingIndicator = useMemo(() => 
    debounce((conversationId: string, isTyping: boolean) => {
      dispatch(sendTypingIndicator({ conversationId, isTyping }));
      wsSendTypingIndicator(conversationId, isTyping);
    }, TYPING_INDICATOR_THROTTLE),
    [dispatch, wsSendTypingIndicator]
  );
  
  /**
   * Send typing indicator to the current conversation
   * @param isTyping - Whether the user is currently typing
   */
  const sendUserTypingIndicator = useCallback((isTyping: boolean) => {
    if (!currentConversation) return;
    debouncedTypingIndicator(currentConversation.id, isTyping);
  }, [currentConversation, debouncedTypingIndicator]);
  
  /**
   * Format a timestamp for display in the UI
   * @param timestamp - Date to format
   * @returns Formatted timestamp string
   */
  const formatMessageTime = useCallback((timestamp: Date | string) => {
    return formatDateTimeForDisplay(timestamp);
  }, []);
  
  // Set up handler for incoming messages via WebSocket
  useEffect(() => {
    if (!currentConversation || !user) return;
    
    // Handler for new messages
    const handleIncomingMessage = (message: Message) => {
      // Avoid duplicates by checking if this is from another user
      if (message.senderId !== user.id) {
        dispatch(addMessage(message));
        
        // Mark as delivered immediately if we're viewing this conversation
        if (message.status === MessageStatus.SENT) {
          dispatch(updateMessageStatus({ 
            messageId: message.id, 
            status: MessageStatus.DELIVERED 
          }));
        }
      }
    };
    
    // Register message listener
    const unsubscribe = onMessageReceived(currentConversation.id, handleIncomingMessage);
    
    return () => {
      unsubscribe();
    };
  }, [dispatch, currentConversation, user, onMessageReceived]);
  
  // Set up handler for typing indicators
  useEffect(() => {
    if (!currentConversation || !user) return;
    
    // Handler for typing indicators
    const handleTypingIndicator = (indicator: TypingIndicator) => {
      // Ignore our own typing indicators
      if (indicator.userId === user.id) return;
      
      // Clear existing timeout for this user
      const existingTimeout = typingTimeoutsRef.current.get(indicator.userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      if (indicator.isTyping) {
        // Update typing users
        setTypingUsers(prev => {
          // Filter out this user if already present
          const filtered = prev.filter(i => i.userId !== indicator.userId);
          return [...filtered, indicator];
        });
        
        // Set timeout to clear typing indicator
        const timeout = setTimeout(() => {
          setTypingUsers(prev => prev.filter(i => i.userId !== indicator.userId));
          typingTimeoutsRef.current.delete(indicator.userId);
        }, TYPING_INDICATOR_TIMEOUT);
        
        typingTimeoutsRef.current.set(indicator.userId, timeout);
      } else {
        // Remove typing indicator immediately
        setTypingUsers(prev => prev.filter(i => i.userId !== indicator.userId));
        typingTimeoutsRef.current.delete(indicator.userId);
      }
    };
    
    // Register typing indicator listener
    const unsubscribe = onTypingIndicator(currentConversation.id, handleTypingIndicator);
    
    return () => {
      // Clear all typing timeouts
      typingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      typingTimeoutsRef.current.clear();
      
      unsubscribe();
    };
  }, [currentConversation, user, onTypingIndicator]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (currentConversation) {
        dispatch(leaveConversation(currentConversation.id));
        wsLeaveConversation(currentConversation.id);
      }
      
      // Clear all typing timeouts
      typingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      typingTimeoutsRef.current.clear();
    };
  }, [dispatch, currentConversation, wsLeaveConversation]);
  
  // Return the message management API
  return {
    // State
    conversations,
    currentConversation,
    messages,
    isLoading,
    error,
    typingUsers,
    fileUploads,
    
    // Conversation management
    loadConversations,
    createConversation: createNewConversation,
    setCurrentConversation: setActiveConversation,
    
    // Message operations
    loadMessages,
    sendMessage: sendTextMessage,
    sendFileMessage,
    sendCodeMessage,
    markAsRead,
    
    // WebSocket functionality
    joinConversation: wsJoinConversation,
    leaveConversation: wsLeaveConversation,
    sendTypingIndicator: sendUserTypingIndicator,
    
    // Utilities
    formatMessageTime
  };
};