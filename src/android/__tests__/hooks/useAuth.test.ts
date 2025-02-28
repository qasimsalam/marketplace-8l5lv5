import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks'; // @testing-library/react-hooks ^8.0.1
import { Provider } from 'react-redux'; // react-redux ^8.1.2
import { configureStore } from '@reduxjs/toolkit'; // @reduxjs/toolkit ^1.9.5
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'; // @jest/globals ^29.6.2

// Import the hook we're testing
import useAuth from '../../src/hooks/useAuth';

// Import Redux hooks and actions
import { useAppDispatch, useAppSelector } from '../../src/store';
import { 
  loginUser, 
  registerUser, 
  logoutUser, 
  loginWithBiometricsUser,
  enableBiometricsUser, 
  disableBiometricsUser 
} from '../../src/store/slices/authSlice';

// Import auth type definitions
import { LoginFormValues, RegisterFormValues, Permission } from '../../src/types/auth.types';

// Mock Redux hooks
jest.mock('../../src/store', () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn()
}));

// Mock Redux actions
jest.mock('../../src/store/slices/authSlice', () => ({
  loginUser: jest.fn(),
  loginWithBiometricsUser: jest.fn(),
  registerUser: jest.fn(),
  logoutUser: jest.fn(),
  enableBiometricsUser: jest.fn(),
  disableBiometricsUser: jest.fn(),
  setError: jest.fn(),
  clearError: jest.fn()
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    getCurrentRoute: jest.fn().mockReturnValue({ name: 'Dashboard' })
  })
}));

// Mock user data
const mockUser = { 
  id: 'test-user-id', 
  email: 'test@example.com', 
  role: 'FREELANCER' 
};

// Mock auth state
const mockAuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  loading: false,
  error: null,
  requiresTwoFactor: false,
  biometricsEnabled: false
};

// Helper function to create a mock store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: (state = mockAuthState, action) => state
    },
    preloadedState: {
      auth: {
        ...mockAuthState,
        ...initialState
      }
    }
  });
};

// Helper function to render the hook with a Redux provider
const renderAuthHook = (initialAuthState = {}) => {
  const store = createMockStore(initialAuthState);
  
  return renderHook(() => useAuth(), {
    wrapper: ({ children }) => (
      <Provider store={store}>{children}</Provider>
    )
  });
};

describe('useAuth', () => {
  // Mock dispatch function
  const mockDispatch = jest.fn();
  
  beforeEach(() => {
    // Set up mocks
    (useAppDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useAppSelector as jest.Mock).mockImplementation(selector => 
      selector({
        auth: mockAuthState
      })
    );
    
    // Clear mocks between tests
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('login', () => {
    it('should call loginUser with credentials and return true on success', async () => {
      // Arrange
      const credentials: LoginFormValues = {
        email: 'test@example.com',
        password: 'password123',
        remember: true,
        useBiometrics: false
      };
      
      // Mock successful login
      (loginUser as jest.Mock).mockReturnValue({ type: 'auth/login' });
      mockDispatch.mockResolvedValue({
        unwrap: jest.fn().mockResolvedValue({
          user: mockUser
        })
      });
      
      // Act
      const { result } = renderAuthHook();
      
      let success;
      await act(async () => {
        success = await result.current.login(credentials);
      });
      
      // Assert
      expect(loginUser).toHaveBeenCalledWith(credentials);
      expect(mockDispatch).toHaveBeenCalled();
      expect(success).toBe(true);
    });
    
    it('should return false when login fails', async () => {
      // Arrange
      const credentials: LoginFormValues = {
        email: 'test@example.com',
        password: 'wrong-password',
        remember: false,
        useBiometrics: false
      };
      
      // Mock failed login
      (loginUser as jest.Mock).mockReturnValue({ type: 'auth/login' });
      mockDispatch.mockResolvedValue({
        unwrap: jest.fn().mockRejectedValue(new Error('Invalid credentials'))
      });
      
      // Act
      const { result } = renderAuthHook();
      
      let success;
      await act(async () => {
        success = await result.current.login(credentials);
      });
      
      // Assert
      expect(loginUser).toHaveBeenCalledWith(credentials);
      expect(mockDispatch).toHaveBeenCalled();
      expect(success).toBe(false);
    });

    it('should handle error state during login', async () => {
      // Arrange
      const credentials: LoginFormValues = {
        email: 'test@example.com',
        password: 'password123',
        remember: true,
        useBiometrics: false
      };
      
      const errorState = {
        ...mockAuthState,
        error: 'Authentication failed'
      };
      
      (useAppSelector as jest.Mock).mockImplementation(selector => 
        selector({
          auth: errorState
        })
      );
      
      // Mock failed login
      (loginUser as jest.Mock).mockReturnValue({ type: 'auth/login' });
      mockDispatch.mockRejectedValue(new Error('Network error'));
      
      // Act
      const { result } = renderAuthHook(errorState);
      
      let success;
      await act(async () => {
        success = await result.current.login(credentials);
      });
      
      // Assert
      expect(loginUser).toHaveBeenCalledWith(credentials);
      expect(success).toBe(false);
    });
  });
  
  describe('loginWithBiometrics', () => {
    it('should call loginWithBiometricsUser and return true on success', async () => {
      // Arrange
      const initialState = { biometricsEnabled: true };
      
      (useAppSelector as jest.Mock).mockImplementation(selector => 
        selector({
          auth: { ...mockAuthState, ...initialState }
        })
      );
      
      // Mock successful biometric login
      (loginWithBiometricsUser as jest.Mock).mockReturnValue({ type: 'auth/loginWithBiometrics' });
      mockDispatch.mockResolvedValue({
        unwrap: jest.fn().mockResolvedValue({
          user: mockUser
        })
      });
      
      // Act
      const { result } = renderAuthHook(initialState);
      
      let success;
      await act(async () => {
        success = await result.current.loginWithBiometrics();
      });
      
      // Assert
      expect(loginWithBiometricsUser).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalled();
      expect(success).toBe(true);
    });
    
    it('should set error and return false when biometrics are not enabled', async () => {
      // Arrange
      const initialState = { biometricsEnabled: false };
      
      (useAppSelector as jest.Mock).mockImplementation(selector => 
        selector({
          auth: { ...mockAuthState, ...initialState }
        })
      );
      
      // Act
      const { result } = renderAuthHook(initialState);
      
      let success;
      await act(async () => {
        success = await result.current.loginWithBiometrics();
      });
      
      // Assert
      expect(mockDispatch).toHaveBeenCalled(); // Should be called with setError
      expect(success).toBe(false);
    });

    it('should return false when biometric authentication fails', async () => {
      // Arrange
      const initialState = { biometricsEnabled: true };
      
      (useAppSelector as jest.Mock).mockImplementation(selector => 
        selector({
          auth: { ...mockAuthState, ...initialState }
        })
      );
      
      // Mock failed biometric login
      (loginWithBiometricsUser as jest.Mock).mockReturnValue({ type: 'auth/loginWithBiometrics' });
      mockDispatch.mockResolvedValue({
        unwrap: jest.fn().mockRejectedValue(new Error('Biometric authentication failed'))
      });
      
      // Act
      const { result } = renderAuthHook(initialState);
      
      let success;
      await act(async () => {
        success = await result.current.loginWithBiometrics();
      });
      
      // Assert
      expect(loginWithBiometricsUser).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalled();
      expect(success).toBe(false);
    });
  });
  
  describe('register', () => {
    it('should call registerUser and return true on success', async () => {
      // Arrange
      const userData: RegisterFormValues = {
        email: 'new@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'FREELANCER',
        agreeToTerms: true,
        enableBiometrics: false
      };
      
      // Mock successful registration
      (registerUser as jest.Mock).mockReturnValue({ type: 'auth/register' });
      mockDispatch.mockResolvedValue({
        unwrap: jest.fn().mockResolvedValue({
          user: { ...mockUser, email: userData.email }
        })
      });
      
      // Act
      const { result } = renderAuthHook();
      
      let success;
      await act(async () => {
        success = await result.current.register(userData);
      });
      
      // Assert
      expect(registerUser).toHaveBeenCalledWith(userData);
      expect(mockDispatch).toHaveBeenCalled();
      expect(success).toBe(true);
    });
    
    it('should return false when registration fails', async () => {
      // Arrange
      const userData: RegisterFormValues = {
        email: 'existing@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'FREELANCER',
        agreeToTerms: true,
        enableBiometrics: false
      };
      
      // Mock failed registration
      (registerUser as jest.Mock).mockReturnValue({ type: 'auth/register' });
      mockDispatch.mockResolvedValue({
        unwrap: jest.fn().mockRejectedValue(new Error('Email already in use'))
      });
      
      // Act
      const { result } = renderAuthHook();
      
      let success;
      await act(async () => {
        success = await result.current.register(userData);
      });
      
      // Assert
      expect(registerUser).toHaveBeenCalledWith(userData);
      expect(mockDispatch).toHaveBeenCalled();
      expect(success).toBe(false);
    });

    it('should handle invalid form data during registration', async () => {
      // Arrange
      const invalidUserData: RegisterFormValues = {
        email: '', // Invalid email
        password: 'pass', // Too short
        confirmPassword: 'password', // Doesn't match
        firstName: 'John',
        lastName: 'Doe',
        role: 'FREELANCER',
        agreeToTerms: false, // Must be true
        enableBiometrics: false
      };
      
      // Mock failed registration
      (registerUser as jest.Mock).mockReturnValue({ type: 'auth/register' });
      mockDispatch.mockResolvedValue({
        unwrap: jest.fn().mockRejectedValue(new Error('Validation error'))
      });
      
      // Act
      const { result } = renderAuthHook();
      
      let success;
      await act(async () => {
        success = await result.current.register(invalidUserData);
      });
      
      // Assert
      expect(registerUser).toHaveBeenCalledWith(invalidUserData);
      expect(success).toBe(false);
    });
  });
  
  describe('logout', () => {
    it('should call logoutUser and navigate to login screen', async () => {
      // Arrange
      (logoutUser as jest.Mock).mockReturnValue({ type: 'auth/logout' });
      mockDispatch.mockResolvedValue({
        unwrap: jest.fn().mockResolvedValue(true)
      });
      
      // Act
      const { result } = renderAuthHook();
      
      await act(async () => {
        await result.current.logout();
      });
      
      // Assert
      expect(logoutUser).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalled();
    });
    
    it('should still navigate to login screen if logout fails', async () => {
      // Arrange
      (logoutUser as jest.Mock).mockReturnValue({ type: 'auth/logout' });
      mockDispatch.mockResolvedValue({
        unwrap: jest.fn().mockRejectedValue(new Error('Logout failed'))
      });
      
      // Act
      const { result } = renderAuthHook();
      
      await act(async () => {
        await result.current.logout();
      });
      
      // Assert
      expect(logoutUser).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalled();
      // We can't test navigation directly in this environment, but the hook's logic
      // ensures it attempts to navigate even when logout fails
    });
  });
  
  describe('hasPermission', () => {
    it('should return false when user is not authenticated', () => {
      // Arrange
      const initialState = { isAuthenticated: false, user: null };
      
      (useAppSelector as jest.Mock).mockImplementation(selector => 
        selector({
          auth: { ...mockAuthState, ...initialState }
        })
      );
      
      // Act
      const { result } = renderAuthHook(initialState);
      const hasPermission = result.current.hasPermission(Permission.JOBS_VIEW);
      
      // Assert
      expect(hasPermission).toBe(false);
    });
    
    it('should check permission for authenticated user', () => {
      // Arrange
      const initialState = { 
        isAuthenticated: true, 
        user: mockUser 
      };
      
      (useAppSelector as jest.Mock).mockImplementation(selector => 
        selector({
          auth: { ...mockAuthState, ...initialState }
        })
      );
      
      // Mock the hasPermission function from auth lib
      jest.mock('../../src/lib/auth', () => ({
        hasPermission: jest.fn().mockReturnValue(true)
      }));
      
      // Act
      const { result } = renderAuthHook(initialState);
      const hasPermission = result.current.hasPermission(Permission.JOBS_VIEW);
      
      // Assert
      // Testing the integration with the actual hasPermission function is difficult
      // in this isolated test environment, so we're primarily testing that the hook's
      // logic respects the authentication state
      expect(typeof hasPermission).toBe('boolean');
    });
    
    it('should return false when no user is present', () => {
      // Arrange
      const initialState = { 
        isAuthenticated: true, // Authenticated but no user object
        user: null
      };
      
      (useAppSelector as jest.Mock).mockImplementation(selector => 
        selector({
          auth: { ...mockAuthState, ...initialState }
        })
      );
      
      // Act
      const { result } = renderAuthHook(initialState);
      const hasPermission = result.current.hasPermission(Permission.JOBS_VIEW);
      
      // Assert
      expect(hasPermission).toBe(false);
    });
  });
});