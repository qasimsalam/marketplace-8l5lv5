import React, { useState, useEffect, useCallback, useMemo } from 'react'; // ^18.2.0
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  FlatList
} from 'react-native'; // 0.72.x
import { useNavigation } from '@react-navigation/native'; // ^6.1.7
import Ionicons from 'react-native-vector-icons/Ionicons'; // ^9.0.0

import { SafeAreaView, EdgeMode } from '../../components/common/SafeAreaView';
import Stats from '../../components/dashboard/Stats';
import RecentActivity from '../../components/dashboard/RecentActivity';
import Notifications from '../../components/dashboard/Notifications';
import { Button, ButtonVariant, ButtonSize } from '../../components/common/Button';
import { Card, CardVariant } from '../../components/common/Card';
import { Spinner, SpinnerSize } from '../../components/common/Spinner';
import { JobCard } from '../../components/jobs/JobCard';
import useAuth from '../../hooks/useAuth';
import useJobs from '../../hooks/useJobs';
import useProfile from '../../hooks/useProfile';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/layout';
import { textVariants } from '../../styles/typography';
import { UserRole } from '../../types/profile.types';

/**
 * Main dashboard screen component that serves as the home screen after authentication
 */
const DashboardScreen: React.FC = () => {
  // Get navigation object with useNavigation hook
  const navigation = useNavigation();

  // Get authenticated user information with useAuth hook
  const { user } = useAuth();

  // Get recommended jobs data with useJobs hook
  const { jobs, loading: jobsLoading, getRecommendedJobs } = useJobs();

  // Get profile state with useProfile hook
  const { profileState, refreshProfile } = useProfile();

  // Initialize refreshing state with useState hook for pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Refreshes dashboard data when user pulls down to refresh
   */
  const handleRefresh = useCallback(async () => {
    try {
      // Set refreshing state to true to show refresh indicator
      setRefreshing(true);

      // Refresh profile data using refreshProfile from useProfile hook
      await refreshProfile();

      // Fetch recommended jobs using getRecommendedJobs from useJobs hook
      await getRecommendedJobs();
    } catch (error) {
      // Handle any errors during refresh process
      console.error('Error refreshing dashboard:', error);
    } finally {
      // Set refreshing state to false when all refreshes complete
      setRefreshing(false);
    }
  }, [refreshProfile, getRecommendedJobs]);

  // Fetch recommended jobs on component mount using useEffect
  useEffect(() => {
    getRecommendedJobs();
  }, [getRecommendedJobs]);

  /**
   * Navigates to Jobs screen
   */
  const navigateToJobs = useCallback(() => {
    navigation.navigate('Jobs' as never);
  }, [navigation]);

  /**
   * Navigates to specific job detail
   * @param jobId - The ID of the job to navigate to
   */
  const navigateToJobDetail = useCallback((jobId: string) => {
    navigation.navigate('JobDetails' as never, { jobId } as never);
  }, [navigation]);

  /**
   * Navigates to create job screen for employers
   */
  const navigateToCreateJob = useCallback(() => {
    navigation.navigate('CreateJob' as never);
  }, [navigation]);

  /**
   * Renders the recommended jobs section for freelancer users
   */
  const renderRecommendedJobs = useCallback(() => {
    // Check if jobs data is available
    if (!jobs) {
      return null;
    }

    return (
      <Card variant={CardVariant.DEFAULT}>
        <View style={styles.sectionHeader}>
          <Text style={textVariants.heading5}>Recommended Jobs</Text>
          <TouchableOpacity onPress={navigateToJobs}>
            <Text>View All</Text>
          </TouchableOpacity>
        </View>
        {jobsLoading ? (
          <Spinner size={SpinnerSize.MEDIUM} />
        ) : jobs.length > 0 ? (
          <FlatList
            data={jobs}
            renderItem={({ item }) => (
              <JobCard
                job={item}
                onPress={navigateToJobDetail}
                onApplyPress={() => {}}
                showActions={false}
              />
            )}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.jobListContent}
          />
        ) : (
          <Text>No recommended jobs available.</Text>
        )}
      </Card>
    );
  }, [jobs, jobsLoading, navigateToJobDetail, navigateToJobs]);

  /**
   * Renders employer-specific actions like creating a new job posting
   */
  const renderEmployerActions = useCallback(() => {
    return (
      <Card variant={CardVariant.DEFAULT}>
        <Text style={textVariants.heading5}>Post a Job</Text>
        <Button
          variant={ButtonVariant.PRIMARY}
          size={ButtonSize.MEDIUM}
          text="Post a Job"
          onPress={navigateToCreateJob}
          accessibilityLabel="Post a Job"
        />
      </Card>
    );
  }, [navigateToCreateJob]);

  // Determine loading state based on hooks
  const profileLoading = profileState.loading;

  // Calculate combined loading state from all data sources
  const isLoading = profileLoading || jobsLoading;

  return (
    <SafeAreaView style={styles.safeArea} edges={EdgeMode.TOP}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background.primary} />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary[500]} />
        }
        contentContainerStyle={styles.scrollViewContent}
      >
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Welcome, {user?.firstName} {user?.lastName}
          </Text>
        </View>

        {/* Conditionally render Stats component based on user role */}
        {user && (
          <Stats />
        )}

        {/* Render Notifications component with limit of visible notifications */}
        <Notifications limit={3} />

        {/* Render RecentActivity component with most recent user activities */}
        <RecentActivity />

        {/* Conditionally render recommended jobs section based on user role */}
        {user && user.role === UserRole.FREELANCER && renderRecommendedJobs()}

        {/* Conditionally render button to create a new job instead of recommendations */}
        {user && user.role === UserRole.EMPLOYER && renderEmployerActions()}

        {/* Handle loading states with appropriate loading indicators */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Spinner size={SpinnerSize.LARGE} />
          </View>
        )}
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
    padding: spacing.m,
  },
  welcomeSection: {
    marginBottom: spacing.l,
  },
  welcomeText: {
    ...textVariants.heading4,
    color: colors.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.l,
  },
  jobListContent: {
    paddingRight: spacing.m,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
});

export default DashboardScreen;