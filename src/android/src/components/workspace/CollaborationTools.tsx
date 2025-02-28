import React from 'react'; // ^18.2.0
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  StyleProp,
} from 'react'; // ^18.2.0
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ViewStyle,
} from 'react-native'; // 0.72.x
import { SafeAreaView } from 'react-native-safe-area-context'; // ^4.6.3
import { useFocusEffect } from '@react-navigation/native'; // ^6.1.7
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // ^9.2.0
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'; // ^6.6.3

// Internal imports
import JupyterNotebook from './JupyterNotebook';
import FileExplorer from './FileExplorer';
import { MessageList } from '../messages/MessageList';
import { MessageInput } from '../messages/MessageInput';
import useWorkspace from '../../hooks/useWorkspace';
import { WorkspaceTab } from '../../types/workspace.types';
import { Workspace } from '../../types/workspace.types';
import { Button, ButtonVariant, ButtonSize } from '../common/Button';
import { Spinner } from '../common/Spinner';
import { Card } from '../common/Card';
import colors from '../../styles/colors';
import { layout } from '../../styles/layout';
import useAuth from '../../hooks/useAuth';

// Define the props interface for the CollaborationTools component
export interface CollaborationToolsProps {
  workspaceId: string;
  style?: StyleProp<ViewStyle>;
  initialTab?: string;
  onTabChange?: (tab: string) => void;
}

// Define props for the NotebookScreen component
interface NotebookScreenProps { }

// Define props for the FilesScreen component
interface FilesScreenProps { }

// Define props for the MessagesScreen component
interface MessagesScreenProps { }

// Define the main component
const CollaborationTools: React.FC<CollaborationToolsProps> = ({
  workspaceId,
  style,
  initialTab = 'notebook',
  onTabChange,
}) => {
  // State for active tab, loading status, and error handling
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Access workspace state and functions from useWorkspace hook
  const { workspaceState, joinWorkspace, leaveWorkspace, getWorkspace } = useWorkspace();

  // Access user authentication state from useAuth hook
  const { user, hasPermission } = useAuth();

  // Create ref for the ScrollView component
  const scrollViewRef = useRef<ScrollView>(null);

  // Effect to fetch workspace data and join workspace on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch workspace data
        await getWorkspace(workspaceId);

        // Join the workspace
        await joinWorkspace(workspaceId);
      } catch (e: any) {
        setError(e.message || 'Failed to load workspace');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [workspaceId, getWorkspace, joinWorkspace]);

  // Effect to clean up and leave workspace on unmount
  useEffect(() => {
    return () => {
      leaveWorkspace();
    };
  }, [leaveWorkspace]);

  // Tab change handler
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // Create the Tab Navigator
  const Tab = createMaterialTopTabNavigator();

  // Screen components for each tab
  const NotebookScreen: React.FC<NotebookScreenProps> = () => {
    return (
      <JupyterNotebook
        notebookId={workspaceState.currentWorkspace?.notebooks[0]?.id || ''}
        workspaceId={workspaceId}
        onSave={() => { }}
      />
    );
  };

  const FilesScreen: React.FC<FilesScreenProps> = () => {
    return (
      <FileExplorer workspaceId={workspaceId} />
    );
  };

  const MessagesScreen: React.FC<MessagesScreenProps> = () => {
    return (
      <View style={{ flex: 1 }}>
        <MessageList conversationId={workspaceId} />
        <MessageInput conversationId={workspaceId} />
      </View>
    );
  };

  // Implement loading state while fetching workspace data
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  // Implement error handling with retry functionality
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Retry" onPress={() => { }} />
      </View>
    );
  }

  // Render Tab Navigator with customized styling for Android
  return (
    <SafeAreaView style={[styles.safeArea, style]}>
      <Tab.Navigator
        initialRouteName={initialTab}
        screenOptions={{
          tabBarScrollEnabled: true,
          tabBarActiveTintColor: colors.primary[500],
          tabBarInactiveTintColor: colors.gray[500],
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarIndicatorStyle: styles.tabBarIndicator,
        }}
      >
        <Tab.Screen
          name="Notebook"
          component={NotebookScreen}
          listeners={{ tabPress: () => handleTabChange('notebook') }}
        />
        <Tab.Screen
          name="Files"
          component={FilesScreen}
          listeners={{ tabPress: () => handleTabChange('files') }}
        />
        <Tab.Screen
          name="Messages"
          component={MessagesScreen}
          listeners={{ tabPress: () => handleTabChange('messages') }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.primary,
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
    padding: layout.spacing.m,
  },
  errorText: {
    fontSize: 16,
    color: colors.error[500],
    marginBottom: layout.spacing.m,
    textAlign: 'center',
  },
  tabBar: {
    backgroundColor: colors.background.primary,
  },
  tabBarLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  tabBarIndicator: {
    backgroundColor: colors.primary[500],
  },
});

export default CollaborationTools;