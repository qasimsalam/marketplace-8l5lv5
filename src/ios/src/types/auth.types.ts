/**
 * Authentication Type Definitions
 * 
 * This file defines TypeScript types, interfaces, and enumerations for authentication-related
 * functionality in the AI Talent Marketplace iOS application, including user authentication,
 * authorization, form validation, and biometric authentication.
 * 
 * @version 1.0.0
 */

import { User, UserRole, AuthProvider } from '../../../backend/shared/src/types/user.types';

/**
 * Represents the authentication state in the application
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  requiresTwoFactor: boolean;
  biometricsEnabled: boolean;
}

/**
 * Values for the login form
 */
export interface LoginFormValues {
  email: string;
  password: string;
  remember: boolean;
  useBiometrics: boolean;
}

/**
 * Values for the registration form
 */
export interface RegisterFormValues {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  agreeToTerms: boolean;
  enableBiometrics: boolean;
}

/**
 * Values for the forgot password form
 */
export interface ForgotPasswordFormValues {
  email: string;
}

/**
 * Values for the reset password form
 */
export interface ResetPasswordFormValues {
  token: string;
  password: string;
  confirmPassword: string;
}

/**
 * Values for the change password form
 */
export interface ChangePasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Structure of the JWT token payload
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/**
 * Type for authentication permissions
 */
export type AuthPermission = string;

/**
 * All available permissions in the application
 */
export const Permission = {
  JOBS_VIEW: 'jobs:view' as AuthPermission,
  JOBS_CREATE: 'jobs:create' as AuthPermission,
  JOBS_EDIT: 'jobs:edit' as AuthPermission,
  JOBS_DELETE: 'jobs:delete' as AuthPermission,
  
  PROPOSALS_VIEW: 'proposals:view' as AuthPermission,
  PROPOSALS_CREATE: 'proposals:create' as AuthPermission,
  PROPOSALS_EDIT: 'proposals:edit' as AuthPermission,
  PROPOSALS_DELETE: 'proposals:delete' as AuthPermission,
  
  CONTRACTS_VIEW: 'contracts:view' as AuthPermission,
  CONTRACTS_CREATE: 'contracts:create' as AuthPermission,
  CONTRACTS_EDIT: 'contracts:edit' as AuthPermission,
  
  PAYMENTS_VIEW: 'payments:view' as AuthPermission,
  PAYMENTS_CREATE: 'payments:create' as AuthPermission,
  
  WORKSPACE_VIEW: 'workspace:view' as AuthPermission,
  WORKSPACE_EDIT: 'workspace:edit' as AuthPermission,
  
  PROFILE_VIEW: 'profile:view' as AuthPermission,
  PROFILE_EDIT: 'profile:edit' as AuthPermission,
  
  ADMIN_DASHBOARD: 'admin:dashboard' as AuthPermission,
  USER_MANAGEMENT: 'admin:users' as AuthPermission,
};

/**
 * Mapping of roles to their assigned permissions
 */
export const RolePermissions = {
  ADMIN: [
    // Admin has all permissions
    ...Object.values(Permission),
  ],
  EMPLOYER: [
    Permission.JOBS_VIEW,
    Permission.JOBS_CREATE,
    Permission.JOBS_EDIT,
    Permission.JOBS_DELETE,
    Permission.PROPOSALS_VIEW,
    Permission.CONTRACTS_VIEW,
    Permission.CONTRACTS_CREATE,
    Permission.CONTRACTS_EDIT,
    Permission.PAYMENTS_VIEW,
    Permission.PAYMENTS_CREATE,
    Permission.WORKSPACE_VIEW,
    Permission.WORKSPACE_EDIT,
    Permission.PROFILE_VIEW,
    Permission.PROFILE_EDIT,
  ],
  FREELANCER: [
    Permission.JOBS_VIEW,
    Permission.PROPOSALS_VIEW,
    Permission.PROPOSALS_CREATE,
    Permission.PROPOSALS_EDIT,
    Permission.CONTRACTS_VIEW,
    Permission.PAYMENTS_VIEW,
    Permission.WORKSPACE_VIEW,
    Permission.WORKSPACE_EDIT,
    Permission.PROFILE_VIEW,
    Permission.PROFILE_EDIT,
  ],
  GUEST: [
    Permission.JOBS_VIEW,
    Permission.PROFILE_VIEW,
  ],
};

/**
 * Response from the two-factor authentication setup endpoint
 */
export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUrl: string;
}

/**
 * Types of biometric authentication supported by the application
 */
export enum BiometricType {
  FINGERPRINT = 'fingerprint',
  FACE = 'face',
  IRIS = 'iris',
  NONE = 'none',
}

/**
 * Result statuses from biometric authentication attempts
 */
export enum BiometricAuthResult {
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELED = 'canceled',
  NOT_AVAILABLE = 'not_available',
  NOT_ENROLLED = 'not_enrolled',
}

/**
 * Status of the user's authentication session
 */
export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  INVALID = 'invalid',
}

/**
 * Credentials stored for authentication
 */
export interface AuthCredentials {
  email: string;
  password: string;
}