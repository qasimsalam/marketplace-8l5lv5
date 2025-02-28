/**
 * Android Testing Environment Setup
 * 
 * This file configures the global test settings, mocks for React Native components 
 * and modules, and required test utilities for Jest in the Android environment.
 */

import { jest } from '@jest/globals'; // ^29.6.2
import mockRNDeviceInfo from 'react-native-device-info/jest/react-native-device-info-mock'; // ^10.0.0
import { NativeModules, NativeEventEmitter } from 'react-native'; // 0.72.4
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock'; // ^1.19.0

/**
 * Sets up mocks for React Native Android-specific components and APIs
 */
function setupReactNativeMocks(): void {
  // Mock react-native-gesture-handler
  jest.mock('react-native-gesture-handler', () => {
    const RNGestureHandler = jest.requireActual('react-native-gesture-handler/mock');
    return {
      ...RNGestureHandler,
      Swipeable: jest.fn().mockImplementation(() => ({
        close: jest.fn(),
      })),
      PanGestureHandler: jest.fn().mockImplementation(({ children }) => children),
      TapGestureHandler: jest.fn().mockImplementation(({ children }) => children),
      ScrollView: jest.fn().mockImplementation(({ children }) => children),
      State: {
        BEGAN: 'BEGAN',
        ACTIVE: 'ACTIVE',
        END: 'END',
        FAILED: 'FAILED',
        CANCELLED: 'CANCELLED',
      },
    };
  });

  // Mock react-native-reanimated
  jest.mock('react-native-reanimated', () => {
    const Reanimated = jest.requireActual('react-native-reanimated/mock');
    
    // Add additional Android-specific mock implementations
    Reanimated.default.Value = jest.fn(initial => ({
      value: initial,
      setValue: jest.fn(),
      interpolate: jest.fn(),
      timing: jest.fn(),
    }));
    
    return Reanimated;
  });

  // Mock react-native-safe-area-context
  jest.mock('react-native-safe-area-context', () => ({
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
    initialWindowMetrics: {
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
    },
  }));

  // Mock react-native-screens
  jest.mock('react-native-screens', () => ({
    enableScreens: jest.fn(),
    ScreenContainer: ({ children }) => children,
    Screen: ({ children }) => children,
    NativeScreen: ({ children }) => children,
    NativeScreenContainer: ({ children }) => children,
    ScreenStack: ({ children }) => children,
    screensEnabled: jest.fn(() => true),
  }));

  // Mock AsyncStorage
  jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

  // Mock Platform for Android
  jest.mock('react-native/Libraries/Utilities/Platform', () => ({
    OS: 'android',
    select: jest.fn(obj => obj.android || obj.default),
    Version: 30, // Android SDK version for tests
    isTV: false,
    isTesting: true,
    constants: {
      reactNativeVersion: { major: 0, minor: 72, patch: 4 },
    },
  }));

  // Mock Dimensions for Android screen sizes
  jest.mock('react-native/Libraries/Utilities/Dimensions', () => ({
    get: jest.fn().mockReturnValue({
      window: {
        width: 360,
        height: 640,
        scale: 2,
        fontScale: 1,
      },
      screen: {
        width: 360,
        height: 640,
        scale: 2,
        fontScale: 1,
      },
    }),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));

  // Mock socket.io-client
  jest.mock('socket.io-client', () => {
    const mockSocket = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
    return jest.fn(() => mockSocket);
  });

  // Mock expo-local-authentication
  jest.mock('expo-local-authentication', () => ({
    hasHardwareAsync: jest.fn().mockResolvedValue(true),
    isEnrolledAsync: jest.fn().mockResolvedValue(true),
    supportedAuthenticationTypesAsync: jest.fn().mockResolvedValue([1, 2]),
    authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
    cancelAuthenticate: jest.fn(),
    LocalAuthenticationOptions: { BIOMETRIC: 1, FACIAL_RECOGNITION: 2, FINGERPRINT: 3 },
  }));

  // Mock expo-secure-store
  jest.mock('expo-secure-store', () => {
    const secureStorage = {};
    return {
      getItemAsync: jest.fn((key) => Promise.resolve(secureStorage[key])),
      setItemAsync: jest.fn((key, value) => {
        secureStorage[key] = value;
        return Promise.resolve();
      }),
      deleteItemAsync: jest.fn((key) => {
        delete secureStorage[key];
        return Promise.resolve();
      }),
      WHEN_UNLOCKED: 'WHEN_UNLOCKED',
      AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
      ALWAYS: 'ALWAYS',
    };
  });
}

/**
 * Creates mock implementations of Android native modules used by the app
 */
function setupNativeModuleMocks(): void {
  // Mock BiometricModule
  const BiometricModule = {
    isSensorAvailable: jest.fn(() => Promise.resolve(true)),
    authenticate: jest.fn(() => Promise.resolve({ success: true })),
    enrollBiometric: jest.fn(() => Promise.resolve({ enrolled: true })),
  };

  // Mock NotificationModule
  const NotificationModule = {
    requestPermissions: jest.fn(() => Promise.resolve(true)),
    scheduleNotification: jest.fn(() => Promise.resolve(1)),
    cancelAllNotifications: jest.fn(() => Promise.resolve()),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  };

  // Mock SecureStorageModule
  const SecureStorageModule = {
    setItem: jest.fn((key, value) => Promise.resolve(true)),
    getItem: jest.fn((key) => Promise.resolve('mock-value')),
    removeItem: jest.fn((key) => Promise.resolve(true)),
    clear: jest.fn(() => Promise.resolve(true)),
  };

  // Add all modules to NativeModules
  Object.assign(NativeModules, {
    BiometricModule,
    NotificationModule,
    SecureStorageModule,
    // Android specific modules
    RNPermissions: {
      requestMultiple: jest.fn(() => Promise.resolve({
        'android.permission.CAMERA': 'granted',
        'android.permission.READ_EXTERNAL_STORAGE': 'granted',
        'android.permission.WRITE_EXTERNAL_STORAGE': 'granted',
        'android.permission.ACCESS_FINE_LOCATION': 'granted',
        'android.permission.ACCESS_NETWORK_STATE': 'granted',
        'android.permission.VIBRATE': 'granted',
        'android.permission.INTERNET': 'granted',
      })),
      RESULTS: {
        GRANTED: 'granted',
        DENIED: 'denied',
        NEVER_ASK_AGAIN: 'never_ask_again',
      },
    },
    // Set up device info module with mock values
    RNDeviceInfo: {
      ...mockRNDeviceInfo,
      isEmulator: true,
      deviceName: 'Android Test Device',
      systemVersion: '11.0',
      brand: 'Google',
      model: 'Pixel',
    },
  });

  // Create and attach native event emitters
  global.NotificationEmitter = new NativeEventEmitter(NativeModules.NotificationModule);
}

/**
 * Creates a global fetch mock for API testing
 */
function mockFetch(): void {
  // Mock fetch implementation with methods to easily mock responses
  global.fetch = jest.fn(() => 
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      status: 200,
      headers: new Headers(),
    })
  ) as jest.Mock;

  // Add helper methods to the mock for easier test setup
  (global.fetch as jest.Mock).mockSuccess = (data: any) => {
    return global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(data),
        text: () => Promise.resolve(JSON.stringify(data)),
        status: 200,
        headers: new Headers(),
      })
    );
  };

  (global.fetch as jest.Mock).mockError = (status = 500, data = {}) => {
    return global.fetch.mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve(data),
        text: () => Promise.resolve(JSON.stringify(data)),
        status: status,
        headers: new Headers(),
      })
    );
  };

  // Reset fetch mock between tests
  beforeEach(() => {
    global.fetch.mockClear();
  });
}

/**
 * Configures global mocks for timers, fetch, etc.
 */
function setupGlobalMocks(): void {
  // Configure fetch mock
  mockFetch();

  // Setup fake timers
  jest.useFakeTimers();

  // Silence non-critical warnings
  jest.spyOn(console, 'warn').mockImplementation((message) => {
    // Only log critical warnings, silence others to reduce noise
    if (message && message.includes('Critical:')) {
      console.log('[WARN]', message);
    }
  });

  // Mock console methods for cleaner test output
  jest.spyOn(console, 'error').mockImplementation((message) => {
    // Log errors but in a cleaner format for tests
    console.log('[ERROR]', message);
  });

  // Mock Android permissions
  const mockPermissions = {
    CAMERA: 'android.permission.CAMERA',
    READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
    WRITE_EXTERNAL_STORAGE: 'android.permission.WRITE_EXTERNAL_STORAGE',
    INTERNET: 'android.permission.INTERNET',
    ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    ACCESS_NETWORK_STATE: 'android.permission.ACCESS_NETWORK_STATE',
    VIBRATE: 'android.permission.VIBRATE',
  };
  
  jest.mock('react-native-permissions', () => ({
    PERMISSIONS: mockPermissions,
    check: jest.fn(() => Promise.resolve('granted')),
    request: jest.fn(() => Promise.resolve('granted')),
    checkMultiple: jest.fn(() => {
      const result = {};
      Object.values(mockPermissions).forEach(permission => {
        result[permission] = 'granted';
      });
      return Promise.resolve(result);
    }),
    requestMultiple: jest.fn(() => {
      const result = {};
      Object.values(mockPermissions).forEach(permission => {
        result[permission] = 'granted';
      });
      return Promise.resolve(result);
    }),
  }));
}

// Initialize all mocks
setupReactNativeMocks();
setupNativeModuleMocks();
setupGlobalMocks();

// Export for any explicit re-initialization needs in tests
export {
  setupReactNativeMocks,
  setupNativeModuleMocks,
  setupGlobalMocks,
  mockFetch,
};