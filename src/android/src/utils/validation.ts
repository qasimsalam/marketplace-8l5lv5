/**
 * Validation utilities for the AI Talent Marketplace Android application.
 * 
 * This module provides validation functions for form inputs, data structures,
 * and business rules, with Android-specific considerations for touch interfaces,
 * file handling, and platform integration.
 * 
 * @version 1.0.0
 */

import { isDateInFuture, isDateInPast } from './date';
import validator from 'validator'; // v13.11.0
import { Platform } from 'react-native'; // v0.72.x

// Auth-related form value types
import {
  LoginFormValues,
  RegisterFormValues,
  ForgotPasswordFormValues,
  ResetPasswordFormValues,
  ChangePasswordFormValues
} from '../types/auth.types';

// Job-related form value types
import {
  JobFormValues,
  ProposalFormValues,
  ProposalMilestoneFormValues
} from '../types/job.types';

// Profile-related form value types
import {
  ProfileFormValues,
  PortfolioItemFormValues,
  ExperienceFormValues,
  EducationFormValues,
  CertificationFormValues
} from '../types/profile.types';

/**
 * Regular expression patterns for common validation
 */
export const REGEX_PATTERNS = {
  EMAIL: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  URL: /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?$/i,
  PHONE: /^\+?[0-9]{10,15}$/
};

/**
 * File upload limits and constraints for Android
 */
export const FILE_UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB in bytes
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
  MAX_FILES_PER_REQUEST: 5,
  ANDROID_CONTENT_URIS: [
    'content://',
    'file://',
    '/storage/',
    '/sdcard/'
  ]
};

/**
 * Common Android MIME types for different sources
 */
export const ANDROID_MIME_TYPES = {
  CAMERA_JPEG: 'image/jpeg',
  GALLERY_JPEG: 'image/jpeg',
  GALLERY_PNG: 'image/png',
  DOCUMENT_PDF: 'application/pdf',
  DOCUMENT_JSON: 'application/json',
  DOCUMENT_TEXT: 'text/plain'
};

// =========================================================================
// Basic Validation Functions
// =========================================================================

/**
 * Validates if a string is a properly formatted email address
 * 
 * @param email - The email address to validate
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
 * - Contains at least one uppercase letter
 * - Contains at least one lowercase letter
 * - Contains at least one number
 * - Contains at least one special character
 * 
 * @param password - The password to validate
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
 * Validates if a string is a properly formatted URL, with Android deep link support
 * 
 * @param url - The URL to validate
 * @param allowRelative - Whether to allow relative URLs
 * @returns True if the URL is valid, false otherwise
 */
export const validateUrl = (url: string, allowRelative = false): boolean => {
  if (!url || typeof url !== 'string') {
    return allowRelative ? true : false;
  }
  
  url = url.trim();
  if (url.length === 0) {
    return allowRelative ? true : false;
  }
  
  // Allow relative URLs if specified
  if (allowRelative && url.startsWith('/')) {
    return true;
  }
  
  // Special handling for Android deep links
  if (
    url.startsWith('content://') ||
    url.startsWith('market://') ||
    url.startsWith('intent://') ||
    url.startsWith('app://')
  ) {
    return true;
  }

  // URL pattern validation
  return REGEX_PATTERNS.URL.test(url) || validator.isURL(url);
};

/**
 * Validates if a string is a properly formatted phone number
 * 
 * @param phone - The phone number to validate
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

// =========================================================================
// File Validation Functions
// =========================================================================

/**
 * Validates a file upload against size and type constraints, with Android-specific handling
 * 
 * @param file - The file object with uri, type, and size/name
 * @returns Object with validation status and error message if applicable
 */
export const validateFileUpload = (file: any): { valid: boolean, error?: string } => {
  if (!file || typeof file !== 'object') {
    return { valid: false, error: 'Invalid file object' };
  }
  
  // Handle Android-specific file objects from content providers
  let fileType = file.type;
  const fileSize = file.size || 0;
  const fileName = file.name || '';
  
  // Map Android content URIs to appropriate MIME types if needed
  if (Platform.OS === 'android' && (!fileType || fileType === '')) {
    if (file.uri) {
      if (isAndroidContentUri(file.uri)) {
        fileType = getAndroidMimeType(file.uri);
      } else if (fileName) {
        fileType = getAndroidMimeType(fileName);
      }
    }
  }
  
  // Validate file size
  if (fileSize > FILE_UPLOAD_LIMITS.MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `File size exceeds maximum limit of ${FILE_UPLOAD_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB` 
    };
  }
  
  // Validate file type
  if (fileType && FILE_UPLOAD_LIMITS.ALLOWED_FILE_TYPES.indexOf(fileType) === -1) {
    return { 
      valid: false, 
      error: `File type '${fileType}' is not allowed` 
    };
  }
  
  return { valid: true };
};

/**
 * Validates multiple file uploads against constraints, with Android-specific optimizations
 * 
 * @param files - Array of file objects to validate
 * @returns Object with overall validation status and array of error messages
 */
export const validateFileUploads = (files: any[]): { valid: boolean, errors?: string[] } => {
  if (!Array.isArray(files)) {
    return { valid: false, errors: ['Invalid files array'] };
  }
  
  // Validate number of files
  if (files.length > FILE_UPLOAD_LIMITS.MAX_FILES_PER_REQUEST) {
    return { 
      valid: false, 
      errors: [`Maximum of ${FILE_UPLOAD_LIMITS.MAX_FILES_PER_REQUEST} files can be uploaded at once`] 
    };
  }
  
  // Validate each file
  const errors: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const validation = validateFileUpload(files[i]);
    if (!validation.valid && validation.error) {
      errors.push(`File ${i + 1}: ${validation.error}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
};

// =========================================================================
// Data Validation Functions
// =========================================================================

/**
 * Validates if a value is a positive number with up to 2 decimal places
 * 
 * @param amount - The amount to validate
 * @returns True if the amount is valid, false otherwise
 */
export const isValidAmount = (amount: number): boolean => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return false;
  }
  
  if (amount <= 0) {
    return false;
  }
  
  // Check if amount has at most 2 decimal places
  const str = amount.toString();
  const decimalPointIndex = str.indexOf('.');
  if (decimalPointIndex !== -1) {
    return str.length - decimalPointIndex - 1 <= 2;
  }
  
  return true;
};

/**
 * Validates if a value is a valid date and optionally in the future
 * 
 * @param date - The date to validate
 * @param mustBeFuture - Whether the date must be in the future
 * @returns True if the date is valid, false otherwise
 */
export const isValidDate = (date: Date, mustBeFuture = false): boolean => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return false;
  }
  
  // If the date must be in the future, check it
  if (mustBeFuture && !isDateInFuture(date)) {
    return false;
  }
  
  return true;
};

/**
 * Validates if start date is before end date
 * 
 * @param startDate - The start date
 * @param endDate - The end date
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
 * @param id - The ID to validate
 * @returns True if the ID is a valid UUID, false otherwise
 */
export const isValidUUID = (id: string): boolean => {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  return validator.isUUID(id);
};

// =========================================================================
// Form Validation Functions
// =========================================================================

/**
 * Validates login form values with Android-specific considerations
 * 
 * @param values - The login form values
 * @returns Validation result with errors object
 */
export const validateLoginForm = (values: LoginFormValues): { isValid: boolean, errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Validate email
  if (!validateEmail(values.email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  // Validate password if not using other authentication methods
  if (!values.useBiometrics) {
    if (!values.password || values.password.trim() === '') {
      errors.password = 'Password is required';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates registration form values with Android-specific adaptations
 * 
 * @param values - The registration form values
 * @returns Validation result with errors object
 */
export const validateRegisterForm = (values: RegisterFormValues): { isValid: boolean, errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Validate email
  if (!validateEmail(values.email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  // Validate password
  if (!validatePassword(values.password)) {
    errors.password = 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character';
  }
  
  // Validate password confirmation
  if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  
  // Validate name
  if (!values.firstName || values.firstName.trim() === '') {
    errors.firstName = 'First name is required';
  }
  
  if (!values.lastName || values.lastName.trim() === '') {
    errors.lastName = 'Last name is required';
  }
  
  // Validate terms acceptance
  if (!values.agreeToTerms) {
    errors.agreeToTerms = 'You must agree to the Terms and Conditions';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates forgot password form values
 * 
 * @param values - The forgot password form values
 * @returns Validation result with errors object
 */
export const validateForgotPasswordForm = (values: ForgotPasswordFormValues): { isValid: boolean, errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Validate email
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
 * @param values - The reset password form values
 * @returns Validation result with errors object
 */
export const validateResetPasswordForm = (values: ResetPasswordFormValues): { isValid: boolean, errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Validate password
  if (!validatePassword(values.password)) {
    errors.password = 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character';
  }
  
  // Validate password confirmation
  if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  
  // Validate token
  if (!values.token || values.token.trim() === '') {
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
 * @param values - The change password form values
 * @returns Validation result with errors object
 */
export const validateChangePasswordForm = (values: ChangePasswordFormValues): { isValid: boolean, errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Validate current password
  if (!values.currentPassword || values.currentPassword.trim() === '') {
    errors.currentPassword = 'Current password is required';
  }
  
  // Validate new password
  if (!validatePassword(values.newPassword)) {
    errors.newPassword = 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character';
  }
  
  // Validate password confirmation
  if (values.newPassword !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates job posting form values with Android UI optimizations
 * 
 * @param values - The job form values
 * @returns Validation result with errors object
 */
export const validateJobForm = (values: JobFormValues): { isValid: boolean, errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Validate title and description
  if (!values.title || values.title.trim() === '') {
    errors.title = 'Title is required';
  }
  
  if (!values.description || values.description.trim() === '') {
    errors.description = 'Description is required';
  }
  
  // Validate budget based on job type
  if (values.type === 'fixed_price' || values.type === 'milestone_based') {
    if (!isValidAmount(values.budget)) {
      errors.budget = 'Please enter a valid budget amount';
    }
  } else if (values.type === 'hourly') {
    if (!isValidAmount(values.hourlyRate)) {
      errors.hourlyRate = 'Please enter a valid hourly rate';
    }
    
    if (values.estimatedHours <= 0) {
      errors.estimatedHours = 'Please enter estimated hours';
    }
  }
  
  // Validate range budget if applicable
  if (values.type === 'fixed_price' && values.minBudget && values.maxBudget) {
    if (!isValidAmount(values.minBudget)) {
      errors.minBudget = 'Please enter a valid minimum budget';
    }
    
    if (!isValidAmount(values.maxBudget)) {
      errors.maxBudget = 'Please enter a valid maximum budget';
    }
    
    if (isValidAmount(values.minBudget) && isValidAmount(values.maxBudget) && values.minBudget > values.maxBudget) {
      errors.maxBudget = 'Maximum budget must be greater than minimum budget';
    }
  }
  
  // Validate required skills
  if (!values.requiredSkills || values.requiredSkills.length === 0) {
    errors.requiredSkills = 'Please select at least one required skill';
  }
  
  // Validate dates
  if (values.startDate && !isValidDate(values.startDate)) {
    errors.startDate = 'Please enter a valid start date';
  }
  
  if (values.endDate && !isValidDate(values.endDate)) {
    errors.endDate = 'Please enter a valid end date';
  }
  
  if (values.startDate && values.endDate && !isValidDateRange(values.startDate, values.endDate)) {
    errors.endDate = 'End date must be after start date';
  }
  
  // Validate file attachments if any
  if (values.attachments && values.attachments.length > 0) {
    const fileValidation = validateFileUploads(values.attachments);
    if (!fileValidation.valid && fileValidation.errors) {
      errors.attachments = fileValidation.errors[0];
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates job proposal form values with Android UI optimizations
 * 
 * @param values - The proposal form values
 * @returns Validation result with errors object
 */
export const validateProposalForm = (values: ProposalFormValues): { isValid: boolean, errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Validate cover letter
  if (!values.coverLetter || values.coverLetter.trim() === '') {
    errors.coverLetter = 'Cover letter is required';
  }
  
  // Validate proposed rates/budget
  if (values.proposedRate && !isValidAmount(values.proposedRate)) {
    errors.proposedRate = 'Please enter a valid hourly rate';
  }
  
  if (values.proposedBudget && !isValidAmount(values.proposedBudget)) {
    errors.proposedBudget = 'Please enter a valid budget amount';
  }
  
  // Validate milestones if any
  if (values.milestones && values.milestones.length > 0) {
    const milestoneValidation = validateProposalMilestones(values.milestones);
    if (!milestoneValidation.isValid) {
      errors.milestones = 'There are issues with your milestone plan';
    }
  }
  
  // Validate file attachments if any
  if (values.attachments && values.attachments.length > 0) {
    const fileValidation = validateFileUploads(values.attachments);
    if (!fileValidation.valid && fileValidation.errors) {
      errors.attachments = fileValidation.errors[0];
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
 * @param milestones - Array of milestone form values
 * @returns Validation result with array of errors per milestone
 */
export const validateProposalMilestones = (milestones: ProposalMilestoneFormValues[]): { isValid: boolean, errors: Array<Record<string, string>> } => {
  const errors: Array<Record<string, string>> = [];
  
  for (let i = 0; i < milestones.length; i++) {
    const milestone = milestones[i];
    const milestoneErrors: Record<string, string> = {};
    
    // Validate title and description
    if (!milestone.title || milestone.title.trim() === '') {
      milestoneErrors.title = 'Title is required';
    }
    
    if (!milestone.description || milestone.description.trim() === '') {
      milestoneErrors.description = 'Description is required';
    }
    
    // Validate amount
    if (!isValidAmount(milestone.amount)) {
      milestoneErrors.amount = 'Please enter a valid amount';
    }
    
    // Validate due date
    if (!isValidDate(milestone.dueDate, true)) {
      milestoneErrors.dueDate = 'Please enter a valid future date';
    }
    
    errors.push(milestoneErrors);
  }
  
  // Check if any milestone has errors
  const hasErrors = errors.some(error => Object.keys(error).length > 0);
  
  return {
    isValid: !hasErrors,
    errors
  };
};

/**
 * Validates freelancer profile form values with Android-specific adaptations
 * 
 * @param values - The profile form values
 * @returns Validation result with errors object
 */
export const validateProfileForm = (values: ProfileFormValues): { isValid: boolean, errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Validate title and bio
  if (!values.title || values.title.trim() === '') {
    errors.title = 'Professional title is required';
  }
  
  if (!values.bio || values.bio.trim() === '') {
    errors.bio = 'Bio is required';
  }
  
  // Validate hourly rate
  if (!isValidAmount(values.hourlyRate)) {
    errors.hourlyRate = 'Please enter a valid hourly rate';
  }
  
  // Validate skills
  if (!values.skills || values.skills.length === 0) {
    errors.skills = 'Please add at least one skill';
  }
  
  // Validate URLs if provided
  if (values.githubUrl && !validateUrl(values.githubUrl)) {
    errors.githubUrl = 'Please enter a valid GitHub URL';
  }
  
  if (values.linkedinUrl && !validateUrl(values.linkedinUrl)) {
    errors.linkedinUrl = 'Please enter a valid LinkedIn URL';
  }
  
  if (values.website && !validateUrl(values.website)) {
    errors.website = 'Please enter a valid website URL';
  }
  
  if (values.kaggleUrl && !validateUrl(values.kaggleUrl)) {
    errors.kaggleUrl = 'Please enter a valid Kaggle URL';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates portfolio item form values with Android-specific adaptations
 * 
 * @param values - The portfolio item form values
 * @returns Validation result with errors object
 */
export const validatePortfolioItemForm = (values: PortfolioItemFormValues): { isValid: boolean, errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Validate title and description
  if (!values.title || values.title.trim() === '') {
    errors.title = 'Title is required';
  }
  
  if (!values.description || values.description.trim() === '') {
    errors.description = 'Description is required';
  }
  
  // Validate URLs if provided
  if (values.projectUrl && !validateUrl(values.projectUrl)) {
    errors.projectUrl = 'Please enter a valid project URL';
  }
  
  if (values.githubUrl && !validateUrl(values.githubUrl)) {
    errors.githubUrl = 'Please enter a valid GitHub URL';
  }
  
  if (values.kaggleUrl && !validateUrl(values.kaggleUrl)) {
    errors.kaggleUrl = 'Please enter a valid Kaggle URL';
  }
  
  // Validate date range if both dates are provided
  if (values.startDate && values.endDate) {
    const startDate = new Date(values.startDate);
    const endDate = new Date(values.endDate);
    
    if (!isValidDate(startDate)) {
      errors.startDate = 'Please enter a valid start date';
    }
    
    if (!isValidDate(endDate)) {
      errors.endDate = 'Please enter a valid end date';
    }
    
    if (isValidDate(startDate) && isValidDate(endDate) && !isValidDateRange(startDate, endDate)) {
      errors.endDate = 'End date must be after start date';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates experience form values with Android-specific adaptations
 * 
 * @param values - The experience form values
 * @returns Validation result with errors object
 */
export const validateExperienceForm = (values: ExperienceFormValues): { isValid: boolean, errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Validate title, company, and description
  if (!values.title || values.title.trim() === '') {
    errors.title = 'Job title is required';
  }
  
  if (!values.company || values.company.trim() === '') {
    errors.company = 'Company is required';
  }
  
  if (!values.description || values.description.trim() === '') {
    errors.description = 'Description is required';
  }
  
  // Validate start date
  const startDate = new Date(values.startDate);
  if (!isValidDate(startDate)) {
    errors.startDate = 'Please enter a valid start date';
  }
  
  // Validate end date if not current position
  if (!values.isCurrent) {
    const endDate = new Date(values.endDate);
    if (!isValidDate(endDate)) {
      errors.endDate = 'Please enter a valid end date';
    }
    
    // Validate date range
    if (isValidDate(startDate) && isValidDate(endDate) && !isValidDateRange(startDate, endDate)) {
      errors.endDate = 'End date must be after start date';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates education form values with Android-specific adaptations
 * 
 * @param values - The education form values
 * @returns Validation result with errors object
 */
export const validateEducationForm = (values: EducationFormValues): { isValid: boolean, errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Validate institution, degree, and field of study
  if (!values.institution || values.institution.trim() === '') {
    errors.institution = 'Institution is required';
  }
  
  if (!values.degree || values.degree.trim() === '') {
    errors.degree = 'Degree is required';
  }
  
  if (!values.fieldOfStudy || values.fieldOfStudy.trim() === '') {
    errors.fieldOfStudy = 'Field of study is required';
  }
  
  // Validate start date
  const startDate = new Date(values.startDate);
  if (!isValidDate(startDate)) {
    errors.startDate = 'Please enter a valid start date';
  }
  
  // Validate end date if not current
  if (!values.isCurrent) {
    const endDate = new Date(values.endDate);
    if (!isValidDate(endDate)) {
      errors.endDate = 'Please enter a valid end date';
    }
    
    // Validate date range
    if (isValidDate(startDate) && isValidDate(endDate) && !isValidDateRange(startDate, endDate)) {
      errors.endDate = 'End date must be after start date';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validates certification form values with Android-specific adaptations
 * 
 * @param values - The certification form values
 * @returns Validation result with errors object
 */
export const validateCertificationForm = (values: CertificationFormValues): { isValid: boolean, errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  // Validate name and issuing organization
  if (!values.name || values.name.trim() === '') {
    errors.name = 'Certification name is required';
  }
  
  if (!values.issuingOrganization || values.issuingOrganization.trim() === '') {
    errors.issuingOrganization = 'Issuing organization is required';
  }
  
  // Validate issue date
  const issueDate = new Date(values.issueDate);
  if (!isValidDate(issueDate)) {
    errors.issueDate = 'Please enter a valid issue date';
  }
  
  // Validate expiration date if provided
  if (values.expirationDate) {
    const expirationDate = new Date(values.expirationDate);
    if (!isValidDate(expirationDate)) {
      errors.expirationDate = 'Please enter a valid expiration date';
    }
    
    // Validate date range
    if (isValidDate(issueDate) && isValidDate(expirationDate) && !isValidDateRange(issueDate, expirationDate)) {
      errors.expirationDate = 'Expiration date must be after issue date';
    }
  }
  
  // Validate credential URL if provided
  if (values.credentialUrl && !validateUrl(values.credentialUrl)) {
    errors.credentialUrl = 'Please enter a valid credential URL';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// =========================================================================
// Android-Specific Helper Functions
// =========================================================================

/**
 * Checks if a string is an Android content URI format
 * 
 * @param uri - The URI to check
 * @returns True if the string is an Android content URI
 */
export const isAndroidContentUri = (uri: string): boolean => {
  if (!uri || typeof uri !== 'string') {
    return false;
  }
  
  for (const prefix of FILE_UPLOAD_LIMITS.ANDROID_CONTENT_URIS) {
    if (uri.startsWith(prefix)) {
      return true;
    }
  }
  
  return false;
};

/**
 * Attempts to determine MIME type from Android file path or URI
 * 
 * @param path - The file path or URI
 * @returns The determined MIME type or empty string if unable to determine
 */
export const getAndroidMimeType = (path: string): string => {
  if (!path || typeof path !== 'string') {
    return '';
  }
  
  const lowerPath = path.toLowerCase();
  
  // Extract file extension
  const extension = lowerPath.split('.').pop() || '';
  
  // Map common extensions to MIME types
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'pdf':
      return 'application/pdf';
    case 'zip':
      return 'application/zip';
    case 'json':
      return 'application/json';
    case 'txt':
      return 'text/plain';
    case 'ipynb':
      return 'application/x-ipynb+json';
    default:
      // Try to infer from URI patterns
      if (lowerPath.includes('/image/')) {
        return 'image/jpeg';
      } else if (lowerPath.includes('/document/')) {
        return 'application/pdf';
      }
      return '';
  }
};