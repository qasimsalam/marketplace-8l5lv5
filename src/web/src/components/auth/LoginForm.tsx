import { useState, useEffect } from 'react'; // ^18.0.0
import { useForm } from 'react-hook-form'; // ^7.46.1
import Link from 'next/link'; // 13.x
import { FiMail, FiLock } from 'react-icons/fi'; // ^4.10.1

import { LoginFormValues } from '../../types/auth';
import Input, { InputType } from '../common/Input';
import Button, { ButtonVariant } from '../common/Button';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import { validateForm, authSchemas } from '../../lib/validation';
import { isEmail, isRequired } from '../../utils/validation';

export interface LoginFormProps {
  /**
   * Function to call after successful login
   */
  onSuccess?: () => void;
  /**
   * Path to redirect to after login
   */
  redirectPath?: string;
  /**
   * Whether to display social login options
   */
  showSocialLogin?: boolean;
}

/**
 * Form component that handles user login functionality
 */
const LoginForm = ({
  onSuccess,
  redirectPath = '/dashboard',
  showSocialLogin = true
}: LoginFormProps): JSX.Element => {
  // Initialize form with react-hook-form
  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    setError, 
    clearErrors 
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
      remember: false
    }
  });

  // Get authentication state and methods from useAuth hook
  const { login, isLoading, error, clearError } = useAuth();
  
  // Initialize toast notifications
  const toast = useToast();
  
  // State for password visibility toggle
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  // Reset form errors when auth error changes
  useEffect(() => {
    if (error) {
      setError('root.serverError', {
        type: 'manual',
        message: error
      });
    } else {
      clearErrors('root.serverError');
    }
    
    return () => {
      // Clean up by clearing auth errors when component unmounts
      clearError();
    };
  }, [error, setError, clearErrors, clearError]);

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Form submission handler
  const onSubmit = async (data: LoginFormValues) => {
    // Clear any previous errors
    clearError();
    
    // Validate with Zod schema
    const validationResult = validateForm<LoginFormValues>(data, authSchemas.loginSchema);
    
    if (!validationResult.success) {
      // Set form errors for each field with validation error
      Object.entries(validationResult.errors || {}).forEach(([field, message]) => {
        setError(field as any, {
          type: 'manual',
          message
        });
      });
      return;
    }
    
    try {
      // Attempt to log in
      await login(data);
      
      // Show success notification
      toast.success('Successfully logged in');
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      } else if (typeof window !== 'undefined') {
        // Redirect to specified path
        window.location.href = redirectPath;
      }
    } catch (err) {
      // Error is handled by useAuth hook and displayed in the form
      // No need to show another toast as the error will be displayed in the UI
    }
  };

  // Handle social login
  const handleSocialLogin = (provider: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = `/api/auth/${provider}`;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="mb-6 text-2xl font-bold text-center text-gray-800">
          Log In to Your Account
        </h2>
        
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
          {/* Email Input */}
          <Input
            type={InputType.EMAIL}
            name="email"
            label="Email Address"
            prefix={<FiMail className="text-gray-500" />}
            placeholder="you@example.com"
            error={errors.email?.message}
            required={true}
            {...register('email', {
              required: 'Email is required',
              validate: {
                isValidEmail: (value) => isEmail(value) || 'Please enter a valid email address'
              }
            })}
          />
          
          {/* Password Input */}
          <Input
            type={InputType.PASSWORD}
            name="password"
            label="Password"
            prefix={<FiLock className="text-gray-500" />}
            placeholder="Enter your password"
            error={errors.password?.message}
            required={true}
            {...register('password', {
              required: 'Password is required'
            })}
          />
          
          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                {...register('remember')}
              />
              <label htmlFor="remember" className="block ml-2 text-sm text-gray-700">
                Remember me
              </label>
            </div>
            
            <Link 
              href="/forgot-password" 
              className="text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              Forgot password?
            </Link>
          </div>
          
          {/* Authentication Error */}
          {errors.root?.serverError && (
            <div 
              className="p-3 text-sm font-medium text-red-600 bg-red-50 rounded-md border border-red-200"
              role="alert"
            >
              {errors.root.serverError.message}
            </div>
          )}
          
          {/* Submit Button */}
          <Button
            type="submit"
            variant={ButtonVariant.PRIMARY}
            isLoading={isLoading}
            isFullWidth={true}
          >
            Sign In
          </Button>
        </form>
        
        {/* Social Login Section */}
        {showSocialLogin && (
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 text-gray-500 bg-white">
                  Or continue with
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-6">
              <Button
                type="button"
                variant={ButtonVariant.OUTLINE}
                onClick={() => handleSocialLogin('github')}
                className="w-full"
              >
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  GitHub
                </span>
              </Button>
              
              <Button
                type="button"
                variant={ButtonVariant.OUTLINE}
                onClick={() => handleSocialLogin('linkedin')}
                className="w-full"
              >
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn
                </span>
              </Button>
            </div>
          </div>
        )}
        
        {/* Sign Up Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link 
              href="/register"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;