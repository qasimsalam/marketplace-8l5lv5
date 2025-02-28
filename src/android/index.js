import React from 'react'; // react v18.2.0
import { AppRegistry, LogBox, Platform, UIManager } from 'react-native'; // react-native 0.72.4
import { Provider } from 'react-redux'; // react-redux v8.1.2
import { PersistGate } from 'redux-persist/integration/react'; // redux-persist/integration/react v6.0.0
import { SafeAreaProvider } from 'react-native-safe-area-context'; // react-native-safe-area-context v4.7.1
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // react-native-gesture-handler v2.12.1

// Internal imports
import RootNavigator from './src/navigation/RootNavigator';
import { store, persistor } from './src/store';

// Define app name
const AppName = 'AITalentMarketplace';

/**
 * Main application component that wraps the RootNavigator with necessary providers
 * @returns {JSX.Element} The application component tree with all required providers
 */
function App() {
  return (
    // Wrap RootNavigator with GestureHandlerRootView for gesture handling
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Wrap with SafeAreaProvider for safe area insets */}
      <SafeAreaProvider>
        {/* Wrap with PersistGate to wait for persisted state rehydration */}
        <PersistGate loading={null} persistor={persistor}>
          {/* Wrap with Redux Provider for state management */}
          <Provider store={store}>
            <RootNavigator />
          </Provider>
        </PersistGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Sets up Android layout animation if platform is Android
 * @returns {void} No return value
 */
function setupLayoutAnimation() {
  // Check if platform is Android
  if (Platform.OS === 'android') {
    // Enable LayoutAnimation on Android for smoother transitions
    if (UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }

    // Configure UIManager to use native driver for animations
    // This can improve performance for some animations
    // However, it may not be compatible with all animations
    // So, use it with caution and test thoroughly
    // UIManager.configureNextLayoutAnimation({
    //   duration: 300,
    //   create: { type: 'easeInEaseOut', property: 'opacity' },
    //   update: { type: 'spring', springDamping: 0.4 },
    // }, () => {
    //   console.log('Layout animation completed');
    // });
  }
}

// Disable specific React Native yellow box warnings
LogBox.ignoreLogs([
  'Warning: ...', // Add specific warnings to ignore
]);

// Initialize layout animation for Android
setupLayoutAnimation();

// Register the App component with AppRegistry
AppRegistry.registerComponent(AppName, () => App);

// Configure global error handling
// ErrorUtils.setGlobalHandler((error, isFatal) => {
//   // Handle global errors here
//   console.error('Global error handler:', error, isFatal);
//   // You can also display a user-friendly error message or log the error to a service
// });