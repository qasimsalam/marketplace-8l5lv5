import { useState, useEffect } from 'react'; // ^18.0.0
import { useForm } from 'react-hook-form'; // ^7.46.1
import { FiLock } from 'react-icons/fi'; // ^4.10.1

import { ResetPasswordFormValues } from '../../types/auth';
import Input, { InputType } from '../common/Input';
import Button, { ButtonVariant } from '../common/Button';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import { validateForm } from '../../lib/validation';
import { authSchemas } from '../../lib/validation';
import { isPassword, isMatch } from '../../utils/validation';

/**
 * Props interface for the PasswordResetForm component
 */
export interface PasswordResetFormProps {
  /** Reset token received via email/URL */
  token: string;
  /** Callback function to execute when password is successfully reset */
  onSuccess: () => void;
}

/**
 * Form component that allows users to reset their password after receiving a reset token
 * Implements secure password reset with comprehensive validation and error handling
 */
const PasswordResetForm = ({ token, onSuccess }: PasswordResetFormProps): JSX.Element => {
  // Initialize form with react-hook-form
  const { register, handleSubmit, formState: { errors }, setError, watch } = useForm<ResetPasswordFormValues>({
    defaultValues: {
      token
    }
  });

  // Get auth methods and state from the useAuth hook
  const { resetPassword, isLoading, error, clearError } = useAuth();

  // Initialize toast notifications
  const toast = useToast();

  // State for password visibility
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Clear auth errors when component unmounts or when token changes
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [token, clearError]);

  // Password visibility toggle functions
  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword((prev) => !prev);

  /**
   * Handle form submission
   */
  const onSubmit = async (data: ResetPasswordFormValues) => {
    // Clear any previous errors
    clearError();

    // Validate the form data
    const validation = validateForm<ResetPasswordFormValues>(data, authSchemas.resetPasswordSchema);
    
    if (!validation.success) {
      // Display validation errors
      if (validation.errors) {
        Object.entries(validation.errors).forEach(([field, message]) => {
          setError(field as keyof ResetPasswordFormValues, { 
            type: 'manual', 
            message 
          });
        });
      }
      return;
    }

    // Manually check that passwords match
    if (!isMatch(data.password, data.confirmPassword)) {
      setError('confirmPassword', {
        type: 'manual',
        message: 'Passwords do not match'
      });
      return;
    }

    // Manually check password strength
    if (!isPassword(data.password)) {
      setError('password', {
        type: 'manual',
        message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character'
      });
      return;
    }

    try {
      // Call the resetPassword function from useAuth
      await resetPassword(data);
      
      // Display success message
      toast.success('Your password has been reset successfully. You can now log in with your new password.');
      
      // Execute onSuccess callback
      onSuccess();
    } catch (err) {
      // Error will be handled by the useAuth hook and displayed below
      console.error('Password reset failed:', err);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit(onSubmit)} 
      className="space-y-6 w-full max-w-md"
      noValidate
    >
      <div className="space-y-4">
        {/* Hidden token field */}
        <input 
          type="hidden"
          {...register('token')}
        />

        {/* New Password Input */}
        <div className="space-y-1">
          <Input
            type={showPassword ? InputType.TEXT : InputType.PASSWORD}
            label="New Password"
            placeholder="Enter your new password"
            {...register('password')}
            error={errors.password?.message}
            required
            prefix={<FiLock className="text-gray-500" />}
            suffix={
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="focus:outline-none"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            }
          />
        </div>

        {/* Confirm Password Input */}
        <div className="space-y-1">
          <Input
            type={showConfirmPassword ? InputType.TEXT : InputType.PASSWORD}
            label="Confirm Password"
            placeholder="Confirm your new password"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
            required
            prefix={<FiLock className="text-gray-500" />}
            suffix={
              <button
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                className="focus:outline-none"
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            }
          />
        </div>

        {/* Password requirements helper text */}
        <div className="text-xs text-gray-500">
          <p>Password must:</p>
          <ul className="list-disc pl-5">
            <li>Be at least 8 characters long</li>
            <li>Include at least one uppercase letter</li>
            <li>Include at least one lowercase letter</li>
            <li>Include at least one number</li>
            <li>Include at least one special character (@$!%*?&)</li>
          </ul>
        </div>
      </div>

      {/* Error message from auth state */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
          <p>{error}</p>
        </div>
      )}
      
      {/* Submit button */}
      <Button
        type="submit"
        variant={ButtonVariant.PRIMARY}
        isLoading={isLoading}
        isFullWidth
      >
        Reset Password
      </Button>
    </form>
  );
};

export default PasswordResetForm;