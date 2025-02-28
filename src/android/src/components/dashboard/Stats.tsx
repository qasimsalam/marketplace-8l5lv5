/**
 * A React Native component that displays key performance metrics and statistics for users
 * on the AI Talent Marketplace dashboard. It shows different sets of statistics based on the
 * user role (freelancer or employer) and provides interactive elements to navigate to related screens.
 *
 * @version 1.0.0
 */

import React, { useMemo, useEffect, useState } from 'react'; // react ^18.2.0
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'; // react-native 0.72.x
import { MaterialIcons } from '@expo/vector-icons'; // @expo/vector-icons ^13.0.0
import { useNavigation } from '@react-navigation/native'; // @react-navigation/native ^6.1.7

import Card from '../common/Card';
import Spinner from '../common/Spinner';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/layout';
import { typography } from '../../styles/typography';
import { useJobs } from '../../hooks/useJobs';
import { useProfile } from '../../hooks/useProfile';
import { useAuth } from '../../hooks/useAuth';
import {
  formatCurrency,
  formatPercentage,
  formatNumber,
  formatCompactNumber,
} from '../../utils/format';
import { UserRole } from '../../../backend/shared/src/types/user.types';
import { JobStatus } from '../../../backend/shared/src/types/job.types';

/**
 * Enum defining the types of statistics that can be displayed and used for navigation
 */
export enum StatType {
  EARNINGS = 'EARNINGS',
  ACTIVE_PROJECTS = 'ACTIVE_PROJECTS',
  SUCCESS_RATE = 'SUCCESS_RATE',
  RATINGS = 'RATINGS',
  SPENT = 'SPENT',
  HIRED_TALENT = 'HIRED_TALENT',
  RESPONSE_RATE = 'RESPONSE_RATE',
}

/**
 * Props interface for the Stats component
 */
export interface StatsProps {
  /** Callback function to handle stat press events */
  onStatPress: (type: StatType) => void;
  /** Test ID for automated testing */
  testID?: string;
}

/**
 * Props interface for the StatsItem component
 */
export interface StatsItemProps {
  /** Label for the statistic */
  label: string;
  /** Value of the statistic */
  value: string | number;
  /** Icon name from MaterialIcons */
  icon: string;
  /** Icon color */
  iconColor: string;
  /** Whether the statistic is loading */
  isLoading: boolean;
  /** Test ID for automated testing */
  testID?: string;
  /** Callback function to handle press events */
  onPress?: () => void;
}

/**
 * Renders a single statistic card with a label, value, and icon
 */
const StatsItem: React.FC<StatsItemProps> = ({
  label,
  value,
  icon,
  iconColor,
  isLoading,
  testID,
  onPress,
}) => {
  return (
    <Card
      variant="elevated"
      elevation="medium"
      style={styles.statItemCard}
      testID={testID}
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
    >
      <View style={styles.statItemContainer}>
        <MaterialIcons name={icon} size={32} color={iconColor} />
        <Text style={styles.statItemLabel}>{label}</Text>
        {isLoading ? (
          <Spinner size="small" color="primary" />
        ) : (
          <Text style={styles.statItemValue}>{value}</Text>
        )}
      </View>
    </Card>
  );
};

/**
 * Component that displays statistics specific to freelancer users
 */
const FreelancerStats: React.FC<{
  profile: any;
  jobs: any;
  isLoading: boolean;
  onStatPress: (type: StatType) => void;
}> = ({ profile, jobs, isLoading, onStatPress }) => {
  // Calculate total earnings from completed jobs
  const totalEarnings = useMemo(() => {
    if (!jobs || jobs.length === 0) return 0;
    return jobs.reduce((sum: number, job: any) => {
      return sum + (job.status === JobStatus.COMPLETED ? job.budget : 0);
    }, 0);
  }, [jobs]);

  // Count active projects (jobs with IN_PROGRESS status)
  const activeProjectsCount = useMemo(() => {
    if (!jobs) return 0;
    return jobs.filter((job: any) => job.status === JobStatus.IN_PROGRESS).length;
  }, [jobs]);

  // Calculate job success rate (completed jobs / total jobs)
  const jobSuccessRate = useMemo(() => {
    if (!jobs || jobs.length === 0) return 0;
    const completedJobs = jobs.filter((job: any) => job.status === JobStatus.COMPLETED).length;
    return completedJobs / jobs.length;
  }, [jobs]);

  // Calculate average client rating from profile data
  const averageRating = useMemo(() => {
    return profile?.rating || 0;
  }, [profile]);

  return (
    <View style={styles.statsGrid}>
      <StatsItem
        label="Earnings"
        value={formatCurrency(totalEarnings)}
        icon="attach-money"
        iconColor={colors.success[500]}
        isLoading={isLoading}
        testID="freelancer-earnings-stat"
        onPress={() => onStatPress(StatType.EARNINGS)}
      />
      <StatsItem
        label="Active Projects"
        value={formatNumber(activeProjectsCount)}
        icon="assignment"
        iconColor={colors.primary[500]}
        isLoading={isLoading}
        testID="freelancer-active-projects-stat"
        onPress={() => onStatPress(StatType.ACTIVE_PROJECTS)}
      />
      <StatsItem
        label="Success Rate"
        value={formatPercentage(jobSuccessRate)}
        icon="trending-up"
        iconColor={colors.accent[500]}
        isLoading={isLoading}
        testID="freelancer-success-rate-stat"
        onPress={() => onStatPress(StatType.SUCCESS_RATE)}
      />
      <StatsItem
        label="Avg. Rating"
        value={formatNumber(averageRating, 1)}
        icon="star"
        iconColor={colors.warning[500]}
        isLoading={isLoading}
        testID="freelancer-average-rating-stat"
        onPress={() => onStatPress(StatType.RATINGS)}
      />
    </View>
  );
};

/**
 * Component that displays statistics specific to employer users
 */
const EmployerStats: React.FC<{
  profile: any;
  jobs: any;
  isLoading: boolean;
  onStatPress: (type: StatType) => void;
}> = ({ profile, jobs, isLoading, onStatPress }) => {
  // Calculate total spent on completed jobs
  const totalSpent = useMemo(() => {
    if (!jobs || jobs.length === 0) return 0;
    return jobs.reduce((sum: number, job: any) => {
      return sum + (job.status === JobStatus.COMPLETED ? job.budget : 0);
    }, 0);
  }, [jobs]);

  // Count active projects (jobs with IN_PROGRESS status)
  const activeProjectsCount = useMemo(() => {
    if (!jobs) return 0;
    return jobs.filter((job: any) => job.status === JobStatus.IN_PROGRESS).length;
  }, [jobs]);

  // Count total hired freelancers (unique freelancer IDs across jobs)
  const hiredTalentCount = useMemo(() => {
    if (!jobs) return 0;
    const freelancerIds = new Set(jobs.map((job: any) => job.freelancerId).filter(Boolean));
    return freelancerIds.size;
  }, [jobs]);

  // Calculate average freelancer rating from job data
  const responseRate = useMemo(() => {
    return profile?.rating || 0;
  }, [profile]);

  return (
    <View style={styles.statsGrid}>
      <StatsItem
        label="Total Spent"
        value={formatCurrency(totalSpent)}
        icon="shopping-cart"
        iconColor={colors.success[500]}
        isLoading={isLoading}
        testID="employer-total-spent-stat"
        onPress={() => onStatPress(StatType.SPENT)}
      />
      <StatsItem
        label="Active Projects"
        value={formatNumber(activeProjectsCount)}
        icon="assignment"
        iconColor={colors.primary[500]}
        isLoading={isLoading}
        testID="employer-active-projects-stat"
        onPress={() => onStatPress(StatType.ACTIVE_PROJECTS)}
      />
      <StatsItem
        label="Hired Talent"
        value={formatNumber(hiredTalentCount)}
        icon="people"
        iconColor={colors.accent[500]}
        isLoading={isLoading}
        testID="employer-hired-talent-stat"
        onPress={() => onStatPress(StatType.HIRED_TALENT)}
      />
      <StatsItem
        label="Response Rate"
        value={formatPercentage(responseRate)}
        icon="mail"
        iconColor={colors.warning[500]}
        isLoading={isLoading}
        testID="employer-response-rate-stat"
        onPress={() => onStatPress(StatType.RESPONSE_RATE)}
      />
    </View>
  );
};

/**
 * Main component that renders statistics based on user role with mobile-optimized layout
 */
export const Stats: React.FC<StatsProps> = ({ onStatPress, testID }) => {
  // Get user role from useAuth hook
  const { user, isAuthenticated } = useAuth();

  // Get profile data from useProfile hook
  const { profileState, getFreelancerProfile, getCompanyProfile } = useProfile();

  // Get jobs data from useJobs hook
  const { jobsState } = useJobs();

  // Determine loading state based on hooks
  const profileLoading = profileState.loading;
  const jobsLoading = jobsState.loading;

  // Calculate combined loading state from all data sources
  const isLoading = profileLoading || jobsLoading;

  // Implement stat press handler to forward to parent component
  const handleStatPress = (type: StatType) => {
    onStatPress(type);
  };

  // Conditionally render FreelancerStats for FREELANCER role
  if (isAuthenticated && user?.role === UserRole.FREELANCER) {
    return (
      <View style={styles.container} testID={testID} accessibilityLabel="Freelancer Statistics">
        <FreelancerStats
          profile={profileState.freelancerProfile}
          jobs={jobsState.jobs}
          isLoading={isLoading}
          onStatPress={handleStatPress}
        />
      </View>
    );
  }

  // Conditionally render EmployerStats for EMPLOYER role
  if (isAuthenticated && user?.role === UserRole.EMPLOYER) {
    return (
      <View style={styles.container} testID={testID} accessibilityLabel="Employer Statistics">
        <EmployerStats
          profile={profileState.companyProfile}
          jobs={jobsState.jobs}
          isLoading={isLoading}
          onStatPress={handleStatPress}
        />
      </View>
    );
  }

  // Handle case where role is not determined yet
  return (
    <View style={styles.container} testID={testID} accessibilityLabel="Loading Statistics">
      <Spinner size="medium" color="primary" />
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.m,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItemCard: {
    width: '48%', // Two items per row with some spacing
    marginBottom: spacing.m,
  },
  statItemContainer: {
    alignItems: 'center',
    paddingVertical: spacing.s,
  },
  statItemLabel: {
    ...typography.label,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  statItemValue: {
    ...typography.heading5,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});