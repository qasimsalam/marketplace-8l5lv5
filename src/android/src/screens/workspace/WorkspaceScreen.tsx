import React from 'react'; // v18.2.0
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'; // v0.72.x
import { useFocusEffect, useNavigation } from '@react-navigation/native'; // @react-navigation/native
import { NativeStackNavigationProp } from '@react-navigation/native-stack'; // @react-navigation/native-stack
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // react-native-vector-icons/MaterialIcons

// Internal imports
import { SafeAreaView } from '../components/common/SafeAreaView';
import Card from '../components/common/Card';
import { CardVariant, CardElevation } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ButtonVariant, ButtonSize } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { Modal } from '../components/common/Modal';
import { useWorkspace } from '../hooks/useWorkspace';
import { useAuth } from '../hooks/useAuth';
import {
  Workspace,
  WorkspaceStatus,
  WorkspaceListItem,
  WorkspaceFormValues,
  WorkspaceStackParamList,
} from '../types/workspace.types';
import { WorkspacePermissions } from '../types/workspace.types';
import { colors } from '../styles/colors';
import { layout, spacing, shadow } from '../styles/layout';
import { typography } from '../styles/typography';
import { formatDate } from '../utils/date';

/**
 * Type definition for the navigation prop used in this screen
 */
type WorkspaceScreenNavigationProp = NativeStackNavigationProp<
  WorkspaceStackParamList,
  'WorkspaceList'
>;

/**
 * Main component for displaying workspaces in the AI Talent Marketplace Android app
 */
const WorkspaceScreen: React.FC = () => {
  // Access workspace state and functions using useWorkspace hook
  const { workspaceState, getWorkspaces, refreshWorkspaces, createWorkspace } =
    useWorkspace();

  // Access authentication state using useAuth hook
  const { user, hasPermission } = useAuth();

  // Get navigation handler using useNavigation hook
  const navigation = useNavigation<WorkspaceScreenNavigationProp>();

  // Initialize state for search query, refreshing state, modal visibility, and form values
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [refreshing, setRefreshing] = React.useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = React.useState<boolean>(false);
  const [formValues, setFormValues] = React.useState<WorkspaceFormValues>({
    name: '',
    description: '',
    contractId: '',
    jobId: '',
    members: [],
  });

  /**
   * Implement useFocusEffect to fetch workspaces when screen comes into focus
   */
  useFocusEffect(
    React.useCallback(() => {
      // Fetch workspaces when the screen comes into focus
      getWorkspaces();
    }, [getWorkspaces])
  );

  /**
   * Implement filtering logic for workspaces based on search query
   */
  const filteredWorkspaces = React.useMemo(() => {
    return filterWorkspaces(workspaceState.workspaces, searchQuery);
  }, [workspaceState.workspaces, searchQuery]);

  /**
   * Handler for workspace item selection, navigates to the WorkspaceDetail screen
   */
  const handleWorkspacePress = React.useCallback(
    (workspace: WorkspaceListItem) => {
      navigation.navigate('WorkspaceDetail', { workspaceId: workspace.id });
    },
    [navigation]
  );

  /**
   * Handler for pull-to-refresh functionality
   */
  const onRefresh = React.useCallback(async () => {
    handleRefresh(refreshWorkspaces, setRefreshing);
  }, [refreshWorkspaces]);

  /**
   * Handler for search input changes
   */
  const handleSearch = React.useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  /**
   * Handler for showing the workspace creation modal
   */
  const showModal = React.useCallback(() => {
    setIsModalVisible(true);
  }, []);

  /**
   * Handler for hiding the workspace creation modal
   */
  const hideModal = React.useCallback(() => {
    setIsModalVisible(false);
  }, []);

  /**
   * Handler for workspace creation form submission
   */
  const handleSubmit = React.useCallback(async () => {
    await handleCreateWorkspace(formValues, createWorkspace, hideModal);
  }, [formValues, createWorkspace, hideModal]);

  /**
   * Component for rendering an individual workspace item in the list
   */
  const WorkspaceItem: React.FC<{
    workspace: WorkspaceListItem;
    onPress: () => void;
  }> = ({ workspace, onPress }) => {
    // Destructure workspace properties and onPress handler
    const { name, jobTitle, status, memberCount, unreadMessages, updatedAt } =
      workspace;

    // Render a Card component with workspace information
    return (
      <Card onPress={onPress} style={styles.card}>
        <View style={layout.rowBetween}>
          {/* Display workspace name and job title */}
          <View>
            <Text style={typography.heading5}>{name}</Text>
            <Text style={typography.body}>{jobTitle}</Text>
          </View>

          {/* Display workspace status */}
          <Text style={[typography.caption, styles.statusText]}>
            {status}
          </Text>
        </View>

        <View style={styles.metadataContainer}>
          {/* Display member count */}
          <Text style={typography.caption}>Members: {memberCount}</Text>

          {/* Display unread message count */}
          <Text style={typography.caption}>
            Unread: {unreadMessages}
          </Text>

          {/* Display last updated date using formatDate utility */}
          <Text style={typography.caption}>
            Updated: {formatDate(updatedAt)}
          </Text>
        </View>
      </Card>
    );
  };

  // Render SafeAreaView as the main container
  return (
    <SafeAreaView style={styles.container}>
      {/* Render search bar for workspace filtering */}
      <TextInput
        style={styles.searchBar}
        placeholder="Search Workspaces..."
        value={searchQuery}
        onChangeText={handleSearch}
      />

      {/* Render FlatList with workspace items using WorkspaceItem component */}
      {workspaceState.loading ? (
        <ActivityIndicator size="large" color={colors.primary[500]} />
      ) : filteredWorkspaces.length > 0 ? (
        <FlatList
          data={filteredWorkspaces}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WorkspaceItem
              workspace={item}
              onPress={() => handleWorkspacePress(item)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <Text style={styles.emptyText}>No workspaces found.</Text>
      )}

      {/* Render floating action button for workspace creation if user has permission */}
      {hasPermission && hasPermission(WorkspacePermissions.WORKSPACE_CREATE) && (
        <TouchableOpacity style={styles.fab} onPress={showModal}>
          <MaterialIcons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Render workspace creation/editing modal */}
      <Modal visible={isModalVisible} onClose={hideModal} title="Create Workspace">
        <Text>Modal Content</Text>
      </Modal>
    </SafeAreaView>
  );
};

/**
 * Filters workspaces based on search query
 */
const filterWorkspaces = (
  workspaces: WorkspaceListItem[],
  searchQuery: string
): WorkspaceListItem[] => {
  // If search query is empty, return all workspaces
  if (!searchQuery) {
    return workspaces;
  }

  // Convert search query to lowercase for case-insensitive comparison
  const lowerCaseQuery = searchQuery.toLowerCase();

  // Filter workspaces where name or job title contains the search query
  return workspaces.filter(
    (workspace) =>
      workspace.name.toLowerCase().includes(lowerCaseQuery) ||
      workspace.jobTitle.toLowerCase().includes(lowerCaseQuery)
  );
};

/**
 * Handler for pull-to-refresh functionality
 */
const handleRefresh = async (
  refreshWorkspaces: () => Promise<void>,
  setRefreshing: (refreshing: boolean) => void
) => {
  // Set refreshing state to true
  setRefreshing(true);

  try {
    // Call refreshWorkspaces function from useWorkspace hook
    await refreshWorkspaces();
  } catch (error) {
    // Handle any errors during refresh
    console.error('Error refreshing workspaces:', error);
  } finally {
    // Set refreshing state to false when complete
    setRefreshing(false);
  }
};

/**
 * Handles workspace creation form submission
 */
const handleCreateWorkspace = async (
  formValues: WorkspaceFormValues,
  createWorkspace: (data: WorkspaceFormValues) => Promise<Workspace>,
  hideModal: () => void
) => {
  try {
    // Validate form values (name, description, etc.)
    if (!formValues.name || !formValues.description) {
      throw new Error('Name and description are required');
    }

    // Call createWorkspace function from useWorkspace hook with form values
    const newWorkspace = await createWorkspace(formValues);

    // Hide modal on successful creation
    hideModal();
  } catch (error) {
    // Handle and display any errors during creation
    console.error('Error creating workspace:', error);
  }
};

// Apply mobile-optimized styling for all components
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.m,
    backgroundColor: colors.background.primary,
  },
  searchBar: {
    height: 40,
    borderColor: colors.border.default,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: spacing.m,
    paddingHorizontal: spacing.s,
    backgroundColor: colors.background.secondary,
  },
  card: {
    marginBottom: spacing.m,
  },
  statusText: {
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  metadataContainer: {
    marginTop: spacing.s,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary[500],
    borderRadius: 28,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: spacing.l,
    color: colors.text.secondary,
  },
});

// Default export of the WorkspaceScreen component
export default WorkspaceScreen;