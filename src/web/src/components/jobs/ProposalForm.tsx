import React, { useState, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

import { Input, InputType } from '../common/Input';
import { Select, SelectOption } from '../common/Select';
import { Button, ButtonVariant } from '../common/Button';
import { Job, ProposalFormValues, ProposalMilestoneFormValues } from '../../types/job';
import { useJobs } from '../../hooks/useJobs';
import { isRequired, isPositiveNumber, isMinLength, isMaxLength, isDateInFuture } from '../../utils/validation';
import useToast from '../../hooks/useToast';

/**
 * Props interface for the proposal form component
 */
interface ProposalFormProps {
  job: Job;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Form component for AI professionals to submit proposals for jobs on the AI Talent Marketplace.
 * Provides comprehensive fields for proposal details, budget, timeline, and attachments
 * with validation and submission handling.
 */
const ProposalForm: React.FC<ProposalFormProps> = ({ job, onSuccess, onCancel }) => {
  // Initialize form with react-hook-form
  const { control, handleSubmit, watch, formState: { errors, isValid, isDirty } } = useForm<ProposalFormValues>({
    mode: 'onChange',
    defaultValues: {
      jobId: job.id,
      coverLetter: '',
      proposedRate: job.type === 'hourly' ? job.hourlyRate : 0,
      proposedBudget: job.type === 'fixed_price' ? job.budget : 0,
      estimatedDuration: job.estimatedDuration || 0,
      estimatedHours: job.estimatedHours || 0,
      attachments: [],
      milestones: job.type === 'milestone_based' ? [] : undefined
    }
  });

  // Access job-related API functions and state
  const { submitJobProposal, isLoading, canSubmitProposal } = useJobs();
  
  // Initialize toast notifications
  const toast = useToast();
  
  // Set up field array for dynamic milestone management
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'milestones'
  });
  
  // States to track total budget and file selection
  const [totalMilestoneBudget, setTotalMilestoneBudget] = useState<number>(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // Watch milestones to calculate total budget
  const milestones = watch('milestones');
  
  // Calculate total milestone budget when milestones change
  useEffect(() => {
    if (job.type === 'milestone_based' && milestones) {
      const total = milestones.reduce((sum, milestone) => sum + (Number(milestone.amount) || 0), 0);
      setTotalMilestoneBudget(total);
    }
  }, [milestones, job.type]);
  
  // Add a new milestone to the form
  const addMilestone = () => {
    const newMilestone: ProposalMilestoneFormValues = {
      title: '',
      description: '',
      amount: 0,
      dueDate: new Date(),
      order: milestones?.length || 0
    };
    append(newMilestone);
  };
  
  // Handle file selection for attachments
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList) return;
    
    // Check file size limits (10MB per file)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    const MAX_FILES = 5;
    
    const validFiles: File[] = [];
    let fileSizeError = false;
    
    // Process each selected file
    Array.from(fileList).forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        fileSizeError = true;
      } else if (selectedFiles.length + validFiles.length < MAX_FILES) {
        validFiles.push(file);
      }
    });
    
    if (fileSizeError) {
      toast.error('Some files exceed the 10MB size limit and were not added');
    }
    
    if (selectedFiles.length + validFiles.length > MAX_FILES) {
      toast.warning(`Maximum ${MAX_FILES} files allowed. Only the first ${MAX_FILES - selectedFiles.length} were added.`);
    }
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };
  
  // Remove a selected file from the list
  const removeFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  // Handle form submission
  const onSubmit = async (data: ProposalFormValues) => {
    try {
      // Add selected files to form data
      const formData = {
        ...data,
        attachments: selectedFiles
      };
      
      await submitJobProposal(formData);
      toast.success('Proposal submitted successfully!');
      onSuccess();
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Failed to submit proposal. Please try again.');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Submit a Proposal for "{job.title}"</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Cover Letter Section */}
        <section>
          <h3 className="text-lg font-semibold mb-3">Cover Letter</h3>
          <div className="mb-4">
            <Controller
              name="coverLetter"
              control={control}
              rules={{
                required: 'Cover letter is required',
                validate: {
                  minLength: (value) => isMinLength(value, 100) || 'Cover letter should be at least 100 characters',
                  maxLength: (value) => isMaxLength(value, 5000) || 'Cover letter should not exceed 5000 characters'
                }
              }}
              render={({ field }) => (
                <div>
                  <label htmlFor="coverLetter" className="block mb-2 text-sm font-medium text-gray-700">
                    Explain why you're a good fit for this job
                  </label>
                  <textarea
                    id="coverLetter"
                    className={`w-full h-40 p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.coverLetter ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Introduce yourself and explain how your skills and experience make you a good fit for this job..."
                    {...field}
                  />
                  {errors.coverLetter && (
                    <p className="mt-1 text-sm text-red-600">{errors.coverLetter.message}</p>
                  )}
                  <div className="mt-1 text-sm text-gray-500 flex justify-between">
                    <span>Be specific and highlight relevant experience</span>
                    <span>{field.value?.length || 0}/5000</span>
                  </div>
                </div>
              )}
            />
          </div>
        </section>

        {/* Budget/Rate Section */}
        <section>
          <h3 className="text-lg font-semibold mb-3">Proposed Terms</h3>
          
          {/* Hourly Rate */}
          {job.type === 'hourly' && (
            <div className="mb-4">
              <Controller
                name="proposedRate"
                control={control}
                rules={{
                  required: 'Hourly rate is required',
                  validate: {
                    positive: (value) => isPositiveNumber(Number(value)) || 'Rate must be greater than zero'
                  }
                }}
                render={({ field }) => (
                  <Input
                    type={InputType.NUMBER}
                    label="Your Hourly Rate ($)"
                    placeholder="Enter your hourly rate"
                    error={errors.proposedRate?.message}
                    required
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                )}
              />
              <p className="mt-1 text-sm text-gray-500">
                Client's budget: ${job.hourlyRate}/hour
              </p>
            </div>
          )}
          
          {/* Fixed Budget */}
          {job.type === 'fixed_price' && (
            <div className="mb-4">
              <Controller
                name="proposedBudget"
                control={control}
                rules={{
                  required: 'Budget is required',
                  validate: {
                    positive: (value) => isPositiveNumber(Number(value)) || 'Budget must be greater than zero'
                  }
                }}
                render={({ field }) => (
                  <Input
                    type={InputType.NUMBER}
                    label="Your Proposed Budget ($)"
                    placeholder="Enter your proposed budget"
                    error={errors.proposedBudget?.message}
                    required
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                )}
              />
              <p className="mt-1 text-sm text-gray-500">
                Client's budget: ${job.budget}
              </p>
            </div>
          )}
          
          {/* Project Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Controller
              name="estimatedDuration"
              control={control}
              rules={{
                required: 'Project duration is required',
                validate: {
                  positive: (value) => isPositiveNumber(Number(value)) || 'Duration must be greater than zero'
                }
              }}
              render={({ field }) => (
                <Input
                  type={InputType.NUMBER}
                  label="Estimated Duration (days)"
                  placeholder="Enter estimated duration"
                  error={errors.estimatedDuration?.message}
                  required
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              )}
            />
            
            {/* Estimated Hours (for hourly jobs) */}
            {job.type === 'hourly' && (
              <Controller
                name="estimatedHours"
                control={control}
                rules={{
                  required: 'Estimated hours is required',
                  validate: {
                    positive: (value) => isPositiveNumber(Number(value)) || 'Hours must be greater than zero'
                  }
                }}
                render={({ field }) => (
                  <Input
                    type={InputType.NUMBER}
                    label="Estimated Hours"
                    placeholder="Enter estimated total hours"
                    error={errors.estimatedHours?.message}
                    required
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                )}
              />
            )}
          </div>
        </section>
        
        {/* Milestones Section (only for milestone-based jobs) */}
        {job.type === 'milestone_based' && (
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Project Milestones</h3>
              <p className="text-sm font-medium">
                Total: ${totalMilestoneBudget.toFixed(2)}
              </p>
            </div>
            
            {fields.map((field, index) => (
              <MilestoneItem 
                key={field.id} 
                index={index} 
                remove={remove} 
                control={control} 
                errors={errors}
              />
            ))}
            
            <Button
              type="button"
              variant={ButtonVariant.OUTLINE}
              onClick={addMilestone}
              className="w-full mt-3"
            >
              <FiPlus className="mr-2" /> Add Milestone
            </Button>
            
            {fields.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Add milestones to break down the project into deliverable chunks.
              </p>
            )}
          </section>
        )}
        
        {/* Attachments Section */}
        <section>
          <h3 className="text-lg font-semibold mb-3">Attachments</h3>
          
          <div className="border-dashed border-2 border-gray-300 p-6 rounded-lg mb-3">
            <input
              type="file"
              id="attachments"
              className="hidden"
              multiple
              onChange={handleFileChange}
            />
            <label htmlFor="attachments" className="cursor-pointer block text-center">
              <div className="flex flex-col items-center justify-center">
                <FiPlus className="text-gray-400 text-3xl mb-2" />
                <p className="text-sm text-gray-600 font-medium">
                  Click to add files
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Upload portfolios, examples, or any relevant documents (Max 5 files, 10MB each)
                </p>
              </div>
            </label>
          </div>
          
          {selectedFiles.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Selected files ({selectedFiles.length}):
              </p>
              <ul className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <li key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm truncate max-w-xs">{file.name}</span>
                    <Button
                      variant={ButtonVariant.GHOST}
                      className="p-1 text-gray-400 hover:text-red-500"
                      onClick={() => removeFile(index)}
                      ariaLabel={`Remove ${file.name}`}
                    >
                      <FiTrash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
        
        {/* Form Actions */}
        <div className="flex justify-end space-x-4 mt-8">
          <Button
            type="button"
            variant={ButtonVariant.OUTLINE}
            onClick={onCancel}
          >
            Cancel
          </Button>
          
          <Button
            type="submit"
            disabled={!isValid || isLoading || !canSubmitProposal || !isDirty}
            isLoading={isLoading}
          >
            Submit Proposal
          </Button>
        </div>
      </form>
    </div>
  );
};

/**
 * Sub-component for rendering a single milestone input group
 */
const MilestoneItem: React.FC<{
  index: number;
  remove: (index: number) => void;
  control: any;
  errors: any;
}> = ({ index, remove, control, errors }) => {
  return (
    <div className="p-4 border border-gray-200 rounded-lg mb-4 relative">
      <Button
        variant={ButtonVariant.GHOST}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500"
        onClick={() => remove(index)}
        ariaLabel={`Remove milestone ${index + 1}`}
      >
        <FiTrash2 />
      </Button>
      
      <div className="mb-3">
        <Controller
          name={`milestones.${index}.title`}
          control={control}
          rules={{
            required: 'Milestone title is required'
          }}
          render={({ field }) => (
            <Input
              label={`Milestone ${index + 1} Title`}
              placeholder="What will you deliver in this milestone?"
              error={errors.milestones?.[index]?.title?.message}
              required
              {...field}
            />
          )}
        />
      </div>
      
      <div className="mb-3">
        <Controller
          name={`milestones.${index}.description`}
          control={control}
          rules={{
            required: 'Description is required',
            validate: {
              minLength: (value) => isMinLength(value, 20) || 'Description should be at least 20 characters'
            }
          }}
          render={({ field }) => (
            <div>
              <label htmlFor={`milestone-desc-${index}`} className="block mb-2 text-sm font-medium text-gray-700">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id={`milestone-desc-${index}`}
                className={`w-full h-20 p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.milestones?.[index]?.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Describe what this milestone includes..."
                {...field}
              />
              {errors.milestones?.[index]?.description && (
                <p className="mt-1 text-sm text-red-600">{errors.milestones?.[index]?.description?.message}</p>
              )}
            </div>
          )}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Controller
          name={`milestones.${index}.amount`}
          control={control}
          rules={{
            required: 'Amount is required',
            validate: {
              positive: (value) => isPositiveNumber(Number(value)) || 'Amount must be greater than zero'
            }
          }}
          render={({ field }) => (
            <Input
              type={InputType.NUMBER}
              label="Amount ($)"
              placeholder="Enter amount"
              error={errors.milestones?.[index]?.amount?.message}
              required
              {...field}
              onChange={(e) => field.onChange(Number(e.target.value))}
            />
          )}
        />
        
        <Controller
          name={`milestones.${index}.dueDate`}
          control={control}
          rules={{
            required: 'Due date is required',
            validate: {
              future: (value) => {
                const date = new Date(value);
                return isDateInFuture(date) || 'Date must be in the future';
              }
            }
          }}
          render={({ field }) => (
            <Input
              type={InputType.DATE}
              label="Due Date"
              placeholder="Select a date"
              error={errors.milestones?.[index]?.dueDate?.message}
              required
              {...field}
            />
          )}
        />
      </div>
    </div>
  );
};

export default ProposalForm;