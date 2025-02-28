import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as validationUtils from '../../src/utils/validation';
import { isDateInFuture, isDateInPast } from '../../src/utils/date';
import { LoginFormValues, RegisterFormValues } from '../../src/types/auth.types';

// Mock date for consistent testing of date-related functions
let mockDate: Date;
// Mock file for file validation tests
let mockFile: { name: string; size: number; type: string; uri?: string };

beforeEach(() => {
  // Set fixed date for tests
  mockDate = new Date('2023-01-01T00:00:00Z');
  jest.useFakeTimers().setSystemTime(mockDate);
  
  // Create a mock file for file validation tests
  mockFile = { 
    name: 'test.jpg', 
    size: 5 * 1024 * 1024, // 5MB
    type: 'image/jpeg',
    uri: 'file:///path/to/test.jpg'
  };
});

afterEach(() => {
  jest.useRealTimers();
});

describe('validateEmail tests', () => {
  it('should validate correct email addresses', () => {
    expect(validationUtils.validateEmail('user@example.com')).toBe(true);
    expect(validationUtils.validateEmail('user.name@example.co.uk')).toBe(true);
    expect(validationUtils.validateEmail('user+tag@example.com')).toBe(true);
    expect(validationUtils.validateEmail('user-name@example.org')).toBe(true);
    expect(validationUtils.validateEmail('user_name@example.io')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(validationUtils.validateEmail('user@')).toBe(false);
    expect(validationUtils.validateEmail('user@example')).toBe(false);
    expect(validationUtils.validateEmail('user@.com')).toBe(false);
    expect(validationUtils.validateEmail('@example.com')).toBe(false);
    expect(validationUtils.validateEmail('user name@example.com')).toBe(false);
    expect(validationUtils.validateEmail('user@exam ple.com')).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(validationUtils.validateEmail('')).toBe(false);
    expect(validationUtils.validateEmail('   ')).toBe(false);
    expect(validationUtils.validateEmail(null as any)).toBe(false);
    expect(validationUtils.validateEmail(undefined as any)).toBe(false);
    expect(validationUtils.validateEmail(123 as any)).toBe(false);
  });

  it('should correctly use the EMAIL regex pattern', () => {
    const emailRegex = validationUtils.REGEX_PATTERNS.EMAIL;
    expect(emailRegex.test('user@example.com')).toBe(true);
    expect(emailRegex.test('invalid')).toBe(false);
  });
});

describe('validatePassword tests', () => {
  it('should validate correct passwords', () => {
    expect(validationUtils.validatePassword('Password1!')).toBe(true);
    expect(validationUtils.validatePassword('Str0ng@Password')).toBe(true);
    expect(validationUtils.validatePassword('Complex123$')).toBe(true);
    expect(validationUtils.validatePassword('V3ryC0mpl3x!P4ssw0rd')).toBe(true);
  });

  it('should reject passwords that do not meet requirements', () => {
    // Too short
    expect(validationUtils.validatePassword('Pass1!')).toBe(false);
    // No uppercase
    expect(validationUtils.validatePassword('password1!')).toBe(false);
    // No lowercase
    expect(validationUtils.validatePassword('PASSWORD1!')).toBe(false);
    // No number
    expect(validationUtils.validatePassword('Password!')).toBe(false);
    // No special character
    expect(validationUtils.validatePassword('Password1')).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(validationUtils.validatePassword('')).toBe(false);
    expect(validationUtils.validatePassword('   ')).toBe(false);
    expect(validationUtils.validatePassword(null as any)).toBe(false);
    expect(validationUtils.validatePassword(undefined as any)).toBe(false);
    expect(validationUtils.validatePassword(123 as any)).toBe(false);
  });

  it('should correctly use the PASSWORD regex pattern', () => {
    const passwordRegex = validationUtils.REGEX_PATTERNS.PASSWORD;
    expect(passwordRegex.test('Password1!')).toBe(true);
    expect(passwordRegex.test('weak')).toBe(false);
  });
});

describe('validateUrl tests', () => {
  it('should validate correct URLs', () => {
    expect(validationUtils.validateUrl('https://example.com')).toBe(true);
    expect(validationUtils.validateUrl('http://example.com')).toBe(true);
    expect(validationUtils.validateUrl('example.com')).toBe(true);
    expect(validationUtils.validateUrl('sub.example.com')).toBe(true);
    expect(validationUtils.validateUrl('example.com/path')).toBe(true);
    expect(validationUtils.validateUrl('example.com/path?query=value')).toBe(true);
  });

  it('should reject invalid URLs', () => {
    expect(validationUtils.validateUrl('htp:/example')).toBe(false);
    expect(validationUtils.validateUrl('example')).toBe(false);
    expect(validationUtils.validateUrl('http://')).toBe(false);
    expect(validationUtils.validateUrl('.com')).toBe(false);
  });

  it('should handle relative URLs correctly based on allowRelative flag', () => {
    expect(validationUtils.validateUrl('/path/to/resource')).toBe(false);
    expect(validationUtils.validateUrl('/path/to/resource', true)).toBe(true);
  });

  it('should handle edge cases', () => {
    expect(validationUtils.validateUrl('')).toBe(false);
    expect(validationUtils.validateUrl('   ')).toBe(false);
    expect(validationUtils.validateUrl(null as any)).toBe(false);
    expect(validationUtils.validateUrl(undefined as any)).toBe(false);
    expect(validationUtils.validateUrl(123 as any)).toBe(false);
  });

  it('should correctly use the URL regex pattern', () => {
    const urlRegex = validationUtils.REGEX_PATTERNS.URL;
    expect(urlRegex.test('example.com')).toBe(true);
    expect(urlRegex.test('invalid')).toBe(false);
  });
});

describe('validatePhone tests', () => {
  it('should validate correct phone numbers', () => {
    expect(validationUtils.validatePhone('1234567890')).toBe(true);
    expect(validationUtils.validatePhone('+1234567890')).toBe(true);
    expect(validationUtils.validatePhone('+12345678901')).toBe(true);
    expect(validationUtils.validatePhone('12345678901234')).toBe(true);
  });

  it('should reject invalid phone numbers', () => {
    expect(validationUtils.validatePhone('123')).toBe(false); // Too short
    expect(validationUtils.validatePhone('123456789012345678')).toBe(false); // Too long
    expect(validationUtils.validatePhone('abcdefghij')).toBe(false); // Contains letters
    expect(validationUtils.validatePhone('123-456-7890')).toBe(false); // Contains hyphens
    expect(validationUtils.validatePhone('(123) 456-7890')).toBe(false); // Contains parentheses and space
  });

  it('should handle edge cases', () => {
    expect(validationUtils.validatePhone('')).toBe(false);
    expect(validationUtils.validatePhone('   ')).toBe(false);
    expect(validationUtils.validatePhone(null as any)).toBe(false);
    expect(validationUtils.validatePhone(undefined as any)).toBe(false);
    expect(validationUtils.validatePhone(123 as any)).toBe(false);
  });

  it('should correctly use the PHONE regex pattern', () => {
    const phoneRegex = validationUtils.REGEX_PATTERNS.PHONE;
    expect(phoneRegex.test('1234567890')).toBe(true);
    expect(phoneRegex.test('12345')).toBe(false);
  });
});

describe('validateFileUpload tests', () => {
  it('should validate files with correct size and type', () => {
    const validFile = { 
      uri: 'file:///path/to/image.jpg',
      name: 'image.jpg', 
      size: 5 * 1024 * 1024, // 5MB
      type: 'image/jpeg'
    };
    
    const result = validationUtils.validateFileUpload(validFile);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject files that exceed size limit', () => {
    const oversizedFile = { 
      uri: 'file:///path/to/large.jpg',
      name: 'large.jpg', 
      size: 15 * 1024 * 1024, // 15MB (exceeds 10MB limit)
      type: 'image/jpeg'
    };
    
    const result = validationUtils.validateFileUpload(oversizedFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds the maximum allowed size');
  });

  it('should reject files with invalid types', () => {
    const invalidTypeFile = { 
      uri: 'file:///path/to/document.exe',
      name: 'document.exe', 
      size: 5 * 1024 * 1024,
      type: 'application/x-msdownload'
    };
    
    const result = validationUtils.validateFileUpload(invalidTypeFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('File type is not supported');
  });

  it('should handle iOS-specific file formats from camera and photo library', () => {
    // iOS might not provide type directly
    const iosFile = { 
      uri: 'file:///path/to/image.jpg',
      name: 'image.jpg', 
      size: 5 * 1024 * 1024,
      type: '' // Empty type, should be inferred from name
    };
    
    const result = validationUtils.validateFileUpload(iosFile);
    expect(result.valid).toBe(true);
  });

  it('should handle edge cases', () => {
    const emptyFile = { uri: '', name: '', type: '' };
    const result = validationUtils.validateFileUpload(emptyFile);
    expect(result.valid).toBe(false);
    
    // @ts-ignore - Testing null value
    expect(validationUtils.validateFileUpload(null).valid).toBe(false);
    // @ts-ignore - Testing undefined value
    expect(validationUtils.validateFileUpload(undefined).valid).toBe(false);
  });
});

describe('validateFileUploads tests', () => {
  it('should validate arrays of valid files', () => {
    const validFiles = [
      { uri: 'file:///path/to/image1.jpg', name: 'image1.jpg', size: 5 * 1024 * 1024, type: 'image/jpeg' },
      { uri: 'file:///path/to/image2.png', name: 'image2.png', size: 3 * 1024 * 1024, type: 'image/png' }
    ];
    
    const result = validationUtils.validateFileUploads(validFiles);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should reject if any file in array is invalid', () => {
    const mixedFiles = [
      { uri: 'file:///path/to/image.jpg', name: 'image.jpg', size: 5 * 1024 * 1024, type: 'image/jpeg' },
      { uri: 'file:///path/to/doc.exe', name: 'doc.exe', size: 3 * 1024 * 1024, type: 'application/x-msdownload' }
    ];
    
    const result = validationUtils.validateFileUploads(mixedFiles);
    expect(result.valid).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
    expect(result.errors?.[0]).toContain('doc.exe');
  });

  it('should reject if too many files are provided', () => {
    // Create array with more files than MAX_FILES_PER_REQUEST
    const tooManyFiles = Array(validationUtils.FILE_UPLOAD_LIMITS.MAX_FILES_PER_REQUEST + 1).fill(null).map((_, i) => ({
      uri: `file:///path/to/image${i}.jpg`,
      name: `image${i}.jpg`,
      size: 1 * 1024 * 1024,
      type: 'image/jpeg'
    }));
    
    const result = validationUtils.validateFileUploads(tooManyFiles);
    expect(result.valid).toBe(false);
    expect(result.errors?.[0]).toContain('Maximum of');
  });

  it('should handle edge cases', () => {
    expect(validationUtils.validateFileUploads([]).valid).toBe(true);
    expect(validationUtils.validateFileUploads(null as any).valid).toBe(false);
    expect(validationUtils.validateFileUploads(undefined as any).valid).toBe(false);
    expect(validationUtils.validateFileUploads({} as any).valid).toBe(false);
  });
});

describe('isValidAmount tests', () => {
  it('should validate positive numbers with up to 2 decimal places', () => {
    expect(validationUtils.isValidAmount(100)).toBe(true);
    expect(validationUtils.isValidAmount(99.99)).toBe(true);
    expect(validationUtils.isValidAmount(0.5)).toBe(true);
    expect(validationUtils.isValidAmount(0.01)).toBe(true);
  });

  it('should reject negative numbers', () => {
    expect(validationUtils.isValidAmount(-1)).toBe(false);
    expect(validationUtils.isValidAmount(-0.01)).toBe(false);
  });

  it('should reject zero', () => {
    expect(validationUtils.isValidAmount(0)).toBe(false);
  });

  it('should reject numbers with more than 2 decimal places', () => {
    expect(validationUtils.isValidAmount(99.999)).toBe(false);
    expect(validationUtils.isValidAmount(0.001)).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(validationUtils.isValidAmount(NaN)).toBe(false);
    expect(validationUtils.isValidAmount(Infinity)).toBe(false);
    expect(validationUtils.isValidAmount(null as any)).toBe(false);
    expect(validationUtils.isValidAmount(undefined as any)).toBe(false);
    expect(validationUtils.isValidAmount('100' as any)).toBe(false);
  });
});

describe('isValidDate tests', () => {
  it('should validate Date objects', () => {
    expect(validationUtils.isValidDate(new Date())).toBe(true);
    expect(validationUtils.isValidDate(new Date('2023-12-31'))).toBe(true);
  });

  it('should validate future dates with mustBeFuture flag', () => {
    // mockDate is set to 2023-01-01, so this is in the future
    const futureDate = new Date('2023-12-31');
    expect(validationUtils.isValidDate(futureDate, true)).toBe(true);
  });

  it('should reject past dates with mustBeFuture flag', () => {
    // mockDate is set to 2023-01-01, so this is in the past
    const pastDate = new Date('2022-01-01');
    expect(validationUtils.isValidDate(pastDate, true)).toBe(false);
  });

  it('should reject invalid Date objects', () => {
    expect(validationUtils.isValidDate(new Date('invalid'))).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(validationUtils.isValidDate(null as any)).toBe(false);
    expect(validationUtils.isValidDate(undefined as any)).toBe(false);
    expect(validationUtils.isValidDate('2023-01-01' as any)).toBe(false);
    expect(validationUtils.isValidDate({} as any)).toBe(false);
  });
});

describe('isValidDateRange tests', () => {
  it('should validate when start date is before end date', () => {
    const startDate = new Date('2023-01-01');
    const endDate = new Date('2023-12-31');
    expect(validationUtils.isValidDateRange(startDate, endDate)).toBe(true);
  });

  it('should reject when start date is after end date', () => {
    const startDate = new Date('2023-12-31');
    const endDate = new Date('2023-01-01');
    expect(validationUtils.isValidDateRange(startDate, endDate)).toBe(false);
  });

  it('should reject when dates are the same', () => {
    const sameDate = new Date('2023-01-01');
    expect(validationUtils.isValidDateRange(sameDate, sameDate)).toBe(false);
  });

  it('should reject if either date is invalid', () => {
    const validDate = new Date('2023-01-01');
    const invalidDate = new Date('invalid');
    
    expect(validationUtils.isValidDateRange(invalidDate, validDate)).toBe(false);
    expect(validationUtils.isValidDateRange(validDate, invalidDate)).toBe(false);
    expect(validationUtils.isValidDateRange(invalidDate, invalidDate)).toBe(false);
  });

  it('should handle edge cases', () => {
    const validDate = new Date('2023-01-01');
    
    expect(validationUtils.isValidDateRange(null as any, validDate)).toBe(false);
    expect(validationUtils.isValidDateRange(validDate, null as any)).toBe(false);
    expect(validationUtils.isValidDateRange(undefined as any, validDate)).toBe(false);
    expect(validationUtils.isValidDateRange(validDate, undefined as any)).toBe(false);
  });
});

describe('isValidUUID tests', () => {
  it('should validate correct UUIDs', () => {
    expect(validationUtils.isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(validationUtils.isValidUUID('123E4567-E89B-12D3-A456-426614174000')).toBe(true);
  });

  it('should reject incorrect UUIDs', () => {
    expect(validationUtils.isValidUUID('not-a-uuid')).toBe(false);
    expect(validationUtils.isValidUUID('123e4567e89b12d3a456426614174000')).toBe(false); // No hyphens
    expect(validationUtils.isValidUUID('123e4567-e89b-12d3-a456-42661417400')).toBe(false); // Too short
    expect(validationUtils.isValidUUID('123e4567-e89b-12d3-a456-4266141740001')).toBe(false); // Too long
    expect(validationUtils.isValidUUID('123e4567-e89b-12d3-a456-42661417400g')).toBe(false); // Invalid character
  });

  it('should handle edge cases', () => {
    expect(validationUtils.isValidUUID('')).toBe(false);
    expect(validationUtils.isValidUUID('   ')).toBe(false);
    expect(validationUtils.isValidUUID(null as any)).toBe(false);
    expect(validationUtils.isValidUUID(undefined as any)).toBe(false);
    expect(validationUtils.isValidUUID(123 as any)).toBe(false);
  });
});

describe('validateLoginForm tests', () => {
  it('should validate a valid login form', () => {
    const validForm: LoginFormValues = {
      email: 'user@example.com',
      password: 'Password1!',
      remember: true,
      useBiometrics: false
    };
    
    const result = validationUtils.validateLoginForm(validForm);
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors).length).toBe(0);
  });

  it('should validate a valid login form with biometrics', () => {
    const validBiometricForm: LoginFormValues = {
      email: 'user@example.com',
      password: '', // Password not needed when using biometrics
      remember: true,
      useBiometrics: true
    };
    
    const result = validationUtils.validateLoginForm(validBiometricForm);
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors).length).toBe(0);
  });

  it('should reject a form with invalid email', () => {
    const invalidEmailForm: LoginFormValues = {
      email: 'invalid-email',
      password: 'Password1!',
      remember: true,
      useBiometrics: false
    };
    
    const result = validationUtils.validateLoginForm(invalidEmailForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBeDefined();
    expect(result.errors.email).toBe('Please enter a valid email address');
  });

  it('should reject a form with invalid password (when not using biometrics)', () => {
    const invalidPasswordForm: LoginFormValues = {
      email: 'user@example.com',
      password: 'weak',
      remember: true,
      useBiometrics: false
    };
    
    const result = validationUtils.validateLoginForm(invalidPasswordForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.password).toBeDefined();
    expect(result.errors.password).toBe('Please enter a valid password');
  });

  it('should reject a form with missing email', () => {
    const missingEmailForm: LoginFormValues = {
      email: '',
      password: 'Password1!',
      remember: true,
      useBiometrics: false
    };
    
    const result = validationUtils.validateLoginForm(missingEmailForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });
});

describe('validateRegisterForm tests', () => {
  it('should validate a valid registration form', () => {
    const validForm: RegisterFormValues = {
      email: 'user@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      firstName: 'John',
      lastName: 'Doe',
      role: 'freelancer',
      agreeToTerms: true,
      enableBiometrics: false
    };
    
    const result = validationUtils.validateRegisterForm(validForm);
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors).length).toBe(0);
  });

  it('should reject a form with invalid email', () => {
    const invalidEmailForm: RegisterFormValues = {
      email: 'invalid-email',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      firstName: 'John',
      lastName: 'Doe',
      role: 'freelancer',
      agreeToTerms: true,
      enableBiometrics: false
    };
    
    const result = validationUtils.validateRegisterForm(invalidEmailForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBeDefined();
    expect(result.errors.email).toBe('Please enter a valid email address');
  });

  it('should reject a form with invalid password', () => {
    const invalidPasswordForm: RegisterFormValues = {
      email: 'user@example.com',
      password: 'weak',
      confirmPassword: 'weak',
      firstName: 'John',
      lastName: 'Doe',
      role: 'freelancer',
      agreeToTerms: true,
      enableBiometrics: false
    };
    
    const result = validationUtils.validateRegisterForm(invalidPasswordForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.password).toBeDefined();
    expect(result.errors.password).toContain('must be at least 8 characters');
  });

  it('should reject a form with non-matching passwords', () => {
    const nonMatchingPasswordsForm: RegisterFormValues = {
      email: 'user@example.com',
      password: 'Password1!',
      confirmPassword: 'DifferentPassword1!',
      firstName: 'John',
      lastName: 'Doe',
      role: 'freelancer',
      agreeToTerms: true,
      enableBiometrics: false
    };
    
    const result = validationUtils.validateRegisterForm(nonMatchingPasswordsForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.confirmPassword).toBeDefined();
    expect(result.errors.confirmPassword).toBe('Passwords do not match');
  });

  it('should reject a form with missing name fields', () => {
    const missingNameForm: RegisterFormValues = {
      email: 'user@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      firstName: '', // Empty first name
      lastName: 'Doe',
      role: 'freelancer',
      agreeToTerms: true,
      enableBiometrics: false
    };
    
    const result = validationUtils.validateRegisterForm(missingNameForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.firstName).toBeDefined();
    expect(result.errors.firstName).toBe('First name is required');
  });

  it('should reject a form where terms are not accepted', () => {
    const noTermsForm: RegisterFormValues = {
      email: 'user@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      firstName: 'John',
      lastName: 'Doe',
      role: 'freelancer',
      agreeToTerms: false, // Terms not accepted
      enableBiometrics: false
    };
    
    const result = validationUtils.validateRegisterForm(noTermsForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.agreeToTerms).toBeDefined();
    expect(result.errors.agreeToTerms).toBe('You must agree to the terms and conditions');
  });
});

describe('REGEX_PATTERNS tests', () => {
  it('should have the correct EMAIL regex pattern', () => {
    const { EMAIL } = validationUtils.REGEX_PATTERNS;
    
    // Valid emails
    expect(EMAIL.test('user@example.com')).toBe(true);
    expect(EMAIL.test('user.name@example.co.uk')).toBe(true);
    expect(EMAIL.test('user+tag@example.com')).toBe(true);
    
    // Invalid emails
    expect(EMAIL.test('user@')).toBe(false);
    expect(EMAIL.test('@example.com')).toBe(false);
    expect(EMAIL.test('user@example')).toBe(false);
  });

  it('should have the correct PASSWORD regex pattern', () => {
    const { PASSWORD } = validationUtils.REGEX_PATTERNS;
    
    // Valid passwords (meets all requirements)
    expect(PASSWORD.test('Password1!')).toBe(true);
    expect(PASSWORD.test('Str0ng@Password')).toBe(true);
    
    // Invalid passwords
    expect(PASSWORD.test('password')).toBe(false); // No uppercase, number, or special char
    expect(PASSWORD.test('PASSWORD')).toBe(false); // No lowercase, number, or special char
    expect(PASSWORD.test('Password')).toBe(false); // No number or special char
    expect(PASSWORD.test('Password1')).toBe(false); // No special char
    expect(PASSWORD.test('Pass1!')).toBe(false); // Too short
  });

  it('should have the correct URL regex pattern', () => {
    const { URL } = validationUtils.REGEX_PATTERNS;
    
    // Valid URLs
    expect(URL.test('example.com')).toBe(true);
    expect(URL.test('https://example.com')).toBe(true);
    expect(URL.test('sub.example.com/path')).toBe(true);
    
    // Invalid URLs
    expect(URL.test('example')).toBe(false);
    expect(URL.test('http://')).toBe(false);
    expect(URL.test('.com')).toBe(false);
  });

  it('should have the correct PHONE regex pattern', () => {
    const { PHONE } = validationUtils.REGEX_PATTERNS;
    
    // Valid phone numbers
    expect(PHONE.test('1234567890')).toBe(true);
    expect(PHONE.test('+1234567890')).toBe(true);
    expect(PHONE.test('12345678901234')).toBe(true);
    
    // Invalid phone numbers
    expect(PHONE.test('123')).toBe(false); // Too short
    expect(PHONE.test('123456789012345678')).toBe(false); // Too long
    expect(PHONE.test('123-456-7890')).toBe(false); // Contains hyphens
  });
});

describe('FILE_UPLOAD_LIMITS tests', () => {
  it('should have the correct MAX_FILE_SIZE', () => {
    expect(validationUtils.FILE_UPLOAD_LIMITS.MAX_FILE_SIZE).toBe(10 * 1024 * 1024); // 10MB
  });
  
  it('should have the correct ALLOWED_FILE_TYPES', () => {
    const allowedTypes = validationUtils.FILE_UPLOAD_LIMITS.ALLOWED_FILE_TYPES;
    
    expect(allowedTypes).toContain('image/jpeg');
    expect(allowedTypes).toContain('image/png');
    expect(allowedTypes).toContain('application/pdf');
    expect(allowedTypes).toContain('application/zip');
    expect(allowedTypes).toContain('application/json');
    expect(allowedTypes).toContain('text/plain');
    expect(allowedTypes).toContain('application/x-ipynb+json');
    
    // Should not contain disallowed types
    expect(allowedTypes).not.toContain('application/x-msdownload'); // .exe
    expect(allowedTypes).not.toContain('application/x-shockwave-flash'); // .swf
  });
  
  it('should have the correct MAX_FILES_PER_REQUEST', () => {
    expect(validationUtils.FILE_UPLOAD_LIMITS.MAX_FILES_PER_REQUEST).toBe(5);
  });
});