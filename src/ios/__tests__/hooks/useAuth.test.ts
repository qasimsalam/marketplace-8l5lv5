import { renderHook, act, waitFor } from '@testing-library/react-native'; // ^12.2.2
import { Provider } from 'react-redux'; // ^8.1.2
import { configureStore } from '@reduxjs/toolkit'; // ^1.9.5
import { jest } from '@jest/globals'; // ^29.6.2
import { AppState } from 'react-native'; // 0.72.4

import useAuth, { UseAuthResult } from '../../src/hooks/useAuth';
import { 
  Permission, 
  AuthPermission, 
  BiometricType, 
  BiometricAuthResult,
  LoginFormValues,
  RegisterFormValues 
} from '../../src/types/auth.types';
import { hasPermission } from '../../src/lib/auth';

// Mock Redux actions
jest.mock('../../src/store/slices/authSlice', () => ({
  loginUser: jest.fn(),
  registerUser: jest.fn(),
  logoutUser: jest.fn(),
  forgotPasswordUser: jest.fn(),
  resetPasswordUser: jest.fn(),
  setupTwoFactorUser: jest.fn(),
  verifyTwoFactorUser: jest.fn(),
  disableTwoFactorUser: jest.fn(),
  loginWithProviderUser: jest.fn(),
  enableBiometricsUser: jest.fn(),
  disableBiometricsUser: jest.fn(),
  loginWithBiometricsUser: jest.fn(),
  setError: jest.fn(),
  clearError: jest.fn()
}));

// Mock auth library functions
jest.mock('../../src/lib/auth', () => ({
  hasPermission: jest.fn()
}));

// Mock biometrics hook
jest.mock('../../src/hooks/useBiometrics', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    biometricType: 'face',
    authenticate: jest.fn()
  })
}));

// Create a test setup function
const setup = () => {
  // Create a mock Redux store
  const store = configureStore({
    reducer: {
      auth: (state = {
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null,
        requiresTwoFactor: false,
        biometricsEnabled: false
      }, action) => state
    }
  });

  // Create wrapper with Redux provider
  const wrapper = ({ children }) => (
    <Provider store={store}>{children}</Provider>
  );

  return {
    store,
    wrapper
  };
};

describe('useAuth', () => {
  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication State', () => {
    it('should return initial authentication state from Redux store', () => {
      const { wrapper } = setup();
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.requiresTwoFactor).toBe(false);
      expect(result.current.biometricsEnabled).toBe(false);
    });

    it('should reflect authentication state changes from Redux store', () => {
      // Setup with Redux mock store that can be updated
      const initialState = {
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null,
        requiresTwoFactor: false,
        biometricsEnabled: false
      };
      
      let state = { ...initialState };
      
      const store = configureStore({
        reducer: {
          auth: (s = state, action) => {
            if (action.type === 'TEST_UPDATE') {
              return { ...s, ...action.payload };
            }
            return s;
          }
        }
      });

      const wrapper = ({ children }) => (
        <Provider store={store}>{children}</Provider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Initial state check
      expect(result.current.isAuthenticated).toBe(false);
      
      // Update the store
      act(() => {
        store.dispatch({
          type: 'TEST_UPDATE',
          payload: {
            isAuthenticated: true,
            user: { id: '123', email: 'test@example.com' },
            token: 'test-token'
          }
        });
      });
      
      // React hook should reflect the store update
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual({ id: '123', email: 'test@example.com' });
      expect(result.current.token).toBe('test-token');
    });
  });

  describe('Login', () => {
    it('should dispatch action when login is called', async () => {
      const { wrapper } = setup();
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // Import and mock the loginUser action
      const { loginUser } = require('../../src/store/slices/authSlice');
      (loginUser as jest.Mock).mockResolvedValue({});
      
      // Test credentials
      const credentials: LoginFormValues = { 
        email: 'test@example.com', 
        password: 'password123', 
        remember: true,
        useBiometrics: false
      };
      
      // Call the login method
      await act(async () => {
        await result.current.login(credentials);
      });
      
      // Verify loginUser was called with credentials
      expect(loginUser).toHaveBeenCalledWith(credentials);
    });

    it('should handle login error correctly', async () => {
      const { wrapper } = setup();
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // Mock loginUser to throw an error
      const { loginUser } = require('../../src/store/slices/authSlice');
      const errorMessage = 'Invalid credentials';
      (loginUser as jest.Mock).mockRejectedValue(new Error(errorMessage));
      
      // Test credentials
      const credentials: LoginFormValues = { 
        email: 'test@example.com', 
        password: 'wrong-password', 
        remember: false,
        useBiometrics: false
      };
      
      // Call the login method and expect it to throw
      await expect(
        act(async () => {
          await result.current.login(credentials);
        })
      ).rejects.toThrow();
      
      // Verify loginUser was called
      expect(loginUser).toHaveBeenCalledWith(credentials);
    });

    it('should reflect loading state during login', async () => {
      // Create a store with a reducer that can track loading state
      let authState = {
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null,
        requiresTwoFactor: false,
        biometricsEnabled: false
      };
      
      const store = configureStore({
        reducer: {
          auth: (state = authState, action) => {
            if (action.type === 'auth/login/pending') {
              return { ...state, loading: true };
            }
            if (action.type === 'auth/login/fulfilled') {
              return { ...state, loading: false, isAuthenticated: true };
            }
            return state;
          }
        }
      });

      const wrapper = ({ children }) => (
        <Provider store={store}>{children}</Provider>
      );

      // Setup a delayed resolution for loginUser
      const { loginUser } = require('../../src/store/slices/authSlice');
      (loginUser as jest.Mock).mockImplementation(() => {
        return new Promise(resolve => {
          // Simulate API delay
          setTimeout(() => resolve({}), 100);
        });
      });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // Initial state check
      expect(result.current.loading).toBe(false);
      
      // Start login process
      let loginPromise;
      act(() => {
        loginPromise = result.current.login({ 
          email: 'test@example.com', 
          password: 'password', 
          remember: false,
          useBiometrics: false
        });
        
        // Dispatch the pending action manually (in a real scenario this would be handled by createAsyncThunk)
        store.dispatch({ type: 'auth/login/pending' });
      });
      
      // Verify loading state is true during the login process
      expect(result.current.loading).toBe(true);
      
      // Wait for login to complete
      await act(async () => {
        store.dispatch({ type: 'auth/login/fulfilled' });
        await loginPromise;
      });
      
      // Verify loading state is false after login completes
      expect(result.current.loading).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('Biometric Authentication', () => {
    it('should dispatch loginWithBiometrics action when loginWithBiometrics is called', async () => {
      const { wrapper } = setup();
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // Mock the loginWithBiometricsUser action
      const { loginWithBiometricsUser } = require('../../src/store/slices/authSlice');
      (loginWithBiometricsUser as jest.Mock).mockResolvedValue({});
      
      // Call the biometric login method
      await act(async () => {
        await result.current.loginWithBiometrics();
      });
      
      // Verify the action was dispatched
      expect(loginWithBiometricsUser).toHaveBeenCalled();
    });

    it('should reflect biometricType from useBiometrics hook', () => {
      // Mock the biometricType value
      const useBiometricsMock = require('../../src/hooks/useBiometrics').default;
      useBiometricsMock.mockReturnValue({
        biometricType: BiometricType.FACE,
        authenticate: jest.fn()
      });
      
      const { wrapper } = setup();
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // Verify biometricType matches the mocked value
      expect(result.current.biometricType).toBe(BiometricType.FACE);
    });

    it('should call authenticate from useBiometrics when enableBiometrics is called', async () => {
      // Setup authenticate mock
      const authenticateMock = jest.fn().mockResolvedValue(BiometricAuthResult.SUCCESS);
      const useBiometricsMock = require('../../src/hooks/useBiometrics').default;
      useBiometricsMock.mockReturnValue({
        biometricType: BiometricType.FACE,
        authenticate: authenticateMock
      });
      
      // Mock user in the auth state
      let authState = {
        isAuthenticated: true,
        user: { email: 'test@example.com' },
        token: 'test-token',
        loading: false,
        error: null,
        requiresTwoFactor: false,
        biometricsEnabled: false
      };
      
      const store = configureStore({
        reducer: {
          auth: (state = authState) => state
        }
      });

      const wrapper = ({ children }) => (
        <Provider store={store}>{children}</Provider>
      );
      
      // Mock enableBiometricsUser action
      const { enableBiometricsUser } = require('../../src/store/slices/authSlice');
      (enableBiometricsUser as jest.Mock).mockResolvedValue(BiometricAuthResult.SUCCESS);
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // Call enableBiometrics
      await act(async () => {
        await result.current.enableBiometrics();
      });
      
      // Verify authenticate was called with the right message
      expect(authenticateMock).toHaveBeenCalledWith('Authenticate to enable biometric login');
      
      // Verify enableBiometricsUser was called with credentials
      expect(enableBiometricsUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'stored-password'
      });
    });

    it('should handle biometric authentication failure', async () => {
      // Setup authenticate mock to return failure
      const authenticateMock = jest.fn().mockResolvedValue(BiometricAuthResult.FAILED);
      const useBiometricsMock = require('../../src/hooks/useBiometrics').default;
      useBiometricsMock.mockReturnValue({
        biometricType: BiometricType.FACE,
        authenticate: authenticateMock
      });
      
      const { wrapper } = setup();
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // Call enableBiometrics
      const biometricResult = await act(async () => {
        return await result.current.enableBiometrics();
      });
      
      // Verify authentication failure is returned
      expect(biometricResult).toBe(BiometricAuthResult.FAILED);
      
      // Verify enableBiometricsUser was not called
      const { enableBiometricsUser } = require('../../src/store/slices/authSlice');
      expect(enableBiometricsUser).not.toHaveBeenCalled();
    });

    it('should dispatch disableBiometrics action when disableBiometrics is called', async () => {
      const { wrapper } = setup();
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // Mock disableBiometricsUser action
      const { disableBiometricsUser } = require('../../src/store/slices/authSlice');
      (disableBiometricsUser as jest.Mock).mockResolvedValue({});
      
      // Call disableBiometrics
      await act(async () => {
        await result.current.disableBiometrics();
      });
      
      // Verify the action was dispatched
      expect(disableBiometricsUser).toHaveBeenCalled();
    });
  });

  describe('Registration', () => {
    it('should dispatch register action when register is called', async () => {
      const { wrapper } = setup();
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // Mock registerUser action
      const { registerUser } = require('../../src/store/slices/authSlice');
      (registerUser as jest.Mock).mockResolvedValue({});
      
      // Test registration data
      const userData: RegisterFormValues = {
        email: 'new@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'FREELANCER',
        agreeToTerms: true,
        enableBiometrics: false
      };
      
      // Call register method
      await act(async () => {
        await result.current.register(userData);
      });
      
      // Verify registerUser was called with userData
      expect(registerUser).toHaveBeenCalledWith(userData);
    });

    it('should handle registration error correctly', async () => {
      const { wrapper } = setup();
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // Mock registerUser to throw an error
      const { registerUser } = require('../../src/store/slices/authSlice');
      const errorMessage = 'Email already exists';
      (registerUser as jest.Mock).mockRejectedValue(new Error(errorMessage));
      
      // Test registration data
      const userData: RegisterFormValues = {
        email: 'existing@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'FREELANCER',
        agreeToTerms: true,
        enableBiometrics: false
      };
      
      // Call register method and expect it to throw
      await expect(
        act(async () => {
          await result.current.register(userData);
        })
      ).rejects.toThrow();
      
      // Verify registerUser was called
      expect(registerUser).toHaveBeenCalledWith(userData);
    });
  });

  describe('Logout', () => {
    it('should dispatch logout action when logout is called', async () => {
      const { wrapper } = setup();
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // Mock logoutUser action
      const { logoutUser } = require('../../src/store/slices/authSlice');
      (logoutUser as jest.Mock).mockResolvedValue({});
      
      // Call logout method
      await act(async () => {
        await result.current.logout();
      });
      
      // Verify logoutUser was called
      expect(logoutUser).toHaveBeenCalled();
    });

    it('should handle logout error correctly', async () => {
      const { wrapper } = setup();
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // Mock logoutUser to throw an error
      const { logoutUser } = require('../../src/store/slices/authSlice');
      (logoutUser as jest.Mock).mockRejectedValue(new Error('Logout failed'));
      
      // Call logout method and expect it to throw
      await expect(
        act(async () => {
          await result.current.logout();
        })
      ).rejects.toThrow();
      
      // Verify logoutUser was called
      expect(logoutUser).toHaveBeenCalled();
    });
  });

  describe('Password Management', () => {
    it('should dispatch forgotPassword action with email', async () => {
      const { wrapper } = setup();
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // Mock forgotPasswordUser action
      const { forgotPasswordUser } = require('../../src/store/slices/authSlice');
      (forgotPasswordUser as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Recovery email sent'
      });
      
      // Call forgotPassword method
      const response = await act(async () => {
        return await result.current.forgotPassword('test@example.com');
      });
      
      // Verify forgotPasswordUser was called with email
      expect(forgotPasswordUser).toHaveBeenCalledWith('test@example.com');
      
      // Verify response matches mock
      expect(response).toEqual({
        success: true,
        message: 'Recovery email sent'
      });
    });

    it('should dispatch resetPassword action with token and new password', async () => {
      const { wrapper } = setup();
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // Mock resetPasswordUser action
      const { resetPasswordUser } = require('../../src/store/slices/authSlice');
      (resetPasswordUser as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Password reset successfully'
      });
      
      // Reset data
      const resetData = {
        token: 'reset-token-123',
        password: 'new-password',
        confirmPassword: 'new-password'
      };
      
      // Call resetPassword method
      const response = await act(async () => {
        return await result.current.resetPassword(resetData);
      });
      
      // Verify resetPasswordUser was called with reset data
      expect(resetPasswordUser).toHaveBeenCalledWith(resetData);
      
      // Verify response matches mock
      expect(response).toEqual({
        success: true,
        message: 'Password reset successfully'
      });
    });
  });

  describe('Two-Factor Authentication', () => {
    it('should dispatch setupTwoFactor action when setupTwoFactor is called', async () => {
      const { wrapper } = setup();
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // Mock setupTwoFactorUser action
      const { setupTwoFactorUser } = require('../../src/store/slices/authSlice');
      (setupTwoFactorUser as jest.Mock).mockResolvedValue({
        secret: 'ABCDEFGHIJKLMNOP',
        qrCodeUrl: 'https://example.com/qr-code'
      });
      
      // Call setupTwoFactor method
      const response = await act(async () => {
        return await result.current.setupTwoFactor();
      });
      
      // Verify setupTwoFactorUser was called
      expect(setupTwoFactorUser).toHaveBeenCalled();
      
      // Verify response matches mock
      expect(response).toEqual({
        secret: 'ABCDEFGHIJKLMNOP',
        qrCodeUrl: 'https://example.com/qr-code'
      });
    });

    it('should dispatch verifyTwoFactor action with verification code', async () => {
      const { wrapper } = setup();
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // Mock verifyTwoFactorUser action
      const { verifyTwoFactorUser } = require('../../src/store/slices/authSlice');
      (verifyTwoFactorUser as jest.Mock).mockResolvedValue({});
      
      // Verification code
      const code = '123456';
      
      // Call verifyTwoFactor method
      await act(async () => {
        await result.current.verifyTwoFactor(code);
      });
      
      // Verify verifyTwoFactorUser was called with code
      expect(verifyTwoFactorUser).toHaveBeenCalledWith(code);
    });

    it('should dispatch disableTwoFactor action with verification code', async () => {
      const { wrapper } = setup();
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // Mock disableTwoFactorUser action
      const { disableTwoFactorUser } = require('../../src/store/slices/authSlice');
      (disableTwoFactorUser as jest.Mock).mockResolvedValue({});
      
      // Verification code
      const code = '123456';
      
      // Call disableTwoFactor method
      await act(async () => {
        await result.current.disableTwoFactor(code);
      });
      
      // Verify disableTwoFactorUser was called with code
      expect(disableTwoFactorUser).toHaveBeenCalledWith(code);
    });
  });

  describe('OAuth Authentication', () => {
    it('should dispatch loginWithProvider action with provider info', async () => {
      const { wrapper } = setup();
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // Mock loginWithProviderUser action
      const { loginWithProviderUser } = require('../../src/store/slices/authSlice');
      (loginWithProviderUser as jest.Mock).mockResolvedValue({});
      
      // OAuth info
      const provider = 'github';
      const code = 'oauth-code-123';
      const redirectUri = 'aitalent://auth/github';
      
      // Call loginWithProvider method
      await act(async () => {
        await result.current.loginWithProvider(provider, code, redirectUri);
      });
      
      // Verify loginWithProviderUser was called with correct parameters
      expect(loginWithProviderUser).toHaveBeenCalledWith({ provider, code, redirectUri });
    });
  });

  describe('Permission Verification', () => {
    it('should call hasPermission with the given permission', () => {
      const { wrapper } = setup();
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // Mock hasPermission function
      const hasPermissionMock = hasPermission as jest.Mock;
      hasPermissionMock.mockReturnValue(true);
      
      // Check a permission
      const permission = Permission.JOBS_VIEW;
      const hasAccess = result.current.hasPermission(permission);
      
      // Verify hasPermission was called with permission
      expect(hasPermissionMock).toHaveBeenCalledWith(permission);
      
      // Verify return value matches mock
      expect(hasAccess).toBe(true);
    });

    it('should return false when hasPermission returns false', () => {
      const { wrapper } = setup();
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // Mock hasPermission function to return false
      const hasPermissionMock = hasPermission as jest.Mock;
      hasPermissionMock.mockReturnValue(false);
      
      // Check a permission
      const permission = Permission.ADMIN_DASHBOARD;
      const hasAccess = result.current.hasPermission(permission);
      
      // Verify hasPermission was called
      expect(hasPermissionMock).toHaveBeenCalledWith(permission);
      
      // Verify return value is false
      expect(hasAccess).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('should set up AppState change listener when authenticated', () => {
      // Mock AppState addEventListener
      const addEventListenerMock = jest.fn().mockReturnValue({
        remove: jest.fn()
      });
      AppState.addEventListener = addEventListenerMock;
      
      // Setup authenticated state
      let authState = {
        isAuthenticated: true,
        user: { id: '123' },
        token: 'test-token',
        loading: false,
        error: null,
        requiresTwoFactor: false,
        biometricsEnabled: false
      };
      
      const store = configureStore({
        reducer: {
          auth: (state = authState) => state
        }
      });

      const wrapper = ({ children }) => (
        <Provider store={store}>{children}</Provider>
      );
      
      // Render hook with authenticated state
      renderHook(() => useAuth(), { wrapper });
      
      // Verify AppState.addEventListener was called
      expect(addEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should cleanup AppState listener on unmount', () => {
      // Mock the event listener object with remove method
      const removeMock = jest.fn();
      const listenerMock = {
        remove: removeMock
      };
      
      // Mock AppState addEventListener to return the listener
      AppState.addEventListener = jest.fn().mockReturnValue(listenerMock);
      
      // Setup authenticated state
      let authState = {
        isAuthenticated: true,
        user: { id: '123' },
        token: 'test-token',
        loading: false,
        error: null,
        requiresTwoFactor: false,
        biometricsEnabled: false
      };
      
      const store = configureStore({
        reducer: {
          auth: (state = authState) => state
        }
      });

      const wrapper = ({ children }) => (
        <Provider store={store}>{children}</Provider>
      );
      
      // Render hook with authenticated state
      const { unmount } = renderHook(() => useAuth(), { wrapper });
      
      // Unmount the hook
      unmount();
      
      // Verify the remove method was called
      expect(removeMock).toHaveBeenCalled();
    });
  });

  describe('Error Management', () => {
    it('should dispatch clearError when clearError is called', async () => {
      const { wrapper } = setup();
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // Mock clearError action
      const { clearError } = require('../../src/store/slices/authSlice');
      (clearError as jest.Mock).mockReturnValue({ type: 'auth/clearError' });
      
      // Call clearError method
      act(() => {
        result.current.clearError();
      });
      
      // Verify clearError action was dispatched
      expect(clearError).toHaveBeenCalled();
    });

    it('should reflect error state from Redux store', () => {
      // Setup state with error
      let authState = {
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: 'Authentication failed',
        requiresTwoFactor: false,
        biometricsEnabled: false
      };
      
      const store = configureStore({
        reducer: {
          auth: (state = authState) => state
        }
      });

      const wrapper = ({ children }) => (
        <Provider store={store}>{children}</Provider>
      );
      
      // Render hook with error state
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // Verify error state is reflected
      expect(result.current.error).toBe('Authentication failed');
    });
  });
});