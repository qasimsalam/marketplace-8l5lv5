import React, { useState, useEffect, useCallback } from 'react'; // react ^18.2.0
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'; // react-native 0.72.x
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'; // @react-navigation/native ^6.1.7
import { StackNavigationProp } from '@react-navigation/stack'; // @react-navigation/stack ^6.3.17
import Toast from 'react-native-toast-message'; // react-native-toast-message ^2.1.6

import CollaborationTools from '../../components/workspace/CollaborationTools';
import useWorkspace from '../../hooks/useWorkspace';
import { Workspace, WorkspacePermissions } from '../../types/workspace.types';
import SafeAreaView from '../../components/common/SafeAreaView';
import Spinner from '../../components/common/Spinner';
import Button from '../../components/common/Button';
import useAuth from '../../hooks/useAuth';
import useResponsive from '../../hooks/useResponsive';
import colors from '../../styles/colors';

// Define the route parameters type
type WorkspaceDetailRouteParams = {
  workspaceId: string;
};

// Define the route type
type WorkspaceDetailRouteType = RouteProp<
  {
    WorkspaceDetailScreen: WorkspaceDetailRouteParams;
  },
  'WorkspaceDetailScreen'
>;

// Define the navigation type
type WorkspaceDetailNavigationType = StackNavigationProp<any, 'WorkspaceDetailScreen'>;

/**
 * Main component for displaying a detailed workspace view with collaboration tools
 * @returns Rendered workspace detail screen component
 */
const WorkspaceDetailScreen: React.FC = () => {
  // Extract workspaceId from route parameters
  const route = useRoute<WorkspaceDetailRouteType>();
  const { workspaceId } = route.params;

  // Initialize workspace state and operations using useWorkspace hook
  const {
    currentWorkspace,
    loading,
    error,
    fetchWorkspace,
    joinWorkspace,
    leaveWorkspace,
  } = useWorkspace();

  // Initialize navigation for screen transitions
  const navigation = useNavigation<WorkspaceDetailNavigationType>();

  // Check if user has permission to view workspace
  const { hasPermission } = useAuth();
  const hasWorkspaceViewPermission = hasPermission(WorkspacePermissions.WORKSPACE_VIEW);

  // State for refreshing
  const [refreshing, setRefreshing] = useState(false);

  // Access responsive design utilities
  const { moderateScale } = useResponsive();

  // Set up effect to fetch workspace data on component mount
  useEffect(() => {
    if (workspaceId) {
      fetchWorkspace(workspaceId);
    }
  }, [workspaceId, fetchWorkspace]);

  // Set up effect to join workspace for real-time collaboration on mount
  useEffect(() => {
    if (workspaceId) {
      joinWorkspace(workspaceId);
    }

    // Set up effect to leave workspace on component unmount
    return () => {
      leaveWorkspace();
    };
  }, [workspaceId, joinWorkspace, leaveWorkspace]);

  // Implement refresh function to reload workspace data
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWorkspace(workspaceId)
      .finally(() => setRefreshing(false));
  }, [fetchWorkspace, workspaceId]);

  // Handle error state with appropriate UI feedback
  if (error) {
    return renderErrorState(error, () => fetchWorkspace(workspaceId));
  }

  // Handle loading state with Spinner component
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Spinner size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // Handle permission denied state with appropriate message
  if (!hasWorkspaceViewPermission) {
    return renderPermissionDenied();
  }

  // Render workspace header with name and status
  // Render CollaborationTools component with workspaceId
  // Apply responsive styles for different iOS device sizes
  // Implement pull-to-refresh for updating workspace data
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {currentWorkspace && (
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{currentWorkspace.name}</Text>
            <Text style={styles.headerStatus}>Status: {currentWorkspace.status}</Text>
          </View>
        )}
        {workspaceId && (
          <CollaborationTools workspaceId={workspaceId} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

/**
 * Renders an error state when workspace loading fails
 * @param error - The error message
 * @param onRetry - Function to call to retry loading
 * @returns Error state UI with retry option
 */
const renderErrorState = (error: string, onRetry: () => void): JSX.Element => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Button text="Retry" onPress={onRetry} />
      </View>
    </SafeAreaView>
  );
};

/**
 * Renders a permission denied state when user lacks access
 * @returns Permission denied UI with back option
 */
const renderPermissionDenied = (): JSX.Element => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.permissionDeniedContainer}>
        <Text style={styles.permissionDeniedText}>Permission Denied</Text>
        <Text style={styles.permissionDeniedSubtext}>You do not have permission to view this workspace.</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollViewContent: {
    flexGrow: 1,
    padding: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.error[600],
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionDeniedText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  permissionDeniedSubtext: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  headerStatus: {
    fontSize: 16,
    color: colors.text.secondary,
  },
});

export default WorkspaceDetailScreen;