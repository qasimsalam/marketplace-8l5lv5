import React, { useState, useEffect, useCallback } from 'react'; // ^18.2.0
import clsx from 'clsx'; // ^1.2.1
import { useRouter } from 'next/router'; // ^13.4.0
import { FiSearch, FiGrid, FiList } from 'react-icons/fi'; // ^4.10.1

import { Job, JobSearchParams } from '../../types/job';
import JobCard from './JobCard';
import JobFilters, { DEFAULT_FILTERS } from './JobFilters';
import Spinner, { SpinnerSize } from '../common/Spinner';
import Card, { CardVariant } from '../common/Card';
import Button, { ButtonVariant, ButtonSize } from '../common/Button';
import { useJobs } from '../../hooks/useJobs';

/**
 * Enum defining possible view modes for job listings display
 */
export enum ViewMode {
  GRID = 'grid',
  LIST = 'list'
}

/**
 * Interface defining props for the JobList component
 */
export interface JobListProps {
  /** Array of job data to display */
  jobs: Job[];
  /** Whether jobs are currently loading */
  isLoading: boolean;
  /** Error message if job loading failed */
  error: string | null;
  /** Initial search/filter parameters */
  initialFilters?: Partial<JobSearchParams>;
  /** Pagination data for the job list */
  pagination?: {
    totalCount: number;
    currentPage: number;
    totalPages: number;
  };
  /** Handler for when a job card is clicked */
  onJobClick?: (job: Job) => void;
  /** Handler for when the Apply button is clicked */
  onApplyClick?: (jobId: string) => void;
  /** Handler for when filters are changed */
  onFilterChange?: (filters: Partial<JobSearchParams>) => void;
  /** Handler for when the page is changed */
  onPageChange?: (page: number) => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show filter controls */
  showFilters?: boolean;
  /** Whether to show view mode toggle */
  showViewToggle?: boolean;
  /** Initial view mode (grid or list) */
  initialViewMode?: string;
  /** Message to display when no jobs are found */
  emptyStateMessage?: string;
  /** Available skills for filtering */
  availableSkills?: { id: string; name: string }[];
}

/**
 * Component that displays a grid or list of job postings with filtering and pagination
 */
const JobList: React.FC<JobListProps> = ({
  jobs = [],
  isLoading = false,
  error = null,
  initialFilters = {},
  pagination,
  onJobClick,
  onApplyClick,
  onFilterChange,
  onPageChange,
  className = '',
  showFilters = true,
  showViewToggle = true,
  initialViewMode = ViewMode.GRID,
  emptyStateMessage = 'No jobs found matching your criteria. Try adjusting your filters.',
  availableSkills = []
}) => {
  const router = useRouter();
  const { fetchJobs, setSearchFilters, changePage } = useJobs();
  
  // Local state
  const [viewMode, setViewMode] = useState<string>(initialViewMode);
  const [filters, setFilters] = useState<Partial<JobSearchParams>>(initialFilters);
  
  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<JobSearchParams>) => {
    setFilters(newFilters);
    if (onFilterChange) {
      onFilterChange(newFilters);
    } else {
      setSearchFilters(newFilters);
    }
  }, [onFilterChange, setSearchFilters]);
  
  // Handle job card click
  const handleJobClick = useCallback((job: Job) => {
    if (onJobClick) {
      onJobClick(job);
    } else {
      router.push(`/jobs/${job.id}`);
    }
  }, [onJobClick, router]);
  
  // Handle apply button click
  const handleApplyClick = useCallback((jobId: string) => {
    if (onApplyClick) {
      onApplyClick(jobId);
    } else {
      router.push(`/jobs/${jobId}/apply`);
    }
  }, [onApplyClick, router]);
  
  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    if (onPageChange) {
      onPageChange(page);
    } else {
      changePage(page);
    }
  }, [onPageChange, changePage]);
  
  // Toggle view mode
  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === ViewMode.GRID ? ViewMode.LIST : ViewMode.GRID);
  }, []);
  
  // Fetch jobs when filters change
  useEffect(() => {
    if (!onFilterChange) {
      fetchJobs(filters);
    }
  }, [filters, fetchJobs, onFilterChange]);
  
  // Determine if we should show empty state
  const showEmptyState = !isLoading && jobs.length === 0;
  
  // Container CSS class
  const containerClass = clsx(
    'w-full flex flex-col gap-4',
    className
  );
  
  // Grid or list layout classes
  const layoutClass = clsx(
    'w-full',
    viewMode === ViewMode.GRID 
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' 
      : 'flex flex-col gap-3'
  );
  
  return (
    <div className={containerClass} data-testid="job-list" aria-live="polite">
      {/* Filters section */}
      {showFilters && (
        <div className="w-full mb-4 p-4 bg-white rounded-lg shadow-sm">
          <JobFilters
            initialFilters={filters}
            onChange={handleFilterChange}
            availableSkills={availableSkills.map(skill => ({ value: skill.id, label: skill.name }))}
            autoApply
          />
        </div>
      )}
      
      {/* Controls: View toggle and sorting options */}
      {showViewToggle && (
        <div className="w-full flex flex-wrap justify-between items-center mb-4 gap-2">
          <div className="text-sm text-gray-600">
            {pagination && pagination.totalCount > 0 && (
              <span aria-live="polite">
                Showing {jobs.length} of {pagination.totalCount} jobs
              </span>
            )}
          </div>
          <div className="flex gap-2" role="radiogroup" aria-label="View mode">
            <Button
              variant={viewMode === ViewMode.GRID ? ButtonVariant.PRIMARY : ButtonVariant.OUTLINE}
              size={ButtonSize.SMALL}
              onClick={() => setViewMode(ViewMode.GRID)}
              ariaLabel="Grid view"
              testId="grid-view-btn"
            >
              <FiGrid className="mr-1" aria-hidden="true" /> Grid
            </Button>
            <Button
              variant={viewMode === ViewMode.LIST ? ButtonVariant.PRIMARY : ButtonVariant.OUTLINE}
              size={ButtonSize.SMALL}
              onClick={() => setViewMode(ViewMode.LIST)}
              ariaLabel="List view"
              testId="list-view-btn"
            >
              <FiList className="mr-1" aria-hidden="true" /> List
            </Button>
          </div>
        </div>
      )}
      
      {/* Loading state */}
      {isLoading && (
        <div className="w-full flex flex-col items-center justify-center py-12">
          <Spinner size={SpinnerSize.LARGE} />
          <p className="mt-4 text-gray-600">Loading jobs...</p>
        </div>
      )}
      
      {/* Error state */}
      {error && !isLoading && (
        <Card variant={CardVariant.DANGER}>
          <div className="p-4 text-center">
            <p className="mb-4 text-red-700">{error}</p>
            <Button 
              variant={ButtonVariant.PRIMARY}
              onClick={() => fetchJobs(filters)}
              ariaLabel="Retry loading jobs"
            >
              Retry
            </Button>
          </div>
        </Card>
      )}
      
      {/* Empty state */}
      {showEmptyState && (
        <Card variant={CardVariant.DEFAULT}>
          <div className="p-8 text-center">
            <p className="text-gray-600">{emptyStateMessage}</p>
          </div>
        </Card>
      )}
      
      {/* Job cards */}
      {!isLoading && !error && jobs.length > 0 && (
        <div 
          className={layoutClass}
          aria-label="Job listings"
          role="list"
        >
          {jobs.map(job => (
            <div key={job.id} role="listitem">
              <JobCard
                job={job}
                onClick={handleJobClick}
                onApplyClick={handleApplyClick}
                compact={viewMode === ViewMode.LIST}
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <nav 
          className="w-full flex justify-between items-center mt-6 border-t border-gray-200 pt-4"
          aria-label="Job pagination"
        >
          {/* Previous button */}
          <Button
            variant={ButtonVariant.OUTLINE}
            size={ButtonSize.SMALL}
            disabled={pagination.currentPage <= 1}
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            ariaLabel="Go to previous page"
          >
            Previous
          </Button>
          
          {/* Page information */}
          <div className="text-sm text-gray-600">
            Page {pagination.currentPage} of {pagination.totalPages}
            <span className="hidden sm:inline"> ({pagination.totalCount} total jobs)</span>
          </div>
          
          {/* Next button */}
          <Button
            variant={ButtonVariant.OUTLINE}
            size={ButtonSize.SMALL}
            disabled={pagination.currentPage >= pagination.totalPages}
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            ariaLabel="Go to next page"
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
};

export { JobListProps, ViewMode, JobList };
export default JobList;