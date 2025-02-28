import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // ^14.0.0
import userEvent from '@testing-library/user-event'; // ^14.4.3
import { renderHook } from '@testing-library/react-hooks'; // ^8.0.1
import LoginForm from '../../../src/components/auth/LoginForm';
import useAuth from '../../../src/hooks/useAuth';
import { LoginFormValues } from '../../../src/types/auth';

// Mock the useAuth hook
jest.mock('../../../src/hooks/useAuth');

// Mock functions for form submission
const mockLoginFn = jest.fn();
const mockClearErrorFn = jest.fn();

/**
 * Helper function to render the LoginForm component with mocked auth hook
 * @param props - Component props
 * @returns Rendered component utilities from React Testing Library
 */
const renderLoginForm = (props = {}) => {
  // Set up the mock implementation for useAuth
  (useAuth as jest.Mock).mockReturnValue({
    login: mockLoginFn,
    isLoading: false,
    error: null,
    clearError: mockClearErrorFn
  });
  
  return render(<LoginForm {...props} />);
};

describe('LoginForm Component', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login form with all required fields', () => {
    renderLoginForm();
    
    // Check for email input
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    
    // Check for password input
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    
    // Check for remember me checkbox
    expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
    
    // Check for login button
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('displays form validation errors for invalid inputs', async () => {
    renderLoginForm();
    
    // Submit form with empty fields
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Check for required field errors
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
    
    // Test email format validation
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'invalid-email' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  test('toggles password visibility when show/hide button is clicked', () => {
    renderLoginForm();
    
    const passwordInput = screen.getByLabelText(/password/i);
    
    // Password should be hidden by default
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Find and click the show password button
    const passwordToggleButton = screen.getByRole('button', { 
      name: /show password/i 
    });
    fireEvent.click(passwordToggleButton);
    
    // Password should now be visible
    expect(passwordInput).toHaveAttribute('type', 'text');
    
    // Click the hide password button
    const hidePasswordButton = screen.getByRole('button', { 
      name: /hide password/i 
    });
    fireEvent.click(hidePasswordButton);
    
    // Password should be hidden again
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('submits the form with valid data', async () => {
    renderLoginForm();
    
    // Fill in valid email
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' }
    });
    
    // Fill in valid password
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });
    
    // Check remember me checkbox
    fireEvent.click(screen.getByLabelText(/remember me/i));
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Verify login function was called with correct values
    await waitFor(() => {
      expect(mockLoginFn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        remember: true
      });
    });
  });

  test('shows loading state during form submission', () => {
    // Mock loading state
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLoginFn,
      isLoading: true,
      error: null,
      clearError: mockClearErrorFn
    });
    
    render(<LoginForm />);
    
    // Check if submit button shows loading spinner
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    expect(submitButton).toBeDisabled();
    
    // Verify loading spinner is visible
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  test('displays authentication error from the auth hook', () => {
    // Mock error state
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLoginFn,
      isLoading: false,
      error: 'Invalid credentials',
      clearError: mockClearErrorFn
    });
    
    const { unmount } = render(<LoginForm />);
    
    // Check if error message is displayed
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
    
    // Unmount component
    unmount();
    
    // Verify clearError is called when component unmounts
    expect(mockClearErrorFn).toHaveBeenCalled();
  });

  test('clears auth error when form input changes', () => {
    // Mock error state
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLoginFn,
      isLoading: false,
      error: 'Invalid credentials',
      clearError: mockClearErrorFn
    });
    
    render(<LoginForm />);
    
    // Change value in email input
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'new@example.com' }
    });
    
    // Verify clearError function was called
    expect(mockClearErrorFn).toHaveBeenCalled();
  });

  test('redirects on successful login when onSuccess prop is provided', async () => {
    const mockOnSuccess = jest.fn();
    renderLoginForm({ onSuccess: mockOnSuccess });
    
    // Mock successful login response
    mockLoginFn.mockResolvedValueOnce({ user: { id: '1' } });
    
    // Fill in valid credentials and submit form
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'test@example.com' }
    });
    
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Verify onSuccess callback was called
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  test('renders social login buttons when showSocialLogin is true', () => {
    // Save original window.location
    const originalHref = window.location.href;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { href: originalHref }
    });
    
    renderLoginForm({ showSocialLogin: true });
    
    // Check for GitHub login button
    const githubButton = screen.getByRole('button', { name: /github/i });
    expect(githubButton).toBeInTheDocument();
    
    // Check for LinkedIn login button
    const linkedinButton = screen.getByRole('button', { name: /linkedin/i });
    expect(linkedinButton).toBeInTheDocument();
    
    // Click GitHub login button
    fireEvent.click(githubButton);
    
    // Verify correct redirect
    expect(window.location.href).toBe('/api/auth/github');
    
    // Restore window.location
    window.location.href = originalHref;
  });

  test('provides link to forgot password page', () => {
    renderLoginForm();
    
    const forgotPasswordLink = screen.getByText(/forgot password\?/i);
    expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
  });

  test('provides link to register page for new users', () => {
    renderLoginForm();
    
    const registerLink = screen.getByText(/sign up/i);
    expect(registerLink).toHaveAttribute('href', '/register');
  });
});