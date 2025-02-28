import { DEFAULT_CURRENCY, CURRENCIES } from '../../../backend/shared/src/constants';
import { isValidAmount } from '../../../backend/shared/src/utils/validation';
import { formatDate, formatRelativeTime } from './date';
import { JobType } from '../types/job.types';
import { PaymentStatus } from '../../../backend/shared/src/types/payment.types';

// Global constants
export const DEFAULT_LOCALE = 'en-US';
export const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];
export const BYTES_IN_KB = 1024;
export const BYTES_IN_MB = 1048576;
export const BYTES_IN_GB = 1073741824;
export const TRUNCATION_SUFFIX = '...';
export const PHONE_FORMAT_US = '(XXX) XXX-XXXX';

/**
 * Formats a number as currency with the specified currency code, optimized for mobile display
 * 
 * @param amount - Amount to format
 * @param currencyCode - Currency code (defaults to DEFAULT_CURRENCY)
 * @param locale - Locale for formatting (defaults to DEFAULT_LOCALE)
 * @returns Formatted currency string or empty string if invalid
 */
export function formatCurrency(
  amount: number | null | undefined,
  currencyCode?: string,
  locale?: string
): string {
  if (!isValidAmount(amount)) {
    return '';
  }

  const code = currencyCode || DEFAULT_CURRENCY;
  const localeToUse = locale || DEFAULT_LOCALE;

  return new Intl.NumberFormat(localeToUse, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Formats a number with thousand separators and optional decimal places
 * 
 * @param value - Number to format
 * @param decimalPlaces - Number of decimal places (defaults to 0)
 * @param locale - Locale for formatting (defaults to DEFAULT_LOCALE)
 * @returns Formatted number string or empty string if invalid
 */
export function formatNumber(
  value: number | null | undefined,
  decimalPlaces?: number,
  locale?: string
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }

  const localeToUse = locale || DEFAULT_LOCALE;
  const minimumFractionDigits = decimalPlaces !== undefined ? decimalPlaces : 0;
  const maximumFractionDigits = decimalPlaces !== undefined ? decimalPlaces : 0;

  return new Intl.NumberFormat(localeToUse, {
    minimumFractionDigits,
    maximumFractionDigits
  }).format(value);
}

/**
 * Formats a decimal number as a percentage with specified precision
 * 
 * @param value - Decimal value to format as percentage (0.75 becomes 75%)
 * @param decimalPlaces - Number of decimal places (defaults to 0)
 * @param locale - Locale for formatting (defaults to DEFAULT_LOCALE)
 * @returns Formatted percentage string or empty string if invalid
 */
export function formatPercentage(
  value: number | null | undefined,
  decimalPlaces?: number,
  locale?: string
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }

  const localeToUse = locale || DEFAULT_LOCALE;
  const minimumFractionDigits = decimalPlaces !== undefined ? decimalPlaces : 0;
  const maximumFractionDigits = decimalPlaces !== undefined ? decimalPlaces : 0;

  return new Intl.NumberFormat(localeToUse, {
    style: 'percent',
    minimumFractionDigits,
    maximumFractionDigits
  }).format(value);
}

/**
 * Formats a file size in bytes to a human-readable format for mobile display
 * 
 * @param bytes - Size in bytes
 * @param decimalPlaces - Number of decimal places (defaults to 2 for KB and above, 0 for bytes)
 * @returns Formatted file size string or empty string if invalid
 */
export function formatFileSize(
  bytes: number | null | undefined,
  decimalPlaces?: number
): string {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes < 0) {
    return '';
  }

  if (bytes === 0) {
    return '0 B';
  }

  // Determine the appropriate unit
  const i = Math.floor(Math.log(bytes) / Math.log(BYTES_IN_KB));
  const unit = FILE_SIZE_UNITS[i];

  // Use appropriate decimal places
  const dp = i === 0 ? 0 : (decimalPlaces !== undefined ? decimalPlaces : 2);
  
  // Calculate the value in the appropriate unit
  const value = bytes / Math.pow(BYTES_IN_KB, i);
  
  return `${formatNumber(value, dp)} ${unit}`;
}

/**
 * Truncates text to a specified length with ellipsis, optimized for mobile screens
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @param wordBoundary - Whether to truncate at word boundary if possible
 * @returns Truncated text with ellipsis if needed or original text if shorter than maxLength
 */
export function truncateText(
  text: string | null | undefined,
  maxLength: number,
  wordBoundary?: boolean
): string {
  if (!text) {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  let truncated = text.substring(0, maxLength);
  
  // If wordBoundary is true, try to find the last space before maxLength
  if (wordBoundary) {
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace !== -1) {
      truncated = truncated.substring(0, lastSpace);
    }
  }

  return `${truncated}${TRUNCATION_SUFFIX}`;
}

/**
 * Formats a phone number according to a standard pattern for mobile display
 * 
 * @param phoneNumber - Phone number to format
 * @param format - Format pattern (defaults to US format)
 * @returns Formatted phone number or empty string if invalid
 */
export function formatPhoneNumber(
  phoneNumber: string | null | undefined,
  format?: string
): string {
  if (!phoneNumber) {
    return '';
  }

  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Default to US format
  const formatPattern = format || PHONE_FORMAT_US;
  
  // Apply format for US numbers (10 digits)
  if (cleaned.length === 10 && formatPattern === PHONE_FORMAT_US) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6, 10)}`;
  }
  
  // If the number doesn't match the expected format, return the cleaned version
  return cleaned;
}

/**
 * Formats an address object into a single-line or multi-line string for mobile display
 * 
 * @param address - Address object with optional parts
 * @param singleLine - Whether to format as a single line with commas (true) or multi-line (false)
 * @returns Formatted address string or empty string if invalid
 */
export function formatAddress(
  address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  } | null | undefined,
  singleLine?: boolean
): string {
  if (!address) {
    return '';
  }

  const { street, city, state, postalCode, country } = address;
  
  // Filter out undefined or empty components
  const components: string[] = [];
  
  if (street) {
    components.push(street);
  }
  
  // Combine city, state, and postal code
  const cityLine: string[] = [];
  if (city) {
    cityLine.push(city);
  }
  if (state) {
    cityLine.push(state);
  }
  if (postalCode) {
    cityLine.push(postalCode);
  }
  
  if (cityLine.length > 0) {
    components.push(cityLine.join(', '));
  }
  
  if (country) {
    components.push(country);
  }
  
  if (components.length === 0) {
    return '';
  }
  
  // Join components with commas for single line or newlines for multi-line
  return components.join(singleLine ? ', ' : '\n');
}

/**
 * Formats an array of items into a comma-separated or bullet list for mobile display
 * 
 * @param items - Array of items to format
 * @param style - List style ('comma' or 'bullet', defaults to 'comma')
 * @param conjunction - Conjunction to use for last item in comma style (defaults to 'and')
 * @returns Formatted list string or empty string if invalid
 */
export function formatList(
  items: Array<string> | null | undefined,
  style?: string,
  conjunction?: string
): string {
  if (!items || items.length === 0) {
    return '';
  }

  // Filter out empty items
  const filteredItems = items.filter(item => item !== undefined && item !== null && item !== '');
  
  if (filteredItems.length === 0) {
    return '';
  }
  
  // Format as comma-separated list with conjunction
  if (!style || style === 'comma') {
    const conj = conjunction || 'and';
    
    if (filteredItems.length === 1) {
      return filteredItems[0];
    }
    
    if (filteredItems.length === 2) {
      return `${filteredItems[0]} ${conj} ${filteredItems[1]}`;
    }
    
    const lastItem = filteredItems[filteredItems.length - 1];
    const allButLast = filteredItems.slice(0, -1);
    
    return `${allButLast.join(', ')} ${conj} ${lastItem}`;
  }
  
  // Format as bullet list
  if (style === 'bullet') {
    return filteredItems.map(item => `• ${item}`).join('\n');
  }
  
  // Default to comma-separated without conjunction if style is unknown
  return filteredItems.join(', ');
}

/**
 * Formats job payment information based on job type (hourly rate or budget range) for mobile display
 * 
 * @param job - Job object with type and payment information
 * @param currencyCode - Currency code (defaults to DEFAULT_CURRENCY)
 * @returns Formatted job rate based on job type or empty string if invalid
 */
export function formatJobRate(
  job: {
    type: JobType;
    hourlyRate?: number;
    budget?: number;
    minBudget?: number;
    maxBudget?: number;
  },
  currencyCode?: string
): string {
  if (!job || !job.type) {
    return '';
  }

  const currency = currencyCode || DEFAULT_CURRENCY;
  
  switch (job.type) {
    case JobType.HOURLY:
      if (!isValidAmount(job.hourlyRate)) {
        return '';
      }
      return `${formatCurrency(job.hourlyRate, currency)}/hr`;
      
    case JobType.FIXED_PRICE:
      if (!isValidAmount(job.budget)) {
        return '';
      }
      return formatCurrency(job.budget, currency);
      
    case JobType.MILESTONE_BASED:
      // For milestone-based jobs, show budget range if available
      return formatBudgetRange(job.minBudget, job.maxBudget, currency);
      
    default:
      return '';
  }
}

/**
 * Formats first and last name components into a full name with proper capitalization for mobile display
 * 
 * @param firstName - First name
 * @param lastName - Last name
 * @param lastNameFirst - Whether to format as "lastName, firstName" (true) or "firstName lastName" (false)
 * @returns Formatted name string or empty string if both inputs are invalid
 */
export function formatName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  lastNameFirst?: boolean
): string {
  // If both names are empty, return empty string
  if (!firstName && !lastName) {
    return '';
  }
  
  // Capitalize first letter of each name part if present
  const formattedFirstName = firstName 
    ? firstName.charAt(0).toUpperCase() + firstName.slice(1) 
    : '';
    
  const formattedLastName = lastName 
    ? lastName.charAt(0).toUpperCase() + lastName.slice(1) 
    : '';
  
  // Handle case where only one name component is available
  if (!formattedFirstName) {
    return formattedLastName;
  }
  
  if (!formattedLastName) {
    return formattedFirstName;
  }
  
  // Format according to lastNameFirst preference
  if (lastNameFirst) {
    return `${formattedLastName}, ${formattedFirstName}`;
  }
  
  return `${formattedFirstName} ${formattedLastName}`;
}

/**
 * Formats a numeric skill level (0-100) as a descriptive text label for mobile display
 * 
 * @param level - Numeric skill level from 0-100
 * @returns Skill level label (Beginner, Intermediate, Advanced, Expert, Master) or empty string if invalid
 */
export function formatSkillLevel(
  level: number | null | undefined
): string {
  if (level === null || level === undefined || isNaN(level) || level < 0 || level > 100) {
    return '';
  }
  
  if (level <= 20) {
    return 'Beginner';
  } else if (level <= 40) {
    return 'Intermediate';
  } else if (level <= 60) {
    return 'Advanced';
  } else if (level <= 80) {
    return 'Expert';
  } else {
    return 'Master';
  }
}

/**
 * Formats a number in a compact form for space-constrained mobile UI elements
 * 
 * @param value - Number to format
 * @param locale - Locale for formatting (defaults to DEFAULT_LOCALE)
 * @returns Compact number format (e.g., '1.2K', '3.4M') or empty string if invalid
 */
export function formatCompactNumber(
  value: number | null | undefined,
  locale?: string
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }

  const localeToUse = locale || DEFAULT_LOCALE;
  
  return new Intl.NumberFormat(localeToUse, {
    notation: 'compact',
    compactDisplay: 'short'
  }).format(value);
}

/**
 * Converts payment status enum values to human-readable text for mobile display
 * 
 * @param status - Payment status enum value
 * @returns Human-readable payment status or empty string if invalid
 */
export function formatPaymentStatusText(
  status: PaymentStatus | null | undefined
): string {
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
}

/**
 * Converts job type enum values to human-readable text for mobile display
 * 
 * @param type - Job type enum value
 * @returns Human-readable job type or empty string if invalid
 */
export function formatJobTypeText(
  type: JobType | null | undefined
): string {
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
}

/**
 * Formats a distance value with appropriate units for mobile display
 * 
 * @param distance - Distance value to format
 * @param unit - Distance unit (defaults to 'mi')
 * @param decimalPlaces - Number of decimal places (defaults to 1)
 * @returns Formatted distance with units or empty string if invalid
 */
export function formatDistance(
  distance: number | null | undefined,
  unit?: string,
  decimalPlaces?: number
): string {
  if (distance === null || distance === undefined || isNaN(distance)) {
    return '';
  }

  const unitToUse = unit || 'mi';
  const dp = decimalPlaces !== undefined ? decimalPlaces : 1;
  
  return `${formatNumber(distance, dp)} ${unitToUse}`;
}

/**
 * Formats a duration in minutes into hours and minutes for mobile display
 * 
 * @param minutes - Duration in minutes
 * @returns Formatted duration (e.g., '2h 30m') or empty string if invalid
 */
export function formatDuration(
  minutes: number | null | undefined
): string {
  if (minutes === null || minutes === undefined || isNaN(minutes) || minutes < 0) {
    return '';
  }

  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  
  if (hours === 0) {
    return `${mins}m`;
  }
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}m`;
}

/**
 * Formats a budget range for job listings on mobile display
 * 
 * @param minBudget - Minimum budget
 * @param maxBudget - Maximum budget
 * @param currencyCode - Currency code (defaults to DEFAULT_CURRENCY)
 * @returns Formatted budget range (e.g., '$1,000 - $5,000') or empty string if both inputs invalid
 */
export function formatBudgetRange(
  minBudget: number | null | undefined,
  maxBudget: number | null | undefined,
  currencyCode?: string
): string {
  const hasMinBudget = isValidAmount(minBudget);
  const hasMaxBudget = isValidAmount(maxBudget);
  
  if (!hasMinBudget && !hasMaxBudget) {
    return '';
  }
  
  const currency = currencyCode || DEFAULT_CURRENCY;
  
  if (hasMinBudget && hasMaxBudget) {
    return `${formatCurrency(minBudget, currency)} - ${formatCurrency(maxBudget, currency)}`;
  }
  
  if (hasMinBudget) {
    return `From ${formatCurrency(minBudget, currency)}`;
  }
  
  return `Up to ${formatCurrency(maxBudget, currency)}`;
}