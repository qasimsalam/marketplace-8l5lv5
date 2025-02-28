import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'; // ^29.6.1
import {
  isRequired, isEmail, isPassword, isURL, isPhone,
  isNumberInRange, isMinLength, isMaxLength, isMatch,
  isPositiveNumber, isValidCurrency, isDateInFuture
} from '../../src/utils/validation';
import { isValidDate } from '../../src/utils/date';

// Mock date for testing isDateInFuture
const mockDate = new Date('2023-01-01');

describe('Validation Utility Functions', () => {
  // isRequired tests
  describe('isRequired', () => {
    test('should return true for non-empty string values', () => {
      expect(isRequired('test')).toBe(true);
      expect(isRequired('0')).toBe(true);
      expect(isRequired(' test ')).toBe(true);
    });

    test('should return false for undefined, null, and empty strings', () => {
      expect(isRequired(undefined)).toBe(false);
      expect(isRequired(null)).toBe(false);
      expect(isRequired('')).toBe(false);
      expect(isRequired('   ')).toBe(false);
    });

    test('should return true for non-string values that exist', () => {
      expect(isRequired(0)).toBe(true);
      expect(isRequired(false)).toBe(true);
      expect(isRequired([])).toBe(true);
      expect(isRequired({})).toBe(true);
      expect(isRequired(42)).toBe(true);
    });
  });

  // isEmail tests
  describe('isEmail', () => {
    test('should return true for valid email addresses', () => {
      expect(isEmail('test@example.com')).toBe(true);
      expect(isEmail('user.name+tag@example.co.uk')).toBe(true);
      expect(isEmail('user-name@domain.com')).toBe(true);
      expect(isEmail('user123@domain.app')).toBe(true);
    });

    test('should return false for invalid email addresses', () => {
      expect(isEmail('test@')).toBe(false);
      expect(isEmail('test@domain')).toBe(false);
      expect(isEmail('@domain.com')).toBe(false);
      expect(isEmail('test.domain.com')).toBe(false);
      expect(isEmail('test@domain..com')).toBe(false);
    });

    test('should return false for undefined, null, and empty strings', () => {
      expect(isEmail(undefined as any)).toBe(false);
      expect(isEmail(null as any)).toBe(false);
      expect(isEmail('')).toBe(false);
      expect(isEmail('   ')).toBe(false);
    });
  });

  // isPassword tests
  describe('isPassword', () => {
    test('should return true for valid passwords meeting all requirements', () => {
      expect(isPassword('Password1!')).toBe(true);
      expect(isPassword('StrongP@ss123')).toBe(true);
      expect(isPassword('C0mplex&Password')).toBe(true);
    });

    test('should return false for passwords not meeting length requirement', () => {
      expect(isPassword('Pass1!')).toBe(false);
      expect(isPassword('Abc12!')).toBe(false);
    });

    test('should return false for passwords missing uppercase letter', () => {
      expect(isPassword('password1!')).toBe(false);
    });

    test('should return false for passwords missing lowercase letter', () => {
      expect(isPassword('PASSWORD1!')).toBe(false);
    });

    test('should return false for passwords missing number', () => {
      expect(isPassword('Password!')).toBe(false);
    });

    test('should return false for passwords missing special character', () => {
      expect(isPassword('Password123')).toBe(false);
    });

    test('should return false for undefined, null, and empty strings', () => {
      expect(isPassword(undefined as any)).toBe(false);
      expect(isPassword(null as any)).toBe(false);
      expect(isPassword('')).toBe(false);
    });
  });

  // isURL tests
  describe('isURL', () => {
    test('should return true for valid URLs with protocols', () => {
      expect(isURL('https://example.com')).toBe(true);
      expect(isURL('http://example.co.uk/path')).toBe(true);
      expect(isURL('https://sub.domain.org/path?query=value')).toBe(true);
    });

    test('should return true for valid URLs without protocols', () => {
      expect(isURL('example.com')).toBe(true);
      expect(isURL('sub.domain.co.uk/path')).toBe(true);
    });

    test('should return false for invalid URLs', () => {
      expect(isURL('example')).toBe(false);
      expect(isURL('http://')).toBe(false);
      expect(isURL('http://.')).toBe(false);
      expect(isURL('example..com')).toBe(false);
    });

    test('should return false for undefined, null, and empty strings', () => {
      expect(isURL(undefined as any)).toBe(false);
      expect(isURL(null as any)).toBe(false);
      expect(isURL('')).toBe(false);
    });
  });

  // isPhone tests
  describe('isPhone', () => {
    test('should return true for valid phone numbers in different formats', () => {
      expect(isPhone('1234567890')).toBe(true);
      expect(isPhone('+1234567890')).toBe(true);
      expect(isPhone('+12345678901')).toBe(true);
      expect(isPhone('123-456-7890')).toBe(true); // Note: This would pass with validator but not with regex alone
    });

    test('should return false for invalid phone numbers', () => {
      expect(isPhone('123456')).toBe(false); // Too short
      expect(isPhone('abcdefghij')).toBe(false); // Not numbers
      expect(isPhone('12345678901234567890')).toBe(false); // Too long
    });

    test('should return false for undefined, null, and empty strings', () => {
      expect(isPhone(undefined as any)).toBe(false);
      expect(isPhone(null as any)).toBe(false);
      expect(isPhone('')).toBe(false);
    });
  });

  // isNumberInRange tests
  describe('isNumberInRange', () => {
    test('should return true for numbers within the specified range', () => {
      expect(isNumberInRange(5, 1, 10)).toBe(true);
      expect(isNumberInRange(1, 1, 10)).toBe(true); // Min boundary
      expect(isNumberInRange(10, 1, 10)).toBe(true); // Max boundary
      expect(isNumberInRange(-5, -10, 0)).toBe(true); // Negative range
    });

    test('should return false for numbers outside the range', () => {
      expect(isNumberInRange(0, 1, 10)).toBe(false); // Below min
      expect(isNumberInRange(11, 1, 10)).toBe(false); // Above max
      expect(isNumberInRange(-11, -10, 0)).toBe(false); // Below negative min
    });

    test('should return false for null, undefined, NaN', () => {
      expect(isNumberInRange(NaN, 1, 10)).toBe(false);
      expect(isNumberInRange(undefined as any, 1, 10)).toBe(false);
      expect(isNumberInRange(null as any, 1, 10)).toBe(false);
    });
  });

  // isMinLength tests
  describe('isMinLength', () => {
    test('should return true for strings with length >= minLength', () => {
      expect(isMinLength('test', 4)).toBe(true); // Exact length
      expect(isMinLength('testing', 4)).toBe(true); // Greater than min
      expect(isMinLength('test', 1)).toBe(true); // Much greater than min
    });

    test('should return false for strings with length < minLength', () => {
      expect(isMinLength('test', 5)).toBe(false);
      expect(isMinLength('', 1)).toBe(false);
    });

    test('should return false for null, undefined, non-strings', () => {
      expect(isMinLength(undefined as any, 3)).toBe(false);
      expect(isMinLength(null as any, 3)).toBe(false);
      expect(isMinLength(123 as any, 3)).toBe(false);
      expect(isMinLength(true as any, 3)).toBe(false);
    });
  });

  // isMaxLength tests
  describe('isMaxLength', () => {
    test('should return true for strings with length <= maxLength', () => {
      expect(isMaxLength('test', 4)).toBe(true); // Exact length
      expect(isMaxLength('test', 5)).toBe(true); // Less than max
      expect(isMaxLength('', 5)).toBe(true); // Empty string
    });

    test('should return false for strings with length > maxLength', () => {
      expect(isMaxLength('testing', 5)).toBe(false);
      expect(isMaxLength('test', 3)).toBe(false);
    });

    test('should return false for null, undefined, non-strings', () => {
      expect(isMaxLength(undefined as any, 3)).toBe(false);
      expect(isMaxLength(null as any, 3)).toBe(false);
      expect(isMaxLength(123 as any, 3)).toBe(false);
      expect(isMaxLength(true as any, 3)).toBe(false);
    });
  });

  // isMatch tests
  describe('isMatch', () => {
    test('should return true for matching values of different types', () => {
      expect(isMatch('test', 'test')).toBe(true); // Strings
      expect(isMatch(123, 123)).toBe(true); // Numbers
      expect(isMatch(true, true)).toBe(true); // Booleans
      expect(isMatch(null, null)).toBe(true); // Null
      expect(isMatch(undefined, undefined)).toBe(true); // Undefined
    });

    test('should return false for non-matching values', () => {
      expect(isMatch('test', 'Test')).toBe(false); // Case sensitive
      expect(isMatch(123, 1234)).toBe(false); // Different numbers
      expect(isMatch(true, false)).toBe(false); // Different booleans
      expect(isMatch('123', 123)).toBe(false); // String vs number
      expect(isMatch(null, undefined)).toBe(false); // Null vs undefined
    });
  });

  // isPositiveNumber tests
  describe('isPositiveNumber', () => {
    test('should return true for numbers > 0', () => {
      expect(isPositiveNumber(1)).toBe(true);
      expect(isPositiveNumber(0.5)).toBe(true);
      expect(isPositiveNumber(Number.MAX_VALUE)).toBe(true);
    });

    test('should return false for 0, negative numbers, and non-numbers', () => {
      expect(isPositiveNumber(0)).toBe(false);
      expect(isPositiveNumber(-1)).toBe(false);
      expect(isPositiveNumber(-0.5)).toBe(false);
    });

    test('should return false for null, undefined, NaN', () => {
      expect(isPositiveNumber(NaN)).toBe(false);
      expect(isPositiveNumber(undefined as any)).toBe(false);
      expect(isPositiveNumber(null as any)).toBe(false);
      expect(isPositiveNumber('5' as any)).toBe(false);
    });
  });

  // isValidCurrency tests
  describe('isValidCurrency', () => {
    test('should return true for positive numbers with 0-2 decimal places', () => {
      expect(isValidCurrency(100)).toBe(true); // Integer
      expect(isValidCurrency(100.5)).toBe(true); // 1 decimal place
      expect(isValidCurrency(100.55)).toBe(true); // 2 decimal places
      expect(isValidCurrency(0.01)).toBe(true); // Small value
    });

    test('should return false for negative numbers', () => {
      expect(isValidCurrency(-100)).toBe(false);
      expect(isValidCurrency(-0.5)).toBe(false);
    });

    test('should return false for numbers with more than 2 decimal places', () => {
      expect(isValidCurrency(100.555)).toBe(false);
      expect(isValidCurrency(0.001)).toBe(false);
    });

    test('should return false for 0, null, undefined, NaN', () => {
      expect(isValidCurrency(0)).toBe(false);
      expect(isValidCurrency(NaN)).toBe(false);
      expect(isValidCurrency(undefined as any)).toBe(false);
      expect(isValidCurrency(null as any)).toBe(false);
    });
  });

  // isDateInFuture tests
  describe('isDateInFuture', () => {
    let realDate: DateConstructor;
    
    beforeEach(() => {
      // Mock the current date to '2023-01-01'
      realDate = global.Date;
      // @ts-ignore - we're replacing the Date constructor
      global.Date = jest.fn(() => mockDate) as any;
      global.Date.UTC = realDate.UTC;
      global.Date.parse = realDate.parse;
      global.Date.now = realDate.now;
    });

    afterEach(() => {
      // Restore the original Date constructor
      global.Date = realDate;
    });

    test('should return true for dates in the future', () => {
      const futureDate = new Date('2023-01-02'); // 1 day in future
      const farFutureDate = new Date('2024-01-01'); // 1 year in future
      
      expect(isDateInFuture(futureDate)).toBe(true);
      expect(isDateInFuture(farFutureDate)).toBe(true);
    });

    test('should return false for dates in the past', () => {
      const pastDate = new Date('2022-12-31'); // 1 day in past
      const farPastDate = new Date('2020-01-01'); // years in past
      
      expect(isDateInFuture(pastDate)).toBe(false);
      expect(isDateInFuture(farPastDate)).toBe(false);
    });

    test('should return false for the current date', () => {
      const currentDate = new Date('2023-01-01'); // Same as mocked current date
      
      expect(isDateInFuture(currentDate)).toBe(false);
    });

    test('should return false for null, undefined, invalid dates', () => {
      const invalidDate = new Date('invalid-date');
      
      expect(isDateInFuture(invalidDate)).toBe(false);
      expect(isDateInFuture(undefined as any)).toBe(false);
      expect(isDateInFuture(null as any)).toBe(false);
    });
  });
});