import {
  Repository,
  EntityRepository,
  getRepository,
  Like,
  In,
  Between
} from 'typeorm'; // v0.3.17
import { v4 } from 'uuid'; // v9.0.1
import Redis from 'ioredis'; // v5.3.2

import { User } from '../models/user.model';
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
  UserCreateDTO,
  UserUpdateDTO,
  ProfileCreateDTO,
  UserSearchParams,
  CompanyCreateDTO,
  PortfolioItemCreateDTO
} from '../../shared/src/types/user.types';
import { validateEmail } from '../../shared/src/utils/validation';
import { hashPassword } from '../utils/password';
import {
  ResourceNotFoundError,
  ValidationError,
  ConflictError
} from '../../shared/src/utils/errors';
import { config } from '../config';

/**
 * Service class that provides user management functionality including CRUD operations,
 * search, profile management, and verification
 */
export class UserService {
  private userRepository: Repository<User>;
  private profileRepository: Repository<Profile>;
  private companyRepository: Repository<CompanyProfile>;
  private skillRepository: Repository<SkillEntity>;
  private portfolioRepository: Repository<PortfolioItemEntity>;
  private redisClient: Redis;

  /**
   * Initializes the user service with necessary repositories and Redis client
   * @param redisClient - Redis client for caching
   */
  constructor(redisClient: Redis) {
    // Initialize database repositories
    this.userRepository = getRepository(User);
    this.profileRepository = getRepository(Profile);
    this.companyRepository = getRepository(CompanyProfile);
    this.skillRepository = getRepository(SkillEntity);
    this.portfolioRepository = getRepository(PortfolioItemEntity);
    
    // Initialize Redis client for caching
    this.redisClient = redisClient;
  }

  /**
   * Creates a new user account in the system
   * @param userData - User creation data transfer object
   * @returns Promise resolving to newly created user
   */
  async createUser(userData: UserCreateDTO): Promise<User> {
    // Validate required fields
    if (!userData.email || !userData.firstName || !userData.lastName) {
      throw new ValidationError('Email, first name, and last name are required');
    }

    // Validate email format
    if (!validateEmail(userData.email)) {
      throw new ValidationError('Invalid email format');
    }

    // Check if email already exists in the system
    const existingUser = await this.userRepository.findOne({ 
      where: { email: userData.email.toLowerCase() } 
    });
    
    if (existingUser) {
      throw new ConflictError('Email already in use', 'User');
    }

    // Create new User instance with provided data
    const user = new User({
      email: userData.email.toLowerCase(),
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role || UserRole.FREELANCER,
      status: UserStatus.PENDING_VERIFICATION
    });

    // Set password using secure hashing
    if (userData.password) {
      await user.setPassword(userData.password);
    }

    // Generate email verification token if required
    if (config.user.verificationPolicy.requireEmailVerification) {
      user.generateEmailVerificationToken();
    } else {
      user.status = UserStatus.ACTIVE;
      user.emailVerified = true;
    }

    // Save user entity to database
    await this.userRepository.save(user);

    // Clear user cache if exists
    await this.clearUserCache(user.id);

    // Return created user with sensitive data removed
    return user;
  }

  /**
   * Finds a user by their unique ID
   * @param id - User ID
   * @param includeProfile - Whether to include profile relation
   * @returns Promise resolving to found user or null if not exists
   */
  async findUserById(id: string, includeProfile = false): Promise<User> {
    // Check Redis cache for user data
    const cacheKey = `user:${id}`;
    const cachedUser = await this.redisClient.get(cacheKey);
    
    if (cachedUser) {
      const user = JSON.parse(cachedUser);
      
      // If profile requested but not in cache, fetch from database
      if (includeProfile && !user.profile) {
        return this.fetchUserWithProfile(id);
      }
      
      return user;
    }
    
    // If not in cache, query database by ID
    const relations = includeProfile ? ['profile'] : [];
    const user = await this.userRepository.findOne({
      where: { id },
      relations
    });
    
    if (!user) {
      throw new ResourceNotFoundError('User not found', 'User', id);
    }
    
    // Cache user data if found
    await this.redisClient.set(
      cacheKey,
      JSON.stringify(user),
      'EX',
      3600 // 1 hour cache
    );
    
    return user;
  }
  
  /**
   * Helper method to fetch user with profile from database
   * @param id - User ID
   * @returns Promise resolving to user with profile
   */
  private async fetchUserWithProfile(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['profile']
    });
    
    if (!user) {
      throw new ResourceNotFoundError('User not found', 'User', id);
    }
    
    // Update cache with profile data included
    const cacheKey = `user:${id}`;
    await this.redisClient.set(
      cacheKey,
      JSON.stringify(user),
      'EX',
      3600 // 1 hour cache
    );
    
    return user;
  }

  /**
   * Finds a user by their email address
   * @param email - User email
   * @returns Promise resolving to found user or null if not exists
   */
  async findUserByEmail(email: string): Promise<User | null> {
    // Validate email format
    if (!validateEmail(email)) {
      throw new ValidationError('Invalid email format');
    }
    
    // Query database for user with matching email (case-insensitive)
    return this.userRepository.findOne({
      where: { email: email.toLowerCase() }
    });
  }

  /**
   * Updates a user's information
   * @param id - User ID
   * @param userData - User update data
   * @returns Promise resolving to updated user
   */
  async updateUser(id: string, userData: UserUpdateDTO): Promise<User> {
    // Find user by ID
    const user = await this.findUserById(id);
    
    // Check if email update would cause a conflict
    if (userData.email && userData.email !== user.email) {
      const existingUser = await this.findUserByEmail(userData.email);
      if (existingUser && existingUser.id !== id) {
        throw new ConflictError('Email already in use', 'User');
      }
      
      // Validate new email format
      if (!validateEmail(userData.email)) {
        throw new ValidationError('Invalid email format');
      }
      
      user.email = userData.email.toLowerCase();
    }
    
    // Update user properties with provided data
    if (userData.firstName !== undefined) user.firstName = userData.firstName;
    if (userData.lastName !== undefined) user.lastName = userData.lastName;
    if (userData.status !== undefined) user.status = userData.status;
    
    // Save updated user to database
    await this.userRepository.save(user);
    
    // Clear user cache
    await this.clearUserCache(id);
    
    // Return updated user with sensitive data removed
    return user;
  }

  /**
   * Deletes a user account
   * @param id - User ID
   * @returns Promise resolving to true if deletion was successful
   */
  async deleteUser(id: string): Promise<boolean> {
    // Find user by ID
    const user = await this.findUserById(id);
    
    // Check if user can be deleted (admin restrictions, etc.)
    if (user.role === UserRole.ADMIN) {
      throw new ValidationError('Admin users cannot be deleted through this API');
    }
    
    // Set user status to INACTIVE instead of actual deletion
    user.status = UserStatus.INACTIVE;
    await this.userRepository.save(user);
    
    // Clear user cache
    await this.clearUserCache(id);
    
    return true;
  }

  /**
   * Searches and filters users based on provided criteria
   * @param searchParams - Search parameters
   * @returns Promise resolving to paginated search results
   */
  async searchUsers(searchParams: UserSearchParams): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Build query based on search parameters
    const queryBuilder = this.userRepository.createQueryBuilder('user');
    
    // Apply filters for role, status, skills, hourly rate, location
    if (searchParams.query) {
      queryBuilder.andWhere(
        '(user.firstName LIKE :query OR user.lastName LIKE :query OR user.email LIKE :query)',
        { query: `%${searchParams.query}%` }
      );
    }
    
    if (searchParams.role) {
      queryBuilder.andWhere('user.role = :role', { role: searchParams.role });
    }
    
    if (searchParams.status) {
      queryBuilder.andWhere('user.status = :status', { status: searchParams.status });
    }
    
    // Join with profile for profile-specific filters
    if (
      searchParams.skills?.length ||
      searchParams.minHourlyRate !== undefined ||
      searchParams.maxHourlyRate !== undefined ||
      searchParams.location ||
      searchParams.availability ||
      searchParams.isVerified !== undefined ||
      searchParams.isTopRated !== undefined
    ) {
      queryBuilder.leftJoinAndSelect('user.profile', 'profile');
      
      // Filter by skills
      if (searchParams.skills?.length) {
        queryBuilder.leftJoinAndSelect('profile.skills', 'skill');
        queryBuilder.andWhere('skill.name IN (:...skills)', { 
          skills: searchParams.skills 
        });
      }
      
      // Filter by hourly rate range
      if (searchParams.minHourlyRate !== undefined) {
        queryBuilder.andWhere('profile.hourlyRate >= :minRate', { 
          minRate: searchParams.minHourlyRate 
        });
      }
      
      if (searchParams.maxHourlyRate !== undefined) {
        queryBuilder.andWhere('profile.hourlyRate <= :maxRate', { 
          maxRate: searchParams.maxHourlyRate 
        });
      }
      
      // Filter by location
      if (searchParams.location) {
        queryBuilder.andWhere('profile.location LIKE :location', { 
          location: `%${searchParams.location}%` 
        });
      }
      
      // Filter by availability
      if (searchParams.availability) {
        queryBuilder.andWhere('profile.availability LIKE :availability', { 
          availability: `%${searchParams.availability}%` 
        });
      }
      
      // Filter by verification status
      if (searchParams.isVerified !== undefined) {
        queryBuilder.andWhere('profile.identityVerified = :verified', { 
          verified: searchParams.isVerified ? VerificationStatus.VERIFIED : VerificationStatus.UNVERIFIED
        });
      }
      
      // Filter by top rated status
      if (searchParams.isTopRated !== undefined) {
        queryBuilder.andWhere('profile.isTopRated = :isTopRated', { 
          isTopRated: searchParams.isTopRated 
        });
      }
    }
    
    // Apply pagination with page and limit
    const page = searchParams.page || 1;
    const limit = searchParams.limit || 20;
    queryBuilder.skip((page - 1) * limit);
    queryBuilder.take(limit);
    
    // Apply sorting based on sortBy and sortOrder
    const sortBy = searchParams.sortBy || 'createdAt';
    const sortOrder = searchParams.sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    // Make sure the sortBy field is valid to prevent SQL injection
    const validUserFields = ['createdAt', 'firstName', 'lastName', 'email'];
    const validProfileFields = ['hourlyRate', 'rating', 'experienceYears'];
    
    if (validUserFields.includes(sortBy)) {
      queryBuilder.orderBy(`user.${sortBy}`, sortOrder);
    } else if (validProfileFields.includes(sortBy)) {
      queryBuilder.orderBy(`profile.${sortBy}`, sortOrder);
    } else {
      // Default sort by creation date
      queryBuilder.orderBy('user.createdAt', 'DESC');
    }
    
    // Execute query and count total results
    const [users, total] = await queryBuilder.getManyAndCount();
    
    // Format results with pagination metadata
    const result = {
      users,
      total,
      page,
      limit
    };
    
    // Cache search results briefly
    const cacheKey = `search:users:${JSON.stringify(searchParams)}`;
    await this.redisClient.set(
      cacheKey,
      JSON.stringify(result),
      'EX',
      300 // 5 minutes cache for search results
    );
    
    // Return formatted results
    return result;
  }

  /**
   * Creates a profile for a user
   * @param userId - User ID
   * @param profileData - Profile creation data
   * @returns Promise resolving to created profile
   */
  async createProfile(userId: string, profileData: ProfileCreateDTO): Promise<Profile> {
    // Find user by ID
    const user = await this.findUserById(userId);
    
    // Check if user already has a profile
    const existingProfile = await this.profileRepository.findOne({
      where: { userId }
    });
    
    if (existingProfile) {
      throw new ConflictError('User already has a profile', 'Profile');
    }
    
    // Create new Profile instance with provided data
    const profile = new Profile({
      userId,
      title: profileData.title,
      bio: profileData.bio,
      hourlyRate: profileData.hourlyRate,
      location: profileData.location,
      availability: profileData.availability,
      githubUrl: profileData.githubUrl,
      linkedinUrl: profileData.linkedinUrl,
      website: profileData.website
    });
    
    // Process skills if provided
    if (profileData.skills && profileData.skills.length > 0) {
      profileData.skills.forEach(skillData => {
        const skill = new SkillEntity({
          name: skillData.name,
          category: skillData.category || 'General',
          level: skillData.level || 1,
          yearsOfExperience: skillData.yearsOfExperience || 0
        });
        profile.addSkill(skill);
      });
    }
    
    // Save profile to database
    await this.profileRepository.save(profile);
    
    // Clear user and profile cache
    await this.clearUserCache(userId);
    
    // Return created profile
    return profile;
  }

  /**
   * Creates a company profile for an employer user
   * @param userId - User ID
   * @param companyData - Company creation data
   * @returns Promise resolving to created company profile
   */
  async createCompanyProfile(userId: string, companyData: CompanyCreateDTO): Promise<CompanyProfile> {
    // Find user by ID
    const user = await this.findUserById(userId);
    
    // Verify user role is EMPLOYER
    if (user.role !== UserRole.EMPLOYER) {
      throw new ValidationError('Only employer users can create company profiles');
    }
    
    // Check if user already has a company profile
    const existingCompany = await this.companyRepository.findOne({
      where: { userId }
    });
    
    if (existingCompany) {
      throw new ConflictError('User already has a company profile', 'CompanyProfile');
    }
    
    // Create new CompanyProfile instance with provided data
    const company = new CompanyProfile({
      userId,
      name: companyData.name,
      description: companyData.description,
      website: companyData.website,
      industry: companyData.industry,
      size: companyData.size,
      location: companyData.location,
      aiInterests: companyData.aiInterests
    });
    
    // Save company profile to database
    await this.companyRepository.save(company);
    
    // Clear user and company cache
    await this.clearUserCache(userId);
    
    // Return created company profile
    return company;
  }

  /**
   * Retrieves a user's profile with associated data
   * @param userId - User ID
   * @returns Promise resolving to user profile or null if not exists
   */
  async getProfile(userId: string): Promise<Profile> {
    // Check Redis cache for profile data
    const cacheKey = `profile:${userId}`;
    const cachedProfile = await this.redisClient.get(cacheKey);
    
    if (cachedProfile) {
      return JSON.parse(cachedProfile);
    }
    
    // If not in cache, query database for profile with given userId
    const profile = await this.profileRepository.findOne({
      where: { userId },
      relations: ['skills', 'portfolioItems']
    });
    
    if (!profile) {
      throw new ResourceNotFoundError('Profile not found', 'Profile', userId);
    }
    
    // Cache profile data if found
    await this.redisClient.set(
      cacheKey,
      JSON.stringify(profile),
      'EX',
      3600 // 1 hour cache
    );
    
    // Return profile or throw ResourceNotFoundError if not found
    return profile;
  }

  /**
   * Retrieves a company profile for an employer
   * @param userId - User ID
   * @returns Promise resolving to company profile or null if not exists
   */
  async getCompanyProfile(userId: string): Promise<CompanyProfile> {
    const company = await this.companyRepository.findOne({
      where: { userId }
    });
    
    if (!company) {
      throw new ResourceNotFoundError('Company profile not found', 'CompanyProfile', userId);
    }
    
    return company;
  }

  /**
   * Updates a user's profile information
   * @param userId - User ID
   * @param profileData - Profile update data
   * @returns Promise resolving to updated profile
   */
  async updateProfile(userId: string, profileData: Partial<ProfileCreateDTO>): Promise<Profile> {
    // Get profile by user ID
    const profile = await this.getProfile(userId);
    
    // Update profile properties with provided data
    if (profileData.title !== undefined) profile.title = profileData.title;
    if (profileData.bio !== undefined) profile.bio = profileData.bio;
    if (profileData.hourlyRate !== undefined) profile.hourlyRate = profileData.hourlyRate;
    if (profileData.location !== undefined) profile.location = profileData.location;
    if (profileData.availability !== undefined) profile.availability = profileData.availability;
    if (profileData.githubUrl !== undefined) profile.githubUrl = profileData.githubUrl;
    if (profileData.linkedinUrl !== undefined) profile.linkedinUrl = profileData.linkedinUrl;
    if (profileData.website !== undefined) profile.website = profileData.website;
    
    // Process updated skills if provided
    if (profileData.skills && profileData.skills.length > 0) {
      profileData.skills.forEach(skillData => {
        const skill = new SkillEntity({
          name: skillData.name,
          category: skillData.category || 'General',
          level: skillData.level || 1,
          yearsOfExperience: skillData.yearsOfExperience || 0
        });
        profile.addSkill(skill);
      });
    }
    
    // Save updated profile to database
    await this.profileRepository.save(profile);
    
    // Clear profile cache
    await this.clearUserCache(userId);
    
    // Return updated profile
    return profile;
  }

  /**
   * Updates a company profile
   * @param userId - User ID
   * @param companyData - Company profile update data
   * @returns Promise resolving to updated company profile
   */
  async updateCompanyProfile(userId: string, companyData: Partial<CompanyCreateDTO>): Promise<CompanyProfile> {
    // Get company profile by user ID
    const company = await this.getCompanyProfile(userId);
    
    // Update company profile properties with provided data
    if (companyData.name !== undefined) company.name = companyData.name;
    if (companyData.description !== undefined) company.description = companyData.description;
    if (companyData.website !== undefined) company.website = companyData.website;
    if (companyData.industry !== undefined) company.industry = companyData.industry;
    if (companyData.size !== undefined) company.size = companyData.size;
    if (companyData.location !== undefined) company.location = companyData.location;
    if (companyData.aiInterests !== undefined) company.aiInterests = companyData.aiInterests;
    
    // Save updated company profile to database
    await this.companyRepository.save(company);
    
    // Clear company profile cache
    const cacheKey = `company:${userId}`;
    await this.redisClient.del(cacheKey);
    
    // Return updated company profile
    return company;
  }

  /**
   * Adds a portfolio item to a user's profile
   * @param userId - User ID
   * @param itemData - Portfolio item creation data
   * @returns Promise resolving to created portfolio item
   */
  async addPortfolioItem(userId: string, itemData: PortfolioItemCreateDTO): Promise<PortfolioItemEntity> {
    // Get profile by user ID
    const profile = await this.getProfile(userId);
    
    // Create new PortfolioItemEntity with provided data
    const portfolioItem = new PortfolioItemEntity({
      title: itemData.title,
      description: itemData.description,
      projectUrl: itemData.projectUrl,
      githubUrl: itemData.githubUrl,
      kaggleUrl: itemData.kaggleUrl,
      technologies: itemData.technologies,
      category: itemData.category,
      aiModels: itemData.aiModels,
      problemSolved: itemData.problemSolved,
      startDate: itemData.startDate,
      endDate: itemData.endDate
    });
    
    // Associate item with profile
    profile.addPortfolioItem(portfolioItem);
    
    // Save updated profile and portfolio item to database
    await this.profileRepository.save(profile);
    
    // Clear profile cache
    await this.clearUserCache(userId);
    
    // Return created portfolio item
    return portfolioItem;
  }

  /**
   * Updates a portfolio item
   * @param userId - User ID
   * @param itemId - Portfolio item ID
   * @param itemData - Portfolio item update data
   * @returns Promise resolving to updated portfolio item
   */
  async updatePortfolioItem(userId: string, itemId: string, itemData: Partial<PortfolioItemCreateDTO>): Promise<PortfolioItemEntity> {
    // Find portfolio item by ID
    const portfolioItem = await this.portfolioRepository.findOne({
      where: { id: itemId },
      relations: ['profile']
    });
    
    if (!portfolioItem) {
      throw new ResourceNotFoundError('Portfolio item not found', 'PortfolioItem', itemId);
    }
    
    // Verify portfolio item belongs to user's profile
    const profile = await this.getProfile(userId);
    if (portfolioItem.profileId !== profile.id) {
      throw new ValidationError('Portfolio item does not belong to this user');
    }
    
    // Update portfolio item properties with provided data
    if (itemData.title !== undefined) portfolioItem.title = itemData.title;
    if (itemData.description !== undefined) portfolioItem.description = itemData.description;
    if (itemData.projectUrl !== undefined) portfolioItem.projectUrl = itemData.projectUrl;
    if (itemData.githubUrl !== undefined) portfolioItem.githubUrl = itemData.githubUrl;
    if (itemData.kaggleUrl !== undefined) portfolioItem.kaggleUrl = itemData.kaggleUrl;
    if (itemData.technologies !== undefined) portfolioItem.technologies = itemData.technologies;
    if (itemData.category !== undefined) portfolioItem.category = itemData.category;
    if (itemData.aiModels !== undefined) portfolioItem.aiModels = itemData.aiModels;
    if (itemData.problemSolved !== undefined) portfolioItem.problemSolved = itemData.problemSolved;
    if (itemData.startDate !== undefined) portfolioItem.startDate = itemData.startDate;
    if (itemData.endDate !== undefined) portfolioItem.endDate = itemData.endDate;
    
    // Save updated portfolio item to database
    await this.portfolioRepository.save(portfolioItem);
    
    // Clear profile cache
    await this.clearUserCache(userId);
    
    // Return updated portfolio item
    return portfolioItem;
  }

  /**
   * Removes a portfolio item from a user's profile
   * @param userId - User ID
   * @param itemId - Portfolio item ID
   * @returns Promise resolving to true if portfolio item was removed
   */
  async removePortfolioItem(userId: string, itemId: string): Promise<boolean> {
    // Get profile by user ID
    const profile = await this.getProfile(userId);
    
    // Use profile.removePortfolioItem method to remove item by ID
    const removed = profile.removePortfolioItem(itemId);
    
    if (!removed) {
      throw new ResourceNotFoundError('Portfolio item not found or already removed', 'PortfolioItem', itemId);
    }
    
    // Save updated profile to database
    await this.profileRepository.save(profile);
    
    // Clear profile cache
    await this.clearUserCache(userId);
    
    // Return success status
    return true;
  }

  /**
   * Verifies a user's identity (admin function)
   * @param userId - User ID
   * @param status - Verification status to set
   * @param adminId - ID of admin performing verification
   * @returns Promise resolving to updated profile with verification status
   */
  async verifyUserIdentity(userId: string, status: VerificationStatus, adminId: string): Promise<Profile> {
    // Verify admin permissions of requesting user
    const admin = await this.findUserById(adminId);
    if (admin.role !== UserRole.ADMIN) {
      throw new ValidationError('Only administrators can verify user identities');
    }
    
    // Get profile by user ID
    const profile = await this.getProfile(userId);
    
    // Update identityVerified status
    profile.identityVerified = status;
    
    // Update top rated status based on verification status
    if (status === VerificationStatus.VERIFIED) {
      profile.isTopRated = profile.checkTopRatedEligibility();
    } else if (profile.isTopRated) {
      profile.isTopRated = false;
    }
    
    // Log verification action with adminId
    console.info(`User ${userId} identity verified as ${status} by admin ${adminId} at ${new Date().toISOString()}`);
    
    // Save updated profile to database
    await this.profileRepository.save(profile);
    
    // Clear profile cache
    await this.clearUserCache(userId);
    
    // Return updated profile
    return profile;
  }

  /**
   * Verifies a user's skills (admin function)
   * @param userId - User ID
   * @param status - Verification status to set
   * @param adminId - ID of admin performing verification
   * @returns Promise resolving to updated profile with verification status
   */
  async verifyUserSkills(userId: string, status: VerificationStatus, adminId: string): Promise<Profile> {
    // Verify admin permissions of requesting user
    const admin = await this.findUserById(adminId);
    if (admin.role !== UserRole.ADMIN) {
      throw new ValidationError('Only administrators can verify user skills');
    }
    
    // Get profile by user ID
    const profile = await this.getProfile(userId);
    
    // Update skillsVerified status
    profile.skillsVerified = status;
    
    // Update individual skills verification status
    if (profile.skills && profile.skills.length > 0) {
      profile.skills.forEach(skill => {
        skill.verified = status;
      });
    }
    
    // Log verification action with adminId
    console.info(`User ${userId} skills verified as ${status} by admin ${adminId} at ${new Date().toISOString()}`);
    
    // Save updated profile to database
    await this.profileRepository.save(profile);
    
    // Clear profile cache
    await this.clearUserCache(userId);
    
    // Return updated profile
    return profile;
  }

  /**
   * Verifies a company profile (admin function)
   * @param userId - User ID
   * @param status - Verification status to set
   * @param adminId - ID of admin performing verification
   * @returns Promise resolving to updated company profile with verification status
   */
  async verifyCompany(userId: string, status: VerificationStatus, adminId: string): Promise<CompanyProfile> {
    // Verify admin permissions of requesting user
    const admin = await this.findUserById(adminId);
    if (admin.role !== UserRole.ADMIN) {
      throw new ValidationError('Only administrators can verify company profiles');
    }
    
    // Get company profile by user ID
    const company = await this.getCompanyProfile(userId);
    
    // Update verified status
    company.verified = status;
    
    // Log verification action with adminId
    console.info(`Company profile for user ${userId} verified as ${status} by admin ${adminId} at ${new Date().toISOString()}`);
    
    // Save updated company profile to database
    await this.companyRepository.save(company);
    
    // Clear company profile cache
    await this.clearUserCache(userId);
    
    // Return updated company profile
    return company;
  }

  /**
   * Gets statistics about users in the system
   * @returns Promise resolving to user statistics including counts by role, status, and verification
   */
  async getUserStats(): Promise<object> {
    // Try to get stats from cache first
    const cacheKey = 'user:stats';
    const cachedStats = await this.redisClient.get(cacheKey);
    
    if (cachedStats) {
      return JSON.parse(cachedStats);
    }
    
    // Query database for user counts by role
    const roleStats = await this.userRepository
      .createQueryBuilder('user')
      .select('user.role, COUNT(user.id) as count')
      .groupBy('user.role')
      .getRawMany();
    
    // Query database for user counts by status
    const statusStats = await this.userRepository
      .createQueryBuilder('user')
      .select('user.status, COUNT(user.id) as count')
      .groupBy('user.status')
      .getRawMany();
    
    // Query database for profile counts by verification status
    const verificationStats = await this.profileRepository
      .createQueryBuilder('profile')
      .select('profile.identityVerified, COUNT(profile.id) as count')
      .groupBy('profile.identityVerified')
      .getRawMany();
    
    // Compile statistics into a single object
    const stats = {
      totalUsers: await this.userRepository.count(),
      byRole: roleStats.reduce((acc, curr) => ({
        ...acc,
        [curr.user_role]: parseInt(curr.count, 10)
      }), {}),
      byStatus: statusStats.reduce((acc, curr) => ({
        ...acc,
        [curr.user_status]: parseInt(curr.count, 10)
      }), {}),
      byVerification: verificationStats.reduce((acc, curr) => ({
        ...acc,
        [curr.profile_identityVerified]: parseInt(curr.count, 10)
      }), {}),
      topRatedCount: await this.profileRepository.count({
        where: { isTopRated: true }
      }),
      activeUserCount: await this.userRepository.count({
        where: { status: UserStatus.ACTIVE }
      }),
      newUsersPast30Days: await this.userRepository.count({
        where: {
          createdAt: Between(
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
            new Date()
          )
        }
      })
    };
    
    // Cache statistics briefly
    await this.redisClient.set(
      cacheKey,
      JSON.stringify(stats),
      'EX',
      300 // 5 minutes cache
    );
    
    // Return statistics object
    return stats;
  }

  /**
   * Clears cached user data for a specific user
   * @param userId - User ID
   */
  async clearUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.redisClient.del(`user:${userId}`),
      this.redisClient.del(`profile:${userId}`),
      this.redisClient.del(`company:${userId}`)
    ]);
  }
}