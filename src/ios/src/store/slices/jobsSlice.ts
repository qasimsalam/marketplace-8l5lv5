/**
 * Redux Toolkit slice for job management in the AI Talent Marketplace iOS app
 * This slice handles state management for job listings, job details, proposals,
 * and AI-powered job recommendations while providing async thunk actions for
 * all job-related operations.
 * 
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import { AnyAction, ThunkAction } from '@reduxjs/toolkit'; // ^1.9.5

import { 
  Job, 
  JobFormValues, 
  Proposal, 
  ProposalFormValues, 
  JobSearchParams,
  JobsState 
} from '../../types/job.types';
import api from '../../lib/api';

// Initial state for the jobs slice
const initialState: JobsState = {
  jobs: [],
  currentJob: null,
  loading: false,
  refreshing: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  totalPages: 1
};

// Type definitions for Redux
type RootState = Record<string, unknown>;
type AppDispatch = any;
type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, AnyAction>;

/**
 * Async thunk for fetching jobs with optional search parameters
 */
export const fetchJobs = createAsyncThunk(
  'jobs/fetchJobs',
  async (params: JobSearchParams, { rejectWithValue }) => {
    try {
      const response = await api.jobs.getJobs(params);
      return {
        jobs: response.jobs,
        totalCount: response.totalCount,
        currentPage: response.currentPage,
        totalPages: response.totalPages
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch jobs');
    }
  }
);

/**
 * Async thunk for refreshing jobs list with pull-to-refresh functionality
 * Specific for mobile to provide a better UX with loading indicators
 */
export const refreshJobs = createAsyncThunk(
  'jobs/refreshJobs',
  async (params: JobSearchParams, { rejectWithValue }) => {
    try {
      const response = await api.jobs.getJobs(params);
      return {
        jobs: response.jobs,
        totalCount: response.totalCount,
        currentPage: response.currentPage,
        totalPages: response.totalPages
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to refresh jobs');
    }
  }
);

/**
 * Async thunk for fetching a specific job by ID
 */
export const fetchJobById = createAsyncThunk(
  'jobs/fetchJobById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await api.jobs.getJob(id);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch job details');
    }
  }
);

/**
 * Async thunk for creating a new job posting
 */
export const createJob = createAsyncThunk(
  'jobs/createJob',
  async (jobData: JobFormValues, { rejectWithValue }) => {
    try {
      return await api.jobs.createJob(jobData);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create job');
    }
  }
);

/**
 * Async thunk for updating an existing job posting
 */
export const updateJob = createAsyncThunk(
  'jobs/updateJob',
  async ({ id, jobData }: { id: string; jobData: Partial<JobFormValues> }, { rejectWithValue }) => {
    try {
      return await api.jobs.updateJob(id, jobData);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update job');
    }
  }
);

/**
 * Async thunk for deleting a job posting
 */
export const deleteJob = createAsyncThunk(
  'jobs/deleteJob',
  async (id: string, { rejectWithValue }) => {
    try {
      const success = await api.jobs.deleteJob(id);
      return { id, success };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete job');
    }
  }
);

/**
 * Async thunk for submitting a proposal for a job
 */
export const submitProposal = createAsyncThunk(
  'jobs/submitProposal',
  async (proposal: ProposalFormValues, { rejectWithValue }) => {
    try {
      return await api.jobs.submitProposal(proposal);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to submit proposal');
    }
  }
);

/**
 * Async thunk for getting AI-powered job recommendations
 */
export const getRecommendedJobs = createAsyncThunk(
  'jobs/getRecommendedJobs',
  async (_, { rejectWithValue }) => {
    try {
      return await api.jobs.getRecommendedJobs();
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to get job recommendations');
    }
  }
);

/**
 * Jobs slice containing reducers and actions for job management
 */
export const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    // Manually set error state
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    // Clear error state
    clearError: (state) => {
      state.error = null;
    },
    // Clear current job selection
    clearCurrentJob: (state) => {
      state.currentJob = null;
    }
  },
  extraReducers: (builder) => {
    // Handle fetchJobs states
    builder
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
        state.error = action.payload as string || 'Unknown error occurred';
      });

    // Handle refreshJobs states (similar to fetchJobs but with refreshing flag)
    builder
      .addCase(refreshJobs.pending, (state) => {
        state.refreshing = true;
        state.error = null;
      })
      .addCase(refreshJobs.fulfilled, (state, action) => {
        state.refreshing = false;
        state.jobs = action.payload.jobs;
        state.totalCount = action.payload.totalCount;
        state.currentPage = action.payload.currentPage;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(refreshJobs.rejected, (state, action) => {
        state.refreshing = false;
        state.error = action.payload as string || 'Unknown error occurred';
      });

    // Handle fetchJobById states
    builder
      .addCase(fetchJobById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchJobById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentJob = action.payload;
      })
      .addCase(fetchJobById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Unknown error occurred';
      });

    // Handle createJob states
    builder
      .addCase(createJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createJob.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs = [action.payload, ...state.jobs];
        state.currentJob = action.payload;
      })
      .addCase(createJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Unknown error occurred';
      });

    // Handle updateJob states
    builder
      .addCase(updateJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateJob.fulfilled, (state, action) => {
        state.loading = false;
        state.currentJob = action.payload;
        state.jobs = state.jobs.map(job => 
          job.id === action.payload.id ? action.payload : job
        );
      })
      .addCase(updateJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Unknown error occurred';
      });

    // Handle deleteJob states
    builder
      .addCase(deleteJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteJob.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.success) {
          state.jobs = state.jobs.filter(job => job.id !== action.payload.id);
          if (state.currentJob && state.currentJob.id === action.payload.id) {
            state.currentJob = null;
          }
        }
      })
      .addCase(deleteJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Unknown error occurred';
      });

    // Handle submitProposal states
    builder
      .addCase(submitProposal.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitProposal.fulfilled, (state, action) => {
        state.loading = false;
        // If we have the current job loaded, add the proposal to it
        if (state.currentJob && state.currentJob.id === action.payload.jobId) {
          if (state.currentJob.proposals) {
            state.currentJob.proposals.push(action.payload);
            state.currentJob.proposalCount = (state.currentJob.proposalCount || 0) + 1;
          } else {
            state.currentJob.proposals = [action.payload];
            state.currentJob.proposalCount = 1;
          }
        }
      })
      .addCase(submitProposal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Unknown error occurred';
      });

    // Handle getRecommendedJobs states
    builder
      .addCase(getRecommendedJobs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getRecommendedJobs.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs = action.payload;
      })
      .addCase(getRecommendedJobs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Unknown error occurred';
      });
  }
});

// Export actions created by the slice
export const { setError, clearError, clearCurrentJob } = jobsSlice.actions;

// Export the reducer as default export
export default jobsSlice.reducer;