import React, { useState, useEffect, useCallback, useMemo } from 'react'; // react ^18.2.0
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Share,
  Image,
  Alert,
  Linking,
} from 'react-native'; // react-native ^0.72.0
import { useRoute, useNavigation } from '@react-navigation/native'; // @react-navigation/native ^6.1.7
import { useToast } from 'react-native-toast-notifications'; // react-native-toast-notifications ^3.4.0
import MaterialIcons from '@expo/vector-icons/MaterialIcons'; // @expo/vector-icons ^13.0.0

// Internal imports
import { useJobs } from '../../hooks/useJobs';
import { useAuth } from '../../hooks/useAuth';
import Button, { ButtonVariant } from '../../components/common/Button';
import Card from '../../components/common/Card';
import ProposalForm from '../../components/jobs/ProposalForm';
import Badge, { BadgeVariant } from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import { UserRole } from '../../../backend/shared/src/types/user.types';
import {
  JobType,
  JobStatus,
  Job,
  ProposalFormValues,
} from '../../types/job.types';
import {
  formatJobRate,
  formatJobStatusText,
  formatJobTypeText,
} from '../../utils/format';
import { formatDate, formatRelativeDateForMobile } from '../../utils/date';

// Global constants
const SKILL_TAG_LIMIT = 5;

/**
 * Main screen component for displaying job details and related actions
 */
export const JobDetailScreen: React.FC = () => {
  // Get route parameters to extract jobId
  const { jobId } = useRoute().params as { jobId: string };

  // Initialize navigation hooks for screen navigation
  const navigation = useNavigation();

  // Initialize useJobs hook to fetch job details and access job state
  const { getJob, jobsState, submitProposal } = useJobs();

  // Initialize useAuth hook to access user authentication state
  const { user, isAuthenticated } = useAuth();

  // Setup local state for refreshing, showProposalForm, and expandedDescription
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showProposalForm, setShowProposalForm] = useState<boolean>(false);
  const [expandedDescription, setExpandedDescription] = useState<boolean>(false);

  // Fetch job details on component mount using the jobId from route params
  useEffect(() => {
    if (jobId) {
      getJob(jobId);
    }
  }, [jobId, getJob]);

  // Implement onRefresh function to refresh job data on pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    getJob(jobId)
      .finally(() => setRefreshing(false));
  }, [jobId, getJob]);

  // Set up conditional rendering based on loading state
  if (jobsState.loading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner />
      </View>
    );
  }

  if (jobsState.error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{jobsState.error}</Text>
      </View>
    );
  }

  // Get the current job from jobsState
  const job = jobsState.currentJob;

  // Implement toggleDescription function to expand/collapse description
  const toggleDescription = () => {
    setExpandedDescription(!expandedDescription);
  };

  // Implement toggleProposalForm function to show/hide proposal form
  const toggleProposalForm = () => {
    setShowProposalForm(!showProposalForm);
  };

  // Implement shareJob function to share job via Android share sheet
  const shareJob = async () => {
    try {
      await Share.share({
        message: `Check out this AI job: ${job?.title} - ${job?.description}`,
      });
    } catch (error: any) {
      Alert.alert('Sharing failed', error.message);
    }
  };

  // Implement applyToJob function to navigate to proposal submission
  const applyToJob = () => {
    // Navigate to proposal submission screen or show proposal form
  };

  // Implement handleContactEmployer function to initiate contact
  const handleContactEmployer = () => {
    // Implement contact employer logic
  };

  // Function to determine the appropriate badge variant based on job status
  const getStatusBadgeVariant = (status: JobStatus): BadgeVariant => {
    switch (status) {
      case JobStatus.OPEN:
        return BadgeVariant.PRIMARY;
      case JobStatus.IN_PROGRESS:
        return BadgeVariant.INFO;
      case JobStatus.COMPLETED:
        return BadgeVariant.SUCCESS;
      case JobStatus.CANCELLED:
        return BadgeVariant.DANGER;
      case JobStatus.ON_HOLD:
        return BadgeVariant.WARNING;
      default:
        return BadgeVariant.LIGHT;
    }
  };

  // Function to handle the proposal form submission
  const onSubmitProposal = async (values: ProposalFormValues) => {
    // Implement proposal submission logic
  };

  // Conditional rendering based on user role (employer/freelancer)
  const isEmployer = user?.role === UserRole.EMPLOYER;
  const isFreelancer = user?.role === UserRole.FREELANCER;

  // Return a ScrollView with RefreshControl for pull-to-refresh
  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      style={styles.container}
    >
      {/* Render job header section with title, company, and status badge */}
      <Card style={styles.headerCard}>
        <View style={styles.headerContent}>
          <Text style={styles.jobTitle}>{job?.title}</Text>
          <Text style={styles.companyName}>
            {job?.posterCompanyName || 'Company Name'}
          </Text>
          {job?.status && (
            <Badge variant={getStatusBadgeVariant(job.status)}>
              {formatJobStatusText(job.status)}
            </Badge>
          )}
        </View>
      </Card>

      {/* Render job details section with description, type, budget, etc. */}
      <Card style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>Job Details</Text>
        <Text style={styles.jobDescription} numberOfLines={expandedDescription ? undefined : 3}>
          {job?.description}
        </Text>
        {!expandedDescription && (
          <TouchableOpacity onPress={toggleDescription}>
            <Text style={styles.readMoreText}>Read More</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.detailItem}>
          Type: {formatJobTypeText(job?.type)}
        </Text>
        <Text style={styles.detailItem}>
          Rate: {formatJobRate(job)}
        </Text>
      </Card>

      {/* Render skills section with skill badges */}
      <Card style={styles.skillsCard}>
        <Text style={styles.sectionTitle}>Skills</Text>
        <View style={styles.skillsContainer}>
          {job?.requiredSkills.slice(0, SKILL_TAG_LIMIT).map((skill) => (
            <Badge key={skill.id}>{skill.name}</Badge>
          ))}
          {job?.requiredSkills.length > SKILL_TAG_LIMIT && (
            <Text style={styles.moreSkillsText}>
              +{job?.requiredSkills.length - SKILL_TAG_LIMIT} more
            </Text>
          )}
        </View>
      </Card>

      {/* Render employer info section with contact options */}
      <Card style={styles.employerCard}>
        <Text style={styles.sectionTitle}>Employer Info</Text>
        <TouchableOpacity onPress={handleContactEmployer}>
          <Text style={styles.contactText}>Contact Employer</Text>
        </TouchableOpacity>
      </Card>

      {/* Render action buttons based on user role and job status */}
      <View style={styles.actionButtons}>
        {isFreelancer && job?.status === JobStatus.OPEN && (
          <Button title="Apply for Job" onPress={toggleProposalForm} />
        )}
        <Button title="Share Job" variant={ButtonVariant.OUTLINE} onPress={shareJob} />
      </View>

      {/* Conditionally render proposal form when showProposalForm is true */}
      {showProposalForm && (
        <ProposalForm
          jobId={jobId}
          job={job}
          onSuccess={toggleProposalForm}
          onCancel={toggleProposalForm}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f0f0f0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
  },
  headerCard: {
    marginBottom: 16,
  },
  headerContent: {
    alignItems: 'center',
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  companyName: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 16,
  },
  detailsCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  jobDescription: {
    fontSize: 16,
    marginBottom: 8,
  },
  readMoreText: {
    color: 'blue',
  },
  detailItem: {
    fontSize: 14,
    marginBottom: 4,
  },
  skillsCard: {
    marginBottom: 16,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  moreSkillsText: {
    fontSize: 14,
    color: 'gray',
    marginLeft: 8,
  },
  employerCard: {
    marginBottom: 16,
  },
  contactText: {
    color: 'blue',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});

export default JobDetailScreen;