import React, { useState, useEffect } from 'react'; // ^18.2.0
import clsx from 'clsx'; // ^1.2.1
import { useForm } from 'react-hook-form'; // ^7.43.9
import { FaGithub, FaKaggle, FaExternalLinkAlt, FaEdit, FaTrash, FaPlus } from 'react-icons/fa'; // ^4.8.0
import Image from 'next/image'; // ^13.4.0

import { Card, CardProps } from '../common/Card';
import Button, { ButtonVariant, ButtonSize } from '../common/Button';
import Modal, { ModalSize } from '../common/Modal';
import { Spinner } from '../common/Spinner';
import Badge, { BadgeVariant, BadgeSize } from '../common/Badge';
import { FreelancerProfile, PortfolioItem, PortfolioItemFormValues } from '../../types/profile';
import { useProfile } from '../../hooks/useProfile';
import { useAuth } from '../../hooks/useAuth';
import { truncateText } from '../../utils/format';
import { formatDate } from '../../utils/date';

/**
 * Interface defining props for the PortfolioSection component
 */
export interface PortfolioSectionProps {
  /** Profile ID to fetch and display portfolio for */
  profileId?: string;
  /** Whether the portfolio is editable by the current user */
  editable?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Maximum number of items to display */
  maxItems?: number;
  /** Whether to show the section title */
  showTitle?: boolean;
}

/**
 * Interface defining props for the PortfolioItemCard component
 */
export interface PortfolioItemCardProps {
  /** Portfolio item data to display */
  item: PortfolioItem;
  /** Whether the item is editable by the current user */
  editable?: boolean;
  /** Callback for edit action */
  onEdit: (item: PortfolioItem) => void;
  /** Callback for delete action */
  onDelete: (id: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Interface defining props for the PortfolioItemForm component
 */
export interface PortfolioItemFormProps {
  /** Portfolio item data for editing (null for new items) */
  item: PortfolioItem | null;
  /** Form submission handler */
  onSubmit: (data: PortfolioItemFormValues) => Promise<void>;
  /** Cancel action handler */
  onCancel: () => void;
  /** Whether the form is in loading state */
  isLoading: boolean;
}

/**
 * A component that displays a freelancer's portfolio with the ability to view, add, edit, and delete items
 *
 * @param props - Component props
 * @returns The rendered portfolio section component
 */
export const PortfolioSection: React.FC<PortfolioSectionProps> = ({
  profileId,
  editable = false,
  className = '',
  maxItems,
  showTitle = true
}) => {
  // Get profile data and functions from useProfile hook
  const {
    freelancerProfile,
    viewedProfile,
    isLoading: profileLoading,
    getFreelancerProfile,
    addPortfolioItem,
    updatePortfolioItem,
    deletePortfolioItem
  } = useProfile();

  // Get current user from useAuth hook to determine edit permissions
  const { user } = useAuth();

  // State for modal management
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch profile data if profileId is provided
  useEffect(() => {
    if (profileId) {
      getFreelancerProfile(profileId).catch(error => {
        console.error('Failed to fetch profile:', error);
      });
    }
  }, [profileId, getFreelancerProfile]);

  // Determine which profile to use (viewed profile or current user's profile)
  const profile = profileId 
    ? (viewedProfile as FreelancerProfile) 
    : freelancerProfile;
  
  // Check if the profile exists and has the portfolio property
  const portfolioItems = profile && 'portfolio' in profile
    ? profile.portfolio || []
    : [];

  // Apply maxItems limit if specified
  const displayedItems = maxItems 
    ? portfolioItems.slice(0, maxItems) 
    : portfolioItems;

  // Handler for adding a new portfolio item
  const handleAddItem = async (data: PortfolioItemFormValues) => {
    try {
      setIsSubmitting(true);
      await addPortfolioItem(data);
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Failed to add portfolio item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for updating an existing portfolio item
  const handleUpdateItem = async (data: PortfolioItemFormValues) => {
    if (!selectedItem) return;
    
    try {
      setIsSubmitting(true);
      await updatePortfolioItem(selectedItem.id, data);
      setIsEditModalOpen(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to update portfolio item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for deleting a portfolio item
  const handleDeleteItem = async () => {
    if (!selectedItem) return;
    
    try {
      setIsSubmitting(true);
      await deletePortfolioItem(selectedItem.id);
      setIsDeleteModalOpen(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to delete portfolio item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for opening the edit modal
  const handleEditClick = (item: PortfolioItem) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  // Handler for opening the delete modal
  const handleDeleteClick = (item: PortfolioItem) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  };

  // Determine if the current user can edit this portfolio section
  const canEdit = editable || (user && freelancerProfile && user.id === freelancerProfile.userId);

  // Render loading state
  if (profileLoading) {
    return (
      <div className={clsx('flex justify-center py-8', className)}>
        <Spinner />
      </div>
    );
  }

  return (
    <div className={clsx('portfolio-section', className)}>
      {/* Section header with title and add button */}
      {(showTitle || canEdit) && (
        <div className="flex justify-between items-center mb-6">
          {showTitle && (
            <h2 className="text-2xl font-semibold text-gray-800">Portfolio</h2>
          )}
          {canEdit && (
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2"
            >
              <FaPlus className="w-3.5 h-3.5" />
              <span>Add Project</span>
            </Button>
          )}
        </div>
      )}

      {/* Empty state */}
      {displayedItems.length === 0 && (
        <Card className="p-6 text-center text-gray-500">
          <p>No portfolio items to display.</p>
          {canEdit && (
            <Button
              variant={ButtonVariant.OUTLINE}
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4"
            >
              <span className="flex items-center gap-2">
                <FaPlus className="w-3.5 h-3.5" />
                <span>Add Your First Project</span>
              </span>
            </Button>
          )}
        </Card>
      )}

      {/* Portfolio items grid */}
      {displayedItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedItems.map(item => (
            <PortfolioItemCard
              key={item.id}
              item={item}
              editable={canEdit}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* Add portfolio item modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Portfolio Item"
        size={ModalSize.LARGE}
      >
        <PortfolioItemForm
          item={null}
          onSubmit={handleAddItem}
          onCancel={() => setIsAddModalOpen(false)}
          isLoading={isSubmitting}
        />
      </Modal>

      {/* Edit portfolio item modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Portfolio Item"
        size={ModalSize.LARGE}
      >
        <PortfolioItemForm
          item={selectedItem}
          onSubmit={handleUpdateItem}
          onCancel={() => setIsEditModalOpen(false)}
          isLoading={isSubmitting}
        />
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Portfolio Item"
        size={ModalSize.SMALL}
      >
        <div className="py-4">
          <p className="text-gray-700">
            Are you sure you want to delete{' '}
            <span className="font-medium">{selectedItem?.title}</span>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant={ButtonVariant.OUTLINE}
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant={ButtonVariant.DANGER}
              onClick={handleDeleteItem}
              isLoading={isSubmitting}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/**
 * Renders an individual portfolio item as a card
 *
 * @param props - Component props
 * @returns The rendered portfolio item card
 */
const PortfolioItemCard: React.FC<PortfolioItemCardProps> = ({
  item,
  editable = false,
  onEdit,
  onDelete,
  className = ''
}) => {
  // Extract portfolio item properties
  const {
    id,
    title,
    description,
    imageUrl,
    projectUrl,
    githubUrl,
    kaggleUrl,
    technologies,
    category,
    startDate,
    endDate
  } = item;

  // Format date range for display
  const dateRange = startDate && endDate
    ? `${formatDate(startDate)} - ${formatDate(endDate)}`
    : startDate
      ? `Started: ${formatDate(startDate)}`
      : endDate
        ? `Completed: ${formatDate(endDate)}`
        : '';

  return (
    <Card
      className={clsx('flex flex-col h-full overflow-hidden transition-all hover:shadow-md', className)}
    >
      {/* Card image */}
      <div className="relative w-full h-48">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400">No image</span>
          </div>
        )}
      </div>

      {/* Card content */}
      <div className="flex flex-col flex-grow p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          {editable && (
            <div className="flex gap-2">
              <Button
                variant={ButtonVariant.GHOST}
                size={ButtonSize.SMALL}
                onClick={() => onEdit(item)}
                ariaLabel={`Edit ${title}`}
                className="p-1"
              >
                <FaEdit className="w-4 h-4 text-gray-600" />
              </Button>
              <Button
                variant={ButtonVariant.GHOST}
                size={ButtonSize.SMALL}
                onClick={() => onDelete(id)}
                ariaLabel={`Delete ${title}`}
                className="p-1"
              >
                <FaTrash className="w-4 h-4 text-red-600" />
              </Button>
            </div>
          )}
        </div>

        {/* Category badge */}
        {category && (
          <div className="mb-2">
            <Badge variant={BadgeVariant.PRIMARY}>{category}</Badge>
          </div>
        )}

        {/* Description */}
        <p className="text-gray-600 mb-4 flex-grow">
          {truncateText(description, 120)}
        </p>

        {/* Date range */}
        {dateRange && (
          <div className="text-xs text-gray-500 mb-3">
            {dateRange}
          </div>
        )}

        {/* Technologies */}
        {technologies && technologies.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {technologies.map((tech, index) => (
                <Badge 
                  key={index} 
                  variant={BadgeVariant.SECONDARY} 
                  size={BadgeSize.SMALL}
                >
                  {tech}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* External links */}
        <div className="flex flex-wrap gap-3 mt-auto pt-3 border-t border-gray-100">
          {projectUrl && (
            <a
              href={projectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
              aria-label={`Visit project website for ${title}`}
            >
              <FaExternalLinkAlt className="w-3.5 h-3.5" />
              <span>Project</span>
            </a>
          )}
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-gray-900 flex items-center gap-1 text-sm"
              aria-label={`Visit GitHub repository for ${title}`}
            >
              <FaGithub className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          )}
          {kaggleUrl && (
            <a
              href={kaggleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 flex items-center gap-1 text-sm"
              aria-label={`Visit Kaggle notebook for ${title}`}
            >
              <FaKaggle className="w-3.5 h-3.5" />
              <span>Kaggle</span>
            </a>
          )}
        </div>
      </div>
    </Card>
  );
};

/**
 * Form component for adding or editing portfolio items
 *
 * @param props - Component props
 * @returns The rendered form component
 */
const PortfolioItemForm: React.FC<PortfolioItemFormProps> = ({
  item,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  // Set up form with react-hook-form
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<PortfolioItemFormValues>({
    defaultValues: item ? {
      title: item.title,
      description: item.description,
      projectUrl: item.projectUrl,
      githubUrl: item.githubUrl,
      kaggleUrl: item.kaggleUrl,
      technologies: item.technologies?.join(', ') || '',
      category: item.category,
      aiModels: item.aiModels?.join(', ') || '',
      problemSolved: item.problemSolved,
      startDate: item.startDate,
      endDate: item.endDate
    } : {
      title: '',
      description: '',
      projectUrl: '',
      githubUrl: '',
      kaggleUrl: '',
      technologies: '',
      category: '',
      aiModels: '',
      problemSolved: '',
      startDate: '',
      endDate: ''
    }
  });

  // State for image upload preview
  const [imagePreview, setImagePreview] = useState<string | null>(
    item?.imageUrl || null
  );

  // Handler for image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create a preview URL for the selected image
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handler for form submission
  const handleFormSubmit = (data: PortfolioItemFormValues) => {
    // Process arrays from comma-separated strings
    const formattedData = {
      ...data,
      technologies: data.technologies ? data.technologies.split(',').map(t => t.trim()) : [],
      aiModels: data.aiModels ? data.aiModels.split(',').map(m => m.trim()) : []
    };
    
    onSubmit(formattedData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Image upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project Image
        </label>
        <div className="flex items-center space-x-6">
          <div className="w-32 h-32 border border-gray-300 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Portfolio item preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-400 text-sm">No image</span>
            )}
          </div>
          <div>
            <label className="block">
              <span className="sr-only">Choose project image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </label>
            <p className="mt-1 text-xs text-gray-500">
              Recommended size: 1200x800px, max 5MB
            </p>
          </div>
        </div>
      </div>

      {/* Title field */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Project Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          className={clsx(
            "mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm",
            errors.title && "border-red-500"
          )}
          {...register("title", { required: "Title is required" })}
        />
        {errors.title && (
          <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
        )}
      </div>

      {/* Category field */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          Category
        </label>
        <select
          id="category"
          className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          {...register("category")}
        >
          <option value="">Select a category</option>
          <option value="Machine Learning">Machine Learning</option>
          <option value="Deep Learning">Deep Learning</option>
          <option value="Computer Vision">Computer Vision</option>
          <option value="Natural Language Processing">Natural Language Processing</option>
          <option value="Reinforcement Learning">Reinforcement Learning</option>
          <option value="Data Analysis">Data Analysis</option>
          <option value="AI Ethics">AI Ethics</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Description field */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          rows={4}
          className={clsx(
            "mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm",
            errors.description && "border-red-500"
          )}
          {...register("description", { required: "Description is required" })}
        ></textarea>
        {errors.description && (
          <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
        )}
      </div>

      {/* Problem solved field */}
      <div>
        <label htmlFor="problemSolved" className="block text-sm font-medium text-gray-700">
          Problem Solved
        </label>
        <textarea
          id="problemSolved"
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
          {...register("problemSolved")}
          placeholder="Describe the problem this project solved..."
        ></textarea>
      </div>

      {/* Links section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Project URL field */}
        <div>
          <label htmlFor="projectUrl" className="block text-sm font-medium text-gray-700">
            Project URL
          </label>
          <input
            id="projectUrl"
            type="url"
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            {...register("projectUrl", {
              pattern: {
                value: /^(http|https):\/\/[^ "]+$/,
                message: "Invalid URL format"
              }
            })}
            placeholder="https://example.com"
          />
          {errors.projectUrl && (
            <p className="mt-1 text-xs text-red-500">{errors.projectUrl.message}</p>
          )}
        </div>

        {/* GitHub URL field */}
        <div>
          <label htmlFor="githubUrl" className="block text-sm font-medium text-gray-700">
            GitHub URL
          </label>
          <input
            id="githubUrl"
            type="url"
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            {...register("githubUrl", {
              pattern: {
                value: /^(http|https):\/\/(www\.)?github\.com\/[^ "]+$/,
                message: "Invalid GitHub URL format"
              }
            })}
            placeholder="https://github.com/username/repo"
          />
          {errors.githubUrl && (
            <p className="mt-1 text-xs text-red-500">{errors.githubUrl.message}</p>
          )}
        </div>

        {/* Kaggle URL field */}
        <div>
          <label htmlFor="kaggleUrl" className="block text-sm font-medium text-gray-700">
            Kaggle URL
          </label>
          <input
            id="kaggleUrl"
            type="url"
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            {...register("kaggleUrl", {
              pattern: {
                value: /^(http|https):\/\/(www\.)?kaggle\.com\/[^ "]+$/,
                message: "Invalid Kaggle URL format"
              }
            })}
            placeholder="https://kaggle.com/username/notebook"
          />
          {errors.kaggleUrl && (
            <p className="mt-1 text-xs text-red-500">{errors.kaggleUrl.message}</p>
          )}
        </div>
      </div>

      {/* Technologies and AI Models section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Technologies field */}
        <div>
          <label htmlFor="technologies" className="block text-sm font-medium text-gray-700">
            Technologies Used
          </label>
          <input
            id="technologies"
            type="text"
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            {...register("technologies")}
            placeholder="Python, TensorFlow, Pandas, etc. (comma separated)"
          />
        </div>

        {/* AI Models field */}
        <div>
          <label htmlFor="aiModels" className="block text-sm font-medium text-gray-700">
            AI Models Used
          </label>
          <input
            id="aiModels"
            type="text"
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            {...register("aiModels")}
            placeholder="BERT, ResNet, GPT-3, etc. (comma separated)"
          />
        </div>
      </div>

      {/* Date range section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start date field */}
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
            Start Date
          </label>
          <input
            id="startDate"
            type="date"
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            {...register("startDate")}
          />
        </div>

        {/* End date field */}
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
            End Date
          </label>
          <input
            id="endDate"
            type="date"
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            {...register("endDate")}
          />
        </div>
      </div>

      {/* Form actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button
          variant={ButtonVariant.OUTLINE}
          onClick={onCancel}
          type="button"
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          variant={ButtonVariant.PRIMARY}
          type="submit"
          isLoading={isLoading}
        >
          {item ? 'Save Changes' : 'Add Project'}
        </Button>
      </div>
    </form>
  );
};