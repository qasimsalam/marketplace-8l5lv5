/**
 * Comprehensive validation library for the AI Talent Marketplace web application.
 * Provides schema-based form validation using Zod, with predefined schemas for all forms
 * including authentication, job posting, profile management, and payment processing.
 * 
 * @packageDocumentation
 */

import { z } from 'zod'; // ^3.22.2
import type { ZodIssue } from 'zod'; // ^3.22.2

// Internal type imports
import {
  LoginFormValues,
  RegisterFormValues,
  ForgotPasswordFormValues,
  ResetPasswordFormValues,
  ChangePasswordFormValues
} from '../types/auth';
import { JobFormValues } from '../types/job';
import { ProfileFormValues } from '../types/profile';

// Validation utility functions
import {
  isRequired,
  isEmail,
  isPassword,
  isMinLength,
  isMaxLength,
  isMatch
} from '../utils/validation';

// Validation constants
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const URL_REGEX = /^(https?:\/\/)?([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]*[a-z0-9])?([\\/\w .-]*)*\/?$/;

// Validation limits
const MIN_PASSWORD_LENGTH = 8;
const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

/**
 * Configuration object for file uploads
 */
export const FILE_UPLOAD_CONFIG = {
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES,
  MAX_FILES: 5
};

/**
 * Validates form data against a Zod schema
 * 
 * @param data - The data to validate
 * @param schema - The Zod schema to validate against
 * @returns Object containing validation result with success flag, validated data, or formatted errors
 */
export const validateForm = <T>(data: any, schema: z.ZodSchema): { success: boolean; data?: T; errors?: Record<string, string> } => {
  try {
    const validatedData = schema.parse(data);
    return {
      success: true,
      data: validatedData as T
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: formatZodErrors(error)
      };
    }
    
    // For unexpected errors, return a generic error message
    return {
      success: false,
      errors: { _form: 'An unexpected error occurred during validation.' }
    };
  }
};

/**
 * Formats Zod validation errors into a user-friendly object structure
 * 
 * @param error - The Zod error object from validation
 * @returns Object mapping field paths to error messages
 */
export const formatZodErrors = (error: z.ZodError): Record<string, string> => {
  const formattedErrors: Record<string, string> = {};
  
  error.issues.forEach((issue: ZodIssue) => {
    // Create a path string from the issue path array (handle nested paths)
    const path = issue.path.join('.');
    const fieldName = path || '_form'; // Use '_form' for general errors without a specific field
    
    // Only add the first error for each field to avoid overwhelming the user
    if (!formattedErrors[fieldName]) {
      formattedErrors[fieldName] = issue.message;
    }
  });
  
  return formattedErrors;
};

/**
 * Creates a set of common reusable schemas for basic validations
 */
const createCommonSchemas = () => {
  // Basic email validation schema
  const emailSchema = z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please enter a valid email address')
    .regex(EMAIL_REGEX, 'Please enter a valid email address');
  
  // Password validation schema with complexity requirements
  const passwordSchema = z
    .string({ required_error: 'Password is required' })
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
    .regex(PASSWORD_REGEX, 'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character');
  
  // UUID validation for IDs
  const idSchema = z
    .string({ required_error: 'ID is required' })
    .uuid('Invalid ID format');
  
  // URL validation
  const urlSchema = z
    .string()
    .regex(URL_REGEX, 'Please enter a valid URL')
    .optional()
    .or(z.literal(''));
  
  // Date validation
  const dateSchema = z
    .date({ required_error: 'Date is required', invalid_type_error: 'Invalid date format' });
  
  // Pagination parameters schema
  const paginationSchema = z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  });
  
  return {
    emailSchema,
    passwordSchema,
    idSchema,
    urlSchema,
    dateSchema,
    paginationSchema
  };
};

/**
 * Creates and configures all authentication-related validation schemas
 * 
 * @returns Object containing all auth validation schemas
 */
const createAuthSchemas = () => {
  const { emailSchema, passwordSchema } = createCommonSchemas();
  
  // Login form validation schema
  const loginSchema = z.object({
    email: emailSchema,
    password: z.string({ required_error: 'Password is required' }),
    remember: z.boolean().default(false)
  }) satisfies z.ZodType<LoginFormValues>;
  
  // Registration form validation schema
  const registerSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string({ required_error: 'Please confirm your password' }),
    firstName: z.string({ required_error: 'First name is required' }).trim().min(1, 'First name is required'),
    lastName: z.string({ required_error: 'Last name is required' }).trim().min(1, 'Last name is required'),
    role: z.enum(['admin', 'employer', 'freelancer', 'guest'], {
      required_error: 'Please select a role',
      invalid_type_error: 'Invalid role selection'
    }),
    agreeToTerms: z.boolean().refine(val => val === true, {
      message: 'You must agree to the terms and conditions'
    })
  }).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  }) satisfies z.ZodType<RegisterFormValues>;
  
  // Forgot password form validation schema
  const forgotPasswordSchema = z.object({
    email: emailSchema
  }) satisfies z.ZodType<ForgotPasswordFormValues>;
  
  // Reset password form validation schema
  const resetPasswordSchema = z.object({
    token: z.string({ required_error: 'Reset token is required' }),
    password: passwordSchema,
    confirmPassword: z.string({ required_error: 'Please confirm your password' })
  }).refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  }) satisfies z.ZodType<ResetPasswordFormValues>;
  
  // Change password form validation schema
  const changePasswordSchema = z.object({
    currentPassword: z.string({ required_error: 'Current password is required' }),
    newPassword: passwordSchema,
    confirmPassword: z.string({ required_error: 'Please confirm your password' })
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  }) satisfies z.ZodType<ChangePasswordFormValues>;
  
  return {
    loginSchema,
    registerSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    changePasswordSchema
  };
};

/**
 * Creates and configures all job-related validation schemas
 * 
 * @returns Object containing all job validation schemas
 */
const createJobSchemas = () => {
  const { idSchema, urlSchema, dateSchema, paginationSchema } = createCommonSchemas();
  
  // Schema for job creation and editing
  const createJobSchema = z.object({
    title: z.string({ required_error: 'Job title is required' })
      .trim()
      .min(1, 'Job title is required')
      .max(MAX_TITLE_LENGTH, `Job title cannot exceed ${MAX_TITLE_LENGTH} characters`),
    description: z.string({ required_error: 'Job description is required' })
      .trim()
      .min(1, 'Job description is required')
      .max(MAX_DESCRIPTION_LENGTH, `Job description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`),
    type: z.enum(['fixed_price', 'hourly', 'milestone_based'], {
      required_error: 'Job type is required',
      invalid_type_error: 'Invalid job type'
    }),
    budget: z.number({ required_error: 'Budget is required' })
      .nonnegative('Budget must be a positive number')
      .optional()
      .nullable(),
    minBudget: z.number({ invalid_type_error: 'Minimum budget must be a number' })
      .nonnegative('Minimum budget must be a positive number')
      .optional()
      .nullable(),
    maxBudget: z.number({ invalid_type_error: 'Maximum budget must be a number' })
      .nonnegative('Maximum budget must be a positive number')
      .optional()
      .nullable(),
    hourlyRate: z.number({ invalid_type_error: 'Hourly rate must be a number' })
      .nonnegative('Hourly rate must be a positive number')
      .optional()
      .nullable(),
    estimatedDuration: z.number({ invalid_type_error: 'Estimated duration must be a number' })
      .int('Estimated duration must be a whole number')
      .positive('Estimated duration must be greater than 0')
      .optional()
      .nullable(),
    estimatedHours: z.number({ invalid_type_error: 'Estimated hours must be a number' })
      .nonnegative('Estimated hours must be a positive number')
      .optional()
      .nullable(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert'], {
      invalid_type_error: 'Invalid difficulty level'
    }).optional(),
    location: z.string().optional(),
    isRemote: z.boolean().optional().default(true),
    requiredSkills: z.array(z.string())
      .min(1, 'At least one required skill must be selected'),
    preferredSkills: z.array(z.string()).optional(),
    attachments: z.array(z.instanceof(File)).optional(),
    category: z.string({ required_error: 'Category is required' }),
    subcategory: z.string().optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional()
  }).refine(data => {
    // If fixed price or milestone based, budget is required
    if (data.type === 'fixed_price' && !data.budget) {
      return false;
    }
    return true;
  }, {
    message: 'Budget is required for fixed price jobs',
    path: ['budget']
  }).refine(data => {
    // If hourly, hourly rate is required
    if (data.type === 'hourly' && !data.hourlyRate) {
      return false;
    }
    return true;
  }, {
    message: 'Hourly rate is required for hourly jobs',
    path: ['hourlyRate']
  }).refine(data => {
    // For budget range, maxBudget should be greater than minBudget
    if (data.minBudget && data.maxBudget && data.minBudget > data.maxBudget) {
      return false;
    }
    return true;
  }, {
    message: 'Maximum budget cannot be less than minimum budget',
    path: ['maxBudget']
  }).refine(data => {
    // If both start and end dates are provided, end date should be after start date
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      return false;
    }
    return true;
  }, {
    message: 'End date cannot be before start date',
    path: ['endDate']
  }) satisfies z.ZodType<JobFormValues>;
  
  // Schema for job updates (partial version of creation schema)
  const updateJobSchema = createJobSchema.partial();
  
  // Schema for proposal submission
  const proposalSubmissionSchema = z.object({
    jobId: idSchema,
    coverLetter: z.string({ required_error: 'Cover letter is required' })
      .trim()
      .min(1, 'Cover letter is required')
      .max(MAX_DESCRIPTION_LENGTH, `Cover letter cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`),
    proposedRate: z.number({ required_error: 'Proposed rate is required' })
      .nonnegative('Proposed rate must be a positive number')
      .optional()
      .nullable(),
    proposedBudget: z.number({ required_error: 'Proposed budget is required' })
      .nonnegative('Proposed budget must be a positive number')
      .optional()
      .nullable(),
    estimatedDuration: z.number({ invalid_type_error: 'Estimated duration must be a number' })
      .int('Estimated duration must be a whole number')
      .positive('Estimated duration must be greater than 0')
      .optional()
      .nullable(),
    estimatedHours: z.number({ invalid_type_error: 'Estimated hours must be a number' })
      .nonnegative('Estimated hours must be a positive number')
      .optional()
      .nullable(),
    attachments: z.array(z.instanceof(File)).optional(),
    milestones: z.array(
      z.object({
        title: z.string({ required_error: 'Milestone title is required' })
          .trim()
          .min(1, 'Milestone title is required'),
        description: z.string({ required_error: 'Milestone description is required' })
          .trim()
          .min(1, 'Milestone description is required'),
        amount: z.number({ required_error: 'Milestone amount is required' })
          .nonnegative('Milestone amount must be a positive number'),
        dueDate: z.date({ required_error: 'Milestone due date is required' }),
        order: z.number().int().nonnegative().default(0)
      })
    ).optional()
  }).refine(data => {
    // Either proposedRate or proposedBudget must be provided
    if (!data.proposedRate && !data.proposedBudget) {
      return false;
    }
    return true;
  }, {
    message: 'Either proposed rate or proposed budget is required',
    path: ['proposedBudget']
  });
  
  // Schema for job search parameters
  const jobSearchParamsSchema = z.object({
    query: z.string().optional(),
    type: z.enum(['fixed_price', 'hourly', 'milestone_based']).optional(),
    status: z.enum(['draft', 'open', 'in_progress', 'completed', 'cancelled', 'on_hold']).optional(),
    minBudget: z.number().nonnegative().optional(),
    maxBudget: z.number().nonnegative().optional(),
    skills: z.array(z.string()).optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
    isRemote: z.boolean().optional(),
    location: z.string().optional(),
    posterId: z.string().optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    createdAfter: z.date().optional(),
    createdBefore: z.date().optional(),
    ...paginationSchema.shape
  }).refine(data => {
    // If both min and max budget are provided, max should be greater than min
    if (data.minBudget !== undefined && data.maxBudget !== undefined && data.minBudget > data.maxBudget) {
      return false;
    }
    return true;
  }, {
    message: 'Maximum budget cannot be less than minimum budget',
    path: ['maxBudget']
  });
  
  return {
    createJobSchema,
    updateJobSchema,
    proposalSubmissionSchema,
    jobSearchParamsSchema
  };
};

/**
 * Creates and configures all profile-related validation schemas
 * 
 * @returns Object containing all profile validation schemas
 */
const createProfileSchemas = () => {
  const { urlSchema } = createCommonSchemas();
  
  // Schema for profile updates
  const updateProfileSchema = z.object({
    title: z.string({ required_error: 'Professional title is required' })
      .trim()
      .min(1, 'Professional title is required')
      .max(MAX_TITLE_LENGTH, `Title cannot exceed ${MAX_TITLE_LENGTH} characters`),
    bio: z.string({ required_error: 'Bio is required' })
      .trim()
      .min(1, 'Bio is required')
      .max(MAX_DESCRIPTION_LENGTH, `Bio cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`),
    hourlyRate: z.number({ required_error: 'Hourly rate is required' })
      .nonnegative('Hourly rate must be a positive number'),
    location: z.string().optional(),
    availability: z.enum(['available', 'partially_available', 'unavailable', 'available_soon'], {
      invalid_type_error: 'Invalid availability status'
    }),
    githubUrl: urlSchema,
    linkedinUrl: urlSchema,
    kaggleUrl: urlSchema,
    website: urlSchema,
    skills: z.array(
      z.object({
        name: z.string({ required_error: 'Skill name is required' }),
        category: z.string().optional(),
        level: z.number().int().min(1).max(10).optional(),
        yearsOfExperience: z.number().int().nonnegative().optional()
      })
    )
  }) satisfies z.ZodType<ProfileFormValues>;
  
  // Schema for skills array
  const skillsSchema = z.array(
    z.object({
      name: z.string({ required_error: 'Skill name is required' }),
      category: z.string().optional(),
      level: z.number().int().min(1).max(10).optional(),
      yearsOfExperience: z.number().int().nonnegative().optional()
    })
  ).min(1, 'At least one skill is required');
  
  // Schema for portfolio items
  const portfolioItemSchema = z.object({
    title: z.string({ required_error: 'Portfolio title is required' })
      .trim()
      .min(1, 'Portfolio title is required')
      .max(MAX_TITLE_LENGTH, `Title cannot exceed ${MAX_TITLE_LENGTH} characters`),
    description: z.string({ required_error: 'Description is required' })
      .trim()
      .min(1, 'Description is required')
      .max(MAX_DESCRIPTION_LENGTH, `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`),
    projectUrl: urlSchema,
    githubUrl: urlSchema,
    kaggleUrl: urlSchema,
    technologies: z.array(z.string()).min(1, 'At least one technology is required'),
    category: z.string().optional(),
    aiModels: z.array(z.string()).optional(),
    problemSolved: z.string().optional(),
    startDate: z.string().refine(val => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, {
      message: 'Start date must be a valid date'
    }),
    endDate: z.string().refine(val => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, {
      message: 'End date must be a valid date'
    }).optional()
  }).refine((data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  }, {
    message: 'End date cannot be before start date',
    path: ['endDate']
  });
  
  // Schema for education entries
  const educationEntrySchema = z.object({
    institution: z.string({ required_error: 'Institution name is required' })
      .trim()
      .min(1, 'Institution name is required'),
    degree: z.string({ required_error: 'Degree is required' })
      .trim()
      .min(1, 'Degree is required'),
    fieldOfStudy: z.string({ required_error: 'Field of study is required' })
      .trim()
      .min(1, 'Field of study is required'),
    startDate: z.string().refine(val => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, {
      message: 'Start date must be a valid date'
    }),
    endDate: z.string().refine(val => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, {
      message: 'End date must be a valid date'
    }).optional(),
    isCurrent: z.boolean().default(false),
    description: z.string().optional()
  }).refine((data) => {
    if (data.isCurrent) {
      return true; // If current, we don't need to validate end date
    }
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  }, {
    message: 'End date cannot be before start date',
    path: ['endDate']
  });
  
  // Schema for experience entries
  const experienceEntrySchema = z.object({
    title: z.string({ required_error: 'Job title is required' })
      .trim()
      .min(1, 'Job title is required'),
    company: z.string({ required_error: 'Company name is required' })
      .trim()
      .min(1, 'Company name is required'),
    location: z.string().optional(),
    description: z.string({ required_error: 'Job description is required' })
      .trim()
      .min(1, 'Job description is required'),
    startDate: z.string().refine(val => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, {
      message: 'Start date must be a valid date'
    }),
    endDate: z.string().refine(val => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, {
      message: 'End date must be a valid date'
    }).optional(),
    isCurrent: z.boolean().default(false),
    aiTechnologies: z.array(z.string()).optional()
  }).refine((data) => {
    if (data.isCurrent) {
      return true; // If current, we don't need to validate end date
    }
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  }, {
    message: 'End date cannot be before start date',
    path: ['endDate']
  });
  
  return {
    updateProfileSchema,
    skillsSchema,
    portfolioItemSchema,
    educationEntrySchema,
    experienceEntrySchema
  };
};

/**
 * Creates and configures all payment-related validation schemas
 * 
 * @returns Object containing all payment validation schemas
 */
const createPaymentSchemas = () => {
  const { idSchema } = createCommonSchemas();
  
  // Credit card validation schema
  const paymentMethodSchema = z.object({
    cardNumber: z.string({ required_error: 'Card number is required' })
      .refine(val => /^\d{16}$/.test(val.replace(/\s/g, '')), {
        message: 'Card number must be 16 digits'
      }),
    cardholderName: z.string({ required_error: 'Cardholder name is required' })
      .trim()
      .min(1, 'Cardholder name is required'),
    expiryMonth: z.string({ required_error: 'Expiry month is required' })
      .refine(val => /^(0[1-9]|1[0-2])$/.test(val), {
        message: 'Expiry month must be between 01-12'
      }),
    expiryYear: z.string({ required_error: 'Expiry year is required' })
      .refine(val => {
        const year = parseInt(val, 10);
        const currentYear = new Date().getFullYear();
        return year >= currentYear && year <= currentYear + 20;
      }, {
        message: 'Expiry year is invalid'
      }),
    cvc: z.string({ required_error: 'CVC is required' })
      .refine(val => /^\d{3,4}$/.test(val), {
        message: 'CVC must be 3 or 4 digits'
      }),
    saveCard: z.boolean().default(false)
  }).refine(data => {
    // Check if card is not expired
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
    
    const expiryYear = parseInt(data.expiryYear, 10);
    const expiryMonth = parseInt(data.expiryMonth, 10);
    
    if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
      return false;
    }
    return true;
  }, {
    message: 'Card has expired',
    path: ['expiryMonth']
  });
  
  // Payment creation schema
  const paymentCreateSchema = z.object({
    contractId: idSchema,
    milestoneId: idSchema.optional(),
    amount: z.number({ required_error: 'Payment amount is required' })
      .positive('Payment amount must be greater than zero'),
    description: z.string().optional(),
    paymentMethodId: z.string().optional(),
    savePaymentMethod: z.boolean().default(false)
  });
  
  // Milestone schema
  const milestoneSchema = z.object({
    title: z.string({ required_error: 'Milestone title is required' })
      .trim()
      .min(1, 'Milestone title is required'),
    description: z.string({ required_error: 'Milestone description is required' })
      .trim()
      .min(1, 'Milestone description is required'),
    amount: z.number({ required_error: 'Milestone amount is required' })
      .positive('Milestone amount must be greater than zero'),
    dueDate: z.date({ required_error: 'Due date is required' })
      .refine(date => date > new Date(), {
        message: 'Due date must be in the future'
      }),
    order: z.number().int().nonnegative().default(0)
  });
  
  // Contract schema
  const contractSchema = z.object({
    jobId: idSchema,
    freelancerId: idSchema,
    termsAccepted: z.boolean().refine(val => val === true, {
      message: 'You must accept the terms and conditions'
    }),
    startDate: z.date({ required_error: 'Start date is required' }),
    endDate: z.date({ required_error: 'End date is required' }),
    paymentType: z.enum(['fixed', 'hourly', 'milestone'], {
      required_error: 'Payment type is required',
      invalid_type_error: 'Invalid payment type'
    }),
    fixedAmount: z.number({ invalid_type_error: 'Fixed amount must be a number' })
      .positive('Fixed amount must be greater than zero')
      .optional()
      .nullable(),
    hourlyRate: z.number({ invalid_type_error: 'Hourly rate must be a number' })
      .positive('Hourly rate must be greater than zero')
      .optional()
      .nullable(),
    estimatedHours: z.number({ invalid_type_error: 'Estimated hours must be a number' })
      .positive('Estimated hours must be greater than zero')
      .optional()
      .nullable(),
    milestones: z.array(milestoneSchema).optional(),
    description: z.string({ required_error: 'Contract description is required' })
      .trim()
      .min(1, 'Contract description is required')
  }).refine(data => {
    // End date must be after start date
    return data.endDate > data.startDate;
  }, {
    message: 'End date must be after start date',
    path: ['endDate']
  }).refine(data => {
    // For fixed payment type, fixed amount is required
    if (data.paymentType === 'fixed' && !data.fixedAmount) {
      return false;
    }
    return true;
  }, {
    message: 'Fixed amount is required for fixed payment type',
    path: ['fixedAmount']
  }).refine(data => {
    // For hourly payment type, hourly rate and estimated hours are required
    if (data.paymentType === 'hourly' && (!data.hourlyRate || !data.estimatedHours)) {
      return false;
    }
    return true;
  }, {
    message: 'Hourly rate and estimated hours are required for hourly payment type',
    path: ['hourlyRate']
  }).refine(data => {
    // For milestone payment type, milestones are required
    if (data.paymentType === 'milestone' && (!data.milestones || data.milestones.length === 0)) {
      return false;
    }
    return true;
  }, {
    message: 'At least one milestone is required for milestone payment type',
    path: ['milestones']
  });
  
  return {
    paymentMethodSchema,
    paymentCreateSchema,
    milestoneSchema,
    contractSchema
  };
};

/**
 * Validates file uploads for size, type, and other constraints
 * 
 * @param file - The file to validate
 * @param options - Optional configuration parameters for validation
 * @returns Validation result object with valid flag and optional error message
 */
export const validateFileUpload = (
  file: File,
  options?: {
    maxSize?: number;
    allowedTypes?: string[];
  }
): { valid: boolean; error?: string } => {
  const maxSize = options?.maxSize || MAX_FILE_SIZE;
  const allowedTypes = options?.allowedTypes || ALLOWED_FILE_TYPES;
  
  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds the maximum limit of ${Math.round(maxSize / (1024 * 1024))}MB`
    };
  }
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not supported. Allowed types: ${allowedTypes.map(type => type.split('/')[1]).join(', ')}`
    };
  }
  
  return { valid: true };
};

// Create and export the schema objects
export const commonSchemas = createCommonSchemas();
export const authSchemas = createAuthSchemas();
export const jobSchemas = createJobSchemas();
export const profileSchemas = createProfileSchemas();
export const paymentSchemas = createPaymentSchemas();