import React, { useEffect, useCallback } from 'react'; // ^18.2.0
import { useRouter } from 'next/navigation'; // ^13.5.0

import Stats from '../../components/dashboard/Stats';
import Notifications, { NotificationType } from '../../components/dashboard/Notifications';
import RecentActivity from '../../components/dashboard/RecentActivity';
import JobList, { ViewMode } from '../../components/jobs/JobList';
import { Card, CardVariant } from '../../components/common/Card';
import { Button, ButtonVariant } from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';
import { useJobs } from '../../hooks/useJobs';
import { UserRole } from '../../types/auth';

/**
 * Main dashboard page component that displays a personalized overview for authenticated users
 */
const Dashboard: React.FC = () => {
  // Initialize router for navigation
  const router = useRouter();

  // Get authenticated user and authentication state from useAuth hook
  const { user, isAuthenticated } = useAuth();

  // Get recommended jobs and job loading state from useJobs hook
  const { recommendedJobs, isLoading, getRecommendations } = useJobs();

  // Set up state for dashboard sections loading status
  // const [statsLoading, setStatsLoading] = useState<boolean>(true); // Removed, Stats component handles its own loading
  // const [notificationsLoading, setNotificationsLoading] = useState<boolean>(true); // Notifications component handles its own loading
  // const [activityLoading, setActivityLoading] = useState<boolean>(true); // RecentActivity component handles its own loading

  // Use effect to fetch recommended jobs when component mounts
  useEffect(() => {
    if (isAuthenticated && user?.role === UserRole.EMPLOYER) {
      getRecommendations();
    }
  }, [isAuthenticated, user, getRecommendations]);

  // Define handleJobClick function to navigate to job details
  const handleJobClick = useCallback((jobId: string) => {
    router.push(`/jobs/${jobId}`);
  }, [router]);

  // Define handleViewAllJobs function to navigate to jobs page
  const handleViewAllJobs = useCallback(() => {
    router.push('/jobs');
  }, [router]);

  // Define handleViewAllNotifications function to navigate to notifications page
  const handleViewAllNotifications = useCallback(() => {
    router.push('/notifications');
  }, [router]);

  // Return the dashboard layout with responsive grid system
  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Dashboard heading */}
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">
        {user?.role === UserRole.FREELANCER ? 'Freelancer Dashboard' : 'Employer Dashboard'}
      </h1>

      {/* Responsive grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Stats section */}
        <Stats className="col-span-1 md:col-span-2 lg:col-span-1" />

        {/* Notifications section */}
        <Card className="col-span-1 md:col-span-1 lg:col-span-1" variant={CardVariant.DEFAULT}>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Notifications</h2>
            <Button variant={ButtonVariant.GHOST} onClick={handleViewAllNotifications}>
              View All
            </Button>
          </div>
          <Notifications limit={5} />
        </Card>

        {/* Recent Activity section */}
        <RecentActivity className="col-span-1 md:col-span-1 lg:col-span-1" />

        {/* Recommended jobs section */}
        {user?.role === UserRole.EMPLOYER ? (
          <Card className="col-span-1 md:col-span-2 lg:col-span-2" variant={CardVariant.DEFAULT}>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">Recommended AI Experts</h2>
              <Button variant={ButtonVariant.GHOST} onClick={handleViewAllJobs}>
                View All
              </Button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Here are some AI Experts that we think would be a great fit for your project.
            </p>
            <JobList
              jobs={recommendedJobs}
              isLoading={isLoading}
              onJobClick={handleJobClick}
              showFilters={false}
              showViewToggle={false}
              emptyStateMessage="No AI Experts found matching your criteria."
            />
          </Card>
        ) : (
          <Card className="col-span-1 md:col-span-2 lg:col-span-2" variant={CardVariant.DEFAULT}>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">Recommended Jobs</h2>
              <Button variant={ButtonVariant.GHOST} onClick={handleViewAllJobs}>
                View All
              </Button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Based on your skills and preferences, these jobs might be a good fit for you.
            </p>
            <JobList
              jobs={recommendedJobs}
              isLoading={isLoading}
              onJobClick={handleJobClick}
              showFilters={false}
              showViewToggle={false}
              emptyStateMessage="No jobs found matching your criteria."
            />
          </Card>
        )}
      </div>
    </div>
  );
};

// Default export of the Dashboard component for Next.js page
export default Dashboard;