/**
 * Custom React hook for profile management in the AI Talent Marketplace
 * 
 * Provides functionality for retrieving and managing freelancer and company profiles,
 * portfolio items, experience, education, and certifications.
 * 
 * @version 1.0.0
 */

import { useCallback } from 'react'; // ^18.2.0
import { useAppDispatch, useAppSelector } from '../store';
import {
  getFreelancerProfile,
  getCompanyProfile,
  updateFreelancerProfile,
  updateCompanyProfile,
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
  uploadProfileImage,
  clearProfileError,
  selectFreelancerProfile,
  selectCompanyProfile,
  selectViewedProfile,
  selectProfileLoading,
  selectProfileError
} from '../store/slices/profileSlice';
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
} from '../types/profile';
import { useToast } from './useToast';
import { useAuth } from './useAuth';
import { profileAPI } from '../lib/api';

/**
 * Custom React hook that provides profile management functionality
 * for the AI Talent Marketplace web application.
 * 
 * @returns Object containing profile state and methods for profile management
 */
export const useProfile = () => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  
  // Select profile state from Redux
  const freelancerProfile = useAppSelector(selectFreelancerProfile);
  const companyProfile = useAppSelector(selectCompanyProfile);
  const viewedProfile = useAppSelector(selectViewedProfile);
  const isLoading = useAppSelector(selectProfileLoading);
  const error = useAppSelector(selectProfileError);
  
  // Initialize toast notifications
  const toast = useToast();

  /**
   * Fetches freelancer profile by ID or the current user's profile
   * 
   * @param id - Optional profile ID (uses authenticated user's profile if not provided)
   * @returns Promise resolving to freelancer profile or null if error
   */
  const handleGetFreelancerProfile = async (id?: string): Promise<FreelancerProfile | null> => {
    try {
      const profile = await dispatch(getFreelancerProfile(id)).unwrap();
      return profile;
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Failed to fetch freelancer profile';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Fetches company profile by ID or the current user's profile
   * 
   * @param id - Optional profile ID (uses authenticated user's profile if not provided)
   * @returns Promise resolving to company profile or null if error
   */
  const handleGetCompanyProfile = async (id?: string): Promise<CompanyProfile | null> => {
    try {
      const profile = await dispatch(getCompanyProfile(id)).unwrap();
      return profile;
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Failed to fetch company profile';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Updates a freelancer profile with new data
   * 
   * @param data - Profile data to update
   * @returns Promise resolving to updated profile or null if error
   */
  const handleUpdateFreelancerProfile = async (data: ProfileFormValues): Promise<FreelancerProfile | null> => {
    try {
      const profile = await dispatch(updateFreelancerProfile(data)).unwrap();
      toast.success('Profile updated successfully');
      return profile;
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Failed to update profile';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Updates a company profile with new data
   * 
   * @param data - Company profile data to update
   * @returns Promise resolving to updated company profile or null if error
   */
  const handleUpdateCompanyProfile = async (data: CompanyFormValues): Promise<CompanyProfile | null> => {
    try {
      const profile = await dispatch(updateCompanyProfile(data)).unwrap();
      toast.success('Company profile updated successfully');
      return profile;
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Failed to update company profile';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Adds a new portfolio item to the freelancer profile
   * 
   * @param data - Portfolio item data to add
   * @returns Promise resolving to created portfolio item or null if error
   */
  const handleAddPortfolioItem = async (data: PortfolioItemFormValues): Promise<PortfolioItem | null> => {
    try {
      const portfolioItem = await dispatch(addPortfolioItem(data)).unwrap();
      toast.success('Portfolio item added successfully');
      return portfolioItem;
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Failed to add portfolio item';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Updates an existing portfolio item
   * 
   * @param id - Portfolio item ID to update
   * @param data - Updated portfolio item data
   * @returns Promise resolving to updated portfolio item or null if error
   */
  const handleUpdatePortfolioItem = async (id: string, data: PortfolioItemFormValues): Promise<PortfolioItem | null> => {
    try {
      const portfolioItem = await dispatch(updatePortfolioItem({ id, data })).unwrap();
      toast.success('Portfolio item updated successfully');
      return portfolioItem;
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Failed to update portfolio item';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Deletes a portfolio item
   * 
   * @param id - Portfolio item ID to delete
   * @returns Promise resolving when deletion is complete
   */
  const handleDeletePortfolioItem = async (id: string): Promise<void> => {
    try {
      await dispatch(deletePortfolioItem(id)).unwrap();
      toast.success('Portfolio item deleted successfully');
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Failed to delete portfolio item';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Adds a new experience entry to the freelancer profile
   * 
   * @param data - Experience data to add
   * @returns Promise resolving to created experience or null if error
   */
  const handleAddExperience = async (data: ExperienceFormValues): Promise<Experience | null> => {
    try {
      const experience = await dispatch(addExperience(data)).unwrap();
      toast.success('Experience added successfully');
      return experience;
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Failed to add experience';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Updates an existing experience entry
   * 
   * @param id - Experience ID to update
   * @param data - Updated experience data
   * @returns Promise resolving to updated experience or null if error
   */
  const handleUpdateExperience = async (id: string, data: ExperienceFormValues): Promise<Experience | null> => {
    try {
      const experience = await dispatch(updateExperience({ id, data })).unwrap();
      toast.success('Experience updated successfully');
      return experience;
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Failed to update experience';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Deletes an experience entry
   * 
   * @param id - Experience ID to delete
   * @returns Promise resolving when deletion is complete
   */
  const handleDeleteExperience = async (id: string): Promise<void> => {
    try {
      await dispatch(deleteExperience(id)).unwrap();
      toast.success('Experience deleted successfully');
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Failed to delete experience';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Adds a new education entry to the freelancer profile
   * 
   * @param data - Education data to add
   * @returns Promise resolving to created education or null if error
   */
  const handleAddEducation = async (data: EducationFormValues): Promise<Education | null> => {
    try {
      const education = await dispatch(addEducation(data)).unwrap();
      toast.success('Education added successfully');
      return education;
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Failed to add education';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Updates an existing education entry
   * 
   * @param id - Education ID to update
   * @param data - Updated education data
   * @returns Promise resolving to updated education or null if error
   */
  const handleUpdateEducation = async (id: string, data: EducationFormValues): Promise<Education | null> => {
    try {
      const education = await dispatch(updateEducation({ id, data })).unwrap();
      toast.success('Education updated successfully');
      return education;
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Failed to update education';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Deletes an education entry
   * 
   * @param id - Education ID to delete
   * @returns Promise resolving when deletion is complete
   */
  const handleDeleteEducation = async (id: string): Promise<void> => {
    try {
      await dispatch(deleteEducation(id)).unwrap();
      toast.success('Education deleted successfully');
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Failed to delete education';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Adds a new certification to the freelancer profile
   * 
   * @param data - Certification data to add
   * @returns Promise resolving to created certification or null if error
   */
  const handleAddCertification = async (data: CertificationFormValues): Promise<Certification | null> => {
    try {
      const certification = await dispatch(addCertification(data)).unwrap();
      toast.success('Certification added successfully');
      return certification;
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Failed to add certification';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Updates an existing certification
   * 
   * @param id - Certification ID to update
   * @param data - Updated certification data
   * @returns Promise resolving to updated certification or null if error
   */
  const handleUpdateCertification = async (id: string, data: CertificationFormValues): Promise<Certification | null> => {
    try {
      const certification = await dispatch(updateCertification({ id, data })).unwrap();
      toast.success('Certification updated successfully');
      return certification;
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Failed to update certification';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Deletes a certification
   * 
   * @param id - Certification ID to delete
   * @returns Promise resolving when deletion is complete
   */
  const handleDeleteCertification = async (id: string): Promise<void> => {
    try {
      await dispatch(deleteCertification(id)).unwrap();
      toast.success('Certification deleted successfully');
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Failed to delete certification';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Uploads a profile image with optional progress tracking
   * 
   * @param file - Image file to upload
   * @param onProgress - Optional callback for tracking upload progress (0-100)
   * @returns Promise resolving to object containing uploaded image URL
   */
  const handleUploadProfileImage = async (file: File, onProgress?: (progress: number) => void): Promise<{ url: string }> => {
    try {
      let result;
      
      if (onProgress) {
        // If progress tracking is requested, use the API directly
        const apiResult = await profileAPI.uploadProfileImage(file, onProgress);
        result = { url: apiResult.url };
      } else {
        // Otherwise use the Redux thunk
        result = await dispatch(uploadProfileImage(file)).unwrap();
      }
      
      toast.success('Profile image uploaded successfully');
      return result;
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : 'Failed to upload profile image';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Clears profile error state
   */
  const handleClearError = useCallback((): void => {
    dispatch(clearProfileError());
  }, [dispatch]);

  // Return profile state and methods
  return {
    // State
    freelancerProfile,
    companyProfile,
    viewedProfile,
    isLoading,
    error,
    
    // Profile methods
    getFreelancerProfile: handleGetFreelancerProfile,
    getCompanyProfile: handleGetCompanyProfile,
    updateFreelancerProfile: handleUpdateFreelancerProfile,
    updateCompanyProfile: handleUpdateCompanyProfile,
    
    // Portfolio methods
    addPortfolioItem: handleAddPortfolioItem,
    updatePortfolioItem: handleUpdatePortfolioItem,
    deletePortfolioItem: handleDeletePortfolioItem,
    
    // Experience methods
    addExperience: handleAddExperience,
    updateExperience: handleUpdateExperience,
    deleteExperience: handleDeleteExperience,
    
    // Education methods
    addEducation: handleAddEducation,
    updateEducation: handleUpdateEducation,
    deleteEducation: handleDeleteEducation,
    
    // Certification methods
    addCertification: handleAddCertification,
    updateCertification: handleUpdateCertification,
    deleteCertification: handleDeleteCertification,
    
    // Image upload
    uploadProfileImage: handleUploadProfileImage,
    
    // Error handling
    clearError: handleClearError
  };
};