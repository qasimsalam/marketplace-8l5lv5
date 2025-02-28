import React from 'react'; // react v18.2.0
import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack'; // @react-navigation/native-stack v6.9.13
import { Platform } from 'react-native'; // react-native v0.72.x
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // react-native-vector-icons/MaterialIcons v9.2.0

// Internal imports
import JobsScreen from '../screens/jobs/JobsScreen';
import JobDetailScreen from '../screens/jobs/JobDetailScreen';
import CreateJobScreen from '../screens/jobs/CreateJobScreen';
import { JobsStackParamList } from '../types/job.types';
import { colors } from '../styles/colors';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/auth.types';

// Create native stack navigator
const JobsStackNavigator = createNativeStackNavigator<JobsStackParamList>();

/**
 * Native stack navigator component for job-related screens optimized for Android
 */
const JobsNavigator: React.FC = () => {
  // Access user authentication state to determine conditional navigation options
  const { user } = useAuth();

  // Set default screen options for consistent styling across all screens
  const defaultScreenOptions: NativeStackNavigationOptions = {
    headerStyle: {
      backgroundColor: colors.background.primary,
    },
    headerTintColor: colors.text.primary,
    headerTitleStyle: {
      fontWeight: 'bold',
    },
    headerBackTitleVisible: false,
    ...(Platform.OS === 'android' && {
      headerTitleAlign: 'center',
    }),
  };

  return (
    <JobsStackNavigator.Navigator screenOptions={defaultScreenOptions}>
      {/* Configure Jobs screen as the initial route with customized header */}
      <JobsStackNavigator.Screen
        name="Jobs"
        component={JobsScreen}
        options={{
          title: 'AI Job Opportunities',
          headerRight: () => (
            <MaterialIcons name="filter-list" size={30} color={colors.primary[500]} />
          ),
        }}
      />

      {/* Configure JobDetail screen with slide animation and dynamic header title */}
      <JobsStackNavigator.Screen
        name="JobDetails"
        component={JobDetailScreen}
        options={({ route }) => ({
          title: 'Job Details',
          headerTitle: route.params?.jobTitle || 'Job Details',
          animationTypeForReplace: 'push',
          animation: 'slide_from_right',
        })}
      />

      {/* Configure CreateJob screen with conditional access based on user role */}
      <JobsStackNavigator.Screen
        name="CreateJob"
        component={CreateJobScreen}
        options={{
          title: 'Create Job',
          headerShown: user?.role === UserRole.EMPLOYER,
        }}
      />
    </JobsStackNavigator.Navigator>
  );
};

export default JobsNavigator;