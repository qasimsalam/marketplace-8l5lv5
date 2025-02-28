/**
 * Auth Slice for AI Talent Marketplace Android App
 * 
 * This Redux Toolkit slice manages authentication state in the mobile application,
 * including user login/registration, token management, and biometric authentication.
 * 
 * Security features include:
 * - Secure token storage via Android KeyStore
 * - Biometric authentication support
 * - Role-based access control
 * - Automatic auth state restoration
 * 
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import AsyncStorage from '@react-native-async-storage/async-storage'; // ^1.19.1

import { 
  AuthState, 
  LoginFormValues, 
  RegisterFormValues, 
  ForgotPasswordFormValues, 
  ResetPasswordFormValues,
  BiometricAuthResult,
  BiometricType
} from '../../types/auth.types';

import { 
  login, 
  register, 
  logout, 
  forgotPassword, 
  resetPassword, 
  loginWithBiometrics, 
  enableBiometrics, 
  disableBiometrics,
  getAuthState
} from '../../lib/auth';

import {
  saveAuthToken,
  getAuthToken,
  deleteAuthToken,
  saveRefreshToken,
  getRefreshToken,
  deleteRefreshToken
} from '../../utils/keychain';

import {
  isBiometricAvailable,
  getBiometricType
} from '../../utils/biometrics';

// Key for persisting non-sensitive auth state in AsyncStorage
const PERSIST_AUTH_STATE_KEY = 'persist_auth_state';

// Initial state for the auth slice
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  loading: false,
  error: null,
  requiresTwoFactor: false,
  biometricsEnabled: false
};

/**
 * Async thunk for user login
 * 
 * Authenticates a user with email and password, storing the tokens securely
 * and enabling biometric authentication if requested.
 */
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginFormValues, { rejectWithValue }) => {
    try {
      // Call the login function with provided credentials
      const result = await login(credentials);
      
      // Handle successful login by returning user and tokens
      return {
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken,
        biometricsEnabled: credentials.useBiometrics
      };
    } catch (error) {
      // Handle authentication errors
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk for user registration
 * 
 * Registers a new user account and authenticates them in the system,
 * enabling biometric authentication if requested.
 */
export const registerUser = createAsyncThunk(
  'auth/register',
  async (registerData: RegisterFormValues, { rejectWithValue }) => {
    try {
      // Call the register function with provided registration data
      const result = await register(registerData);
      
      // Handle successful registration by returning user and tokens
      return {
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken,
        biometricsEnabled: registerData.enableBiometrics
      };
    } catch (error) {
      // Handle registration errors
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk for user logout
 * 
 * Logs out the current user, invalidating the session on the server and
 * cleaning up all locally stored authentication data.
 */
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      // Call the logout function to invalidate session on server
      await logout();
      // Clean up auth state from Redux store
      return true;
    } catch (error) {
      // Handle logout errors
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk for requesting password reset
 * 
 * Initiates a password reset process by sending a reset link
 * to the user's email address.
 */
export const forgotUserPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      // Call the forgotPassword function with provided email
      const result = await forgotPassword(email);
      
      if (!result.success) {
        return rejectWithValue(result.message);
      }
      
      // Return success status and message from response
      return result;
    } catch (error) {
      // Handle errors
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk for resetting password
 * 
 * Completes the password reset process using a token received
 * via email and the new password chosen by the user.
 */
export const resetUserPassword = createAsyncThunk(
  'auth/resetPassword',
  async (resetData: ResetPasswordFormValues, { rejectWithValue }) => {
    try {
      // Call the resetPassword function with provided reset data
      const result = await resetPassword(resetData);
      
      if (!result.success) {
        return rejectWithValue(result.message);
      }
      
      // Return success status and message from response
      return result;
    } catch (error) {
      // Handle errors
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk for biometric authentication
 * 
 * Authenticates a user using device biometrics (fingerprint, face)
 * and previously stored credentials.
 */
export const loginWithBiometric = createAsyncThunk(
  'auth/loginWithBiometric',
  async (_, { rejectWithValue }) => {
    try {
      // Call the loginWithBiometrics function
      const result = await loginWithBiometrics();
      
      if (!result) {
        return rejectWithValue('Biometric authentication failed');
      }
      
      // Handle successful biometric authentication by returning user and tokens
      return {
        user: result.user,
        token: result.token,
        refreshToken: result.refreshToken,
        biometricsEnabled: true
      };
    } catch (error) {
      // Handle biometric authentication errors
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk for enabling or disabling biometric authentication
 * 
 * Toggles biometric authentication on or off based on the provided parameter.
 */
export const toggleBiometrics = createAsyncThunk(
  'auth/toggleBiometrics',
  async (enable: boolean, { rejectWithValue }) => {
    try {
      if (enable) {
        // If enable is true, call enableBiometrics function
        const result = await enableBiometrics();
        return result === BiometricAuthResult.SUCCESS;
      } else {
        // If enable is false, call disableBiometrics function
        return await disableBiometrics();
      }
    } catch (error) {
      // Handle errors
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk for restoring authentication state on app startup
 * 
 * Checks for existing authentication tokens and restores the app state
 * if valid credentials are found.
 */
export const restoreAuthState = createAsyncThunk(
  'auth/restoreState',
  async (_, { rejectWithValue }) => {
    try {
      // Call getAuthState to retrieve authentication state from secure storage
      const authState = await getAuthState();
      
      // Check if auth tokens are valid and not expired
      if (!authState) {
        // If invalid, trigger a silent clean-up of invalid tokens
        return null;
      }
      
      // If valid, return the full auth state
      return authState;
    } catch (error) {
      // Handle errors
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk for checking biometric authentication availability
 * 
 * Determines if biometric authentication is available on the device
 * and what type of biometric authentication is supported.
 */
export const checkBiometricAvailability = createAsyncThunk(
  'auth/checkBiometrics',
  async (_, { rejectWithValue }) => {
    try {
      // Call isBiometricAvailable to check if biometrics are available
      const available = await isBiometricAvailable();
      let type = BiometricType.NONE;
      
      // If available, determine the type of biometric
      if (available) {
        type = await getBiometricType();
      }
      
      // Return object with availability status and biometric type
      return { available, type };
    } catch (error) {
      // Handle errors
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Auth slice definition
 * 
 * Creates a Redux slice with reducers for all authentication-related
 * actions and state management.
 */
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Synchronous reducers
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login user
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.biometricsEnabled = action.payload.biometricsEnabled;
        state.loading = false;
        state.error = null;
        
        // Persist non-sensitive auth state
        try {
          AsyncStorage.setItem(PERSIST_AUTH_STATE_KEY, JSON.stringify({
            isAuthenticated: true,
            user: action.payload.user,
            biometricsEnabled: action.payload.biometricsEnabled
          }));
        } catch (error) {
          console.error('Error persisting auth state:', error);
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
    
    // Register user
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.biometricsEnabled = action.payload.biometricsEnabled;
        state.loading = false;
        state.error = null;
        
        // Persist non-sensitive auth state
        try {
          AsyncStorage.setItem(PERSIST_AUTH_STATE_KEY, JSON.stringify({
            isAuthenticated: true,
            user: action.payload.user,
            biometricsEnabled: action.payload.biometricsEnabled
          }));
        } catch (error) {
          console.error('Error persisting auth state:', error);
        }
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
    
    // Logout user
    builder
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        // Reset state to initial values
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.requiresTwoFactor = false;
        state.biometricsEnabled = false;
        state.loading = false;
        state.error = null;
        
        // Remove persisted auth state
        AsyncStorage.removeItem(PERSIST_AUTH_STATE_KEY)
          .catch(error => console.error('Error removing auth state:', error));
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        
        // Even if server-side logout failed, reset client state
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.requiresTwoFactor = false;
        state.biometricsEnabled = false;
        
        // Remove persisted auth state
        AsyncStorage.removeItem(PERSIST_AUTH_STATE_KEY)
          .catch(error => console.error('Error removing auth state:', error));
      });
    
    // Forgot password
    builder
      .addCase(forgotUserPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotUserPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(forgotUserPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
    
    // Reset password
    builder
      .addCase(resetUserPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetUserPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resetUserPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
    
    // Biometric login
    builder
      .addCase(loginWithBiometric.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithBiometric.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.biometricsEnabled = action.payload.biometricsEnabled;
        state.loading = false;
        state.error = null;
        
        // Persist non-sensitive auth state
        try {
          AsyncStorage.setItem(PERSIST_AUTH_STATE_KEY, JSON.stringify({
            isAuthenticated: true,
            user: action.payload.user,
            biometricsEnabled: action.payload.biometricsEnabled
          }));
        } catch (error) {
          console.error('Error persisting auth state:', error);
        }
      })
      .addCase(loginWithBiometric.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
    
    // Toggle biometrics
    builder
      .addCase(toggleBiometrics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleBiometrics.fulfilled, (state, action) => {
        state.biometricsEnabled = action.payload;
        state.loading = false;
        
        // Update persisted auth state
        if (state.isAuthenticated && state.user) {
          try {
            AsyncStorage.setItem(PERSIST_AUTH_STATE_KEY, JSON.stringify({
              isAuthenticated: state.isAuthenticated,
              user: state.user,
              biometricsEnabled: action.payload
            }));
          } catch (error) {
            console.error('Error updating auth state:', error);
          }
        }
      })
      .addCase(toggleBiometrics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
    
    // Restore auth state
    builder
      .addCase(restoreAuthState.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(restoreAuthState.fulfilled, (state, action) => {
        if (action.payload) {
          state.isAuthenticated = action.payload.isAuthenticated;
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.refreshToken = action.payload.refreshToken;
          state.requiresTwoFactor = action.payload.requiresTwoFactor;
          state.biometricsEnabled = action.payload.biometricsEnabled;
        }
        state.loading = false;
      })
      .addCase(restoreAuthState.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
    
    // Check biometric availability (doesn't affect auth state, just informational)
    builder
      .addCase(checkBiometricAvailability.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkBiometricAvailability.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(checkBiometricAvailability.rejected, (state) => {
        state.loading = false;
      });
  },
});

// Export actions and reducer
export const { setError, clearError } = authSlice.actions;
export const authReducer = authSlice.reducer;

// Default export
export default authSlice.reducer;