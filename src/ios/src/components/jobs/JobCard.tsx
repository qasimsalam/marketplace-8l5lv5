import React, { useMemo, useCallback } from 'react'; // v18.2.0
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleProp,
  ViewStyle,
  ImageSourcePropType,
  ScrollView,
} from 'react-native'; // 0.72.x
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // ^9.2.0

import {
  Job,
  JobStatus,
  JobType,
} from '../../types/job.types';
import { Card, CardVariant, CardElevation } from '../common/Card';
import { Badge, BadgeVariant } from '../common/Badge';
import { Avatar, AvatarSize } from '../common/Avatar';
import { Button, ButtonVariant, ButtonSize } from '../common/Button';
import {
  formatDateForDisplay,
  formatRelativeDateForMobile,
} from '../../utils/date';
import {
  formatJobRate,
  truncateText,
  formatJobTypeText,
} from '../../utils/format';
import { useTheme } from '../../styles/theme';
import { useResponsive } from '../../hooks/useResponsive';
import useJobs from '../../hooks/useJobs';

/**
 * Interface defining props for the JobCard component
 */
export interface JobCardProps {
  /** Job data to display */
  job: Job;
  /** Callback function to execute when the card is pressed */
  onPress: (job: Job) => void;
  /** Callback function to execute when the apply button is pressed */
  onApplyPress: (jobId: string) => void;
  /** Additional styles for the card container */
  style?: StyleProp<ViewStyle>;
  /** Whether to display the card in a compact format */
  compact?: boolean;
  /** Whether to show action buttons (e.g., Apply) */
  showActions?: boolean;
  /** Test ID for automated testing */
  testID?: string;
}

/**
 * Maps job status to appropriate badge variant for visual indication
 * @param status Job status
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
      return BadgeVariant.ERROR;
    case JobStatus.ON_HOLD:
      return BadgeVariant.WARNING;
    default:
      return BadgeVariant.SECONDARY;
  }
};

/**
 * Component that displays a job listing in a card format with mobile-optimized layout
 * @param props Component props
 * @returns Rendered job card component
 */
export const JobCard: React.FC<JobCardProps> = ({
  job,
  onPress,
  onApplyPress,
  style,
  compact = false,
  showActions = true,
  testID = 'job-card',
}) => {
  // Destructure job data for easier access
  const {
    id,
    title,
    posterName,
    posterAvatarUrl,
    requiredSkills,
    budget,
    minBudget,
    maxBudget,
    hourlyRate,
    type,
    status,
    isRemote,
    location,
    createdAt,
    proposalCount,
  } = job;

  // Get current theme using useTheme hook
  const theme = useTheme();

  // Get responsive utilities using useResponsive hook
  const { moderateScale, isSmallDevice } = useResponsive();

  // Get user permissions using useJobs hook
  const { canSubmitProposal } = useJobs();

  // Define press handler for job card with proper event handling
  const handleCardPress = useCallback(() => {
    onPress(job);
  }, [job, onPress]);

  // Define apply button press handler with event propagation prevention
  const handleApplyPress = useCallback(
    (jobId: string) => (event: React.SyntheticEvent) => {
      event.stopPropagation();
      onApplyPress(jobId);
    },
    [onApplyPress]
  );

  // Use useMemo to optimize style generation based on props and theme
  const cardStyles = useMemo(() => {
    return StyleSheet.create({
      container: {
        flexDirection: 'column',
        padding: moderateScale(12),
      },
      header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: moderateScale(8),
      },
      title: {
        fontSize: moderateScale(16),
        fontWeight: 'bold',
        color: theme.colors.text.primary,
        flex: 1,
        marginRight: moderateScale(8),
      },
      statusBadge: {
        alignSelf: 'flex-start',
      },
      companyInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: moderateScale(8),
      },
      companyName: {
        fontSize: moderateScale(14),
        color: theme.colors.text.secondary,
        marginLeft: moderateScale(8),
      },
      description: {
        fontSize: moderateScale(14),
        color: theme.colors.text.primary,
        marginBottom: moderateScale(8),
      },
      skillsContainer: {
        marginBottom: moderateScale(8),
      },
      skillsScroll: {
        paddingBottom: moderateScale(4),
      },
      skillBadge: {
        marginRight: moderateScale(4),
      },
      metadataContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: moderateScale(8),
      },
      metadataItem: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      metadataText: {
        fontSize: moderateScale(12),
        color: theme.colors.text.tertiary,
        marginLeft: moderateScale(4),
      },
      actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
      },
      applyButton: {
        marginLeft: moderateScale(8),
      },
    });
  }, [theme, moderateScale]);

  // Render Card component with appropriate variant and elevation for mobile
  return (
    <Card
      style={style}
      variant={CardVariant.DEFAULT}
      elevation={CardElevation.LOW}
      onPress={handleCardPress}
      testID={testID}
      accessibilityLabel={`Job listing: ${title}`}
    >
      <View style={cardStyles.container}>
        {/* Render job header with title and status badge in mobile-optimized layout */}
        <View style={cardStyles.header}>
          <Text style={cardStyles.title} numberOfLines={2}>
            {title}
          </Text>
          <Badge
            variant={getStatusVariant(status)}
            size="SMALL"
            style={cardStyles.statusBadge}
            testID={`${testID}-status`}
          >
            {status}
          </Badge>
        </View>

        {/* Render company/poster information with Avatar sized appropriately for mobile */}
        <View style={cardStyles.companyInfo}>
          <Avatar
            source={{ uri: posterAvatarUrl }}
            size={AvatarSize.SMALL}
            testID={`${testID}-avatar`}
          />
          <Text style={cardStyles.companyName}>{posterName}</Text>
        </View>

        {/* Render truncated job description with appropriate mobile font sizing */}
        <Text style={cardStyles.description} numberOfLines={3}>
          {truncateText(job.description, 150, true)}
        </Text>

        {/* Render required skills as Badge components with horizontal scrolling for mobile */}
        <View style={cardStyles.skillsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={cardStyles.skillsScroll}>
            {requiredSkills.map((skill) => (
              <Badge
                key={skill.id}
                variant={BadgeVariant.LIGHT}
                size="SMALL"
                style={cardStyles.skillBadge}
                testID={`${testID}-skill-${skill.id}`}
              >
                {skill.name}
              </Badge>
            ))}
          </ScrollView>
        </View>

        {/* Render job metadata optimized for mobile (budget/rate, location, date posted) */}
        <View style={cardStyles.metadataContainer}>
          <View style={cardStyles.metadataItem}>
            <MaterialIcons name="attach-money" size={moderateScale(14)} color={theme.colors.text.tertiary} />
            <Text style={cardStyles.metadataText}>
              {formatJobRate({ type, hourlyRate, budget, minBudget, maxBudget })}
            </Text>
          </View>
          <View style={cardStyles.metadataItem}>
            <MaterialIcons name="location-on" size={moderateScale(14)} color={theme.colors.text.tertiary} />
            <Text style={cardStyles.metadataText}>{location || 'Remote'}</Text>
          </View>
          <View style={cardStyles.metadataItem}>
            <MaterialIcons name="date-range" size={moderateScale(14)} color={theme.colors.text.tertiary} />
            <Text style={cardStyles.metadataText}>
              {formatRelativeDateForMobile(createdAt)}
            </Text>
          </View>
        </View>

        {/* Render action buttons conditionally based on user role and permissions */}
        {showActions && (
          <View style={cardStyles.actionsContainer}>
            <Button
              variant={ButtonVariant.OUTLINE}
              size={ButtonSize.SMALL}
              onPress={handleCardPress}
              testID={`${testID}-view-details`}
            >
              View Details
            </Button>
            {canSubmitProposal && (
              <Button
                variant={ButtonVariant.PRIMARY}
                size={ButtonSize.SMALL}
                style={cardStyles.applyButton}
                onPress={handleApplyPress(id)}
                testID={`${testID}-apply`}
              >
                Apply
              </Button>
            )}
          </View>
        )}
      </View>
    </Card>
  );
};

export default JobCard;