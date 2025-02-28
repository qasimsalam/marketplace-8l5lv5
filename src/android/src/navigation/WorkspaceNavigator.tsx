import React, { useCallback } from 'react'; // react ^18.2.0
import { createNativeStackNavigator } from '@react-navigation/native-stack'; // @react-navigation/native-stack ^6.9.13
import { HeaderBackButton } from '@react-navigation/elements'; // @react-navigation/elements ^1.3.18
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // react-native-vector-icons/MaterialIcons ^9.2.0
import { Platform, TouchableOpacity } from 'react-native'; // react-native ^0.72.4

// Internal imports
import WorkspaceScreen from '../screens/workspace/WorkspaceScreen';
import WorkspaceDetailScreen from '../screens/workspace/WorkspaceDetailScreen';
import { WorkspaceStackParamList } from '../types/workspace.types';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../styles/colors';

// Create native stack navigator
const Stack = createNativeStackNavigator<WorkspaceStackParamList>();

/**
 * Component for rendering custom header right actions based on screen
 */
const HeaderRight = ({ navigation, route }: { navigation: any; route: any }) => {
  // Determine current screen from route
  const currentRouteName = route.name;

  // Access authentication state using useAuth hook
  const { hasPermission } = useAuth();

  // For WorkspaceScreen, show add/create workspace button if user has permission
  if (currentRouteName === 'WorkspaceList' && hasPermission && hasPermission('workspace:create')) {
    return (
      <TouchableOpacity onPress={() => navigation.navigate('CreateWorkspace')}>
        <MaterialIcons name="add" size={30} color={colors.primary.text} />
      </TouchableOpacity>
    );
  }

  // For WorkspaceDetailScreen, show options button for workspace actions
  if (currentRouteName === 'WorkspaceDetail') {
    return (
      <TouchableOpacity onPress={() => { /* Implement options action */ }}>
        <MaterialIcons name="more-vert" size={30} color={colors.primary.text} />
      </TouchableOpacity>
    );
  }

  // Return null if no actions are available for the current screen
  return null;
};

/**
 * Returns common screen options for all workspace navigator screens
 */
const getCommonScreenOptions = () => {
  return {
    headerStyle: {
      backgroundColor: colors.background.primary,
    },
    headerTitleStyle: {
      fontWeight: 'bold',
      color: colors.text.primary,
    },
    headerTintColor: colors.primary.text,
    animation: 'slide_from_right',
    headerBackTitleVisible: false,
    headerShadowVisible: false,
    headerBackVisible: Platform.OS === 'ios',
  };
};

/**
 * The main navigator component for workspace-related screens
 */
const WorkspaceNavigator: React.FC = () => {
  // Access authentication state using useAuth hook
  const { hasPermission } = useAuth();

  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions()}>
      {/* Configure WorkspaceScreen as the main entry point */}
      <Stack.Screen
        name="WorkspaceList"
        component={WorkspaceScreen}
        options={({ navigation, route }) => ({
          title: 'Workspaces',
          headerRight: () => <HeaderRight navigation={navigation} route={route} />,
        })}
      />

      {/* Configure WorkspaceDetailScreen with dynamic header based on workspace name */}
      <Stack.Screen
        name="WorkspaceDetail"
        component={WorkspaceDetailScreen}
        options={({ route, navigation }) => ({
          title: 'Workspace Details',
          headerRight: () => <HeaderRight navigation={navigation} route={route} />,
          headerBackTitleVisible: false,
        })}
      />
    </Stack.Navigator>
  );
};

// Export WorkspaceNavigator as default component for workspace navigation
export default WorkspaceNavigator;