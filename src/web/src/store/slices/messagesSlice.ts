import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  Conversation, 
  Message, 
  MessageStatus, 
  CreateMessageDTO, 
  CreateConversationDTO,
  MessagesState,
  MessageSocketEvent
} from '../../types/message';
import { messagesAPI } from '../../lib/api';
import { messageSocketService } from '../../lib/websocket';

// Initial state based on MessagesState interface
const initialState: MessagesState = {
  conversations: [],
  currentConversation: null,
  messages: [],
  loading: false,
  error: null,
  activeParticipants: []
};

/**
 * Fetch all conversations for the current user
 */
export const getConversations = createAsyncThunk(
  'messages/getConversations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await messagesAPI.getConversations();
      return response.conversations;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch conversations');
    }
  }
);

/**
 * Fetch a specific conversation by ID
 */
export const getConversation = createAsyncThunk(
  'messages/getConversation',
  async (conversationId: string, { rejectWithValue }) => {
    try {
      return await messagesAPI.getConversationById(conversationId);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch conversation');
    }
  }
);

/**
 * Fetch messages for a specific conversation with optional pagination
 */
export const getMessages = createAsyncThunk(
  'messages/getMessages',
  async ({ 
    conversationId, 
    page = 1, 
    limit = 50 
  }: { 
    conversationId: string, 
    page?: number, 
    limit?: number 
  }, { rejectWithValue }) => {
    try {
      const response = await messagesAPI.getMessages(conversationId, page, limit);
      return response.messages;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch messages');
    }
  }
);

/**
 * Create a new conversation
 */
export const createConversation = createAsyncThunk(
  'messages/createConversation',
  async (conversationData: CreateConversationDTO, { rejectWithValue }) => {
    try {
      return await messagesAPI.createConversation(conversationData);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create conversation');
    }
  }
);

/**
 * Send a new message in a conversation
 */
export const sendMessage = createAsyncThunk(
  'messages/sendMessage',
  async (messageData: CreateMessageDTO, { rejectWithValue }) => {
    try {
      return await messagesAPI.sendMessage(messageData);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to send message');
    }
  }
);

/**
 * Mark messages in a conversation as read
 */
export const markMessagesAsRead = createAsyncThunk(
  'messages/markAsRead',
  async ({ 
    conversationId, 
    messageIds 
  }: { 
    conversationId: string, 
    messageIds: string[] 
  }, { rejectWithValue }) => {
    try {
      await messagesAPI.markAsRead(conversationId);
      return { conversationId, messageIds };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to mark messages as read');
    }
  }
);

/**
 * Join a conversation's WebSocket room for real-time updates
 */
export const joinConversation = createAsyncThunk(
  'messages/joinConversation',
  async (conversationId: string, { rejectWithValue }) => {
    try {
      await messageSocketService.joinConversation(conversationId);
      return conversationId;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to join conversation');
    }
  }
);

/**
 * Leave a conversation's WebSocket room
 */
export const leaveConversation = createAsyncThunk(
  'messages/leaveConversation',
  async (conversationId: string, { rejectWithValue }) => {
    try {
      await messageSocketService.leaveConversation(conversationId);
      return conversationId;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to leave conversation');
    }
  }
);

/**
 * Send typing indicator to other participants in a conversation
 */
export const sendTypingIndicator = createAsyncThunk(
  'messages/sendTypingIndicator',
  async ({ 
    conversationId, 
    isTyping 
  }: { 
    conversationId: string, 
    isTyping: boolean 
  }, { rejectWithValue }) => {
    try {
      messageSocketService.sendTypingIndicator(conversationId, isTyping);
      return { conversationId, isTyping };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to send typing indicator');
    }
  }
);

// Create the messages slice
const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    /**
     * Set the current active conversation
     */
    setCurrentConversation: (state, action: PayloadAction<Conversation | null>) => {
      state.currentConversation = action.payload;
      // Reset messages when changing conversations
      if (action.payload === null) {
        state.messages = [];
      }
    },
    
    /**
     * Add a new message to state (used for both sent messages and received via WebSocket)
     */
    addMessage: (state, action: PayloadAction<Message>) => {
      const message = action.payload;
      
      // Add to messages array if it's for the current conversation
      if (state.currentConversation && message.conversationId === state.currentConversation.id) {
        // Check if the message already exists to avoid duplicates
        const exists = state.messages.some(m => m.id === message.id);
        if (!exists) {
          state.messages.push(message);
        }
      }
      
      // Update conversation's last message if it exists in the conversations array
      const conversationIndex = state.conversations.findIndex(c => c.id === message.conversationId);
      if (conversationIndex !== -1) {
        state.conversations[conversationIndex].lastMessage = message;
        
        // Update unread count for conversations other than the current one
        if (!state.currentConversation || state.currentConversation.id !== message.conversationId) {
          state.conversations[conversationIndex].unreadCount += 1;
        }
        
        // Move this conversation to the top of the list
        if (conversationIndex > 0) {
          const conversation = state.conversations[conversationIndex];
          state.conversations.splice(conversationIndex, 1);
          state.conversations.unshift(conversation);
        }
      }
    },
    
    /**
     * Update a message's status (used when status changes are received via WebSocket)
     */
    updateMessageStatus: (state, action: PayloadAction<{ messageId: string, status: MessageStatus }>) => {
      const { messageId, status } = action.payload;
      
      // Update message status in messages array
      const messageIndex = state.messages.findIndex(m => m.id === messageId);
      if (messageIndex !== -1) {
        state.messages[messageIndex].status = status;
      }
      
      // Update last message status in conversations if needed
      state.conversations.forEach(conversation => {
        if (conversation.lastMessage && conversation.lastMessage.id === messageId) {
          conversation.lastMessage.status = status;
        }
      });
    },
    
    /**
     * Clear all messages from state
     */
    clearMessages: (state) => {
      state.messages = [];
    },
    
    /**
     * Clear any error state
     */
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // getConversations
    builder
      .addCase(getConversations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getConversations.fulfilled, (state, action) => {
        state.loading = false;
        state.conversations = action.payload;
      })
      .addCase(getConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch conversations';
      });
      
    // getConversation
    builder
      .addCase(getConversation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getConversation.fulfilled, (state, action) => {
        state.loading = false;
        state.currentConversation = action.payload;
        
        // Update in conversations array if exists
        const index = state.conversations.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.conversations[index] = action.payload;
        } else {
          state.conversations.push(action.payload);
        }
      })
      .addCase(getConversation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch conversation';
      });
      
    // getMessages
    builder
      .addCase(getMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = action.payload;
      })
      .addCase(getMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch messages';
      });
      
    // createConversation
    builder
      .addCase(createConversation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createConversation.fulfilled, (state, action) => {
        state.loading = false;
        state.conversations.unshift(action.payload); // Add to top of list
        state.currentConversation = action.payload;
      })
      .addCase(createConversation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to create conversation';
      });
      
    // sendMessage
    builder
      .addCase(sendMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading = false;
        const message = action.payload;
        
        // Add to messages array if it's for the current conversation
        if (state.currentConversation && message.conversationId === state.currentConversation.id) {
          // Check if the message already exists to avoid duplicates
          const exists = state.messages.some(m => m.id === message.id);
          if (!exists) {
            state.messages.push(message);
          }
        }
        
        // Update conversation's last message
        const conversationIndex = state.conversations.findIndex(c => c.id === message.conversationId);
        if (conversationIndex !== -1) {
          state.conversations[conversationIndex].lastMessage = message;
          
          // Move this conversation to the top of the list
          if (conversationIndex > 0) {
            const conversation = state.conversations[conversationIndex];
            state.conversations.splice(conversationIndex, 1);
            state.conversations.unshift(conversation);
          }
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to send message';
      });
      
    // markMessagesAsRead
    builder
      .addCase(markMessagesAsRead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markMessagesAsRead.fulfilled, (state, action) => {
        state.loading = false;
        const { conversationId, messageIds } = action.payload;
        
        // Update message statuses in messages array
        state.messages.forEach(message => {
          if (messageIds.includes(message.id)) {
            message.status = MessageStatus.READ;
          }
        });
        
        // Reset unread count for the conversation
        const conversationIndex = state.conversations.findIndex(c => c.id === conversationId);
        if (conversationIndex !== -1) {
          state.conversations[conversationIndex].unreadCount = 0;
        }
      })
      .addCase(markMessagesAsRead.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to mark messages as read';
      });
      
    // joinConversation
    builder
      .addCase(joinConversation.fulfilled, (state, action) => {
        const conversationId = action.payload;
        if (!state.activeParticipants.includes(conversationId)) {
          state.activeParticipants.push(conversationId);
        }
      })
      .addCase(joinConversation.rejected, (state, action) => {
        state.error = action.payload as string || 'Failed to join conversation';
      });
      
    // leaveConversation
    builder
      .addCase(leaveConversation.fulfilled, (state, action) => {
        const conversationId = action.payload;
        state.activeParticipants = state.activeParticipants.filter(id => id !== conversationId);
      })
      .addCase(leaveConversation.rejected, (state, action) => {
        state.error = action.payload as string || 'Failed to leave conversation';
      });
  }
});

// Export selectors
export const selectConversations = (state: { messages: MessagesState }) => state.messages.conversations;
export const selectCurrentConversation = (state: { messages: MessagesState }) => state.messages.currentConversation;
export const selectConversationMessages = (state: { messages: MessagesState }) => state.messages.messages;
export const selectMessagesLoading = (state: { messages: MessagesState }) => state.messages.loading;
export const selectMessagesError = (state: { messages: MessagesState }) => state.messages.error;

// Export actions
export const { 
  setCurrentConversation, 
  addMessage, 
  updateMessageStatus, 
  clearMessages, 
  clearError 
} = messagesSlice.actions;

// Export reducer
export const messagesReducer = messagesSlice.reducer;
export { messagesSlice };