import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import useToast from 'react-native-toast-message';

import { ProposalFormValues, ProposalMilestoneFormValues, Job, JobType } from '../../types/job.types';
import { Input, InputType } from '../common/Input';
import { Button, ButtonVariant, ButtonSize } from '../common/Button';
import { Select, SelectOption } from '../common/Select';
import useJobs from '../../hooks/useJobs';
import { validateProposalForm } from '../../utils/validation';
import { colors } from '../../styles/colors';
import { moderateScale } from '../../utils/responsive';

export interface ProposalFormProps {
  job: Job;
  onSubmitSuccess: () => void;
  onCancel: () => void;
}

const ProposalForm: React.FC<ProposalFormProps> = ({ job, onSubmitSuccess, onCancel }) => {
  // Form values state
  const [formValues, setFormValues] = useState<ProposalFormValues>(getInitialValues(job));
  
  // Form validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Date picker state for milestone due dates
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [activeMilestoneIndex, setActiveMilestoneIndex] = useState<number | null>(null);
  
  // Get job submission functionality from useJobs hook
  const { submitProposal, loading, error } = useJobs();
  
  // Reset form errors when job changes
  useEffect(() => {
    setFormErrors({});
    setFormValues(getInitialValues(job));
  }, [job]);
  
  // Handle form field changes
  const handleChange = (field: keyof ProposalFormValues, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field if it exists
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  // Handle file selection
  const handleFilePicker = async () => {
    try {
      const results = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        allowMultiSelection: true,
      });
      
      // Convert picked documents to file objects
      const pickedFiles = results.map(file => ({
        uri: file.uri,
        type: file.type || 'application/octet-stream',
        name: file.name || 'file'
      }));
      
      setFormValues(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...pickedFiles]
      }));
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled the picker
      } else {
        Alert.alert('Error', 'Error selecting files. Please try again.');
      }
    }
  };
  
  // Function to add a new milestone
  const addMilestone = () => {
    const newMilestone: ProposalMilestoneFormValues = {
      title: '',
      description: '',
      amount: 0,
      dueDate: new Date(new Date().setDate(new Date().getDate() + 7)), // Default due date 1 week from now
      order: formValues.milestones.length + 1
    };
    
    setFormValues(prev => ({
      ...prev,
      milestones: [...prev.milestones, newMilestone]
    }));
  };
  
  // Function to update milestone fields
  const updateMilestone = (index: number, field: keyof ProposalMilestoneFormValues, value: any) => {
    const updatedMilestones = [...formValues.milestones];
    updatedMilestones[index] = {
      ...updatedMilestones[index],
      [field]: value
    };
    
    setFormValues(prev => ({
      ...prev,
      milestones: updatedMilestones
    }));
    
    // Clear error for this milestone field if it exists
    const errorKey = `milestones[${index}].${field}`;
    if (formErrors[errorKey]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };
  
  // Function to remove a milestone
  const removeMilestone = (index: number) => {
    const updatedMilestones = formValues.milestones.filter((_, i) => i !== index);
    
    // Update order values
    updatedMilestones.forEach((milestone, i) => {
      milestone.order = i + 1;
    });
    
    setFormValues(prev => ({
      ...prev,
      milestones: updatedMilestones
    }));
  };
  
  // Function to show date picker for milestone due date
  const showDatePicker = (index: number) => {
    setActiveMilestoneIndex(index);
    setDatePickerVisible(true);
  };
  
  // Function to handle date selection
  const handleConfirmDate = (date: Date) => {
    if (activeMilestoneIndex !== null) {
      updateMilestone(activeMilestoneIndex, 'dueDate', date);
    }
    setDatePickerVisible(false);
  };
  
  // Function to reset form
  const resetForm = () => {
    setFormValues(getInitialValues(job));
    setFormErrors({});
  };
  
  // Function to handle form submission
  const handleSubmit = async () => {
    // Validate form
    const validationResult = validateProposalForm(formValues);
    
    if (!validationResult.isValid) {
      setFormErrors(validationResult.errors);
      Alert.alert('Validation Error', 'Please fix the errors in the form and try again.');
      return;
    }
    
    try {
      // Submit proposal
      await submitProposal(formValues);
      
      // Clear form errors
      setFormErrors({});
      
      // Show success message
      Alert.alert('Success', 'Your proposal has been submitted successfully.');
      
      // Call success callback
      onSubmitSuccess();
    } catch (err) {
      // Show error message
      Alert.alert('Error', error || 'Failed to submit proposal. Please try again.');
    }
  };
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Submit Proposal for "{job.title}"</Text>
        
        {/* Cover Letter Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cover Letter</Text>
          <Text style={styles.sectionDescription}>
            Introduce yourself and explain why you're a good fit for this job.
          </Text>
          <Input
            label="Cover Letter"
            value={formValues.coverLetter}
            onChangeText={(text) => handleChange('coverLetter', text)}
            placeholder="Share your relevant experience and approach to this project..."
            error={formErrors.coverLetter}
            multiline
            numberOfLines={6}
            isRequired
          />
        </View>
        
        {/* Budget/Rate Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Terms</Text>
          <Text style={styles.sectionDescription}>
            Specify your pricing and timeline for the project.
          </Text>
          
          {job.type === JobType.FIXED_PRICE && (
            <Input
              label="Proposed Budget"
              value={formValues.proposedBudget.toString()}
              onChangeText={(text) => {
                const numericValue = text.replace(/[^0-9.]/g, '');
                handleChange('proposedBudget', parseFloat(numericValue) || 0);
              }}
              placeholder="Enter proposed budget"
              keyboardType="numeric"
              error={formErrors.proposedBudget}
              isRequired
              type={InputType.NUMBER}
            />
          )}
          
          {job.type === JobType.HOURLY && (
            <>
              <Input
                label="Proposed Hourly Rate"
                value={formValues.proposedRate.toString()}
                onChangeText={(text) => {
                  const numericValue = text.replace(/[^0-9.]/g, '');
                  handleChange('proposedRate', parseFloat(numericValue) || 0);
                }}
                placeholder="Enter proposed hourly rate"
                keyboardType="numeric"
                error={formErrors.proposedRate}
                isRequired
                type={InputType.NUMBER}
              />
              <Input
                label="Estimated Hours"
                value={formValues.estimatedHours?.toString() || ''}
                onChangeText={(text) => {
                  const numericValue = text.replace(/[^0-9]/g, '');
                  handleChange('estimatedHours', parseInt(numericValue) || 0);
                }}
                placeholder="Enter estimated hours"
                keyboardType="numeric"
                error={formErrors.estimatedHours}
                type={InputType.NUMBER}
              />
            </>
          )}
          
          {job.type === JobType.MILESTONE_BASED && (
            <View style={styles.milestonesContainer}>
              <Text style={styles.subsectionTitle}>Milestones</Text>
              <Text style={styles.subsectionDescription}>
                Break down the project into milestones with deliverables and payments.
              </Text>
              
              {formValues.milestones.map((milestone, index) => (
                renderMilestoneFields(
                  milestone,
                  index,
                  updateMilestone,
                  removeMilestone,
                  showDatePicker,
                  formErrors
                )
              ))}
              
              <Button
                text="+ Add Milestone"
                variant={ButtonVariant.OUTLINE}
                size={ButtonSize.SMALL}
                onPress={addMilestone}
                style={styles.addMilestoneButton}
              />
              
              {formErrors.milestones && (
                <Text style={styles.errorText}>{formErrors.milestones}</Text>
              )}
              
              <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                onConfirm={handleConfirmDate}
                onCancel={() => setDatePickerVisible(false)}
                minimumDate={new Date()} // Cannot set past dates
              />
            </View>
          )}
        </View>
        
        {/* Attachments Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attachments</Text>
          <Text style={styles.sectionDescription}>
            Add files to support your proposal (optional).
          </Text>
          
          <View style={styles.attachmentsContainer}>
            {formValues.attachments && formValues.attachments.map((file, index) => (
              <View key={index} style={styles.attachmentItem}>
                <Text style={styles.attachmentName} numberOfLines={1}>{file.name}</Text>
                <TouchableOpacity
                  onPress={() => {
                    const updatedAttachments = [...formValues.attachments];
                    updatedAttachments.splice(index, 1);
                    handleChange('attachments', updatedAttachments);
                  }}
                >
                  <Text style={styles.removeButton}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
            
            <Button
              text="Select Files"
              variant={ButtonVariant.OUTLINE}
              size={ButtonSize.SMALL}
              onPress={handleFilePicker}
              style={styles.addFileButton}
            />
            
            {formErrors.attachments && (
              <Text style={styles.errorText}>{formErrors.attachments}</Text>
            )}
          </View>
        </View>
        
        {/* Form Actions */}
        <View style={styles.formActions}>
          <Button
            text="Cancel"
            variant={ButtonVariant.OUTLINE}
            onPress={onCancel}
            style={styles.cancelButton}
          />
          <Button
            text="Reset"
            variant={ButtonVariant.SECONDARY}
            onPress={resetForm}
            style={styles.resetButton}
          />
          <Button
            text={loading ? 'Submitting...' : 'Submit Proposal'}
            variant={ButtonVariant.PRIMARY}
            onPress={handleSubmit}
            disabled={loading}
            isLoading={loading}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// Helper function to render milestone fields
const renderMilestoneFields = (
  milestone: ProposalMilestoneFormValues,
  index: number,
  updateMilestone: (index: number, field: keyof ProposalMilestoneFormValues, value: any) => void,
  removeMilestone: (index: number) => void,
  showDatePicker: (index: number) => void,
  errors: Record<string, string>
) => {
  const milestoneErrorKey = `milestones[${index}]`;
  
  return (
    <View key={index} style={styles.milestoneItem}>
      <Text style={styles.milestoneNumber}>Milestone #{index + 1}</Text>
      
      <Input
        label="Title"
        value={milestone.title}
        onChangeText={(text) => updateMilestone(index, 'title', text)}
        placeholder="Milestone title"
        error={errors[`${milestoneErrorKey}.title`]}
        isRequired
      />
      
      <Input
        label="Description"
        value={milestone.description}
        onChangeText={(text) => updateMilestone(index, 'description', text)}
        placeholder="Describe the deliverables for this milestone"
        multiline
        numberOfLines={3}
        error={errors[`${milestoneErrorKey}.description`]}
        isRequired
      />
      
      <Input
        label="Amount"
        value={milestone.amount.toString()}
        onChangeText={(text) => {
          const numericValue = text.replace(/[^0-9.]/g, '');
          updateMilestone(index, 'amount', parseFloat(numericValue) || 0);
        }}
        placeholder="Enter amount for this milestone"
        keyboardType="numeric"
        error={errors[`${milestoneErrorKey}.amount`]}
        isRequired
        type={InputType.NUMBER}
      />
      
      <View style={styles.dateContainer}>
        <Text style={styles.dateLabel}>Due Date:</Text>
        <TouchableOpacity onPress={() => showDatePicker(index)}>
          <Text style={styles.dateValue}>
            {milestone.dueDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
        {errors[`${milestoneErrorKey}.dueDate`] && (
          <Text style={styles.errorText}>{errors[`${milestoneErrorKey}.dueDate`]}</Text>
        )}
      </View>
      
      <TouchableOpacity onPress={() => removeMilestone(index)} style={styles.removeMilestoneButton}>
        <Text style={styles.removeMilestoneText}>Remove Milestone</Text>
      </TouchableOpacity>
    </View>
  );
};

// Helper function to generate initial form values based on job data
const getInitialValues = (job: Job): ProposalFormValues => {
  return {
    jobId: job.id,
    coverLetter: '',
    proposedRate: job.type === JobType.HOURLY ? job.hourlyRate || 0 : 0,
    proposedBudget: job.type === JobType.FIXED_PRICE ? job.budget || 0 : 0,
    estimatedHours: job.type === JobType.HOURLY ? job.estimatedHours || 0 : 0,
    estimatedDuration: 0,
    attachments: [],
    milestones: job.type === JobType.MILESTONE_BASED ? [
      {
        title: '',
        description: '',
        amount: 0,
        dueDate: new Date(new Date().setDate(new Date().getDate() + 7)), // Default due date 1 week from now
        order: 1
      }
    ] : []
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary
  },
  scrollView: {
    flex: 1
  },
  contentContainer: {
    padding: moderateScale(16)
  },
  title: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    marginBottom: moderateScale(16),
    color: colors.text.primary
  },
  form: {
    width: '100%'
  },
  section: {
    marginBottom: moderateScale(24),
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    paddingBottom: moderateScale(24)
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    marginBottom: moderateScale(8),
    color: colors.text.primary
  },
  sectionDescription: {
    fontSize: moderateScale(14),
    color: colors.text.secondary,
    marginBottom: moderateScale(16)
  },
  subsectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    marginBottom: moderateScale(8),
    color: colors.text.primary
  },
  subsectionDescription: {
    fontSize: moderateScale(14),
    color: colors.text.secondary,
    marginBottom: moderateScale(16)
  },
  milestonesContainer: {
    marginTop: moderateScale(16)
  },
  milestoneItem: {
    backgroundColor: colors.background.secondary,
    borderRadius: moderateScale(8),
    padding: moderateScale(16),
    marginBottom: moderateScale(16)
  },
  milestoneNumber: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    marginBottom: moderateScale(12),
    color: colors.text.primary
  },
  addMilestoneButton: {
    alignSelf: 'flex-start',
    marginTop: moderateScale(8)
  },
  dateContainer: {
    marginBottom: moderateScale(16)
  },
  dateLabel: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    marginBottom: moderateScale(4),
    color: colors.text.primary
  },
  dateValue: {
    fontSize: moderateScale(16),
    color: colors.primary[600],
    padding: moderateScale(8),
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: moderateScale(4),
    backgroundColor: colors.background.primary
  },
  removeMilestoneButton: {
    alignSelf: 'flex-end',
    marginTop: moderateScale(8)
  },
  removeMilestoneText: {
    color: colors.error[500],
    fontSize: moderateScale(14)
  },
  attachmentsContainer: {
    marginTop: moderateScale(8)
  },
  attachmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: moderateScale(4),
    padding: moderateScale(8),
    marginBottom: moderateScale(8)
  },
  attachmentName: {
    flex: 1,
    fontSize: moderateScale(14),
    color: colors.text.primary
  },
  removeButton: {
    color: colors.error[500],
    fontSize: moderateScale(14),
    marginLeft: moderateScale(8)
  },
  addFileButton: {
    alignSelf: 'flex-start',
    marginTop: moderateScale(8)
  },
  errorText: {
    color: colors.error[500],
    fontSize: moderateScale(12),
    marginTop: moderateScale(4)
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: moderateScale(24)
  },
  cancelButton: {
    flex: 1,
    marginRight: moderateScale(4)
  },
  resetButton: {
    flex: 1,
    marginHorizontal: moderateScale(4)
  },
  submitButton: {
    flex: 1,
    marginLeft: moderateScale(4)
  }
});

export default ProposalForm;