/**
 * A reusable card component that displays a user's profile information for the AI Talent Marketplace Android application.
 * The component handles both freelancer and company profiles, showing relevant information such as name, title, skills,
 * verification status, rating, and other professional details with appropriate styling and layout for mobile devices.
 *
 * @version 1.0.0
 */

import React, { useState, useMemo, useCallback } from 'react'; // v18.2.0
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from 'react-native'; // v0.72.x
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // v9.2.0
import FontAwesome from 'react-native-vector-icons/FontAwesome'; // v9.2.0

// Internal component imports
import Card, { CardProps, CardVariant, CardElevation } from '../common/Card';
import Avatar, { AvatarSize } from '../common/Avatar';
import Badge, { BadgeVariant, BadgeSize } from '../common/Badge';
import SkillsList from './SkillsList';

// Type definitions
import {
  FreelancerProfile,
  CompanyProfile,
  ProfileType,
  VerificationStatus,
} from '../../types/profile.types';

// Hook imports
import { useProfile } from '../../hooks/useProfile';
import { useAuth } from '../../hooks/useAuth';

// Utility imports
import { formatCurrency } from '../../utils/format';

// Style imports
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/layout';
import { typography } from '../../styles/typography';

/**
 * Props interface for the ProfileCard component
 */
export interface ProfileCardProps {
  /** ID of the profile to display */
  profileId: string;
  /** Type of profile (freelancer or company) */
  profileType: ProfileType;
  /** Whether to display in a compact format */
  compact?: boolean;
  /** Additional styles to apply to the card */
  style?: StyleProp<ViewStyle>;
  /** Callback function for when the contact button is pressed */
  onContact?: () => void;
  /** Callback function for when the schedule interview button is pressed */
  onSchedule?: () => void;
  /** Callback function for when the download CV button is pressed */
  onDownloadCV?: () => void;
  /** Callback function for when the card is pressed */
  onPress?: () => void;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Returns appropriate badge for verification status
 * @param status Verification status
 * @returns Badge component with appropriate variant and text
 */
const getVerificationBadge = (status: VerificationStatus): JSX.Element => {
  switch (status) {
    case VerificationStatus.VERIFIED:
      return (
        <Badge variant={BadgeVariant.SUCCESS} size={BadgeSize.SM}>
          Verified
        </Badge>
      );
    case VerificationStatus.PENDING:
      return (
        <Badge variant={BadgeVariant.WARNING} size={BadgeSize.SM}>
          Pending
        </Badge>
      );
    case VerificationStatus.UNVERIFIED:
      return (
        <Badge variant={BadgeVariant.LIGHT} size={BadgeSize.SM}>
          Unverified
        </Badge>
      );
    default:
      return (
        <Badge variant={BadgeVariant.LIGHT} size={BadgeSize.SM}>
          Unknown
        </Badge>
      );
  }
};

/**
 * A component that displays user profile information in a card layout
 * @param props Props for the ProfileCard component
 * @returns Rendered profile card with user information
 */
export const ProfileCard: React.FC<ProfileCardProps> = (props) => {
  // Destructure props to access profileId, profileType, and other customization options
  const { profileId, profileType, compact, style, onContact, onSchedule, onDownloadCV, onPress, testID } = props;

  // Use useProfile hook to fetch profile data
  const { profileState } = useProfile();
  const { freelancerProfile, companyProfile, loading } = profileState;

  // Use useAuth hook to determine if current user is viewing their own profile
  const { user } = useAuth();
  const isOwnProfile = user?.id === profileId;

  // Handle loading state with ActivityIndicator
  if (loading) {
    return (
      <Card style={style} testID={testID}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </Card>
    );
  }

  // Determine which profile data to use (freelancer or company) based on profileType
  const profile = profileType === ProfileType.FREELANCER ? freelancerProfile : companyProfile;

  // Ensure profile data is available
  if (!profile) {
    return (
      <Card style={style} testID={testID}>
        <Text>Profile not found</Text>
      </Card>
    );
  }

  // Render Card component with appropriate styling and elevation
  return (
    <Card
      style={[styles.card, style]}
      elevation={CardElevation.MEDIUM}
      onPress={onPress}
      testID={testID}
    >
      {/* Display user avatar/logo in the header section */}
      <View style={styles.header}>
        <Avatar
          imageUrl={profile.avatarUrl}
          name={profileType === ProfileType.FREELANCER ? (profile as FreelancerProfile).firstName + ' ' + (profile as FreelancerProfile).lastName : (profile as CompanyProfile).name}
          size={AvatarSize.LARGE}
          testID={`${testID}-avatar`}
        />

        {/* Show name, title, and verification badges */}
        <View style={styles.headerInfo}>
          <Text style={typography.heading3}>
            {profileType === ProfileType.FREELANCER ? (profile as FreelancerProfile).firstName + ' ' + (profile as FreelancerProfile).lastName : (profile as CompanyProfile).name}
          </Text>
          <Text style={typography.body}>{(profile as FreelancerProfile).title}</Text>

          <View style={styles.badges}>
            {profileType === ProfileType.FREELANCER && getVerificationBadge((profile as FreelancerProfile).identityVerified)}
            {profileType === ProfileType.FREELANCER && getVerificationBadge((profile as FreelancerProfile).skillsVerified)}
            {(profile as CompanyProfile)?.verified && getVerificationBadge((profile as CompanyProfile).verified)}
          </View>
        </View>
      </View>

      {/* Display hourly rate for freelancer profiles */}
      {profileType === ProfileType.FREELANCER && (
        <Text style={styles.rate}>
          {formatCurrency((profile as FreelancerProfile).hourlyRate)}/hr
        </Text>
      )}

      {/* Render expertise levels using SkillsList component */}
      <SkillsList skills={(profile as FreelancerProfile).skills} compact={compact} testID={`${testID}-skills`} />

      {/* Show verification statuses with appropriate badges */}
      <View style={styles.verification}>
        <Text style={typography.body}>Verification Status:</Text>
        <View style={styles.badges}>
          {profileType === ProfileType.FREELANCER && getVerificationBadge((profile as FreelancerProfile).identityVerified)}
          {profileType === ProfileType.FREELANCER && getVerificationBadge((profile as FreelancerProfile).skillsVerified)}
          {(profile as CompanyProfile)?.verified && getVerificationBadge((profile as CompanyProfile).verified)}
        </View>
      </View>

      {/* Display location and availability information */}
      <View style={styles.location}>
        <MaterialIcons name="location-on" size={16} color={colors.gray[500]} />
        <Text style={typography.caption}>{(profile as FreelancerProfile).location}</Text>
      </View>

      {/* Add social links (GitHub, LinkedIn, Kaggle, personal website) */}
      <View style={styles.social}>
        {/* Add social links (GitHub, LinkedIn, Kaggle, personal website) */}
        {(profile as FreelancerProfile).githubUrl && (
          <Pressable style={styles.socialButton} onPress={() => {}} testID={`${testID}-github`}>
            <FontAwesome name="github" size={20} color={colors.gray[500]} />
          </Pressable>
        )}
        {(profile as FreelancerProfile).linkedinUrl && (
          <Pressable style={styles.socialButton} onPress={() => {}} testID={`${testID}-linkedin`}>
            <FontAwesome name="linkedin" size={20} color={colors.gray[500]} />
          </Pressable>
        )}
      </View>

      {/* Add rating and job statistics if available */}
      <View style={styles.stats}>
        <FontAwesome name="star" size={14} color={colors.warning[500]} />
        <Text style={typography.caption}>{(profile as FreelancerProfile).rating} ({(profile as FreelancerProfile).totalJobs} Jobs)</Text>
      </View>

      {/* Render action buttons (Contact, Download CV, Schedule Interview) if not viewing own profile */}
      {!isOwnProfile && (
        <View style={styles.actions}>
          <Pressable style={styles.actionButton} onPress={onContact} testID={`${testID}-contact`}>
            <Text style={styles.actionButtonText}>Contact</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={onDownloadCV} testID={`${testID}-download-cv`}>
            <Text style={styles.actionButtonText}>Download CV</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={onSchedule} testID={`${testID}-schedule`}>
            <Text style={styles.actionButtonText}>Schedule Interview</Text>
          </Pressable>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: spacing.s,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  headerInfo: {
    marginLeft: spacing.s,
  },
  badges: {
    flexDirection: 'row',
    marginTop: spacing.xxs,
  },
  rate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary[500],
    marginBottom: spacing.s,
  },
  verification: {
    marginTop: spacing.s,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxs,
  },
  social: {
    flexDirection: 'row',
    marginTop: spacing.s,
  },
  socialButton: {
    marginRight: spacing.s,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.s,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.s,
  },
  actionButton: {
    backgroundColor: colors.primary[500],
    padding: spacing.xs,
    borderRadius: 5,
  },
  actionButtonText: {
    color: colors.white,
  },
});