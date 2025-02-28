'use client';

import React from 'react'; // ^18.2.0
import { Spinner, SpinnerSize, SpinnerColor } from '../components/common/Spinner';

/**
 * Loading component that provides visual feedback during page transitions
 * and data fetching operations. This component is automatically used by
 * Next.js App Router for loading states.
 * 
 * @returns {JSX.Element} Rendered loading UI with spinner
 */
export default function Loading(): JSX.Element {
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 z-50 backdrop-blur-sm transition-opacity duration-300"
      data-testid="page-loading"
    >
      <div className="flex flex-col items-center p-8 rounded-lg">
        <Spinner 
          size={SpinnerSize.LARGE} 
          color={SpinnerColor.PRIMARY}
          className="animate-pulse"
          testId="loading-spinner"
        />
        <div 
          className="mt-4 text-gray-700 dark:text-gray-300 font-medium"
          role="status"
          aria-label="Loading page content"
        >
          Loading...
        </div>
      </div>
    </div>
  );
}