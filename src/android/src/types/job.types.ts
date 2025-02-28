/**
 * TypeScript type definitions for job-related entities in the AI Talent Marketplace Android mobile application.
 * This file defines enumerations, interfaces, and types representing jobs, proposals, milestones,
 * and job search functionality optimized for mobile interfaces.
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
  estimatedDuration: number;
  estimatedHours: number;
  difficulty: JobDifficulty;
  location: string;
  isRemote: boolean;
  requiredSkills: Skill[];
  preferredSkills: Skill[];
  attachments: string[];
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
  estimatedDuration: number;
  estimatedHours: number;
  attachments: string[];
  status: ProposalStatus;
  relevanceScore: number;
  rejectionReason: string;
  milestones: ProposalMilestone[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for job creation and editing form values with Android-specific file handling
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
  requiredSkills: string[];
  preferredSkills: string[];
  attachments: { uri: string; name: string; type: string }[];
  category: string;
  subcategory: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Interface for proposal submission form values with Android-specific file handling
 */
export interface ProposalFormValues {
  jobId: string;
  coverLetter: string;
  proposedRate: number;
  proposedBudget: number;
  estimatedDuration: number;
  estimatedHours: number;
  attachments: { uri: string; name: string; type: string }[];
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
  skills: string[];
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
 * Interface defining the jobs state in Redux store with Android-specific refreshing state
 */
export interface JobsState {
  jobs: Job[];
  currentJob: Job | null;
  loading: boolean;
  refreshing: boolean; // Android pull-to-refresh state
  error: string | null;
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

/**
 * Interface for filtering options specific to Android app UI components
 */
export interface JobFilterOptions {
  jobTypes: JobType[];
  jobStatuses: JobStatus[];
  difficultyLevels: JobDifficulty[];
  categories: string[];
  skills: string[];
  minBudget: number;
  maxBudget: number;
  isRemote: boolean;
  location: string;
}

/**
 * Optimized subset of job data for displaying in Android RecyclerView list items
 */
export interface JobListItemData {
  id: string;
  title: string;
  posterName: string;
  posterAvatarUrl: string;
  budget: number;
  minBudget: number;
  maxBudget: number;
  hourlyRate: number;
  type: JobType;
  status: JobStatus;
  isRemote: boolean;
  proposalCount: number;
  requiredSkills: Skill[];
  createdAt: Date;
}

/**
 * Interface representing the result of AI-powered job matching between a job and freelancer
 */
export interface JobMatchingResult {
  jobId: string;
  freelancerId: string;
  matchScore: number;
  skillMatch: number;
  experienceMatch: number;
  rateMatch: number;
  availabilityMatch: number;
}

/**
 * Interface for the jobs context used with React Context API in the Android app
 */
export interface JobContextType {
  jobsState: JobsState;
  getJobs: (params?: JobSearchParams) => Promise<Job[]>;
  getJob: (id: string) => Promise<Job>;
  refreshJobs: (params?: JobSearchParams) => Promise<void>;
  createJob: (jobData: JobFormValues) => Promise<Job>;
  updateJob: (id: string, jobData: Partial<JobFormValues>) => Promise<Job>;
  deleteJob: (id: string) => Promise<boolean>;
  submitProposal: (proposal: ProposalFormValues) => Promise<Proposal>;
  getRecommendedJobs: () => Promise<Job[]>;
  resetError: () => void;
  clearCurrentJob: () => void;
  applyFilters: (filterOptions: JobFilterOptions) => Promise<void>;
}