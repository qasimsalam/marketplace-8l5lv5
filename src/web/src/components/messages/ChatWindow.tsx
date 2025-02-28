import React, { useState, useEffect, useRef, useCallback } from 'react'; // ^18.2.0
import clsx from 'clsx'; // ^1.2.1
import { FiWifi, FiWifiOff } from 'react-icons/fi'; // ^4.11.0

import { Card, CardVariant } from '../common/Card';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useMessages } from '../../hooks/useMessages';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Message, TypingIndicator } from '../../types/message';

// Delay in milliseconds before automatically marking messages as read
const AUTO_MARK_READ_DELAY = 2000;

/**
 * Props for the ChatWindow component
 */
export interface ChatWindowProps {
  /**
   * ID of the conversation to display
   */
  conversationId: string;
  
  /**
   * Title of the conversation
   */
  title: string;
  
  /**
   * Information about the participant in the conversation
   */
  participant: {
    id: string;
    name: string;
    avatar?: string;
  };
  
  /**
   * Function to call when the chat window is closed
   */
  onClose: () => void;
  
  /**
   * Additional CSS class names to apply to the component
   */
  className?: string;
}

/**
 * A comprehensive chat interface component that displays conversation history and provides message input functionality
 */
const ChatWindow: React.FC<ChatWindowProps> = ({
  conversationId,
  title,
  participant,
  onClose,
  className = '',
}) => {
  // Get messaging functionality from the useMessages hook
  const { 
    joinConversation, 
    leaveConversation, 
    loadMessages, 
    messages, 
    isLoading, 
    sendMessage, 
    typingUsers, 
    markAsRead, 
    error 
  } = useMessages();
  
  // Get WebSocket connection status
  const { isConnected } = useWebSocket();
  
  // Setup ref to track auto-mark-as-read timeout
  const markAsReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Ref to message list container for auto scrolling
  const messageListRef = useRef<HTMLDivElement | null>(null);
  
  // Handle sending new messages
  const handleSendMessage = useCallback((message: string) => {
    if (message.trim() && conversationId) {
      sendMessage(message);
    }
  }, [conversationId, sendMessage]);
  
  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
    }
  }, [conversationId, loadMessages]);
  
  // Join conversation WebSocket room on mount and leave on unmount
  useEffect(() => {
    if (conversationId) {
      joinConversation(conversationId);
    }
    
    return () => {
      if (conversationId) {
        leaveConversation(conversationId);
      }
    };
  }, [conversationId, joinConversation, leaveConversation]);
  
  // Auto-mark messages as read after a delay
  useEffect(() => {
    // Clear any existing timeout
    if (markAsReadTimeoutRef.current) {
      clearTimeout(markAsReadTimeoutRef.current);
      markAsReadTimeoutRef.current = null;
    }
    
    if (conversationId && messages.length > 0) {
      markAsReadTimeoutRef.current = setTimeout(() => {
        markAsRead();
        markAsReadTimeoutRef.current = null;
      }, AUTO_MARK_READ_DELAY);
    }
    
    return () => {
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
        markAsReadTimeoutRef.current = null;
      }
    };
  }, [conversationId, messages, markAsRead]);
  
  // Auto scroll to bottom when new messages are received
  useEffect(() => {
    if (messageListRef.current && messages.length > 0) {
      const { scrollHeight, clientHeight } = messageListRef.current;
      messageListRef.current.scrollTop = scrollHeight - clientHeight;
    }
  }, [messages]);
  
  // Render typing indicators when participants are typing
  const renderTypingIndicator = () => {
    if (!typingUsers || typingUsers.length === 0) {
      return null;
    }
    
    // Check if the participant in this conversation is typing
    const isParticipantTyping = typingUsers.some(
      user => user.conversationId === conversationId && user.userId === participant.id && user.isTyping
    );
    
    if (!isParticipantTyping) {
      return null;
    }
    
    return (
      <div 
        className="px-4 py-2 text-sm text-gray-500 italic"
        aria-live="polite"
      >
        {participant.name} is typing...
      </div>
    );
  };
  
  // Render connection status indicator
  const renderConnectionStatus = () => {
    return (
      <div className="flex items-center" aria-live="polite">
        {isConnected ? (
          <>
            <FiWifi className="text-green-500 h-4 w-4" aria-hidden="true" />
            <span className="ml-2 text-xs text-gray-500">Connected</span>
          </>
        ) : (
          <>
            <FiWifiOff className="text-red-500 h-4 w-4" aria-hidden="true" />
            <span className="ml-2 text-xs text-gray-500">Disconnected</span>
          </>
        )}
      </div>
    );
  };
  
  // Render chat header with title and connection status
  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center w-full">
        <div className="font-medium truncate">
          {title}
          {error && (
            <span 
              className="ml-2 text-red-500 text-xs"
              aria-live="assertive"
            >
              Error: {error}
            </span>
          )}
        </div>
        {renderConnectionStatus()}
      </div>
    );
  };
  
  // Render empty state when no messages exist yet
  const renderEmptyState = () => {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500">
        <p className="mb-2">No messages yet</p>
        <p className="text-sm">Start the conversation by sending a message.</p>
      </div>
    );
  };
  
  return (
    <Card
      variant={CardVariant.DEFAULT}
      className={clsx(
        'flex flex-col h-full',
        className
      )}
      header={renderHeader()}
    >
      <div className="flex-1 overflow-hidden flex flex-col">
        <div 
          ref={messageListRef}
          className="flex-1 overflow-hidden"
        >
          <MessageList
            messages={messages}
            isLoading={isLoading}
            showEmptyState={!isLoading && messages.length === 0}
            className="h-full"
          />
        </div>
        
        {renderTypingIndicator()}
        
        <div className="mt-4">
          <MessageInput
            conversationId={conversationId}
            isDisabled={!isConnected}
            placeholder="Type a message..."
            onMessageSent={() => {
              // After sending a message, ensure we scroll to bottom
              if (messageListRef.current) {
                const { scrollHeight, clientHeight } = messageListRef.current;
                messageListRef.current.scrollTop = scrollHeight - clientHeight;
              }
            }}
          />
        </div>
      </div>
    </Card>
  );
};

export default ChatWindow;