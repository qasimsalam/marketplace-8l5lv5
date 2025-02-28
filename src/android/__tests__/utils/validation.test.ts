import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Platform } from 'react-native';
import * as validationUtils from '../../src/utils/validation';
import { isDateInFuture, isDateInPast } from '../../src/utils/date';
import { 
  LoginFormValues, 
  RegisterFormValues, 
  ForgotPasswordFormValues, 
  ResetPasswordFormValues, 
  ChangePasswordFormValues 
} from '../../src/types/auth.types';
import { 
  JobFormValues, 
  ProposalFormValues, 
  ProposalMilestoneFormValues 
} from '../../src/types/job.types';
import { 
  ProfileFormValues, 
  PortfolioItemFormValues, 
  ExperienceFormValues, 
  EducationFormValues, 
  CertificationFormValues 
} from '../../src/types/profile.types';

// Mock date for consistent testing
const mockDate = new Date('2023-01-01T00:00:00Z');

// Mock Android file for testing
const mockAndroidFile = { name: 'test.jpg', size: 5 * 1024 * 1024, type: 'image/jpeg', uri: 'content://media/external/images/1234' };

// Mock the Platform module
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android'
  }
}));

// Mock date utility functions
jest.mock('../../src/utils/date', () => ({
  isDateInFuture: jest.fn(),
  isDateInPast: jest.fn()
}));

describe('validateEmail tests', () => {
  it('should return true for valid email addresses', () => {
    expect(validationUtils.validateEmail('user@example.com')).toBe(true);
    expect(validationUtils.validateEmail('user.name@example.com')).toBe(true);
    expect(validationUtils.validateEmail('user+tag@example.co.uk')).toBe(true);
    expect(validationUtils.validateEmail('user-name@sub.domain.com')).toBe(true);
  });

  it('should return false for invalid email addresses', () => {
    expect(validationUtils.validateEmail('')).toBe(false);
    expect(validationUtils.validateEmail('user')).toBe(false);
    expect(validationUtils.validateEmail('user@')).toBe(false);
    expect(validationUtils.validateEmail('@example.com')).toBe(false);
    expect(validationUtils.validateEmail('user@.com')).toBe(false);
    expect(validationUtils.validateEmail('user@example')).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(validationUtils.validateEmail(null as any)).toBe(false);
    expect(validationUtils.validateEmail(undefined as any)).toBe(false);
    expect(validationUtils.validateEmail(' user@example.com ')).toBe(true); // Trims whitespace
  });
});

describe('validatePassword tests', () => {
  it('should return true for valid passwords', () => {
    expect(validationUtils.validatePassword('Password1!')).toBe(true);
    expect(validationUtils.validatePassword('Comp1ex@Password')).toBe(true);
    expect(validationUtils.validatePassword('A1b2C3d4$')).toBe(true);
  });

  it('should return false for invalid passwords', () => {
    expect(validationUtils.validatePassword('')).toBe(false);
    expect(validationUtils.validatePassword('short1!')).toBe(false); // Too short
    expect(validationUtils.validatePassword('password1!')).toBe(false); // No uppercase
    expect(validationUtils.validatePassword('PASSWORD1!')).toBe(false); // No lowercase
    expect(validationUtils.validatePassword('Password!')).toBe(false); // No number
    expect(validationUtils.validatePassword('Password1')).toBe(false); // No special character
  });

  it('should handle edge cases', () => {
    expect(validationUtils.validatePassword(null as any)).toBe(false);
    expect(validationUtils.validatePassword(undefined as any)).toBe(false);
  });
});

describe('validateUrl tests', () => {
  it('should return true for valid URLs', () => {
    expect(validationUtils.validateUrl('https://example.com')).toBe(true);
    expect(validationUtils.validateUrl('http://example.com')).toBe(true);
    expect(validationUtils.validateUrl('example.com')).toBe(true);
    expect(validationUtils.validateUrl('sub.example.com')).toBe(true);
    expect(validationUtils.validateUrl('example.com/path')).toBe(true);
  });

  it('should return false for invalid URLs', () => {
    expect(validationUtils.validateUrl('')).toBe(false);
    expect(validationUtils.validateUrl('not a url')).toBe(false);
    expect(validationUtils.validateUrl('http://')).toBe(false);
  });

  it('should handle relative URLs based on allowRelative flag', () => {
    expect(validationUtils.validateUrl('/relative/path', false)).toBe(false);
    expect(validationUtils.validateUrl('/relative/path', true)).toBe(true);
  });

  it('should validate Android-specific deep links and content URIs', () => {
    expect(validationUtils.validateUrl('content://com.example.provider/path')).toBe(true);
    expect(validationUtils.validateUrl('market://details?id=com.example')).toBe(true);
    expect(validationUtils.validateUrl('intent://scan/#Intent;scheme=zxing;package=com.google.zxing.client.android;end')).toBe(true);
    expect(validationUtils.validateUrl('app://open/product/123')).toBe(true);
  });

  it('should handle edge cases', () => {
    expect(validationUtils.validateUrl(null as any)).toBe(false);
    expect(validationUtils.validateUrl(undefined as any)).toBe(false);
    expect(validationUtils.validateUrl(null as any, true)).toBe(true); // allowRelative true
  });
});

describe('validatePhone tests', () => {
  it('should return true for valid phone numbers', () => {
    expect(validationUtils.validatePhone('1234567890')).toBe(true);
    expect(validationUtils.validatePhone('+1234567890')).toBe(true);
    expect(validationUtils.validatePhone('12345678901')).toBe(true);
    expect(validationUtils.validatePhone('+12345678901')).toBe(true);
  });

  it('should return false for invalid phone numbers', () => {
    expect(validationUtils.validatePhone('')).toBe(false);
    expect(validationUtils.validatePhone('123')).toBe(false); // Too short
    expect(validationUtils.validatePhone('123abc4567')).toBe(false); // Contains letters
    expect(validationUtils.validatePhone('123 456 7890')).toBe(false); // Contains spaces
  });

  it('should handle edge cases', () => {
    expect(validationUtils.validatePhone(null as any)).toBe(false);
    expect(validationUtils.validatePhone(undefined as any)).toBe(false);
    expect(validationUtils.validatePhone(' +1234567890 ')).toBe(true); // Trims whitespace
  });
});

describe('validateFileUpload tests', () => {
  const validFile = {
    name: 'test.jpg',
    size: 5 * 1024 * 1024, // 5MB
    type: 'image/jpeg',
    uri: 'file:///path/to/test.jpg'
  };

  const oversizedFile = {
    name: 'large.jpg',
    size: 15 * 1024 * 1024, // 15MB
    type: 'image/jpeg',
    uri: 'file:///path/to/large.jpg'
  };

  const invalidTypeFile = {
    name: 'script.exe',
    size: 1024 * 1024,
    type: 'application/x-msdownload',
    uri: 'file:///path/to/script.exe'
  };

  const androidContentUriFile = {
    name: 'android_image.jpg',
    size: 3 * 1024 * 1024,
    type: '', // Empty type (Android content URI may not have type)
    uri: 'content://media/external/images/media/123'
  };

  beforeEach(() => {
    // Mock the platform as Android for testing Android-specific behavior
    (Platform.OS as any) = 'android';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return valid for valid files', () => {
    const result = validationUtils.validateFileUpload(validFile);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should return invalid for oversized files', () => {
    const result = validationUtils.validateFileUpload(oversizedFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds maximum limit');
  });

  it('should return invalid for unsupported file types', () => {
    const result = validationUtils.validateFileUpload(invalidTypeFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not allowed');
  });

  it('should handle Android content URIs correctly', () => {
    // Mock the Android-specific functions
    jest.spyOn(validationUtils, 'isAndroidContentUri').mockReturnValue(true);
    jest.spyOn(validationUtils, 'getAndroidMimeType').mockReturnValue('image/jpeg');

    const result = validationUtils.validateFileUpload(androidContentUriFile);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
    
    expect(validationUtils.isAndroidContentUri).toHaveBeenCalledWith(androidContentUriFile.uri);
    expect(validationUtils.getAndroidMimeType).toHaveBeenCalledWith(androidContentUriFile.uri);
  });

  it('should handle edge cases', () => {
    expect(validationUtils.validateFileUpload(null as any).valid).toBe(false);
    expect(validationUtils.validateFileUpload({} as any).valid).toBe(false);
    expect(validationUtils.validateFileUpload({ size: 100 } as any).valid).toBe(false);
  });
});

describe('validateFileUploads tests', () => {
  const validFile1 = {
    name: 'test1.jpg',
    size: 5 * 1024 * 1024,
    type: 'image/jpeg',
    uri: 'file:///path/to/test1.jpg'
  };

  const validFile2 = {
    name: 'test2.pdf',
    size: 3 * 1024 * 1024,
    type: 'application/pdf',
    uri: 'file:///path/to/test2.pdf'
  };

  const invalidFile = {
    name: 'large.mov',
    size: 15 * 1024 * 1024,
    type: 'video/quicktime',
    uri: 'file:///path/to/large.mov'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return valid for valid file arrays', () => {
    // Mock the individual file validation to return valid
    jest.spyOn(validationUtils, 'validateFileUpload').mockImplementation(() => ({ valid: true }));

    const result = validationUtils.validateFileUploads([validFile1, validFile2]);
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
    expect(validationUtils.validateFileUpload).toHaveBeenCalledTimes(2);
  });

  it('should return invalid when some files are invalid', () => {
    // Mock the individual file validation to return valid for first file and invalid for second
    jest.spyOn(validationUtils, 'validateFileUpload')
      .mockImplementationOnce(() => ({ valid: true }))
      .mockImplementationOnce(() => ({ valid: false, error: 'Invalid file' }));

    const result = validationUtils.validateFileUploads([validFile1, invalidFile]);
    expect(result.valid).toBe(false);
    expect(result.errors?.length).toBe(1);
    expect(result.errors?.[0]).toContain('File 2:');
    expect(validationUtils.validateFileUpload).toHaveBeenCalledTimes(2);
  });

  it('should return invalid when exceeding max files limit', () => {
    // Create an array with more files than allowed
    const maxFiles = validationUtils.FILE_UPLOAD_LIMITS.MAX_FILES_PER_REQUEST;
    const tooManyFiles = Array(maxFiles + 1).fill(validFile1);
    
    const result = validationUtils.validateFileUploads(tooManyFiles);
    expect(result.valid).toBe(false);
    expect(result.errors?.[0]).toContain('Maximum of');
  });

  it('should handle edge cases', () => {
    expect(validationUtils.validateFileUploads(null as any).valid).toBe(false);
    expect(validationUtils.validateFileUploads([] as any).valid).toBe(true);
    expect(validationUtils.validateFileUploads({} as any).valid).toBe(false);
  });
});

describe('isValidAmount tests', () => {
  it('should return true for valid amounts', () => {
    expect(validationUtils.isValidAmount(100)).toBe(true);
    expect(validationUtils.isValidAmount(50.5)).toBe(true);
    expect(validationUtils.isValidAmount(0.01)).toBe(true);
    expect(validationUtils.isValidAmount(999999.99)).toBe(true);
  });

  it('should return false for invalid amounts', () => {
    expect(validationUtils.isValidAmount(0)).toBe(false);
    expect(validationUtils.isValidAmount(-10)).toBe(false);
    expect(validationUtils.isValidAmount(10.999)).toBe(false); // More than 2 decimal places
  });

  it('should handle edge cases', () => {
    expect(validationUtils.isValidAmount(NaN)).toBe(false);
    expect(validationUtils.isValidAmount(null as any)).toBe(false);
    expect(validationUtils.isValidAmount(undefined as any)).toBe(false);
    expect(validationUtils.isValidAmount('100' as any)).toBe(false);
  });
});

describe('isValidDate tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true for valid dates', () => {
    expect(validationUtils.isValidDate(mockDate)).toBe(true);
    expect(validationUtils.isValidDate(new Date())).toBe(true);
  });

  it('should validate future dates when mustBeFuture is true', () => {
    // Mock isDateInFuture to return false and then true
    (isDateInFuture as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(true);

    // Date that isn't in the future
    expect(validationUtils.isValidDate(mockDate, true)).toBe(false);
    expect(isDateInFuture).toHaveBeenCalledWith(mockDate);

    // Date that is in the future
    expect(validationUtils.isValidDate(mockDate, true)).toBe(true);
    expect(isDateInFuture).toHaveBeenCalledWith(mockDate);
  });

  it('should return false for invalid Date objects', () => {
    expect(validationUtils.isValidDate(new Date('invalid date'))).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(validationUtils.isValidDate(null as any)).toBe(false);
    expect(validationUtils.isValidDate(undefined as any)).toBe(false);
    expect(validationUtils.isValidDate({} as any)).toBe(false);
    expect(validationUtils.isValidDate('2023-01-01' as any)).toBe(false);
  });
});

describe('isValidDateRange tests', () => {
  const startDate = new Date('2023-01-01T00:00:00Z');
  const endDate = new Date('2023-01-31T00:00:00Z');
  const sameDate = new Date('2023-01-01T00:00:00Z');
  const invalidDate = new Date('invalid');

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock isValidDate to return true for valid dates and false for invalid dates
    jest.spyOn(validationUtils, 'isValidDate')
      .mockImplementation((date: Date) => !(date instanceof Date && isNaN(date.getTime())));
  });

  it('should return true for valid date ranges', () => {
    expect(validationUtils.isValidDateRange(startDate, endDate)).toBe(true);
  });

  it('should return false for invalid date ranges', () => {
    // End date before start date
    expect(validationUtils.isValidDateRange(endDate, startDate)).toBe(false);
    
    // Same date
    expect(validationUtils.isValidDateRange(sameDate, sameDate)).toBe(false);
  });

  it('should return false when either date is invalid', () => {
    expect(validationUtils.isValidDateRange(invalidDate, endDate)).toBe(false);
    expect(validationUtils.isValidDateRange(startDate, invalidDate)).toBe(false);
    expect(validationUtils.isValidDateRange(invalidDate, invalidDate)).toBe(false);
  });

  it('should handle Android date picker format outputs', () => {
    // Android date picker might return Date objects with different time zones or formats
    const androidStartDate = new Date('2023-01-01T00:00:00+05:30'); // Different timezone
    const androidEndDate = new Date('2023-01-31T23:59:59+05:30');
    
    expect(validationUtils.isValidDateRange(androidStartDate, androidEndDate)).toBe(true);
  });
});

describe('isValidUUID tests', () => {
  it('should return true for valid UUIDs', () => {
    expect(validationUtils.isValidUUID('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
    expect(validationUtils.isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('should return false for invalid UUIDs', () => {
    expect(validationUtils.isValidUUID('')).toBe(false);
    expect(validationUtils.isValidUUID('not-a-uuid')).toBe(false);
    expect(validationUtils.isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
    expect(validationUtils.isValidUUID('550e8400e29b41d4a716446655440000')).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(validationUtils.isValidUUID(null as any)).toBe(false);
    expect(validationUtils.isValidUUID(undefined as any)).toBe(false);
    expect(validationUtils.isValidUUID(123 as any)).toBe(false);
  });
});

describe('isAndroidContentUri tests', () => {
  it('should return true for valid Android content URIs', () => {
    expect(validationUtils.isAndroidContentUri('content://media/external/images/media/123')).toBe(true);
    expect(validationUtils.isAndroidContentUri('file:///storage/emulated/0/Download/image.jpg')).toBe(true);
    expect(validationUtils.isAndroidContentUri('/storage/emulated/0/Pictures/photo.jpg')).toBe(true);
    expect(validationUtils.isAndroidContentUri('/sdcard/Download/document.pdf')).toBe(true);
  });

  it('should return false for invalid URIs', () => {
    expect(validationUtils.isAndroidContentUri('')).toBe(false);
    expect(validationUtils.isAndroidContentUri('http://example.com/image.jpg')).toBe(false);
    expect(validationUtils.isAndroidContentUri('https://example.com/download.pdf')).toBe(false);
    expect(validationUtils.isAndroidContentUri('ftp://server/file.txt')).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(validationUtils.isAndroidContentUri(null as any)).toBe(false);
    expect(validationUtils.isAndroidContentUri(undefined as any)).toBe(false);
    expect(validationUtils.isAndroidContentUri(123 as any)).toBe(false);
  });
});

describe('getAndroidMimeType tests', () => {
  it('should return correct MIME types for common file extensions', () => {
    expect(validationUtils.getAndroidMimeType('image.jpg')).toBe('image/jpeg');
    expect(validationUtils.getAndroidMimeType('document.pdf')).toBe('application/pdf');
    expect(validationUtils.getAndroidMimeType('file.png')).toBe('image/png');
    expect(validationUtils.getAndroidMimeType('notes.txt')).toBe('text/plain');
    expect(validationUtils.getAndroidMimeType('data.json')).toBe('application/json');
    expect(validationUtils.getAndroidMimeType('archive.zip')).toBe('application/zip');
    expect(validationUtils.getAndroidMimeType('animation.gif')).toBe('image/gif');
    expect(validationUtils.getAndroidMimeType('notebook.ipynb')).toBe('application/x-ipynb+json');
  });

  it('should handle Android content URIs', () => {
    expect(validationUtils.getAndroidMimeType('content://media/external/images/media/123')).toBe('image/jpeg');
    expect(validationUtils.getAndroidMimeType('content://com.android.providers.downloads/document/456')).toBe('application/pdf');
  });

  it('should return empty string for unknown extensions', () => {
    expect(validationUtils.getAndroidMimeType('unknown.xyz')).toBe('');
  });

  it('should handle edge cases', () => {
    expect(validationUtils.getAndroidMimeType('')).toBe('');
    expect(validationUtils.getAndroidMimeType('no_extension')).toBe('');
    expect(validationUtils.getAndroidMimeType(null as any)).toBe('');
    expect(validationUtils.getAndroidMimeType(undefined as any)).toBe('');
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
    expect(result.errors).toEqual({});
  });

  it('should return errors for invalid email', () => {
    const invalidEmailForm: LoginFormValues = {
      email: 'invalid-email',
      password: 'Password1!',
      remember: true,
      useBiometrics: false
    };

    const result = validationUtils.validateLoginForm(invalidEmailForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBeTruthy();
  });

  it('should return errors for missing password', () => {
    const missingPasswordForm: LoginFormValues = {
      email: 'user@example.com',
      password: '',
      remember: true,
      useBiometrics: false
    };

    const result = validationUtils.validateLoginForm(missingPasswordForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.password).toBeTruthy();
  });

  it('should not require password when using biometrics', () => {
    const biometricForm: LoginFormValues = {
      email: 'user@example.com',
      password: '', // Empty password
      remember: true,
      useBiometrics: true // Using biometrics
    };

    const result = validationUtils.validateLoginForm(biometricForm);
    expect(result.isValid).toBe(true);
    expect(result.errors.password).toBeUndefined();
  });
});

describe('validateRegisterForm tests', () => {
  const validForm: RegisterFormValues = {
    email: 'user@example.com',
    password: 'Password1!',
    confirmPassword: 'Password1!',
    firstName: 'John',
    lastName: 'Doe',
    role: 'freelancer' as any,
    agreeToTerms: true,
    enableBiometrics: false
  };

  it('should validate a valid registration form', () => {
    const result = validationUtils.validateRegisterForm(validForm);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should return errors for invalid email', () => {
    const invalidEmailForm: RegisterFormValues = {
      ...validForm,
      email: 'invalid-email'
    };

    const result = validationUtils.validateRegisterForm(invalidEmailForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBeTruthy();
  });

  it('should return errors for invalid password', () => {
    const invalidPasswordForm: RegisterFormValues = {
      ...validForm,
      password: 'weak', // Doesn't meet requirements
      confirmPassword: 'weak'
    };

    const result = validationUtils.validateRegisterForm(invalidPasswordForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.password).toBeTruthy();
  });

  it('should return errors for mismatched passwords', () => {
    const mismatchedPasswords: RegisterFormValues = {
      ...validForm,
      password: 'Password1!',
      confirmPassword: 'DifferentPassword1!'
    };

    const result = validationUtils.validateRegisterForm(mismatchedPasswords);
    expect(result.isValid).toBe(false);
    expect(result.errors.confirmPassword).toBeTruthy();
  });

  it('should return errors for missing name fields', () => {
    const missingNamesForm: RegisterFormValues = {
      ...validForm,
      firstName: '',
      lastName: ''
    };

    const result = validationUtils.validateRegisterForm(missingNamesForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.firstName).toBeTruthy();
    expect(result.errors.lastName).toBeTruthy();
  });

  it('should return errors for not agreeing to terms', () => {
    const noTermsForm: RegisterFormValues = {
      ...validForm,
      agreeToTerms: false
    };

    const result = validationUtils.validateRegisterForm(noTermsForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.agreeToTerms).toBeTruthy();
  });
});

describe('validateForgotPasswordForm tests', () => {
  it('should validate a valid forgot password form', () => {
    const validForm: ForgotPasswordFormValues = {
      email: 'user@example.com'
    };

    const result = validationUtils.validateForgotPasswordForm(validForm);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should return errors for invalid email', () => {
    const invalidEmailForm: ForgotPasswordFormValues = {
      email: 'invalid-email'
    };

    const result = validationUtils.validateForgotPasswordForm(invalidEmailForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBeTruthy();
  });

  it('should return errors for empty email', () => {
    const emptyEmailForm: ForgotPasswordFormValues = {
      email: ''
    };

    const result = validationUtils.validateForgotPasswordForm(emptyEmailForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBeTruthy();
  });
});

describe('validateResetPasswordForm tests', () => {
  it('should validate a valid reset password form', () => {
    const validForm: ResetPasswordFormValues = {
      token: 'valid-token-123',
      password: 'Password1!',
      confirmPassword: 'Password1!'
    };

    const result = validationUtils.validateResetPasswordForm(validForm);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should return errors for invalid password', () => {
    const invalidPasswordForm: ResetPasswordFormValues = {
      token: 'valid-token-123',
      password: 'weak', // Doesn't meet requirements
      confirmPassword: 'weak'
    };

    const result = validationUtils.validateResetPasswordForm(invalidPasswordForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.password).toBeTruthy();
  });

  it('should return errors for mismatched passwords', () => {
    const mismatchedPasswords: ResetPasswordFormValues = {
      token: 'valid-token-123',
      password: 'Password1!',
      confirmPassword: 'DifferentPassword1!'
    };

    const result = validationUtils.validateResetPasswordForm(mismatchedPasswords);
    expect(result.isValid).toBe(false);
    expect(result.errors.confirmPassword).toBeTruthy();
  });

  it('should return errors for missing token', () => {
    const missingTokenForm: ResetPasswordFormValues = {
      token: '',
      password: 'Password1!',
      confirmPassword: 'Password1!'
    };

    const result = validationUtils.validateResetPasswordForm(missingTokenForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.token).toBeTruthy();
  });
});

describe('validateChangePasswordForm tests', () => {
  it('should validate a valid change password form', () => {
    const validForm: ChangePasswordFormValues = {
      currentPassword: 'OldPassword1!',
      newPassword: 'NewPassword1!',
      confirmPassword: 'NewPassword1!'
    };

    const result = validationUtils.validateChangePasswordForm(validForm);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should return errors for missing current password', () => {
    const missingCurrentPasswordForm: ChangePasswordFormValues = {
      currentPassword: '',
      newPassword: 'NewPassword1!',
      confirmPassword: 'NewPassword1!'
    };

    const result = validationUtils.validateChangePasswordForm(missingCurrentPasswordForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.currentPassword).toBeTruthy();
  });

  it('should return errors for invalid new password', () => {
    const invalidNewPasswordForm: ChangePasswordFormValues = {
      currentPassword: 'OldPassword1!',
      newPassword: 'weak', // Doesn't meet requirements
      confirmPassword: 'weak'
    };

    const result = validationUtils.validateChangePasswordForm(invalidNewPasswordForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.newPassword).toBeTruthy();
  });

  it('should return errors for mismatched passwords', () => {
    const mismatchedPasswords: ChangePasswordFormValues = {
      currentPassword: 'OldPassword1!',
      newPassword: 'NewPassword1!',
      confirmPassword: 'DifferentPassword1!'
    };

    const result = validationUtils.validateChangePasswordForm(mismatchedPasswords);
    expect(result.isValid).toBe(false);
    expect(result.errors.confirmPassword).toBeTruthy();
  });
});

describe('validateJobForm tests', () => {
  const validJobForm: JobFormValues = {
    title: 'AI Developer Needed',
    description: 'Looking for ML expert',
    type: 'fixed_price' as any,
    budget: 5000,
    minBudget: 4000,
    maxBudget: 6000,
    hourlyRate: 0, // Not used for fixed price
    estimatedHours: 0, // Not used for fixed price
    difficulty: 'intermediate' as any,
    location: 'Remote',
    isRemote: true,
    requiredSkills: ['machine-learning', 'tensorflow'],
    preferredSkills: ['python', 'keras'],
    attachments: [],
    category: 'AI Development',
    subcategory: 'Machine Learning',
    startDate: new Date('2023-02-01'),
    endDate: new Date('2023-03-01')
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock isValidAmount to return true for valid amounts
    jest.spyOn(validationUtils, 'isValidAmount')
      .mockImplementation((amount: number) => amount > 0);
    
    // Mock isValidDate to always return true
    jest.spyOn(validationUtils, 'isValidDate')
      .mockImplementation(() => true);
    
    // Mock isValidDateRange to check if start < end
    jest.spyOn(validationUtils, 'isValidDateRange')
      .mockImplementation((start: Date, end: Date) => start < end);
    
    // Mock validateFileUploads
    jest.spyOn(validationUtils, 'validateFileUploads')
      .mockImplementation(() => ({ valid: true }));
  });

  it('should validate a valid job form', () => {
    const result = validationUtils.validateJobForm(validJobForm);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should return errors for missing title or description', () => {
    const missingTitleForm: JobFormValues = {
      ...validJobForm,
      title: ''
    };

    const missingDescForm: JobFormValues = {
      ...validJobForm,
      description: ''
    };

    expect(validationUtils.validateJobForm(missingTitleForm).isValid).toBe(false);
    expect(validationUtils.validateJobForm(missingTitleForm).errors.title).toBeTruthy();
    
    expect(validationUtils.validateJobForm(missingDescForm).isValid).toBe(false);
    expect(validationUtils.validateJobForm(missingDescForm).errors.description).toBeTruthy();
  });

  it('should validate budget for fixed price jobs', () => {
    const invalidBudgetForm: JobFormValues = {
      ...validJobForm,
      type: 'fixed_price' as any,
      budget: 0 // Invalid amount
    };

    // Mock isValidAmount to return false for this test
    (validationUtils.isValidAmount as jest.Mock).mockReturnValueOnce(false);

    const result = validationUtils.validateJobForm(invalidBudgetForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.budget).toBeTruthy();
  });

  it('should validate hourly rate for hourly jobs', () => {
    const invalidHourlyForm: JobFormValues = {
      ...validJobForm,
      type: 'hourly' as any,
      hourlyRate: 0, // Invalid amount
      estimatedHours: 0 // Invalid hours
    };

    // Mock isValidAmount to return false for hourly rate
    (validationUtils.isValidAmount as jest.Mock).mockReturnValueOnce(false);

    const result = validationUtils.validateJobForm(invalidHourlyForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.hourlyRate).toBeTruthy();
    expect(result.errors.estimatedHours).toBeTruthy();
  });

  it('should validate min/max budget range', () => {
    // Create a form with invalid range (min > max)
    const invalidRangeForm: JobFormValues = {
      ...validJobForm,
      type: 'fixed_price' as any,
      minBudget: 6000,
      maxBudget: 5000
    };

    // First two calls to isValidAmount return true, but min > max
    (validationUtils.isValidAmount as jest.Mock)
      .mockReturnValueOnce(true) // For minBudget
      .mockReturnValueOnce(true); // For maxBudget

    const result = validationUtils.validateJobForm(invalidRangeForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.maxBudget).toBeTruthy();
  });

  it('should validate required skills', () => {
    const noSkillsForm: JobFormValues = {
      ...validJobForm,
      requiredSkills: []
    };

    const result = validationUtils.validateJobForm(noSkillsForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.requiredSkills).toBeTruthy();
  });

  it('should validate date range', () => {
    const invalidDateRangeForm: JobFormValues = {
      ...validJobForm,
      startDate: new Date('2023-03-01'),
      endDate: new Date('2023-02-01') // End date before start date
    };

    // Mock isValidDateRange to return false for this test
    (validationUtils.isValidDateRange as jest.Mock).mockReturnValueOnce(false);

    const result = validationUtils.validateJobForm(invalidDateRangeForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.endDate).toBeTruthy();
  });

  it('should validate file attachments', () => {
    const invalidAttachmentsForm: JobFormValues = {
      ...validJobForm,
      attachments: [{ uri: 'file://invalid.exe', name: 'invalid.exe', type: 'application/octet-stream' }]
    };

    // Mock validateFileUploads to return invalid for this test
    (validationUtils.validateFileUploads as jest.Mock)
      .mockReturnValueOnce({ valid: false, errors: ['File type not allowed'] });

    const result = validationUtils.validateJobForm(invalidAttachmentsForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.attachments).toBeTruthy();
  });
});

describe('validateProposalForm tests', () => {
  const validProposalForm: ProposalFormValues = {
    jobId: '123',
    coverLetter: 'I am perfect for this job because...',
    proposedRate: 50,
    proposedBudget: 5000,
    estimatedDuration: 30,
    estimatedHours: 100,
    attachments: [],
    milestones: []
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock isValidAmount to return true for valid amounts
    jest.spyOn(validationUtils, 'isValidAmount')
      .mockImplementation(() => true);
    
    // Mock validateProposalMilestones to return valid by default
    jest.spyOn(validationUtils, 'validateProposalMilestones')
      .mockImplementation(() => ({ isValid: true, errors: [] }));
    
    // Mock validateFileUploads to return valid by default
    jest.spyOn(validationUtils, 'validateFileUploads')
      .mockImplementation(() => ({ valid: true }));
  });

  it('should validate a valid proposal form', () => {
    const result = validationUtils.validateProposalForm(validProposalForm);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should return errors for missing cover letter', () => {
    const missingCoverLetterForm: ProposalFormValues = {
      ...validProposalForm,
      coverLetter: ''
    };

    const result = validationUtils.validateProposalForm(missingCoverLetterForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.coverLetter).toBeTruthy();
  });

  it('should validate proposed rate or budget', () => {
    // Mock isValidAmount to return false for proposed rate
    (validationUtils.isValidAmount as jest.Mock).mockReturnValueOnce(false);

    const invalidRateForm: ProposalFormValues = {
      ...validProposalForm,
      proposedRate: 0 // Invalid rate
    };

    const result = validationUtils.validateProposalForm(invalidRateForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.proposedRate).toBeTruthy();
  });

  it('should validate milestones if provided', () => {
    const invalidMilestonesForm: ProposalFormValues = {
      ...validProposalForm,
      milestones: [
        { title: 'Milestone 1', description: 'First phase', amount: 1000, dueDate: new Date(), order: 1 }
      ]
    };

    // Mock validateProposalMilestones to return invalid for this test
    (validationUtils.validateProposalMilestones as jest.Mock)
      .mockReturnValueOnce({ isValid: false, errors: [{ title: 'Title is required' }] });

    const result = validationUtils.validateProposalForm(invalidMilestonesForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.milestones).toBeTruthy();
  });

  it('should validate file attachments if provided', () => {
    const invalidAttachmentsForm: ProposalFormValues = {
      ...validProposalForm,
      attachments: [{ uri: 'file://invalid.exe', name: 'invalid.exe', type: 'application/octet-stream' }]
    };

    // Mock validateFileUploads to return invalid for this test
    (validationUtils.validateFileUploads as jest.Mock)
      .mockReturnValueOnce({ valid: false, errors: ['File type not allowed'] });

    const result = validationUtils.validateProposalForm(invalidAttachmentsForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.attachments).toBeTruthy();
  });
});

describe('validateProposalMilestones tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock isValidAmount to return true for valid amounts
    jest.spyOn(validationUtils, 'isValidAmount')
      .mockImplementation(() => true);
    
    // Mock isValidDate to return true for valid dates
    jest.spyOn(validationUtils, 'isValidDate')
      .mockImplementation(() => true);
  });

  it('should validate valid milestones', () => {
    const validMilestones: ProposalMilestoneFormValues[] = [
      {
        title: 'Milestone 1',
        description: 'First phase of the project',
        amount: 1000,
        dueDate: new Date('2023-03-01'),
        order: 1
      },
      {
        title: 'Milestone 2',
        description: 'Second phase of the project',
        amount: 2000,
        dueDate: new Date('2023-04-01'),
        order: 2
      }
    ];

    const result = validationUtils.validateProposalMilestones(validMilestones);
    expect(result.isValid).toBe(true);
    // Errors array should contain empty error objects for valid milestones
    expect(result.errors).toEqual([{}, {}]);
  });

  it('should return errors for missing title or description', () => {
    const invalidMilestones: ProposalMilestoneFormValues[] = [
      {
        title: '', // Missing title
        description: 'First phase',
        amount: 1000,
        dueDate: new Date('2023-03-01'),
        order: 1
      },
      {
        title: 'Milestone 2',
        description: '', // Missing description
        amount: 2000,
        dueDate: new Date('2023-04-01'),
        order: 2
      }
    ];

    const result = validationUtils.validateProposalMilestones(invalidMilestones);
    expect(result.isValid).toBe(false);
    expect(result.errors[0].title).toBeTruthy();
    expect(result.errors[1].description).toBeTruthy();
  });

  it('should validate milestone amounts', () => {
    const invalidAmountMilestone: ProposalMilestoneFormValues[] = [
      {
        title: 'Milestone 1',
        description: 'First phase',
        amount: 0, // Invalid amount
        dueDate: new Date('2023-03-01'),
        order: 1
      }
    ];

    // Mock isValidAmount to return false for this test
    (validationUtils.isValidAmount as jest.Mock).mockReturnValueOnce(false);

    const result = validationUtils.validateProposalMilestones(invalidAmountMilestone);
    expect(result.isValid).toBe(false);
    expect(result.errors[0].amount).toBeTruthy();
  });

  it('should validate milestone due dates', () => {
    const invalidDateMilestone: ProposalMilestoneFormValues[] = [
      {
        title: 'Milestone 1',
        description: 'First phase',
        amount: 1000,
        dueDate: new Date('2020-01-01'), // Date in the past
        order: 1
      }
    ];

    // Mock isValidDate to return false for this test
    (validationUtils.isValidDate as jest.Mock).mockReturnValueOnce(false);

    const result = validationUtils.validateProposalMilestones(invalidDateMilestone);
    expect(result.isValid).toBe(false);
    expect(result.errors[0].dueDate).toBeTruthy();
  });

  it('should handle Android date format', () => {
    const androidDateMilestone: ProposalMilestoneFormValues[] = [
      {
        title: 'Milestone 1',
        description: 'First phase',
        amount: 1000,
        dueDate: new Date('2023-03-01T00:00:00+05:30'), // Android format with timezone
        order: 1
      }
    ];

    const result = validationUtils.validateProposalMilestones(androidDateMilestone);
    expect(result.isValid).toBe(true);
  });
});

describe('validateProfileForm tests', () => {
  const validProfileForm: ProfileFormValues = {
    title: 'AI Engineer',
    bio: 'Experienced machine learning specialist',
    hourlyRate: 75,
    location: 'New York, USA',
    availability: 'available' as any,
    githubUrl: 'https://github.com/aidev',
    linkedinUrl: 'https://linkedin.com/in/aidev',
    kaggleUrl: 'https://kaggle.com/aidev',
    website: 'https://aidev.com',
    skills: [{ name: 'TensorFlow', category: 'Machine Learning', level: 8 }]
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock isValidAmount to return true for valid amounts
    jest.spyOn(validationUtils, 'isValidAmount')
      .mockImplementation(() => true);
    
    // Mock validateUrl to return true for valid URLs
    jest.spyOn(validationUtils, 'validateUrl')
      .mockImplementation(() => true);
  });

  it('should validate a valid profile form', () => {
    const result = validationUtils.validateProfileForm(validProfileForm);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should return errors for missing title or bio', () => {
    const missingTitleForm: ProfileFormValues = {
      ...validProfileForm,
      title: ''
    };

    const missingBioForm: ProfileFormValues = {
      ...validProfileForm,
      bio: ''
    };

    expect(validationUtils.validateProfileForm(missingTitleForm).isValid).toBe(false);
    expect(validationUtils.validateProfileForm(missingTitleForm).errors.title).toBeTruthy();
    
    expect(validationUtils.validateProfileForm(missingBioForm).isValid).toBe(false);
    expect(validationUtils.validateProfileForm(missingBioForm).errors.bio).toBeTruthy();
  });

  it('should validate hourly rate', () => {
    const invalidRateForm: ProfileFormValues = {
      ...validProfileForm,
      hourlyRate: 0 // Invalid rate
    };

    // Mock isValidAmount to return false for this test
    (validationUtils.isValidAmount as jest.Mock).mockReturnValueOnce(false);

    const result = validationUtils.validateProfileForm(invalidRateForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.hourlyRate).toBeTruthy();
  });

  it('should validate skills array', () => {
    const noSkillsForm: ProfileFormValues = {
      ...validProfileForm,
      skills: []
    };

    const result = validationUtils.validateProfileForm(noSkillsForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.skills).toBeTruthy();
  });

  it('should validate URLs if provided', () => {
    const invalidGithubForm: ProfileFormValues = {
      ...validProfileForm,
      githubUrl: 'not-a-valid-url'
    };

    // Mock validateUrl to return false for this test
    (validationUtils.validateUrl as jest.Mock).mockReturnValueOnce(false);

    const result = validationUtils.validateProfileForm(invalidGithubForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.githubUrl).toBeTruthy();
  });
});

describe('validatePortfolioItemForm tests', () => {
  const validPortfolioForm: PortfolioItemFormValues = {
    title: 'AI Recommendation System',
    description: 'Built a recommendation system for e-commerce',
    projectUrl: 'https://project.com',
    githubUrl: 'https://github.com/user/project',
    kaggleUrl: 'https://kaggle.com/user/notebook',
    technologies: ['Python', 'TensorFlow', 'PyTorch'],
    category: 'Machine Learning',
    aiModels: ['Collaborative Filtering', 'Content-Based Filtering'],
    problemSolved: 'Improved product discovery',
    startDate: '2022-01-01',
    endDate: '2022-06-30'
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock validateUrl to return true for valid URLs
    jest.spyOn(validationUtils, 'validateUrl')
      .mockImplementation(() => true);
    
    // Mock isValidDate to return true for valid dates
    jest.spyOn(validationUtils, 'isValidDate')
      .mockImplementation(() => true);
    
    // Mock isValidDateRange to return true for valid date ranges
    jest.spyOn(validationUtils, 'isValidDateRange')
      .mockImplementation(() => true);
  });

  it('should validate a valid portfolio item form', () => {
    const result = validationUtils.validatePortfolioItemForm(validPortfolioForm);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should return errors for missing title or description', () => {
    const missingTitleForm: PortfolioItemFormValues = {
      ...validPortfolioForm,
      title: ''
    };

    const missingDescForm: PortfolioItemFormValues = {
      ...validPortfolioForm,
      description: ''
    };

    expect(validationUtils.validatePortfolioItemForm(missingTitleForm).isValid).toBe(false);
    expect(validationUtils.validatePortfolioItemForm(missingTitleForm).errors.title).toBeTruthy();
    
    expect(validationUtils.validatePortfolioItemForm(missingDescForm).isValid).toBe(false);
    expect(validationUtils.validatePortfolioItemForm(missingDescForm).errors.description).toBeTruthy();
  });

  it('should validate URLs if provided', () => {
    const invalidProjectUrlForm: PortfolioItemFormValues = {
      ...validPortfolioForm,
      projectUrl: 'not-a-valid-url'
    };

    // Mock validateUrl to return false for this test
    (validationUtils.validateUrl as jest.Mock).mockReturnValueOnce(false);

    const result = validationUtils.validatePortfolioItemForm(invalidProjectUrlForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.projectUrl).toBeTruthy();
  });

  it('should validate date range if both dates are provided', () => {
    const invalidDateRangeForm: PortfolioItemFormValues = {
      ...validPortfolioForm,
      startDate: '2023-01-01',
      endDate: '2022-01-01' // End date before start date
    };

    // Mock isValidDate to return true for both dates
    (validationUtils.isValidDate as jest.Mock).mockReturnValueOnce(true).mockReturnValueOnce(true);
    
    // Mock isValidDateRange to return false
    (validationUtils.isValidDateRange as jest.Mock).mockReturnValueOnce(false);

    const result = validationUtils.validatePortfolioItemForm(invalidDateRangeForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.endDate).toBeTruthy();
  });
});

describe('validateExperienceForm tests', () => {
  const validExperienceForm: ExperienceFormValues = {
    title: 'Senior AI Engineer',
    company: 'AI Solutions Inc.',
    location: 'San Francisco, CA',
    description: 'Developed machine learning models for production',
    startDate: '2020-01-01',
    endDate: '2022-12-31',
    isCurrent: false,
    aiTechnologies: ['TensorFlow', 'PyTorch', 'Scikit-learn']
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock isValidDate to return true for valid dates
    jest.spyOn(validationUtils, 'isValidDate')
      .mockImplementation(() => true);
    
    // Mock isValidDateRange to return true for valid date ranges
    jest.spyOn(validationUtils, 'isValidDateRange')
      .mockImplementation(() => true);
  });

  it('should validate a valid experience form', () => {
    const result = validationUtils.validateExperienceForm(validExperienceForm);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should validate a current position without end date', () => {
    const currentPositionForm: ExperienceFormValues = {
      ...validExperienceForm,
      isCurrent: true,
      endDate: '' // No end date for current position
    };

    const result = validationUtils.validateExperienceForm(currentPositionForm);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should return errors for missing required fields', () => {
    const missingFieldsForm: ExperienceFormValues = {
      ...validExperienceForm,
      title: '',
      company: '',
      description: ''
    };

    const result = validationUtils.validateExperienceForm(missingFieldsForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.title).toBeTruthy();
    expect(result.errors.company).toBeTruthy();
    expect(result.errors.description).toBeTruthy();
  });

  it('should validate start date', () => {
    const invalidStartDateForm: ExperienceFormValues = {
      ...validExperienceForm,
      startDate: 'invalid-date'
    };

    // Mock isValidDate to return false for the start date
    (validationUtils.isValidDate as jest.Mock).mockReturnValueOnce(false);

    const result = validationUtils.validateExperienceForm(invalidStartDateForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.startDate).toBeTruthy();
  });

  it('should validate end date when not current position', () => {
    const invalidEndDateForm: ExperienceFormValues = {
      ...validExperienceForm,
      isCurrent: false,
      endDate: 'invalid-date'
    };

    // Mock isValidDate to return true for start date then false for end date
    (validationUtils.isValidDate as jest.Mock).mockReturnValueOnce(true).mockReturnValueOnce(false);

    const result = validationUtils.validateExperienceForm(invalidEndDateForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.endDate).toBeTruthy();
  });

  it('should validate date range when not current position', () => {
    const invalidDateRangeForm: ExperienceFormValues = {
      ...validExperienceForm,
      isCurrent: false,
      startDate: '2022-01-01',
      endDate: '2021-01-01' // End date before start date
    };

    // Mock isValidDate to return true for both dates
    (validationUtils.isValidDate as jest.Mock).mockReturnValueOnce(true).mockReturnValueOnce(true);
    
    // Mock isValidDateRange to return false
    (validationUtils.isValidDateRange as jest.Mock).mockReturnValueOnce(false);

    const result = validationUtils.validateExperienceForm(invalidDateRangeForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.endDate).toBeTruthy();
  });
});

describe('validateEducationForm tests', () => {
  const validEducationForm: EducationFormValues = {
    institution: 'Stanford University',
    degree: 'Master of Science',
    fieldOfStudy: 'Computer Science - AI',
    startDate: '2018-09-01',
    endDate: '2020-06-30',
    isCurrent: false,
    description: 'Focused on machine learning and deep neural networks'
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock isValidDate to return true for valid dates
    jest.spyOn(validationUtils, 'isValidDate')
      .mockImplementation(() => true);
    
    // Mock isValidDateRange to return true for valid date ranges
    jest.spyOn(validationUtils, 'isValidDateRange')
      .mockImplementation(() => true);
  });

  it('should validate a valid education form', () => {
    const result = validationUtils.validateEducationForm(validEducationForm);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should validate current education without end date', () => {
    const currentEducationForm: EducationFormValues = {
      ...validEducationForm,
      isCurrent: true,
      endDate: '' // No end date for current education
    };

    const result = validationUtils.validateEducationForm(currentEducationForm);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should return errors for missing required fields', () => {
    const missingFieldsForm: EducationFormValues = {
      ...validEducationForm,
      institution: '',
      degree: '',
      fieldOfStudy: ''
    };

    const result = validationUtils.validateEducationForm(missingFieldsForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.institution).toBeTruthy();
    expect(result.errors.degree).toBeTruthy();
    expect(result.errors.fieldOfStudy).toBeTruthy();
  });

  it('should validate start date', () => {
    const invalidStartDateForm: EducationFormValues = {
      ...validEducationForm,
      startDate: 'invalid-date'
    };

    // Mock isValidDate to return false for the start date
    (validationUtils.isValidDate as jest.Mock).mockReturnValueOnce(false);

    const result = validationUtils.validateEducationForm(invalidStartDateForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.startDate).toBeTruthy();
  });

  it('should validate end date when not current education', () => {
    const invalidEndDateForm: EducationFormValues = {
      ...validEducationForm,
      isCurrent: false,
      endDate: 'invalid-date'
    };

    // Mock isValidDate to return true for start date then false for end date
    (validationUtils.isValidDate as jest.Mock).mockReturnValueOnce(true).mockReturnValueOnce(false);

    const result = validationUtils.validateEducationForm(invalidEndDateForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.endDate).toBeTruthy();
  });

  it('should validate date range when not current education', () => {
    const invalidDateRangeForm: EducationFormValues = {
      ...validEducationForm,
      isCurrent: false,
      startDate: '2020-01-01',
      endDate: '2019-01-01' // End date before start date
    };

    // Mock isValidDate to return true for both dates
    (validationUtils.isValidDate as jest.Mock).mockReturnValueOnce(true).mockReturnValueOnce(true);
    
    // Mock isValidDateRange to return false
    (validationUtils.isValidDateRange as jest.Mock).mockReturnValueOnce(false);

    const result = validationUtils.validateEducationForm(invalidDateRangeForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.endDate).toBeTruthy();
  });
});

describe('validateCertificationForm tests', () => {
  const validCertificationForm: CertificationFormValues = {
    name: 'TensorFlow Developer Certificate',
    issuingOrganization: 'Google',
    issueDate: '2022-01-15',
    expirationDate: '2025-01-15',
    credentialId: 'TF-12345',
    credentialUrl: 'https://credential.google.com/12345'
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock isValidDate to return true for valid dates
    jest.spyOn(validationUtils, 'isValidDate')
      .mockImplementation(() => true);
    
    // Mock isValidDateRange to return true for valid date ranges
    jest.spyOn(validationUtils, 'isValidDateRange')
      .mockImplementation(() => true);
    
    // Mock validateUrl to return true for valid URLs
    jest.spyOn(validationUtils, 'validateUrl')
      .mockImplementation(() => true);
  });

  it('should validate a valid certification form', () => {
    const result = validationUtils.validateCertificationForm(validCertificationForm);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should validate certification without expiration date', () => {
    const noExpirationForm: CertificationFormValues = {
      ...validCertificationForm,
      expirationDate: '' // No expiration date
    };

    const result = validationUtils.validateCertificationForm(noExpirationForm);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should return errors for missing required fields', () => {
    const missingFieldsForm: CertificationFormValues = {
      ...validCertificationForm,
      name: '',
      issuingOrganization: ''
    };

    const result = validationUtils.validateCertificationForm(missingFieldsForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeTruthy();
    expect(result.errors.issuingOrganization).toBeTruthy();
  });

  it('should validate issue date', () => {
    const invalidIssueDateForm: CertificationFormValues = {
      ...validCertificationForm,
      issueDate: 'invalid-date'
    };

    // Mock isValidDate to return false for the issue date
    (validationUtils.isValidDate as jest.Mock).mockReturnValueOnce(false);

    const result = validationUtils.validateCertificationForm(invalidIssueDateForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.issueDate).toBeTruthy();
  });

  it('should validate expiration date if provided', () => {
    const invalidExpirationDateForm: CertificationFormValues = {
      ...validCertificationForm,
      expirationDate: 'invalid-date'
    };

    // Mock isValidDate to return true for issue date then false for expiration date
    (validationUtils.isValidDate as jest.Mock).mockReturnValueOnce(true).mockReturnValueOnce(false);

    const result = validationUtils.validateCertificationForm(invalidExpirationDateForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.expirationDate).toBeTruthy();
  });

  it('should validate date range if expiration date is provided', () => {
    const invalidDateRangeForm: CertificationFormValues = {
      ...validCertificationForm,
      issueDate: '2022-01-15',
      expirationDate: '2021-01-15' // Expiration date before issue date
    };

    // Mock isValidDate to return true for both dates
    (validationUtils.isValidDate as jest.Mock).mockReturnValueOnce(true).mockReturnValueOnce(true);
    
    // Mock isValidDateRange to return false
    (validationUtils.isValidDateRange as jest.Mock).mockReturnValueOnce(false);

    const result = validationUtils.validateCertificationForm(invalidDateRangeForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.expirationDate).toBeTruthy();
  });

  it('should validate credential URL if provided', () => {
    const invalidUrlForm: CertificationFormValues = {
      ...validCertificationForm,
      credentialUrl: 'not-a-valid-url'
    };

    // Mock validateUrl to return false
    (validationUtils.validateUrl as jest.Mock).mockReturnValueOnce(false);

    const result = validationUtils.validateCertificationForm(invalidUrlForm);
    expect(result.isValid).toBe(false);
    expect(result.errors.credentialUrl).toBeTruthy();
  });
});

describe('REGEX_PATTERNS tests', () => {
  it('should validate email pattern', () => {
    const { EMAIL } = validationUtils.REGEX_PATTERNS;

    // Valid emails
    expect(EMAIL.test('user@example.com')).toBe(true);
    expect(EMAIL.test('user.name@example.co.uk')).toBe(true);
    expect(EMAIL.test('user+tag@sub.domain.com')).toBe(true);

    // Invalid emails
    expect(EMAIL.test('user')).toBe(false);
    expect(EMAIL.test('user@')).toBe(false);
    expect(EMAIL.test('@example.com')).toBe(false);
    expect(EMAIL.test('user@domain')).toBe(false);
  });

  it('should validate password pattern', () => {
    const { PASSWORD } = validationUtils.REGEX_PATTERNS;

    // Valid passwords
    expect(PASSWORD.test('Password1!')).toBe(true);
    expect(PASSWORD.test('Secure123$')).toBe(true);

    // Invalid passwords
    expect(PASSWORD.test('password')).toBe(false); // Missing uppercase, number, special char
    expect(PASSWORD.test('Password')).toBe(false); // Missing number, special char
    expect(PASSWORD.test('Password1')).toBe(false); // Missing special char
    expect(PASSWORD.test('Pass1!')).toBe(false); // Too short
  });

  it('should validate URL pattern', () => {
    const { URL } = validationUtils.REGEX_PATTERNS;

    // Valid URLs
    expect(URL.test('https://example.com')).toBe(true);
    expect(URL.test('http://example.com')).toBe(true);
    expect(URL.test('example.com')).toBe(true);
    expect(URL.test('sub.example.com/path')).toBe(true);

    // Invalid URLs
    expect(URL.test('')).toBe(false);
    expect(URL.test('not a url')).toBe(false);
    expect(URL.test('http://')).toBe(false);
  });

  it('should validate phone pattern', () => {
    const { PHONE } = validationUtils.REGEX_PATTERNS;

    // Valid phone numbers
    expect(PHONE.test('1234567890')).toBe(true);
    expect(PHONE.test('+1234567890')).toBe(true);
    expect(PHONE.test('12345678901')).toBe(true);

    // Invalid phone numbers
    expect(PHONE.test('')).toBe(false);
    expect(PHONE.test('123456')).toBe(false); // Too short
    expect(PHONE.test('123-456-7890')).toBe(false); // Contains hyphens
    expect(PHONE.test('abcdefghij')).toBe(false); // Contains letters
  });
});

describe('FILE_UPLOAD_LIMITS tests', () => {
  it('should have appropriate MAX_FILE_SIZE value', () => {
    expect(validationUtils.FILE_UPLOAD_LIMITS.MAX_FILE_SIZE).toBe(10 * 1024 * 1024); // 10MB
    expect(validationUtils.FILE_UPLOAD_LIMITS.MAX_FILE_SIZE).toBeGreaterThan(1024 * 1024); // At least 1MB
  });

  it('should include common file types in ALLOWED_FILE_TYPES', () => {
    const types = validationUtils.FILE_UPLOAD_LIMITS.ALLOWED_FILE_TYPES;
    
    // Common image formats
    expect(types).toContain('image/jpeg');
    expect(types).toContain('image/png');
    expect(types).toContain('image/gif');
    
    // Document formats
    expect(types).toContain('application/pdf');
    expect(types).toContain('application/json');
    expect(types).toContain('text/plain');
    
    // Python notebook format
    expect(types).toContain('application/x-ipynb+json');
  });

  it('should have reasonable MAX_FILES_PER_REQUEST value', () => {
    expect(validationUtils.FILE_UPLOAD_LIMITS.MAX_FILES_PER_REQUEST).toBeGreaterThanOrEqual(1);
    expect(validationUtils.FILE_UPLOAD_LIMITS.MAX_FILES_PER_REQUEST).toBeLessThanOrEqual(10);
  });

  it('should include Android content URI formats', () => {
    const uris = validationUtils.FILE_UPLOAD_LIMITS.ANDROID_CONTENT_URIS;
    
    expect(uris).toContain('content://');
    expect(uris).toContain('file://');
    expect(uris).toContain('/storage/');
    expect(uris).toContain('/sdcard/');
  });
});

describe('ANDROID_MIME_TYPES tests', () => {
  it('should have correct MIME type values', () => {
    const types = validationUtils.ANDROID_MIME_TYPES;
    
    expect(types.CAMERA_JPEG).toBe('image/jpeg');
    expect(types.GALLERY_JPEG).toBe('image/jpeg');
    expect(types.GALLERY_PNG).toBe('image/png');
    expect(types.DOCUMENT_PDF).toBe('application/pdf');
    expect(types.DOCUMENT_JSON).toBe('application/json');
    expect(types.DOCUMENT_TEXT).toBe('text/plain');
  });

  it('should match standard MIME type format', () => {
    const mimeTypePattern = /^[a-z]+\/[a-z0-9.+-]+$/;
    
    Object.values(validationUtils.ANDROID_MIME_TYPES).forEach(mimeType => {
      expect(mimeTypePattern.test(mimeType)).toBe(true);
    });
  });
});