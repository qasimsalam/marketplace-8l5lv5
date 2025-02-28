import React from 'react'; // ^18.2.0
import { render, fireEvent, waitFor, act } from '@testing-library/react-native'; // ^12.0.0
import { expect, describe, it, beforeEach, jest } from '@jest/globals'; // ^29.6.2

// Internal imports
import LoginForm, { LoginFormProps } from '../../../src/components/auth/LoginForm';
import useAuth from '../../../src/hooks/useAuth';
import useBiometrics from '../../../src/hooks/useBiometrics';
import { validateLoginForm } from '../../../src/utils/validation';
import { BiometricType } from '../../../src/types/auth.types';

// Mock functions for testing
const mockOnSuccess = jest.fn();
const mockOnForgotPassword = jest.fn();
const mockOnRegister = jest.fn();
const mockLoginFn = jest.fn(() => Promise.resolve());
const mockLoginWithBiometricsFn = jest.fn(() => Promise.resolve());
const mockClearErrorFn = jest.fn();

// Mock the useAuth hook
jest.mock('../../../src/hooks/useAuth', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    login: mockLoginFn,
    loginWithBiometrics: mockLoginWithBiometricsFn,
    error: null,
    loading: false,
    clearError: mockClearErrorFn,
  })),
}));

// Mock the useBiometrics hook
jest.mock('../../../src/hooks/useBiometrics', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isAvailable: false,
    biometricType: BiometricType.FACE,
  })),
}));

// Mock the validation function
jest.mock('../../../src/utils/validation', () => ({
  __esModule: true,
  validateLoginForm: jest.fn(() => ({ isValid: true, errors: {} })),
}));

describe('LoginForm component', () => {
  beforeEach(() => {
    // Reset all mock functions before each test
    mockLoginFn.mockClear();
    mockLoginWithBiometricsFn.mockClear();
    mockOnSuccess.mockClear();
    mockOnForgotPassword.mockClear();
    mockOnRegister.mockClear();
    mockClearErrorFn.mockClear();

    // Reset mock implementation for hooks
    (useAuth as jest.Mock).mockImplementation(() => ({
      login: mockLoginFn,
      loginWithBiometrics: mockLoginWithBiometricsFn,
      error: null,
      loading: false,
      clearError: mockClearErrorFn,
    }));
    (useBiometrics as jest.Mock).mockImplementation(() => ({
      isAvailable: false,
      biometricType: BiometricType.FACE,
    }));
    (validateLoginForm as jest.Mock).mockImplementation(() => ({ isValid: true, errors: {} }));
  });

  describe('Rendering', () => {
    it('should render login form with all elements', () => {
      const { getByPlaceholderText, getByText, getByTestId } = render(
        <LoginForm onSuccess={mockOnSuccess} onForgotPassword={mockOnForgotPassword} onRegister={mockOnRegister} />
      );

      expect(getByPlaceholderText('Enter your email')).toBeTruthy();
      expect(getByPlaceholderText('Enter your password')).toBeTruthy();
      expect(getByText('Login')).toBeTruthy();
      expect(getByText('Forgot password?')).toBeTruthy();
      expect(getByText('Register')).toBeTruthy();
      expect(getByTestId('login-form')).toBeTruthy();
    });
  });

  describe('Validation', () => {
    it('should call login with form values when submitted', async () => {
      const { getByPlaceholderText, getByText } = render(
        <LoginForm onSuccess={mockOnSuccess} onForgotPassword={mockOnForgotPassword} onRegister={mockOnRegister} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Login');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'P@$$wOrd');

      act(() => {
        fireEvent.press(loginButton);
      });

      await waitFor(() => {
        expect(mockLoginFn).toHaveBeenCalledWith({ email: 'test@example.com', password: 'P@$$wOrd', remember: false, useBiometrics: false });
      });
    });

    it('should show validation errors for invalid inputs', async () => {
      (validateLoginForm as jest.Mock).mockImplementation(() => ({
        isValid: false,
        errors: {
          email: 'Invalid email',
          password: 'Invalid password',
        },
      }));

      const { getByPlaceholderText, getByText, getByTestId } = render(
        <LoginForm onSuccess={mockOnSuccess} onForgotPassword={mockOnForgotPassword} onRegister={mockOnRegister} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Login');

      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent.changeText(passwordInput, 'short');

      act(() => {
        fireEvent.press(loginButton);
      });

      await waitFor(() => {
        expect(getByTestId('login-form-email-input-error')).toBeTruthy();
        expect(getByTestId('login-form-password-input-error')).toBeTruthy();
      });
    });
  });

  describe('Authentication', () => {
    it('should call onSuccess after successful login', async () => {
      const { getByPlaceholderText, getByText } = render(
        <LoginForm onSuccess={mockOnSuccess} onForgotPassword={mockOnForgotPassword} onRegister={mockOnRegister} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Login');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'P@$$wOrd');

      act(() => {
        fireEvent.press(loginButton);
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Biometric Authentication', () => {
    it('should trigger biometric authentication when available', async () => {
      (useBiometrics as jest.Mock).mockImplementation(() => ({
        isAvailable: true,
        biometricType: BiometricType.FACE,
      }));

      const { getByText } = render(
        <LoginForm onSuccess={mockOnSuccess} onForgotPassword={mockOnForgotPassword} onRegister={mockOnRegister} />
      );

      const biometricButton = getByText('Login with face');

      act(() => {
        fireEvent.press(biometricButton);
      });

      await waitFor(() => {
        expect(mockLoginWithBiometricsFn).toHaveBeenCalled();
      });
    });
  });

  describe('User Interactions', () => {
    it('should trigger biometric authentication when available', async () => {
      (useBiometrics as jest.Mock).mockImplementation(() => ({
        isAvailable: true,
        biometricType: BiometricType.FACE,
      }));

      const { getByText } = render(
        <LoginForm onSuccess={mockOnSuccess} onForgotPassword={mockOnForgotPassword} onRegister={mockOnRegister} />
      );

      const biometricButton = getByText('Login with face');

      act(() => {
        fireEvent.press(biometricButton);
      });

      await waitFor(() => {
        expect(mockLoginWithBiometricsFn).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should trigger biometric authentication when available', async () => {
      (useBiometrics as jest.Mock).mockImplementation(() => ({
        isAvailable: true,
        biometricType: BiometricType.FACE,
      }));

      const { getByText } = render(
        <LoginForm onSuccess={mockOnSuccess} onForgotPassword={mockOnForgotPassword} onRegister={mockOnRegister} />
      );

      const biometricButton = getByText('Login with face');

      act(() => {
        fireEvent.press(biometricButton);
      });

      await waitFor(() => {
        expect(mockLoginWithBiometricsFn).toHaveBeenCalled();
      });
    });
  });

  it('should display auth errors from the useAuth hook', async () => {
    (useAuth as jest.Mock).mockImplementation(() => ({
      login: mockLoginFn,
      loginWithBiometrics: mockLoginWithBiometricsFn,
      error: 'Invalid credentials',
      loading: false,
      clearError: mockClearErrorFn,
    }));

    const { getByText, getByPlaceholderText } = render(
      <LoginForm onSuccess={mockOnSuccess} onForgotPassword={mockOnForgotPassword} onRegister={mockOnRegister} />
    );

    await waitFor(() => {
      expect(getByText('Invalid credentials')).toBeTruthy();
    });

    const emailInput = getByPlaceholderText('Enter your email');
    fireEvent.changeText(emailInput, 'test@example.com');

    await waitFor(() => {
      expect(mockClearErrorFn).toHaveBeenCalled();
    });
  });
});