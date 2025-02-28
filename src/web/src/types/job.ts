/**
 * TypeScript type definitions for job-related entities in the AI Talent Marketplace web application.
 * This file defines types, interfaces, and constants for job listings, proposals, job searching, and
 * related frontend functionality.
 */

import { UserRole, Skill } from '../../../backend/shared/src/types/user.types';

/**
 * Enumeration of possible job payment types
 */
export enum JobType {
  FIXED_PRICE = 'fixed_price',
  HOURLY = 'hourly',
  MILESTONE_BASED = 'milestone_based'
}

/**
 * Enumeration of possible job statuses throughout its lifecycle
 */
export enum JobStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold'
}

/**
 * Enumeration of possible proposal statuses for tracking proposal workflow
 */
export enum ProposalStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn'
}

/**
 * Enumeration of possible job difficulty levels for AI projects
 */
export enum JobDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

/**
 * Interface representing a job posting in the AI Talent Marketplace
 */
export interface Job {
  id: string;
  title: string;
  description: string;
  posterId: string;
  posterName: string;
  posterCompanyId: string;
  posterCompanyName: string;
  posterAvatarUrl: string;
  type: JobType;
  status: JobStatus;
  budget: number;
  minBudget: number;
  maxBudget: number;
  hourlyRate: number;
  estimatedDuration: number; // in days
  estimatedHours: number;
  difficulty: JobDifficulty;
  location: string;
  isRemote: boolean;
  requiredSkills: Skill[];
  preferredSkills: Skill[];
  attachments: string[]; // URLs to attached files
  category: string;
  subcategory: string;
  proposals: Proposal[];
  proposalCount: number;
  expiresAt: Date;
  startDate: Date;
  endDate: Date;
  contractId: string;
  freelancerId: string;
  freelancerName: string;
  freelancerAvatarUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface defining a milestone within a proposal
 */
export interface ProposalMilestone {
  id: string;
  proposalId: string;
  title: string;
  description: string;
  amount: number;
  dueDate: Date;
  order: number;
}

/**
 * Interface representing a proposal from a freelancer for a specific job
 */
export interface Proposal {
  id: string;
  jobId: string;
  jobTitle: string;
  freelancerId: string;
  freelancerName: string;
  freelancerAvatarUrl: string;
  coverLetter: string;
  proposedRate: number;
  proposedBudget: number;
  estimatedDuration: number; // in days
  estimatedHours: number;
  attachments: string[]; // URLs to attached files
  status: ProposalStatus;
  relevanceScore: number; // AI-calculated match score
  rejectionReason: string;
  milestones: ProposalMilestone[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for job creation and editing form values
 */
export interface JobFormValues {
  title: string;
  description: string;
  type: JobType;
  budget: number;
  minBudget: number;
  maxBudget: number;
  hourlyRate: number;
  estimatedDuration: number;
  estimatedHours: number;
  difficulty: JobDifficulty;
  location: string;
  isRemote: boolean;
  requiredSkills: string[]; // Skill IDs
  preferredSkills: string[]; // Skill IDs
  attachments: File[];
  category: string;
  subcategory: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Interface for proposal submission form values
 */
export interface ProposalFormValues {
  jobId: string;
  coverLetter: string;
  proposedRate: number;
  proposedBudget: number;
  estimatedDuration: number;
  estimatedHours: number;
  attachments: File[];
  milestones: ProposalMilestoneFormValues[];
}

/**
 * Interface for proposal milestone form values
 */
export interface ProposalMilestoneFormValues {
  title: string;
  description: string;
  amount: number;
  dueDate: Date;
  order: number;
}

/**
 * Interface defining parameters for job search and filtering
 */
export interface JobSearchParams {
  query: string;
  type: JobType;
  status: JobStatus;
  minBudget: number;
  maxBudget: number;
  skills: string[]; // Skill IDs
  difficulty: JobDifficulty;
  isRemote: boolean;
  location: string;
  posterId: string;
  category: string;
  subcategory: string;
  createdAfter: Date;
  createdBefore: Date;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: string;
}

/**
 * Interface defining the jobs state in Redux store
 */
export interface JobsState {
  jobs: Job[];
  currentJob: Job | null;
  recommendedJobs: Job[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

/**
 * Interface representing the result of AI-powered job matching between a job and freelancer
 */
export interface JobMatchingResult {
  jobId: string;
  freelancerId: string;
  matchScore: number; // Overall match percentage
  skillMatch: number; // Percentage match on skills
  experienceMatch: number; // Match based on experience level
  rateMatch: number; // Match based on rate/budget expectations
  availabilityMatch: number; // Match based on availability and timeline
}