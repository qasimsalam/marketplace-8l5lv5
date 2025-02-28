/**
 * Utility module providing standardized formatting functions for various data types
 * across the AI Talent Marketplace Android application. This file centralizes
 * formatting logic to ensure consistent display throughout the mobile app.
 */

// Import date formatting utilities
import { 
  formatDate,
  formatRelativeTime,
  formatRelativeDateForMobile 
} from './date';

// Import type enums
import { 
  JobType,
  JobStatus 
} from '../types/job.types';

// Import payment status enum
import { 
  PaymentStatus 
} from '../../../backend/shared/src/types/payment.types';

// Third-party libraries
import numeral from 'numeral'; // version ^2.0.6
import { I18nManager } from 'react-native'; // version ^0.72.x

/**
 * Global constants
 */
export const DEFAULT_CURRENCY = 'USD';
export const DEFAULT_LOCALE = 'en-US';
export const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];
export const TRUNCATION_SUFFIX = '...';
export const SCREEN_BREAKPOINT_WIDTH = 375;

/**
 * Formats a number as currency with the specified currency code, optimized for mobile display
 * 
 * @param amount - Amount to format
 * @param currencyCode - Currency code (defaults to USD)
 * @returns Formatted currency string or empty string if invalid
 */
export const formatCurrency = (
  amount: number | null | undefined,
  currencyCode: string = DEFAULT_CURRENCY
): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '';
  }

  const isRTL = I18nManager.isRTL;
  let formatted = numeral(amount).format('0,0.00');
  
  // Apply currency symbol based on currency code and RTL setting
  switch (currencyCode) {
    case 'USD':
      formatted = isRTL ? `${formatted} $` : `$${formatted}`;
      break;
    case 'EUR':
      formatted = isRTL ? `${formatted} €` : `€${formatted}`;
      break;
    case 'GBP':
      formatted = isRTL ? `${formatted} £` : `£${formatted}`;
      break;
    default:
      formatted = isRTL ? `${formatted} ${currencyCode}` : `${currencyCode} ${formatted}`;
  }

  return formatted;
};

/**
 * Formats job payment information based on job type (hourly rate or budget range)
 * for mobile display
 * 
 * @param job - Object containing job type and payment information
 * @param currencyCode - Currency code (defaults to USD)
 * @returns Formatted job rate string based on job type
 */
export const formatJobRate = (
  job: { 
    type: JobType, 
    hourlyRate?: number, 
    budget?: number, 
    minBudget?: number, 
    maxBudget?: number 
  },
  currencyCode: string = DEFAULT_CURRENCY
): string => {
  if (!job || !job.type) {
    return '';
  }

  switch (job.type) {
    case JobType.HOURLY:
      if (job.hourlyRate) {
        return `${formatCurrency(job.hourlyRate, currencyCode)}/hr`;
      }
      return '';
      
    case JobType.FIXED_PRICE:
      if (job.budget) {
        return formatCurrency(job.budget, currencyCode);
      }
      return '';
      
    case JobType.MILESTONE_BASED:
    default:
      if (job.minBudget && job.maxBudget) {
        return `${formatCurrency(job.minBudget, currencyCode)} - ${formatCurrency(job.maxBudget, currencyCode)}`;
      } else if (job.budget) {
        return formatCurrency(job.budget, currencyCode);
      }
      return '';
  }
};

/**
 * Formats a decimal number as a percentage with specified precision
 * 
 * @param value - Value to format as percentage (0.1 = 10%)
 * @param precision - Number of decimal places (defaults to 0)
 * @returns Formatted percentage string or empty string if invalid
 */
export const formatPercentage = (
  value: number | null | undefined,
  precision: number = 0
): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }

  const percentage = value * 100;
  const format = `0,0${precision > 0 ? '.' + '0'.repeat(precision) : ''}`;
  return `${numeral(percentage).format(format)}%`;
};

/**
 * Formats a number with thousand separators and optional decimal places,
 * optimized for mobile screens
 * 
 * @param value - Number to format
 * @param precision - Number of decimal places (defaults to 0)
 * @param compactNotation - Whether to use compact form for large numbers (defaults to false)
 * @returns Formatted number string or empty string if invalid
 */
export const formatNumber = (
  value: number | null | undefined,
  precision: number = 0,
  compactNotation: boolean = false
): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }

  if (compactNotation) {
    return formatCompactNumber(value);
  }

  const format = `0,0${precision > 0 ? '.' + '0'.repeat(precision) : ''}`;
  return numeral(value).format(format);
};

/**
 * Formats a number in compact notation for mobile displays (K for thousands, M for millions)
 * 
 * @param value - Number to format
 * @returns Compactly formatted number (e.g., 1.5K, 2.6M) or empty string if invalid
 */
export const formatCompactNumber = (
  value: number | null | undefined
): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }

  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  
  return formatNumber(value, 0);
};

/**
 * Formats a file size in bytes to a human-readable format with appropriate units
 * 
 * @param bytes - Size in bytes
 * @returns Human-readable file size (e.g., '5.2 MB')
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes < 0) {
    return '';
  }

  if (bytes === 0) return '0 B';

  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(i > 0 ? 2 : 0));

  return `${size} ${FILE_SIZE_UNITS[i]}`;
};

/**
 * Truncates text to specified length with ellipsis, with mobile-specific optimizations
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @param wordBoundary - Whether to truncate at word boundaries (defaults to true)
 * @returns Truncated text with ellipsis or original text if shorter than maxLength
 */
export const truncateText = (
  text: string | null | undefined,
  maxLength: number,
  wordBoundary: boolean = true
): string => {
  if (!text) {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  if (wordBoundary) {
    const truncated = text.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > 0) {
      return truncated.substring(0, lastSpaceIndex) + TRUNCATION_SUFFIX;
    }
  }
  
  return text.substring(0, maxLength) + TRUNCATION_SUFFIX;
};

/**
 * Truncates text based on device width and specified length,
 * with Android-specific optimizations
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length for larger screens
 * @param mobileMaxLength - Maximum length for mobile screens
 * @returns Truncated text optimized for mobile display
 */
export const truncateTextForMobile = (
  text: string | null | undefined,
  maxLength: number,
  mobileMaxLength: number
): string => {
  if (!text) {
    return '';
  }

  // This is a simplified approach. In a real app, you would get the screen width
  // from React Native's Dimensions API or through a context
  const isSmallScreen = true; // Assuming we're always on a small screen for Android

  const appropriateLength = isSmallScreen ? mobileMaxLength : maxLength;
  return truncateText(text, appropriateLength);
};

/**
 * Formats first and last name components into a full name
 * 
 * @param firstName - First name
 * @param lastName - Last name
 * @returns Formatted full name or empty string if both inputs are invalid
 */
export const formatName = (
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string => {
  const first = firstName || '';
  const last = lastName || '';
  
  if (!first && !last) {
    return '';
  }
  
  if (!first) {
    return last;
  }
  
  if (!last) {
    return first;
  }
  
  return `${first} ${last}`;
};

/**
 * Formats first and last name into initials for avatar displays on mobile
 * 
 * @param firstName - First name
 * @param lastName - Last name
 * @returns Formatted initials (1-2 characters) or empty string if invalid
 */
export const formatInitials = (
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string => {
  const first = firstName || '';
  const last = lastName || '';
  
  if (!first && !last) {
    return '';
  }
  
  const firstInitial = first ? first.charAt(0) : '';
  const lastInitial = last ? last.charAt(0) : '';
  
  return (firstInitial + lastInitial).toUpperCase();
};

/**
 * Formats address components into a single formatted address string,
 * optimized for mobile display
 * 
 * @param address - Address components object
 * @returns Formatted address string
 */
export const formatAddress = (
  address: {
    street?: string,
    city?: string,
    state?: string,
    postalCode?: string,
    country?: string
  }
): string => {
  if (!address) {
    return '';
  }
  
  const { street, city, state, postalCode, country } = address;
  
  const line1 = street || '';
  const line2 = [city, state, postalCode].filter(Boolean).join(', ');
  const line3 = country || '';
  
  return [line1, line2, line3].filter(Boolean).join('\n');
};

/**
 * Converts payment status enum values to human-readable text for mobile display
 * 
 * @param status - Payment status enum value
 * @returns Human-readable payment status or empty string if invalid
 */
export const formatPaymentStatusText = (
  status: PaymentStatus | null | undefined
): string => {
  if (status === null || status === undefined) {
    return '';
  }
  
  switch (status) {
    case PaymentStatus.PENDING:
      return 'Pending';
    case PaymentStatus.PROCESSING:
      return 'Processing';
    case PaymentStatus.COMPLETED:
      return 'Completed';
    case PaymentStatus.FAILED:
      return 'Failed';
    case PaymentStatus.CANCELLED:
      return 'Cancelled';
    case PaymentStatus.REFUNDED:
      return 'Refunded';
    case PaymentStatus.HELD_IN_ESCROW:
      return 'Held in Escrow';
    case PaymentStatus.RELEASED_FROM_ESCROW:
      return 'Released from Escrow';
    default:
      return '';
  }
};

/**
 * Converts job status enum values to human-readable text for mobile display
 * 
 * @param status - Job status enum value
 * @returns Human-readable job status or empty string if invalid
 */
export const formatJobStatusText = (
  status: JobStatus | null | undefined
): string => {
  if (status === null || status === undefined) {
    return '';
  }
  
  switch (status) {
    case JobStatus.DRAFT:
      return 'Draft';
    case JobStatus.OPEN:
      return 'Open';
    case JobStatus.IN_PROGRESS:
      return 'In Progress';
    case JobStatus.COMPLETED:
      return 'Completed';
    case JobStatus.CANCELLED:
      return 'Cancelled';
    case JobStatus.ON_HOLD:
      return 'On Hold';
    default:
      return '';
  }
};

/**
 * Converts job type enum values to human-readable text for mobile display
 * 
 * @param type - Job type enum value
 * @returns Human-readable job type or empty string if invalid
 */
export const formatJobTypeText = (
  type: JobType | null | undefined
): string => {
  if (type === null || type === undefined) {
    return '';
  }
  
  switch (type) {
    case JobType.FIXED_PRICE:
      return 'Fixed Price';
    case JobType.HOURLY:
      return 'Hourly Rate';
    case JobType.MILESTONE_BASED:
      return 'Milestone Based';
    default:
      return '';
  }
};

/**
 * Formats a numeric skill level (1-5) as a descriptive text label for mobile display
 * 
 * @param level - Skill level (1-5)
 * @returns Skill level label (Beginner, Intermediate, Advanced, Expert, Master)
 */
export const formatSkillLevel = (
  level: number | null | undefined
): string => {
  if (level === null || level === undefined || level < 1 || level > 5) {
    return '';
  }
  
  switch (level) {
    case 1:
      return 'Beginner';
    case 2:
      return 'Intermediate';
    case 3:
      return 'Advanced';
    case 4:
      return 'Expert';
    case 5:
      return 'Master';
    default:
      return '';
  }
};

/**
 * Formats a numeric skill level (1-5) as a shorter text label for space-constrained mobile displays
 * 
 * @param level - Skill level (1-5)
 * @returns Compact skill level label (Beg, Int, Adv, Exp, Mst)
 */
export const formatSkillLevelCompact = (
  level: number | null | undefined
): string => {
  if (level === null || level === undefined || level < 1 || level > 5) {
    return '';
  }
  
  switch (level) {
    case 1:
      return 'Beg';
    case 2:
      return 'Int';
    case 3:
      return 'Adv';
    case 4:
      return 'Exp';
    case 5:
      return 'Mst';
    default:
      return '';
  }
};

/**
 * Formats a phone number for display on Android devices based on locale
 * 
 * @param phone - Phone number to format
 * @param locale - Locale for formatting (defaults to DEFAULT_LOCALE)
 * @returns Formatted phone number or empty string if invalid
 */
export const formatPhone = (
  phone: string | null | undefined,
  locale: string = DEFAULT_LOCALE
): string => {
  if (!phone) {
    return '';
  }
  
  // Strip non-numeric characters for processing
  const digits = phone.replace(/\D/g, '');
  
  if (!digits || digits.length < 7) {
    return phone; // Return original if too few digits
  }
  
  // Format based on locale
  if (locale.startsWith('en-US') || locale === 'en-CA') {
    if (digits.length === 10) {
      return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
    } else if (digits.length === 11 && digits.charAt(0) === '1') {
      return `1 (${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7)}`;
    }
  } else if (locale.startsWith('en-GB')) {
    if (digits.length === 11) {
      return `${digits.substring(0, 5)} ${digits.substring(5, 8)} ${digits.substring(8)}`;
    }
  }
  
  // Default formatting for other locales - groups of 3-4 digits
  if (digits.length <= 7) {
    return `${digits.substring(0, 3)} ${digits.substring(3)}`;
  } else {
    // Group into chunks of 3 or 4 digits for readability
    const groups = [];
    let remaining = digits;
    
    while (remaining.length > 0) {
      const chunkSize = remaining.length > 4 ? 3 : remaining.length;
      groups.push(remaining.substring(0, chunkSize));
      remaining = remaining.substring(chunkSize);
    }
    
    return groups.join(' ');
  }
};