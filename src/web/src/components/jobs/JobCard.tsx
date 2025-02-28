import React from 'react'; // ^18.2.0
import clsx from 'clsx'; // ^1.2.1
import { useRouter } from 'next/router'; // ^13.4.0
import { MdLocationOn, MdAccessTime, MdPeople } from 'react-icons/md'; // ^4.10.0

import { Job, JobStatus, JobType } from '../../types/job';
import Card, { CardVariant, CardElevation } from '../common/Card';
import Badge, { BadgeVariant, BadgeSize } from '../common/Badge';
import Button, { ButtonVariant, ButtonSize } from '../common/Button';
import Avatar, { AvatarSize } from '../common/Avatar';
import { formatDateForDisplay } from '../../utils/date';
import { formatJobRate, formatJobTypeText, truncateText } from '../../utils/format';
import { useJobs } from '../../hooks/useJobs';

/**
 * Interface defining props for the JobCard component
 */
export interface JobCardProps {
  /** Job data to display */
  job: Job;
  /** Click handler for the entire job card */
  onClick?: (job: Job) => void;
  /** Click handler for the apply button */
  onApplyClick?: (jobId: string) => void;
  /** Additional CSS classes for the card */
  className?: string;
  /** Whether to display in compact mode with less information */
  compact?: boolean;
  /** Whether to show action buttons */
  showActions?: boolean;
}

/**
 * Maps job status to appropriate badge variant for visual indication
 * 
 * @param status - The job status to map
 * @returns Badge variant corresponding to job status
 */
const getStatusVariant = (status: JobStatus): BadgeVariant => {
  switch (status) {
    case JobStatus.OPEN:
      return BadgeVariant.SUCCESS;
    case JobStatus.IN_PROGRESS:
      return BadgeVariant.PRIMARY;
    case JobStatus.DRAFT:
      return BadgeVariant.SECONDARY;
    case JobStatus.COMPLETED:
      return BadgeVariant.INFO;
    case JobStatus.CANCELLED:
      return BadgeVariant.DANGER;
    case JobStatus.ON_HOLD:
      return BadgeVariant.WARNING;
    default:
      return BadgeVariant.SECONDARY;
  }
};

/**
 * Component that displays a job listing in a card format with key details and actions
 * 
 * @param props - Props containing job data and interaction handlers
 * @returns Rendered job card component
 */
const JobCard: React.FC<JobCardProps> = ({
  job,
  onClick,
  onApplyClick,
  className = '',
  compact = false,
  showActions = true
}) => {
  const router = useRouter();
  const { canSubmitProposal } = useJobs();

  // Handle card click to navigate to job details
  const handleClick = () => {
    if (onClick) {
      onClick(job);
    } else {
      router.push(`/jobs/${job.id}`);
    }
  };

  // Handle apply button click without triggering the card click
  const handleApplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onApplyClick) {
      onApplyClick(job.id);
    } else {
      router.push(`/jobs/${job.id}/apply`);
    }
  };

  // Format job status for display
  const formattedStatus = job.status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());

  // Determine if job has skills
  const hasSkills = job.requiredSkills && job.requiredSkills.length > 0;

  // Determine if job is open for applications
  const isOpenForApplications = job.status === JobStatus.OPEN;

  return (
    <Card
      className={clsx(
        'transition-all duration-200 hover:shadow-md cursor-pointer',
        compact ? 'p-3' : 'p-4',
        className
      )}
      elevation={CardElevation.LOW}
      variant={CardVariant.DEFAULT}
      onClick={handleClick}
      testId={`job-card-${job.id}`}
    >
      <div className="flex flex-col h-full">
        {/* Header: Title and Status */}
        <div className="flex justify-between items-start mb-3">
          <h3 
            className={clsx(
              'font-medium text-gray-900 pr-2',
              compact ? 'text-base' : 'text-lg'
            )}
            title={job.title}
          >
            {truncateText(job.title, compact ? 60 : 80, false)}
          </h3>
          <Badge
            variant={getStatusVariant(job.status)}
            size={compact ? BadgeSize.SMALL : BadgeSize.MEDIUM}
          >
            {formattedStatus}
          </Badge>
        </div>

        {/* Company/Poster Info */}
        <div className="flex items-center mb-3">
          <Avatar
            src={job.posterAvatarUrl}
            firstName={job.posterName?.split(' ')[0]}
            lastName={job.posterName?.split(' ')[1]}
            alt={`${job.posterName || 'Job poster'}'s avatar`}
            size={compact ? AvatarSize.SMALL : AvatarSize.MEDIUM}
            className="mr-2"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {job.posterName}
            </p>
            {!compact && (
              <p className="text-xs text-gray-500">
                Posted {formatDateForDisplay(job.createdAt)}
              </p>
            )}
          </div>
        </div>

        {/* Description - only shown in non-compact mode */}
        {!compact && job.description && (
          <p className="text-sm text-gray-700 mb-3">
            {truncateText(job.description, 150)}
          </p>
        )}

        {/* Middle Content */}
        <div className="flex-grow">
          {/* Skills */}
          {hasSkills && (
            <div className="flex flex-wrap gap-1.5 mb-3" aria-label="Required Skills">
              {job.requiredSkills.slice(0, compact ? 2 : 5).map((skill, index) => (
                <Badge
                  key={`${skill.id || skill.name}-${index}`}
                  variant={BadgeVariant.INFO}
                  size={BadgeSize.SMALL}
                >
                  {skill.name}
                </Badge>
              ))}
              {job.requiredSkills.length > (compact ? 2 : 5) && (
                <Badge
                  variant={BadgeVariant.SECONDARY}
                  size={BadgeSize.SMALL}
                >
                  +{job.requiredSkills.length - (compact ? 2 : 5)}
                </Badge>
              )}
            </div>
          )}

          {/* Job Metadata */}
          <div 
            className={clsx(
              "grid gap-y-2 gap-x-4 text-sm text-gray-600 mb-3",
              compact 
                ? "grid-cols-1" 
                : "grid-cols-1 sm:grid-cols-2"
            )}
          >
            {/* Budget/Rate */}
            <div className="flex items-center" aria-label="Job Rate">
              <span className="font-medium text-gray-900 mr-1">
                {formatJobRate({
                  type: job.type,
                  budget: job.budget,
                  minBudget: job.minBudget,
                  maxBudget: job.maxBudget,
                  hourlyRate: job.hourlyRate
                })}
              </span>
              <span className="text-gray-500 text-xs">
                {formatJobTypeText(job.type)}
              </span>
            </div>

            {/* Location */}
            {(job.location || job.isRemote) && (
              <div className="flex items-center" aria-label="Job Location">
                <MdLocationOn aria-hidden="true" className="mr-1 text-gray-500" />
                <span className="truncate">{job.isRemote ? 'Remote' : job.location}</span>
              </div>
            )}

            {/* Posted Date - shown in compact mode or on small screens */}
            {(compact || !job.location) && (
              <div className="flex items-center" aria-label="Posted Date">
                <MdAccessTime aria-hidden="true" className="mr-1 text-gray-500" />
                <span>{formatDateForDisplay(job.createdAt)}</span>
              </div>
            )}

            {/* Proposals Count */}
            {job.proposalCount !== undefined && (
              <div className="flex items-center" aria-label="Proposal Count">
                <MdPeople aria-hidden="true" className="mr-1 text-gray-500" />
                <span>
                  {job.proposalCount} {job.proposalCount === 1 ? 'proposal' : 'proposals'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className={clsx(
            "flex gap-2 mt-2",
            compact ? "justify-end" : "flex-col sm:flex-row sm:justify-end"
          )}>
            <Button
              variant={ButtonVariant.OUTLINE}
              size={compact ? ButtonSize.SMALL : ButtonSize.MEDIUM}
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/jobs/${job.id}`);
              }}
              ariaLabel={`View details for ${job.title}`}
              className={compact ? '' : 'sm:w-auto w-full'}
            >
              View Details
            </Button>
            
            {canSubmitProposal && isOpenForApplications && (
              <Button
                variant={ButtonVariant.PRIMARY}
                size={compact ? ButtonSize.SMALL : ButtonSize.MEDIUM}
                onClick={handleApplyClick}
                ariaLabel={`Apply for ${job.title}`}
                className={compact ? '' : 'sm:w-auto w-full'}
              >
                Apply Now
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export { JobCardProps, JobCard, getStatusVariant };
export default React.memo(JobCard);