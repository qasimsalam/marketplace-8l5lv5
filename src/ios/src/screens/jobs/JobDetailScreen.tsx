import React, { useState, useEffect, useCallback, useMemo } from 'react'; // ^18.2.0
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native'; // 0.72.x
import {
  RouteProp,
  useRoute,
  useNavigation,
} from '@react-navigation/native'; // ^6.1.7
import { StackNavigationProp } from '@react-navigation/stack'; // ^6.3.17
import Ionicons from '@expo/vector-icons/Ionicons'; // ^13.0.0
import { useToast } from 'react-native-toast-message'; // ^2.1.6

import {
  Job,
  JobType,
  JobStatus,
} from '../../types/job.types';
import useJobs from '../../hooks/useJobs';
import useAuth from '../../hooks/useAuth';
import { SafeAreaView, EdgeMode } from '../../components/common/SafeAreaView';
import { Button, ButtonVariant, ButtonSize } from '../../components/common/Button';
import { Card, CardVariant, CardElevation } from '../../components/common/Card';
import { Spinner, SpinnerSize } from '../../components/common/Spinner';
import ProposalForm from '../../components/jobs/ProposalForm';
import { colors } from '../../styles/colors';
import { textVariants } from '../../styles/typography';
import { formatDateForDisplay, formatCurrency } from '../../utils/date';
import { moderateScale } from '../../utils/responsive';

/**
 * Type definition for the route parameters expected by this screen
 */
type RootStackParamList = {
  JobDetailScreen: { jobId: string };
};

/**
 * Type definition for the navigation properties
 */
type JobDetailScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'JobDetailScreen'
>;

/**
 * Type definition for the route properties
 */
type JobDetailScreenRouteProp = RouteProp<RootStackParamList, 'JobDetailScreen'>;

/**
 * Displays detailed information about a specific job posting
 */
const JobDetailScreen: React.FC = () => {
  // Extract jobId parameter from route using useRoute hook
  const route = useRoute<JobDetailScreenRouteProp>();
  const { jobId } = route.params;

  // Get navigation functions using useNavigation hook
  const navigation = useNavigation<JobDetailScreenNavigationProp>();

  // Initialize state for showing proposal form modal
  const [showProposalForm, setShowProposalForm] = useState(false);

  // Access job data and functions from useJobs hook
  const { getJob, currentJob, loading, error, canSubmitProposal } = useJobs();

  // Access user data and permissions from useAuth hook
  const { user, hasPermission } = useAuth();

  // Initialize state for refreshing
  const [refreshing, setRefreshing] = useState(false);

  // Access toast notification
  const toast = useToast();

  /**
   * Fetches job data when component mounts or jobId changes
   */
  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        await getJob(jobId);
      } catch (e: any) {
        console.error('Failed to load job details', e);
        toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load job details',
        });
      }
    };

    fetchJobDetails();
  }, [jobId, getJob, toast]);

  /**
   * Create handleRefresh function for pull-to-refresh functionality
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await getJob(jobId);
    } catch (e: any) {
      console.error('Failed to refresh job details', e);
      toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to refresh job details',
      });
    } finally {
      setRefreshing(false);
    }
  }, [jobId, getJob, toast]);

  /**
   * Create handleSubmitProposal function to open proposal form
   */
  const handleSubmitProposal = useCallback(() => {
    setShowProposalForm(true);
  }, []);

  /**
   * Create handleProposalSuccess function to handle successful submission
   */
  const handleProposalSuccess = useCallback(() => {
    setShowProposalForm(false);
    navigation.goBack();
  }, [navigation]);

  /**
   * Create handleShare function to share job with other users
   */
  const handleShare = useCallback(async () => {
    if (currentJob) {
      try {
        await Share.share({
          message: `Check out this AI job: ${currentJob.title} - ${currentJob.description}`,
          title: currentJob.title,
        });
      } catch (error: any) {
        Alert.alert('Error', `Failed to share job: ${error.message}`);
      }
    }
  }, [currentJob]);

  /**
   * Create handleContact function to contact job poster
   */
  const handleContact = useCallback(async () => {
    if (currentJob) {
      const email = 'mailto:' + currentJob.posterId; // Replace with actual email field
      Linking.openURL(email).catch((err) =>
        Alert.alert('Error', 'Could not open email client.')
      );
    }
  }, [currentJob]);

  /**
   * Determine action buttons based on user role and job status
   */
  const actionButtons = useMemo(() => {
    const buttons = [];

    if (user?.role === 'freelancer' && currentJob?.status === 'open' && canSubmitProposal) {
      buttons.push({
        text: 'Apply for Job',
        onPress: handleSubmitProposal,
        variant: ButtonVariant.PRIMARY,
      });
    }

    if (user?.role === 'employer') {
      buttons.push({
        text: 'Edit Job',
        onPress: () => {
          // Implement edit job navigation
        },
        variant: ButtonVariant.OUTLINE,
      });
    }

    buttons.push({
      text: 'Contact',
      onPress: handleContact,
      variant: ButtonVariant.SECONDARY,
    });

    buttons.push({
      text: 'Share',
      onPress: handleShare,
      variant: ButtonVariant.LINK,
    });

    return buttons;
  }, [currentJob, user, handleContact, handleShare, handleSubmitProposal, canSubmitProposal]);

  /**
   * Calculate job budget/rate display format based on job type
   */
  const budgetDisplay = useMemo(() => {
    if (!currentJob) {
      return 'Budget not specified';
    }
    return formatBudget(currentJob);
  }, [currentJob]);

  /**
   * Generate appropriate badge styling based on job status
   */
  const statusBadgeStyle = useMemo(() => {
    if (!currentJob) {
      return {};
    }
    return getStatusBadgeStyle(currentJob.status);
  }, [currentJob]);

  /**
   * Render loading spinner when job data is loading
   */
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Spinner size={SpinnerSize.LARGE} />
      </SafeAreaView>
    );
  }

  /**
   * Render error message if job fetch fails
   */
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorContainer}>Error: {error}</Text>
      </SafeAreaView>
    );
  }

  /**
   * Render ScrollView with RefreshControl for pull-to-refresh
   */
  return (
    <SafeAreaView style={styles.container} edges={EdgeMode.TOP}>
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Render job header with title, company, status badge */}
        <View style={styles.header}>
          <Text style={styles.titleText}>{currentJob?.title}</Text>
          <TouchableOpacity style={styles.statusBadge} disabled={true}>
            <Text style={[styles.statusText, statusBadgeStyle]}>
              {currentJob?.status}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Render job details section with description, budget, dates */}
        <Card style={styles.section} elevation={CardElevation.LOW}>
          <Text style={styles.sectionTitle}>Job Details</Text>
          <Text style={styles.description}>{currentJob?.description}</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Budget:</Text>
            <Text style={styles.detailValue}>{budgetDisplay}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Posted Date:</Text>
            <Text style={styles.detailValue}>
              {formatDateForDisplay(currentJob?.createdAt)}
            </Text>
          </View>
        </Card>

        {/* Render required skills section with skill badges */}
        <Card style={styles.section} elevation={CardElevation.LOW}>
          <Text style={styles.sectionTitle}>Required Skills</Text>
          <View style={styles.skillsContainer}>
            {currentJob?.requiredSkills.map((skill) => (
              <TouchableOpacity key={skill.id} style={styles.skillBadge} disabled={true}>
                <Text style={styles.skillText}>{skill.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Render job poster information section */}
        <Card style={styles.section} elevation={CardElevation.LOW}>
          <Text style={styles.sectionTitle}>Job Poster</Text>
          <View style={styles.posterCard}>
            {/* Implement poster info display */}
          </View>
        </Card>

        {/* Render action buttons based on user role (apply, contact, edit, share) */}
        <View style={styles.actionButtons}>
          {actionButtons.map((button, index) => (
            <Button
              key={index}
              text={button.text}
              onPress={button.onPress}
              variant={button.variant}
            />
          ))}
        </View>

        {/* Render proposal form modal when showProposalForm is true */}
        <Modal
          visible={showProposalForm}
          animationType="slide"
        >
          <SafeAreaView style={styles.container}>
            <ProposalForm
              job={currentJob}
              onSubmitSuccess={handleProposalSuccess}
              onCancel={() => setShowProposalForm(false)}
            />
          </SafeAreaView>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

/**
 * Formats the job budget for display based on job type
 */
const formatBudget = (job: Job): string => {
  if (job.type === JobType.FIXED_PRICE) {
    return `Fixed: ${formatCurrency(job.budget)}`;
  } else if (job.type === JobType.HOURLY) {
    return `${formatCurrency(job.hourlyRate)}/hr (Est. ${formatCurrency(job.budget)})`;
  } else if (job.type === JobType.MILESTONE_BASED) {
    return `Milestone: ${formatCurrency(job.budget)}`;
  } else {
    return 'Budget not specified';
  }
};

/**
 * Returns style object for job status badge
 */
const getStatusBadgeStyle = (status: JobStatus): object => {
  switch (status) {
    case JobStatus.OPEN:
      return {
        backgroundColor: colors.success[500],
        textColor: colors.text.inverse,
      };
    case JobStatus.IN_PROGRESS:
      return {
        backgroundColor: colors.primary[500],
        textColor: colors.text.inverse,
      };
    case JobStatus.COMPLETED:
      return {
        backgroundColor: colors.gray[500],
        textColor: colors.text.inverse,
      };
    case JobStatus.CANCELLED:
      return {
        backgroundColor: colors.error[500],
        textColor: colors.text.inverse,
      };
    case JobStatus.ON_HOLD:
      return {
        backgroundColor: colors.warning[500],
        textColor: colors.text.inverse,
      };
    case JobStatus.DRAFT:
      return {
        backgroundColor: colors.gray[500],
        textColor: colors.text.inverse,
      };
    default:
      return {
        backgroundColor: colors.gray[500],
        textColor: colors.text.inverse,
      };
  }
};

/**
 * Styles for the JobDetailScreen component
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: moderateScale(16),
  },
  titleText: {
    ...textVariants.heading2,
    flex: 1,
  },
  section: {
    padding: moderateScale(16),
    margin: moderateScale(8),
  },
  sectionTitle: {
    ...textVariants.heading4,
    marginBottom: moderateScale(8),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: moderateScale(4),
  },
  detailLabel: {
    ...textVariants.paragraphSmall,
    fontWeight: 'bold',
  },
  detailValue: {
    ...textVariants.paragraphSmall,
  },
  description: {
    ...textVariants.paragraph,
    marginBottom: moderateScale(16),
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillBadge: {
    backgroundColor: colors.gray[200],
    borderRadius: moderateScale(10),
    paddingVertical: moderateScale(5),
    paddingHorizontal: moderateScale(10),
    marginRight: moderateScale(5),
    marginBottom: moderateScale(5),
  },
  skillText: {
    ...textVariants.caption,
  },
  statusBadge: {
    borderRadius: moderateScale(10),
    paddingVertical: moderateScale(5),
    paddingHorizontal: moderateScale(10),
  },
  statusText: {
    ...textVariants.caption,
    color: colors.text.inverse,
  },
  actionButtons: {
    flexDirection: 'column',
    justifyContent: 'space-around',
    padding: moderateScale(16),
  },
  posterCard: {
    // Implement poster card styles
  },
  posterInfo: {
    // Implement poster info styles
  },
  avatarContainer: {
    // Implement avatar container styles
  },
  avatar: {
    // Implement avatar styles
  },
  errorContainer: {
    // Implement error container styles
  },
});

export default JobDetailScreen;