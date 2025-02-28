import React from 'react';
import { useRouter } from 'next/navigation';
import { FiPlus } from 'react-icons/fi';

import { useJobs } from '../../../hooks/useJobs';
import { useAuth } from '../../../hooks/useAuth';
import JobList from '../../../components/jobs/JobList';
import Button, { ButtonVariant } from '../../../components/common/Button';
import { Job, JobSearchParams } from '../../../types/job';

/**
 * Next.js page component that displays a list of jobs with filtering and pagination
 */
const JobsPage = () => {
  // Initialize the router for navigation
  const router = useRouter();
  
  // Get authentication state and permissions
  const { user, hasPermission } = useAuth();
  
  // Get jobs data and functionality
  const { 
    jobs, 
    isLoading, 
    error, 
    pagination, 
    searchParams, 
    setSearchFilters, 
    changePage,
    canCreateJob 
  } = useJobs();

  // Navigate to job detail page
  const handleJobClick = (job: Job) => {
    router.push(`/jobs/${job.id}`);
  };

  // Navigate to job creation page
  const handleCreateJobClick = () => {
    router.push('/jobs/create');
  };

  // Navigate to job application page
  const handleApplyClick = (jobId: string) => {
    router.push(`/jobs/${jobId}/apply`);
  };

  // Update search filters
  const handleFilterChange = (filters: Partial<JobSearchParams>) => {
    setSearchFilters(filters);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    changePage(page);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">AI Job Opportunities</h1>
        
        {canCreateJob && (
          <Button
            variant={ButtonVariant.PRIMARY}
            onClick={handleCreateJobClick}
          >
            <FiPlus className="mr-1" /> Create Job
          </Button>
        )}
      </div>

      <JobList
        jobs={jobs}
        isLoading={isLoading}
        error={error}
        pagination={pagination}
        initialFilters={searchParams}
        onJobClick={handleJobClick}
        onApplyClick={handleApplyClick}
        onFilterChange={handleFilterChange}
        onPageChange={handlePageChange}
        emptyStateMessage="No AI jobs found matching your criteria. Try adjusting your filters or check back soon for new opportunities."
      />
    </div>
  );
};

export default JobsPage;