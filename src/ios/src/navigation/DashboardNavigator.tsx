import React from 'react'; // react ^18.2.0
import { Platform } from 'react-native'; // 0.72.4
import { createBottomTabNavigator, BottomTabNavigationOptions } from '@react-navigation/bottom-tabs'; // @react-navigation/bottom-tabs ^6.5.8
import Ionicons from 'react-native-vector-icons/Ionicons'; // react-native-vector-icons/Ionicons ^9.0.0

// Internal imports
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import JobsNavigator from './JobsNavigator';
import MessagesNavigator from './MessagesNavigator';
import WorkspaceNavigator from './WorkspaceNavigator';
import ProfileNavigator from './ProfileNavigator';
import useAuth from '../hooks/useAuth';
import { Permission } from '../types/auth.types';
import { UserRole } from '../types/profile.types';
import { colors } from '../styles/colors';

// Define the parameter list for the bottom tab navigator
export interface DashboardTabParamList {
  Dashboard: undefined;
  Jobs: undefined;
  Messages: undefined;
  Workspace: undefined;
  Profile: undefined;
}

// Create the bottom tab navigator
const Tab = createBottomTabNavigator<DashboardTabParamList>();

/**
 * Creates and configures the bottom tab navigator for the main application flow
 * @returns Configured bottom tab navigator component
 */
const DashboardNavigator: React.FC = () => {
  // Get user information and permission checking functionality from useAuth hook
  const { user, hasPermission } = useAuth();

  // Define screenOptions for all tabs with consistent styling
  const screenOptions: BottomTabNavigationOptions = {
    headerShown: false,
    tabBarActiveTintColor: colors.primary[500],
    tabBarInactiveTintColor: colors.gray[500],
    tabBarStyle: {
      backgroundColor: colors.background.primary,
      borderTopWidth: 0,
    },
    tabBarLabelStyle: {
      fontSize: 12,
    },
  };

  return (
    <Tab.Navigator initialRouteName="Dashboard" screenOptions={screenOptions}>
      {/* Configure Dashboard tab with DashboardScreen component */}
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={getTabIcon('Dashboard', focused)} size={size} color={color} />
          ),
        }}
      />

      {/* Configure Jobs tab with JobsNavigator component */}
      <Tab.Screen
        name="Jobs"
        component={JobsNavigator}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={getTabIcon('Jobs', focused)} size={size} color={color} />
          ),
        }}
      />

      {/* Configure Messages tab with MessagesNavigator component */}
      <Tab.Screen
        name="Messages"
        component={MessagesNavigator}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={getTabIcon('Messages', focused)} size={size} color={color} />
          ),
        }}
      />

      {/* Conditionally render Workspace tab based on user permissions */}
      {hasPermission(Permission.WORKSPACE_VIEW) && (
        <Tab.Screen
          name="Workspace"
          component={WorkspaceNavigator}
          options={{
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={getTabIcon('Workspace', focused)} size={size} color={color} />
            ),
          }}
        />
      )}

      {/* Configure Profile tab with ProfileNavigator component */}
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={getTabIcon('Profile', focused)} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * Function to determine the appropriate icon for each tab based on route name and focus state
 * @param routeName - The name of the route
 * @param focused - Whether the tab is currently focused
 * @returns The name of the Ionicons icon to use
 */
const getTabIcon = (routeName: string, focused: boolean): string => {
  switch (routeName) {
    case 'Dashboard':
      return focused ? 'home' : 'home-outline';
    case 'Jobs':
      return focused ? 'briefcase' : 'briefcase-outline';
    case 'Messages':
      return focused ? 'chatbubbles' : 'chatbubbles-outline';
    case 'Workspace':
      return focused ? 'folder' : 'folder-outline';
    case 'Profile':
      return focused ? 'person' : 'person-outline';
    default:
      return 'alert-circle-outline';
  }
};

/**
 * Export the DashboardNavigator component as default for use in the root navigator
 */
export default DashboardNavigator;