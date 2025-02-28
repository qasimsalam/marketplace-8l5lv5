import express, { Request, Response, NextFunction } from 'express'; // v4.18.2
import multer from 'multer'; // v1.4.5-lts.1
import { S3 } from '@aws-sdk/client-s3'; // v3.400.0

import { UserService } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { 
  UserRole, 
  UserStatus, 
  VerificationStatus, 
  UserSearchParams 
} from '../../shared/src/types/user.types';
import { 
  ValidationError, 
  AuthorizationError, 
  ResourceNotFoundError, 
  AuthenticationError,
  formatErrorResponse 
} from '../../shared/src/utils/errors';
import { config } from '../config';

// Extend Express Request to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        name: string;
      };
    }
  }
}

/**
 * Controller responsible for handling HTTP requests for user management
 * in the AI Talent Marketplace platform.
 */
export class UserController {
  private userService: UserService;
  private authService: AuthService;
  private s3Client: S3;

  /**
   * Initializes the user controller with required services
   * @param userService - Service for user operations
   * @param authService - Service for authentication and authorization
   */
  constructor(userService: UserService, authService: AuthService) {
    this.userService = userService;
    this.authService = authService;
    
    // Initialize S3 client for avatar uploads
    this.s3Client = new S3({
      region: config.storage.s3.region,
      credentials: {
        accessKeyId: config.storage.s3.accessKey,
        secretAccessKey: config.storage.s3.secretKey
      }
    });
    
    // Bind methods to ensure 'this' context is preserved
    this.checkAuthentication = this.checkAuthentication.bind(this);
    this.checkRole = this.checkRole.bind(this);
    this.getUser = this.getUser.bind(this);
    this.getUserProfile = this.getUserProfile.bind(this);
    this.updateUser = this.updateUser.bind(this);
    this.updateUserStatus = this.updateUserStatus.bind(this);
    this.updateUserRole = this.updateUserRole.bind(this);
    this.deleteUser = this.deleteUser.bind(this);
    this.searchUsers = this.searchUsers.bind(this);
    this.searchProfiles = this.searchProfiles.bind(this);
    this.uploadProfileAvatar = this.uploadProfileAvatar.bind(this);
    this.verifyUserIdentity = this.verifyUserIdentity.bind(this);
    this.verifyUserSkills = this.verifyUserSkills.bind(this);
    this.getUserStats = this.getUserStats.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  /**
   * Middleware to verify user authentication via JWT token
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async checkAuthentication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthenticationError('Authentication token required');
      }
      
      const token = authHeader.split(' ')[1];
      if (!token) {
        throw new AuthenticationError('Authentication token required');
      }
      
      // Verify token using auth service
      const decoded = this.authService.verifyToken(token, 'access');
      
      // Attach user info to request object for use in route handlers
      req.user = {
        id: decoded.sub as string,
        email: decoded.email as string,
        role: decoded.role as UserRole,
        name: decoded.name as string
      };
      
      next();
    } catch (error) {
      this.handleError(error as Error, res, next);
    }
  }

  /**
   * Middleware to verify user has required role
   * @param allowedRoles - Array of roles that are allowed to access the route
   * @returns Middleware function for role verification
   */
  checkRole(allowedRoles: UserRole[]): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Check if user is authenticated
        if (!req.user) {
          throw new AuthenticationError('Authentication required');
        }
        
        // Check if user role is in allowed roles
        if (!allowedRoles.includes(req.user.role)) {
          throw new AuthorizationError(
            `Insufficient permissions. Required role: ${allowedRoles.join(' or ')}`
          );
        }
        
        next();
      } catch (error) {
        this.handleError(error as Error, res, next);
      }
    };
  }

  /**
   * Get a user by ID
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      
      // Ensure user has permission to access this user
      // Users can access their own data, admins can access any user
      if (req.user!.id !== userId && req.user!.role !== UserRole.ADMIN) {
        throw new AuthorizationError('You do not have permission to access this user');
      }
      
      // Retrieve user by ID
      const user = await this.userService.findUserById(userId);
      
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      this.handleError(error as Error, res, next);
    }
  }

  /**
   * Get a user's profile by user ID
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async getUserProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      
      // Get profile by user ID
      const profile = await this.userService.getProfile(userId);
      
      res.status(200).json({
        success: true,
        data: profile
      });
    } catch (error) {
      this.handleError(error as Error, res, next);
    }
  }

  /**
   * Update a user's information
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      const updateData = req.body;
      
      // Ensure user has permission to update this user
      // Users can update their own data, admins can update any user
      if (req.user!.id !== userId && req.user!.role !== UserRole.ADMIN) {
        throw new AuthorizationError('You do not have permission to update this user');
      }
      
      // If non-admin tries to update role or status, block it
      if (req.user!.role !== UserRole.ADMIN) {
        delete updateData.role;
        delete updateData.status;
      }
      
      // Update user
      const updatedUser = await this.userService.updateUser(userId, updateData);
      
      res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'User updated successfully'
      });
    } catch (error) {
      this.handleError(error as Error, res, next);
    }
  }

  /**
   * Admin endpoint to update a user's status
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      const { status } = req.body;
      
      // Validate status
      if (!Object.values(UserStatus).includes(status)) {
        throw new ValidationError('Invalid user status');
      }
      
      // Update user status
      const updatedUser = await this.userService.updateUser(userId, { status });
      
      res.status(200).json({
        success: true,
        data: updatedUser,
        message: `User status updated to ${status}`
      });
    } catch (error) {
      this.handleError(error as Error, res, next);
    }
  }

  /**
   * Admin endpoint to update a user's role
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      const { role } = req.body;
      
      // Validate role
      if (!Object.values(UserRole).includes(role)) {
        throw new ValidationError('Invalid user role');
      }
      
      // Update user role
      const updatedUser = await this.userService.updateUser(userId, { role });
      
      res.status(200).json({
        success: true,
        data: updatedUser,
        message: `User role updated to ${role}`
      });
    } catch (error) {
      this.handleError(error as Error, res, next);
    }
  }

  /**
   * Delete a user account
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      
      // Ensure user has permission to delete this user
      // Users can delete their own account, admins can delete any user
      if (req.user!.id !== userId && req.user!.role !== UserRole.ADMIN) {
        throw new AuthorizationError('You do not have permission to delete this user');
      }
      
      // Delete user
      await this.userService.deleteUser(userId);
      
      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      this.handleError(error as Error, res, next);
    }
  }

  /**
   * Search for users with filtering and pagination
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Parse query parameters
      const searchParams: UserSearchParams = {
        query: req.query.query as string,
        role: req.query.role as UserRole,
        status: req.query.status as UserStatus,
        skills: req.query.skills ? (req.query.skills as string).split(',') : undefined,
        minHourlyRate: req.query.minHourlyRate ? parseInt(req.query.minHourlyRate as string, 10) : undefined,
        maxHourlyRate: req.query.maxHourlyRate ? parseInt(req.query.maxHourlyRate as string, 10) : undefined,
        location: req.query.location as string,
        availability: req.query.availability as string,
        isVerified: req.query.isVerified === 'true',
        isTopRated: req.query.isTopRated === 'true',
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as string
      };
      
      // Search users with params
      const result = await this.userService.searchUsers(searchParams);
      
      res.status(200).json({
        success: true,
        data: result.users,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (error) {
      this.handleError(error as Error, res, next);
    }
  }

  /**
   * Search for user profiles with AI skill filtering
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async searchProfiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Parse query parameters specifically for AI talent search
      const searchParams: UserSearchParams = {
        query: req.query.query as string,
        role: UserRole.FREELANCER, // Only search for freelancers
        status: UserStatus.ACTIVE, // Only search for active users
        skills: req.query.skills ? (req.query.skills as string).split(',') : undefined,
        minHourlyRate: req.query.minHourlyRate ? parseInt(req.query.minHourlyRate as string, 10) : undefined,
        maxHourlyRate: req.query.maxHourlyRate ? parseInt(req.query.maxHourlyRate as string, 10) : undefined,
        location: req.query.location as string,
        availability: req.query.availability as string,
        isVerified: req.query.isVerified === 'true',
        isTopRated: req.query.isTopRated === 'true',
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as string
      };
      
      // Search users focused on profiles
      const result = await this.userService.searchUsers(searchParams);
      
      // Map users to include their profiles
      const profileResults = await Promise.all(
        result.users.map(async (user) => {
          try {
            const profile = await this.userService.getProfile(user.id);
            return {
              userId: user.id,
              fullName: `${user.firstName} ${user.lastName}`,
              profile
            };
          } catch (error) {
            return {
              userId: user.id,
              fullName: `${user.firstName} ${user.lastName}`,
              profile: null
            };
          }
        })
      );
      
      res.status(200).json({
        success: true,
        data: profileResults.filter(result => result.profile !== null),
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (error) {
      this.handleError(error as Error, res, next);
    }
  }

  /**
   * Upload a profile avatar image
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async uploadProfileAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Create multer instance for file upload
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: config.user.avatarSettings.maxSize
      },
      fileFilter: (_, file, cb) => {
        // Check if file type is allowed
        if (config.user.avatarSettings.allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new ValidationError('Invalid file type. Allowed types: ' + 
            config.user.avatarSettings.allowedTypes.join(', ')));
        }
      }
    }).single('avatar');
    
    // Handle the multer upload as a Promise
    const uploadPromise = () => {
      return new Promise<Express.Multer.File>((resolve, reject) => {
        upload(req, res, (err) => {
          if (err) {
            reject(err instanceof Error ? err : new ValidationError('File upload error'));
            return;
          }
          
          if (!req.file) {
            reject(new ValidationError('No file uploaded'));
            return;
          }
          
          resolve(req.file);
        });
      });
    };
    
    try {
      const userId = req.params.userId;
      
      // Ensure user has permission to update this profile
      if (req.user!.id !== userId && req.user!.role !== UserRole.ADMIN) {
        throw new AuthorizationError('You do not have permission to update this profile');
      }
      
      // Upload the file
      const file = await uploadPromise();
      
      // Upload to S3
      const key = `avatars/${userId}/${Date.now()}-${file.originalname}`;
      await this.s3Client.putObject({
        Bucket: config.storage.s3.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read'
      });
      
      // Generate the avatar URL
      const avatarUrl = `https://${config.storage.s3.bucket}.s3.${config.storage.s3.region}.amazonaws.com/${key}`;
      
      // Update user profile with avatar URL
      await this.userService.updateProfile(userId, {
        avatarUrl
      });
      
      res.status(200).json({
        success: true,
        data: {
          avatarUrl
        },
        message: 'Profile avatar uploaded successfully'
      });
    } catch (error) {
      this.handleError(error as Error, res, next);
    }
  }

  /**
   * Admin endpoint to verify a user's identity
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async verifyUserIdentity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      const { status } = req.body;
      
      // Validate status
      if (!Object.values(VerificationStatus).includes(status)) {
        throw new ValidationError('Invalid verification status');
      }
      
      // Verify user identity
      const profile = await this.userService.verifyUserIdentity(
        userId, 
        status as VerificationStatus,
        req.user!.id
      );
      
      res.status(200).json({
        success: true,
        data: profile,
        message: `User identity verification status updated to ${status}`
      });
    } catch (error) {
      this.handleError(error as Error, res, next);
    }
  }

  /**
   * Admin endpoint to verify a user's AI skills
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async verifyUserSkills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      const { status } = req.body;
      
      // Validate status
      if (!Object.values(VerificationStatus).includes(status)) {
        throw new ValidationError('Invalid verification status');
      }
      
      // Verify user skills
      const profile = await this.userService.verifyUserSkills(
        userId, 
        status as VerificationStatus,
        req.user!.id
      );
      
      res.status(200).json({
        success: true,
        data: profile,
        message: `User skills verification status updated to ${status}`
      });
    } catch (error) {
      this.handleError(error as Error, res, next);
    }
  }

  /**
   * Admin endpoint to get user statistics
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async getUserStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Verify user has admin role
      if (req.user!.role !== UserRole.ADMIN) {
        throw new AuthorizationError('Admin access required for this resource');
      }
      
      // Get user statistics
      const stats = await this.userService.getUserStats();
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      this.handleError(error as Error, res, next);
    }
  }

  /**
   * Centralized error handler for controller methods
   * @param error - Error object
   * @param res - Express response object
   * @param next - Express next function
   */
  private handleError(error: Error, res: Response, next: NextFunction): void {
    console.error('Controller error:', error);
    
    const formattedError = formatErrorResponse(error);
    
    // Map error types to appropriate HTTP status codes
    let statusCode = 500;
    
    if (error instanceof ValidationError) {
      statusCode = 400;
    } else if (error instanceof AuthenticationError) {
      statusCode = 401;
    } else if (error instanceof AuthorizationError) {
      statusCode = 403;
    } else if (error instanceof ResourceNotFoundError) {
      statusCode = 404;
    }
    
    res.status(statusCode).json({
      success: false,
      error: formattedError
    });
  }
}