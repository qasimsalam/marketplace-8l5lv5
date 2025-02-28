/**
 * Custom React hook that provides comprehensive profile management functionality for the AI Talent Marketplace
 * Android application. Abstracts Redux state management and encapsulates API operations for profiles.
 * 
 * This hook provides functionality for:
 * - Retrieving and updating freelancer and company profiles
 * - Managing portfolio items
 * - Managing work experience entries
 * - Managing education records
 * - Managing professional certifications
 * - Uploading profile images
 * 
 * @version 1.0.0
 */

import { useCallback } from 'react'; // react ^18.2.0

// Import Redux hooks and actions
import { useAppDispatch, useAppSelector } from '../store';
import { 
  fetchFreelancerProfile, 
  fetchCompanyProfile, 
  updateFreelancerProfile as updateFreelancerProfileAction, 
  updateCompanyProfile as updateCompanyProfileAction, 
  uploadProfileImageThunk, 
  addPortfolioItemThunk, 
  updatePortfolioItemThunk, 
  deletePortfolioItemThunk, 
  addExperienceThunk, 
  updateExperienceThunk, 
  deleteExperienceThunk, 
  addEducationThunk, 
  updateEducationThunk, 
  deleteEducationThunk, 
  addCertificationThunk, 
  updateCertificationThunk, 
  deleteCertificationThunk,
  clearError
} from '../store/slices/profileSlice';

// Import auth hook
import { useAuth } from './useAuth';

// Import type definitions
import { 
  ProfileContextType, 
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
  CertificationFormValues,
  ProfileState
} from '../types/profile.types';
import { UserRole } from '../../../backend/shared/src/types/user.types';

/**
 * Custom React hook that provides profile management functionality
 * 
 * @returns Profile state and operations
 */
export function useProfile(): ProfileContextType {
  // Initialize Redux hooks
  const dispatch = useAppDispatch();
  const profileState = useAppSelector(state => state.profile);
  
  // Get current user and authentication state
  const auth = useAuth();
  
  /**
   * Fetches a freelancer profile by ID or the current user's profile
   * 
   * @param id Optional ID of the freelancer to fetch (if not provided, fetches current user's profile)
   * @returns Promise resolving to the freelancer profile
   */
  const getFreelancerProfile = useCallback(async (id?: string): Promise<FreelancerProfile> => {
    try {
      const result = await dispatch(fetchFreelancerProfile(id)).unwrap();
      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch freelancer profile');
    }
  }, [dispatch]);
  
  /**
   * Fetches a company profile by ID or the current user's company profile
   * 
   * @param id Optional ID of the company to fetch (if not provided, fetches current user's company)
   * @returns Promise resolving to the company profile
   */
  const getCompanyProfile = useCallback(async (id?: string): Promise<CompanyProfile> => {
    try {
      const result = await dispatch(fetchCompanyProfile(id)).unwrap();
      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch company profile');
    }
  }, [dispatch]);
  
  /**
   * Updates the current freelancer's profile
   * 
   * @param data Profile update data
   * @returns Promise resolving to the updated freelancer profile
   */
  const updateFreelancerProfile = useCallback(async (data: ProfileFormValues): Promise<FreelancerProfile> => {
    try {
      const result = await dispatch(updateFreelancerProfileAction(data)).unwrap();
      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update freelancer profile');
    }
  }, [dispatch]);
  
  /**
   * Updates the current company's profile
   * 
   * @param data Company profile update data
   * @returns Promise resolving to the updated company profile
   */
  const updateCompanyProfile = useCallback(async (data: CompanyFormValues): Promise<CompanyProfile> => {
    try {
      const result = await dispatch(updateCompanyProfileAction(data)).unwrap();
      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update company profile');
    }
  }, [dispatch]);
  
  /**
   * Uploads a profile image
   * 
   * @param imageUri Local URI of the image file on the Android device
   * @returns Promise resolving to the image URL
   */
  const uploadProfileImage = useCallback(async (imageUri: string): Promise<{ avatarUrl: string }> => {
    try {
      const result = await dispatch(uploadProfileImageThunk(imageUri)).unwrap();
      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to upload profile image');
    }
  }, [dispatch]);
  
  /**
   * Adds a portfolio item to the freelancer's profile
   * 
   * @param data Portfolio item data
   * @returns Promise resolving to the created portfolio item
   */
  const addPortfolioItem = useCallback(async (data: PortfolioItemFormValues): Promise<PortfolioItem> => {
    try {
      const result = await dispatch(addPortfolioItemThunk(data)).unwrap();
      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to add portfolio item');
    }
  }, [dispatch]);
  
  /**
   * Updates an existing portfolio item
   * 
   * @param id Portfolio item ID
   * @param data Portfolio item update data
   * @returns Promise resolving to the updated portfolio item
   */
  const updatePortfolioItem = useCallback(async (id: string, data: PortfolioItemFormValues): Promise<PortfolioItem> => {
    try {
      const result = await dispatch(updatePortfolioItemThunk({ id, data })).unwrap();
      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update portfolio item');
    }
  }, [dispatch]);
  
  /**
   * Deletes a portfolio item
   * 
   * @param id Portfolio item ID
   * @returns Promise resolving when the portfolio item is deleted
   */
  const deletePortfolioItem = useCallback(async (id: string): Promise<void> => {
    try {
      await dispatch(deletePortfolioItemThunk(id)).unwrap();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete portfolio item');
    }
  }, [dispatch]);
  
  /**
   * Adds a work experience entry to the freelancer's profile
   * 
   * @param data Experience entry data
   * @returns Promise resolving to the created experience entry
   */
  const addExperience = useCallback(async (data: ExperienceFormValues): Promise<Experience> => {
    try {
      const result = await dispatch(addExperienceThunk(data)).unwrap();
      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to add experience');
    }
  }, [dispatch]);
  
  /**
   * Updates an existing work experience entry
   * 
   * @param id Experience entry ID
   * @param data Experience update data
   * @returns Promise resolving to the updated experience entry
   */
  const updateExperience = useCallback(async (id: string, data: ExperienceFormValues): Promise<Experience> => {
    try {
      const result = await dispatch(updateExperienceThunk({ id, data })).unwrap();
      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update experience');
    }
  }, [dispatch]);
  
  /**
   * Deletes a work experience entry
   * 
   * @param id Experience entry ID
   * @returns Promise resolving when the experience entry is deleted
   */
  const deleteExperience = useCallback(async (id: string): Promise<void> => {
    try {
      await dispatch(deleteExperienceThunk(id)).unwrap();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete experience');
    }
  }, [dispatch]);
  
  /**
   * Adds an education entry to the freelancer's profile
   * 
   * @param data Education entry data
   * @returns Promise resolving to the created education entry
   */
  const addEducation = useCallback(async (data: EducationFormValues): Promise<Education> => {
    try {
      const result = await dispatch(addEducationThunk(data)).unwrap();
      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to add education');
    }
  }, [dispatch]);
  
  /**
   * Updates an existing education entry
   * 
   * @param id Education entry ID
   * @param data Education update data
   * @returns Promise resolving to the updated education entry
   */
  const updateEducation = useCallback(async (id: string, data: EducationFormValues): Promise<Education> => {
    try {
      const result = await dispatch(updateEducationThunk({ id, data })).unwrap();
      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update education');
    }
  }, [dispatch]);
  
  /**
   * Deletes an education entry
   * 
   * @param id Education entry ID
   * @returns Promise resolving when the education entry is deleted
   */
  const deleteEducation = useCallback(async (id: string): Promise<void> => {
    try {
      await dispatch(deleteEducationThunk(id)).unwrap();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete education');
    }
  }, [dispatch]);
  
  /**
   * Adds a certification to the freelancer's profile
   * 
   * @param data Certification data
   * @returns Promise resolving to the created certification
   */
  const addCertification = useCallback(async (data: CertificationFormValues): Promise<Certification> => {
    try {
      const result = await dispatch(addCertificationThunk(data)).unwrap();
      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to add certification');
    }
  }, [dispatch]);
  
  /**
   * Updates an existing certification
   * 
   * @param id Certification ID
   * @param data Certification update data
   * @returns Promise resolving to the updated certification
   */
  const updateCertification = useCallback(async (id: string, data: CertificationFormValues): Promise<Certification> => {
    try {
      const result = await dispatch(updateCertificationThunk({ id, data })).unwrap();
      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to update certification');
    }
  }, [dispatch]);
  
  /**
   * Deletes a certification
   * 
   * @param id Certification ID
   * @returns Promise resolving when the certification is deleted
   */
  const deleteCertification = useCallback(async (id: string): Promise<void> => {
    try {
      await dispatch(deleteCertificationThunk(id)).unwrap();
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete certification');
    }
  }, [dispatch]);
  
  /**
   * Refreshes the current user's profile data based on their role
   * 
   * @returns Promise resolving when the profile is refreshed
   */
  const refreshProfile = useCallback(async (): Promise<void> => {
    try {
      if (!auth.user) {
        throw new Error('User is not authenticated');
      }
      
      if (auth.user.role === UserRole.FREELANCER) {
        await dispatch(fetchFreelancerProfile()).unwrap();
      } else if (auth.user.role === UserRole.EMPLOYER) {
        await dispatch(fetchCompanyProfile()).unwrap();
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to refresh profile');
    }
  }, [dispatch, auth.user]);
  
  /**
   * Clears any profile-related errors in the Redux state
   */
  const handleClearError = useCallback((): void => {
    dispatch(clearError());
  }, [dispatch]);
  
  // Return profile state and all management functions
  return {
    profileState,
    getFreelancerProfile,
    getCompanyProfile,
    updateFreelancerProfile,
    updateCompanyProfile,
    uploadProfileImage,
    addPortfolioItem,
    updatePortfolioItem,
    deletePortfolioItem,
    addExperience,
    updateExperience,
    deleteExperience,
    addEducation,
    updateEducation,
    deleteEducation,
    addCertification,
    updateCertification,
    deleteCertification,
    refreshProfile,
    clearError: handleClearError
  };
}