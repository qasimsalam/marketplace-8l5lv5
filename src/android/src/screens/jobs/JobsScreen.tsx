/**
 * JobsScreen Component
 *
 * A screen component that displays a list of AI job opportunities for the AI Talent Marketplace Android application,
 * with filtering capabilities, pull-to-refresh functionality, and seamless navigation to job details.
 * This screen serves as the main entry point for users to browse, search, and filter available AI projects.
 *
 * @version 1.0.0
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react'; // react v18.2.0
import {
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native'; // react-native v0.72.x
import { StackScreenProps } from '@react-navigation/stack'; // @react-navigation/stack v6.3.16
import { useFocusEffect } from '@react-navigation/native'; // @react-navigation/native v6.1.7
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // react-native-vector-icons/MaterialIcons v9.2.0

// Internal imports
import JobList from '../../components/jobs/JobList';
import JobFilters from '../../components/jobs/JobFilters';
import Button, { ButtonVariant, ButtonSize } from '../../components/common/Button';
import SafeAreaView, { EdgeMode } from '../../components/common/SafeAreaView';
import Spinner, { SpinnerSize } from '../../components/common/Spinner';
import Toast, { ToastType } from '../../components/common/Toast';
import { useJobs } from '../../hooks/useJobs';
import { useAuth } from '../../hooks/useAuth';
import {
  JobSearchParams,
  JobFilterOptions,
  JobsStackParamList,
} from '../../types/job.types';
import { UserRole } from '../../types/auth.types';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/layout';

/**
 * The main component that renders the jobs screen with job listing and filters
 */
const JobsScreen: React.FC<StackScreenProps<JobsStackParamList, 'Jobs'>> = ({
  navigation,
  route,
}) => {
  // Destructure navigation and route from props
  const { params } = route;

  // Initialize state for filter visibility, filter options, search parameters
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [filterOptions, setFilterOptions] = useState<JobFilterOptions>({});
  const [searchParams, setSearchParams] = useState<JobSearchParams>({});

  // Initialize useJobs hook to access job state and functions
  const { jobsState, getJobs, refreshJobs } = useJobs();

  // Initialize useAuth hook to access user's role for conditional rendering
  const { user, isAuthenticated } = useAuth();

  // Add state for toast messages to display notifications
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  // Use useFocusEffect to refresh job data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Refresh job data when the screen comes into focus
      refreshJobs(searchParams);
    }, [searchParams, refreshJobs])
  );

  // Implement handleCreateJob to navigate to job creation screen
  const handleCreateJob = useCallback(() => {
    navigation.navigate('CreateJob');
  }, [navigation]);

  // Implement handleFilterToggle to show/hide filter panel
  const handleFilterToggle = useCallback(() => {
    setIsFilterVisible((prev) => !prev);
  }, []);

  // Implement handleFilterChange to update filter options
  const handleFilterChange = useCallback((filters: JobFilterOptions) => {
    setFilterOptions(filters);
  }, []);

  // Implement handleApplyFilters to execute filtered job search
  const handleApplyFilters = useCallback(() => {
    setIsFilterVisible(false);
    // Apply filters logic here
  }, []);

  // Implement handleRefresh for pull-to-refresh functionality
  const handleRefresh = useCallback(() => {
    refreshJobs(searchParams);
  }, [searchParams, refreshJobs]);

  // Implement showToast utility for displaying notifications
  const showToast = useCallback(
    (message: string, type: ToastType, duration: number = 3000) => {
      setToast({ message, type });
      setTimeout(() => {
        setToast(null);
      }, duration);
    },
    []
  );

  // Implement renderHeader function with title and action buttons
  const renderHeader = useCallback(() => (
    <View style={styles.headerContainer}>
      <Text style={styles.headerTitle}>AI Job Opportunities</Text>
      <View style={styles.headerButtons}>
        <TouchableOpacity onPress={handleFilterToggle} style={styles.filterButton}>
          <MaterialIcons name="filter-list" size={30} color={colors.primary[500]} />
        </TouchableOpacity>
        {/* Conditionally render 'Create Job' button based on user role (EMPLOYER) */}
        {user?.role === UserRole.EMPLOYER && (
          <Button
            title="Create Job"
            variant={ButtonVariant.PRIMARY}
            size={ButtonSize.MEDIUM}
            onPress={handleCreateJob}
          />
        )}
      </View>
    </View>
  ), [handleFilterToggle, handleCreateJob, user]);

  return (
    <SafeAreaView edges={EdgeMode.ALL}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />
      {/* Render the header with title and filter/create buttons */}
      {renderHeader()}

      {/* Render JobFilters component when filter panel is visible */}
      {isFilterVisible && (
        <JobFilters
          initialFilters={filterOptions}
          options={{ skills: [], categories: [] }}
          onFilterChange={handleFilterChange}
        />
      )}

      {/* Render JobList with proper initialization and event handlers */}
      <JobList
        initialParams={searchParams}
        filterOptions={filterOptions}
        showFilters={isFilterVisible}
        onFilterChange={handleFilterChange}
        onRefresh={handleRefresh}
      />

      {/* Apply appropriate spacing and styling throughout the component */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    marginRight: spacing.m,
  },
});

export default JobsScreen;