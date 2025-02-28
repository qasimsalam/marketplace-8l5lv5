/**
 * JobCard Component
 * 
 * A reusable card component for displaying job listings in the AI Talent Marketplace
 * Android application. Presents essential job information including title, 
 * company details, budget/rate, skills required, and application status.
 * 
 * @version 1.0.0
 */

import React, { useMemo } from 'react'; // v18.2.0
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native'; // v0.72.x

// UI Components
import Card, { CardVariant, CardElevation } from '../common/Card';
import Badge, { BadgeVariant, BadgeSize } from '../common/Badge';
import Button, { ButtonVariant, ButtonSize } from '../common/Button';
import Avatar, { AvatarSize } from '../common/Avatar';

// Styles
import { textVariants } from '../../styles/typography';
import { colors } from '../../styles/colors';
import { layout, spacing } from '../../styles/layout';
import { useTheme } from '../../styles/theme';

// Types
import { JobType, JobStatus, JobListItemData } from '../../types/job.types';

// Utilities
import {
  formatJobRate,
  formatJobStatusText,
  formatJobTypeText,
} from '../../utils/format';
import { formatRelativeDateForMobile } from '../../utils/date';

/**
 * Interface defining props for the JobCard component
 */
export interface JobCardProps {
  /** Job data to display */
  job: JobListItemData;
  /** Function to call when the job card is pressed */
  onPress: (jobId: string) => void;
  /** Additional styles to apply to the card */
  style?: StyleProp<ViewStyle>;
  /** Whether to show the apply button */
  showApplyButton?: boolean;
  /** Function to call when the apply button is pressed */
  onApply?: (jobId: string) => void;
  /** Test ID for testing */
  testID?: string;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
}

/**
 * Determines badge variant based on job status
 * 
 * @param status - Job status value
 * @returns Appropriate badge variant for the status
 */
const getStatusBadgeVariant = (status: JobStatus): BadgeVariant => {
  switch (status) {
    case JobStatus.COMPLETED:
      return BadgeVariant.SUCCESS;
    case JobStatus.OPEN:
      return BadgeVariant.PRIMARY;
    case JobStatus.ON_HOLD:
      return BadgeVariant.WARNING;
    case JobStatus.IN_PROGRESS:
      return BadgeVariant.SECONDARY;
    case JobStatus.DRAFT:
      return BadgeVariant.LIGHT;
    case JobStatus.CANCELLED:
      return BadgeVariant.DANGER;
    default:
      return BadgeVariant.SECONDARY;
  }
};

/**
 * A card component that displays job information in a visually appealing format
 * optimized for mobile displays
 */
const JobCard: React.FC<JobCardProps> = ({
  job,
  onPress,
  style,
  showApplyButton = false,
  onApply,
  testID = 'job-card',
  accessibilityLabel,
}) => {
  // Get current theme for styling
  const theme = useTheme();
  
  // Format job data for display
  const statusBadgeVariant = getStatusBadgeVariant(job.status);
  const formattedRate = formatJobRate({
    type: job.type,
    budget: job.budget,
    minBudget: job.minBudget,
    maxBudget: job.maxBudget,
    hourlyRate: job.hourlyRate
  });
  const formattedDate = formatRelativeDateForMobile(job.createdAt);
  const hasSkills = job.requiredSkills && job.requiredSkills.length > 0;
  
  // Memoize styles to prevent unnecessary recalculations
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  return (
    <Card
      variant={CardVariant.DEFAULT}
      elevation={CardElevation.LOW}
      style={[styles.card, style]}
      onPress={() => onPress(job.id)}
      testID={testID}
      accessibilityLabel={accessibilityLabel || `Job: ${job.title}`}
    >
      <View style={styles.container}>
        {/* Company info and job title */}
        <View style={styles.headerSection}>
          <View style={layout.row}>
            <Avatar
              imageUrl={job.posterAvatarUrl}
              name={job.posterName}
              size={AvatarSize.SMALL}
              testID={`${testID}-company-avatar`}
            />
            <View style={styles.companyInfo}>
              <Text style={styles.companyName} numberOfLines={1}>
                {job.posterName}
              </Text>
              <Text style={styles.jobTitle} numberOfLines={1}>
                {job.title}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Job meta information (type, status, date) */}
        <View style={[layout.row, styles.metaSection]}>
          <View style={styles.typeContainer}>
            <Text style={styles.metaLabel}>Type:</Text>
            <Text style={styles.metaValue}>{formatJobTypeText(job.type)}</Text>
          </View>
          
          <View style={styles.statusContainer}>
            <Badge 
              variant={statusBadgeVariant} 
              size={BadgeSize.SM}
              testID={`${testID}-status-badge`}
            >
              {formatJobStatusText(job.status)}
            </Badge>
          </View>
          
          <Text style={styles.date}>{formattedDate}</Text>
        </View>
        
        {/* Budget/Rate information */}
        <View style={styles.budgetSection}>
          <Text style={styles.rateLabel}>
            {job.type === JobType.HOURLY ? 'Rate:' : 'Budget:'}
          </Text>
          <Text style={styles.rateValue}>{formattedRate}</Text>
        </View>
        
        {/* Skills section */}
        {hasSkills && (
          <View style={styles.skillsSection}>
            <Text style={styles.skillsLabel}>Required Skills:</Text>
            <View style={styles.skillsContainer}>
              {job.requiredSkills.slice(0, 3).map((skill, index) => (
                <Badge
                  key={`${job.id}-skill-${index}`}
                  variant={BadgeVariant.SECONDARY}
                  size={BadgeSize.XS}
                  style={styles.skillBadge}
                  testID={`${testID}-skill-badge-${index}`}
                >
                  {skill.name}
                </Badge>
              ))}
              {job.requiredSkills.length > 3 && (
                <Badge 
                  variant={BadgeVariant.LIGHT} 
                  size={BadgeSize.XS}
                  testID={`${testID}-more-skills-badge`}
                >
                  +{job.requiredSkills.length - 3}
                </Badge>
              )}
            </View>
          </View>
        )}
        
        {/* Proposal count & actions */}
        <View style={styles.footerSection}>
          <View style={styles.proposalCount}>
            <Text style={styles.proposalText}>
              {job.proposalCount} {job.proposalCount === 1 ? 'Proposal' : 'Proposals'}
            </Text>
          </View>
          
          <View style={styles.actionsContainer}>
            {showApplyButton && onApply && (
              <Button
                title="Apply"
                size={ButtonSize.SMALL}
                variant={ButtonVariant.PRIMARY}
                onPress={() => onApply(job.id)}
                testID={`${testID}-apply-button`}
              />
            )}
            <Button
              title="View Details"
              size={ButtonSize.SMALL}
              variant={ButtonVariant.OUTLINE}
              onPress={() => onPress(job.id)}
              testID={`${testID}-view-details-button`}
            />
          </View>
        </View>
      </View>
    </Card>
  );
};

/**
 * Create component styles
 */
const createStyles = (theme: any) => StyleSheet.create({
  card: {
    marginVertical: spacing.xs,
    marginHorizontal: spacing.xs,
  },
  container: {
    padding: spacing.xs,
  },
  headerSection: {
    marginBottom: spacing.s,
  },
  companyInfo: {
    marginLeft: spacing.xs,
    flex: 1,
  },
  companyName: {
    ...textVariants.paragraphSmall,
    color: colors.text.secondary,
  },
  jobTitle: {
    ...textVariants.heading5,
    color: colors.text.primary,
    marginTop: spacing.xxs,
  },
  metaSection: {
    marginBottom: spacing.xs,
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusContainer: {
    marginHorizontal: spacing.xs,
  },
  metaLabel: {
    ...textVariants.caption,
    color: colors.text.tertiary,
    marginRight: spacing.xxs,
  },
  metaValue: {
    ...textVariants.caption,
    color: colors.text.secondary,
  },
  date: {
    ...textVariants.caption,
    color: colors.text.tertiary,
  },
  budgetSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  rateLabel: {
    ...textVariants.paragraphSmall,
    color: colors.text.secondary,
    marginRight: spacing.xs,
  },
  rateValue: {
    ...textVariants.paragraphSmall,
    color: colors.primary[600],
    fontWeight: 'bold',
  },
  skillsSection: {
    marginBottom: spacing.s,
  },
  skillsLabel: {
    ...textVariants.caption,
    color: colors.text.tertiary,
    marginBottom: spacing.xxs,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillBadge: {
    marginRight: spacing.xxs,
    marginBottom: spacing.xxs,
  },
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  proposalCount: {
    flex: 1,
  },
  proposalText: {
    ...textVariants.caption,
    color: colors.text.secondary,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
});

export default JobCard;