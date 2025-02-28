/**
 * Constants Module
 * 
 * A centralized repository of constants used across the AI Talent Marketplace backend services.
 * This file defines standard values, enumeration mappings, regular expressions, configuration defaults,
 * and other constants to ensure consistency throughout the platform.
 * 
 * @version 1.0.0
 */

/**
 * User role constants
 */
export const ROLES = {
  ADMIN: 'admin',
  EMPLOYER: 'employer',
  FREELANCER: 'freelancer',
  GUEST: 'guest'
} as const;

/**
 * User account status constants
 */
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING_VERIFICATION: 'pending_verification'
} as const;

/**
 * Verification status constants
 */
export const VERIFICATION_STATUS = {
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected'
} as const;

/**
 * Authentication provider constants
 */
export const AUTH_PROVIDERS = {
  LOCAL: 'local',
  GITHUB: 'github',
  LINKEDIN: 'linkedin',
  GOOGLE: 'google'
} as const;

/**
 * Job payment type constants
 */
export const JOB_TYPES = {
  FIXED_PRICE: 'fixed_price',
  HOURLY: 'hourly',
  MILESTONE_BASED: 'milestone_based'
} as const;

/**
 * Job status constants
 */
export const JOB_STATUS = {
  DRAFT: 'draft',
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on_hold'
} as const;

/**
 * Proposal status constants
 */
export const PROPOSAL_STATUS = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn'
} as const;

/**
 * Job difficulty level constants
 */
export const JOB_DIFFICULTY = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  EXPERT: 'expert'
} as const;

/**
 * Payment status constants
 */
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  HELD_IN_ESCROW: 'held_in_escrow',
  RELEASED_FROM_ESCROW: 'released_from_escrow'
} as const;

/**
 * Payment method constants
 */
export const PAYMENT_METHODS = {
  CREDIT_CARD: 'credit_card',
  BANK_TRANSFER: 'bank_transfer',
  PAYPAL: 'paypal',
  PLATFORM_CREDIT: 'platform_credit'
} as const;

/**
 * Transaction type constants
 */
export const TRANSACTION_TYPES = {
  PAYMENT: 'payment',
  REFUND: 'refund',
  FEE: 'fee',
  WITHDRAWAL: 'withdrawal',
  DEPOSIT: 'deposit',
  ESCROW_HOLD: 'escrow_hold',
  ESCROW_RELEASE: 'escrow_release'
} as const;

/**
 * Contract status constants
 */
export const CONTRACT_STATUS = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed'
} as const;

/**
 * Milestone status constants
 */
export const MILESTONE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PAID: 'paid'
} as const;

/**
 * Regular expression patterns for input validation
 */
export const REGEX_PATTERNS = {
  EMAIL: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  URL: /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
} as const;

/**
 * File upload limitation constants
 */
export const FILE_UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10485760, // 10MB in bytes
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip',
    'application/json',
    'text/csv'
  ],
  MAX_FILES_PER_REQUEST: 10,
  IMAGE_MAX_DIMENSIONS: {
    width: 2000,
    height: 2000
  }
} as const;

/**
 * Date format constants
 */
export const DATE_FORMATS = {
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
  DISPLAY: 'MMM dd, yyyy',
  TIMESTAMP: 'yyyy-MM-dd HH:mm:ss',
  DATE_ONLY: 'yyyy-MM-dd',
  TIME_ONLY: 'HH:mm:ss'
} as const;

/**
 * Currency code constants
 */
export const CURRENCIES = {
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  JPY: 'JPY',
  CAD: 'CAD',
  AUD: 'AUD',
  DEFAULT: 'USD'
} as const;

/**
 * Error code constants for consistent error handling
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND'
} as const;

/**
 * HTTP status code constants
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

/**
 * Microservice name constants for service discovery and logging
 */
export const SERVICE_NAMES = {
  API_GATEWAY: 'api-gateway',
  USER_SERVICE: 'user-service',
  JOB_SERVICE: 'job-service',
  PAYMENT_SERVICE: 'payment-service',
  COLLABORATION_SERVICE: 'collaboration-service',
  AI_SERVICE: 'ai-service'
} as const;

/**
 * API version constants
 */
export const API_VERSIONS = {
  V1: 'v1'
} as const;

/**
 * JWT token expiration time constants
 */
export const JWT_EXPIRY = {
  ACCESS_TOKEN: '15m',
  REFRESH_TOKEN: '7d',
  PASSWORD_RESET: '1h',
  EMAIL_VERIFICATION: '24h',
  INVITATION: '7d'
} as const;

/**
 * Pagination default constants
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
} as const;

/**
 * Rate limiting configuration constants
 */
export const RATE_LIMITS = {
  PUBLIC_API: {
    POINTS: 100,
    DURATION: 60, // seconds
    BLOCK_DURATION: 300 // seconds
  },
  AUTH_API: {
    POINTS: 10,
    DURATION: 60, // seconds
    BLOCK_DURATION: 900 // seconds
  },
  USER_API: {
    POINTS: 1000,
    DURATION: 60, // seconds
    BLOCK_DURATION: 300 // seconds
  },
  LOGIN_ATTEMPTS: {
    MAX_ATTEMPTS: 5,
    WINDOW: 300, // seconds
    LOCKOUT_DURATION: 900 // seconds
  }
} as const;

/**
 * AI model and matching algorithm configuration constants
 */
export const AI_CONSTANTS = {
  MATCHING_THRESHOLD: 0.7,
  EMBEDDING_DIMENSIONS: 768,
  SIMILARITY_METRIC: 'cosine',
  MODEL_VERSION: 'gpt-4'
} as const;

/**
 * Platform fee structure constants
 */
export const FEES = {
  PLATFORM_FEE_PERCENT: 15,
  MINIMUM_WITHDRAWAL: 50,
  PAYMENT_PROCESSING_FEE_PERCENT: 2.9,
  PAYMENT_PROCESSING_FEE_FLAT: 0.3
} as const;

/**
 * Escrow service configuration constants
 */
export const ESCROW = {
  DEFAULT_HOLD_PERIOD_DAYS: 3,
  DISPUTE_WINDOW_DAYS: 14,
  AUTO_RELEASE_ENABLED: true
} as const;

/**
 * Redis key naming convention constants and TTL settings
 */
export const REDIS_KEYS = {
  SESSION_PREFIX: 'session:',
  RATE_LIMIT_PREFIX: 'ratelimit:',
  USER_PREFIX: 'user:',
  JOB_PREFIX: 'job:',
  CACHE_TTL: 3600 // seconds
} as const;

/**
 * Default validation error message constants
 */
export const DEFAULT_VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PASSWORD: 'Password must be at least 8 characters and contain uppercase, lowercase, number and special character',
  INVALID_URL: 'Please enter a valid URL',
  INVALID_PHONE: 'Please enter a valid phone number',
  INVALID_DATE: 'Please enter a valid date',
  INVALID_AMOUNT: 'Please enter a valid amount',
  INVALID_UUID: 'Invalid identifier format'
} as const;

/**
 * WebSocket event type constants for real-time communication
 */
export const SOCKET_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  MESSAGE: 'message',
  NOTIFICATION: 'notification',
  TYPING: 'typing',
  WORKSPACE_UPDATE: 'workspace_update',
  ERROR: 'error'
} as const;