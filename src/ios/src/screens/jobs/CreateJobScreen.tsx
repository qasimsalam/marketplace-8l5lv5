import React, { useEffect, useState, useCallback } from 'react'; // ^18.2.0
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native'; // 0.72.x
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // ^6.1.7
import { StackNavigationProp } from '@react-navigation/stack'; // ^6.3.17

import { JobFormValues, JobType, JobDifficulty } from '../../types/job.types';
import JobForm from '../../components/jobs/JobForm';
import SafeAreaView from '../../components/common/SafeAreaView';
import useJobs from '../../hooks/useJobs';
import { colors } from '../../styles/colors';
import { textVariants } from '../../styles/typography';

// Define navigation prop type
type CreateJobScreenNavigationProp = StackNavigationProp<
  { CreateJob: undefined },
  'CreateJob'
>;

/**
 * Returns default values for a new job posting
 * @returns Default form values for a new job
 */
const getDefaultJobValues = (): JobFormValues => {
  // Create and return a JobFormValues object with empty/default values for all required fields
  // Set default type to JobType.FIXED_PRICE
  // Set default difficulty to JobDifficulty.INTERMEDIATE
  // Set default isRemote to true
  // Initialize empty arrays for skills and attachments
  // Set start date to current date and end date to 30 days in the future
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + 30);

  return {
    title: '',
    description: '',
    type: JobType.FIXED_PRICE,
    budget: 0,
    minBudget: 0,
    maxBudget: 0,
    hourlyRate: 0,
    estimatedDuration: 7,
    estimatedHours: 0,
    difficulty: JobDifficulty.INTERMEDIATE,
    location: '',
    isRemote: true,
    requiredSkills: [],
    preferredSkills: [],
    attachments: [],
    category: '',
    subcategory: '',
    startDate: startDate,
    endDate: endDate,
  };
};

/**
 * Screen component for creating new job postings
 * @returns Rendered screen component
 */
const CreateJobScreen: React.FC = () => {
  // Initialize navigation hooks for screen navigation
  const navigation = useNavigation<CreateJobScreenNavigationProp>();

  // Get job management functions from useJobs hook (createJob, loading, error, resetError)
  const { createJob, loading, error, resetError } = useJobs();

  // Generate default job values using getDefaultJobValues function
  const initialValues = getDefaultJobValues();

  // Set up state tracking for form submission success
  const [success, setSuccess] = useState(false);

  // Set up error handling with useEffect to show alerts for API errors
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [{ text: 'OK', onPress: resetError }]);
    }
  }, [error, resetError]);

  // Set up screen focus effect to reset error state when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      return () => {
        resetError();
      };
    }, [resetError])
  );

  // Define a handleSuccess function that sets success state and navigates back
  const handleSuccess = useCallback(() => {
    setSuccess(true);
    navigation.goBack();
  }, [navigation]);

  // Render SafeAreaView container with appropriate styles for iOS
  return (
    <SafeAreaView style={styles.container}>
      {/* Render screen title using typography styles */}
      <Text style={styles.header}>Create New Job</Text>

      {/* Render JobForm component with initial values and success callback */}
      <View style={styles.content}>
        <JobForm initialValues={initialValues} onSuccess={handleSuccess} />
      </View>

      {/* Apply loading state handling for form submission */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      )}
    </SafeAreaView>
  );
};

// Define stylesheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    ...textVariants.heading4,
    padding: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Export the CreateJobScreen component as default for use in navigation
export default CreateJobScreen;