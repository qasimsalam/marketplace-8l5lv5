'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button, { ButtonVariant } from '../components/common/Button';
import { Card, CardVariant } from '../components/common/Card';
import useToast from '../hooks/useToast';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Client component that serves as an error boundary fallback UI for the application.
 * This component handles runtime errors that occur during rendering and provides
 * users with a graceful fallback UI and options to recover.
 */
export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter();
  const toast = useToast();
  const [isResetting, setIsResetting] = useState(false);
  
  // Log the error for monitoring purposes
  useEffect(() => {
    console.error('Application error:', error);
    
    // In a production app, this would send to an error monitoring service
    // like Sentry, LogRocket, etc.
  }, [error]);
  
  // Manage focus for accessibility when error occurs
  useEffect(() => {
    // Focus the first interactive element for screen readers
    const errorHeading = document.getElementById('error-heading');
    if (errorHeading) {
      errorHeading.focus();
    }
    
    // Announce error to screen readers
    const errorAnnouncement = document.getElementById('error-announcement');
    if (errorAnnouncement) {
      errorAnnouncement.innerText = 'An error has occurred. Recovery options are available.';
    }
  }, []);
  
  // Handle reset attempt
  const handleReset = () => {
    setIsResetting(true);
    
    // Use a timeout to show the loading state for better UX
    setTimeout(() => {
      try {
        reset();
        // Reset successful - no need for a success message as the UI will refresh
      } catch (resetError) {
        toast.error('Failed to recover. Please try refreshing the page.');
        console.error('Reset attempt failed:', resetError);
        setIsResetting(false);
      }
    }, 500);
  };
  
  // Handle navigation to home
  const handleNavigateHome = () => {
    router.push('/');
  };
  
  return (
    <div 
      className="flex items-center justify-center min-h-screen bg-gray-100 p-4"
      role="alert"
      aria-labelledby="error-heading"
    >
      {/* Hidden element for screen reader announcements */}
      <div id="error-announcement" className="sr-only" aria-live="assertive"></div>
      
      <Card 
        variant={CardVariant.DANGER}
        className="max-w-lg w-full"
      >
        <div className="text-center">
          <h1 
            id="error-heading" 
            className="text-2xl font-bold mb-4 text-red-700"
            tabIndex={-1}
          >
            Something went wrong
          </h1>
          
          <p className="mb-6">
            We apologize for the inconvenience. The application encountered an unexpected error.
          </p>
          
          {/* Show technical details only in development mode */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-4 bg-red-50 rounded text-left overflow-auto max-h-48">
              <p className="font-mono text-sm text-red-700">{error.message}</p>
              {error.digest && (
                <p className="text-xs text-red-600 mt-1">Error ID: {error.digest}</p>
              )}
              {error.stack && (
                <pre className="mt-2 text-xs text-red-700 whitespace-pre-wrap">
                  {error.stack}
                </pre>
              )}
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={handleReset}
              isLoading={isResetting}
              ariaLabel="Try to recover from the error"
            >
              Try again
            </Button>
            <Button
              variant={ButtonVariant.SECONDARY}
              onClick={handleNavigateHome}
              ariaLabel="Return to the homepage"
            >
              Go to homepage
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}