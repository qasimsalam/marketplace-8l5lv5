/**
 * Validation Utilities Module
 * 
 * This module provides centralized validation functions, schemas, and types
 * for consistent data validation across all backend services of the AI Talent Marketplace platform.
 * Implements Zod for schema validation and TypeScript for type safety.
 * 
 * @version 1.0.0
 */

import { z } from 'zod'; // v3.22.2

import {
  UserRole,
  UserStatus,
  JobType,
  JobStatus,
  JobDifficulty,
  PaymentMethod,
  UserCreateDTO,
  JobCreateDTO,
  PaymentDTO
} from '../types';

import {
  REGEX_PATTERNS,
  DEFAULT_VALIDATION_MESSAGES
} from '../constants';

import { ValidationError } from './errors';

// Global types
type ZodValidationResult = { success: boolean; data?: any; error?: z.ZodError };

/**
 * Generic schema validation function that validates data against a Zod schema
 * 
 * @param data - Data to validate
 * @param schema - Zod schema to validate against
 * @returns Validation result with success status, validated data or error
 */
export function validateSchema(data: any, schema: z.ZodSchema): ZodValidationResult {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

/**
 * Validates an email address string
 * 
 * @param email - Email address to validate
 * @returns Whether the email is valid
 */
export function validateEmail(email: string): boolean {
  if (typeof email !== 'string') {
    return false;
  }
  return REGEX_PATTERNS.EMAIL.test(email);
}

/**
 * Validates a password according to security requirements
 * Must be at least 8 characters with uppercase, lowercase, number, and special character
 * 
 * @param password - Password to validate
 * @returns Whether the password meets security requirements
 */
export function validatePassword(password: string): boolean {
  if (typeof password !== 'string') {
    return false;
  }
  if (password.length < 8) {
    return false;
  }
  return REGEX_PATTERNS.PASSWORD.test(password);
}

/**
 * Validates a URL string
 * 
 * @param url - URL to validate
 * @returns Whether the URL is valid
 */
export function validateUrl(url: string): boolean {
  if (typeof url !== 'string') {
    return false;
  }
  return REGEX_PATTERNS.URL.test(url);
}

/**
 * Validates a UUID string
 * 
 * @param uuid - UUID to validate
 * @returns Whether the UUID is valid
 */
export function validateUuid(uuid: string): boolean {
  if (typeof uuid !== 'string') {
    return false;
  }
  return REGEX_PATTERNS.UUID.test(uuid);
}

/**
 * Formats a Zod validation error into a user-friendly structure
 * 
 * @param error - Zod validation error
 * @returns Object mapping field paths to error messages
 */
export function formatZodError(error: z.ZodError): Record<string, string> {
  const formattedErrors: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    
    // If we already have an error for this path, append the new error
    if (formattedErrors[path]) {
      formattedErrors[path] += `, ${err.message}`;
    } else {
      formattedErrors[path] = err.message;
    }
  });
  
  return formattedErrors;
}

/**
 * Sanitizes input data by removing potentially harmful content
 * 
 * @param data - Data to sanitize
 * @returns Sanitized data
 */
export function sanitizeData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }
  
  // Handle strings - escape HTML tags and trim
  if (typeof data === 'string') {
    return data
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .trim();
  }
  
  // Handle arrays - recursively sanitize each element
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item));
  }
  
  // Handle objects - recursively sanitize each property
  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    Object.keys(data).forEach((key) => {
      sanitized[key] = sanitizeData(data[key]);
    });
    return sanitized;
  }
  
  // For other types (numbers, booleans) - return as is
  return data;
}

// Common reusable schemas
export const commonSchemas = {
  idSchema: z.string()
    .uuid({ message: DEFAULT_VALIDATION_MESSAGES.INVALID_UUID })
    .nonempty({ message: DEFAULT_VALIDATION_MESSAGES.REQUIRED }),
  
  emailSchema: z.string()
    .email({ message: DEFAULT_VALIDATION_MESSAGES.INVALID_EMAIL })
    .nonempty({ message: DEFAULT_VALIDATION_MESSAGES.REQUIRED }),
  
  passwordSchema: z.string()
    .min(8, { message: 'Password must be at least 8 characters' })
    .regex(
      REGEX_PATTERNS.PASSWORD,
      { message: DEFAULT_VALIDATION_MESSAGES.INVALID_PASSWORD }
    ),
  
  urlSchema: z.string()
    .regex(
      REGEX_PATTERNS.URL,
      { message: DEFAULT_VALIDATION_MESSAGES.INVALID_URL }
    )
    .optional()
    .nullable(),
  
  paginationSchema: z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
};

// User-related schemas
export const userSchemas = {
  loginSchema: z.object({
    email: commonSchemas.emailSchema,
    password: z.string().min(1, { message: DEFAULT_VALIDATION_MESSAGES.REQUIRED })
  }),
  
  registerSchema: z.object({
    email: commonSchemas.emailSchema,
    password: commonSchemas.passwordSchema,
    firstName: z.string().min(1, { message: DEFAULT_VALIDATION_MESSAGES.REQUIRED }),
    lastName: z.string().min(1, { message: DEFAULT_VALIDATION_MESSAGES.REQUIRED }),
    role: z.nativeEnum(UserRole)
  }),
  
  updateProfileSchema: z.object({
    title: z.string().optional(),
    bio: z.string().optional(),
    hourlyRate: z.number().nonnegative().optional(),
    location: z.string().optional(),
    availability: z.string().optional(),
    skills: z.array(
      z.object({
        name: z.string().min(1),
        category: z.string().min(1),
        level: z.number().int().min(1).max(10),
        yearsOfExperience: z.number().int().min(0)
      })
    ).optional(),
    githubUrl: commonSchemas.urlSchema,
    linkedinUrl: commonSchemas.urlSchema,
    website: commonSchemas.urlSchema
  }),
  
  changePasswordSchema: z.object({
    currentPassword: z.string().min(1, { message: DEFAULT_VALIDATION_MESSAGES.REQUIRED }),
    newPassword: commonSchemas.passwordSchema,
    confirmPassword: z.string().min(1, { message: DEFAULT_VALIDATION_MESSAGES.REQUIRED })
  }).refine(
    (data) => data.newPassword === data.confirmPassword,
    {
      message: "Passwords don't match",
      path: ["confirmPassword"]
    }
  ),
  
  updateUserSchema: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
    status: z.nativeEnum(UserStatus).optional()
  })
};

// Job-related schemas
export const jobSchemas = {
  createJobSchema: z.object({
    title: z.string().min(5, { message: 'Title must be at least 5 characters' }),
    description: z.string().min(20, { message: 'Description must be at least 20 characters' }),
    type: z.nativeEnum(JobType),
    budget: z.number().optional(),
    minBudget: z.number().nonnegative().optional(),
    maxBudget: z.number().nonnegative().optional(),
    hourlyRate: z.number().nonnegative().optional(),
    estimatedDuration: z.number().positive().optional(),
    estimatedHours: z.number().positive().optional(),
    difficulty: z.nativeEnum(JobDifficulty),
    location: z.string().optional(),
    isRemote: z.boolean().default(true),
    requiredSkills: z.array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        category: z.string().min(1),
        level: z.number().int().min(1).max(10)
      })
    ),
    preferredSkills: z.array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        category: z.string().min(1),
        level: z.number().int().min(1).max(10)
      })
    ).optional(),
    attachments: z.array(z.string()).optional(),
    category: z.string().min(1),
    subcategory: z.string().optional(),
    expiresAt: z.date().optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional()
  }).refine(
    (data) => {
      if (data.type === JobType.FIXED_PRICE) {
        return data.budget !== undefined && data.budget > 0;
      }
      return true;
    },
    {
      message: "Fixed price jobs must have a budget",
      path: ["budget"]
    }
  ).refine(
    (data) => {
      if (data.type === JobType.HOURLY) {
        return data.hourlyRate !== undefined && data.hourlyRate > 0;
      }
      return true;
    },
    {
      message: "Hourly jobs must have an hourly rate",
      path: ["hourlyRate"]
    }
  ).refine(
    (data) => {
      if (data.minBudget !== undefined && data.maxBudget !== undefined) {
        return data.maxBudget >= data.minBudget;
      }
      return true;
    },
    {
      message: "Maximum budget must be greater than or equal to minimum budget",
      path: ["maxBudget"]
    }
  ),
  
  updateJobSchema: z.object({
    title: z.string().min(5).optional(),
    description: z.string().min(20).optional(),
    type: z.nativeEnum(JobType).optional(),
    budget: z.number().optional(),
    minBudget: z.number().nonnegative().optional(),
    maxBudget: z.number().nonnegative().optional(),
    hourlyRate: z.number().nonnegative().optional(),
    estimatedDuration: z.number().positive().optional(),
    estimatedHours: z.number().positive().optional(),
    difficulty: z.nativeEnum(JobDifficulty).optional(),
    location: z.string().optional(),
    isRemote: z.boolean().optional(),
    requiredSkills: z.array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        category: z.string().min(1),
        level: z.number().int().min(1).max(10)
      })
    ).optional(),
    preferredSkills: z.array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        category: z.string().min(1),
        level: z.number().int().min(1).max(10)
      })
    ).optional(),
    attachments: z.array(z.string()).optional(),
    status: z.nativeEnum(JobStatus).optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    expiresAt: z.date().optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional()
  }),
  
  createProposalSchema: z.object({
    jobId: commonSchemas.idSchema,
    coverLetter: z.string().min(50, { message: 'Cover letter must be at least 50 characters' }),
    proposedRate: z.number().nonnegative().optional(),
    proposedBudget: z.number().nonnegative().optional(),
    estimatedDuration: z.number().positive().optional(),
    estimatedHours: z.number().positive().optional(),
    attachments: z.array(z.string()).optional(),
    milestones: z.array(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        amount: z.number().positive(),
        dueDate: z.date(),
        order: z.number().int().nonnegative()
      })
    ).optional()
  }),
  
  updateProposalSchema: z.object({
    coverLetter: z.string().min(50).optional(),
    proposedRate: z.number().nonnegative().optional(),
    proposedBudget: z.number().nonnegative().optional(),
    estimatedDuration: z.number().positive().optional(),
    estimatedHours: z.number().positive().optional(),
    attachments: z.array(z.string()).optional(),
    milestones: z.array(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        amount: z.number().positive(),
        dueDate: z.date(),
        order: z.number().int().nonnegative()
      })
    ).optional()
  }),
  
  proposalStatusUpdateSchema: z.object({
    status: z.enum(['pending', 'under_review', 'accepted', 'rejected', 'withdrawn']),
    reason: z.string().optional()
  }),
  
  jobStatusUpdateSchema: z.object({
    status: z.nativeEnum(JobStatus),
    reason: z.string().optional()
  }),
  
  jobSearchParamsSchema: z.object({
    query: z.string().optional(),
    type: z.nativeEnum(JobType).optional(),
    status: z.nativeEnum(JobStatus).optional(),
    minBudget: z.number().nonnegative().optional(),
    maxBudget: z.number().nonnegative().optional(),
    skills: z.array(z.string()).optional(),
    difficulty: z.nativeEnum(JobDifficulty).optional(),
    isRemote: z.boolean().optional(),
    location: z.string().optional(),
    posterId: z.string().uuid().optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    createdAfter: z.date().optional(),
    createdBefore: z.date().optional(),
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
};

// Payment-related schemas
export const paymentSchemas = {
  createPaymentSchema: z.object({
    contractId: commonSchemas.idSchema,
    milestoneId: commonSchemas.idSchema,
    amount: z.number().positive(),
    currency: z.string().min(3).max(3).default('USD'),
    method: z.nativeEnum(PaymentMethod),
    description: z.string().optional(),
    paymentMethodId: z.string().optional()
  }),
  
  createContractSchema: z.object({
    jobId: commonSchemas.idSchema,
    freelancerId: commonSchemas.idSchema,
    title: z.string().min(5),
    description: z.string().min(20),
    totalAmount: z.number().positive(),
    currency: z.string().min(3).max(3).default('USD'),
    startDate: z.date(),
    endDate: z.date(),
    terms: z.string().min(50),
    attachments: z.array(z.string()).optional(),
    milestones: z.array(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        amount: z.number().positive(),
        dueDate: z.date(),
        order: z.number().int().nonnegative()
      })
    )
  }).refine(
    (data) => data.endDate > data.startDate,
    {
      message: "End date must be after start date",
      path: ["endDate"]
    }
  ),
  
  createMilestoneSchema: z.object({
    contractId: commonSchemas.idSchema,
    title: z.string().min(1),
    description: z.string().min(1),
    amount: z.number().positive(),
    dueDate: z.date(),
    order: z.number().int().nonnegative()
  }),
  
  milestoneSubmitSchema: z.object({
    completionProof: z.array(z.string()).min(1),
    comments: z.string().optional()
  }),
  
  milestoneReviewSchema: z.object({
    approved: z.boolean(),
    comments: z.string().optional()
  }),
  
  paymentMethodCreateSchema: z.object({
    type: z.nativeEnum(PaymentMethod),
    name: z.string().min(1),
    stripePaymentMethodId: z.string().min(1),
    isDefault: z.boolean().default(false)
  }),
  
  paymentSearchParamsSchema: z.object({
    userId: z.string().uuid().optional(),
    contractId: z.string().uuid().optional(),
    milestoneId: z.string().uuid().optional(),
    payerId: z.string().uuid().optional(),
    payeeId: z.string().uuid().optional(),
    status: z.enum([
      'pending',
      'processing',
      'completed',
      'failed',
      'cancelled',
      'refunded',
      'held_in_escrow',
      'released_from_escrow'
    ]).optional(),
    method: z.nativeEnum(PaymentMethod).optional(),
    minAmount: z.number().nonnegative().optional(),
    maxAmount: z.number().nonnegative().optional(),
    currency: z.string().min(3).max(3).optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
};