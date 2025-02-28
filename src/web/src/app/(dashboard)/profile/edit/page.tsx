import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form'; // ^7.46.1
import { FiUpload, FiSave } from 'react-icons/fi'; // ^4.10.1

import { useProfile } from '../../../hooks/useProfile';
import { useAuth } from '../../../hooks/useAuth';
import Button, { ButtonVariant, ButtonSize } from '../../../components/common/Button';
import Input, { InputType } from '../../../components/common/Input';
import Select from '../../../components/common/Select';
import SkillsList from '../../../components/profile/SkillsList';
import PortfolioSection from '../../../components/profile/PortfolioSection';
import { 
  ProfileType, 
  AvailabilityStatus, 
  ProfileFormValues,
  CompanyFormValues 
} from '../../../types/profile';
import { UserRole } from '../../../../backend/shared/src/types/user.types';
import { isRequired, isEmail, isURL, isPositiveNumber } from '../../../utils/validation';
import useToast from '../../../hooks/useToast';

/**
 * Next.js page component for editing user profiles in the AI Talent Marketplace.
 * Handles both freelancer and company profile types with respective form fields
 * and data persistence.
 */
const ProfileEditPage = () => {
  // Router for navigation after form submission
  const router = useRouter();
  
  // Get authentication and user data
  const { user, isAuthenticated } = useAuth();
  
  // Get profile data and update functions
  const { 
    freelancerProfile, 
    companyProfile, 
    isLoading,
    updateFreelancerProfile,
    updateCompanyProfile,
    uploadProfileImage 
  } = useProfile();
  
  // State for image upload progress tracking
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  // State for form submission status
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // State for validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Form setup for freelancer profile
  const freelancerFormMethods = useForm<ProfileFormValues>({
    mode: 'onBlur',
    defaultValues: {
      title: '',
      bio: '',
      hourlyRate: 0,
      location: '',
      availability: AvailabilityStatus.AVAILABLE,
      githubUrl: '',
      linkedinUrl: '',
      kaggleUrl: '',
      website: '',
      skills: []
    }
  });
  
  // Form setup for company profile
  const companyFormMethods = useForm<CompanyFormValues>({
    mode: 'onBlur',
    defaultValues: {
      name: '',
      description: '',
      website: '',
      industry: '',
      size: '',
      location: '',
      aiInterests: '',
      foundedDate: ''
    }
  });
  
  // Determine profile type based on user role
  const profileType = user?.role === UserRole.FREELANCER 
    ? ProfileType.FREELANCER 
    : ProfileType.COMPANY;
  
  // Initialize toast notifications
  const toast = useToast();
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);
  
  // Initialize forms with existing profile data when component mounts
  useEffect(() => {
    if (profileType === ProfileType.FREELANCER && freelancerProfile) {
      freelancerFormMethods.reset({
        title: freelancerProfile.title || '',
        bio: freelancerProfile.bio || '',
        hourlyRate: freelancerProfile.hourlyRate || 0,
        location: freelancerProfile.location || '',
        availability: freelancerProfile.availability || AvailabilityStatus.AVAILABLE,
        githubUrl: freelancerProfile.githubUrl || '',
        linkedinUrl: freelancerProfile.linkedinUrl || '',
        kaggleUrl: freelancerProfile.kaggleUrl || '',
        website: freelancerProfile.website || '',
        skills: freelancerProfile.skills || []
      });
    } else if (profileType === ProfileType.COMPANY && companyProfile) {
      companyFormMethods.reset({
        name: companyProfile.name || '',
        description: companyProfile.description || '',
        website: companyProfile.website || '',
        industry: companyProfile.industry || '',
        size: companyProfile.size || '',
        location: companyProfile.location || '',
        aiInterests: companyProfile.aiInterests?.join(', ') || '',
        foundedDate: companyProfile.foundedDate || ''
      });
    }
  }, [profileType, freelancerProfile, companyProfile, freelancerFormMethods, companyFormMethods]);

  // Handle profile image upload with progress tracking
  const handleImageUpload = async (file: File) => {
    try {
      setUploadProgress(0);
      
      const result = await uploadProfileImage(file, (progress) => {
        setUploadProgress(progress);
      });
      
      toast.success('Profile image uploaded successfully');
      return result.url;
    } catch (error) {
      toast.error('Failed to upload profile image');
      console.error('Image upload error:', error);
      return null;
    } finally {
      setUploadProgress(0);
    }
  };

  // Handle freelancer profile form submission
  const handleFreelancerSubmit = async (data: ProfileFormValues) => {
    if (isSubmitting) return;
    
    // Validate form data
    const errors: Record<string, string> = {};
    
    if (!isRequired(data.title)) {
      errors.title = 'Professional title is required';
    }
    
    if (!isRequired(data.bio)) {
      errors.bio = 'Bio is required';
    }
    
    if (!isPositiveNumber(data.hourlyRate)) {
      errors.hourlyRate = 'Hourly rate must be a positive number';
    }
    
    if (data.githubUrl && !isURL(data.githubUrl)) {
      errors.githubUrl = 'Please enter a valid URL';
    }
    
    if (data.linkedinUrl && !isURL(data.linkedinUrl)) {
      errors.linkedinUrl = 'Please enter a valid URL';
    }
    
    if (data.kaggleUrl && !isURL(data.kaggleUrl)) {
      errors.kaggleUrl = 'Please enter a valid URL';
    }
    
    if (data.website && !isURL(data.website)) {
      errors.website = 'Please enter a valid URL';
    }
    
    // If there are validation errors, don't submit
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    try {
      setIsSubmitting(true);
      await updateFreelancerProfile(data);
      toast.success('Profile updated successfully');
      router.push('/profile');
    } catch (error) {
      toast.error('Failed to update profile');
      console.error('Profile update error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle company profile form submission
  const handleCompanySubmit = async (data: CompanyFormValues) => {
    if (isSubmitting) return;
    
    // Validate form data
    const errors: Record<string, string> = {};
    
    if (!isRequired(data.name)) {
      errors.name = 'Company name is required';
    }
    
    if (!isRequired(data.description)) {
      errors.description = 'Company description is required';
    }
    
    if (data.website && !isURL(data.website)) {
      errors.website = 'Please enter a valid URL';
    }
    
    // If there are validation errors, don't submit
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    try {
      setIsSubmitting(true);
      // Process aiInterests from comma-separated string to array
      const formattedData = {
        ...data,
        aiInterests: data.aiInterests 
          ? data.aiInterests.split(',').map(item => item.trim()) 
          : [],
      };
      
      await updateCompanyProfile(formattedData);
      toast.success('Company profile updated successfully');
      router.push('/profile');
    } catch (error) {
      toast.error('Failed to update company profile');
      console.error('Company profile update error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel button - return to profile page
  const handleCancel = () => {
    router.push('/profile');
  };

  // Show loading state while profile data is being fetched
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[300px]">
          <p>Loading profile data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>
        
        {profileType === ProfileType.FREELANCER ? (
          <FormProvider {...freelancerFormMethods}>
            <form onSubmit={freelancerFormMethods.handleSubmit(handleFreelancerSubmit)} className="space-y-6">
              {/* Profile Image Upload */}
              <div className="mb-6">
                <div className="flex items-center space-x-4">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-200">
                    {freelancerProfile?.avatarUrl ? (
                      <img 
                        src={freelancerProfile.avatarUrl} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                    
                    {uploadProgress > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white">
                        {uploadProgress}%
                      </div>
                    )}
                  </div>
                  
                  <label className="cursor-pointer">
                    <Button
                      variant={ButtonVariant.OUTLINE}
                      size={ButtonSize.SMALL}
                      className="flex items-center"
                      type="button"
                    >
                      <FiUpload className="mr-2" />
                      Upload Photo
                    </Button>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageUpload(file);
                        }
                      }}
                    />
                  </label>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Upload a professional profile photo (recommended size: 400x400px)
                </p>
              </div>
              
              {/* Basic Info Section */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    name="title"
                    label="Professional Title"
                    placeholder="e.g. Senior ML Engineer"
                    required
                    error={validationErrors.title}
                  />
                  
                  <Input
                    name="hourlyRate"
                    type={InputType.NUMBER}
                    label="Hourly Rate ($)"
                    placeholder="e.g. 85"
                    required
                    error={validationErrors.hourlyRate}
                  />
                  
                  <div className="md:col-span-2">
                    <Input
                      name="bio"
                      label="Professional Bio"
                      placeholder="Write a short professional bio highlighting your AI/ML expertise..."
                      required
                      error={validationErrors.bio}
                    />
                  </div>
                  
                  <Input
                    name="location"
                    label="Location"
                    placeholder="e.g. San Francisco, CA"
                  />
                  
                  <Select
                    name="availability"
                    label="Availability"
                    options={[
                      { value: AvailabilityStatus.AVAILABLE, label: 'Available for work' },
                      { value: AvailabilityStatus.PARTIALLY_AVAILABLE, label: 'Partially available' },
                      { value: AvailabilityStatus.UNAVAILABLE, label: 'Not available' },
                      { value: AvailabilityStatus.AVAILABLE_SOON, label: 'Available soon' },
                    ]}
                  />
                </div>
              </div>
              
              {/* Social & Web Presence */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Web Presence</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    name="githubUrl"
                    label="GitHub URL"
                    placeholder="https://github.com/yourusername"
                    type={InputType.URL}
                    error={validationErrors.githubUrl}
                  />
                  
                  <Input
                    name="linkedinUrl"
                    label="LinkedIn URL"
                    placeholder="https://linkedin.com/in/yourusername"
                    type={InputType.URL}
                    error={validationErrors.linkedinUrl}
                  />
                  
                  <Input
                    name="kaggleUrl"
                    label="Kaggle URL"
                    placeholder="https://kaggle.com/yourusername"
                    type={InputType.URL}
                    error={validationErrors.kaggleUrl}
                  />
                  
                  <Input
                    name="website"
                    label="Personal Website"
                    placeholder="https://yourwebsite.com"
                    type={InputType.URL}
                    error={validationErrors.website}
                  />
                </div>
              </div>
              
              {/* Skills Section */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <SkillsList
                  skills={freelancerProfile?.skills || []}
                  editable={true}
                  onUpdate={(skills) => {
                    freelancerFormMethods.setValue('skills', skills, { shouldValidate: true });
                  }}
                />
              </div>
              
              {/* Form Actions */}
              <div className="flex justify-end space-x-4 mt-8">
                <Button
                  variant={ButtonVariant.OUTLINE}
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  type="button"
                >
                  Cancel
                </Button>
                
                <Button
                  variant={ButtonVariant.PRIMARY}
                  type="submit"
                  isLoading={isSubmitting}
                  className="flex items-center"
                >
                  <FiSave className="mr-2" />
                  Save Changes
                </Button>
              </div>
            </form>
          </FormProvider>
        ) : (
          <FormProvider {...companyFormMethods}>
            <form onSubmit={companyFormMethods.handleSubmit(handleCompanySubmit)} className="space-y-6">
              {/* Company Logo Upload */}
              <div className="mb-6">
                <div className="flex items-center space-x-4">
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-200">
                    {companyProfile?.logoUrl ? (
                      <img 
                        src={companyProfile.logoUrl} 
                        alt="Company Logo" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No Logo
                      </div>
                    )}
                    
                    {uploadProgress > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white">
                        {uploadProgress}%
                      </div>
                    )}
                  </div>
                  
                  <label className="cursor-pointer">
                    <Button
                      variant={ButtonVariant.OUTLINE}
                      size={ButtonSize.SMALL}
                      className="flex items-center"
                      type="button"
                    >
                      <FiUpload className="mr-2" />
                      Upload Logo
                    </Button>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageUpload(file);
                        }
                      }}
                    />
                  </label>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Upload your company logo (recommended size: 400x400px)
                </p>
              </div>
              
              {/* Company Info Section */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Company Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    name="name"
                    label="Company Name"
                    placeholder="Your Company Name"
                    required
                    error={validationErrors.name}
                  />
                  
                  <Input
                    name="website"
                    type={InputType.URL}
                    label="Company Website"
                    placeholder="https://yourcompany.com"
                    error={validationErrors.website}
                  />
                  
                  <div className="md:col-span-2">
                    <Input
                      name="description"
                      label="Company Description"
                      placeholder="Tell us about your company and AI initiatives..."
                      required
                      error={validationErrors.description}
                    />
                  </div>
                  
                  <Input
                    name="industry"
                    label="Industry"
                    placeholder="e.g. Healthcare, Finance, Retail"
                  />
                  
                  <Input
                    name="size"
                    label="Company Size"
                    placeholder="e.g. 10-50 employees"
                  />
                  
                  <Input
                    name="location"
                    label="Location"
                    placeholder="e.g. San Francisco, CA"
                  />
                  
                  <Input
                    name="foundedDate"
                    type={InputType.DATE}
                    label="Founded Date"
                  />
                </div>
              </div>
              
              {/* AI Interests */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">AI Interests</h2>
                <Input
                  name="aiInterests"
                  label="AI Technologies of Interest"
                  placeholder="e.g. Machine Learning, Computer Vision, NLP (comma separated)"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Enter the AI technologies your company is interested in or using, separated by commas
                </p>
              </div>
              
              {/* Form Actions */}
              <div className="flex justify-end space-x-4 mt-8">
                <Button
                  variant={ButtonVariant.OUTLINE}
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  type="button"
                >
                  Cancel
                </Button>
                
                <Button
                  variant={ButtonVariant.PRIMARY}
                  type="submit"
                  isLoading={isSubmitting}
                  className="flex items-center"
                >
                  <FiSave className="mr-2" />
                  Save Changes
                </Button>
              </div>
            </form>
          </FormProvider>
        )}
      </div>
    </div>
  );
};

export default ProfileEditPage;