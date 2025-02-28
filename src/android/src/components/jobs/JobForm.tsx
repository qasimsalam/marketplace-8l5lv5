/**
 * AI Talent Marketplace - Job Form Component (Android)
 *
 * A comprehensive form component for creating and editing job listings in the AI Talent Marketplace Android application.
 * This component provides fields for job details, budget information, required skills, and file attachments
 * with complete validation, accessibility features, and responsive design for mobile devices.
 *
 * @version 1.0.0
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
} from 'react'; // react v18.2.0
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  Alert,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native'; // react-native v0.72.x
import {
  launchCamera,
  launchImageLibrary
} from 'react-native-image-picker'; // react-native-image-picker ^5.0.1
import DateTimePicker from '@react-native-community/datetimepicker'; // @react-native-community/datetimepicker ^7.0.1
import DocumentPicker from 'react-native-document-picker'; // react-native-document-picker ^8.2.0
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // react-native-vector-icons ^9.2.0
import { Formik } from 'formik'; // formik ^2.4.2

// Internal imports
import { Input, InputType, InputSize } from '../common/Input';
import { Select, SelectSize, SelectOption } from '../common/Select';
import { Button, ButtonVariant, ButtonSize } from '../common/Button';
import {
  JobType,
  JobDifficulty,
  JobFormValues
} from '../../types/job.types';
import { ToastType } from '../common/Toast';
import { useJobs } from '../../hooks/useJobs';
import { validateJobForm } from '../../utils/validation';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, layout } from '../../styles/layout';
import { moderateScale } from '../../utils/responsive';

// Global constants
const INITIAL_JOB_FORM_VALUES: JobFormValues = {
  title: '',
  description: '',
  type: JobType.FIXED_PRICE,
  budget: 0,
  minBudget: 0,
  maxBudget: 0,
  hourlyRate: 0,
  estimatedDuration: 0,
  estimatedHours: 0,
  difficulty: JobDifficulty.INTERMEDIATE,
  location: '',
  isRemote: true,
  requiredSkills: [],
  preferredSkills: [],
  attachments: [],
  category: '',
  subcategory: '',
  startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
};
const MIN_DESCRIPTION_LENGTH = 100;
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'application/json', 'text/plain', 'application/x-ipynb+json'];

/**
 * Interface defining props for the JobForm component
 */
export interface JobFormProps {
  initialValues?: Partial<JobFormValues>;
  onSubmit: (values: JobFormValues) => void;
  onCancel: () => void;
  isEditing?: boolean;
  showToast: (message: string, type: ToastType) => void;
}

/**
 * Converts skills array to SelectOption format required by Select component
 *
 * @param skills Array of skills
 * @returns Formatted skills as select options
 */
const getSkillOptions = (skills: { id: string; name: string }[]): SelectOption[] => {
  return skills.map(skill => ({
    value: skill.id,
    label: skill.name
  }));
};

/**
 * Renders a single attachment item with name, icon, and delete button
 *
 * @param attachment Attachment object
 * @param onDelete Callback function to delete the attachment
 * @returns Rendered attachment item component
 */
const renderAttachment = (attachment: { uri: string; name: string; type: string }, onDelete: () => void) => {
  // Determine icon based on file type/extension
  let iconName = 'insert-drive-file';
  if (attachment.type.startsWith('image/')) {
    iconName = 'image';
  } else if (attachment.type === 'application/pdf') {
    iconName = 'picture-as-pdf';
  }

  // Truncate filename if too long
  const maxFilenameLength = 20;
  const truncatedFilename = attachment.name.length > maxFilenameLength
    ? attachment.name.substring(0, maxFilenameLength) + '...'
    : attachment.name;

  return (
    <View key={attachment.name} style={styles.attachmentItem}>
      <MaterialIcons name={iconName} size={moderateScale(20)} color={colors.text.secondary} />
      <Text style={styles.attachmentText}>{truncatedFilename}</Text>
      <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
        <MaterialIcons name="delete" size={moderateScale(20)} color={colors.error[500]} />
      </TouchableOpacity>
    </View>
  );
};

/**
 * Form component for creating and editing job listings with validation and file attachments
 *
 * @param props Component props
 * @returns Rendered form component
 */
export const JobForm: React.FC<JobFormProps> = ({ initialValues, onSubmit, onCancel, isEditing = false, showToast }) => {
  // Form state using Formik
  const formikRef = useRef<any>(null);
  const {
    values,
    errors,
    touched,
    handleChange,
    setFieldValue,
    handleSubmit,
    handleBlur,
    setValues
  } = Formik.useFormik({
    initialValues: initialValues || INITIAL_JOB_FORM_VALUES,
    validate: validateJobForm,
    onSubmit: (values) => {
      onSubmit(values);
    }
  });

  // useJobs hook for form submission
  const { createJob, updateJob } = useJobs({ showToast });

  // State for date pickers
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // File picker handlers for attachments
  const handleDocumentPick = useCallback(async () => {
    try {
      const res = await DocumentPicker.pick({
        type: ALLOWED_ATTACHMENT_TYPES,
        copyToCacheDirectory: true,
      });

      if (res && res.length > 0) {
        const file = res[0];
        if (file.size > MAX_ATTACHMENT_SIZE) {
          showToast(`File size exceeds maximum limit of ${MAX_ATTACHMENT_SIZE / 1024 / 1024}MB`, ToastType.ERROR);
          return;
        }
        setFieldValue('attachments', [...values.attachments, file]);
      }
    } catch (err: any) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled the picker, exit silently
      } else {
        showToast(`Error picking document: ${err.message}`, ToastType.ERROR);
      }
    }
  }, [setFieldValue, values.attachments, showToast]);

  const handleImagePick = useCallback(async (useCamera: boolean) => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
      selectionLimit: 1,
    };

    const launchPicker = useCamera ? launchCamera : launchImageLibrary;

    launchPicker(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
        showToast(`Image picker error: ${response.errorMessage}`, ToastType.ERROR);
      } else {
        const file = {
          uri: response.assets[0].uri,
          name: response.assets[0].fileName || 'image.jpg',
          type: response.assets[0].type,
          size: response.assets[0].fileSize,
        };
        if (file.size > MAX_ATTACHMENT_SIZE) {
          showToast(`File size exceeds maximum limit of ${MAX_ATTACHMENT_SIZE / 1024 / 1024}MB`, ToastType.ERROR);
          return;
        }
        setFieldValue('attachments', [...values.attachments, file]);
      }
    });
  }, [setFieldValue, values.attachments, showToast]);

  const handleDeleteAttachment = useCallback((index: number) => {
    const newAttachments = [...values.attachments];
    newAttachments.splice(index, 1);
    setFieldValue('attachments', newAttachments);
  }, [setFieldValue, values.attachments]);

  // Date picker handlers with Android native handling
  const onStartDateChange = useCallback((event: any, selectedDate: Date | undefined) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setFieldValue('startDate', selectedDate);
    }
  }, [setFieldValue]);

  const onEndDateChange = useCallback((event: any, selectedDate: Date | undefined) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setFieldValue('endDate', selectedDate);
    }
  }, [setFieldValue]);

  // Form submission handler with validation
  const handleSubmitForm = useCallback(async () => {
    try {
      await handleSubmit();
    } catch (e) {
      console.log(e);
    }
  }, [handleSubmit]);

  // Helper functions for dynamic form content based on job type
  const renderBudgetFields = () => {
    switch (values.type) {
      case JobType.FIXED_PRICE:
        return (
          <>
            <Input
              label="Budget"
              value={String(values.budget)}
              onChangeText={handleChange('budget')}
              onBlur={handleBlur('budget')}
              error={touched.budget && errors.budget}
              type={InputType.NUMBER}
              isRequired
            />
          </>
        );
      default:
        return null;
    }
  };

  // Touch handler for dismissing keyboard on form touch
  const handleTouch = () => {
    Keyboard.dismiss();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <TouchableWithoutFeedback onPress={handleTouch}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.sectionTitle}>Basic Details</Text>
          <Input
            label="Job Title"
            value={values.title}
            onChangeText={handleChange('title')}
            onBlur={handleBlur('title')}
            error={touched.title && errors.title}
            isRequired
          />
          <Input
            label="Description"
            value={values.description}
            onChangeText={handleChange('description')}
            onBlur={handleBlur('description')}
            error={touched.description && errors.description}
            multiline
            numberOfLines={4}
            isRequired
          />
          <Select
            label="Job Type"
            options={Object.values(JobType)}
            value={values.type}
            onChange={handleChange('type')}
            error={touched.type && errors.type}
          />

          <Text style={styles.sectionTitle}>Budget Information</Text>
          {renderBudgetFields()}

          <Text style={styles.sectionTitle}>Skills Required</Text>
          <Select
            label="Required Skills"
            options={[]}
            value={values.requiredSkills}
            onChange={handleChange('requiredSkills')}
            error={touched.requiredSkills && errors.requiredSkills}
            multiple
          />
          <Select
            label="Preferred Skills"
            options={[]}
            value={values.preferredSkills}
            onChange={handleChange('preferredSkills')}
            multiple
          />

          <Text style={styles.sectionTitle}>Dates and Location</Text>
          <TouchableOpacity onPress={() => setShowStartDatePicker(true)}>
            <Input
              label="Start Date"
              value={values.startDate ? values.startDate.toLocaleDateString() : ''}
              editable={false}
              pointerEvents="none"
            />
          </TouchableOpacity>
          {showStartDatePicker && (
            <DateTimePicker
              value={values.startDate || new Date()}
              mode="date"
              display="default"
              onChange={onStartDateChange}
            />
          )}
          <TouchableOpacity onPress={() => setShowEndDatePicker(true)}>
            <Input
              label="End Date"
              value={values.endDate ? values.endDate.toLocaleDateString() : ''}
              editable={false}
              pointerEvents="none"
            />
          </TouchableOpacity>
          {showEndDatePicker && (
            <DateTimePicker
              value={values.endDate || new Date()}
              mode="date"
              display="default"
              onChange={onEndDateChange}
            />
          )}
          <Input
            label="Location"
            value={values.location}
            onChangeText={handleChange('location')}
          />

          <Text style={styles.sectionTitle}>File Attachments</Text>
          <View style={styles.attachmentButtons}>
            <Button
              title="Pick Document"
              variant={ButtonVariant.OUTLINE}
              size={ButtonSize.SMALL}
              onPress={handleDocumentPick}
            />
            <Button
              title="Take Photo"
              variant={ButtonVariant.OUTLINE}
              size={ButtonSize.SMALL}
              onPress={() => handleImagePick(true)}
            />
            <Button
              title="Choose from Gallery"
              variant={ButtonVariant.OUTLINE}
              size={ButtonSize.SMALL}
              onPress={() => handleImagePick(false)}
            />
          </View>
          {values.attachments.map((attachment, index) => (
            renderAttachment(
              attachment,
              () => handleDeleteAttachment(index)
            )
          ))}

          <View style={styles.buttonContainer}>
            <Button
              title="Cancel"
              variant={ButtonVariant.SECONDARY}
              onPress={onCancel}
              style={styles.button}
            />
            <Button
              title="Submit"
              onPress={handleSubmitForm}
              style={styles.button}
            />
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContainer: {
    padding: spacing.m,
  },
  sectionTitle: {
    ...typography.heading5,
    marginBottom: spacing.s,
    color: colors.text.primary,
  },
  attachmentButtons: {
    flexDirection: 'row',
    justifyContent: 'spaceAround',
    marginBottom: spacing.s,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
    backgroundColor: colors.background.secondary,
    borderRadius: 5,
    marginBottom: spacing.xxs,
  },
  attachmentText: {
    flex: 1,
    marginLeft: spacing.xs,
    fontSize: moderateScale(14),
    color: colors.text.primary,
  },
  deleteButton: {
    padding: spacing.xxs,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'spaceAround',
    marginTop: spacing.m,
  },
  button: {
    flex: 1,
    marginHorizontal: spacing.s,
  },
});