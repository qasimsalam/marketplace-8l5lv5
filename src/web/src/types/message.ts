/**
 * Message-related type definitions for the AI Talent Marketplace
 * This file defines interfaces, enumerations, and types for real-time messaging,
 * conversations, and message statuses used throughout the messaging system.
 */

import { User } from '../../../backend/shared/src/types/user.types';

/**
 * Enumeration of supported message types in the chat system
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
  TYPING_END = 'typing_end'
}

/**
 * Interface for file attachments in messages
 */
export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
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
 * Interface representing a message in a conversation
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
}

/**
 * Interface representing a messaging conversation
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
}

/**
 * Data Transfer Object for creating a new message
 */
export interface CreateMessageDTO {
  conversationId: string;
  type: MessageType;
  content: string;
  attachmentId: string | null;
  codeSnippet: CodeSnippet | null;
}

/**
 * Data Transfer Object for creating a new conversation
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
 * Interface for tracking file attachment upload status
 */
export interface AttachmentUploadStatus {
  id: string;
  progress: number;
  status: string;
  error: string | null;
  attachment: FileAttachment | null;
}

/**
 * Interface defining the messages state for Redux store
 */
export interface MessagesState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
  activeParticipants: string[];
}