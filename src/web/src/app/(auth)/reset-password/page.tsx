'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Metadata } from 'next';
import Image from 'next/image';

import PasswordResetForm from '../../../components/auth/PasswordResetForm';
import Card, { CardVariant } from '../../../components/common/Card';
import useAuth from '../../../hooks/useAuth';
import useToast from '../../../hooks/useToast';

/**
 * Main page component for the password reset functionality
 */
const ResetPasswordPage = (): JSX.Element => {
  // Initialize router for navigation after successful reset
  const router = useRouter();
  
  // Extract token from URL parameters
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  // State for tracking reset success status
  const [resetSuccess, setResetSuccess] = useState(false);
  
  // Authentication state to check if user is already authenticated
  const { isAuthenticated } = useAuth();
  
  // Toast notifications for user feedback
  const toast = useToast();
  
  // Redirect already authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);
  
  // Handle missing or invalid token
  useEffect(() => {
    if (!token) {
      toast.error('Invalid or missing password reset token. Please request a new password reset link.');
      router.push('/forgot-password');
    }
  }, [token, toast, router]);
  
  /**
   * Handle successful password reset
   */
  const handleResetSuccess = () => {
    setResetSuccess(true);
    toast.success('Your password has been reset successfully. You can now log in with your new password.');
    
    // Redirect to login page with success parameter
    router.push('/login?reset=success');
  };
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left section with branding */}
      <div className="hidden md:flex md:w-1/2 bg-primary-900 text-white p-8 flex-col justify-between">
        <div className="mb-8">
          <Image 
            src="/images/logo-white.png" 
            alt="AI Talent Marketplace" 
            width={180} 
            height={40} 
            priority
          />
        </div>
        <div className="flex-grow flex flex-col items-center justify-center">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-3xl font-bold mb-6">Secure Password Reset</h1>
            <p className="text-lg mb-8">
              Create a strong password to keep your account secure and protect your professional information.
            </p>
            <div className="my-8">
              <Image 
                src="/images/security-illustration.svg" 
                alt="Security Illustration" 
                width={300} 
                height={300} 
                className="mx-auto"
              />
            </div>
          </div>
        </div>
        <div className="mt-auto text-sm text-white/70">
          &copy; {new Date().getFullYear()} AI Talent Marketplace. All rights reserved.
        </div>
      </div>
      
      {/* Right section with reset form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card 
          variant={CardVariant.DEFAULT} 
          className="w-full max-w-md p-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Reset Your Password</h2>
            <p className="text-gray-600">
              Please create a new secure password for your account.
            </p>
          </div>
          
          {token && (
            <PasswordResetForm 
              token={token} 
              onSuccess={handleResetSuccess}
            />
          )}
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Remembered your password? {' '}
              <a href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign in here
              </a>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;

// Static metadata - Since this is a client component with 'use client', 
// this metadata needs to be handled by a parent layout server component in Next.js
export const metadata: Metadata = {
  title: 'Reset Password | AI Talent Marketplace',
  description: 'Reset your password for the AI Talent Marketplace'
};