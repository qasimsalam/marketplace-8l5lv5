/**
 * AI Talent Marketplace - Proposal Form Component (Android)
 *
 * This component provides a form for AI professionals to submit job proposals
 * on the Android application. It includes fields for cover letter, proposed rate/budget,
 * estimated timeline, and portfolio attachments.
 *
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react'; // v18.2.0
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
} from 'react-native'; // v0.72.0
import { Formik } from 'formik'; // ^2.4.5
import * as Yup from 'yup'; // ^1.2.0
import DocumentPicker from 'react-native-document-picker'; // ^8.0.0
import { useToast } from 'react-native-toast-notifications'; // ^3.4.0

// Internal imports
import Button, { ButtonVariant } from '../common/Button';
import Input, { InputType } from '../common/Input';
import Card from '../common/Card';
import useJobs from '../../hooks/useJobs';
import { ProposalFormValues } from '../../types/job.types';
import { validateProposalForm } from '../../utils/validation';
import { ProposalFormProps } from '../../types/job.types';

/**
 * Yup validation schema for the proposal form
 */
const validationSchema = Yup.object().shape({
  coverLetter: Yup.string()
    .required('Cover letter is required')
    .min(100, 'Cover letter must be at least 100 characters'),
  proposedRate: Yup.number().when('job.type', {
    is: 'hourly',
    then: Yup.number()
      .required('Proposed rate is required for hourly jobs')
      .positive('Proposed rate must be a positive number'),
    otherwise: Yup.number().notRequired(),
  }),
  proposedBudget: Yup.number().when('job.type', {
    is: 'fixed_price',
    then: Yup.number()
      .required('Proposed budget is required for fixed price jobs')
      .positive('Proposed budget must be a positive number'),
    otherwise: Yup.number().notRequired(),
  }),
  estimatedDuration: Yup.number()
    .required('Estimated duration is required')
    .positive('Estimated duration must be a positive number'),
  estimatedHours: Yup.number().when('job.type', {
    is: 'hourly',
    then: Yup.number()
      .required('Estimated hours is required for hourly jobs')
      .positive('Estimated hours must be a positive number'),
    otherwise: Yup.number().notRequired(),
  }),
  attachments: Yup.array().max(5, 'Maximum 5 files are allowed'),
});

/**
 * A form component for AI professionals to submit job proposals on the Android app
 */
export const ProposalForm: React.FC<ProposalFormProps> = ({
  jobId,
  job,
  onSuccess,
  onCancel,
}) => {
  // State for tracking submission status
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Hooks
  const { submitProposal } = useJobs();
  const toast = useToast();

  /**
   * Handles form submission, validates input, and submits proposal
   */
  const handleSubmit = async (values: ProposalFormValues) => {
    setIsSubmitting(true);

    // Validate form values using validateProposalForm
    const { isValid, errors } = validateProposalForm(values);

    // If validation fails, set errors and return
    if (!isValid) {
      toast.show(Object.values(errors)[0], { type: 'danger' });
      setIsSubmitting(false);
      return;
    }

    try {
      // Call submitProposal from useJobs with validated values
      await submitProposal(values);

      // On success, show success toast and call onSuccess callback
      toast.show('Proposal submitted successfully!', { type: 'success' });
      onSuccess();
    } catch (error: any) {
      // On error, show error toast and log error
      toast.show(`Failed to submit proposal: ${error.message}`, {
        type: 'danger',
      });
      console.error('Error submitting proposal:', error);
    } finally {
      // Finally set isSubmitting to false
      setIsSubmitting(false);
    }
  };

  /**
   * Opens document picker to select portfolio attachments
   */
  const pickDocument = async (setFieldValue: (field: string, value: any, shouldValidate?: boolean | undefined) => void) => {
    try {
      // Call DocumentPicker.pick with multiple option
      const pickerResult = await DocumentPicker.pick({
        presentationStyle: 'fullScreen',
        copyToCacheDirectory: true,
        multiple: true,
      });

      // Process selected files to match ProposalFormValues.attachments format
      const files = pickerResult.map((item) => ({
        name: item.name,
        uri: item.uri,
        type: item.type,
      }));

      // Update form state with selected files using setFieldValue
      setFieldValue('attachments', files);
    } catch (e: any) {
      // Handle errors if document picking fails or is cancelled
      if (DocumentPicker.isCancel(e)) {
        // User cancelled the picker
      } else {
        // Log the error
        console.error(e);
        throw e;
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <Formik
        initialValues={{
          jobId: jobId,
          coverLetter: '',
          proposedRate: 0,
          proposedBudget: 0,
          estimatedDuration: 0,
          estimatedHours: 0,
          attachments: [],
          milestones: [],
        }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({
          handleChange,
          handleBlur,
          handleSubmit,
          values,
          errors,
          touched,
          setFieldValue,
        }) => (
          <ScrollView contentContainerStyle={styles.container}>
            <Card>
              <Input
                label="Cover Letter"
                placeholder="Write a compelling cover letter"
                onChangeText={handleChange('coverLetter')}
                onBlur={handleBlur('coverLetter')}
                value={values.coverLetter}
                error={touched.coverLetter && errors.coverLetter}
                multiline={true}
                numberOfLines={4}
              />

              {job?.type === 'hourly' && (
                <Input
                  label="Proposed Hourly Rate"
                  placeholder="Enter your hourly rate"
                  onChangeText={handleChange('proposedRate')}
                  onBlur={handleBlur('proposedRate')}
                  value={values.proposedRate.toString()}
                  error={touched.proposedRate && errors.proposedRate}
                  type={InputType.NUMBER}
                />
              )}

              {job?.type === 'fixed_price' && (
                <Input
                  label="Proposed Budget"
                  placeholder="Enter your budget for this job"
                  onChangeText={handleChange('proposedBudget')}
                  onBlur={handleBlur('proposedBudget')}
                  value={values.proposedBudget.toString()}
                  error={touched.proposedBudget && errors.proposedBudget}
                  type={InputType.NUMBER}
                />
              )}

              <Input
                label="Estimated Duration (days)"
                placeholder="Enter the estimated duration"
                onChangeText={handleChange('estimatedDuration')}
                onBlur={handleBlur('estimatedDuration')}
                value={values.estimatedDuration.toString()}
                error={touched.estimatedDuration && errors.estimatedDuration}
                type={InputType.NUMBER}
              />

              {job?.type === 'hourly' && (
                <Input
                  label="Estimated Hours"
                  placeholder="Enter the estimated hours"
                  onChangeText={handleChange('estimatedHours')}
                  onBlur={handleBlur('estimatedHours')}
                  value={values.estimatedHours.toString()}
                  error={touched.estimatedHours && errors.estimatedHours}
                  type={InputType.NUMBER}
                />
              )}

              <View style={styles.attachmentContainer}>
                <Text style={styles.attachmentLabel}>Attachments</Text>
                <Button
                  title="Pick Documents"
                  onPress={() => pickDocument(setFieldValue)}
                  variant={ButtonVariant.SECONDARY}
                />
                {values.attachments &&
                  values.attachments.map((file, index) => (
                    <Text key={index} style={styles.attachmentText}>
                      {file.name}
                    </Text>
                  ))}
                {touched.attachments && errors.attachments && (
                  <Text style={styles.errorText}>{errors.attachments}</Text>
                )}
              </View>

              <View style={styles.buttonContainer}>
                <Button
                  title="Cancel"
                  onPress={onCancel}
                  variant={ButtonVariant.OUTLINE}
                  isDisabled={isSubmitting}
                />
                <Button
                  title="Submit Proposal"
                  onPress={handleSubmit}
                  isDisabled={isSubmitting}
                  isLoading={isSubmitting}
                />
              </View>
            </Card>
          </ScrollView>
        )}
      </Formik>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
  },
  attachmentContainer: {
    marginBottom: 16,
  },
  attachmentLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  attachmentText: {
    fontSize: 14,
    color: 'blue',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
  },
  errorText: {
    color: 'red',
    marginTop: 4,
  },
});