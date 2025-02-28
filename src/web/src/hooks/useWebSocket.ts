import { useState, useEffect, useCallback, useRef } from 'react'; // React v18.2.0
import { ManagerOptions, SocketOptions } from 'socket.io-client'; // socket.io-client v4.7.0
import { webSocketService, messageSocketService, workspaceSocketService } from '../lib/websocket';
import useAuth from './useAuth';
import { MessageSocketEvent } from '../types/message';
import { WorkspaceSocketEvent } from '../types/workspace';

// Constants for connection handling
const CONNECTION_RETRY_DELAY = 5000;
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Interface for configuring the useWebSocket hook
 */
export interface UseWebSocketOptions {
  /**
   * Whether to automatically connect when the hook is initialized
   */
  autoConnect?: boolean;
  
  /**
   * Whether to attempt reconnection on failure
   */
  reconnectOnFailure?: boolean;
  
  /**
   * Socket.io manager options
   */
  managerOptions?: ManagerOptions;
  
  /**
   * Socket.io socket options
   */
  socketOptions?: SocketOptions;
}

/**
 * Interface for configuring the useMessageWebSocket hook
 */
export interface UseMessageWebSocketOptions {
  /**
   * Whether to automatically connect when the hook is initialized
   */
  autoConnect?: boolean;
  
  /**
   * ID of the conversation to join
   */
  conversationId?: string;
  
  /**
   * Whether to automatically join the conversation upon connection
   */
  autoJoin?: boolean;
}

/**
 * Interface for configuring the useWorkspaceWebSocket hook
 */
export interface UseWorkspaceWebSocketOptions {
  /**
   * Whether to automatically connect when the hook is initialized
   */
  autoConnect?: boolean;
  
  /**
   * ID of the workspace to join
   */
  workspaceId?: string;
  
  /**
   * ID of the notebook to join
   */
  notebookId?: string;
  
  /**
   * Whether to automatically join the workspace/notebook upon connection
   */
  autoJoin?: boolean;
}

/**
 * React hook for managing WebSocket connections and integrating with component lifecycle
 * 
 * @param options - Configuration options for the WebSocket hook
 * @returns WebSocket state and methods for interacting with WebSocket connections
 */
export const useWebSocket = (options?: UseWebSocketOptions) => {
  const { isAuthenticated, user } = useAuth();
  
  // Initialize connection state
  const [isConnected, setIsConnected] = useState<boolean>(webSocketService.isConnected());
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Track retry attempts
  const retryAttemptsRef = useRef<number>(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Set up options with defaults
  const hookOptions = {
    autoConnect: true,
    reconnectOnFailure: true,
    managerOptions: {},
    socketOptions: {},
    ...options
  };

  /**
   * Establishes a WebSocket connection
   * 
   * @returns Promise that resolves when connection is established
   */
  const connect = useCallback(async () => {
    if (webSocketService.isConnected()) {
      return;
    }

    try {
      setIsConnecting(true);
      setConnectionError(null);
      
      await webSocketService.connect(
        hookOptions.managerOptions,
        hookOptions.socketOptions
      );
      
      setIsConnected(true);
      retryAttemptsRef.current = 0;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setConnectionError(errorMessage);
      
      if (hookOptions.reconnectOnFailure && retryAttemptsRef.current < MAX_RETRY_ATTEMPTS) {
        reconnect();
      }
    } finally {
      setIsConnecting(false);
    }
  }, [hookOptions.managerOptions, hookOptions.socketOptions, hookOptions.reconnectOnFailure]);

  /**
   * Disconnects the WebSocket connection
   */
  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    webSocketService.disconnect();
    setIsConnected(false);
    retryAttemptsRef.current = 0;
  }, []);

  /**
   * Attempts to reconnect after a delay
   */
  const reconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    
    retryAttemptsRef.current += 1;
    
    reconnectTimerRef.current = setTimeout(() => {
      if (isAuthenticated) {
        connect();
      }
    }, CONNECTION_RETRY_DELAY);
  }, [connect, isAuthenticated]);

  /**
   * Registers an event listener
   * 
   * @param event - Event name
   * @param callback - Event handler function
   * @param once - Whether to call the callback only once
   * @returns Function to remove the listener
   */
  const on = useCallback((event: string, callback: Function, once: boolean = false): () => void => {
    return webSocketService.on(event, callback, once);
  }, []);

  /**
   * Removes all listeners for a specific event
   * 
   * @param event - Event name
   */
  const off = useCallback((event: string): void => {
    webSocketService.off(event);
  }, []);

  /**
   * Emits an event with data
   * 
   * @param event - Event name
   * @param data - Event data
   * @returns Whether the event was successfully emitted
   */
  const emit = useCallback((event: string, data: any): boolean => {
    return webSocketService.emit(event, data);
  }, []);

  /**
   * Emits an event and waits for acknowledgment
   * 
   * @param event - Event name
   * @param data - Event data
   * @param timeout - Maximum time to wait for acknowledgment
   * @returns Promise that resolves with acknowledgment data
   */
  const emitWithAck = useCallback((event: string, data: any, timeout?: number): Promise<any> => {
    return webSocketService.emitWithAck(event, data, timeout);
  }, []);

  // Connect when component mounts if autoConnect is true
  useEffect(() => {
    if (hookOptions.autoConnect && isAuthenticated) {
      connect();
    }
    
    return () => {
      // Disconnect when component unmounts
      if (webSocketService.isConnected()) {
        disconnect();
      }
    };
  }, [hookOptions.autoConnect, isAuthenticated, connect, disconnect]);

  // Reconnect when authentication state changes
  useEffect(() => {
    if (isAuthenticated) {
      if (!webSocketService.isConnected() && !isConnecting) {
        connect();
      }
    } else {
      if (webSocketService.isConnected()) {
        disconnect();
      }
    }
  }, [isAuthenticated, connect, disconnect, isConnecting]);

  return {
    isConnected,
    isConnecting,
    connectionError,
    connect,
    disconnect,
    on,
    off,
    emit,
    emitWithAck
  };
};

/**
 * Specialized hook for message-related WebSocket functionality
 * 
 * @param options - Configuration options for the message WebSocket hook
 * @returns Message WebSocket state and methods
 */
export const useMessageWebSocket = (options?: UseMessageWebSocketOptions) => {
  const hookOptions = {
    autoConnect: true,
    autoJoin: true,
    ...options
  };

  // Use the base WebSocket hook
  const socket = useWebSocket({
    autoConnect: hookOptions.autoConnect
  });

  // Track joined conversation
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  /**
   * Joins a specific conversation
   * 
   * @param conversationId - Conversation ID to join
   * @returns Promise that resolves when conversation is joined
   */
  const joinConversation = useCallback(async (conversationId: string) => {
    if (!socket.isConnected) {
      await socket.connect();
    }
    
    await messageSocketService.joinConversation(conversationId);
    setCurrentConversationId(conversationId);
  }, [socket]);

  /**
   * Leaves the current conversation
   * 
   * @param conversationId - Conversation ID to leave (defaults to current)
   * @returns Promise that resolves when conversation is left
   */
  const leaveConversation = useCallback(async (conversationId?: string) => {
    const targetId = conversationId || currentConversationId;
    
    if (targetId) {
      await messageSocketService.leaveConversation(targetId);
      
      if (targetId === currentConversationId) {
        setCurrentConversationId(null);
      }
    }
  }, [currentConversationId]);

  /**
   * Sends a message to the current conversation
   * 
   * @param conversationId - Conversation ID (defaults to current)
   * @param messageData - Message data to send
   * @returns Promise that resolves with server acknowledgment
   */
  const sendMessage = useCallback(async (conversationId: string, messageData: any) => {
    return messageSocketService.sendMessage(conversationId, messageData);
  }, []);

  /**
   * Marks messages as read in a conversation
   * 
   * @param conversationId - Conversation ID
   * @param messageIds - Message IDs to mark as read
   * @returns Promise that resolves when messages are marked as read
   */
  const markAsRead = useCallback(async (conversationId: string, messageIds: string[]) => {
    return messageSocketService.markAsRead(conversationId, messageIds);
  }, []);

  /**
   * Sends typing indicator to the current conversation
   * 
   * @param conversationId - Conversation ID (defaults to current)
   * @param isTyping - Whether the user is typing
   */
  const sendTypingIndicator = useCallback((conversationId: string, isTyping: boolean) => {
    messageSocketService.sendTypingIndicator(conversationId, isTyping);
  }, []);

  /**
   * Registers a handler for new messages in a conversation
   * 
   * @param conversationId - Conversation ID
   * @param handler - Function to call when a new message is received
   * @returns Function to remove the handler
   */
  const onMessageReceived = useCallback((conversationId: string, handler: Function) => {
    return messageSocketService.onMessageReceived(conversationId, handler);
  }, []);

  /**
   * Registers a handler for typing indicators in a conversation
   * 
   * @param conversationId - Conversation ID
   * @param handler - Function to call when typing status changes
   * @returns Function to remove the handler
   */
  const onTypingIndicator = useCallback((conversationId: string, handler: Function) => {
    return messageSocketService.onTypingIndicator(conversationId, handler);
  }, []);

  // Auto-join conversation if specified
  useEffect(() => {
    if (socket.isConnected && hookOptions.conversationId && hookOptions.autoJoin && !currentConversationId) {
      joinConversation(hookOptions.conversationId);
    }
    
    return () => {
      // Leave conversation when component unmounts
      if (currentConversationId) {
        leaveConversation(currentConversationId);
      }
    };
  }, [socket.isConnected, hookOptions.conversationId, hookOptions.autoJoin, currentConversationId, joinConversation, leaveConversation]);

  return {
    ...socket,
    joinConversation,
    leaveConversation,
    sendMessage,
    markAsRead,
    sendTypingIndicator,
    onMessageReceived,
    onTypingIndicator
  };
};

/**
 * Specialized hook for workspace collaboration WebSocket functionality
 * 
 * @param options - Configuration options for the workspace WebSocket hook
 * @returns Workspace WebSocket state and methods
 */
export const useWorkspaceWebSocket = (options?: UseWorkspaceWebSocketOptions) => {
  const hookOptions = {
    autoConnect: true,
    autoJoin: true,
    ...options
  };

  // Use the base WebSocket hook
  const socket = useWebSocket({
    autoConnect: hookOptions.autoConnect
  });

  // Track joined workspace and notebook
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [currentNotebookId, setCurrentNotebookId] = useState<string | null>(null);

  /**
   * Joins a specific workspace
   * 
   * @param workspaceId - Workspace ID to join
   * @returns Promise that resolves when workspace is joined
   */
  const joinWorkspace = useCallback(async (workspaceId: string) => {
    if (!socket.isConnected) {
      await socket.connect();
    }
    
    await workspaceSocketService.joinWorkspace(workspaceId);
    setCurrentWorkspaceId(workspaceId);
  }, [socket]);

  /**
   * Leaves the current workspace
   * 
   * @param workspaceId - Workspace ID to leave (defaults to current)
   * @returns Promise that resolves when workspace is left
   */
  const leaveWorkspace = useCallback(async (workspaceId?: string) => {
    const targetId = workspaceId || currentWorkspaceId;
    
    if (targetId) {
      await workspaceSocketService.leaveWorkspace(targetId);
      
      if (targetId === currentWorkspaceId) {
        setCurrentWorkspaceId(null);
      }
    }
  }, [currentWorkspaceId]);

  /**
   * Joins a specific notebook
   * 
   * @param notebookId - Notebook ID to join
   * @returns Promise that resolves when notebook is joined
   */
  const joinNotebook = useCallback(async (notebookId: string) => {
    if (!socket.isConnected) {
      await socket.connect();
    }
    
    await workspaceSocketService.joinNotebook(notebookId);
    setCurrentNotebookId(notebookId);
  }, [socket]);

  /**
   * Leaves the current notebook
   * 
   * @param notebookId - Notebook ID to leave (defaults to current)
   * @returns Promise that resolves when notebook is left
   */
  const leaveNotebook = useCallback(async (notebookId?: string) => {
    const targetId = notebookId || currentNotebookId;
    
    if (targetId) {
      await workspaceSocketService.leaveNotebook(targetId);
      
      if (targetId === currentNotebookId) {
        setCurrentNotebookId(null);
      }
    }
  }, [currentNotebookId]);

  /**
   * Sends a cell update to collaborators
   * 
   * @param notebookId - Notebook ID
   * @param cellId - Cell ID
   * @param cellData - Updated cell data
   * @returns Promise that resolves with server acknowledgment
   */
  const updateCell = useCallback(async (notebookId: string, cellId: string, cellData: any) => {
    return workspaceSocketService.updateCell(notebookId, cellId, cellData);
  }, []);

  /**
   * Sends a request to execute a notebook cell
   * 
   * @param notebookId - Notebook ID
   * @param cellId - Cell ID to execute
   * @returns Promise that resolves with execution request acknowledgment
   */
  const executeCell = useCallback(async (notebookId: string, cellId: string) => {
    return workspaceSocketService.executeCell(notebookId, cellId);
  }, []);

  /**
   * Registers a handler for cell updates in a notebook
   * 
   * @param notebookId - Notebook ID
   * @param handler - Function to call when a cell is updated
   * @returns Function to remove the handler
   */
  const onCellUpdate = useCallback((notebookId: string, handler: Function) => {
    return workspaceSocketService.onCellUpdate(notebookId, handler);
  }, []);

  /**
   * Registers a handler for cell execution results
   * 
   * @param notebookId - Notebook ID
   * @param handler - Function to call when execution results arrive
   * @returns Function to remove the handler
   */
  const onCellExecutionResult = useCallback((notebookId: string, handler: Function) => {
    return workspaceSocketService.onCellExecutionResult(notebookId, handler);
  }, []);

  /**
   * Registers a handler for user presence updates
   * 
   * @param workspaceId - Workspace ID
   * @param handler - Function to call when user presence changes
   * @returns Function to remove the handler
   */
  const onUserPresence = useCallback((workspaceId: string, handler: Function) => {
    return workspaceSocketService.onUserPresence(workspaceId, handler);
  }, []);

  // Auto-join workspace and notebook if specified
  useEffect(() => {
    const autoJoinWorkspace = async () => {
      if (socket.isConnected && hookOptions.workspaceId && hookOptions.autoJoin && !currentWorkspaceId) {
        await joinWorkspace(hookOptions.workspaceId);
        
        if (hookOptions.notebookId && !currentNotebookId) {
          await joinNotebook(hookOptions.notebookId);
        }
      }
    };
    
    autoJoinWorkspace();
    
    return () => {
      // Leave notebook and workspace when component unmounts
      if (currentNotebookId) {
        leaveNotebook(currentNotebookId);
      }
      
      if (currentWorkspaceId) {
        leaveWorkspace(currentWorkspaceId);
      }
    };
  }, [
    socket.isConnected, 
    hookOptions.workspaceId, 
    hookOptions.notebookId, 
    hookOptions.autoJoin, 
    currentWorkspaceId, 
    currentNotebookId, 
    joinWorkspace, 
    joinNotebook, 
    leaveWorkspace, 
    leaveNotebook
  ]);

  return {
    ...socket,
    joinWorkspace,
    leaveWorkspace,
    joinNotebook,
    leaveNotebook,
    updateCell,
    executeCell,
    onCellUpdate,
    onCellExecutionResult,
    onUserPresence
  };
};

export default useWebSocket;