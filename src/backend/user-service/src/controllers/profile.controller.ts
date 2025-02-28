import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { upload } from 'multer'; // v1.4.5-lts.1
import sharp from 'sharp'; // v0.32.5
import Redis from 'ioredis'; // v5.3.2

import { UserService } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { 
  Profile, 
  SkillEntity, 
  PortfolioItemEntity, 
  CompanyProfile 
} from '../models/profile.model';
import { 
  UserRole, 
  UserStatus, 
  VerificationStatus,
  ProfileCreateDTO,
  CompanyCreateDTO,
  PortfolioItemCreateDTO
} from '../../shared/src/types/user.types';
import { 
  ValidationError, 
  AuthorizationError, 
  ResourceNotFoundError 
} from '../../shared/src/utils/errors';
import { 
  validateSchema, 
  userSchemas 
} from '../../shared/src/utils/validation';
import { config } from '../config';

/**
 * Controller class that handles HTTP requests for profile-related operations
 */
export class ProfileController {
  private userService: UserService;
  private authService: AuthService;
  private redisClient: Redis;

  /**
   * Initializes the profile controller with required services
   * @param userService - User service for profile operations
   * @param authService - Auth service for authentication checks
   * @param redisClient - Redis client for caching
   */
  constructor(
    userService: UserService,
    authService: AuthService,
    redisClient: Redis
  ) {
    this.userService = userService;
    this.authService = authService;
    this.redisClient = redisClient;
    
    // Bind methods to maintain 'this' context
    this.getProfile = this.getProfile.bind(this);
    this.createUserProfile = this.createUserProfile.bind(this);
    this.updateUserProfile = this.updateUserProfile.bind(this);
    this.createCompanyProfile = this.createCompanyProfile.bind(this);
    this.updateCompanyProfile = this.updateCompanyProfile.bind(this);
    this.uploadAvatar = this.uploadAvatar.bind(this);
    this.uploadCompanyLogo = this.uploadCompanyLogo.bind(this);
    this.addPortfolioItem = this.addPortfolioItem.bind(this);
    this.updatePortfolioItem = this.updatePortfolioItem.bind(this);
    this.deletePortfolioItem = this.deletePortfolioItem.bind(this);
    this.updateSkills = this.updateSkills.bind(this);
    this.searchProfiles = this.searchProfiles.bind(this);
    this.verifyIdentity = this.verifyIdentity.bind(this);
    this.verifySkills = this.verifySkills.bind(this);
    this.setTopRated = this.setTopRated.bind(this);
    this.checkAuthentication = this.checkAuthentication.bind(this);
    this.checkRole = this.checkRole.bind(this);
    this.checkProfileOwnership = this.checkProfileOwnership.bind(this);
  }

  /**
   * Retrieves a user's profile
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      
      // Check Redis cache first
      const cacheKey = `profile:${userId}`;
      const cachedProfile = await this.redisClient.get(cacheKey);
      
      if (cachedProfile) {
        res.json(JSON.parse(cachedProfile));
        return;
      }
      
      // If not in cache, fetch from database
      const profile = await this.userService.getProfile(userId);
      
      // Cache the profile for future requests
      await this.redisClient.set(
        cacheKey,
        JSON.stringify(profile),
        'EX', 
        3600 // Cache for 1 hour
      );
      
      res.json(profile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Creates a new user profile
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async createUserProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      const profileData: ProfileCreateDTO = req.body;
      
      // Validate request data
      const validation = validateSchema(profileData, userSchemas.updateProfileSchema);
      if (!validation.success) {
        throw new ValidationError('Invalid profile data', validation.error?.format());
      }
      
      // Check if user is authorized (self or admin)
      if (req.user.id !== userId && req.user.role !== UserRole.ADMIN) {
        throw new AuthorizationError('You are not authorized to create this profile');
      }
      
      // Create profile
      const profile = await this.userService.createProfile(userId, profileData);
      
      res.status(201).json(profile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates an existing user profile
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async updateUserProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      const profileData = req.body;
      
      // Validate request data
      const validation = validateSchema(profileData, userSchemas.updateProfileSchema);
      if (!validation.success) {
        throw new ValidationError('Invalid profile data', validation.error?.format());
      }
      
      // Check if user is authorized (self or admin)
      if (req.user.id !== userId && req.user.role !== UserRole.ADMIN) {
        throw new AuthorizationError('You are not authorized to update this profile');
      }
      
      // Update profile
      const updatedProfile = await this.userService.updateProfile(userId, profileData);
      
      // Clear cache
      await this.redisClient.del(`profile:${userId}`);
      
      res.json(updatedProfile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Creates a new company profile for an employer
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async createCompanyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      const companyData: CompanyCreateDTO = req.body;
      
      // Validate request data
      if (!companyData.name || !companyData.description) {
        throw new ValidationError('Company name and description are required');
      }
      
      // Check if user is authorized (self or admin)
      if (req.user.id !== userId && req.user.role !== UserRole.ADMIN) {
        throw new AuthorizationError('You are not authorized to create this company profile');
      }
      
      // Verify user is an EMPLOYER
      if (req.user.role !== UserRole.EMPLOYER && req.user.role !== UserRole.ADMIN) {
        throw new AuthorizationError('Only employers can create company profiles');
      }
      
      // Create company profile
      const companyProfile = await this.userService.createCompanyProfile(userId, companyData);
      
      res.status(201).json(companyProfile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates an existing company profile
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async updateCompanyProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      const companyData = req.body;
      
      // Validate request data
      if (Object.keys(companyData).length === 0) {
        throw new ValidationError('No update data provided');
      }
      
      // Check if user is authorized (self or admin)
      if (req.user.id !== userId && req.user.role !== UserRole.ADMIN) {
        throw new AuthorizationError('You are not authorized to update this company profile');
      }
      
      // Update company profile
      const updatedCompany = await this.userService.updateCompanyProfile(userId, companyData);
      
      // Clear cache
      await this.redisClient.del(`company:${userId}`);
      
      res.json(updatedCompany);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Uploads and processes a profile avatar image
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      
      // Check if user is authorized (self or admin)
      if (req.user.id !== userId && req.user.role !== UserRole.ADMIN) {
        throw new AuthorizationError('You are not authorized to update this profile');
      }
      
      // Ensure file was uploaded
      if (!req.file) {
        throw new ValidationError('No image file provided');
      }
      
      // Validate file type
      const allowedTypes = config.user.avatarSettings.allowedTypes;
      if (!allowedTypes.includes(req.file.mimetype)) {
        throw new ValidationError(`File type not supported. Allowed types: ${allowedTypes.join(', ')}`);
      }
      
      // Validate file size
      if (req.file.size > config.user.avatarSettings.maxSize) {
        throw new ValidationError(`File size exceeds the maximum allowed size of ${config.user.avatarSettings.maxSize / 1024 / 1024}MB`);
      }
      
      // Process image
      const processedImage = await sharp(req.file.buffer)
        .resize(300, 300, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer();
      
      // In a real implementation, we would upload to cloud storage
      // For now, simulate with a fake URL
      const avatarUrl = `https://ai-talent-marketplace.com/avatars/${userId}.jpg`;
      
      // Update profile with new avatar URL
      const updatedProfile = await this.userService.updateProfile(userId, {
        avatarUrl
      });
      
      // Clear cache
      await this.redisClient.del(`profile:${userId}`);
      
      res.json({ 
        success: true, 
        avatarUrl, 
        profile: updatedProfile 
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Uploads and processes a company logo image
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async uploadCompanyLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      
      // Check if user is authorized (self or admin)
      if (req.user.id !== userId && req.user.role !== UserRole.ADMIN) {
        throw new AuthorizationError('You are not authorized to update this company profile');
      }
      
      // Verify user has EMPLOYER role
      if (req.user.role !== UserRole.EMPLOYER && req.user.role !== UserRole.ADMIN) {
        throw new AuthorizationError('Only employers can update company logos');
      }
      
      // Ensure file was uploaded
      if (!req.file) {
        throw new ValidationError('No image file provided');
      }
      
      // Validate file type
      const allowedTypes = config.user.avatarSettings.allowedTypes;
      if (!allowedTypes.includes(req.file.mimetype)) {
        throw new ValidationError(`File type not supported. Allowed types: ${allowedTypes.join(', ')}`);
      }
      
      // Validate file size
      if (req.file.size > config.user.avatarSettings.maxSize) {
        throw new ValidationError(`File size exceeds the maximum allowed size of ${config.user.avatarSettings.maxSize / 1024 / 1024}MB`);
      }
      
      // Process image
      const processedImage = await sharp(req.file.buffer)
        .resize(500, 500, { fit: 'inside' })
        .jpeg({ quality: 85 })
        .toBuffer();
      
      // In a real implementation, we would upload to cloud storage
      // For now, simulate with a fake URL
      const logoUrl = `https://ai-talent-marketplace.com/companies/${userId}/logo.jpg`;
      
      // Update company profile with new logo URL
      const updatedCompany = await this.userService.updateCompanyProfile(userId, {
        logoUrl
      });
      
      // Clear cache
      await this.redisClient.del(`company:${userId}`);
      
      res.json({ 
        success: true, 
        logoUrl, 
        company: updatedCompany 
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Adds a portfolio item to a user's profile
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async addPortfolioItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      const itemData: PortfolioItemCreateDTO = req.body;
      
      // Validate request data
      if (!itemData.title || !itemData.description) {
        throw new ValidationError('Portfolio item title and description are required');
      }
      
      // Check if user is authorized (self or admin)
      if (req.user.id !== userId && req.user.role !== UserRole.ADMIN) {
        throw new AuthorizationError('You are not authorized to update this profile');
      }
      
      // Add portfolio item
      const portfolioItem = await this.userService.addPortfolioItem(userId, itemData);
      
      // Clear cache
      await this.redisClient.del(`profile:${userId}`);
      
      res.status(201).json(portfolioItem);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates an existing portfolio item
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async updatePortfolioItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      const itemId = req.params.itemId;
      const itemData = req.body;
      
      // Validate request data
      if (Object.keys(itemData).length === 0) {
        throw new ValidationError('No update data provided');
      }
      
      // Check if user is authorized (self or admin)
      if (req.user.id !== userId && req.user.role !== UserRole.ADMIN) {
        throw new AuthorizationError('You are not authorized to update this portfolio item');
      }
      
      // Update portfolio item
      const updatedItem = await this.userService.updatePortfolioItem(userId, itemId, itemData);
      
      // Clear cache
      await this.redisClient.del(`profile:${userId}`);
      
      res.json(updatedItem);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deletes a portfolio item from a user's profile
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async deletePortfolioItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      const itemId = req.params.itemId;
      
      // Check if user is authorized (self or admin)
      if (req.user.id !== userId && req.user.role !== UserRole.ADMIN) {
        throw new AuthorizationError('You are not authorized to delete this portfolio item');
      }
      
      // Remove portfolio item
      const removed = await this.userService.removePortfolioItem(userId, itemId);
      
      // Clear cache
      await this.redisClient.del(`profile:${userId}`);
      
      res.json({ success: removed });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates the skills section of a user's profile
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async updateSkills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      const { skills } = req.body;
      
      // Validate request data
      if (!Array.isArray(skills)) {
        throw new ValidationError('Skills must be an array');
      }
      
      for (const skill of skills) {
        if (!skill.name) {
          throw new ValidationError('Each skill must have a name');
        }
      }
      
      // Check if user is authorized (self or admin)
      if (req.user.id !== userId && req.user.role !== UserRole.ADMIN) {
        throw new AuthorizationError('You are not authorized to update this profile');
      }
      
      // Get existing profile
      const profile = await this.userService.getProfile(userId);
      
      // Process skills updates
      const updatedProfile = await this.userService.updateProfile(userId, {
        skills
      });
      
      // Clear cache
      await this.redisClient.del(`profile:${userId}`);
      
      res.json(updatedProfile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Searches for profiles based on provided criteria
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async searchProfiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const searchParams = req.query;
      
      // Build search parameters
      const params: any = {
        page: parseInt(searchParams.page as string) || 1,
        limit: parseInt(searchParams.limit as string) || 20
      };
      
      if (searchParams.query) params.query = searchParams.query;
      if (searchParams.role) params.role = searchParams.role;
      if (searchParams.skills) {
        params.skills = Array.isArray(searchParams.skills) 
          ? searchParams.skills 
          : [searchParams.skills];
      }
      if (searchParams.minHourlyRate) params.minHourlyRate = parseFloat(searchParams.minHourlyRate as string);
      if (searchParams.maxHourlyRate) params.maxHourlyRate = parseFloat(searchParams.maxHourlyRate as string);
      if (searchParams.location) params.location = searchParams.location;
      if (searchParams.availability) params.availability = searchParams.availability;
      if (searchParams.isVerified !== undefined) params.isVerified = searchParams.isVerified === 'true';
      if (searchParams.isTopRated !== undefined) params.isTopRated = searchParams.isTopRated === 'true';
      if (searchParams.sortBy) params.sortBy = searchParams.sortBy;
      if (searchParams.sortOrder) params.sortOrder = searchParams.sortOrder;
      
      // Check cache first
      const cacheKey = `search:profiles:${JSON.stringify(params)}`;
      const cachedResults = await this.redisClient.get(cacheKey);
      
      if (cachedResults) {
        res.json(JSON.parse(cachedResults));
        return;
      }
      
      // Perform search
      const results = await this.userService.searchUsers(params);
      
      // Cache results
      await this.redisClient.set(
        cacheKey,
        JSON.stringify(results),
        'EX',
        300 // Cache for 5 minutes
      );
      
      res.json(results);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verifies a user's identity (admin function)
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async verifyIdentity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      const { status } = req.body;
      
      // Verify admin role
      if (req.user.role !== UserRole.ADMIN) {
        throw new AuthorizationError('Only administrators can verify identity');
      }
      
      // Validate verification status
      if (!Object.values(VerificationStatus).includes(status)) {
        throw new ValidationError('Invalid verification status');
      }
      
      // Update verification status
      const profile = await this.userService.verifyUserIdentity(userId, status, req.user.id);
      
      // Clear cache
      await this.redisClient.del(`profile:${userId}`);
      
      res.json(profile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verifies a user's skills (admin function)
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async verifySkills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      const { status } = req.body;
      
      // Verify admin role
      if (req.user.role !== UserRole.ADMIN) {
        throw new AuthorizationError('Only administrators can verify skills');
      }
      
      // Validate verification status
      if (!Object.values(VerificationStatus).includes(status)) {
        throw new ValidationError('Invalid verification status');
      }
      
      // Update verification status
      const profile = await this.userService.verifyUserSkills(userId, status, req.user.id);
      
      // Clear cache
      await this.redisClient.del(`profile:${userId}`);
      
      res.json(profile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sets or unsets a profile's top rated status (admin function)
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async setTopRated(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      const { isTopRated } = req.body;
      
      // Verify admin role
      if (req.user.role !== UserRole.ADMIN) {
        throw new AuthorizationError('Only administrators can set top rated status');
      }
      
      // Validate isTopRated is a boolean
      if (typeof isTopRated !== 'boolean') {
        throw new ValidationError('isTopRated must be a boolean');
      }
      
      // Get profile
      const profile = await this.userService.getProfile(userId);
      
      // Update top rated status
      const updatedProfile = await this.userService.updateProfile(userId, {
        isTopRated
      });
      
      // Clear cache
      await this.redisClient.del(`profile:${userId}`);
      
      res.json(updatedProfile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Middleware that checks if a request is authenticated
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async checkAuthentication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthorizationError('Authentication required');
      }
      
      const token = authHeader.split(' ')[1];
      const decoded = this.authService.verifyToken(token, 'access');
      
      // Attach user ID and role to request
      req.user = {
        id: decoded.sub,
        role: decoded.role,
        email: decoded.email
      };
      
      next();
    } catch (error) {
      res.status(401).json({ 
        error: 'Authentication required', 
        message: error instanceof Error ? error.message : 'Invalid token'
      });
    }
  }

  /**
   * Middleware that checks if a user has required role
   * @param allowedRoles - Array of roles that are allowed to access the endpoint
   * @returns Middleware function that checks role authorization
   */
  checkRole(allowedRoles: UserRole[]): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      
      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({ 
          error: 'Insufficient permissions',
          message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
        });
        return;
      }
      
      next();
    };
  }

  /**
   * Middleware that checks if a user owns the requested profile or is an admin
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async checkProfileOwnership(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params.userId;
      
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }
      
      // Allow if user is the profile owner or is an admin
      if (req.user.id === userId || req.user.role === UserRole.ADMIN) {
        next();
        return;
      }
      
      throw new AuthorizationError('You do not have permission to access this profile');
    } catch (error) {
      if (error instanceof AuthorizationError) {
        res.status(403).json({ error: error.message });
      } else {
        next(error);
      }
    }
  }
}