import React, { useState, useEffect } from 'react'; // ^18.2.0
import { FiMessageSquare, FiPlus } from 'react-icons/fi'; // ^4.11.0
import clsx from 'clsx'; // ^1.2.1

import { Card } from '../../../components/common/Card';
import Button from '../../../components/common/Button';
import { Spinner, SpinnerSize } from '../../../components/common/Spinner';
import MessageList from '../../../components/messages/MessageList';
import MessageInput from '../../../components/messages/MessageInput';
import ChatWindow from '../../../components/messages/ChatWindow';
import { useMessages } from '../../../hooks/useMessages';
import { useAuth } from '../../../hooks/useAuth';
import { Conversation } from '../../../types/message';

/**
 * Helper function to format conversation title and preview for display in the list
 * 
 * @param conversation - The conversation to format
 * @param currentUser - The current logged-in user
 * @returns Formatted title and preview text
 */
const formatConversationPreview = (
  conversation: Conversation,
  currentUser: User | null
): { title: string; preview: string } => {
  // Default values
  let title = conversation.title || '';
  let preview = '';

  // If no explicit title, create one from participants
  if (!title && conversation.participants.length > 0) {
    // Filter out current user and create title from other participants' names
    const otherParticipants = conversation.participants.filter(
      p => p.id !== currentUser?.id
    );
    
    if (otherParticipants.length > 0) {
      title = otherParticipants
        .map(p => `${p.firstName} ${p.lastName}`)
        .join(', ');
    } else {
      // Fallback if somehow there are no other participants
      title = 'New Conversation';
    }
  }

  // Create preview from last message if exists
  if (conversation.lastMessage) {
    const isOwnMessage = conversation.lastMessage.senderId === currentUser?.id;
    const prefix = isOwnMessage ? 'You: ' : '';
    const content = conversation.lastMessage.content || '';
    
    // Truncate message content if too long
    preview = content.length > 50
      ? `${prefix}${content.substring(0, 50)}...`
      : `${prefix}${content}`;
  }

  return { title, preview };
};

/**
 * Next.js page component for the messages dashboard that displays conversations and allows messaging
 * 
 * @returns Rendered messages page component
 */
const MessagesPage = () => {
  // State for showing/hiding new conversation modal
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  
  // Get authentication state
  const { user } = useAuth();
  
  // Get message functionality
  const {
    conversations,
    loadConversations,
    createConversation,
    setCurrentConversation,
    currentConversation,
    isLoading
  } = useMessages();

  // Load conversations when component mounts
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Handle conversation selection
  const handleSelectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation);
  };

  // Handle creating a new conversation
  const handleCreateConversation = async () => {
    // This would typically open a modal to select participants
    setShowNewConversationModal(true);
  };

  // Toggle new conversation modal
  const toggleNewConversationModal = () => {
    setShowNewConversationModal(!showNewConversationModal);
  };

  return (
    <div className="flex flex-col md:flex-row w-full h-full overflow-hidden">
      {/* Sidebar with conversation list */}
      <div className={clsx(
        "w-full md:w-1/3 lg:w-1/4 border-r border-gray-200 h-full overflow-hidden",
        currentConversation ? "hidden md:block" : "block"
      )}>
        <Card className="h-full flex flex-col">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h1 className="text-xl font-semibold">Messages</h1>
            <Button 
              onClick={handleCreateConversation}
              ariaLabel="Create new conversation"
              size="small"
            >
              <FiPlus className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <Spinner size={SpinnerSize.MEDIUM} />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <FiMessageSquare className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No conversations yet</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Start a new conversation by clicking the plus button above.
                </p>
                <Button 
                  className="mt-4"
                  onClick={handleCreateConversation}
                >
                  Create Conversation
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {conversations.map(conversation => {
                  const { title, preview } = formatConversationPreview(conversation, user);
                  const isActive = currentConversation?.id === conversation.id;
                  
                  return (
                    <li 
                      key={conversation.id}
                      className={clsx(
                        "cursor-pointer p-3 rounded-lg transition-colors",
                        isActive 
                          ? "bg-primary-50 border-primary-200" 
                          : "hover:bg-gray-50 border-transparent",
                        conversation.unreadCount > 0 && !isActive ? "font-semibold" : "font-normal"
                      )}
                      onClick={() => handleSelectConversation(conversation)}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {title}
                        </span>
                        <span className="text-xs text-gray-500">
                          {conversation.lastMessage && new Date(conversation.lastMessage.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 truncate mt-1">
                        {preview}
                      </div>
                      {conversation.unreadCount > 0 && !isActive && (
                        <div className="flex">
                          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-primary-500 rounded-full mt-1">
                            {conversation.unreadCount}
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* Main chat area */}
      <div className={clsx(
        "w-full md:w-2/3 lg:w-3/4 h-full overflow-hidden",
        currentConversation ? "block" : "hidden md:flex md:items-center md:justify-center"
      )}>
        {currentConversation ? (
          <ChatWindow
            conversationId={currentConversation.id}
            title={formatConversationPreview(currentConversation, user).title}
            participant={{
              id: currentConversation.participants.find(p => p.id !== user?.id)?.id || '',
              name: formatConversationPreview(currentConversation, user).title,
              avatar: currentConversation.participants.find(p => p.id !== user?.id)?.avatarUrl
            }}
            onClose={() => setCurrentConversation(null)}
            className="h-full"
          />
        ) : (
          <div className="hidden md:flex flex-col items-center justify-center p-6 text-center">
            <FiMessageSquare className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-900">Select a conversation</h3>
            <p className="text-sm text-gray-500 mt-2">
              Choose an existing conversation or create a new one to start messaging.
            </p>
          </div>
        )}
      </div>

      {/* New conversation modal - placeholder for now */}
      {showNewConversationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">New Conversation</h2>
            {/* New conversation form would go here */}
            <div className="mt-6 flex justify-end">
              <Button 
                variant="secondary" 
                className="mr-2"
                onClick={toggleNewConversationModal}
              >
                Cancel
              </Button>
              <Button 
                variant="primary"
                onClick={() => {
                  // Create conversation logic would go here
                  toggleNewConversationModal();
                }}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;