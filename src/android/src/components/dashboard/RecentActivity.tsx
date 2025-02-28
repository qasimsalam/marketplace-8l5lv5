import React, { useState, useEffect, useMemo, useCallback } from 'react'; // ^18.2.0
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'; // 0.72.x
import MaterialIcons from '@expo/vector-icons'; // ^13.0.0
import { useNavigation } from '@react-navigation/native'; // ^6.1.7

import Avatar, { AvatarSize } from '../../components/common/Avatar';
import Card, { CardVariant, CardElevation } from '../../components/common/Card';
import Spinner, { SpinnerSize } from '../../components/common/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../styles/colors';
import { formatRelativeDateForMobile } from '../../utils/date';

// Global constant for default fetch limit
const ACTIVITY_FETCH_LIMIT = 10;

// Enum for activity types
export enum ActivityType {
  JOB_APPLIED = 'job_applied',
  JOB_POSTED = 'job_posted',
  PROPOSAL_RECEIVED = 'proposal_received',
  PROPOSAL_ACCEPTED = 'proposal_accepted',
  PROPOSAL_REJECTED = 'proposal_rejected',
  CONTRACT_CREATED = 'contract_created',
  MILESTONE_COMPLETED = 'milestone_completed',
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_SENT = 'payment_sent',
  PROFILE_VIEWED = 'profile_viewed',
  MESSAGE_RECEIVED = 'message_received',
  REVIEW_RECEIVED = 'review_received'
}

// Interface for an activity item
export interface Activity {
  id: string;
  type: ActivityType;
  userId: string;
  userName: string;
  userAvatarUrl: string;
  entityId: string;
  entityType: string;
  entityName: string;
  timestamp: Date;
  data: Record<string, any>;
}

// Props interface for the RecentActivity component
export interface RecentActivityProps {
  isLoading?: boolean;
  onItemPress?: (activity: Activity) => void;
  style?: StyleProp<ViewStyle>;
  limit?: number;
  testID?: string;
}

/**
 * Returns the appropriate Material icon name for an activity type
 * 
 * @param type The activity type
 * @returns Material icon name for the activity type
 */
const getActivityIcon = (type: ActivityType): string => {
  switch (type) {
    case ActivityType.JOB_APPLIED:
      return 'assignment';
    case ActivityType.JOB_POSTED:
      return 'work';
    case ActivityType.PROPOSAL_RECEIVED:
      return 'mail';
    case ActivityType.PROPOSAL_ACCEPTED:
      return 'check-circle';
    case ActivityType.PROPOSAL_REJECTED:
      return 'cancel';
    case ActivityType.CONTRACT_CREATED:
      return 'content-paste';
    case ActivityType.MILESTONE_COMPLETED:
      return 'flag';
    case ActivityType.PAYMENT_RECEIVED:
      return 'attach-money';
    case ActivityType.PAYMENT_SENT:
      return 'money-off';
    case ActivityType.PROFILE_VIEWED:
      return 'visibility';
    case ActivityType.MESSAGE_RECEIVED:
      return 'chat';
    case ActivityType.REVIEW_RECEIVED:
      return 'star';
    default:
      return 'notifications';
  }
};

/**
 * Returns the appropriate color for an activity type
 * 
 * @param type The activity type
 * @returns Color value for the activity type
 */
const getActivityColor = (type: ActivityType): string => {
  switch (type) {
    case ActivityType.JOB_APPLIED:
    case ActivityType.JOB_POSTED:
      return colors.primary[500];
    case ActivityType.PROPOSAL_RECEIVED:
      return colors.accent[500];
    case ActivityType.PROPOSAL_ACCEPTED:
    case ActivityType.MILESTONE_COMPLETED:
    case ActivityType.PAYMENT_RECEIVED:
      return colors.success[500];
    case ActivityType.PROPOSAL_REJECTED:
      return colors.error[500];
    case ActivityType.CONTRACT_CREATED:
      return colors.secondary[500];
    case ActivityType.PAYMENT_SENT:
      return colors.warning[500];
    case ActivityType.PROFILE_VIEWED:
    case ActivityType.MESSAGE_RECEIVED:
    case ActivityType.REVIEW_RECEIVED:
      return colors.info[500];
    default:
      return colors.gray[500];
  }
};

/**
 * Generates human-readable text for an activity
 * 
 * @param activity The activity object
 * @returns Human-readable description of the activity
 */
const getActivityText = (activity: Activity): string => {
  const { type, userName, entityName, data } = activity;
  
  switch (type) {
    case ActivityType.JOB_APPLIED:
      return `You applied to job "${entityName}"`;
    case ActivityType.JOB_POSTED:
      return `You posted a new job "${entityName}"`;
    case ActivityType.PROPOSAL_RECEIVED:
      return `${userName} submitted a proposal for "${entityName}"`;
    case ActivityType.PROPOSAL_ACCEPTED:
      return `Your proposal for "${entityName}" was accepted`;
    case ActivityType.PROPOSAL_REJECTED:
      return `Your proposal for "${entityName}" was rejected`;
    case ActivityType.CONTRACT_CREATED:
      return `Contract created for "${entityName}"`;
    case ActivityType.MILESTONE_COMPLETED:
      return `Milestone completed for "${entityName}"`;
    case ActivityType.PAYMENT_RECEIVED:
      return `Payment of $${data.amount} received for "${entityName}"`;
    case ActivityType.PAYMENT_SENT:
      return `Payment of $${data.amount} sent for "${entityName}"`;
    case ActivityType.PROFILE_VIEWED:
      return `${userName} viewed your profile`;
    case ActivityType.MESSAGE_RECEIVED:
      return `New message from ${userName}`;
    case ActivityType.REVIEW_RECEIVED:
      return `${userName} left a review for "${entityName}"`;
    default:
      return 'New activity';
  }
};

/**
 * A dashboard component that displays a user's recent activities in a timeline format.
 */
const RecentActivity: React.FC<RecentActivityProps> = ({
  isLoading = false,
  onItemPress,
  style,
  limit = ACTIVITY_FETCH_LIMIT,
  testID = 'recent-activity'
}) => {
  // Get current user from auth hook
  const { user } = useAuth();
  
  // Local state
  const [loading, setLoading] = useState(isLoading);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // Navigation
  const navigation = useNavigation();
  
  // Fetch activities on mount and when user changes
  useEffect(() => {
    fetchActivities();
  }, [user]);
  
  // Function to fetch activities from API
  const fetchActivities = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      // In a real app, this would call an API endpoint to get activities
      // For now, we'll use mock data
      const mockActivities: Activity[] = [
        {
          id: '1',
          type: ActivityType.PROFILE_VIEWED,
          userId: 'user1',
          userName: 'John Doe',
          userAvatarUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
          entityId: user?.id || '',
          entityType: 'profile',
          entityName: `${user?.firstName} ${user?.lastName}`,
          timestamp: new Date(Date.now() - 1000 * 60 * 10), // 10 mins ago
          data: {}
        },
        {
          id: '2',
          type: ActivityType.PAYMENT_RECEIVED,
          userId: 'user2',
          userName: 'Jane Smith',
          userAvatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
          entityId: 'job1',
          entityType: 'job',
          entityName: 'AI Chatbot Development',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
          data: { amount: 250 }
        },
        {
          id: '3',
          type: ActivityType.MESSAGE_RECEIVED,
          userId: 'user3',
          userName: 'Robert Johnson',
          userAvatarUrl: 'https://randomuser.me/api/portraits/men/22.jpg',
          entityId: 'conversation1',
          entityType: 'conversation',
          entityName: 'Project Discussion',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
          data: {}
        }
      ];
      
      // Limit the number of activities
      const limitedActivities = mockActivities.slice(0, limit);
      setActivities(limitedActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, limit]);
  
  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    fetchActivities(true);
  }, [fetchActivities]);
  
  // Handle item press
  const handleItemPress = useCallback((activity: Activity) => {
    if (onItemPress) {
      onItemPress(activity);
      return;
    }
    
    // Default navigation based on activity type
    switch (activity.type) {
      case ActivityType.JOB_APPLIED:
      case ActivityType.JOB_POSTED:
        navigation.navigate('JobDetail' as never, { id: activity.entityId } as never);
        break;
      case ActivityType.PROPOSAL_RECEIVED:
      case ActivityType.PROPOSAL_ACCEPTED:
      case ActivityType.PROPOSAL_REJECTED:
        navigation.navigate('ProposalDetail' as never, { id: activity.entityId } as never);
        break;
      case ActivityType.CONTRACT_CREATED:
      case ActivityType.MILESTONE_COMPLETED:
        navigation.navigate('ContractDetail' as never, { id: activity.entityId } as never);
        break;
      case ActivityType.PAYMENT_RECEIVED:
      case ActivityType.PAYMENT_SENT:
        navigation.navigate('PaymentDetail' as never, { id: activity.entityId } as never);
        break;
      case ActivityType.PROFILE_VIEWED:
        navigation.navigate('Profile' as never, { id: activity.userId } as never);
        break;
      case ActivityType.MESSAGE_RECEIVED:
        navigation.navigate('Conversation' as never, { id: activity.entityId } as never);
        break;
      case ActivityType.REVIEW_RECEIVED:
        navigation.navigate('Review' as never, { id: activity.entityId } as never);
        break;
    }
  }, [onItemPress, navigation]);
  
  // Memoize the empty state component
  const EmptyState = useMemo(() => (
    <View style={styles.emptyState}>
      <MaterialIcons name="notifications-off" size={48} color={colors.gray[400]} />
      <Text style={styles.emptyStateText}>No recent activities</Text>
    </View>
  ), []);
  
  // Render an activity item
  const renderActivityItem = useCallback(({ item }: { item: Activity }) => {
    return (
      <TouchableOpacity 
        style={styles.activityItem}
        onPress={() => handleItemPress(item)}
        testID={`${testID}-item-${item.id}`}
        activeOpacity={0.7}
      >
        <View style={[
          styles.iconContainer, 
          { backgroundColor: `${getActivityColor(item.type)}20` } // 20% opacity
        ]}>
          <MaterialIcons 
            name={getActivityIcon(item.type)} 
            size={24} 
            color={getActivityColor(item.type)} 
          />
        </View>
        
        <View style={styles.activityContent}>
          <Text style={styles.activityText} numberOfLines={2}>
            {getActivityText(item)}
          </Text>
          <Text style={styles.timeText}>
            {formatRelativeDateForMobile(item.timestamp)}
          </Text>
        </View>
        
        <Avatar 
          imageUrl={item.userAvatarUrl}
          name={item.userName}
          size={AvatarSize.SMALL}
          style={styles.avatar}
        />
      </TouchableOpacity>
    );
  }, [handleItemPress, testID]);
  
  // If there's an initial loading state, show spinner
  if (loading && !refreshing) {
    return (
      <Card 
        style={[styles.container, style]}
        elevation={CardElevation.LOW}
        rounded={true}
        testID={testID}
      >
        <View style={styles.header}>
          <Text style={styles.headerText}>Recent Activity</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <Spinner size={SpinnerSize.MEDIUM} testID={`${testID}-spinner`} />
        </View>
      </Card>
    );
  }
  
  // Main render
  return (
    <Card 
      style={[styles.container, style]}
      elevation={CardElevation.LOW}
      rounded={true}
      testID={testID}
    >
      <View style={styles.header}>
        <Text style={styles.headerText}>Recent Activity</Text>
      </View>
      
      <FlatList
        data={activities}
        renderItem={renderActivityItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={EmptyState}
        testID={`${testID}-list`}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 0,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[200],
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
    marginRight: 12,
  },
  activityText: {
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  avatar: {
    marginLeft: 'auto',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RecentActivity;