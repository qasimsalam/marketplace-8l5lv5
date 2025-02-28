import React, { useState, useEffect, useCallback, useMemo } from 'react'; // v18.2.0
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar
} from 'react-native'; // 0.72.x
import { useNavigation } from '@react-navigation/native'; // ^6.1.7
import Animated from 'react-native'; // 0.72.x

import { Card, CardVariant } from '../common/Card';
import { Badge, BadgeVariant, BadgeSize } from '../common/Badge';
import { Avatar, AvatarSize } from '../common/Avatar';
import { Button, ButtonVariant, ButtonSize } from '../common/Button';
import { 
  useNotifications, 
  NotificationType,
  Notification
} from '../../hooks/useNotifications';
import { formatRelativeTime } from '../../utils/date';
import { colors } from '../../styles/colors';
import { textVariants } from '../../styles/typography';

/**
 * Props for the Notifications component
 */
export interface NotificationsProps {
  /** Custom styles for the container */
  style?: StyleProp<ViewStyle>;
  /** Maximum number of notifications to display */
  limit?: number;
  /** Whether to show the notifications header with title and actions */
  showHeader?: boolean;
  /** Optional callback when a notification is pressed */
  onNotificationPress?: (notification: Notification) => void;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Returns the appropriate badge component based on notification type
 * 
 * @param type - The notification type
 * @returns Badge component with appropriate styling for the notification type
 */
const getNotificationIcon = (type: NotificationType): JSX.Element => {
  switch (type) {
    case NotificationType.MESSAGE:
      return (
        <Badge 
          variant={BadgeVariant.PRIMARY} 
          size={BadgeSize.MEDIUM}
          accessibilityLabel="Message notification"
        >
          💬
        </Badge>
      );
    case NotificationType.JOB_MATCH:
      return (
        <Badge 
          variant={BadgeVariant.SUCCESS} 
          size={BadgeSize.MEDIUM}
          accessibilityLabel="Job match notification"
        >
          🎯
        </Badge>
      );
    case NotificationType.PROPOSAL:
      return (
        <Badge 
          variant={BadgeVariant.INFO} 
          size={BadgeSize.MEDIUM}
          accessibilityLabel="Proposal notification"
        >
          📝
        </Badge>
      );
    case NotificationType.CONTRACT:
      return (
        <Badge 
          variant={BadgeVariant.SECONDARY} 
          size={BadgeSize.MEDIUM}
          accessibilityLabel="Contract notification"
        >
          📄
        </Badge>
      );
    case NotificationType.PAYMENT:
      return (
        <Badge 
          variant={BadgeVariant.WARNING} 
          size={BadgeSize.MEDIUM}
          accessibilityLabel="Payment notification"
        >
          💰
        </Badge>
      );
    case NotificationType.SYSTEM:
      return (
        <Badge 
          variant={BadgeVariant.ERROR} 
          size={BadgeSize.MEDIUM}
          accessibilityLabel="System notification"
        >
          🔔
        </Badge>
      );
    default:
      return (
        <Badge 
          variant={BadgeVariant.INFO} 
          size={BadgeSize.MEDIUM}
          accessibilityLabel="Notification"
        >
          📩
        </Badge>
      );
  }
};

/**
 * Processes notification interaction and navigates to the relevant screen
 * 
 * @param notification - The notification object
 */
const handleNotificationPress = (notification: Notification): void => {
  // Implementation is provided within the component to access hooks and navigation
};

/**
 * Renders an individual notification item in the list
 * 
 * @param props - Object containing the notification item and index
 * @returns Rendered notification item component
 */
const renderNotificationItem = ({ item, index }: { item: Notification, index: number }): JSX.Element => {
  // Implementation is provided within the component to access hooks and handlers
};

/**
 * Renders an empty state when no notifications are available
 * 
 * @returns Empty state component
 */
const renderEmptyState = (): JSX.Element => {
  return (
    <View style={styles.emptyContainer}>
      <Text style={[textVariants.heading5, styles.emptyTitle]}>
        No Notifications
      </Text>
      <Text style={[textVariants.paragraph, styles.emptyText]}>
        You don't have any notifications yet. 
        New job matches, messages, and updates will appear here.
      </Text>
    </View>
  );
};

/**
 * Renders the header section of the notifications component
 * 
 * @returns Header component with title and actions
 */
const renderHeader = (): JSX.Element => {
  // Implementation is provided within the component to access state and handlers
};

/**
 * The main Notifications component for displaying notification feed in the dashboard
 * 
 * @param props - Component props
 * @returns The rendered Notifications component
 */
const Notifications: React.FC<NotificationsProps> = ({
  style,
  limit = 10,
  showHeader = true,
  onNotificationPress,
  testID = 'notifications-component',
}) => {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    fetchNotifications 
  } = useNotifications();

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  // Handle notification press
  const handleNotificationPressImpl = useCallback((notification: Notification) => {
    // Mark the notification as read
    markAsRead(notification.id);
    
    // If custom handler is provided, use it
    if (onNotificationPress) {
      onNotificationPress(notification);
      return;
    }
    
    // Otherwise handle navigation based on notification type
    switch (notification.type) {
      case NotificationType.MESSAGE:
        navigation.navigate('Chat', { 
          conversationId: notification.data?.conversationId 
        });
        break;
      
      case NotificationType.JOB_MATCH:
        navigation.navigate('JobDetails', { 
          jobId: notification.data?.jobId 
        });
        break;
      
      case NotificationType.PROPOSAL:
        navigation.navigate('ProposalDetails', { 
          proposalId: notification.data?.proposalId 
        });
        break;
      
      case NotificationType.CONTRACT:
        navigation.navigate('ContractDetails', { 
          contractId: notification.data?.contractId 
        });
        break;
      
      case NotificationType.PAYMENT:
        navigation.navigate('PaymentDetails', { 
          paymentId: notification.data?.paymentId 
        });
        break;
      
      case NotificationType.SYSTEM:
        if (notification.data?.action === 'profile_review') {
          navigation.navigate('Profile');
        } else if (notification.data?.action === 'account_update') {
          navigation.navigate('Settings');
        } else {
          navigation.navigate('Dashboard');
        }
        break;
      
      default:
        navigation.navigate('Dashboard');
    }
  }, [markAsRead, onNotificationPress, navigation]);

  // Render individual notification item
  const renderNotificationItemImpl = useMemo(() => ({ item, index }) => {
    const [isPressed, setIsPressed] = useState(false);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleNotificationPressImpl(item)}
        style={[
          styles.notificationItem,
          !item.read && styles.unreadItem,
          isPressed && styles.pressedItem
        ]}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${item.title} notification. ${item.read ? 'Read' : 'Unread'}.`}
        accessibilityHint="Double tap to view details"
        testID={`notification-item-${index}`}
      >
        <View style={styles.notificationContent}>
          <View style={styles.iconContainer}>
            {item.sender ? (
              <Avatar 
                name={item.sender.name}
                size={AvatarSize.SMALL}
                style={styles.avatar}
              />
            ) : (
              getNotificationIcon(item.type)
            )}
          </View>
          
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text 
                style={[
                  textVariants.paragraph, 
                  styles.title,
                  !item.read && styles.unreadTitle
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {!item.read && (
                <Badge 
                  variant={BadgeVariant.PRIMARY} 
                  size={BadgeSize.SMALL}
                  style={styles.unreadBadge}
                >
                  •
                </Badge>
              )}
            </View>
            
            <Text 
              style={[textVariants.paragraph, styles.body]} 
              numberOfLines={2}
            >
              {item.body}
            </Text>
            
            <Text style={[textVariants.caption, styles.timestamp]}>
              {formatRelativeTime(item.timestamp)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [handleNotificationPressImpl]);

  // Render header with title and actions
  const renderHeaderImpl = useCallback(() => {
    return (
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={[textVariants.heading5, styles.headerTitle]}>
            Notifications
          </Text>
          {unreadCount > 0 && (
            <Badge 
              variant={BadgeVariant.PRIMARY} 
              size={BadgeSize.SMALL}
              style={styles.countBadge}
            >
              {unreadCount}
            </Badge>
          )}
        </View>
        
        {unreadCount > 0 && (
          <Button
            variant={ButtonVariant.LINK}
            size={ButtonSize.SMALL}
            text="Mark all as read"
            onPress={markAllAsRead}
            testID="mark-all-read-button"
          />
        )}
      </View>
    );
  }, [unreadCount, markAllAsRead]);

  // Show limited notifications
  const limitedNotifications = useMemo(() => {
    return notifications.slice(0, limit);
  }, [notifications, limit]);

  return (
    <Card
      variant={CardVariant.DEFAULT}
      style={[styles.container, style]}
      testID={testID}
      accessibilityLabel="Notifications panel"
    >
      {showHeader && renderHeaderImpl()}
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size="large" 
            color={colors.primary[500]} 
          />
        </View>
      ) : (
        <FlatList
          data={limitedNotifications}
          renderItem={renderNotificationItemImpl}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary[500]]}
              tintColor={colors.primary[500]}
            />
          }
          showsVerticalScrollIndicator={false}
          testID="notifications-list"
        />
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[200],
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    marginRight: 8,
  },
  countBadge: {
    marginLeft: 8,
  },
  listContent: {
    flexGrow: 1,
  },
  notificationItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[200],
  },
  unreadItem: {
    backgroundColor: colors.gray[50],
  },
  pressedItem: {
    backgroundColor: colors.gray[100],
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  avatar: {
    marginRight: 0,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    marginRight: 8,
    fontWeight: '500',
  },
  unreadTitle: {
    fontWeight: '600',
    color: colors.text.primary,
  },
  unreadBadge: {
    marginLeft: 4,
  },
  body: {
    color: colors.text.secondary,
    marginBottom: 4,
  },
  timestamp: {
    color: colors.text.tertiary,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.text.secondary,
  },
  loadingContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Notifications;