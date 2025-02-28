/**
 * Validation utility functions for form inputs and data across the AI Talent Marketplace.
 * Provides simple boolean validations for common use cases to improve user experience and data integrity.
 * 
 * @packageDocumentation
 */

import { isValidDate } from './date';
import validator from 'validator'; // ^13.11.0

// Regular expressions for validation
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const URL_REGEX = /^(https?:\/\/)?([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]*[a-z0-9])?([\/\w .-]*)*\/?$/;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Checks if a value is not null, undefined, or empty string
 * 
 * @param value - The value to check
 * @returns True if value exists and is not empty
 */
export const isRequired = (value: any): boolean => {
  if (value === undefined || value === null) {
    return false;
  }
  
  if (typeof value === 'string') {
    return value.trim() !== '';
  }
  
  return true;
};

/**
 * Validates if a string is a properly formatted email address
 * 
 * @param email - The email to validate
 * @returns True if the email is valid, false otherwise
 */
export const isEmail = (email: string): boolean => {
  if (!isRequired(email)) {
    return false;
  }
  
  // Use validator library for email validation as it's more comprehensive
  // Fall back to regex if validator isn't available
  return typeof validator !== 'undefined' 
    ? validator.isEmail(email) 
    : EMAIL_REGEX.test(email);
};

/**
 * Validates if a password meets security requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * 
 * @param password - The password to validate
 * @returns True if the password meets all requirements, false otherwise
 */
export const isPassword = (password: string): boolean => {
  if (!isRequired(password)) {
    return false;
  }
  
  if (password.length < MIN_PASSWORD_LENGTH) {
    return false;
  }
  
  return PASSWORD_REGEX.test(password);
};

/**
 * Validates if a string is a properly formatted URL
 * 
 * @param url - The URL to validate
 * @returns True if the URL is valid, false otherwise
 */
export const isURL = (url: string): boolean => {
  if (!isRequired(url)) {
    return false;
  }
  
  // Use validator library for URL validation as it's more comprehensive
  // Fall back to regex if validator isn't available
  return typeof validator !== 'undefined' 
    ? validator.isURL(url, { require_protocol: false, require_valid_protocol: true }) 
    : URL_REGEX.test(url);
};

/**
 * Validates if a string is a properly formatted phone number
 * 
 * @param phone - The phone number to validate
 * @returns True if the phone number is valid, false otherwise
 */
export const isPhone = (phone: string): boolean => {
  if (!isRequired(phone)) {
    return false;
  }
  
  // Use validator library for phone validation as it handles international formats
  // Fall back to regex if validator isn't available
  return typeof validator !== 'undefined' 
    ? validator.isMobilePhone(phone, 'any') 
    : PHONE_REGEX.test(phone);
};

/**
 * Validates if a number is within a specified range
 * 
 * @param value - The number to validate
 * @param min - The minimum allowed value
 * @param max - The maximum allowed value
 * @returns True if the number is within the range, false otherwise
 */
export const isNumberInRange = (value: number, min: number, max: number): boolean => {
  if (typeof value !== 'number' || isNaN(value)) {
    return false;
  }
  
  return value >= min && value <= max;
};

/**
 * Validates if a string meets minimum length requirement
 * 
 * @param value - The string to validate
 * @param minLength - The minimum required length
 * @returns True if the string length is at least minLength
 */
export const isMinLength = (value: string, minLength: number): boolean => {
  if (typeof value !== 'string') {
    return false;
  }
  
  return value.length >= minLength;
};

/**
 * Validates if a string does not exceed maximum length
 * 
 * @param value - The string to validate
 * @param maxLength - The maximum allowed length
 * @returns True if the string length is at most maxLength
 */
export const isMaxLength = (value: string, maxLength: number): boolean => {
  if (typeof value !== 'string') {
    return false;
  }
  
  return value.length <= maxLength;
};

/**
 * Validates if two values match (for password confirmation)
 * 
 * @param value1 - The first value
 * @param value2 - The second value to compare
 * @returns True if the values match exactly
 */
export const isMatch = (value1: any, value2: any): boolean => {
  return value1 === value2;
};

/**
 * Validates if a value is a positive number
 * 
 * @param value - The value to validate
 * @returns True if the value is a positive number
 */
export const isPositiveNumber = (value: number): boolean => {
  if (typeof value !== 'number' || isNaN(value)) {
    return false;
  }
  
  return value > 0;
};

/**
 * Validates if a value is a valid currency amount (positive with max 2 decimal places)
 * 
 * @param value - The value to validate
 * @returns True if the value is a valid currency amount
 */
export const isValidCurrency = (value: number): boolean => {
  if (!isPositiveNumber(value)) {
    return false;
  }
  
  // Check if it has at most 2 decimal places
  const valueStr = value.toString();
  const decimalParts = valueStr.split('.');
  
  if (decimalParts.length > 1) {
    return decimalParts[1].length <= 2;
  }
  
  return true;
};

/**
 * Validates if a date is in the future
 * 
 * @param date - The date to validate
 * @returns True if the date is valid and in the future
 */
export const isDateInFuture = (date: Date): boolean => {
  if (!isValidDate(date)) {
    return false;
  }
  
  const now = new Date();
  return date > now;
};