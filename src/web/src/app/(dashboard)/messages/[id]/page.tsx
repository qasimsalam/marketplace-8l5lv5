'use client';

import React, { useState, useEffect } from 'react';
import { notFound, useParams } from 'next/navigation';
import ChatWindow from '../../../components/messages/ChatWindow';
import { useMessages } from '../../../hooks/useMessages';
import { useAuth } from '../../../hooks/useAuth';
import { Card, CardVariant } from '../../../components/common/Card';
import { Spinner, SpinnerSize } from '../../../components/common/Spinner';

const ChatPage = () => {
  // Get conversation ID from URL
  const params = useParams<{ id: string }>();
  const conversationId = params.id;

  // Get authentication context
  const { user } = useAuth();

  // Get messages functionality
  const { 
    loadMessages, 
    loadConversations, 
    setCurrentConversation, 
    currentConversation,
    conversations,
    isLoading,
    error,
  } = useMessages();

  // Load conversation data when component mounts
  useEffect(() => {
    let isMounted = true;

    const loadConversationData = async () => {
      if (conversationId && user) {
        try {
          await loadConversations();
          if (isMounted) {
            await loadMessages(conversationId);
          }
        } catch (err) {
          console.error('Error loading conversation data:', err);
        }
      }
    };

    loadConversationData();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      setCurrentConversation(null);
    };
  }, [conversationId, user, loadMessages, loadConversations, setCurrentConversation]);

  // Set current conversation when data is loaded
  useEffect(() => {
    if (currentConversation?.id !== conversationId && !isLoading) {
      // If we have conversation data but it's not set as current
      const matchingConversation = conversations.find(c => c.id === conversationId);
      if (matchingConversation) {
        setCurrentConversation(matchingConversation);
      }
    }
  }, [currentConversation, conversationId, conversations, isLoading, setCurrentConversation]);

  // Function to get participant info from the conversation
  const getParticipantInfo = () => {
    if (!currentConversation || !user) {
      return { id: '', name: '', avatar: '' };
    }
    
    // Find the other participant in the conversation (not the current user)
    const otherParticipant = currentConversation.participants.find(p => p.id !== user.id);
    
    if (!otherParticipant) {
      return { id: '', name: 'Unknown User', avatar: '' };
    }
    
    return {
      id: otherParticipant.id,
      name: `${otherParticipant.firstName} ${otherParticipant.lastName}`,
      avatar: otherParticipant.avatarUrl
    };
  };

  // Handle navigation back to conversations list
  const handleNavigateBack = () => {
    window.history.back();
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Spinner size={SpinnerSize.LARGE} />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Card variant={CardVariant.DANGER} className="max-w-md">
          <h2 className="text-xl font-bold mb-2">Error Loading Conversation</h2>
          <p className="text-gray-700">{error}</p>
          <button 
            onClick={handleNavigateBack}
            className="mt-4 bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
          >
            Go Back
          </button>
        </Card>
      </div>
    );
  }

  // Show not found if conversation doesn't exist
  if (!currentConversation && !isLoading) {
    return notFound();
  }

  const participant = getParticipantInfo();

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Mobile back button for smaller screens */}
      <div className="md:hidden p-2 bg-white border-b">
        <button 
          onClick={handleNavigateBack}
          className="flex items-center text-gray-600 hover:text-gray-900"
          aria-label="Go back to messages"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>
      
      {/* Chat window container */}
      <div className="flex-1 overflow-hidden">
        <ChatWindow
          conversationId={conversationId}
          title={currentConversation?.title || 'Conversation'}
          participant={participant}
          onClose={handleNavigateBack}
          className="h-full"
        />
      </div>
    </div>
  );
};

export default ChatPage;

export async function generateMetadata({ params }: { params: { id: string } }) {
  return {
    title: `Conversation - AI Talent Marketplace`,
    description: 'Real-time chat conversation in the AI Talent Marketplace',
    openGraph: {
      title: 'Conversation - AI Talent Marketplace',
      description: 'Real-time messaging in the AI Talent Marketplace',
      type: 'website',
    },
  };
}