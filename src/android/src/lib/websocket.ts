/**
 * Core WebSocket implementation for the AI Talent Marketplace Android application
 * 
 * This module manages real-time communication for messaging, workspace collaboration, 
 * and notifications through WebSocket connections. It provides reliable connection
 * handling with auto-reconnection, offline message queueing, and Android-specific
 * optimizations for battery and network usage.
 * 
 * Features:
 * - Secure authenticated WebSocket connections
 * - Auto-reconnection with exponential backoff
 * - Offline message queueing and delivery
 * - Real-time typing indicators
 * - Android battery and network optimizations
 * - Background/foreground state awareness
 * 
 * @version 1.0.0
 */

import { getAuthToken } from '../utils/keychain';
import { API_BASE_URL } from './axios';
import { isTokenExpired } from './auth';
import { 
  Message, 
  MessagePayload, 
  MessageSocketEvent, 
  ConnectionState, 
  TypingIndicator 
} from '../types/message.types';
import { 
  WorkspaceSocketEvent, 
  Cell 
} from '../types/workspace.types';

import io, { Socket, ManagerOptions, SocketOptions } from 'socket.io-client'; // socket.io-client ^4.7.1
import EventEmitter from 'eventemitter3'; // eventemitter3 ^5.0.1
import { NetInfo } from '@react-native-community/netinfo'; // @react-native-community/netinfo ^9.3.10
import { Platform, AppState } from 'react-native'; // react-native 0.72.x

// WebSocket configuration constants
const WEBSOCKET_URL = API_BASE_URL.replace(/^http/, 'ws');
const RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;
const CONNECTION_TIMEOUT = 10000;
const HEARTBEAT_INTERVAL = 30000;
const MESSAGE_QUEUE_SIZE = 100;
const PING_INTERVAL = 25000;
const PING_TIMEOUT = 20000;

/**
 * Creates URL query parameters for WebSocket connection with authentication token
 * 
 * @returns Formatted query string with auth token and device information
 */
export const createSocketQueryParams = async (): Promise<string> => {
  // Get the authentication token
  const token = await getAuthToken();
  
  if (!token) {
    console.warn('No authentication token available for WebSocket connection');
    return '';
  }
  
  // Build query parameters with the token and device information
  const params = new URLSearchParams();
  params.append('token', token);
  params.append('platform', 'android');
  params.append('version', Platform.Version.toString());
  params.append('model', Platform.constants.Model || 'Unknown');
  
  return params.toString();
};

/**
 * Parses incoming socket event data into a typed structure
 * 
 * @param data Raw data received from WebSocket
 * @returns Parsed event and payload structure
 */
export const parseSocketEvent = (data: any): { event: string; payload: any } => {
  // Default empty response
  const defaultResponse = { event: '', payload: null };
  
  // Validate data format
  if (!data) return defaultResponse;
  
  try {
    // If data is a string, try to parse it as JSON
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (error) {
        console.error('Error parsing socket data as JSON:', error);
        return defaultResponse;
      }
    }
    
    // Extract event and payload from the data
    const event = data.event || '';
    const payload = data.data || data.payload || null;
    
    return { event, payload };
  } catch (error) {
    console.error('Error parsing socket event:', error);
    return defaultResponse;
  }
};

/**
 * Formats outgoing data into a standard payload structure
 * 
 * @param event The event name
 * @param data The data to send
 * @returns Formatted socket payload
 */
export const formatSocketPayload = (event: string, data: any): any => {
  return {
    event,
    data,
    timestamp: Date.now(),
    platform: 'android',
    version: Platform.Version.toString()
  };
};

/**
 * Core service class that manages WebSocket connections and message handling for Android
 */
export class WebSocketService {
  // Socket instance
  private socket: Socket | null = null;
  
  // Event emitter for internal event handling
  private eventEmitter: EventEmitter = new EventEmitter();
  
  // Connection state tracking
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  
  // Queue for messages during offline periods
  private messageQueue: MessagePayload[] = [];
  
  // Set of active conversation rooms
  private activeRooms: Set<string> = new Set();
  
  // Counter for reconnection attempts
  private reconnectAttempts: number = 0;
  
  // Heartbeat interval reference
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  // Network monitoring cleanup function
  private networkCleanup: (() => void) | null = null;
  
  // App state monitoring cleanup function
  private appStateCleanup: (() => void) | null = null;
  
  /**
   * Initializes the WebSocket service
   */
  constructor() {
    // Initialize the socket as null
    this.socket = null;
    
    // Create a new event emitter instance
    this.eventEmitter = new EventEmitter();
    
    // Set initial connection state to DISCONNECTED
    this.connectionState = ConnectionState.DISCONNECTED;
    
    // Initialize empty message queue
    this.messageQueue = [];
    
    // Initialize empty set of active rooms
    this.activeRooms = new Set();
    
    // Reset reconnect attempts counter
    this.reconnectAttempts = 0;
    
    // Set heartbeat interval to null
    this.heartbeatInterval = null;
    
    // Setup network and app state listeners
    this.networkCleanup = this.setupNetworkListeners();
    this.appStateCleanup = this.setupAppStateListeners();
  }
  
  /**
   * Initializes the WebSocket service and establishes connection
   * 
   * @returns Promise resolving to true if initialization successful
   */
  async initialize(): Promise<boolean> {
    try {
      // Set up network and app state listeners
      if (!this.networkCleanup) {
        this.networkCleanup = this.setupNetworkListeners();
      }
      
      if (!this.appStateCleanup) {
        this.appStateCleanup = this.setupAppStateListeners();
      }
      
      // Attempt to establish WebSocket connection
      const connected = await this.connect();
      
      // Start heartbeat mechanism if connected
      if (connected) {
        this.startHeartbeat();
      }
      
      return connected;
    } catch (error) {
      console.error('Failed to initialize WebSocket service:', error);
      return false;
    }
  }
  
  /**
   * Properly shuts down the WebSocket service and cleans up resources
   * 
   * @returns Promise that resolves when shutdown is complete
   */
  async shutdown(): Promise<void> {
    try {
      // Disconnect from WebSocket server
      await this.disconnect();
      
      // Clear all event listeners
      this.eventEmitter.removeAllListeners();
      
      // Clear message queue
      this.messageQueue = [];
      
      // Stop heartbeat mechanism
      this.stopHeartbeat();
      
      // Remove network and app state listeners
      if (this.networkCleanup) {
        this.networkCleanup();
        this.networkCleanup = null;
      }
      
      if (this.appStateCleanup) {
        this.appStateCleanup();
        this.appStateCleanup = null;
      }
    } catch (error) {
      console.error('Error during WebSocket service shutdown:', error);
    }
  }
  
  /**
   * Establishes a Socket.io connection to the WebSocket server
   * 
   * @param managerOptions Socket.io manager options
   * @param socketOptions Socket.io socket options
   * @returns Promise resolving to true if connection successful, false otherwise
   */
  async connect(
    managerOptions?: ManagerOptions,
    socketOptions?: SocketOptions
  ): Promise<boolean> {
    return new Promise(async (resolve) => {
      try {
        // Set connection state to CONNECTING
        this.connectionState = ConnectionState.CONNECTING;
        this.eventEmitter.emit('connectionStateChange', this.connectionState);
        
        // Check if a connection already exists and is active
        if (this.socket && this.socket.connected) {
          console.log('Socket is already connected');
          this.connectionState = ConnectionState.CONNECTED;
          this.eventEmitter.emit('connectionStateChange', this.connectionState);
          return resolve(true);
        }
        
        // Get authentication token and verify it's not expired
        const token = await getAuthToken();
        if (!token) {
          console.error('No authentication token available for WebSocket connection');
          this.connectionState = ConnectionState.DISCONNECTED;
          this.eventEmitter.emit('connectionStateChange', this.connectionState);
          return resolve(false);
        }
        
        if (await isTokenExpired(token)) {
          console.error('Authentication token is expired for WebSocket connection');
          this.connectionState = ConnectionState.DISCONNECTED;
          this.eventEmitter.emit('connectionStateChange', this.connectionState);
          return resolve(false);
        }
        
        // Build connection query string
        const queryParams = await createSocketQueryParams();
        
        // Create connection timeout
        const timeoutId = setTimeout(() => {
          console.error('WebSocket connection timeout');
          this.connectionState = ConnectionState.DISCONNECTED;
          this.eventEmitter.emit('connectionStateChange', this.connectionState);
          resolve(false);
        }, CONNECTION_TIMEOUT);
        
        // Configure socket options for Android optimization
        const defaultManagerOptions: ManagerOptions = {
          reconnection: false, // We'll handle reconnection manually
          timeout: CONNECTION_TIMEOUT,
          autoConnect: true,
          query: queryParams
        };
        
        const defaultSocketOptions: SocketOptions = {
          forceNew: true,
          timeout: CONNECTION_TIMEOUT,
          reconnection: false,
          query: queryParams
        };
        
        // Merge with provided options
        const finalManagerOptions = {
          ...defaultManagerOptions,
          ...managerOptions
        };
        
        const finalSocketOptions = {
          ...defaultSocketOptions,
          ...socketOptions
        };
        
        // Initialize socket.io client with connection options
        this.socket = io(WEBSOCKET_URL, {
          ...finalManagerOptions,
          ...finalSocketOptions
        });
        
        // Set up connection event handlers
        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          clearTimeout(timeoutId);
          
          // Reset reconnection attempts on successful connection
          this.reconnectAttempts = 0;
          
          // Update connection state
          this.connectionState = ConnectionState.CONNECTED;
          this.eventEmitter.emit('connectionStateChange', this.connectionState);
          
          // Re-join all active rooms
          this.activeRooms.forEach(room => {
            this.socket?.emit('join_conversation', { conversationId: room });
            console.log(`Rejoined room: ${room}`);
          });
          
          // Process any queued messages
          this.processMessageQueue();
          
          resolve(true);
        });
        
        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          clearTimeout(timeoutId);
          
          this.connectionState = ConnectionState.DISCONNECTED;
          this.eventEmitter.emit('connectionStateChange', this.connectionState);
          
          resolve(false);
        });
        
        this.socket.on('disconnect', (reason) => {
          console.log(`WebSocket disconnected: ${reason}`);
          
          this.connectionState = ConnectionState.DISCONNECTED;
          this.eventEmitter.emit('connectionStateChange', this.connectionState);
          
          // Attempt to reconnect if not intentionally closed
          if (reason !== 'io client disconnect') {
            this.reconnect();
          }
        });
        
        // Set up message event handlers
        this.socket.on(MessageSocketEvent.MESSAGE_RECEIVED, (data: any) => {
          const { payload } = parseSocketEvent(data);
          this.eventEmitter.emit(MessageSocketEvent.MESSAGE_RECEIVED, payload);
        });
        
        this.socket.on(MessageSocketEvent.TYPING_START, (data: any) => {
          const { payload } = parseSocketEvent(data);
          this.eventEmitter.emit(MessageSocketEvent.TYPING_START, payload);
        });
        
        this.socket.on(MessageSocketEvent.TYPING_END, (data: any) => {
          const { payload } = parseSocketEvent(data);
          this.eventEmitter.emit(MessageSocketEvent.TYPING_END, payload);
        });
        
        // Workspace collaboration event handlers
        this.socket.on(WorkspaceSocketEvent.CELL_UPDATED, (data: any) => {
          const { payload } = parseSocketEvent(data);
          this.eventEmitter.emit(WorkspaceSocketEvent.CELL_UPDATED, payload);
        });
        
        this.socket.on(WorkspaceSocketEvent.USER_PRESENCE, (data: any) => {
          const { payload } = parseSocketEvent(data);
          this.eventEmitter.emit(WorkspaceSocketEvent.USER_PRESENCE, payload);
        });
        
      } catch (error) {
        console.error('Error establishing WebSocket connection:', error);
        this.connectionState = ConnectionState.DISCONNECTED;
        this.eventEmitter.emit('connectionStateChange', this.connectionState);
        resolve(false);
      }
    });
  }
  
  /**
   * Disconnects the active Socket.io connection
   * 
   * @returns Promise that resolves when disconnection is complete
   */
  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      // Check if socket exists and is connected
      if (!this.socket) {
        this.connectionState = ConnectionState.DISCONNECTED;
        this.eventEmitter.emit('connectionStateChange', this.connectionState);
        return resolve();
      }
      
      // If connected, send disconnect event to server
      if (this.socket.connected) {
        // Clear heartbeat interval
        this.stopHeartbeat();
        
        // Send a clean disconnect event so server can clean up resources
        this.socket.emit('client_disconnect');
        
        // Set a timeout to ensure disconnect completes
        const timeoutId = setTimeout(() => {
          console.log('Disconnect timeout, forcing close');
          
          if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
          }
          
          this.connectionState = ConnectionState.DISCONNECTED;
          this.eventEmitter.emit('connectionStateChange', this.connectionState);
          resolve();
        }, 1000);
        
        // Call socket.disconnect() to close the connection
        this.socket.disconnect();
        
        // Listen for disconnect event
        this.socket.once('disconnect', () => {
          clearTimeout(timeoutId);
          
          this.socket?.removeAllListeners();
          this.socket = null;
          
          this.connectionState = ConnectionState.DISCONNECTED;
          this.eventEmitter.emit('connectionStateChange', this.connectionState);
          resolve();
        });
      } else {
        // If not connected, just clean up the socket
        this.socket.removeAllListeners();
        this.socket = null;
        
        this.connectionState = ConnectionState.DISCONNECTED;
        this.eventEmitter.emit('connectionStateChange', this.connectionState);
        resolve();
      }
    });
  }
  
  /**
   * Attempts to reconnect to the WebSocket server
   * 
   * @returns Promise resolving to true if reconnection successful, false otherwise
   */
  async reconnect(): Promise<boolean> {
    // Set connection state to RECONNECTING
    this.connectionState = ConnectionState.RECONNECTING;
    this.eventEmitter.emit('connectionStateChange', this.connectionState);
    
    // Check if we've exceeded the maximum number of attempts
    if (this.reconnectAttempts >= RECONNECT_ATTEMPTS) {
      console.warn(`Maximum reconnection attempts (${RECONNECT_ATTEMPTS}) reached`);
      
      this.connectionState = ConnectionState.DISCONNECTED;
      this.eventEmitter.emit('connectionStateChange', this.connectionState);
      
      return false;
    }
    
    // Implement exponential backoff for reconnection attempts
    const delay = RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts);
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${RECONNECT_ATTEMPTS})`);
    
    // Wait for the backoff delay
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Disconnect current socket if it exists
    if (this.socket) {
      await this.disconnect();
    }
    
    // Increment reconnection attempts counter
    this.reconnectAttempts++;
    
    // Attempt to connect
    const connected = await this.connect();
    
    // If connection successful, process queued messages
    if (connected) {
      await this.processMessageQueue();
    }
    
    return connected;
  }
  
  /**
   * Sends an event to the WebSocket server with offline queueing support
   * 
   * @param event The event name to emit
   * @param data The data to send
   * @param queueable Whether the message should be queued if offline
   * @returns Promise resolving to true if event was sent or queued successfully
   */
  async emit(event: string, data: any, queueable: boolean = false): Promise<boolean> {
    try {
      // Check if connection is active
      if (!this.socket || !this.socket.connected) {
        if (queueable) {
          // Format the payload
          const payload = formatSocketPayload(event, data);
          
          // Add to message queue if queueable
          this.messageQueue.push(payload);
          
          // Enforce queue size limit with FIFO behavior
          if (this.messageQueue.length > MESSAGE_QUEUE_SIZE) {
            this.messageQueue.shift();
          }
          
          console.log(`Socket disconnected, queued ${event} event for later delivery`);
          return true;
        } else {
          console.warn(`Cannot emit ${event} event, socket is disconnected and message is not queueable`);
          return false;
        }
      }
      
      // Format the payload
      const payload = formatSocketPayload(event, data);
      
      // Emit event directly to server
      this.socket.emit(event, payload);
      return true;
    } catch (error) {
      console.error(`Error emitting ${event} event:`, error);
      return false;
    }
  }
  
  /**
   * Emits an event and returns a promise that resolves with the acknowledgment
   * 
   * @param event The event name to emit
   * @param data The data to send
   * @param timeout Timeout in milliseconds for the acknowledgment
   * @returns Promise that resolves with acknowledgment data or rejects on timeout
   */
  async emitWithAck(event: string, data: any, timeout: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        // Check if socket exists and is connected
        if (!this.socket || !this.socket.connected) {
          // Format the payload for queuing
          const payload = formatSocketPayload(event, data);
          
          // Add to message queue for later delivery
          this.messageQueue.push(payload);
          
          // Enforce queue size limit with FIFO behavior
          if (this.messageQueue.length > MESSAGE_QUEUE_SIZE) {
            this.messageQueue.shift();
          }
          
          console.log(`Socket disconnected, queued ${event} event for later delivery`);
          reject(new Error(`Socket disconnected, message queued`));
          return;
        }
        
        // Format the payload
        const payload = formatSocketPayload(event, data);
        
        // Set timeout to reject the promise if ack not received within timeout period
        const timeoutId = setTimeout(() => {
          reject(new Error(`Acknowledgment timeout for ${event} event`));
        }, timeout);
        
        // Emit event with callback that resolves the promise on response
        this.socket.emit(event, payload, (response: any) => {
          clearTimeout(timeoutId);
          resolve(response);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Joins a specific conversation channel for real-time messaging
   * 
   * @param conversationId The ID of the conversation to join
   * @returns Promise that resolves when conversation is joined
   */
  async joinConversation(conversationId: string): Promise<boolean> {
    try {
      if (!conversationId) {
        console.error('Cannot join conversation: conversationId is required');
        return false;
      }
      
      // Check connection status and connect if needed
      if (!this.socket || !this.socket.connected) {
        const connected = await this.connect();
        if (!connected) {
          console.error('Cannot join conversation: unable to connect to WebSocket server');
          return false;
        }
      }
      
      // Emit join_conversation event with conversationId
      const success = await this.emit('join_conversation', { conversationId });
      
      if (success) {
        // Add conversationId to active rooms list
        this.activeRooms.add(conversationId);
        console.log(`Joined conversation: ${conversationId}`);
      }
      
      return success;
    } catch (error) {
      console.error(`Error joining conversation ${conversationId}:`, error);
      return false;
    }
  }
  
  /**
   * Leaves a specific conversation channel
   * 
   * @param conversationId The ID of the conversation to leave
   * @returns Promise that resolves when conversation is left
   */
  async leaveConversation(conversationId: string): Promise<boolean> {
    try {
      if (!conversationId) {
        console.error('Cannot leave conversation: conversationId is required');
        return false;
      }
      
      // Check if connection is active
      if (!this.socket || !this.socket.connected) {
        // If disconnected, just remove from active rooms
        this.activeRooms.delete(conversationId);
        return true;
      }
      
      // Emit leave_conversation event with conversationId
      const success = await this.emit('leave_conversation', { conversationId });
      
      if (success) {
        // Remove conversationId from active rooms list
        this.activeRooms.delete(conversationId);
        console.log(`Left conversation: ${conversationId}`);
      }
      
      return success;
    } catch (error) {
      console.error(`Error leaving conversation ${conversationId}:`, error);
      return false;
    }
  }
  
  /**
   * Sends a message to a specific conversation
   * 
   * @param messageData The message data to send
   * @returns Promise that resolves with server acknowledgment
   */
  async sendMessage(messageData: MessagePayload): Promise<boolean> {
    try {
      if (!messageData || !messageData.conversationId) {
        console.error('Cannot send message: invalid message data');
        return false;
      }
      
      // Format message with event type MESSAGE_RECEIVED
      const formattedMessage = {
        ...messageData,
        event: MessageSocketEvent.MESSAGE_RECEIVED,
        timestamp: Date.now(),
        platform: 'android',
        version: Platform.Version.toString()
      };
      
      // Use emitWithAck to get server confirmation
      try {
        await this.emitWithAck('message', formattedMessage, 5000);
        return true;
      } catch (error) {
        console.error('Error sending message with acknowledgment:', error);
        // If socket is disconnected, message is already queued by emitWithAck
        return false;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }
  
  /**
   * Marks messages in a conversation as read
   * 
   * @param conversationId The ID of the conversation
   * @param messageIds Array of message IDs to mark as read
   * @returns Promise that resolves when messages are marked as read
   */
  async markAsRead(conversationId: string, messageIds: string[]): Promise<boolean> {
    try {
      if (!conversationId || !messageIds || messageIds.length === 0) {
        console.error('Cannot mark messages as read: missing conversationId or messageIds');
        return false;
      }
      
      // Format read receipt data
      const readReceiptData = {
        conversationId,
        messageIds,
        event: MessageSocketEvent.MESSAGE_READ,
        timestamp: Date.now()
      };
      
      // Emit read_receipt event
      return await this.emit('read_receipt', readReceiptData, true);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return false;
    }
  }
  
  /**
   * Sends typing indicator status to a conversation
   * 
   * @param conversationId The ID of the conversation
   * @param isTyping Whether the user is currently typing
   * @returns Promise that resolves when typing indicator is sent
   */
  async sendTypingIndicator(conversationId: string, isTyping: boolean): Promise<boolean> {
    try {
      if (!conversationId) {
        console.error('Cannot send typing indicator: conversationId is required');
        return false;
      }
      
      // Create typing indicator payload
      const typingData = {
        conversationId,
        isTyping,
        event: isTyping ? MessageSocketEvent.TYPING_START : MessageSocketEvent.TYPING_END,
        timestamp: Date.now()
      };
      
      // Emit typing_indicator event
      return await this.emit('typing_indicator', typingData);
    } catch (error) {
      console.error('Error sending typing indicator:', error);
      return false;
    }
  }
  
  /**
   * Starts a heartbeat interval to keep the connection alive
   */
  startHeartbeat(): void {
    // Clear any existing heartbeat interval
    this.stopHeartbeat();
    
    // Set up a new interval to ping the server
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('ping');
      } else {
        // If socket disconnected, attempt to reconnect
        this.reconnect();
      }
    }, HEARTBEAT_INTERVAL);
  }
  
  /**
   * Stops the heartbeat interval
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  /**
   * Processes queued messages after reconnection
   * 
   * @returns Promise that resolves when queue processing is complete
   */
  async processMessageQueue(): Promise<void> {
    // Check if there are messages in the queue
    if (this.messageQueue.length === 0) {
      return;
    }
    
    // Check if socket is connected
    if (!this.socket || !this.socket.connected) {
      console.log('Cannot process message queue: socket is disconnected');
      return;
    }
    
    console.log(`Processing ${this.messageQueue.length} queued messages`);
    
    // Clone the queue to avoid mutation issues during processing
    const queueCopy = [...this.messageQueue];
    
    // Clear the original queue
    this.messageQueue = [];
    
    // Process messages in order with slight delay between them
    for (const message of queueCopy) {
      try {
        // Extract event and data from the queued message
        const { event, data } = message;
        
        // Emit the event
        this.socket.emit(event, data);
        
        // Add a small delay between messages to avoid flooding
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Error processing queued message:', error);
        // Re-queue the message if processing failed
        this.messageQueue.push(message);
      }
    }
    
    console.log(`Processed ${queueCopy.length - this.messageQueue.length} queued messages successfully`);
  }
  
  /**
   * Sets up listeners for network connectivity changes
   * 
   * @returns Cleanup function to remove listeners
   */
  setupNetworkListeners(): () => void {
    // Subscribe to network info changes
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        // Network is available, attempt to reconnect if disconnected
        if (!this.socket || !this.socket.connected) {
          console.log('Network connection restored, attempting to reconnect...');
          this.reconnect();
        }
      } else {
        // Network is unavailable, update connection state
        console.log('Network connection lost');
        this.connectionState = ConnectionState.DISCONNECTED;
        this.eventEmitter.emit('connectionStateChange', this.connectionState);
      }
    });
    
    return unsubscribe;
  }
  
  /**
   * Sets up listeners for app state changes (foreground/background)
   * 
   * @returns Cleanup function to remove listeners
   */
  setupAppStateListeners(): () => void {
    // Store current app state
    let currentAppState = AppState.currentState;
    
    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', nextAppState => {
      // App has come to the foreground
      if (
        (currentAppState === 'background' || currentAppState === 'inactive') && 
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground');
        
        // Check connection and reconnect if needed
        if (!this.socket || !this.socket.connected) {
          console.log('App resumed, attempting to reconnect WebSocket...');
          this.reconnect();
        }
      } 
      // App has gone to the background
      else if (
        currentAppState === 'active' && 
        (nextAppState === 'background' || nextAppState === 'inactive')
      ) {
        console.log('App has gone to the background');
        
        // Optimize connection for background state
        // We keep the connection for a short while to allow for message delivery
        if (this.socket && this.socket.connected) {
          // In a real app, you might want to disconnect after a timeout
          // or use a more battery-efficient strategy
        }
      }
      
      // Update current app state
      currentAppState = nextAppState;
    });
    
    // Return cleanup function
    return () => {
      subscription.remove();
    };
  }
  
  /**
   * Gets the current WebSocket connection state
   * 
   * @returns Current connection state enum value
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }
  
  /**
   * Checks if the WebSocket is currently connected
   * 
   * @returns True if connected, false otherwise
   */
  isConnected(): boolean {
    return this.socket !== null && this.socket.connected;
  }
  
  /**
   * Registers a callback for incoming messages
   * 
   * @param callback Function to call when a message is received
   * @returns Unsubscribe function to remove the listener
   */
  onMessageReceived(callback: (data: any) => void): () => void {
    this.eventEmitter.on(MessageSocketEvent.MESSAGE_RECEIVED, callback);
    return () => {
      this.eventEmitter.off(MessageSocketEvent.MESSAGE_RECEIVED, callback);
    };
  }
  
  /**
   * Registers a callback for typing indicator events
   * 
   * @param callback Function to call when a typing indicator is received
   * @returns Unsubscribe function to remove the listener
   */
  onTypingIndicator(callback: (data: TypingIndicator) => void): () => void {
    // Create handlers for both typing start and end events
    const handleTypingStart = (data: TypingIndicator) => {
      callback({ ...data, isTyping: true });
    };
    
    const handleTypingEnd = (data: TypingIndicator) => {
      callback({ ...data, isTyping: false });
    };
    
    // Register both event handlers
    this.eventEmitter.on(MessageSocketEvent.TYPING_START, handleTypingStart);
    this.eventEmitter.on(MessageSocketEvent.TYPING_END, handleTypingEnd);
    
    // Return function to unsubscribe from both events
    return () => {
      this.eventEmitter.off(MessageSocketEvent.TYPING_START, handleTypingStart);
      this.eventEmitter.off(MessageSocketEvent.TYPING_END, handleTypingEnd);
    };
  }
  
  /**
   * Registers a callback for connection state changes
   * 
   * @param callback Function to call when connection state changes
   * @returns Unsubscribe function to remove the listener
   */
  onConnectionStateChange(callback: (state: ConnectionState) => void): () => void {
    this.eventEmitter.on('connectionStateChange', callback);
    return () => {
      this.eventEmitter.off('connectionStateChange', callback);
    };
  }
}

// Create a singleton instance of the WebSocket service
const messageSocketService = new WebSocketService();

// Export the singleton instance and utility functions
export {
  messageSocketService,
  ConnectionState,
  createSocketQueryParams,
  WebSocketService
};