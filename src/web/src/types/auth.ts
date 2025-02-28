/**
 * Type definitions for authentication-related entities in the AI Talent Marketplace
 * This file contains interface and type definitions for authentication state,
 * form values, JWT payloads, and permission management.
 * 
 * @version 1.0.0
 */

import { User, UserRole, AuthProvider } from '../../../backend/shared/src/types/user.types';

/**
 * Interface representing the authentication state in the Redux store
 */
export interface AuthState {
  /** Flag indicating if user is authenticated */
  isAuthenticated: boolean;
  /** The authenticated user or null when not authenticated */
  user: User | null;
  /** JWT access token */
  token: string | null;
  /** JWT refresh token for obtaining new access tokens */
  refreshToken: string | null;
  /** Flag indicating if authentication is in progress */
  loading: boolean;
  /** Error message if authentication fails */
  error: string | null;
  /** Flag indicating if two-factor authentication is required */
  requiresTwoFactor: boolean;
}

/**
 * Interface for login form input values
 */
export interface LoginFormValues {
  /** User email address */
  email: string;
  /** User password */
  password: string;
  /** Flag to remember user session */
  remember: boolean;
}

/**
 * Interface for registration form input values
 */
export interface RegisterFormValues {
  /** User email address */
  email: string;
  /** User password */
  password: string;
  /** Password confirmation to ensure correct entry */
  confirmPassword: string;
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /** Selected user role (employer or freelancer) */
  role: UserRole;
  /** Flag indicating user agrees to terms and conditions */
  agreeToTerms: boolean;
}

/**
 * Interface for forgot password form input values
 */
export interface ForgotPasswordFormValues {
  /** Email address for password reset */
  email: string;
}

/**
 * Interface for password reset form input values
 */
export interface ResetPasswordFormValues {
  /** Password reset token from email */
  token: string;
  /** New password */
  password: string;
  /** New password confirmation */
  confirmPassword: string;
}

/**
 * Interface for changing password form input values
 */
export interface ChangePasswordFormValues {
  /** Current user password for verification */
  currentPassword: string;
  /** New desired password */
  newPassword: string;
  /** New password confirmation */
  confirmPassword: string;
}

/**
 * Interface defining the structure of JWT token payload
 */
export interface JwtPayload {
  /** Subject (usually user ID) */
  sub: string;
  /** User email */
  email: string;
  /** User role for authorization */
  role: UserRole;
  /** Token issued at timestamp */
  iat: number;
  /** Token expiration timestamp */
  exp: number;
}

/**
 * Type for permission strings in the application
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
  | 'admin:users';

/**
 * Object containing all permission constants in the application
 * Used for consistent permission checking throughout the app
 */
export const Permission = {
  /** Permission to view job listings */
  JOBS_VIEW: 'jobs:view' as AuthPermission,
  /** Permission to create new job postings */
  JOBS_CREATE: 'jobs:create' as AuthPermission,
  /** Permission to edit existing job postings */
  JOBS_EDIT: 'jobs:edit' as AuthPermission,
  /** Permission to delete job postings */
  JOBS_DELETE: 'jobs:delete' as AuthPermission,
  
  /** Permission to view proposals */
  PROPOSALS_VIEW: 'proposals:view' as AuthPermission,
  /** Permission to create new proposals */
  PROPOSALS_CREATE: 'proposals:create' as AuthPermission,
  /** Permission to edit existing proposals */
  PROPOSALS_EDIT: 'proposals:edit' as AuthPermission,
  /** Permission to delete proposals */
  PROPOSALS_DELETE: 'proposals:delete' as AuthPermission,
  
  /** Permission to view contracts */
  CONTRACTS_VIEW: 'contracts:view' as AuthPermission,
  /** Permission to create contracts */
  CONTRACTS_CREATE: 'contracts:create' as AuthPermission,
  /** Permission to edit contracts */
  CONTRACTS_EDIT: 'contracts:edit' as AuthPermission,
  
  /** Permission to view payment information */
  PAYMENTS_VIEW: 'payments:view' as AuthPermission,
  /** Permission to create payments */
  PAYMENTS_CREATE: 'payments:create' as AuthPermission,
  
  /** Permission to view project workspace */
  WORKSPACE_VIEW: 'workspace:view' as AuthPermission,
  /** Permission to edit project workspace */
  WORKSPACE_EDIT: 'workspace:edit' as AuthPermission,
  
  /** Permission to view user profiles */
  PROFILE_VIEW: 'profile:view' as AuthPermission,
  /** Permission to edit user profile */
  PROFILE_EDIT: 'profile:edit' as AuthPermission,
  
  /** Permission to access admin dashboard */
  ADMIN_DASHBOARD: 'admin:dashboard' as AuthPermission,
  /** Permission to manage users */
  USER_MANAGEMENT: 'admin:users' as AuthPermission
};

/**
 * Mapping of user roles to their respective permissions
 * Implements Role-Based Access Control (RBAC)
 */
export const RolePermissions = {
  /** Admin permissions - full system access */
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
    Permission.USER_MANAGEMENT
  ],
  
  /** Employer permissions - focused on job management */
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
    Permission.PROFILE_EDIT
  ],
  
  /** Freelancer permissions - focused on proposals and work */
  FREELANCER: [
    Permission.JOBS_VIEW,
    Permission.PROPOSALS_VIEW,
    Permission.PROPOSALS_CREATE,
    Permission.PROPOSALS_EDIT,
    Permission.PROPOSALS_DELETE,
    Permission.CONTRACTS_VIEW,
    Permission.PAYMENTS_VIEW,
    Permission.WORKSPACE_VIEW,
    Permission.WORKSPACE_EDIT,
    Permission.PROFILE_VIEW,
    Permission.PROFILE_EDIT
  ],
  
  /** Guest permissions - limited to viewing public information */
  GUEST: [
    Permission.JOBS_VIEW,
    Permission.PROFILE_VIEW
  ]
};

/**
 * Interface for two-factor authentication setup response
 * Contains data needed to complete 2FA enrollment
 */
export interface TwoFactorSetupResponse {
  /** Secret key for TOTP generation */
  secret: string;
  /** QR code URL to be scanned by authenticator apps */
  qrCodeUrl: string;
}