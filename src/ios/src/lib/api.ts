/**
 * API Client for iOS Mobile Application
 * 
 * This module provides a comprehensive interface for making API requests to the 
 * AI Talent Marketplace backend services. It abstracts HTTP communication details
 * and provides type-safe API methods organized by feature categories.
 * 
 * @version 1.0.0
 */

import { Platform, FormData } from 'react-native'; // v0.72.x
import axiosInstance, { handleApiError, API_BASE_URL } from './axios';

// Import auth-related types
import { 
  LoginFormValues, 
  RegisterFormValues,
  AuthProvider 
} from '../types/auth.types';

// Import user-related types
import { User } from '../../../backend/shared/src/types/user.types';

// Import job-related types
import { 
  JobFormValues, 
  ProposalFormValues,
  Job, 
  Proposal, 
  JobSearchParams 
} from '../types/job.types';

// Import profile-related types
import {
  ProfileFormValues,
  FreelancerProfile,
  CompanyProfile,
  PortfolioItemFormValues,
  ExperienceFormValues,
  EducationFormValues,
  CertificationFormValues,
  PortfolioItem,
  Experience,
  Education,
  Certification
} from '../types/profile.types';

// Import message-related types
import {
  Conversation,
  Message,
  CreateMessageDTO,
  CreateConversationDTO,
  FileAttachment
} from '../types/message.types';

// API constants
const API_VERSION = 'v1';
const PAGINATION_DEFAULT_LIMIT = 20;
const FILE_UPLOAD_MAX_SIZE = 10 * 1024 * 1024; // 10MB

// Additional interfaces needed for the API client
interface ResetPasswordFormValues {
  token: string;
  password: string;
  confirmPassword: string;
}

interface ChangePasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface Workspace {
  id: string;
  name: string;
  description: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Notebook {
  id: string;
  name: string;
  content: string;
  workspaceId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface NotebookFormValues {
  name: string;
  content?: string;
}

interface File {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  workspaceId: string;
  uploadedBy: string;
  createdAt: Date;
}

interface PaymentMethod {
  id: string;
  type: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  createdAt: Date;
}

interface PaymentMethodFormValues {
  paymentMethodId: string;
  isDefault?: boolean;
}

interface Transaction {
  id: string;
  amount: number;
  status: string;
  type: string;
  description: string;
  fromUserId: string;
  toUserId: string;
  contractId: string;
  milestoneId: string;
  date: Date;
  createdAt: Date;
}

interface Milestone {
  id: string;
  contractId: string;
  title: string;
  description: string;
  amount: number;
  status: string;
  dueDate: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Authentication API methods
 */
const auth = {
  /**
   * Authenticates a user with email and password
   * 
   * @param credentials - Login credentials
   * @returns Authentication result with user data and tokens
   */
  login: async (credentials: LoginFormValues): Promise<{ user: User; token: string; refreshToken: string }> => {
    try {
      return await axiosInstance.post(`/auth/login`, credentials);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Registers a new user account
   * 
   * @param userData - Registration form data
   * @returns Registration result with user data and tokens
   */
  register: async (userData: RegisterFormValues): Promise<{ user: User; token: string; refreshToken: string }> => {
    try {
      return await axiosInstance.post(`/auth/register`, userData);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Refreshes an expired authentication token
   * 
   * @param refreshToken - The refresh token to use
   * @returns New authentication and refresh tokens
   */
  refreshToken: async (refreshToken: string): Promise<{ token: string; refreshToken: string }> => {
    try {
      return await axiosInstance.post(`/auth/refresh`, { refreshToken });
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Logs out the current user
   */
  logout: async (): Promise<void> => {
    try {
      await axiosInstance.post(`/auth/logout`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Initiates the password recovery process
   * 
   * @param email - User's email address
   * @returns Result of the password recovery request
   */
  forgotPassword: async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      return await axiosInstance.post(`/auth/forgot-password`, { email });
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Resets the user's password using a reset token
   * 
   * @param data - Reset password form data
   * @returns Result of the password reset
   */
  resetPassword: async (data: ResetPasswordFormValues): Promise<{ success: boolean; message: string }> => {
    try {
      return await axiosInstance.post(`/auth/reset-password`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Changes the authenticated user's password
   * 
   * @param data - Change password form data
   * @returns Result of the password change
   */
  changePassword: async (data: ChangePasswordFormValues): Promise<{ success: boolean; message: string }> => {
    try {
      return await axiosInstance.put(`/auth/change-password`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Sets up two-factor authentication for the user
   * 
   * @returns 2FA setup information
   */
  setupTwoFactor: async (): Promise<{ secret: string; qrCodeUrl: string }> => {
    try {
      return await axiosInstance.post(`/auth/2fa/setup`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Verifies and enables two-factor authentication
   * 
   * @param code - Verification code from authenticator app
   */
  verifyTwoFactor: async (code: string): Promise<void> => {
    try {
      await axiosInstance.post(`/auth/2fa/verify`, { code });
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Disables two-factor authentication for the user
   * 
   * @param code - Verification code from authenticator app
   */
  disableTwoFactor: async (code: string): Promise<void> => {
    try {
      await axiosInstance.post(`/auth/2fa/disable`, { code });
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Handles OAuth authentication with third-party providers
   * 
   * @param provider - The authentication provider
   * @param code - The authorization code
   * @param redirectUri - The redirect URI used in the OAuth flow
   * @returns Authentication result with user data and tokens
   */
  loginWithProvider: async (
    provider: AuthProvider,
    code: string,
    redirectUri: string
  ): Promise<{ user: User; token: string; refreshToken: string }> => {
    try {
      return await axiosInstance.post(`/auth/social-login`, {
        provider,
        code,
        redirectUri
      });
    } catch (error) {
      throw handleApiError(error);
    }
  }
};

/**
 * Jobs API methods
 */
const jobs = {
  /**
   * Retrieves jobs matching the provided search parameters
   * 
   * @param params - Job search parameters
   * @returns Paginated job results
   */
  getJobs: async (params: JobSearchParams): Promise<{ jobs: Job[]; totalCount: number; currentPage: number; totalPages: number }> => {
    try {
      return await axiosInstance.get(`/jobs`, { params });
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Retrieves a specific job by ID
   * 
   * @param id - Job ID
   * @returns Job details
   */
  getJob: async (id: string): Promise<Job> => {
    try {
      return await axiosInstance.get(`/jobs/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Creates a new job posting
   * 
   * @param jobData - Job form data
   * @returns Created job details
   */
  createJob: async (jobData: JobFormValues): Promise<Job> => {
    try {
      // Handle file attachments with FormData for React Native
      if (jobData.attachments && jobData.attachments.length > 0) {
        const formData = new FormData();
        
        // Add all regular fields to formData
        Object.keys(jobData).forEach(key => {
          if (key !== 'attachments') {
            // Handle arrays
            if (Array.isArray(jobData[key])) {
              jobData[key].forEach((item, index) => {
                formData.append(`${key}[${index}]`, item);
              });
            } else {
              formData.append(key, jobData[key]);
            }
          }
        });
        
        // Add attachments
        jobData.attachments.forEach((file, index) => {
          formData.append(`attachments[${index}]`, {
            uri: file.uri,
            type: file.type,
            name: file.name
          });
        });
        
        return await axiosInstance.post(`/jobs`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }
      
      // No attachments, regular JSON request
      return await axiosInstance.post(`/jobs`, jobData);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Updates an existing job posting
   * 
   * @param id - Job ID
   * @param jobData - Updated job data
   * @returns Updated job details
   */
  updateJob: async (id: string, jobData: Partial<JobFormValues>): Promise<Job> => {
    try {
      // Handle file attachments with FormData for React Native
      if (jobData.attachments && jobData.attachments.length > 0) {
        const formData = new FormData();
        
        // Add all regular fields to formData
        Object.keys(jobData).forEach(key => {
          if (key !== 'attachments') {
            // Handle arrays
            if (Array.isArray(jobData[key])) {
              jobData[key].forEach((item, index) => {
                formData.append(`${key}[${index}]`, item);
              });
            } else {
              formData.append(key, jobData[key]);
            }
          }
        });
        
        // Add attachments
        jobData.attachments.forEach((file, index) => {
          formData.append(`attachments[${index}]`, {
            uri: file.uri,
            type: file.type,
            name: file.name
          });
        });
        
        return await axiosInstance.put(`/jobs/${id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }
      
      // No attachments, regular JSON request
      return await axiosInstance.put(`/jobs/${id}`, jobData);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Deletes a job posting
   * 
   * @param id - Job ID
   * @returns Success indicator
   */
  deleteJob: async (id: string): Promise<boolean> => {
    try {
      const response = await axiosInstance.delete(`/jobs/${id}`);
      return response.success || true;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Retrieves proposals for a specific job
   * 
   * @param jobId - Job ID
   * @returns List of proposals
   */
  getProposals: async (jobId: string): Promise<Proposal[]> => {
    try {
      return await axiosInstance.get(`/jobs/${jobId}/proposals`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Retrieves a specific proposal by ID
   * 
   * @param id - Proposal ID
   * @returns Proposal details
   */
  getProposal: async (id: string): Promise<Proposal> => {
    try {
      return await axiosInstance.get(`/proposals/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Submits a proposal for a job
   * 
   * @param proposal - Proposal form data
   * @returns Submitted proposal details
   */
  submitProposal: async (proposal: ProposalFormValues): Promise<Proposal> => {
    try {
      // Handle file attachments with FormData for React Native
      if (proposal.attachments && proposal.attachments.length > 0) {
        const formData = new FormData();
        
        // Add all regular fields to formData
        Object.keys(proposal).forEach(key => {
          if (key !== 'attachments') {
            if (key === 'milestones' && Array.isArray(proposal.milestones)) {
              proposal.milestones.forEach((milestone, index) => {
                Object.keys(milestone).forEach(mKey => {
                  formData.append(`milestones[${index}][${mKey}]`, milestone[mKey]);
                });
              });
            } else if (Array.isArray(proposal[key])) {
              proposal[key].forEach((item, index) => {
                formData.append(`${key}[${index}]`, item);
              });
            } else {
              formData.append(key, proposal[key]);
            }
          }
        });
        
        // Add attachments
        proposal.attachments.forEach((file, index) => {
          formData.append(`attachments[${index}]`, {
            uri: file.uri,
            type: file.type,
            name: file.name
          });
        });
        
        return await axiosInstance.post(`/proposals`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }
      
      // No attachments, regular JSON request
      return await axiosInstance.post(`/proposals`, proposal);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Updates an existing proposal
   * 
   * @param id - Proposal ID
   * @param proposal - Updated proposal data
   * @returns Updated proposal details
   */
  updateProposal: async (id: string, proposal: Partial<ProposalFormValues>): Promise<Proposal> => {
    try {
      // Handle file attachments with FormData for React Native if they exist
      if (proposal.attachments && proposal.attachments.length > 0) {
        const formData = new FormData();
        
        // Add all regular fields to formData
        Object.keys(proposal).forEach(key => {
          if (key !== 'attachments') {
            if (key === 'milestones' && Array.isArray(proposal.milestones)) {
              proposal.milestones.forEach((milestone, index) => {
                Object.keys(milestone).forEach(mKey => {
                  formData.append(`milestones[${index}][${mKey}]`, milestone[mKey]);
                });
              });
            } else if (Array.isArray(proposal[key])) {
              proposal[key].forEach((item, index) => {
                formData.append(`${key}[${index}]`, item);
              });
            } else {
              formData.append(key, proposal[key]);
            }
          }
        });
        
        // Add attachments
        proposal.attachments.forEach((file, index) => {
          formData.append(`attachments[${index}]`, {
            uri: file.uri,
            type: file.type,
            name: file.name
          });
        });
        
        return await axiosInstance.put(`/proposals/${id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }
      
      // No attachments, regular JSON request
      return await axiosInstance.put(`/proposals/${id}`, proposal);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Withdraws a submitted proposal
   * 
   * @param id - Proposal ID
   * @returns Updated proposal with withdrawn status
   */
  withdrawProposal: async (id: string): Promise<Proposal> => {
    try {
      return await axiosInstance.post(`/proposals/${id}/withdraw`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Retrieves job recommendations based on user profile
   * 
   * @returns List of recommended jobs
   */
  getRecommendedJobs: async (): Promise<Job[]> => {
    try {
      return await axiosInstance.get(`/jobs/recommended`);
    } catch (error) {
      throw handleApiError(error);
    }
  }
};

/**
 * Profiles API methods
 */
const profiles = {
  /**
   * Retrieves a freelancer profile by ID or current user
   * 
   * @param id - Optional user ID. If not provided, returns current user's profile
   * @returns Freelancer profile details
   */
  getFreelancerProfile: async (id?: string): Promise<FreelancerProfile> => {
    try {
      const endpoint = id ? `/profiles/freelancer/${id}` : '/profiles/freelancer';
      return await axiosInstance.get(endpoint);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Retrieves a company profile by ID or current user
   * 
   * @param id - Optional user ID. If not provided, returns current user's profile
   * @returns Company profile details
   */
  getCompanyProfile: async (id?: string): Promise<CompanyProfile> => {
    try {
      const endpoint = id ? `/profiles/company/${id}` : '/profiles/company';
      return await axiosInstance.get(endpoint);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Updates a freelancer profile
   * 
   * @param data - Profile form data
   * @returns Updated freelancer profile
   */
  updateFreelancerProfile: async (data: ProfileFormValues): Promise<FreelancerProfile> => {
    try {
      // Handle file upload for avatar if provided
      if (data.avatar) {
        const formData = new FormData();
        
        // Add all regular fields to formData
        Object.keys(data).forEach(key => {
          if (key !== 'avatar') {
            if (Array.isArray(data[key])) {
              data[key].forEach((item, index) => {
                formData.append(`${key}[${index}]`, item);
              });
            } else {
              formData.append(key, data[key]);
            }
          }
        });
        
        // Add avatar
        formData.append('avatar', {
          uri: data.avatar.uri,
          type: data.avatar.type,
          name: data.avatar.name
        });
        
        return await axiosInstance.put(`/profiles/freelancer`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }
      
      // No avatar update, regular JSON request
      return await axiosInstance.put(`/profiles/freelancer`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Updates a company profile
   * 
   * @param data - Company form data
   * @returns Updated company profile
   */
  updateCompanyProfile: async (data: CompanyFormValues): Promise<CompanyProfile> => {
    try {
      // Handle file upload for logo if provided
      if (data.logo) {
        const formData = new FormData();
        
        // Add all regular fields to formData
        Object.keys(data).forEach(key => {
          if (key !== 'logo') {
            if (Array.isArray(data[key])) {
              data[key].forEach((item, index) => {
                formData.append(`${key}[${index}]`, item);
              });
            } else {
              formData.append(key, data[key]);
            }
          }
        });
        
        // Add logo
        formData.append('logo', {
          uri: data.logo.uri,
          type: data.logo.type,
          name: data.logo.name
        });
        
        return await axiosInstance.put(`/profiles/company`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }
      
      // No logo update, regular JSON request
      return await axiosInstance.put(`/profiles/company`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Uploads a profile image
   * 
   * @param file - Image file object
   * @returns URL of the uploaded image
   */
  uploadProfileImage: async (file: { uri: string; type: string; name: string }): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: file.uri,
        type: file.type,
        name: file.name
      });
      
      const response = await axiosInstance.post(`/profiles/upload-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.imageUrl;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Adds a portfolio item to the profile
   * 
   * @param data - Portfolio item form data
   * @returns Added portfolio item
   */
  addPortfolioItem: async (data: PortfolioItemFormValues): Promise<PortfolioItem> => {
    try {
      // Handle file upload for portfolio item image if provided
      if (data.image) {
        const formData = new FormData();
        
        // Add all regular fields to formData
        Object.keys(data).forEach(key => {
          if (key !== 'image') {
            if (Array.isArray(data[key])) {
              data[key].forEach((item, index) => {
                formData.append(`${key}[${index}]`, item);
              });
            } else {
              formData.append(key, data[key]);
            }
          }
        });
        
        // Add image
        formData.append('image', {
          uri: data.image.uri,
          type: data.image.type,
          name: data.image.name
        });
        
        return await axiosInstance.post(`/profiles/portfolio`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }
      
      // No image, regular JSON request
      return await axiosInstance.post(`/profiles/portfolio`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Updates a portfolio item
   * 
   * @param id - Portfolio item ID
   * @param data - Updated portfolio item data
   * @returns Updated portfolio item
   */
  updatePortfolioItem: async (id: string, data: PortfolioItemFormValues): Promise<PortfolioItem> => {
    try {
      // Handle file upload for portfolio item image if provided
      if (data.image) {
        const formData = new FormData();
        
        // Add all regular fields to formData
        Object.keys(data).forEach(key => {
          if (key !== 'image') {
            if (Array.isArray(data[key])) {
              data[key].forEach((item, index) => {
                formData.append(`${key}[${index}]`, item);
              });
            } else {
              formData.append(key, data[key]);
            }
          }
        });
        
        // Add image
        formData.append('image', {
          uri: data.image.uri,
          type: data.image.type,
          name: data.image.name
        });
        
        return await axiosInstance.put(`/profiles/portfolio/${id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }
      
      // No image update, regular JSON request
      return await axiosInstance.put(`/profiles/portfolio/${id}`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Deletes a portfolio item
   * 
   * @param id - Portfolio item ID
   * @returns Success indicator
   */
  deletePortfolioItem: async (id: string): Promise<boolean> => {
    try {
      const response = await axiosInstance.delete(`/profiles/portfolio/${id}`);
      return response.success || true;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Adds an experience entry to the profile
   * 
   * @param data - Experience form data
   * @returns Added experience entry
   */
  addExperience: async (data: ExperienceFormValues): Promise<Experience> => {
    try {
      return await axiosInstance.post(`/profiles/experience`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Updates an experience entry
   * 
   * @param id - Experience entry ID
   * @param data - Updated experience data
   * @returns Updated experience entry
   */
  updateExperience: async (id: string, data: ExperienceFormValues): Promise<Experience> => {
    try {
      return await axiosInstance.put(`/profiles/experience/${id}`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Deletes an experience entry
   * 
   * @param id - Experience entry ID
   * @returns Success indicator
   */
  deleteExperience: async (id: string): Promise<boolean> => {
    try {
      const response = await axiosInstance.delete(`/profiles/experience/${id}`);
      return response.success || true;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Adds an education entry to the profile
   * 
   * @param data - Education form data
   * @returns Added education entry
   */
  addEducation: async (data: EducationFormValues): Promise<Education> => {
    try {
      return await axiosInstance.post(`/profiles/education`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Updates an education entry
   * 
   * @param id - Education entry ID
   * @param data - Updated education data
   * @returns Updated education entry
   */
  updateEducation: async (id: string, data: EducationFormValues): Promise<Education> => {
    try {
      return await axiosInstance.put(`/profiles/education/${id}`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Deletes an education entry
   * 
   * @param id - Education entry ID
   * @returns Success indicator
   */
  deleteEducation: async (id: string): Promise<boolean> => {
    try {
      const response = await axiosInstance.delete(`/profiles/education/${id}`);
      return response.success || true;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Adds a certification entry to the profile
   * 
   * @param data - Certification form data
   * @returns Added certification entry
   */
  addCertification: async (data: CertificationFormValues): Promise<Certification> => {
    try {
      return await axiosInstance.post(`/profiles/certification`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Updates a certification entry
   * 
   * @param id - Certification entry ID
   * @param data - Updated certification data
   * @returns Updated certification entry
   */
  updateCertification: async (id: string, data: CertificationFormValues): Promise<Certification> => {
    try {
      return await axiosInstance.put(`/profiles/certification/${id}`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Deletes a certification entry
   * 
   * @param id - Certification entry ID
   * @returns Success indicator
   */
  deleteCertification: async (id: string): Promise<boolean> => {
    try {
      const response = await axiosInstance.delete(`/profiles/certification/${id}`);
      return response.success || true;
    } catch (error) {
      throw handleApiError(error);
    }
  }
};

/**
 * Messages API methods
 */
const messages = {
  /**
   * Retrieves the user's conversations
   * 
   * @returns List of conversations
   */
  getConversations: async (): Promise<Conversation[]> => {
    try {
      return await axiosInstance.get(`/messages/conversations`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Retrieves a specific conversation by ID
   * 
   * @param id - Conversation ID
   * @returns Conversation details
   */
  getConversation: async (id: string): Promise<Conversation> => {
    try {
      return await axiosInstance.get(`/messages/conversations/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Creates a new conversation
   * 
   * @param data - Conversation creation data
   * @returns Created conversation
   */
  createConversation: async (data: CreateConversationDTO): Promise<Conversation> => {
    try {
      return await axiosInstance.post(`/messages/conversations`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Retrieves messages for a conversation
   * 
   * @param conversationId - Conversation ID
   * @param paginationParams - Pagination parameters
   * @returns Paginated messages
   */
  getMessages: async (
    conversationId: string,
    paginationParams: object = { page: 1, limit: PAGINATION_DEFAULT_LIMIT }
  ): Promise<{ messages: Message[]; totalCount: number; currentPage: number; totalPages: number }> => {
    try {
      return await axiosInstance.get(`/messages/conversations/${conversationId}/messages`, { 
        params: paginationParams 
      });
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Sends a message in a conversation
   * 
   * @param message - Message creation data
   * @returns Sent message details
   */
  sendMessage: async (message: CreateMessageDTO): Promise<Message> => {
    try {
      return await axiosInstance.post(`/messages`, message);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Uploads a file attachment for a message
   * 
   * @param file - File to upload
   * @returns Uploaded file attachment information
   */
  uploadAttachment: async (file: { uri: string; type: string; name: string }): Promise<FileAttachment> => {
    try {
      const formData = new FormData();
      
      formData.append('file', {
        uri: file.uri,
        type: file.type,
        name: file.name
      });
      
      return await axiosInstance.post(`/messages/attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Marks messages in a conversation as read
   * 
   * @param conversationId - Conversation ID
   */
  markAsRead: async (conversationId: string): Promise<void> => {
    try {
      await axiosInstance.put(`/messages/conversations/${conversationId}/read`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Sends typing status for a conversation
   * 
   * @param conversationId - Conversation ID
   * @param isTyping - Whether the user is typing
   */
  sendTypingStatus: async (conversationId: string, isTyping: boolean): Promise<void> => {
    try {
      await axiosInstance.post(`/messages/conversations/${conversationId}/typing`, { isTyping });
    } catch (error) {
      throw handleApiError(error);
    }
  }
};

/**
 * Workspace API methods
 */
const workspace = {
  /**
   * Retrieves the user's workspaces
   * 
   * @returns List of workspaces
   */
  getWorkspaces: async (): Promise<Workspace[]> => {
    try {
      return await axiosInstance.get(`/workspace`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Retrieves a specific workspace by ID
   * 
   * @param id - Workspace ID
   * @returns Workspace details
   */
  getWorkspace: async (id: string): Promise<Workspace> => {
    try {
      return await axiosInstance.get(`/workspace/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Retrieves Jupyter notebooks in a workspace
   * 
   * @param workspaceId - Workspace ID
   * @returns List of notebooks
   */
  getNotebooks: async (workspaceId: string): Promise<Notebook[]> => {
    try {
      return await axiosInstance.get(`/workspace/${workspaceId}/notebooks`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Retrieves a specific Jupyter notebook
   * 
   * @param workspaceId - Workspace ID
   * @param notebookId - Notebook ID
   * @returns Notebook details
   */
  getNotebook: async (workspaceId: string, notebookId: string): Promise<Notebook> => {
    try {
      return await axiosInstance.get(`/workspace/${workspaceId}/notebooks/${notebookId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Creates a new Jupyter notebook
   * 
   * @param workspaceId - Workspace ID
   * @param data - Notebook creation data
   * @returns Created notebook
   */
  createNotebook: async (workspaceId: string, data: NotebookFormValues): Promise<Notebook> => {
    try {
      return await axiosInstance.post(`/workspace/${workspaceId}/notebooks`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Retrieves files in a workspace
   * 
   * @param workspaceId - Workspace ID
   * @returns List of files
   */
  getFiles: async (workspaceId: string): Promise<File[]> => {
    try {
      return await axiosInstance.get(`/workspace/${workspaceId}/files`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Uploads a file to a workspace
   * 
   * @param workspaceId - Workspace ID
   * @param file - File to upload
   * @returns Uploaded file details
   */
  uploadFile: async (workspaceId: string, file: { uri: string; type: string; name: string }): Promise<File> => {
    try {
      const formData = new FormData();
      
      formData.append('file', {
        uri: file.uri,
        type: file.type,
        name: file.name
      });
      
      return await axiosInstance.post(`/workspace/${workspaceId}/files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Deletes a file from a workspace
   * 
   * @param workspaceId - Workspace ID
   * @param fileId - File ID
   * @returns Success indicator
   */
  deleteFile: async (workspaceId: string, fileId: string): Promise<boolean> => {
    try {
      const response = await axiosInstance.delete(`/workspace/${workspaceId}/files/${fileId}`);
      return response.success || true;
    } catch (error) {
      throw handleApiError(error);
    }
  }
};

/**
 * Payment API methods
 */
const payments = {
  /**
   * Retrieves the user's payment methods
   * 
   * @returns List of payment methods
   */
  getPaymentMethods: async (): Promise<PaymentMethod[]> => {
    try {
      return await axiosInstance.get(`/payments/methods`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Adds a new payment method
   * 
   * @param data - Payment method form data
   * @returns Added payment method
   */
  addPaymentMethod: async (data: PaymentMethodFormValues): Promise<PaymentMethod> => {
    try {
      return await axiosInstance.post(`/payments/methods`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Removes a payment method
   * 
   * @param id - Payment method ID
   * @returns Success indicator
   */
  removePaymentMethod: async (id: string): Promise<boolean> => {
    try {
      const response = await axiosInstance.delete(`/payments/methods/${id}`);
      return response.success || true;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Retrieves the user's payment transactions
   * 
   * @param filters - Filter parameters
   * @returns Paginated transactions
   */
  getTransactions: async (filters: object = {}): Promise<{ 
    transactions: Transaction[]; 
    totalCount: number; 
    currentPage: number; 
    totalPages: number 
  }> => {
    try {
      return await axiosInstance.get(`/payments/transactions`, { params: filters });
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Retrieves milestones for a contract
   * 
   * @param contractId - Contract ID
   * @returns List of milestones
   */
  getMilestones: async (contractId: string): Promise<Milestone[]> => {
    try {
      return await axiosInstance.get(`/contracts/${contractId}/milestones`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Releases payment for a milestone
   * 
   * @param milestoneId - Milestone ID
   * @returns Payment result
   */
  releaseMilestonePayment: async (milestoneId: string): Promise<{ 
    success: boolean; 
    transaction: Transaction 
  }> => {
    try {
      return await axiosInstance.post(`/payments/milestones/${milestoneId}/release`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Requests payment for a completed milestone
   * 
   * @param milestoneId - Milestone ID
   * @returns Request result
   */
  requestMilestonePayment: async (milestoneId: string): Promise<{ 
    success: boolean; 
    milestone: Milestone 
  }> => {
    try {
      return await axiosInstance.post(`/payments/milestones/${milestoneId}/request`);
    } catch (error) {
      throw handleApiError(error);
    }
  }
};

// API client object with all service categories
const api = {
  auth,
  jobs,
  profiles,
  messages,
  workspace,
  payments
};

export default api;