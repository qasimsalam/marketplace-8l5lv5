import React, { useState, useEffect } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ClockIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  CalendarIcon,
  BriefcaseIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

// Custom hooks
import { useJobs } from '../../../../hooks/useJobs';
import { useAuth } from '../../../../hooks/useAuth';

// Components
import { Card, CardVariant } from '../../../../components/common/Card';
import { Button, ButtonVariant } from '../../../../components/common/Button';
import { ProposalForm } from '../../../../components/jobs/ProposalForm';
import { Spinner } from '../../../../components/common/Spinner';
import { Avatar } from '../../../../components/common/Avatar';
import { Badge } from '../../../../components/common/Badge';
import { Modal } from '../../../../components/common/Modal';

// Types
import { Job } from '../../../../types/job';

// Utils
import { formatJobRate, formatDate, truncateText, formatJobTypeText } from '../../../../utils/format';

/**
 * Generates metadata for the job detail page based on the job information
 */
export async function generateMetadata({ params }: { params: { id: string } }) {
  try {
    // In a production environment, we would fetch the job server-side
    // This is a simplified approach for demonstration
    return {
      title: `Job Details - AI Talent Marketplace`,
      description: 'View detailed information about this AI job opportunity and submit your proposal',
    };
  } catch (error) {
    return {
      title: 'Job Details - AI Talent Marketplace',
      description: 'View AI job details and qualification requirements',
    };
  }
}

/**
 * Main page component that displays detailed information about a specific job
 */
export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  
  // Get job data and functions from hooks
  const { fetchJobById, currentJob, isLoading, error, canSubmitProposal } = useJobs();
  const { user } = useAuth();
  
  // State for proposal modal
  const [showProposalForm, setShowProposalForm] = useState(false);
  
  // Fetch job data when component mounts
  useEffect(() => {
    if (jobId) {
      fetchJobById(jobId).catch(() => {
        // Handle job not found
        notFound();
      });
    }
  }, [jobId, fetchJobById]);
  
  // Handle apply button click
  const handleApply = () => {
    setShowProposalForm(true);
  };
  
  // Handle cancel proposal
  const handleCancelProposal = () => {
    setShowProposalForm(false);
  };
  
  // Handle proposal submission success
  const handleSubmitProposal = () => {
    setShowProposalForm(false);
  };
  
  // Navigate back to jobs listing
  const handleBack = () => {
    router.push('/jobs');
  };
  
  // Navigate to edit page if user is the poster
  const handleEdit = () => {
    if (currentJob && user && user.id === currentJob.posterId) {
      router.push(`/jobs/${jobId}/edit`);
    }
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Job</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <Button onClick={handleBack} variant={ButtonVariant.OUTLINE}>
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back to Jobs
        </Button>
      </div>
    );
  }
  
  // Show not found state if job doesn't exist
  if (!currentJob) {
    return notFound();
  }
  
  // Determine if the current user is the job poster
  const isJobPoster = user && user.id === currentJob.posterId;
  
  // Render job details
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Back navigation */}
      <div className="mb-6">
        <Button onClick={handleBack} variant={ButtonVariant.GHOST} className="text-gray-600">
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back to Jobs
        </Button>
      </div>
      
      {/* Job title and actions */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h1 className="text-3xl font-bold text-gray-900">{currentJob.title}</h1>
          <div className="flex gap-3">
            {/* Edit button (only visible to job poster) */}
            {isJobPoster && (
              <Button
                onClick={handleEdit}
                variant={ButtonVariant.OUTLINE}
              >
                Edit Job
              </Button>
            )}
            
            {/* Apply button (only visible to freelancers who can submit proposals) */}
            {canSubmitProposal && !isJobPoster && (
              <Button onClick={handleApply}>
                Apply Now
              </Button>
            )}
          </div>
        </div>
        
        {/* Job poster info */}
        <div className="flex items-center text-gray-600">
          <Avatar 
            src={currentJob.posterAvatarUrl}
            firstName={currentJob.posterName?.split(' ')[0]}
            lastName={currentJob.posterName?.split(' ')[1]}
            size="small"
          />
          <div className="ml-3">
            <p className="font-medium">{currentJob.posterName}</p>
            <p className="text-sm">{currentJob.posterCompanyName || 'Individual Client'}</p>
          </div>
        </div>
      </div>
      
      {/* Job overview card */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Job type */}
          <div className="flex items-center">
            <BriefcaseIcon className="w-6 h-6 text-gray-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Job Type</p>
              <p className="font-medium">{formatJobTypeText(currentJob.type)}</p>
              <Badge className="mt-1">{currentJob.status}</Badge>
            </div>
          </div>
          
          {/* Budget/Rate */}
          <div className="flex items-center">
            <CurrencyDollarIcon className="w-6 h-6 text-gray-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Budget</p>
              <p className="font-medium">{formatJobRate(currentJob)}</p>
            </div>
          </div>
          
          {/* Duration */}
          <div className="flex items-center">
            <ClockIcon className="w-6 h-6 text-gray-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Duration</p>
              <p className="font-medium">
                {currentJob.estimatedDuration 
                  ? `${currentJob.estimatedDuration} days` 
                  : 'Not specified'}
              </p>
              {currentJob.estimatedHours && currentJob.type === 'hourly' && (
                <p className="text-sm text-gray-500">
                  Estimated {currentJob.estimatedHours} hours total
                </p>
              )}
            </div>
          </div>
          
          {/* Posted date */}
          <div className="flex items-center">
            <CalendarIcon className="w-6 h-6 text-gray-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Posted On</p>
              <p className="font-medium">{formatDate(currentJob.createdAt)}</p>
              {currentJob.expiresAt && (
                <p className="text-sm text-gray-500">
                  Expires: {formatDate(currentJob.expiresAt)}
                </p>
              )}
            </div>
          </div>
          
          {/* Location */}
          <div className="flex items-center">
            <MapPinIcon className="w-6 h-6 text-gray-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Location</p>
              <p className="font-medium">
                {currentJob.isRemote 
                  ? 'Remote' 
                  : currentJob.location || 'Not specified'}
              </p>
            </div>
          </div>
          
          {/* Proposals count */}
          <div className="flex items-center">
            <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mr-3 font-medium">
              {currentJob.proposalCount || 0}
            </span>
            <div>
              <p className="text-sm text-gray-600">Proposals</p>
              <p className="font-medium">
                {currentJob.proposalCount === 1 
                  ? '1 proposal received' 
                  : `${currentJob.proposalCount || 0} proposals received`}
              </p>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Job description */}
      <Card className="mb-6">
        <h2 className="text-xl font-bold mb-4">Job Description</h2>
        <div className="prose max-w-none">
          {currentJob.description.split('\n').map((paragraph, index) => (
            paragraph ? <p key={index} className="mb-4">{paragraph}</p> : <br key={index} />
          ))}
        </div>
      </Card>
      
      {/* Skills */}
      <Card className="mb-6">
        <h2 className="text-xl font-bold mb-4">Required Skills</h2>
        <div className="flex flex-wrap gap-2 mb-6">
          {currentJob.requiredSkills?.map((skill) => (
            <Badge key={skill.id || skill.name}>
              {skill.name}
            </Badge>
          ))}
          {(!currentJob.requiredSkills || currentJob.requiredSkills.length === 0) && (
            <p className="text-gray-500">No specific skills required</p>
          )}
        </div>
        
        {currentJob.preferredSkills && currentJob.preferredSkills.length > 0 && (
          <>
            <h3 className="text-lg font-semibold mb-2">Preferred Skills</h3>
            <div className="flex flex-wrap gap-2">
              {currentJob.preferredSkills.map((skill) => (
                <Badge key={skill.id || skill.name} variant="secondary">
                  {skill.name}
                </Badge>
              ))}
            </div>
          </>
        )}
      </Card>
      
      {/* Category and subcategory */}
      {(currentJob.category || currentJob.subcategory) && (
        <Card className="mb-6">
          <h2 className="text-xl font-bold mb-4">Category</h2>
          <div className="flex flex-wrap gap-x-6">
            {currentJob.category && (
              <div className="mb-2">
                <p className="text-sm text-gray-600">Main Category</p>
                <p className="font-medium">{currentJob.category}</p>
              </div>
            )}
            {currentJob.subcategory && (
              <div className="mb-2">
                <p className="text-sm text-gray-600">Subcategory</p>
                <p className="font-medium">{currentJob.subcategory}</p>
              </div>
            )}
          </div>
        </Card>
      )}
      
      {/* Attachments if any */}
      {currentJob.attachments && currentJob.attachments.length > 0 && (
        <Card className="mb-6">
          <h2 className="text-xl font-bold mb-4">Attachments</h2>
          <ul className="divide-y divide-gray-200">
            {currentJob.attachments.map((attachment, index) => (
              <li key={index} className="py-3 flex items-center">
                <a 
                  href={attachment} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                >
                  <span className="mr-2">📎</span>
                  {/* Extract filename from URL */}
                  {attachment.split('/').pop() || `Attachment ${index + 1}`}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}
      
      {/* Proposal form modal */}
      <Modal
        isOpen={showProposalForm}
        onClose={handleCancelProposal}
        title="Submit Proposal"
        size="large"
      >
        {currentJob && (
          <ProposalForm 
            job={currentJob}
            onSuccess={handleSubmitProposal}
            onCancel={handleCancelProposal}
          />
        )}
      </Modal>
    </div>
  );
}