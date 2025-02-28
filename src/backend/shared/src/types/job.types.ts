/**
 * TypeScript type definitions for job-related entities in the AI Talent Marketplace platform.
 * This file defines enumerations, interfaces, and types representing jobs, proposals, and
 * milestones that are shared across backend services.
 */

import { User } from './user.types';

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
  posterCompanyId: string;
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
  requiredSkills: Array<{ id: string; name: string; category: string; level: number }>;
  preferredSkills: Array<{ id: string; name: string; category: string; level: number }>;
  attachments: string[];
  category: string;
  subcategory: string;
  expiresAt: Date;
  startDate: Date;
  endDate: Date;
  contractId: string;
  freelancerId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface representing a proposal from a freelancer for a specific job
 */
export interface Proposal {
  id: string;
  jobId: string;
  freelancerId: string;
  coverLetter: string;
  proposedRate: number;
  proposedBudget: number;
  estimatedDuration: number;
  estimatedHours: number;
  attachments: string[];
  status: ProposalStatus;
  relevanceScore: number;
  rejectionReason: string;
  expiresAt: Date;
  milestones: ProposalMilestone[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data Transfer Object for creating a new job
 */
export interface JobCreateDTO {
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
  requiredSkills: Array<{ id: string; name: string; category: string; level: number }>;
  preferredSkills: Array<{ id: string; name: string; category: string; level: number }>;
  attachments: string[];
  category: string;
  subcategory: string;
  expiresAt: Date;
  startDate: Date;
  endDate: Date;
}

/**
 * Data Transfer Object for updating an existing job
 */
export interface JobUpdateDTO {
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
  requiredSkills: Array<{ id: string; name: string; category: string; level: number }>;
  preferredSkills: Array<{ id: string; name: string; category: string; level: number }>;
  attachments: string[];
  status: JobStatus;
  category: string;
  subcategory: string;
  expiresAt: Date;
  startDate: Date;
  endDate: Date;
}

/**
 * Data Transfer Object for creating a new proposal milestone
 */
export interface ProposalMilestoneCreateDTO {
  title: string;
  description: string;
  amount: number;
  dueDate: Date;
  order: number;
}

/**
 * Data Transfer Object for creating a new proposal
 */
export interface ProposalCreateDTO {
  jobId: string;
  coverLetter: string;
  proposedRate: number;
  proposedBudget: number;
  estimatedDuration: number;
  estimatedHours: number;
  attachments: string[];
  milestones: ProposalMilestoneCreateDTO[];
}

/**
 * Data Transfer Object for updating an existing proposal
 */
export interface ProposalUpdateDTO {
  coverLetter: string;
  proposedRate: number;
  proposedBudget: number;
  estimatedDuration: number;
  estimatedHours: number;
  attachments: string[];
  milestones: ProposalMilestoneCreateDTO[];
}

/**
 * Data Transfer Object for updating a proposal's status
 */
export interface ProposalStatusUpdateDTO {
  status: ProposalStatus;
  reason: string;
}

/**
 * Data Transfer Object for updating a job's status
 */
export interface JobStatusUpdateDTO {
  status: JobStatus;
  reason: string;
}

/**
 * Data Transfer Object for assigning a freelancer to a job
 */
export interface JobAssignmentDTO {
  freelancerId: string;
  contractId: string;
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
  createdAt: Date;
}