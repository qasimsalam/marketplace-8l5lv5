import { renderHook, act } from '@testing-library/react-hooks'; // ^8.0.1
import { Provider } from 'react-redux'; // ^8.1.2
import { configureStore } from '@reduxjs/toolkit'; // ^1.9.5
import { useAuth } from '../../src/hooks/useAuth';
import { 
  login, register, logout, getCurrentUser, forgotPassword, 
  resetPassword, loginWithProvider, clearError 
} from '../../src/store/slices/authSlice';
import { 
  LoginFormValues, RegisterFormValues, ForgotPasswordFormValues, 
  ResetPasswordFormValues, Permission, AuthPermission 
} from '../../src/types/auth';
import { UserRole, AuthProvider } from '../../../backend/shared/src/types/user.types';
import { hasPermission } from '../../src/lib/auth';

// Mock the auth slice actions
jest.mock('../../src/store/slices/authSlice', () => ({
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  getCurrentUser: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  loginWithProvider: jest.fn(),
  setupTwoFactor: jest.fn(),
  verifyTwoFactor: jest.fn(),
  disableTwoFactor: jest.fn(),
  clearError: jest.fn(),
  selectAuth: jest.fn((state) => state.auth),
  selectUser: jest.fn((state) => state.auth.user),
  selectIsAuthenticated: jest.fn((state) => state.auth.isAuthenticated),
  selectAuthLoading: jest.fn((state) => state.auth.loading),
  selectAuthError: jest.fn((state) => state.auth.error),
  selectRequiresTwoFactor: jest.fn((state) => state.auth.requiresTwoFactor),
}));

// Mock useToast hook
jest.mock('../../src/hooks/useToast', () => ({
  __esModule: true,
  default: () => ({
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  })
}));

// Mock hasPermission function
jest.mock('../../src/lib/auth', () => ({
  hasPermission: jest.fn()
}));

describe('useAuth hook', () => {
  // Setup mock store
  const createMockStore = (initialState = {}) => {
    return configureStore({
      reducer: {
        auth: (state = initialState, action) => state,
      },
    });
  };

  // Create wrapper component with store provider
  const createWrapper = (store) => ({ children }) => (
    <Provider store={store}>{children}</Provider>
  );

  // Mock state
  let mockStore;
  let wrapper;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock store with initial state
    const initialState = {
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null,
      requiresTwoFactor: false,
    };
    
    mockStore = createMockStore(initialState);
    wrapper = createWrapper(mockStore);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should return authentication state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.requiresTwoFactor).toBe(false);
  });

  test('should call login action and handle successful login', async () => {
    // Mock successful login response
    const user = { id: '123', email: 'test@example.com', role: 'freelancer' };
    (login as jest.Mock).mockReturnValue({
      unwrap: jest.fn().mockResolvedValue({ user })
    });
    
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    // Call login function
    let returnedUser;
    await act(async () => {
      returnedUser = await result.current.login({
        email: 'test@example.com',
        password: 'password',
        remember: true
      });
    });
    
    // Check if login was called with correct params
    expect(login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
      remember: true
    });
    
    // Should return the user
    expect(returnedUser).toEqual(user);
  });

  test('should call login action and handle failed login', async () => {
    // Mock failed login
    const errorMessage = 'Invalid credentials';
    (login as jest.Mock).mockReturnValue({
      unwrap: jest.fn().mockRejectedValue(errorMessage)
    });
    
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    // Call login function
    let error;
    try {
      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'wrong',
          remember: true
        });
      });
    } catch (e) {
      error = e;
    }
    
    // Should throw error
    expect(error).toBeDefined();
    expect(error.message).toBe(errorMessage);
    
    expect(login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'wrong',
      remember: true
    });
  });

  test('should call register action and handle successful registration', async () => {
    // Mock successful registration
    const user = { id: '123', email: 'test@example.com', role: 'freelancer' };
    (register as jest.Mock).mockReturnValue({
      unwrap: jest.fn().mockResolvedValue({ user })
    });
    
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    const registerData = {
      email: 'test@example.com',
      password: 'password',
      confirmPassword: 'password',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.FREELANCER,
      agreeToTerms: true
    };
    
    // Call register function
    let returnedUser;
    await act(async () => {
      returnedUser = await result.current.register(registerData);
    });
    
    // Check if register was called with correct params
    expect(register).toHaveBeenCalledWith(registerData);
    
    // Should return the user
    expect(returnedUser).toEqual(user);
  });

  test('should call logout action and handle successful logout', async () => {
    // Mock successful logout
    (logout as jest.Mock).mockReturnValue({
      unwrap: jest.fn().mockResolvedValue(undefined)
    });
    
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    // Call logout function
    await act(async () => {
      await result.current.logout();
    });
    
    // Check if logout was called
    expect(logout).toHaveBeenCalled();
  });

  test('should call forgotPassword action correctly', async () => {
    // Mock successful forgotPassword
    (forgotPassword as jest.Mock).mockReturnValue({
      unwrap: jest.fn().mockResolvedValue({ success: true })
    });
    
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    const data = { email: 'test@example.com' };
    
    // Call forgotPassword function
    await act(async () => {
      await result.current.forgotPassword(data);
    });
    
    // Check if forgotPassword was called with correct params
    expect(forgotPassword).toHaveBeenCalledWith(data);
  });

  test('should call resetPassword action correctly', async () => {
    // Mock successful resetPassword
    (resetPassword as jest.Mock).mockReturnValue({
      unwrap: jest.fn().mockResolvedValue({ success: true })
    });
    
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    const data = {
      token: 'reset-token',
      password: 'newpassword',
      confirmPassword: 'newpassword'
    };
    
    // Call resetPassword function
    await act(async () => {
      await result.current.resetPassword(data);
    });
    
    // Check if resetPassword was called with correct params
    expect(resetPassword).toHaveBeenCalledWith(data);
  });

  test('should call loginWithProvider action correctly', async () => {
    // Mock successful OAuth login
    const user = { id: '123', email: 'test@example.com', role: 'freelancer' };
    (loginWithProvider as jest.Mock).mockReturnValue({
      unwrap: jest.fn().mockResolvedValue({ user })
    });
    
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    // Call loginWithProvider function
    let returnedUser;
    await act(async () => {
      returnedUser = await result.current.loginWithProvider(AuthProvider.GITHUB, 'auth-code');
    });
    
    // Check if loginWithProvider was called with correct params
    expect(loginWithProvider).toHaveBeenCalledWith({
      provider: AuthProvider.GITHUB,
      code: 'auth-code'
    });
    
    // Should return the user
    expect(returnedUser).toEqual(user);
  });

  test('should correctly check for permissions', () => {
    // Set up store with authenticated admin user
    const adminStore = createMockStore({
      isAuthenticated: true,
      user: { id: '123', role: UserRole.ADMIN },
      loading: false,
      error: null
    });
    
    const adminWrapper = createWrapper(adminStore);
    
    // Mock hasPermission to return true for admin
    (hasPermission as jest.Mock).mockImplementation((role, permission) => {
      if (role === UserRole.ADMIN) return true;
      if (role === UserRole.EMPLOYER) {
        return [Permission.JOBS_CREATE, Permission.CONTRACTS_VIEW].includes(permission);
      }
      if (role === UserRole.FREELANCER) {
        return [Permission.PROPOSALS_CREATE, Permission.JOBS_VIEW].includes(permission);
      }
      return false;
    });
    
    // Test admin permissions
    const { result: adminResult } = renderHook(() => useAuth(), {
      wrapper: adminWrapper
    });
    
    expect(adminResult.current.hasPermission(Permission.ADMIN_DASHBOARD)).toBe(true);
    expect(adminResult.current.hasPermission(Permission.JOBS_CREATE)).toBe(true);
    
    // Set up store with authenticated employer user
    const employerStore = createMockStore({
      isAuthenticated: true,
      user: { id: '123', role: UserRole.EMPLOYER },
      loading: false,
      error: null
    });
    
    const employerWrapper = createWrapper(employerStore);
    
    // Test employer permissions
    const { result: employerResult } = renderHook(() => useAuth(), {
      wrapper: employerWrapper
    });
    
    expect(employerResult.current.hasPermission(Permission.JOBS_CREATE)).toBe(true);
    expect(employerResult.current.hasPermission(Permission.ADMIN_DASHBOARD)).toBe(false);
    
    // Set up store with authenticated freelancer user
    const freelancerStore = createMockStore({
      isAuthenticated: true,
      user: { id: '123', role: UserRole.FREELANCER },
      loading: false,
      error: null
    });
    
    const freelancerWrapper = createWrapper(freelancerStore);
    
    // Test freelancer permissions
    const { result: freelancerResult } = renderHook(() => useAuth(), {
      wrapper: freelancerWrapper
    });
    
    expect(freelancerResult.current.hasPermission(Permission.PROPOSALS_CREATE)).toBe(true);
    expect(freelancerResult.current.hasPermission(Permission.JOBS_CREATE)).toBe(false);
  });

  test('should handle two-factor authentication flow', async () => {
    // Set up state with requiresTwoFactor flag
    const twoFactorStore = createMockStore({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null,
      requiresTwoFactor: true
    });
    
    const twoFactorWrapper = createWrapper(twoFactorStore);
    
    // Mock verifyTwoFactor action
    const verifyTwoFactor = jest.fn().mockReturnValue({
      unwrap: jest.fn().mockResolvedValue({ success: true })
    });
    
    // Add the mock to the module
    jest.mock('../../src/store/slices/authSlice', () => ({
      ...jest.requireActual('../../src/store/slices/authSlice'),
      verifyTwoFactor
    }));
    
    const { result } = renderHook(() => useAuth(), {
      wrapper: twoFactorWrapper
    });
    
    // Verify state shows 2FA is required
    expect(result.current.requiresTwoFactor).toBe(true);
    
    // Call verify function (would typically happen after user enters code)
    let error;
    try {
      await act(async () => {
        await result.current.verifyTwoFactor('123456', 'secret-key');
      });
    } catch (e) {
      error = e;
    }
    
    // Should not throw error
    expect(error).toBeUndefined();
  });
});