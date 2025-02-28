/**
 * Message-related type definitions for the iOS app of the AI Talent Marketplace
 * This file defines interfaces, enums, and types for real-time messaging,
 * conversations, message attachments, and WebSocket event handling.
 * 
 * @version 1.0.0
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
 * Enumeration for WebSocket connection states for iOS
 */
export enum ConnectionState {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  RECONNECTING = 'reconnecting'
}

/**
 * Interface for file attachments in messages with iOS-specific localUri field
 */
export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  localUri: string | null; // iOS-specific: local file URI for cached files
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
 * Interface for a message in a conversation with iOS-specific isLocal field
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
  isLocal: boolean; // iOS-specific: identifies messages that haven't been synced to server yet
}

/**
 * Interface for a messaging conversation with iOS-specific muted field
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
  muted: boolean; // iOS-specific: indicates if notifications are muted for this conversation
}

/**
 * Interface for the messages state in Redux store with iOS-specific networkConnected field
 */
export interface MessagesState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
  activeParticipants: string[];
  networkConnected: boolean; // iOS-specific: tracks network connectivity status
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
 * Interface for tracking file attachment upload status with iOS-specific localUri field
 */
export interface AttachmentUploadStatus {
  id: string;
  progress: number;
  status: string;
  error: string | null;
  attachment: FileAttachment | null;
  localUri: string | null; // iOS-specific: local URI for the file being uploaded
}

/**
 * iOS-specific interface for push notification payload structure
 */
export interface iOSNotificationPayload {
  title: string;
  body: string;
  conversationId: string;
  messageId: string;
  senderId: string;
  category: string;
}