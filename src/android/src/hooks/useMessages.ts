import { useState, useEffect, useCallback, useRef, useMemo } from 'react'; // react 18.2.0
import { useToast } from 'react-native-toast-notifications'; // react-native-toast-notifications ^3.3.1
import NetInfo from '@react-native-community/netinfo'; // @react-native-community/netinfo ^9.3.10

import {
  Message,
  Conversation,
  MessageStatus,
  CreateMessageDTO,
  MessageSocketEvent,
  ConnectionState,
  PendingMessage
} from '../types/message.types';

import { useAppDispatch, useAppSelector } from '../store';
import {
  messagesActions,
  fetchConversations,
  fetchMessages,
  sendMessage,
  markMessagesAsRead,
  setActiveConversation,
  updateNetworkStatus,
  syncOfflineMessages
} from '../store/slices/messagesSlice';

import { 
  messageSocketService,
  ConnectionState as WebSocketConnectionState
} from '../lib/websocket';

import { messagesAPI } from '../lib/api';
import { useAuth } from './useAuth';
import {
  formatMessageDate,
  formatRelativeTime,
  formatRelativeDateForMobile
} from '../utils/date';

/**
 * Custom hook that provides comprehensive messaging functionality for the Android application
 * 
 * @returns Object containing messaging state and methods
 */
export function useMessages() {
  // Initialize local state for loading and error states
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [activeTypingUsers, setActiveTypingUsers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Get authentication state and user data from useAuth hook
  const { user, isAuthenticated } = useAuth();
  
  // Initialize toast notifications for user feedback
  const toast = useToast();
  
  // Access messaging state from Redux store using useAppSelector
  const { 
    conversations, 
    currentConversation, 
    messages, 
    networkConnected,
    pendingMessages
  } = useAppSelector(state => state.messages);
  
  // Initialize the dispatch function using useAppDispatch
  const dispatch = useAppDispatch();
  
  // Store the current connection state from WebSocket service
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    messageSocketService.getConnectionState()
  );
  
  // Track previous network state for detecting connectivity changes
  const prevNetworkState = useRef(networkConnected);
  
  // Handle network state changes for offline message handling
  useEffect(() => {
    // If network was restored, try to sync pending messages
    if (!prevNetworkState.current && networkConnected && pendingMessages.length > 0) {
      dispatch(syncOfflineMessages());
      
      // Show toast notification for user feedback
      toast.show('Syncing offline messages...', { 
        type: 'info',
        duration: 3000,
        placement: 'bottom'
      });
    }
    
    // Update previous network state
    prevNetworkState.current = networkConnected;
  }, [networkConnected, pendingMessages.length, dispatch, toast]);
  
  // Set up WebSocket connection and event listeners when authenticated
  useEffect(() => {
    // Only connect if user is authenticated
    if (!isAuthenticated || !user) {
      return;
    }
    
    // Initialize WebSocket connection
    const initializeWebSocket = async () => {
      try {
        await messageSocketService.initialize();
      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
      }
    };
    
    // Set up event listeners for WebSocket events
    const onMessageReceived = (message: Message) => {
      dispatch(messagesActions.addMessage(message));
      
      // Show notification for new message if not in current conversation
      if (currentConversation?.id !== message.conversationId) {
        toast.show(`New message from ${message.sender.firstName}`, {
          type: 'info',
          duration: 3000,
          placement: 'top'
        });
      }
    };
    
    const onTypingIndicator = (data: any) => {
      const { userId, isTyping } = data;
      
      if (isTyping) {
        setActiveTypingUsers((prev) => 
          prev.includes(userId) ? prev : [...prev, userId]
        );
        
        // Auto-clear typing indicator after 10 seconds in case of missed events
        setTimeout(() => {
          setActiveTypingUsers((prev) => 
            prev.filter(id => id !== userId)
          );
        }, 10000);
      } else {
        setActiveTypingUsers((prev) => 
          prev.filter(id => id !== userId)
        );
      }
    };
    
    const onConnectionStateChange = (state: ConnectionState) => {
      setConnectionState(state);
      
      // Show toast for significant connection state changes
      if (state === ConnectionState.CONNECTED) {
        toast.show('Connected to messaging server', { 
          type: 'success',
          duration: 2000,
          placement: 'bottom'
        });
      } else if (state === ConnectionState.DISCONNECTED) {
        toast.show('Disconnected from messaging server', { 
          type: 'warning',
          duration: 3000,
          placement: 'bottom'
        });
      }
    };
    
    // Register event listeners
    const messageSubscription = messageSocketService.onMessageReceived(onMessageReceived);
    const typingSubscription = messageSocketService.onTypingIndicator(onTypingIndicator);
    const connectionSubscription = messageSocketService.onConnectionStateChange(onConnectionStateChange);
    
    // Connect to WebSocket
    initializeWebSocket();
    
    // Clean up WebSocket listeners and connections on unmount
    return () => {
      messageSubscription();
      typingSubscription();
      connectionSubscription();
      messageSocketService.shutdown();
    };
  }, [isAuthenticated, user, dispatch, toast, currentConversation]);
  
  // Set up network state change listener for offline message handling
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      dispatch(updateNetworkStatus(state.isConnected || false));
    });
    
    return () => {
      unsubscribe();
    };
  }, [dispatch]);
  
  /**
   * Loads user conversations
   * 
   * @returns Promise resolving when conversations are loaded
   */
  const loadConversations = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) {
      return;
    }
    
    try {
      setIsLoadingConversations(true);
      setError(null);
      await dispatch(fetchConversations()).unwrap();
    } catch (error: any) {
      setError(error.message || 'Failed to load conversations');
      toast.show('Failed to load conversations', { 
        type: 'danger',
        duration: 3000
      });
    } finally {
      setIsLoadingConversations(false);
    }
  }, [isAuthenticated, dispatch, toast]);
  
  /**
   * Loads messages for a specific conversation
   * 
   * @param conversationId ID of the conversation to load messages for
   * @returns Promise resolving when messages are loaded
   */
  const loadMessages = useCallback(async (conversationId: string): Promise<void> => {
    if (!isAuthenticated || !conversationId) {
      return;
    }
    
    try {
      setIsLoadingMessages(true);
      setError(null);
      await dispatch(fetchMessages(conversationId)).unwrap();
      
      // Mark messages as read
      await dispatch(markMessagesAsRead(conversationId)).unwrap();
    } catch (error: any) {
      setError(error.message || 'Failed to load messages');
      toast.show('Failed to load messages', { 
        type: 'danger',
        duration: 3000
      });
    } finally {
      setIsLoadingMessages(false);
    }
  }, [isAuthenticated, dispatch, toast]);
  
  /**
   * Sends a new message with offline queue support
   * 
   * @param messageData The message data to send
   * @returns Promise resolving when message is sent or queued
   */
  const sendMessageFn = useCallback(async (messageData: CreateMessageDTO): Promise<void> => {
    if (!isAuthenticated || !user) {
      toast.show('You must be logged in to send messages', { 
        type: 'warning',
        duration: 3000
      });
      return;
    }
    
    try {
      setIsSendingMessage(true);
      setError(null);
      
      // Dispatch the action to send the message
      await dispatch(sendMessage({ 
        messageData, 
        currentUserId: user.id 
      })).unwrap();
      
      // If network is offline, show a toast notification
      if (!networkConnected) {
        toast.show('Message queued for delivery when back online', { 
          type: 'info',
          duration: 3000
        });
      }
    } catch (error: any) {
      setError(error.message || 'Failed to send message');
      toast.show('Failed to send message', { 
        type: 'danger',
        duration: 3000
      });
    } finally {
      setIsSendingMessage(false);
    }
  }, [isAuthenticated, user, dispatch, toast, networkConnected]);
  
  /**
   * Marks messages in a conversation as read
   * 
   * @param conversationId The ID of the conversation
   * @param messageIds Optional array of message IDs to mark as read
   * @returns Promise resolving when messages are marked as read
   */
  const markAsRead = useCallback(async (conversationId: string, messageIds: string[] = []): Promise<void> => {
    if (!isAuthenticated || !conversationId) {
      return;
    }
    
    try {
      setError(null);
      await dispatch(markMessagesAsRead(conversationId)).unwrap();
    } catch (error: any) {
      setError(error.message || 'Failed to mark messages as read');
      console.error('Failed to mark messages as read:', error);
    }
  }, [isAuthenticated, dispatch]);
  
  /**
   * Selects a conversation and joins the corresponding WebSocket room
   * 
   * @param conversationId The ID of the conversation to select
   * @returns Promise resolving when conversation is selected and joined
   */
  const selectConversation = useCallback(async (conversationId: string): Promise<void> => {
    if (!conversationId) {
      return;
    }
    
    try {
      // Leave current conversation room if there is one
      if (currentConversation) {
        await messageSocketService.leaveConversation(currentConversation.id);
      }
      
      // Find the conversation in the list
      const conversation = conversations.find(c => c.id === conversationId);
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      
      // Set the active conversation in Redux store
      dispatch(setActiveConversation(conversation));
      
      // Join the conversation room
      await messageSocketService.joinConversation(conversationId);
      
      // Load messages for the conversation
      await loadMessages(conversationId);
    } catch (error: any) {
      setError(error.message || 'Failed to select conversation');
      toast.show('Failed to select conversation', { 
        type: 'danger',
        duration: 3000
      });
    }
  }, [currentConversation, conversations, dispatch, loadMessages, toast]);
  
  /**
   * Gets the total number of unread messages across all conversations
   * 
   * @returns Total unread message count
   */
  const getUnreadCount = useCallback((): number => {
    return conversations.reduce((total, conv) => total + conv.unreadCount, 0);
  }, [conversations]);
  
  /**
   * Sends typing indicator status to show typing status to other users
   * 
   * @param conversationId The ID of the conversation
   * @param isTyping Whether the user is currently typing
   * @returns Promise resolving when typing indicator is sent
   */
  const sendTypingIndicator = useCallback(async (conversationId: string, isTyping: boolean): Promise<void> => {
    if (!isAuthenticated || !conversationId) {
      return;
    }
    
    try {
      await messageSocketService.sendTypingIndicator(conversationId, isTyping);
    } catch (error) {
      console.error('Failed to send typing indicator:', error);
    }
  }, [isAuthenticated]);
  
  /**
   * Uploads a file attachment for a message
   * 
   * @param file The file to upload (React Native file object)
   * @param conversationId The ID of the conversation
   * @returns Promise resolving to the uploaded file ID
   */
  const uploadAttachment = useCallback(async (file: any, conversationId: string): Promise<string> => {
    if (!file || !conversationId) {
      throw new Error('File and conversation ID are required');
    }
    
    try {
      setError(null);
      const result = await messagesAPI.uploadAttachment(file, (progress) => {
        // Progress handling could be implemented here
        console.log(`Upload progress: ${progress}%`);
      });
      
      return result.id;
    } catch (error: any) {
      setError(error.message || 'Failed to upload attachment');
      toast.show('Failed to upload attachment', { 
        type: 'danger',
        duration: 3000
      });
      throw error;
    }
  }, [toast]);
  
  /**
   * Creates a new conversation with specified participants
   * 
   * @param participantIds Array of user IDs to include in the conversation
   * @param title Optional title for the conversation
   * @param initialMessage Optional initial message for the conversation
   * @returns Promise resolving to the ID of the created conversation
   */
  const createNewConversation = useCallback(async (
    participantIds: string[],
    title?: string,
    initialMessage?: string
  ): Promise<string> => {
    if (!isAuthenticated || !participantIds.length) {
      throw new Error('Authentication and participants are required to create a conversation');
    }
    
    try {
      setError(null);
      
      // Create conversation object
      const conversationData = {
        participantIds,
        title: title || '',
        projectId: null,
        initialMessage: initialMessage || null
      };
      
      // Call API to create conversation
      const result = await messagesAPI.createConversation(conversationData);
      
      // Refresh conversations to include the new one
      await loadConversations();
      
      // Return the ID of the new conversation
      return result.id;
    } catch (error: any) {
      setError(error.message || 'Failed to create conversation');
      toast.show('Failed to create conversation', { 
        type: 'danger',
        duration: 3000
      });
      throw error;
    }
  }, [isAuthenticated, loadConversations, toast]);
  
  /**
   * Formats a message timestamp for display optimized for mobile
   * 
   * @param date The date to format
   * @returns Formatted date string for display on mobile
   */
  const formatMessageTime = useCallback((date: Date | string): string => {
    return formatRelativeDateForMobile(date);
  }, []);
  
  /**
   * Clears any error state
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);
  
  // Determine if the WebSocket connection is active
  const isConnected = useMemo((): boolean => {
    return messageSocketService.isConnected();
  }, [connectionState]);
  
  // Return messaging state and functions
  return {
    // State
    conversations,
    currentConversation,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    isSendingMessage,
    isConnected,
    connectionState,
    activeTypingUsers,
    error,
    
    // Methods
    loadConversations,
    loadMessages,
    sendMessage: sendMessageFn,
    markAsRead,
    selectConversation,
    getUnreadCount,
    sendTypingIndicator,
    uploadAttachment,
    createNewConversation,
    formatMessageTime,
    clearError
  };
}