import { useState, useEffect, useCallback, useMemo } from 'react'; // ^18.2.0
import { useSelector, useDispatch } from 'react-redux'; // ^8.0.5
import { RootState, AppDispatch } from '../store';
import {
  fetchJobs,
  fetchJobById,
  createJob as createJobAction,
  updateJob as updateJobAction,
  deleteJob as deleteJobAction,
  submitProposal as submitProposalAction,
  refreshJobs as refreshJobsAction,
  getRecommendedJobs as getRecommendedJobsAction,
  setError,
  clearError,
  clearCurrentJob as clearCurrentJobAction
} from '../store/slices/jobsSlice';
import {
  Job,
  JobFormValues,
  Proposal,
  ProposalFormValues,
  JobSearchParams
} from '../types/job.types';
import useAuth from './useAuth';
import { Permission } from '../types/auth.types';

/**
 * Interface defining the return value of the useJobs hook
 */
export interface UseJobsResult {
  // State
  jobs: Job[];
  currentJob: Job | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  
  // Methods
  getJobs: (params?: JobSearchParams) => Promise<Job[]>;
  getJob: (id: string) => Promise<Job>;
  createJob: (jobData: JobFormValues) => Promise<Job>;
  updateJob: (id: string, jobData: Partial<JobFormValues>) => Promise<Job>;
  deleteJob: (id: string) => Promise<boolean>;
  submitProposal: (proposalData: ProposalFormValues) => Promise<Proposal>;
  refreshJobs: (params?: JobSearchParams) => Promise<void>;
  getRecommendedJobs: () => Promise<Job[]>;
  resetError: () => void;
  clearCurrentJob: () => void;
  
  // Permissions
  canCreateJob: boolean;
  canSubmitProposal: boolean;
}

/**
 * Custom hook that provides job management functionality for the AI Talent Marketplace
 * iOS application. This hook encapsulates job-related state management and operations
 * including fetching jobs, job details, creating and updating jobs, submitting proposals,
 * and getting AI-recommended jobs.
 * 
 * @returns Job state and operations
 */
const useJobs = (): UseJobsResult => {
  // Get jobs state from Redux
  const {
    jobs,
    currentJob,
    loading,
    refreshing,
    error,
    totalCount,
    currentPage,
    totalPages
  } = useSelector((state: RootState) => state.jobs);
  
  // Get dispatch function
  const dispatch = useDispatch<AppDispatch>();
  
  // Get authentication and permissions from useAuth hook
  const { hasPermission } = useAuth();
  
  // Check if user has permissions for job operations
  const canCreateJob = useMemo(() => hasPermission(Permission.JOBS_CREATE), [hasPermission]);
  const canSubmitProposal = useMemo(() => hasPermission(Permission.PROPOSALS_CREATE), [hasPermission]);
  
  /**
   * Fetches jobs based on provided search parameters
   * 
   * @param params - Optional search parameters for filtering and pagination
   * @returns Promise resolving to an array of jobs
   */
  const getJobs = useCallback(async (params?: JobSearchParams): Promise<Job[]> => {
    try {
      const resultAction = await dispatch(fetchJobs(params || {}));
      
      if (fetchJobs.fulfilled.match(resultAction)) {
        return resultAction.payload.jobs;
      }
      
      throw new Error(resultAction.payload as string || 'Failed to fetch jobs');
    } catch (error) {
      throw error;
    }
  }, [dispatch]);
  
  /**
   * Fetches a specific job by ID
   * 
   * @param id - The job ID to fetch
   * @returns Promise resolving to a job object
   */
  const getJob = useCallback(async (id: string): Promise<Job> => {
    try {
      const resultAction = await dispatch(fetchJobById(id));
      
      if (fetchJobById.fulfilled.match(resultAction)) {
        return resultAction.payload;
      }
      
      throw new Error(resultAction.payload as string || 'Failed to fetch job');
    } catch (error) {
      throw error;
    }
  }, [dispatch]);
  
  /**
   * Creates a new job listing
   * 
   * @param jobData - Job form data
   * @returns Promise resolving to the created job
   */
  const createJob = useCallback(async (jobData: JobFormValues): Promise<Job> => {
    try {
      if (!canCreateJob) {
        throw new Error('You do not have permission to create jobs');
      }
      
      const resultAction = await dispatch(createJobAction(jobData));
      
      if (createJobAction.fulfilled.match(resultAction)) {
        return resultAction.payload;
      }
      
      throw new Error(resultAction.payload as string || 'Failed to create job');
    } catch (error) {
      throw error;
    }
  }, [dispatch, canCreateJob]);
  
  /**
   * Updates an existing job listing
   * 
   * @param id - The job ID to update
   * @param jobData - Updated job data
   * @returns Promise resolving to the updated job
   */
  const updateJob = useCallback(async (id: string, jobData: Partial<JobFormValues>): Promise<Job> => {
    try {
      if (!hasPermission(Permission.JOBS_EDIT)) {
        throw new Error('You do not have permission to update jobs');
      }
      
      const resultAction = await dispatch(updateJobAction({ id, jobData }));
      
      if (updateJobAction.fulfilled.match(resultAction)) {
        return resultAction.payload;
      }
      
      throw new Error(resultAction.payload as string || 'Failed to update job');
    } catch (error) {
      throw error;
    }
  }, [dispatch, hasPermission]);
  
  /**
   * Deletes a job listing
   * 
   * @param id - The job ID to delete
   * @returns Promise resolving to boolean indicating success
   */
  const deleteJob = useCallback(async (id: string): Promise<boolean> => {
    try {
      if (!hasPermission(Permission.JOBS_DELETE)) {
        throw new Error('You do not have permission to delete jobs');
      }
      
      const resultAction = await dispatch(deleteJobAction(id));
      
      if (deleteJobAction.fulfilled.match(resultAction)) {
        return resultAction.payload.success;
      }
      
      throw new Error(resultAction.payload as string || 'Failed to delete job');
    } catch (error) {
      throw error;
    }
  }, [dispatch, hasPermission]);
  
  /**
   * Submits a proposal for a job
   * 
   * @param proposalData - Proposal form data
   * @returns Promise resolving to the submitted proposal
   */
  const submitProposal = useCallback(async (proposalData: ProposalFormValues): Promise<Proposal> => {
    try {
      if (!canSubmitProposal) {
        throw new Error('You do not have permission to submit proposals');
      }
      
      const resultAction = await dispatch(submitProposalAction(proposalData));
      
      if (submitProposalAction.fulfilled.match(resultAction)) {
        return resultAction.payload;
      }
      
      throw new Error(resultAction.payload as string || 'Failed to submit proposal');
    } catch (error) {
      throw error;
    }
  }, [dispatch, canSubmitProposal]);
  
  /**
   * Refreshes the job list with pull-to-refresh functionality for mobile
   * 
   * @param params - Optional search parameters
   * @returns Promise that resolves when refresh is complete
   */
  const refreshJobs = useCallback(async (params?: JobSearchParams): Promise<void> => {
    try {
      await dispatch(refreshJobsAction(params || {}));
    } catch (error) {
      throw error;
    }
  }, [dispatch]);
  
  /**
   * Gets AI-recommended jobs based on user profile
   * 
   * @returns Promise resolving to array of recommended jobs
   */
  const getRecommendedJobs = useCallback(async (): Promise<Job[]> => {
    try {
      const resultAction = await dispatch(getRecommendedJobsAction());
      
      if (getRecommendedJobsAction.fulfilled.match(resultAction)) {
        return resultAction.payload;
      }
      
      throw new Error(resultAction.payload as string || 'Failed to get recommended jobs');
    } catch (error) {
      throw error;
    }
  }, [dispatch]);
  
  /**
   * Resets any job-related errors
   */
  const resetError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);
  
  /**
   * Clears the currently selected job
   */
  const clearCurrentJob = useCallback(() => {
    dispatch(clearCurrentJobAction());
  }, [dispatch]);
  
  // Return all job state and operations
  return {
    // State
    jobs,
    currentJob,
    loading,
    refreshing,
    error,
    totalCount,
    currentPage,
    totalPages,
    
    // Methods
    getJobs,
    getJob,
    createJob,
    updateJob,
    deleteJob,
    submitProposal,
    refreshJobs,
    getRecommendedJobs,
    resetError,
    clearCurrentJob,
    
    // Permissions
    canCreateJob,
    canSubmitProposal,
  };
};

export default useJobs;