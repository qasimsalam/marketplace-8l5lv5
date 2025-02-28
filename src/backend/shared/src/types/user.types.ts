/**
 * User-related type definitions for the AI Talent Marketplace
 * This file defines types, interfaces, and enumerations for users, profiles,
 * skills, and portfolio items that are shared across backend services.
 */

/**
 * Enumeration of user roles for role-based access control
 */
export enum UserRole {
  ADMIN = 'admin',
  EMPLOYER = 'employer',
  FREELANCER = 'freelancer',
  GUEST = 'guest'
}

/**
 * Enumeration of possible user account statuses
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification'
}

/**
 * Enumeration of verification statuses for identity and skills verification
 */
export enum VerificationStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected'
}

/**
 * Enumeration of supported authentication providers for OAuth integration
 */
export enum AuthProvider {
  LOCAL = 'local',
  GITHUB = 'github',
  LINKEDIN = 'linkedin',
  GOOGLE = 'google'
}

/**
 * Interface representing a user in the AI Talent Marketplace
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  authProvider: AuthProvider;
  authProviderId: string;
  twoFactorEnabled: boolean;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface representing an AI/ML skill with proficiency level and verification status
 */
export interface Skill {
  id: string;
  name: string;
  category: string;
  level: number; // 1-10 scale of proficiency
  verified: VerificationStatus;
  yearsOfExperience: number;
}

/**
 * Interface representing an AI project or work sample in a professional's portfolio
 */
export interface PortfolioItem {
  id: string;
  profileId: string;
  title: string;
  description: string;
  imageUrl: string;
  projectUrl: string;
  githubUrl: string;
  kaggleUrl: string;
  technologies: string[];
  category: string;
  aiModels: string[];
  problemSolved: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface representing an AI professional's profile with skills, portfolio, and verification status
 */
export interface Profile {
  id: string;
  userId: string;
  title: string;
  bio: string;
  avatarUrl: string;
  hourlyRate: number;
  skills: Skill[];
  portfolioItems: PortfolioItem[];
  identityVerified: VerificationStatus;
  skillsVerified: VerificationStatus;
  isTopRated: boolean;
  location: string;
  availability: string;
  githubUrl: string;
  linkedinUrl: string;
  kaggleUrl: string;
  website: string;
  experienceYears: number;
  education: string[];
  certifications: string[];
  rating: number;
  totalJobs: number;
  totalEarnings: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface representing a company profile for clients posting AI jobs
 */
export interface Company {
  id: string;
  userId: string;
  name: string;
  description: string;
  logoUrl: string;
  website: string;
  industry: string;
  size: string;
  location: string;
  verified: VerificationStatus;
  aiInterests: string[];
  previousAiProjects: string[];
  foundedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data Transfer Object for creating a new user
 */
export interface UserCreateDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

/**
 * Data Transfer Object for updating user information
 */
export interface UserUpdateDTO {
  firstName: string;
  lastName: string;
  email: string;
  status: UserStatus;
}

/**
 * Data Transfer Object for creating a new profile
 */
export interface ProfileCreateDTO {
  title: string;
  bio: string;
  hourlyRate: number;
  location: string;
  availability: string;
  skills: Partial<Skill>[];
  githubUrl: string;
  linkedinUrl: string;
  website: string;
}

/**
 * Data Transfer Object for creating a new company profile
 */
export interface CompanyCreateDTO {
  name: string;
  description: string;
  website: string;
  industry: string;
  size: string;
  location: string;
  aiInterests: string[];
}

/**
 * Data Transfer Object for creating a new portfolio item
 */
export interface PortfolioItemCreateDTO {
  title: string;
  description: string;
  projectUrl: string;
  githubUrl: string;
  kaggleUrl: string;
  technologies: string[];
  category: string;
  aiModels: string[];
  problemSolved: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Interface defining parameters for user search and filtering
 */
export interface UserSearchParams {
  query: string;
  role: UserRole;
  status: UserStatus;
  skills: string[];
  minHourlyRate: number;
  maxHourlyRate: number;
  location: string;
  availability: string;
  isVerified: boolean;
  isTopRated: boolean;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: string;
}