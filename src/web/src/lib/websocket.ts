/**
 * WebSocket Implementation for AI Talent Marketplace
 * v1.0.0
 * 
 * Provides real-time communication capabilities for messaging, 
 * workspace collaboration, and notifications. Abstracts Socket.io
 * functionality with authentication, reconnection, and error handling.
 */

import { io, Socket, ManagerOptions, SocketOptions } from 'socket.io-client'; // socket.io-client ^4.7.0
import { getAuthToken } from '../utils/storage';
import { getAuthorizationHeader } from './auth';
import { 
  Message,
  MessagePayload,
  MessageSocketEvent,
  TypingIndicator
} from '../types/message';
import {
  WorkspaceSocketEvent,
  Cell
} from '../types/workspace';

// Global configuration constants
const WEBSOCKET_BASE_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8000';
const RECONNECTION_ATTEMPTS = 5;
const RECONNECTION_DELAY = 3000;
const CONNECTION_TIMEOUT = 10000;
const PING_INTERVAL = 25000;
const PING_TIMEOUT = 20000;

/**
 * Creates URL query parameters for WebSocket connection with authentication token
 * 
 * @returns Formatted query string with auth token
 */
export function createSocketQueryParams(): string {
  const token = getAuthToken();
  if (!token) {
    return '';
  }
  return `token=${encodeURIComponent(token)}`;
}

/**
 * Parses incoming socket event data into a typed structure
 * 
 * @param data Any data received from socket
 * @returns Parsed event and payload
 */
export function parseSocketEvent(data: any): { event: string; payload: any } {
  if (!data || typeof data !== 'object') {
    return { event: '', payload: null };
  }

  return {
    event: data.event || '',
    payload: data.payload || null
  };
}

/**
 * Formats outgoing data into a standard payload structure
 * 
 * @param event Event name
 * @param data Event data
 * @returns Formatted socket payload
 */
export function formatSocketPayload(event: string, data: any): any {
  return {
    event,
    payload: data,
    timestamp: Date.now()
  };
}

/**
 * Core service for managing WebSocket connections and events
 */
export class WebSocketService {
  private socket: Socket | null = null;
  private isConnecting: boolean = false;
  private connectionError: string | null = null;
  private rooms: Set<string> = new Set();
  private eventListeners: Record<string, Set<{ callback: Function; once: boolean }>> = {};
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;

  constructor() {
    // Initialize with default state
    this.socket = null;
    this.isConnecting = false;
    this.connectionError = null;
    this.rooms = new Set();
    this.eventListeners = {};
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
  }

  /**
   * Establishes a Socket.io connection to the WebSocket server
   * 
   * @param managerOptions Additional manager options
   * @param socketOptions Additional socket options
   * @returns Promise resolving to connected socket or rejecting with error
   */
  public async connect(
    managerOptions: ManagerOptions = {},
    socketOptions: SocketOptions = {}
  ): Promise<Socket> {
    // If already connected, return existing socket
    if (this.socket?.connected) {
      return this.socket;
    }

    // If currently attempting to connect, wait for that attempt
    if (this.isConnecting) {
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (this.socket?.connected) {
            clearInterval(checkInterval);
            resolve(this.socket);
          } else if (!this.isConnecting && this.connectionError) {
            clearInterval(checkInterval);
            reject(new Error(this.connectionError));
          }
        }, 100);
      });
    }

    // Set connecting state
    this.isConnecting = true;
    this.connectionError = null;
    
    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Disconnect any existing socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Build connection URL with auth token
    const queryParams = createSocketQueryParams();
    const url = queryParams ? `${WEBSOCKET_BASE_URL}?${queryParams}` : WEBSOCKET_BASE_URL;

    // Set up connection options with defaults and custom options
    const defaultManagerOptions: ManagerOptions = {
      reconnection: true,
      reconnectionAttempts: RECONNECTION_ATTEMPTS,
      reconnectionDelay: RECONNECTION_DELAY,
      timeout: CONNECTION_TIMEOUT,
      ...managerOptions
    };

    const defaultSocketOptions: SocketOptions = {
      autoConnect: true,
      forceNew: true,
      withCredentials: true,
      pingInterval: PING_INTERVAL,
      pingTimeout: PING_TIMEOUT,
      ...socketOptions
    };

    return new Promise<Socket>((resolve, reject) => {
      try {
        // Create socket with options
        this.socket = io(url, {
          ...defaultManagerOptions,
          ...defaultSocketOptions
        });

        // Set up connection timeout
        const timeout = setTimeout(() => {
          if (!this.socket?.connected) {
            this.isConnecting = false;
            this.connectionError = 'Connection timeout';
            this.socket?.disconnect();
            reject(new Error('Connection timeout'));
          }
        }, CONNECTION_TIMEOUT);

        // Handle connection success
        this.socket.on('connect', () => {
          clearTimeout(timeout);
          this.isConnecting = false;
          this.connectionError = null;
          this.reconnectAttempts = 0;
          
          // Reconnect to previously joined rooms
          this.rooms.forEach(room => {
            this.socket?.emit('join', { room });
          });
          
          resolve(this.socket!);
        });

        // Handle connection error
        this.socket.on('connect_error', (error) => {
          this.isConnecting = false;
          this.connectionError = error.message;
          clearTimeout(timeout);
          reject(error);
        });

        // Handle disconnect - attempt reconnection
        this.socket.on('disconnect', (reason) => {
          if (reason === 'io server disconnect') {
            // Server disconnected - manual reconnect needed
            this.reconnect();
          }
        });
      } catch (error) {
        this.isConnecting = false;
        this.connectionError = error instanceof Error ? error.message : 'Unknown error';
        reject(error);
      }
    });
  }

  /**
   * Disconnects the active Socket.io connection
   */
  public disconnect(): void {
    // Clear any active reconnection timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Reset reconnect attempts
    this.reconnectAttempts = 0;

    // Check if socket exists and is connected
    if (this.socket) {
      // Remove all event listeners
      this.eventListeners = {};
      
      // Disconnect
      this.socket.disconnect();
      this.socket = null;
    }

    // Clear rooms
    this.rooms.clear();
    
    // Reset connection status
    this.isConnecting = false;
    this.connectionError = null;
  }

  /**
   * Checks if the socket is currently connected
   * 
   * @returns True if socket is connected, false otherwise
   */
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Attempts to reconnect to the WebSocket server
   */
  private reconnect(): void {
    // Increment reconnect attempts counter
    this.reconnectAttempts++;

    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Check if we've exceeded maximum reconnection attempts
    if (this.reconnectAttempts > RECONNECTION_ATTEMPTS) {
      this.connectionError = 'Maximum reconnection attempts exceeded';
      return;
    }

    // Set timer for reconnection attempt with exponential backoff
    const delay = RECONNECTION_DELAY * Math.pow(1.5, this.reconnectAttempts - 1);
    this.reconnectTimer = setTimeout(() => {
      // Attempt to reconnect
      this.connect()
        .then(() => {
          // Successful reconnection - rejoin rooms
          this.rooms.forEach(room => {
            this.joinRoom(room).catch(() => {
              console.error(`Failed to rejoin room: ${room}`);
            });
          });
        })
        .catch(() => {
          // Failed reconnection - try again
          this.reconnect();
        });
    }, delay);
  }

  /**
   * Registers an event listener for a specific event
   * 
   * @param event Event name
   * @param callback Callback function
   * @param once Whether to call the callback only once
   * @returns Function to remove the specific listener
   */
  public on(event: string, callback: Function, once: boolean = false): () => void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = new Set();
    }

    // Add callback to event listeners
    const callbackObj = { callback, once };
    this.eventListeners[event].add(callbackObj);

    // If socket exists, register handler
    if (this.socket) {
      const handler = (data: any) => {
        callback(data);
        if (once) {
          this.eventListeners[event]?.delete(callbackObj);
          this.socket?.off(event, handler);
        }
      };

      if (once) {
        this.socket.once(event, handler);
      } else {
        this.socket.on(event, handler);
      }
    }

    // Return function to remove this specific listener
    return () => {
      if (this.eventListeners[event]) {
        this.eventListeners[event].delete(callbackObj);
      }
    };
  }

  /**
   * Removes all listeners for a specific event
   * 
   * @param event Event name
   */
  public off(event: string): void {
    if (this.eventListeners[event]) {
      if (this.socket) {
        this.socket.off(event);
      }
      delete this.eventListeners[event];
    }
  }

  /**
   * Emits an event with data to the WebSocket server
   * 
   * @param event Event name
   * @param data Event data
   * @returns True if event was emitted, false otherwise
   */
  public emit(event: string, data: any): boolean {
    if (!this.socket || !this.socket.connected) {
      return false;
    }

    const payload = formatSocketPayload(event, data);
    this.socket.emit(event, payload);
    return true;
  }

  /**
   * Emits an event and returns a promise that resolves with the acknowledgment
   * 
   * @param event Event name
   * @param data Event data
   * @param timeout Timeout in ms after which the promise rejects
   * @returns Promise that resolves with acknowledgment data or rejects on timeout
   */
  public emitWithAck(event: string, data: any, timeout: number = 5000): Promise<any> {
    if (!this.socket || !this.socket.connected) {
      return Promise.reject(new Error('Socket not connected'));
    }

    const payload = formatSocketPayload(event, data);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Event "${event}" acknowledgment timed out after ${timeout}ms`));
      }, timeout);

      this.socket!.emit(event, payload, (response: any) => {
        clearTimeout(timer);
        resolve(response);
      });
    });
  }

  /**
   * Joins a specific room or channel on the WebSocket server
   * 
   * @param room Room name
   * @returns Promise that resolves when room is joined
   */
  public async joinRoom(room: string): Promise<void> {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket not connected');
    }

    try {
      await this.emitWithAck('join', { room });
      this.rooms.add(room);
    } catch (error) {
      console.error(`Error joining room ${room}:`, error);
      throw error;
    }
  }

  /**
   * Leaves a specific room or channel on the WebSocket server
   * 
   * @param room Room name
   * @returns Promise that resolves when room is left
   */
  public async leaveRoom(room: string): Promise<void> {
    if (!this.socket || !this.socket.connected) {
      this.rooms.delete(room);
      return;
    }

    try {
      await this.emitWithAck('leave', { room });
      this.rooms.delete(room);
    } catch (error) {
      console.error(`Error leaving room ${room}:`, error);
      throw error;
    }
  }

  /**
   * Handles reconnection logic after disconnection
   */
  private handleReconnect(): void {
    // Store joined rooms and event listeners
    const currentRooms = Array.from(this.rooms);
    
    // Attempt to reconnect
    this.connect()
      .then(() => {
        // Rejoin rooms
        currentRooms.forEach(room => {
          this.joinRoom(room).catch(error => {
            console.error(`Failed to rejoin room ${room}:`, error);
          });
        });
      })
      .catch(error => {
        console.error('Reconnection failed:', error);
        
        // Try again if we haven't reached the limit
        if (this.reconnectAttempts < RECONNECTION_ATTEMPTS) {
          this.reconnect();
        }
      });
  }
}

/**
 * Specialized WebSocket service for handling messaging functionality
 */
export class MessageSocketService {
  private webSocketService: WebSocketService;
  private messageHandlers: Map<string, Set<Function>> = new Map();
  private typingHandlers: Map<string, Set<Function>> = new Map();

  constructor(webSocketService: WebSocketService) {
    this.webSocketService = webSocketService;
    this.messageHandlers = new Map();
    this.typingHandlers = new Map();
  }

  /**
   * Joins a specific conversation channel for real-time messaging
   * 
   * @param conversationId ID of the conversation to join
   * @returns Promise that resolves when conversation is joined
   */
  public async joinConversation(conversationId: string): Promise<void> {
    // Check if already connected
    if (!this.webSocketService.isConnected()) {
      await this.webSocketService.connect();
    }

    // Join the conversation room
    const roomName = `conversation:${conversationId}`;
    await this.webSocketService.joinRoom(roomName);

    // Set up event listeners for this conversation
    this.webSocketService.on(MessageSocketEvent.MESSAGE_RECEIVED, (data: any) => {
      const parsedData = parseSocketEvent(data);
      if (parsedData.payload?.conversationId === conversationId) {
        // Notify all registered handlers for this conversation
        this.messageHandlers.get(conversationId)?.forEach(handler => {
          handler(parsedData.payload);
        });
      }
    });

    this.webSocketService.on(MessageSocketEvent.TYPING_START, (data: any) => {
      const parsedData = parseSocketEvent(data);
      if (parsedData.payload?.conversationId === conversationId) {
        // Notify all registered typing handlers for this conversation
        this.typingHandlers.get(conversationId)?.forEach(handler => {
          handler({
            userId: parsedData.payload.userId,
            isTyping: true,
            conversationId,
            timestamp: parsedData.payload.timestamp
          });
        });
      }
    });

    this.webSocketService.on(MessageSocketEvent.TYPING_END, (data: any) => {
      const parsedData = parseSocketEvent(data);
      if (parsedData.payload?.conversationId === conversationId) {
        // Notify all registered typing handlers for this conversation
        this.typingHandlers.get(conversationId)?.forEach(handler => {
          handler({
            userId: parsedData.payload.userId,
            isTyping: false,
            conversationId,
            timestamp: parsedData.payload.timestamp
          });
        });
      }
    });
  }

  /**
   * Leaves a specific conversation channel
   * 
   * @param conversationId ID of the conversation to leave
   * @returns Promise that resolves when conversation is left
   */
  public async leaveConversation(conversationId: string): Promise<void> {
    // Remove handlers
    this.messageHandlers.delete(conversationId);
    this.typingHandlers.delete(conversationId);

    // Leave the room
    const roomName = `conversation:${conversationId}`;
    await this.webSocketService.leaveRoom(roomName);
  }

  /**
   * Sends a message to a specific conversation
   * 
   * @param conversationId ID of the conversation
   * @param messageData Message data to send
   * @returns Promise that resolves with server acknowledgment
   */
  public async sendMessage(conversationId: string, messageData: any): Promise<any> {
    const data = {
      conversationId,
      message: messageData
    };

    return this.webSocketService.emitWithAck(MessageSocketEvent.MESSAGE_RECEIVED, data);
  }

  /**
   * Marks messages in a conversation as read
   * 
   * @param conversationId ID of the conversation
   * @param messageIds Array of message IDs to mark as read
   * @returns Promise that resolves when messages are marked as read
   */
  public async markAsRead(conversationId: string, messageIds: string[]): Promise<void> {
    const data = {
      conversationId,
      messageIds
    };

    await this.webSocketService.emitWithAck(MessageSocketEvent.MESSAGE_READ, data);
  }

  /**
   * Sends typing indicator status to a conversation
   * 
   * @param conversationId ID of the conversation
   * @param isTyping Whether the user is typing
   */
  public sendTypingIndicator(conversationId: string, isTyping: boolean): void {
    const event = isTyping ? MessageSocketEvent.TYPING_START : MessageSocketEvent.TYPING_END;
    
    const data = {
      conversationId,
      timestamp: Date.now()
    };

    this.webSocketService.emit(event, data);
  }

  /**
   * Registers a handler for new messages in a conversation
   * 
   * @param conversationId ID of the conversation
   * @param handler Function to call when a new message is received
   * @returns Function to remove the handler
   */
  public onMessageReceived(conversationId: string, handler: Function): () => void {
    if (!this.messageHandlers.has(conversationId)) {
      this.messageHandlers.set(conversationId, new Set());
    }

    const handlers = this.messageHandlers.get(conversationId)!;
    handlers.add(handler);

    return () => {
      const handlers = this.messageHandlers.get(conversationId);
      if (handlers) {
        handlers.delete(handler);
        
        if (handlers.size === 0) {
          this.messageHandlers.delete(conversationId);
        }
      }
    };
  }

  /**
   * Registers a handler for typing indicators in a conversation
   * 
   * @param conversationId ID of the conversation
   * @param handler Function to call when typing status changes
   * @returns Function to remove the handler
   */
  public onTypingIndicator(conversationId: string, handler: Function): () => void {
    if (!this.typingHandlers.has(conversationId)) {
      this.typingHandlers.set(conversationId, new Set());
    }

    const handlers = this.typingHandlers.get(conversationId)!;
    handlers.add(handler);

    return () => {
      const handlers = this.typingHandlers.get(conversationId);
      if (handlers) {
        handlers.delete(handler);
        
        if (handlers.size === 0) {
          this.typingHandlers.delete(conversationId);
        }
      }
    };
  }
}

/**
 * Specialized WebSocket service for handling workspace collaboration
 */
export class WorkspaceSocketService {
  private webSocketService: WebSocketService;
  private cellUpdateHandlers: Map<string, Set<Function>> = new Map();
  private executionResultHandlers: Map<string, Set<Function>> = new Map();
  private presenceHandlers: Map<string, Set<Function>> = new Map();

  constructor(webSocketService: WebSocketService) {
    this.webSocketService = webSocketService;
    this.cellUpdateHandlers = new Map();
    this.executionResultHandlers = new Map();
    this.presenceHandlers = new Map();
  }

  /**
   * Joins a specific workspace for real-time collaboration
   * 
   * @param workspaceId ID of the workspace to join
   * @returns Promise that resolves when workspace is joined
   */
  public async joinWorkspace(workspaceId: string): Promise<void> {
    // Check if already connected
    if (!this.webSocketService.isConnected()) {
      await this.webSocketService.connect();
    }

    // Join the workspace room
    const roomName = `workspace:${workspaceId}`;
    await this.webSocketService.joinRoom(roomName);

    // Set up workspace presence handlers
    this.webSocketService.on(WorkspaceSocketEvent.USER_PRESENCE, (data: any) => {
      const parsedData = parseSocketEvent(data);
      if (parsedData.payload?.workspaceId === workspaceId) {
        // Notify all registered presence handlers for this workspace
        this.presenceHandlers.get(workspaceId)?.forEach(handler => {
          handler(parsedData.payload);
        });
      }
    });

    // Emit join event to let others know user joined
    this.webSocketService.emit(WorkspaceSocketEvent.JOIN_WORKSPACE, { workspaceId });
  }

  /**
   * Leaves a specific workspace
   * 
   * @param workspaceId ID of the workspace to leave
   * @returns Promise that resolves when workspace is left
   */
  public async leaveWorkspace(workspaceId: string): Promise<void> {
    // Remove handlers
    this.presenceHandlers.delete(workspaceId);

    // Emit leave event
    this.webSocketService.emit(WorkspaceSocketEvent.LEAVE_WORKSPACE, { workspaceId });

    // Leave the room
    const roomName = `workspace:${workspaceId}`;
    await this.webSocketService.leaveRoom(roomName);
  }

  /**
   * Joins a specific notebook for collaborative editing
   * 
   * @param notebookId ID of the notebook to join
   * @returns Promise that resolves when notebook is joined
   */
  public async joinNotebook(notebookId: string): Promise<void> {
    // Check if already connected
    if (!this.webSocketService.isConnected()) {
      await this.webSocketService.connect();
    }

    // Join the notebook room
    const roomName = `notebook:${notebookId}`;
    await this.webSocketService.joinRoom(roomName);

    // Set up event listeners for this notebook
    this.webSocketService.on(WorkspaceSocketEvent.CELL_UPDATED, (data: any) => {
      const parsedData = parseSocketEvent(data);
      if (parsedData.payload?.notebookId === notebookId) {
        // Notify all registered handlers for this notebook
        this.cellUpdateHandlers.get(notebookId)?.forEach(handler => {
          handler(parsedData.payload);
        });
      }
    });

    this.webSocketService.on(WorkspaceSocketEvent.CELL_EXECUTED, (data: any) => {
      const parsedData = parseSocketEvent(data);
      if (parsedData.payload?.notebookId === notebookId) {
        // Notify all registered execution result handlers for this notebook
        this.executionResultHandlers.get(notebookId)?.forEach(handler => {
          handler(parsedData.payload);
        });
      }
    });

    // Emit join event to let others know user joined notebook
    this.webSocketService.emit(WorkspaceSocketEvent.JOIN_NOTEBOOK, { notebookId });
  }

  /**
   * Leaves a specific notebook
   * 
   * @param notebookId ID of the notebook to leave
   * @returns Promise that resolves when notebook is left
   */
  public async leaveNotebook(notebookId: string): Promise<void> {
    // Remove handlers
    this.cellUpdateHandlers.delete(notebookId);
    this.executionResultHandlers.delete(notebookId);

    // Emit leave event
    this.webSocketService.emit(WorkspaceSocketEvent.LEAVE_NOTEBOOK, { notebookId });

    // Leave the room
    const roomName = `notebook:${notebookId}`;
    await this.webSocketService.leaveRoom(roomName);
  }

  /**
   * Sends a cell update to collaborators
   * 
   * @param notebookId ID of the notebook
   * @param cellId ID of the cell
   * @param cellData Updated cell data
   * @returns Promise that resolves with server acknowledgment
   */
  public async updateCell(notebookId: string, cellId: string, cellData: any): Promise<any> {
    const data = {
      notebookId,
      cellId,
      cellData
    };

    return this.webSocketService.emitWithAck(WorkspaceSocketEvent.CELL_UPDATED, data);
  }

  /**
   * Sends a request to execute a notebook cell
   * 
   * @param notebookId ID of the notebook
   * @param cellId ID of the cell to execute
   * @returns Promise that resolves with execution request acknowledgment
   */
  public async executeCell(notebookId: string, cellId: string): Promise<any> {
    const data = {
      notebookId,
      cellId
    };

    return this.webSocketService.emitWithAck(WorkspaceSocketEvent.CELL_EXECUTED, data);
  }

  /**
   * Registers a handler for cell updates in a notebook
   * 
   * @param notebookId ID of the notebook
   * @param handler Function to call when a cell is updated
   * @returns Function to remove the handler
   */
  public onCellUpdate(notebookId: string, handler: Function): () => void {
    if (!this.cellUpdateHandlers.has(notebookId)) {
      this.cellUpdateHandlers.set(notebookId, new Set());
    }

    const handlers = this.cellUpdateHandlers.get(notebookId)!;
    handlers.add(handler);

    return () => {
      const handlers = this.cellUpdateHandlers.get(notebookId);
      if (handlers) {
        handlers.delete(handler);
        
        if (handlers.size === 0) {
          this.cellUpdateHandlers.delete(notebookId);
        }
      }
    };
  }

  /**
   * Registers a handler for cell execution results
   * 
   * @param notebookId ID of the notebook
   * @param handler Function to call when execution results arrive
   * @returns Function to remove the handler
   */
  public onCellExecutionResult(notebookId: string, handler: Function): () => void {
    if (!this.executionResultHandlers.has(notebookId)) {
      this.executionResultHandlers.set(notebookId, new Set());
    }

    const handlers = this.executionResultHandlers.get(notebookId)!;
    handlers.add(handler);

    return () => {
      const handlers = this.executionResultHandlers.get(notebookId);
      if (handlers) {
        handlers.delete(handler);
        
        if (handlers.size === 0) {
          this.executionResultHandlers.delete(notebookId);
        }
      }
    };
  }

  /**
   * Registers a handler for user presence updates
   * 
   * @param workspaceId ID of the workspace
   * @param handler Function to call when user presence changes
   * @returns Function to remove the handler
   */
  public onUserPresence(workspaceId: string, handler: Function): () => void {
    if (!this.presenceHandlers.has(workspaceId)) {
      this.presenceHandlers.set(workspaceId, new Set());
    }

    const handlers = this.presenceHandlers.get(workspaceId)!;
    handlers.add(handler);

    return () => {
      const handlers = this.presenceHandlers.get(workspaceId);
      if (handlers) {
        handlers.delete(handler);
        
        if (handlers.size === 0) {
          this.presenceHandlers.delete(workspaceId);
        }
      }
    };
  }
}

// Create singleton instances for application use
export const webSocketService = new WebSocketService();
export const messageSocketService = new MessageSocketService(webSocketService);
export const workspaceSocketService = new WorkspaceSocketService(webSocketService);