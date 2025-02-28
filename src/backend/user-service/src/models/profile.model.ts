import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate
} from 'typeorm'; // v0.3.17
import {
  IsNotEmpty,
  IsEmail,
  IsUrl,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsBoolean,
  IsDate,
  IsString,
  Length
} from 'class-validator'; // v0.14.0
import { v4 } from 'uuid'; // v9.0.1

import { User } from './user.model';
import {
  Profile as ProfileInterface,
  Skill as SkillInterface,
  PortfolioItem as PortfolioItemInterface,
  VerificationStatus
} from '../../shared/src/types/user.types';
import { validateUrl } from '../../shared/src/utils/validation';
import { ValidationError } from '../../shared/src/utils/errors';
import { config } from '../config';

/**
 * Entity representing an AI professional's profile with expertise details, verification status, and professional information
 */
@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column()
  @IsNotEmpty()
  @Length(1, 200)
  title: string;

  @Column({ type: 'text' })
  @IsOptional()
  bio: string;

  @Column({ name: 'avatar_url', nullable: true })
  @IsUrl()
  @IsOptional()
  avatarUrl: string;

  @Column({ name: 'hourly_rate', type: 'decimal', precision: 10, scale: 2, default: 0 })
  @IsNumber()
  @Min(0)
  hourlyRate: number;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    name: 'identity_verified',
    default: VerificationStatus.UNVERIFIED
  })
  @IsEnum(VerificationStatus)
  identityVerified: VerificationStatus;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    name: 'skills_verified',
    default: VerificationStatus.UNVERIFIED
  })
  @IsEnum(VerificationStatus)
  skillsVerified: VerificationStatus;

  @Column({ name: 'is_top_rated', default: false })
  @IsBoolean()
  isTopRated: boolean;

  @Column({ nullable: true })
  @IsOptional()
  location: string;

  @Column({ nullable: true })
  @IsOptional()
  availability: string;

  @Column({ name: 'github_url', nullable: true })
  @IsUrl()
  @IsOptional()
  githubUrl: string;

  @Column({ name: 'linkedin_url', nullable: true })
  @IsUrl()
  @IsOptional()
  linkedinUrl: string;

  @Column({ name: 'kaggle_url', nullable: true })
  @IsUrl()
  @IsOptional()
  kaggleUrl: string;

  @Column({ nullable: true })
  @IsUrl()
  @IsOptional()
  website: string;

  @Column({ name: 'experience_years', default: 0 })
  @IsNumber()
  @Min(0)
  experienceYears: number;

  @Column('simple-array', { nullable: true })
  education: string[];

  @Column('simple-array', { nullable: true })
  certifications: string[];

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  @IsNumber()
  @Min(0)
  @Max(5)
  rating: number;

  @Column({ name: 'total_jobs', default: 0 })
  @IsNumber()
  @Min(0)
  totalJobs: number;

  @Column({ name: 'total_earnings', type: 'decimal', precision: 10, scale: 2, default: 0 })
  @IsNumber()
  @Min(0)
  totalEarnings: number;

  @OneToMany(() => SkillEntity, skill => skill.profile, { cascade: true, eager: true })
  skills: SkillEntity[];

  @OneToMany(() => PortfolioItemEntity, item => item.profile, { cascade: true, eager: true })
  portfolioItems: PortfolioItemEntity[];

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Creates a new Profile instance
   * @param profileData - Partial profile data to initialize with
   */
  constructor(profileData: Partial<Profile> = {}) {
    // Generate UUID if not provided
    this.id = profileData.id || v4();
    
    // Assign properties
    Object.assign(this, profileData);
    
    // Initialize arrays if not provided
    this.skills = profileData.skills || [];
    this.portfolioItems = profileData.portfolioItems || [];
    this.education = profileData.education || [];
    this.certifications = profileData.certifications || [];
    
    // Set defaults if not specified
    this.identityVerified = profileData.identityVerified || VerificationStatus.UNVERIFIED;
    this.skillsVerified = profileData.skillsVerified || VerificationStatus.UNVERIFIED;
    this.isTopRated = profileData.isTopRated || false;
    this.rating = profileData.rating || 0;
    this.totalJobs = profileData.totalJobs || 0;
    this.totalEarnings = profileData.totalEarnings || 0;
    this.experienceYears = profileData.experienceYears || 0;
  }

  /**
   * Validates the profile data before saving to database
   * @throws ValidationError if any validations fail
   */
  @BeforeInsert()
  @BeforeUpdate()
  validateBeforeSave(): void {
    // Validate hourlyRate is within allowed range
    if (this.hourlyRate < 0) {
      throw new ValidationError('Hourly rate cannot be negative');
    }

    // Validate URLs if provided
    if (this.githubUrl && !validateUrl(this.githubUrl)) {
      throw new ValidationError('Invalid GitHub URL');
    }

    if (this.linkedinUrl && !validateUrl(this.linkedinUrl)) {
      throw new ValidationError('Invalid LinkedIn URL');
    }

    if (this.kaggleUrl && !validateUrl(this.kaggleUrl)) {
      throw new ValidationError('Invalid Kaggle URL');
    }

    if (this.website && !validateUrl(this.website)) {
      throw new ValidationError('Invalid Website URL');
    }

    if (this.avatarUrl && !validateUrl(this.avatarUrl)) {
      throw new ValidationError('Invalid Avatar URL');
    }

    // Check that rating is between 0 and 5
    if (this.rating < 0 || this.rating > 5) {
      throw new ValidationError('Rating must be between 0 and 5');
    }

    // Ensure verification statuses are valid enum values
    if (!Object.values(VerificationStatus).includes(this.identityVerified)) {
      throw new ValidationError('Invalid identity verification status');
    }

    if (!Object.values(VerificationStatus).includes(this.skillsVerified)) {
      throw new ValidationError('Invalid skills verification status');
    }

    // Validate experienceYears is non-negative
    if (this.experienceYears < 0) {
      throw new ValidationError('Experience years cannot be negative');
    }
  }

  /**
   * Adds a new skill to the profile
   * @param skill - Skill entity to add
   */
  addSkill(skill: SkillEntity): void {
    // Ensure skills array exists
    if (!this.skills) {
      this.skills = [];
    }

    // Check if skill with same name already exists
    const existingSkillIndex = this.skills.findIndex(s => s.name === skill.name);
    
    // If exists, update existing skill
    if (existingSkillIndex >= 0) {
      this.skills[existingSkillIndex] = { 
        ...this.skills[existingSkillIndex], 
        ...skill, 
        id: this.skills[existingSkillIndex].id 
      };
    } else {
      // If doesn't exist, add new skill to skills array
      skill.profileId = this.id;
      this.skills.push(skill);
    }
  }

  /**
   * Removes a skill from the profile
   * @param skillId - ID of the skill to remove
   * @returns True if skill was removed, false if not found
   */
  removeSkill(skillId: string): boolean {
    // Find skill in skills array by ID
    const initialLength = this.skills.length;
    this.skills = this.skills.filter(skill => skill.id !== skillId);
    
    // Return true if skill was removed, false if not found
    return initialLength !== this.skills.length;
  }

  /**
   * Adds a new portfolio item to the profile
   * @param item - Portfolio item entity to add
   */
  addPortfolioItem(item: PortfolioItemEntity): void {
    // Ensure portfolioItems array exists
    if (!this.portfolioItems) {
      this.portfolioItems = [];
    }
    
    // Set item's profileId to this profile's id
    item.profileId = this.id;
    
    // Add item to portfolioItems array
    this.portfolioItems.push(item);
  }

  /**
   * Removes a portfolio item from the profile
   * @param itemId - ID of the portfolio item to remove
   * @returns True if item was removed, false if not found
   */
  removePortfolioItem(itemId: string): boolean {
    // Find portfolio item in portfolioItems array by ID
    const initialLength = this.portfolioItems.length;
    this.portfolioItems = this.portfolioItems.filter(item => item.id !== itemId);
    
    // Return true if item was removed, false if not found
    return initialLength !== this.portfolioItems.length;
  }

  /**
   * Updates the profile's rating based on job reviews
   * @param newRating - New rating value from a completed job
   */
  updateRating(newRating: number): void {
    // Validate newRating is between 0 and 5
    if (newRating < 0 || newRating > 5) {
      throw new ValidationError('Rating must be between 0 and 5');
    }
    
    // If this is the first rating, set it directly
    if (this.totalJobs === 0) {
      this.rating = newRating;
    } else {
      // Calculate weighted average with existing rating
      const totalRatingPoints = (this.rating * this.totalJobs) + newRating;
      this.rating = Number((totalRatingPoints / (this.totalJobs + 1)).toFixed(2));
    }
    
    // Check if profile now qualifies for top rated status
    this.isTopRated = this.checkTopRatedEligibility();
  }

  /**
   * Increments job count and adds earnings from a completed job
   * @param earnings - Amount earned from the completed job
   */
  addCompletedJob(earnings: number): void {
    // Increment totalJobs counter
    this.totalJobs += 1;
    
    // Add earnings to totalEarnings
    this.totalEarnings = Number((this.totalEarnings + earnings).toFixed(2));
    
    // Check if profile now qualifies for top rated status
    this.isTopRated = this.checkTopRatedEligibility();
  }

  /**
   * Checks if the profile meets criteria for top rated status
   * @returns Whether the profile qualifies for top rated status
   */
  checkTopRatedEligibility(): boolean {
    // Check minimum number of completed jobs (typically 10+)
    if (this.totalJobs < 10) {
      return false;
    }
    
    // Check minimum rating threshold (typically 4.5+)
    if (this.rating < 4.5) {
      return false;
    }
    
    // Check verification status requirements
    if (this.identityVerified !== VerificationStatus.VERIFIED) {
      return false;
    }
    
    // Return true if all criteria are met
    return true;
  }

  /**
   * Returns a sanitized profile object for API responses
   * @returns Sanitized profile object
   */
  toJSON(): object {
    // Create a copy of the profile object
    const profile = { ...this };
    
    // Format date fields to ISO strings
    if (profile.createdAt) profile.createdAt = profile.createdAt.toISOString();
    if (profile.updatedAt) profile.updatedAt = profile.updatedAt.toISOString();
    
    // Include skill details
    if (profile.skills) {
      profile.skills = profile.skills.map(skill => 
        typeof skill.toJSON === 'function' ? skill.toJSON() : skill
      );
    }
    
    // Include portfolio item summaries
    if (profile.portfolioItems) {
      profile.portfolioItems = profile.portfolioItems.map(item => 
        typeof item.toJSON === 'function' ? item.toJSON() : item
      );
    }
    
    return profile;
  }
}

/**
 * Entity representing an AI/ML skill with proficiency level and verification status
 */
@Entity('skills')
export class SkillEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'profile_id' })
  @Index()
  profileId: string;

  @Column()
  @IsNotEmpty()
  name: string;

  @Column()
  category: string;

  @Column({ type: 'int', default: 1 })
  @IsNumber()
  @Min(1)
  @Max(5)
  level: number;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.UNVERIFIED
  })
  @IsEnum(VerificationStatus)
  verified: VerificationStatus;

  @Column({ name: 'years_of_experience', default: 0 })
  @IsNumber()
  @Min(0)
  yearsOfExperience: number;

  @ManyToOne(() => Profile, profile => profile.skills)
  @JoinColumn({ name: 'profile_id' })
  profile: Profile;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Creates a new Skill instance
   * @param skillData - Partial skill data to initialize with
   */
  constructor(skillData: Partial<SkillInterface> = {}) {
    // Generate UUID if not provided
    this.id = skillData.id || v4();
    
    // Assign skill data to instance properties
    Object.assign(this, skillData);
    
    // Set defaults if not specified
    this.verified = skillData.verified || VerificationStatus.UNVERIFIED;
    this.level = skillData.level || 1;
    this.yearsOfExperience = skillData.yearsOfExperience || 0;
  }

  /**
   * Validates the skill data before saving to database
   * @throws ValidationError if any validations fail
   */
  @BeforeInsert()
  @BeforeUpdate()
  validateBeforeSave(): void {
    // Validate name is not empty
    if (!this.name || this.name.trim().length === 0) {
      throw new ValidationError('Skill name is required');
    }
    
    // Validate level is between 1 and 5
    if (this.level < 1 || this.level > 5) {
      throw new ValidationError('Skill level must be between 1 and 5');
    }
    
    // Validate yearsOfExperience is non-negative
    if (this.yearsOfExperience < 0) {
      throw new ValidationError('Years of experience cannot be negative');
    }
    
    // Ensure verified status is a valid enum value
    if (!Object.values(VerificationStatus).includes(this.verified)) {
      throw new ValidationError('Invalid verification status');
    }
  }

  /**
   * Returns a sanitized skill object for API responses
   * @returns Sanitized skill object
   */
  toJSON(): object {
    // Create a copy of the skill object
    const skill = { ...this };
    
    // Format date fields to ISO strings
    if (skill.createdAt) skill.createdAt = skill.createdAt.toISOString();
    if (skill.updatedAt) skill.updatedAt = skill.updatedAt.toISOString();
    
    // Remove circular reference to profile
    delete skill.profile;
    
    return skill;
  }
}

/**
 * Entity representing an AI project or work sample in a professional's portfolio
 */
@Entity('portfolio_items')
export class PortfolioItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'profile_id' })
  @Index()
  profileId: string;

  @Column()
  @IsNotEmpty()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'image_url', nullable: true })
  @IsUrl()
  @IsOptional()
  imageUrl: string;

  @Column({ name: 'project_url', nullable: true })
  @IsUrl()
  @IsOptional()
  projectUrl: string;

  @Column({ name: 'github_url', nullable: true })
  @IsUrl()
  @IsOptional()
  githubUrl: string;

  @Column({ name: 'kaggle_url', nullable: true })
  @IsUrl()
  @IsOptional()
  kaggleUrl: string;

  @Column('simple-array', { nullable: true })
  technologies: string[];

  @Column({ nullable: true })
  category: string;

  @Column('simple-array', { name: 'ai_models', nullable: true })
  aiModels: string[];

  @Column({ name: 'problem_solved', type: 'text', nullable: true })
  problemSolved: string;

  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  @IsDate()
  @IsOptional()
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  @IsDate()
  @IsOptional()
  endDate: Date;

  @ManyToOne(() => Profile, profile => profile.portfolioItems)
  @JoinColumn({ name: 'profile_id' })
  profile: Profile;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Creates a new PortfolioItem instance
   * @param itemData - Partial portfolio item data to initialize with
   */
  constructor(itemData: Partial<PortfolioItemInterface> = {}) {
    // Generate UUID if not provided
    this.id = itemData.id || v4();
    
    // Assign item data to instance properties
    Object.assign(this, itemData);
    
    // Initialize arrays if not provided
    this.technologies = itemData.technologies || [];
    this.aiModels = itemData.aiModels || [];
  }

  /**
   * Validates the portfolio item data before saving to database
   * @throws ValidationError if any validations fail
   */
  @BeforeInsert()
  @BeforeUpdate()
  validateBeforeSave(): void {
    // Validate title is not empty
    if (!this.title || this.title.trim().length === 0) {
      throw new ValidationError('Portfolio item title is required');
    }
    
    // Validate URLs if provided
    if (this.projectUrl && !validateUrl(this.projectUrl)) {
      throw new ValidationError('Invalid project URL');
    }
    
    if (this.githubUrl && !validateUrl(this.githubUrl)) {
      throw new ValidationError('Invalid GitHub URL');
    }
    
    if (this.kaggleUrl && !validateUrl(this.kaggleUrl)) {
      throw new ValidationError('Invalid Kaggle URL');
    }
    
    if (this.imageUrl && !validateUrl(this.imageUrl)) {
      throw new ValidationError('Invalid image URL');
    }
    
    // Ensure dates are valid and startDate is before endDate if both provided
    if (this.startDate && this.endDate && this.startDate > this.endDate) {
      throw new ValidationError('Start date must be before end date');
    }
  }

  /**
   * Returns a sanitized portfolio item object for API responses
   * @returns Sanitized portfolio item object
   */
  toJSON(): object {
    // Create a copy of the portfolio item object
    const item = { ...this };
    
    // Format date fields to ISO strings
    if (item.startDate) item.startDate = item.startDate.toISOString();
    if (item.endDate) item.endDate = item.endDate.toISOString();
    if (item.createdAt) item.createdAt = item.createdAt.toISOString();
    if (item.updatedAt) item.updatedAt = item.updatedAt.toISOString();
    
    // Remove circular reference to profile
    delete item.profile;
    
    return item;
  }
}

/**
 * Entity representing a company profile for clients posting AI jobs
 */
@Entity('company_profiles')
export class CompanyProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column()
  @IsNotEmpty()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'logo_url', nullable: true })
  @IsUrl()
  @IsOptional()
  logoUrl: string;

  @Column({ nullable: true })
  @IsUrl()
  @IsOptional()
  website: string;

  @Column({ nullable: true })
  industry: string;

  @Column({ nullable: true })
  size: string;

  @Column({ nullable: true })
  location: string;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.UNVERIFIED
  })
  @IsEnum(VerificationStatus)
  verified: VerificationStatus;

  @Column('simple-array', { name: 'ai_interests', nullable: true })
  aiInterests: string[];

  @Column('simple-array', { name: 'previous_ai_projects', nullable: true })
  previousAiProjects: string[];

  @Column({ name: 'founded_date', type: 'timestamp', nullable: true })
  @IsDate()
  @IsOptional()
  foundedDate: Date;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Creates a new CompanyProfile instance
   * @param companyData - Partial company profile data to initialize with
   */
  constructor(companyData: Partial<CompanyProfile> = {}) {
    // Generate UUID if not provided
    this.id = companyData.id || v4();
    
    // Assign company data to instance properties
    Object.assign(this, companyData);
    
    // Initialize arrays if not provided
    this.aiInterests = companyData.aiInterests || [];
    this.previousAiProjects = companyData.previousAiProjects || [];
    
    // Set default verified status to UNVERIFIED if not specified
    this.verified = companyData.verified || VerificationStatus.UNVERIFIED;
  }

  /**
   * Validates the company profile data before saving to database
   * @throws ValidationError if any validations fail
   */
  @BeforeInsert()
  @BeforeUpdate()
  validateBeforeSave(): void {
    // Validate name is not empty
    if (!this.name || this.name.trim().length === 0) {
      throw new ValidationError('Company name is required');
    }
    
    // Validate website URL if provided
    if (this.website && !validateUrl(this.website)) {
      throw new ValidationError('Invalid website URL');
    }
    
    if (this.logoUrl && !validateUrl(this.logoUrl)) {
      throw new ValidationError('Invalid logo URL');
    }
    
    // Ensure verified status is a valid enum value
    if (!Object.values(VerificationStatus).includes(this.verified)) {
      throw new ValidationError('Invalid verification status');
    }
  }

  /**
   * Returns a sanitized company profile object for API responses
   * @returns Sanitized company profile object
   */
  toJSON(): object {
    // Create a copy of the company profile object
    const company = { ...this };
    
    // Format date fields to ISO strings
    if (company.foundedDate) company.foundedDate = company.foundedDate.toISOString();
    if (company.createdAt) company.createdAt = company.createdAt.toISOString();
    if (company.updatedAt) company.updatedAt = company.updatedAt.toISOString();
    
    return company;
  }
}