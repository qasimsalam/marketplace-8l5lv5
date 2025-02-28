import React, { useState, useEffect, useCallback } from 'react'; // react ^18.2.0
import { View, Platform } from 'react-native'; // react-native 0.72.4
import { createBottomTabNavigator, BottomTabNavigationOptions } from '@react-navigation/bottom-tabs'; // @react-navigation/bottom-tabs ^6.5.8
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // react-native-vector-icons/MaterialIcons ^9.2.0

// Internal imports for screen components
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import JobsScreen from '../screens/jobs/JobsScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import WorkspaceScreen from '../screens/workspace/WorkspaceScreen';

// Internal imports for hooks and styles
import { useMessages } from '../hooks/useMessages';
import { colors } from '../styles/colors';

// Create a bottom tab navigator instance
const Tab = createBottomTabNavigator();

/**
 * Bottom tab navigator component for dashboard section navigation
 */
const DashboardNavigator: React.FC = () => {
  // State to manage badge counts for unread items
  const [unreadCount, setUnreadCount] = useState(0);

  // Access the getUnreadCount function from the useMessages hook
  const { getUnreadCount } = useMessages();

  // Effect to refresh unread message count periodically
  useEffect(() => {
    const updateUnreadCount = async () => {
      const count = getUnreadCount();
      setUnreadCount(count);
    };

    updateUnreadCount(); // Initial update

    // Set interval to update unread count every 60 seconds
    const intervalId = setInterval(updateUnreadCount, 60000);

    // Clear interval on unmount
    return () => clearInterval(intervalId);
  }, [getUnreadCount]);

  // Default screen options for all tabs
  const defaultScreenOptions: BottomTabNavigationOptions = {
    headerShown: false, // Hide headers for all tabs
    tabBarActiveTintColor: colors.primary[500], // Active tab icon color
    tabBarInactiveTintColor: colors.text.secondary, // Inactive tab icon color
    tabBarStyle: {
      backgroundColor: colors.background.secondary, // Tab bar background color
      borderTopWidth: 0, // Remove top border
    },
    tabBarLabelStyle: {
      fontSize: 12, // Font size for tab labels
    },
  };

  // Android-specific tab bar styling
  const androidTabBarStyle = Platform.OS === 'android' ? {
    height: 60, // Adjust tab bar height for Android
  } : {};

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        ...defaultScreenOptions,
        tabBarStyle: {
          ...defaultScreenOptions.tabBarStyle,
          ...androidTabBarStyle,
        },
      }}
    >
      {/* Dashboard Tab */}
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" color={color} size={size} />
          ),
        }}
      />

      {/* Jobs Tab */}
      <Tab.Screen
        name="Jobs"
        component={JobsScreen}
        options={{
          tabBarLabel: 'Jobs',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="work" color={color} size={size} />
          ),
        }}
      />

      {/* Messages Tab */}
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <View>
              <MaterialIcons name="chat" color={color} size={size} />
              {unreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    backgroundColor: colors.error[500],
                    borderRadius: 6,
                    width: 12,
                    height: 12,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 8, fontWeight: 'bold' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />

      {/* Profile Tab */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" color={color} size={size} />
          ),
        }}
      />

      {/* Workspace Tab */}
      <Tab.Screen
        name="Workspace"
        component={WorkspaceScreen}
        options={{
          tabBarLabel: 'Workspace',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="code" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default DashboardNavigator;