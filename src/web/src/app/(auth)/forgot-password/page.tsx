'use client';

import { useState, useEffect } from 'react'; // React v18.2.0
import { useForm } from 'react-hook-form'; // ^7.46.1
import { FiMail } from 'react-icons/fi'; // ^4.10.1
import Link from 'next/link'; // latest

import Input, { InputType } from '../../../components/common/Input';
import Button, { ButtonVariant } from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import useAuth from '../../../hooks/useAuth';
import useToast from '../../../hooks/useToast';
import { validateForm } from '../../../lib/validation';
import { authSchemas } from '../../../lib/validation';

/**
 * ForgotPasswordPage - A page component that allows users to request a password reset
 * by entering their email address.
 */
const ForgotPasswordPage = (): JSX.Element => {
  // Initialize form handling with react-hook-form
  const { register, handleSubmit, formState: { errors } } = useForm();
  
  // Get auth-related functions and state from useAuth hook
  const { forgotPassword, isLoading, error, clearError } = useAuth();
  
  // Get toast notification functions
  const toast = useToast();
  
  // State to track if form was successfully submitted
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Clear any auth errors when component mounts
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [error, clearError]);

  /**
   * Handles form submission for password reset request
   * @param formData - The form data containing email
   */
  const onSubmit = async (formData: any) => {
    // Validate form data against forgot password schema
    const validation = validateForm(formData, authSchemas.forgotPasswordSchema);
    
    if (!validation.success) {
      // Handle validation errors
      Object.entries(validation.errors || {}).forEach(([field, message]) => {
        toast.error(message as string);
      });
      return;
    }

    try {
      // Submit password reset request
      await forgotPassword(formData);
      
      // Show success message and update state
      toast.success('Password reset instructions sent to your email address');
      setIsSuccess(true);
    } catch (err) {
      // If there's an error from the API, it will be handled by the useAuth hook
      // Additional error handling if needed
      if (!error) {
        toast.error('Failed to send password reset request. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-gray-50">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Forgot Password</h1>
          {!isSuccess && (
            <p className="mt-2 text-gray-600">
              Enter your email address and we'll send you instructions to reset your password.
            </p>
          )}
        </div>

        {!isSuccess ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Input
                type={InputType.EMAIL}
                name="email"
                label="Email address"
                placeholder="Enter your email"
                prefix={<FiMail className="text-gray-500" />}
                error={errors.email?.message as string}
                required
                {...register('email', { required: 'Email is required' })}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 mt-1" role="alert">
                {error}
              </div>
            )}

            <div className="mt-6">
              <Button
                type="submit"
                variant={ButtonVariant.PRIMARY}
                isFullWidth
                isLoading={isLoading}
              >
                Request Password Reset
              </Button>
            </div>

            <div className="text-center mt-4">
              <Link 
                href="/login" 
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Back to login
              </Link>
            </div>
          </form>
        ) : (
          <div className="text-center">
            <div className="mb-6 p-3 bg-green-50 text-green-800 rounded-md">
              <p>
                We've sent password reset instructions to your email address. 
                Please check your inbox and follow the instructions to reset your password.
              </p>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              If you don't receive an email within a few minutes, please check your spam folder 
              or try again.
            </p>
            <Link 
              href="/login" 
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Return to login
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;