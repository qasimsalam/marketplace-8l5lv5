/**
 * JobList Component
 *
 * A versatile and performant job listing component for the AI Talent Marketplace
 * Android application that renders a FlatList of job cards with pull-to-refresh
 * functionality, pagination, filtering options, and appropriate loading/empty states.
 *
 * @version 1.0.0
 */

import React, {
  useState,
  useEffect,
  useCallback,
} from 'react'; // react v18.x.x
import {
  FlatList,
  View,
  StyleSheet,
  Text,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native'; // react-native v0.72.x
import { useNavigation } from '@react-navigation/native'; // @react-navigation/native v6.1.7

// Internal imports
import JobCard from './JobCard';
import JobFilters from './JobFilters';
import Spinner, { SpinnerSize } from '../common/Spinner';
import Button, { ButtonVariant, ButtonSize } from '../common/Button';
import { useJobs } from '../../hooks/useJobs';
import {
  Job,
  JobListItemData,
  JobFilterOptions,
  JobSearchParams,
} from '../../types/job.types';

/**
 * Interface defining props for the JobList component
 */
export interface JobListProps {
  /** Initial search parameters */
  initialParams?: JobSearchParams;
  /** Filter options for the job list */
  filterOptions?: JobFilterOptions;
  /** Whether to show the filter panel initially */
  showFilters?: boolean;
  /** Callback function when filter changes */
  onFilterChange?: (filters: JobFilterOptions) => void;
  /** Callback function when refresh is triggered */
  onRefresh?: () => void;
  /** Style for the container */
  containerStyle?: StyleProp<ViewStyle>;
  /** Style for the list */
  listStyle?: StyleProp<ViewStyle>;
  /** Header component for the list */
  headerComponent?: React.ReactNode;
  /** Footer component for the list */
  footerComponent?: React.ReactNode;
  /** Test ID for testing */
  testID?: string;
}

/**
 * A component for displaying a list of AI jobs with filtering, pagination and pull-to-refresh capabilities
 */
const JobList: React.FC<JobListProps> = ({
  initialParams,
  filterOptions,
  showFilters = false,
  onFilterChange,
  onRefresh,
  containerStyle,
  listStyle,
  headerComponent,
  footerComponent,
  testID = 'job-list',
}) => {
  // Get navigation object using useNavigation hook
  const navigation = useNavigation();

  // Initialize useJobs hook for job data management
  const { jobsState, getJobs, refreshJobs, applyFilters } = useJobs();

  // Set up local state for filter panel visibility, search params, and selection state
  const [isFilterVisible, setIsFilterVisible] = useState(showFilters);
  const [searchParams, setSearchParams] = useState<JobSearchParams>(
    initialParams || {}
  );
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Use useEffect to fetch jobs when component mounts or search params change
  useEffect(() => {
    getJobs(searchParams);
  }, [searchParams, getJobs]);

  // Implement handleRefresh to refresh job listings with pull-to-refresh
  const handleRefresh = useCallback(() => {
    refreshJobs(searchParams);
    if (onRefresh) {
      onRefresh();
    }
  }, [refreshJobs, searchParams, onRefresh]);

  // Implement handleLoadMore for pagination when user scrolls to bottom
  const handleLoadMore = useCallback(() => {
    if (jobsState.currentPage < jobsState.totalPages) {
      setSearchParams((prevParams) => ({
        ...prevParams,
        page: prevParams.page ? prevParams.page + 1 : 2,
      }));
    }
  }, [jobsState.currentPage, jobsState.totalPages, setSearchParams]);

  // Implement handleFilterChange to update filter state
  const handleFilterChange = useCallback(
    (filters: JobFilterOptions) => {
      applyFilters(filters);
      if (onFilterChange) {
        onFilterChange(filters);
      }
    },
    [applyFilters, onFilterChange]
  );

  // Implement handleJobPress to navigate to job details screen
  const handleJobPress = useCallback(
    (jobId: string) => {
      setSelectedJobId(jobId);
      navigation.navigate('JobDetails', { jobId });
    },
    [navigation]
  );

  // Implement renderItem to render JobCard components in FlatList
  const renderItem = useCallback(
    ({ item }: { item: JobListItemData }) => (
      <JobCard
        job={item}
        onPress={handleJobPress}
        testID={`${testID}-job-card-${item.id}`}
      />
    ),
    [handleJobPress, testID]
  );

  // Implement renderFooter to show loading indicator or load more button
  const renderFooter = useCallback(() => {
    if (jobsState.loading && jobsState.jobs.length > 0) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      );
    }

    if (jobsState.currentPage < jobsState.totalPages) {
      return (
        <View style={styles.footer}>
          <Button
            title="Load More"
            variant={ButtonVariant.OUTLINE}
            size={ButtonSize.MEDIUM}
            onPress={handleLoadMore}
            isDisabled={jobsState.loading}
            testID={`${testID}-load-more-button`}
          />
        </View>
      );
    }

    return null;
  }, [jobsState, handleLoadMore, testID]);

  // Implement renderEmptyState when no jobs match filters
  const renderEmptyState = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No jobs found.</Text>
      </View>
    ),
    []
  );

  // Render JobFilters component when filter panel is visible
  const renderFilters = useCallback(
    () => (
      <JobFilters
        initialFilters={filterOptions}
        options={{ skills: [], categories: [] }}
        onFilterChange={handleFilterChange}
        containerStyle={styles.filterContainer}
      />
    ),
    [filterOptions, handleFilterChange]
  );

  // Render FlatList with JobCard items, pull-to-refresh, and load more
  return (
    <View style={[styles.container, containerStyle]}>
      {headerComponent}
      {isFilterVisible && renderFilters()}
      <FlatList
        data={jobsState.jobs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={jobsState.refreshing}
            onRefresh={handleRefresh}
          />
        }
        style={[styles.list, listStyle]}
        testID={testID}
      />
      {footerComponent}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  },
  filterContainer: {
    marginBottom: 10,
  },
});

export default JobList;