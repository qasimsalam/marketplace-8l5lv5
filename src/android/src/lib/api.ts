/**
 * Core API client library for the AI Talent Marketplace Android mobile application
 * 
 * This module provides typed API methods for all backend services, handles authentication,
 * request/response formatting, and error management. It organizes endpoints into domain-specific
 * modules aligned with the microservice architecture.
 * 
 * @version 1.0.0
 */

import axiosInstance, { createCancelToken, handleAxiosError } from './axios';
import type { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'; // axios v1.6.0

// Auth types
import {
  LoginFormValues,
  RegisterFormValues,
  AuthState,
  ForgotPasswordFormValues,
  ResetPasswordFormValues,
  TwoFactorVerifyFormValues,
  AuthProvider
} from '../types/auth.types';

// Job types
import {
  Job,
  JobFormValues,
  Proposal,
  ProposalFormValues,
  JobSearchParams,
  JobStatus,
  JobType
} from '../types/job.types';

// Profile types
import {
  FreelancerProfile,
  CompanyProfile,
  ProfileFormValues,
  CompanyFormValues,
  PortfolioItem,
  PortfolioItemFormValues,
  Experience,
  ExperienceFormValues,
  Education,
  EducationFormValues,
  Certification,
  CertificationFormValues
} from '../types/profile.types';

// Message types
import {
  Message,
  Conversation,
  CreateMessageDTO,
  CreateConversationDTO
} from '../types/message.types';

// Workspace types
import {
  Workspace,
  WorkspaceFile,
  Notebook,
  Cell,
  WorkspaceFormValues
} from '../types/workspace.types';

// Global API configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.talent-marketplace.ai/api/v1';
const API_TIMEOUT = 30000; // 30 seconds

/**
 * Helper function to serialize query parameters for API requests
 * 
 * @param params Record of parameters to serialize
 * @returns URL-encoded query string
 */
const serializeParams = (params: Record<string, any>): string => {
  if (!params || Object.keys(params).length === 0) return '';

  const parts: string[] = [];

  Object.entries(params).forEach(([key, value]) => {
    // Skip undefined, null, and empty values
    if (value === undefined || value === null || value === '') {
      return;
    }

    // Handle dates by converting to ISO strings
    if (value instanceof Date) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value.toISOString())}`);
      return;
    }

    // Handle arrays by joining with commas or using bracket notation
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return;
      }

      // For simple values, join with commas
      if (typeof value[0] === 'string' || typeof value[0] === 'number' || typeof value[0] === 'boolean') {
        parts.push(`${encodeURIComponent(key)}=${value.map(item => encodeURIComponent(String(item))).join(',')}`);
      } else {
        // For complex objects, use bracket notation
        value.forEach((item, index) => {
          parts.push(`${encodeURIComponent(`${key}[${index}]`)}=${encodeURIComponent(JSON.stringify(item))}`);
        });
      }
      return;
    }

    // Handle objects by serializing to JSON
    if (typeof value === 'object') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(value))}`);
      return;
    }

    // Handle primitive values
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  });

  return parts.length > 0 ? `?${parts.join('&')}` : '';
};

/**
 * Generic file upload function with progress tracking
 * 
 * @param file The file to upload (React Native file object)
 * @param endpoint API endpoint for the upload
 * @param additionalFormData Additional form data to include
 * @param onProgress Progress callback function
 * @returns Promise resolving to the uploaded file information
 */
export const uploadFile = async (
  file: { uri: string; name: string; type: string },
  endpoint: string,
  additionalFormData?: Record<string, any>,
  onProgress?: (progress: number) => void
): Promise<{ id: string; url: string }> => {
  try {
    // Create form data for file upload
    const formData = new FormData();
    
    // Add file to form data with appropriate structure for React Native
    formData.append('file', {
      uri: file.uri,
      name: file.name || 'file',
      type: file.type || 'application/octet-stream',
    } as any);
    
    // Add any additional form data
    if (additionalFormData) {
      Object.entries(additionalFormData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
        }
      });
    }
    
    // Create cancel token for request cancellation
    const { cancelToken, cancel } = createCancelToken();
    
    // Configure request with progress tracking
    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      cancelToken,
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    };
    
    // Make the upload request
    const response = await axiosInstance.post<{ id: string; url: string }>(
      endpoint,
      formData,
      config
    );
    
    return response.data;
  } catch (error) {
    // Handle and normalize the error
    throw handleAxiosError(error as AxiosError);
  }
};

/**
 * Authentication API methods
 */
export const authAPI = {
  /**
   * Log in with email and password
   * 
   * @param credentials Login credentials
   * @returns Promise resolving to authentication state
   */
  login: async (credentials: LoginFormValues): Promise<AuthState> => {
    try {
      const response = await axiosInstance.post<AuthState>('/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Register a new user
   * 
   * @param userData Registration form data
   * @returns Promise resolving to authentication state
   */
  register: async (userData: RegisterFormValues): Promise<AuthState> => {
    try {
      const response = await axiosInstance.post<AuthState>('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Log out the current user
   * 
   * @returns Promise resolving to success status
   */
  logout: async (): Promise<{ success: boolean }> => {
    try {
      const response = await axiosInstance.post<{ success: boolean }>('/auth/logout');
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Get the current authenticated user
   * 
   * @returns Promise resolving to authentication state
   */
  getCurrentUser: async (): Promise<AuthState> => {
    try {
      const response = await axiosInstance.get<AuthState>('/auth/me');
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Refresh the authentication token
   * 
   * @param refreshToken Optional refresh token (if not stored in secure storage)
   * @returns Promise resolving to new authentication tokens
   */
  refreshToken: async (refreshToken?: string): Promise<{ token: string; refreshToken: string }> => {
    try {
      const response = await axiosInstance.post<{ token: string; refreshToken: string }>(
        '/auth/refresh',
        refreshToken ? { refreshToken } : {}
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Initiate forgot password process
   * 
   * @param data Email information
   * @returns Promise resolving to success message
   */
  forgotPassword: async (data: ForgotPasswordFormValues): Promise<{ message: string }> => {
    try {
      const response = await axiosInstance.post<{ message: string }>('/auth/forgot-password', data);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Reset password with token
   * 
   * @param data Reset password form data with token
   * @returns Promise resolving to success message
   */
  resetPassword: async (data: ResetPasswordFormValues): Promise<{ message: string }> => {
    try {
      const response = await axiosInstance.post<{ message: string }>('/auth/reset-password', data);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Verify email with token
   * 
   * @param token Email verification token
   * @returns Promise resolving to success message
   */
  verifyEmail: async (token: string): Promise<{ message: string }> => {
    try {
      const response = await axiosInstance.post<{ message: string }>('/auth/verify-email', { token });
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Login with OAuth provider
   * 
   * @param provider Authentication provider
   * @param token Provider token
   * @returns Promise resolving to authentication state
   */
  loginWithProvider: async (provider: AuthProvider, token: string): Promise<AuthState> => {
    try {
      const response = await axiosInstance.post<AuthState>(`/auth/${provider}`, { token });
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Set up two-factor authentication
   * 
   * @returns Promise resolving to 2FA setup data
   */
  setupTwoFactor: async (): Promise<{ secret: string; qrCodeUrl: string }> => {
    try {
      const response = await axiosInstance.post<{ secret: string; qrCodeUrl: string }>('/auth/2fa/setup');
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Verify two-factor authentication code
   * 
   * @param data 2FA verification form data
   * @returns Promise resolving to verification result
   */
  verifyTwoFactor: async (data: TwoFactorVerifyFormValues): Promise<{ verified: boolean; token?: string }> => {
    try {
      const response = await axiosInstance.post<{ verified: boolean; token?: string }>('/auth/2fa/verify', data);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Disable two-factor authentication
   * 
   * @returns Promise resolving to success status
   */
  disableTwoFactor: async (): Promise<{ success: boolean }> => {
    try {
      const response = await axiosInstance.post<{ success: boolean }>('/auth/2fa/disable');
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Change user password
   * 
   * @param currentPassword Current password
   * @param newPassword New password
   * @returns Promise resolving to success message
   */
  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    try {
      const response = await axiosInstance.post<{ message: string }>('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
};

/**
 * Jobs API methods
 */
export const jobsAPI = {
  /**
   * Get job listings with optional filters
   * 
   * @param params Search and filter parameters
   * @returns Promise resolving to jobs array with pagination metadata
   */
  getJobs: async (params?: JobSearchParams): Promise<{ jobs: Job[]; totalCount: number; totalPages: number }> => {
    try {
      const queryString = params ? serializeParams(params) : '';
      const response = await axiosInstance.get<{ jobs: Job[]; totalCount: number; totalPages: number }>(
        `/jobs${queryString}`
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Get job by ID
   * 
   * @param id Job ID
   * @returns Promise resolving to job details
   */
  getJobById: async (id: string): Promise<Job> => {
    try {
      const response = await axiosInstance.get<Job>(`/jobs/${id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Create a new job
   * 
   * @param jobData Job creation form data
   * @returns Promise resolving to the created job
   */
  createJob: async (jobData: JobFormValues): Promise<Job> => {
    try {
      // Handle file uploads separately if included
      const jobDataWithoutFiles = { ...jobData };
      const attachments: string[] = [];
      
      if (jobData.attachments && jobData.attachments.length > 0) {
        delete jobDataWithoutFiles.attachments;
        
        // Upload each attachment
        for (const file of jobData.attachments) {
          const uploadedFile = await uploadFile(file, '/files/upload', { type: 'job_attachment' });
          attachments.push(uploadedFile.id);
        }
      }
      
      // Create job with attachment IDs
      const response = await axiosInstance.post<Job>('/jobs', {
        ...jobDataWithoutFiles,
        attachments,
      });
      
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Update an existing job
   * 
   * @param id Job ID
   * @param jobData Job update data
   * @returns Promise resolving to the updated job
   */
  updateJob: async (id: string, jobData: Partial<JobFormValues>): Promise<Job> => {
    try {
      // Handle file uploads separately if included
      const jobDataWithoutFiles = { ...jobData };
      const newAttachments: string[] = [];
      
      if (jobData.attachments && jobData.attachments.length > 0) {
        delete jobDataWithoutFiles.attachments;
        
        // Upload each new attachment
        for (const file of jobData.attachments) {
          // Only upload files that have a uri (new files) and don't have an id
          if (file.uri && !('id' in file)) {
            const uploadedFile = await uploadFile(file, '/files/upload', { type: 'job_attachment' });
            newAttachments.push(uploadedFile.id);
          } else if ('id' in file) {
            // Keep existing attachments
            newAttachments.push(file.id as string);
          }
        }
        
        // Add attachments back to the data
        jobDataWithoutFiles.attachments = newAttachments;
      }
      
      const response = await axiosInstance.put<Job>(`/jobs/${id}`, jobDataWithoutFiles);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Delete a job
   * 
   * @param id Job ID
   * @returns Promise resolving to success status
   */
  deleteJob: async (id: string): Promise<{ success: boolean }> => {
    try {
      const response = await axiosInstance.delete<{ success: boolean }>(`/jobs/${id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Submit a proposal for a job
   * 
   * @param proposal Proposal submission data
   * @returns Promise resolving to the created proposal
   */
  submitProposal: async (proposal: ProposalFormValues): Promise<Proposal> => {
    try {
      // Handle file uploads separately if included
      const proposalDataWithoutFiles = { ...proposal };
      const attachments: string[] = [];
      
      if (proposal.attachments && proposal.attachments.length > 0) {
        delete proposalDataWithoutFiles.attachments;
        
        // Upload each attachment
        for (const file of proposal.attachments) {
          const uploadedFile = await uploadFile(file, '/files/upload', { type: 'proposal_attachment' });
          attachments.push(uploadedFile.id);
        }
      }
      
      // Submit proposal with attachment IDs
      const response = await axiosInstance.post<Proposal>('/proposals', {
        ...proposalDataWithoutFiles,
        attachments,
      });
      
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Get proposals for a specific job
   * 
   * @param jobId Job ID
   * @returns Promise resolving to proposals array
   */
  getProposalsByJob: async (jobId: string): Promise<Proposal[]> => {
    try {
      const response = await axiosInstance.get<Proposal[]>(`/jobs/${jobId}/proposals`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Get proposal by ID
   * 
   * @param id Proposal ID
   * @returns Promise resolving to proposal details
   */
  getProposalById: async (id: string): Promise<Proposal> => {
    try {
      const response = await axiosInstance.get<Proposal>(`/proposals/${id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Update an existing proposal
   * 
   * @param id Proposal ID
   * @param proposalData Proposal update data
   * @returns Promise resolving to the updated proposal
   */
  updateProposal: async (id: string, proposalData: Partial<ProposalFormValues>): Promise<Proposal> => {
    try {
      // Handle file uploads separately if included
      const proposalDataWithoutFiles = { ...proposalData };
      let newAttachments: string[] | undefined;
      
      if (proposalData.attachments && proposalData.attachments.length > 0) {
        delete proposalDataWithoutFiles.attachments;
        newAttachments = [];
        
        // Upload each new attachment
        for (const file of proposalData.attachments) {
          // Only upload files that have a uri (new files) and don't have an id
          if (file.uri && !('id' in file)) {
            const uploadedFile = await uploadFile(file, '/files/upload', { type: 'proposal_attachment' });
            newAttachments.push(uploadedFile.id);
          } else if ('id' in file) {
            // Keep existing attachments
            newAttachments.push(file.id as string);
          }
        }
        
        // Add attachments back to the data
        proposalDataWithoutFiles.attachments = newAttachments;
      }
      
      const response = await axiosInstance.put<Proposal>(`/proposals/${id}`, proposalDataWithoutFiles);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Withdraw a proposal
   * 
   * @param id Proposal ID
   * @returns Promise resolving to success status
   */
  withdrawProposal: async (id: string): Promise<{ success: boolean }> => {
    try {
      const response = await axiosInstance.post<{ success: boolean }>(`/proposals/${id}/withdraw`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Get AI recommended jobs for the current user
   * 
   * @param limit Number of recommendations to retrieve
   * @returns Promise resolving to recommended jobs array
   */
  getRecommendedJobs: async (limit: number = 10): Promise<Job[]> => {
    try {
      const response = await axiosInstance.get<Job[]>(`/jobs/recommended?limit=${limit}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Get AI job matching scores for a specific job or freelancer
   * 
   * @param jobId Optional job ID
   * @param freelancerId Optional freelancer ID
   * @returns Promise resolving to job matching results
   */
  getJobMatches: async (jobId?: string, freelancerId?: string): Promise<{ matchScore: number; skills: { name: string; match: number }[] }> => {
    try {
      let url = '/jobs/matches';
      const params: Record<string, string> = {};
      
      if (jobId) params.jobId = jobId;
      if (freelancerId) params.freelancerId = freelancerId;
      
      const queryString = serializeParams(params);
      const response = await axiosInstance.get<{ matchScore: number; skills: { name: string; match: number }[] }>(
        `${url}${queryString}`
      );
      
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
};

/**
 * Profile API methods
 */
export const profileAPI = {
  /**
   * Get freelancer profile by ID or current user
   * 
   * @param id Optional freelancer ID (if not provided, returns current user's profile)
   * @returns Promise resolving to freelancer profile
   */
  getFreelancerProfile: async (id?: string): Promise<FreelancerProfile> => {
    try {
      const url = id ? `/profiles/freelancer/${id}` : '/profiles/freelancer/me';
      const response = await axiosInstance.get<FreelancerProfile>(url);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Get company profile by ID or current user
   * 
   * @param id Optional company ID (if not provided, returns current user's company)
   * @returns Promise resolving to company profile
   */
  getCompanyProfile: async (id?: string): Promise<CompanyProfile> => {
    try {
      const url = id ? `/profiles/company/${id}` : '/profiles/company/me';
      const response = await axiosInstance.get<CompanyProfile>(url);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Update freelancer profile
   * 
   * @param profileData Profile update data
   * @returns Promise resolving to updated freelancer profile
   */
  updateFreelancerProfile: async (profileData: ProfileFormValues): Promise<FreelancerProfile> => {
    try {
      const response = await axiosInstance.put<FreelancerProfile>('/profiles/freelancer/me', profileData);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Update company profile
   * 
   * @param profileData Company profile update data
   * @returns Promise resolving to updated company profile
   */
  updateCompanyProfile: async (profileData: CompanyFormValues): Promise<CompanyProfile> => {
    try {
      const response = await axiosInstance.put<CompanyProfile>('/profiles/company/me', profileData);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Upload profile image
   * 
   * @param imageUri Local URI of the image file
   * @param onProgress Optional progress callback
   * @returns Promise resolving to the image URL
   */
  uploadProfileImage: async (
    imageUri: string,
    onProgress?: (progress: number) => void
  ): Promise<{ avatarUrl: string }> => {
    try {
      // Get file name from URI
      const uriParts = imageUri.split('/');
      const name = uriParts[uriParts.length - 1];
      
      // Get file type from extension
      const extParts = name.split('.');
      const type = extParts.length > 1 ? `image/${extParts[extParts.length - 1]}` : 'image/jpeg';
      
      // Upload image file
      const uploadedFile = await uploadFile(
        { uri: imageUri, name, type },
        '/profiles/upload-avatar',
        {},
        onProgress
      );
      
      return { avatarUrl: uploadedFile.url };
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Add portfolio item
   * 
   * @param portfolioData Portfolio item data
   * @returns Promise resolving to the created portfolio item
   */
  addPortfolioItem: async (portfolioData: PortfolioItemFormValues): Promise<PortfolioItem> => {
    try {
      const response = await axiosInstance.post<PortfolioItem>('/profiles/portfolio', portfolioData);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Update portfolio item
   * 
   * @param id Portfolio item ID
   * @param portfolioData Portfolio item update data
   * @returns Promise resolving to the updated portfolio item
   */
  updatePortfolioItem: async (id: string, portfolioData: Partial<PortfolioItemFormValues>): Promise<PortfolioItem> => {
    try {
      const response = await axiosInstance.put<PortfolioItem>(`/profiles/portfolio/${id}`, portfolioData);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Delete portfolio item
   * 
   * @param id Portfolio item ID
   * @returns Promise resolving to success status
   */
  deletePortfolioItem: async (id: string): Promise<{ success: boolean }> => {
    try {
      const response = await axiosInstance.delete<{ success: boolean }>(`/profiles/portfolio/${id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Upload portfolio image
   * 
   * @param portfolioId Portfolio item ID
   * @param imageUri Local URI of the image file
   * @param onProgress Optional progress callback
   * @returns Promise resolving to the image URL
   */
  uploadPortfolioImage: async (
    portfolioId: string,
    imageUri: string,
    onProgress?: (progress: number) => void
  ): Promise<{ imageUrl: string }> => {
    try {
      // Get file name from URI
      const uriParts = imageUri.split('/');
      const name = uriParts[uriParts.length - 1];
      
      // Get file type from extension
      const extParts = name.split('.');
      const type = extParts.length > 1 ? `image/${extParts[extParts.length - 1]}` : 'image/jpeg';
      
      // Upload image file
      const uploadedFile = await uploadFile(
        { uri: imageUri, name, type },
        '/profiles/portfolio/upload-image',
        { portfolioId },
        onProgress
      );
      
      return { imageUrl: uploadedFile.url };
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Add work experience
   * 
   * @param experienceData Experience entry data
   * @returns Promise resolving to the created experience entry
   */
  addExperience: async (experienceData: ExperienceFormValues): Promise<Experience> => {
    try {
      const response = await axiosInstance.post<Experience>('/profiles/experience', experienceData);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Update work experience
   * 
   * @param id Experience entry ID
   * @param experienceData Experience update data
   * @returns Promise resolving to the updated experience entry
   */
  updateExperience: async (id: string, experienceData: Partial<ExperienceFormValues>): Promise<Experience> => {
    try {
      const response = await axiosInstance.put<Experience>(`/profiles/experience/${id}`, experienceData);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Delete work experience
   * 
   * @param id Experience entry ID
   * @returns Promise resolving to success status
   */
  deleteExperience: async (id: string): Promise<{ success: boolean }> => {
    try {
      const response = await axiosInstance.delete<{ success: boolean }>(`/profiles/experience/${id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Add education entry
   * 
   * @param educationData Education entry data
   * @returns Promise resolving to the created education entry
   */
  addEducation: async (educationData: EducationFormValues): Promise<Education> => {
    try {
      const response = await axiosInstance.post<Education>('/profiles/education', educationData);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Update education entry
   * 
   * @param id Education entry ID
   * @param educationData Education update data
   * @returns Promise resolving to the updated education entry
   */
  updateEducation: async (id: string, educationData: Partial<EducationFormValues>): Promise<Education> => {
    try {
      const response = await axiosInstance.put<Education>(`/profiles/education/${id}`, educationData);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Delete education entry
   * 
   * @param id Education entry ID
   * @returns Promise resolving to success status
   */
  deleteEducation: async (id: string): Promise<{ success: boolean }> => {
    try {
      const response = await axiosInstance.delete<{ success: boolean }>(`/profiles/education/${id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Add certification
   * 
   * @param certificationData Certification data
   * @returns Promise resolving to the created certification
   */
  addCertification: async (certificationData: CertificationFormValues): Promise<Certification> => {
    try {
      const response = await axiosInstance.post<Certification>('/profiles/certification', certificationData);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Update certification
   * 
   * @param id Certification ID
   * @param certificationData Certification update data
   * @returns Promise resolving to the updated certification
   */
  updateCertification: async (id: string, certificationData: Partial<CertificationFormValues>): Promise<Certification> => {
    try {
      const response = await axiosInstance.put<Certification>(`/profiles/certification/${id}`, certificationData);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Delete certification
   * 
   * @param id Certification ID
   * @returns Promise resolving to success status
   */
  deleteCertification: async (id: string): Promise<{ success: boolean }> => {
    try {
      const response = await axiosInstance.delete<{ success: boolean }>(`/profiles/certification/${id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
};

/**
 * Messaging API methods
 */
export const messagesAPI = {
  /**
   * Get user conversations
   * 
   * @param page Optional page number for pagination
   * @param limit Optional number of items per page
   * @returns Promise resolving to conversations array with pagination metadata
   */
  getConversations: async (page: number = 1, limit: number = 20): Promise<{ conversations: Conversation[]; totalCount: number; totalPages: number }> => {
    try {
      const response = await axiosInstance.get<{ conversations: Conversation[]; totalCount: number; totalPages: number }>(
        `/messages/conversations?page=${page}&limit=${limit}`
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Get conversation by ID
   * 
   * @param id Conversation ID
   * @returns Promise resolving to conversation details
   */
  getConversationById: async (id: string): Promise<Conversation> => {
    try {
      const response = await axiosInstance.get<Conversation>(`/messages/conversations/${id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Create a new conversation
   * 
   * @param conversationData Conversation creation data
   * @returns Promise resolving to the created conversation
   */
  createConversation: async (conversationData: CreateConversationDTO): Promise<Conversation> => {
    try {
      const response = await axiosInstance.post<Conversation>('/messages/conversations', conversationData);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Get messages for a conversation
   * 
   * @param conversationId Conversation ID
   * @param page Optional page number for pagination
   * @param limit Optional number of items per page
   * @returns Promise resolving to messages array with pagination metadata
   */
  getMessages: async (conversationId: string, page: number = 1, limit: number = 50): Promise<{ messages: Message[]; totalCount: number; totalPages: number }> => {
    try {
      const response = await axiosInstance.get<{ messages: Message[]; totalCount: number; totalPages: number }>(
        `/messages/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Send a message
   * 
   * @param messageData Message creation data
   * @returns Promise resolving to the created message
   */
  sendMessage: async (messageData: CreateMessageDTO): Promise<Message> => {
    try {
      const response = await axiosInstance.post<Message>('/messages', messageData);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Mark messages as read
   * 
   * @param conversationId Conversation ID
   * @returns Promise resolving to success status
   */
  markAsRead: async (conversationId: string): Promise<{ success: boolean }> => {
    try {
      const response = await axiosInstance.post<{ success: boolean }>(
        `/messages/conversations/${conversationId}/read`
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Get unread message count
   * 
   * @returns Promise resolving to unread count
   */
  getUnreadCount: async (): Promise<{ count: number }> => {
    try {
      const response = await axiosInstance.get<{ count: number }>('/messages/unread');
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Upload a file attachment for a message
   * 
   * @param file File to upload
   * @param onProgress Optional progress callback
   * @returns Promise resolving to the attachment information
   */
  uploadAttachment: async (
    file: { uri: string; name: string; type: string },
    onProgress?: (progress: number) => void
  ): Promise<{ id: string; url: string }> => {
    try {
      return await uploadFile(file, '/messages/upload-attachment', {}, onProgress);
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Delete a message
   * 
   * @param id Message ID
   * @returns Promise resolving to success status
   */
  deleteMessage: async (id: string): Promise<{ success: boolean }> => {
    try {
      const response = await axiosInstance.delete<{ success: boolean }>(`/messages/${id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
};

/**
 * Workspace API methods
 */
export const workspaceAPI = {
  /**
   * Get user workspaces
   * 
   * @param page Optional page number for pagination
   * @param limit Optional number of items per page
   * @returns Promise resolving to workspaces array with pagination metadata
   */
  getWorkspaces: async (page: number = 1, limit: number = 10): Promise<{ workspaces: Workspace[]; totalCount: number; totalPages: number }> => {
    try {
      const response = await axiosInstance.get<{ workspaces: Workspace[]; totalCount: number; totalPages: number }>(
        `/workspaces?page=${page}&limit=${limit}`
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Get workspace by ID
   * 
   * @param id Workspace ID
   * @returns Promise resolving to workspace details
   */
  getWorkspaceById: async (id: string): Promise<Workspace> => {
    try {
      const response = await axiosInstance.get<Workspace>(`/workspaces/${id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Create a new workspace
   * 
   * @param workspaceData Workspace creation data
   * @returns Promise resolving to the created workspace
   */
  createWorkspace: async (workspaceData: WorkspaceFormValues): Promise<Workspace> => {
    try {
      const response = await axiosInstance.post<Workspace>('/workspaces', workspaceData);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Update an existing workspace
   * 
   * @param id Workspace ID
   * @param workspaceData Workspace update data
   * @returns Promise resolving to the updated workspace
   */
  updateWorkspace: async (id: string, workspaceData: Partial<WorkspaceFormValues>): Promise<Workspace> => {
    try {
      const response = await axiosInstance.put<Workspace>(`/workspaces/${id}`, workspaceData);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Delete a workspace
   * 
   * @param id Workspace ID
   * @returns Promise resolving to success status
   */
  deleteWorkspace: async (id: string): Promise<{ success: boolean }> => {
    try {
      const response = await axiosInstance.delete<{ success: boolean }>(`/workspaces/${id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Get notebooks in a workspace
   * 
   * @param workspaceId Workspace ID
   * @returns Promise resolving to notebooks array
   */
  getNotebooks: async (workspaceId: string): Promise<Notebook[]> => {
    try {
      const response = await axiosInstance.get<Notebook[]>(`/workspaces/${workspaceId}/notebooks`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Get notebook by ID
   * 
   * @param id Notebook ID
   * @returns Promise resolving to notebook details
   */
  getNotebookById: async (id: string): Promise<Notebook> => {
    try {
      const response = await axiosInstance.get<Notebook>(`/workspaces/notebooks/${id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Create a new notebook
   * 
   * @param workspaceId Workspace ID
   * @param name Notebook name
   * @param description Notebook description
   * @param kernelName Optional kernel name (default: 'python3')
   * @returns Promise resolving to the created notebook
   */
  createNotebook: async (workspaceId: string, name: string, description: string, kernelName: string = 'python3'): Promise<Notebook> => {
    try {
      const response = await axiosInstance.post<Notebook>(`/workspaces/${workspaceId}/notebooks`, {
        name,
        description,
        kernelName,
      });
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Update an existing notebook
   * 
   * @param id Notebook ID
   * @param name New notebook name
   * @param description New notebook description
   * @returns Promise resolving to the updated notebook
   */
  updateNotebook: async (id: string, name: string, description: string): Promise<Notebook> => {
    try {
      const response = await axiosInstance.put<Notebook>(`/workspaces/notebooks/${id}`, {
        name,
        description,
      });
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Delete a notebook
   * 
   * @param id Notebook ID
   * @returns Promise resolving to success status
   */
  deleteNotebook: async (id: string): Promise<{ success: boolean }> => {
    try {
      const response = await axiosInstance.delete<{ success: boolean }>(`/workspaces/notebooks/${id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Execute a notebook cell
   * 
   * @param notebookId Notebook ID
   * @param cellId Cell ID
   * @returns Promise resolving to the executed cell with outputs
   */
  executeCell: async (notebookId: string, cellId: string): Promise<Cell> => {
    try {
      const response = await axiosInstance.post<Cell>(`/workspaces/notebooks/${notebookId}/cells/${cellId}/execute`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Get files in a workspace
   * 
   * @param workspaceId Workspace ID
   * @returns Promise resolving to files array
   */
  getFiles: async (workspaceId: string): Promise<WorkspaceFile[]> => {
    try {
      const response = await axiosInstance.get<WorkspaceFile[]>(`/workspaces/${workspaceId}/files`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Upload a file to a workspace
   * 
   * @param workspaceId Workspace ID
   * @param file File to upload
   * @param onProgress Optional progress callback
   * @returns Promise resolving to the workspace file information
   */
  uploadWorkspaceFile: async (
    workspaceId: string,
    file: { uri: string; name: string; type: string },
    onProgress?: (progress: number) => void
  ): Promise<WorkspaceFile> => {
    try {
      const uploadedFile = await uploadFile(
        file,
        `/workspaces/${workspaceId}/files/upload`,
        {},
        onProgress
      );
      
      const response = await axiosInstance.get<WorkspaceFile>(`/workspaces/files/${uploadedFile.id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Delete a file from a workspace
   * 
   * @param fileId File ID
   * @returns Promise resolving to success status
   */
  deleteFile: async (fileId: string): Promise<{ success: boolean }> => {
    try {
      const response = await axiosInstance.delete<{ success: boolean }>(`/workspaces/files/${fileId}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
};

/**
 * Payment API methods
 */
export const paymentAPI = {
  /**
   * Get payments with optional filters
   * 
   * @param page Optional page number for pagination
   * @param limit Optional number of items per page
   * @returns Promise resolving to payments array with pagination metadata
   */
  getPayments: async (page: number = 1, limit: number = 20): Promise<{ payments: any[]; totalCount: number; totalPages: number }> => {
    try {
      const response = await axiosInstance.get<{ payments: any[]; totalCount: number; totalPages: number }>(
        `/payments?page=${page}&limit=${limit}`
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Get payment by ID
   * 
   * @param id Payment ID
   * @returns Promise resolving to payment details
   */
  getPaymentById: async (id: string): Promise<any> => {
    try {
      const response = await axiosInstance.get<any>(`/payments/${id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Create a new payment
   * 
   * @param paymentData Payment creation data
   * @returns Promise resolving to the created payment
   */
  createPayment: async (paymentData: any): Promise<any> => {
    try {
      const response = await axiosInstance.post<any>('/payments', paymentData);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Get contracts with optional filters
   * 
   * @param page Optional page number for pagination
   * @param limit Optional number of items per page
   * @returns Promise resolving to contracts array with pagination metadata
   */
  getContracts: async (page: number = 1, limit: number = 20): Promise<{ contracts: any[]; totalCount: number; totalPages: number }> => {
    try {
      const response = await axiosInstance.get<{ contracts: any[]; totalCount: number; totalPages: number }>(
        `/contracts?page=${page}&limit=${limit}`
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Get contract by ID
   * 
   * @param id Contract ID
   * @returns Promise resolving to contract details
   */
  getContractById: async (id: string): Promise<any> => {
    try {
      const response = await axiosInstance.get<any>(`/contracts/${id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Create a new contract
   * 
   * @param contractData Contract creation data
   * @returns Promise resolving to the created contract
   */
  createContract: async (contractData: any): Promise<any> => {
    try {
      const response = await axiosInstance.post<any>('/contracts', contractData);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Update an existing contract
   * 
   * @param id Contract ID
   * @param contractData Contract update data
   * @returns Promise resolving to the updated contract
   */
  updateContract: async (id: string, contractData: any): Promise<any> => {
    try {
      const response = await axiosInstance.put<any>(`/contracts/${id}`, contractData);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Get milestones for a contract
   * 
   * @param contractId Contract ID
   * @returns Promise resolving to milestones array
   */
  getMilestones: async (contractId: string): Promise<any[]> => {
    try {
      const response = await axiosInstance.get<any[]>(`/contracts/${contractId}/milestones`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Get milestone by ID
   * 
   * @param id Milestone ID
   * @returns Promise resolving to milestone details
   */
  getMilestoneById: async (id: string): Promise<any> => {
    try {
      const response = await axiosInstance.get<any>(`/milestones/${id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Submit a milestone for approval
   * 
   * @param id Milestone ID
   * @param submissionData Submission data
   * @returns Promise resolving to the updated milestone
   */
  submitMilestone: async (id: string, submissionData: any): Promise<any> => {
    try {
      const response = await axiosInstance.post<any>(`/milestones/${id}/submit`, submissionData);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Approve a milestone
   * 
   * @param id Milestone ID
   * @returns Promise resolving to the updated milestone
   */
  approveMilestone: async (id: string): Promise<any> => {
    try {
      const response = await axiosInstance.post<any>(`/milestones/${id}/approve`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Reject a milestone
   * 
   * @param id Milestone ID
   * @param rejectionReason Reason for rejection
   * @returns Promise resolving to the updated milestone
   */
  rejectMilestone: async (id: string, rejectionReason: string): Promise<any> => {
    try {
      const response = await axiosInstance.post<any>(`/milestones/${id}/reject`, { rejectionReason });
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Get payment methods for the current user
   * 
   * @returns Promise resolving to payment methods array
   */
  getPaymentMethods: async (): Promise<any[]> => {
    try {
      const response = await axiosInstance.get<any[]>('/payments/methods');
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Add a payment method
   * 
   * @param paymentMethodData Payment method data
   * @returns Promise resolving to the created payment method
   */
  addPaymentMethod: async (paymentMethodData: any): Promise<any> => {
    try {
      const response = await axiosInstance.post<any>('/payments/methods', paymentMethodData);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Remove a payment method
   * 
   * @param id Payment method ID
   * @returns Promise resolving to success status
   */
  removePaymentMethod: async (id: string): Promise<{ success: boolean }> => {
    try {
      const response = await axiosInstance.delete<{ success: boolean }>(`/payments/methods/${id}`);
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Get payment transactions
   * 
   * @param page Optional page number for pagination
   * @param limit Optional number of items per page
   * @returns Promise resolving to transactions array with pagination metadata
   */
  getTransactions: async (page: number = 1, limit: number = 20): Promise<{ transactions: any[]; totalCount: number; totalPages: number }> => {
    try {
      const response = await axiosInstance.get<{ transactions: any[]; totalCount: number; totalPages: number }>(
        `/payments/transactions?page=${page}&limit=${limit}`
      );
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Release funds from escrow
   * 
   * @param milestoneId Milestone ID
   * @returns Promise resolving to the payment result
   */
  releaseEscrow: async (milestoneId: string): Promise<any> => {
    try {
      const response = await axiosInstance.post<any>(`/payments/release-escrow`, { milestoneId });
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
  
  /**
   * Create a payment dispute
   * 
   * @param paymentId Payment ID
   * @param reason Dispute reason
   * @returns Promise resolving to the created dispute
   */
  createDispute: async (paymentId: string, reason: string): Promise<any> => {
    try {
      const response = await axiosInstance.post<any>(`/payments/disputes`, { paymentId, reason });
      return response.data;
    } catch (error) {
      throw handleAxiosError(error as AxiosError);
    }
  },
};

// Export utility functions
export { serializeParams };