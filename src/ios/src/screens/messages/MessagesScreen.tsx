import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  RefreshControl, 
  ActivityIndicator, 
  Image, 
  Platform, 
  Alert 
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FastImage from 'react-native-fast-image';

// Internal imports
import SafeAreaView, { EdgeMode } from '../../components/common/SafeAreaView';
import Button, { ButtonVariant, ButtonSize } from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import MessageList from '../../components/messages/MessageList';
import useMessages from '../../hooks/useMessages';
import useAuth from '../../hooks/useAuth';
import { Conversation } from '../../types/message.types';
import { colors } from '../../styles/colors';
import { formatRelativeDateForMobile } from '../../utils/date';

// Constants
const CONVERSATION_REFRESH_INTERVAL = 30000;

/**
 * Main component for the messages screen that displays user conversations
 */
const MessagesScreen = () => {
  const navigation = useNavigation();
  const { 
    conversations, 
    loading, 
    error, 
    loadConversations 
  } = useMessages();
  const { user } = useAuth();
  
  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Ref for periodic refresh
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load conversations when the screen mounts
  useEffect(() => {
    loadConversations();
    
    // Set up refresh timer
    refreshTimerRef.current = setInterval(() => {
      loadConversations();
    }, CONVERSATION_REFRESH_INTERVAL);
    
    // Clean up on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [loadConversations]);
  
  // Reload conversations when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadConversations();
      
      return () => {
        // Optional cleanup if needed
      };
    }, [loadConversations])
  );
  
  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadConversations();
    } catch (error) {
      console.error('Error refreshing conversations:', error);
      Alert.alert(
        'Error',
        'Failed to refresh conversations. Please try again.'
      );
    } finally {
      setRefreshing(false);
    }
  }, [loadConversations]);
  
  // Handle conversation press
  const handleConversationPress = useCallback((conversation: Conversation) => {
    navigation.navigate('ChatScreen', { 
      conversationId: conversation.id,
      title: conversation.title || getConversationTitle(conversation)
    });
  }, [navigation]);
  
  // Handle new conversation button press
  const handleNewConversation = useCallback(() => {
    navigation.navigate('NewConversation');
  }, [navigation]);
  
  // Helper function to get conversation title
  const getConversationTitle = (conversation: Conversation): string => {
    if (conversation.title) {
      return conversation.title;
    }
    
    // If no title, use participants' names
    const otherParticipants = conversation.participants.filter(
      participant => participant.id !== user?.id
    );
    
    if (otherParticipants.length === 0) {
      return 'Conversation';
    }
    
    if (otherParticipants.length === 1) {
      const participant = otherParticipants[0];
      return `${participant.firstName} ${participant.lastName}`;
    }
    
    return `${otherParticipants[0].firstName} and ${otherParticipants.length - 1} others`;
  };

  /**
   * Renders an individual conversation item in the list
   */
  const renderConversationItem = ({ item, index }) => {
    // Get the last message timestamp
    const lastMessageTime = item.lastMessage 
      ? formatRelativeDateForMobile(item.lastMessage.createdAt)
      : '';
    
    // Get conversation title
    const title = item.title || getConversationTitle(item);
    
    // Get avatar
    const otherParticipant = item.participants.find(p => p.id !== user?.id);
    const avatarSource = otherParticipant?.avatarUrl 
      ? { uri: otherParticipant.avatarUrl }
      : require('../../assets/images/default-avatar.png');
    
    // Check if there are unread messages
    const hasUnread = item.unreadCount > 0;
    
    return (
      <TouchableOpacity
        style={[
          styles.conversationItem,
          index === conversations.length - 1 && { borderBottomWidth: 0 }
        ]}
        onPress={() => handleConversationPress(item)}
        activeOpacity={0.7}
        testID={`conversation-item-${item.id}`}
      >
        {/* Avatar */}
        <FastImage
          source={avatarSource}
          style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: colors.background.tertiary
          }}
          resizeMode={FastImage.resizeMode.cover}
        />
        
        {/* Conversation details */}
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[
              styles.conversationTitle,
              hasUnread && { fontWeight: 'bold' }
            ]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.timestamp}>{lastMessageTime}</Text>
          </View>
          
          {/* Last message preview */}
          {item.lastMessage && (
            <Text 
              style={[
                styles.lastMessage,
                hasUnread && { fontWeight: '500', color: colors.text.primary }
              ]} 
              numberOfLines={1}
            >
              {item.lastMessage.content}
            </Text>
          )}
        </View>
        
        {/* Unread badge */}
        {hasUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  /**
   * Renders an empty state when no conversations exist
   */
  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <Spinner />
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Image
          source={require('../../assets/images/empty-messages.png')}
          style={{ width: 150, height: 150, marginBottom: 16 }}
          resizeMode="contain"
        />
        <Text style={styles.emptyText}>
          You don't have any conversations yet. Start connecting with AI professionals by creating a new conversation.
        </Text>
        <Button
          text="Start New Conversation"
          variant={ButtonVariant.PRIMARY}
          size={ButtonSize.MEDIUM}
          onPress={handleNewConversation}
          style={{ marginTop: 16 }}
        />
      </View>
    );
  };

  /**
   * Extracts key for FlatList items
   */
  const keyExtractor = (item: Conversation) => item.id;

  // Render the Messages screen
  return (
    <SafeAreaView 
      edges={EdgeMode.ALL} 
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="settings-outline" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.text.secondary} />
        <TouchableOpacity 
          style={{ flex: 1, paddingLeft: 8 }}
          onPress={() => navigation.navigate('SearchConversations')}
        >
          <Text style={{ color: colors.text.secondary }}>
            Search conversations...
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Error display */}
      {error && (
        <View style={{ padding: 16, backgroundColor: colors.error[50] }}>
          <Text style={{ color: colors.error[500] }}>
            {error}
          </Text>
        </View>
      )}
      
      {/* Conversations List */}
      {loading && conversations.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Spinner />
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={
            conversations.length === 0 ? { flex: 1 } : { paddingBottom: 80 }
          }
          style={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary.main]}
              tintColor={colors.primary.main}
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          testID="conversations-list"
        />
      )}
      
      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={handleNewConversation}
        activeOpacity={0.8}
        testID="new-conversation-button"
      >
        <Ionicons name="create-outline" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.main
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.divider
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.paper,
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 16,
    marginVertical: 8
  },
  list: {
    flex: 1
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.divider
  },
  conversationContent: {
    flex: 1,
    marginLeft: 12
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary
  },
  lastMessage: {
    fontSize: 14,
    color: colors.text.secondary,
    marginRight: 40
  },
  timestamp: {
    fontSize: 12,
    color: colors.text.tertiary
  },
  unreadBadge: {
    backgroundColor: colors.primary.main,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6
  },
  unreadText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
    color: colors.text.secondary
  },
  floatingButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: colors.primary.main,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84
  }
});

export default MessagesScreen;