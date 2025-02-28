import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  Alert
} from 'react-native';
import { Formik } from 'formik'; // ^2.4.3
import DateTimePicker from '@react-native-community/datetimepicker'; // ^7.4.1
import DocumentPicker from 'react-native-document-picker'; // ^9.0.1
import { useNavigation, useRoute } from '@react-navigation/native'; // ^6.1.7

import { JobFormValues, JobType, JobDifficulty } from '../../types/job.types';
import { Button, ButtonVariant, ButtonSize } from '../common/Button';
import { Input, InputType } from '../common/Input';
import { Select, SelectOption } from '../common/Select';
import useJobs from '../../hooks/useJobs';
import { validateJobForm } from '../../utils/validation';
import { colors } from '../../styles/colors';
import { textVariants } from '../../styles/typography';
import { moderateScale } from '../../utils/responsive';

// Maximum number of attachments allowed
const MAX_ATTACHMENTS = 5;

// JobFormProps interface
export interface JobFormProps {
  initialValues?: JobFormValues;
  jobId?: string;
  onSuccess?: () => void;
  isModal?: boolean;
}

// Default initial values for a new job
const defaultInitialValues: JobFormValues = {
  title: '',
  description: '',
  type: JobType.FIXED_PRICE,
  budget: 0,
  minBudget: 0,
  maxBudget: 0,
  hourlyRate: 0,
  estimatedDuration: 7, // Default: 1 week
  estimatedHours: 0,
  difficulty: JobDifficulty.INTERMEDIATE,
  location: '',
  isRemote: true,
  requiredSkills: [],
  preferredSkills: [],
  attachments: [],
  category: '',
  subcategory: '',
  startDate: new Date(),
  endDate: new Date(new Date().setDate(new Date().getDate() + 30)) // Default: 30 days from now
};

/**
 * Helper function to format skills data into options format for Select component
 * 
 * @param skills Array of skills data
 * @returns Formatted array of SelectOption objects
 */
const formatSkillOptions = (skills: any[]): SelectOption[] => {
  return skills.map(skill => ({
    label: skill.name,
    value: skill.id
  }));
};

/**
 * A form component for creating and editing job postings in the AI Talent Marketplace
 * iOS application with mobile-optimized UI and validation.
 * 
 * @param props Component props
 * @returns Rendered form component
 */
const JobForm: React.FC<JobFormProps> = ({
  initialValues = defaultInitialValues,
  jobId,
  onSuccess,
  isModal = false
}) => {
  const navigation = useNavigation();
  const route = useRoute();
  const { createJob, updateJob, loading } = useJobs();
  
  // Local loading state (in addition to the useJobs loading state)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Form error state
  const [formError, setFormError] = useState<string | null>(null);
  
  // Job type state (used for conditional rendering)
  const [jobType, setJobType] = useState<JobType>(initialValues.type);
  
  // State for date pickers
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(initialValues.startDate || new Date());
  const [endDate, setEndDate] = useState(initialValues.endDate || new Date(new Date().setDate(new Date().getDate() + 30)));
  
  // State for handling file attachments
  const [attachments, setAttachments] = useState<Array<{ uri: string; name: string; type: string }>>(
    initialValues.attachments || []
  );
  
  // Options for select inputs
  const jobTypeOptions: SelectOption[] = [
    { label: 'Fixed Price', value: JobType.FIXED_PRICE },
    { label: 'Hourly Rate', value: JobType.HOURLY },
    { label: 'Milestone Based', value: JobType.MILESTONE_BASED }
  ];
  
  const difficultyOptions: SelectOption[] = [
    { label: 'Beginner', value: JobDifficulty.BEGINNER },
    { label: 'Intermediate', value: JobDifficulty.INTERMEDIATE },
    { label: 'Advanced', value: JobDifficulty.ADVANCED },
    { label: 'Expert', value: JobDifficulty.EXPERT }
  ];
  
  const durationOptions: SelectOption[] = [
    { label: 'Less than 1 week', value: '7' },
    { label: '1-2 weeks', value: '14' },
    { label: '3-4 weeks', value: '30' },
    { label: '1-3 months', value: '90' },
    { label: '3+ months', value: '180' }
  ];
  
  // Sample skills for demo (in a real app, these would come from an API)
  const sampleSkills = [
    { id: '1', name: 'Machine Learning' },
    { id: '2', name: 'Python' },
    { id: '3', name: 'TensorFlow' },
    { id: '4', name: 'Deep Learning' },
    { id: '5', name: 'Computer Vision' },
    { id: '6', name: 'NLP' },
    { id: '7', name: 'Neural Networks' },
    { id: '8', name: 'AI Ethics' }
  ];
  
  const skillOptions = formatSkillOptions(sampleSkills);
  
  // Handle picking documents for attachments
  const handleDocumentPick = async (setFieldValue: (field: string, value: any) => void) => {
    try {
      // Check if we've reached the maximum number of attachments
      if (attachments.length >= MAX_ATTACHMENTS) {
        Alert.alert(
          'Maximum Attachments Reached', 
          `You can add a maximum of ${MAX_ATTACHMENTS} attachments. Please remove some before adding more.`
        );
        return;
      }
      
      const results = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        allowMultiSelection: true,
      });
      
      // Check if adding these would exceed the limit
      if (attachments.length + results.length > MAX_ATTACHMENTS) {
        Alert.alert(
          'Too Many Attachments', 
          `You can add a maximum of ${MAX_ATTACHMENTS} attachments. Please select fewer files.`
        );
        return;
      }
      
      // Update attachments state
      const newAttachments = [...attachments, ...results];
      setAttachments(newAttachments);
      setFieldValue('attachments', newAttachments);
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled the picker
        console.log('Document picking was cancelled');
      } else {
        console.error('Error picking document:', err);
        Alert.alert('Error', 'There was an error selecting the document.');
      }
    }
  };
  
  // Handle removing an attachment
  const handleRemoveAttachment = (index: number, setFieldValue: (field: string, value: any) => void) => {
    const newAttachments = [...attachments];
    newAttachments.splice(index, 1);
    setAttachments(newAttachments);
    setFieldValue('attachments', newAttachments);
  };
  
  // Handle date changes for iOS
  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios' ? true : false);
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };
  
  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios' ? true : false);
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (values: JobFormValues) => {
    try {
      // Clear any previous errors
      setFormError(null);
      // Set local loading state
      setIsSubmitting(true);
      
      // Make sure dates are included in values
      values.startDate = startDate;
      values.endDate = endDate;
      values.attachments = attachments;
      
      // Validate form values
      const validation = validateJobForm(values);
      
      if (!validation.isValid) {
        // Show first error
        const firstError = Object.values(validation.errors)[0];
        setFormError(firstError);
        Alert.alert('Validation Error', firstError);
        setIsSubmitting(false);
        return;
      }
      
      // Submit form
      if (jobId) {
        // Update existing job
        await updateJob(jobId, values);
        Alert.alert('Success', 'Job posting updated successfully', [
          { text: 'OK', onPress: () => {
            // Call success callback if provided
            if (onSuccess) {
              onSuccess();
            }
          }}
        ]);
      } else {
        // Create new job
        await createJob(values);
        Alert.alert('Success', 'Job posting created successfully', [
          { text: 'OK', onPress: () => {
            // Call success callback if provided
            if (onSuccess) {
              onSuccess();
            }
          }}
        ]);
      }
    } catch (error) {
      setFormError(error.message || 'An error occurred while saving the job');
      Alert.alert('Error', error.message || 'An error occurred while saving the job');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Determine if we should show loading state
  const showLoading = loading || isSubmitting;
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
      keyboardVerticalOffset={isModal ? 90 : 0} // Adjust offset for modal mode
    >
      <ScrollView 
        style={[styles.container, isModal && styles.modalContainer]}
        contentContainerStyle={{ paddingBottom: moderateScale(100) }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Form error display at the top if there's an error */}
        {formError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{formError}</Text>
          </View>
        )}
        
        <Formik
          initialValues={initialValues}
          onSubmit={handleSubmit}
          validateOnChange={false}
          validateOnBlur={true}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => (
            <View>
              {/* Job Details Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Job Details</Text>
                
                <Input
                  label="Job Title"
                  value={values.title}
                  onChangeText={(text) => setFieldValue('title', text)}
                  placeholder="Enter job title"
                  error={touched.title && errors.title}
                  isRequired={true}
                  testID="job-title-input"
                />
                
                <Input
                  label="Job Description"
                  value={values.description}
                  onChangeText={(text) => setFieldValue('description', text)}
                  placeholder="Enter job description"
                  multiline={true}
                  numberOfLines={5}
                  error={touched.description && errors.description}
                  isRequired={true}
                  testID="job-description-input"
                />
                
                <Select
                  label="Job Type"
                  options={jobTypeOptions}
                  value={values.type}
                  onValueChange={(value) => {
                    setFieldValue('type', value);
                    setJobType(value as JobType);
                  }}
                  isRequired={true}
                  testID="job-type-select"
                />
                
                <Input
                  label="Category"
                  value={values.category}
                  onChangeText={(text) => setFieldValue('category', text)}
                  placeholder="e.g., Machine Learning, Data Science"
                  testID="job-category-input"
                />
                
                <Input
                  label="Subcategory"
                  value={values.subcategory}
                  onChangeText={(text) => setFieldValue('subcategory', text)}
                  placeholder="e.g., Computer Vision, NLP"
                  testID="job-subcategory-input"
                />
                
                <Select
                  label="Difficulty Level"
                  options={difficultyOptions}
                  value={values.difficulty}
                  onValueChange={(value) => setFieldValue('difficulty', value)}
                  testID="job-difficulty-select"
                />
              </View>
              
              {/* Budget Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Budget Information</Text>
                
                {(jobType === JobType.FIXED_PRICE || jobType === JobType.MILESTONE_BASED) && (
                  <>
                    <Input
                      label="Budget Amount"
                      value={values.budget.toString()}
                      onChangeText={(text) => {
                        // Remove non-numeric characters except decimal point
                        const numericValue = text.replace(/[^0-9.]/g, '');
                        setFieldValue('budget', numericValue ? parseFloat(numericValue) : 0);
                      }}
                      placeholder="Enter budget amount"
                      type={InputType.NUMBER}
                      error={touched.budget && errors.budget}
                      isRequired={true}
                      testID="job-budget-input"
                    />
                    
                    <View style={styles.fieldRow}>
                      <View style={styles.fieldCol}>
                        <Input
                          label="Min Budget"
                          value={values.minBudget.toString()}
                          onChangeText={(text) => {
                            // Remove non-numeric characters except decimal point
                            const numericValue = text.replace(/[^0-9.]/g, '');
                            setFieldValue('minBudget', numericValue ? parseFloat(numericValue) : 0);
                          }}
                          placeholder="Min"
                          type={InputType.NUMBER}
                          testID="job-min-budget-input"
                        />
                      </View>
                      <View style={styles.fieldCol}>
                        <Input
                          label="Max Budget"
                          value={values.maxBudget.toString()}
                          onChangeText={(text) => {
                            // Remove non-numeric characters except decimal point
                            const numericValue = text.replace(/[^0-9.]/g, '');
                            setFieldValue('maxBudget', numericValue ? parseFloat(numericValue) : 0);
                          }}
                          placeholder="Max"
                          type={InputType.NUMBER}
                          testID="job-max-budget-input"
                        />
                      </View>
                    </View>
                  </>
                )}
                
                {jobType === JobType.HOURLY && (
                  <>
                    <Input
                      label="Hourly Rate"
                      value={values.hourlyRate.toString()}
                      onChangeText={(text) => {
                        // Remove non-numeric characters except decimal point
                        const numericValue = text.replace(/[^0-9.]/g, '');
                        setFieldValue('hourlyRate', numericValue ? parseFloat(numericValue) : 0);
                      }}
                      placeholder="Enter hourly rate"
                      type={InputType.NUMBER}
                      error={touched.hourlyRate && errors.hourlyRate}
                      isRequired={true}
                      testID="job-hourly-rate-input"
                    />
                    
                    <Input
                      label="Estimated Hours"
                      value={values.estimatedHours.toString()}
                      onChangeText={(text) => {
                        // Remove non-numeric characters
                        const numericValue = text.replace(/[^0-9]/g, '');
                        setFieldValue('estimatedHours', numericValue ? parseInt(numericValue) : 0);
                      }}
                      placeholder="Enter estimated hours"
                      type={InputType.NUMBER}
                      error={touched.estimatedHours && errors.estimatedHours}
                      isRequired={true}
                      testID="job-estimated-hours-input"
                    />
                  </>
                )}
              </View>
              
              {/* Skills Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Skills & Requirements</Text>
                
                <Select
                  label="Required Skills"
                  options={skillOptions}
                  value={values.requiredSkills}
                  onValueChange={(value) => {
                    // Handle array of selected values
                    if (Array.isArray(value)) {
                      setFieldValue('requiredSkills', value);
                    } else {
                      setFieldValue('requiredSkills', [value]);
                    }
                  }}
                  isRequired={true}
                  error={touched.requiredSkills && errors.requiredSkills}
                  testID="job-required-skills-select"
                />
                
                <Select
                  label="Preferred Skills"
                  options={skillOptions}
                  value={values.preferredSkills}
                  onValueChange={(value) => {
                    // Handle array of selected values
                    if (Array.isArray(value)) {
                      setFieldValue('preferredSkills', value);
                    } else {
                      setFieldValue('preferredSkills', [value]);
                    }
                  }}
                  testID="job-preferred-skills-select"
                />
                
                <View style={styles.fieldRow}>
                  <View style={styles.fieldCol}>
                    <Input
                      label="Location"
                      value={values.location}
                      onChangeText={(text) => setFieldValue('location', text)}
                      placeholder="Enter location"
                      testID="job-location-input"
                    />
                  </View>
                  <View style={styles.fieldCol}>
                    <Select
                      label="Remote Work"
                      options={[
                        { label: 'Yes', value: 'true' },
                        { label: 'No', value: 'false' }
                      ]}
                      value={values.isRemote ? 'true' : 'false'}
                      onValueChange={(value) => setFieldValue('isRemote', value === 'true')}
                      testID="job-remote-select"
                    />
                  </View>
                </View>
              </View>
              
              {/* Timing Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Timing</Text>
                
                <Select
                  label="Estimated Duration"
                  options={durationOptions}
                  value={values.estimatedDuration.toString()}
                  onValueChange={(value) => setFieldValue('estimatedDuration', parseInt(value) || 7)}
                  testID="job-duration-select"
                />
                
                {/* Start Date Picker - iOS specific handling */}
                <View>
                  <Text style={styles.label}>Start Date</Text>
                  <TouchableOpacity
                    style={styles.datePicker}
                    onPress={() => setShowStartDatePicker(true)}
                    testID="job-start-date-picker"
                  >
                    <Text>{startDate.toLocaleDateString()}</Text>
                  </TouchableOpacity>
                  
                  {/* iOS specific date picker behavior */}
                  {Platform.OS === 'ios' ? (
                    showStartDatePicker && (
                      <View style={styles.iosDatePickerContainer}>
                        <DateTimePicker
                          value={startDate}
                          mode="date"
                          display="spinner"
                          onChange={onStartDateChange}
                          style={styles.iosDatePicker}
                        />
                        <View style={styles.datePickerButtonContainer}>
                          <Button
                            variant={ButtonVariant.OUTLINE}
                            size={ButtonSize.SMALL}
                            text="Cancel"
                            onPress={() => setShowStartDatePicker(false)}
                            style={{ marginRight: moderateScale(8) }}
                          />
                          <Button
                            variant={ButtonVariant.PRIMARY}
                            size={ButtonSize.SMALL}
                            text="Done"
                            onPress={() => setShowStartDatePicker(false)}
                          />
                        </View>
                      </View>
                    )
                  ) : (
                    // Android date picker
                    showStartDatePicker && (
                      <DateTimePicker
                        value={startDate}
                        mode="date"
                        display="default"
                        onChange={onStartDateChange}
                      />
                    )
                  )}
                </View>
                
                {/* End Date Picker - iOS specific handling */}
                <View>
                  <Text style={styles.label}>End Date</Text>
                  <TouchableOpacity
                    style={styles.datePicker}
                    onPress={() => setShowEndDatePicker(true)}
                    testID="job-end-date-picker"
                  >
                    <Text>{endDate.toLocaleDateString()}</Text>
                  </TouchableOpacity>
                  
                  {/* iOS specific date picker behavior */}
                  {Platform.OS === 'ios' ? (
                    showEndDatePicker && (
                      <View style={styles.iosDatePickerContainer}>
                        <DateTimePicker
                          value={endDate}
                          mode="date"
                          display="spinner"
                          onChange={onEndDateChange}
                          style={styles.iosDatePicker}
                        />
                        <View style={styles.datePickerButtonContainer}>
                          <Button
                            variant={ButtonVariant.OUTLINE}
                            size={ButtonSize.SMALL}
                            text="Cancel"
                            onPress={() => setShowEndDatePicker(false)}
                            style={{ marginRight: moderateScale(8) }}
                          />
                          <Button
                            variant={ButtonVariant.PRIMARY}
                            size={ButtonSize.SMALL}
                            text="Done"
                            onPress={() => setShowEndDatePicker(false)}
                          />
                        </View>
                      </View>
                    )
                  ) : (
                    // Android date picker
                    showEndDatePicker && (
                      <DateTimePicker
                        value={endDate}
                        mode="date"
                        display="default"
                        onChange={onEndDateChange}
                      />
                    )
                  )}
                </View>
                
                {errors.dateRange && (
                  <Text style={styles.errorText}>{errors.dateRange}</Text>
                )}
              </View>
              
              {/* Attachments Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Attachments</Text>
                
                <Text style={styles.attachmentHelp}>
                  Attach files related to your job posting (max {MAX_ATTACHMENTS} files)
                </Text>
                
                <TouchableOpacity
                  style={styles.attachmentButton}
                  onPress={() => handleDocumentPick(setFieldValue)}
                  disabled={attachments.length >= MAX_ATTACHMENTS}
                  testID="job-attachment-button"
                >
                  <Text>Add Attachment</Text>
                </TouchableOpacity>
                
                {attachments.map((file, index) => (
                  <View key={index} style={styles.attachmentItem}>
                    <Text numberOfLines={1} style={{ flex: 1 }}>{file.name}</Text>
                    <TouchableOpacity onPress={() => handleRemoveAttachment(index, setFieldValue)}>
                      <Text style={{ color: colors.error[500] }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                
                {errors.attachments && (
                  <Text style={styles.errorText}>{errors.attachments}</Text>
                )}
              </View>
              
              {/* Form Submission Buttons */}
              <View style={styles.buttonContainer}>
                <Button
                  variant={ButtonVariant.OUTLINE}
                  size={ButtonSize.MEDIUM}
                  text="Cancel"
                  onPress={() => {
                    if (isModal) {
                      // For modal, we might want to close it instead of navigation.goBack()
                      if (onSuccess) onSuccess();
                    } else {
                      navigation.goBack();
                    }
                  }}
                  style={{ marginRight: moderateScale(12) }}
                  disabled={showLoading}
                  testID="job-cancel-button"
                />
                <Button
                  variant={ButtonVariant.PRIMARY}
                  size={ButtonSize.MEDIUM}
                  text={jobId ? "Update Job" : "Post Job"}
                  onPress={() => handleSubmit()}
                  isLoading={showLoading}
                  disabled={showLoading}
                  testID="job-submit-button"
                />
              </View>
            </View>
          )}
        </Formik>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    padding: moderateScale(16),
  },
  modalContainer: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: moderateScale(16),
    borderTopRightRadius: moderateScale(16),
  },
  section: {
    marginBottom: moderateScale(24),
  },
  sectionTitle: {
    ...textVariants.heading5,
    marginBottom: moderateScale(16),
  },
  label: {
    ...textVariants.label,
    marginBottom: moderateScale(8),
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: moderateScale(-4),
  },
  fieldCol: {
    flex: 1,
    paddingHorizontal: moderateScale(4),
  },
  datePicker: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: moderateScale(8),
    padding: moderateScale(12),
    marginBottom: moderateScale(16),
  },
  // iOS specific date picker styles
  iosDatePickerContainer: {
    backgroundColor: colors.background.primary,
    borderRadius: moderateScale(8),
    marginBottom: moderateScale(16),
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iosDatePicker: {
    height: moderateScale(200),
  },
  datePickerButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: moderateScale(8),
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  attachmentHelp: {
    ...textVariants.paragraphSmall,
    marginBottom: moderateScale(8),
  },
  attachmentButton: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: moderateScale(8),
    padding: moderateScale(12),
    alignItems: 'center',
    marginBottom: moderateScale(16),
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: moderateScale(8),
    padding: moderateScale(12),
    marginBottom: moderateScale(8),
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: moderateScale(24),
    marginBottom: moderateScale(32),
  },
  errorContainer: {
    backgroundColor: colors.error[50],
    borderRadius: moderateScale(8),
    padding: moderateScale(12),
    marginBottom: moderateScale(16),
    borderWidth: 1,
    borderColor: colors.error[200],
  },
  errorText: {
    color: colors.error[500],
    marginTop: moderateScale(4),
    fontSize: moderateScale(12),
  },
});

export default JobForm;