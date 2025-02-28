/**
 * Axios HTTP Client Configuration
 * 
 * This module configures and exports a pre-configured Axios instance for making HTTP requests 
 * to the backend API. It includes authentication token handling, request/response interceptors,
 * error handling, and support for cancellable requests.
 * 
 * Security features:
 * - Automatic JWT token attachment and refresh
 * - Secure token storage via Android KeyStore
 * - HTTPS/TLS for all communications
 * - Request timeout limits
 * - Retry mechanism for transient failures
 * 
 * @version 1.0.0
 */

import axios, { 
  AxiosInstance, 
  AxiosRequestConfig, 
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
  CancelToken,
  isCancel
} from 'axios'; // axios v1.6.0

import NetInfo from '@react-native-community/netinfo'; // @react-native-community/netinfo v6.0.0

import { 
  getAuthToken,
  getRefreshToken,
  saveAuthToken,
  saveRefreshToken,
  deleteAuthToken,
  deleteRefreshToken
} from '../utils/keychain';

// API Configuration Constants
const API_BASE_URL = 'https://api.talent-marketplace.ai/api/v1';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const UPLOAD_TIMEOUT = 120000; // 2 minutes for file uploads
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // Base delay in milliseconds for retry

/**
 * Create and configure the base Axios instance
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Platform': 'android',
  },
});

/**
 * Configures request and response interceptors for the Axios instance
 * 
 * @param axiosInstance The Axios instance to configure
 */
const setupAxiosInterceptors = (axiosInstance: AxiosInstance): void => {
  // Request interceptor - adds authentication token and handles request configuration
  axiosInstance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      // Clone the config to avoid modifying the original
      const newConfig = { ...config };
      
      // Get authentication token from secure storage
      const token = await getAuthToken();
      
      // If token exists, add it to the Authorization header
      if (token) {
        newConfig.headers = newConfig.headers || {};
        newConfig.headers.Authorization = `Bearer ${token}`;
      }
      
      // Set specific timeout for upload requests
      if (newConfig.url?.includes('/upload')) {
        newConfig.timeout = UPLOAD_TIMEOUT;
      }
      
      return newConfig;
    },
    (error) => {
      // Request error handling
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor - handles common error scenarios and token refresh
  axiosInstance.interceptors.response.use(
    // Success response handler - pass through
    (response: AxiosResponse) => response,
    
    // Error response handler
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
      
      // Only attempt token refresh for 401 errors (Unauthorized) 
      // and if we haven't already tried to refresh for this request
      if (error.response?.status === 401 && !originalRequest._retry) {
        // Mark this request as having been retried
        originalRequest._retry = true;
        
        try {
          // Attempt to refresh the authentication token
          const newToken = await refreshAuthToken();
          
          // If token refresh was successful
          if (newToken) {
            // Update the Authorization header with the new token
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            
            // Retry the original request with the new token
            return axiosInstance(originalRequest);
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          // Token refresh failed, let the error pass through
        }
      }
      
      // Handle network errors and implement retry for specific cases
      if (await isNetworkError(error) && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;
        // For network errors, initiate a retry with exponential backoff
        try {
          return await retryRequest(originalRequest, 0);
        } catch (retryError) {
          // If all retries fail, let the error pass through
          return Promise.reject(retryError);
        }
      }
      
      // If we couldn't handle the error in any special way, just pass it through
      return Promise.reject(error);
    }
  );
};

/**
 * Attempts to refresh the authentication token when it expires
 * 
 * @returns Promise that resolves to the new token if successful, null otherwise
 */
const refreshAuthToken = async (): Promise<string | null> => {
  try {
    // Get the refresh token from secure storage
    const refreshToken = await getRefreshToken();
    
    // If no refresh token exists, we can't refresh
    if (!refreshToken) {
      console.warn('No refresh token available');
      return null;
    }
    
    // Create a separate axios instance for token refresh to avoid interceptor loops
    const tokenRefreshInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: DEFAULT_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Platform': 'android',
      },
    });
    
    // Make the token refresh request
    const response = await tokenRefreshInstance.post('/auth/refresh', {
      refreshToken,
    });
    
    // Check if the response contains the expected data
    if (response.data && response.data.token && response.data.refreshToken) {
      const { token, refreshToken: newRefreshToken } = response.data;
      
      // Save the new tokens in secure storage
      await saveAuthToken(token);
      await saveRefreshToken(newRefreshToken);
      
      return token;
    }
    
    // If we didn't get the expected response data
    console.warn('Invalid token refresh response', response.data);
    return null;
  } catch (error) {
    console.error('Token refresh error:', error);
    
    // Clean up by deleting the tokens since they're no longer valid
    await deleteAuthToken();
    await deleteRefreshToken();
    
    return null;
  }
};

/**
 * Creates a cancel token and cancel function for request cancellation
 * 
 * @returns Object containing the cancel token and cancel function
 */
const createCancelToken = (): { cancelToken: CancelToken; cancel: () => void } => {
  const source = axios.CancelToken.source();
  return {
    cancelToken: source.token,
    cancel: source.cancel,
  };
};

/**
 * Determines if an error is due to network connectivity issues
 * 
 * @param error The error to check
 * @returns True if the error is network-related, false otherwise
 */
const isNetworkError = async (error: any): Promise<boolean> => {
  // Check for common network error patterns
  if (!error) return false;
  
  // Check if it's a timeout
  if (error.code === 'ECONNABORTED') return true;
  
  // Check for specific error messages that indicate network issues
  if (error.message && (
    error.message.includes('Network Error') ||
    error.message.includes('timeout') ||
    error.message.includes('connection refused')
  )) {
    return true;
  }
  
  // Check if the device is actually offline
  try {
    const netInfoState = await NetInfo.fetch();
    return !netInfoState.isConnected;
  } catch (netInfoError) {
    console.error('Error checking network connectivity:', netInfoError);
    return false;
  }
};

/**
 * Retries a failed request with exponential backoff
 * 
 * @param config The original request configuration
 * @param retryCount The current retry attempt count
 * @returns Promise that resolves to the response if successful
 */
const retryRequest = async (config: AxiosRequestConfig, retryCount: number): Promise<any> => {
  try {
    // Check if we've exceeded the maximum number of retry attempts
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      throw new Error(`Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) exceeded`);
    }
    
    // Calculate delay with exponential backoff (e.g., 1s, 2s, 4s)
    const delay = RETRY_DELAY * Math.pow(2, retryCount);
    
    // Wait for the calculated delay
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Attempt the request again
    const response = await api.request(config);
    return response;
  } catch (error) {
    if (await isNetworkError(error)) {
      // If it's still a network error, retry again with increased count
      return retryRequest(config, retryCount + 1);
    }
    
    // If it's not a network error anymore, or retries are exhausted, throw the error
    throw error;
  }
};

/**
 * Standardized error handling function for Axios errors
 * 
 * @param error The Axios error to handle
 * @returns Normalized error object with consistent structure
 */
const handleAxiosError = (error: AxiosError<any>): { message: string; status?: number; data?: any } => {
  // Check if this is a request cancellation
  if (isCancel(error)) {
    return { message: 'Request was cancelled' };
  }
  
  // Initialize variables for error details
  let status: number | undefined = undefined;
  let data: any = undefined;
  let message = 'An unexpected error occurred';
  
  // Extract information from the error object if available
  if (error.response) {
    // The server responded with a status code outside of 2xx range
    status = error.response.status;
    data = error.response.data;
    
    // Use provided error message from API if available
    if (data && typeof data === 'object' && data.message) {
      message = data.message;
    } else {
      // Map common HTTP status codes to user-friendly messages
      switch (status) {
        case 400:
          message = 'Invalid request. Please check your data and try again.';
          break;
        case 401:
          message = 'Authentication required. Please log in again.';
          break;
        case 403:
          message = 'You do not have permission to access this resource.';
          break;
        case 404:
          message = 'The requested resource was not found.';
          break;
        case 422:
          message = 'Validation error. Please check your input.';
          break;
        case 429:
          message = 'Too many requests. Please try again later.';
          break;
        case 500:
          message = 'Server error. Our team has been notified.';
          break;
        case 503:
          message = 'Service unavailable. Please try again later.';
          break;
        default:
          if (status >= 500) {
            message = 'Server error. Please try again later.';
          } else if (status >= 400) {
            message = 'Request error. Please try again.';
          }
      }
    }
  } else if (error.request) {
    // The request was made but no response was received
    if (error.code === 'ECONNABORTED') {
      message = 'Request timed out. Please try again.';
    } else {
      message = 'No response received from server. Please try again.';
    }
  } else {
    // Something happened in setting up the request
    message = error.message || 'Error preparing request. Please try again.';
  }
  
  // Log detailed error information in development
  // Using typeof __DEV__ to safely check if the React Native global is available
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status,
      message,
      data,
      error: error.toJSON ? error.toJSON() : error,
    });
  }
  
  // Return normalized error object
  return { message, status, data };
};

// Initialize the Axios instance with interceptors
setupAxiosInterceptors(api);

// Default export of the configured Axios instance
export default api;

// Named exports for utility functions
export {
  createCancelToken,
  handleAxiosError,
  refreshAuthToken,
  isNetworkError,
  retryRequest,
};