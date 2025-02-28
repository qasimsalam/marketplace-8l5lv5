/**
 * Custom React hook that provides comprehensive job management functionality for the AI Talent Marketplace Android application.
 * This hook abstracts the complexity of interacting with Redux for job state and provides optimized methods for job
 * searching, filtering, creation, updating, and proposal submission designed for the mobile experience.
 * 
 * @version 1.0.0
 */

import { useEffect, useCallback, useState, useMemo } from 'react'; // react ^18.2.0
import { useNavigation } from '@react-navigation/native'; // @react-navigation/native ^6.1.7

// Import Redux hooks and actions
import { useAppDispatch, useAppSelector } from '../store';
import { 
  fetchJobs, 
  fetchJobDetail, 
  createJobPost, 
  updateJobPost, 
  removeJobPost, 
  submitJobProposal, 
  refreshJobs, 
  clearError, 
  setCurrentJob 
} from '../store/slices/jobsSlice';

// Import API methods
import { jobsAPI } from '../lib/api';

// Import auth hook for permission checks
import { useAuth } from './useAuth';

// Import types
import { 
  Job, 
  JobFormValues, 
  Proposal, 
  ProposalFormValues, 
  JobSearchParams, 
  JobsState, 
  JobFilterOptions, 
  JobContextType 
} from '../types/job.types';

// Import form validation utilities
import { validateJobForm, validateProposalForm } from '../utils/validation';

// Import toast notification types
import { ToastType } from '../components/common/Toast';

// Global constants
const DEFAULT_SEARCH_PARAMS = { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' };
const TOAST_DURATION = 3000;

/**
 * Custom React hook that provides comprehensive job management functionality for the mobile app
 * 
 * @param options Optional configuration object with toast function
 * @returns Object containing job state and methods for job operations
 */
export function useJobs({ showToast }: { showToast?: (message: string, type: ToastType, duration?: number) => void } = {}): JobContextType {
  // Initialize Redux hooks
  const dispatch = useAppDispatch();
  const jobsState = useAppSelector(state => state.jobs);
  
  // Initialize navigation hook for redirects after operations
  const navigation = useNavigation();
  
  // Initialize auth hook for permission checks
  const { isAuthenticated, hasPermission, user } = useAuth();
  
  // State for search parameters
  const [searchParams, setSearchParams] = useState<JobSearchParams>(DEFAULT_SEARCH_PARAMS);
  
  // Fetch jobs on component mount or when auth status changes
  useEffect(() => {
    if (isAuthenticated && !jobsState.loading) {
      dispatch(fetchJobs(searchParams));
    }
  }, [isAuthenticated, dispatch, searchParams]);
  
  // Extract error message from error object
  const getErrorMessage = (error: any): string => {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    return 'An unexpected error occurred';
  };
  
  // Display toast notification if showToast function is provided
  const displayToast = useCallback((message: string, type: ToastType) => {
    if (showToast) {
      showToast(message, type, TOAST_DURATION);
    }
  }, [showToast]);
  
  /**
   * Get jobs with optional search parameters
   * 
   * @param params Optional search and filter parameters
   * @returns Promise resolving to an array of jobs
   */
  const getJobs = useCallback(async (params?: JobSearchParams): Promise<Job[]> => {
    try {
      const mergedParams = { ...searchParams, ...params };
      const result = await dispatch(fetchJobs(mergedParams)).unwrap();
      return result.jobs;
    } catch (error) {
      displayToast(`Failed to fetch jobs: ${getErrorMessage(error)}`, ToastType.ERROR);
      return [];
    }
  }, [dispatch, searchParams, displayToast]);
  
  /**
   * Get a specific job by ID
   * 
   * @param id Job ID
   * @returns Promise resolving to the job details
   */
  const getJob = useCallback(async (id: string): Promise<Job> => {
    try {
      const result = await dispatch(fetchJobDetail(id)).unwrap();
      return result;
    } catch (error) {
      displayToast(`Failed to fetch job details: ${getErrorMessage(error)}`, ToastType.ERROR);
      throw error;
    }
  }, [dispatch, displayToast]);
  
  /**
   * Refresh jobs (for pull-to-refresh functionality)
   * 
   * @param params Optional search and filter parameters
   * @returns Promise that resolves when refresh is complete
   */
  const refreshJobsList = useCallback(async (params?: JobSearchParams): Promise<void> => {
    try {
      const mergedParams = { ...searchParams, ...params };
      await dispatch(refreshJobs(mergedParams)).unwrap();
    } catch (error) {
      displayToast(`Failed to refresh jobs: ${getErrorMessage(error)}`, ToastType.ERROR);
    }
  }, [dispatch, searchParams, displayToast]);
  
  /**
   * Create a new job
   * 
   * @param jobData Job creation form data
   * @returns Promise resolving to the created job
   */
  const createJob = useCallback(async (jobData: JobFormValues): Promise<Job> => {
    try {
      // Check if user has permission to create jobs
      if (!hasPermission('jobs:create')) {
        const error = 'You do not have permission to create jobs';
        displayToast(error, ToastType.ERROR);
        throw new Error(error);
      }
      
      // Validate job data
      const { isValid, errors } = validateJobForm(jobData);
      if (!isValid) {
        const errorMessage = Object.values(errors)[0];
        displayToast(errorMessage, ToastType.ERROR);
        throw new Error(errorMessage);
      }
      
      // Create job
      const result = await dispatch(createJobPost(jobData)).unwrap();
      
      // Show success message
      displayToast('Job created successfully', ToastType.SUCCESS);
      
      return result;
    } catch (error) {
      displayToast(`Failed to create job: ${getErrorMessage(error)}`, ToastType.ERROR);
      throw error;
    }
  }, [dispatch, displayToast, hasPermission]);
  
  /**
   * Update an existing job
   * 
   * @param id Job ID
   * @param jobData Job update data
   * @returns Promise resolving to the updated job
   */
  const updateJob = useCallback(async (id: string, jobData: Partial<JobFormValues>): Promise<Job> => {
    try {
      // Check if user has permission to edit jobs
      if (!hasPermission('jobs:edit')) {
        const error = 'You do not have permission to edit jobs';
        displayToast(error, ToastType.ERROR);
        throw new Error(error);
      }
      
      // Update job
      const result = await dispatch(updateJobPost({ id, data: jobData })).unwrap();
      
      // Show success message
      displayToast('Job updated successfully', ToastType.SUCCESS);
      
      return result;
    } catch (error) {
      displayToast(`Failed to update job: ${getErrorMessage(error)}`, ToastType.ERROR);
      throw error;
    }
  }, [dispatch, displayToast, hasPermission]);
  
  /**
   * Delete a job
   * 
   * @param id Job ID
   * @returns Promise resolving to true if deletion was successful
   */
  const deleteJob = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Check if user has permission to delete jobs
      if (!hasPermission('jobs:delete')) {
        const error = 'You do not have permission to delete jobs';
        displayToast(error, ToastType.ERROR);
        return false;
      }
      
      await dispatch(removeJobPost(id)).unwrap();
      
      // Show success message
      displayToast('Job deleted successfully', ToastType.SUCCESS);
      
      return true;
    } catch (error) {
      displayToast(`Failed to delete job: ${getErrorMessage(error)}`, ToastType.ERROR);
      return false;
    }
  }, [dispatch, displayToast, hasPermission]);
  
  /**
   * Submit a proposal for a job
   * 
   * @param proposal Proposal submission data
   * @returns Promise resolving to the created proposal
   */
  const submitProposal = useCallback(async (proposal: ProposalFormValues): Promise<Proposal> => {
    try {
      // Check if user has permission to create proposals
      if (!hasPermission('proposals:create')) {
        const error = 'You do not have permission to submit proposals';
        displayToast(error, ToastType.ERROR);
        throw new Error(error);
      }
      
      // Validate proposal data
      const { isValid, errors } = validateProposalForm(proposal);
      if (!isValid) {
        const errorMessage = Object.values(errors)[0];
        displayToast(errorMessage, ToastType.ERROR);
        throw new Error(errorMessage);
      }
      
      // Submit proposal
      const result = await dispatch(submitJobProposal(proposal)).unwrap();
      
      // Show success message
      displayToast('Proposal submitted successfully', ToastType.SUCCESS);
      
      return result;
    } catch (error) {
      displayToast(`Failed to submit proposal: ${getErrorMessage(error)}`, ToastType.ERROR);
      throw error;
    }
  }, [dispatch, displayToast, hasPermission]);
  
  /**
   * Get AI-recommended jobs for the current user
   * 
   * @returns Promise resolving to an array of recommended jobs
   */
  const getRecommendedJobs = useCallback(async (): Promise<Job[]> => {
    try {
      const result = await jobsAPI.getRecommendedJobs();
      return result;
    } catch (error) {
      displayToast(`Failed to get job recommendations: ${getErrorMessage(error)}`, ToastType.ERROR);
      return [];
    }
  }, [displayToast]);
  
  /**
   * Clear any error in the jobs state
   */
  const resetError = useCallback((): void => {
    dispatch(clearError());
  }, [dispatch]);
  
  /**
   * Clear the current job in state
   */
  const clearCurrentJob = useCallback((): void => {
    dispatch(clearCurrentJob());
  }, [dispatch]);
  
  /**
   * Apply filters to job search
   * 
   * @param filterOptions Filter options to apply
   * @returns Promise that resolves when filters are applied
   */
  const applyFilters = useCallback(async (filterOptions: JobFilterOptions): Promise<void> => {
    try {
      // Convert filter options to search params
      const newParams: Partial<JobSearchParams> = {
        ...searchParams,
        page: 1, // Reset to first page when applying new filters
      };
      
      // Add filter parameters if they exist
      if (filterOptions.jobTypes?.length) {
        newParams.type = filterOptions.jobTypes[0];
      }
      
      if (filterOptions.jobStatuses?.length) {
        newParams.status = filterOptions.jobStatuses[0];
      }
      
      if (filterOptions.difficultyLevels?.length) {
        newParams.difficulty = filterOptions.difficultyLevels[0];
      }
      
      if (filterOptions.minBudget !== undefined) {
        newParams.minBudget = filterOptions.minBudget;
      }
      
      if (filterOptions.maxBudget !== undefined) {
        newParams.maxBudget = filterOptions.maxBudget;
      }
      
      if (filterOptions.skills?.length) {
        newParams.skills = filterOptions.skills;
      }
      
      if (filterOptions.isRemote !== undefined) {
        newParams.isRemote = filterOptions.isRemote;
      }
      
      if (filterOptions.location) {
        newParams.location = filterOptions.location;
      }
      
      if (filterOptions.categories?.length) {
        newParams.category = filterOptions.categories[0];
      }
      
      // Update search params state with all fields from the original plus overrides
      const finalParams = { ...searchParams, ...newParams } as JobSearchParams;
      setSearchParams(finalParams);
      
      // Fetch jobs with new params
      await dispatch(fetchJobs(finalParams)).unwrap();
    } catch (error) {
      displayToast(`Failed to apply filters: ${getErrorMessage(error)}`, ToastType.ERROR);
    }
  }, [dispatch, searchParams, displayToast]);
  
  // Return job state and methods as a memoized object
  return useMemo(() => ({
    jobsState,
    getJobs,
    getJob,
    refreshJobs: refreshJobsList,
    createJob,
    updateJob,
    deleteJob,
    submitProposal,
    getRecommendedJobs,
    resetError,
    clearCurrentJob,
    applyFilters
  }), [
    jobsState,
    getJobs,
    getJob,
    refreshJobsList,
    createJob,
    updateJob,
    deleteJob,
    submitProposal,
    getRecommendedJobs,
    resetError,
    clearCurrentJob,
    applyFilters
  ]);
}