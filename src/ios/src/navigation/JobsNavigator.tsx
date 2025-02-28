import React from 'react'; // v18.2.0
import { Platform } from 'react-native'; // 0.72.4
import { createStackNavigator, TransitionPresets, CardStyleInterpolators } from '@react-navigation/stack'; // ^6.3.17
import { Ionicons } from 'react-native-vector-icons/Ionicons'; // ^9.0.0

import JobsScreen from '../screens/jobs/JobsScreen';
import JobDetailScreen from '../screens/jobs/JobDetailScreen';
import CreateJobScreen from '../screens/jobs/CreateJobScreen';
import useAuth from '../hooks/useAuth';
import { Permission } from '../types/auth.types';
import { colors } from '../styles/colors';

/**
 * Interface defining the parameter list for the Jobs stack navigator.
 * This helps ensure type safety when navigating between job-related screens.
 */
export interface JobsStackParamList {
  JobsList: undefined;
  JobDetail: { jobId: string };
  CreateJob: undefined;
}

/**
 * Creates and configures the stack navigator for job-related screens
 * @returns Configured stack navigator component
 */
const JobsNavigator = () => {
  // Create stack navigator using createStackNavigator
  const Stack = createStackNavigator<JobsStackParamList>();

  // Get user information and permission checking functionality from useAuth hook
  const { user, hasPermission } = useAuth();

  // Define screenOptions for all screens with consistent styling and animations
  const screenOptions = {
    headerStyle: {
      backgroundColor: colors.background.primary,
    },
    headerTintColor: colors.text.primary,
    headerTitleStyle: {
      fontWeight: 'bold',
    },
    headerBackTitleVisible: false,
    gestureEnabled: true,
    cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
    ...TransitionPresets.SlideFromRightIOS,
  };

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {/* Configure JobsScreen as the initial route */}
      <Stack.Screen
        name="JobsList"
        component={JobsScreen}
        options={{
          title: 'Available Jobs',
        }}
      />

      {/* Configure JobDetailScreen with slide animation and route parameters for job ID */}
      <Stack.Screen
        name="JobDetail"
        component={JobDetailScreen}
        options={({ route }) => ({
          title: `Job Details - ${route.params.jobId}`,
          transitionSpec: {
            open: config => ({ ...config, animation: 'spring', config: { stiffness: 1000, damping: 500, mass: 3, overshootClamping: true, restDisplacementThreshold: 0.01, restSpeedThreshold: 0.01 } }),
            close: config => ({ ...config, animation: 'spring', config: { stiffness: 1000, damping: 500, mass: 3, overshootClamping: true, restDisplacementThreshold: 0.01, restSpeedThreshold: 0.01 } }),
          },
        })}
      />

      {/* Conditionally include CreateJobScreen based on user permissions */}
      {hasPermission(Permission.CREATE_JOB) && (
        <Stack.Screen
          name="CreateJob"
          component={CreateJobScreen}
          options={{
            title: 'Create Job',
          }}
        />
      )}
    </Stack.Navigator>
  );
};

/**
 * Export the JobsNavigator component as default for use in the dashboard navigator
 */
export default JobsNavigator;