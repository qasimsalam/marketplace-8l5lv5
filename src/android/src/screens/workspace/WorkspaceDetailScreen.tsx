import React, { useState, useEffect, useCallback, useMemo } from 'react'; // ^18.2.0
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Share,
} from 'react-native'; // ^0.72.4
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native'; // ^6.1.7
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // ^9.2.0
import {
  Workspace,
  WorkspacePermissions,
  WorkspaceMember,
  WorkspaceRole,
  Milestone,
} from '../../types/workspace.types';
import useWorkspace from '../../hooks/useWorkspace';
import useAuth from '../../hooks/useAuth';
import CollaborationTools from '../../components/workspace/CollaborationTools';
import { Button, ButtonVariant, ButtonSize } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import Avatar, { AvatarSize } from '../../components/common/Avatar';
import SafeAreaView from '../../components/common/SafeAreaView';
import { colors } from '../../styles/colors';
import { spacing, shadow } from '../../styles/layout';
import { formatDate } from '../../utils/date';

/**
 * Main component that displays a detailed view of a workspace with collaboration tools
 * @returns {JSX.Element} Rendered workspace detail screen
 */
const WorkspaceDetailScreen: React.FC = () => {
  // Extract workspaceId from route params using useRoute
  const { params } = useRoute<any>();
  const { workspaceId } = params;

  // Get navigation object using useNavigation
  const navigation = useNavigation();

  // Initialize states for refreshing, loading, error, and showMemberList
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMemberList, setShowMemberList] = useState(false);

  // Access workspace state and functions from useWorkspace hook
  const { workspaceState, getWorkspace, joinWorkspace, leaveWorkspace, refreshWorkspaces, updateWorkspace, markMessagesAsRead } = useWorkspace();

  // Access user authentication state from useAuth hook
  const { user, hasPermission } = useAuth();

  // Create memoized workspace data from workspaceState
  const workspace = useMemo(() => workspaceState.currentWorkspace, [workspaceState.currentWorkspace]);

  // Set up useFocusEffect to fetch workspace data and join workspace when screen is focused
  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
          // Fetch workspace data
          await getWorkspace(workspaceId);

          // Join the workspace
          await joinWorkspace(workspaceId);

          // Mark messages as read
          await markMessagesAsRead(workspaceId);
        } catch (e: any) {
          setError(e.message || 'Failed to load workspace');
        } finally {
          setLoading(false);
        }
      };

      fetchData();

      return () => {
        leaveWorkspace();
      };
    }, [workspaceId, getWorkspace, joinWorkspace, leaveWorkspace, markMessagesAsRead])
  );

  // Implement refresh handler for pull-to-refresh functionality
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWorkspaces();
    } catch (e: any) {
      setError(e.message || 'Failed to refresh workspaces');
    } finally {
      setRefreshing(false);
    }
  }, [refreshWorkspaces]);

  // Implement workspace update handler for editing workspace details
  const handleUpdateWorkspace = useCallback(async (updatedData: Partial<Workspace>) => {
    try {
      if (workspace) {
        await updateWorkspace(workspace.id, updatedData);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to update workspace');
    }
  }, [updateWorkspace, workspace]);

  // Implement share functionality for inviting others to the workspace
  const handleShare = useCallback(async (workspace: Workspace) => {
    // Generate invitation link with workspace ID
    const inviteLink = `https://talentmarketplace.ai/workspace/${workspace.id}/invite`;

    try {
      // Use React Native Share API to open sharing dialog
      await Share.share({
        message: `Join my AI Talent Marketplace workspace: ${inviteLink}`,
        title: `Invite to ${workspace.name} workspace`,
      });
    } catch (error: any) {
      // Handle errors with appropriate alert messages
      Alert.alert('Sharing Error', error.message || 'Could not share the workspace invitation.');
    }
  }, []);

  // Implement navigation header configurations with appropriate actions
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row' }}>
          {hasPermission(WorkspacePermissions.EDIT) && (
            <TouchableOpacity onPress={() => { /* Implement edit action */ }}>
              <MaterialIcons name="edit" size={24} color={colors.primary[500]} style={{ marginRight: 16 }} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => workspace && handleShare(workspace)}>
            <MaterialIcons name="share" size={24} color={colors.primary[500]} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, handleShare, hasPermission, workspace]);

  // Create member access control functions with permission checks
  const canAccessMembers = useMemo(() => hasPermission(WorkspacePermissions.WORKSPACE_VIEW), [hasPermission]);

  // Implement member list rendering with online indicators
  const getMemberStatusIndicator = useCallback((member: WorkspaceMember) => {
    // Check if member is online using isOnline property
    const isOnline = member.isOnline;

    // Return appropriate indicator component with correct styling
    return (
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: isOnline ? colors.success[500] : colors.gray[400],
          marginLeft: 5,
        }}
      />
    );
  }, []);

  // Formats milestone completion percentage for display
  const formatMilestoneProgress = useCallback((milestone: Milestone) => {
    // Extract completion percentage from milestone
    const completionPercentage = milestone?.completionPercentage;

    // Format to include percentage symbol
    return `${completionPercentage}%`;
  }, []);

  // Render an individual member item in the member list
  const renderMemberItem = useCallback((member: WorkspaceMember) => {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 5 }}>
        {/* Render Avatar component with user profile image */}
        <Avatar
          imageUrl={member.user?.avatarUrl}
          name={`${member.user?.firstName} ${member.user?.lastName}`}
          size={AvatarSize.SMALL}
        />
        {/* Render user name and role information */}
        <Text style={{ marginLeft: 10 }}>{member.user?.firstName} {member.user?.lastName} ({member.role})</Text>
        {/* Include online status indicator */}
        {getMemberStatusIndicator(member)}
      </View>
    );
  }, [getMemberStatusIndicator]);

  // Render loading state while fetching workspace data
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  // Render error state with retry option if data fetch fails
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 16, color: colors.error[500], marginBottom: 10 }}>{error}</Text>
        <Button title="Retry" onPress={() => { }} />
      </View>
    );
  }

  // Render workspace header with title, description, and status
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text.primary }}>{workspace?.name}</Text>
          <Text style={{ fontSize: 16, color: colors.text.secondary, marginTop: 5 }}>{workspace?.description}</Text>
          <Text style={{ fontSize: 14, color: colors.gray[500], marginTop: 5 }}>Status: {workspace?.status}</Text>

          {/* Render workspace info section with job details and created date */}
          <Card style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary }}>Job Details</Text>
            <Text style={{ fontSize: 14, color: colors.text.secondary, marginTop: 5 }}>Title: {workspace?.jobTitle}</Text>
            <Text style={{ fontSize: 14, color: colors.text.secondary }}>Created: {formatDate(workspace?.createdAt)}</Text>
          </Card>

          {/* Render milestone progress section with current milestone status */}
          <Card style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary }}>Milestone Progress</Text>
            {workspace?.milestones?.map((milestone) => (
              <View key={milestone.id} style={{ marginTop: 10 }}>
                <Text style={{ fontSize: 16, color: colors.text.primary }}>{milestone.title}</Text>
                <Text style={{ fontSize: 14, color: colors.text.secondary }}>{milestone.description}</Text>
                <Text style={{ fontSize: 14, color: colors.text.secondary }}>Progress: {formatMilestoneProgress(milestone)}</Text>
              </View>
            ))}
          </Card>

          {/* Render member list section with online indicators */}
          {canAccessMembers && (
            <Card style={{ marginTop: 20 }}>
              <TouchableOpacity onPress={() => setShowMemberList(!showMemberList)}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary }}>
                  Members ({workspace?.members?.length})
                </Text>
              </TouchableOpacity>
              {showMemberList && workspace?.members?.map((member) => (
                <View key={member.userId}>
                  {renderMemberItem(member)}
                </View>
              ))}
            </Card>
          )}
        </View>

        {/* Render collaboration tools component with tabbed interface */}
        <CollaborationTools workspaceId={workspaceId} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default WorkspaceDetailScreen;