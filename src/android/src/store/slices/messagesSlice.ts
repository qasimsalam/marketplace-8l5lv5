/**
 * Redux slice for managing messages state in the AI Talent Marketplace Android application
 * 
 * This slice handles real-time messaging, conversations, offline message queuing,
 * and WebSocket connection state for the Android mobile app.
 * 
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // @reduxjs/toolkit ^1.9.5
import { v4 as uuidv4 } from 'uuid'; // uuid ^9.0.0
import AsyncStorage from '@react-native-async-storage/async-storage'; // @react-native-async-storage/async-storage ^1.18.2
import NetInfo from '@react-native-community/netinfo'; // @react-native-community/netinfo ^9.3.10

import {
  MessagesState,
  Message,
  Conversation,
  MessageStatus,
  MessageSocketEvent,
  ConnectionState,
  CreateMessageDTO,
  CreateConversationDTO,
  MessagePayload,
  PendingMessage,
  TypingIndicator
} from '../../types/message.types';

import { messagesAPI } from '../../lib/api';
import { messageSocketService } from '../../lib/websocket';
import { formatDate } from '../../utils/date';

// Keys and constants
const OFFLINE_MESSAGE_KEY = 'offline_messages';
const MAX_OFFLINE_MESSAGES = 100;
const MESSAGE_SYNC_INTERVAL = 60000; // 1 minute

// Root state and dispatch types for TypeScript
type RootState = ReturnType<typeof import('../index').store.getState>;
type AppDispatch = typeof import('../index').store.dispatch;

/**
 * Saves unsent messages to AsyncStorage for offline persistence
 * 
 * @param messages Array of pending messages to save
 */
const savePendingMessagesToStorage = async (messages: PendingMessage[]): Promise<void> => {
  try {
    const messagesJSON = JSON.stringify(messages);
    await AsyncStorage.setItem(OFFLINE_MESSAGE_KEY, messagesJSON);
  } catch (error) {
    console.error('Error saving pending messages to storage:', error);
  }
};

/**
 * Loads unsent messages from AsyncStorage when coming back online
 * 
 * @returns Array of pending messages
 */
const loadPendingMessagesFromStorage = async (): Promise<PendingMessage[]> => {
  try {
    const messagesJSON = await AsyncStorage.getItem(OFFLINE_MESSAGE_KEY);
    if (!messagesJSON) {
      return [];
    }
    return JSON.parse(messagesJSON) as PendingMessage[];
  } catch (error) {
    console.error('Error loading pending messages from storage:', error);
    return [];
  }
};

// Initial state definition
const initialState: MessagesState = {
  conversations: [],
  currentConversation: null,
  messages: [],
  loading: false,
  error: null,
  activeParticipants: [],
  networkConnected: true,
  pendingMessages: []
};

/**
 * Async thunk to fetch user's conversations
 */
export const fetchConversations = createAsyncThunk<
  { conversations: Conversation[]; totalCount: number; totalPages: number },
  void,
  { rejectValue: string }
>(
  'messages/fetchConversations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await messagesAPI.getConversations();
      return response;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk to fetch messages for a specific conversation
 */
export const fetchMessages = createAsyncThunk<
  { messages: Message[]; totalCount: number; totalPages: number },
  string,
  { rejectValue: string }
>(
  'messages/fetchMessages',
  async (conversationId, { rejectWithValue }) => {
    try {
      const response = await messagesAPI.getMessages(conversationId);
      return response;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk to send a new message with offline queuing capability
 */
export const sendMessage = createAsyncThunk<
  Message,
  { messageData: CreateMessageDTO; currentUserId: string },
  { 
    rejectValue: string;
    state: RootState;
    dispatch: AppDispatch;
  }
>(
  'messages/sendMessage',
  async ({ messageData, currentUserId }, { rejectWithValue, getState, dispatch }) => {
    try {
      // Check if we're online
      const state = getState();
      const { networkConnected } = state.messages;
      
      if (!networkConnected) {
        // Create a pending message with local ID
        const localId = uuidv4();
        
        // Create a local message object
        // Note: In a real app, we'd need access to the full User object for the sender
        const pendingMessage: Message = {
          id: localId,
          conversationId: messageData.conversationId,
          sender: { id: currentUserId, firstName: '', lastName: '' } as any, // Simplified User object
          senderId: currentUserId,
          type: messageData.type,
          content: messageData.content,
          attachment: null,
          codeSnippet: messageData.codeSnippet,
          status: MessageStatus.SENT,
          createdAt: new Date(),
          updatedAt: new Date(),
          isLocal: true
        };
        
        // Add to pending messages
        dispatch(messagesActions.addPendingMessage({
          id: localId,
          message: pendingMessage,
          attempts: 0,
          lastAttempt: new Date()
        }));
        
        return pendingMessage;
      }
      
      // Online - send through API
      const message = await messagesAPI.sendMessage(messageData);
      
      // If successful, also send through WebSocket for real-time delivery
      messageSocketService.sendMessage({
        event: MessageSocketEvent.MESSAGE_RECEIVED,
        data: message,
        conversationId: messageData.conversationId,
        timestamp: Date.now()
      });
      
      return message;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk to create a new conversation with participants
 */
export const createConversation = createAsyncThunk<
  Conversation,
  CreateConversationDTO,
  { rejectValue: string }
>(
  'messages/createConversation',
  async (conversationData, { rejectWithValue }) => {
    try {
      const conversation = await messagesAPI.createConversation(conversationData);
      return conversation;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk to mark messages as read in a conversation
 */
export const markMessagesAsRead = createAsyncThunk<
  { success: boolean },
  string,
  { rejectValue: string; state: RootState }
>(
  'messages/markMessagesAsRead',
  async (conversationId, { rejectWithValue, getState }) => {
    try {
      const result = await messagesAPI.markAsRead(conversationId);
      
      // Also notify through WebSocket
      if (result.success) {
        // Get message IDs to mark as read
        const state = getState();
        const messageIds = state.messages.messages
          .filter(m => m.conversationId === conversationId)
          .map(m => m.id);
        
        messageSocketService.markAsRead(conversationId, messageIds);
      }
      
      return result;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk to sync pending offline messages when back online
 */
export const syncOfflineMessages = createAsyncThunk<
  void,
  void,
  { 
    state: RootState;
    dispatch: AppDispatch;
    rejectValue: string;
  }
>(
  'messages/syncOfflineMessages',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      // First load pending messages from storage if needed
      let pendingMessages = getState().messages.pendingMessages;
      
      if (!pendingMessages || pendingMessages.length === 0) {
        pendingMessages = await loadPendingMessagesFromStorage();
        
        if (pendingMessages.length === 0) {
          return; // No messages to sync
        }
      }
      
      // Process each pending message
      for (const pendingMessage of pendingMessages) {
        try {
          // Extract message data for API call
          const { message } = pendingMessage;
          
          const messageDTO: CreateMessageDTO = {
            conversationId: message.conversationId,
            type: message.type,
            content: message.content,
            attachmentId: message.attachment?.id || null,
            codeSnippet: message.codeSnippet
          };
          
          // Send message via API
          const sentMessage = await messagesAPI.sendMessage(messageDTO);
          
          // Remove from pending queue
          dispatch(messagesActions.removePendingMessage(pendingMessage.id));
          
          // Add the sent message to the messages list
          dispatch(messagesActions.addMessage(sentMessage));
        } catch (error) {
          console.error('Failed to sync message:', error);
          // Update attempt count
          dispatch(messagesActions.updatePendingMessage({
            ...pendingMessage,
            attempts: pendingMessage.attempts + 1,
            lastAttempt: new Date()
          }));
        }
      }
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * The message slice defines the reducers and actions for message state management
 */
export const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    // Add a new message to the current conversation
    addMessage: (state, action: PayloadAction<Message>) => {
      const message = action.payload;
      
      // Check if this message is for the current conversation
      if (state.currentConversation && message.conversationId === state.currentConversation.id) {
        state.messages.push(message);
      }
      
      // Update the last message in the conversation
      const conversationIndex = state.conversations.findIndex(
        c => c.id === message.conversationId
      );
      
      if (conversationIndex >= 0) {
        state.conversations[conversationIndex].lastMessage = message;
        
        // Increment unread count if it's not the current conversation
        if (!state.currentConversation || state.currentConversation.id !== message.conversationId) {
          state.conversations[conversationIndex].unreadCount += 1;
        }
      }
    },
    
    // Update a message's status (sent, delivered, read)
    updateMessageStatus: (
      state, 
      action: PayloadAction<{ messageId: string; status: MessageStatus }>
    ) => {
      const { messageId, status } = action.payload;
      
      // Update in the messages array
      const messageIndex = state.messages.findIndex(m => m.id === messageId);
      if (messageIndex >= 0) {
        state.messages[messageIndex].status = status;
      }
    },
    
    // Set the active conversation for messaging
    setActiveConversation: (state, action: PayloadAction<Conversation | null>) => {
      state.currentConversation = action.payload;
      
      // Clear unread count when switching to a conversation
      if (action.payload) {
        const conversationIndex = state.conversations.findIndex(
          c => c.id === action.payload!.id
        );
        
        if (conversationIndex >= 0) {
          state.conversations[conversationIndex].unreadCount = 0;
        }
      }
    },
    
    // Update active participants in the conversation
    updateActiveParticipants: (state, action: PayloadAction<string[]>) => {
      state.activeParticipants = action.payload;
    },
    
    // Update network connectivity status
    updateNetworkStatus: (state, action: PayloadAction<boolean>) => {
      const wasOffline = !state.networkConnected;
      state.networkConnected = action.payload;
      
      // If coming back online, trigger sync
      if (wasOffline && action.payload && state.pendingMessages.length > 0) {
        // Actual sync will happen in the syncOfflineMessages thunk
        console.log('Network connectivity restored, will sync pending messages');
      }
    },
    
    // Add a pending message to the queue for offline support
    addPendingMessage: (state, action: PayloadAction<PendingMessage>) => {
      state.pendingMessages.push(action.payload);
      
      // Also add to messages array if it's for the current conversation
      if (state.currentConversation && 
          action.payload.message.conversationId === state.currentConversation.id) {
        state.messages.push(action.payload.message);
      }
      
      // Enforce max queue size
      if (state.pendingMessages.length > MAX_OFFLINE_MESSAGES) {
        state.pendingMessages.shift(); // Remove oldest message
      }
      
      // Save to AsyncStorage for persistence
      savePendingMessagesToStorage(state.pendingMessages);
    },
    
    // Remove a pending message from the queue
    removePendingMessage: (state, action: PayloadAction<string>) => {
      state.pendingMessages = state.pendingMessages.filter(
        p => p.id !== action.payload
      );
      
      // Save to AsyncStorage for persistence
      savePendingMessagesToStorage(state.pendingMessages);
    },
    
    // Update a pending message with new status or attempt count
    updatePendingMessage: (state, action: PayloadAction<PendingMessage>) => {
      const index = state.pendingMessages.findIndex(
        p => p.id === action.payload.id
      );
      
      if (index >= 0) {
        state.pendingMessages[index] = action.payload;
        
        // Save to AsyncStorage for persistence
        savePendingMessagesToStorage(state.pendingMessages);
      }
    },
    
    // Update typing status for a conversation
    updateTypingStatus: (
      state, 
      action: PayloadAction<TypingIndicator>
    ) => {
      const { userId, conversationId, isTyping } = action.payload;
      
      // If this is for the current conversation, update active participants
      if (state.currentConversation && state.currentConversation.id === conversationId) {
        if (isTyping && !state.activeParticipants.includes(userId)) {
          state.activeParticipants.push(userId);
        } else if (!isTyping) {
          state.activeParticipants = state.activeParticipants.filter(id => id !== userId);
        }
      }
    },
    
    // Clear all messages (used for logout/cleanup)
    clearMessages: (state) => {
      state.conversations = [];
      state.currentConversation = null;
      state.messages = [];
      state.activeParticipants = [];
      state.pendingMessages = [];
    }
  },
  extraReducers: (builder) => {
    // Handle fetchConversations
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.loading = false;
        state.conversations = action.payload.conversations;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch conversations';
      });
    
    // Handle fetchMessages
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = action.payload.messages;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch messages';
      });
    
    // Handle sendMessage
    builder
      .addCase(sendMessage.pending, (state) => {
        // We don't set loading=true here to avoid UI blocking
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const message = action.payload;
        
        // If the message was local (created while offline), we don't need to add it again
        if (!message.isLocal) {
          // Add the new message if it's for the current conversation
          if (state.currentConversation && 
              message.conversationId === state.currentConversation.id) {
            state.messages.push(message);
          }
          
          // Update the last message in the conversation
          const conversationIndex = state.conversations.findIndex(
            c => c.id === message.conversationId
          );
          
          if (conversationIndex >= 0) {
            state.conversations[conversationIndex].lastMessage = message;
          }
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.error = action.payload || 'Failed to send message';
      });
    
    // Handle createConversation
    builder
      .addCase(createConversation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createConversation.fulfilled, (state, action) => {
        state.loading = false;
        state.conversations.unshift(action.payload); // Add to beginning
        state.currentConversation = action.payload;
      })
      .addCase(createConversation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to create conversation';
      });
    
    // Handle markMessagesAsRead
    builder
      .addCase(markMessagesAsRead.fulfilled, (state, action) => {
        if (action.payload.success && state.currentConversation) {
          // Find the conversation in the list
          const conversationId = state.currentConversation.id;
          const conversationIndex = state.conversations.findIndex(
            c => c.id === conversationId
          );
          
          if (conversationIndex >= 0) {
            // Reset unread count
            state.conversations[conversationIndex].unreadCount = 0;
            
            // If currentConversation is a reference to the same object, update it too
            if (state.currentConversation) {
              state.currentConversation.unreadCount = 0;
            }
          }
          
          // Mark all messages in the current conversation as read
          state.messages.forEach(message => {
            if (message.conversationId === conversationId) {
              message.status = MessageStatus.READ;
            }
          });
        }
      });
  }
});

// Extract actions and reducer
export const messagesActions = messagesSlice.actions;
export const messagesReducer = messagesSlice.reducer;

// Selectors
export const selectMessagesState = (state: RootState) => state.messages;
export const selectConversations = (state: RootState) => state.messages.conversations;
export const selectCurrentConversation = (state: RootState) => state.messages.currentConversation;
export const selectMessages = (state: RootState) => state.messages.messages;
export const selectNetworkConnected = (state: RootState) => state.messages.networkConnected;
export const selectActiveParticipants = (state: RootState) => state.messages.activeParticipants;
export const selectPendingMessages = (state: RootState) => state.messages.pendingMessages || [];