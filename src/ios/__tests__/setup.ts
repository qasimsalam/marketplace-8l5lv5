// @jest/globals - v29.6.2
import { jest } from '@jest/globals';
// react-native-device-info - v10.0.0
import mockRNDeviceInfo from 'react-native-device-info/jest/react-native-device-info-mock';
// react-native - v0.72.4
import { NativeModules, NativeEventEmitter } from 'react-native';
// @react-native-async-storage/async-storage - v1.19.0
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

/**
 * Setup mocks for React Native native modules and APIs
 */
function setupReactNativeMocks(): void {
  // Mock react-native-gesture-handler
  jest.mock('react-native-gesture-handler', () => ({
    PanGestureHandler: 'PanGestureHandler',
    TapGestureHandler: 'TapGestureHandler',
    PinchGestureHandler: 'PinchGestureHandler',
    ScrollView: 'ScrollView',
    FlatList: 'FlatList',
    State: {
      ACTIVE: 'ACTIVE',
      BEGAN: 'BEGAN',
      CANCELLED: 'CANCELLED',
      END: 'END',
      FAILED: 'FAILED',
      UNDETERMINED: 'UNDETERMINED',
    },
    Directions: {
      DOWN: 1,
      LEFT: 2,
      RIGHT: 3,
      UP: 4,
    },
  }));

  // Mock react-native-reanimated
  jest.mock('react-native-reanimated', () => ({
    useSharedValue: jest.fn(() => ({
      value: 0,
    })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn(value => value),
    withSpring: jest.fn(value => value),
    useDerivedValue: jest.fn(callback => callback()),
    useAnimatedGestureHandler: jest.fn(),
    interpolate: jest.fn(),
    Extrapolation: {
      CLAMP: 'clamp',
      EXTEND: 'extend',
      IDENTITY: 'identity',
    },
    View: 'AnimatedView',
    Text: 'AnimatedText',
    Image: 'AnimatedImage',
    ScrollView: 'AnimatedScrollView',
    FlatList: 'AnimatedFlatList',
    createAnimatedComponent: jest.fn(component => component),
  }));

  // Mock react-native-safe-area-context
  jest.mock('react-native-safe-area-context', () => ({
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => ({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    }),
    useSafeAreaFrame: () => ({
      x: 0,
      y: 0,
      width: 390,
      height: 844,
    }),
  }));

  // Mock react-native-screens
  jest.mock('react-native-screens', () => ({
    enableScreens: jest.fn(),
    Screen: 'Screen',
    ScreenContainer: 'ScreenContainer',
    ScreenStack: 'ScreenStack',
    ScreenStackHeaderConfig: 'ScreenStackHeaderConfig',
  }));

  // Mock socket.io-client
  jest.mock('socket.io-client', () => {
    const mockOn = jest.fn();
    const mockEmit = jest.fn();
    const mockConnect = jest.fn();
    const mockDisconnect = jest.fn();

    return jest.fn(() => ({
      on: mockOn,
      emit: mockEmit,
      connect: mockConnect,
      disconnect: mockDisconnect,
      io: {
        on: mockOn,
        emit: mockEmit,
        connect: mockConnect,
        disconnect: mockDisconnect,
      },
    }));
  });

  // Mock react-native-keychain
  jest.mock('react-native-keychain', () => ({
    setGenericPassword: jest.fn(() => Promise.resolve(true)),
    getGenericPassword: jest.fn(() => Promise.resolve({ username: 'test', password: 'test' })),
    resetGenericPassword: jest.fn(() => Promise.resolve(true)),
  }));

  // Mock AsyncStorage
  jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

  // Mock DeviceInfo
  jest.mock('react-native-device-info', () => mockRNDeviceInfo);
}

/**
 * Creates mock implementations of native modules used by the app
 */
function setupNativeModuleMocks(): void {
  // Mock KeychainModule
  NativeModules.KeychainModule = {
    setGenericPassword: jest.fn(() => Promise.resolve(true)),
    getGenericPassword: jest.fn(() => Promise.resolve({ username: 'test', password: 'test' })),
    resetGenericPassword: jest.fn(() => Promise.resolve(true)),
  };

  // Mock BiometricModule
  NativeModules.BiometricModule = {
    isSensorAvailable: jest.fn(() => Promise.resolve({ available: true, biometryType: 'FaceID' })),
    authenticate: jest.fn(() => Promise.resolve({ success: true })),
    enrollBiometric: jest.fn(() => Promise.resolve({ enrolled: true })),
  };

  // Mock NotificationModule
  NativeModules.NotificationModule = {
    requestPermissions: jest.fn(() => Promise.resolve({ granted: true })),
    scheduleNotification: jest.fn(() => Promise.resolve({ id: 'test-notification' })),
    cancelAllNotifications: jest.fn(() => Promise.resolve()),
  };

  // Mock SecureStorageModule
  NativeModules.SecureStorageModule = {
    setItem: jest.fn((key: string, value: string) => Promise.resolve(true)),
    getItem: jest.fn((key: string) => Promise.resolve('test-value')),
    removeItem: jest.fn((key: string) => Promise.resolve(true)),
    clear: jest.fn(() => Promise.resolve(true)),
  };

  // Create event emitters for native modules that emit events
  global.notificationEmitter = new NativeEventEmitter(NativeModules.NotificationModule);
  global.biometricEmitter = new NativeEventEmitter(NativeModules.BiometricModule);
}

/**
 * Creates a global fetch mock for API testing
 */
function mockFetch(): void {
  // Create a Jest mock for global fetch
  global.fetch = jest.fn();

  // Mock successful response
  global.fetchMockSuccess = (body: any) => {
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        json: () => Promise.resolve(body),
        ok: true,
        status: 200,
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      })
    );
  };

  // Mock error response
  global.fetchMockError = (status: number = 500, body: any = { message: 'Server error' }) => {
    global.fetch.mockImplementationOnce(() =>
      Promise.resolve({
        json: () => Promise.resolve(body),
        ok: false,
        status,
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      })
    );
  };

  // Mock network error
  global.fetchMockNetworkError = () => {
    global.fetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')));
  };

  // Reset mocks between tests
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
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Filter out specific warnings that aren't relevant to tests
    const message = args[0];
    if (typeof message === 'string') {
      // Ignore React lifecycle warnings, as they're often false positives in test environment
      if (
        message.includes('Warning: An update to') ||
        message.includes('Warning: Cannot update a component') ||
        message.includes('Warning: validateDOMNesting') ||
        message.includes('ReactNativeFiberHostComponent: Calling')
      ) {
        return;
      }
    }
    originalConsoleError(...args);
  };

  // Mock console.warn to reduce noise in tests
  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    const message = args[0];
    if (typeof message === 'string') {
      // Filter out specific React Native warnings
      if (
        message.includes('Animated:') ||
        message.includes('EventEmitter.removeListener') ||
        message.includes('YellowBox')
      ) {
        return;
      }
    }
    originalConsoleWarn(...args);
  };

  // Add timing utilities to global object for testing animations
  global.advanceTimersByTime = (ms: number) => {
    jest.advanceTimersByTime(ms);
  };

  // Add utility to wait for promises to resolve
  global.flushPromises = () => new Promise(resolve => setImmediate(resolve));
}

// Run the setup functions
setupReactNativeMocks();
setupNativeModuleMocks();
setupGlobalMocks();

// Extend global object with testing types
declare global {
  var notificationEmitter: NativeEventEmitter;
  var biometricEmitter: NativeEventEmitter;
  var fetchMockSuccess: (body: any) => void;
  var fetchMockError: (status?: number, body?: any) => void;
  var fetchMockNetworkError: () => void;
  var advanceTimersByTime: (ms: number) => void;
  var flushPromises: () => Promise<void>;
}

// Export setup functions for potential individual use in specific test files
export { 
  setupReactNativeMocks,
  setupNativeModuleMocks,
  setupGlobalMocks,
  mockFetch
};