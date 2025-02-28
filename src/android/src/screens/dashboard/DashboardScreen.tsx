import React, { useState, useEffect, useCallback, useMemo } from 'react'; // react ^18.2.0
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  FlatList,
} from 'react-native'; // 0.72.x
import { useNavigation } from '@react-navigation/native'; // ^6.1.7
import { MaterialIcons } from '@expo/vector-icons'; // ^13.0.0

// Internal component imports
import { SafeAreaView, EdgeMode } from '../../components/common/SafeAreaView';
import { Stats, StatType } from '../../components/dashboard/Stats';
import { RecentActivity, Activity } from '../../components/dashboard/RecentActivity';
import { Notifications, NotificationItem } from '../../components/dashboard/Notifications';
import { Card, CardVariant, CardElevation } from '../../components/common/Card';
import { Button, ButtonVariant, ButtonSize } from '../../components/common/Button';
import JobCard from '../../components/jobs/JobCard';
import Spinner, { SpinnerSize } from '../../components/common/Spinner';

// Style imports
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/layout';
import { typography } from '../../styles/typography';

// Hook imports
import { useAuth } from '../../hooks/useAuth';
import { useJobs } from '../../hooks/useJobs';

// Type imports
import { UserRole } from '../../../backend/shared/src/types/user.types';
import { Job } from '../../types/job.types';

// Global constants
const RECOMMENDED_JOBS_LIMIT = 3;

/**
 * The main dashboard screen component that displays stats, recent activity, notifications, and recommended jobs based on user role
 */
const DashboardScreen: React.FC = () => {
  // Initialize navigation using useNavigation hook
  const navigation = useNavigation();

  // Initialize authentication state using useAuth hook
  const { user, isAuthenticated } = useAuth();

  // Initialize jobs functionality using useJobs hook
  const { jobsState, getRecommendedJobs } = useJobs();

  // Initialize state for recommended jobs
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);

  // Initialize state for loading status
  const [loading, setLoading] = useState(true);

  // Initialize state for refresh control status
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Determines the appropriate greeting based on time of day
   * @returns Time-appropriate greeting (Good morning/afternoon/evening)
   */
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return 'Good morning';
    } else if (hour >= 12 && hour < 17) {
      return 'Good afternoon';
    } else {
      return 'Good evening';
    }
  };

  /**
   * Creates fetchDashboardData function to load all dashboard data
   */
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch recommended jobs
      const jobs = await getRecommendedJobs();
      setRecommendedJobs(jobs);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [getRecommendedJobs]);

  /**
   * Creates handleRefresh function to handle pull-to-refresh
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData().finally(() => setRefreshing(false));
  }, [fetchDashboardData]);

  /**
   * Creates handleStatPress function to navigate to appropriate screens based on stat type
   */
  const handleStatPress = useCallback((statType: StatType) => {
    // Implement navigation logic based on stat type
    console.log('Stat pressed:', statType);
  }, []);

  /**
   * Creates handleActivityPress function to handle activity item interaction
   */
  const handleActivityPress = useCallback((activity: Activity) => {
    // Implement navigation logic based on activity item
    console.log('Activity pressed:', activity);
  }, []);

  /**
   * Creates handleNotificationPress function to handle notification interaction
   */
  const handleNotificationPress = useCallback((notification: NotificationItem) => {
    // Implement navigation logic based on notification
    console.log('Notification pressed:', notification);
  }, []);

  /**
   * Creates handleJobPress function to navigate to job details
   */
  const handleJobPress = useCallback((jobId: string) => {
    navigation.navigate('JobDetail' as never, { jobId } as never);
  }, [navigation]);

  /**
   * Creates handleViewAllJobs function to navigate to jobs screen
   */
  const handleViewAllJobs = useCallback(() => {
    navigation.navigate('Jobs' as never);
  }, [navigation]);

  /**
   * Creates handleViewAllNotifications function to navigate to notifications screen
   */
  const handleViewAllNotifications = useCallback(() => {
    navigation.navigate('Notifications' as never);
  }, [navigation]);

  /**
   * Creates handleViewAllActivity function to navigate to activity screen
   */
  const handleViewAllActivity = useCallback(() => {
    navigation.navigate('Activity' as never);
  }, [navigation]);

  /**
   * Use useEffect to load dashboard data on component mount
   */
  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated, fetchDashboardData]);

  return (
    <SafeAreaView edges={[EdgeMode.TOP, EdgeMode.BOTTOM]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Render greeting section with user's name and role-specific welcome message */}
        {isAuthenticated && user && (
          <View style={styles.greetingContainer}>
            <Text style={styles.greetingText}>
              {getGreeting()}, {user.firstName}!
            </Text>
            <Text style={styles.roleText}>
              Welcome to the AI Talent Marketplace
            </Text>
          </View>
        )}

        {/* Render Stats component with role-specific metrics */}
        <Stats onStatPress={handleStatPress} testID="dashboard-stats" />

        {/* Render Notifications component with recent alerts */}
        <Notifications
          onViewAll={handleViewAllNotifications}
          testID="dashboard-notifications"
        />

        {/* Render RecentActivity component with timeline of user actions */}
        <RecentActivity
          onItemPress={handleActivityPress}
          onViewAll={handleViewAllActivity}
          testID="dashboard-recent-activity"
        />

        {/* Render Recommended Jobs section with job cards and AI-matched opportunities */}
        <View style={styles.recommendedJobsContainer}>
          <View style={styles.recommendedJobsHeader}>
            <Text style={styles.recommendedJobsTitle}>Recommended Jobs</Text>
            <TouchableOpacity onPress={handleViewAllJobs}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <Spinner size={SpinnerSize.SMALL} />
          ) : (
            recommendedJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onPress={handleJobPress}
                testID={`recommended-job-${job.id}`}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollViewContent: {
    paddingBottom: spacing.m,
  },
  greetingContainer: {
    paddingHorizontal: spacing.m,
    paddingTop: spacing.m,
    marginBottom: spacing.l,
  },
  greetingText: {
    ...typography.heading3,
    color: colors.text.primary,
  },
  roleText: {
    ...typography.paragraph,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  recommendedJobsContainer: {
    paddingHorizontal: spacing.m,
    marginTop: spacing.l,
  },
  recommendedJobsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  recommendedJobsTitle: {
    ...typography.heading5,
    color: colors.text.primary,
  },
  viewAllText: {
    ...typography.buttonSmall,
    color: colors.primary[500],
  },
});

export default DashboardScreen;