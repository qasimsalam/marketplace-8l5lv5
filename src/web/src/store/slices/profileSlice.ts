/**
 * Redux slice for managing user profiles in the AI Talent Marketplace
 * Handles state management for freelancer and company profiles, including
 * portfolio items, experience, education, and certifications.
 * 
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // @reduxjs/toolkit ^1.9.5
import { Action, ThunkAction } from 'redux'; // redux ^4.2.1

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
} from '../../types/profile';

import { profileAPI } from '../../lib/api';

// Initial state for the profile slice
const initialState: ProfileState = {
  freelancerProfile: null,
  companyProfile: null,
  viewedProfile: null,
  loading: false,
  error: null
};

/**
 * Async thunk that fetches a freelancer's profile by ID or the current user's profile
 */
export const getFreelancerProfile = createAsyncThunk<FreelancerProfile, string | undefined>(
  'profile/getFreelancerProfile',
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
 * Async thunk that fetches a company profile by ID or the current user's company profile
 */
export const getCompanyProfile = createAsyncThunk<CompanyProfile, string | undefined>(
  'profile/getCompanyProfile',
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
 * Async thunk that updates a freelancer's profile with new data
 */
export const updateFreelancerProfile = createAsyncThunk<FreelancerProfile, ProfileFormValues>(
  'profile/updateFreelancerProfile',
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
 * Async thunk that updates a company profile with new data
 */
export const updateCompanyProfile = createAsyncThunk<CompanyProfile, CompanyFormValues>(
  'profile/updateCompanyProfile',
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
 * Async thunk that adds a new portfolio item to a freelancer's profile
 */
export const addPortfolioItem = createAsyncThunk<PortfolioItem, PortfolioItemFormValues>(
  'profile/addPortfolioItem',
  async (portfolioData, { rejectWithValue }) => {
    try {
      const newItem = await profileAPI.addPortfolioItem(portfolioData);
      return newItem;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add portfolio item');
    }
  }
);

/**
 * Async thunk that updates an existing portfolio item
 */
export const updatePortfolioItem = createAsyncThunk<
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
 * Async thunk that deletes a portfolio item
 */
export const deletePortfolioItem = createAsyncThunk<void, string>(
  'profile/deletePortfolioItem',
  async (id, { rejectWithValue }) => {
    try {
      await profileAPI.deletePortfolioItem(id);
      return;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete portfolio item');
    }
  }
);

/**
 * Async thunk that adds a new work experience entry to a freelancer's profile
 */
export const addExperience = createAsyncThunk<Experience, ExperienceFormValues>(
  'profile/addExperience',
  async (experienceData, { rejectWithValue }) => {
    try {
      // Note: This method is not explicitly defined in the provided API client
      // but would follow the same pattern as other profile API methods
      const response = await fetch('/api/v1/profiles/experience', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(experienceData),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to add experience');
      }
      
      const newExperience = await response.json();
      return newExperience;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add experience');
    }
  }
);

/**
 * Async thunk that updates an existing work experience entry
 */
export const updateExperience = createAsyncThunk<
  Experience, 
  { id: string; data: ExperienceFormValues }
>(
  'profile/updateExperience',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      // Note: This method is not explicitly defined in the provided API client
      const response = await fetch(`/api/v1/profiles/experience/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to update experience');
      }
      
      const updatedExperience = await response.json();
      return updatedExperience;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update experience');
    }
  }
);

/**
 * Async thunk that deletes a work experience entry
 */
export const deleteExperience = createAsyncThunk<void, string>(
  'profile/deleteExperience',
  async (id, { rejectWithValue }) => {
    try {
      // Note: This method is not explicitly defined in the provided API client
      const response = await fetch(`/api/v1/profiles/experience/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete experience');
      }
      
      return;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete experience');
    }
  }
);

/**
 * Async thunk that adds a new education entry to a freelancer's profile
 */
export const addEducation = createAsyncThunk<Education, EducationFormValues>(
  'profile/addEducation',
  async (educationData, { rejectWithValue }) => {
    try {
      // Note: This method is not explicitly defined in the provided API client
      const response = await fetch('/api/v1/profiles/education', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(educationData),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to add education');
      }
      
      const newEducation = await response.json();
      return newEducation;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add education');
    }
  }
);

/**
 * Async thunk that updates an existing education entry
 */
export const updateEducation = createAsyncThunk<
  Education, 
  { id: string; data: EducationFormValues }
>(
  'profile/updateEducation',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      // Note: This method is not explicitly defined in the provided API client
      const response = await fetch(`/api/v1/profiles/education/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to update education');
      }
      
      const updatedEducation = await response.json();
      return updatedEducation;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update education');
    }
  }
);

/**
 * Async thunk that deletes an education entry
 */
export const deleteEducation = createAsyncThunk<void, string>(
  'profile/deleteEducation',
  async (id, { rejectWithValue }) => {
    try {
      // Note: This method is not explicitly defined in the provided API client
      const response = await fetch(`/api/v1/profiles/education/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete education');
      }
      
      return;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete education');
    }
  }
);

/**
 * Async thunk that adds a new certification to a freelancer's profile
 */
export const addCertification = createAsyncThunk<Certification, CertificationFormValues>(
  'profile/addCertification',
  async (certificationData, { rejectWithValue }) => {
    try {
      // Note: This method is not explicitly defined in the provided API client
      const response = await fetch('/api/v1/profiles/certification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(certificationData),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to add certification');
      }
      
      const newCertification = await response.json();
      return newCertification;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add certification');
    }
  }
);

/**
 * Async thunk that updates an existing certification
 */
export const updateCertification = createAsyncThunk<
  Certification, 
  { id: string; data: CertificationFormValues }
>(
  'profile/updateCertification',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      // Note: This method is not explicitly defined in the provided API client
      const response = await fetch(`/api/v1/profiles/certification/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to update certification');
      }
      
      const updatedCertification = await response.json();
      return updatedCertification;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update certification');
    }
  }
);

/**
 * Async thunk that deletes a certification
 */
export const deleteCertification = createAsyncThunk<void, string>(
  'profile/deleteCertification',
  async (id, { rejectWithValue }) => {
    try {
      // Note: This method is not explicitly defined in the provided API client
      const response = await fetch(`/api/v1/profiles/certification/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete certification');
      }
      
      return;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete certification');
    }
  }
);

/**
 * Async thunk that uploads a profile image for a user
 */
export const uploadProfileImage = createAsyncThunk<{url: string}, File>(
  'profile/uploadProfileImage',
  async (file, { rejectWithValue }) => {
    try {
      const result = await profileAPI.uploadProfileImage(file);
      return { url: result.url };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to upload profile image');
    }
  }
);

/**
 * Redux slice for profile state management
 */
export const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    /**
     * Action creator to clear any profile-related errors
     */
    clearProfileError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Freelancer Profile
    builder.addCase(getFreelancerProfile.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(getFreelancerProfile.fulfilled, (state, action) => {
      state.loading = false;
      state.freelancerProfile = action.payload;
      state.viewedProfile = action.payload;
    });
    builder.addCase(getFreelancerProfile.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string || 'Failed to fetch freelancer profile';
    });

    // Fetch Company Profile
    builder.addCase(getCompanyProfile.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(getCompanyProfile.fulfilled, (state, action) => {
      state.loading = false;
      state.companyProfile = action.payload;
      state.viewedProfile = action.payload;
    });
    builder.addCase(getCompanyProfile.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string || 'Failed to fetch company profile';
    });

    // Update Freelancer Profile
    builder.addCase(updateFreelancerProfile.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateFreelancerProfile.fulfilled, (state, action) => {
      state.loading = false;
      state.freelancerProfile = action.payload;
      if (state.viewedProfile && 'hourlyRate' in state.viewedProfile) {
        state.viewedProfile = action.payload;
      }
    });
    builder.addCase(updateFreelancerProfile.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string || 'Failed to update freelancer profile';
    });

    // Update Company Profile
    builder.addCase(updateCompanyProfile.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateCompanyProfile.fulfilled, (state, action) => {
      state.loading = false;
      state.companyProfile = action.payload;
      if (state.viewedProfile && 'name' in state.viewedProfile) {
        state.viewedProfile = action.payload;
      }
    });
    builder.addCase(updateCompanyProfile.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string || 'Failed to update company profile';
    });

    // Add Portfolio Item
    builder.addCase(addPortfolioItem.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(addPortfolioItem.fulfilled, (state, action) => {
      state.loading = false;
      if (state.freelancerProfile) {
        state.freelancerProfile.portfolio = [
          ...(state.freelancerProfile.portfolio || []),
          action.payload
        ];
        
        // Update viewed profile if it's the freelancer profile
        if (state.viewedProfile && 'portfolio' in state.viewedProfile) {
          state.viewedProfile = {
            ...state.freelancerProfile
          };
        }
      }
    });
    builder.addCase(addPortfolioItem.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string || 'Failed to add portfolio item';
    });

    // Update Portfolio Item
    builder.addCase(updatePortfolioItem.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updatePortfolioItem.fulfilled, (state, action) => {
      state.loading = false;
      if (state.freelancerProfile) {
        const itemIndex = state.freelancerProfile.portfolio.findIndex(
          item => item.id === action.payload.id
        );
        
        if (itemIndex !== -1) {
          const updatedPortfolio = [...state.freelancerProfile.portfolio];
          updatedPortfolio[itemIndex] = action.payload;
          state.freelancerProfile.portfolio = updatedPortfolio;
          
          // Update viewed profile if it's the freelancer profile
          if (state.viewedProfile && 'portfolio' in state.viewedProfile) {
            state.viewedProfile = {
              ...state.freelancerProfile
            };
          }
        }
      }
    });
    builder.addCase(updatePortfolioItem.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string || 'Failed to update portfolio item';
    });

    // Delete Portfolio Item
    builder.addCase(deletePortfolioItem.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deletePortfolioItem.fulfilled, (state, action) => {
      state.loading = false;
      if (state.freelancerProfile) {
        state.freelancerProfile.portfolio = state.freelancerProfile.portfolio.filter(
          item => item.id !== action.meta.arg
        );
        
        // Update viewed profile if it's the freelancer profile
        if (state.viewedProfile && 'portfolio' in state.viewedProfile) {
          state.viewedProfile = {
            ...state.freelancerProfile
          };
        }
      }
    });
    builder.addCase(deletePortfolioItem.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string || 'Failed to delete portfolio item';
    });

    // Add Experience
    builder.addCase(addExperience.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(addExperience.fulfilled, (state, action) => {
      state.loading = false;
      if (state.freelancerProfile) {
        state.freelancerProfile.experience = [
          ...(state.freelancerProfile.experience || []),
          action.payload
        ];
        
        // Update viewed profile if it's the freelancer profile
        if (state.viewedProfile && 'experience' in state.viewedProfile) {
          state.viewedProfile = {
            ...state.freelancerProfile
          };
        }
      }
    });
    builder.addCase(addExperience.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string || 'Failed to add experience';
    });

    // Update Experience
    builder.addCase(updateExperience.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateExperience.fulfilled, (state, action) => {
      state.loading = false;
      if (state.freelancerProfile) {
        const itemIndex = state.freelancerProfile.experience.findIndex(
          item => item.id === action.payload.id
        );
        
        if (itemIndex !== -1) {
          const updatedExperience = [...state.freelancerProfile.experience];
          updatedExperience[itemIndex] = action.payload;
          state.freelancerProfile.experience = updatedExperience;
          
          // Update viewed profile if it's the freelancer profile
          if (state.viewedProfile && 'experience' in state.viewedProfile) {
            state.viewedProfile = {
              ...state.freelancerProfile
            };
          }
        }
      }
    });
    builder.addCase(updateExperience.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string || 'Failed to update experience';
    });

    // Delete Experience
    builder.addCase(deleteExperience.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteExperience.fulfilled, (state, action) => {
      state.loading = false;
      if (state.freelancerProfile) {
        state.freelancerProfile.experience = state.freelancerProfile.experience.filter(
          item => item.id !== action.meta.arg
        );
        
        // Update viewed profile if it's the freelancer profile
        if (state.viewedProfile && 'experience' in state.viewedProfile) {
          state.viewedProfile = {
            ...state.freelancerProfile
          };
        }
      }
    });
    builder.addCase(deleteExperience.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string || 'Failed to delete experience';
    });

    // Add Education
    builder.addCase(addEducation.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(addEducation.fulfilled, (state, action) => {
      state.loading = false;
      if (state.freelancerProfile) {
        state.freelancerProfile.education = [
          ...(state.freelancerProfile.education || []),
          action.payload
        ];
        
        // Update viewed profile if it's the freelancer profile
        if (state.viewedProfile && 'education' in state.viewedProfile) {
          state.viewedProfile = {
            ...state.freelancerProfile
          };
        }
      }
    });
    builder.addCase(addEducation.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string || 'Failed to add education';
    });

    // Update Education
    builder.addCase(updateEducation.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateEducation.fulfilled, (state, action) => {
      state.loading = false;
      if (state.freelancerProfile) {
        const itemIndex = state.freelancerProfile.education.findIndex(
          item => item.id === action.payload.id
        );
        
        if (itemIndex !== -1) {
          const updatedEducation = [...state.freelancerProfile.education];
          updatedEducation[itemIndex] = action.payload;
          state.freelancerProfile.education = updatedEducation;
          
          // Update viewed profile if it's the freelancer profile
          if (state.viewedProfile && 'education' in state.viewedProfile) {
            state.viewedProfile = {
              ...state.freelancerProfile
            };
          }
        }
      }
    });
    builder.addCase(updateEducation.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string || 'Failed to update education';
    });

    // Delete Education
    builder.addCase(deleteEducation.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteEducation.fulfilled, (state, action) => {
      state.loading = false;
      if (state.freelancerProfile) {
        state.freelancerProfile.education = state.freelancerProfile.education.filter(
          item => item.id !== action.meta.arg
        );
        
        // Update viewed profile if it's the freelancer profile
        if (state.viewedProfile && 'education' in state.viewedProfile) {
          state.viewedProfile = {
            ...state.freelancerProfile
          };
        }
      }
    });
    builder.addCase(deleteEducation.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string || 'Failed to delete education';
    });

    // Add Certification
    builder.addCase(addCertification.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(addCertification.fulfilled, (state, action) => {
      state.loading = false;
      if (state.freelancerProfile) {
        state.freelancerProfile.certifications = [
          ...(state.freelancerProfile.certifications || []),
          action.payload
        ];
        
        // Update viewed profile if it's the freelancer profile
        if (state.viewedProfile && 'certifications' in state.viewedProfile) {
          state.viewedProfile = {
            ...state.freelancerProfile
          };
        }
      }
    });
    builder.addCase(addCertification.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string || 'Failed to add certification';
    });

    // Update Certification
    builder.addCase(updateCertification.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(updateCertification.fulfilled, (state, action) => {
      state.loading = false;
      if (state.freelancerProfile) {
        const itemIndex = state.freelancerProfile.certifications.findIndex(
          item => item.id === action.payload.id
        );
        
        if (itemIndex !== -1) {
          const updatedCertifications = [...state.freelancerProfile.certifications];
          updatedCertifications[itemIndex] = action.payload;
          state.freelancerProfile.certifications = updatedCertifications;
          
          // Update viewed profile if it's the freelancer profile
          if (state.viewedProfile && 'certifications' in state.viewedProfile) {
            state.viewedProfile = {
              ...state.freelancerProfile
            };
          }
        }
      }
    });
    builder.addCase(updateCertification.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string || 'Failed to update certification';
    });

    // Delete Certification
    builder.addCase(deleteCertification.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(deleteCertification.fulfilled, (state, action) => {
      state.loading = false;
      if (state.freelancerProfile) {
        state.freelancerProfile.certifications = state.freelancerProfile.certifications.filter(
          item => item.id !== action.meta.arg
        );
        
        // Update viewed profile if it's the freelancer profile
        if (state.viewedProfile && 'certifications' in state.viewedProfile) {
          state.viewedProfile = {
            ...state.freelancerProfile
          };
        }
      }
    });
    builder.addCase(deleteCertification.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string || 'Failed to delete certification';
    });

    // Upload Profile Image
    builder.addCase(uploadProfileImage.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(uploadProfileImage.fulfilled, (state, action) => {
      state.loading = false;
      
      // Update avatar URL for either profile type
      if (state.freelancerProfile) {
        state.freelancerProfile.avatarUrl = action.payload.url;
        
        // Update viewed profile if it's the freelancer profile
        if (state.viewedProfile && 'avatarUrl' in state.viewedProfile) {
          state.viewedProfile = {
            ...state.freelancerProfile
          };
        }
      } else if (state.companyProfile) {
        state.companyProfile.logoUrl = action.payload.url;
        
        // Update viewed profile if it's the company profile
        if (state.viewedProfile && 'logoUrl' in state.viewedProfile) {
          state.viewedProfile = {
            ...state.companyProfile
          };
        }
      }
    });
    builder.addCase(uploadProfileImage.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string || 'Failed to upload profile image';
    });
  },
});

// Export actions
export const { clearProfileError } = profileSlice.actions;

// Export selectors
export const selectProfile = (state: { profile: ProfileState }) => state.profile;
export const selectFreelancerProfile = (state: { profile: ProfileState }) => state.profile.freelancerProfile;
export const selectCompanyProfile = (state: { profile: ProfileState }) => state.profile.companyProfile;
export const selectViewedProfile = (state: { profile: ProfileState }) => state.profile.viewedProfile;
export const selectProfileLoading = (state: { profile: ProfileState }) => state.profile.loading;
export const selectProfileError = (state: { profile: ProfileState }) => state.profile.error;

// Export reducer as default
export default profileSlice.reducer;