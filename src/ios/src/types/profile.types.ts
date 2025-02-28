/**
 * TypeScript type definitions for profile-related entities in the AI Talent Marketplace iOS mobile application.
 * This file defines interfaces, enumerations, and types related to user profiles, portfolio items,
 * experience, education, certifications, and profile management.
 */

import { UserRole, Skill, VerificationStatus } from '../../../backend/shared/src/types/user.types';

/**
 * Enumeration of profile types to differentiate between freelancers and companies
 */
export enum ProfileType {
  FREELANCER = 'freelancer',
  COMPANY = 'company'
}

/**
 * Enumeration of freelancer availability statuses for job matching
 */
export enum AvailabilityStatus {
  AVAILABLE = 'available',
  PARTIALLY_AVAILABLE = 'partially_available',
  UNAVAILABLE = 'unavailable',
  AVAILABLE_SOON = 'available_soon'
}

/**
 * Enumeration of portfolio item types for AI professionals
 */
export enum PortfolioItemType {
  PROJECT = 'project',
  PUBLICATION = 'publication',
  GITHUB_REPO = 'github_repo',
  KAGGLE_NOTEBOOK = 'kaggle_notebook',
  DEPLOYED_MODEL = 'deployed_model',
  OTHER = 'other'
}

/**
 * Enumeration of work experience types for AI professionals
 */
export enum ExperienceType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  FREELANCE = 'freelance',
  INTERNSHIP = 'internship',
  RESEARCH = 'research'
}

/**
 * Enumeration of education degree types
 */
export enum EducationDegree {
  BACHELORS = 'bachelors',
  MASTERS = 'masters',
  PHD = 'phd',
  ASSOCIATE = 'associate',
  CERTIFICATE = 'certificate',
  OTHER = 'other'
}

/**
 * Interface representing an AI professional's profile with skills, portfolio, and verification status
 */
export interface FreelancerProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  title: string;
  bio: string;
  avatarUrl: string;
  hourlyRate: number;
  skills: Skill[];
  portfolioItems: PortfolioItem[];
  experiences: Experience[];
  educations: Education[];
  certifications: Certification[];
  identityVerified: VerificationStatus;
  skillsVerified: VerificationStatus;
  isTopRated: boolean;
  location: string;
  availability: AvailabilityStatus;
  githubUrl: string;
  linkedinUrl: string;
  kaggleUrl: string;
  website: string;
  experienceYears: number;
  rating: number;
  completedJobs: number;
  totalEarnings: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface representing a company profile for clients posting AI jobs
 */
export interface CompanyProfile {
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
  rating: number;
  createdAt: Date;
  updatedAt: Date;
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
  type: PortfolioItemType;
  aiModels: string[];
  problemSolved: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface representing a professional experience entry in a freelancer's profile
 */
export interface Experience {
  id: string;
  profileId: string;
  company: string;
  title: string;
  location: string;
  type: ExperienceType;
  isRemote: boolean;
  description: string;
  technologies: string[];
  aiModels: string[];
  startDate: Date;
  endDate: Date | null;
  isCurrentPosition: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface representing an education entry in a freelancer's profile
 */
export interface Education {
  id: string;
  profileId: string;
  institution: string;
  degree: EducationDegree;
  fieldOfStudy: string;
  location: string;
  grade: string;
  description: string;
  startDate: Date;
  endDate: Date | null;
  isCurrentlyStudying: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface representing a certification entry in a freelancer's profile
 */
export interface Certification {
  id: string;
  profileId: string;
  name: string;
  issuingOrganization: string;
  credentialId: string;
  credentialUrl: string;
  issueDate: Date;
  expirationDate: Date | null;
  doesNotExpire: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for freelancer profile form input values with mobile file handling
 */
export interface ProfileFormValues {
  title: string;
  bio: string;
  hourlyRate: number;
  skills: string[];
  location: string;
  availability: AvailabilityStatus;
  githubUrl: string;
  linkedinUrl: string;
  kaggleUrl: string;
  website: string;
  experienceYears: number;
  avatar: { uri: string; type: string; name: string };
}

/**
 * Interface for company profile form input values with mobile file handling
 */
export interface CompanyFormValues {
  name: string;
  description: string;
  website: string;
  industry: string;
  size: string;
  location: string;
  aiInterests: string[];
  previousAiProjects: string[];
  foundedDate: Date;
  logo: { uri: string; type: string; name: string };
}

/**
 * Interface for portfolio item form values with mobile file handling
 */
export interface PortfolioItemFormValues {
  title: string;
  description: string;
  projectUrl: string;
  githubUrl: string;
  kaggleUrl: string;
  technologies: string[];
  category: string;
  type: PortfolioItemType;
  aiModels: string[];
  problemSolved: string;
  startDate: Date;
  endDate: Date;
  image: { uri: string; type: string; name: string };
}

/**
 * Interface for experience entry form values
 */
export interface ExperienceFormValues {
  company: string;
  title: string;
  location: string;
  type: ExperienceType;
  isRemote: boolean;
  description: string;
  technologies: string[];
  aiModels: string[];
  startDate: Date;
  endDate: Date | null;
  isCurrentPosition: boolean;
}

/**
 * Interface for education entry form values
 */
export interface EducationFormValues {
  institution: string;
  degree: EducationDegree;
  fieldOfStudy: string;
  location: string;
  grade: string;
  description: string;
  startDate: Date;
  endDate: Date | null;
  isCurrentlyStudying: boolean;
}

/**
 * Interface for certification entry form values
 */
export interface CertificationFormValues {
  name: string;
  issuingOrganization: string;
  credentialId: string;
  credentialUrl: string;
  issueDate: Date;
  expirationDate: Date | null;
  doesNotExpire: boolean;
}

/**
 * Interface defining the profile state in Redux store and hooks with mobile-specific refreshing state
 */
export interface ProfileState {
  freelancerProfile: FreelancerProfile | null;
  companyProfile: CompanyProfile | null;
  viewedProfile: FreelancerProfile | CompanyProfile | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

/**
 * Interface for the profile context used with React Context API in the mobile app
 */
export interface ProfileContextType {
  profileState: ProfileState;
  getFreelancerProfile: (id?: string) => Promise<FreelancerProfile>;
  getCompanyProfile: (id?: string) => Promise<CompanyProfile>;
  refreshProfile: () => Promise<void>;
  updateFreelancerProfile: (data: ProfileFormValues) => Promise<FreelancerProfile>;
  updateCompanyProfile: (data: CompanyFormValues) => Promise<CompanyProfile>;
  uploadProfileImage: (file: { uri: string; type: string; name: string }) => Promise<string>;
  addPortfolioItem: (data: PortfolioItemFormValues) => Promise<PortfolioItem>;
  updatePortfolioItem: (id: string, data: PortfolioItemFormValues) => Promise<PortfolioItem>;
  deletePortfolioItem: (id: string) => Promise<boolean>;
  addExperience: (data: ExperienceFormValues) => Promise<Experience>;
  updateExperience: (id: string, data: ExperienceFormValues) => Promise<Experience>;
  deleteExperience: (id: string) => Promise<boolean>;
  addEducation: (data: EducationFormValues) => Promise<Education>;
  updateEducation: (id: string, data: EducationFormValues) => Promise<Education>;
  deleteEducation: (id: string) => Promise<boolean>;
  addCertification: (data: CertificationFormValues) => Promise<Certification>;
  updateCertification: (id: string, data: CertificationFormValues) => Promise<Certification>;
  deleteCertification: (id: string) => Promise<boolean>;
}