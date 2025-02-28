/**
 * Redux Toolkit slice for managing profile state in the iOS mobile application
 * 
 * This slice handles all profile-related operations including fetching, updating,
 * and managing freelancer and company profiles, portfolio items, experience entries,
 * education records, and certifications with full TypeScript type safety.
 * 
 * @version 1.0.0
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AnyAction, ThunkAction } from '@reduxjs/toolkit';

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
  CertificationFormValues,
} from '../../types/profile.types';

import api from '../../lib/api';

// Define AppThunk type for typesafe thunk actions
type AppThunk = ThunkAction<ReturnType, Record<string, unknown>, unknown, AnyAction>;

// Initial state
const initialState: ProfileState = {
  freelancerProfile: null,
  companyProfile: null,
  viewedProfile: null,
  loading: false,
  refreshing: false,
  error: null,
};

/**
 * Async thunk for fetching a freelancer profile by ID or current user
 */
export const fetchFreelancerProfile = createAsyncThunk(
  'profile/fetchFreelancerProfile',
  async (id: string | undefined, { rejectWithValue }) => {
    try {
      return await api.profiles.getFreelancerProfile(id);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch freelancer profile');
    }
  }
);

/**
 * Async thunk for fetching a company profile by ID or current user
 */
export const fetchCompanyProfile = createAsyncThunk(
  'profile/fetchCompanyProfile',
  async (id: string | undefined, { rejectWithValue }) => {
    try {
      return await api.profiles.getCompanyProfile(id);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch company profile');
    }
  }
);

/**
 * Async thunk for refreshing profile data with pull-to-refresh UX
 */
export const refreshProfile = createAsyncThunk(
  'profile/refreshProfile',
  async (_, { getState, rejectWithValue }) => {
    try {
      // Get the current state to determine the profile type
      const state = getState() as { profile: ProfileState };
      
      if (state.profile.freelancerProfile) {
        // We know it's a freelancer, so get freelancer profile
        return await api.profiles.getFreelancerProfile(undefined);
      } else if (state.profile.companyProfile) {
        // We know it's a company, so get company profile
        return await api.profiles.getCompanyProfile(undefined);
      } else {
        // If no profile is loaded yet, try both
        try {
          // Try freelancer first
          return await api.profiles.getFreelancerProfile(undefined);
        } catch (freelancerError) {
          // If that fails, try company
          try {
            return await api.profiles.getCompanyProfile(undefined);
          } catch (companyError) {
            // Both failed, throw last error
            throw companyError;
          }
        }
      }
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to refresh profile');
    }
  }
);

/**
 * Async thunk for updating freelancer profile
 */
export const updateFreelancerProfile = createAsyncThunk(
  'profile/updateFreelancerProfile',
  async (data: ProfileFormValues, { rejectWithValue }) => {
    try {
      return await api.profiles.updateFreelancerProfile(data);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update freelancer profile');
    }
  }
);

/**
 * Async thunk for updating company profile
 */
export const updateCompanyProfile = createAsyncThunk(
  'profile/updateCompanyProfile',
  async (data: CompanyFormValues, { rejectWithValue }) => {
    try {
      return await api.profiles.updateCompanyProfile(data);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update company profile');
    }
  }
);

/**
 * Async thunk for uploading profile image
 */
export const uploadProfileImage = createAsyncThunk(
  'profile/uploadProfileImage',
  async (file: { uri: string; type: string; name: string }, { rejectWithValue }) => {
    try {
      return await api.profiles.uploadProfileImage(file);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to upload profile image');
    }
  }
);

/**
 * Async thunk for adding a portfolio item
 */
export const addPortfolioItem = createAsyncThunk(
  'profile/addPortfolioItem',
  async (data: PortfolioItemFormValues, { rejectWithValue }) => {
    try {
      return await api.profiles.addPortfolioItem(data);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to add portfolio item');
    }
  }
);

/**
 * Async thunk for updating a portfolio item
 */
export const updatePortfolioItem = createAsyncThunk(
  'profile/updatePortfolioItem',
  async ({ id, data }: { id: string; data: PortfolioItemFormValues }, { rejectWithValue }) => {
    try {
      return await api.profiles.updatePortfolioItem(id, data);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update portfolio item');
    }
  }
);

/**
 * Async thunk for deleting a portfolio item
 */
export const deletePortfolioItem = createAsyncThunk(
  'profile/deletePortfolioItem',
  async (id: string, { rejectWithValue }) => {
    try {
      return await api.profiles.deletePortfolioItem(id);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete portfolio item');
    }
  }
);

/**
 * Async thunk for adding an experience entry
 */
export const addExperience = createAsyncThunk(
  'profile/addExperience',
  async (data: ExperienceFormValues, { rejectWithValue }) => {
    try {
      return await api.profiles.addExperience(data);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to add experience');
    }
  }
);

/**
 * Async thunk for updating an experience entry
 */
export const updateExperience = createAsyncThunk(
  'profile/updateExperience',
  async ({ id, data }: { id: string; data: ExperienceFormValues }, { rejectWithValue }) => {
    try {
      return await api.profiles.updateExperience(id, data);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update experience');
    }
  }
);

/**
 * Async thunk for deleting an experience entry
 */
export const deleteExperience = createAsyncThunk(
  'profile/deleteExperience',
  async (id: string, { rejectWithValue }) => {
    try {
      return await api.profiles.deleteExperience(id);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete experience');
    }
  }
);

/**
 * Async thunk for adding an education entry
 */
export const addEducation = createAsyncThunk(
  'profile/addEducation',
  async (data: EducationFormValues, { rejectWithValue }) => {
    try {
      return await api.profiles.addEducation(data);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to add education');
    }
  }
);

/**
 * Async thunk for updating an education entry
 */
export const updateEducation = createAsyncThunk(
  'profile/updateEducation',
  async ({ id, data }: { id: string; data: EducationFormValues }, { rejectWithValue }) => {
    try {
      return await api.profiles.updateEducation(id, data);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update education');
    }
  }
);

/**
 * Async thunk for deleting an education entry
 */
export const deleteEducation = createAsyncThunk(
  'profile/deleteEducation',
  async (id: string, { rejectWithValue }) => {
    try {
      return await api.profiles.deleteEducation(id);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete education');
    }
  }
);

/**
 * Async thunk for adding a certification entry
 */
export const addCertification = createAsyncThunk(
  'profile/addCertification',
  async (data: CertificationFormValues, { rejectWithValue }) => {
    try {
      return await api.profiles.addCertification(data);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to add certification');
    }
  }
);

/**
 * Async thunk for updating a certification entry
 */
export const updateCertification = createAsyncThunk(
  'profile/updateCertification',
  async ({ id, data }: { id: string; data: CertificationFormValues }, { rejectWithValue }) => {
    try {
      return await api.profiles.updateCertification(id, data);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update certification');
    }
  }
);

/**
 * Async thunk for deleting a certification entry
 */
export const deleteCertification = createAsyncThunk(
  'profile/deleteCertification',
  async (id: string, { rejectWithValue }) => {
    try {
      return await api.profiles.deleteCertification(id);
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete certification');
    }
  }
);

/**
 * Profile slice for Redux store
 */
export const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    // Set error manually
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Freelancer profile fetch
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
        state.error = action.payload as string || 'Failed to fetch freelancer profile';
      });

    // Company profile fetch
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
        state.error = action.payload as string || 'Failed to fetch company profile';
      });

    // Profile refresh (using pull-to-refresh)
    builder
      .addCase(refreshProfile.pending, (state) => {
        state.refreshing = true;
        state.error = null;
      })
      .addCase(refreshProfile.fulfilled, (state, action) => {
        state.refreshing = false;
        // Check which type of profile was returned
        if ('portfolioItems' in action.payload) {
          state.freelancerProfile = action.payload as FreelancerProfile;
          state.viewedProfile = action.payload as FreelancerProfile;
        } else {
          state.companyProfile = action.payload as CompanyProfile;
          state.viewedProfile = action.payload as CompanyProfile;
        }
      })
      .addCase(refreshProfile.rejected, (state, action) => {
        state.refreshing = false;
        state.error = action.payload as string || 'Failed to refresh profile';
      });

    // Freelancer profile update
    builder
      .addCase(updateFreelancerProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateFreelancerProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.freelancerProfile = action.payload;
        if (state.viewedProfile && 'portfolioItems' in state.viewedProfile) {
          state.viewedProfile = action.payload;
        }
      })
      .addCase(updateFreelancerProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to update freelancer profile';
      });

    // Company profile update
    builder
      .addCase(updateCompanyProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCompanyProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.companyProfile = action.payload;
        if (state.viewedProfile && !('portfolioItems' in state.viewedProfile)) {
          state.viewedProfile = action.payload;
        }
      })
      .addCase(updateCompanyProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to update company profile';
      });

    // Profile image upload
    builder
      .addCase(uploadProfileImage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadProfileImage.fulfilled, (state) => {
        state.loading = false;
        // Note: actual profile update will be handled by updateFreelancerProfile or updateCompanyProfile
      })
      .addCase(uploadProfileImage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to upload profile image';
      });

    // Portfolio item handlers
    builder
      .addCase(addPortfolioItem.fulfilled, (state, action) => {
        if (state.freelancerProfile) {
          state.freelancerProfile.portfolioItems = [
            ...state.freelancerProfile.portfolioItems,
            action.payload,
          ];
          
          // Update viewedProfile if it's a freelancer profile
          if (state.viewedProfile && 'portfolioItems' in state.viewedProfile) {
            state.viewedProfile.portfolioItems = [
              ...state.viewedProfile.portfolioItems,
              action.payload,
            ];
          }
        }
      })
      .addCase(updatePortfolioItem.fulfilled, (state, action) => {
        if (state.freelancerProfile) {
          state.freelancerProfile.portfolioItems = state.freelancerProfile.portfolioItems.map(
            (item) => (item.id === action.payload.id ? action.payload : item)
          );
          
          // Update viewedProfile if it's a freelancer profile
          if (state.viewedProfile && 'portfolioItems' in state.viewedProfile) {
            state.viewedProfile.portfolioItems = state.viewedProfile.portfolioItems.map(
              (item) => (item.id === action.payload.id ? action.payload : item)
            );
          }
        }
      })
      .addCase(deletePortfolioItem.fulfilled, (state, action) => {
        if (state.freelancerProfile && action.payload) {
          state.freelancerProfile.portfolioItems = state.freelancerProfile.portfolioItems.filter(
            (item) => item.id !== action.meta.arg
          );
          
          // Update viewedProfile if it's a freelancer profile
          if (state.viewedProfile && 'portfolioItems' in state.viewedProfile) {
            state.viewedProfile.portfolioItems = state.viewedProfile.portfolioItems.filter(
              (item) => item.id !== action.meta.arg
            );
          }
        }
      });

    // Experience handlers
    builder
      .addCase(addExperience.fulfilled, (state, action) => {
        if (state.freelancerProfile) {
          state.freelancerProfile.experiences = [
            ...state.freelancerProfile.experiences,
            action.payload,
          ];
          
          // Update viewedProfile if it's a freelancer profile
          if (state.viewedProfile && 'experiences' in state.viewedProfile) {
            state.viewedProfile.experiences = [
              ...state.viewedProfile.experiences,
              action.payload,
            ];
          }
        }
      })
      .addCase(updateExperience.fulfilled, (state, action) => {
        if (state.freelancerProfile) {
          state.freelancerProfile.experiences = state.freelancerProfile.experiences.map(
            (item) => (item.id === action.payload.id ? action.payload : item)
          );
          
          // Update viewedProfile if it's a freelancer profile
          if (state.viewedProfile && 'experiences' in state.viewedProfile) {
            state.viewedProfile.experiences = state.viewedProfile.experiences.map(
              (item) => (item.id === action.payload.id ? action.payload : item)
            );
          }
        }
      })
      .addCase(deleteExperience.fulfilled, (state, action) => {
        if (state.freelancerProfile && action.payload) {
          state.freelancerProfile.experiences = state.freelancerProfile.experiences.filter(
            (item) => item.id !== action.meta.arg
          );
          
          // Update viewedProfile if it's a freelancer profile
          if (state.viewedProfile && 'experiences' in state.viewedProfile) {
            state.viewedProfile.experiences = state.viewedProfile.experiences.filter(
              (item) => item.id !== action.meta.arg
            );
          }
        }
      });

    // Education handlers
    builder
      .addCase(addEducation.fulfilled, (state, action) => {
        if (state.freelancerProfile) {
          state.freelancerProfile.educations = [
            ...state.freelancerProfile.educations,
            action.payload,
          ];
          
          // Update viewedProfile if it's a freelancer profile
          if (state.viewedProfile && 'educations' in state.viewedProfile) {
            state.viewedProfile.educations = [
              ...state.viewedProfile.educations,
              action.payload,
            ];
          }
        }
      })
      .addCase(updateEducation.fulfilled, (state, action) => {
        if (state.freelancerProfile) {
          state.freelancerProfile.educations = state.freelancerProfile.educations.map(
            (item) => (item.id === action.payload.id ? action.payload : item)
          );
          
          // Update viewedProfile if it's a freelancer profile
          if (state.viewedProfile && 'educations' in state.viewedProfile) {
            state.viewedProfile.educations = state.viewedProfile.educations.map(
              (item) => (item.id === action.payload.id ? action.payload : item)
            );
          }
        }
      })
      .addCase(deleteEducation.fulfilled, (state, action) => {
        if (state.freelancerProfile && action.payload) {
          state.freelancerProfile.educations = state.freelancerProfile.educations.filter(
            (item) => item.id !== action.meta.arg
          );
          
          // Update viewedProfile if it's a freelancer profile
          if (state.viewedProfile && 'educations' in state.viewedProfile) {
            state.viewedProfile.educations = state.viewedProfile.educations.filter(
              (item) => item.id !== action.meta.arg
            );
          }
        }
      });

    // Certification handlers
    builder
      .addCase(addCertification.fulfilled, (state, action) => {
        if (state.freelancerProfile) {
          state.freelancerProfile.certifications = [
            ...state.freelancerProfile.certifications,
            action.payload,
          ];
          
          // Update viewedProfile if it's a freelancer profile
          if (state.viewedProfile && 'certifications' in state.viewedProfile) {
            state.viewedProfile.certifications = [
              ...state.viewedProfile.certifications,
              action.payload,
            ];
          }
        }
      })
      .addCase(updateCertification.fulfilled, (state, action) => {
        if (state.freelancerProfile) {
          state.freelancerProfile.certifications = state.freelancerProfile.certifications.map(
            (item) => (item.id === action.payload.id ? action.payload : item)
          );
          
          // Update viewedProfile if it's a freelancer profile
          if (state.viewedProfile && 'certifications' in state.viewedProfile) {
            state.viewedProfile.certifications = state.viewedProfile.certifications.map(
              (item) => (item.id === action.payload.id ? action.payload : item)
            );
          }
        }
      })
      .addCase(deleteCertification.fulfilled, (state, action) => {
        if (state.freelancerProfile && action.payload) {
          state.freelancerProfile.certifications = state.freelancerProfile.certifications.filter(
            (item) => item.id !== action.meta.arg
          );
          
          // Update viewedProfile if it's a freelancer profile
          if (state.viewedProfile && 'certifications' in state.viewedProfile) {
            state.viewedProfile.certifications = state.viewedProfile.certifications.filter(
              (item) => item.id !== action.meta.arg
            );
          }
        }
      });

    // Generic error handler for all profile-related operations
    builder.addMatcher(
      (action) => action.type.startsWith('profile/') && action.type.endsWith('/rejected'),
      (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.error = action.payload as string || 'An error occurred';
      }
    );
  },
});

// Export actions
export const { setError, clearError } = profileSlice.actions;

// Export reducer
export default profileSlice.reducer;