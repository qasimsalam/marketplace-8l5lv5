/**
 * Custom React hook that provides job management functionality for the AI Talent Marketplace web application.
 * Simplifies interaction with the Redux jobs state and provides methods for fetching, creating, updating, and
 * deleting jobs, as well as handling job proposals and recommendations.
 * 
 * @version 1.0.0
 */

import { useEffect, useState, useCallback } from 'react'; // ^18.2.0
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchJobs,
  fetchJob,
  createJob,
  updateJob,
  deleteJob,
  submitProposal,
  updateProposalStatus,
  getJobRecommendations,
  setFilters,
  clearError,
  clearCurrentJob,
  selectJobs,
  selectCurrentJob,
  selectJobsLoading,
  selectJobsError,
  selectJobsPagination,
  selectRecommendedJobs
} from '../store/slices/jobsSlice';
import { useToast } from './useToast';
import { 
  Job, 
  JobFormValues, 
  Proposal, 
  ProposalFormValues, 
  JobSearchParams, 
  ProposalStatus 
} from '../types/job';
import { useAuth } from './useAuth';
import { Permission } from '../types/auth';
import { UserRole } from '../../../backend/shared/src/types/user.types';

/**
 * Custom hook that provides job management functionality
 * 
 * @param initialSearchParams - Optional initial search parameters
 * @returns Jobs state and job management methods
 */
export const useJobs = (initialSearchParams?: JobSearchParams) => {
  const dispatch = useAppDispatch();
  
  // Get job-related state from Redux
  const jobs = useAppSelector(selectJobs);
  const currentJob = useAppSelector(selectCurrentJob);
  const recommendedJobs = useAppSelector(selectRecommendedJobs);
  const isLoading = useAppSelector(selectJobsLoading);
  const error = useAppSelector(selectJobsError);
  const pagination = useAppSelector(selectJobsPagination);
  
  // Initialize local search params state
  const [searchParams, setSearchParams] = useState<JobSearchParams>(
    initialSearchParams || {
      query: '',
      type: undefined,
      status: undefined,
      minBudget: undefined,
      maxBudget: undefined,
      skills: [],
      difficulty: undefined,
      isRemote: undefined,
      location: '',
      posterId: '',
      category: '',
      subcategory: '',
      createdAfter: undefined,
      createdBefore: undefined,
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    }
  );
  
  // Initialize toast notifications
  const toast = useToast();
  
  // Get user data and permission checking from auth hook
  const { user, hasPermission } = useAuth();
  
  /**
   * Fetches jobs with optional search parameters
   */
  const fetchJobsData = useCallback(async (params: JobSearchParams = searchParams) => {
    try {
      await dispatch(fetchJobs(params)).unwrap();
    } catch (error) {
      const errorMessage = typeof error === 'string' 
        ? error 
        : 'Failed to fetch jobs. Please try again.';
      toast.error(errorMessage);
    }
  }, [dispatch, searchParams, toast]);
  
  /**
   * Fetches a specific job by ID
   */
  const fetchJobById = useCallback(async (id: string) => {
    try {
      const result = await dispatch(fetchJob(id)).unwrap();
      return result;
    } catch (error) {
      const errorMessage = typeof error === 'string' 
        ? error 
        : `Failed to fetch job details for ID: ${id}`;
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  }, [dispatch, toast]);
  
  /**
   * Creates a new job
   */
  const createNewJob = useCallback(async (jobData: JobFormValues) => {
    try {
      const result = await dispatch(createJob(jobData)).unwrap();
      toast.success('Job created successfully');
      return result;
    } catch (error) {
      const errorMessage = typeof error === 'string' 
        ? error 
        : 'Failed to create job. Please check your inputs and try again.';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  }, [dispatch, toast]);
  
  /**
   * Updates an existing job
   */
  const updateExistingJob = useCallback(async (id: string, jobData: JobFormValues) => {
    try {
      const result = await dispatch(updateJob({ id, data: jobData })).unwrap();
      toast.success('Job updated successfully');
      return result;
    } catch (error) {
      const errorMessage = typeof error === 'string' 
        ? error 
        : `Failed to update job ${id}. Please check your inputs and try again.`;
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  }, [dispatch, toast]);
  
  /**
   * Deletes a job by ID
   */
  const removeJob = useCallback(async (id: string) => {
    try {
      await dispatch(deleteJob(id)).unwrap();
      toast.success('Job deleted successfully');
    } catch (error) {
      const errorMessage = typeof error === 'string' 
        ? error 
        : `Failed to delete job ${id}.`;
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  }, [dispatch, toast]);
  
  /**
   * Submits a proposal for a job
   */
  const submitJobProposal = useCallback(async (proposalData: ProposalFormValues) => {
    try {
      const result = await dispatch(submitProposal(proposalData)).unwrap();
      toast.success('Proposal submitted successfully');
      return result;
    } catch (error) {
      const errorMessage = typeof error === 'string' 
        ? error 
        : 'Failed to submit proposal. Please check your inputs and try again.';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  }, [dispatch, toast]);
  
  /**
   * Updates a proposal's status (accept/reject)
   */
  const updateProposal = useCallback(async (
    proposalId: string, 
    status: ProposalStatus, 
    rejectionReason?: string
  ) => {
    try {
      const result = await dispatch(updateProposalStatus({
        proposalId,
        status,
        rejectionReason
      })).unwrap();
      
      const statusMessage = status === ProposalStatus.ACCEPTED
        ? 'Proposal accepted successfully'
        : status === ProposalStatus.REJECTED
        ? 'Proposal rejected'
        : 'Proposal status updated';
      
      toast.success(statusMessage);
      return result;
    } catch (error) {
      const errorMessage = typeof error === 'string' 
        ? error 
        : `Failed to update proposal status.`;
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  }, [dispatch, toast]);
  
  /**
   * Gets AI-powered job recommendations
   */
  const getRecommendations = useCallback(async () => {
    try {
      await dispatch(getJobRecommendations()).unwrap();
    } catch (error) {
      const errorMessage = typeof error === 'string' 
        ? error 
        : 'Failed to get job recommendations.';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  }, [dispatch, toast]);
  
  /**
   * Sets search filters for jobs
   */
  const setSearchFilters = useCallback((filters: Partial<JobSearchParams>) => {
    setSearchParams(prevParams => ({
      ...prevParams,
      ...filters,
      // Reset to first page when filters change (unless explicitly setting page)
      page: filters.page || 1
    }));
  }, []);
  
  /**
   * Clears any job-related error
   */
  const clearJobError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);
  
  /**
   * Clears the current selected job
   */
  const clearSelectedJob = useCallback(() => {
    dispatch(clearCurrentJob());
  }, [dispatch]);
  
  /**
   * Changes the current page for pagination
   */
  const changePage = useCallback((page: number) => {
    setSearchParams(prevParams => ({
      ...prevParams,
      page
    }));
  }, []);
  
  /**
   * Resets all search filters to default values
   */
  const resetFilters = useCallback(() => {
    setSearchParams({
      query: '',
      type: undefined,
      status: undefined,
      minBudget: undefined,
      maxBudget: undefined,
      skills: [],
      difficulty: undefined,
      isRemote: undefined,
      location: '',
      posterId: '',
      category: '',
      subcategory: '',
      createdAfter: undefined,
      createdBefore: undefined,
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }, []);
  
  // Check permissions for job creation and proposal submission
  const canCreateJob = hasPermission(Permission.JOBS_CREATE);
  const canSubmitProposal = hasPermission(Permission.PROPOSALS_CREATE);
  
  // Fetch jobs when search params change
  useEffect(() => {
    fetchJobsData(searchParams);
  }, [fetchJobsData, searchParams]);
  
  // If user is an employer, fetch recommendations on component mount
  useEffect(() => {
    if (user && user.role === UserRole.EMPLOYER) {
      getRecommendations();
    }
  }, [user, getRecommendations]);
  
  return {
    // State
    jobs,
    currentJob,
    recommendedJobs,
    isLoading,
    error,
    pagination,
    searchParams,
    
    // Job operations
    fetchJobs: fetchJobsData,
    fetchJobById,
    createNewJob,
    updateExistingJob,
    removeJob,
    
    // Proposal operations
    submitJobProposal,
    updateProposal,
    
    // Recommendations
    getRecommendations,
    
    // Search and filter
    setSearchFilters,
    clearJobError,
    clearSelectedJob,
    changePage,
    resetFilters,
    
    // Permissions
    canCreateJob,
    canSubmitProposal
  };
};