/**
 * Utility module providing standardized formatting functions for various data types
 * across the AI Talent Marketplace web application.
 * @packageDocumentation
 */

import { formatDate, formatRelativeTime } from './date';
import { JobType } from '../types/job';
import { PaymentStatus } from '../../backend/shared/src/types/payment.types';
import numeral from 'numeral'; // ^2.0.6

/**
 * Default currency code used throughout the application when not explicitly specified
 */
export const DEFAULT_CURRENCY = 'USD';

/**
 * Default locale used for locale-specific formatting when not explicitly specified
 */
export const DEFAULT_LOCALE = 'en-US';

/**
 * Units for file size formatting in ascending order
 */
const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/**
 * Suffix used when truncating text
 */
const TRUNCATION_SUFFIX = '...';

/**
 * Formats a number as currency with the specified currency code
 * @param amount - The amount to format
 * @param currencyCode - The ISO currency code (defaults to USD)
 * @returns Formatted currency string or empty string if invalid
 */
export const formatCurrency = (
  amount: number | null | undefined,
  currencyCode: string = DEFAULT_CURRENCY
): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '';
  }

  const formatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return formatter.format(amount);
};

/**
 * Formats job payment information based on job type (hourly rate or budget range)
 * @param job - Object containing job type and payment information
 * @param currencyCode - The ISO currency code (defaults to USD)
 * @returns Formatted job rate string based on job type
 */
export const formatJobRate = (
  job: {
    type: JobType;
    hourlyRate?: number;
    budget?: number;
    minBudget?: number;
    maxBudget?: number;
  },
  currencyCode: string = DEFAULT_CURRENCY
): string => {
  if (!job || !job.type) {
    return '';
  }

  switch (job.type) {
    case JobType.HOURLY:
      if (!job.hourlyRate) return '';
      return `${formatCurrency(job.hourlyRate, currencyCode)}/hr`;

    case JobType.FIXED_PRICE:
      if (!job.budget) return '';
      return formatCurrency(job.budget, currencyCode);

    case JobType.MILESTONE_BASED:
      if (job.budget) {
        return formatCurrency(job.budget, currencyCode);
      } else if (job.minBudget && job.maxBudget) {
        return `${formatCurrency(job.minBudget, currencyCode)} - ${formatCurrency(job.maxBudget, currencyCode)}`;
      } else if (job.minBudget) {
        return `From ${formatCurrency(job.minBudget, currencyCode)}`;
      } else if (job.maxBudget) {
        return `Up to ${formatCurrency(job.maxBudget, currencyCode)}`;
      }
      return '';

    default:
      return '';
  }
};

/**
 * Formats a decimal number as a percentage with specified precision
 * @param value - The decimal value to format as percentage (e.g., 0.75 for 75%)
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
  const formatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  });

  return `${formatter.format(percentage)}%`;
};

/**
 * Formats a number with thousand separators and optional decimal places
 * @param value - The number to format
 * @param precision - Number of decimal places (defaults to 0)
 * @returns Formatted number string or empty string if invalid
 */
export const formatNumber = (
  value: number | null | undefined,
  precision: number = 0
): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }

  const formatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  });

  return formatter.format(value);
};

/**
 * Formats a file size in bytes to a human-readable format with appropriate units
 * @param bytes - The file size in bytes
 * @returns Human-readable file size (e.g., '5.2 MB')
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes < 0) {
    return '';
  }

  if (bytes === 0) return '0 B';

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  const unit = FILE_SIZE_UNITS[i];

  // Use 0 decimal places for bytes, 2 for all others
  const precision = i === 0 ? 0 : 2;
  return `${size.toFixed(precision)} ${unit}`;
};

/**
 * Truncates text to specified length with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @param wordBoundary - Whether to truncate at word boundaries (defaults to true)
 * @returns Truncated text with ellipsis or original text if shorter than maxLength
 */
export const truncateText = (
  text: string | null | undefined,
  maxLength: number,
  wordBoundary: boolean = true
): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;

  let truncated = text.substring(0, maxLength - TRUNCATION_SUFFIX.length);

  if (wordBoundary) {
    // Find the last space before the truncation point
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 0) {
      truncated = truncated.substring(0, lastSpace);
    }
  }

  return truncated + TRUNCATION_SUFFIX;
};

/**
 * Formats first and last name components into a full name
 * @param firstName - The first name
 * @param lastName - The last name
 * @returns Formatted full name or empty string if both inputs are invalid
 */
export const formatName = (
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string => {
  if (!firstName && !lastName) return '';

  if (!firstName) return lastName as string;
  if (!lastName) return firstName as string;

  return `${firstName} ${lastName}`;
};

/**
 * Formats address components into a single formatted address string
 * @param address - Object containing address components
 * @returns Formatted address string
 */
export const formatAddress = (address: {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}): string => {
  if (!address) return '';

  const addressLines: string[] = [];

  // Street address
  if (address.street) {
    addressLines.push(address.street);
  }

  // City, State, Postal Code
  const cityStatePostal: string[] = [];
  if (address.city) cityStatePostal.push(address.city);
  if (address.state) cityStatePostal.push(address.state);
  if (address.postalCode) cityStatePostal.push(address.postalCode);

  if (cityStatePostal.length > 0) {
    addressLines.push(cityStatePostal.join(', '));
  }

  // Country
  if (address.country) {
    addressLines.push(address.country);
  }

  return addressLines.filter(Boolean).join('\n');
};

/**
 * Converts payment status enum values to human-readable text
 * @param status - The payment status enum value
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
 * Converts job type enum values to human-readable text
 * @param type - The job type enum value
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
 * Formats a numeric skill level (1-5) as a descriptive text label
 * @param level - The skill level from 1-5
 * @returns Skill level label (Beginner, Intermediate, Advanced, Expert, Master)
 */
export const formatSkillLevel = (
  level: number | null | undefined
): string => {
  if (level === null || level === undefined || isNaN(level)) {
    return '';
  }

  switch (Math.round(level)) {
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
 * Formats a phone number for display based on locale
 * @param phone - The phone number to format
 * @param locale - The locale to use for formatting (defaults to DEFAULT_LOCALE)
 * @returns Formatted phone number or empty string if invalid
 */
export const formatPhone = (
  phone: string | null | undefined,
  locale: string = DEFAULT_LOCALE
): string => {
  if (!phone) return '';

  // Remove non-numeric characters for processing
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 0) return '';

  // US phone format: (XXX) XXX-XXXX
  if (locale.startsWith('en-US') && digits.length === 10) {
    return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6, 10)}`;
  }

  // UK phone format: +44 XXXX XXX XXX
  if (locale.startsWith('en-GB') && digits.length === 11 && digits.startsWith('44')) {
    return `+44 ${digits.substring(2, 6)} ${digits.substring(6, 9)} ${digits.substring(9)}`;
  }

  // Generic international format with plus
  if (digits.length > 6) {
    // Group by 3 digits with spaces
    const groups = [];
    for (let i = 0; i < digits.length; i += 3) {
      groups.push(digits.substring(i, Math.min(i + 3, digits.length)));
    }
    return `+${groups.join(' ')}`;
  }

  // If no specific formatting applies, return original with plus
  return `+${digits}`;
};

export {
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE
};