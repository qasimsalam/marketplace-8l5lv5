import React, { useMemo } from 'react'; // v18.2.0
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from 'react-native'; // 0.72.x
import Ionicons from 'react-native-vector-icons/Ionicons'; // ^9.0.0

import { Card, CardVariant } from '../common/Card';
import { Spinner, SpinnerSize } from '../common/Spinner';
import { colors } from '../../styles/colors';
import useJobs from '../../hooks/useJobs';
import useProfile from '../../hooks/useProfile';
import useAuth from '../../hooks/useAuth';
import {
  formatCurrency,
  formatPercentage,
  formatNumber,
  formatCompactNumber,
} from '../../utils/format';
import { UserRole } from '../../types/profile.types';
import { JobStatus } from '../../types/job.types';

/**
 * Interface defining the props for the StatsItem component
 */
export interface StatsItemProps {
  label: string;
  value: string | number;
  icon: string;
  iconColor: string;
  isLoading: boolean;
  testID?: string;
}

/**
 * Type definition for the StatsItem component props
 */
export interface StatsItemProps {
  label: string;
  value: string | number;
  icon: string;
  iconColor: string;
  isLoading: boolean;
  testID?: string;
}

/**
 * Renders a single statistic card with a label, value, and icon
 * @param StatsItemProps - { label, value, icon, iconColor, isLoading, testID }
 * @returns Rendered stat item card
 */
const StatsItem: React.FC<StatsItemProps> = ({
  label,
  value,
  icon,
  iconColor,
  isLoading,
  testID,
}) => {
  return (
    <Card style={styles.statsItemCard} testID={testID}>
      <View style={styles.statsItemContent}>
        <Ionicons name={icon} size={30} color={iconColor} style={styles.statsItemIcon} />
        <Text style={styles.statsItemLabel}>{label}</Text>
        {isLoading ? (
          <Spinner size={SpinnerSize.SMALL} />
        ) : (
          <Text style={styles.statsItemValue}>
            {typeof value === 'string' ? value : value.toLocaleString()}
          </Text>
        )}
      </View>
    </Card>
  );
};

/**
 * Component that displays statistics specific to freelancer users
 * @param object - { profile, jobs, isLoading }
 * @returns Rendered freelancer statistics section
 */
const FreelancerStats: React.FC<{ profile: any; jobs: any; isLoading: boolean }> = ({
  profile,
  jobs,
  isLoading,
}) => {
  // Calculate total earnings from completed jobs
  const totalEarnings = useMemo(() => {
    if (isLoading || !jobs) return 0;
    return jobs.filter((job: any) => job.status === JobStatus.COMPLETED)
      .reduce((sum: number, job: any) => sum + job.budget, 0);
  }, [jobs, isLoading]);

  // Count active projects (jobs with IN_PROGRESS status)
  const activeProjects = useMemo(() => {
    if (isLoading || !jobs) return 0;
    return jobs.filter((job: any) => job.status === JobStatus.IN_PROGRESS).length;
  }, [jobs, isLoading]);

  // Calculate job success rate (completed jobs / total jobs)
  const jobSuccessRate = useMemo(() => {
    if (isLoading || !jobs) return 0;
    const completedJobs = jobs.filter((job: any) => job.status === JobStatus.COMPLETED).length;
    const totalJobs = jobs.length;
    return totalJobs > 0 ? completedJobs / totalJobs : 0;
  }, [jobs, isLoading]);

  // Calculate average client rating from profile data
  const averageRating = useMemo(() => {
    if (isLoading || !profile || !profile.rating) return 0;
    return profile.rating;
  }, [profile, isLoading]);

  return (
    <View style={styles.statsContainer}>
      <StatsItem
        label="Earnings"
        value={formatCurrency(totalEarnings)}
        icon="cash-outline"
        iconColor={colors.success[500]}
        isLoading={isLoading}
        testID="freelancer-earnings-stat"
      />
      <StatsItem
        label="Active Projects"
        value={activeProjects}
        icon="briefcase-outline"
        iconColor={colors.primary[500]}
        isLoading={isLoading}
        testID="freelancer-active-projects-stat"
      />
      <StatsItem
        label="Job Success"
        value={formatPercentage(jobSuccessRate)}
        icon="checkmark-circle-outline"
        iconColor={colors.info[500]}
        isLoading={isLoading}
        testID="freelancer-job-success-stat"
      />
      <StatsItem
        label="Avg. Rating"
        value={formatNumber(averageRating, 1)}
        icon="star-outline"
        iconColor={colors.warning[500]}
        isLoading={isLoading}
        testID="freelancer-average-rating-stat"
      />
    </View>
  );
};

/**
 * Component that displays statistics specific to employer users
 * @param object - { profile, jobs, isLoading }
 * @returns Rendered employer statistics section
 */
const EmployerStats: React.FC<{ profile: any; jobs: any; isLoading: boolean }> = ({
  profile,
  jobs,
  isLoading,
}) => {
  // Calculate total spent on completed jobs
  const totalSpent = useMemo(() => {
    if (isLoading || !jobs) return 0;
    return jobs.filter((job: any) => job.status === JobStatus.COMPLETED)
      .reduce((sum: number, job: any) => sum + job.budget, 0);
  }, [jobs, isLoading]);

  // Count active projects (jobs with IN_PROGRESS status)
  const activeProjects = useMemo(() => {
    if (isLoading || !jobs) return 0;
    return jobs.filter((job: any) => job.status === JobStatus.IN_PROGRESS).length;
  }, [jobs, isLoading]);

  // Count total hired freelancers (unique freelancer IDs across jobs)
  const hiredTalent = useMemo(() => {
    if (isLoading || !jobs) return 0;
    const freelancerIds = new Set(jobs.map((job: any) => job.freelancerId));
    return freelancerIds.size;
  }, [jobs, isLoading]);

  // Calculate average freelancer rating from job data
  const responseRate = useMemo(() => {
    if (isLoading || !profile || !profile.rating) return 0;
    return profile.rating;
  }, [profile, isLoading]);

  return (
    <View style={styles.statsContainer}>
      <StatsItem
        label="Total Spent"
        value={formatCurrency(totalSpent)}
        icon="card-outline"
        iconColor={colors.primary[500]}
        isLoading={isLoading}
        testID="employer-total-spent-stat"
      />
      <StatsItem
        label="Active Projects"
        value={activeProjects}
        icon="options-outline"
        iconColor={colors.accent[500]}
        isLoading={isLoading}
        testID="employer-active-projects-stat"
      />
      <StatsItem
        label="Talent Hired"
        value={hiredTalent}
        icon="people-outline"
        iconColor={colors.info[500]}
        isLoading={isLoading}
        testID="employer-talent-hired-stat"
      />
      <StatsItem
        label="Response Rate"
        value={formatPercentage(responseRate)}
        icon="chatbubbles-outline"
        iconColor={colors.success[500]}
        isLoading={isLoading}
        testID="employer-response-rate-stat"
      />
    </View>
  );
};

/**
 * Main component that renders statistics based on user role
 * @returns Rendered statistics component
 */
const Stats: React.FC = () => {
  // Get user role from useAuth hook
  const { user } = useAuth();

  // Get profile data from useProfile hook
  const { profileState } = useProfile();

  // Get jobs data from useJobs hook
  const { jobs, loading: jobsLoading } = useJobs();

  // Determine loading state based on hooks
  const profileLoading = profileState.loading;

  // Calculate combined loading state from all data sources
  const isLoading = profileLoading || jobsLoading;

  // Conditionally render FreelancerStats for FREELANCER role
  if (user && user.role === UserRole.FREELANCER) {
    return (
      <FreelancerStats profile={profileState.freelancerProfile} jobs={jobs} isLoading={isLoading} />
    );
  }

  // Conditionally render EmployerStats for EMPLOYER role
  if (user && user.role === UserRole.EMPLOYER) {
    return (
      <EmployerStats profile={profileState.companyProfile} jobs={jobs} isLoading={isLoading} />
    );
  }

  // Handle case where role is not determined yet
  return (
    <View style={styles.container}>
      <Text style={styles.loadingText}>Loading statistics...</Text>
      <Spinner size={SpinnerSize.MEDIUM} />
    </View>
  );
};

/**
 * Styles for the Stats component
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: 10,
  },
  statsItemCard: {
    width: '45%',
    marginBottom: 10,
  },
  statsItemContent: {
    alignItems: 'center',
  },
  statsItemIcon: {
    marginBottom: 5,
  },
  statsItemLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 3,
    textAlign: 'center',
  },
  statsItemValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.tertiary,
    marginBottom: 10,
  },
});

export default Stats;