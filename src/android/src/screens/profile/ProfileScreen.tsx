/**
 * Renders a profile screen for AI professionals or companies in the AI Talent Marketplace Android application.
 * Displays comprehensive user profile information, including skills, portfolio, experience, education, and certifications.
 * Implements mobile-responsive adaptations for optimal viewing on Android devices.
 *
 * @version 1.0.0
 */

import React from 'react'; // v18.2.0
import { useState, useEffect, useCallback, useMemo } from 'react'; // v18.2.0
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Linking,
  Platform,
  Share,
} from 'react-native'; // v0.72.x
import { useRoute, useNavigation } from '@react-navigation/native'; // v6.1.7
import { NativeStackScreenProps } from '@react-navigation/native-stack'; // v6.9.13
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // v9.2.0

// Internal component imports
import {
  FreelancerProfile,
  CompanyProfile,
  ProfileType,
  VerificationStatus,
} from '../../types/profile.types';
import ProfileCard from '../../components/profile/ProfileCard';
import SkillsList from '../../components/profile/SkillsList';
import PortfolioSection from '../../components/profile/PortfolioSection';
import Button from '../../components/common/Button';
import { ButtonVariant, ButtonSize } from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import SafeAreaView from '../../components/common/SafeAreaView';

// Hook imports
import { useProfile } from '../../hooks/useProfile';
import { useAuth } from '../../hooks/useAuth';

// Style imports
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/layout';
import { typography } from '../../styles/typography';

// Type definition for the profile stack parameter list
type ProfileStackParamList = {
  Profile: { profileId: string; profileType: ProfileType };
};

/**
 * Renders a profile screen for AI professionals or companies
 * @param props NativeStackScreenProps<ProfileStackParamList, 'Profile'>
 * @returns JSX.Element The rendered profile screen
 */
const ProfileScreen: React.FC<NativeStackScreenProps<ProfileStackParamList, 'Profile'>> = (props) => {
  // Extract profileId and profileType from route parameters
  const { profileId, profileType } = useRoute<any>().params;

  // Use useAuth hook to access current user data and permissions
  const { user } = useAuth();

  // Use useProfile hook to fetch profile data
  const { profileState, getFreelancerProfile, getCompanyProfile, refreshProfile } = useProfile();
  const { freelancerProfile, companyProfile, loading } = profileState;

  // Initialize state for loading, refreshing, and tab selection
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('about');

  // Determine if current user is viewing their own profile
  const isOwnProfile = user?.id === profileId;

  // Create a function to handle screen refreshing
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
    } finally {
      setRefreshing(false);
    }
  }, [refreshProfile]);

  // Create a function to navigate to edit profile screen
  const navigateToEditProfile = useCallback(() => {
    props.navigation.navigate('EditProfile' as never);
  }, [props.navigation]);

  // Create functions to handle contact, schedule interview and download CV actions
  const handleContact = useCallback(() => {
    Alert.alert('Contact', 'Contact functionality not implemented yet.');
  }, []);

  const handleScheduleInterview = useCallback(() => {
    Alert.alert('Schedule Interview', 'Schedule Interview functionality not implemented yet.');
  }, []);

  const handleDownloadCV = useCallback(() => {
    Alert.alert('Download CV', 'Download CV functionality not implemented yet.');
  }, []);

  // Create a function to share profile with others
  const handleShareProfile = useCallback(async () => {
    try {
      await Share.share({
        message: `Check out this AI Talent Marketplace profile: ${profileId}`,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to share profile');
    }
  }, [profileId]);

  // Create a function to handle tab selection for profile sections
  const handleTabPress = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  // Determine which profile data to display (freelancer or company)
  const profile = profileType === ProfileType.FREELANCER ? freelancerProfile : companyProfile;

  // Define tabs for profile sections
  const tabs = useMemo(() => {
    const baseTabs = ['about', 'skills', 'portfolio'];
    if (profileType === ProfileType.FREELANCER) {
      return [...baseTabs, 'experience', 'education', 'certifications'];
    }
    return baseTabs;
  }, [profileType]);

  // Return SafeAreaView container with ScrollView for profile content
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary[500]]} />
        }
      >
        {/* Render loading spinner while data is being fetched */}
        {loading ? (
          <Spinner size="large" color={colors.primary[500]} />
        ) : (
          <>
            {/* Render ProfileCard component with profile information */}
            {profile && (
              <ProfileCard
                profileId={profileId}
                profileType={profileType}
                onContact={handleContact}
                onSchedule={handleScheduleInterview}
                onDownloadCV={handleDownloadCV}
                testID="profile-card"
              />
            )}

            {/* Render tab navigation for different profile sections */}
            <TabBar tabs={tabs} activeTab={activeTab} onTabPress={handleTabPress} />

            {/* Conditionally render profile sections based on selected tab */}
            {activeTab === 'about' && (
              <Section title="About">
                <Text style={styles.aboutText}>{(profile as FreelancerProfile)?.bio}</Text>
              </Section>
            )}

            {activeTab === 'skills' && (
              <Section title="Skills">
                <SkillsList skills={(profile as FreelancerProfile)?.skills || []} />
              </Section>
            )}

            {activeTab === 'portfolio' && (
              <Section title="Portfolio">
                <PortfolioSection
                  portfolioItems={(profile as FreelancerProfile)?.portfolio || []}
                  isEditable={isOwnProfile}
                  userId={user?.id || ''}
                />
              </Section>
            )}

            {activeTab === 'experience' && (
              <Section title="Experience">
                <Text>Experience section content</Text>
              </Section>
            )}

            {activeTab === 'education' && (
              <Section title="Education">
                <Text>Education section content</Text>
              </Section>
            )}

            {activeTab === 'certifications' && (
              <Section title="Certifications">
                <Text>Certifications section content</Text>
              </Section>
            )}
          </>
        )}
      </ScrollView>

      {/* Add edit button if viewing own profile */}
      {isOwnProfile && (
        <Button
          title="Edit Profile"
          onPress={navigateToEditProfile}
          style={styles.editButton}
          testID="edit-profile-button"
        />
      )}
    </SafeAreaView>
  );
};

/**
 * Renders a section with title and content
 * @param object { title, children, style }
 * @returns JSX.Element The rendered section component
 */
const Section: React.FC<{ title: string; children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({
  title,
  children,
  style,
}) => {
  return (
    <View style={[styles.sectionContainer, style]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
};

/**
 * Renders a custom tab bar for profile sections
 * @param object { tabs, activeTab, onTabPress }
 * @returns JSX.Element The rendered tab bar component
 */
const TabBar: React.FC<{ tabs: string[]; activeTab: string; onTabPress: (tab: string) => void }> = ({
  tabs,
  activeTab,
  onTabPress,
}) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
      {tabs.map((tab) => (
        <Button
          key={tab}
          title={tab.charAt(0).toUpperCase() + tab.slice(1)}
          onPress={() => onTabPress(tab)}
          variant={activeTab === tab ? ButtonVariant.PRIMARY : ButtonVariant.OUTLINE}
          size={ButtonSize.SMALL}
          style={styles.tabButton}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  container: {
    flex: 1,
    padding: spacing.m,
  },
  tabBar: {
    marginTop: spacing.m,
    marginBottom: spacing.m,
  },
  tabButton: {
    marginRight: spacing.s,
  },
  sectionContainer: {
    marginBottom: spacing.l,
  },
  sectionTitle: {
    fontSize: typography.heading3.fontSize,
    fontWeight: 'bold',
    marginBottom: spacing.s,
  },
  aboutText: {
    fontSize: typography.body.fontSize,
    color: colors.text.primary,
  },
  editButton: {
    margin: spacing.m,
  },
});

export default ProfileScreen;