"use client";

import React from 'react';
import { useRouter, redirect } from 'next/navigation';

// Components
import { JobForm } from '../../../components/jobs/JobForm';
import { Spinner, SpinnerSize, SpinnerColor } from '../../../components/common/Spinner';

// Hooks
import { useJobs } from '../../../hooks/useJobs';
import { useAuth } from '../../../hooks/useAuth';
import useToast from '../../../hooks/useToast';

/**
 * Next.js page component that renders the job creation form and handles authorization checks
 * 
 * @returns The rendered job creation page or redirect for unauthorized users
 */
export default function CreateJobPage() {
  // Initialize router for navigation after submission
  const router = useRouter();
  
  // Initialize toast for success/error messages
  const toast = useToast();
  
  // Get authentication state
  const { user, isAuthenticated, hasPermission } = useAuth();
  
  // Get job creation functionality
  const { createNewJob, isLoading, canCreateJob } = useJobs();
  
  // If user is not authenticated, redirect to login
  if (!isAuthenticated && !isLoading) {
    redirect('/login?redirect=/jobs/create');
  }
  
  // If user is authenticated but doesn't have permission, redirect to dashboard
  if (isAuthenticated && !canCreateJob) {
    toast.error('You do not have permission to create jobs');
    redirect('/dashboard');
  }
  
  // Handle form submission
  const handleSubmit = async (formData) => {
    try {
      // Create new job with form data
      await createNewJob(formData);
      
      // Show success message
      toast.success('Job created successfully');
      
      // Navigate to jobs listing page
      router.push('/jobs');
    } catch (error) {
      // Show error message
      toast.error(`Failed to create job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Show loading spinner while checking authorization
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size={SpinnerSize.LARGE} color={SpinnerColor.PRIMARY} />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create a New Job</h1>
          <p className="text-gray-600 mt-2">
            Fill out the form below to post a new job and find the perfect AI talent for your project.
          </p>
        </div>
        
        <JobForm onSuccess={() => router.push('/jobs')} />
      </div>
    </div>
  );
}

// Metadata for the page
export const metadata = {
  title: 'Create Job | AI Talent Marketplace',
  description: 'Post a new job and find AI experts for your project'
};