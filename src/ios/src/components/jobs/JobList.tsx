import React, { useState, useEffect, useCallback, useMemo } from 'react'; // v18.2.0
import {
  FlatList,
  RefreshControl,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native'; // 0.72.x
import { useNavigation } from '@react-navigation/native'; // ^6.1.6
import { MaterialIcons } from 'react-native-vector-icons/MaterialIcons'; // ^9.2.0

import {
  Job,
  JobSearchParams,
  JobListItemData,
} from '../../types/job.types';
import JobCard from './JobCard';
import JobFilters from './JobFilters';
import useJobs from '../../hooks/useJobs';
import { Spinner, SpinnerSize } from '../common/Spinner';
import { Card } from '../common/Card';
import { moderateScale } from '../../utils/responsive';

/**
 * Interface defining props for the JobList component
 */
export interface JobListProps {
  /**
   * Optional initial filter values
   */
  initialFilters?: Partial<JobSearchParams>;
  /**
   * Whether to display the card in a compact format
   */
  compact?: boolean;
  /**
   * Whether to show the filters initially
   */
  showFilters?: boolean;
    /**
   * Callback function when a job is selected
   */
  onJobSelect?: (jobId: string) => void;
  /**
   * Test ID for automated testing
   */
  testID?: string;
}

/**
 * A component that displays a list of job postings with filtering, pagination, and refresh capabilities
 * @param props - Component props
 * @returns Rendered job list component
 */
const JobList: React.FC<JobListProps> = ({
  initialFilters,
  compact = false,
  showFilters = false,
  onJobSelect,
  testID = 'job-list',
}) => {
  // Initialize state for search parameters, filter visibility, and loading more status
  const [searchParams, setSearchParams] = useState<JobSearchParams>(initialFilters || {});
  const [isFilterVisible, setIsFilterVisible] = useState(showFilters);
  const [loadingMore, setLoadingMore] = useState(false);

  // Get jobs data, loading states, and job operations from useJobs hook
  const {
    jobs,
    loading,
    refreshing,
    error,
    totalCount,
    currentPage,
    totalPages,
    getJobs,
    refreshJobs,
  } = useJobs();

  // Get navigation object from useNavigation hook
  const navigation = useNavigation();

  // Implement useEffect to load initial jobs data when component mounts
  useEffect(() => {
    loadInitialJobs();
  }, []);

  // Load initial jobs data
  const loadInitialJobs = async () => {
    try {
      await getJobs(searchParams);
    } catch (err) {
      console.error('Error loading initial jobs:', err);
    }
  };

  // Create handleJobPress function to navigate to job details screen
  const handleJobPress = useCallback(
    (job: Job) => {
      if (onJobSelect) {
        onJobSelect(job.id);
      } else {
        navigation.navigate('JobDetails', { jobId: job.id });
      }
    },
    [navigation, onJobSelect]
  );

  // Create handleApplyPress function to navigate to proposal submission screen
  const handleApplyPress = useCallback(
    (jobId: string) => {
      navigation.navigate('SubmitProposal', { jobId });
    },
    [navigation]
  );

  // Create handleRefresh function for pull-to-refresh functionality
  const handleRefresh = useCallback(async () => {
    try {
      await refreshJobs(searchParams);
    } catch (err) {
      console.error('Error refreshing jobs:', err);
    }
  }, [refreshJobs, searchParams]);

  // Create handleLoadMore function for infinite scrolling pagination
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || currentPage >= totalPages) {
      return;
    }

    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const newParams = { ...searchParams, page: nextPage };
      await getJobs(newParams);
    } catch (err) {
      console.error('Error loading more jobs:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [currentPage, totalPages, getJobs, searchParams, loadingMore]);

  // Create handleApplyFilters function to update search parameters
  const handleApplyFilters = useCallback(
    (filters: JobSearchParams) => {
      setSearchParams(filters);
      setIsFilterVisible(false);
      loadInitialJobs();
    },
    [setSearchParams, setIsFilterVisible, loadInitialJobs]
  );

  // Create handleResetFilters function to clear all filters
  const handleResetFilters = useCallback(() => {
    setSearchParams({});
    setIsFilterVisible(false);
    loadInitialJobs();
  }, [setSearchParams, setIsFilterVisible, loadInitialJobs]);

  // Create toggleFilters function to show/hide filter panel
  const toggleFilters = useCallback(() => {
    setIsFilterVisible(!isFilterVisible);
  }, [isFilterVisible]);

  // Implement renderItem function to render JobCard for each job
  const renderItem = useCallback(
    ({ item }: { item: Job }) => (
      <JobCard
        job={item}
        onPress={handleJobPress}
        onApplyPress={handleApplyPress}
        compact={compact}
        testID={`${testID}-job-card-${item.id}`}
      />
    ),
    [handleJobPress, handleApplyPress, compact, testID]
  );

  // Implement renderEmptyState function for when no jobs match filters
  const renderEmptyState = useCallback(() => (
    <Card>
      <View style={styles.emptyContainer}>
        <MaterialIcons name="search" size={48} color="#999" />
        <Text style={styles.emptyText}>No jobs found matching your criteria.</Text>
      </View>
    </Card>
  ), []);

  // Implement renderFooter function to show loading indicator during pagination
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }, [loadingMore]);

  // Implement renderHeader function to conditionally render JobFilters component
  const renderHeader = useCallback(() => (
    <JobFilters
      initialFilters={searchParams}
      onApplyFilters={handleApplyFilters}
      onResetFilters={handleResetFilters}
      isVisible={isFilterVisible}
      onToggleVisibility={toggleFilters}
    />
  ), [searchParams, handleApplyFilters, handleResetFilters, isFilterVisible, toggleFilters]);

  // Return FlatList with appropriate props for job listing
  return (
    <View style={styles.container} testID={testID}>
      {renderHeader()}
      {loading ? (
        <View style={styles.spinnerContainer}>
          <Spinner size={SpinnerSize.LARGE} testID={`${testID}-spinner`} />
        </View>
      ) : error ? (
        <Card>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : (
        <FlatList
          data={jobs}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          style={styles.list}
          contentContainerStyle={styles.listContent}
          testID={testID}
          accessibilityLabel="List of AI Jobs"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: moderateScale(8),
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: moderateScale(16),
  },
  emptyContainer: {
    padding: moderateScale(16),
    alignItems: 'center',
  },
  emptyText: {
    fontSize: moderateScale(16),
    color: '#666',
    marginTop: moderateScale(8),
    textAlign: 'center',
  },
  footer: {
    paddingVertical: moderateScale(20),
    alignItems: 'center',
  },
  spinnerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginVertical: moderateScale(16),
  },
});

export default JobList;