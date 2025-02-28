/**
 * ProfileCard Component
 * 
 * A reusable card component that displays an AI professional's profile information
 * in a compact, visually appealing format. The component shows the user's avatar,
 * name, job title, verification status, hourly rate, availability, and a preview
 * of their top skills.
 * 
 * @version react-native 0.72.x
 */

import React, { useState, useMemo } from 'react'; // v18.2.0
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  TextStyle
} from 'react-native'; // v0.72.x
import Ionicons from '@expo/vector-icons/Ionicons'; // v13.0.0

// Import custom components
import { Avatar, AvatarSize } from '../common/Avatar';
import { Badge, BadgeVariant, BadgeSize } from '../common/Badge';
import { Card, CardVariant, CardElevation } from '../common/Card';
import { SkillsList } from './SkillsList';

// Import styling utilities
import { colors } from '../../styles/colors';
import { textVariants } from '../../styles/typography';
import { layout, spacing, getSpacing } from '../../styles/layout';

// Import types
import {
  FreelancerProfile,
  CompanyProfile,
  VerificationStatus,
  AvailabilityStatus
} from '../../types/profile.types';

/**
 * Interface for the ProfileCard component props
 */
export interface ProfileCardProps {
  /** The profile data to display (either freelancer or company) */
  profile: FreelancerProfile | CompanyProfile;
  /** Flag indicating if this is a company profile */
  isCompany?: boolean;
  /** Function to call when the card is pressed */
  onPress?: () => void;
  /** Additional styles for the card */
  style?: StyleProp<ViewStyle>;
  /** Flag to display a compact version of the card */
  compact?: boolean;
  /** Test ID for automated testing */
  testID?: string;
  /** Maximum number of skills to display */
  maxSkillsToShow?: number;
}

/**
 * Determines badge variant based on verification status
 * 
 * @param status - The verification status to check
 * @returns BadgeVariant corresponding to the status
 */
const getVerificationBadgeVariant = (status: VerificationStatus): BadgeVariant => {
  switch (status) {
    case VerificationStatus.VERIFIED:
      return BadgeVariant.SUCCESS;
    case VerificationStatus.PENDING:
      return BadgeVariant.WARNING;
    case VerificationStatus.REJECTED:
      return BadgeVariant.ERROR;
    case VerificationStatus.UNVERIFIED:
    default:
      return BadgeVariant.INFO;
  }
};

/**
 * Determines badge variant based on availability status
 * 
 * @param status - The availability status to check
 * @returns BadgeVariant corresponding to the status
 */
const getAvailabilityBadgeVariant = (status: AvailabilityStatus): BadgeVariant => {
  switch (status) {
    case AvailabilityStatus.AVAILABLE:
      return BadgeVariant.SUCCESS;
    case AvailabilityStatus.PARTIALLY_AVAILABLE:
      return BadgeVariant.WARNING;
    case AvailabilityStatus.AVAILABLE_SOON:
      return BadgeVariant.INFO;
    case AvailabilityStatus.UNAVAILABLE:
    default:
      return BadgeVariant.ERROR;
  }
};

/**
 * Returns human-readable label for verification status
 * 
 * @param status - The verification status
 * @returns User-friendly label for the status
 */
const getVerificationLabel = (status: VerificationStatus): string => {
  switch (status) {
    case VerificationStatus.VERIFIED:
      return 'Verified';
    case VerificationStatus.PENDING:
      return 'Pending Verification';
    case VerificationStatus.REJECTED:
      return 'Verification Failed';
    case VerificationStatus.UNVERIFIED:
    default:
      return 'Not Verified';
  }
};

/**
 * Returns human-readable label for availability status
 * 
 * @param status - The availability status
 * @returns User-friendly label for the status
 */
const getAvailabilityLabel = (status: AvailabilityStatus): string => {
  switch (status) {
    case AvailabilityStatus.AVAILABLE:
      return 'Available Now';
    case AvailabilityStatus.PARTIALLY_AVAILABLE:
      return 'Partially Available';
    case AvailabilityStatus.AVAILABLE_SOON:
      return 'Available Soon';
    case AvailabilityStatus.UNAVAILABLE:
    default:
      return 'Unavailable';
  }
};

/**
 * ProfileCard component that displays user profile information in a card format
 * 
 * @param props - Component props
 * @returns JSX element representing the profile card
 */
export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  isCompany = false,
  onPress,
  style,
  compact = false,
  testID = 'profile-card',
  maxSkillsToShow = 3
}) => {
  // Extract necessary properties from the profile
  const isFreelancer = !isCompany;
  
  // Determine profile properties based on type
  const name = isCompany 
    ? (profile as CompanyProfile).name 
    : `${(profile as FreelancerProfile).firstName} ${(profile as FreelancerProfile).lastName}`;
  
  const avatarUrl = isCompany
    ? (profile as CompanyProfile).logoUrl
    : (profile as FreelancerProfile).avatarUrl;
  
  const verificationStatus = isCompany
    ? (profile as CompanyProfile).verified
    : (profile as FreelancerProfile).identityVerified;
  
  // Create styles with memoization
  const styles = useMemo(() => {
    return StyleSheet.create({
      container: {
        width: '100%',
      },
      cardContent: {
        padding: spacing.m,
      },
      header: {
        ...layout.rowBetween,
        marginBottom: spacing.s,
      },
      profileInfo: {
        flex: 1,
        marginLeft: spacing.m,
      },
      nameContainer: {
        ...layout.row,
        alignItems: 'center',
      },
      name: {
        ...textVariants.heading4,
        marginRight: spacing.xs,
      },
      title: {
        ...textVariants.paragraphSmall,
        color: colors.text.secondary,
        marginTop: spacing.xxs,
      },
      rateContainer: {
        ...layout.row,
        alignItems: 'center',
        marginTop: spacing.s,
      },
      rate: {
        ...textVariants.heading5,
        color: colors.primary[600],
        marginRight: spacing.xs,
      },
      hourText: {
        ...textVariants.caption,
        color: colors.text.secondary,
      },
      badgesContainer: {
        ...layout.row,
        flexWrap: 'wrap',
        marginTop: spacing.s,
      },
      badge: {
        marginRight: spacing.xs,
        marginBottom: spacing.xs,
      },
      skillsContainer: {
        marginTop: spacing.m,
      },
      skillsTitle: {
        ...textVariants.heading5,
        marginBottom: spacing.xs,
      },
      compactContainer: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      compactInfo: {
        flex: 1,
        marginLeft: spacing.m,
      },
      iconVerified: {
        marginLeft: spacing.xxs,
        color: colors.success[500],
      },
      companyInfo: {
        marginTop: spacing.s,
      },
      companyDetail: {
        ...textVariants.caption,
        color: colors.text.secondary,
        marginTop: spacing.xxs,
      },
    });
  }, [compact]);

  // Get appropriate badge variants
  const verificationBadgeVariant = getVerificationBadgeVariant(verificationStatus);
  
  // Create appropriate accessibility label
  const accessibilityLabel = isCompany
    ? `${name} company profile. ${getVerificationLabel(verificationStatus)}.`
    : `${name} AI professional profile. ${getVerificationLabel(verificationStatus)}.` +
      (isFreelancer && (profile as FreelancerProfile).hourlyRate 
        ? ` Hourly rate: $${(profile as FreelancerProfile).hourlyRate}. ` +
          `${getAvailabilityLabel((profile as FreelancerProfile).availability)}.`
        : '');

  // Render the compact version of the card
  if (compact) {
    return (
      <Card
        variant={CardVariant.DEFAULT}
        elevation={CardElevation.LOW}
        onPress={onPress}
        style={[styles.container, style]}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
      >
        <View style={styles.cardContent}>
          <View style={styles.compactContainer}>
            <Avatar
              source={avatarUrl ? { uri: avatarUrl } : undefined}
              firstName={isFreelancer ? (profile as FreelancerProfile).firstName : ''}
              lastName={isFreelancer ? (profile as FreelancerProfile).lastName : ''}
              name={isCompany ? (profile as CompanyProfile).name : undefined}
              size={AvatarSize.MEDIUM}
              hasBorder={true}
              testID={`${testID}-avatar`}
            />
            
            <View style={styles.compactInfo}>
              <View style={styles.nameContainer}>
                <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
                  {name}
                </Text>
                {verificationStatus === VerificationStatus.VERIFIED && (
                  <Ionicons name="checkmark-circle" size={16} style={styles.iconVerified} />
                )}
              </View>
              
              {isFreelancer && (
                <>
                  <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                    {(profile as FreelancerProfile).title}
                  </Text>
                  <View style={styles.rateContainer}>
                    <Text style={styles.rate}>${(profile as FreelancerProfile).hourlyRate}</Text>
                    <Text style={styles.hourText}>/ hr</Text>
                  </View>
                </>
              )}
              
              {isCompany && (
                <View style={styles.companyInfo}>
                  <Text style={styles.companyDetail} numberOfLines={1} ellipsizeMode="tail">
                    {(profile as CompanyProfile).industry}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Card>
    );
  }

  // Render the full version of the card
  return (
    <Card
      variant={CardVariant.DEFAULT}
      elevation={CardElevation.LOW}
      onPress={onPress}
      style={[styles.container, style]}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.cardContent}>
        <View style={styles.header}>
          <Avatar
            source={avatarUrl ? { uri: avatarUrl } : undefined}
            firstName={isFreelancer ? (profile as FreelancerProfile).firstName : ''}
            lastName={isFreelancer ? (profile as FreelancerProfile).lastName : ''}
            name={isCompany ? (profile as CompanyProfile).name : undefined}
            size={AvatarSize.MEDIUM}
            hasBorder={true}
            testID={`${testID}-avatar`}
          />
          
          <View style={styles.profileInfo}>
            <View style={styles.nameContainer}>
              <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
                {name}
              </Text>
              {verificationStatus === VerificationStatus.VERIFIED && (
                <Ionicons name="checkmark-circle" size={16} style={styles.iconVerified} />
              )}
            </View>
            
            {isFreelancer && (
              <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                {(profile as FreelancerProfile).title}
              </Text>
            )}
            
            {isCompany && (
              <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                {(profile as CompanyProfile).industry}
              </Text>
            )}
          </View>
        </View>
        
        {isFreelancer && (
          <>
            <View style={styles.badgesContainer}>
              <Badge
                variant={verificationBadgeVariant}
                size={BadgeSize.SMALL}
                style={styles.badge}
                testID={`${testID}-verification-badge`}
              >
                {getVerificationLabel(verificationStatus)}
              </Badge>
              
              <Badge
                variant={getAvailabilityBadgeVariant((profile as FreelancerProfile).availability)}
                size={BadgeSize.SMALL}
                style={styles.badge}
                testID={`${testID}-availability-badge`}
              >
                {getAvailabilityLabel((profile as FreelancerProfile).availability)}
              </Badge>
            </View>
            
            <View style={styles.rateContainer}>
              <Text style={styles.rate}>${(profile as FreelancerProfile).hourlyRate}</Text>
              <Text style={styles.hourText}>/ hr</Text>
            </View>
            
            {(profile as FreelancerProfile).skills && (profile as FreelancerProfile).skills.length > 0 && (
              <View style={styles.skillsContainer}>
                <Text style={styles.skillsTitle}>Top Skills</Text>
                <SkillsList 
                  skills={(profile as FreelancerProfile).skills.slice(0, maxSkillsToShow)} 
                  showVerification={true}
                  showLevels={true}
                  testID={`${testID}-skills`}
                />
              </View>
            )}
          </>
        )}
        
        {isCompany && (
          <>
            <View style={styles.badgesContainer}>
              <Badge
                variant={verificationBadgeVariant}
                size={BadgeSize.SMALL}
                style={styles.badge}
                testID={`${testID}-verification-badge`}
              >
                {getVerificationLabel(verificationStatus)}
              </Badge>
            </View>
            
            <Text style={styles.companyDetail} numberOfLines={2} ellipsizeMode="tail">
              {(profile as CompanyProfile).description}
            </Text>
          </>
        )}
      </View>
    </Card>
  );
};

export default ProfileCard;