/**
 * Password Utility Module
 * 
 * Provides secure password management functions for the AI Talent Marketplace,
 * including hashing, verification, strength validation, and policy generation.
 * Implements Argon2id for secure password hashing with configurable parameters.
 * 
 * @version 1.0.0
 */

import * as argon2 from 'argon2'; // v0.30.3
import * as zxcvbn from 'zxcvbn'; // v4.4.2

import { REGEX_PATTERNS, DEFAULT_VALIDATION_MESSAGES } from '../../shared/src/constants';
import { ValidationError } from '../../shared/src/utils/errors';
import { config } from '../config';

/**
 * Default options for password hashing with Argon2id
 */
const DEFAULT_HASH_OPTIONS: argon2.Options & { type: argon2.ArgonType } = {
  type: argon2.argon2id, // Using Argon2id which balances resistance against both side-channel and GPU attacks
  memoryCost: 4096,      // 4 MiB memory cost
  timeCost: 3,           // 3 iterations
  parallelism: 1         // Number of threads to use
};

/**
 * Securely hashes a password using the Argon2id algorithm
 * 
 * @param password - Plain text password to hash
 * @param options - Argon2 hashing options (optional, will use defaults if not provided)
 * @returns Promise resolving to the hashed password string
 * @throws Error if password is empty or hashing fails
 */
export async function hashPassword(
  password: string, 
  options?: argon2.Options
): Promise<string> {
  if (!password) {
    throw new ValidationError('Password is required');
  }

  const hashOptions = {
    ...DEFAULT_HASH_OPTIONS,
    ...options
  };

  try {
    // Generate hash using Argon2id
    return await argon2.hash(password, hashOptions);
  } catch (error) {
    // Log the error but don't expose the internal details
    console.error('Password hashing error:', error);
    throw new Error('Failed to hash password');
  }
}

/**
 * Verifies a plain text password against a stored hash
 * 
 * @param password - Plain text password to verify
 * @param hash - Stored password hash to compare against
 * @returns Promise resolving to boolean indicating if the password matches
 */
export async function verifyPassword(
  password: string, 
  hash: string
): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }

  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    // Log the error but return false to prevent information leakage
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * Interface for password strength validation result
 */
interface PasswordValidationResult {
  isValid: boolean;
  score: number;
  feedback: {
    warning: string;
    suggestions: string[];
  };
}

/**
 * Validates password strength using zxcvbn and regex pattern
 * 
 * @param password - Password to validate
 * @param userInfo - Optional user information to check against (to prevent using personal info in password)
 * @returns Validation result with score, feedback, and isValid flag
 */
export function validatePasswordStrength(
  password: string,
  userInfo?: { email?: string; firstName?: string; lastName?: string }
): PasswordValidationResult {
  // First check against our regex pattern for basic requirements
  const meetsRequirements = REGEX_PATTERNS.PASSWORD.test(password);
  
  if (!meetsRequirements) {
    return {
      isValid: false,
      score: 0,
      feedback: {
        warning: DEFAULT_VALIDATION_MESSAGES.INVALID_PASSWORD,
        suggestions: [
          'Include at least 8 characters',
          'Include at least one uppercase letter',
          'Include at least one lowercase letter',
          'Include at least one number',
          'Include at least one special character'
        ]
      }
    };
  }

  // Use zxcvbn for more advanced password strength analysis
  const userInputs: string[] = [];
  if (userInfo?.email) userInputs.push(userInfo.email);
  if (userInfo?.firstName) userInputs.push(userInfo.firstName);
  if (userInfo?.lastName) userInputs.push(userInfo.lastName);

  const result = zxcvbn(password, userInputs);

  // Check if the password meets the minimum required strength from config
  // zxcvbn returns a score from 0-4, where 0 is very weak and 4 is very strong
  const minRequiredScore = config.user.passwordPolicy.minLength >= 12 ? 3 : 2;

  return {
    isValid: result.score >= minRequiredScore,
    score: result.score,
    feedback: {
      warning: result.feedback.warning || '',
      suggestions: result.feedback.suggestions || []
    }
  };
}

/**
 * Checks if a password has been used before based on stored password history
 * 
 * @param password - Plain text password to check
 * @param passwordHistory - Array of previously used password hashes
 * @returns Promise resolving to boolean indicating if the password exists in history
 */
export async function isPasswordInHistory(
  password: string, 
  passwordHistory: string[]
): Promise<boolean> {
  if (!password || !passwordHistory?.length) {
    return false;
  }

  // Check each hash in the history
  for (const hash of passwordHistory) {
    if (await verifyPassword(password, hash)) {
      return true;
    }
  }

  return false;
}

/**
 * Interface for password policy
 */
interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventReuseCount?: number;
  description: string;
}

/**
 * Generates a human-readable password policy based on configuration
 * 
 * @returns Password policy object with requirements and description
 */
export function generatePasswordPolicy(): PasswordPolicy {
  const { passwordPolicy } = config.user;
  
  const requirements = [
    `at least ${passwordPolicy.minLength} characters`,
  ];
  
  if (passwordPolicy.requireUppercase) {
    requirements.push('at least one uppercase letter');
  }
  
  if (passwordPolicy.requireLowercase) {
    requirements.push('at least one lowercase letter');
  }
  
  if (passwordPolicy.requireNumbers) {
    requirements.push('at least one number');
  }
  
  if (passwordPolicy.requireSpecialChars) {
    requirements.push('at least one special character');
  }
  
  const description = `Your password must contain ${requirements.join(', ')}.`;
  
  return {
    minLength: passwordPolicy.minLength,
    requireUppercase: passwordPolicy.requireUppercase,
    requireLowercase: passwordPolicy.requireLowercase,
    requireNumbers: passwordPolicy.requireNumbers,
    requireSpecialChars: passwordPolicy.requireSpecialChars,
    description
  };
}