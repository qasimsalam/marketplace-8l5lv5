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
  isSameDay,
  isToday as isTodayFn,
  subDays,
  addMonths,
  addYears,
  differenceInMonths,
  differenceInYears,
  compareAsc
} from 'date-fns'; // ^2.30.0

/**
 * Standard date format patterns for the AI Talent Marketplace iOS app
 */
export const DATE_FORMATS = {
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
  DISPLAY: 'MMM d, yyyy',
  SHORT_DISPLAY: 'MMM d',
  TIME_ONLY: 'h:mm a',
  DATE_TIME: 'MMM d, yyyy h:mm a',
  SHORT_DATE_TIME: 'MMM d, h:mm a',
  RELATIVE_OPTIONS: { addSuffix: true }
};

/**
 * Date comparison result type
 * -1: dateLeft is before dateRight
 * 0: dates are equal
 * 1: dateLeft is after dateRight
 */
export type DateComparisonResult = -1 | 0 | 1;

/**
 * Helper function to parse different date formats into a Date object
 * @param date - Date in various formats
 * @returns Parsed Date object or null if invalid
 */
const parseDate = (date: Date | string | number | null | undefined): Date | null => {
  if (date === null || date === undefined) {
    return null;
  }

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
 * @param formatStr - Format string (defaults to DATE_FORMATS.DISPLAY)
 * @returns Formatted date string or empty string if invalid
 */
export const formatDate = (
  date: Date | string | number | null | undefined,
  formatStr: string = DATE_FORMATS.DISPLAY
): string => {
  const parsedDate = parseDate(date);
  if (!parsedDate) {
    return '';
  }
  return format(parsedDate, formatStr);
};

/**
 * Formats a date with both date and time components
 * @param date - The date to format
 * @returns Formatted date and time string or empty string if invalid
 */
export const formatDateTime = (date: Date | string | number | null | undefined): string => {
  return formatDate(date, DATE_FORMATS.DATE_TIME);
};

/**
 * Formats a date with both date and time components in a more compact format for mobile screens
 * @param date - The date to format
 * @returns Formatted compact date and time string or empty string if invalid
 */
export const formatShortDateTime = (date: Date | string | number | null | undefined): string => {
  return formatDate(date, DATE_FORMATS.SHORT_DATE_TIME);
};

/**
 * Formats only the time component of a date
 * @param date - The date to format
 * @returns Formatted time-only string or empty string if invalid
 */
export const formatTimeOnly = (date: Date | string | number | null | undefined): string => {
  return formatDate(date, DATE_FORMATS.TIME_ONLY);
};

/**
 * Formats a date as a relative time string (e.g., '2 days ago')
 * @param date - The date to format
 * @returns Relative time string or empty string if invalid
 */
export const formatRelativeTime = (date: Date | string | number | null | undefined): string => {
  const parsedDate = parseDate(date);
  if (!parsedDate) {
    return '';
  }
  return formatDistance(parsedDate, new Date(), DATE_FORMATS.RELATIVE_OPTIONS);
};

/**
 * Mobile-optimized version of relative date formatting with abbreviated forms for small screens
 * @param date - The date to format
 * @returns Mobile-friendly relative date string or empty string if invalid
 */
export const formatRelativeDateForMobile = (date: Date | string | number | null | undefined): string => {
  const parsedDate = parseDate(date);
  if (!parsedDate) {
    return '';
  }

  // If the date is today, return only the time
  if (isTodayFn(parsedDate)) {
    return formatTimeOnly(parsedDate);
  }

  const now = new Date();
  const diffDays = differenceInDays(now, parsedDate);

  // If within last 6 days, return day of week and time
  if (diffDays >= 0 && diffDays < 7) {
    return format(parsedDate, 'EEE') + ', ' + formatTimeOnly(parsedDate);
  }

  // If within current year, return month and day
  if (now.getFullYear() === parsedDate.getFullYear()) {
    return formatDate(parsedDate, DATE_FORMATS.SHORT_DISPLAY);
  }

  // Otherwise return full date with year
  return formatDate(parsedDate, DATE_FORMATS.DISPLAY);
};

/**
 * Context-aware date formatting optimized for mobile UI display
 * @param date - The date to format
 * @returns Formatted date string optimized for user-friendly display
 */
export const formatDateForDisplay = (date: Date | string | number | null | undefined): string => {
  const parsedDate = parseDate(date);
  if (!parsedDate) {
    return '';
  }

  const now = new Date();
  const diffDays = differenceInDays(now, parsedDate);

  // If within the last 7 days, use relative formatting
  if (diffDays >= 0 && diffDays < 7) {
    return formatRelativeTime(parsedDate);
  }

  // Otherwise use standard date format
  return formatDate(parsedDate);
};

/**
 * Checks if a value is a valid date
 * @param value - The value to check
 * @returns True if the value represents a valid date
 */
export const isValidDate = (value: any): boolean => {
  return parseDate(value) !== null;
};

/**
 * Parses an ISO format date string into a Date object
 * @param dateString - The ISO date string
 * @returns Parsed Date object or null if invalid
 */
export const parseISODate = (dateString: string | null | undefined): Date | null => {
  if (dateString === null || dateString === undefined || typeof dateString !== 'string') {
    return null;
  }
  const parsedDate = parseISO(dateString);
  return isValid(parsedDate) ? parsedDate : null;
};

/**
 * Checks if a date is today
 * @param date - The date to check
 * @returns True if the date is today
 */
export const isToday = (date: Date | string | number | null | undefined): boolean => {
  const parsedDate = parseDate(date);
  return parsedDate ? isTodayFn(parsedDate) : false;
};

/**
 * Checks if two dates represent the same calendar day (ignoring time)
 * @param dateA - First date
 * @param dateB - Second date
 * @returns True if both dates represent the same day
 */
export const isSameDate = (
  dateA: Date | string | number | null | undefined,
  dateB: Date | string | number | null | undefined
): boolean => {
  const parsedDateA = parseDate(dateA);
  const parsedDateB = parseDate(dateB);
  
  if (!parsedDateA || !parsedDateB) {
    return false;
  }
  
  return isSameDay(parsedDateA, parsedDateB);
};

/**
 * Calculates the number of days between two dates
 * @param startDate - Start date
 * @param endDate - End date
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
 * Calculates the number of months between two dates
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of months between dates or 0 if invalid
 */
export const getMonthsBetween = (
  startDate: Date | string | number | null | undefined,
  endDate: Date | string | number | null | undefined
): number => {
  const parsedStartDate = parseDate(startDate);
  const parsedEndDate = parseDate(endDate);
  
  if (!parsedStartDate || !parsedEndDate) {
    return 0;
  }
  
  return Math.abs(differenceInMonths(parsedStartDate, parsedEndDate));
};

/**
 * Calculates the number of years between two dates
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of years between dates or 0 if invalid
 */
export const getYearsBetween = (
  startDate: Date | string | number | null | undefined,
  endDate: Date | string | number | null | undefined
): number => {
  const parsedStartDate = parseDate(startDate);
  const parsedEndDate = parseDate(endDate);
  
  if (!parsedStartDate || !parsedEndDate) {
    return 0;
  }
  
  return Math.abs(differenceInYears(parsedStartDate, parsedEndDate));
};

/**
 * Adds a specified number of days to a date
 * @param date - The date
 * @param days - Number of days to add
 * @returns New date with days added or null if input invalid
 */
export const addDaysToDate = (
  date: Date | string | number | null | undefined,
  days: number
): Date | null => {
  const parsedDate = parseDate(date);
  if (!parsedDate) {
    return null;
  }
  return addDays(parsedDate, days);
};

/**
 * Subtracts a specified number of days from a date
 * @param date - The date
 * @param days - Number of days to subtract
 * @returns New date with days subtracted or null if input invalid
 */
export const subtractDaysFromDate = (
  date: Date | string | number | null | undefined,
  days: number
): Date | null => {
  const parsedDate = parseDate(date);
  if (!parsedDate) {
    return null;
  }
  return subDays(parsedDate, days);
};

/**
 * Adds a specified number of months to a date
 * @param date - The date
 * @param months - Number of months to add
 * @returns New date with months added or null if input invalid
 */
export const addMonthsToDate = (
  date: Date | string | number | null | undefined,
  months: number
): Date | null => {
  const parsedDate = parseDate(date);
  if (!parsedDate) {
    return null;
  }
  return addMonths(parsedDate, months);
};

/**
 * Adds a specified number of years to a date
 * @param date - The date
 * @param years - Number of years to add
 * @returns New date with years added or null if input invalid
 */
export const addYearsToDate = (
  date: Date | string | number | null | undefined,
  years: number
): Date | null => {
  const parsedDate = parseDate(date);
  if (!parsedDate) {
    return null;
  }
  return addYears(parsedDate, years);
};

/**
 * Checks if a date is before another date
 * @param date - First date
 * @param dateToCompare - Second date to compare with
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
 * @param date - First date
 * @param dateToCompare - Second date to compare with
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
 * @param date - First date
 * @param dateToCompare - Second date to compare with
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
 * @param startDate - Start of range
 * @param endDate - End of range
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
 * Compares two dates and returns a comparison result
 * @param dateLeft - First date
 * @param dateRight - Second date
 * @returns -1 if dateLeft is before dateRight, 0 if equal, 1 if after
 */
export const compareDates = (
  dateLeft: Date | string | number | null | undefined,
  dateRight: Date | string | number | null | undefined
): DateComparisonResult => {
  const parsedDateLeft = parseDate(dateLeft);
  const parsedDateRight = parseDate(dateRight);
  
  if (!parsedDateLeft || !parsedDateRight) {
    return 0;
  }
  
  return compareAsc(parsedDateLeft, parsedDateRight) as DateComparisonResult;
};

/**
 * Converts a date to a Unix timestamp (milliseconds since epoch)
 * @param date - The date to convert
 * @returns Timestamp in milliseconds or null if invalid
 */
export const getTimestampFromDate = (
  date: Date | string | number | null | undefined
): number | null => {
  const parsedDate = parseDate(date);
  return parsedDate ? parsedDate.getTime() : null;
};

/**
 * Converts a Unix timestamp to a Date object
 * @param timestamp - The timestamp in milliseconds
 * @returns Date object or null if invalid
 */
export const getDateFromTimestamp = (
  timestamp: number | null | undefined
): Date | null => {
  if (timestamp === null || timestamp === undefined || typeof timestamp !== 'number') {
    return null;
  }
  
  const date = new Date(timestamp);
  return isValid(date) ? date : null;
};

/**
 * Returns the current date and time
 * @returns Current date and time
 */
export const getNow = (): Date => {
  return new Date();
};

/**
 * Converts a date to ISO string format, safely handling invalid dates
 * @param date - The date to convert
 * @returns ISO string or null if invalid
 */
export const toISOString = (
  date: Date | string | number | null | undefined
): string | null => {
  const parsedDate = parseDate(date);
  return parsedDate ? parsedDate.toISOString() : null;
};

/**
 * Checks if a date has expired (is before current date)
 * @param date - The date to check
 * @returns True if the date is in the past
 */
export const isExpired = (
  date: Date | string | number | null | undefined
): boolean => {
  const parsedDate = parseDate(date);
  if (!parsedDate) {
    return false;
  }
  
  const now = getNow();
  return isBefore(parsedDate, now);
};