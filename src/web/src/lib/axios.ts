/**
 * Axios HTTP Client Configuration
 * v1.0.0 - Axios 1.6.0
 * 
 * Configures and exports an Axios instance for making HTTP requests to the backend API
 * with authentication, error handling, and request/response interceptors.
 * 
 * Features:
 * - JWT authentication header management
 * - Automatic token refresh on expiration
 * - Standardized error handling
 * - Request cancellation support
 * - Configurable timeouts for regular and file upload requests
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

import { 
  getAuthToken, 
  setAuthToken, 
  removeAuthToken 
} from '../utils/storage';

// Global configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const UPLOAD_TIMEOUT = 120000; // 2 minutes for file uploads

/**
 * Creates and configures the base Axios instance with default settings
 */
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

/**
 * Configures request and response interceptors for the Axios instance
 * 
 * @param axiosInstance - The Axios instance to configure
 */
export function setupAxiosInterceptors(axiosInstance: AxiosInstance): void {
  // Request interceptor - adds authentication token and adjusts timeout for uploads
  axiosInstance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      // Don't intercept token refresh requests to avoid infinite loops
      if (config.url?.includes('/auth/refresh')) {
        return config;
      }

      // Get auth token from storage
      const token = getAuthToken();
      
      // If token exists, add it to the Authorization header
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Set extended timeout for file uploads
      if (config.headers?.['Content-Type']?.includes('multipart/form-data')) {
        config.timeout = UPLOAD_TIMEOUT;
      }
      
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - handles authentication errors and token refresh
  axiosInstance.interceptors.response.use(
    // Pass through successful responses
    (response) => response,
    
    // Handle errors
    async (error: AxiosError) => {
      const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
      
      // Skip if this is already a retry or no config is available
      if (!originalRequest || originalRequest._retry) {
        return Promise.reject(error);
      }

      // Handle 401 Unauthorized - attempt to refresh token
      if (error.response?.status === 401) {
        originalRequest._retry = true;

        try {
          // Attempt to refresh the token
          const newToken = await refreshAuthToken();
          
          if (newToken) {
            // If we got a new token, retry the original request
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            } else {
              originalRequest.headers = {
                Authorization: `Bearer ${newToken}`
              };
            }
            
            return axiosInstance(originalRequest);
          } else {
            // Token refresh failed, user needs to login again
            // Redirect to login page when using in browser context
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return Promise.reject(error);
          }
        } catch (refreshError) {
          // Token refresh failed, proceed with original error
          return Promise.reject(error);
        }
      }
      
      // Handle other errors
      return Promise.reject(error);
    }
  );
}

/**
 * Attempts to refresh the authentication token when it expires
 * 
 * @returns Promise resolving to new token if successful, null otherwise
 */
export async function refreshAuthToken(): Promise<string | null> {
  try {
    // Create a separate instance to avoid interceptor loops
    const refreshTokenInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: DEFAULT_TIMEOUT,
    });
    
    // Call the token refresh endpoint 
    const response = await refreshTokenInstance.post('/auth/refresh');
    
    if (response.data?.token) {
      // Store the new token
      setAuthToken(response.data.token, true);
      return response.data.token;
    }
    
    return null;
  } catch (error) {
    // If refresh fails, remove the token and return null
    removeAuthToken();
    return null;
  }
}

/**
 * Creates a cancel token and cancel function for request cancellation
 * 
 * @returns Object containing cancel token and cancel function
 */
export function createCancelToken(): { cancelToken: CancelToken; cancel: () => void } {
  const source = axios.CancelToken.source();
  return {
    cancelToken: source.token,
    cancel: () => source.cancel('Request cancelled by the user')
  };
}

/**
 * Standardized error handling function for Axios errors
 * 
 * @param error - Axios error object
 * @returns Normalized error object with message, status, and data
 */
export function handleAxiosError(error: AxiosError<any>): { message: string; status?: number; data?: any } {
  // Default error message
  let message = 'An unexpected error occurred';
  let status: number | undefined = undefined;
  let data: any = undefined;
  
  // Handle request cancellation
  if (isCancel(error)) {
    return { message: 'Request was cancelled' };
  }
  
  // Extract information from the error object
  if (error.response) {
    // The server responded with a status code outside the 2xx range
    status = error.response.status;
    data = error.response.data;
    
    // Extract message from response data if available
    message = data?.message || `Error ${status}: ${error.message}`;
    
    // Handle specific status codes
    switch (status) {
      case 401:
        message = 'Authentication required. Please login again.';
        break;
      case 403:
        message = 'You do not have permission to perform this action.';
        break;
      case 404:
        message = 'The requested resource was not found.';
        break;
      case 422:
        message = 'Validation error. Please check your inputs.';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        message = 'Server error. Please try again later.';
        break;
    }
  } else if (error.request) {
    // The request was made but no response was received
    if (error.code === 'ECONNABORTED') {
      message = 'Request timed out. Please try again.';
    } else {
      message = 'Network error. Please check your connection.';
    }
  }
  
  // Log detailed error information in development
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', {
      message,
      status,
      data,
      originalError: error
    });
  }
  
  return {
    message,
    status,
    data
  };
}

// Set up interceptors for the instance
setupAxiosInterceptors(axiosInstance);

// Export the configured axios instance as default
export default axiosInstance;