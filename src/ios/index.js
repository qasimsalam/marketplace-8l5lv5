import React from 'react'; // ^18.2.0
import { AppRegistry, LogBox, StatusBar, Platform } from 'react-native'; // ^0.72.4
import { Provider } from 'react-redux'; // ^8.1.2
import { PersistGate } from 'redux-persist/integration/react'; // ^6.0.0
import { ThemeProvider } from 'styled-components'; // ^6.0.7
import { SafeAreaProvider } from 'react-native-safe-area-context'; // ^4.7.1

// Internal imports
import RootNavigator from './src/navigation/RootNavigator';
import { store, persistor } from './src/store';
import { defaultTheme } from './src/styles/theme';
import { setupAxios } from './src/lib/axios';

// Ignore specific warning patterns in development
LogBox.ignoreLogs([
  'Setting a timer',
  'AsyncStorage has been extracted from react-native core and will be removed in a future release.',
  'Remote debugger is in a background tab which may cause it to stop working. Fix this by foregrounding the tab (or opening it in a separate window).',
]);

/**
 * Configures platform-specific settings for the iOS application
 */
const configurePlatform = () => {
  // Ignore specific warning patterns in development using LogBox.ignoreLogs
  // Configure StatusBar for iOS (light content, transparent)
  if (Platform.OS === 'ios') {
    StatusBar.setBarStyle('light-content');
    StatusBar.setTranslucent(true);
  }

  // Initialize Axios with base configuration and interceptors
  setupAxios();
  // Set up other platform-specific configurations
};

/**
 * Main application component that wraps the app with necessary providers
 * @returns {ReactNode} The rendered application with all providers
 */
const AITalentMarketplace = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider theme={defaultTheme}>
          <SafeAreaProvider>
            {/* Main navigation component that handles routing through the app */}
            <RootNavigator />
          </SafeAreaProvider>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
};

/**
 * Registers the main component with React Native
 */
const AppName = 'AITalentMarketplace';
configurePlatform();
AppRegistry.registerComponent(AppName, () => AITalentMarketplace);