/**
 * TypeScript type definitions for user profiles in the AI Talent Marketplace
 * Includes interfaces for freelancer and company profiles, portfolio items,
 * education, certifications, and form submission values
 */

import { UserRole, Skill, VerificationStatus } from '../../../backend/shared/src/types/user.types';

/**
 * Enumeration to distinguish between freelancer and company profiles
 */
export enum ProfileType {
  FREELANCER = 'freelancer',
  COMPANY = 'company'
}

/**
 * Enumeration of freelancer availability statuses
 */
export enum AvailabilityStatus {
  AVAILABLE = 'available',
  PARTIALLY_AVAILABLE = 'partially_available',
  UNAVAILABLE = 'unavailable',
  AVAILABLE_SOON = 'available_soon'
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
  portfolio: PortfolioItem[];
  education: Education[];
  experience: Experience[];
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
  totalJobs: number;
  totalEarnings: number;
  createdAt: string;
  updatedAt: string;
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
  foundedDate: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
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
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface representing a work experience entry in a freelancer's profile
 */
export interface Experience {
  id: string;
  profileId: string;
  title: string;
  company: string;
  location: string;
  description: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  aiTechnologies: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface representing an education entry in a freelancer's profile
 */
export interface Education {
  id: string;
  profileId: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface representing a certification in a freelancer's profile
 */
export interface Certification {
  id: string;
  profileId: string;
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expirationDate: string;
  credentialId: string;
  credentialUrl: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface for form values when updating a freelancer profile
 */
export interface ProfileFormValues {
  title: string;
  bio: string;
  hourlyRate: number;
  location: string;
  availability: AvailabilityStatus;
  githubUrl: string;
  linkedinUrl: string;
  kaggleUrl: string;
  website: string;
  skills: Partial<Skill>[];
}

/**
 * Interface for form values when updating a company profile
 */
export interface CompanyFormValues {
  name: string;
  description: string;
  website: string;
  industry: string;
  size: string;
  location: string;
  aiInterests: string[];
  foundedDate: string;
}

/**
 * Interface for form values when creating or updating a portfolio item
 */
export interface PortfolioItemFormValues {
  title: string;
  description: string;
  projectUrl: string;
  githubUrl: string;
  kaggleUrl: string;
  technologies: string[];
  category: string;
  aiModels: string[];
  problemSolved: string;
  startDate: string;
  endDate: string;
}

/**
 * Interface for form values when creating or updating a work experience entry
 */
export interface ExperienceFormValues {
  title: string;
  company: string;
  location: string;
  description: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  aiTechnologies: string[];
}

/**
 * Interface for form values when creating or updating an education entry
 */
export interface EducationFormValues {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
}

/**
 * Interface for form values when creating or updating a certification
 */
export interface CertificationFormValues {
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expirationDate: string;
  credentialId: string;
  credentialUrl: string;
}

/**
 * Interface for the profile state in Redux store
 */
export interface ProfileState {
  freelancerProfile: FreelancerProfile | null;
  companyProfile: CompanyProfile | null;
  viewedProfile: FreelancerProfile | CompanyProfile | null;
  loading: boolean;
  error: string | null;
}

/**
 * Interface for the profile context that provides profile management functionality to React components
 */
export interface ProfileContextType {
  profileState: ProfileState;
  getFreelancerProfile: (id?: string) => Promise<FreelancerProfile>;
  getCompanyProfile: (id?: string) => Promise<CompanyProfile>;
  updateFreelancerProfile: (data: ProfileFormValues) => Promise<FreelancerProfile>;
  updateCompanyProfile: (data: CompanyFormValues) => Promise<CompanyProfile>;
  addPortfolioItem: (data: PortfolioItemFormValues) => Promise<PortfolioItem>;
  updatePortfolioItem: (id: string, data: PortfolioItemFormValues) => Promise<PortfolioItem>;
  deletePortfolioItem: (id: string) => Promise<void>;
  addExperience: (data: ExperienceFormValues) => Promise<Experience>;
  updateExperience: (id: string, data: ExperienceFormValues) => Promise<Experience>;
  deleteExperience: (id: string) => Promise<void>;
  addEducation: (data: EducationFormValues) => Promise<Education>;
  updateEducation: (id: string, data: EducationFormValues) => Promise<Education>;
  deleteEducation: (id: string) => Promise<void>;
  addCertification: (data: CertificationFormValues) => Promise<Certification>;
  updateCertification: (id: string, data: CertificationFormValues) => Promise<Certification>;
  deleteCertification: (id: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}