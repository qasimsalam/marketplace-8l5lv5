import React from 'react'; // react v18.2.0
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
} from 'react'; // react v18.2.0
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  TouchableOpacity,
  Platform,
  Alert,
  Image
} from 'react-native'; // react-native 0.72.x
import {
  RouteProp,
  useRoute,
  useNavigation
} from '@react-navigation/native'; // @react-navigation/native ^6.1.7
import { NativeStackNavigationProp } from '@react-navigation/native-stack'; // @react-navigation/native-stack ^6.9.13
import { useForm, Controller } from 'react-hook-form'; // react-hook-form ^7.43.9
import * as yup from 'yup'; // yup ^1.1.1
import { yupResolver } from '@hookform/resolvers/yup'; // @hookform/resolvers/yup ^3.1.0
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // react-native-vector-icons/MaterialIcons ^9.2.0
import { launchImageLibrary } from 'react-native-image-picker'; // react-native-image-picker ^5.3.1

// Internal imports
import { SafeAreaView, EdgeMode } from '../../components/common/SafeAreaView';
import Input, { InputType, InputSize } from '../../components/common/Input';
import Button, { ButtonVariant, ButtonSize } from '../../components/common/Button';
import Select from '../../components/common/Select';
import Avatar, { AvatarSize } from '../../components/common/Avatar';
import SkillsList from '../../components/profile/SkillsList';
import Toast, { ToastType } from '../../components/common/Toast';
import Spinner from '../../components/common/Spinner';
import { useProfile } from '../../hooks/useProfile';
import { useAuth } from '../../hooks/useAuth';
import {
  ProfileFormValues,
  CompanyFormValues,
  FreelancerProfile,
  CompanyProfile,
  ProfileType,
  AvailabilityStatus
} from '../../types/profile.types';
import { validateUrl } from '../../utils/validation';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/layout';
import { typography } from '../../styles/typography';

// Define route params type
type RootStackParamList = {
  EditProfile: { profileType: ProfileType };
};

// Define navigation props type
type EditProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'EditProfile'
>;

// Define route props type
type EditProfileScreenRouteProp = RouteProp<RootStackParamList, 'EditProfile'>;

// Interface for FreelancerProfileForm props
interface FreelancerProfileFormProps {
  control: any;
  errors: any;
  profile: FreelancerProfile;
}

// Interface for CompanyProfileForm props
interface CompanyProfileFormProps {
  control: any;
  errors: any;
  profile: CompanyProfile;
}

// Interface for SkillsFormSection props
interface SkillsFormSectionProps {
  control: any;
  errors: any;
  skills: any[];
  updateSkills: (skills: any[]) => void;
}

/**
 * Screen component for editing user profile information with form validation and submission handling
 */
const EditProfileScreen: React.FC = () => {
  // Access route params to determine profile type and initial data
  const route = useRoute<EditProfileScreenRouteProp>();
  const { profileType } = route.params;

  // Initialize hooks for profile state management, authentication, and navigation
  const navigation = useNavigation<EditProfileScreenNavigationProp>();
  const { profileState, updateFreelancerProfile, updateCompanyProfile, uploadProfileImage } = useProfile();
  const { authState } = useAuth();

  // Define validation schemas for freelancer and company profiles using Yup
  const freelancerSchema = yup.object().shape({
    title: yup.string().required('Professional title is required'),
    bio: yup.string().required('Bio is required'),
    hourlyRate: yup
      .number()
      .required('Hourly rate is required')
      .positive('Hourly rate must be positive'),
    location: yup.string().notRequired(),
    availability: yup.string().oneOf(Object.values(AvailabilityStatus)).notRequired(),
    githubUrl: yup.string().url('Please enter a valid URL').notRequired(),
    linkedinUrl: yup.string().url('Please enter a valid URL').notRequired(),
    kaggleUrl: yup.string().url('Please enter a valid URL').notRequired(),
    website: yup.string().url('Please enter a valid URL').notRequired(),
  });

  const companySchema = yup.object().shape({
    name: yup.string().required('Company name is required'),
    description: yup.string().required('Company description is required'),
    website: yup.string().url('Please enter a valid URL').notRequired(),
    industry: yup.string().notRequired(),
    size: yup.string().notRequired(),
    location: yup.string().notRequired(),
    foundedDate: yup.string().notRequired(),
  });

  // Determine initial values based on profile type
  const initialValues = useMemo(() => {
    if (profileType === ProfileType.FREELANCER && profileState.freelancerProfile) {
      const { title, bio, hourlyRate, location, availability, githubUrl, linkedinUrl, kaggleUrl, website } = profileState.freelancerProfile;
      return { title, bio, hourlyRate, location, availability, githubUrl, linkedinUrl, kaggleUrl, website };
    } else if (profileType === ProfileType.COMPANY && profileState.companyProfile) {
      const { name, description, website, industry, size, location, foundedDate } = profileState.companyProfile;
      return { name, description, website, industry, size, location, foundedDate };
    }
    return {};
  }, [profileType, profileState.freelancerProfile, profileState.companyProfile]);

  // Initialize form state with react-hook-form based on profile type
  const { control, handleSubmit, formState: { errors }, setValue } = useForm<ProfileFormValues | CompanyFormValues>({
    resolver: yupResolver(profileType === ProfileType.FREELANCER ? freelancerSchema : companySchema),
    defaultValues: initialValues,
    mode: 'onBlur',
  });

  // Implement image upload functionality for profile/company logo
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    profileType === ProfileType.FREELANCER ? profileState.freelancerProfile?.avatarUrl : profileState.companyProfile?.logoUrl
  );
  const [uploading, setUploading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState<ToastType>(ToastType.INFO);
  const [toastMessage, setToastMessage] = useState('');

  // Implement image upload functionality for profile/company logo
  const handleImageUpload = useCallback(async () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
    };

    launchImageLibrary(options, async (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
        setToastType(ToastType.ERROR);
        setToastMessage(`Image picker error: ${response.errorMessage}`);
        setToastVisible(true);
      } else {
        const source = response.assets?.[0];
        if (source?.uri) {
          setUploading(true);
          try {
            const result = await uploadProfileImage(source.uri);
            setAvatarUrl(result.avatarUrl);
            setUploading(false);
            setToastType(ToastType.SUCCESS);
            setToastMessage('Profile image updated successfully!');
            setToastVisible(true);
          } catch (error: any) {
            setUploading(false);
            setToastType(ToastType.ERROR);
            setToastMessage(`Failed to upload image: ${error.message}`);
            setToastVisible(true);
          }
        }
      }
    });
  }, [uploadProfileImage]);

  // Create form submission handler to update profile data
  const onSubmit = async (data: ProfileFormValues | CompanyFormValues) => {
    try {
      if (profileType === ProfileType.FREELANCER) {
        await updateFreelancerProfile(data as ProfileFormValues);
      } else {
        await updateCompanyProfile(data as CompanyFormValues);
      }
      setToastType(ToastType.SUCCESS);
      setToastMessage('Profile updated successfully!');
      setToastVisible(true);
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error: any) {
      setToastType(ToastType.ERROR);
      setToastMessage(`Failed to update profile: ${error.message}`);
      setToastVisible(true);
    }
  };

  // Implement form field components with validation for profile data
  // Freelancer Profile Form
  const FreelancerProfileForm: React.FC<FreelancerProfileFormProps> = ({ control, errors, profile }) => {
    return (
      <>
        <Controller
          control={control}
          rules={{
            required: true,
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Professional Title"
              placeholder="e.g., AI/ML Engineer"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.title?.message}
            />
          )}
          name="title"
        />

        <Controller
          control={control}
          rules={{
            required: true,
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Bio"
              placeholder="Write a short bio about yourself"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.bio?.message}
              multiline={true}
              numberOfLines={4}
            />
          )}
          name="bio"
        />

        <Controller
          control={control}
          rules={{
            required: true,
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Hourly Rate"
              placeholder="Enter your hourly rate"
              value={value ? value.toString() : ''}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.hourlyRate?.message}
              type={InputType.NUMBER}
            />
          )}
          name="hourlyRate"
        />

        <Controller
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Location"
              placeholder="Enter your location"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.location?.message}
            />
          )}
          name="location"
        />

        <Controller
          control={control}
          render={({ field: { onChange, value } }) => (
            <Select
              label="Availability"
              placeholder="Select your availability"
              options={Object.values(AvailabilityStatus)}
              value={value}
              onChange={onChange}
              error={errors.availability?.message}
            />
          )}
          name="availability"
        />

        <Controller
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="GitHub URL"
              placeholder="Enter your GitHub URL"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.githubUrl?.message}
              type={InputType.URL}
            />
          )}
          name="githubUrl"
        />

        <Controller
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="LinkedIn URL"
              placeholder="Enter your LinkedIn URL"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.linkedinUrl?.message}
              type={InputType.URL}
            />
          )}
          name="linkedinUrl"
        />

        <Controller
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Kaggle URL"
              placeholder="Enter your Kaggle URL"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.kaggleUrl?.message}
              type={InputType.URL}
            />
          )}
          name="kaggleUrl"
        />

        <Controller
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Website URL"
              placeholder="Enter your website URL"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.website?.message}
              type={InputType.URL}
            />
          )}
          name="website"
        />
      </>
    );
  };

  // Company Profile Form
  const CompanyProfileForm: React.FC<CompanyProfileFormProps> = ({ control, errors, profile }) => {
    return (
      <>
        <Controller
          control={control}
          rules={{
            required: true,
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Company Name"
              placeholder="Enter your company name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.name?.message}
            />
          )}
          name="name"
        />

        <Controller
          control={control}
          rules={{
            required: true,
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Company Description"
              placeholder="Enter your company description"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.description?.message}
              multiline={true}
              numberOfLines={4}
            />
          )}
          name="description"
        />

        <Controller
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Website URL"
              placeholder="Enter your website URL"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.website?.message}
              type={InputType.URL}
            />
          )}
          name="website"
        />

        <Controller
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Industry"
              placeholder="Enter your industry"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.industry?.message}
            />
          )}
          name="industry"
        />

        <Controller
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Company Size"
              placeholder="Enter your company size"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.size?.message}
            />
          )}
          name="size"
        />

        <Controller
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Location"
              placeholder="Enter your location"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.location?.message}
            />
          )}
          name="location"
        />

        <Controller
          control={control}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Founding Date"
              placeholder="Enter your founding date"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.foundedDate?.message}
            />
          )}
          name="foundedDate"
        />
      </>
    );
  };

  // Skills Form Section
  const SkillsFormSection: React.FC<SkillsFormSectionProps> = ({ control, errors, skills, updateSkills }) => {
    return (
      <View>
        <Text style={typography.heading3}>Skills</Text>
        <SkillsList skills={skills} />
      </View>
    );
  };

  return (
    <SafeAreaView edges={EdgeMode.ALL}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.header}>Edit {profileType === ProfileType.FREELANCER ? 'Freelancer' : 'Company'} Profile</Text>
          <TouchableOpacity onPress={handleImageUpload} style={styles.avatarContainer}>
            {uploading ? (
              <Spinner size={SpinnerSize.MEDIUM} />
            ) : (
              <Avatar
                imageUrl={avatarUrl}
                name={profileType === ProfileType.FREELANCER ? authState.user?.firstName : profileState.companyProfile?.name}
                size={AvatarSize.XLARGE}
              />
            )}
            <Text style={styles.uploadText}>Upload New Image</Text>
          </TouchableOpacity>

          {profileType === ProfileType.FREELANCER && profileState.freelancerProfile && (
            <FreelancerProfileForm control={control} errors={errors} profile={profileState.freelancerProfile} />
          )}

          {profileType === ProfileType.COMPANY && profileState.companyProfile && (
            <CompanyProfileForm control={control} errors={errors} profile={profileState.companyProfile} />
          )}

          <Button
            title="Update Profile"
            onPress={handleSubmit(onSubmit)}
            variant={ButtonVariant.PRIMARY}
            size={ButtonSize.MEDIUM}
            isDisabled={profileState.loading}
            isLoading={profileState.loading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onClose={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.m,
  },
  header: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    marginBottom: spacing.l,
    textAlign: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  uploadText: {
    color: colors.primary[500],
    marginTop: spacing.s,
  },
});

export default EditProfileScreen;