import React, { useState, useEffect, useRef } from 'react'; // ^18.2.0
import clsx from 'clsx'; // ^1.2.1
import { FiDownload, FiCode, FiFileText } from 'react-icons/fi'; // ^4.11.0
import SyntaxHighlighter from 'react-syntax-highlighter'; // ^15.5.0
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'; // ^15.5.0

import { Avatar, AvatarSize } from '../common/Avatar';
import { Spinner, SpinnerSize } from '../common/Spinner';
import { Message, MessageType } from '../../types/message';
import { useAuth } from '../../hooks/useAuth';
import { formatDateForDisplay } from '../../utils/date';

// Threshold in pixels to determine when to auto-scroll to the bottom
const AUTO_SCROLL_THRESHOLD = 100;

// Threshold in milliseconds to determine if messages should be grouped (5 minutes)
const MESSAGE_GROUP_TIME_GAP = 300000;

/**
 * Interface defining props for the MessageList component
 */
export interface MessageListProps {
  /**
   * Array of message objects to display
   */
  messages: Message[];
  /**
   * Whether messages are currently being loaded
   */
  isLoading: boolean;
  /**
   * Whether to show the empty state when no messages are available
   */
  showEmptyState: boolean;
  /**
   * Additional class names to apply
   */
  className?: string;
  /**
   * Test ID for testing purposes
   */
  testId?: string;
}

/**
 * Helper function to determine if messages should be visually grouped based on sender and time
 * 
 * @param currentMessage - Current message being rendered
 * @param previousMessage - Previous message for comparison
 * @returns Whether messages should be visually grouped
 */
const shouldGroupMessages = (currentMessage: Message, previousMessage: Message | null): boolean => {
  if (!previousMessage) return false;
  
  // Messages should be grouped if they're from the same sender
  const sameSender = currentMessage.senderId === previousMessage.senderId;
  
  // Calculate time difference between messages (in milliseconds)
  const timeDiff = new Date(currentMessage.createdAt).getTime() - 
                   new Date(previousMessage.createdAt).getTime();
  
  // Group if same sender and within time threshold
  return sameSender && timeDiff < MESSAGE_GROUP_TIME_GAP;
};

/**
 * Component that displays a scrollable list of messages with user avatars and timestamps
 */
const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading,
  showEmptyState,
  className = '',
  testId = 'message-list'
}) => {
  // Initialize scroll container ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Get the current authenticated user to determine message ownership
  const { user } = useAuth();
  
  // Helper function to format message timestamps
  const formatMessageTime = (date: Date) => {
    return formatDateForDisplay(date);
  };
  
  // Helper function to determine when to show avatars in message groups
  const shouldShowAvatar = (index: number) => {
    if (index === 0) return true;
    return !shouldGroupMessages(messages[index], messages[index - 1]);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length && scrollContainerRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = scrollContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < AUTO_SCROLL_THRESHOLD;
      
      // Only auto-scroll if user is already near the bottom (to avoid interrupting reading)
      if (isNearBottom) {
        scrollContainerRef.current.scrollTop = scrollHeight;
      }
    }
  }, [messages]);

  // Render the empty state when no messages and showEmptyState is true
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-6" data-testid={`${testId}-empty`}>
      <FiFileText className="w-12 h-12 text-gray-300 mb-4" />
      <h3 className="text-lg font-medium text-gray-900">No messages yet</h3>
      <p className="text-sm text-gray-500 mt-1">Start the conversation by sending a message.</p>
    </div>
  );

  // Render loading spinner when loading
  const renderLoadingState = () => (
    <div className="flex justify-center items-center h-full p-6" data-testid={`${testId}-loading`}>
      <Spinner size={SpinnerSize.MEDIUM} />
    </div>
  );

  // Render message content based on message type
  const renderMessageContent = (message: Message) => {
    switch (message.type) {
      case MessageType.TEXT:
        return <p className="whitespace-pre-wrap break-words">{message.content}</p>;
      
      case MessageType.FILE:
        return renderFileMessage(message);
      
      case MessageType.CODE:
        return renderCodeMessage(message);
      
      case MessageType.SYSTEM:
        return renderSystemMessage(message);
      
      default:
        return <p>{message.content}</p>;
    }
  };

  // Render system notification
  const renderSystemMessage = (message: Message) => (
    <div className="bg-gray-100 rounded-md p-2 text-gray-600 text-sm italic text-center">
      {message.content}
    </div>
  );

  // Render file attachment message
  const renderFileMessage = (message: Message) => {
    if (!message.attachment) return <p>File unavailable</p>;
    
    const { name, url, size, type } = message.attachment;
    
    return (
      <div className="flex flex-col p-2 bg-gray-50 rounded-md">
        <div className="flex items-center mb-2">
          <FiFileText className="mr-2 text-gray-500" />
          <span className="text-sm font-medium truncate flex-1">{name}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">
            {type.split('/')[1]?.toUpperCase() || 'FILE'} • {formatFileSize(size)}
          </span>
          
          <a 
            href={url}
            download={name}
            className="text-primary-600 hover:text-primary-800 p-1 rounded flex items-center text-sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FiDownload className="mr-1" />
            <span>Download</span>
          </a>
        </div>
      </div>
    );
  };

  // Render code snippet with syntax highlighting
  const renderCodeMessage = (message: Message) => {
    if (!message.codeSnippet) return <p>Code unavailable</p>;
    
    const { language, code, title } = message.codeSnippet;
    
    return (
      <div className="flex flex-col rounded-md overflow-hidden">
        <div className="flex justify-between bg-gray-800 px-4 py-2 text-gray-200">
          <div className="flex items-center">
            <FiCode className="mr-2" />
            <span className="text-sm font-medium">{title || language || 'Code'}</span>
          </div>
          <span className="text-xs uppercase">{language}</span>
        </div>
        
        <SyntaxHighlighter 
          language={language || 'javascript'} 
          style={atomOneDark}
          customStyle={{ margin: 0, maxHeight: '300px', fontSize: '0.9rem' }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    );
  };

  // Helper function to format file sizes
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div
      ref={scrollContainerRef}
      className={clsx(
        'flex flex-col overflow-y-auto',
        'h-full w-full bg-white',
        className
      )}
      data-testid={testId}
      aria-live="polite"
      aria-busy={isLoading}
    >
      {isLoading && renderLoadingState()}
      
      {!isLoading && messages.length === 0 && showEmptyState && renderEmptyState()}
      
      {!isLoading && messages.length > 0 && (
        <div className="flex flex-col p-4 space-y-4">
          {messages.map((message, index) => {
            const isCurrentUser = user?.id === message.senderId;
            const showAvatar = shouldShowAvatar(index);
            const isGrouped = index > 0 && shouldGroupMessages(message, messages[index - 1]);
            
            return (
              <div
                key={message.id}
                className={clsx(
                  'flex',
                  isCurrentUser ? 'justify-end' : 'justify-start',
                  isGrouped ? 'mt-1' : 'mt-4'
                )}
                data-testid={`${testId}-message-${message.id}`}
              >
                {!isCurrentUser && (
                  <div className={clsx('mr-2', !showAvatar && 'invisible')}>
                    <Avatar
                      src={message.sender?.avatarUrl}
                      firstName={message.sender?.firstName}
                      lastName={message.sender?.lastName}
                      size={AvatarSize.SMALL}
                    />
                  </div>
                )}
                
                <div className={clsx('flex flex-col max-w-[75%]', isCurrentUser ? 'items-end' : 'items-start')}>
                  {showAvatar && (
                    <div className={clsx('text-xs text-gray-500 mb-1', isCurrentUser ? 'text-right' : 'text-left')}>
                      {!isCurrentUser && message.sender ? (
                        <span className="font-medium">
                          {`${message.sender.firstName} ${message.sender.lastName}`}
                        </span>
                      ) : null}
                      <span className="ml-2">{formatMessageTime(message.createdAt)}</span>
                    </div>
                  )}
                  
                  <div
                    className={clsx(
                      'rounded-lg px-4 py-2',
                      message.type === MessageType.SYSTEM ? 'w-full' : '',
                      message.type === MessageType.CODE ? 'w-full max-w-full' : '',
                      isCurrentUser ? 
                        'bg-primary-600 text-white rounded-tr-none' : 
                        'bg-gray-100 text-gray-800 rounded-tl-none'
                    )}
                  >
                    {renderMessageContent(message)}
                  </div>
                </div>
                
                {isCurrentUser && (
                  <div className={clsx('ml-2', !showAvatar && 'invisible')}>
                    <Avatar
                      src={user?.avatarUrl}
                      firstName={user?.firstName}
                      lastName={user?.lastName}
                      size={AvatarSize.SMALL}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MessageList;