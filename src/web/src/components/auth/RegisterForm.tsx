import React, { useState, useEffect } from 'react'; // ^18.0.0
import { useForm } from 'react-hook-form'; // ^7.46.1
import Link from 'next/link'; // 13.x
import { FiMail, FiLock, FiUser, FiUsers, FiBriefcase } from 'react-icons/fi'; // ^4.10.1

import { RegisterFormValues } from '../../types/auth';
import { UserRole } from '../../../backend/shared/src/types/user.types';
import Input, { InputType } from '../common/Input';
import Button, { ButtonVariant } from '../common/Button';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import { validateForm } from '../../lib/validation';
import { authSchemas } from '../../lib/validation';
import { isEmail, isPassword, isRequired, isMatch } from '../../utils/validation';

/**
 * Props interface for the RegisterForm component
 */
export interface RegisterFormProps {
  /**
   * Callback function to execute upon successful registration
   */
  onSuccess?: () => void;
  /**
   * Path to redirect to after successful registration
   */
  redirectPath?: string;
}

/**
 * RegisterForm component for user registration on the AI Talent Marketplace
 * 
 * Provides comprehensive form with validation for:
 * - Email and password with strong password requirements
 * - First and last name capture
 * - Role selection (Employer or Freelancer)
 * - Terms agreement
 * 
 * Includes real-time validation and error feedback with accessible form elements.
 */
const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, redirectPath = '/dashboard' }) => {
  // Set up form handling with react-hook-form
  const { register, handleSubmit, watch, formState: { errors }, setError, clearErrors } = useForm<RegisterFormValues>({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      role: UserRole.FREELANCER,
      agreeToTerms: false
    }
  });

  // Get authentication functions and state from auth hook
  const { register: registerUser, isLoading, error, clearError } = useAuth();
  
  // Set up toast notifications
  const toast = useToast();
  
  // State for password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Clear form errors when auth error changes
  useEffect(() => {
    if (error) {
      // If the error relates to a specific field, set error on that field
      if (error.includes('email already exists') || error.includes('email already registered')) {
        setError('email', { 
          type: 'manual',
          message: 'Email is already registered. Please use a different email or try logging in.' 
        });
      } else {
        // Otherwise, it's a general form error
        setError('root.serverError', { 
          type: 'manual',
          message: error 
        });
      }
    }
    
    return () => {
      clearErrors('root.serverError');
    };
  }, [error, setError, clearErrors]);

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Toggle confirm password visibility
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  /**
   * Form submission handler
   * Validates inputs and attempts to register the user
   */
  const onSubmit = async (data: RegisterFormValues) => {
    // Clear any previous errors
    clearError();
    
    // Validate using the validation schema
    const validationResult = validateForm<RegisterFormValues>(data, authSchemas.registerSchema);
    
    if (!validationResult.success) {
      // Set errors from schema validation
      Object.entries(validationResult.errors || {}).forEach(([field, message]) => {
        if (field !== '_form') {
          setError(field as any, { 
            type: 'manual',
            message 
          });
        } else {
          setError('root.serverError', { 
            type: 'manual',
            message 
          });
        }
      });
      return;
    }

    try {
      await registerUser(data);
      
      toast.success('Registration successful! Welcome to AI Talent Marketplace.');
      
      // Execute success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      // Error handling is managed by the useAuth hook and useEffect above
      // No additional handling needed here as the error will be set in state
    }
  };

  // Watch form values for validation
  const watchPassword = watch('password');

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-md p-6 sm:p-8">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Create an Account</h2>
      
      {/* Display server error if any */}
      {errors.root?.serverError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {errors.root.serverError.message}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {/* Name fields - first row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* First Name */}
          <div>
            <Input
              type={InputType.TEXT}
              label="First Name"
              {...register('firstName', { 
                required: 'First name is required',
                validate: (value) => isRequired(value) || 'First name is required'
              })}
              error={errors.firstName?.message}
              prefix={<FiUser className="text-gray-500" />}
              placeholder="Enter first name"
              required
              autoComplete="given-name"
            />
          </div>
          
          {/* Last Name */}
          <div>
            <Input
              type={InputType.TEXT}
              label="Last Name"
              {...register('lastName', { 
                required: 'Last name is required',
                validate: (value) => isRequired(value) || 'Last name is required'
              })}
              error={errors.lastName?.message}
              prefix={<FiUser className="text-gray-500" />}
              placeholder="Enter last name"
              required
              autoComplete="family-name"
            />
          </div>
        </div>
        
        {/* Email */}
        <Input
          type={InputType.EMAIL}
          label="Email Address"
          {...register('email', { 
            required: 'Email is required',
            validate: {
              isRequired: (value) => isRequired(value) || 'Email is required',
              isValidEmail: (value) => isEmail(value) || 'Please enter a valid email address'
            }
          })}
          error={errors.email?.message}
          prefix={<FiMail className="text-gray-500" />}
          placeholder="Enter your email"
          required
          autoComplete="email"
        />
        
        {/* Password */}
        <Input
          type={showPassword ? InputType.TEXT : InputType.PASSWORD}
          label="Password"
          {...register('password', { 
            required: 'Password is required',
            validate: {
              isRequired: (value) => isRequired(value) || 'Password is required',
              isStrongPassword: (value) => isPassword(value) || 
                'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character'
            }
          })}
          error={errors.password?.message}
          prefix={<FiLock className="text-gray-500" />}
          isFullWidth
          required
          autoComplete="new-password"
        />
        
        {/* Confirm Password */}
        <Input
          type={showConfirmPassword ? InputType.TEXT : InputType.PASSWORD}
          label="Confirm Password"
          {...register('confirmPassword', { 
            required: 'Please confirm your password',
            validate: {
              isRequired: (value) => isRequired(value) || 'Please confirm your password',
              isMatching: (value) => isMatch(value, watchPassword) || 'Passwords do not match'
            }
          })}
          error={errors.confirmPassword?.message}
          prefix={<FiLock className="text-gray-500" />}
          isFullWidth
          required
          autoComplete="new-password"
        />
        
        {/* Role Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            I am registering as:
            <span className="text-red-500">*</span>
          </label>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Freelancer Option */}
            <label className="relative flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-primary-500">
              <input
                type="radio"
                className="sr-only"
                value={UserRole.FREELANCER}
                {...register('role', { required: 'Please select a role' })}
              />
              <span className="flex items-center justify-center w-6 h-6 border border-gray-300 rounded-full mr-3">
                <span className={`w-3 h-3 rounded-full ${watch('role') === UserRole.FREELANCER ? 'bg-primary-600' : 'bg-transparent'}`}></span>
              </span>
              <div className="flex items-center">
                <FiUsers className="mr-2 text-gray-500" />
                <span>AI Professional</span>
              </div>
            </label>
            
            {/* Employer Option */}
            <label className="relative flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 focus-within:ring-2 focus-within:ring-primary-500">
              <input
                type="radio"
                className="sr-only"
                value={UserRole.EMPLOYER}
                {...register('role', { required: 'Please select a role' })}
              />
              <span className="flex items-center justify-center w-6 h-6 border border-gray-300 rounded-full mr-3">
                <span className={`w-3 h-3 rounded-full ${watch('role') === UserRole.EMPLOYER ? 'bg-primary-600' : 'bg-transparent'}`}></span>
              </span>
              <div className="flex items-center">
                <FiBriefcase className="mr-2 text-gray-500" />
                <span>Employer</span>
              </div>
            </label>
          </div>
          
          {errors.role && (
            <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
          )}
        </div>
        
        {/* Terms and Conditions */}
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="agreeToTerms"
              type="checkbox"
              className="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-primary-300"
              {...register('agreeToTerms', { 
                required: 'You must agree to the terms and conditions'
              })}
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="agreeToTerms" className="font-medium text-gray-700">
              I agree to the <Link href="/terms" className="text-primary-600 hover:underline">Terms and Conditions</Link>
            </label>
            {errors.agreeToTerms && (
              <p className="mt-1 text-sm text-red-600">{errors.agreeToTerms.message}</p>
            )}
          </div>
        </div>
        
        {/* Submit Button */}
        <Button
          type="submit"
          variant={ButtonVariant.PRIMARY}
          isLoading={isLoading}
          isFullWidth
          className="py-2.5"
        >
          Create Account
        </Button>
        
        {/* Login Link */}
        <div className="text-sm text-center text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary-600 hover:underline">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
};

export default RegisterForm;