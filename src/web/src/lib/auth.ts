/**
 * Core Authentication Library
 * v1.0.0
 * 
 * Provides utilities for token management, JWT decoding, role-based permission checking,
 * and authentication provider handling for the AI Talent Marketplace web application.
 */

import { Permission, RolePermissions, JwtPayload, AuthPermission } from '../types/auth';
import { UserRole, AuthProvider } from '../../../backend/shared/src/types/user.types';
import { getAuthToken, setAuthToken, removeAuthToken } from '../utils/storage';
import jwtDecode from 'jwt-decode'; // jwt-decode v3.1.2

// Authentication providers mapping for convenient access
export const AUTH_PROVIDERS = {
  GITHUB: AuthProvider.GITHUB,
  LINKEDIN: AuthProvider.LINKEDIN,
  GOOGLE: AuthProvider.GOOGLE,
  LOCAL: AuthProvider.LOCAL
};

// Buffer time in seconds before token expiry to trigger refresh (5 minutes)
const TOKEN_EXPIRY_BUFFER = 300;

/**
 * Decodes JWT token and extracts payload information
 * 
 * @param token - JWT token string to decode
 * @returns Decoded JWT payload or null if invalid
 */
export function decodeToken(token: string): JwtPayload | null {
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    return jwtDecode<JwtPayload>(token);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

/**
 * Checks if a JWT token is expired with a buffer period
 * 
 * @param token - JWT token to check
 * @param bufferSeconds - Seconds before actual expiry to consider token expired (default: TOKEN_EXPIRY_BUFFER)
 * @returns True if token is expired or will expire within buffer, false otherwise
 */
export function isTokenExpired(token: string, bufferSeconds = TOKEN_EXPIRY_BUFFER): boolean {
  const payload = decodeToken(token);
  
  // If token can't be decoded, consider it expired
  if (!payload) {
    return true;
  }
  
  // Get current time in seconds since epoch
  const currentTime = Math.floor(Date.now() / 1000);
  
  // Check if current time is past expiry or within buffer window
  return currentTime >= (payload.exp - bufferSeconds);
}

/**
 * Checks if a user has the required permission based on their role
 * 
 * @param role - User role to check
 * @param permission - Permission to check for
 * @returns True if the user role has the required permission, false otherwise
 */
export function hasPermission(role: UserRole | undefined, permission: AuthPermission): boolean {
  if (!role) {
    return false;
  }
  
  // Check if role exists in RolePermissions mapping
  if (!(role in RolePermissions)) {
    return false;
  }
  
  // Get permissions for the role and check if required permission is included
  const permissions = RolePermissions[role as keyof typeof RolePermissions];
  return permissions.includes(permission);
}

/**
 * Gets a human-readable name for an authentication provider
 * 
 * @param provider - Authentication provider enum value
 * @returns Human-readable provider name
 */
export function getProviderName(provider: AuthProvider): string {
  switch (provider) {
    case AuthProvider.GITHUB:
      return 'GitHub';
    case AuthProvider.LINKEDIN:
      return 'LinkedIn';
    case AuthProvider.GOOGLE:
      return 'Google';
    case AuthProvider.LOCAL:
      return 'Email & Password';
    default:
      return 'Unknown Provider';
  }
}

/**
 * Returns the icon name for a given auth provider
 * 
 * @param provider - Authentication provider enum value
 * @returns Icon identifier for the provider
 */
export function getProviderIcon(provider: AuthProvider): string {
  switch (provider) {
    case AuthProvider.GITHUB:
      return 'github';
    case AuthProvider.LINKEDIN:
      return 'linkedin';
    case AuthProvider.GOOGLE:
      return 'google';
    case AuthProvider.LOCAL:
      return 'email';
    default:
      return 'question-mark';
  }
}

/**
 * Validates a stored token and refreshes if necessary
 * 
 * @returns Promise resolving to true if valid token exists, false otherwise
 */
export async function validateTokenExpiry(): Promise<boolean> {
  const token = getAuthToken();
  
  if (!token) {
    return false;
  }
  
  // Check if token is expired or will expire soon
  if (!isTokenExpired(token)) {
    return true; // Token is valid and not expiring soon
  }
  
  // Try to refresh the token
  return await refreshToken();
}

/**
 * Attempts to refresh an expired JWT token
 * 
 * @returns Promise resolving to true if token refresh succeeds, false otherwise
 */
export async function refreshToken(): Promise<boolean> {
  try {
    // Using a direct import of axios to avoid circular dependencies
    const axios = (await import('axios')).default;
    
    const currentToken = getAuthToken();
    
    if (!currentToken) {
      return false;
    }
    
    // Decode current token to get refresh information
    const payload = decodeToken(currentToken);
    
    if (!payload) {
      // Remove invalid token
      removeAuthToken();
      return false;
    }
    
    // Make API call to refresh the token
    const response = await axios.post('/api/auth/refresh-token', {}, {
      headers: {
        Authorization: `Bearer ${currentToken}`
      }
    });
    
    if (response.data && response.data.accessToken) {
      // Store the new token
      setAuthToken(response.data.accessToken, true);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    
    // Token refresh failed - clean up invalid token
    removeAuthToken();
    return false;
  }
}

/**
 * Retrieves and decodes the current authentication token payload
 * 
 * @returns Decoded token payload or null if no valid token exists
 */
export function getTokenPayload(): JwtPayload | null {
  const token = getAuthToken();
  
  if (!token) {
    return null;
  }
  
  return decodeToken(token);
}

/**
 * Extracts current user ID from JWT token
 * 
 * @returns User ID from token or null if unavailable
 */
export function getCurrentUserId(): string | null {
  const payload = getTokenPayload();
  
  if (!payload) {
    return null;
  }
  
  return payload.sub;
}

/**
 * Extracts current user role from JWT token
 * 
 * @returns User role from token or null if unavailable
 */
export function getCurrentUserRole(): UserRole | null {
  const payload = getTokenPayload();
  
  if (!payload) {
    return null;
  }
  
  return payload.role;
}