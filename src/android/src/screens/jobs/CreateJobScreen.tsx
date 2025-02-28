/**
 * AI Talent Marketplace - Create Job Screen (Android)
 *
 * This screen component allows employers to create new job listings in the AI Talent Marketplace Android application.
 * It integrates with the JobForm component to provide a complete job creation experience with validation,
 * file attachments, and error handling.
 *
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react'; // react v18.2.0
import { StyleSheet, View, BackHandler, Alert, StatusBar } from 'react-native'; // react-native v0.72.x
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // @react-navigation/native ^6.1.7
import { NativeStackNavigationProp } from '@react-navigation/native-stack'; // @react-navigation/native-stack ^6.9.13

// Internal imports
import { JobForm, JobFormProps } from '../../components/jobs/JobForm';
import { SafeAreaView, EdgeMode } from '../../components/common/SafeAreaView';
import { useJobs } from '../../hooks/useJobs';
import { JobFormValues } from '../../types/job.types';
import { colors } from '../../styles/colors';
import { layout } from '../../styles/layout';
import { ToastType } from '../../components/common/Toast';

// Define navigation prop type
type Props = {
  navigation: NativeStackNavigationProp<any>;
};

/**
 * Screen component for creating a new job listing
 *
 * @param props Component props
 * @returns Rendered create job screen
 */
const CreateJobScreen: React.FC<Props> = () => {
  // Initialize navigation using useNavigation hook for navigating back upon submission
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  // Initialize useJobs hook to access job creation functionality
  const { createJob } = useJobs();

  // Set up local toast state to track toast visibility and messages
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({
    visible: false,
    message: '',
    type: ToastType.SUCCESS,
  });

  /**
   * Displays a toast notification
   *
   * @param message The message to display
   * @param type The type of toast notification
   * @param duration The duration to display the toast for
   * @returns A function that clears any existing timeout to prevent memory leaks
   */
  const showToast = useCallback((message: string, type: ToastType, duration: number = 3000): void => {
    // Set toast state with message and type
    setToast({ visible: true, message, type });

    // Set up timer to clear toast after duration
    const timer = setTimeout(() => {
      setToast({ visible: false, message: '', type: ToastType.SUCCESS });
    }, duration);

    // Return function that clears any existing timeout to prevent memory leaks
    return () => clearTimeout(timer);
  }, []);

  /**
   * Handles job form submission
   *
   * @param formValues The values from the job form
   * @returns A promise that resolves when the submission is complete
   */
  const handleSubmit = useCallback(async (formValues: JobFormValues): Promise<void> => {
    try {
      // Show loading state
      // setLoading(true);

      // Call createJob function from useJobs hook with form values
      await createJob(formValues);

      // Handle successful job creation with toast message
      showToast('Job created successfully!', ToastType.SUCCESS);

      // Navigate back to Jobs screen after successful creation
      navigation.goBack();
    } catch (error: any) {
      // Handle errors with appropriate toast message
      showToast(`Failed to create job: ${error.message}`, ToastType.ERROR);
    } finally {
      // Hide loading state
      // setLoading(false);
    }
  }, [createJob, navigation, showToast]);

  /**
   * Handles back button press with confirmation prompt
   *
   * @returns A boolean indicating whether the back action was handled
   */
  const handleBackPress = useCallback((): boolean => {
    // Show confirmation Alert to user about discarding changes
    Alert.alert(
      'Discard Changes?',
      'Are you sure you want to discard your changes?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            // If user confirms, navigate back to Jobs screen
            navigation.goBack();
          },
        },
      ],
      { cancelable: true }
    );

    // Return true to indicate back action was handled
    return true;
  }, [navigation]);

  // Set up back button handling with confirmation dialog using useFocusEffect
  useFocusEffect(
    useCallback(() => {
      BackHandler.addEventListener('hardwareBackPress', handleBackPress);

      return () =>
        BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
    }, [handleBackPress])
  );

  /**
   * Handles the cancel action
   */
  const handleCancel = useCallback(() => {
    handleBackPress();
  }, [handleBackPress]);

  // JobForm props
  const jobFormProps: JobFormProps = {
    onSubmit: handleSubmit,
    onCancel: handleCancel,
    showToast: showToast,
  };

  // Render SafeAreaView container with StatusBar configuration
  return (
    <SafeAreaView style={styles.safeArea} edges={EdgeMode.ALL}>
      <StatusBar backgroundColor={colors.background.primary} barStyle="dark-content" />

      {/* Render JobForm component passing handlers and props */}
      <View style={layout.container}>
        <JobForm {...jobFormProps} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
});

// Export the complete screen structure with proper styling
export default CreateJobScreen;