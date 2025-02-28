import React, { useState, useEffect, useCallback, useMemo } from 'react'; // react ^18.2.0
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  FlatList,
  StyleProp,
  ViewStyle,
} from 'react-native'; // react-native 0.72.x
import { useRoute, useNavigation } from '@react-navigation/native'; // @react-navigation/native ^6.1.7
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // react-native-vector-icons/MaterialCommunityIcons ^9.2.0
import { TabView, TabBar } from 'react-native-tab-view'; // react-native-tab-view ^3.5.1

import {
  Workspace,
  Notebook,
  WorkspaceFile,
  WorkspacePermissions,
  WorkspaceSocketEvent,
} from '../../types/workspace.types';
import useWorkspace from '../../hooks/useWorkspace';
import FileExplorer from './FileExplorer';
import JupyterNotebook from './JupyterNotebook';
import Button, { ButtonVariant, ButtonSize } from '../common/Button';
import Card, { CardVariant, CardElevation } from '../common/Card';
import Spinner from '../common/Spinner';
import SafeAreaView from '../common/SafeAreaView';
import useResponsive from '../../hooks/useResponsive';
import colors from '../../styles/colors';

// Define global collaboration tools array
const COLLABORATION_TOOLS = [
  { id: 'files', name: 'Files', icon: 'file-multiple', component: FileExplorer },
  { id: 'notebooks', name: 'Notebooks', icon: 'notebook', component: JupyterNotebook },
  { id: 'messages', name: 'Messages', icon: 'message-text', component: null },
];

/**
 * Interface defining props for the CollaborationTools component
 */
export interface CollaborationToolsProps {
  /**
   * The ID of the workspace
   */
  workspaceId?: string;
  /**
   * The ID of the initial tool to display
   */
  initialTool?: string;
  /**
   * Optional styles for the component
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * Renders a list of currently active users in the workspace
 * @param activeUsers - Record of active users in the workspace
 * @returns Rendered active users component
 */
const renderActiveUsers = (activeUsers: Record<string, { userId: string; lastActive: Date }>): JSX.Element => {
  // Filter users that were active in the last 15 minutes
  const activeThreshold = new Date(Date.now() - 15 * 60 * 1000);
  const recentUsers = Object.values(activeUsers).filter(user => user.lastActive > activeThreshold);

  // Sort users by last active timestamp, most recent first
  recentUsers.sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());

  // Limit displayed users to maximum of 5
  const displayedUsers = recentUsers.slice(0, 5);

  return (
    <View style={styles.activeUsersContainer}>
      {displayedUsers.map(user => (
        <View key={user.userId} style={styles.activeUser}>
          {/* Render avatar or initials for each active user */}
          <Text>{user.userId.substring(0, 2).toUpperCase()}</Text>
          {/* Add indicator for currently typing/active users */}
        </View>
      ))}
      {recentUsers.length > 5 && (
        <Text style={styles.additionalUsers}>+{recentUsers.length - 5}</Text>
      )}
    </View>
  );
};

/**
 * Renders tab navigation for different collaboration tools
 * @param workspaceId - The ID of the workspace
 * @param activeTab - The index of the currently active tab
 * @param setActiveTab - Function to set the active tab index
 * @returns Rendered tab navigation component
 */
const renderToolTabs = (workspaceId: string, activeTab: number, setActiveTab: (index: number) => void): JSX.Element => {
  // Filter tools based on user permissions
  const availableTools = COLLABORATION_TOOLS.filter(tool => {
    // Add permission checks here based on tool.id
    return true; // Replace with actual permission checks
  });

  // Create tab configuration objects for TabView
  const routes = availableTools.map(tool => ({ key: tool.id, title: tool.name }));

  return (
    <TabView
      navigationState={{ index: activeTab, routes }}
      renderScene={({ route }) => {
        // Render the content for the selected tool
        return renderToolContent(workspaceId, route.key);
      }}
      onIndexChange={setActiveTab}
      renderTabBar={(props) => (
        <TabBar
          {...props}
          style={styles.tabBar}
          tabStyle={styles.tab}
          indicatorStyle={styles.tabIndicator}
          renderLabel={({ route, focused }) => (
            <View style={styles.tabLabelContainer}>
              <Icon name={COLLABORATION_TOOLS.find(tool => tool.id === route.key)?.icon || 'help'} size={24} color={focused ? colors.primary[600] : colors.text.secondary} />
              <Text style={[styles.tabLabel, { color: focused ? colors.primary[600] : colors.text.secondary }]}>
                {route.title}
              </Text>
            </View>
          )}
        />
      )}
    />
  );
};

/**
 * Renders the content for the selected collaboration tool
 * @param workspaceId - The ID of the workspace
 * @param toolId - The ID of the selected tool
 * @returns Rendered content for the selected tool
 */
const renderToolContent = (workspaceId: string, toolId: string): JSX.Element => {
  // Find the tool component by toolId
  const tool = COLLABORATION_TOOLS.find(tool => tool.id === toolId);

  if (tool?.component === FileExplorer) {
    // If tool is FileExplorer, render it with workspaceId prop
    return <FileExplorer workspaceId={workspaceId} />;
  } else if (tool?.component === JupyterNotebook) {
    // If tool is JupyterNotebook, render notebook selection or active notebook
    return <JupyterNotebook workspaceId={workspaceId} notebookId={''} onNotebookSelect={() => {}} onClose={() => {}}/>;
  } else if (tool?.name === 'Messages') {
    // If tool is Messages, render messaging interface (to be implemented)
    return <Text>Coming Soon</Text>;
  } else {
    // Show 'Coming Soon' placeholder for unimplemented tools
    return <Text>Coming Soon</Text>;
  }
};

/**
 * Main component that provides access to various collaboration tools within a workspace
 * @param props - Props for the CollaborationTools component
 * @returns Rendered collaboration tools component
 */
const CollaborationTools: React.FC<CollaborationToolsProps> = (props) => {
  // Extract workspaceId from props or route params
  const route = useRoute();
  const workspaceId = props.workspaceId || route.params?.workspaceId as string;

  // Access workspace state and methods using useWorkspace hook
  const { currentWorkspace, activeUsers, isOffline, joinWorkspace, leaveWorkspace } = useWorkspace();

  // Initialize state for active tab
  const [activeTab, setActiveTab] = useState(0);

  // Access responsive design utilities
  const { moderateScale, isSmallDevice } = useResponsive();

  // Set up effect to join workspace WebSocket room on component mount
  useEffect(() => {
    if (workspaceId) {
      joinWorkspace(workspaceId);
    }

    // Set up effect to leave workspace WebSocket room on unmount
    return () => {
      if (workspaceId) {
        leaveWorkspace();
      }
    };
  }, [workspaceId, joinWorkspace, leaveWorkspace]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Header with workspace name and active users */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {currentWorkspace ? currentWorkspace.name : 'Workspace'}
          </Text>
          {activeUsers && renderActiveUsers(activeUsers)}
        </View>

        {/* Offline mode banner */}
        {isOffline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>Offline Mode</Text>
          </View>
        )}

        {/* Tabs for navigating between collaboration tools */}
        {currentWorkspace && renderToolTabs(currentWorkspace.id, activeTab, setActiveTab)}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  container: {
    flex: 1,
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  activeUsersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeUser: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  additionalUsers: {
    fontSize: 14,
    color: '#666',
  },
  offlineBanner: {
    backgroundColor: '#f00',
    padding: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  offlineText: {
    color: '#fff',
  },
  tabBar: {
    backgroundColor: colors.background.secondary,
  },
  tab: {
    width: 100,
  },
  tabIndicator: {
    backgroundColor: colors.primary[600],
  },
  tabLabelContainer: {
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
});

export default CollaborationTools;