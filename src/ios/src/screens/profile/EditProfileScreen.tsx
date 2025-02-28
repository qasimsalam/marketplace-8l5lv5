import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react'; // react ^18.2.0
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native'; // react-native ^0.72.0
import { launchImageLibrary } from 'react-native-image-picker'; // react-native-image-picker ^5.0.0
import { NativeStackScreenProps } from '@react-navigation/native-stack'; // @react-navigation/native-stack ^6.9.0
import { useNavigation, useRoute } from '@react-navigation/native'; // @react-navigation/native ^6.1.0
import { MaterialIcons, FontAwesome5 } from 'react-native-vector-icons'; // react-native-vector-icons ^9.2.0
import { useToast, showToast } from 'react-native-toast-message'; // react-native-toast-message ^2.1.6

// Internal imports
import { SafeAreaView } from '../../../components/common/SafeAreaView';
import { Input, InputType } from '../../../components/common/Input';
import { Button, ButtonVariant, ButtonSize } from '../../../components/common/Button';
import { Select } from '../../../components/common/Select';
import { Spinner } from '../../../components/common/Spinner';
import { Toast } from '../../../components/common/Toast';
import SkillsList from '../../../components/profile/SkillsList';
import PortfolioSection from '../../../components/profile/PortfolioSection';
import useProfile from '../../../hooks/useProfile';
import useAuth from '../../../hooks/useAuth';
import { validateProfileForm } from '../../../utils/validation';
import { formatCurrency } from '../../../utils/format';
import { colors } from '../../../styles/colors';
import { textVariants } from '../../../styles/typography';
import {
  ProfileFormValues,
  FreelancerProfile,
  Skill,
  AvailabilityStatus,
} from '../../../types/profile.types';

// Define the navigation route params
type RootStackParamList = {
  EditProfileScreen: { profileId: string };
};

/**
 * A screen component for AI professionals to edit their profile information
 * including personal details, AI/ML skills with expertise levels, portfolio items,
 * hourly rates, and availability status.
 */
const EditProfileScreen: React.FC<NativeStackScreenProps<RootStackParamList, 'EditProfileScreen'>> = (props) => {
  // Get navigation and route objects
  const { navigation, route } = props;
  const { profileId } = route.params;

  // Get user data from useAuth hook and profile data from useProfile hook
  const { user } = useAuth();
  const { profileState, updateFreelancerProfile, uploadProfileImage, getFreelancerProfile } = useProfile();

  // Initialize form state with ProfileFormValues interface
  const [formValues, setFormValues] = useState<ProfileFormValues>({
    title: '',
    bio: '',
    hourlyRate: 0,
    skills: [],
    location: '',
    availability: AvailabilityStatus.AVAILABLE,
    githubUrl: '',
    linkedinUrl: '',
    kaggleUrl: '',
    website: '',
    experienceYears: 0,
    avatar: { uri: '', type: '', name: '' },
  });

  // Set up loading state for API operations
  const [loading, setLoading] = useState(false);

  // Initialize form with existing profile data when component mounts
  useEffect(() => {
    const loadProfile = async () => {
      if (profileState.freelancerProfile) {
        const profile = profileState.freelancerProfile;
        setFormValues({
          title: profile.title,
          bio: profile.bio,
          hourlyRate: profile.hourlyRate,
          skills: profile.skills.map(skill => skill.name),
          location: profile.location,
          availability: profile.availability,
          githubUrl: profile.githubUrl,
          linkedinUrl: profile.linkedinUrl,
          kaggleUrl: profile.kaggleUrl,
          website: profile.website,
          experienceYears: profile.experienceYears,
          avatar: { uri: profile.avatarUrl, type: '', name: '' },
        });
      } else {
        // Fetch profile if not already loaded
        await getFreelancerProfile(profileId);
      }
    };

    loadProfile();
  }, [profileState.freelancerProfile, getFreelancerProfile, profileId]);

  // Create form field change handlers for each input
  const handleInputChange = (name: keyof ProfileFormValues, value: string | number | AvailabilityStatus) => {
    setFormValues({ ...formValues, [name]: value });
  };

  // Implement skill selection and expertise level management
  const handleSkillToggle = useCallback((skill: Skill, level: number) => {
    // Check if skill is already in selected skills
    const skillIndex = formValues.skills.findIndex(s => s === skill.name);

    let updatedSkills = [...formValues.skills];

    if (skillIndex !== -1) {
      // If present, update expertise level or remove if deselected
      updatedSkills.splice(skillIndex, 1);
    } else {
      // If not present, add skill with specified expertise level
      updatedSkills = [...updatedSkills, skill.name];
    }

    // Update formValues state with new skills array
    setFormValues({ ...formValues, skills: updatedSkills });
  }, [formValues]);

  // Set up image picker for avatar selection
  const handleAvatarSelect = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.7,
      });

      if (result.didCancel) {
        console.log('User cancelled image picker');
      } else if (result.errorCode) {
        console.log('Image picker error: ', result.errorMessage);
      } else if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.uri && asset.type) {
          setFormValues({
            ...formValues,
            avatar: { uri: asset.uri, type: asset.type, name: asset.fileName || 'avatar.jpg' },
          });
        }
      }
    } catch (error) {
      console.error('Error selecting avatar:', error);
      Alert.alert('Error', 'Failed to select avatar');
    }
  }, [formValues]);

  // Implement form submission handler with validation
  const handleSubmit = useCallback(async () => {
    // Validate form data using validateForm function
    const validationResult = validateProfileForm(formValues);

    if (!validationResult.isValid) {
      // If validation fails, display error messages
      Alert.alert('Validation Error', Object.values(validationResult.errors).join('\n'));
      return;
    }

    setLoading(true);

    try {
      // Prepare form data for API request
      const profileData = {
        ...formValues,
        skills: formValues.skills,
      };

      // Upload avatar image if changed
      if (formValues.avatar && formValues.avatar.uri) {
        await uploadProfileImage(formValues.avatar);
      }

      // Call updateFreelancerProfile method from useProfile hook
      await updateFreelancerProfile(profileData);

      // Handle success with toast message and navigation
      showToast({
        type: 'success',
        text1: 'Profile Updated',
        text2: 'Your profile has been updated successfully.',
      });
      navigation.goBack();
    } catch (error) {
      // Handle errors with appropriate error messages
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  }, [formValues, navigation, updateFreelancerProfile, uploadProfileImage]);

  // Create section components for different parts of the profile (basic info, skills, portfolio, rates)
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <Text style={textVariants.heading3}>Edit Profile</Text>

          <Input
            label="Professional Title"
            value={formValues.title}
            onChangeText={(text) => handleInputChange('title', text)}
            placeholder="AI Engineer, Data Scientist, etc."
          />

          <Input
            label="Bio"
            value={formValues.bio}
            onChangeText={(text) => handleInputChange('bio', text)}
            placeholder="Tell us about yourself"
            multiline
            numberOfLines={4}
          />

          <Input
            label="Hourly Rate"
            value={formValues.hourlyRate.toString()}
            onChangeText={(text) => handleInputChange('hourlyRate', parseFloat(text) || 0)}
            placeholder="Enter your hourly rate"
            type={InputType.NUMBER}
          />

          <Select
            label="Availability"
            options={[
              { label: 'Available', value: AvailabilityStatus.AVAILABLE },
              { label: 'Partially Available', value: AvailabilityStatus.PARTIALLY_AVAILABLE },
              { label: 'Unavailable', value: AvailabilityStatus.UNAVAILABLE },
              { label: 'Available Soon', value: AvailabilityStatus.AVAILABLE_SOON },
            ]}
            value={formValues.availability}
            onValueChange={(value) => handleInputChange('availability', value)}
          />

          <SkillsList
            skills={profileState.freelancerProfile?.skills || []}
            onPress={handleSkillToggle}
            editable={true}
          />

          <PortfolioSection
            profileId={profileId}
            isEditable={true}
            portfolioItems={profileState.freelancerProfile?.portfolioItems || []}
          />

          <Button text="Update Profile" onPress={handleSubmit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
});

export default EditProfileScreen;