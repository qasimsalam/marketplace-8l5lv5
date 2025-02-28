/**
 * Date Utility Module
 * 
 * This module provides standardized date handling functions for the AI Talent Marketplace platform.
 * It includes functions for date parsing, formatting, validation, comparison, and manipulation
 * to ensure consistent date operations across all backend services.
 * 
 * @version 1.0.0
 */

import { 
  format, 
  parse, 
  isValid, 
  addDays, 
  addMonths, 
  addYears,
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  compareAsc,
  parseISO
} from 'date-fns'; // v2.30.0

import { ValidationError } from './errors';
import { 
  DATE_FORMATS, 
  DEFAULT_VALIDATION_MESSAGES 
} from '../constants';

/**
 * Represents the result of comparing two dates:
 * -1: First date is before second date
 *  0: Dates are equal
 *  1: First date is after second date
 */
export type DateComparisonResult = -1 | 0 | 1;

/**
 * Formats a date object or string into the specified format
 * 
 * @param date - The date to format
 * @param formatString - The format string to use
 * @returns Formatted date string
 * @throws ValidationError if the date is invalid
 */
export function formatDate(
  date: Date | string | number, 
  formatString: string
): string {
  if (!isValidDate(date)) {
    throw new ValidationError(DEFAULT_VALIDATION_MESSAGES.INVALID_DATE);
  }

  const dateObj = date instanceof Date ? date : parseDate(String(date), DATE_FORMATS.ISO);
  return format(dateObj, formatString);
}

/**
 * Parses a string date in the specified format into a Date object
 * 
 * @param dateString - The date string to parse
 * @param formatString - The format of the date string
 * @returns Parsed date object
 * @throws ValidationError if the date string is invalid
 */
export function parseDate(dateString: string, formatString: string): Date {
  if (typeof dateString !== 'string') {
    throw new ValidationError(DEFAULT_VALIDATION_MESSAGES.INVALID_DATE);
  }

  let date: Date;
  
  // If format is ISO, use parseISO for better performance and accuracy
  if (formatString === DATE_FORMATS.ISO) {
    date = parseISO(dateString);
  } else {
    date = parse(dateString, formatString, new Date());
  }

  if (!isValid(date)) {
    throw new ValidationError(DEFAULT_VALIDATION_MESSAGES.INVALID_DATE);
  }

  return date;
}

/**
 * Checks if a value is a valid date
 * 
 * @param value - The value to check
 * @returns Whether the value is a valid date
 */
export function isValidDate(value: any): boolean {
  if (value instanceof Date) {
    return isValid(value);
  }
  
  if (typeof value === 'string') {
    try {
      return isValid(parseISO(value));
    } catch (error) {
      return false;
    }
  }
  
  if (typeof value === 'number') {
    const date = new Date(value);
    return isValid(date);
  }
  
  return false;
}

/**
 * Converts a date to ISO string format (ISO 8601)
 * 
 * @param date - The date to convert
 * @returns ISO formatted date string
 * @throws ValidationError if the date is invalid
 */
export function toISOString(date: Date | string | number): string {
  if (!isValidDate(date)) {
    throw new ValidationError(DEFAULT_VALIDATION_MESSAGES.INVALID_DATE);
  }

  const dateObj = date instanceof Date 
    ? date 
    : typeof date === 'string'
      ? parseDate(date, DATE_FORMATS.ISO)
      : new Date(date);
      
  return dateObj.toISOString();
}

/**
 * Formats a date for user-friendly display
 * 
 * @param date - The date to format
 * @returns Formatted date string for display
 * @throws ValidationError if the date is invalid
 */
export function formatForDisplay(date: Date | string | number): string {
  return formatDate(date, DATE_FORMATS.DISPLAY);
}

/**
 * Formats a date as a database timestamp
 * 
 * @param date - The date to format
 * @returns Formatted timestamp string
 * @throws ValidationError if the date is invalid
 */
export function formatForTimestamp(date: Date | string | number): string {
  return formatDate(date, DATE_FORMATS.TIMESTAMP);
}

/**
 * Formats a date without time components
 * 
 * @param date - The date to format
 * @returns Formatted date-only string
 * @throws ValidationError if the date is invalid
 */
export function formatDateOnly(date: Date | string | number): string {
  return formatDate(date, DATE_FORMATS.DATE_ONLY);
}

/**
 * Formats only the time component of a date
 * 
 * @param date - The date to format
 * @returns Formatted time-only string
 * @throws ValidationError if the date is invalid
 */
export function formatTimeOnly(date: Date | string | number): string {
  return formatDate(date, DATE_FORMATS.TIME_ONLY);
}

/**
 * Adds a specified number of days to a date
 * 
 * @param date - The date to add days to
 * @param days - Number of days to add
 * @returns New date with days added
 * @throws ValidationError if the date is invalid
 */
export function addDaysToDate(date: Date | string | number, days: number): Date {
  if (!isValidDate(date)) {
    throw new ValidationError(DEFAULT_VALIDATION_MESSAGES.INVALID_DATE);
  }

  const dateObj = date instanceof Date 
    ? date 
    : typeof date === 'string'
      ? parseDate(date, DATE_FORMATS.ISO)
      : new Date(date);
      
  return addDays(dateObj, days);
}

/**
 * Adds a specified number of months to a date
 * 
 * @param date - The date to add months to
 * @param months - Number of months to add
 * @returns New date with months added
 * @throws ValidationError if the date is invalid
 */
export function addMonthsToDate(date: Date | string | number, months: number): Date {
  if (!isValidDate(date)) {
    throw new ValidationError(DEFAULT_VALIDATION_MESSAGES.INVALID_DATE);
  }

  const dateObj = date instanceof Date 
    ? date 
    : typeof date === 'string'
      ? parseDate(date, DATE_FORMATS.ISO)
      : new Date(date);
      
  return addMonths(dateObj, months);
}

/**
 * Adds a specified number of years to a date
 * 
 * @param date - The date to add years to
 * @param years - Number of years to add
 * @returns New date with years added
 * @throws ValidationError if the date is invalid
 */
export function addYearsToDate(date: Date | string | number, years: number): Date {
  if (!isValidDate(date)) {
    throw new ValidationError(DEFAULT_VALIDATION_MESSAGES.INVALID_DATE);
  }

  const dateObj = date instanceof Date 
    ? date 
    : typeof date === 'string'
      ? parseDate(date, DATE_FORMATS.ISO)
      : new Date(date);
      
  return addYears(dateObj, years);
}

/**
 * Calculates the difference in days between two dates
 * 
 * @param dateLeft - First date
 * @param dateRight - Second date
 * @returns Number of days between the dates (absolute value)
 * @throws ValidationError if either date is invalid
 */
export function getDaysDifference(
  dateLeft: Date | string | number, 
  dateRight: Date | string | number
): number {
  if (!isValidDate(dateLeft) || !isValidDate(dateRight)) {
    throw new ValidationError(DEFAULT_VALIDATION_MESSAGES.INVALID_DATE);
  }

  const dateLeftObj = dateLeft instanceof Date 
    ? dateLeft 
    : typeof dateLeft === 'string'
      ? parseDate(dateLeft, DATE_FORMATS.ISO)
      : new Date(dateLeft);
      
  const dateRightObj = dateRight instanceof Date 
    ? dateRight 
    : typeof dateRight === 'string'
      ? parseDate(dateRight, DATE_FORMATS.ISO)
      : new Date(dateRight);
      
  return Math.abs(differenceInDays(dateLeftObj, dateRightObj));
}

/**
 * Calculates the difference in months between two dates
 * 
 * @param dateLeft - First date
 * @param dateRight - Second date
 * @returns Number of months between the dates (absolute value)
 * @throws ValidationError if either date is invalid
 */
export function getMonthsDifference(
  dateLeft: Date | string | number, 
  dateRight: Date | string | number
): number {
  if (!isValidDate(dateLeft) || !isValidDate(dateRight)) {
    throw new ValidationError(DEFAULT_VALIDATION_MESSAGES.INVALID_DATE);
  }

  const dateLeftObj = dateLeft instanceof Date 
    ? dateLeft 
    : typeof dateLeft === 'string'
      ? parseDate(dateLeft, DATE_FORMATS.ISO)
      : new Date(dateLeft);
      
  const dateRightObj = dateRight instanceof Date 
    ? dateRight 
    : typeof dateRight === 'string'
      ? parseDate(dateRight, DATE_FORMATS.ISO)
      : new Date(dateRight);
      
  return Math.abs(differenceInMonths(dateLeftObj, dateRightObj));
}

/**
 * Calculates the difference in years between two dates
 * 
 * @param dateLeft - First date
 * @param dateRight - Second date
 * @returns Number of years between the dates (absolute value)
 * @throws ValidationError if either date is invalid
 */
export function getYearsDifference(
  dateLeft: Date | string | number, 
  dateRight: Date | string | number
): number {
  if (!isValidDate(dateLeft) || !isValidDate(dateRight)) {
    throw new ValidationError(DEFAULT_VALIDATION_MESSAGES.INVALID_DATE);
  }

  const dateLeftObj = dateLeft instanceof Date 
    ? dateLeft 
    : typeof dateLeft === 'string'
      ? parseDate(dateLeft, DATE_FORMATS.ISO)
      : new Date(dateLeft);
      
  const dateRightObj = dateRight instanceof Date 
    ? dateRight 
    : typeof dateRight === 'string'
      ? parseDate(dateRight, DATE_FORMATS.ISO)
      : new Date(dateRight);
      
  return Math.abs(differenceInYears(dateLeftObj, dateRightObj));
}

/**
 * Compares two dates and returns a comparison result
 * 
 * @param dateLeft - First date
 * @param dateRight - Second date
 * @returns -1 if dateLeft is before dateRight, 0 if equal, 1 if after
 * @throws ValidationError if either date is invalid
 */
export function compareDates(
  dateLeft: Date | string | number, 
  dateRight: Date | string | number
): DateComparisonResult {
  if (!isValidDate(dateLeft) || !isValidDate(dateRight)) {
    throw new ValidationError(DEFAULT_VALIDATION_MESSAGES.INVALID_DATE);
  }

  const dateLeftObj = dateLeft instanceof Date 
    ? dateLeft 
    : typeof dateLeft === 'string'
      ? parseDate(dateLeft, DATE_FORMATS.ISO)
      : new Date(dateLeft);
      
  const dateRightObj = dateRight instanceof Date 
    ? dateRight 
    : typeof dateRight === 'string'
      ? parseDate(dateRight, DATE_FORMATS.ISO)
      : new Date(dateRight);
      
  return compareAsc(dateLeftObj, dateRightObj) as DateComparisonResult;
}

/**
 * Checks if a date is before another date
 * 
 * @param date - The date to check
 * @param dateToCompare - The date to compare against
 * @returns Whether date is before dateToCompare
 * @throws ValidationError if either date is invalid
 */
export function isDateBefore(
  date: Date | string | number, 
  dateToCompare: Date | string | number
): boolean {
  return compareDates(date, dateToCompare) === -1;
}

/**
 * Checks if a date is after another date
 * 
 * @param date - The date to check
 * @param dateToCompare - The date to compare against
 * @returns Whether date is after dateToCompare
 * @throws ValidationError if either date is invalid
 */
export function isDateAfter(
  date: Date | string | number, 
  dateToCompare: Date | string | number
): boolean {
  return compareDates(date, dateToCompare) === 1;
}

/**
 * Checks if two dates are the same (ignoring time if specified)
 * 
 * @param date - The date to check
 * @param dateToCompare - The date to compare against
 * @param ignoreTime - Whether to ignore the time part of the dates
 * @returns Whether the dates are the same
 * @throws ValidationError if either date is invalid
 */
export function isDateSame(
  date: Date | string | number, 
  dateToCompare: Date | string | number,
  ignoreTime = false
): boolean {
  if (ignoreTime) {
    const dateStr = formatDateOnly(date);
    const dateToCompareStr = formatDateOnly(dateToCompare);
    return dateStr === dateToCompareStr;
  }
  
  return compareDates(date, dateToCompare) === 0;
}

/**
 * Checks if a date is between two other dates (inclusive if specified)
 * 
 * @param date - The date to check
 * @param startDate - The start date of the range
 * @param endDate - The end date of the range
 * @param inclusive - Whether to include the start and end dates in the range
 * @returns Whether date is between startDate and endDate
 * @throws ValidationError if any date is invalid
 */
export function isDateBetween(
  date: Date | string | number,
  startDate: Date | string | number,
  endDate: Date | string | number,
  inclusive = true
): boolean {
  if (!isValidDate(date) || !isValidDate(startDate) || !isValidDate(endDate)) {
    throw new ValidationError(DEFAULT_VALIDATION_MESSAGES.INVALID_DATE);
  }

  const dateObj = date instanceof Date 
    ? date 
    : typeof date === 'string'
      ? parseDate(date, DATE_FORMATS.ISO)
      : new Date(date);
      
  const startDateObj = startDate instanceof Date 
    ? startDate 
    : typeof startDate === 'string'
      ? parseDate(startDate, DATE_FORMATS.ISO)
      : new Date(startDate);
      
  const endDateObj = endDate instanceof Date 
    ? endDate 
    : typeof endDate === 'string'
      ? parseDate(endDate, DATE_FORMATS.ISO)
      : new Date(endDate);
  
  const afterStart = inclusive 
    ? compareAsc(dateObj, startDateObj) >= 0 
    : compareAsc(dateObj, startDateObj) > 0;
    
  const beforeEnd = inclusive 
    ? compareAsc(dateObj, endDateObj) <= 0 
    : compareAsc(dateObj, endDateObj) < 0;
    
  return afterStart && beforeEnd;
}

/**
 * Returns the current date and time as a formatted timestamp
 * 
 * @returns Current timestamp string
 */
export function getCurrentTimestamp(): string {
  return formatForTimestamp(new Date());
}

/**
 * Converts an ISO date string to a Date object
 * 
 * @param isoString - The ISO date string to convert
 * @returns Date object created from ISO string
 * @throws ValidationError if the ISO string is invalid
 */
export function getDateFromISOString(isoString: string): Date {
  if (typeof isoString !== 'string') {
    throw new ValidationError(DEFAULT_VALIDATION_MESSAGES.INVALID_DATE);
  }
  
  const date = parseISO(isoString);
  
  if (!isValid(date)) {
    throw new ValidationError(DEFAULT_VALIDATION_MESSAGES.INVALID_DATE);
  }
  
  return date;
}

/**
 * Returns the first day of the month for a given date
 * 
 * @param date - The date to get the first day of the month for
 * @returns First day of the month
 * @throws ValidationError if the date is invalid
 */
export function getFirstDayOfMonth(date: Date | string | number): Date {
  if (!isValidDate(date)) {
    throw new ValidationError(DEFAULT_VALIDATION_MESSAGES.INVALID_DATE);
  }

  const dateObj = date instanceof Date 
    ? date 
    : typeof date === 'string'
      ? parseDate(date, DATE_FORMATS.ISO)
      : new Date(date);
      
  return new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
}

/**
 * Returns the last day of the month for a given date
 * 
 * @param date - The date to get the last day of the month for
 * @returns Last day of the month
 * @throws ValidationError if the date is invalid
 */
export function getLastDayOfMonth(date: Date | string | number): Date {
  if (!isValidDate(date)) {
    throw new ValidationError(DEFAULT_VALIDATION_MESSAGES.INVALID_DATE);
  }

  const dateObj = date instanceof Date 
    ? date 
    : typeof date === 'string'
      ? parseDate(date, DATE_FORMATS.ISO)
      : new Date(date);
      
  return new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0);
}

/**
 * Calculates the duration in days between start and end dates
 * 
 * @param startDate - The start date
 * @param endDate - The end date
 * @returns Duration in days (inclusive of both start and end dates)
 * @throws ValidationError if either date is invalid
 */
export function calculateDuration(
  startDate: Date | string | number,
  endDate: Date | string | number
): number {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    throw new ValidationError(DEFAULT_VALIDATION_MESSAGES.INVALID_DATE);
  }

  // Add 1 to include both start and end dates in the duration
  return getDaysDifference(startDate, endDate) + 1;
}

/**
 * Calculates an expiry date based on a start date and duration
 * 
 * @param startDate - The start date
 * @param durationInDays - Duration in days
 * @returns Calculated expiry date
 * @throws ValidationError if the start date is invalid
 */
export function calculateExpiryDate(
  startDate: Date | string | number,
  durationInDays: number
): Date {
  if (!isValidDate(startDate)) {
    throw new ValidationError(DEFAULT_VALIDATION_MESSAGES.INVALID_DATE);
  }

  return addDaysToDate(startDate, durationInDays);
}

/**
 * Checks if a date has expired (is before current date)
 * 
 * @param date - The date to check
 * @returns Whether the date is expired
 * @throws ValidationError if the date is invalid
 */
export function isExpired(date: Date | string | number): boolean {
  if (!isValidDate(date)) {
    throw new ValidationError(DEFAULT_VALIDATION_MESSAGES.INVALID_DATE);
  }

  const dateObj = date instanceof Date 
    ? date 
    : typeof date === 'string'
      ? parseDate(date, DATE_FORMATS.ISO)
      : new Date(date);
      
  const now = new Date();
  
  return isDateBefore(dateObj, now);
}