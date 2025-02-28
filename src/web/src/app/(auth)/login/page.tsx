// Export metadata for SEO
export const metadata = {
  title: 'Login | AI Talent Marketplace',
  description: 'Log in to the AI Talent Marketplace to access your account',
};

// Client component directive
'use client';

// Imports
import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

import LoginForm from '../../../components/auth/LoginForm';
import useAuth from '../../../hooks/useAuth';
import useToast from '../../../hooks/useToast';

// The login page component
const LoginPage = () => {
  // Initialize the Next.js router for navigation after successful login
  const router = useRouter();
  // Initialize searchParams to extract any redirect URL
  const searchParams = useSearchParams();
  // Set up React state for tracking login success
  const [loginSuccess, setLoginSuccess] = useState(false);
  
  // Extract redirectUrl from searchParams if present, default to '/dashboard'
  const redirectUrl = searchParams.get('redirectUrl') || '/dashboard';
  
  // Initialize useAuth hook to check if user is already authenticated
  const { isAuthenticated } = useAuth();
  // Initialize useToast hook for displaying success notifications
  const toast = useToast();

  // Implement useEffect to redirect already authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.push(redirectUrl);
    }
  }, [isAuthenticated, router, redirectUrl]);

  // Implement handleLoginSuccess function to handle post-login flow
  const handleLoginSuccess = () => {
    setLoginSuccess(true);
    // Show success toast message upon successful login
    toast.success('Successfully logged in');
    // Navigate to dashboard or specified redirectUrl
    router.push(redirectUrl);
  };

  return (
    // Main container with responsive layout
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Branding section - visible only on medium screens and larger */}
      <div className="hidden md:flex md:w-1/2 bg-primary-600 p-8 flex-col justify-center items-center text-white">
        <div className="max-w-md mx-auto text-center">
          {/* Marketplace logo */}
          <Image 
            src="/images/logo-white.png" 
            alt="AI Talent Marketplace" 
            width={240} 
            height={80} 
            className="mb-8"
            priority
          />
          {/* Tagline */}
          <h1 className="text-4xl font-bold mb-4">
            Connect with the world's top AI talent
          </h1>
          {/* Value proposition */}
          <p className="text-xl mb-6">
            Find the perfect AI specialists for your projects or showcase your AI expertise to potential clients.
          </p>
          {/* Hero image */}
          <div className="relative mt-8">
            <Image 
              src="/images/ai-collaboration.png" 
              alt="AI professionals collaborating" 
              width={480} 
              height={320} 
              className="rounded-lg shadow-xl"
            />
          </div>
        </div>
      </div>
      
      {/* Login form section */}
      <div className="flex-1 flex flex-col justify-center items-center p-8">
        {/* Logo for mobile view */}
        <div className="md:hidden mb-8 text-center">
          <Image 
            src="/images/logo.png" 
            alt="AI Talent Marketplace" 
            width={200} 
            height={60}
            priority
          />
        </div>
        
        {/* Login form component */}
        <LoginForm 
          onSuccess={handleLoginSuccess} 
          redirectPath={redirectUrl}
          showSocialLogin={true}
        />
      </div>
    </div>
  );
};

export default LoginPage;