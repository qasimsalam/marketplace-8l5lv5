/**
 * Core API Client Library
 * v1.0.0 - TypeScript with Axios 1.6.0
 * 
 * Centralizes all REST API calls to backend services for the AI Talent Marketplace web application.
 * Provides domain-specific API modules and handles request/response formatting with proper error handling.
 */

import axiosInstance, { createCancelToken, handleAxiosError } from './axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios'; // axios v1.6.0

// Type imports for strong typing
import { 
  Job, JobFormValues, Proposal, ProposalFormValues, JobSearchParams 
} from '../types/job';
import { 
  FreelancerProfile, CompanyProfile, ProfileFormValues, 
  PortfolioItem, PortfolioItemFormValues 
} from '../types/profile';
import { 
  LoginFormValues, RegisterFormValues, 
  ForgotPasswordFormValues, ResetPasswordFormValues 
} from '../types/auth';
import { User } from '../../../backend/shared/src/types/user.types';
import { 
  Message, Conversation, CreateMessageDTO, CreateConversationDTO 
} from '../types/message';
import { 
  Workspace, Notebook, Cell, WorkspaceFile, WorkspaceFormValues 
} from '../types/workspace';
import { 
  Payment, PaymentDTO, Contract, ContractCreateDTO, 
  Milestone, MilestoneSubmitDTO 
} from '../../../backend/shared/src/types/payment.types';

// Global configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
const API_TIMEOUT = 30000; // 30 seconds

/**
 * Helper function to serialize query parameters for API requests
 * 
 * @param params - Object containing query parameters
 * @returns URL-encoded query string
 */
export function serializeParams(params: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return '';
  }

  // Filter out undefined and null values
  const filteredParams = Object.entries(params).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>);

  // Process values and encode
  return Object.entries(filteredParams)
    .map(([key, value]) => {
      // Convert dates to ISO strings
      if (value instanceof Date) {
        value = value.toISOString();
      }
      
      // Handle arrays
      if (Array.isArray(value)) {
        return value
          .map(item => `${encodeURIComponent(key)}=${encodeURIComponent(item)}`)
          .join('&');
      }
      
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');
}

/**
 * Generic file upload function with progress tracking
 * 
 * @param file - File to upload
 * @param endpoint - API endpoint for the upload
 * @param additionalFormData - Additional form data to include
 * @param onProgress - Callback function for upload progress
 * @returns Promise resolving to uploaded file information
 */
export async function uploadFile(
  file: File,
  endpoint: string,
  additionalFormData?: Record<string, any>,
  onProgress?: (percentage: number) => void
): Promise<{ id: string; url: string }> {
  try {
    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // Add additional form data if provided
    if (additionalFormData) {
      Object.entries(additionalFormData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    // Create cancel token
    const { cancelToken } = createCancelToken();

    // Configure request
    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      cancelToken,
      onUploadProgress: onProgress 
        ? (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / (progressEvent.total || 100)
            );
            onProgress(percentCompleted);
          }
        : undefined
    };

    // Make the request
    const response = await axiosInstance.post<{ id: string; url: string }>(
      `${endpoint}`,
      formData,
      config
    );

    return response.data;
  } catch (error) {
    throw handleAxiosError(error);
  }
}

/**
 * Authentication API methods
 */
export const authAPI = {
  /**
   * Log in a user with email and password
   * 
   * @param data - Login credentials
   * @returns Promise resolving to user data with auth token
   */
  async login(data: LoginFormValues): Promise<{ user: User; token: string; refreshToken: string }> {
    try {
      const response = await axiosInstance.post<{ user: User; token: string; refreshToken: string }>(
        '/auth/login',
        data
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Register a new user
   * 
   * @param data - Registration data
   * @returns Promise resolving to user data with auth token
   */
  async register(data: RegisterFormValues): Promise<{ user: User; token: string }> {
    try {
      const response = await axiosInstance.post<{ user: User; token: string }>(
        '/auth/register',
        data
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Log out the current user
   * 
   * @returns Promise resolving to success status
   */
  async logout(): Promise<{ success: boolean }> {
    try {
      const response = await axiosInstance.post<{ success: boolean }>(
        '/auth/logout'
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Get the current authenticated user
   * 
   * @returns Promise resolving to current user data
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await axiosInstance.get<User>('/auth/me');
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Refresh the authentication token
   * 
   * @returns Promise resolving to new token
   */
  async refreshToken(): Promise<{ token: string }> {
    try {
      const response = await axiosInstance.post<{ token: string }>(
        '/auth/refresh'
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Request a password reset for a forgotten password
   * 
   * @param data - Email address for reset
   * @returns Promise resolving to success status
   */
  async forgotPassword(data: ForgotPasswordFormValues): Promise<{ success: boolean }> {
    try {
      const response = await axiosInstance.post<{ success: boolean }>(
        '/auth/forgot-password',
        data
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Reset a password using a token
   * 
   * @param data - Reset token and new password
   * @returns Promise resolving to success status
   */
  async resetPassword(data: ResetPasswordFormValues): Promise<{ success: boolean }> {
    try {
      const response = await axiosInstance.post<{ success: boolean }>(
        '/auth/reset-password',
        data
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Log in using a third-party provider
   * 
   * @param provider - Authentication provider name
   * @param token - Provider token
   * @returns Promise resolving to user data with auth token
   */
  async loginWithProvider(provider: string, token: string): Promise<{ user: User; token: string }> {
    try {
      const response = await axiosInstance.post<{ user: User; token: string }>(
        `/auth/${provider}`,
        { token }
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Set up two-factor authentication
   * 
   * @returns Promise resolving to 2FA setup data
   */
  async setupTwoFactor(): Promise<{ secret: string; qrCodeUrl: string }> {
    try {
      const response = await axiosInstance.post<{ secret: string; qrCodeUrl: string }>(
        '/auth/two-factor/setup'
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Verify a two-factor authentication code
   * 
   * @param code - Verification code
   * @returns Promise resolving to success status
   */
  async verifyTwoFactor(code: string): Promise<{ success: boolean }> {
    try {
      const response = await axiosInstance.post<{ success: boolean }>(
        '/auth/two-factor/verify',
        { code }
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Disable two-factor authentication
   * 
   * @param code - Verification code
   * @returns Promise resolving to success status
   */
  async disableTwoFactor(code: string): Promise<{ success: boolean }> {
    try {
      const response = await axiosInstance.post<{ success: boolean }>(
        '/auth/two-factor/disable',
        { code }
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  }
};

/**
 * Jobs API methods
 */
export const jobsAPI = {
  /**
   * Get a list of jobs with optional filtering
   * 
   * @param params - Search and filter parameters
   * @returns Promise resolving to paginated jobs list
   */
  async getJobs(params?: Partial<JobSearchParams>): Promise<{ 
    jobs: Job[]; 
    total: number; 
    page: number; 
    limit: number 
  }> {
    try {
      const queryString = params ? `?${serializeParams(params)}` : '';
      const response = await axiosInstance.get<{ 
        jobs: Job[]; 
        total: number; 
        page: number; 
        limit: number 
      }>(`/jobs${queryString}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Get a job by ID
   * 
   * @param id - Job ID
   * @returns Promise resolving to job data
   */
  async getJobById(id: string): Promise<Job> {
    try {
      const response = await axiosInstance.get<Job>(`/jobs/${id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Create a new job
   * 
   * @param data - Job data
   * @returns Promise resolving to created job
   */
  async createJob(data: JobFormValues): Promise<Job> {
    try {
      const formData = new FormData();
      
      // Add job data as JSON
      const jobData = { ...data };
      delete jobData.attachments;
      formData.append('job', JSON.stringify(jobData));
      
      // Add attachments
      if (data.attachments && data.attachments.length > 0) {
        data.attachments.forEach(file => {
          formData.append('attachments', file);
        });
      }
      
      const response = await axiosInstance.post<Job>(
        '/jobs',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Update an existing job
   * 
   * @param id - Job ID
   * @param data - Updated job data
   * @returns Promise resolving to updated job
   */
  async updateJob(id: string, data: JobFormValues): Promise<Job> {
    try {
      const formData = new FormData();
      
      // Add job data as JSON
      const jobData = { ...data };
      delete jobData.attachments;
      formData.append('job', JSON.stringify(jobData));
      
      // Add attachments
      if (data.attachments && data.attachments.length > 0) {
        data.attachments.forEach(file => {
          formData.append('attachments', file);
        });
      }
      
      const response = await axiosInstance.put<Job>(
        `/jobs/${id}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Delete a job
   * 
   * @param id - Job ID
   * @returns Promise resolving to success status
   */
  async deleteJob(id: string): Promise<{ success: boolean }> {
    try {
      const response = await axiosInstance.delete<{ success: boolean }>(`/jobs/${id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Submit a proposal for a job
   * 
   * @param data - Proposal data
   * @returns Promise resolving to created proposal
   */
  async submitProposal(data: ProposalFormValues): Promise<Proposal> {
    try {
      const formData = new FormData();
      
      // Add proposal data as JSON
      const proposalData = { ...data };
      delete proposalData.attachments;
      formData.append('proposal', JSON.stringify(proposalData));
      
      // Add attachments
      if (data.attachments && data.attachments.length > 0) {
        data.attachments.forEach(file => {
          formData.append('attachments', file);
        });
      }
      
      const response = await axiosInstance.post<Proposal>(
        '/proposals',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Get proposals for a specific job
   * 
   * @param jobId - Job ID
   * @returns Promise resolving to list of proposals
   */
  async getProposalsByJob(jobId: string): Promise<{ proposals: Proposal[] }> {
    try {
      const response = await axiosInstance.get<{ proposals: Proposal[] }>(`/jobs/${jobId}/proposals`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Get a specific proposal by ID
   * 
   * @param id - Proposal ID
   * @returns Promise resolving to proposal data
   */
  async getProposalById(id: string): Promise<Proposal> {
    try {
      const response = await axiosInstance.get<Proposal>(`/proposals/${id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Update an existing proposal
   * 
   * @param id - Proposal ID
   * @param data - Updated proposal data
   * @returns Promise resolving to updated proposal
   */
  async updateProposal(id: string, data: Partial<ProposalFormValues>): Promise<Proposal> {
    try {
      const formData = new FormData();
      
      // Add proposal data as JSON
      const proposalData = { ...data };
      if (proposalData.attachments) delete proposalData.attachments;
      formData.append('proposal', JSON.stringify(proposalData));
      
      // Add attachments
      if (data.attachments && data.attachments.length > 0) {
        data.attachments.forEach(file => {
          formData.append('attachments', file);
        });
      }
      
      const response = await axiosInstance.put<Proposal>(
        `/proposals/${id}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Withdraw a proposal
   * 
   * @param id - Proposal ID
   * @returns Promise resolving to success status
   */
  async withdrawProposal(id: string): Promise<{ success: boolean }> {
    try {
      const response = await axiosInstance.post<{ success: boolean }>(`/proposals/${id}/withdraw`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Get AI-recommended jobs based on user profile
   * 
   * @param limit - Maximum number of recommendations
   * @returns Promise resolving to recommended jobs
   */
  async getRecommendedJobs(limit: number = 5): Promise<{ jobs: Job[] }> {
    try {
      const response = await axiosInstance.get<{ jobs: Job[] }>(`/jobs/recommended?limit=${limit}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  }
};

/**
 * Profile API methods
 */
export const profileAPI = {
  /**
   * Get a freelancer profile by ID
   * 
   * @param id - Optional profile ID (uses authenticated user's profile if not provided)
   * @returns Promise resolving to freelancer profile
   */
  async getFreelancerProfile(id?: string): Promise<FreelancerProfile> {
    try {
      const endpoint = id 
        ? `/profiles/freelancer/${id}` 
        : '/profiles/freelancer/me';
      const response = await axiosInstance.get<FreelancerProfile>(endpoint);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Get a company profile by ID
   * 
   * @param id - Optional profile ID (uses authenticated user's profile if not provided)
   * @returns Promise resolving to company profile
   */
  async getCompanyProfile(id?: string): Promise<CompanyProfile> {
    try {
      const endpoint = id 
        ? `/profiles/company/${id}` 
        : '/profiles/company/me';
      const response = await axiosInstance.get<CompanyProfile>(endpoint);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Update a freelancer profile
   * 
   * @param data - Updated profile data
   * @returns Promise resolving to updated profile
   */
  async updateFreelancerProfile(data: ProfileFormValues): Promise<FreelancerProfile> {
    try {
      const response = await axiosInstance.put<FreelancerProfile>(
        '/profiles/freelancer/me',
        data
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Update a company profile
   * 
   * @param data - Updated company profile data
   * @returns Promise resolving to updated company profile
   */
  async updateCompanyProfile(data: { 
    name: string; 
    description: string;
    website: string;
    industry: string;
    size: string;
    location: string;
    aiInterests: string[];
  }): Promise<CompanyProfile> {
    try {
      const response = await axiosInstance.put<CompanyProfile>(
        '/profiles/company/me',
        data
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Add a portfolio item to freelancer profile
   * 
   * @param data - Portfolio item data
   * @returns Promise resolving to created portfolio item
   */
  async addPortfolioItem(data: PortfolioItemFormValues): Promise<PortfolioItem> {
    try {
      const response = await axiosInstance.post<PortfolioItem>(
        '/profiles/portfolio',
        data
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Update a portfolio item
   * 
   * @param id - Portfolio item ID
   * @param data - Updated portfolio item data
   * @returns Promise resolving to updated portfolio item
   */
  async updatePortfolioItem(id: string, data: PortfolioItemFormValues): Promise<PortfolioItem> {
    try {
      const response = await axiosInstance.put<PortfolioItem>(
        `/profiles/portfolio/${id}`,
        data
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Delete a portfolio item
   * 
   * @param id - Portfolio item ID
   * @returns Promise resolving to success status
   */
  async deletePortfolioItem(id: string): Promise<{ success: boolean }> {
    try {
      const response = await axiosInstance.delete<{ success: boolean }>(
        `/profiles/portfolio/${id}`
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Upload a profile image
   * 
   * @param file - Image file
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to uploaded image URL
   */
  async uploadProfileImage(
    file: File, 
    onProgress?: (percentage: number) => void
  ): Promise<{ id: string; url: string }> {
    return uploadFile(file, '/profiles/image', {}, onProgress);
  },

  /**
   * Upload a portfolio image
   * 
   * @param file - Image file
   * @param portfolioItemId - Optional portfolio item ID
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to uploaded image URL
   */
  async uploadPortfolioImage(
    file: File,
    portfolioItemId?: string,
    onProgress?: (percentage: number) => void
  ): Promise<{ id: string; url: string }> {
    const additionalData = portfolioItemId ? { portfolioItemId } : {};
    return uploadFile(file, '/profiles/portfolio/image', additionalData, onProgress);
  }
};

/**
 * Messages API methods
 */
export const messagesAPI = {
  /**
   * Get a list of conversations for the current user
   * 
   * @param page - Page number
   * @param limit - Items per page
   * @returns Promise resolving to paginated conversations list
   */
  async getConversations(
    page: number = 1, 
    limit: number = 20
  ): Promise<{ 
    conversations: Conversation[]; 
    total: number; 
    page: number; 
    limit: number 
  }> {
    try {
      const response = await axiosInstance.get<{ 
        conversations: Conversation[]; 
        total: number; 
        page: number; 
        limit: number 
      }>(`/conversations?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Get a specific conversation by ID
   * 
   * @param id - Conversation ID
   * @returns Promise resolving to conversation data
   */
  async getConversationById(id: string): Promise<Conversation> {
    try {
      const response = await axiosInstance.get<Conversation>(`/conversations/${id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Create a new conversation
   * 
   * @param data - Conversation creation data
   * @returns Promise resolving to created conversation
   */
  async createConversation(data: CreateConversationDTO): Promise<Conversation> {
    try {
      const response = await axiosInstance.post<Conversation>(
        '/conversations',
        data
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Get messages for a specific conversation
   * 
   * @param conversationId - Conversation ID
   * @param page - Page number
   * @param limit - Items per page
   * @returns Promise resolving to paginated messages list
   */
  async getMessages(
    conversationId: string, 
    page: number = 1, 
    limit: number = 50
  ): Promise<{ 
    messages: Message[]; 
    total: number; 
    page: number; 
    limit: number 
  }> {
    try {
      const response = await axiosInstance.get<{ 
        messages: Message[]; 
        total: number; 
        page: number; 
        limit: number 
      }>(`/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Send a message in a conversation
   * 
   * @param data - Message data
   * @returns Promise resolving to created message
   */
  async sendMessage(data: CreateMessageDTO): Promise<Message> {
    try {
      const response = await axiosInstance.post<Message>(
        `/conversations/${data.conversationId}/messages`,
        data
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Mark messages in a conversation as read
   * 
   * @param conversationId - Conversation ID
   * @returns Promise resolving to success status
   */
  async markAsRead(conversationId: string): Promise<{ success: boolean }> {
    try {
      const response = await axiosInstance.post<{ success: boolean }>(
        `/conversations/${conversationId}/read`
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Upload a file attachment for a message
   * 
   * @param file - File to upload
   * @param conversationId - Conversation ID
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to uploaded file information
   */
  async uploadAttachment(
    file: File,
    conversationId: string,
    onProgress?: (percentage: number) => void
  ): Promise<{ id: string; url: string }> {
    return uploadFile(
      file, 
      `/conversations/${conversationId}/attachments`, 
      {}, 
      onProgress
    );
  }
};

/**
 * Workspace API methods
 */
export const workspaceAPI = {
  /**
   * Get a list of workspaces for the current user
   * 
   * @param page - Page number
   * @param limit - Items per page
   * @returns Promise resolving to paginated workspaces list
   */
  async getWorkspaces(
    page: number = 1, 
    limit: number = 10
  ): Promise<{ 
    workspaces: Workspace[]; 
    total: number; 
    page: number; 
    limit: number 
  }> {
    try {
      const response = await axiosInstance.get<{ 
        workspaces: Workspace[]; 
        total: number; 
        page: number; 
        limit: number 
      }>(`/workspaces?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Get a specific workspace by ID
   * 
   * @param id - Workspace ID
   * @returns Promise resolving to workspace data
   */
  async getWorkspaceById(id: string): Promise<Workspace> {
    try {
      const response = await axiosInstance.get<Workspace>(`/workspaces/${id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Create a new workspace
   * 
   * @param data - Workspace creation data
   * @returns Promise resolving to created workspace
   */
  async createWorkspace(data: WorkspaceFormValues): Promise<Workspace> {
    try {
      const response = await axiosInstance.post<Workspace>(
        '/workspaces',
        data
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Update an existing workspace
   * 
   * @param id - Workspace ID
   * @param data - Updated workspace data
   * @returns Promise resolving to updated workspace
   */
  async updateWorkspace(id: string, data: Partial<WorkspaceFormValues>): Promise<Workspace> {
    try {
      const response = await axiosInstance.put<Workspace>(
        `/workspaces/${id}`,
        data
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Delete a workspace
   * 
   * @param id - Workspace ID
   * @returns Promise resolving to success status
   */
  async deleteWorkspace(id: string): Promise<{ success: boolean }> {
    try {
      const response = await axiosInstance.delete<{ success: boolean }>(
        `/workspaces/${id}`
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Get notebooks for a workspace
   * 
   * @param workspaceId - Workspace ID
   * @returns Promise resolving to notebooks list
   */
  async getNotebooks(workspaceId: string): Promise<{ notebooks: Notebook[] }> {
    try {
      const response = await axiosInstance.get<{ notebooks: Notebook[] }>(
        `/workspaces/${workspaceId}/notebooks`
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Get a specific notebook by ID
   * 
   * @param id - Notebook ID
   * @returns Promise resolving to notebook data
   */
  async getNotebookById(id: string): Promise<Notebook> {
    try {
      const response = await axiosInstance.get<Notebook>(`/notebooks/${id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Create a new notebook in a workspace
   * 
   * @param data - Notebook creation data
   * @returns Promise resolving to created notebook
   */
  async createNotebook(data: { 
    workspaceId: string; 
    name: string; 
    description: string; 
    kernelName: string 
  }): Promise<Notebook> {
    try {
      const response = await axiosInstance.post<Notebook>(
        `/workspaces/${data.workspaceId}/notebooks`,
        data
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Update an existing notebook
   * 
   * @param id - Notebook ID
   * @param data - Updated notebook data
   * @returns Promise resolving to updated notebook
   */
  async updateNotebook(id: string, data: { 
    name?: string; 
    description?: string; 
    kernelName?: string 
  }): Promise<Notebook> {
    try {
      const response = await axiosInstance.put<Notebook>(
        `/notebooks/${id}`,
        data
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Delete a notebook
   * 
   * @param id - Notebook ID
   * @returns Promise resolving to success status
   */
  async deleteNotebook(id: string): Promise<{ success: boolean }> {
    try {
      const response = await axiosInstance.delete<{ success: boolean }>(
        `/notebooks/${id}`
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Execute a notebook cell
   * 
   * @param notebookId - Notebook ID
   * @param cellId - Cell ID
   * @param code - Code to execute
   * @returns Promise resolving to execution result
   */
  async executeCell(
    notebookId: string, 
    cellId: string, 
    code: string
  ): Promise<{ 
    outputs: any[]; 
    executionCount: number 
  }> {
    try {
      const response = await axiosInstance.post<{ 
        outputs: any[]; 
        executionCount: number 
      }>(
        `/notebooks/${notebookId}/cells/${cellId}/execute`,
        { code }
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Upload a file to a workspace
   * 
   * @param file - File to upload
   * @param workspaceId - Workspace ID
   * @param onProgress - Optional progress callback
   * @returns Promise resolving to uploaded file data
   */
  async uploadWorkspaceFile(
    file: File,
    workspaceId: string,
    onProgress?: (percentage: number) => void
  ): Promise<WorkspaceFile> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Create cancel token
      const { cancelToken } = createCancelToken();
      
      // Configure request
      const config: AxiosRequestConfig = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        cancelToken,
        onUploadProgress: onProgress 
          ? (progressEvent) => {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / (progressEvent.total || 100)
              );
              onProgress(percentCompleted);
            }
          : undefined
      };
      
      const response = await axiosInstance.post<WorkspaceFile>(
        `/workspaces/${workspaceId}/files`,
        formData,
        config
      );
      
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  }
};

/**
 * Payment API methods
 */
export const paymentAPI = {
  /**
   * Get a list of payments for the current user
   * 
   * @param page - Page number
   * @param limit - Items per page
   * @returns Promise resolving to paginated payments list
   */
  async getPayments(
    page: number = 1, 
    limit: number = 20
  ): Promise<{ 
    payments: Payment[]; 
    total: number; 
    page: number; 
    limit: number 
  }> {
    try {
      const response = await axiosInstance.get<{ 
        payments: Payment[]; 
        total: number; 
        page: number; 
        limit: number 
      }>(`/payments?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Get a specific payment by ID
   * 
   * @param id - Payment ID
   * @returns Promise resolving to payment data
   */
  async getPaymentById(id: string): Promise<Payment> {
    try {
      const response = await axiosInstance.get<Payment>(`/payments/${id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Create a new payment
   * 
   * @param data - Payment data
   * @returns Promise resolving to created payment
   */
  async createPayment(data: PaymentDTO): Promise<Payment> {
    try {
      const response = await axiosInstance.post<Payment>(
        '/payments',
        data
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Get a list of contracts for the current user
   * 
   * @param page - Page number
   * @param limit - Items per page
   * @returns Promise resolving to paginated contracts list
   */
  async getContracts(
    page: number = 1, 
    limit: number = 10
  ): Promise<{ 
    contracts: Contract[]; 
    total: number; 
    page: number; 
    limit: number 
  }> {
    try {
      const response = await axiosInstance.get<{ 
        contracts: Contract[]; 
        total: number; 
        page: number; 
        limit: number 
      }>(`/contracts?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Get a specific contract by ID
   * 
   * @param id - Contract ID
   * @returns Promise resolving to contract data
   */
  async getContractById(id: string): Promise<Contract> {
    try {
      const response = await axiosInstance.get<Contract>(`/contracts/${id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Create a new contract
   * 
   * @param data - Contract creation data
   * @returns Promise resolving to created contract
   */
  async createContract(data: ContractCreateDTO): Promise<Contract> {
    try {
      const response = await axiosInstance.post<Contract>(
        '/contracts',
        data
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Update an existing contract
   * 
   * @param id - Contract ID
   * @param data - Updated contract data
   * @returns Promise resolving to updated contract
   */
  async updateContract(id: string, data: Partial<ContractCreateDTO>): Promise<Contract> {
    try {
      const response = await axiosInstance.put<Contract>(
        `/contracts/${id}`,
        data
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Get milestones for a contract
   * 
   * @param contractId - Contract ID
   * @returns Promise resolving to milestones list
   */
  async getMilestones(contractId: string): Promise<{ milestones: Milestone[] }> {
    try {
      const response = await axiosInstance.get<{ milestones: Milestone[] }>(
        `/contracts/${contractId}/milestones`
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Submit work for a milestone
   * 
   * @param contractId - Contract ID
   * @param milestoneId - Milestone ID
   * @param data - Submission data
   * @returns Promise resolving to updated milestone
   */
  async submitMilestone(
    contractId: string, 
    milestoneId: string, 
    data: MilestoneSubmitDTO
  ): Promise<Milestone> {
    try {
      const response = await axiosInstance.post<Milestone>(
        `/contracts/${contractId}/milestones/${milestoneId}/submit`,
        data
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Approve a submitted milestone
   * 
   * @param contractId - Contract ID
   * @param milestoneId - Milestone ID
   * @returns Promise resolving to updated milestone
   */
  async approveMilestone(contractId: string, milestoneId: string): Promise<Milestone> {
    try {
      const response = await axiosInstance.post<Milestone>(
        `/contracts/${contractId}/milestones/${milestoneId}/approve`
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Reject a submitted milestone
   * 
   * @param contractId - Contract ID
   * @param milestoneId - Milestone ID
   * @param reason - Rejection reason
   * @returns Promise resolving to updated milestone
   */
  async rejectMilestone(
    contractId: string, 
    milestoneId: string, 
    reason: string
  ): Promise<Milestone> {
    try {
      const response = await axiosInstance.post<Milestone>(
        `/contracts/${contractId}/milestones/${milestoneId}/reject`,
        { reason }
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Get saved payment methods for the current user
   * 
   * @returns Promise resolving to payment methods list
   */
  async getPaymentMethods(): Promise<{ paymentMethods: any[] }> {
    try {
      const response = await axiosInstance.get<{ paymentMethods: any[] }>(
        '/payment-methods'
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  },

  /**
   * Add a new payment method
   * 
   * @param paymentMethodId - Stripe Payment Method ID
   * @param isDefault - Whether this should be the default payment method
   * @returns Promise resolving to added payment method
   */
  async addPaymentMethod(
    paymentMethodId: string, 
    isDefault: boolean = false
  ): Promise<any> {
    try {
      const response = await axiosInstance.post<any>(
        '/payment-methods',
        { paymentMethodId, isDefault }
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error);
    }
  }
};

// Export the file upload utility for use with other components
export { uploadFile };