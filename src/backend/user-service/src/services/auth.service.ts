import jwt from 'jsonwebtoken'; // v9.0.1
import axios from 'axios'; // v1.4.0
import speakeasy from 'speakeasy'; // v2.0.0
import qrcode from 'qrcode'; // v1.5.3
import Redis from 'ioredis'; // v5.3.2

import { User } from '../models/user.model';
import { UserService } from './user.service';
import { UserRole, UserStatus, AuthProvider } from '../../shared/src/types/user.types';
import { UserCreateDTO } from '../../shared/src/types/user.types';
import { config } from '../config';
import { validateEmail, validatePassword } from '../../shared/src/utils/validation';
import { AuthenticationError, ValidationError } from '../../shared/src/utils/errors';
import { RATE_LIMITS, JWT_EXPIRY, ERROR_CODES } from '../../shared/src/constants';

// Default options for JWT token generation
const DEFAULT_TOKEN_OPTIONS = {
  issuer: 'ai-talent-marketplace',
  audience: 'platform-users'
};

/**
 * Core authentication service for the AI Talent Marketplace platform that handles
 * user authentication flows including login, registration, password management,
 * JWT token generation, OAuth integration, and two-factor authentication.
 */
export class AuthService {
  private userService: UserService;
  private redisClient: Redis;
  private readonly jwtSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly maxLoginAttempts: number;
  private readonly loginLockoutDuration: number;
  private readonly totpIssuer: string;

  /**
   * Initializes the authentication service with dependencies
   * @param userService - Service for user operations
   * @param redisClient - Redis client for token storage and rate limiting
   */
  constructor(userService: UserService, redisClient: Redis) {
    this.userService = userService;
    this.redisClient = redisClient;

    // Load authentication configuration
    const { jwt, rateLimits, twoFactor } = config.auth;
    this.jwtSecret = jwt.secret;
    this.accessTokenExpiry = jwt.accessTokenExpiry;
    this.refreshTokenExpiry = jwt.refreshTokenExpiry;
    this.issuer = jwt.issuer;
    this.audience = jwt.audience;
    this.maxLoginAttempts = rateLimits.login.maxAttempts;
    this.loginLockoutDuration = rateLimits.login.lockoutDuration;
    this.totpIssuer = twoFactor.issuer;
  }

  /**
   * Authenticates a user with email and password
   * @param email - User's email address
   * @param password - User's password
   * @returns Authenticated user and JWT tokens
   * @throws AuthenticationError if credentials are invalid
   * @throws ValidationError if input is invalid
   */
  async login(email: string, password: string): Promise<{ 
    user: User; 
    tokens: { accessToken: string; refreshToken: string } 
  }> {
    // Validate email format
    if (!validateEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Find user by email
    const user = await this.userService.findUserByEmail(email);
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Check if user account is active
    if (user.status !== UserStatus.ACTIVE) {
      throw new AuthenticationError(
        user.status === UserStatus.PENDING_VERIFICATION 
          ? 'Email verification required. Please check your inbox.'
          : 'Account is not active. Please contact support.'
      );
    }

    // Check if account is locked due to too many failed attempts
    if (user.isLocked()) {
      const lockExpiry = user.lockoutUntil;
      const now = new Date();
      const minutesRemaining = Math.ceil((lockExpiry.getTime() - now.getTime()) / 60000);
      
      throw new AuthenticationError(
        `Account is temporarily locked due to too many failed login attempts. ` +
        `Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`
      );
    }

    // Validate password
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      // Record failed login attempt and check if account should be locked
      const isStillActive = user.recordLoginAttempt(false);
      await this.userService.updateUser(user.id, user);
      
      // If account becomes locked due to this attempt
      if (!isStillActive) {
        throw new AuthenticationError(
          `Account is locked due to too many failed login attempts. ` +
          `Please try again in ${this.loginLockoutDuration / 60} minutes.`
        );
      }
      
      throw new AuthenticationError('Invalid email or password');
    }

    // Record successful login attempt
    user.recordLoginAttempt(true);
    await this.userService.updateUser(user.id, user);

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Store refresh token in Redis with user ID association
    const tokenId = this.extractTokenId(tokens.refreshToken);
    await this.redisClient.set(
      `refresh_tokens:${tokenId}`,
      user.id,
      'EX',
      this.getExpiryInSeconds(this.refreshTokenExpiry)
    );

    return { user, tokens };
  }

  /**
   * Registers a new user account
   * @param userData - User registration data
   * @returns Created user and JWT tokens
   * @throws ValidationError if input data is invalid
   */
  async register(userData: UserCreateDTO): Promise<{ 
    user: User; 
    tokens: { accessToken: string; refreshToken: string } 
  }> {
    // Validate user data
    if (!userData.email || !userData.password || !userData.firstName || !userData.lastName) {
      throw new ValidationError('All fields are required');
    }

    // Validate email format
    if (!validateEmail(userData.email)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate password strength
    if (!validatePassword(userData.password)) {
      throw new ValidationError(
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character'
      );
    }

    // Check if email already exists
    const existingUser = await this.userService.findUserByEmail(userData.email);
    if (existingUser) {
      throw new ValidationError('Email already in use');
    }

    // Create the user
    const user = await this.userService.createUser(userData);

    // Generate email verification token if required by configuration
    if (config.user.verificationPolicy.requireEmailVerification) {
      user.generateEmailVerificationToken();
      // Email sending logic would go here, typically handled by an email service
    }

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Store refresh token in Redis
    const tokenId = this.extractTokenId(tokens.refreshToken);
    await this.redisClient.set(
      `refresh_tokens:${tokenId}`,
      user.id,
      'EX',
      this.getExpiryInSeconds(this.refreshTokenExpiry)
    );

    return { user, tokens };
  }

  /**
   * Refreshes an access token using a valid refresh token
   * @param refreshToken - Current refresh token
   * @returns New access and refresh tokens
   * @throws AuthenticationError if refresh token is invalid
   */
  async refreshToken(refreshToken: string): Promise<{ 
    accessToken: string; 
    refreshToken: string 
  }> {
    try {
      // Verify the refresh token
      const decoded = this.verifyToken(refreshToken, 'refresh');
      const { sub: userId, jti: tokenId } = decoded;

      // Check if the token exists in Redis (not revoked)
      const storedUserId = await this.redisClient.get(`refresh_tokens:${tokenId}`);
      if (!storedUserId || storedUserId !== userId) {
        throw new AuthenticationError('Invalid refresh token');
      }

      // Get the user
      const user = await this.userService.findUserById(userId);
      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new AuthenticationError('User not found or inactive');
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);

      // Invalidate the old refresh token
      await this.redisClient.del(`refresh_tokens:${tokenId}`);

      // Store the new refresh token
      const newTokenId = this.extractTokenId(tokens.refreshToken);
      await this.redisClient.set(
        `refresh_tokens:${newTokenId}`,
        user.id,
        'EX',
        this.getExpiryInSeconds(this.refreshTokenExpiry)
      );

      return tokens;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('Invalid refresh token');
    }
  }

  /**
   * Logs out a user by invalidating their refresh token
   * @param refreshToken - Current refresh token
   * @returns True if logout successful
   */
  async logout(refreshToken: string): Promise<boolean> {
    try {
      // Verify the refresh token without checking expiration
      const decoded = jwt.verify(refreshToken, this.jwtSecret, { 
        ignoreExpiration: true 
      }) as jwt.JwtPayload;
      
      // Extract token ID and delete from Redis
      const { jti: tokenId } = decoded;
      if (tokenId) {
        await this.redisClient.del(`refresh_tokens:${tokenId}`);
        return true;
      }
      return false;
    } catch (error) {
      // If token is invalid, consider the user already logged out
      return false;
    }
  }

  /**
   * Logs out a user from all devices by invalidating all their refresh tokens
   * @param userId - User ID
   * @returns True if logout successful
   */
  async logoutAll(userId: string): Promise<boolean> {
    try {
      // Get all refresh tokens for the user
      const userTokenPattern = `refresh_tokens:*`;
      const keys = await this.redisClient.keys(userTokenPattern);
      
      // Filter tokens belonging to the user
      const userTokenKeys: string[] = [];
      for (const key of keys) {
        const storedUserId = await this.redisClient.get(key);
        if (storedUserId === userId) {
          userTokenKeys.push(key);
        }
      }
      
      // Delete all tokens belonging to the user
      if (userTokenKeys.length > 0) {
        await this.redisClient.del(...userTokenKeys);
      }
      
      return true;
    } catch (error) {
      console.error('Error logging out all sessions:', error);
      return false;
    }
  }

  /**
   * Generates JWT access and refresh tokens for a user
   * @param user - User to generate tokens for
   * @returns Access and refresh tokens
   */
  generateTokens(user: User): { accessToken: string; refreshToken: string } {
    // Generate a unique token ID for the refresh token
    const tokenId = require('crypto').randomBytes(16).toString('hex');

    // Create access token
    const accessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: `${user.firstName} ${user.lastName}`,
      iss: this.issuer,
      aud: this.audience
    };

    // Create refresh token
    const refreshTokenPayload = {
      sub: user.id,
      jti: tokenId,
      iss: this.issuer,
      aud: this.audience
    };

    // Sign tokens
    const accessToken = jwt.sign(
      accessTokenPayload,
      this.jwtSecret,
      { expiresIn: this.accessTokenExpiry }
    );

    const refreshToken = jwt.sign(
      refreshTokenPayload,
      this.jwtSecret,
      { expiresIn: this.refreshTokenExpiry }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Verifies a JWT token
   * @param token - JWT token to verify
   * @param type - Token type ('access' or 'refresh')
   * @returns Decoded token payload if valid
   * @throws AuthenticationError if token is invalid
   */
  verifyToken(token: string, type: 'access' | 'refresh'): jwt.JwtPayload {
    try {
      // Verify the token
      const decoded = jwt.verify(token, this.jwtSecret) as jwt.JwtPayload;
      
      // Additional validations
      if (!decoded.sub) {
        throw new AuthenticationError('Invalid token subject');
      }
      
      // For refresh tokens, ensure they have a token ID
      if (type === 'refresh' && !decoded.jti) {
        throw new AuthenticationError('Invalid refresh token');
      }
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Initiates password reset process
   * @param email - User's email address
   * @returns Password reset token and expiration time
   * @throws ValidationError if email is invalid
   * @throws AuthenticationError if user not found
   */
  async forgotPassword(email: string): Promise<{ 
    token: string; 
    expiresIn: number 
  }> {
    // Validate email format
    if (!validateEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Find user by email
    const user = await this.userService.findUserByEmail(email);
    if (!user) {
      // For security reasons, don't reveal if email exists
      throw new AuthenticationError('If the email exists, a reset link will be sent');
    }

    // Generate password reset token
    const token = user.generatePasswordResetToken();
    await this.userService.updateUser(user.id, user);

    // Get expiry in seconds from now
    const expiresIn = Math.floor(
      (user.resetPasswordExpires.getTime() - Date.now()) / 1000
    );

    // Email sending logic would go here, typically handled by an email service
    
    return { token, expiresIn };
  }

  /**
   * Resets a user's password using a valid reset token
   * @param token - Password reset token
   * @param newPassword - New password
   * @returns True if password reset successful
   * @throws ValidationError if password is invalid
   * @throws AuthenticationError if token is invalid
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    // Validate new password
    if (!validatePassword(newPassword)) {
      throw new ValidationError(
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character'
      );
    }

    // Find user with matching reset token
    const user = await this.findUserByResetToken(token);
    if (!user) {
      throw new AuthenticationError('Invalid or expired password reset token');
    }

    // Reset the password
    const success = await user.resetPassword(token, newPassword);
    if (!success) {
      throw new AuthenticationError('Invalid or expired password reset token');
    }

    // Save the updated user
    await this.userService.updateUser(user.id, user);

    // Log out from all devices for security
    await this.logoutAll(user.id);

    return true;
  }

  /**
   * Verifies a user's email address using a verification token
   * @param token - Email verification token
   * @returns True if verification successful
   * @throws AuthenticationError if token is invalid
   */
  async verifyEmail(token: string): Promise<boolean> {
    // Find user with matching verification token
    const user = await this.findUserByVerificationToken(token);
    if (!user) {
      throw new AuthenticationError('Invalid or expired email verification token');
    }

    // Verify the email
    const success = user.verifyEmail(token);
    if (!success) {
      throw new AuthenticationError('Invalid or expired email verification token');
    }

    // Save the updated user
    await this.userService.updateUser(user.id, user);

    return true;
  }

  /**
   * Sets up two-factor authentication for a user
   * @param userId - User ID
   * @returns 2FA secret and QR code
   * @throws AuthenticationError if user not found
   */
  async setupTwoFactor(userId: string): Promise<{ 
    secret: string; 
    qrCode: string 
  }> {
    // Find user by ID
    const user = await this.userService.findUserById(userId);
    
    // Generate TOTP secret
    const secretResult = speakeasy.generateSecret({
      length: 20,
      name: `${this.totpIssuer}:${user.email}`,
      issuer: this.totpIssuer
    });
    
    // Generate QR code for TOTP app
    const otpauthUrl = secretResult.otpauth_url;
    const qrCode = await qrcode.toDataURL(otpauthUrl);
    
    return {
      secret: secretResult.base32,
      qrCode
    };
  }

  /**
   * Verifies a TOTP code for two-factor authentication
   * @param userId - User ID
   * @param token - TOTP code
   * @returns True if TOTP code is valid
   * @throws AuthenticationError if user not found or doesn't have 2FA enabled
   */
  async verifyTwoFactor(userId: string, token: string): Promise<boolean> {
    // Find user by ID
    const user = await this.userService.findUserById(userId);
    
    // Check if user has 2FA enabled
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new AuthenticationError('Two-factor authentication not enabled');
    }
    
    // Verify TOTP token
    const isVerified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1 // Allow 1 interval before/after for clock drift
    });
    
    return isVerified;
  }

  /**
   * Enables two-factor authentication for a user after verification
   * @param userId - User ID
   * @param secret - TOTP secret
   * @param token - TOTP code for verification
   * @returns True if 2FA enabled successfully
   * @throws AuthenticationError if token verification fails
   */
  async enableTwoFactor(userId: string, secret: string, token: string): Promise<boolean> {
    // Find user by ID
    const user = await this.userService.findUserById(userId);
    
    // Verify TOTP token with the provided secret
    const isVerified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1
    });
    
    if (!isVerified) {
      throw new AuthenticationError('Invalid verification code');
    }
    
    // Enable 2FA and save the secret
    user.setupTwoFactor(secret);
    await this.userService.updateUser(user.id, user);
    
    // Log out all existing sessions for security
    await this.logoutAll(user.id);
    
    return true;
  }

  /**
   * Disables two-factor authentication for a user
   * @param userId - User ID
   * @param password - Current password for verification
   * @returns True if 2FA disabled successfully
   * @throws AuthenticationError if password verification fails
   */
  async disableTwoFactor(userId: string, password: string): Promise<boolean> {
    // Find user by ID
    const user = await this.userService.findUserById(userId);
    
    // Verify password for security
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid password');
    }
    
    // Disable 2FA
    user.disableTwoFactor();
    await this.userService.updateUser(user.id, user);
    
    // Log out all existing sessions for security
    await this.logoutAll(user.id);
    
    return true;
  }

  /**
   * Authenticates a user with an OAuth provider
   * @param provider - OAuth provider (github, linkedin, google)
   * @param code - Authorization code from OAuth provider
   * @param redirectUri - Redirect URI used in OAuth flow
   * @returns Authenticated user and JWT tokens
   * @throws AuthenticationError if OAuth authentication fails
   */
  async authenticateWithOAuth(
    provider: string, 
    code: string, 
    redirectUri: string
  ): Promise<{ 
    user: User; 
    tokens: { accessToken: string; refreshToken: string } 
  }> {
    // Validate provider
    if (!['github', 'linkedin', 'google'].includes(provider)) {
      throw new ValidationError('Unsupported OAuth provider');
    }

    try {
      // Exchange authorization code for access token
      const accessToken = await this.getOAuthAccessToken(provider, code, redirectUri);
      
      // Fetch user profile from provider
      const profile = await this.getOAuthUserProfile(provider, accessToken);
      
      // Find existing user with provider ID or email
      let user = await this.userService.findUserByEmail(profile.email);
      
      if (user) {
        // Update OAuth details for existing user if needed
        if (user.authProvider !== provider as AuthProvider || 
            user.authProviderId !== profile.id) {
          user.authProvider = provider as AuthProvider;
          user.authProviderId = profile.id;
          await this.userService.updateUser(user.id, user);
        }
      } else {
        // Create new user with OAuth data
        user = await this.userService.createUser({
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          password: '', // Random password will be generated in userService
          role: UserRole.FREELANCER // Default role
        });
        
        // Update OAuth provider details
        user.authProvider = provider as AuthProvider;
        user.authProviderId = profile.id;
        user.status = UserStatus.ACTIVE; // OAuth users are pre-verified
        user.emailVerified = true;
        
        await this.userService.updateUser(user.id, user);
      }
      
      // Generate tokens
      const tokens = this.generateTokens(user);
      
      // Store refresh token in Redis
      const tokenId = this.extractTokenId(tokens.refreshToken);
      await this.redisClient.set(
        `refresh_tokens:${tokenId}`,
        user.id,
        'EX',
        this.getExpiryInSeconds(this.refreshTokenExpiry)
      );
      
      return { user, tokens };
    } catch (error) {
      console.error('OAuth authentication error:', error);
      throw new AuthenticationError('OAuth authentication failed');
    }
  }

  /**
   * Generates an OAuth authorization URL for a provider
   * @param provider - OAuth provider (github, linkedin, google)
   * @param redirectUri - Redirect URI for OAuth flow
   * @param state - State parameter for CSRF protection
   * @returns OAuth authorization URL
   * @throws ValidationError if provider is not supported
   */
  getOAuthLoginUrl(provider: string, redirectUri: string, state: string): string {
    // Validate provider
    if (!['github', 'linkedin', 'google'].includes(provider)) {
      throw new ValidationError('Unsupported OAuth provider');
    }
    
    // Get provider configuration
    const providerConfig = config.auth.providers[provider as keyof typeof config.auth.providers];
    if (!providerConfig || !providerConfig.clientId) {
      throw new ValidationError(`OAuth provider ${provider} is not configured`);
    }
    
    // Construct authorization URL based on provider
    let authUrl: string;
    
    switch (provider) {
      case 'github':
        authUrl = 'https://github.com/login/oauth/authorize';
        authUrl += `?client_id=${providerConfig.clientId}`;
        authUrl += `&redirect_uri=${encodeURIComponent(redirectUri)}`;
        authUrl += `&scope=user:email`;
        authUrl += `&state=${state}`;
        break;
        
      case 'linkedin':
        authUrl = 'https://www.linkedin.com/oauth/v2/authorization';
        authUrl += `?client_id=${providerConfig.clientId}`;
        authUrl += `&redirect_uri=${encodeURIComponent(redirectUri)}`;
        authUrl += `&response_type=code`;
        authUrl += `&scope=r_liteprofile%20r_emailaddress`;
        authUrl += `&state=${state}`;
        break;
        
      case 'google':
        authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
        authUrl += `?client_id=${providerConfig.clientId}`;
        authUrl += `&redirect_uri=${encodeURIComponent(redirectUri)}`;
        authUrl += `&response_type=code`;
        authUrl += `&scope=email%20profile`;
        authUrl += `&state=${state}`;
        break;
    }
    
    return authUrl;
  }

  // Private helper methods

  /**
   * Extracts token ID from a JWT refresh token
   * @param refreshToken - JWT refresh token
   * @returns Token ID
   */
  private extractTokenId(refreshToken: string): string {
    try {
      const decoded = jwt.decode(refreshToken) as jwt.JwtPayload;
      return decoded.jti as string;
    } catch (error) {
      return '';
    }
  }

  /**
   * Converts JWT expiry time string to seconds
   * @param expiryString - JWT expiry time string (e.g., '7d', '15m')
   * @returns Expiry time in seconds
   */
  private getExpiryInSeconds(expiryString: string): number {
    const unit = expiryString.slice(-1);
    const value = parseInt(expiryString.slice(0, -1));
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: return 3600; // Default to 1 hour
    }
  }

  /**
   * Finds a user by password reset token
   * @param token - Password reset token
   * @returns User if found, null otherwise
   */
  private async findUserByResetToken(token: string): Promise<User | null> {
    try {
      // In a real implementation, you'd query the database directly.
      // For now, we'll fetch all users and filter in memory.
      // This is inefficient and should be replaced with a proper database query.
      const users = await this.userService.searchUsers({});
      
      for (const user of users.users) {
        if (user.resetPasswordToken === token && 
            user.resetPasswordExpires > new Date()) {
          return user;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding user by reset token:', error);
      return null;
    }
  }

  /**
   * Finds a user by email verification token
   * @param token - Email verification token
   * @returns User if found, null otherwise
   */
  private async findUserByVerificationToken(token: string): Promise<User | null> {
    try {
      // In a real implementation, you'd query the database directly.
      // For now, we'll fetch all users and filter in memory.
      // This is inefficient and should be replaced with a proper database query.
      const users = await this.userService.searchUsers({});
      
      for (const user of users.users) {
        if (user.emailVerificationToken === token && 
            user.emailVerificationExpires > new Date()) {
          return user;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding user by verification token:', error);
      return null;
    }
  }

  /**
   * Exchanges OAuth authorization code for access token
   * @param provider - OAuth provider
   * @param code - Authorization code
   * @param redirectUri - Redirect URI
   * @returns Access token
   */
  private async getOAuthAccessToken(provider: string, code: string, redirectUri: string): Promise<string> {
    const providerConfig = config.auth.providers[provider as keyof typeof config.auth.providers];
    
    let tokenEndpoint: string;
    let requestData: any;
    let headers: any = {};
    
    switch (provider) {
      case 'github':
        tokenEndpoint = 'https://github.com/login/oauth/access_token';
        requestData = {
          client_id: providerConfig.clientId,
          client_secret: providerConfig.clientSecret,
          code,
          redirect_uri: redirectUri
        };
        headers['Accept'] = 'application/json';
        break;
        
      case 'linkedin':
        tokenEndpoint = 'https://www.linkedin.com/oauth/v2/accessToken';
        requestData = {
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: providerConfig.clientId,
          client_secret: providerConfig.clientSecret
        };
        break;
        
      case 'google':
        tokenEndpoint = 'https://oauth2.googleapis.com/token';
        requestData = {
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: providerConfig.clientId,
          client_secret: providerConfig.clientSecret
        };
        break;
        
      default:
        throw new ValidationError('Unsupported OAuth provider');
    }
    
    const response = await axios.post(tokenEndpoint, requestData, { headers });
    
    // Extract access token based on provider response format
    let accessToken: string;
    
    if (provider === 'github') {
      accessToken = response.data.access_token;
    } else {
      accessToken = response.data.access_token;
    }
    
    if (!accessToken) {
      throw new AuthenticationError('Failed to obtain OAuth access token');
    }
    
    return accessToken;
  }

  /**
   * Fetches user profile from OAuth provider
   * @param provider - OAuth provider
   * @param accessToken - OAuth access token
   * @returns User profile data
   */
  private async getOAuthUserProfile(provider: string, accessToken: string): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  }> {
    let profileEndpoint: string;
    let emailEndpoint: string | null = null;
    let headers = {
      Authorization: `Bearer ${accessToken}`
    };
    
    switch (provider) {
      case 'github':
        profileEndpoint = 'https://api.github.com/user';
        emailEndpoint = 'https://api.github.com/user/emails';
        headers['Accept'] = 'application/vnd.github.v3+json';
        break;
        
      case 'linkedin':
        profileEndpoint = 'https://api.linkedin.com/v2/me';
        emailEndpoint = 'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))';
        headers['Accept'] = 'application/json';
        break;
        
      case 'google':
        profileEndpoint = 'https://www.googleapis.com/oauth2/v3/userinfo';
        headers['Accept'] = 'application/json';
        break;
        
      default:
        throw new ValidationError('Unsupported OAuth provider');
    }
    
    // Fetch profile data
    const profileResponse = await axios.get(profileEndpoint, { headers });
    
    // Extract profile data based on provider response format
    let profile: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
    
    switch (provider) {
      case 'github':
        // GitHub doesn't include email in the primary response if private
        const emailResponse = await axios.get(emailEndpoint, { headers });
        const primaryEmail = emailResponse.data.find((email: any) => email.primary).email;
        
        profile = {
          id: profileResponse.data.id.toString(),
          email: primaryEmail,
          firstName: profileResponse.data.name ? profileResponse.data.name.split(' ')[0] : '',
          lastName: profileResponse.data.name ? profileResponse.data.name.split(' ').slice(1).join(' ') : ''
        };
        break;
        
      case 'linkedin':
        const emailResponse = await axios.get(emailEndpoint, { headers });
        const email = emailResponse.data.elements[0]['handle~'].emailAddress;
        
        profile = {
          id: profileResponse.data.id,
          email,
          firstName: profileResponse.data.localizedFirstName,
          lastName: profileResponse.data.localizedLastName
        };
        break;
        
      case 'google':
        profile = {
          id: profileResponse.data.sub,
          email: profileResponse.data.email,
          firstName: profileResponse.data.given_name,
          lastName: profileResponse.data.family_name
        };
        break;
        
      default:
        throw new ValidationError('Unsupported OAuth provider');
    }
    
    return profile;
  }
}