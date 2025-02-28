import React, { useState, useEffect, useRef, useCallback } from 'react';
import clsx from 'clsx'; // clsx v1.2.1
import { FiSend } from 'react-icons/fi'; // react-icons/fi v4.11.0
import debounce from 'lodash/debounce'; // lodash v4.17.21

import { Input, InputType } from '../common/Input';
import { Button, ButtonVariant, ButtonSize } from '../common/Button';
import { Spinner, SpinnerSize } from '../common/Spinner';
import { useMessages } from '../../hooks/useMessages';
import { MessageType } from '../../types/message';

// Debounce time for typing indicators in milliseconds
const TYPING_INDICATOR_DEBOUNCE_MS = 500;

/**
 * Interface defining the props for the MessageInput component
 */
export interface MessageInputProps {
  /**
   * The ID of the conversation the messages will be sent to
   */
  conversationId: string;
  
  /**
   * Whether the input is disabled
   */
  isDisabled?: boolean;
  
  /**
   * Placeholder text for the message input
   */
  placeholder?: string;
  
  /**
   * Additional CSS class names to apply to the component
   */
  className?: string;
  
  /**
   * Callback function that is called when a message is successfully sent
   */
  onMessageSent?: () => void;
  
  /**
   * Optional test ID for testing purposes
   */
  testId?: string;
}

/**
 * A component for composing and sending messages in chat conversations
 * Supports real-time typing indicators, message validation, and keyboard shortcuts
 */
const MessageInput: React.FC<MessageInputProps> = ({
  conversationId,
  isDisabled = false,
  placeholder = 'Type a message...',
  className = '',
  onMessageSent,
  testId = 'message-input',
}) => {
  // State for the message text content
  const [message, setMessage] = useState<string>('');
  // State for tracking when a message is being sent
  const [isSending, setIsSending] = useState<boolean>(false);
  
  // Get message-related functions from the useMessages hook
  const { 
    sendMessage, 
    sendTypingIndicator, 
    currentConversation 
  } = useMessages();
  
  // Reference to input element for focus management
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Create debounced version of typing indicator function
  const debouncedTypingIndicator = useCallback(
    debounce((isTyping: boolean) => {
      if (currentConversation?.id === conversationId) {
        sendTypingIndicator(isTyping);
      }
    }, TYPING_INDICATOR_DEBOUNCE_MS),
    [conversationId, currentConversation, sendTypingIndicator]
  );
  
  // Handle input changes and trigger typing indicators
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newMessage = event.target.value;
    setMessage(newMessage);
    
    // Send typing indicator if there's content
    if (currentConversation?.id === conversationId) {
      debouncedTypingIndicator(newMessage.length > 0);
    }
  };
  
  // Handle message sending with validation
  const handleSendMessage = async () => {
    const trimmedMessage = message.trim();
    
    // Validate message is not empty
    if (!trimmedMessage || isDisabled || isSending) {
      return;
    }
    
    // Verify we're in the right conversation
    if (currentConversation?.id !== conversationId) {
      console.error('Cannot send message: conversation mismatch');
      return;
    }
    
    try {
      setIsSending(true);
      
      // Send the message
      await sendMessage(trimmedMessage);
      
      // Clear input after successful send
      setMessage('');
      
      // Stop typing indicator
      debouncedTypingIndicator(false);
      
      // Call onMessageSent callback if provided
      if (onMessageSent) {
        onMessageSent();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };
  
  // Handle key press events (Enter to send)
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };
  
  // Clean up debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedTypingIndicator.cancel();
      
      // Explicitly indicate user stopped typing when component unmounts
      if (currentConversation?.id === conversationId) {
        sendTypingIndicator(false);
      }
    };
  }, [debouncedTypingIndicator, conversationId, currentConversation, sendTypingIndicator]);
  
  // Check if we're in the right conversation
  const isConversationMismatch = currentConversation?.id !== conversationId;
  const isComponentDisabled = isDisabled || isConversationMismatch;
  
  return (
    <form 
      className={clsx(
        'flex items-center gap-2 p-3 rounded-lg bg-white border border-gray-300',
        isComponentDisabled && 'opacity-60 cursor-not-allowed',
        className
      )}
      onSubmit={(e) => {
        e.preventDefault();
        handleSendMessage();
      }}
      data-testid={testId}
      aria-disabled={isComponentDisabled}
    >
      <Input
        type={InputType.TEXT}
        value={message}
        placeholder={isConversationMismatch ? 'Select this conversation to send messages' : placeholder}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        disabled={isComponentDisabled || isSending}
        className="flex-grow"
        testId={`${testId}-field`}
      />
      <Button
        type="submit"
        variant={ButtonVariant.PRIMARY}
        size={ButtonSize.MEDIUM}
        isLoading={isSending}
        disabled={isComponentDisabled || isSending || !message.trim()}
        ariaLabel="Send message"
        testId={`${testId}-button`}
      >
        <FiSend className="h-5 w-5" />
      </Button>
    </form>
  );
};

export default MessageInput;