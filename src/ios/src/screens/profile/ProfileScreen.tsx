import React, { useState, useEffect, useCallback, useMemo } from 'react'; // v18.2.0
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Share,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native'; // 0.72.x
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native'; // ^6.0.0
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; // ^13.0.0

// Internal imports
import { SafeAreaView, EdgeMode } from '../../components/common/SafeAreaView';
import ProfileCard from '../../components/profile/ProfileCard';
import SkillsList from '../../components/profile/SkillsList';
import PortfolioSection from '../../components/profile/PortfolioSection';
import { Button, ButtonVariant } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import useProfile from '../../hooks/useProfile';
import useAuth from '../../hooks/useAuth';
import { colors } from '../../styles/colors';
import { textVariants, getTextVariant } from '../../styles/typography';
import { layout, spacing, getSpacing } from '../../styles/layout';
import { FreelancerProfile, CompanyProfile } from '../../types/profile.types';

// Define route parameters type
type ProfileScreenRouteProp = RouteProp<{ Profile: { profileId?: string } }, 'Profile'>;

/**
 * Custom hook to load and manage profile data for the screen
 * @param profileId Optional profile ID to load a specific profile
 * @returns Profile data and loading states for the screen
 */
const useProfileScreenData = (profileId?: string) => {
  // Get profile management methods from useProfile hook
  const { profileState, getFreelancerProfile, getCompanyProfile, refreshProfile } = useProfile();

  // Get authentication state from useAuth hook
  const { user, isAuthenticated } = useAuth();

  // Determine if viewing own profile or another user's profile
  const isOwnProfile = useMemo(() => {
    return !!user && !!profileId && user.id === profileId;
  }, [user, profileId]);

  // Load appropriate profile data based on profileId parameter
  useEffect(() => {
    if (isAuthenticated && user) {
      if (profileId) {
        // Load specific profile if profileId is provided
        if (user.role === 'freelancer') {
          getFreelancerProfile(profileId);
        } else {
          getCompanyProfile(profileId);
        }
      } else {
        // Load current user's profile if no profileId is provided
        if (user.role === 'freelancer') {
          getFreelancerProfile();
        } else {
          getCompanyProfile();
        }
      }
    }
  }, [isAuthenticated, user, profileId, getFreelancerProfile, getCompanyProfile]);

  // Set up profile refresh functionality for pull-to-refresh
  const onRefresh = useCallback(async () => {
    try {
      await refreshProfile();
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  }, [refreshProfile]);

  // Return profile data, loading states, and refresh handler
  return {
    profile: profileState.viewedProfile,
    loading: profileState.loading,
    refreshing: profileState.refreshing,
    error: profileState.error,
    onRefresh,
    isOwnProfile,
  };
};

/**
 * Component that displays a user's complete profile with all details
 * @param props - Component props
 * @returns Rendered ProfileScreen component
 */
const ProfileScreen: React.FC = () => {
  // Get navigation object
  const navigation = useNavigation();

  // Get route parameters
  const route = useRoute<ProfileScreenRouteProp>();
  const { profileId } = route.params || {};

  // Use useProfileScreenData hook to load required profile data
  const { profile, loading, refreshing, error, onRefresh, isOwnProfile } = useProfileScreenData(profileId);

  // Set up navigation handlers for editing profile and contacting user
  const handleEditProfile = useCallback(() => {
    navigation.navigate('EditProfile');
  }, [navigation]);

  const handleContactUser = useCallback(() => {
    // Implement contact user logic here
    console.log('Contact user');
  }, []);

  // Create share profile functionality
  const handleShareProfile = useCallback(async () => {
    if (profile) {
      try {
        await Share.share({
          message: `Check out this AI Talent Marketplace profile: ${profile.id}`,
          title: `AI Talent Marketplace Profile: ${'name' in profile ? profile.name : `${profile.firstName} ${profile.lastName}`}`,
        });
      } catch (shareError) {
        console.error('Error sharing profile:', shareError);
      }
    }
  }, [profile]);

  // Handle appropriate loading and error states
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Spinner size="large" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text>No profile found.</Text>
      </SafeAreaView>
    );
  }

  // Determine if the profile is a freelancer or a company
  const isFreelancer = 'portfolioItems' in profile;

  // Render SafeAreaView container with ScrollView for content
  return (
    <SafeAreaView style={styles.safeArea} edges={EdgeMode.TOP}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Display ProfileCard component at the top with summary information */}
        <ProfileCard profile={profile} isCompany={!isFreelancer} onPress={() => {}} />

        {/* Render profile bio and detailed personal information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bioText}>{profile.bio}</Text>
        </View>

        {/* Show skills section with SkillsList component */}
        {isFreelancer && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <SkillsList skills={profile.skills} showVerification showLevels />
          </View>
        )}

        {/* Render PortfolioSection component with portfolio items */}
        {isFreelancer && (
          <View style={styles.section}>
            <PortfolioSection
              profileId={profile.userId}
              isEditable={isOwnProfile}
              portfolioItems={profile.portfolioItems}
            />
          </View>
        )}

        {/* Display appropriate action buttons based on viewing context */}
        <View style={styles.buttonContainer}>
          {!isOwnProfile && (
            <Button
              text="Contact"
              variant={ButtonVariant.PRIMARY}
              onPress={handleContactUser}
            />
          )}
          {isOwnProfile && (
            <Button
              text="Edit Profile"
              variant={ButtonVariant.SECONDARY}
              onPress={handleEditProfile}
            />
          )}
          <Button
            text="Share Profile"
            variant={ButtonVariant.OUTLINE}
            onPress={handleShareProfile}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;

// Apply proper accessibility attributes for screen readers
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  container: {
    flex: 1,
    padding: getSpacing(2),
  },
  section: {
    marginBottom: getSpacing(3),
  },
  sectionTitle: {
    ...textVariants.heading4,
    marginBottom: getSpacing(1),
  },
  bioText: {
    ...textVariants.body,
    color: colors.text.secondary,
  },
  buttonContainer: {
    marginTop: getSpacing(3),
    flexDirection: 'column',
    gap: getSpacing(2),
  },
  errorText: {
    color: colors.error[500],
    textAlign: 'center',
    marginTop: getSpacing(4),
  },
});