import React, { useState, useEffect, useCallback, useMemo } from 'react'; // v18.2.0
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native'; // 0.72.x
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // ^6.1.6
import { StackNavigationProp } from '@react-navigation/stack'; // ^6.3.17
import { Ionicons } from '@expo/vector-icons'; // ^13.0.0

import JobList from '../../components/jobs/JobList';
import { Button, ButtonVariant } from '../../components/common/Button';
import SafeAreaView from '../../components/common/SafeAreaView';
import { JobSearchParams } from '../../types/job.types';
import useJobs from '../../hooks/useJobs';
import useAuth from '../../hooks/useAuth';
import { colors } from '../../styles/colors';

/**
 * Type definition for the navigation prop of the JobsScreen
 */
type JobsScreenNavigationProp = StackNavigationProp<
  { Jobs: undefined; JobDetails: { jobId: string } },
  'Jobs'
>;

/**
 * Main component for displaying the job listings screen in the iOS app
 * @returns Rendered JobsScreen component
 */
const JobsScreen: React.FC = () => {
  // Initialize state for search filters and filter visibility
  const [searchParams, setSearchParams] = useState<Partial<JobSearchParams>>({});
  const [showFilters, setShowFilters] = useState(false);

  // Get job data and operations from useJobs hook
  const { jobs, loading, refreshJobs, canCreateJob } = useJobs();

  // Get authentication status from useAuth hook
  const { isAuthenticated, user } = useAuth();

  // Get navigation object from useNavigation hook
  const navigation = useNavigation<JobsScreenNavigationProp>();

  // Implement useEffect to load initial jobs data when component mounts
  useEffect(() => {
    // Load initial jobs data when the component mounts
  }, []);

  // Implement useFocusEffect to refresh job data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Refresh job data when the screen comes into focus
      refreshJobs(searchParams);
    }, [searchParams, refreshJobs])
  );

  // Create handleCreateJobPress function to navigate to job creation screen
  const handleCreateJobPress = useCallback(() => {
    // Navigate to the job creation screen
    navigation.navigate('JobDetails', { jobId: 'new' });
  }, [navigation]);

  // Create handleJobSelect function to navigate to job details screen
  const handleJobSelect = useCallback((jobId: string) => {
    // Navigate to the job details screen with the selected job ID
    navigation.navigate('JobDetails', { jobId });
  }, [navigation]);

  // Create handleFilterToggle function to show/hide filter panel
  const handleFilterToggle = useCallback(() => {
    // Toggle the visibility of the filter panel
    setShowFilters((prevShowFilters) => !prevShowFilters);
  }, []);

  // Create handleSearchChange function to update search filters
  const handleSearchChange = useCallback((newParams: Partial<JobSearchParams>) => {
    // Update the search parameters
    setSearchParams(newParams);
  }, []);

  // Return SafeAreaView component with proper edge insets
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      {/* Set status bar style */}
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />

      {/* Render screen title and create job button in header area */}
      <View style={styles.header}>
        <Text style={styles.title}>Available Jobs</Text>
        {/* Show create job button only if user has permission to create jobs */}
        {canCreateJob && (
          <TouchableOpacity
            style={styles.createButtonContainer}
            onPress={handleCreateJobPress}
            accessible={true}
            accessibilityLabel="Create New Job"
            accessibilityHint="Navigates to the job creation screen"
          >
            <Button
              text="Create Job"
              variant={ButtonVariant.PRIMARY}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Render JobList component with appropriate props for job listing */}
      <JobList
        initialFilters={searchParams}
        showFilters={showFilters}
        onJobSelect={handleJobSelect}
      />
    </SafeAreaView>
  );
};

// Apply proper spacing, styling, and layout optimized for iOS devices
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  createButtonContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

// Add appropriate accessibility attributes for VoiceOver support
export default JobsScreen;