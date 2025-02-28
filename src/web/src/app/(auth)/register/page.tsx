// For metadata export (static)
export const metadata = {
  title: 'Register | AI Talent Marketplace',
  description: 'Create an account on the AI Talent Marketplace to connect with AI professionals or find AI projects'
};

// Client component
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import RegisterForm from '../../../components/auth/RegisterForm';
import useAuth from '../../../hooks/useAuth';
import useToast from '../../../hooks/useToast';

/**
 * Main page component for the user registration functionality
 */
const RegisterPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  
  // Auth hook to check if user is already authenticated
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  // Redirect if user is already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Handle successful registration
  const handleRegistrationSuccess = () => {
    setRegistrationSuccess(true);
    toast.success('Registration successful! Welcome to AI Talent Marketplace.');
    
    // Redirect to dashboard or specified redirect URL after short delay
    setTimeout(() => {
      router.push(redirectUrl);
    }, 1500);
  };

  return (
    <main className="min-h-screen flex flex-col md:flex-row" aria-labelledby="registration-page-title">
      {/* Hidden but accessible title for screen readers */}
      <h1 id="registration-page-title" className="sr-only">Register for AI Talent Marketplace</h1>
      
      {/* Left side - Branding */}
      <div className="hidden md:flex md:w-1/2 bg-primary-900 text-white p-8 flex-col justify-center items-center">
        <div className="max-w-md mx-auto text-center">
          <div className="mb-8">
            <Image 
              src="/images/logo-white.png" 
              alt="AI Talent Marketplace" 
              width={180} 
              height={60}
              priority
            />
          </div>
          
          <h2 className="text-3xl font-bold mb-4">The Premier AI Talent Marketplace</h2>
          <p className="text-xl mb-8">
            Connect with the world's top AI professionals or find exciting AI projects
          </p>
          
          <div className="relative h-64 w-full rounded-lg overflow-hidden">
            <Image
              src="/images/ai-collaboration.jpg"
              alt="AI professionals collaborating"
              fill
              style={{ objectFit: 'cover' }}
              className="rounded-lg"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>
        </div>
      </div>
      
      {/* Right side - Registration form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 md:p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo - visible only on small screens */}
          <div className="flex justify-center mb-8 md:hidden">
            <Image 
              src="/images/logo.png" 
              alt="AI Talent Marketplace" 
              width={150} 
              height={50}
              priority
            />
          </div>
          
          <RegisterForm 
            onSuccess={handleRegistrationSuccess}
            redirectPath={redirectUrl}
          />
          
          {/* Skip to main content link for keyboard navigation */}
          <a 
            href="#main-content" 
            className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:p-4 focus:bg-white focus:z-50"
          >
            Skip to main content
          </a>
        </div>
      </div>
    </main>
  );
};

export default RegisterPage;