/**
 * Redux Toolkit slice for authentication state management in iOS app
 * 
 * This module provides a comprehensive state management solution for user authentication,
 * including login, registration, token management, biometric authentication, and
 * two-factor authentication for the AI Talent Marketplace iOS application.
 * 
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import AsyncStorage from '@react-native-async-storage/async-storage'; // ^1.18.2
import { AnyAction, ThunkAction } from '@reduxjs/toolkit'; // ^1.9.5

import { 
  AuthState, 
  LoginFormValues, 
  RegisterFormValues, 
  ResetPasswordFormValues, 
  ChangePasswordFormValues,
  AuthProvider,
  BiometricType,
  BiometricAuthResult,
  TwoFactorSetupResponse
} from '../../types/auth.types';

import { 
  login, 
  loginWithBiometrics, 
  register, 
  logout, 
  forgotPassword, 
  resetPassword, 
  changePassword,
  setupTwoFactor,
  verifyTwoFactor,
  disableTwoFactor,
  loginWithProvider,
  enableBiometrics,
  disableBiometrics,
  isBiometricsEnabled,
  getSessionStatus,
  refreshSession,
  getCurrentUser
} from '../../lib/auth';

import { User } from '../../../../backend/shared/src/types/user.types';

import {
  getAuthToken,
  saveAuthToken,
  deleteAuthToken,
  getRefreshToken,
  saveRefreshToken,
  deleteRefreshToken
} from '../../utils/keychain';

// Constants
const BIOMETRICS_STORAGE_KEY = 'biometrics_enabled';

// Type definition for ThunkAction
type AppThunk = ThunkAction<ReturnType, Record<string, unknown>, unknown, AnyAction>;

// Define the initial state
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
 * Async thunk for user login with email and password
 */
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginFormValues, { rejectWithValue }) => {
    try {
      const response = await login(credentials);
      
      // Store tokens securely
      await saveAuthToken(response.token);
      await saveRefreshToken(response.refreshToken);
      
      // If user wants to use biometrics, save preference
      if (credentials.useBiometrics) {
        await AsyncStorage.setItem(BIOMETRICS_STORAGE_KEY, 'true');
      }
      
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

/**
 * Async thunk for biometric authentication
 */
export const loginWithBiometricsUser = createAsyncThunk(
  'auth/loginWithBiometrics',
  async (_, { rejectWithValue }) => {
    try {
      const response = await loginWithBiometrics();
      
      if (!response) {
        return rejectWithValue('Biometric authentication failed');
      }
      
      // Store tokens securely
      await saveAuthToken(response.token);
      await saveRefreshToken(response.refreshToken);
      
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Biometric login failed');
    }
  }
);

/**
 * Async thunk for user registration
 */
export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: RegisterFormValues, { rejectWithValue }) => {
    try {
      const response = await register(userData);
      
      // Store tokens securely
      await saveAuthToken(response.token);
      await saveRefreshToken(response.refreshToken);
      
      // If user wants to use biometrics, save preference
      if (userData.enableBiometrics) {
        await AsyncStorage.setItem(BIOMETRICS_STORAGE_KEY, 'true');
      }
      
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

/**
 * Async thunk for user logout
 */
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await logout();
      
      // Remove tokens from secure storage
      await deleteAuthToken();
      await deleteRefreshToken();
      
      return;
    } catch (error) {
      return rejectWithValue(error.message || 'Logout failed');
    }
  }
);

/**
 * Async thunk for initiating password recovery
 */
export const forgotPasswordUser = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      return await forgotPassword(email);
    } catch (error) {
      return rejectWithValue(error.message || 'Password recovery request failed');
    }
  }
);

/**
 * Async thunk for resetting password with token
 */
export const resetPasswordUser = createAsyncThunk(
  'auth/resetPassword',
  async (data: ResetPasswordFormValues, { rejectWithValue }) => {
    try {
      return await resetPassword(data);
    } catch (error) {
      return rejectWithValue(error.message || 'Password reset failed');
    }
  }
);

/**
 * Async thunk for changing password
 */
export const changePasswordUser = createAsyncThunk(
  'auth/changePassword',
  async (data: ChangePasswordFormValues, { rejectWithValue }) => {
    try {
      return await changePassword(data);
    } catch (error) {
      return rejectWithValue(error.message || 'Password change failed');
    }
  }
);

/**
 * Async thunk for setting up two-factor authentication
 */
export const setupTwoFactorUser = createAsyncThunk(
  'auth/setupTwoFactor',
  async (_, { rejectWithValue }) => {
    try {
      return await setupTwoFactor();
    } catch (error) {
      return rejectWithValue(error.message || 'Two-factor setup failed');
    }
  }
);

/**
 * Async thunk for verifying and enabling two-factor authentication
 */
export const verifyTwoFactorUser = createAsyncThunk(
  'auth/verifyTwoFactor',
  async (code: string, { rejectWithValue }) => {
    try {
      await verifyTwoFactor(code);
      return;
    } catch (error) {
      return rejectWithValue(error.message || 'Two-factor verification failed');
    }
  }
);

/**
 * Async thunk for disabling two-factor authentication
 */
export const disableTwoFactorUser = createAsyncThunk(
  'auth/disableTwoFactor',
  async (code: string, { rejectWithValue }) => {
    try {
      await disableTwoFactor(code);
      return;
    } catch (error) {
      return rejectWithValue(error.message || 'Two-factor disable failed');
    }
  }
);

/**
 * Async thunk for OAuth authentication
 */
export const loginWithProviderUser = createAsyncThunk(
  'auth/loginWithProvider',
  async ({ provider, code, redirectUri }: { provider: AuthProvider; code: string; redirectUri: string }, { rejectWithValue }) => {
    try {
      const response = await loginWithProvider(provider, code, redirectUri);
      
      // Store tokens securely
      await saveAuthToken(response.token);
      await saveRefreshToken(response.refreshToken);
      
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'OAuth login failed');
    }
  }
);

/**
 * Async thunk for enabling biometric authentication
 */
export const enableBiometricsUser = createAsyncThunk(
  'auth/enableBiometrics',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const result = await enableBiometrics(credentials);
      
      if (result === BiometricAuthResult.SUCCESS) {
        await AsyncStorage.setItem(BIOMETRICS_STORAGE_KEY, 'true');
      }
      
      return result;
    } catch (error) {
      return rejectWithValue(error.message || 'Enabling biometrics failed');
    }
  }
);

/**
 * Async thunk for disabling biometric authentication
 */
export const disableBiometricsUser = createAsyncThunk(
  'auth/disableBiometrics',
  async (_, { rejectWithValue }) => {
    try {
      const result = await disableBiometrics();
      
      if (result) {
        await AsyncStorage.removeItem(BIOMETRICS_STORAGE_KEY);
      }
      
      return result;
    } catch (error) {
      return rejectWithValue(error.message || 'Disabling biometrics failed');
    }
  }
);

/**
 * Async thunk for checking and restoring authentication session
 */
export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      // Check current session status
      const sessionStatus = await getSessionStatus();
      
      // If session is expired, try to refresh
      if (sessionStatus === 'expired') {
        const refreshed = await refreshSession();
        if (!refreshed) {
          return null;
        }
      } else if (sessionStatus === 'invalid') {
        return null;
      }
      
      // Get user data and tokens
      const user = await getCurrentUser();
      const token = await getAuthToken();
      const refreshToken = await getRefreshToken();
      
      // Check if biometrics is enabled
      const biometricsEnabled = await AsyncStorage.getItem(BIOMETRICS_STORAGE_KEY) === 'true';
      
      if (!user || !token) {
        return null;
      }
      
      return { user, token, refreshToken, biometricsEnabled };
    } catch (error) {
      return rejectWithValue(error.message || 'Authentication check failed');
    }
  }
);

// Create the auth slice
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Synchronous reducers for local state changes
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
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Login with biometrics
    builder
      .addCase(loginWithBiometricsUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithBiometricsUser.fulfilled, (state, action) => {
        if (action.payload) {
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.refreshToken = action.payload.refreshToken;
          state.biometricsEnabled = true;
        }
        state.loading = false;
      })
      .addCase(loginWithBiometricsUser.rejected, (state, action) => {
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
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
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
        // Reset to initial state except biometricsEnabled preference
        const wasBiometricsEnabled = state.biometricsEnabled;
        Object.assign(state, { ...initialState, biometricsEnabled: wasBiometricsEnabled });
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Forgot password
    builder
      .addCase(forgotPasswordUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPasswordUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(forgotPasswordUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Reset password
    builder
      .addCase(resetPasswordUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPasswordUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resetPasswordUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Change password
    builder
      .addCase(changePasswordUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changePasswordUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(changePasswordUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Setup two-factor
    builder
      .addCase(setupTwoFactorUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(setupTwoFactorUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(setupTwoFactorUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Verify two-factor
    builder
      .addCase(verifyTwoFactorUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyTwoFactorUser.fulfilled, (state) => {
        state.loading = false;
        if (state.user) {
          state.user.twoFactorEnabled = true;
        }
      })
      .addCase(verifyTwoFactorUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Disable two-factor
    builder
      .addCase(disableTwoFactorUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(disableTwoFactorUser.fulfilled, (state) => {
        state.loading = false;
        if (state.user) {
          state.user.twoFactorEnabled = false;
        }
      })
      .addCase(disableTwoFactorUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Login with provider
    builder
      .addCase(loginWithProviderUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithProviderUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(loginWithProviderUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Enable biometrics
    builder
      .addCase(enableBiometricsUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(enableBiometricsUser.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload === BiometricAuthResult.SUCCESS) {
          state.biometricsEnabled = true;
        }
      })
      .addCase(enableBiometricsUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Disable biometrics
    builder
      .addCase(disableBiometricsUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(disableBiometricsUser.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.biometricsEnabled = false;
        }
      })
      .addCase(disableBiometricsUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Check auth
    builder
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.refreshToken = action.payload.refreshToken;
          state.biometricsEnabled = action.payload.biometricsEnabled;
        } else {
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;
          state.refreshToken = null;
        }
      })
      .addCase(checkAuth.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
      });
  },
});

// Export actions
export const { setError, clearError } = authSlice.actions;

// Export reducer
export default authSlice.reducer;