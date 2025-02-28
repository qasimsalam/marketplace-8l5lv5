/**
 * Validation Utilities
 * 
 * A comprehensive utility module providing validation functions for form inputs, 
 * data structures, and business rules in the AI Talent Marketplace iOS application.
 * 
 * @version 1.0.0
 */

import validator from 'validator'; // v13.11.0
import { isDateInFuture, isDateInPast } from './date';

// Import form value interfaces for typed validation
import { 
  LoginFormValues,
  RegisterFormValues,
  ForgotPasswordFormValues,
  ResetPasswordFormValues,
  ChangePasswordFormValues 
} from '../types/auth.types';

import {
  JobFormValues,
  ProposalFormValues,
  ProposalMilestoneFormValues
} from '../types/job.types';

import {
  ProfileFormValues,
  PortfolioItemFormValues,
  ExperienceFormValues,
  EducationFormValues,
  CertificationFormValues
} from '../types/profile.types';

/**
 * Regular expression patterns for common validation rules
 */
export const REGEX_PATTERNS = {
  EMAIL: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  URL: /^(https?:\/\/)?([a-z0-9_\-]+\.)+[a-z0-9]{2,}(\/.*)*$/i,
  PHONE: /^\+?[0-9]{10,15}$/
};

/**
 * Constraints for file uploads in the iOS app
 */
export const FILE_UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: [
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'application/pdf', 
    'application/zip', 
    'application/json', 
    'text/plain', 
    'application/x-ipynb+json'
  ],
  MAX_FILES_PER_REQUEST: 5
};

/**
 * Validates if a string is a properly formatted email address
 * 
 * @param email - Email string to validate
 * @returns True if the email is valid, false otherwise
 */
export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  email = email.trim();
  if (email.length === 0) {
    return false;
  }
  
  return REGEX_PATTERNS.EMAIL.test(email);
};

/**
 * Validates if a password meets the platform's security requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * 
 * @param password - Password string to validate
 * @returns True if the password meets all requirements, false otherwise
 */
export const validatePassword = (password: string): boolean => {
  if (!password || typeof password !== 'string') {
    return false;
  }
  
  if (password.length < 8) {
    return false;
  }
  
  return REGEX_PATTERNS.PASSWORD.test(password);
};

/**
 * Validates if a string is a properly formatted URL
 * 
 * @param url - URL string to validate
 * @param allowRelative - Whether to allow relative URLs (default: false)
 * @returns True if the URL is valid, false otherwise
 */
export const validateUrl = (url: string, allowRelative = false): boolean => {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  url = url.trim();
  if (url.length === 0) {
    return false;
  }
  
  // Allow relative URLs if specified
  if (allowRelative && url.startsWith('/')) {
    return true;
  }
  
  // For iOS devices, the validator package is more reliable than custom regex
  return validator.isURL(url, { 
    require_protocol: false,
    require_valid_protocol: true,
    protocols: ['http', 'https'],
    require_host: true,
    allow_underscores: true,
    allow_trailing_dot: false,
    allow_protocol_relative_urls: allowRelative
  });
};

/**
 * Validates if a string is a properly formatted phone number
 * 
 * @param phone - Phone number string to validate
 * @returns True if the phone number is valid, false otherwise
 */
export const validatePhone = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  
  phone = phone.trim();
  if (phone.length === 0) {
    return false;
  }
  
  return REGEX_PATTERNS.PHONE.test(phone);
};

/**
 * Validates file uploads against size and type constraints, with iOS-specific considerations
 * 
 * @param file - File object from iOS document picker or image picker
 * @returns Object with validation status and error message if applicable
 */
export const validateFileUpload = (file: { uri: string; type: string; name: string; size?: number }): { valid: boolean; error?: string } => {
  // iOS sometimes doesn't provide file size in the picker result
  // We need to handle this case gracefully
  if (file.size && file.size > FILE_UPLOAD_LIMITS.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds the maximum allowed size of ${FILE_UPLOAD_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB`
    };
  }
  
  // iOS might not provide MIME type, especially from camera roll
  // In those cases, infer from file extension
  const fileType = file.type || (file.name ? inferFileTypeFromName(file.name) : '');
  
  if (!fileType || !FILE_UPLOAD_LIMITS.ALLOWED_FILE_TYPES.includes(fileType)) {
    return {
      valid: false,
      error: 'File type is not supported. Please upload a different file.'
    };
  }
  
  return { valid: true };
};

/**
 * Helper function to infer file type from filename for iOS file pickers
 * This is needed because iOS doesn't always provide MIME types
 */
const inferFileTypeFromName = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  const mimeTypeMap: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'pdf': 'application/pdf',
    'zip': 'application/zip',
    'json': 'application/json',
    'txt': 'text/plain',
    'ipynb': 'application/x-ipynb+json'
  };
  
  return mimeTypeMap[extension] || '';
};

/**
 * Validates multiple file uploads against constraints, with iOS-specific optimizations
 * 
 * @param files - Array of file objects from iOS pickers
 * @returns Object with validation status and array of error messages if applicable
 */
export const validateFileUploads = (files: { uri: string; type: string; name: string; size?: number }[]): { valid: boolean; errors?: string[] } => {
  if (!files || !Array.isArray(files)) {
    return { valid: false, errors: ['Invalid files input'] };
  }
  
  if (files.length > FILE_UPLOAD_LIMITS.MAX_FILES_PER_REQUEST) {
    return {
      valid: false,
      errors: [`Maximum of ${FILE_UPLOAD_LIMITS.MAX_FILES_PER_REQUEST} files allowed per upload`]
    };
  }
  
  const errors: string[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const validation = validateFileUpload(files[i]);
    if (!validation.valid && validation.error) {
      errors.push(`File "${files[i].name}": ${validation.error}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
};

/**
 * Validates if a value is a positive number with up to 2 decimal places
 * 
 * @param amount - Number value to validate
 * @returns True if the amount is valid, false otherwise
 */
export const isValidAmount = (amount: number): boolean => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return false;
  }
  
  if (amount <= 0) {
    return false;
  }
  
  // Check if it has at most 2 decimal places
  const str = amount.toString();
  const decimalPlaces = str.includes('.') ? str.split('.')[1].length : 0;
  
  return decimalPlaces <= 2;
};

/**
 * Validates if a value is a valid date and optionally in the future
 * 
 * @param date - Date object to validate
 * @param mustBeFuture - Whether the date must be in the future
 * @returns True if the date is valid, false otherwise
 */
export const isValidDate = (date: Date, mustBeFuture = false): boolean => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return false;
  }
  
  if (mustBeFuture && !isDateInFuture(date)) {
    return false;
  }
  
  return true;
};

/**
 * Validates if start date is before end date
 * 
 * @param startDate - Start date to validate
 * @param endDate - End date to validate
 * @returns True if the date range is valid, false otherwise
 */
export const isValidDateRange = (startDate: Date, endDate: Date): boolean => {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return false;
  }
  
  return startDate < endDate;
};

/**
 * Validates if a string is a valid UUID
 * 
 * @param id - UUID string to validate
 * @returns True if the ID is a valid UUID, false otherwise
 */
export const isValidUUID = (id: string): boolean => {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  return validator.isUUID(id);
};

/**
 * Validates login form values with iOS-specific considerations
 * 
 * @param values - Login form values
 * @returns Validation result with errors
 */
export const validateLoginForm = (values: LoginFormValues): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Email validation
  if (!validateEmail(values.email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  // Password validation (only needed if not using biometrics)
  if (!values.useBiometrics && !validatePassword(values.password)) {
    errors.password = 'Please enter a valid password';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates registration form values with iOS-specific adaptations
 * 
 * @param values - Registration form values
 * @returns Validation result with errors
 */
export const validateRegisterForm = (values: RegisterFormValues): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Email validation
  if (!validateEmail(values.email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  // Password validation
  if (!validatePassword(values.password)) {
    errors.password = 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character';
  }
  
  // Confirm password
  if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  
  // Name validation
  if (!values.firstName || values.firstName.trim().length === 0) {
    errors.firstName = 'First name is required';
  }
  
  if (!values.lastName || values.lastName.trim().length === 0) {
    errors.lastName = 'Last name is required';
  }
  
  // Terms agreement required
  if (!values.agreeToTerms) {
    errors.agreeToTerms = 'You must agree to the terms and conditions';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates forgot password form values
 * 
 * @param values - Forgot password form values
 * @returns Validation result with errors
 */
export const validateForgotPasswordForm = (values: ForgotPasswordFormValues): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Email validation
  if (!validateEmail(values.email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates reset password form values
 * 
 * @param values - Reset password form values
 * @returns Validation result with errors
 */
export const validateResetPasswordForm = (values: ResetPasswordFormValues): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Password validation
  if (!validatePassword(values.password)) {
    errors.password = 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character';
  }
  
  // Confirm password
  if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  
  // Token validation
  if (!values.token || values.token.trim().length === 0) {
    errors.token = 'Reset token is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates change password form values
 * 
 * @param values - Change password form values
 * @returns Validation result with errors
 */
export const validateChangePasswordForm = (values: ChangePasswordFormValues): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Current password validation
  if (!values.currentPassword || values.currentPassword.trim().length === 0) {
    errors.currentPassword = 'Current password is required';
  }
  
  // New password validation
  if (!validatePassword(values.newPassword)) {
    errors.newPassword = 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character';
  }
  
  // Confirm password
  if (values.newPassword !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates job posting form values with iOS UI optimizations
 * 
 * @param values - Job form values
 * @returns Validation result with errors
 */
export const validateJobForm = (values: JobFormValues): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Title and description
  if (!values.title || values.title.trim().length === 0) {
    errors.title = 'Job title is required';
  }
  
  if (!values.description || values.description.trim().length === 0) {
    errors.description = 'Job description is required';
  }
  
  // Budget validation based on job type
  if (values.type === 'fixed_price' || values.type === 'milestone_based') {
    if (!isValidAmount(values.budget)) {
      errors.budget = 'Please enter a valid budget amount';
    }
  } else if (values.type === 'hourly') {
    if (!isValidAmount(values.hourlyRate)) {
      errors.hourlyRate = 'Please enter a valid hourly rate';
    }
    
    if (values.estimatedHours <= 0) {
      errors.estimatedHours = 'Please enter valid estimated hours';
    }
  }
  
  // Required skills
  if (!values.requiredSkills || values.requiredSkills.length === 0) {
    errors.requiredSkills = 'At least one required skill must be selected';
  }
  
  // File attachments validation
  if (values.attachments && values.attachments.length > 0) {
    const fileValidation = validateFileUploads(values.attachments);
    if (!fileValidation.valid && fileValidation.errors) {
      errors.attachments = fileValidation.errors[0]; // First error for mobile UI simplicity
    }
  }
  
  // Date validation for longer projects
  if (values.startDate && values.endDate) {
    if (!isValidDateRange(values.startDate, values.endDate)) {
      errors.dateRange = 'End date must be after start date';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates job proposal form values with iOS UI optimizations
 * 
 * @param values - Proposal form values
 * @returns Validation result with errors
 */
export const validateProposalForm = (values: ProposalFormValues): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Cover letter validation
  if (!values.coverLetter || values.coverLetter.trim().length === 0) {
    errors.coverLetter = 'Cover letter is required';
  }
  
  // Rate or budget validation
  if (values.proposedRate > 0 && !isValidAmount(values.proposedRate)) {
    errors.proposedRate = 'Please enter a valid hourly rate';
  }
  
  if (values.proposedBudget > 0 && !isValidAmount(values.proposedBudget)) {
    errors.proposedBudget = 'Please enter a valid budget amount';
  }
  
  // At least one of rate or budget must be valid
  if (!(values.proposedRate > 0 || values.proposedBudget > 0)) {
    errors.proposedRate = 'Please specify either an hourly rate or a fixed budget';
  }
  
  // Milestones validation
  if (values.milestones && values.milestones.length > 0) {
    const milestoneValidation = validateProposalMilestones(values.milestones);
    if (!milestoneValidation.isValid) {
      errors.milestones = 'One or more milestones have validation errors';
      
      // If there's a first error, add it for immediate feedback on mobile
      if (milestoneValidation.errors && milestoneValidation.errors.length > 0) {
        const firstError = Object.values(milestoneValidation.errors[0])[0];
        if (firstError) {
          errors.milestoneDetail = firstError;
        }
      }
    }
  }
  
  // File attachments validation
  if (values.attachments && values.attachments.length > 0) {
    const fileValidation = validateFileUploads(values.attachments);
    if (!fileValidation.valid && fileValidation.errors) {
      errors.attachments = fileValidation.errors[0]; // First error for mobile UI simplicity
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates milestone arrays in proposals
 * 
 * @param milestones - Array of proposal milestone values
 * @returns Validation result with array of errors per milestone
 */
export const validateProposalMilestones = (milestones: ProposalMilestoneFormValues[]): { isValid: boolean; errors: Array<Record<string, string>> } => {
  const errors: Array<Record<string, string>> = [];
  let hasErrors = false;
  
  milestones.forEach((milestone, index) => {
    const milestoneErrors: Record<string, string> = {};
    
    // Title and description
    if (!milestone.title || milestone.title.trim().length === 0) {
      milestoneErrors.title = 'Milestone title is required';
      hasErrors = true;
    }
    
    if (!milestone.description || milestone.description.trim().length === 0) {
      milestoneErrors.description = 'Milestone description is required';
      hasErrors = true;
    }
    
    // Amount validation
    if (!isValidAmount(milestone.amount)) {
      milestoneErrors.amount = 'Please enter a valid amount for the milestone';
      hasErrors = true;
    }
    
    // Due date validation
    if (!milestone.dueDate || !isValidDate(milestone.dueDate, true)) {
      milestoneErrors.dueDate = 'Please set a valid future date for the milestone';
      hasErrors = true;
    }
    
    errors[index] = milestoneErrors;
  });
  
  return {
    isValid: !hasErrors,
    errors
  };
};

/**
 * Validates freelancer profile form values with iOS-specific adaptations
 * 
 * @param values - Profile form values
 * @returns Validation result with errors
 */
export const validateProfileForm = (values: ProfileFormValues): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Title and bio validation
  if (!values.title || values.title.trim().length === 0) {
    errors.title = 'Professional title is required';
  }
  
  if (!values.bio || values.bio.trim().length === 0) {
    errors.bio = 'Bio is required';
  }
  
  // Hourly rate validation
  if (!isValidAmount(values.hourlyRate)) {
    errors.hourlyRate = 'Please enter a valid hourly rate';
  }
  
  // Skills validation
  if (!values.skills || values.skills.length === 0) {
    errors.skills = 'At least one skill must be selected';
  }
  
  // URL validations (optional fields)
  if (values.githubUrl && !validateUrl(values.githubUrl)) {
    errors.githubUrl = 'Please enter a valid GitHub URL';
  }
  
  if (values.linkedinUrl && !validateUrl(values.linkedinUrl)) {
    errors.linkedinUrl = 'Please enter a valid LinkedIn URL';
  }
  
  if (values.kaggleUrl && !validateUrl(values.kaggleUrl)) {
    errors.kaggleUrl = 'Please enter a valid Kaggle URL';
  }
  
  if (values.website && !validateUrl(values.website)) {
    errors.website = 'Please enter a valid website URL';
  }
  
  // Avatar file validation (if provided)
  if (values.avatar && values.avatar.uri) {
    const fileValidation = validateFileUpload(values.avatar);
    if (!fileValidation.valid) {
      errors.avatar = fileValidation.error || 'Invalid profile image';
    }
  }
  
  // Experience years validation
  if (values.experienceYears < 0 || values.experienceYears > 50) {
    errors.experienceYears = 'Please enter a valid number of experience years (0-50)';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates portfolio item form values with iOS-specific adaptations
 * 
 * @param values - Portfolio item form values
 * @returns Validation result with errors
 */
export const validatePortfolioItemForm = (values: PortfolioItemFormValues): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Title and description validation
  if (!values.title || values.title.trim().length === 0) {
    errors.title = 'Project title is required';
  }
  
  if (!values.description || values.description.trim().length === 0) {
    errors.description = 'Project description is required';
  }
  
  // URL validations (at least one URL is required)
  const hasAnyUrl = values.projectUrl || values.githubUrl || values.kaggleUrl;
  
  if (!hasAnyUrl) {
    errors.projectUrl = 'At least one project URL is required';
  } else {
    // Validate provided URLs
    if (values.projectUrl && !validateUrl(values.projectUrl)) {
      errors.projectUrl = 'Please enter a valid project URL';
    }
    
    if (values.githubUrl && !validateUrl(values.githubUrl)) {
      errors.githubUrl = 'Please enter a valid GitHub URL';
    }
    
    if (values.kaggleUrl && !validateUrl(values.kaggleUrl)) {
      errors.kaggleUrl = 'Please enter a valid Kaggle URL';
    }
  }
  
  // Date range validation
  if (values.startDate && values.endDate) {
    if (!isValidDateRange(values.startDate, values.endDate)) {
      errors.dateRange = 'End date must be after start date';
    }
  }
  
  // Technologies/skills validation
  if (!values.technologies || values.technologies.length === 0) {
    errors.technologies = 'At least one technology must be selected';
  }
  
  // Image file validation (if provided)
  if (values.image && values.image.uri) {
    const fileValidation = validateFileUpload(values.image);
    if (!fileValidation.valid) {
      errors.image = fileValidation.error || 'Invalid project image';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates experience form values with iOS-specific adaptations
 * 
 * @param values - Experience form values
 * @returns Validation result with errors
 */
export const validateExperienceForm = (values: ExperienceFormValues): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Company, title, and description validation
  if (!values.company || values.company.trim().length === 0) {
    errors.company = 'Company name is required';
  }
  
  if (!values.title || values.title.trim().length === 0) {
    errors.title = 'Job title is required';
  }
  
  if (!values.description || values.description.trim().length === 0) {
    errors.description = 'Job description is required';
  }
  
  // Date validation
  if (!values.startDate || !isValidDate(values.startDate)) {
    errors.startDate = 'Please enter a valid start date';
  }
  
  // End date only required if not current position
  if (!values.isCurrentPosition) {
    if (!values.endDate || !isValidDate(values.endDate)) {
      errors.endDate = 'Please enter a valid end date';
    }
    
    // Check date range if both dates are provided
    if (values.startDate && values.endDate && !isValidDateRange(values.startDate, values.endDate)) {
      errors.dateRange = 'End date must be after start date';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates education form values with iOS-specific adaptations
 * 
 * @param values - Education form values
 * @returns Validation result with errors
 */
export const validateEducationForm = (values: EducationFormValues): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Institution, degree, and field validation
  if (!values.institution || values.institution.trim().length === 0) {
    errors.institution = 'Institution name is required';
  }
  
  if (!values.degree || values.degree.trim().length === 0) {
    errors.degree = 'Degree is required';
  }
  
  if (!values.fieldOfStudy || values.fieldOfStudy.trim().length === 0) {
    errors.fieldOfStudy = 'Field of study is required';
  }
  
  // Date validation
  if (!values.startDate || !isValidDate(values.startDate)) {
    errors.startDate = 'Please enter a valid start date';
  }
  
  // End date only required if not currently studying
  if (!values.isCurrentlyStudying) {
    if (!values.endDate || !isValidDate(values.endDate)) {
      errors.endDate = 'Please enter a valid end date';
    }
    
    // Check date range if both dates are provided
    if (values.startDate && values.endDate && !isValidDateRange(values.startDate, values.endDate)) {
      errors.dateRange = 'End date must be after start date';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates certification form values with iOS-specific adaptations
 * 
 * @param values - Certification form values
 * @returns Validation result with errors
 */
export const validateCertificationForm = (values: CertificationFormValues): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Name and issuing organization validation
  if (!values.name || values.name.trim().length === 0) {
    errors.name = 'Certification name is required';
  }
  
  if (!values.issuingOrganization || values.issuingOrganization.trim().length === 0) {
    errors.issuingOrganization = 'Issuing organization is required';
  }
  
  // Issue date validation
  if (!values.issueDate || !isValidDate(values.issueDate)) {
    errors.issueDate = 'Please enter a valid issue date';
  }
  
  // Expiration date validation (if not marked as 'does not expire')
  if (!values.doesNotExpire) {
    if (values.expirationDate) {
      if (!isValidDate(values.expirationDate)) {
        errors.expirationDate = 'Please enter a valid expiration date';
      }
      
      // Check date range
      if (values.issueDate && values.expirationDate && !isValidDateRange(values.issueDate, values.expirationDate)) {
        errors.dateRange = 'Expiration date must be after issue date';
      }
    }
  }
  
  // Credential URL validation (if provided)
  if (values.credentialUrl && !validateUrl(values.credentialUrl)) {
    errors.credentialUrl = 'Please enter a valid credential URL';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};