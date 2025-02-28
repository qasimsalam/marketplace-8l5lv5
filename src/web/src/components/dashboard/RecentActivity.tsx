import React, { useState, useEffect } from 'react'; // ^18.2.0
import clsx from 'clsx'; // ^1.2.1

import { Card, CardProps } from '../common/Card';
import { Avatar, AvatarSize } from '../common/Avatar';
import { Badge, BadgeVariant } from '../common/Badge';
import { Spinner, SpinnerSize } from '../common/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { formatDateForDisplay } from '../../utils/date';

/**
 * Enum defining possible types of user activities in the system
 */
export enum ActivityType {
  PROFILE_VIEW = 'profile_view',
  PAYMENT_RECEIVED = 'payment_received',
  JOB_APPLIED = 'job_applied',
  PROPOSAL_RECEIVED = 'proposal_received',
  MESSAGE_RECEIVED = 'message_received',
  CONTRACT_CREATED = 'contract_created',
  MILESTONE_COMPLETED = 'milestone_completed'
}

/**
 * Interface defining the structure of activity objects
 */
export interface Activity {
  /** Unique identifier for the activity */
  id: string;
  /** Type of activity */
  type: ActivityType;
  /** When the activity occurred */
  timestamp: Date;
  /** User ID associated with this activity */
  userId: string;
  /** Additional activity-specific data */
  data: Record<string, any>;
}

/**
 * Interface for RecentActivity component props
 */
export interface RecentActivityProps {
  /** Optional CSS class name */
  className?: string;
  /** Maximum number of activities to display */
  limit?: number;
}

/**
 * Helper function to determine the appropriate icon for different activity types
 * 
 * @param type - Type of activity
 * @returns JSX Element with appropriate icon
 */
const getActivityIcon = (type: ActivityType): JSX.Element => {
  switch (type) {
    case ActivityType.PROFILE_VIEW:
      return <Badge variant={BadgeVariant.INFO}>👁️</Badge>;
    case ActivityType.PAYMENT_RECEIVED:
      return <Badge variant={BadgeVariant.SUCCESS}>💰</Badge>;
    case ActivityType.JOB_APPLIED:
      return <Badge variant={BadgeVariant.PRIMARY}>📝</Badge>;
    case ActivityType.PROPOSAL_RECEIVED:
      return <Badge variant={BadgeVariant.PRIMARY}>📨</Badge>;
    case ActivityType.MESSAGE_RECEIVED:
      return <Badge variant={BadgeVariant.INFO}>💬</Badge>;
    case ActivityType.CONTRACT_CREATED:
      return <Badge variant={BadgeVariant.SUCCESS}>📄</Badge>;
    case ActivityType.MILESTONE_COMPLETED:
      return <Badge variant={BadgeVariant.SUCCESS}>🏆</Badge>;
    default:
      return <Badge variant={BadgeVariant.SECONDARY}>📌</Badge>;
  }
};

/**
 * Helper function to generate descriptive text for each activity type
 * 
 * @param activity - Activity object containing type and data
 * @returns Human-readable activity description
 */
const getActivityDescription = (activity: Activity): string => {
  const { type, data } = activity;
  
  switch (type) {
    case ActivityType.PROFILE_VIEW:
      return `Your profile was viewed by ${data.viewerName || 'someone'}${data.viewerCompany ? ` from ${data.viewerCompany}` : ''}`;
    
    case ActivityType.PAYMENT_RECEIVED:
      return `You received a payment of ${new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: data.currency || 'USD' 
      }).format(data.amount || 0)} for "${data.jobTitle || 'your work'}"`;
    
    case ActivityType.JOB_APPLIED:
      return `You applied for "${data.jobTitle || 'a job'}"`;
    
    case ActivityType.PROPOSAL_RECEIVED:
      return `You received a proposal from ${data.proposerName || 'someone'} for "${data.jobTitle || 'your job posting'}"`;
    
    case ActivityType.MESSAGE_RECEIVED:
      return `You received a message from ${data.senderName || 'someone'}`;
    
    case ActivityType.CONTRACT_CREATED:
      return `A new contract was created for "${data.jobTitle || 'your project'}"`;
    
    case ActivityType.MILESTONE_COMPLETED:
      return `Milestone "${data.milestoneName || 'Untitled'}" completed for project "${data.projectName || 'Untitled Project'}"`;
    
    default:
      return 'New activity on your account';
  }
};

/**
 * Async function to fetch recent activities from the API
 * 
 * @param userId - ID of the user whose activities to fetch
 * @param limit - Maximum number of activities to return
 * @returns Promise resolving to an array of activity objects
 */
const fetchRecentActivities = async (userId: string, limit: number = 5): Promise<Activity[]> => {
  try {
    // In a real implementation, this would be an API call to something like:
    // const response = await fetch(`/api/v1/users/${userId}/activities?limit=${limit}`);
    // if (!response.ok) {
    //   throw new Error(`Failed to fetch activities: ${response.statusText}`);
    // }
    // const data = await response.json();
    // return data.activities;
    
    // Simulated API call with mock data
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockActivities: Activity[] = [
          {
            id: '1',
            type: ActivityType.PROFILE_VIEW,
            timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
            userId,
            data: {
              viewerName: 'Jane Smith',
              viewerCompany: 'Tech Innovations'
            }
          },
          {
            id: '2',
            type: ActivityType.PAYMENT_RECEIVED,
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
            userId,
            data: {
              amount: 1500,
              currency: 'USD',
              jobTitle: 'Machine Learning Algorithm Optimization'
            }
          },
          {
            id: '3',
            type: ActivityType.PROPOSAL_RECEIVED,
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
            userId,
            data: {
              proposerName: 'Alex Johnson',
              jobTitle: 'Computer Vision Expert Needed'
            }
          },
          {
            id: '4',
            type: ActivityType.MESSAGE_RECEIVED,
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26), // 26 hours ago
            userId,
            data: {
              senderName: 'Michael Chen',
              conversationId: '123456'
            }
          },
          {
            id: '5',
            type: ActivityType.MILESTONE_COMPLETED,
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
            userId,
            data: {
              milestoneName: 'Data Processing Phase',
              projectName: 'NLP Model Development'
            }
          },
          {
            id: '6',
            type: ActivityType.JOB_APPLIED,
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72), // 3 days ago
            userId,
            data: {
              jobTitle: 'Deep Learning Architect'
            }
          },
          {
            id: '7',
            type: ActivityType.CONTRACT_CREATED,
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 96), // 4 days ago
            userId,
            data: {
              jobTitle: 'AI Model Fine-tuning Project'
            }
          }
        ];
        
        // Sort by timestamp (newest first)
        const sortedActivities = mockActivities.sort((a, b) => 
          b.timestamp.getTime() - a.timestamp.getTime()
        );
        
        resolve(sortedActivities.slice(0, limit));
      }, 800); // Simulate network delay
    });
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch recent activities');
  }
};

/**
 * RecentActivity component displays a chronological feed of user's latest interactions,
 * notifications, and platform updates in the AI Talent Marketplace.
 * 
 * @param props - Component props
 * @returns Rendered RecentActivity component
 */
const RecentActivity: React.FC<RecentActivityProps> = ({
  className,
  limit = 5
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const toast = useToast();
  
  useEffect(() => {
    const loadActivities = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        const fetchedActivities = await fetchRecentActivities(user.id, limit);
        setActivities(fetchedActivities);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        toast.error(`Failed to load recent activities: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadActivities();
  }, [user, limit, toast]);
  
  if (loading) {
    return (
      <Card className={clsx('h-60', className)}>
        <div className="flex flex-col items-center justify-center h-full">
          <Spinner size={SpinnerSize.MEDIUM} />
          <p className="mt-2 text-gray-500">Loading recent activity...</p>
        </div>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className={clsx('h-60', className)}>
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-red-500">Error loading activities</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
      </Card>
    );
  }
  
  if (!user) {
    return (
      <Card className={clsx('h-60', className)}>
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-gray-500">Please log in to view recent activity</p>
        </div>
      </Card>
    );
  }
  
  if (activities.length === 0) {
    return (
      <Card className={className}>
        <div className="flex flex-col">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          <div className="mt-4 flex items-center justify-center h-32">
            <p className="text-gray-500">No recent activity to display</p>
          </div>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <div className="flex flex-col">
        <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        <div className="mt-4">
          <ul className="space-y-4">
            {activities.map((activity) => (
              <li key={activity.id} className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">
                    {getActivityDescription(activity)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDateForDisplay(activity.timestamp)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default RecentActivity;