/**
 * Redux Toolkit slice for managing job-related state in the AI Talent Marketplace web application.
 * Handles job listing, filtering, creation, updating, and proposal submission with async thunks for API interactions.
 * 
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import { 
  Job, JobFormValues, Proposal, ProposalFormValues, 
  JobSearchParams, JobsState, ProposalStatus, JobStatus 
} from '../../types/job';
import { jobsAPI } from '../../lib/api';

// Initial state for the jobs slice
const initialState: JobsState = {
  jobs: [],
  currentJob: null,
  recommendedJobs: [],
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  totalPages: 0
};

/**
 * Async thunk that fetches jobs based on provided search parameters
 * 
 * @param searchParams - Optional search and filter criteria for jobs
 */
export const fetchJobs = createAsyncThunk(
  'jobs/fetchJobs',
  async (searchParams: JobSearchParams | undefined, { rejectWithValue }) => {
    try {
      const response = await jobsAPI.getJobs(searchParams);
      return {
        jobs: response.jobs,
        totalCount: response.total, 
        currentPage: response.page,
        totalPages: Math.ceil(response.total / response.limit)
      };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk that fetches a specific job by its ID
 * 
 * @param id - The ID of the job to fetch
 */
export const fetchJob = createAsyncThunk(
  'jobs/fetchJob',
  async (id: string, { rejectWithValue }) => {
    try {
      const job = await jobsAPI.getJobById(id);
      return job;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk that creates a new job posting
 * 
 * @param jobData - The form values containing job details
 */
export const createJob = createAsyncThunk(
  'jobs/createJob',
  async (jobData: JobFormValues, { rejectWithValue }) => {
    try {
      const job = await jobsAPI.createJob(jobData);
      return job;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk that updates an existing job
 * 
 * @param payload - Object containing job ID and updated data
 */
export const updateJob = createAsyncThunk(
  'jobs/updateJob',
  async (payload: { id: string; data: JobFormValues }, { rejectWithValue }) => {
    try {
      const { id, data } = payload;
      const job = await jobsAPI.updateJob(id, data);
      return job;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk that deletes a job posting
 * 
 * @param id - The ID of the job to delete
 */
export const deleteJob = createAsyncThunk(
  'jobs/deleteJob',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await jobsAPI.deleteJob(id);
      if (response.success) {
        return id;
      }
      return rejectWithValue('Failed to delete job');
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk that submits a proposal for a job
 * 
 * @param proposalData - The form values containing proposal details
 */
export const submitProposal = createAsyncThunk(
  'jobs/submitProposal',
  async (proposalData: ProposalFormValues, { rejectWithValue }) => {
    try {
      const proposal = await jobsAPI.submitProposal(proposalData);
      return proposal;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk that updates a proposal's status
 * 
 * @param payload - Object containing proposal ID, new status, and optional rejection reason
 */
export const updateProposalStatus = createAsyncThunk(
  'jobs/updateProposalStatus',
  async (payload: { 
    proposalId: string; 
    status: ProposalStatus; 
    rejectionReason?: string 
  }, { rejectWithValue }) => {
    try {
      // Note: The API expects a partial ProposalFormValues, but also accepts status updates
      // This is a type-unsafe operation but matches the API implementation
      const proposal = await jobsAPI.updateProposal(payload.proposalId, { 
        status: payload.status,
        rejectionReason: payload.rejectionReason
      } as Partial<ProposalFormValues>);
      
      return proposal;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk that fetches AI-recommended jobs for a user
 */
export const getJobRecommendations = createAsyncThunk(
  'jobs/getJobRecommendations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await jobsAPI.getRecommendedJobs();
      return response.jobs;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Jobs slice for Redux store
 */
const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    /**
     * Set job search filters
     * 
     * @param state - Current state
     * @param action - Action containing filter values
     */
    setFilters: (state, action: PayloadAction<Partial<JobSearchParams>>) => {
      // This action is for storing filter state locally
      // Actual filtering happens via API calls
    },
    
    /**
     * Clear any job-related error
     * 
     * @param state - Current state
     */
    clearError: (state) => {
      state.error = null;
    },
    
    /**
     * Clear the current selected job
     * 
     * @param state - Current state
     */
    clearCurrentJob: (state) => {
      state.currentJob = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchJobs cases
      .addCase(fetchJobs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs = action.payload.jobs;
        state.totalCount = action.payload.totalCount;
        state.currentPage = action.payload.currentPage;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch jobs';
      })

      // fetchJob cases
      .addCase(fetchJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJob.fulfilled, (state, action) => {
        state.loading = false;
        state.currentJob = action.payload;
      })
      .addCase(fetchJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to fetch job';
      })

      // createJob cases
      .addCase(createJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createJob.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs.unshift(action.payload);
        state.totalCount += 1;
      })
      .addCase(createJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to create job';
      })

      // updateJob cases
      .addCase(updateJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateJob.fulfilled, (state, action) => {
        state.loading = false;
        // Update in jobs array
        const index = state.jobs.findIndex(job => job.id === action.payload.id);
        if (index !== -1) {
          state.jobs[index] = action.payload;
        }
        // Update current job if it's the one being edited
        if (state.currentJob && state.currentJob.id === action.payload.id) {
          state.currentJob = action.payload;
        }
      })
      .addCase(updateJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to update job';
      })

      // deleteJob cases
      .addCase(deleteJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteJob.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs = state.jobs.filter(job => job.id !== action.payload);
        if (state.currentJob && state.currentJob.id === action.payload) {
          state.currentJob = null;
        }
        state.totalCount -= 1;
      })
      .addCase(deleteJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to delete job';
      })

      // submitProposal cases
      .addCase(submitProposal.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitProposal.fulfilled, (state, action) => {
        state.loading = false;
        // Add the proposal to the current job if loaded
        if (state.currentJob && state.currentJob.id === action.payload.jobId) {
          if (!state.currentJob.proposals) {
            state.currentJob.proposals = [];
          }
          state.currentJob.proposals.push(action.payload);
          state.currentJob.proposalCount = (state.currentJob.proposalCount || 0) + 1;
        }
      })
      .addCase(submitProposal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to submit proposal';
      })

      // updateProposalStatus cases
      .addCase(updateProposalStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProposalStatus.fulfilled, (state, action) => {
        state.loading = false;
        
        // Update the proposal in the current job
        if (state.currentJob && state.currentJob.proposals) {
          const index = state.currentJob.proposals.findIndex(
            proposal => proposal.id === action.payload.id
          );
          if (index !== -1) {
            state.currentJob.proposals[index] = action.payload;
          }
        }
      })
      .addCase(updateProposalStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to update proposal status';
      })

      // getJobRecommendations cases
      .addCase(getJobRecommendations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getJobRecommendations.fulfilled, (state, action) => {
        state.loading = false;
        state.recommendedJobs = action.payload;
      })
      .addCase(getJobRecommendations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to get job recommendations';
      });
  }
});

/**
 * Selector that returns all jobs from the state
 */
export const selectJobs = (state: { jobs: JobsState }) => state.jobs.jobs;

/**
 * Selector that returns the currently selected job from the state
 */
export const selectCurrentJob = (state: { jobs: JobsState }) => state.jobs.currentJob;

/**
 * Selector that returns the loading state for jobs operations
 */
export const selectJobsLoading = (state: { jobs: JobsState }) => state.jobs.loading;

/**
 * Selector that returns any error related to job operations
 */
export const selectJobsError = (state: { jobs: JobsState }) => state.jobs.error;

/**
 * Selector that returns pagination information for jobs listing
 */
export const selectJobsPagination = (state: { jobs: JobsState }) => ({
  totalCount: state.jobs.totalCount,
  currentPage: state.jobs.currentPage,
  totalPages: state.jobs.totalPages
});

/**
 * Selector that returns recommended jobs from the state
 */
export const selectRecommendedJobs = (state: { jobs: JobsState }) => state.jobs.recommendedJobs;

// Export actions
export const { setFilters, clearError, clearCurrentJob } = jobsSlice.actions;

// Export reducer as default
export default jobsSlice.reducer;