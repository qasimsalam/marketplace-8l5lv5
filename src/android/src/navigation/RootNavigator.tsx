import React, { useEffect } from 'react'; // react v18.2.0
import { NavigationContainer } from '@react-navigation/native'; // @react-navigation/native ^6.1.7
import { createNativeStackNavigator } from '@react-navigation/native-stack'; // @react-navigation/native-stack ^6.9.13
import { StatusBar, View, StyleSheet } from 'react-native'; // react-native 0.72.4

// Internal imports
import AuthNavigator from './AuthNavigator';
import DashboardNavigator from './DashboardNavigator';
import { useAuth } from '../hooks/useAuth';
import { Spinner, SpinnerSize } from '../components/common/Spinner';

// Define the root navigator component
const Stack = createNativeStackNavigator();

/**
 * Root navigation component that manages authentication state and app-wide navigation
 * @returns The rendered navigation container with appropriate navigator based on auth state
 */
const RootNavigator: React.FC = () => {
  // Access authentication state using useAuth hook
  const { isAuthenticated, isLoading, restoreAuthState } = useAuth();

  // Initialize auth state restoration on component mount with useEffect
  useEffect(() => {
    restoreAuthState();
  }, [restoreAuthState]);

  // Render loading spinner while authentication state is being determined
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner size={SpinnerSize.LARGE} />
      </View>
    );
  }

  // Conditionally render AuthNavigator or DashboardNavigator based on isAuthenticated flag
  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {isAuthenticated ? (
        <DashboardNavigator />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Default export of the root navigator component for the application entry point
export default RootNavigator;