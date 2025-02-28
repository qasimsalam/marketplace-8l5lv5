import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react'; // react v18.2.0
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native'; // react-native 0.72.x
import {
  useNavigation,
  useIsFocused,
} from '@react-navigation/native'; // @react-navigation/native ^6.1.6
import { StackNavigationProp } from '@react-navigation/stack'; // @react-navigation/stack ^6.3.16
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // react-native-vector-icons/MaterialIcons ^9.2.0
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // react-native-safe-area-context ^4.5.3

// Internal imports
import {
  Conversation,
  Message,
} from '../../types/message.types';
import { useMessages } from '../../hooks/useMessages';
import { SafeAreaView } from '../../components/common/SafeAreaView';
import { Button, ButtonVariant, ButtonSize } from '../../components/common/Button';
import { Input, InputType } from '../../components/common/Input';
import MessageList from '../../components/messages/MessageList';
import { Spinner, SpinnerSize } from '../../components/common/Spinner';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { layout } from '../../styles/layout';
import { useAuth } from '../../hooks/useAuth';

/**
 * Type definition for the navigation prop used in this screen
 */
type MessagesScreenNavigationProp = StackNavigationProp<any, 'Messages'>;

/**
 * The main component for displaying message conversations
 */
const MessagesScreen: React.FC = () => {
  // Get navigation object from useNavigation hook
  const navigation = useNavigation<MessagesScreenNavigationProp>();

  // Get isFocused value from useIsFocused hook
  const isFocused = useIsFocused();

  // Get safe area insets from useSafeAreaInsets hook
  const insets = useSafeAreaInsets();

  // Get authenticated user data from useAuth hook
  const { user } = useAuth();
  const currentUserId = user?.id || '';

  // Get message state and functions from useMessages hook
  const {
    conversations,
    isLoadingConversations,
    loadConversations,
    getUnreadCount,
    createNewConversation,
    error,
  } = useMessages();

  // Initialize search state and functionality
  const [searchTerm, setSearchTerm] = useState('');

  // Set up refreshing state for pull-to-refresh
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use useEffect to load conversations on mount and when screen is focused
  useEffect(() => {
    if (isFocused) {
      loadConversations();
    }
  }, [isFocused, loadConversations]);

  /**
   * Implement handleRefresh function for pull-to-refresh capability
   */
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadConversations();
    setIsRefreshing(false);
  }, [loadConversations]);

  /**
   * Implement handleSearch function to filter conversations
   * @param text The search term
   */
  const handleSearch = (text: string) => {
    setSearchTerm(text);
  };

  /**
   * Implement handleNavigateToChat to open individual chat screens
   * @param conversationId The ID of the conversation to navigate to
   */
  const handleNavigateToChat = (conversationId: string) => {
    navigation.navigate('Chat', { conversationId });
  };

  /**
   * Implement handleCreateNewConversation for starting new conversations
   */
  const handleCreateNewConversation = async () => {
    try {
      // For now, just navigate to a screen where you can select participants
      navigation.navigate('NewConversation');
    } catch (error) {
      console.error('Error creating new conversation:', error);
    }
  };

  /**
   * Filter conversations based on search term
   * @param conversations The array of conversations to filter
   * @param searchTerm The search term to filter by
   * @param currentUserId The ID of the current user
   * @returns The filtered array of conversations
   */
  const filterConversations = useCallback(
    (conversations: Conversation[], searchTerm: string, currentUserId: string): Conversation[] => {
      if (!searchTerm) {
        return conversations;
      }

      const lowerSearchTerm = searchTerm.toLowerCase();

      return conversations.filter(conversation => {
        // Check if the conversation title matches the search term
        if (conversation.title && conversation.title.toLowerCase().includes(lowerSearchTerm)) {
          return true;
        }

        // Check if any participant's name matches the search term
        const participantMatch = conversation.participants.some(participant => {
          const fullName = `${participant.firstName} ${participant.lastName}`.toLowerCase();
          return fullName.includes(lowerSearchTerm);
        });

        if (participantMatch) {
          return true;
        }

        // Check if the last message content matches the search term
        if (conversation.lastMessage && conversation.lastMessage.content.toLowerCase().includes(lowerSearchTerm)) {
          return true;
        }

        return false;
      });
    },
    []
  );

  // Filter conversations based on search term
  const filteredConversations = useMemo(() => {
    return filterConversations(conversations, searchTerm, currentUserId);
  }, [conversations, searchTerm, currentUserId, filterConversations]);

  /**
   * Determines the appropriate title for a conversation based on participants
   * @param conversation The conversation object
   * @param currentUserId The ID of the current user
   * @returns The formatted conversation title
   */
  const getConversationTitle = useCallback(
    (conversation: Conversation, currentUserId: string): string => {
      if (conversation.title) {
        return conversation.title;
      }

      const otherParticipants = conversation.participants.filter(p => p.id !== currentUserId);

      if (otherParticipants.length === 0) {
        return 'New Conversation';
      }

      return otherParticipants.map(p => `${p.firstName} ${p.lastName}`).join(', ');
    },
    []
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Status Bar */}
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={typography.heading4}>
          Messages ({getUnreadCount()})
        </Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Input
          type={InputType.TEXT}
          placeholder="Search conversations..."
          value={searchTerm}
          onChangeText={handleSearch}
          style={styles.searchInput}
        />
      </View>

      {/* Conversation List */}
      {isLoadingConversations ? (
        <View style={styles.loadingContainer}>
          <Spinner size={SpinnerSize.LARGE} />
        </View>
      ) : filteredConversations.length > 0 ? (
        <FlatList
          data={filteredConversations}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleNavigateToChat(item.id)}>
              <View style={styles.conversationItem}>
                <Text style={styles.conversationTitle}>
                  {getConversationTitle(item, currentUserId)}
                </Text>
                {item.lastMessage && (
                  <Text style={styles.lastMessage}>
                    {item.lastMessage.content}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary[500]]}
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No conversations yet.</Text>
        </View>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateNewConversation}
      >
        <MaterialIcons name="add" size={30} color={colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    padding: layout.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  searchContainer: {
    padding: layout.spacing.m,
  },
  searchInput: {
    backgroundColor: colors.background.secondary,
  },
  conversationItem: {
    padding: layout.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  conversationTitle: {
    ...typography.heading5,
  },
  lastMessage: {
    ...typography.paragraphSmall,
    color: colors.text.secondary,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary[500],
    borderRadius: 30,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...typography.paragraph,
    color: colors.text.secondary,
  },
});

export default MessagesScreen;