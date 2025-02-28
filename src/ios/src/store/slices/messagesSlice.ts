/**
 * Redux Toolkit slice for messaging functionality in the AI Talent Marketplace iOS application
 * 
 * This slice manages the state for conversations, messages, real-time communication,
 * and WebSocket integration while providing async thunk actions for all messaging operations.
 * 
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AnyAction, ThunkAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

import { 
  Message, 
  Conversation, 
  CreateMessageDTO, 
  CreateConversationDTO, 
  FileAttachment, 
  MessageSocketEvent, 
  ConnectionState,
  MessagesState 
} from '../../types/message.types';
import api from '../../lib/api';
import { messageSocketService } from '../../lib/websocket';

// Constants
const PAGE_SIZE = 20;

// Type definitions for Redux store
type RootState = Record<string, unknown>;
type AppDispatch = any;
type AppThunk = ThunkAction<ReturnType, RootState, unknown, AnyAction>;

// Initial state
const initialState: MessagesState = {
  conversations: [],
  currentConversation: null,
  messages: [],
  loading: false,
  error: null,
  activeParticipants: [],
  networkConnected: true
};

/**
 * Async thunk for fetching the user's conversations
 */
export const fetchConversations = createAsyncThunk(
  'messages/fetchConversations',
  async (_, { rejectWithValue }) => {
    try {
      return await api.messages.getConversations();
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch conversations');
    }
  }
);

/**
 * Async thunk for fetching a specific conversation by ID
 */
export const fetchConversationById = createAsyncThunk(
  'messages/fetchConversationById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await api.messages.getConversation(id);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch conversation');
    }
  }
);

/**
 * Async thunk for creating a new conversation
 */
export const createConversation = createAsyncThunk(
  'messages/createConversation',
  async (data: CreateConversationDTO, { rejectWithValue }) => {
    try {
      return await api.messages.createConversation(data);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create conversation');
    }
  }
);

/**
 * Async thunk for fetching messages for a conversation
 */
export const fetchMessages = createAsyncThunk(
  'messages/fetchMessages',
  async ({ 
    conversationId, 
    page = 1, 
    limit = PAGE_SIZE 
  }: { 
    conversationId: string, 
    page?: number, 
    limit?: number 
  }, { rejectWithValue }) => {
    try {
      return await api.messages.getMessages(conversationId, { page, limit });
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch messages');
    }
  }
);

/**
 * Async thunk for sending a message in a conversation
 * Implements optimistic updates for immediate UI feedback
 */
export const sendMessage = createAsyncThunk(
  'messages/sendMessage',
  async (message: CreateMessageDTO, { dispatch, rejectWithValue, getState }) => {
    // Generate temporary ID for optimistic UI updates
    const tempId = uuidv4();
    
    // Create optimistic message for immediate display
    const localMessage: Message = {
      id: tempId,
      conversationId: message.conversationId,
      sender: (getState() as any).auth.user,
      senderId: (getState() as any).auth.user.id,
      type: message.type,
      content: message.content,
      attachment: message.attachmentId ? { id: message.attachmentId } as FileAttachment : null,
      codeSnippet: message.codeSnippet,
      status: 'sent',
      createdAt: new Date(),
      updatedAt: new Date(),
      isLocal: true
    };
    
    // Add to local state immediately for optimistic UI
    dispatch(addLocalMessage(localMessage));
    
    try {
      // Send message to server
      const sentMessage = await api.messages.sendMessage(message);
      
      // Also notify via WebSocket for real-time updates to other participants
      messageSocketService.sendMessage({
        conversationId: message.conversationId,
        messageId: sentMessage.id
      });
      
      // Replace local message with server response
      dispatch(replaceLocalMessage({ 
        localId: tempId, 
        serverMessage: sentMessage 
      }));
      
      return sentMessage;
    } catch (error) {
      // Update local message to show failed status if sending fails
      dispatch(updateMessageStatus({ 
        id: tempId, 
        status: 'failed' 
      }));
      
      return rejectWithValue(error.message || 'Failed to send message');
    }
  }
);

/**
 * Async thunk for uploading a file attachment for a message
 */
export const uploadAttachment = createAsyncThunk(
  'messages/uploadAttachment',
  async ({ file }: { file: { uri: string, type: string, name: string } }, { rejectWithValue }) => {
    try {
      return await api.messages.uploadAttachment(file);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to upload attachment');
    }
  }
);

/**
 * Async thunk for marking messages in a conversation as read
 */
export const markAsRead = createAsyncThunk(
  'messages/markAsRead',
  async (conversationId: string, { dispatch, rejectWithValue, getState }) => {
    try {
      await api.messages.markAsRead(conversationId);
      
      // Get message IDs to update locally
      const state = getState() as { messages: MessagesState };
      const messages = state.messages.messages
        .filter(msg => msg.conversationId === conversationId && msg.status !== 'read');
      
      // Update message status locally
      messages.forEach(message => {
        dispatch(updateMessageStatus({ id: message.id, status: 'read' }));
      });
      
      // Also update via WebSocket for real-time updates to other participants
      if (messages.length > 0) {
        messageSocketService.markAsRead(
          conversationId, 
          messages.map(msg => msg.id)
        );
      }
      
      return conversationId;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to mark messages as read');
    }
  }
);

/**
 * Async thunk for sending typing status for a conversation
 */
export const sendTypingStatus = createAsyncThunk(
  'messages/sendTypingStatus',
  async ({ conversationId, isTyping }: { conversationId: string, isTyping: boolean }, { rejectWithValue }) => {
    try {
      await api.messages.sendTypingStatus(conversationId, isTyping);
      
      // Also send via WebSocket for real-time updates to other participants
      messageSocketService.sendTypingIndicator(conversationId, isTyping);
      
      return { conversationId, isTyping };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to send typing status');
    }
  }
);

/**
 * Messages slice with reducers for all actions
 */
export const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    // Set current conversation
    setCurrentConversation: (state, action: PayloadAction<Conversation | null>) => {
      state.currentConversation = action.payload;
      if (action.payload === null) {
        state.messages = []; // Clear messages when conversation is unset
      }
    },
    
    // Update active participants in a conversation
    updateActiveParticipants: (state, action: PayloadAction<string[]>) => {
      state.activeParticipants = action.payload;
    },
    
    // Update network connectivity status
    setNetworkStatus: (state, action: PayloadAction<boolean>) => {
      state.networkConnected = action.payload;
    },
    
    // Update a message's status
    updateMessageStatus: (state, action: PayloadAction<{ id: string, status: string }>) => {
      const { id, status } = action.payload;
      const message = state.messages.find(msg => msg.id === id);
      if (message) {
        message.status = status as any;
      }
    },
    
    // Add a local message before server confirmation
    addLocalMessage: (state, action: PayloadAction<Message>) => {
      state.messages.unshift(action.payload);
      
      // If this is part of the current conversation, also update last message
      if (state.currentConversation && 
          action.payload.conversationId === state.currentConversation.id) {
        state.currentConversation.lastMessage = action.payload;
      }
      
      // Update conversations list last message
      const conversation = state.conversations.find(
        c => c.id === action.payload.conversationId
      );
      if (conversation) {
        conversation.lastMessage = action.payload;
      }
    },
    
    // Replace a local message with server response
    replaceLocalMessage: (state, action: PayloadAction<{ localId: string, serverMessage: Message }>) => {
      const { localId, serverMessage } = action.payload;
      const index = state.messages.findIndex(msg => msg.id === localId);
      
      if (index !== -1) {
        state.messages[index] = serverMessage;
      }
      
      // Update conversation last message if needed
      if (state.currentConversation && 
          serverMessage.conversationId === state.currentConversation.id &&
          state.currentConversation.lastMessage && 
          state.currentConversation.lastMessage.id === localId) {
        state.currentConversation.lastMessage = serverMessage;
      }
      
      // Update conversations list last message
      const conversation = state.conversations.find(
        c => c.id === serverMessage.conversationId
      );
      if (conversation && conversation.lastMessage && conversation.lastMessage.id === localId) {
        conversation.lastMessage = serverMessage;
      }
    },
    
    // Clear current messages
    clearMessages: (state) => {
      state.messages = [];
    },
    
    // Set error state
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    
    // Clear error state
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Fetch conversations
    builder
      .addCase(fetchConversations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.loading = false;
        state.conversations = action.payload;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch conversations';
      });
    
    // Fetch conversation by ID
    builder
      .addCase(fetchConversationById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConversationById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentConversation = action.payload;
        
        // Update in conversations list if it exists
        const index = state.conversations.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.conversations[index] = action.payload;
        } else {
          state.conversations.push(action.payload);
        }
      })
      .addCase(fetchConversationById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch conversation';
      });
    
    // Create conversation
    builder
      .addCase(createConversation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createConversation.fulfilled, (state, action) => {
        state.loading = false;
        state.conversations.unshift(action.payload);
        state.currentConversation = action.payload;
      })
      .addCase(createConversation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to create conversation';
      });
    
    // Fetch messages
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        
        // If it's the first page, replace messages
        if (action.meta.arg.page === 1) {
          state.messages = action.payload.messages;
        } else {
          // For pagination, append messages (avoiding duplicates)
          const newMessages = action.payload.messages.filter(
            newMsg => !state.messages.some(msg => msg.id === newMsg.id)
          );
          state.messages = [...state.messages, ...newMessages];
        }
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch messages';
      });
    
    // Send message (mostly handled in the thunk with optimistic updates)
    builder
      .addCase(sendMessage.rejected, (state, action) => {
        state.error = action.payload as string || 'Failed to send message';
      });
    
    // Upload attachment
    builder
      .addCase(uploadAttachment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadAttachment.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(uploadAttachment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to upload attachment';
      });
    
    // Mark as read
    builder
      .addCase(markAsRead.fulfilled, (state, action) => {
        // Find conversation and reset unread count
        const conversationId = action.payload;
        const conversation = state.conversations.find(c => c.id === conversationId);
        if (conversation) {
          conversation.unreadCount = 0;
        }
        
        if (state.currentConversation && state.currentConversation.id === conversationId) {
          state.currentConversation.unreadCount = 0;
        }
      });
  }
});

// Selectors for accessing state in components
export const selectConversations = (state: RootState) => state.messages.conversations;
export const selectCurrentConversation = (state: RootState) => state.messages.currentConversation;
export const selectMessages = (state: RootState) => state.messages.messages;
export const selectMessagesLoading = (state: RootState) => state.messages.loading;
export const selectMessagesError = (state: RootState) => state.messages.error;
export const selectActiveParticipants = (state: RootState) => state.messages.activeParticipants;
export const selectNetworkConnected = (state: RootState) => state.messages.networkConnected;

// Export actions
export const { 
  setCurrentConversation, 
  updateActiveParticipants,
  setNetworkStatus,
  updateMessageStatus,
  addLocalMessage,
  replaceLocalMessage,
  clearMessages,
  setError,
  clearError
} = messagesSlice.actions;

// Export reducer
export default messagesSlice.reducer;