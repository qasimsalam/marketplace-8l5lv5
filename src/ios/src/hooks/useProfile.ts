/**
 * Custom React hook that provides profile management functionality for the AI Talent Marketplace iOS application.
 * This hook encapsulates the profile state management and operations including fetching, updating,
 * and managing profile data for both freelancers and companies.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'; // ^18.2.0
import { useSelector, useDispatch } from 'react-redux'; // ^8.1.1

import {
  ProfileState,
  FreelancerProfile,
  CompanyProfile,
  ProfileFormValues,
  CompanyFormValues,
  PortfolioItemFormValues,
  ExperienceFormValues,
  EducationFormValues,
  CertificationFormValues,
  PortfolioItem,
  Experience,
  Education,
  Certification,
  ProfileContextType
} from '../types/profile.types';
import { RootState } from '../store';
import useAuth from './useAuth';
import api from '../lib/api';

import {
  fetchFreelancerProfile,
  fetchCompanyProfile,
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
  setError,
  clearError
} from '../store/slices/profileSlice';

/**
 * Custom hook that provides profile management functionality for the AI Talent Marketplace iOS application.
 * This hook encapsulates the profile state management and operations for both freelancers and companies.
 * 
 * @returns Profile state and methods for profile management
 */
const useProfile = (): ProfileContextType => {
  // Get profile state from Redux store
  const profileState = useSelector((state: RootState) => state.profile);
  
  // Get authentication state and user info
  const { user, isAuthenticated } = useAuth();
  
  // Get Redux dispatch function
  const dispatch = useDispatch();

  /**
   * Fetches freelancer profile by ID or current user's profile if no ID is provided
   * @param id - Optional user ID. If not provided, returns current user's profile
   * @returns Promise resolving to freelancer profile
   */
  const getFreelancerProfile = useCallback(async (id?: string): Promise<FreelancerProfile> => {
    try {
      const resultAction = await dispatch(fetchFreelancerProfile(id));
      
      if (fetchFreelancerProfile.fulfilled.match(resultAction)) {
        return resultAction.payload;
      }
      
      throw new Error(resultAction.payload as string || 'Failed to fetch freelancer profile');
    } catch (error) {
      console.error('Error fetching freelancer profile:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Fetches company profile by ID or current user's profile if no ID is provided
   * @param id - Optional user ID. If not provided, returns current user's profile
   * @returns Promise resolving to company profile
   */
  const getCompanyProfile = useCallback(async (id?: string): Promise<CompanyProfile> => {
    try {
      const resultAction = await dispatch(fetchCompanyProfile(id));
      
      if (fetchCompanyProfile.fulfilled.match(resultAction)) {
        return resultAction.payload;
      }
      
      throw new Error(resultAction.payload as string || 'Failed to fetch company profile');
    } catch (error) {
      console.error('Error fetching company profile:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Refreshes the current profile data with pull-to-refresh UX pattern
   * @returns Promise resolving when refresh is complete
   */
  const refreshProfileData = useCallback(async (): Promise<void> => {
    try {
      await dispatch(refreshProfile());
    } catch (error) {
      console.error('Error refreshing profile:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Updates a freelancer profile
   * @param data - Profile form data
   * @returns Promise resolving to updated freelancer profile
   */
  const updateFreelancerProfileData = useCallback(async (data: ProfileFormValues): Promise<FreelancerProfile> => {
    try {
      const resultAction = await dispatch(updateFreelancerProfile(data));
      
      if (updateFreelancerProfile.fulfilled.match(resultAction)) {
        return resultAction.payload;
      }
      
      throw new Error(resultAction.payload as string || 'Failed to update freelancer profile');
    } catch (error) {
      console.error('Error updating freelancer profile:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Updates a company profile
   * @param data - Company form data
   * @returns Promise resolving to updated company profile
   */
  const updateCompanyProfileData = useCallback(async (data: CompanyFormValues): Promise<CompanyProfile> => {
    try {
      const resultAction = await dispatch(updateCompanyProfile(data));
      
      if (updateCompanyProfile.fulfilled.match(resultAction)) {
        return resultAction.payload;
      }
      
      throw new Error(resultAction.payload as string || 'Failed to update company profile');
    } catch (error) {
      console.error('Error updating company profile:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Uploads a profile image
   * @param file - Image file data with uri, type, and name
   * @returns Promise resolving to the uploaded image URL
   */
  const uploadImageData = useCallback(async (file: { uri: string; type: string; name: string }): Promise<string> => {
    try {
      const resultAction = await dispatch(uploadProfileImage(file));
      
      if (uploadProfileImage.fulfilled.match(resultAction)) {
        return resultAction.payload;
      }
      
      throw new Error(resultAction.payload as string || 'Failed to upload profile image');
    } catch (error) {
      console.error('Error uploading profile image:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Adds a portfolio item to the profile
   * @param data - Portfolio item form data
   * @returns Promise resolving to the added portfolio item
   */
  const addPortfolioItemData = useCallback(async (data: PortfolioItemFormValues): Promise<PortfolioItem> => {
    try {
      const resultAction = await dispatch(addPortfolioItem(data));
      
      if (addPortfolioItem.fulfilled.match(resultAction)) {
        return resultAction.payload;
      }
      
      throw new Error(resultAction.payload as string || 'Failed to add portfolio item');
    } catch (error) {
      console.error('Error adding portfolio item:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Updates a portfolio item
   * @param id - Portfolio item ID
   * @param data - Updated portfolio item data
   * @returns Promise resolving to the updated portfolio item
   */
  const updatePortfolioItemData = useCallback(async (id: string, data: PortfolioItemFormValues): Promise<PortfolioItem> => {
    try {
      const resultAction = await dispatch(updatePortfolioItem({ id, data }));
      
      if (updatePortfolioItem.fulfilled.match(resultAction)) {
        return resultAction.payload;
      }
      
      throw new Error(resultAction.payload as string || 'Failed to update portfolio item');
    } catch (error) {
      console.error('Error updating portfolio item:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Deletes a portfolio item
   * @param id - Portfolio item ID
   * @returns Promise resolving to true if deletion was successful
   */
  const deletePortfolioItemData = useCallback(async (id: string): Promise<boolean> => {
    try {
      const resultAction = await dispatch(deletePortfolioItem(id));
      
      if (deletePortfolioItem.fulfilled.match(resultAction)) {
        return resultAction.payload as boolean;
      }
      
      throw new Error(resultAction.payload as string || 'Failed to delete portfolio item');
    } catch (error) {
      console.error('Error deleting portfolio item:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Adds an experience entry to the profile
   * @param data - Experience form data
   * @returns Promise resolving to the added experience
   */
  const addExperienceData = useCallback(async (data: ExperienceFormValues): Promise<Experience> => {
    try {
      const resultAction = await dispatch(addExperience(data));
      
      if (addExperience.fulfilled.match(resultAction)) {
        return resultAction.payload;
      }
      
      throw new Error(resultAction.payload as string || 'Failed to add experience');
    } catch (error) {
      console.error('Error adding experience:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Updates an experience entry
   * @param id - Experience entry ID
   * @param data - Updated experience data
   * @returns Promise resolving to the updated experience
   */
  const updateExperienceData = useCallback(async (id: string, data: ExperienceFormValues): Promise<Experience> => {
    try {
      const resultAction = await dispatch(updateExperience({ id, data }));
      
      if (updateExperience.fulfilled.match(resultAction)) {
        return resultAction.payload;
      }
      
      throw new Error(resultAction.payload as string || 'Failed to update experience');
    } catch (error) {
      console.error('Error updating experience:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Deletes an experience entry
   * @param id - Experience entry ID
   * @returns Promise resolving to true if deletion was successful
   */
  const deleteExperienceData = useCallback(async (id: string): Promise<boolean> => {
    try {
      const resultAction = await dispatch(deleteExperience(id));
      
      if (deleteExperience.fulfilled.match(resultAction)) {
        return resultAction.payload as boolean;
      }
      
      throw new Error(resultAction.payload as string || 'Failed to delete experience');
    } catch (error) {
      console.error('Error deleting experience:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Adds an education entry to the profile
   * @param data - Education form data
   * @returns Promise resolving to the added education
   */
  const addEducationData = useCallback(async (data: EducationFormValues): Promise<Education> => {
    try {
      const resultAction = await dispatch(addEducation(data));
      
      if (addEducation.fulfilled.match(resultAction)) {
        return resultAction.payload;
      }
      
      throw new Error(resultAction.payload as string || 'Failed to add education');
    } catch (error) {
      console.error('Error adding education:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Updates an education entry
   * @param id - Education entry ID
   * @param data - Updated education data
   * @returns Promise resolving to the updated education
   */
  const updateEducationData = useCallback(async (id: string, data: EducationFormValues): Promise<Education> => {
    try {
      const resultAction = await dispatch(updateEducation({ id, data }));
      
      if (updateEducation.fulfilled.match(resultAction)) {
        return resultAction.payload;
      }
      
      throw new Error(resultAction.payload as string || 'Failed to update education');
    } catch (error) {
      console.error('Error updating education:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Deletes an education entry
   * @param id - Education entry ID
   * @returns Promise resolving to true if deletion was successful
   */
  const deleteEducationData = useCallback(async (id: string): Promise<boolean> => {
    try {
      const resultAction = await dispatch(deleteEducation(id));
      
      if (deleteEducation.fulfilled.match(resultAction)) {
        return resultAction.payload as boolean;
      }
      
      throw new Error(resultAction.payload as string || 'Failed to delete education');
    } catch (error) {
      console.error('Error deleting education:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Adds a certification entry to the profile
   * @param data - Certification form data
   * @returns Promise resolving to the added certification
   */
  const addCertificationData = useCallback(async (data: CertificationFormValues): Promise<Certification> => {
    try {
      const resultAction = await dispatch(addCertification(data));
      
      if (addCertification.fulfilled.match(resultAction)) {
        return resultAction.payload;
      }
      
      throw new Error(resultAction.payload as string || 'Failed to add certification');
    } catch (error) {
      console.error('Error adding certification:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Updates a certification entry
   * @param id - Certification entry ID
   * @param data - Updated certification data
   * @returns Promise resolving to the updated certification
   */
  const updateCertificationData = useCallback(async (id: string, data: CertificationFormValues): Promise<Certification> => {
    try {
      const resultAction = await dispatch(updateCertification({ id, data }));
      
      if (updateCertification.fulfilled.match(resultAction)) {
        return resultAction.payload;
      }
      
      throw new Error(resultAction.payload as string || 'Failed to update certification');
    } catch (error) {
      console.error('Error updating certification:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Deletes a certification entry
   * @param id - Certification entry ID
   * @returns Promise resolving to true if deletion was successful
   */
  const deleteCertificationData = useCallback(async (id: string): Promise<boolean> => {
    try {
      const resultAction = await dispatch(deleteCertification(id));
      
      if (deleteCertification.fulfilled.match(resultAction)) {
        return resultAction.payload as boolean;
      }
      
      throw new Error(resultAction.payload as string || 'Failed to delete certification');
    } catch (error) {
      console.error('Error deleting certification:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Clears any profile-related errors
   */
  const clearProfileError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Load profile data when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // Determine which type of profile to load based on user role
      if (user.role === 'freelancer') {
        getFreelancerProfile().catch(error => {
          console.error('Error loading freelancer profile:', error);
        });
      } else if (user.role === 'employer' || user.role === 'admin') {
        getCompanyProfile().catch(error => {
          console.error('Error loading company profile:', error);
        });
      }
    }
  }, [isAuthenticated, user, getFreelancerProfile, getCompanyProfile]);

  // Return the profile state and all methods
  return {
    profileState,
    getFreelancerProfile,
    getCompanyProfile,
    refreshProfile: refreshProfileData,
    updateFreelancerProfile: updateFreelancerProfileData,
    updateCompanyProfile: updateCompanyProfileData,
    uploadProfileImage: uploadImageData,
    addPortfolioItem: addPortfolioItemData,
    updatePortfolioItem: updatePortfolioItemData,
    deletePortfolioItem: deletePortfolioItemData,
    addExperience: addExperienceData,
    updateExperience: updateExperienceData,
    deleteExperience: deleteExperienceData,
    addEducation: addEducationData,
    updateEducation: updateEducationData,
    deleteEducation: deleteEducationData,
    addCertification: addCertificationData,
    updateCertification: updateCertificationData,
    deleteCertification: deleteCertificationData,
    clearError: clearProfileError
  };
};

export default useProfile;

/**
 * Type definition for the return value of the useProfile hook
 */
export interface UseProfileResult {
  profileState: ProfileState;
  getFreelancerProfile: (id?: string) => Promise<FreelancerProfile>;
  getCompanyProfile: (id?: string) => Promise<CompanyProfile>;
  refreshProfile: () => Promise<void>;
  updateFreelancerProfile: (data: ProfileFormValues) => Promise<FreelancerProfile>;
  updateCompanyProfile: (data: CompanyFormValues) => Promise<CompanyProfile>;
  uploadProfileImage: (file: { uri: string; type: string; name: string }) => Promise<string>;
  addPortfolioItem: (data: PortfolioItemFormValues) => Promise<PortfolioItem>;
  updatePortfolioItem: (id: string, data: PortfolioItemFormValues) => Promise<PortfolioItem>;
  deletePortfolioItem: (id: string) => Promise<boolean>;
  addExperience: (data: ExperienceFormValues) => Promise<Experience>;
  updateExperience: (id: string, data: ExperienceFormValues) => Promise<Experience>;
  deleteExperience: (id: string) => Promise<boolean>;
  addEducation: (data: EducationFormValues) => Promise<Education>;
  updateEducation: (id: string, data: EducationFormValues) => Promise<Education>;
  deleteEducation: (id: string) => Promise<boolean>;
  addCertification: (data: CertificationFormValues) => Promise<Certification>;
  updateCertification: (id: string, data: CertificationFormValues) => Promise<Certification>;
  deleteCertification: (id: string) => Promise<boolean>;
  clearError: () => void;
}