/**
 * A dashboard component that displays user notifications for the AI Talent Marketplace Android application.
 * Shows various types of notifications including job matches, messages, payment updates, and general platform notifications with appropriate status indicators and interactive capabilities.
 *
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react'; // v18.2.0
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Switch,
  RefreshControl,
} from 'react-native'; // v0.72.x
import { useSelector } from 'react-redux'; // v8.1.1
import { useNavigation } from '@react-navigation/native'; // v6.1.7

// Internal component imports
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Avatar from '../../components/common/Avatar';
import Spinner from '../../components/common/Spinner';

// Style imports
import { colors } from '../../styles/colors';
import { formatRelativeDateForMobile } from '../../utils/date';

// Hook imports
import { useNotifications, NotificationChannelType } from '../../hooks/useNotifications';
import { useAuth } from '../../hooks/useAuth';

// Redux selector imports
import { selectMessages } from '../../store/slices/messagesSlice';

// Type imports
import { MessageType } from '../../types/message.types';

// Global constants
const NOTIFICATION_LIMIT = 10;

/**
 * Enum defining the types of notifications displayed in the component
 */
export enum NotificationType {
  JOB_MATCH = 'job_match',
  NEW_MESSAGE = 'new_message',
  PAYMENT = 'payment',
  PROPOSAL = 'proposal',
  CONTRACT = 'contract',
  SYSTEM = 'system',
}

/**
 * Interface defining the structure of a notification item
 */
export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  data: object;
  senderImage?: string;
  senderName?: string;
}

/**
 * Interface defining props for the Notifications component
 */
export interface NotificationsProps {
  maxItems?: number;
  showHeader?: boolean;
  showSettings?: boolean;
  onViewAll?: () => void;
  testID?: string;
}

/**
 * Returns appropriate icon based on notification type
 * @param type
 * @returns Icon name from the Icon library
 */
const getNotificationIcon = (type: string): string => {
  switch (type) {
    case NotificationType.NEW_MESSAGE:
      return 'message';
    case NotificationType.JOB_MATCH:
      return 'work';
    case NotificationType.PAYMENT:
      return 'payment';
    case NotificationType.PROPOSAL:
      return 'assignment';
    case NotificationType.CONTRACT:
      return 'description';
    case NotificationType.SYSTEM:
      return 'settings';
    default:
      return 'notifications';
  }
};

/**
 * Handles tapping on a notification to navigate to the relevant screen
 * @param notification
 */
const handleNotificationPress = (notification: NotificationItem): void => {
  // Placeholder implementation for handling notification presses
  console.log('Notification pressed:', notification);
};

/**
 * Exports the Notifications component for use in the dashboard
 */
export const Notifications: React.FC<NotificationsProps> = ({
  maxItems = NOTIFICATION_LIMIT,
  showHeader = true,
  showSettings = true,
  onViewAll,
  testID = 'notifications-component',
}) => {
  // React navigation hook
  const navigation = useNavigation();

  // Notification management hook
  const { preferences, updateChannelPreference } = useNotifications();

  // Authentication hook
  const { user } = useAuth();

  // Redux selector for unread messages
  const unreadMessages = useSelector(selectMessages);

  // Local state for notifications (replace with actual data source)
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      type: NotificationType.NEW_MESSAGE,
      title: 'New Message',
      message: 'John Doe sent you a message.',
      createdAt: new Date(),
      read: false,
      data: { conversationId: '123' },
      senderImage: 'https://example.com/avatar.jpg',
      senderName: 'John Doe',
    },
    {
      id: '2',
      type: NotificationType.JOB_MATCH,
      title: 'Job Match',
      message: 'A job matches your skills.',
      createdAt: new Date(),
      read: true,
      data: { jobId: '456' },
    },
    {
      id: '3',
      type: NotificationType.PAYMENT,
      title: 'Payment Received',
      message: 'You have received a payment of $100.',
      createdAt: new Date(),
      read: false,
      data: { paymentId: '789' },
    },
  ]);

  // Local state for refreshing
  const [refreshing, setRefreshing] = useState(false);

  // Function to handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // Filter notifications based on user and limit
  const filteredNotifications = React.useMemo(() => {
    return notifications
      .filter((notification) => {
        // Add any user-specific filtering logic here
        return true;
      })
      .slice(0, maxItems);
  }, [notifications, maxItems, user]);

  // Render item for FlatList
  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={styles.notificationItem}
      onPress={() => handleNotificationPress(item)}
      testID={`${testID}-item-${item.id}`}
    >
      {item.senderImage && <Avatar imageUrl={item.senderImage} size={30} />}
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <Text style={styles.notificationTime}>
          {formatRelativeDateForMobile(item.createdAt)}
        </Text>
      </View>
      {!item.read && <Badge variant="primary" size="xs" />}
    </TouchableOpacity>
  );

  // Key extractor for FlatList
  const keyExtractor = (item: NotificationItem) => item.id;

  return (
    <Card style={styles.container} testID={testID}>
      {showHeader && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {showSettings && (
            <Switch
              value={preferences.channels[NotificationChannelType.GENERAL]}
              onValueChange={(value) =>
                updateChannelPreference(NotificationChannelType.GENERAL, value)
              }
              testID={`${testID}-settings-switch`}
            />
          )}
        </View>
      )}
      {notifications.length > 0 ? (
        <FlatList
          data={filteredNotifications}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          testID={`${testID}-list`}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      )}
      {onViewAll && (
        <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  notificationContent: {
    flex: 1,
    marginLeft: 16,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'medium',
    color: colors.text.primary,
  },
  notificationMessage: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  notificationTime: {
    fontSize: 12,
    color: colors.gray[500],
  },
  emptyContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.tertiary,
  },
  viewAllButton: {
    marginTop: 16,
    alignSelf: 'flex-end',
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary[500],
  },
});

export default Notifications;