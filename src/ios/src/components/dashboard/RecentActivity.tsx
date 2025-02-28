/**
 * Recent Activity Component for iOS
 * 
 * Displays a chronological list of user-related events in the AI Talent Marketplace 
 * iOS application, including profile views, payments received, job applications, and 
 * other platform interactions.
 * 
 * @version react-native 0.72.x
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity
} from 'react-native';
import { useNavigation } from '@react-navigation/native'; // ^6.1.6
import Ionicons from 'react-native-vector-icons/Ionicons'; // ^9.0.0

import { Card, CardVariant } from '../common/Card';
import { Avatar, AvatarSize } from '../common/Avatar';
import { Spinner } from '../common/Spinner';
import useAuth from '../../hooks/useAuth';
import { formatRelativeDateForMobile } from '../../utils/date';
import { colors } from '../../styles/colors';
import { textVariants } from '../../styles/typography';

// Define activity types constant
const ActivityType = {
  PROFILE_VIEW: 'profile_view',
  PAYMENT_RECEIVED: 'payment_received',
  PROPOSAL_SUBMITTED: 'proposal_submitted',
  JOB_APPLIED: 'job_applied',
  MESSAGE_RECEIVED: 'message_received',
  CONTRACT_CREATED: 'contract_created',
  CONTRACT_COMPLETED: 'contract_completed',
  REVIEW_RECEIVED: 'review_received'
};

// Interface for an activity item
export interface ActivityItem {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
  targetId: string;
  targetType: string;
  sourceUserId: string;
  sourceUserName: string;
  sourceUserAvatar: string;
}

// Props for the RecentActivity component
export interface RecentActivityProps {
  maxItems?: number;
  onViewAll?: () => void;
}

/**
 * Component to display recent user activities on the dashboard
 */
const RecentActivity: React.FC<RecentActivityProps> = ({ 
  maxItems = 5,
  onViewAll 
}) => {
  // State for activities data
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  // State for loading indicator
  const [loading, setLoading] = useState<boolean>(true);
  
  // Get navigation hook
  const navigation = useNavigation();
  
  // Get authenticated user
  const { user } = useAuth();
  
  /**
   * Fetches activities from API
   */
  const fetchActivities = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // In a real app, we would fetch data from the API here
      // For now, we'll use mock data
      setTimeout(() => {
        const mockActivities: ActivityItem[] = [
          {
            id: '1',
            type: ActivityType.PROFILE_VIEW,
            message: 'viewed your profile',
            timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
            targetId: user.id,
            targetType: 'profile',
            sourceUserId: 'user1',
            sourceUserName: 'John Smith',
            sourceUserAvatar: 'https://randomuser.me/api/portraits/men/1.jpg'
          },
          {
            id: '2',
            type: ActivityType.PAYMENT_RECEIVED,
            message: 'sent you a payment of $500',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
            targetId: 'payment1',
            targetType: 'payment',
            sourceUserId: 'user2',
            sourceUserName: 'Michael Johnson',
            sourceUserAvatar: 'https://randomuser.me/api/portraits/men/2.jpg'
          },
          {
            id: '3',
            type: ActivityType.MESSAGE_RECEIVED,
            message: 'sent you a message',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
            targetId: 'conversation1',
            targetType: 'conversation',
            sourceUserId: 'user3',
            sourceUserName: 'Emily Davis',
            sourceUserAvatar: 'https://randomuser.me/api/portraits/women/1.jpg'
          },
          {
            id: '4',
            type: ActivityType.JOB_APPLIED,
            message: 'applied to your job post "AI Engineer"',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36), // 1.5 days ago
            targetId: 'job1',
            targetType: 'job',
            sourceUserId: 'user4',
            sourceUserName: 'Robert Wilson',
            sourceUserAvatar: 'https://randomuser.me/api/portraits/men/3.jpg'
          },
          {
            id: '5',
            type: ActivityType.CONTRACT_COMPLETED,
            message: 'completed the contract "ML Model Training"',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
            targetId: 'contract1',
            targetType: 'contract',
            sourceUserId: 'user5',
            sourceUserName: 'Sarah Brown',
            sourceUserAvatar: 'https://randomuser.me/api/portraits/women/2.jpg'
          }
        ];
        
        setActivities(mockActivities);
        setLoading(false);
      }, 800); // Simulate API delay
      
    } catch (error) {
      console.error('Error fetching activities:', error);
      setLoading(false);
    }
  }, [user]);
  
  // Fetch activities on component mount and when user changes
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);
  
  /**
   * Returns the appropriate icon name based on activity type
   */
  const getActivityIcon = (activityType: string): string => {
    switch (activityType) {
      case ActivityType.PROFILE_VIEW:
        return 'person';
      case ActivityType.PAYMENT_RECEIVED:
        return 'cash';
      case ActivityType.PROPOSAL_SUBMITTED:
        return 'document-text';
      case ActivityType.JOB_APPLIED:
        return 'briefcase';
      case ActivityType.MESSAGE_RECEIVED:
        return 'chatbubble';
      case ActivityType.CONTRACT_CREATED:
        return 'create';
      case ActivityType.CONTRACT_COMPLETED:
        return 'checkmark-circle';
      case ActivityType.REVIEW_RECEIVED:
        return 'star';
      default:
        return 'alert-circle';
    }
  };
  
  /**
   * Returns the appropriate color based on activity type
   */
  const getActivityColor = (activityType: string): string => {
    switch (activityType) {
      case ActivityType.PROFILE_VIEW:
        return colors.primary[600];
      case ActivityType.PAYMENT_RECEIVED:
        return colors.success[500];
      case ActivityType.PROPOSAL_SUBMITTED:
        return colors.primary[400];
      case ActivityType.JOB_APPLIED:
        return colors.primary[700];
      case ActivityType.MESSAGE_RECEIVED:
        return colors.primary[600];
      case ActivityType.CONTRACT_CREATED:
        return colors.primary[400];
      case ActivityType.CONTRACT_COMPLETED:
        return colors.success[500];
      case ActivityType.REVIEW_RECEIVED:
        return colors.primary[400];
      default:
        return colors.text.secondary;
    }
  };
  
  /**
   * Handles activity press and navigates to relevant screens
   */
  const onPressActivity = (activity: ActivityItem) => {
    // Navigation will depend on the type of activity
    switch (activity.targetType) {
      case 'profile':
        navigation.navigate('Profile' as never, { userId: activity.sourceUserId } as never);
        break;
      case 'payment':
        navigation.navigate('PaymentDetails' as never, { paymentId: activity.targetId } as never);
        break;
      case 'conversation':
        navigation.navigate('Conversation' as never, { conversationId: activity.targetId } as never);
        break;
      case 'job':
        navigation.navigate('JobDetails' as never, { jobId: activity.targetId } as never);
        break;
      case 'contract':
        navigation.navigate('ContractDetails' as never, { contractId: activity.targetId } as never);
        break;
      default:
        // Default fallback if no specific navigation is defined
    }
  };
  
  /**
   * Renders a single activity item in the list
   */
  const renderActivityItem = ({ item, index }: { item: ActivityItem; index: number }) => {
    const iconName = getActivityIcon(item.type);
    const iconColor = getActivityColor(item.type);
    const time = formatRelativeDateForMobile(item.timestamp);
    
    return (
      <TouchableOpacity 
        style={[
          styles.activityItem,
          index < activities.length - 1 && styles.activityItemWithBorder
        ]}
        onPress={() => onPressActivity(item)}
        accessibilityLabel={`Activity: ${item.sourceUserName} ${item.message}`}
      >
        <Avatar 
          size={AvatarSize.SMALL}
          source={{ uri: item.sourceUserAvatar }}
          name={item.sourceUserName}
          style={styles.avatar}
        />
        
        <View style={styles.activityContent}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityName}>{item.sourceUserName}</Text>
            <Text style={styles.activityTime}>{time}</Text>
          </View>
          <Text style={styles.activityMessage}>
            <Ionicons name={iconName} size={16} color={iconColor} />
            {' '}{item.message}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };
  
  return (
    <Card
      variant={CardVariant.DEFAULT}
      style={styles.card}
      testID="recent-activity-card"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Recent Activity</Text>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <Spinner />
        </View>
      ) : (
        <View style={styles.content}>
          <FlatList
            data={activities.slice(0, maxItems)}
            renderItem={renderActivityItem}
            keyExtractor={item => item.id}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="notifications-outline" size={40} color={colors.text.secondary} />
                <Text style={styles.emptyStateText}>No recent activity</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            scrollEnabled={false}
          />
          
          {onViewAll && activities.length > maxItems && (
            <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary[600]} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.default,
  },
  title: {
    ...textVariants.heading5,
    color: colors.text.primary,
  },
  content: {
    flexDirection: 'column',
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    flexGrow: 1,
  },
  activityItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  activityItemWithBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.default,
  },
  avatar: {
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
    flexDirection: 'column',
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityName: {
    ...textVariants.heading6,
    color: colors.text.primary,
  },
  activityTime: {
    ...textVariants.caption,
    color: colors.text.tertiary,
  },
  activityMessage: {
    ...textVariants.paragraphSmall,
    color: colors.text.secondary,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    ...textVariants.paragraphSmall,
    color: colors.text.secondary,
    marginTop: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
  },
  viewAllText: {
    ...textVariants.button,
    color: colors.primary[600],
    marginRight: 4,
  },
});

export default RecentActivity;