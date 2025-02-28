import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  RefreshControl, 
  ActivityIndicator 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // ^9.2.0
import Toast from 'react-native-toast-message'; // ^2.1.6

import { 
  Workspace, 
  WorkspaceStatus, 
  WorkspaceFormValues 
} from '../../types/workspace.types';
import useWorkspace from '../../hooks/useWorkspace';
import SafeAreaView, { EdgeMode } from '../../components/common/SafeAreaView';
import Button, { ButtonVariant } from '../../components/common/Button';
import Card, { CardVariant, CardElevation } from '../../components/common/Card';
import Spinner, { SpinnerSize } from '../../components/common/Spinner';
import useAuth from '../../hooks/useAuth';
import colors from '../../styles/colors';
import { formatDate } from '../../utils/date';

/**
 * Main screen component for displaying a list of workspaces
 * Supports viewing, creating, and accessing workspaces for collaboration
 */
const WorkspaceScreen = (): JSX.Element => {
  // Get navigation functions
  const navigation = useNavigation();
  
  // Get authentication state
  const { user } = useAuth();
  
  // Get workspace data and functions from hook
  const { 
    workspaces, 
    loading, 
    error, 
    fetchWorkspaces, 
    createWorkspace,
    deleteWorkspace,
    hasWorkspacePermission
  } = useWorkspace();
  
  // Local state for pull-to-refresh functionality
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // Filter active workspaces
  const activeWorkspaces = useMemo(() => {
    return workspaces?.filter(workspace => workspace.status === WorkspaceStatus.ACTIVE) || [];
  }, [workspaces]);
  
  // Fetch workspaces on component mount
  useEffect(() => {
    fetchWorkspaces().catch(err => {
      console.error('Error fetching workspaces:', err);
    });
  }, [fetchWorkspaces]);
  
  /**
   * Handles the creation of a new workspace
   */
  const handleCreateWorkspace = useCallback(() => {
    // Check if user has permission to create workspace
    if (!hasWorkspacePermission('workspace:edit')) {
      Toast.show({
        type: 'error',
        text1: 'Permission Denied',
        text2: 'You do not have permission to create a workspace',
      });
      return;
    }
    
    // In a real app, this would open a modal or navigate to a form screen
    Alert.prompt(
      'Create Workspace',
      'Enter workspace name:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Create',
          onPress: (name) => {
            if (!name?.trim()) {
              Toast.show({
                type: 'error',
                text1: 'Invalid Input',
                text2: 'Workspace name is required',
              });
              return;
            }
            
            // Construct workspace data
            const workspaceData: WorkspaceFormValues = {
              name: name.trim(),
              description: '',
              contractId: '',
              jobId: '',
              members: []
            };
            
            // Create workspace with API
            createWorkspace(workspaceData)
              .then((workspace) => {
                Toast.show({
                  type: 'success',
                  text1: 'Success',
                  text2: 'Workspace created successfully',
                });
                
                // Navigate to the new workspace
                navigation.navigate('WorkspaceDetail', { workspaceId: workspace.id });
              })
              .catch((err) => {
                console.error('Error creating workspace:', err);
                Toast.show({
                  type: 'error',
                  text1: 'Error',
                  text2: 'Failed to create workspace. Please try again.',
                });
              });
          },
        },
      ],
      'plain-text'
    );
  }, [createWorkspace, hasWorkspacePermission, navigation]);
  
  /**
   * Handles the deletion of an existing workspace
   * @param workspaceId - ID of the workspace to delete
   */
  const handleDeleteWorkspace = useCallback((workspaceId: string) => {
    // Show confirmation dialog
    Alert.alert(
      'Delete Workspace',
      'Are you sure you want to delete this workspace? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Delete workspace with API
            deleteWorkspace(workspaceId)
              .then(() => {
                Toast.show({
                  type: 'success',
                  text1: 'Success',
                  text2: 'Workspace deleted successfully',
                });
              })
              .catch((err) => {
                console.error('Error deleting workspace:', err);
                Toast.show({
                  type: 'error',
                  text1: 'Error',
                  text2: 'Failed to delete workspace. Please try again.',
                });
              });
          },
        },
      ]
    );
  }, [deleteWorkspace]);
  
  /**
   * Handles pull-to-refresh action to reload workspaces
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchWorkspaces();
    } catch (err) {
      console.error('Error refreshing workspaces:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to refresh workspaces. Please try again.',
      });
    } finally {
      setRefreshing(false);
    }
  }, [fetchWorkspaces]);
  
  /**
   * Renders an individual workspace item in the list
   * @param item - Workspace object to render
   */
  const renderItem = useCallback(({ item }: { item: Workspace }) => {
    // Check if user has permission to manage the workspace
    const canManageWorkspace = hasWorkspacePermission('workspace:edit');
    
    return (
      <Card 
        variant={CardVariant.INTERACTIVE}
        elevation={CardElevation.LOW}
        onPress={() => navigation.navigate('WorkspaceDetail', { workspaceId: item.id })}
        style={styles.workspaceCard}
        testID={`workspace-item-${item.id}`}
      >
        <View>
          <Text style={styles.workspaceName} numberOfLines={1} ellipsizeMode="tail">
            {item.name}
          </Text>
          
          {item.description ? (
            <Text style={styles.workspaceDescription} numberOfLines={2} ellipsizeMode="tail">
              {item.description}
            </Text>
          ) : null}
          
          <View style={styles.workspaceInfo}>
            <View style={styles.statusIndicator}>
              <Icon 
                name="circle" 
                size={12} 
                color={item.status === WorkspaceStatus.ACTIVE ? colors.success[500] : colors.gray[400]} 
              />
              <Text style={styles.statusText}>
                {item.status === WorkspaceStatus.ACTIVE ? 'Active' : 'Inactive'}
              </Text>
            </View>
            
            <Text style={styles.workspaceDate}>
              Created {formatDate(item.createdAt)}
            </Text>
          </View>
          
          {canManageWorkspace && (
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                onPress={() => handleDeleteWorkspace(item.id)}
                style={styles.deleteButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                testID={`delete-workspace-${item.id}`}
              >
                <Icon name="delete-outline" size={20} color={colors.error[500]} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Card>
    );
  }, [navigation, handleDeleteWorkspace, hasWorkspacePermission]);
  
  /**
   * Renders the empty state when no workspaces are available
   */
  const renderEmptyWorkspaces = useCallback(() => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyState} testID="empty-workspaces">
        <Icon name="desk" size={60} color={colors.gray[400]} />
        <Text style={styles.emptyStateTitle}>No Workspaces Found</Text>
        <Text style={styles.emptyStateDescription}>
          You don't have any workspaces yet. Create a new workspace to start collaborating on AI projects.
        </Text>
        
        {hasWorkspacePermission('workspace:edit') && (
          <Button 
            text="Create Workspace" 
            variant={ButtonVariant.PRIMARY}
            onPress={handleCreateWorkspace}
            style={styles.createButton}
            testID="create-workspace-button"
          />
        )}
      </View>
    );
  }, [loading, handleCreateWorkspace, hasWorkspacePermission]);
  
  return (
    <SafeAreaView edges={EdgeMode.ALL} style={styles.container} testID="workspace-screen">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Workspaces</Text>
        
        {hasWorkspacePermission('workspace:edit') && (
          <Button
            text="Create"
            variant={ButtonVariant.PRIMARY}
            onPress={handleCreateWorkspace}
            testID="create-workspace-header-button"
          />
        )}
      </View>
      
      {/* Error state */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {/* Loading state */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <Spinner size={SpinnerSize.LARGE} />
        </View>
      ) : (
        /* Workspace list */
        <FlatList
          data={activeWorkspaces}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.workspaceList}
          ListEmptyComponent={renderEmptyWorkspaces}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary[600]]}
              tintColor={colors.primary[600]}
            />
          }
          testID="workspace-list"
        />
      )}
    </SafeAreaView>
  );
};

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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
  },
  workspaceList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  workspaceCard: {
    marginVertical: 8,
  },
  workspaceName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  workspaceDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  workspaceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginLeft: 4,
  },
  workspaceDate: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  actionButtons: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
  },
  deleteButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    marginTop: 16,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: colors.error[50],
    borderRadius: 8,
    margin: 16,
  },
  errorText: {
    color: colors.error[700],
    fontSize: 14,
  },
});

export default WorkspaceScreen;