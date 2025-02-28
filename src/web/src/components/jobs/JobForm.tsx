import React, { useState, useEffect } from 'react'; // ^18.2.0
import { useForm, Controller, FormProvider } from 'react-hook-form'; // ^7.46.1
import { useNavigate, useParams } from 'react-router-dom'; // ^6.14.2
import { FiDollarSign, FiClock, FiCalendar, FiList } from 'react-icons/fi'; // ^4.10.1

import { JobFormValues, JobType, JobDifficulty } from '../../types/job';
import { Button, ButtonVariant } from '../common/Button';
import { Input, InputType } from '../common/Input';
import { Select, SelectOption, formatSelectOptions } from '../common/Select';
import { useJobs } from '../../hooks/useJobs';
import useToast from '../../hooks/useToast';
import { isRequired, isPositiveNumber, isMinLength, isMaxLength, isDateInFuture } from '../../utils/validation';

/**
 * Props for the JobForm component
 */
export interface JobFormProps {
  /**
   * Initial values for the form (for editing)
   */
  initialValues?: Partial<JobFormValues>;
  
  /**
   * Job ID if editing an existing job
   */
  jobId?: string;
  
  /**
   * Callback function called when the form submission succeeds
   */
  onSuccess?: () => void;
}

/**
 * A form component for creating and editing job postings in the AI Talent Marketplace.
 * Provides form fields for job details, budget information, required skills, and other job specifications.
 * Integrates with React Hook Form for validation and state management.
 */
const JobForm: React.FC<JobFormProps> = ({ initialValues, jobId, onSuccess }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const effectiveJobId = jobId || id;
  
  // Get form methods from react-hook-form
  const formMethods = useForm<JobFormValues>({
    defaultValues: initialValues || {
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
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)), // Default to 1 month from now
    },
  });
  
  // Destructure form methods
  const { control, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = formMethods;
  
  // Get jobs hook functions and state
  const { createNewJob, updateExistingJob, isLoading } = useJobs();
  
  // Get toast notification functions
  const toast = useToast();
  
  // Track selected job type to show/hide relevant fields
  const [selectedJobType, setSelectedJobType] = useState<JobType>(
    initialValues?.type || JobType.FIXED_PRICE
  );
  
  // Watch for changes to job type
  const jobType = watch('type');
  
  // Update selected job type when it changes
  useEffect(() => {
    setSelectedJobType(jobType);
  }, [jobType]);
  
  // Generate option arrays for select inputs
  const jobTypeOptions: SelectOption[] = [
    { value: JobType.FIXED_PRICE, label: 'Fixed Price' },
    { value: JobType.HOURLY, label: 'Hourly Rate' },
    { value: JobType.MILESTONE_BASED, label: 'Milestone Based' },
  ];
  
  const difficultyOptions: SelectOption[] = [
    { value: JobDifficulty.BEGINNER, label: 'Beginner' },
    { value: JobDifficulty.INTERMEDIATE, label: 'Intermediate' },
    { value: JobDifficulty.ADVANCED, label: 'Advanced' },
    { value: JobDifficulty.EXPERT, label: 'Expert' },
  ];
  
  // Duration options (in days)
  const durationOptions: SelectOption[] = [
    { value: '7', label: '1 week' },
    { value: '14', label: '2 weeks' },
    { value: '30', label: '1 month' },
    { value: '60', label: '2 months' },
    { value: '90', label: '3 months' },
    { value: '180', label: '6 months' },
    { value: '365', label: '1 year' },
    { value: 'custom', label: 'Custom duration' },
  ];
  
  // Category options
  const categoryOptions: SelectOption[] = [
    { value: 'machine_learning', label: 'Machine Learning' },
    { value: 'deep_learning', label: 'Deep Learning' },
    { value: 'computer_vision', label: 'Computer Vision' },
    { value: 'nlp', label: 'Natural Language Processing' },
    { value: 'reinforcement_learning', label: 'Reinforcement Learning' },
    { value: 'data_science', label: 'Data Science' },
    { value: 'generative_ai', label: 'Generative AI' },
    { value: 'mlops', label: 'MLOps' },
    { value: 'other', label: 'Other' },
  ];
  
  // Skills options
  const skillsOptions: SelectOption[] = [
    { value: 'python', label: 'Python' },
    { value: 'tensorflow', label: 'TensorFlow' },
    { value: 'pytorch', label: 'PyTorch' },
    { value: 'scikit_learn', label: 'Scikit-Learn' },
    { value: 'keras', label: 'Keras' },
    { value: 'pandas', label: 'Pandas' },
    { value: 'numpy', label: 'NumPy' },
    { value: 'opencv', label: 'OpenCV' },
    { value: 'nlp', label: 'NLP' },
    { value: 'transformers', label: 'Transformers' },
    { value: 'llm', label: 'Large Language Models' },
    { value: 'gans', label: 'GANs' },
    { value: 'vision_transformers', label: 'Vision Transformers' },
    { value: 'recommendation_systems', label: 'Recommendation Systems' },
    { value: 'reinforcement_learning', label: 'Reinforcement Learning' },
    { value: 'deep_learning', label: 'Deep Learning' },
    { value: 'machine_learning', label: 'Machine Learning' },
    { value: 'data_analysis', label: 'Data Analysis' },
    { value: 'data_visualization', label: 'Data Visualization' },
    { value: 'mlops', label: 'MLOps' },
    { value: 'cloud_ml', label: 'Cloud ML Services' },
    { value: 'docker', label: 'Docker' },
    { value: 'kubernetes', label: 'Kubernetes' },
  ];
  
  /**
   * Handles form submission
   */
  const onSubmit = async (data: JobFormValues) => {
    try {
      // Prepare data - convert string values to appropriate types
      const formattedData = {
        ...data,
        // Convert string numbers to actual numbers
        budget: Number(data.budget),
        minBudget: Number(data.minBudget),
        maxBudget: Number(data.maxBudget),
        hourlyRate: Number(data.hourlyRate),
        estimatedDuration: Number(data.estimatedDuration),
        estimatedHours: Number(data.estimatedHours),
      };
      
      // If editing, update the job, otherwise create a new job
      if (effectiveJobId) {
        await updateExistingJob(effectiveJobId, formattedData);
        toast.success('Job updated successfully');
      } else {
        await createNewJob(formattedData);
        toast.success('Job created successfully');
      }
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      } else {
        // Otherwise navigate to job listings
        navigate('/jobs');
      }
    } catch (error) {
      toast.error(`Failed to ${effectiveJobId ? 'update' : 'create'} job: ${error.message}`);
    }
  };
  
  /**
   * Handles cancelling the form
   */
  const handleCancel = () => {
    navigate(-1); // Go back to previous page
  };
  
  return (
    <FormProvider {...formMethods}>
      <form 
        onSubmit={handleSubmit(onSubmit)} 
        className="space-y-8"
        noValidate
      >
        {/* Job Details Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Job Details</h2>
          
          <div className="space-y-4">
            {/* Job Title */}
            <Controller
              name="title"
              control={control}
              rules={{ 
                required: 'Job title is required',
                minLength: { value: 5, message: 'Title must be at least 5 characters' },
                maxLength: { value: 100, message: 'Title cannot exceed 100 characters' }
              }}
              render={({ field }) => (
                <Input
                  {...field}
                  label="Job Title"
                  placeholder="Enter a descriptive title for your job"
                  error={errors.title?.message}
                  required
                />
              )}
            />
            
            {/* Category */}
            <Controller
              name="category"
              control={control}
              rules={{ required: 'Category is required' }}
              render={({ field }) => (
                <Select
                  {...field}
                  label="Category"
                  placeholder="Select a category"
                  options={categoryOptions}
                  error={errors.category?.message}
                  required
                />
              )}
            />
            
            {/* Subcategory - shown only if category is selected */}
            {watch('category') && (
              <Controller
                name="subcategory"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    label="Subcategory (Optional)"
                    placeholder="Enter a subcategory if applicable"
                    error={errors.subcategory?.message}
                  />
                )}
              />
            )}
            
            {/* Job Description */}
            <Controller
              name="description"
              control={control}
              rules={{ 
                required: 'Job description is required',
                minLength: { value: 50, message: 'Description must be at least 50 characters' },
                maxLength: { value: 5000, message: 'Description cannot exceed 5000 characters' }
              }}
              render={({ field }) => (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Job Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...field}
                    rows={6}
                    className={`block w-full rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
                      errors.description ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Describe the job requirements, deliverables, and other details"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                  )}
                </div>
              )}
            />
          </div>
        </div>
        
        {/* Skills Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Skills & Expertise</h2>
          
          <div className="space-y-4">
            {/* Required Skills */}
            <Controller
              name="requiredSkills"
              control={control}
              rules={{ required: 'At least one required skill is needed' }}
              render={({ field }) => (
                <Select
                  {...field}
                  label="Required Skills"
                  placeholder="Select required skills"
                  options={skillsOptions}
                  error={errors.requiredSkills?.message}
                  required
                  multiple
                  searchable
                />
              )}
            />
            
            {/* Preferred Skills */}
            <Controller
              name="preferredSkills"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  label="Preferred Skills (Optional)"
                  placeholder="Select preferred skills"
                  options={skillsOptions}
                  error={errors.preferredSkills?.message}
                  multiple
                  searchable
                />
              )}
            />
            
            {/* Job Difficulty */}
            <Controller
              name="difficulty"
              control={control}
              rules={{ required: 'Difficulty level is required' }}
              render={({ field }) => (
                <Select
                  {...field}
                  label="Expertise Level Required"
                  placeholder="Select required expertise level"
                  options={difficultyOptions}
                  error={errors.difficulty?.message}
                  required
                />
              )}
            />
          </div>
        </div>
        
        {/* Budget Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Budget & Payment</h2>
          
          <div className="space-y-4">
            {/* Job Type Selection */}
            <Controller
              name="type"
              control={control}
              rules={{ required: 'Job type is required' }}
              render={({ field }) => (
                <Select
                  {...field}
                  label="Job Type"
                  placeholder="Select job type"
                  options={jobTypeOptions}
                  error={errors.type?.message}
                  required
                  onChange={(value) => {
                    field.onChange(value);
                    setSelectedJobType(value as JobType);
                  }}
                />
              )}
            />
            
            {/* Budget Fields - shown based on job type */}
            {selectedJobType === JobType.FIXED_PRICE && (
              <Controller
                name="budget"
                control={control}
                rules={{ 
                  required: 'Budget is required',
                  validate: {
                    positive: (value) => Number(value) > 0 || 'Budget must be greater than zero'
                  }
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    type={InputType.NUMBER}
                    label="Fixed Budget"
                    placeholder="Enter budget amount"
                    prefix={<FiDollarSign />}
                    error={errors.budget?.message}
                    required
                    min={1}
                  />
                )}
              />
            )}
            
            {selectedJobType === JobType.HOURLY && (
              <Controller
                name="hourlyRate"
                control={control}
                rules={{ 
                  required: 'Hourly rate is required',
                  validate: {
                    positive: (value) => Number(value) > 0 || 'Hourly rate must be greater than zero'
                  }
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    type={InputType.NUMBER}
                    label="Hourly Rate"
                    placeholder="Enter hourly rate"
                    prefix={<FiDollarSign />}
                    error={errors.hourlyRate?.message}
                    required
                    min={1}
                  />
                )}
              />
            )}
            
            {selectedJobType === JobType.MILESTONE_BASED && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Controller
                    name="minBudget"
                    control={control}
                    rules={{ 
                      required: 'Minimum budget is required',
                      validate: {
                        positive: (value) => Number(value) > 0 || 'Minimum budget must be greater than zero'
                      }
                    }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type={InputType.NUMBER}
                        label="Minimum Budget"
                        placeholder="Enter minimum budget"
                        prefix={<FiDollarSign />}
                        error={errors.minBudget?.message}
                        required
                        min={1}
                      />
                    )}
                  />
                  
                  <Controller
                    name="maxBudget"
                    control={control}
                    rules={{ 
                      required: 'Maximum budget is required',
                      validate: {
                        positive: (value) => Number(value) > 0 || 'Maximum budget must be greater than zero',
                        greaterThanMin: (value) => {
                          const minBudget = watch('minBudget');
                          return Number(value) >= Number(minBudget) || 'Maximum budget must be greater than or equal to minimum budget';
                        }
                      }
                    }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type={InputType.NUMBER}
                        label="Maximum Budget"
                        placeholder="Enter maximum budget"
                        prefix={<FiDollarSign />}
                        error={errors.maxBudget?.message}
                        required
                        min={1}
                      />
                    )}
                  />
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Timeline Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Timeline & Location</h2>
          
          <div className="space-y-4">
            {/* Duration */}
            <Controller
              name="estimatedDuration"
              control={control}
              rules={{ 
                required: 'Estimated duration is required',
                validate: {
                  positive: (value) => Number(value) > 0 || 'Duration must be greater than zero'
                }
              }}
              render={({ field }) => (
                <Input
                  {...field}
                  type={InputType.NUMBER}
                  label="Estimated Duration (days)"
                  placeholder="Enter estimated duration in days"
                  prefix={<FiClock />}
                  error={errors.estimatedDuration?.message}
                  required
                  min={1}
                />
              )}
            />
            
            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller
                name="startDate"
                control={control}
                rules={{ 
                  required: 'Start date is required',
                  validate: {
                    future: (value) => {
                      const date = new Date(value);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return date >= today || 'Start date must be today or in the future';
                    }
                  }
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    type={InputType.DATE}
                    label="Start Date"
                    placeholder="Select start date"
                    prefix={<FiCalendar />}
                    error={errors.startDate?.message}
                    required
                    value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
                  />
                )}
              />
              
              <Controller
                name="endDate"
                control={control}
                rules={{ 
                  required: 'End date is required',
                  validate: {
                    afterStart: (value) => {
                      const startDate = watch('startDate');
                      const start = new Date(startDate);
                      const end = new Date(value);
                      return end > start || 'End date must be after start date';
                    }
                  }
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    type={InputType.DATE}
                    label="End Date"
                    placeholder="Select end date"
                    prefix={<FiCalendar />}
                    error={errors.endDate?.message}
                    required
                    value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
                  />
                )}
              />
            </div>
            
            {/* Hours Per Week - only for hourly projects */}
            {selectedJobType === JobType.HOURLY && (
              <Controller
                name="estimatedHours"
                control={control}
                rules={{ 
                  required: 'Estimated hours is required',
                  validate: {
                    positive: (value) => Number(value) > 0 || 'Hours must be greater than zero'
                  }
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    type={InputType.NUMBER}
                    label="Estimated Hours (total)"
                    placeholder="Enter estimated total hours"
                    prefix={<FiClock />}
                    error={errors.estimatedHours?.message}
                    required
                    min={1}
                  />
                )}
              />
            )}
            
            {/* Location and Remote Option */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Controller
                  name="isRemote"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => onChange(e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-700">
                        This is a remote job
                      </label>
                    </div>
                  )}
                />
              </div>
              
              {!watch('isRemote') && (
                <Controller
                  name="location"
                  control={control}
                  rules={{ 
                    required: !watch('isRemote') ? 'Location is required for non-remote jobs' : false
                  }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Location"
                      placeholder="Enter job location"
                      error={errors.location?.message}
                      required={!watch('isRemote')}
                    />
                  )}
                />
              )}
            </div>
          </div>
        </div>
        
        {/* Attachments Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Attachments</h2>
          
          <Controller
            name="attachments"
            control={control}
            render={({ field: { value, onChange } }) => (
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Attachments (Optional)
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <FiList className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                      >
                        <span>Upload files</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          multiple
                          onChange={(e) => {
                            if (e.target.files) {
                              const filesArray = Array.from(e.target.files);
                              onChange([...value, ...filesArray]);
                            }
                          }}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PDF, DOC, DOCX, XLS, XLSX, JPG, PNG up to 10MB
                    </p>
                    
                    {/* Display selected files */}
                    {value && value.length > 0 && (
                      <div className="mt-2">
                        <h4 className="text-sm font-medium text-gray-700">Selected files:</h4>
                        <ul className="mt-1 text-sm text-gray-500">
                          {Array.from(value).map((file: File, index) => (
                            <li key={index} className="flex justify-between items-center">
                              <span>{file.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const newFiles = [...value];
                                  newFiles.splice(index, 1);
                                  onChange(newFiles);
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          />
        </div>
        
        {/* Form Actions */}
        <div className="flex justify-between">
          <Button
            variant={ButtonVariant.OUTLINE}
            onClick={handleCancel}
            type="button"
          >
            Cancel
          </Button>
          
          <Button
            variant={ButtonVariant.PRIMARY}
            type="submit"
            isLoading={isSubmitting || isLoading}
            disabled={isSubmitting || isLoading}
          >
            {effectiveJobId ? 'Update Job' : 'Post Job'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};

export default JobForm;