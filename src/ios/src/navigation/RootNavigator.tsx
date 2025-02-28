import React, { useState, useEffect, useCallback } from 'react'; // ^18.2.0
import { NavigationContainer } from '@react-navigation/native'; // ^6.1.7
import { createNativeStackNavigator } from '@react-navigation/native-stack'; // ^6.9.13
import { StatusBar, View, StyleSheet, Platform } from 'react-native'; // ^0.72.4
import { SafeAreaProvider } from 'react-native-safe-area-context'; // ^4.7.1
import { Provider } from 'react-redux'; // ^8.1.2
import { PersistGate } from 'redux-persist/integration/react'; // ^6.0.0

// Internal imports
import AuthNavigator from './AuthNavigator';
import DashboardNavigator from './DashboardNavigator';
import useAuth from '../hooks/useAuth';
import { Spinner, SpinnerSize } from '../components/common/Spinner';
import { ToastContainer, ToastType, ToastPosition } from '../components/common/Toast';
import { store, persistor } from '../store';

// Global toast ID
let toastAutoId = 0;

/**
 * Root component that wraps the entire application with necessary providers and navigation container
 * @returns {JSX.Element} The rendered application with navigation structure
 */
const RootNavigator: React.FC = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={<Spinner size={SpinnerSize.LARGE} />} persistor={persistor}>
        <SafeAreaProvider>
          {/* Configure StatusBar for iOS */}
          {Platform.OS === 'ios' && (
            <StatusBar barStyle="dark-content" backgroundColor="white" />
          )}
          {/* Return the AppNavigator component inside the providers */}
          <AppNavigator />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
};

/**
 * Main navigation component that determines which navigator to show based on authentication state
 * @returns {JSX.Element} Navigation container with appropriate navigator
 */
const AppNavigator: React.FC = () => {
  // Create native stack navigator using createNativeStackNavigator
  const Stack = createNativeStackNavigator();

  // Get authentication state from useAuth hook
  const { isAuthenticated, loading, error, clearError } = useAuth();

  // Set up toast notifications state with useState
  const [toasts, setToasts] = useState<any[]>([]);

  /**
   * Utility function to add a new toast notification
   * @param {string} message
   * @param {ToastType} type
   * @returns {void} No return value
   */
  const addToast = (message: string, type: ToastType) => {
    // Generate unique ID for the toast
    const id = String(toastAutoId++);

    // Create toast object with message, type, and ID
    const toast = {
      id,
      message,
      type,
    };

    // Add toast to toasts array state
    setToasts((prevToasts) => [...prevToasts, toast]);

    // Set up auto-removal after duration
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  /**
   * Utility function to remove a toast notification
   * @param {string} id
   * @returns {void} No return value
   */
  const removeToast = (id: string) => {
    // Filter toasts array to remove toast with matching ID
    const updatedToasts = toasts.filter((toast) => toast.id !== id);

    // Update toasts state with filtered array
    setToasts(updatedToasts);
  };

  // Handle displaying error messages from auth state as toasts
  useEffect(() => {
    if (error) {
      addToast(error, ToastType.ERROR);
      clearError();
    }
  }, [error]);

  // Set up loading overlay for authentication processes
  const loadingOverlay = loading ? (
    <View style={styles.loadingOverlay}>
      <Spinner size={SpinnerSize.LARGE} />
    </View>
  ) : null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Conditionally render AuthNavigator or DashboardNavigator based on isAuthenticated state */}
        {isAuthenticated ? (
          <Stack.Screen name="Dashboard" component={DashboardNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>

      {/* Render ToastContainer for notifications */}
      <ToastContainer toasts={toasts} position={ToastPosition.BOTTOM} onClose={removeToast} />

      {/* Render loading spinner overlay when authentication is processing */}
      {loadingOverlay}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Export the RootNavigator component as the default export
export default RootNavigator;