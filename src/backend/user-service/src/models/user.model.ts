import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
  BeforeUpdate
} from 'typeorm'; // v0.3.17
import {
  IsNotEmpty,
  IsEmail,
  IsEnum,
  Length,
  MinLength,
  IsOptional,
  IsBoolean,
  IsDate
} from 'class-validator'; // v0.14.0
import { v4 } from 'uuid'; // v9.0.1

import {
  UserRole,
  UserStatus,
  AuthProvider,
  VerificationStatus
} from '../../shared/src/types/user.types';
import {
  validateEmail,
  validatePassword
} from '../../shared/src/utils/validation';
import { ValidationError } from '../../shared/src/utils/errors';
import {
  hashPassword,
  verifyPassword
} from '../utils/password';
import { config } from '../config';

/**
 * Entity representing a user in the AI Talent Marketplace platform
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @Column({ name: 'password_hash', nullable: true })
  passwordHash: string;

  @Column({ name: 'first_name' })
  @IsNotEmpty()
  @Length(1, 100)
  firstName: string;

  @Column({ name: 'last_name' })
  @IsNotEmpty()
  @Length(1, 100)
  lastName: string;

  @Column({ 
    type: 'enum', 
    enum: UserRole, 
    default: UserRole.FREELANCER 
  })
  @IsEnum(UserRole)
  role: UserRole;

  @Column({ 
    type: 'enum', 
    enum: UserStatus, 
    default: UserStatus.PENDING_VERIFICATION 
  })
  @IsEnum(UserStatus)
  status: UserStatus;

  @Column({ 
    name: 'auth_provider', 
    type: 'enum', 
    enum: AuthProvider, 
    default: AuthProvider.LOCAL 
  })
  @IsEnum(AuthProvider)
  authProvider: AuthProvider;

  @Column({ name: 'auth_provider_id', nullable: true })
  authProviderId: string;

  @Column({ name: 'two_factor_enabled', default: false })
  @IsBoolean()
  twoFactorEnabled: boolean;

  @Column({ name: 'two_factor_secret', nullable: true })
  twoFactorSecret: string;

  @Column({ name: 'password_history', type: 'simple-array', nullable: true })
  passwordHistory: string[];

  @Column({ name: 'last_password_change_at', type: 'timestamp', nullable: true })
  @IsDate()
  @IsOptional()
  lastPasswordChangeAt: Date;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  @IsDate()
  @IsOptional()
  lastLoginAt: Date;

  @Column({ name: 'login_attempts', default: 0 })
  loginAttempts: number;

  @Column({ name: 'lockout_until', type: 'timestamp', nullable: true })
  @IsDate()
  @IsOptional()
  lockoutUntil: Date;

  @Column({ name: 'reset_password_token', nullable: true })
  resetPasswordToken: string;

  @Column({ name: 'reset_password_expires', type: 'timestamp', nullable: true })
  @IsDate()
  @IsOptional()
  resetPasswordExpires: Date;

  @Column({ name: 'email_verification_token', nullable: true })
  emailVerificationToken: string;

  @Column({ name: 'email_verification_expires', type: 'timestamp', nullable: true })
  @IsDate()
  @IsOptional()
  emailVerificationExpires: Date;

  @Column({ name: 'email_verified', default: false })
  @IsBoolean()
  emailVerified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Creates a new User instance
   * @param userData - Partial user data to initialize with
   */
  constructor(userData: Partial<User> = {}) {
    // Generate UUID if not provided
    this.id = userData.id || v4();
    
    // Assign properties
    Object.assign(this, userData);
    
    // Set defaults if not specified
    this.role = userData.role || UserRole.FREELANCER;
    this.status = userData.status || UserStatus.PENDING_VERIFICATION;
    this.authProvider = userData.authProvider || AuthProvider.LOCAL;
    this.passwordHistory = userData.passwordHistory || [];
    this.twoFactorEnabled = userData.twoFactorEnabled || false;
    this.emailVerified = userData.emailVerified || false;
  }

  /**
   * Sets a new password for the user
   * @param password - New plain text password
   * @throws ValidationError if password doesn't meet requirements
   */
  async setPassword(password: string): Promise<void> {
    // Validate password strength and format
    if (!validatePassword(password)) {
      throw new ValidationError('Password does not meet security requirements');
    }

    // Hash the password using hashPassword utility
    const hashedPassword = await hashPassword(password);

    // Add previous password hash to passwordHistory if exists
    if (this.passwordHash) {
      this.passwordHistory.push(this.passwordHash);
      
      // Limit passwordHistory to last 5 passwords
      if (this.passwordHistory.length > 5) {
        this.passwordHistory = this.passwordHistory.slice(-5);
      }
    }

    // Set passwordHash to the new hash
    this.passwordHash = hashedPassword;
    // Update lastPasswordChangeAt timestamp
    this.lastPasswordChangeAt = new Date();
  }

  /**
   * Validates if a given password matches the user's password hash
   * @param password - Plain text password to validate
   * @returns True if password matches, false otherwise
   */
  async validatePassword(password: string): Promise<boolean> {
    // Check if user has a passwordHash
    if (!this.passwordHash) {
      return false;
    }
    
    // Use verifyPassword utility to compare provided password with stored hash
    return await verifyPassword(password, this.passwordHash);
  }

  /**
   * Generates a reset token for password recovery
   * @returns The generated reset token
   */
  generatePasswordResetToken(): string {
    // Generate a random UUID token
    const token = v4();
    
    // Calculate expiration time based on config settings
    const expiryString = config.auth.passwordReset.tokenExpiry; // "1h"
    const expirationMs = 60 * 60 * 1000; // 1 hour in milliseconds
    
    this.resetPasswordExpires = new Date(Date.now() + expirationMs);
    this.resetPasswordToken = token;
    
    return token;
  }

  /**
   * Generates a token for email address verification
   * @returns The generated verification token
   */
  generateEmailVerificationToken(): string {
    // Generate a random UUID token
    const token = v4();
    
    // Calculate expiration time based on config settings
    const expiryString = config.user.verificationPolicy.verificationTokenExpiry; // "24h"
    const expirationMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    this.emailVerificationExpires = new Date(Date.now() + expirationMs);
    this.emailVerificationToken = token;
    
    return token;
  }

  /**
   * Verifies a user's email using a verification token
   * @param token - The verification token to validate
   * @returns True if verification succeeds, false otherwise
   */
  verifyEmail(token: string): boolean {
    // Check if token matches stored emailVerificationToken
    if (
      this.emailVerificationToken === token &&
      this.emailVerificationExpires &&
      this.emailVerificationExpires > new Date()
    ) {
      // If valid, set emailVerified to true
      this.emailVerified = true;
      
      // If valid, clear emailVerificationToken and emailVerificationExpires
      this.emailVerificationToken = null;
      this.emailVerificationExpires = null;
      
      // If user status is PENDING_VERIFICATION, update to ACTIVE
      if (this.status === UserStatus.PENDING_VERIFICATION) {
        this.status = UserStatus.ACTIVE;
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Resets the user's password using a valid reset token
   * @param token - The reset token to validate
   * @param newPassword - The new password to set
   * @returns True if reset succeeds, false otherwise
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    // Check if token matches stored resetPasswordToken
    if (
      this.resetPasswordToken === token &&
      this.resetPasswordExpires &&
      this.resetPasswordExpires > new Date()
    ) {
      // If valid, call setPassword with the new password
      await this.setPassword(newPassword);
      
      // If valid, clear resetPasswordToken and resetPasswordExpires
      this.resetPasswordToken = null;
      this.resetPasswordExpires = null;
      
      return true;
    }
    
    return false;
  }

  /**
   * Records a login attempt and manages account lockout
   * @param successful - Whether the login attempt was successful
   * @returns False if account is now locked, true otherwise
   */
  recordLoginAttempt(successful: boolean): boolean {
    if (successful) {
      // If successful, reset loginAttempts to 0 and clear lockoutUntil
      this.loginAttempts = 0;
      this.lockoutUntil = null;
      
      // If successful, update lastLoginAt timestamp
      this.lastLoginAt = new Date();
      
      return true;
    } else {
      // If not successful, increment loginAttempts counter
      this.loginAttempts += 1;
      
      // If loginAttempts exceeds threshold, set lockoutUntil timestamp
      const maxAttempts = config.auth.rateLimits.login.maxAttempts;
      if (this.loginAttempts >= maxAttempts) {
        const lockoutDurationMs = config.auth.rateLimits.login.lockoutDuration * 1000;
        this.lockoutUntil = new Date(Date.now() + lockoutDurationMs);
        return false;
      }
      
      return true;
    }
  }

  /**
   * Checks if the user account is currently locked
   * @returns True if account is locked, false otherwise
   */
  isLocked(): boolean {
    // Check if lockoutUntil exists and is in the future
    return !!(this.lockoutUntil && this.lockoutUntil > new Date());
  }

  /**
   * Sets up two-factor authentication for the user
   * @param twoFactorSecret - The TOTP secret
   */
  setupTwoFactor(twoFactorSecret: string): void {
    // Store the provided two-factor secret
    this.twoFactorSecret = twoFactorSecret;
    // Set twoFactorEnabled to true
    this.twoFactorEnabled = true;
  }

  /**
   * Disables two-factor authentication for the user
   */
  disableTwoFactor(): void {
    // Set twoFactorEnabled to false
    this.twoFactorEnabled = false;
    // Clear twoFactorSecret
    this.twoFactorSecret = null;
  }

  /**
   * Validates the user data before saving to database
   * @throws ValidationError if any validations fail
   */
  @BeforeInsert()
  @BeforeUpdate()
  validateBeforeSave(): void {
    // Validate email format if provided
    if (this.email && !validateEmail(this.email)) {
      throw new ValidationError('Invalid email format');
    }
    
    // Check for required fields
    if (!this.email) {
      throw new ValidationError('Email is required');
    }
    
    if (!this.role) {
      throw new ValidationError('Role is required');
    }
    
    if (!this.status) {
      throw new ValidationError('Status is required');
    }
    
    // Ensure proper enum values for role, status and authProvider
    if (this.role && !Object.values(UserRole).includes(this.role)) {
      throw new ValidationError('Invalid user role');
    }
    
    if (this.status && !Object.values(UserStatus).includes(this.status)) {
      throw new ValidationError('Invalid user status');
    }
    
    if (this.authProvider && !Object.values(AuthProvider).includes(this.authProvider)) {
      throw new ValidationError('Invalid authentication provider');
    }
  }

  /**
   * Returns a sanitized user object for API responses
   * @returns Sanitized user object without sensitive data
   */
  toJSON(): object {
    // Create a copy of the user object
    const user = { ...this };
    
    // Remove sensitive data (passwordHash, twoFactorSecret, tokens, etc.)
    delete user.passwordHash;
    delete user.passwordHistory;
    delete user.twoFactorSecret;
    delete user.resetPasswordToken;
    delete user.resetPasswordExpires;
    delete user.emailVerificationToken;
    delete user.emailVerificationExpires;
    
    // Format date fields to ISO strings
    if (user.lastLoginAt) user.lastLoginAt = user.lastLoginAt.toISOString();
    if (user.lastPasswordChangeAt) user.lastPasswordChangeAt = user.lastPasswordChangeAt.toISOString();
    if (user.lockoutUntil) user.lockoutUntil = user.lockoutUntil.toISOString();
    if (user.createdAt) user.createdAt = user.createdAt.toISOString();
    if (user.updatedAt) user.updatedAt = user.updatedAt.toISOString();
    
    return user;
  }

  /**
   * Returns the user's full name
   * @returns User's full name (first + last)
   */
  getFullName(): string {
    // Combine firstName and lastName with a space between
    let fullName = '';
    
    if (this.firstName) {
      fullName += this.firstName;
    }
    
    if (this.lastName) {
      if (fullName) {
        fullName += ' ';
      }
      fullName += this.lastName;
    }
    
    return fullName;
  }
}