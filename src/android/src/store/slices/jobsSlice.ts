/**
 * Redux Toolkit slice for managing job-related state in the AI Talent Marketplace Android mobile application
 * Handles job listing, filtering, creation, updating, and proposal submission with async thunks for API interactions
 * Includes mobile-specific states like refreshing for pull-to-refresh functionality
 * 
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // @reduxjs/toolkit ^1.9.5
import { 
  Job, 
  JobFormValues, 
  Proposal, 
  ProposalFormValues, 
  JobSearchParams, 
  JobsState, 
  JobFilterOptions 
} from '../../types/job.types';
import { jobsAPI } from '../../lib/api';

// Initial state with default values
const initialState: JobsState = {
  jobs: [],
  currentJob: null,
  loading: false,
  refreshing: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  totalPages: 1,
  filters: {
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  }
};

/**
 * Async thunk that fetches jobs based on provided search parameters
 */
export const fetchJobs = createAsyncThunk(
  'jobs/fetchJobs',
  async (searchParams?: JobSearchParams, { rejectWithValue }) => {
    try {
      const response = await jobsAPI.getJobs(searchParams);
      return {
        jobs: response.jobs,
        totalCount: response.totalCount,
        currentPage: searchParams?.page || 1,
        totalPages: response.totalPages
      };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk that fetches a specific job by its ID
 */
export const fetchJobDetail = createAsyncThunk(
  'jobs/fetchJobDetail',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await jobsAPI.getJobById(id);
      return response;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk that creates a new job posting
 */
export const createJobPost = createAsyncThunk(
  'jobs/createJob',
  async (jobData: JobFormValues, { rejectWithValue }) => {
    try {
      const response = await jobsAPI.createJob(jobData);
      return response;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk that updates an existing job
 */
export const updateJobPost = createAsyncThunk(
  'jobs/updateJob',
  async (payload: { id: string; data: Partial<JobFormValues> }, { rejectWithValue }) => {
    try {
      const { id, data } = payload;
      const response = await jobsAPI.updateJob(id, data);
      return response;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk that deletes a job posting
 */
export const removeJobPost = createAsyncThunk(
  'jobs/deleteJob',
  async (id: string, { rejectWithValue }) => {
    try {
      await jobsAPI.deleteJob(id);
      return id;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk that submits a proposal for a job
 */
export const submitJobProposal = createAsyncThunk(
  'jobs/submitProposal',
  async (proposalData: ProposalFormValues, { rejectWithValue }) => {
    try {
      const response = await jobsAPI.submitProposal(proposalData);
      return response;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk that refreshes jobs with pull-to-refresh behavior for mobile
 */
export const refreshJobs = createAsyncThunk(
  'jobs/refreshJobs',
  async (searchParams?: JobSearchParams, { rejectWithValue }) => {
    try {
      const response = await jobsAPI.getJobs(searchParams);
      return {
        jobs: response.jobs,
        totalCount: response.totalCount,
        currentPage: searchParams?.page || 1,
        totalPages: response.totalPages
      };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

/**
 * Async thunk that fetches AI-recommended jobs for a user
 */
export const fetchRecommendedJobs = createAsyncThunk(
  'jobs/fetchRecommendedJobs',
  async (_, { rejectWithValue }) => {
    try {
      const response = await jobsAPI.getRecommendedJobs();
      return response;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Create the slice with reducers
const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<JobSearchParams>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentJob: (state, action: PayloadAction<Job>) => {
      state.currentJob = action.payload;
    },
    clearCurrentJob: (state) => {
      state.currentJob = null;
    }
  },
  extraReducers: (builder) => {
    // fetchJobs
    builder.addCase(fetchJobs.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchJobs.fulfilled, (state, action) => {
      state.loading = false;
      state.jobs = action.payload.jobs;
      state.totalCount = action.payload.totalCount;
      state.currentPage = action.payload.currentPage;
      state.totalPages = action.payload.totalPages;
    });
    builder.addCase(fetchJobs.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // fetchJobDetail
    builder.addCase(fetchJobDetail.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchJobDetail.fulfilled, (state, action) => {
      state.loading = false;
      state.currentJob = action.payload;
    });
    builder.addCase(fetchJobDetail.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // createJobPost
    builder.addCase(createJobPost.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createJobPost.fulfilled, (state, action) => {
      state.loading = false;
      // Add the new job to the top of the list
      state.jobs = [action.payload, ...state.jobs];
      state.currentJob = action.payload;
    });
    builder.addCase(createJobPost.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // updateJobPost
    builder.addCase(updateJobPost.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateJobPost.fulfilled, (state, action) => {
      state.loading = false;
      // Update the job in the list
      state.jobs = state.jobs.map(job => 
        job.id === action.payload.id ? action.payload : job
      );
      state.currentJob = action.payload;
    });
    builder.addCase(updateJobPost.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // removeJobPost
    builder.addCase(removeJobPost.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(removeJobPost.fulfilled, (state, action) => {
      state.loading = false;
      // Remove the job from the list
      state.jobs = state.jobs.filter(job => job.id !== action.payload);
      // If the current job is the one being removed, clear it
      if (state.currentJob && state.currentJob.id === action.payload) {
        state.currentJob = null;
      }
    });
    builder.addCase(removeJobPost.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // submitJobProposal
    builder.addCase(submitJobProposal.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(submitJobProposal.fulfilled, (state, action) => {
      state.loading = false;
      // If there's a current job, add the proposal to it
      if (state.currentJob) {
        state.currentJob = {
          ...state.currentJob,
          proposals: state.currentJob.proposals 
            ? [...state.currentJob.proposals, action.payload]
            : [action.payload],
          proposalCount: (state.currentJob.proposalCount || 0) + 1
        };
      }
    });
    builder.addCase(submitJobProposal.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // refreshJobs (pull-to-refresh specific for mobile)
    builder.addCase(refreshJobs.pending, (state) => {
      state.refreshing = true;
      state.error = null;
    });
    builder.addCase(refreshJobs.fulfilled, (state, action) => {
      state.refreshing = false;
      state.jobs = action.payload.jobs;
      state.totalCount = action.payload.totalCount;
      state.currentPage = action.payload.currentPage;
      state.totalPages = action.payload.totalPages;
    });
    builder.addCase(refreshJobs.rejected, (state, action) => {
      state.refreshing = false;
      state.error = action.payload as string;
    });

    // fetchRecommendedJobs
    builder.addCase(fetchRecommendedJobs.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchRecommendedJobs.fulfilled, (state, action) => {
      state.loading = false;
      state.jobs = action.payload;
    });
    builder.addCase(fetchRecommendedJobs.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  }
});

// Export actions
export const { setFilters, clearError, setCurrentJob, clearCurrentJob } = jobsSlice.actions;

// Export reducer
export default jobsSlice.reducer;