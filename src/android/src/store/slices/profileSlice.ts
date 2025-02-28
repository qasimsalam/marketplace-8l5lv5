/**
 * Redux Toolkit slice for managing user profile state in the Android mobile application
 * for the AI Talent Marketplace. Implements reducers and actions for freelancer profiles,
 * company profiles, and related entities like portfolio items, experience, education, and certifications.
 * 
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // @reduxjs/toolkit v1.9.5
import { 
  ProfileState, 
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
} from '../../types/profile.types';
import { profileAPI } from '../../lib/api';
import { UserRole } from '../../../backend/shared/src/types/user.types';

// Initial state for the profile slice
const initialState: ProfileState = {
  freelancerProfile: null,
  companyProfile: null,
  viewedProfile: null,
  loading: false,
  refreshing: false,
  error: null
};

/**
 * Async thunk for fetching a freelancer profile by ID or for the current user
 */
export const fetchFreelancerProfile = createAsyncThunk<FreelancerProfile, string | undefined>(
  'profile/fetchFreelancer',
  async (id, { rejectWithValue }) => {
    try {
      const profile = await profileAPI.getFreelancerProfile(id);
      return profile;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch freelancer profile');
    }
  }
);

/**
 * Async thunk for fetching a company profile by ID or for the current user
 */
export const fetchCompanyProfile = createAsyncThunk<CompanyProfile, string | undefined>(
  'profile/fetchCompany',
  async (id, { rejectWithValue }) => {
    try {
      const profile = await profileAPI.getCompanyProfile(id);
      return profile;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch company profile');
    }
  }
);

/**
 * Async thunk for updating a freelancer profile
 */
export const updateFreelancerProfile = createAsyncThunk<FreelancerProfile, ProfileFormValues>(
  'profile/updateFreelancer',
  async (profileData, { rejectWithValue }) => {
    try {
      const updatedProfile = await profileAPI.updateFreelancerProfile(profileData);
      return updatedProfile;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update freelancer profile');
    }
  }
);

/**
 * Async thunk for updating a company profile
 */
export const updateCompanyProfile = createAsyncThunk<CompanyProfile, CompanyFormValues>(
  'profile/updateCompany',
  async (profileData, { rejectWithValue }) => {
    try {
      const updatedProfile = await profileAPI.updateCompanyProfile(profileData);
      return updatedProfile;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update company profile');
    }
  }
);

/**
 * Async thunk for uploading a profile image
 */
export const uploadProfileImageThunk = createAsyncThunk<{ avatarUrl: string }, string>(
  'profile/uploadImage',
  async (imageUri, { rejectWithValue }) => {
    try {
      const result = await profileAPI.uploadProfileImage(imageUri);
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to upload profile image');
    }
  }
);

/**
 * Async thunk for adding a portfolio item to a freelancer profile
 */
export const addPortfolioItemThunk = createAsyncThunk<PortfolioItem, PortfolioItemFormValues>(
  'profile/addPortfolioItem',
  async (itemData, { rejectWithValue }) => {
    try {
      const portfolioItem = await profileAPI.addPortfolioItem(itemData);
      return portfolioItem;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add portfolio item');
    }
  }
);

/**
 * Async thunk for updating a portfolio item
 */
export const updatePortfolioItemThunk = createAsyncThunk<
  PortfolioItem,
  { id: string; data: PortfolioItemFormValues }
>(
  'profile/updatePortfolioItem',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const updatedItem = await profileAPI.updatePortfolioItem(id, data);
      return updatedItem;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update portfolio item');
    }
  }
);

/**
 * Async thunk for deleting a portfolio item
 */
export const deletePortfolioItemThunk = createAsyncThunk<string, string>(
  'profile/deletePortfolioItem',
  async (id, { rejectWithValue }) => {
    try {
      await profileAPI.deletePortfolioItem(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete portfolio item');
    }
  }
);

/**
 * Async thunk for adding a work experience entry to a freelancer profile
 */
export const addExperienceThunk = createAsyncThunk<Experience, ExperienceFormValues>(
  'profile/addExperience',
  async (experienceData, { rejectWithValue }) => {
    try {
      const experience = await profileAPI.addExperience(experienceData);
      return experience;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add experience');
    }
  }
);

/**
 * Async thunk for updating a work experience entry
 */
export const updateExperienceThunk = createAsyncThunk<
  Experience,
  { id: string; data: ExperienceFormValues }
>(
  'profile/updateExperience',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const updatedExperience = await profileAPI.updateExperience(id, data);
      return updatedExperience;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update experience');
    }
  }
);

/**
 * Async thunk for deleting a work experience entry
 */
export const deleteExperienceThunk = createAsyncThunk<string, string>(
  'profile/deleteExperience',
  async (id, { rejectWithValue }) => {
    try {
      await profileAPI.deleteExperience(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete experience');
    }
  }
);

/**
 * Async thunk for adding an education entry to a freelancer profile
 */
export const addEducationThunk = createAsyncThunk<Education, EducationFormValues>(
  'profile/addEducation',
  async (educationData, { rejectWithValue }) => {
    try {
      const education = await profileAPI.addEducation(educationData);
      return education;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add education');
    }
  }
);

/**
 * Async thunk for updating an education entry
 */
export const updateEducationThunk = createAsyncThunk<
  Education,
  { id: string; data: EducationFormValues }
>(
  'profile/updateEducation',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const updatedEducation = await profileAPI.updateEducation(id, data);
      return updatedEducation;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update education');
    }
  }
);

/**
 * Async thunk for deleting an education entry
 */
export const deleteEducationThunk = createAsyncThunk<string, string>(
  'profile/deleteEducation',
  async (id, { rejectWithValue }) => {
    try {
      await profileAPI.deleteEducation(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete education');
    }
  }
);

/**
 * Async thunk for adding a certification to a freelancer profile
 */
export const addCertificationThunk = createAsyncThunk<Certification, CertificationFormValues>(
  'profile/addCertification',
  async (certificationData, { rejectWithValue }) => {
    try {
      const certification = await profileAPI.addCertification(certificationData);
      return certification;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add certification');
    }
  }
);

/**
 * Async thunk for updating a certification
 */
export const updateCertificationThunk = createAsyncThunk<
  Certification,
  { id: string; data: CertificationFormValues }
>(
  'profile/updateCertification',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const updatedCertification = await profileAPI.updateCertification(id, data);
      return updatedCertification;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update certification');
    }
  }
);

/**
 * Async thunk for deleting a certification
 */
export const deleteCertificationThunk = createAsyncThunk<string, string>(
  'profile/deleteCertification',
  async (id, { rejectWithValue }) => {
    try {
      await profileAPI.deleteCertification(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete certification');
    }
  }
);

/**
 * Redux slice for profile management in the Android application
 */
export const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    // Synchronous actions
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Freelancer Profile
    builder
      .addCase(fetchFreelancerProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFreelancerProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.freelancerProfile = action.payload;
        state.viewedProfile = action.payload;
      })
      .addCase(fetchFreelancerProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Company Profile
    builder
      .addCase(fetchCompanyProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanyProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.companyProfile = action.payload;
        state.viewedProfile = action.payload;
      })
      .addCase(fetchCompanyProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Freelancer Profile
    builder
      .addCase(updateFreelancerProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateFreelancerProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.freelancerProfile = action.payload;
        if (state.viewedProfile && 'hourlyRate' in state.viewedProfile) {
          state.viewedProfile = action.payload;
        }
      })
      .addCase(updateFreelancerProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Company Profile
    builder
      .addCase(updateCompanyProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCompanyProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.companyProfile = action.payload;
        if (state.viewedProfile && 'name' in state.viewedProfile) {
          state.viewedProfile = action.payload;
        }
      })
      .addCase(updateCompanyProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Upload Profile Image
    builder
      .addCase(uploadProfileImageThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadProfileImageThunk.fulfilled, (state, action) => {
        state.loading = false;
        // Update the avatar URL in the appropriate profile
        if (state.freelancerProfile) {
          state.freelancerProfile.avatarUrl = action.payload.avatarUrl;
          if (state.viewedProfile && 'hourlyRate' in state.viewedProfile) {
            state.viewedProfile.avatarUrl = action.payload.avatarUrl;
          }
        }
        if (state.companyProfile) {
          state.companyProfile.logoUrl = action.payload.avatarUrl;
          if (state.viewedProfile && 'name' in state.viewedProfile) {
            state.viewedProfile.logoUrl = action.payload.avatarUrl;
          }
        }
      })
      .addCase(uploadProfileImageThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Add Portfolio Item
    builder
      .addCase(addPortfolioItemThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addPortfolioItemThunk.fulfilled, (state, action) => {
        state.loading = false;
        if (state.freelancerProfile) {
          state.freelancerProfile.portfolio = [
            ...state.freelancerProfile.portfolio,
            action.payload
          ];
        }
        // Also update in viewedProfile if it's a freelancer profile
        if (state.viewedProfile && 'portfolio' in state.viewedProfile) {
          state.viewedProfile.portfolio = [
            ...state.viewedProfile.portfolio,
            action.payload
          ];
        }
      })
      .addCase(addPortfolioItemThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Portfolio Item
    builder
      .addCase(updatePortfolioItemThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePortfolioItemThunk.fulfilled, (state, action) => {
        state.loading = false;
        // Update in freelancerProfile
        if (state.freelancerProfile) {
          state.freelancerProfile.portfolio = state.freelancerProfile.portfolio.map(item => 
            item.id === action.payload.id ? action.payload : item
          );
        }
        // Also update in viewedProfile if it's a freelancer profile
        if (state.viewedProfile && 'portfolio' in state.viewedProfile) {
          state.viewedProfile.portfolio = state.viewedProfile.portfolio.map(item => 
            item.id === action.payload.id ? action.payload : item
          );
        }
      })
      .addCase(updatePortfolioItemThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete Portfolio Item
    builder
      .addCase(deletePortfolioItemThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePortfolioItemThunk.fulfilled, (state, action) => {
        state.loading = false;
        // Remove from freelancerProfile
        if (state.freelancerProfile) {
          state.freelancerProfile.portfolio = state.freelancerProfile.portfolio.filter(
            item => item.id !== action.payload
          );
        }
        // Also remove from viewedProfile if it's a freelancer profile
        if (state.viewedProfile && 'portfolio' in state.viewedProfile) {
          state.viewedProfile.portfolio = state.viewedProfile.portfolio.filter(
            item => item.id !== action.payload
          );
        }
      })
      .addCase(deletePortfolioItemThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Add Experience
    builder
      .addCase(addExperienceThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addExperienceThunk.fulfilled, (state, action) => {
        state.loading = false;
        if (state.freelancerProfile) {
          state.freelancerProfile.experience = [
            ...state.freelancerProfile.experience,
            action.payload
          ];
        }
        // Also update in viewedProfile if it's a freelancer profile
        if (state.viewedProfile && 'experience' in state.viewedProfile) {
          state.viewedProfile.experience = [
            ...state.viewedProfile.experience,
            action.payload
          ];
        }
      })
      .addCase(addExperienceThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Experience
    builder
      .addCase(updateExperienceThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateExperienceThunk.fulfilled, (state, action) => {
        state.loading = false;
        // Update in freelancerProfile
        if (state.freelancerProfile) {
          state.freelancerProfile.experience = state.freelancerProfile.experience.map(item => 
            item.id === action.payload.id ? action.payload : item
          );
        }
        // Also update in viewedProfile if it's a freelancer profile
        if (state.viewedProfile && 'experience' in state.viewedProfile) {
          state.viewedProfile.experience = state.viewedProfile.experience.map(item => 
            item.id === action.payload.id ? action.payload : item
          );
        }
      })
      .addCase(updateExperienceThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete Experience
    builder
      .addCase(deleteExperienceThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteExperienceThunk.fulfilled, (state, action) => {
        state.loading = false;
        // Remove from freelancerProfile
        if (state.freelancerProfile) {
          state.freelancerProfile.experience = state.freelancerProfile.experience.filter(
            item => item.id !== action.payload
          );
        }
        // Also remove from viewedProfile if it's a freelancer profile
        if (state.viewedProfile && 'experience' in state.viewedProfile) {
          state.viewedProfile.experience = state.viewedProfile.experience.filter(
            item => item.id !== action.payload
          );
        }
      })
      .addCase(deleteExperienceThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Add Education
    builder
      .addCase(addEducationThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addEducationThunk.fulfilled, (state, action) => {
        state.loading = false;
        if (state.freelancerProfile) {
          state.freelancerProfile.education = [
            ...state.freelancerProfile.education,
            action.payload
          ];
        }
        // Also update in viewedProfile if it's a freelancer profile
        if (state.viewedProfile && 'education' in state.viewedProfile) {
          state.viewedProfile.education = [
            ...state.viewedProfile.education,
            action.payload
          ];
        }
      })
      .addCase(addEducationThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Education
    builder
      .addCase(updateEducationThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateEducationThunk.fulfilled, (state, action) => {
        state.loading = false;
        // Update in freelancerProfile
        if (state.freelancerProfile) {
          state.freelancerProfile.education = state.freelancerProfile.education.map(item => 
            item.id === action.payload.id ? action.payload : item
          );
        }
        // Also update in viewedProfile if it's a freelancer profile
        if (state.viewedProfile && 'education' in state.viewedProfile) {
          state.viewedProfile.education = state.viewedProfile.education.map(item => 
            item.id === action.payload.id ? action.payload : item
          );
        }
      })
      .addCase(updateEducationThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete Education
    builder
      .addCase(deleteEducationThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteEducationThunk.fulfilled, (state, action) => {
        state.loading = false;
        // Remove from freelancerProfile
        if (state.freelancerProfile) {
          state.freelancerProfile.education = state.freelancerProfile.education.filter(
            item => item.id !== action.payload
          );
        }
        // Also remove from viewedProfile if it's a freelancer profile
        if (state.viewedProfile && 'education' in state.viewedProfile) {
          state.viewedProfile.education = state.viewedProfile.education.filter(
            item => item.id !== action.payload
          );
        }
      })
      .addCase(deleteEducationThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Add Certification
    builder
      .addCase(addCertificationThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addCertificationThunk.fulfilled, (state, action) => {
        state.loading = false;
        if (state.freelancerProfile) {
          state.freelancerProfile.certifications = [
            ...state.freelancerProfile.certifications,
            action.payload
          ];
        }
        // Also update in viewedProfile if it's a freelancer profile
        if (state.viewedProfile && 'certifications' in state.viewedProfile) {
          state.viewedProfile.certifications = [
            ...state.viewedProfile.certifications,
            action.payload
          ];
        }
      })
      .addCase(addCertificationThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Certification
    builder
      .addCase(updateCertificationThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCertificationThunk.fulfilled, (state, action) => {
        state.loading = false;
        // Update in freelancerProfile
        if (state.freelancerProfile) {
          state.freelancerProfile.certifications = state.freelancerProfile.certifications.map(item => 
            item.id === action.payload.id ? action.payload : item
          );
        }
        // Also update in viewedProfile if it's a freelancer profile
        if (state.viewedProfile && 'certifications' in state.viewedProfile) {
          state.viewedProfile.certifications = state.viewedProfile.certifications.map(item => 
            item.id === action.payload.id ? action.payload : item
          );
        }
      })
      .addCase(updateCertificationThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete Certification
    builder
      .addCase(deleteCertificationThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCertificationThunk.fulfilled, (state, action) => {
        state.loading = false;
        // Remove from freelancerProfile
        if (state.freelancerProfile) {
          state.freelancerProfile.certifications = state.freelancerProfile.certifications.filter(
            item => item.id !== action.payload
          );
        }
        // Also remove from viewedProfile if it's a freelancer profile
        if (state.viewedProfile && 'certifications' in state.viewedProfile) {
          state.viewedProfile.certifications = state.viewedProfile.certifications.filter(
            item => item.id !== action.payload
          );
        }
      })
      .addCase(deleteCertificationThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

// Export synchronous action creators
export const { setError, clearError } = profileSlice.actions;

// Export the reducer as a default export
export const profileReducer = profileSlice.reducer;