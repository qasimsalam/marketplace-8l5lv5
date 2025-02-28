/**
 * Message-related type definitions for the AI Talent Marketplace Android application
 * 
 * This file defines interfaces, enumerations, and types for real-time messaging,
 * conversations, and WebSocket event handling specific to the Android platform.
 */

import { User, UserRole } from '../../../backend/shared/src/types/user.types';

/**
 * Enumeration of message types supported in the chat system
 */
export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  CODE = 'code',
  SYSTEM = 'system'
}

/**
 * Enumeration of message delivery statuses
 */
export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

/**
 * Enumeration of WebSocket event types for messaging
 */
export enum MessageSocketEvent {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  MESSAGE_RECEIVED = 'message_received',
  MESSAGE_DELIVERED = 'message_delivered',
  MESSAGE_READ = 'message_read',
  TYPING_START = 'typing_start',
  TYPING_END = 'typing_end',
  NETWORK_CHANGE = 'network_change'
}

/**
 * Enumeration for WebSocket connection states for Android
 */
export enum ConnectionState {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  RECONNECTING = 'reconnecting'
}

/**
 * Interface for file attachments in messages with Android-specific localUri field
 */
export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  localUri: string | null; // Android-specific field for local file access
}

/**
 * Interface for code snippets shared in messages
 */
export interface CodeSnippet {
  language: string;
  code: string;
  title: string;
}

/**
 * Interface for a message in a conversation with Android-specific isLocal field for offline messaging
 */
export interface Message {
  id: string;
  conversationId: string;
  sender: User;
  senderId: string;
  type: MessageType;
  content: string;
  attachment: FileAttachment | null;
  codeSnippet: CodeSnippet | null;
  status: MessageStatus;
  createdAt: Date;
  updatedAt: Date;
  isLocal: boolean; // Android-specific flag for tracking offline-created messages
}

/**
 * Interface for a messaging conversation with Android-specific muted field for notification control
 */
export interface Conversation {
  id: string;
  title: string;
  participants: User[];
  lastMessage: Message | null;
  unreadCount: number;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
  muted: boolean; // Android-specific flag for notification control
}

/**
 * Interface for the messages state in Redux store with Android-specific networkConnected field
 */
export interface MessagesState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
  activeParticipants: string[]; // IDs of users currently online
  networkConnected: boolean; // Android-specific field for network state awareness
}

/**
 * DTO for creating a new message
 */
export interface CreateMessageDTO {
  conversationId: string;
  type: MessageType;
  content: string;
  attachmentId: string | null;
  codeSnippet: CodeSnippet | null;
}

/**
 * DTO for creating a new conversation
 */
export interface CreateConversationDTO {
  title: string;
  participantIds: string[];
  projectId: string | null;
  initialMessage: string | null;
}

/**
 * Interface for typing indicator data
 */
export interface TypingIndicator {
  userId: string;
  conversationId: string;
  isTyping: boolean;
  timestamp: number;
}

/**
 * Interface for WebSocket message payloads
 */
export interface MessagePayload {
  event: MessageSocketEvent;
  data: any;
  conversationId: string;
  timestamp: number;
}

/**
 * Interface for tracking file attachment upload status with Android-specific localUri field
 */
export interface AttachmentUploadStatus {
  id: string;
  progress: number; // 0-100 percentage
  status: string; // 'pending', 'uploading', 'completed', 'failed'
  error: string | null;
  attachment: FileAttachment | null;
  localUri: string | null; // Android-specific field for local file reference
}

/**
 * Android-specific interface for push notification payload structure
 */
export interface AndroidNotificationPayload {
  title: string;
  body: string;
  conversationId: string;
  messageId: string;
  senderId: string;
  channelId: string; // Android notification channel ID
  priority: string; // Android notification priority
}

/**
 * Android-specific interface for tracking unsent messages during offline periods
 */
export interface PendingMessage {
  id: string;
  message: Message;
  attempts: number;
  lastAttempt: Date;
}