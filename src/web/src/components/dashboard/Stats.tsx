import React, { useState, useEffect, useMemo } from 'react'; // ^18.2.0
import { Card, CardVariant } from '../common/Card';
import { Spinner, SpinnerSize } from '../common/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { useJobs } from '../../hooks/useJobs';
import { useProfile } from '../../hooks/useProfile';
import { formatCurrency, formatPercentage, formatNumber } from '../../utils/format';
import { JobStatus } from '../../types/job';
import { UserRole } from '../../../backend/shared/src/types/user.types';
import { 
  FiDollarSign, 
  FiClock, 
  FiCheckCircle, 
  FiActivity,
  FiBriefcase,
  FiPieChart,
  FiAward,
  FiBarChart2,
  FiSearch,
  FiTrendingUp
} from 'react-icons/fi'; // ^4.8.0

/**
 * Props interface for the Stats component
 */
export interface StatsProps {
  /**
   * Additional CSS class name
   */
  className?: string;
  /**
   * Interval in milliseconds to refresh the stats data
   */
  refreshInterval?: number;
}

/**
 * Interface for employer statistics
 */
export interface EmployerStats {
  /**
   * Total number of jobs posted by the employer
   */
  postedJobs: number;
  /**
   * Number of active jobs (in progress)
   */
  activeJobs: number;
  /**
   * Number of completed jobs
   */
  completedJobs: number;
  /**
   * Percentage of jobs that received at least one proposal
   */
  fillRate: number;
  /**
   * Average time in days between posting and hiring
   */
  avgTimeToFill: number;
  /**
   * Total amount spent on completed contracts
   */
  totalSpent: number;
}

/**
 * Interface for freelancer statistics
 */
export interface FreelancerStats {
  /**
   * Number of projects currently in progress
   */
  activeProjects: number;
  /**
   * Number of completed projects
   */
  completedProjects: number;
  /**
   * Percentage of completed projects with positive reviews
   */
  successRate: number;
  /**
   * Total earnings from all completed contracts
   */
  totalEarnings: number;
  /**
   * Percentage of proposals that led to contracts
   */
  proposalSuccessRate: number;
  /**
   * Number of open jobs matching freelancer skills
   */
  availableOpportunities: number;
}

/**
 * Calculates statistics for employer users based on their job postings and contracts
 * 
 * @param param0 Object containing jobs array and user ID
 * @returns Calculated statistics for employer
 */
const calculateEmployerStats = ({ 
  jobs, userId 
}: { 
  jobs: any[], userId: string 
}): EmployerStats => {
  // Filter jobs posted by this employer
  const employerJobs = jobs.filter(job => job.posterId === userId);
  
  // Calculate total posted jobs
  const postedJobs = employerJobs.length;
  
  // Calculate active jobs
  const activeJobs = employerJobs.filter(job => job.status === JobStatus.IN_PROGRESS).length;
  
  // Calculate completed jobs
  const completedJobs = employerJobs.filter(job => job.status === JobStatus.COMPLETED).length;
  
  // Calculate fill rate (percentage of jobs that received at least one proposal)
  const jobsWithProposals = employerJobs.filter(job => job.proposalCount > 0).length;
  const fillRate = postedJobs > 0 ? jobsWithProposals / postedJobs : 0;
  
  // Calculate average time to fill (average time between posting and hiring)
  let avgTimeToFill = 0;
  const jobsWithContract = employerJobs.filter(job => job.contractId && job.createdAt && job.startDate);
  if (jobsWithContract.length > 0) {
    const totalDaysToFill = jobsWithContract.reduce((total, job) => {
      const createdDate = new Date(job.createdAt);
      const startDate = new Date(job.startDate);
      const daysToFill = Math.max(0, (startDate.getTime() - createdDate.getTime()) / (1000 * 3600 * 24));
      return total + daysToFill;
    }, 0);
    avgTimeToFill = totalDaysToFill / jobsWithContract.length;
  }
  
  // Calculate total spent on contracts
  const totalSpent = employerJobs.reduce((total, job) => {
    // Sum up contract values for completed jobs
    if (job.status === JobStatus.COMPLETED && job.budget) {
      return total + job.budget;
    }
    return total;
  }, 0);
  
  return {
    postedJobs,
    activeJobs,
    completedJobs,
    fillRate,
    avgTimeToFill,
    totalSpent
  };
};

/**
 * Calculates statistics for freelancer users based on their proposals and contracts
 * 
 * @param param0 Object containing jobs array, profile data, and user ID
 * @returns Calculated statistics for freelancer
 */
const calculateFreelancerStats = ({ 
  jobs, profile, userId 
}: { 
  jobs: any[], profile: any, userId: string 
}): FreelancerStats => {
  // Get all jobs the freelancer is hired for or has submitted proposals for
  const relevantJobs = jobs.filter(job => 
    job.freelancerId === userId || 
    (job.proposals && job.proposals.some(p => p.freelancerId === userId))
  );
  
  // Calculate active projects
  const activeProjects = relevantJobs.filter(job => 
    job.status === JobStatus.IN_PROGRESS && job.freelancerId === userId
  ).length;
  
  // Calculate completed projects
  const completedProjects = relevantJobs.filter(job => 
    job.status === JobStatus.COMPLETED && job.freelancerId === userId
  ).length;
  
  // Calculate success rate (completed projects with positive reviews)
  // Assuming a positive review is stored in the job object
  const successfulProjects = relevantJobs.filter(job => 
    job.status === JobStatus.COMPLETED && 
    job.freelancerId === userId && 
    job.rating && job.rating >= 4
  ).length;
  const successRate = completedProjects > 0 ? successfulProjects / completedProjects : 0;
  
  // Calculate total earnings from all completed contracts
  const totalEarnings = relevantJobs.reduce((total, job) => {
    if (job.status === JobStatus.COMPLETED && job.freelancerId === userId && job.budget) {
      return total + job.budget;
    }
    return total;
  }, 0);
  
  // Calculate proposal success rate
  const proposals = relevantJobs.reduce((total, job) => {
    if (job.proposals) {
      return total.concat(job.proposals.filter(p => p.freelancerId === userId));
    }
    return total;
  }, []);
  const totalProposals = proposals.length;
  const acceptedProposals = proposals.filter(p => p.status === 'accepted').length;
  const proposalSuccessRate = totalProposals > 0 ? acceptedProposals / totalProposals : 0;
  
  // Calculate available opportunities
  // Jobs that match freelancer skills and are open
  const freelancerSkills = profile?.skills?.map(s => s.name) || [];
  const availableOpportunities = jobs.filter(job => {
    if (job.status !== JobStatus.OPEN) return false;
    // Check if freelancer has at least one skill required for the job
    return job.requiredSkills?.some(skill => 
      freelancerSkills.includes(skill.name)
    );
  }).length;
  
  return {
    activeProjects,
    completedProjects,
    successRate,
    totalEarnings,
    proposalSuccessRate,
    availableOpportunities
  };
};

/**
 * A component that displays key statistics and metrics on the AI Talent Marketplace dashboard.
 * Shows different metrics based on user role (employer or freelancer).
 * 
 * @param props Component props
 * @returns React component
 */
export const Stats: React.FC<StatsProps> = ({ 
  className = '', 
  refreshInterval = 60000 // Default refresh every 60 seconds
}) => {
  // Get current user data
  const { user } = useAuth();
  
  // Get job data from hooks
  const { jobs } = useJobs();
  
  // Get profile data
  const { freelancerProfile, companyProfile } = useProfile();
  
  // Set up loading state
  const [loading, setLoading] = useState(true);
  
  // Set up stats state (could be either EmployerStats or FreelancerStats)
  const [stats, setStats] = useState<EmployerStats | FreelancerStats | null>(null);
  
  // Calculate stats based on user role
  const calculateStats = useMemo(() => {
    if (!user || !user.id) return null;
    
    try {
      if (user.role === UserRole.EMPLOYER) {
        return calculateEmployerStats({ jobs: jobs || [], userId: user.id });
      } else if (user.role === UserRole.FREELANCER && freelancerProfile) {
        return calculateFreelancerStats({ 
          jobs: jobs || [], 
          profile: freelancerProfile, 
          userId: user.id 
        });
      }
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
    
    return null;
  }, [user, jobs, freelancerProfile]);
  
  // Update stats when data changes
  useEffect(() => {
    setLoading(true);
    if (calculateStats) {
      setStats(calculateStats);
      setLoading(false);
    } else if (user) {
      // If user exists but we can't calculate stats, stop loading
      setLoading(false);
    }
  }, [calculateStats, user]);
  
  // Set up periodic refresh of stats
  useEffect(() => {
    if (refreshInterval <= 0) return;
    
    const timer = setInterval(() => {
      if (calculateStats) {
        setStats(calculateStats);
      }
    }, refreshInterval);
    
    return () => clearInterval(timer);
  }, [refreshInterval, calculateStats]);
  
  // Render loading state if no data yet
  if (loading) {
    return (
      <Card 
        className={className}
        header={<h2 className="text-lg font-semibold">Your Statistics</h2>}
      >
        <div className="flex justify-center items-center h-40" aria-live="polite">
          <Spinner size={SpinnerSize.MEDIUM} />
          <span className="sr-only">Loading statistics...</span>
        </div>
      </Card>
    );
  }
  
  // If no stats available, show message
  if (!stats) {
    return (
      <Card 
        className={className}
        header={<h2 className="text-lg font-semibold">Your Statistics</h2>}
      >
        <div className="flex justify-center items-center h-40">
          <p className="text-gray-500">No statistics available yet</p>
        </div>
      </Card>
    );
  }
  
  // Render employer stats
  if (user?.role === UserRole.EMPLOYER) {
    const employerStats = stats as EmployerStats;
    return (
      <Card 
        className={className}
        header={<h2 className="text-lg font-semibold">Your Statistics</h2>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="group" aria-label="Employer statistics">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center">
              <FiBriefcase className="h-5 w-5 text-gray-400 mr-2" aria-hidden="true" />
              <h3 className="text-gray-500 text-sm font-medium">Posted Jobs</h3>
            </div>
            <p className="text-2xl font-bold mt-1">{formatNumber(employerStats.postedJobs)}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center">
              <FiActivity className="h-5 w-5 text-primary-500 mr-2" aria-hidden="true" />
              <h3 className="text-gray-500 text-sm font-medium">Active Jobs</h3>
            </div>
            <p className="text-2xl font-bold mt-1 text-primary-600">{formatNumber(employerStats.activeJobs)}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center">
              <FiCheckCircle className="h-5 w-5 text-success-500 mr-2" aria-hidden="true" />
              <h3 className="text-gray-500 text-sm font-medium">Completed Jobs</h3>
            </div>
            <p className="text-2xl font-bold mt-1 text-success-600">{formatNumber(employerStats.completedJobs)}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center">
              <FiPieChart className="h-5 w-5 text-info-500 mr-2" aria-hidden="true" />
              <h3 className="text-gray-500 text-sm font-medium">Fill Rate</h3>
            </div>
            <p className="text-2xl font-bold mt-1">{formatPercentage(employerStats.fillRate)}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center">
              <FiClock className="h-5 w-5 text-warning-500 mr-2" aria-hidden="true" />
              <h3 className="text-gray-500 text-sm font-medium">Avg. Time to Fill</h3>
            </div>
            <p className="text-2xl font-bold mt-1">{formatNumber(employerStats.avgTimeToFill, 1)} days</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center">
              <FiDollarSign className="h-5 w-5 text-secondary-500 mr-2" aria-hidden="true" />
              <h3 className="text-gray-500 text-sm font-medium">Total Spent</h3>
            </div>
            <p className="text-2xl font-bold mt-1">{formatCurrency(employerStats.totalSpent)}</p>
          </div>
        </div>
      </Card>
    );
  }
  
  // Render freelancer stats
  if (user?.role === UserRole.FREELANCER) {
    const freelancerStats = stats as FreelancerStats;
    return (
      <Card 
        className={className}
        header={<h2 className="text-lg font-semibold">Your Statistics</h2>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="group" aria-label="Freelancer statistics">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center">
              <FiActivity className="h-5 w-5 text-primary-500 mr-2" aria-hidden="true" />
              <h3 className="text-gray-500 text-sm font-medium">Active Projects</h3>
            </div>
            <p className="text-2xl font-bold mt-1 text-primary-600">{formatNumber(freelancerStats.activeProjects)}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center">
              <FiCheckCircle className="h-5 w-5 text-success-500 mr-2" aria-hidden="true" />
              <h3 className="text-gray-500 text-sm font-medium">Completed Projects</h3>
            </div>
            <p className="text-2xl font-bold mt-1 text-success-600">{formatNumber(freelancerStats.completedProjects)}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center">
              <FiAward className="h-5 w-5 text-info-500 mr-2" aria-hidden="true" />
              <h3 className="text-gray-500 text-sm font-medium">Success Rate</h3>
            </div>
            <p className="text-2xl font-bold mt-1">{formatPercentage(freelancerStats.successRate)}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center">
              <FiDollarSign className="h-5 w-5 text-secondary-500 mr-2" aria-hidden="true" />
              <h3 className="text-gray-500 text-sm font-medium">Total Earnings</h3>
            </div>
            <p className="text-2xl font-bold mt-1">{formatCurrency(freelancerStats.totalEarnings)}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center">
              <FiTrendingUp className="h-5 w-5 text-warning-500 mr-2" aria-hidden="true" />
              <h3 className="text-gray-500 text-sm font-medium">Proposal Success Rate</h3>
            </div>
            <p className="text-2xl font-bold mt-1">{formatPercentage(freelancerStats.proposalSuccessRate)}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center">
              <FiSearch className="h-5 w-5 text-gray-400 mr-2" aria-hidden="true" />
              <h3 className="text-gray-500 text-sm font-medium">Available Opportunities</h3>
            </div>
            <p className="text-2xl font-bold mt-1">{formatNumber(freelancerStats.availableOpportunities)}</p>
          </div>
        </div>
      </Card>
    );
  }
  
  // Fallback for other roles
  return (
    <Card 
      className={className}
      header={<h2 className="text-lg font-semibold">Your Statistics</h2>}
    >
      <div className="flex justify-center items-center h-40">
        <p className="text-gray-500">Statistics not available for your user role</p>
      </div>
    </Card>
  );
};

export default Stats;