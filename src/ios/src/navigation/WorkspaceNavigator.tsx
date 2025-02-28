import React from 'react'; // react ^18.2.0
import { Platform } from 'react-native'; // react-native 0.72.x
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack'; // @react-navigation/stack ^6.3.17

import WorkspaceScreen from '../screens/workspace/WorkspaceScreen';
import WorkspaceDetailScreen from '../screens/workspace/WorkspaceDetailScreen';
import { Workspace } from '../types/workspace.types';
import useWorkspace from '../hooks/useWorkspace';
import colors from '../styles/colors';

/**
 * Type definition for workspace stack navigator parameters
 */
export type WorkspaceStackParamList = {
  WorkspaceScreen: undefined;
  WorkspaceDetail: { workspaceId: string };
};

/**
 * Main component that defines the workspace navigation stack
 */
const WorkspaceNavigator = (): JSX.Element => {
  // Create workspace stack navigator using createStackNavigator
  const Stack = createStackNavigator<WorkspaceStackParamList>();

  // Define workspace stack navigator screens and their properties
  return (
    <Stack.Navigator
      initialRouteName="WorkspaceScreen"
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background.primary,
        },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        cardStyle: {
          backgroundColor: colors.background.primary,
        },
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      }}
    >
      {/* Configure screen-specific options for each workspace screen */}
      <Stack.Screen
        name="WorkspaceScreen"
        component={WorkspaceScreen}
        options={{
          title: 'Workspaces',
        }}
      />
      <Stack.Screen
        name="WorkspaceDetail"
        component={WorkspaceDetailScreen}
        options={({ route }) => ({
          title: 'Workspace Details',
          headerBackTitleVisible: false,
        })}
      />
    </Stack.Navigator>
  );
};

/**
 * Export the WorkspaceNavigator component for use in the app's navigation structure
 */
export default WorkspaceNavigator;