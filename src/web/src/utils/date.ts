/**
 * Date utility functions for the AI Talent Marketplace web application.
 * Provides consistent date handling for job listings, profiles, messages, and other time-sensitive features.
 * @packageDocumentation
 */

import {
  format,
  formatDistance,
  parseISO,
  isValid,
  differenceInDays,
  addDays,
  isBefore,
  isAfter,
  isEqual,
  formatRelative,
  subDays
} from 'date-fns'; // ^2.30.0

/**
 * Default date format for display (e.g., "Jan 01, 2023")
 */
export const DEFAULT_DATE_FORMAT = 'MMM dd, yyyy';

/**
 * Default datetime format for display (e.g., "Jan 01, 2023 14:30")
 */
export const DEFAULT_DATETIME_FORMAT = 'MMM dd, yyyy HH:mm';

/**
 * Options for relative date formatting
 */
export const RELATIVE_DATE_OPTIONS = { addSuffix: true };

/**
 * Internal helper function to parse a date value to a Date object
 * @param date - The date to parse
 * @returns Parsed Date object or null if invalid
 */
const parseDate = (
  date: Date | string | number | null | undefined
): Date | null => {
  if (!date) return null;
  
  let parsedDate: Date;
  if (typeof date === 'string') {
    parsedDate = parseISO(date);
  } else if (typeof date === 'number') {
    parsedDate = new Date(date);
  } else {
    parsedDate = date;
  }
  
  return isValid(parsedDate) ? parsedDate : null;
};

/**
 * Formats a date object or string into a user-friendly display format
 * @param date - The date to format
 * @param formatStr - The format string to use (defaults to DEFAULT_DATE_FORMAT)
 * @returns Formatted date string or empty string if invalid
 */
export const formatDate = (
  date: Date | string | number | null | undefined,
  formatStr: string = DEFAULT_DATE_FORMAT
): string => {
  const parsedDate = parseDate(date);
  if (!parsedDate) return '';
  
  return format(parsedDate, formatStr);
};

/**
 * Formats a date with both date and time components
 * @param date - The date to format
 * @returns Formatted date and time string or empty string if invalid
 */
export const formatDateTime = (
  date: Date | string | number | null | undefined
): string => {
  return formatDate(date, DEFAULT_DATETIME_FORMAT);
};

/**
 * Formats a date as a relative time string (e.g., '2 days ago')
 * @param date - The date to format
 * @returns Relative time string or empty string if invalid
 */
export const formatRelativeTime = (
  date: Date | string | number | null | undefined
): string => {
  const parsedDate = parseDate(date);
  if (!parsedDate) return '';
  
  return formatDistance(parsedDate, new Date(), RELATIVE_DATE_OPTIONS);
};

/**
 * Formats a date for UI display, using relative format for recent dates and standard format for older dates
 * @param date - The date to format
 * @returns Formatted date string optimized for user-friendly display
 */
export const formatDateForDisplay = (
  date: Date | string | number | null | undefined
): string => {
  const parsedDate = parseDate(date);
  if (!parsedDate) return '';
  
  // Calculate if the date is within the last 7 days
  const now = new Date();
  const daysDifference = Math.abs(differenceInDays(parsedDate, now));
  
  // If recent, use relative time format, otherwise use standard date format
  if (daysDifference <= 7) {
    return formatRelativeTime(parsedDate);
  } else {
    return formatDate(parsedDate);
  }
};

/**
 * Checks if a value is a valid date
 * @param value - The value to check
 * @returns True if the value represents a valid date
 */
export const isValidDate = (value: any): boolean => {
  if (value === null || value === undefined) {
    return false;
  }
  
  if (value instanceof Date) {
    return !isNaN(value.getTime());
  }
  
  if (typeof value === 'string') {
    const parsedDate = parseISO(value);
    return isValid(parsedDate);
  }
  
  if (typeof value === 'number') {
    const parsedDate = new Date(value);
    return !isNaN(parsedDate.getTime());
  }
  
  return false;
};

/**
 * Calculates the number of days between two dates
 * @param startDate - The start date
 * @param endDate - The end date
 * @returns Number of days between dates or 0 if invalid
 */
export const getDaysBetween = (
  startDate: Date | string | number | null | undefined,
  endDate: Date | string | number | null | undefined
): number => {
  const parsedStartDate = parseDate(startDate);
  const parsedEndDate = parseDate(endDate);
  
  if (!parsedStartDate || !parsedEndDate) {
    return 0;
  }
  
  return Math.abs(differenceInDays(parsedStartDate, parsedEndDate));
};

/**
 * Adds a specified number of days to a date
 * @param date - The date to add days to
 * @param days - The number of days to add
 * @returns New date with days added or null if input invalid
 */
export const addDaysToDate = (
  date: Date | string | number | null | undefined,
  days: number
): Date | null => {
  const parsedDate = parseDate(date);
  if (!parsedDate) return null;
  
  return addDays(parsedDate, days);
};

/**
 * Subtracts a specified number of days from a date
 * @param date - The date to subtract days from
 * @param days - The number of days to subtract
 * @returns New date with days subtracted or null if input invalid
 */
export const subtractDaysFromDate = (
  date: Date | string | number | null | undefined,
  days: number
): Date | null => {
  return addDaysToDate(date, -days);
};

/**
 * Checks if a date is before another date
 * @param date - The date to check
 * @param dateToCompare - The date to compare against
 * @returns True if first date is before second date
 */
export const isDateBefore = (
  date: Date | string | number | null | undefined,
  dateToCompare: Date | string | number | null | undefined
): boolean => {
  const parsedDate = parseDate(date);
  const parsedDateToCompare = parseDate(dateToCompare);
  
  if (!parsedDate || !parsedDateToCompare) {
    return false;
  }
  
  return isBefore(parsedDate, parsedDateToCompare);
};

/**
 * Checks if a date is after another date
 * @param date - The date to check
 * @param dateToCompare - The date to compare against
 * @returns True if first date is after second date
 */
export const isDateAfter = (
  date: Date | string | number | null | undefined,
  dateToCompare: Date | string | number | null | undefined
): boolean => {
  const parsedDate = parseDate(date);
  const parsedDateToCompare = parseDate(dateToCompare);
  
  if (!parsedDate || !parsedDateToCompare) {
    return false;
  }
  
  return isAfter(parsedDate, parsedDateToCompare);
};

/**
 * Checks if two dates are equal
 * @param date - First date to compare
 * @param dateToCompare - Second date to compare
 * @returns True if dates are equal
 */
export const isDateEqual = (
  date: Date | string | number | null | undefined,
  dateToCompare: Date | string | number | null | undefined
): boolean => {
  const parsedDate = parseDate(date);
  const parsedDateToCompare = parseDate(dateToCompare);
  
  if (!parsedDate || !parsedDateToCompare) {
    return false;
  }
  
  return isEqual(parsedDate, parsedDateToCompare);
};

/**
 * Checks if a date is between two other dates (inclusive)
 * @param date - The date to check
 * @param startDate - The start date of the range
 * @param endDate - The end date of the range
 * @returns True if date is between startDate and endDate (inclusive)
 */
export const isDateBetween = (
  date: Date | string | number | null | undefined,
  startDate: Date | string | number | null | undefined,
  endDate: Date | string | number | null | undefined
): boolean => {
  const parsedDate = parseDate(date);
  const parsedStartDate = parseDate(startDate);
  const parsedEndDate = parseDate(endDate);
  
  if (!parsedDate || !parsedStartDate || !parsedEndDate) {
    return false;
  }
  
  return (
    (isEqual(parsedDate, parsedStartDate) || isAfter(parsedDate, parsedStartDate)) &&
    (isEqual(parsedDate, parsedEndDate) || isBefore(parsedDate, parsedEndDate))
  );
};

/**
 * Parses an ISO format date string into a Date object
 * @param dateString - The ISO format date string to parse
 * @returns Parsed Date object or null if invalid
 */
export const parseISODate = (
  dateString: string | null | undefined
): Date | null => {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }
  
  const parsedDate = parseISO(dateString);
  
  return isValid(parsedDate) ? parsedDate : null;
};

/**
 * Returns the current date and time
 * @returns Current date and time
 */
export const getNow = (): Date => {
  return new Date();
};