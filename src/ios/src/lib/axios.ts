/**
 * Axios HTTP Client Configuration for iOS
 * 
 * This module configures and customizes the Axios HTTP client for making API requests
 * from the iOS mobile application. It implements secure communication with backend services,
 * handles authentication with JWT tokens, manages token refresh, and provides standardized
 * error handling.
 * 
 * @version 1.0.0
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'; // ^1.4.0
import { Platform } from 'react-native'; // 0.72.x
import NetInfo from '@react-native-community/netinfo'; // ^9.3.10
import jwtDecode from 'jwt-decode'; // ^3.1.2

import { getAuthToken, getRefreshToken, saveAuthToken, saveRefreshToken } from '../utils/keychain';
import { getData, storeData } from './storage';
import { JwtPayload } from '../types/auth.types';

// API configuration constants
const API_BASE_URL = 'https://api.aitalentmarketplace.com';
const API_TIMEOUT = 30000; // 30 seconds
const RETRY_COUNT = 3;
const RETRY_DELAY = 1000; // 1 second
const NETWORK_ERROR_MESSAGE = 'Network error. Please check your connection.';
const SERVER_ERROR_MESSAGE = 'Server error. Please try again later.';
const AUTH_ERROR_MESSAGE = 'Authentication error. Please log in again.';
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Standardized API error interface
 */
export interface ApiError {
  status: number;
  message: string;
  details: any;
  code: string;
}

/**
 * Creates and configures a new Axios instance with default settings
 * 
 * @returns Configured Axios instance
 */
const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  });

  // Add platform-specific headers for iOS
  if (Platform.OS === 'ios') {
    instance.defaults.headers.common['X-Platform'] = 'iOS';
    instance.defaults.headers.common['X-Platform-Version'] = Platform.Version;
  }

  // Set response type to JSON
  instance.defaults.responseType = 'json';
  
  // Set validateStatus to consider only status codes outside 2xx range as errors
  instance.defaults.validateStatus = (status) => status >= 200 && status < 300;

  return instance;
};

/**
 * Checks if a JWT token is expired or about to expire
 * 
 * @param token - The JWT token to check
 * @returns True if token is expired or about to expire
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    
    // Check if expiration time exists in token
    if (!decoded.exp) {
      return true;
    }
    
    // Convert current time to seconds (JWT exp is in seconds)
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Check if token is expired or will expire within the threshold
    return decoded.exp <= currentTime + (TOKEN_REFRESH_THRESHOLD / 1000);
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    // If we can't decode the token, consider it expired
    return true;
  }
};

/**
 * Attaches authentication token to a request config
 * 
 * @param config - The request config
 * @param token - The auth token
 * @returns Modified request config with auth header
 */
export const attachAuthToken = (config: any, token: string): any => {
  if (!config.headers) {
    config.headers = {};
  }
  
  config.headers.Authorization = `Bearer ${token}`;
  return config;
};

/**
 * Checks if an error is a network connectivity issue
 * 
 * @param error - The error to check
 * @returns True if error is a network error
 */
const isNetworkError = (error: any): boolean => {
  return (
    !error.response && 
    Boolean(error.code) && 
    (
      error.code === 'ECONNABORTED' || 
      error.code === 'ENOTFOUND' || 
      error.code === 'ECONNRESET' || 
      error.code === 'ETIMEDOUT' ||
      error.message.includes('Network Error')
    )
  );
};

/**
 * Makes a direct API call to refresh an authentication token
 * 
 * @param refreshToken - The refresh token to use
 * @returns Promise resolving to new token and refresh token
 */
const refreshAuthToken = async (refreshToken: string): Promise<{ token: string, refreshToken: string }> => {
  try {
    // Create a clean axios instance for token refresh to avoid interceptors
    const refreshAxios = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });
    
    const response = await refreshAxios.post('/auth/refresh', { refreshToken });
    
    if (response.data && response.data.token && response.data.refreshToken) {
      return {
        token: response.data.token,
        refreshToken: response.data.refreshToken
      };
    }
    
    throw new Error('Invalid token refresh response');
  } catch (error) {
    console.error('Token refresh API call failed:', error);
    throw error;
  }
};

/**
 * Refreshes authentication token and retries a failed request
 * 
 * @param axiosInstance - The Axios instance to use for the retry
 * @param originalRequest - The original failed request config
 * @returns Promise resolving to the result of the retried request
 */
const refreshTokenAndRetry = async (axiosInstance: AxiosInstance, originalRequest: any): Promise<any> => {
  try {
    // Get refresh token
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      throw new Error(AUTH_ERROR_MESSAGE);
    }
    
    // Refresh token
    const newTokens = await refreshAuthToken(refreshToken);
    
    // Save new tokens
    await saveAuthToken(newTokens.token);
    await saveRefreshToken(newTokens.refreshToken);
    
    // Update Authorization header with new token
    originalRequest.headers.Authorization = `Bearer ${newTokens.token}`;
    
    // Retry the original request with the new token
    return axiosInstance(originalRequest);
  } catch (error) {
    console.error('Token refresh and retry failed:', error);
    
    // Clear tokens as they are likely invalid
    await saveAuthToken('');
    await saveRefreshToken('');
    
    throw new Error(AUTH_ERROR_MESSAGE);
  }
};

/**
 * Processes API errors into standardized format with user-friendly messages
 * 
 * @param error - The error to process
 * @returns Standardized error object
 */
export const handleApiError = (error: any): ApiError => {
  let status = 500;
  let message = SERVER_ERROR_MESSAGE;
  let details = null;
  let code = 'server_error';

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    if (axiosError.response) {
      // Server responded with error status
      status = axiosError.response.status;
      
      // Use error message from API if available
      if (axiosError.response.data) {
        const data = axiosError.response.data as any;
        if (data.message) {
          message = data.message;
        }
        if (data.details) {
          details = data.details;
        }
        if (data.code) {
          code = data.code;
        }
      } else {
        // Map HTTP status codes to user-friendly messages
        if (status === 400) {
          message = 'Invalid request. Please check your input.';
          code = 'bad_request';
        } else if (status === 401) {
          message = AUTH_ERROR_MESSAGE;
          code = 'unauthorized';
        } else if (status === 403) {
          message = 'You do not have permission to access this resource.';
          code = 'forbidden';
        } else if (status === 404) {
          message = 'The requested resource was not found.';
          code = 'not_found';
        } else if (status >= 500) {
          message = SERVER_ERROR_MESSAGE;
          code = 'server_error';
        }
      }
    } else if (isNetworkError(axiosError)) {
      // Network/connectivity error
      status = 0;
      message = NETWORK_ERROR_MESSAGE;
      code = 'network_error';
    }
    
    // Include original error for debugging
    details = {
      ...details,
      originalError: {
        message: axiosError.message,
        code: axiosError.code,
        config: axiosError.config ? {
          url: axiosError.config.url,
          method: axiosError.config.method,
        } : null,
      }
    };
  } else {
    // Handle non-Axios errors
    message = error.message || 'An unexpected error occurred.';
    code = 'unknown_error';
    details = { originalError: error };
  }

  return {
    status,
    message,
    details,
    code
  };
};

/**
 * Configures request interceptors for the Axios instance
 * 
 * @param axiosInstance - The Axios instance to configure
 */
const setupRequestInterceptors = (axiosInstance: AxiosInstance): void => {
  axiosInstance.interceptors.request.use(
    async (config) => {
      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        return Promise.reject(new Error(NETWORK_ERROR_MESSAGE));
      }

      // Get auth token from secure storage
      const token = await getAuthToken();
      
      if (token) {
        // Check if token is expired or about to expire
        if (isTokenExpired(token)) {
          try {
            // Get refresh token
            const refreshToken = await getRefreshToken();
            if (!refreshToken) {
              throw new Error(AUTH_ERROR_MESSAGE);
            }
            
            // Refresh token
            const newTokens = await refreshAuthToken(refreshToken);
            
            // Save new tokens
            await saveAuthToken(newTokens.token);
            await saveRefreshToken(newTokens.refreshToken);
            
            // Attach new token to request
            config = attachAuthToken(config, newTokens.token);
          } catch (error) {
            console.error('Token refresh failed in request interceptor:', error);
            return Promise.reject(new Error(AUTH_ERROR_MESSAGE));
          }
        } else {
          // Token is valid, attach it to request
          config = attachAuthToken(config, token);
        }
      }

      // Add app version header
      const appInfo = await getData('app_info');
      if (appInfo && appInfo.version) {
        config.headers['X-App-Version'] = appInfo.version;
      }

      return config;
    },
    (error) => {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  );
};

/**
 * Configures response interceptors for the Axios instance
 * 
 * @param axiosInstance - The Axios instance to configure
 */
const setupResponseInterceptors = (axiosInstance: AxiosInstance): void => {
  axiosInstance.interceptors.response.use(
    (response) => {
      // Return successful response data directly
      return response.data;
    },
    async (error) => {
      // Handle error responses
      if (axios.isAxiosError(error)) {
        const originalRequest = error.config;
        
        // Handle 401 Unauthorized (token expired during request)
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            // Attempt to refresh token and retry request
            return await refreshTokenAndRetry(axiosInstance, originalRequest);
          } catch (refreshError) {
            console.error('Token refresh failed in response interceptor:', refreshError);
            return Promise.reject(handleApiError(refreshError));
          }
        }
        
        // Handle other errors
        return Promise.reject(handleApiError(error));
      }
      
      // Handle non-Axios errors
      return Promise.reject(handleApiError(error));
    }
  );
};

// Create and configure the Axios instance
const axiosInstance = createAxiosInstance();
setupRequestInterceptors(axiosInstance);
setupResponseInterceptors(axiosInstance);

// Export the configured instance as default
export default axiosInstance;

// Re-export constants and utilities for external use
export { API_BASE_URL, isTokenExpired };