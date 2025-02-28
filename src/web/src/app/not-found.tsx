import React, { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button, { ButtonVariant, ButtonSize } from '../components/common/Button';
import { Card, CardVariant, CardElevation } from '../components/common/Card';

/**
 * NotFound component that displays when users navigate to non-existent routes.
 * Provides error messaging and navigation options to return to valid pages.
 * 
 * @returns {JSX.Element} The 404 page component
 */
const NotFound: React.FC = () => {
  const router = useRouter();
  
  // Handle logging 404 errors for monitoring purposes
  useEffect(() => {
    // Log 404 navigation for analytics/monitoring
    // In a real implementation, this would integrate with an analytics service
    console.error('404 Error: Page not found');
  }, []);
  
  // Set focus to main error container for accessibility
  useEffect(() => {
    // Focus the main container for screen readers
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
      errorContainer.focus();
    }
  }, []);
  
  // Navigate to the homepage
  const handleHomeNavigation = () => {
    router.push('/');
  };
  
  // Navigate back to the previous page
  const handleBackNavigation = () => {
    router.back();
  };
  
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-gray-50"
      id="error-container"
      tabIndex={-1}
      aria-labelledby="error-title"
      role="alert"
    >
      <Card 
        variant={CardVariant.DANGER}
        className="max-w-lg w-full text-center"
        elevation={CardElevation.MEDIUM}
        bordered
      >
        <div className="flex flex-col items-center space-y-6 py-8">
          {/* 404 Illustration */}
          <div className="relative w-64 h-64">
            <Image
              src="/images/error-404.svg"
              alt="Page not found illustration"
              fill
              priority
              className="object-contain"
            />
          </div>
          
          {/* Error Message */}
          <div className="space-y-3">
            <h1 
              id="error-title" 
              className="text-3xl font-bold text-gray-900"
            >
              Page Not Found
            </h1>
            <p className="text-gray-600">
              The page you're looking for doesn't exist or might have been moved. 
              Please check the URL or navigate back to a known page.
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 mt-4">
            <Button
              variant={ButtonVariant.PRIMARY}
              size={ButtonSize.MEDIUM}
              onClick={handleHomeNavigation}
              ariaLabel="Go to homepage"
            >
              Go to Homepage
            </Button>
            <Button
              variant={ButtonVariant.OUTLINE}
              size={ButtonSize.MEDIUM}
              onClick={handleBackNavigation}
              ariaLabel="Go back to previous page"
            >
              Go Back
            </Button>
          </div>
          
          {/* Suggested Pages */}
          <div className="mt-6 border-t border-gray-200 pt-6 text-sm">
            <p className="text-gray-700 mb-2">You might be looking for:</p>
            <ul className="flex flex-wrap justify-center gap-2">
              <li>
                <Link 
                  href="/jobs" 
                  className="text-primary-600 hover:text-primary-800 hover:underline"
                >
                  Jobs Board
                </Link>
              </li>
              <li>
                <Link 
                  href="/talent" 
                  className="text-primary-600 hover:text-primary-800 hover:underline"
                >
                  AI Experts
                </Link>
              </li>
              <li>
                <Link 
                  href="/profile" 
                  className="text-primary-600 hover:text-primary-800 hover:underline"
                >
                  Your Profile
                </Link>
              </li>
              <li>
                <Link 
                  href="/help" 
                  className="text-primary-600 hover:text-primary-800 hover:underline"
                >
                  Help Center
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default NotFound;