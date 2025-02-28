/**
 * Redux Slice for Authentication
 * Manages user authentication state in the AI Talent Marketplace application
 * 
 * v1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import { 
  AuthState,
  LoginFormValues,
  RegisterFormValues,
  ForgotPasswordFormValues,
  ResetPasswordFormValues,
  TwoFactorSetupResponse
} from '../../types/auth';
import { 
  User, 
  UserRole, 
  AuthProvider 
} from '../../../backend/shared/src/types/user.types';
import { authAPI } from '../../lib/api';
import { setAuthToken, removeAuthToken } from '../../utils/storage';
import { hasPermission } from '../../lib/auth';

// Initial state for the auth slice
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  loading: false,
  error: null,
  requiresTwoFactor: false
};

/**
 * Async thunk for user login with email and password
 */
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginFormValues, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      setAuthToken(response.token, credentials.remember);
      return response;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Login failed. Please try again.');
    }
  }
);

/**
 * Async thunk for user registration
 */
export const register = createAsyncThunk(
  'auth/register',
  async (userData: RegisterFormValues, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(userData);
      setAuthToken(response.token, true);
      return response;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Registration failed. Please try again.');
    }
  }
);

/**
 * Async thunk for user logout
 */
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authAPI.logout();
      removeAuthToken();
      return;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Logout failed. Please try again.');
    }
  }
);

/**
 * Async thunk for getting the current authenticated user
 */
export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const user = await authAPI.getCurrentUser();
      return user;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to fetch user data.');
    }
  }
);

/**
 * Async thunk for initiating the password reset process
 */
export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (data: ForgotPasswordFormValues, { rejectWithValue }) => {
    try {
      const response = await authAPI.forgotPassword(data);
      return { message: 'Password reset instructions sent to your email.' };
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to process your request. Please try again.');
    }
  }
);

/**
 * Async thunk for completing the password reset process
 */
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (data: ResetPasswordFormValues, { rejectWithValue }) => {
    try {
      const response = await authAPI.resetPassword(data);
      return { message: 'Password has been reset successfully. You can now log in.' };
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to reset password. Please try again.');
    }
  }
);

/**
 * Async thunk for OAuth authentication
 */
export const loginWithProvider = createAsyncThunk(
  'auth/loginWithProvider',
  async ({ provider, code }: { provider: AuthProvider; code: string }, { rejectWithValue }) => {
    try {
      // The API expects 'token' but our specification defines 'code'
      const response = await authAPI.loginWithProvider(provider, code);
      setAuthToken(response.token, true);
      return response;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue(`Failed to authenticate with ${provider}. Please try again.`);
    }
  }
);

/**
 * Async thunk for setting up two-factor authentication
 */
export const setupTwoFactor = createAsyncThunk(
  'auth/setupTwoFactor',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authAPI.setupTwoFactor();
      return response;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to set up two-factor authentication. Please try again.');
    }
  }
);

/**
 * Async thunk for verifying the two-factor authentication setup
 */
export const verifyTwoFactor = createAsyncThunk(
  'auth/verifyTwoFactor',
  async ({ token, secret }: { token: string; secret: string }, { rejectWithValue }) => {
    try {
      // API expects 'code' but our specification defines it as 'token'
      const response = await authAPI.verifyTwoFactor(token);
      return response;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to verify two-factor code. Please try again.');
    }
  }
);

/**
 * Async thunk for disabling two-factor authentication
 */
export const disableTwoFactor = createAsyncThunk(
  'auth/disableTwoFactor',
  async ({ token }: { token: string }, { rejectWithValue }) => {
    try {
      // API expects 'code' but our specification defines it as 'token'
      const response = await authAPI.disableTwoFactor(token);
      return response;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to disable two-factor authentication. Please try again.');
    }
  }
);

// Create the auth slice
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Clear any error messages in the auth state
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Login action handlers
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Register action handlers
    builder
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        // Handle case where refreshToken might not be returned from register
        state.refreshToken = action.payload.refreshToken || null;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Logout action handlers
    builder
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        // Reset the entire state to initial values
        return {
          ...initialState,
          loading: false
        };
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Get current user action handlers
    builder
      .addCase(getCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        // If we can't get the current user, consider the user not authenticated
        state.isAuthenticated = false;
        state.user = null;
      });

    // Forgot password action handlers  
    builder
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Reset password action handlers
    builder
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Login with provider action handlers
    builder
      .addCase(loginWithProvider.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithProvider.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        // Handle case where refreshToken might not be returned
        state.refreshToken = action.payload.refreshToken || null;
      })
      .addCase(loginWithProvider.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Two-factor setup action handlers
    builder
      .addCase(setupTwoFactor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(setupTwoFactor.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(setupTwoFactor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Verify two-factor action handlers
    builder
      .addCase(verifyTwoFactor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyTwoFactor.fulfilled, (state) => {
        state.loading = false;
        if (state.user) {
          state.user.twoFactorEnabled = true;
        }
      })
      .addCase(verifyTwoFactor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Disable two-factor action handlers
    builder
      .addCase(disableTwoFactor.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(disableTwoFactor.fulfilled, (state) => {
        state.loading = false;
        if (state.user) {
          state.user.twoFactorEnabled = false;
        }
      })
      .addCase(disableTwoFactor.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

// Export actions and reducer
export const { clearError } = authSlice.actions;
export const authReducer = authSlice.reducer;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectRequiresTwoFactor = (state: { auth: AuthState }) => state.auth.requiresTwoFactor;