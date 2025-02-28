/**
 * Authentication type definitions for the AI Talent Marketplace Android application
 * This file defines interfaces, types, and enumerations for user authentication,
 * authorization, form validation, and biometric authentication features.
 * 
 * @version 1.0.0
 */

import { User, UserRole, AuthProvider } from '../../../backend/shared/src/types/user.types';

/**
 * Interface representing authentication state for Redux store and context hooks
 * Used to track the current user's authentication status throughout the application
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
 * Interface for login form input values
 * Used for validation and submission of login credentials
 */
export interface LoginFormValues {
  email: string;
  password: string;
  remember: boolean;
  useBiometrics: boolean;
}

/**
 * Interface for registration form input values
 * Used for validation and submission of new user registration
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
 * Interface for forgot password form input values
 * Used to initiate the password recovery process
 */
export interface ForgotPasswordFormValues {
  email: string;
}

/**
 * Interface for password reset form input values
 * Used to complete the password reset process with a valid token
 */
export interface ResetPasswordFormValues {
  token: string;
  password: string;
  confirmPassword: string;
}

/**
 * Interface for changing password form input values
 * Used by authenticated users to update their password
 */
export interface ChangePasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Interface for two-factor authentication verification form
 * Used to submit TOTP code during 2FA verification
 */
export interface TwoFactorVerifyFormValues {
  code: string;
}

/**
 * Interface for JWT token payload structure
 * Represents the decoded contents of the JWT authentication token
 */
export interface JwtPayload {
  sub: string; // Subject (user ID)
  email: string;
  role: UserRole;
  iat: number; // Issued at timestamp
  exp: number; // Expiration timestamp
}

/**
 * Type for permission strings in the application
 * Defines all possible permission types for role-based access control
 */
export type AuthPermission = 
  | 'jobs:view'
  | 'jobs:create'
  | 'jobs:edit'
  | 'jobs:delete'
  | 'proposals:view'
  | 'proposals:create'
  | 'proposals:edit'
  | 'proposals:delete'
  | 'contracts:view'
  | 'contracts:create'
  | 'contracts:edit'
  | 'payments:view'
  | 'payments:create'
  | 'workspace:view'
  | 'workspace:edit'
  | 'profile:view'
  | 'profile:edit'
  | 'admin:dashboard'
  | 'users:manage';

/**
 * Object containing all permission constants in the application
 * Provides type-safe access to permission strings
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
  USER_MANAGEMENT: 'users:manage' as AuthPermission,
};

/**
 * Mapping of user roles to their respective permissions
 * Defines what actions each role is authorized to perform
 */
export const RolePermissions = {
  ADMIN: [
    Permission.JOBS_VIEW,
    Permission.JOBS_CREATE,
    Permission.JOBS_EDIT,
    Permission.JOBS_DELETE,
    Permission.PROPOSALS_VIEW,
    Permission.PROPOSALS_CREATE,
    Permission.PROPOSALS_EDIT,
    Permission.PROPOSALS_DELETE,
    Permission.CONTRACTS_VIEW,
    Permission.CONTRACTS_CREATE,
    Permission.CONTRACTS_EDIT,
    Permission.PAYMENTS_VIEW,
    Permission.PAYMENTS_CREATE,
    Permission.WORKSPACE_VIEW,
    Permission.WORKSPACE_EDIT,
    Permission.PROFILE_VIEW,
    Permission.PROFILE_EDIT,
    Permission.ADMIN_DASHBOARD,
    Permission.USER_MANAGEMENT,
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
 * Interface for two-factor authentication setup response
 * Contains the secret key and QR code URL for TOTP setup
 */
export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUrl: string;
}

/**
 * Enumeration of available biometric authentication types
 * Identifies the type of biometric authentication available on the device
 */
export enum BiometricType {
  FINGERPRINT = 'fingerprint',
  FACE = 'face',
  IRIS = 'iris',
  NONE = 'none',
}

/**
 * Enumeration of biometric authentication result statuses
 * Represents possible outcomes of a biometric authentication attempt
 */
export enum BiometricAuthResult {
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELED = 'canceled',
  NOT_AVAILABLE = 'not_available',
  NOT_ENROLLED = 'not_enrolled',
}

/**
 * Interface for configuring biometric authentication prompts
 * Customizes the UI for biometric authentication dialogs
 */
export interface BiometricAuthOptions {
  promptTitle: string;
  promptSubtitle: string;
  promptDescription: string;
  cancelButtonText: string;
}

/**
 * Enumeration of possible authentication session statuses
 * Tracks the current state of the user's authentication session
 */
export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  INVALID = 'invalid',
}

/**
 * Interface for stored authentication credentials
 * Used for secure storage of user credentials for automatic login
 */
export interface AuthCredentials {
  email: string;
  password: string;
}