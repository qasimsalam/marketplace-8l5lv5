import { useState, useEffect, useCallback, useRef, useMemo } from 'react'; // ^18.2.0
import { useSelector, useDispatch } from 'react-redux'; // ^8.1.1
import { Platform, AppState, PermissionsAndroid } from 'react-native'; // 0.72.x
import debounce from 'lodash/debounce'; // ^4.0.8
import { launchImageLibrary, launchCamera } from 'react-native-image-picker'; // ^5.6.0
import DocumentPicker from 'react-native-document-picker'; // ^9.0.1
import RNFS from 'react-native-fs'; // ^2.20.0
import NetInfo from '@react-native-community/netinfo'; // ^9.3.10

// Internal imports
import { 
  Message, 
  Conversation, 
  CreateMessageDTO, 
  CreateConversationDTO, 
  FileAttachment, 
  MessageSocketEvent, 
  ConnectionState, 
  TypingIndicator 
} from '../types/message.types';
import { RootState, AppDispatch } from '../store';
import { 
  fetchConversations, 
  fetchConversationById, 
  createConversation, 
  fetchMessages, 
  sendMessage, 
  markAsRead, 
  setCurrentConversation, 
  updateActiveParticipants, 
  selectConversations, 
  selectCurrentConversation, 
  selectMessages, 
  selectMessagesLoading, 
  selectMessagesError, 
  selectActiveParticipants 
} from '../store/slices/messagesSlice';
import api from '../lib/api';
import { messageSocketService } from '../lib/websocket';
import useAuth from './useAuth';
import { formatRelativeDateForMobile } from '../utils/date';

// Constants
const TYPING_DEBOUNCE_MS = 500;
const MESSAGE_PAGINATION_LIMIT = 20;
const MAX_FILE_SIZE_MB = 10;

/**
 * Custom hook that provides messaging functionality for the application
 */
const useMessages = () => {
  // Extract auth state
  const { isAuthenticated, user } = useAuth();
  
  // Redux state
  const dispatch = useDispatch<AppDispatch>();
  const conversations = useSelector(selectConversations);
  const currentConversation = useSelector(selectCurrentConversation);
  const messages = useSelector(selectMessages);
  const loading = useSelector(selectMessagesLoading);
  const error = useSelector(selectMessagesError);
  const activeParticipants = useSelector(selectActiveParticipants);
  
  // Local state
  const [typingUsers, setTypingUsers] = useState<{ [userId: string]: string }>({});
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [uploadProgress, setUploadProgress] = useState<{ [id: string]: number }>({});
  const [page, setPage] = useState<number>(1);
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(true);
  
  // Refs
  const uploadCancelTokens = useRef<{ [id: string]: () => void }>({});
  const webSocketInitialized = useRef<boolean>(false);
  
  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) return [];
    
    try {
      const resultAction = await dispatch(fetchConversations());
      if (fetchConversations.fulfilled.match(resultAction)) {
        return resultAction.payload;
      }
      return [];
    } catch (error) {
      console.error('Error loading conversations:', error);
      return [];
    }
  }, [dispatch, isAuthenticated]);

  // Load a specific conversation
  const loadConversation = useCallback(async (conversationId: string) => {
    if (!isAuthenticated || !conversationId) return null;
    
    try {
      const resultAction = await dispatch(fetchConversationById(conversationId));
      if (fetchConversationById.fulfilled.match(resultAction)) {
        return resultAction.payload;
      }
      return null;
    } catch (error) {
      console.error('Error loading conversation:', error);
      return null;
    }
  }, [dispatch, isAuthenticated]);

  // Start a new conversation
  const startNewConversation = useCallback(async (data: CreateConversationDTO) => {
    if (!isAuthenticated) throw new Error('Authentication required');
    
    try {
      const resultAction = await dispatch(createConversation(data));
      if (createConversation.fulfilled.match(resultAction)) {
        return resultAction.payload;
      }
      throw new Error('Failed to create conversation');
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }, [dispatch, isAuthenticated]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    if (!isAuthenticated || !conversationId) return [];
    
    try {
      setPage(1);
      const resultAction = await dispatch(fetchMessages({ conversationId, page: 1, limit: MESSAGE_PAGINATION_LIMIT }));
      if (fetchMessages.fulfilled.match(resultAction)) {
        setHasMoreMessages(resultAction.payload.messages.length >= MESSAGE_PAGINATION_LIMIT);
        return resultAction.payload.messages;
      }
      return [];
    } catch (error) {
      console.error('Error loading messages:', error);
      return [];
    }
  }, [dispatch, isAuthenticated]);

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!isAuthenticated || !currentConversation || !hasMoreMessages || loading) return false;
    
    try {
      const nextPage = page + 1;
      const resultAction = await dispatch(fetchMessages({ 
        conversationId: currentConversation.id, 
        page: nextPage, 
        limit: MESSAGE_PAGINATION_LIMIT 
      }));
      
      if (fetchMessages.fulfilled.match(resultAction)) {
        setPage(nextPage);
        // Only set hasMoreMessages to false if we got fewer messages than requested
        const hasMore = resultAction.payload.messages.length >= MESSAGE_PAGINATION_LIMIT;
        setHasMoreMessages(hasMore);
        return hasMore;
      }
      return false;
    } catch (error) {
      console.error('Error loading more messages:', error);
      return false;
    }
  }, [dispatch, isAuthenticated, currentConversation, page, hasMoreMessages, loading]);

  // Send a text message
  const sendTextMessage = useCallback(async (text: string) => {
    if (!isAuthenticated || !currentConversation) throw new Error('Authentication required and active conversation');
    if (!text.trim()) throw new Error('Message cannot be empty');
    
    try {
      const messageData: CreateMessageDTO = {
        conversationId: currentConversation.id,
        type: 'text',
        content: text.trim(),
        attachmentId: null,
        codeSnippet: null
      };
      
      const resultAction = await dispatch(sendMessage(messageData));
      if (sendMessage.fulfilled.match(resultAction)) {
        return resultAction.payload;
      }
      throw new Error('Failed to send message');
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [dispatch, isAuthenticated, currentConversation]);

  // Send a file message
  const sendFileMessage = useCallback(async (file: FileAttachment, messageText?: string) => {
    if (!isAuthenticated || !currentConversation) throw new Error('Authentication required and active conversation');
    if (!file) throw new Error('File is required');
    
    try {
      const messageData: CreateMessageDTO = {
        conversationId: currentConversation.id,
        type: 'file',
        content: messageText || '',
        attachmentId: file.id,
        codeSnippet: null
      };
      
      const resultAction = await dispatch(sendMessage(messageData));
      if (sendMessage.fulfilled.match(resultAction)) {
        return resultAction.payload;
      }
      throw new Error('Failed to send file message');
    } catch (error) {
      console.error('Error sending file message:', error);
      throw error;
    }
  }, [dispatch, isAuthenticated, currentConversation]);

  // Send a code snippet
  const sendCodeSnippet = useCallback(async (code: string, language: string, title: string) => {
    if (!isAuthenticated || !currentConversation) throw new Error('Authentication required and active conversation');
    if (!code.trim()) throw new Error('Code cannot be empty');
    
    try {
      const messageData: CreateMessageDTO = {
        conversationId: currentConversation.id,
        type: 'code',
        content: '',
        attachmentId: null,
        codeSnippet: {
          code,
          language,
          title
        }
      };
      
      const resultAction = await dispatch(sendMessage(messageData));
      if (sendMessage.fulfilled.match(resultAction)) {
        return resultAction.payload;
      }
      throw new Error('Failed to send code snippet');
    } catch (error) {
      console.error('Error sending code snippet:', error);
      throw error;
    }
  }, [dispatch, isAuthenticated, currentConversation]);

  // Select image attachment from library
  const selectImageAttachment = useCallback(async (): Promise<FileAttachment | null> => {
    if (!isAuthenticated) throw new Error('Authentication required');
    
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
        includeBase64: false
      });
      
      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return null;
      }
      
      const selectedImage = result.assets[0];
      if (!selectedImage.uri) {
        throw new Error('Invalid image selection');
      }
      
      // Check file size
      if (selectedImage.fileSize && selectedImage.fileSize > MAX_FILE_SIZE_MB * 1024 * 1024) {
        throw new Error(`File size exceeds maximum limit of ${MAX_FILE_SIZE_MB}MB`);
      }
      
      // Upload the file
      const uploadId = Date.now().toString();
      
      // Set initial progress
      setUploadProgress(prev => ({ ...prev, [uploadId]: 0 }));
      
      // Upload attachment
      const attachment = await api.messages.uploadAttachment({
        uri: selectedImage.uri,
        type: selectedImage.type || 'image/jpeg',
        name: selectedImage.fileName || 'image.jpg'
      });
      
      // Set complete progress
      setUploadProgress(prev => ({ ...prev, [uploadId]: 100 }));
      
      // Add a short delay before removing progress indicator for UX
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[uploadId];
          return newProgress;
        });
      }, 500);
      
      // Return the attachment with local URI
      return {
        ...attachment,
        localUri: selectedImage.uri
      };
    } catch (error) {
      console.error('Error selecting image attachment:', error);
      throw error;
    }
  }, [isAuthenticated]);

  // Take photo attachment from camera
  const takePhotoAttachment = useCallback(async (): Promise<FileAttachment | null> => {
    if (!isAuthenticated) throw new Error('Authentication required');
    
    // Request camera permission on Android
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Camera Permission",
            message: "The app needs access to your camera to take photos",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new Error('Camera permission denied');
        }
      } catch (error) {
        console.error('Error requesting camera permission:', error);
        throw error;
      }
    }
    
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: false
      });
      
      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return null;
      }
      
      const capturedImage = result.assets[0];
      if (!capturedImage.uri) {
        throw new Error('Invalid image capture');
      }
      
      // Check file size
      if (capturedImage.fileSize && capturedImage.fileSize > MAX_FILE_SIZE_MB * 1024 * 1024) {
        throw new Error(`File size exceeds maximum limit of ${MAX_FILE_SIZE_MB}MB`);
      }
      
      const uploadId = Date.now().toString();
      
      // Set initial progress
      setUploadProgress(prev => ({ ...prev, [uploadId]: 0 }));
      
      // Upload attachment
      const attachment = await api.messages.uploadAttachment({
        uri: capturedImage.uri,
        type: capturedImage.type || 'image/jpeg',
        name: capturedImage.fileName || 'image.jpg'
      });
      
      // Set complete progress
      setUploadProgress(prev => ({ ...prev, [uploadId]: 100 }));
      
      // Add a short delay before removing progress indicator for UX
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[uploadId];
          return newProgress;
        });
      }, 500);
      
      // Return the attachment with local URI
      return {
        ...attachment,
        localUri: capturedImage.uri
      };
    } catch (error) {
      console.error('Error taking photo attachment:', error);
      throw error;
    }
  }, [isAuthenticated]);

  // Select document attachment
  const selectDocumentAttachment = useCallback(async (): Promise<FileAttachment | null> => {
    if (!isAuthenticated) throw new Error('Authentication required');
    
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory'
      });
      
      // DocumentPicker can return multiple files, we'll just use the first one
      const selectedFile = Array.isArray(result) ? result[0] : result;
      
      if (!selectedFile || !selectedFile.uri) {
        throw new Error('Invalid document selection');
      }
      
      // Check file size - use RNFS to get file size if not provided by DocumentPicker
      let fileSize = selectedFile.size;
      if (!fileSize) {
        const stats = await RNFS.stat(selectedFile.uri);
        fileSize = stats.size;
      }
      
      if (fileSize && fileSize > MAX_FILE_SIZE_MB * 1024 * 1024) {
        throw new Error(`File size exceeds maximum limit of ${MAX_FILE_SIZE_MB}MB`);
      }
      
      const uploadId = Date.now().toString();
      
      // Set initial progress
      setUploadProgress(prev => ({ ...prev, [uploadId]: 0 }));
      
      // Upload attachment
      const attachment = await api.messages.uploadAttachment({
        uri: selectedFile.uri,
        type: selectedFile.type || 'application/octet-stream',
        name: selectedFile.name || 'document'
      });
      
      // Set complete progress
      setUploadProgress(prev => ({ ...prev, [uploadId]: 100 }));
      
      // Add a short delay before removing progress indicator for UX
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[uploadId];
          return newProgress;
        });
      }, 500);
      
      // Return the attachment with local URI
      return {
        ...attachment,
        localUri: selectedFile.uri
      };
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        return null;
      }
      console.error('Error selecting document attachment:', error);
      throw error;
    }
  }, [isAuthenticated]);

  // Cancel an attachment upload
  const cancelAttachmentUpload = useCallback((id: string) => {
    // Cancel upload if in progress
    if (uploadCancelTokens.current[id]) {
      uploadCancelTokens.current[id]();
      delete uploadCancelTokens.current[id];
    }
    
    // Remove from progress tracking
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[id];
      return newProgress;
    });
  }, []);

  // Send typing indicator with debounce
  const setTypingDebounced = useCallback(
    debounce(async (isTyping: boolean) => {
      if (!isAuthenticated || !currentConversation) return;
      
      try {
        await api.messages.sendTypingStatus(currentConversation.id, isTyping);
        
        // Also emit through WebSocket for real-time updates
        messageSocketService.sendTypingIndicator(currentConversation.id, isTyping);
      } catch (error) {
        console.error('Error sending typing indicator:', error);
      }
    }, TYPING_DEBOUNCE_MS),
    [isAuthenticated, currentConversation]
  );

  const setTyping = useCallback(async (isTyping: boolean) => {
    setTypingDebounced(isTyping);
  }, [setTypingDebounced]);

  // Mark conversation as read
  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!isAuthenticated || !conversationId) return;
    
    try {
      await dispatch(markAsRead(conversationId));
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }, [dispatch, isAuthenticated]);

  // Format message timestamp for display
  const formatMessageTimestamp = useCallback((timestamp: Date) => {
    return formatRelativeDateForMobile(timestamp);
  }, []);

  // Join conversation WebSocket room
  const joinConversationRoom = useCallback(async (conversationId: string) => {
    if (!isAuthenticated || !conversationId) return false;
    
    try {
      return await messageSocketService.joinConversation(conversationId);
    } catch (error) {
      console.error('Error joining conversation room:', error);
      return false;
    }
  }, [isAuthenticated]);

  // Leave conversation WebSocket room
  const leaveConversationRoom = useCallback(async (conversationId: string) => {
    if (!isAuthenticated || !conversationId) return false;
    
    try {
      return await messageSocketService.leaveConversation(conversationId);
    } catch (error) {
      console.error('Error leaving conversation room:', error);
      return false;
    }
  }, [isAuthenticated]);

  // Setup WebSocket connection and listeners
  useEffect(() => {
    if (!isAuthenticated) return;
    
    let isMounted = true;
    const initialize = async () => {
      try {
        // Initialize WebSocket service
        const initialized = await messageSocketService.initialize();
        
        if (!initialized) {
          console.warn('WebSocket initialization failed, retrying in 5 seconds...');
          setTimeout(initialize, 5000); // Retry after 5 seconds
          return;
        }
        
        if (isMounted) {
          webSocketInitialized.current = true;
          // Get and set initial connection state
          setConnectionState(messageSocketService.getConnectionState());
        }
      } catch (error) {
        console.error('Error initializing WebSocket service:', error);
        if (isMounted) {
          // Retry initialization after a delay
          setTimeout(initialize, 5000);
        }
      }
    };
    
    if (!webSocketInitialized.current) {
      initialize();
    }
    
    // Register WebSocket event listeners
    const connectionStateListener = messageSocketService.onConnectionStateChange((state) => {
      setConnectionState(state);
      setIsConnected(state === ConnectionState.CONNECTED);
    });
    
    const messageReceivedListener = messageSocketService.onMessageReceived((payload) => {
      // Handle received message - Redux will handle the state update
      // We may need to reload messages if a new message arrives
      if (currentConversation && payload.conversationId === currentConversation.id) {
        dispatch(fetchMessages({ 
          conversationId: currentConversation.id, 
          page: 1, 
          limit: MESSAGE_PAGINATION_LIMIT 
        }));
      }
      
      // Reload conversations to update unread counts and last message
      dispatch(fetchConversations());
    });
    
    const messageStatusListener = messageSocketService.onMessageStatusChange((payload) => {
      // Handle message status changes - Redux will update the message status
      
      // If the status update is for the current conversation, refresh messages
      if (currentConversation && payload.conversationId === currentConversation.id) {
        // Optionally refresh messages to get updated status
        // dispatch(fetchMessages({ 
        //   conversationId: currentConversation.id, 
        //   page: 1, 
        //   limit: MESSAGE_PAGINATION_LIMIT 
        // }));
      }
    });
    
    const typingIndicatorListener = messageSocketService.onTypingIndicator((data) => {
      // Update typing indicators state for the relevant user
      if (data.conversationId === currentConversation?.id) {
        if (data.isTyping) {
          // Add typing user
          setTypingUsers(prev => ({
            ...prev,
            [data.userId]: data.userId
          }));
          
          // Set timeout to clear typing status after a while
          setTimeout(() => {
            setTypingUsers(prev => {
              const newState = { ...prev };
              delete newState[data.userId];
              return newState;
            });
          }, 10000); // Clear after 10 seconds of no updates
        } else {
          // Remove typing user
          setTypingUsers(prev => {
            const newState = { ...prev };
            delete newState[data.userId];
            return newState;
          });
        }
      }
    });
    
    // Set up network connectivity monitoring
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected !== false);
      
      // If we've gone from offline to online, reconnect WebSocket
      if (state.isConnected && connectionState !== ConnectionState.CONNECTED) {
        messageSocketService.reconnect();
      }
    });
    
    // Set up app state monitoring (background/foreground)
    const appStateListener = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        // App has come to the foreground
        // Check WebSocket connection and reconnect if needed
        if (connectionState !== ConnectionState.CONNECTED) {
          messageSocketService.reconnect();
        }
        
        // Reload conversations when app comes to foreground
        dispatch(fetchConversations());
      }
    });
    
    // Clean up listeners on unmount
    return () => {
      isMounted = false;
      connectionStateListener();
      messageReceivedListener();
      messageStatusListener();
      typingIndicatorListener();
      unsubscribeNetInfo();
      appStateListener.remove();
      
      // Only clean up WebSocket if it was initialized in this instance
      if (webSocketInitialized.current) {
        messageSocketService.shutdown();
        webSocketInitialized.current = false;
      }
    };
  }, [isAuthenticated, dispatch, currentConversation, connectionState]);

  // Join conversation room when current conversation changes
  useEffect(() => {
    if (!isAuthenticated || !currentConversation) return;
    
    // Join the conversation room for real-time updates
    joinConversationRoom(currentConversation.id);
    
    // Mark conversation as read when entering it
    markConversationAsRead(currentConversation.id);
    
    // Clean up
    return () => {
      // Leave the conversation room when leaving it
      if (currentConversation) {
        leaveConversationRoom(currentConversation.id);
      }
    };
  }, [isAuthenticated, currentConversation, joinConversationRoom, leaveConversationRoom, markConversationAsRead]);

  // Return all the messaging functionality and state
  return {
    // State
    conversations,
    currentConversation,
    messages,
    loading,
    error,
    activeParticipants,
    typingUsers,
    isConnected,
    connectionState,
    uploadProgress,
    
    // Methods
    loadConversations,
    loadConversation,
    startNewConversation,
    loadMessages,
    loadMoreMessages,
    sendTextMessage,
    sendFileMessage,
    sendCodeSnippet,
    selectImageAttachment,
    takePhotoAttachment,
    selectDocumentAttachment,
    cancelAttachmentUpload,
    setTyping,
    markConversationAsRead,
    formatMessageTimestamp,
    joinConversationRoom,
    leaveConversationRoom
  };
};

export default useMessages;

// Define the interface for the hook return value
export interface UseMessagesResult {
  // State
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
  activeParticipants: string[];
  typingUsers: { [userId: string]: string };
  isConnected: boolean;
  connectionState: ConnectionState;
  uploadProgress: { [id: string]: number };
  
  // Methods
  loadConversations: () => Promise<Conversation[]>;
  loadConversation: (conversationId: string) => Promise<Conversation>;
  startNewConversation: (data: CreateConversationDTO) => Promise<Conversation>;
  loadMessages: (conversationId: string) => Promise<Message[]>;
  loadMoreMessages: () => Promise<boolean>;
  sendTextMessage: (text: string) => Promise<Message>;
  sendFileMessage: (file: FileAttachment, messageText?: string) => Promise<Message>;
  sendCodeSnippet: (code: string, language: string, title: string) => Promise<Message>;
  selectImageAttachment: () => Promise<FileAttachment | null>;
  takePhotoAttachment: () => Promise<FileAttachment | null>;
  selectDocumentAttachment: () => Promise<FileAttachment | null>;
  cancelAttachmentUpload: (id: string) => void;
  setTyping: (isTyping: boolean) => Promise<void>;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  formatMessageTimestamp: (timestamp: Date) => string;
  joinConversationRoom: (conversationId: string) => Promise<boolean>;
  leaveConversationRoom: (conversationId: string) => Promise<boolean>;
}