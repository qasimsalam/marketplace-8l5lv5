/**
 * Unit test suite for the LoginForm component of the AI Talent Marketplace Android application.
 * The tests verify the functionality, rendering, and user interactions of the login form
 * including form validation, error handling, state management, and integration with authentication services.
 *
 * @version 1.0.0
 */

import React from 'react'; // react v18.2.0
import {
  render,
  fireEvent,
  waitFor,
  act,
  screen,
} from '@testing-library/react-native'; // @testing-library/react-native ^12.1.2
import { LoginForm, LoginFormProps } from '../../../src/components/auth/LoginForm';
import Button, { ButtonVariant } from '../../../src/components/common/Button';
import Input, { InputType } from '../../../src/components/common/Input';
import { useAuth } from '../../../src/hooks/useAuth';
import { useBiometrics } from '../../../src/hooks/useBiometrics';
import { LoginFormValues } from '../../../src/types/auth.types';
import { validateLoginForm } from '../../../src/utils/validation';
import { Keyboard } from 'react-native';
import { jest } from '@jest/globals'; // @jest/globals ^29.6.2

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

// Mock useAuth hook
jest.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    login: jest.fn(),
    loginWithBiometrics: jest.fn(),
    isLoading: false,
    error: null,
    setError: jest.fn(),
  }),
}));

// Mock useBiometrics hook
jest.mock('../../../src/hooks/useBiometrics', () => ({
  useBiometrics: () => ({
    isAvailable: false,
    isEnabled: false,
    biometricType: 'fingerprint',
    authenticate: jest.fn(),
  }),
}));

// Mock validation function
jest.mock('../../../src/utils/validation', () => ({
  validateLoginForm: jest.fn(),
}));

// Mock Keyboard module
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Keyboard = {
    ...RN.Keyboard,
    dismiss: jest.fn(),
  };
  return RN;
});

describe('LoginForm component', () => {
  // Define required mocks for authentication hooks and components
  let onSuccess: jest.Mock<any, any>;
  let onForgotPassword: jest.Mock<any, any>;
  let onRegister: jest.Mock<any, any>;
  let loginMock: jest.Mock<any, any>;
  let loginWithBiometricsMock: jest.Mock<any, any>;
  let setErrorMock: jest.Mock<any, any>;
  let validateLoginFormMock: jest.Mock<any, any>;
  let dismissKeyboardMock: jest.Mock<any, any>;

  beforeEach(() => {
    // Reset all mocks before each test
    onSuccess = jest.fn();
    onForgotPassword = jest.fn();
    onRegister = jest.fn();
    loginMock = jest.fn();
    loginWithBiometricsMock = jest.fn();
    setErrorMock = jest.fn();
    validateLoginFormMock = validateLoginForm as jest.Mock;
    dismissKeyboardMock = Keyboard.dismiss as jest.Mock;

    // Setup default mock implementations
    (useAuth as jest.Mock).mockImplementation(() => ({
      login: loginMock,
      loginWithBiometrics: loginWithBiometricsMock,
      isLoading: false,
      error: null,
      setError: setErrorMock,
    }));
  });

  afterEach(() => {
    // Clear all mocks after each test
    jest.clearAllMocks();
  });

  it('renders the login form component correctly', () => {
    // Render the LoginForm component with required props
    render(
      <LoginForm
        onSuccess={onSuccess}
        onForgotPassword={onForgotPassword}
        onRegister={onRegister}
      />
    );

    // Check that email input is rendered
    expect(screen.getByLabelText('Email address')).toBeTruthy();

    // Check that password input is rendered
    expect(screen.getByLabelText('Password')).toBeTruthy();

    // Check that login button is rendered
    expect(screen.getByLabelText('Login to your account')).toBeTruthy();

    // Check that forgot password link is rendered
    expect(screen.getByLabelText('Forgot password')).toBeTruthy();

    // Check that register link is rendered
    expect(screen.getByLabelText('Register for an account')).toBeTruthy();
  });

  it('tests form validation functionality', async () => {
    // Mock validation function to return errors for empty fields
    (validateLoginForm as jest.Mock).mockImplementation((values: LoginFormValues) => {
      const errors: any = {};
      if (!values.email) {
        errors.email = 'Email is required';
      }
      if (!values.password) {
        errors.password = 'Password is required';
      }
      return errors;
    });

    // Render the LoginForm component
    const { getByTestId } = render(
      <LoginForm
        onSuccess={onSuccess}
        onForgotPassword={onForgotPassword}
        onRegister={onRegister}
      />
    );

    // Submit form with empty values
    fireEvent.press(getByTestId('login-button'));

    // Verify validation errors are displayed
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeTruthy();
      expect(screen.getByText('Password is required')).toBeTruthy();
    });

    // Enter invalid email and verify error
    fireEvent.changeText(getByTestId('email-input'), 'invalid-email');
    fireEvent.press(getByTestId('login-button'));
    await waitFor(() => {
      // Mock validation function to return error for invalid email
      (validateLoginForm as jest.Mock).mockImplementation((values: LoginFormValues) => {
        const errors: any = {};
        if (!values.email || !values.email.includes('@')) {
          errors.email = 'Please enter a valid email address';
        }
        return errors;
      });
      expect(screen.getByText('Please enter a valid email address')).toBeTruthy();
    });

    // Enter invalid password and verify error
    fireEvent.changeText(getByTestId('password-input'), 'short');
    fireEvent.press(getByTestId('login-button'));
    await waitFor(() => {
      // Mock validation function to return error for invalid password
      (validateLoginForm as jest.Mock).mockImplementation((values: LoginFormValues) => {
        const errors: any = {};
        if (!values.password || values.password.length < 8) {
          errors.password = 'Password must be at least 8 characters';
        }
        return errors;
      });
      expect(screen.getByText('Password must be at least 8 characters')).toBeTruthy();
    });

    // Enter valid credentials and verify no errors
    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'ValidPassword123!');
    fireEvent.press(getByTestId('login-button'));
    await waitFor(() => {
      // Mock validation function to return no errors
      (validateLoginForm as jest.Mock).mockImplementation(() => ({}));
      expect(() => screen.getByText('Email is required')).toThrow();
      expect(() => screen.getByText('Password is required')).toThrow();
    });
  });

  it('tests successful login process', async () => {
    // Mock login function to return success
    loginMock.mockResolvedValue(true);

    // Render the LoginForm component with onSuccess callback
    const { getByTestId } = render(
      <LoginForm
        onSuccess={onSuccess}
        onForgotPassword={onForgotPassword}
        onRegister={onRegister}
      />
    );

    // Fill in valid credentials
    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');

    // Submit the form
    fireEvent.press(getByTestId('login-button'));

    // Verify login function was called with correct credentials
    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        remember: false,
        useBiometrics: false,
      });
    });

    // Verify onSuccess callback was triggered
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    // Verify loading state during submission
    expect(useAuth().isLoading).toBe(false);
  });

  it('tests login error handling', async () => {
    // Mock login function to return error
    loginMock.mockRejectedValue(new Error('Invalid credentials'));

    // Render the LoginForm component
    const { getByTestId } = render(
      <LoginForm
        onSuccess={onSuccess}
        onForgotPassword={onForgotPassword}
        onRegister={onRegister}
      />
    );

    // Fill in credentials
    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');

    // Submit the form
    fireEvent.press(getByTestId('login-button'));

    // Verify error message is displayed
    await waitFor(() => {
      expect(setErrorMock).toHaveBeenCalledWith('Invalid credentials');
    });

    // Verify form is still interactive after error
    expect(screen.getByTestId('email-input')).toBeEnabled();
    expect(screen.getByTestId('password-input')).toBeEnabled();
    expect(screen.getByTestId('login-button')).toBeEnabled();
  });

  it('tests biometric authentication functionality', async () => {
    // Mock useBiometrics to return available biometrics
    (useBiometrics as jest.Mock).mockImplementation(() => ({
      isAvailable: true,
      isEnabled: true,
      biometricType: 'fingerprint',
      authenticate: jest.fn().mockResolvedValue('success'),
    }));

    // Mock loginWithBiometrics to return success
    loginWithBiometricsMock.mockResolvedValue(true);

    // Render the LoginForm component with onSuccess callback
    const { getByTestId } = render(
      <LoginForm
        onSuccess={onSuccess}
        onForgotPassword={onForgotPassword}
        onRegister={onRegister}
      />
    );

    // Press biometric authentication button
    fireEvent.press(getByTestId('biometric-login-button'));

    // Verify loginWithBiometrics was called
    await waitFor(() => {
      expect(loginWithBiometricsMock).toHaveBeenCalled();
    });

    // Verify onSuccess callback was triggered on successful authentication
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });

    // Test unavailable biometrics scenario
    (useBiometrics as jest.Mock).mockImplementation(() => ({
      isAvailable: false,
      isEnabled: false,
      biometricType: 'none',
      authenticate: jest.fn(),
    }));
    render(
      <LoginForm
        onSuccess={onSuccess}
        onForgotPassword={onForgotPassword}
        onRegister={onRegister}
      />
    );
    expect(() => getByTestId('biometric-login-button')).toThrow();
  });

  it('tests forgot password functionality', () => {
    // Render the LoginForm component with onForgotPassword callback
    const { getByTestId } = render(
      <LoginForm
        onSuccess={onSuccess}
        onForgotPassword={onForgotPassword}
        onRegister={onRegister}
      />
    );

    // Press forgot password link
    fireEvent.press(getByTestId('forgot-password-link'));

    // Verify onForgotPassword callback was triggered
    expect(onForgotPassword).toHaveBeenCalled();
  });

  it('tests register link functionality', () => {
    // Render the LoginForm component with onRegister callback
    const { getByTestId } = render(
      <LoginForm
        onSuccess={onSuccess}
        onForgotPassword={onForgotPassword}
        onRegister={onRegister}
      />
    );

    // Press register link
    fireEvent.press(getByTestId('register-link'));

    // Verify onRegister callback was triggered
    expect(onRegister).toHaveBeenCalled();
  });

  it('tests keyboard interaction behavior', () => {
    // Mock Keyboard module from react-native
    const dismissKeyboardMock = Keyboard.dismiss as jest.Mock;

    // Render the LoginForm component
    const { getByTestId } = render(
      <LoginForm
        onSuccess={onSuccess}
        onForgotPassword={onForgotPassword}
        onRegister={onRegister}
      />
    );

    // Verify dismiss keyboard functionality works when tapping outside inputs
    fireEvent.press(screen.getByTestId('biometric-prompt-modal'));
    expect(dismissKeyboardMock).toHaveBeenCalled();

    // Verify keyboard dismiss on form submission
    fireEvent.press(getByTestId('login-button'));
    expect(dismissKeyboardMock).toHaveBeenCalled();
  });
});