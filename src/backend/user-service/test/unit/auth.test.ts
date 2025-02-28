import { mock, mockReset } from 'jest-mock-extended';
import * as jwt from 'jsonwebtoken'; // v9.0.2
import Redis from 'ioredis'; // v5.3.2
import * as speakeasy from 'speakeasy'; // v2.0.0
import axios from 'axios'; // v1.4.0

import { AuthService } from '../../src/services/auth.service';
import { UserService } from '../../src/services/user.service';
import { User } from '../../src/models/user.model';
import { UserRole, UserStatus, AuthProvider, UserCreateDTO } from '../../../shared/src/types/user.types';
import { AuthenticationError, ValidationError } from '../../../shared/src/utils/errors';
import { config } from '../../src/config';

// Mock dependencies
jest.mock('../../src/services/user.service');
jest.mock('ioredis');
jest.mock('jsonwebtoken');
jest.mock('speakeasy');
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('mocked-qr-code-data-url')
}));
jest.mock('axios');
jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('mock-token-id')
  })
}));

// Mock implementations
const mockUserService = jest.mocked(UserService);
const mockRedisClient = jest.mocked(Redis);

// Helper function to set up mocks
function setupMocks() {
  jest.clearAllMocks();
  
  // Common mock implementations
  mockRedisClient.set.mockResolvedValue('OK');
  mockRedisClient.get.mockResolvedValue(null);
  mockRedisClient.del.mockResolvedValue(1);
  mockRedisClient.keys.mockResolvedValue([]);
  
  // JWT mocks
  jest.spyOn(jwt, 'sign').mockImplementation(() => 'mock-token');
  jest.spyOn(jwt, 'verify').mockImplementation(() => ({
    sub: 'test-user-id',
    jti: 'mock-token-id'
  }));
  jest.spyOn(jwt, 'decode').mockImplementation(() => ({
    jti: 'mock-token-id'
  }));
}

// Helper function to create a mock user
function createMockUser(userData: Partial<User> = {}): User {
  const user = new User({
    id: userData.id || 'test-user-id',
    email: userData.email || 'test@example.com',
    firstName: userData.firstName || 'Test',
    lastName: userData.lastName || 'User',
    role: userData.role || UserRole.FREELANCER,
    status: userData.status || UserStatus.ACTIVE,
    authProvider: userData.authProvider || AuthProvider.LOCAL,
    authProviderId: userData.authProviderId,
    emailVerified: userData.emailVerified || false,
    twoFactorEnabled: userData.twoFactorEnabled || false,
    twoFactorSecret: userData.twoFactorSecret || null,
    ...userData
  });
  
  // Mock user methods
  user.validatePassword = jest.fn().mockResolvedValue(true);
  user.setPassword = jest.fn().mockResolvedValue(undefined);
  user.generatePasswordResetToken = jest.fn().mockReturnValue('reset-token');
  user.resetPassword = jest.fn().mockResolvedValue(true);
  user.generateEmailVerificationToken = jest.fn().mockReturnValue('verification-token');
  user.verifyEmail = jest.fn().mockReturnValue(true);
  user.recordLoginAttempt = jest.fn().mockReturnValue(true);
  user.isLocked = jest.fn().mockReturnValue(false);
  user.setupTwoFactor = jest.fn();
  user.disableTwoFactor = jest.fn();
  
  // Mock Date objects
  user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour in future
  user.emailVerificationExpires = new Date(Date.now() + 86400000); // 24 hours in future
  user.lockoutUntil = null;
  
  return user;
}

describe('AuthService', () => {
  let authService: AuthService;
  
  beforeEach(() => {
    setupMocks();
    authService = new AuthService(mockUserService, mockRedisClient);
  });
  
  describe('constructor', () => {
    it('should initialize with user service and Redis client', () => {
      expect(authService).toBeDefined();
    });
  });
  
  describe('login', () => {
    it('should authenticate user with valid credentials', async () => {
      // Set up mock user
      const user = createMockUser();
      mockUserService.findUserByEmail.mockResolvedValue(user);
      
      const result = await authService.login('test@example.com', 'Password123!');
      
      // Assertions
      expect(mockUserService.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(user.validatePassword).toHaveBeenCalledWith('Password123!');
      expect(user.recordLoginAttempt).toHaveBeenCalledWith(true);
      expect(mockUserService.updateUser).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'refresh_tokens:mock-token-id',
        'test-user-id',
        'EX',
        expect.any(Number)
      );
      expect(result).toEqual({
        user,
        tokens: {
          accessToken: 'mock-token',
          refreshToken: 'mock-token'
        }
      });
    });
    
    it('should throw AuthenticationError for non-existent user', async () => {
      mockUserService.findUserByEmail.mockResolvedValue(null);
      
      await expect(
        authService.login('nonexistent@example.com', 'Password123!')
      ).rejects.toThrow(AuthenticationError);
    });
    
    it('should throw AuthenticationError for invalid password', async () => {
      const user = createMockUser();
      user.validatePassword = jest.fn().mockResolvedValue(false);
      mockUserService.findUserByEmail.mockResolvedValue(user);
      
      await expect(
        authService.login('test@example.com', 'WrongPassword123!')
      ).rejects.toThrow(AuthenticationError);
      
      expect(user.recordLoginAttempt).toHaveBeenCalledWith(false);
      expect(mockUserService.updateUser).toHaveBeenCalled();
    });
    
    it('should throw AuthenticationError for locked account', async () => {
      const user = createMockUser();
      user.isLocked = jest.fn().mockReturnValue(true);
      user.lockoutUntil = new Date(Date.now() + 3600000); // 1 hour in the future
      mockUserService.findUserByEmail.mockResolvedValue(user);
      
      await expect(
        authService.login('test@example.com', 'Password123!')
      ).rejects.toThrow(AuthenticationError);
    });
    
    it('should throw AuthenticationError for inactive account', async () => {
      const user = createMockUser({ status: UserStatus.INACTIVE });
      mockUserService.findUserByEmail.mockResolvedValue(user);
      
      await expect(
        authService.login('test@example.com', 'Password123!')
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe('register', () => {
    it('should register a new user with valid data', async () => {
      const userData: UserCreateDTO = {
        email: 'newuser@example.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
        role: UserRole.FREELANCER
      };
      
      const newUser = createMockUser({
        id: 'new-user-id',
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        status: UserStatus.PENDING_VERIFICATION
      });
      
      mockUserService.findUserByEmail.mockResolvedValue(null);
      mockUserService.createUser.mockResolvedValue(newUser);
      
      const result = await authService.register(userData);
      
      // Assertions
      expect(mockUserService.createUser).toHaveBeenCalledWith(userData);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'refresh_tokens:mock-token-id',
        'new-user-id',
        'EX',
        expect.any(Number)
      );
      expect(result).toEqual({
        user: newUser,
        tokens: {
          accessToken: 'mock-token',
          refreshToken: 'mock-token'
        }
      });
    });
    
    it('should throw ValidationError for invalid registration data', async () => {
      const invalidUserData = {
        email: 'invalid-email',
        password: 'weak',
        firstName: '',
        lastName: 'User',
        role: UserRole.FREELANCER
      } as UserCreateDTO;
      
      await expect(
        authService.register(invalidUserData)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens with valid refresh token', async () => {
      // Mock Redis get to return the user ID
      mockRedisClient.get.mockResolvedValue('test-user-id');
      
      // Mock finding the user
      const user = createMockUser();
      mockUserService.findUserById.mockResolvedValue(user);
      
      const result = await authService.refreshToken('valid-refresh-token');
      
      // Assertions
      expect(mockRedisClient.get).toHaveBeenCalledWith('refresh_tokens:mock-token-id');
      expect(mockRedisClient.del).toHaveBeenCalledWith('refresh_tokens:mock-token-id');
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'refresh_tokens:mock-token-id',
        'test-user-id',
        'EX',
        expect.any(Number)
      );
      expect(result).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token'
      });
    });
    
    it('should throw AuthenticationError for invalid refresh token', async () => {
      // Mock jwt verify to throw an error
      jest.spyOn(jwt, 'verify').mockImplementationOnce(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });
      
      await expect(
        authService.refreshToken('invalid-refresh-token')
      ).rejects.toThrow(AuthenticationError);
    });
    
    it('should throw AuthenticationError for revoked refresh token', async () => {
      // Mock Redis get to return null (token was revoked)
      mockRedisClient.get.mockResolvedValue(null);
      
      await expect(
        authService.refreshToken('revoked-refresh-token')
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      const result = await authService.logout('valid-refresh-token');
      
      // Assertions
      expect(mockRedisClient.del).toHaveBeenCalledWith('refresh_tokens:mock-token-id');
      expect(result).toBe(true);
    });
    
    it('should throw AuthenticationError for invalid token', async () => {
      // Mock jwt verify to throw an error
      jest.spyOn(jwt, 'verify').mockImplementationOnce(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });
      
      const result = await authService.logout('invalid-refresh-token');
      expect(result).toBe(false);
    });
  });

  describe('forgotPassword', () => {
    it('should generate reset token for valid email', async () => {
      const user = createMockUser();
      mockUserService.findUserByEmail.mockResolvedValue(user);
      
      const result = await authService.forgotPassword('test@example.com');
      
      // Assertions
      expect(mockUserService.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(user.generatePasswordResetToken).toHaveBeenCalled();
      expect(mockUserService.updateUser).toHaveBeenCalled();
      expect(result).toEqual({
        token: 'reset-token',
        expiresIn: expect.any(Number)
      });
    });
    
    it('should throw ValidationError for invalid email format', async () => {
      await expect(
        authService.forgotPassword('invalid-email')
      ).rejects.toThrow(ValidationError);
    });
    
    it('should throw AuthenticationError for non-existent email', async () => {
      mockUserService.findUserByEmail.mockResolvedValue(null);
      
      await expect(
        authService.forgotPassword('nonexistent@example.com')
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const user = createMockUser();
      user.resetPassword.mockResolvedValue(true);
      
      // Mock the private method findUserByResetToken
      jest.spyOn(authService as any, 'findUserByResetToken').mockResolvedValue(user);
      
      const result = await authService.resetPassword('valid-token', 'NewPassword123!');
      
      // Assertions
      expect(user.resetPassword).toHaveBeenCalledWith('valid-token', 'NewPassword123!');
      expect(mockUserService.updateUser).toHaveBeenCalled();
      expect(mockRedisClient.keys).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should throw ValidationError for invalid new password', async () => {
      await expect(
        authService.resetPassword('valid-token', 'weak')
      ).rejects.toThrow(ValidationError);
    });
    
    it('should throw AuthenticationError for invalid token', async () => {
      // Mock the private method findUserByResetToken
      jest.spyOn(authService as any, 'findUserByResetToken').mockResolvedValue(null);
      
      await expect(
        authService.resetPassword('invalid-token', 'NewPassword123!')
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      const user = createMockUser();
      user.verifyEmail.mockReturnValue(true);
      
      // Mock the private method findUserByVerificationToken
      jest.spyOn(authService as any, 'findUserByVerificationToken').mockResolvedValue(user);
      
      const result = await authService.verifyEmail('valid-token');
      
      // Assertions
      expect(user.verifyEmail).toHaveBeenCalledWith('valid-token');
      expect(mockUserService.updateUser).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should throw AuthenticationError for invalid token', async () => {
      // Mock the private method findUserByVerificationToken
      jest.spyOn(authService as any, 'findUserByVerificationToken').mockResolvedValue(null);
      
      await expect(
        authService.verifyEmail('invalid-token')
      ).rejects.toThrow(AuthenticationError);
    });
    
    it('should return false if verification process fails', async () => {
      const user = createMockUser();
      user.verifyEmail.mockReturnValue(false);
      
      // Mock the private method findUserByVerificationToken
      jest.spyOn(authService as any, 'findUserByVerificationToken').mockResolvedValue(user);
      
      const result = await authService.verifyEmail('valid-token');
      
      // Assertions
      expect(user.verifyEmail).toHaveBeenCalledWith('valid-token');
      expect(result).toBe(false);
    });
  });

  describe('Two-factor authentication', () => {
    it('should set up 2FA for a user', async () => {
      const user = createMockUser();
      mockUserService.findUserById.mockResolvedValue(user);
      
      // Mock speakeasy
      jest.mocked(speakeasy).generateSecret.mockReturnValue({
        base32: 'secret-key',
        otpauth_url: 'otpauth://url'
      } as any);
      
      const result = await authService.setupTwoFactor('test-user-id');
      
      // Assertions
      expect(mockUserService.findUserById).toHaveBeenCalledWith('test-user-id');
      expect(speakeasy.generateSecret).toHaveBeenCalled();
      expect(result).toEqual({
        secret: 'secret-key',
        qrCode: 'mocked-qr-code-data-url'
      });
    });
    
    it('should verify 2FA token correctly', async () => {
      const user = createMockUser({
        twoFactorEnabled: true,
        twoFactorSecret: 'secret-key'
      });
      mockUserService.findUserById.mockResolvedValue(user);
      
      // Mock speakeasy
      jest.mocked(speakeasy.totp).verify.mockReturnValue(true);
      
      const result = await authService.verifyTwoFactor('test-user-id', '123456');
      
      // Assertions
      expect(mockUserService.findUserById).toHaveBeenCalledWith('test-user-id');
      expect(speakeasy.totp.verify).toHaveBeenCalledWith({
        secret: 'secret-key',
        encoding: 'base32',
        token: '123456',
        window: 1
      });
      expect(result).toBe(true);
    });
    
    it('should enable 2FA for a user', async () => {
      const user = createMockUser();
      mockUserService.findUserById.mockResolvedValue(user);
      
      // Mock speakeasy
      jest.mocked(speakeasy.totp).verify.mockReturnValue(true);
      
      const result = await authService.enableTwoFactor('test-user-id', 'secret-key', '123456');
      
      // Assertions
      expect(mockUserService.findUserById).toHaveBeenCalledWith('test-user-id');
      expect(speakeasy.totp.verify).toHaveBeenCalledWith({
        secret: 'secret-key',
        encoding: 'base32',
        token: '123456',
        window: 1
      });
      expect(user.setupTwoFactor).toHaveBeenCalledWith('secret-key');
      expect(mockUserService.updateUser).toHaveBeenCalled();
      expect(mockRedisClient.keys).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should disable 2FA for a user', async () => {
      const user = createMockUser({
        twoFactorEnabled: true,
        twoFactorSecret: 'secret-key'
      });
      mockUserService.findUserById.mockResolvedValue(user);
      
      const result = await authService.disableTwoFactor('test-user-id', 'Password123!');
      
      // Assertions
      expect(mockUserService.findUserById).toHaveBeenCalledWith('test-user-id');
      expect(user.validatePassword).toHaveBeenCalledWith('Password123!');
      expect(user.disableTwoFactor).toHaveBeenCalled();
      expect(mockUserService.updateUser).toHaveBeenCalled();
      expect(mockRedisClient.keys).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('OAuth authentication', () => {
    it('should generate OAuth login URL', () => {
      // Mock config
      config.auth.providers = {
        github: {
          clientId: 'github-client-id',
          clientSecret: 'github-client-secret',
          callbackUrl: 'https://example.com/auth/github/callback'
        }
      } as any;
      
      const result = authService.getOAuthLoginUrl('github', 'https://example.com/callback', 'state-value');
      
      // Assertions
      expect(result).toContain('github.com/login/oauth/authorize');
      expect(result).toContain('client_id=github-client-id');
      expect(result).toContain('redirect_uri=');
      expect(result).toContain('state=state-value');
    });
    
    it('should authenticate user with OAuth', async () => {
      // Mock the private methods
      jest.spyOn(authService as any, 'getOAuthAccessToken').mockResolvedValue('oauth-token');
      jest.spyOn(authService as any, 'getOAuthUserProfile').mockResolvedValue({
        id: 'github-123',
        email: 'oauth-user@example.com',
        firstName: 'OAuth',
        lastName: 'User'
      });
      
      // No existing user
      mockUserService.findUserByEmail.mockResolvedValue(null);
      
      // Mock user creation
      const newUser = createMockUser({
        email: 'oauth-user@example.com',
        firstName: 'OAuth',
        lastName: 'User',
        authProvider: AuthProvider.GITHUB,
        authProviderId: 'github-123',
        emailVerified: true,
        status: UserStatus.ACTIVE
      });
      mockUserService.createUser.mockResolvedValue(newUser);
      
      const result = await authService.authenticateWithOAuth(
        'github',
        'auth-code',
        'https://example.com/callback'
      );
      
      // Assertions
      expect(mockUserService.createUser).toHaveBeenCalled();
      expect(mockUserService.updateUser).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalled();
      expect(result).toEqual({
        user: newUser,
        tokens: {
          accessToken: 'mock-token',
          refreshToken: 'mock-token'
        }
      });
    });
    
    it('should link OAuth to existing user', async () => {
      // Mock the private methods
      jest.spyOn(authService as any, 'getOAuthAccessToken').mockResolvedValue('oauth-token');
      jest.spyOn(authService as any, 'getOAuthUserProfile').mockResolvedValue({
        id: 'github-123',
        email: 'existing@example.com',
        firstName: 'Existing',
        lastName: 'User'
      });
      
      // Existing user
      const existingUser = createMockUser({
        email: 'existing@example.com',
        firstName: 'Existing',
        lastName: 'User'
      });
      mockUserService.findUserByEmail.mockResolvedValue(existingUser);
      
      const result = await authService.authenticateWithOAuth(
        'github',
        'auth-code',
        'https://example.com/callback'
      );
      
      // Assertions
      expect(mockUserService.updateUser).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalled();
      expect(result).toEqual({
        user: existingUser,
        tokens: {
          accessToken: 'mock-token',
          refreshToken: 'mock-token'
        }
      });
    });
  });
});