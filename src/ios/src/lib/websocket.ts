/**
 * WebSocket Service for iOS
 * 
 * This module provides real-time communication capabilities for messaging, notifications,
 * and collaborative features in the iOS mobile application. It handles connection state,
 * reconnection logic, message queuing, and authentication for WebSocket communication.
 * 
 * @version 1.0.0
 */

import { NetInfo } from '@react-native-community/netinfo'; // ^9.3.10
import { Platform, AppState } from 'react-native'; // 0.72.x
import socketio from 'socket.io-client'; // ^4.7.1
import EventEmitter from 'eventemitter3'; // ^5.0.1

import { getAuthToken } from '../utils/keychain';
import { API_BASE_URL, isTokenExpired } from './axios';
import { 
  MessageSocketEvent, 
  ConnectionState, 
  MessagePayload, 
  TypingIndicator,
  Message 
} from '../types/message.types';

// WebSocket configuration constants
const WEBSOCKET_URL = API_BASE_URL.replace(/^http/, 'ws');
const RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000; // 3 seconds
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const MESSAGE_QUEUE_SIZE = 100;
const CONNECTION_TIMEOUT = 10000; // 10 seconds

/**
 * Creates and configures a new WebSocket client with authentication and reconnection logic
 * @returns Configured socket.io client instance
 */
const createWebSocketClient = async (): Promise<socketio.Socket> => {
  // Create options object for socket.io client configuration
  const options: socketio.ManagerOptions & socketio.SocketOptions = {
    transports: ['websocket'],
    reconnection: false, // We'll handle reconnection manually
    timeout: CONNECTION_TIMEOUT,
    forceNew: true,
    autoConnect: false
  };
  
  // Get authentication token from keychain
  const token = await getAuthToken();
  
  // Add auth token to connection parameters in the auth object
  if (token) {
    options.auth = {
      token
    };
  }
  
  // Add device info to query parameters
  options.query = {
    platform: Platform.OS,
    version: Platform.Version,
    appVersion: '1.0.0' // Should be dynamically fetched from app config
  };
  
  // Create new socket.io client instance with WEBSOCKET_URL and options
  const socket = socketio(WEBSOCKET_URL, options);
  
  return socket;
};

/**
 * Service class that manages WebSocket connections and message handling
 */
class WebSocketService {
  socket: socketio.Socket | null;
  eventEmitter: EventEmitter;
  connectionState: ConnectionState;
  messageQueue: MessagePayload[];
  activeRooms: Set<string>;
  reconnectAttempts: number;
  heartbeatInterval: NodeJS.Timeout | null;
  networkCleanup: (() => void) | null;
  appStateCleanup: (() => void) | null;
  private _typingThrottleTimeout: NodeJS.Timeout | null = null;

  /**
   * Initializes the WebSocket service with event emitter and state
   */
  constructor() {
    this.socket = null;
    this.eventEmitter = new EventEmitter();
    this.connectionState = ConnectionState.DISCONNECTED;
    this.messageQueue = [];
    this.activeRooms = new Set<string>();
    this.reconnectAttempts = 0;
    this.heartbeatInterval = null;
    this.networkCleanup = null;
    this.appStateCleanup = null;
    
    // Set up listeners for network and app state changes
    this.setupNetworkListeners();
    this.setupAppStateListeners();
  }

  /**
   * Initializes the WebSocket service and establishes connection
   * @returns Promise resolving to true if initialization successful
   */
  async initialize(): Promise<boolean> {
    // Set up network and app state listeners if not already set up
    if (!this.networkCleanup) {
      this.networkCleanup = this.setupNetworkListeners();
    }
    
    if (!this.appStateCleanup) {
      this.appStateCleanup = this.setupAppStateListeners();
    }
    
    // Attempt to establish WebSocket connection
    const connected = await this.connect();
    
    if (connected) {
      // Start heartbeat mechanism
      this.startHeartbeat();
    }
    
    return connected;
  }

  /**
   * Properly shuts down the WebSocket service and cleans up resources
   * @returns Promise that resolves when shutdown is complete
   */
  async shutdown(): Promise<void> {
    // Disconnect from WebSocket server
    await this.disconnect();
    
    // Clear all event listeners
    this.eventEmitter.removeAllListeners();
    
    // Clear message queue
    this.messageQueue = [];
    
    // Clear active rooms
    this.activeRooms.clear();
    
    // Stop heartbeat mechanism
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Remove network and app state listeners
    if (this.networkCleanup) {
      this.networkCleanup();
      this.networkCleanup = null;
    }
    
    if (this.appStateCleanup) {
      this.appStateCleanup();
      this.appStateCleanup = null;
    }
  }

  /**
   * Sets up listeners for network connectivity changes
   * @returns Cleanup function to remove listeners
   */
  setupNetworkListeners(): () => void {
    // Subscribe to network info changes
    const unsubscribe = NetInfo.addEventListener(state => {
      // Check if connection state has changed
      const isConnected = state.isConnected === true;
      
      // Emit network change event
      this.eventEmitter.emit(MessageSocketEvent.NETWORK_CHANGE, { isConnected });
      
      if (isConnected) {
        // We're online, try to reconnect if not already connected
        if (this.connectionState !== ConnectionState.CONNECTED) {
          this.reconnect();
        }
      } else {
        // We're offline, update connection state if needed
        if (this.connectionState === ConnectionState.CONNECTED) {
          this.connectionState = ConnectionState.DISCONNECTED;
          this.eventEmitter.emit('connectionStateChange', this.connectionState);
        }
      }
    });
    
    return unsubscribe;
  }

  /**
   * Sets up listeners for app state changes (foreground/background)
   * @returns Cleanup function to remove listeners
   */
  setupAppStateListeners(): () => void {
    // Function to handle app state changes
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // App has come to the foreground
        // Check if we need to reconnect
        if (this.connectionState !== ConnectionState.CONNECTED) {
          this.reconnect();
        }
      } else if (nextAppState === 'background') {
        // App has gone to the background
        // For now, we'll stay connected but could implement a config option
        // to disconnect to save battery if needed
      }
    };
    
    // Subscribe to app state changes
    AppState.addEventListener('change', handleAppStateChange);
    
    // Return cleanup function
    return () => {
      AppState.removeEventListener('change', handleAppStateChange);
    };
  }

  /**
   * Establishes a connection to the WebSocket server with authentication
   * @returns Promise resolving to true if connection successful, false otherwise
   */
  async connect(): Promise<boolean> {
    // Check if a connection already exists and is active
    if (this.socket && this.connectionState === ConnectionState.CONNECTED) {
      return true;
    }
    
    // Set connection state to CONNECTING
    this.connectionState = ConnectionState.CONNECTING;
    this.eventEmitter.emit('connectionStateChange', this.connectionState);
    
    try {
      // Get authentication token from keychain
      const token = await getAuthToken();
      
      if (!token) {
        console.error('WebSocket connection failed: No authentication token available');
        this.connectionState = ConnectionState.DISCONNECTED;
        this.eventEmitter.emit('connectionStateChange', this.connectionState);
        return false;
      }
      
      // If token is expired, we should get a new one (handled by axios)
      if (isTokenExpired(token)) {
        console.warn('WebSocket connection: Token is expired, authentication may fail');
        // In a real app, consider refreshing the token here before connecting
      }
      
      // Initialize socket.io client with createWebSocketClient
      this.socket = await createWebSocketClient();
      
      return new Promise<boolean>((resolve) => {
        // Set connection timeout
        const connectionTimeout = setTimeout(() => {
          if (this.connectionState !== ConnectionState.CONNECTED) {
            console.error('WebSocket connection timeout');
            this.connectionState = ConnectionState.DISCONNECTED;
            this.eventEmitter.emit('connectionStateChange', this.connectionState);
            resolve(false);
          }
        }, CONNECTION_TIMEOUT);
        
        // Set up event listeners for connection events
        if (this.socket) {
          // Handle successful connection
          this.socket.on('connect', () => {
            clearTimeout(connectionTimeout);
            this.connectionState = ConnectionState.CONNECTED;
            this.eventEmitter.emit('connectionStateChange', this.connectionState);
            this.reconnectAttempts = 0;
            
            // Process any queued messages
            this.processMessageQueue();
            
            // Join active conversation rooms
            this.rejoinActiveRooms();
            
            resolve(true);
          });
          
          // Handle connection error
          this.socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
            clearTimeout(connectionTimeout);
            this.connectionState = ConnectionState.DISCONNECTED;
            this.eventEmitter.emit('connectionStateChange', this.connectionState);
            
            resolve(false);
          });
          
          // Handle disconnection
          this.socket.on('disconnect', (reason) => {
            console.log('WebSocket disconnected:', reason);
            this.connectionState = ConnectionState.DISCONNECTED;
            this.eventEmitter.emit('connectionStateChange', this.connectionState);
            
            // Handle disconnection due to authentication issue
            if (reason === 'io server disconnect' || reason === 'io client disconnect') {
              // Server explicitly closed the connection, don't automatically reconnect
            } else {
              // Try to reconnect for transport-related disconnections
              this.attemptReconnect();
            }
          });
          
          // Set up handlers for incoming messages
          this.setupMessageHandlers();
          
          // Attempt connection
          this.socket.connect();
        } else {
          clearTimeout(connectionTimeout);
          this.connectionState = ConnectionState.DISCONNECTED;
          this.eventEmitter.emit('connectionStateChange', this.connectionState);
          resolve(false);
        }
      });
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.connectionState = ConnectionState.DISCONNECTED;
      this.eventEmitter.emit('connectionStateChange', this.connectionState);
      return false;
    }
  }

  /**
   * Disconnects from the WebSocket server and cleans up resources
   * @returns Promise that resolves when disconnection is complete
   */
  async disconnect(): Promise<void> {
    // Check if a connection exists
    if (!this.socket) {
      return;
    }
    
    // If connected, send disconnect event to server
    if (this.connectionState === ConnectionState.CONNECTED) {
      try {
        this.socket.emit('client_disconnect');
      } catch (error) {
        console.error('Error sending disconnect event:', error);
      }
    }
    
    // Clean up event listeners
    this.socket.off();
    
    // Close the connection
    this.socket.disconnect();
    this.socket = null;
    
    // Update connection state
    this.connectionState = ConnectionState.DISCONNECTED;
    this.eventEmitter.emit('connectionStateChange', this.connectionState);
    
    // Cancel any pending reconnection attempts
    this.reconnectAttempts = 0;
    
    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Attempts to reestablish connection to the WebSocket server
   * @returns Promise resolving to true if reconnection successful, false otherwise
   */
  async reconnect(): Promise<boolean> {
    // Set connection state to RECONNECTING
    this.connectionState = ConnectionState.RECONNECTING;
    this.eventEmitter.emit('connectionStateChange', this.connectionState);
    
    // Disconnect current socket if it exists
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    try {
      // Try to connect with refreshed authentication token
      const connected = await this.connect();
      
      if (connected) {
        console.log('WebSocket reconnected successfully');
        
        // Handle reconnection success by rejoining active conversation rooms
        this.rejoinActiveRooms();
        
        return true;
      } else {
        console.log('WebSocket reconnection failed');
        return false;
      }
    } catch (error) {
      console.error('WebSocket reconnection error:', error);
      this.connectionState = ConnectionState.DISCONNECTED;
      this.eventEmitter.emit('connectionStateChange', this.connectionState);
      return false;
    }
  }

  /**
   * Sends an event to the WebSocket server with automatic offline queueing
   * @param event - Event type to emit
   * @param data - Event data to send
   * @param queueable - Whether to queue the event if offline
   * @returns Promise resolving to true if event was sent or queued successfully
   */
  async emit(event: string, data: any, queueable: boolean = true): Promise<boolean> {
    // Check if connection is active
    if (this.connectionState !== ConnectionState.CONNECTED || !this.socket) {
      if (queueable) {
        // Add to message queue for later sending
        const payload: MessagePayload = {
          event: event as MessageSocketEvent,
          data,
          conversationId: data.conversationId || '',
          timestamp: Date.now()
        };
        
        // Implement queue size limiting with FIFO behavior
        if (this.messageQueue.length >= MESSAGE_QUEUE_SIZE) {
          this.messageQueue.shift(); // Remove oldest message
        }
        
        this.messageQueue.push(payload);
        return true;
      }
      
      return false;
    }
    
    // Send event to server
    return new Promise<boolean>((resolve) => {
      if (!this.socket) {
        resolve(false);
        return;
      }
      
      this.socket.emit(event, data, (ack: any) => {
        if (ack && ack.success) {
          resolve(true);
        } else {
          console.error('Event emission failed:', event, ack?.error || 'No acknowledgement');
          resolve(false);
        }
      });
      
      // Fallback in case server doesn't acknowledge
      setTimeout(() => {
        resolve(true);
      }, 1000);
    });
  }

  /**
   * Joins a conversation room to receive real-time updates
   * @param conversationId - ID of the conversation to join
   * @returns Promise resolving to true if room was joined successfully
   */
  async joinConversation(conversationId: string): Promise<boolean> {
    // Ensure WebSocket connection is established
    if (this.connectionState !== ConnectionState.CONNECTED || !this.socket) {
      await this.connect();
    }
    
    if (!conversationId || this.connectionState !== ConnectionState.CONNECTED || !this.socket) {
      return false;
    }
    
    return new Promise<boolean>((resolve) => {
      if (!this.socket) {
        resolve(false);
        return;
      }
      
      this.socket.emit('join_conversation', { conversationId }, (ack: any) => {
        if (ack && ack.success) {
          // Add conversationId to active rooms list
          this.activeRooms.add(conversationId);
          resolve(true);
        } else {
          console.error('Failed to join conversation:', conversationId, ack?.error || 'No acknowledgement');
          resolve(false);
        }
      });
      
      // Fallback in case server doesn't acknowledge
      setTimeout(() => {
        this.activeRooms.add(conversationId);
        resolve(true);
      }, 1000);
    });
  }

  /**
   * Leaves a conversation room to stop receiving updates
   * @param conversationId - ID of the conversation to leave
   * @returns Promise resolving to true if room was left successfully
   */
  async leaveConversation(conversationId: string): Promise<boolean> {
    // Check if connection is active
    if (!conversationId || this.connectionState !== ConnectionState.CONNECTED || !this.socket) {
      return false;
    }
    
    return new Promise<boolean>((resolve) => {
      if (!this.socket) {
        resolve(false);
        return;
      }
      
      this.socket.emit('leave_conversation', { conversationId }, (ack: any) => {
        if (ack && ack.success) {
          // Remove conversationId from active rooms list
          this.activeRooms.delete(conversationId);
          resolve(true);
        } else {
          console.error('Failed to leave conversation:', conversationId, ack?.error || 'No acknowledgement');
          resolve(false);
        }
      });
      
      // Fallback in case server doesn't acknowledge
      setTimeout(() => {
        this.activeRooms.delete(conversationId);
        resolve(true);
      }, 1000);
    });
  }

  /**
   * Sends a message to a specific conversation through WebSocket
   * @param messageData - Message data to send
   * @returns Promise resolving to true if message was sent successfully
   */
  async sendMessage(messageData: any): Promise<boolean> {
    // Prepare message payload with event type MESSAGE_RECEIVED
    const payload = {
      ...messageData,
      timestamp: Date.now()
    };
    
    // Emit message event with the payload
    return await this.emit(MessageSocketEvent.MESSAGE_RECEIVED, payload, true);
  }

  /**
   * Marks messages as read and notifies other participants
   * @param conversationId - ID of the conversation
   * @param messageIds - IDs of messages to mark as read
   * @returns Promise resolving to true if read status was updated successfully
   */
  async markAsRead(conversationId: string, messageIds: string[]): Promise<boolean> {
    if (!conversationId || !messageIds.length) {
      return false;
    }
    
    const payload = {
      conversationId,
      messageIds,
      timestamp: Date.now()
    };
    
    // Emit read_receipt event with the payload
    return await this.emit(MessageSocketEvent.MESSAGE_READ, payload, true);
  }

  /**
   * Sends typing indicator status to a conversation
   * @param conversationId - ID of the conversation
   * @param isTyping - Whether the user is typing or stopped typing
   * @returns Promise resolving to true if typing indicator was sent successfully
   */
  async sendTypingIndicator(conversationId: string, isTyping: boolean): Promise<boolean> {
    if (!conversationId) {
      return false;
    }
    
    const event = isTyping 
      ? MessageSocketEvent.TYPING_START 
      : MessageSocketEvent.TYPING_END;
    
    const payload = {
      conversationId,
      timestamp: Date.now()
    };
    
    // Throttle typing events to prevent excessive updates
    if (isTyping) {
      if (this._typingThrottleTimeout) {
        return true; // Skip sending if throttled
      }
      
      this._typingThrottleTimeout = setTimeout(() => {
        this._typingThrottleTimeout = null;
      }, 2000);
    }
    
    // Emit typing indicator event with the payload
    return await this.emit(event, payload, false);
  }

  /**
   * Registers a callback for incoming messages
   * @param callback - Function to call when a message is received
   * @returns Unsubscribe function to remove the listener
   */
  onMessageReceived(callback: (message: any) => void): () => void {
    this.eventEmitter.on(MessageSocketEvent.MESSAGE_RECEIVED, callback);
    return () => {
      this.eventEmitter.off(MessageSocketEvent.MESSAGE_RECEIVED, callback);
    };
  }

  /**
   * Registers a callback for message status updates (delivered/read)
   * @param callback - Function to call when a message status changes
   * @returns Unsubscribe function to remove the listener
   */
  onMessageStatusChange(callback: (data: any) => void): () => void {
    // Listen for both delivered and read events
    this.eventEmitter.on(MessageSocketEvent.MESSAGE_DELIVERED, callback);
    this.eventEmitter.on(MessageSocketEvent.MESSAGE_READ, callback);
    
    // Return function to unsubscribe from both events
    return () => {
      this.eventEmitter.off(MessageSocketEvent.MESSAGE_DELIVERED, callback);
      this.eventEmitter.off(MessageSocketEvent.MESSAGE_READ, callback);
    };
  }

  /**
   * Registers a callback for typing indicator events
   * @param callback - Function to call when typing indicator changes
   * @returns Unsubscribe function to remove the listener
   */
  onTypingIndicator(callback: (data: TypingIndicator) => void): () => void {
    // Listen for both typing start and end events
    this.eventEmitter.on(MessageSocketEvent.TYPING_START, callback);
    this.eventEmitter.on(MessageSocketEvent.TYPING_END, callback);
    
    // Return function to unsubscribe from both events
    return () => {
      this.eventEmitter.off(MessageSocketEvent.TYPING_START, callback);
      this.eventEmitter.off(MessageSocketEvent.TYPING_END, callback);
    };
  }

  /**
   * Registers a callback for connection state changes
   * @param callback - Function to call when connection state changes
   * @returns Unsubscribe function to remove the listener
   */
  onConnectionStateChange(callback: (state: ConnectionState) => void): () => void {
    this.eventEmitter.on('connectionStateChange', callback);
    return () => {
      this.eventEmitter.off('connectionStateChange', callback);
    };
  }

  /**
   * Gets the current WebSocket connection state
   * @returns Current connection state enum value
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Checks if the WebSocket is currently connected
   * @returns True if connected, false otherwise
   */
  isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED;
  }
  
  /**
   * Sets up handlers for incoming WebSocket messages
   */
  private setupMessageHandlers(): void {
    if (!this.socket) return;
    
    // Handle incoming messages
    this.socket.on(MessageSocketEvent.MESSAGE_RECEIVED, (payload: MessagePayload) => {
      this.eventEmitter.emit(MessageSocketEvent.MESSAGE_RECEIVED, payload);
    });
    
    // Handle message delivery status updates
    this.socket.on(MessageSocketEvent.MESSAGE_DELIVERED, (payload: MessagePayload) => {
      this.eventEmitter.emit(MessageSocketEvent.MESSAGE_DELIVERED, payload);
    });
    
    // Handle message read status updates
    this.socket.on(MessageSocketEvent.MESSAGE_READ, (payload: MessagePayload) => {
      this.eventEmitter.emit(MessageSocketEvent.MESSAGE_READ, payload);
    });
    
    // Handle typing indicator events
    this.socket.on(MessageSocketEvent.TYPING_START, (payload: MessagePayload) => {
      this.eventEmitter.emit(MessageSocketEvent.TYPING_START, payload);
    });
    
    this.socket.on(MessageSocketEvent.TYPING_END, (payload: MessagePayload) => {
      this.eventEmitter.emit(MessageSocketEvent.TYPING_END, payload);
    });
  }

  /**
   * Starts the heartbeat mechanism to keep the connection alive
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      if (this.connectionState === ConnectionState.CONNECTED && this.socket) {
        this.socket.emit('heartbeat', { timestamp: Date.now() });
      }
    }, HEARTBEAT_INTERVAL);
  }

  /**
   * Processes any queued messages after reconnection
   */
  private async processMessageQueue(): Promise<void> {
    if (this.messageQueue.length === 0 || !this.socket || this.connectionState !== ConnectionState.CONNECTED) {
      return;
    }
    
    console.log(`Processing ${this.messageQueue.length} queued messages`);
    
    // Process queued messages in order
    const queue = [...this.messageQueue];
    this.messageQueue = [];
    
    for (const message of queue) {
      try {
        await this.emit(message.event, message.data, false);
      } catch (error) {
        console.error('Error processing queued message:', error);
      }
    }
  }

  /**
   * Attempts reconnection with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= RECONNECT_ATTEMPTS) {
      console.log('Maximum reconnection attempts reached');
      return;
    }
    
    const delay = RECONNECT_DELAY * Math.pow(1.5, this.reconnectAttempts);
    this.reconnectAttempts++;
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${RECONNECT_ATTEMPTS})`);
    
    setTimeout(async () => {
      const connected = await this.reconnect();
      
      if (!connected && this.reconnectAttempts < RECONNECT_ATTEMPTS) {
        this.attemptReconnect();
      }
    }, delay);
  }

  /**
   * Rejoins all active conversation rooms after reconnection
   */
  private async rejoinActiveRooms(): Promise<void> {
    if (this.activeRooms.size === 0 || !this.socket || this.connectionState !== ConnectionState.CONNECTED) {
      return;
    }
    
    try {
      // Rejoin each active room
      for (const roomId of this.activeRooms) {
        await this.joinConversation(roomId);
      }
      
      console.log(`Rejoined ${this.activeRooms.size} active conversation rooms`);
    } catch (error) {
      console.error('Error rejoining active rooms:', error);
    }
  }
}

// Create a singleton instance
const messageSocketService = new WebSocketService();

// Export the service instance and connection state enum
export { messageSocketService, ConnectionState };