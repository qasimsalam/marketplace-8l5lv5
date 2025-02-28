"use client";

import React, { useState, useEffect } from 'react'; // v18.2.0
import { useRouter } from 'next/navigation'; // v13.0.0
import { FolderPlusIcon, PlusCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline'; // v2.0.18
import clsx from 'clsx'; // v1.2.1

import Card, { CardVariant } from '../../../components/common/Card';
import Button, { ButtonVariant, ButtonSize } from '../../../components/common/Button';
import Spinner, { SpinnerSize } from '../../../components/common/Spinner';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';

import useWorkspace from '../../../hooks/useWorkspace';
import { Workspace, WorkspaceFormValues, WorkspaceStatus } from '../../../types/workspace';
import useAuth from '../../../hooks/useAuth';
import useToast from '../../../hooks/useToast';

/**
 * Workspace list page component that displays all workspaces a user has access to
 * and provides functionality to create new workspaces and navigate to workspace details.
 */
export default function WorkspacePage(): JSX.Element {
  // Initialize router for navigation
  const router = useRouter();
  
  // Get workspace-related data and functions
  const { 
    workspaces, 
    fetchWorkspaces, 
    createWorkspace, 
    isLoading, 
    error 
  } = useWorkspace();
  
  // Get current user data
  const { user } = useAuth();
  
  // Get toast notification functionality
  const { showSuccessToast, showErrorToast } = useToast();
  
  // State for modal visibility
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  
  // State for form values
  const [formValues, setFormValues] = useState<WorkspaceFormValues>({
    name: '',
    description: '',
    contractId: '',
    jobId: '',
    members: []
  });

  // Fetch workspaces when component mounts
  useEffect(() => {
    fetchWorkspaces()
      .catch(error => {
        console.error('Failed to fetch workspaces:', error);
        showErrorToast('Failed to load your workspaces. Please try again.');
      });
  }, [fetchWorkspaces, showErrorToast]);

  /**
   * Opens the workspace creation modal
   */
  const handleOpenModal = () => {
    setIsModalOpen(true);
    setFormValues({
      name: '',
      description: '',
      contractId: '',
      jobId: '',
      members: []
    });
  };

  /**
   * Closes the workspace creation modal
   */
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormValues({
      name: '',
      description: '',
      contractId: '',
      jobId: '',
      members: []
    });
  };

  /**
   * Handles form input changes
   */
  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * Handles workspace creation form submission
   */
  const handleCreateWorkspace = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validate inputs
    if (!formValues.name.trim()) {
      showErrorToast('Workspace name is required');
      return;
    }

    if (!formValues.description.trim()) {
      showErrorToast('Workspace description is required');
      return;
    }

    try {
      // Create workspace with current user as owner
      const workspaceData: WorkspaceFormValues = {
        ...formValues,
        members: user ? [{ userId: user.id, role: 'owner' }] : []
      };

      const newWorkspace = await createWorkspace(workspaceData);
      showSuccessToast('Workspace created successfully');
      
      // Navigate to the newly created workspace
      router.push(`/workspace/${newWorkspace.id}`);
      
      // Close the modal
      handleCloseModal();
    } catch (error) {
      console.error('Failed to create workspace:', error);
      showErrorToast('Failed to create workspace. Please try again.');
    }
  };

  /**
   * Handles clicking on a workspace card
   */
  const handleWorkspaceClick = (workspaceId: string) => {
    router.push(`/workspace/${workspaceId}`);
  };

  /**
   * Renders workspace cards in a grid layout
   */
  const renderWorkspaceCards = (workspaces: Workspace[]) => {
    // Filter out deleted or archived workspaces
    const activeWorkspaces = workspaces.filter(
      workspace => workspace.status === WorkspaceStatus.ACTIVE
    );

    if (activeWorkspaces.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <DocumentTextIcon className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No workspaces yet</h3>
          <p className="text-gray-500 max-w-md mb-6">
            Create your first workspace to start collaborating on AI projects with integrated tools.
          </p>
          <Button
            variant={ButtonVariant.PRIMARY}
            onClick={handleOpenModal}
            className="flex items-center"
          >
            <PlusCircleIcon className="h-5 w-5 mr-2" />
            Create Workspace
          </Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeWorkspaces.map(workspace => (
          <Card
            key={workspace.id}
            variant={CardVariant.DEFAULT}
            bordered
            className="cursor-pointer transition-all hover:shadow-md"
            onClick={() => handleWorkspaceClick(workspace.id)}
          >
            <div className="p-2">
              <h3 className="text-lg font-medium text-gray-900 mb-2 truncate">
                {workspace.name}
              </h3>
              <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                {workspace.description}
              </p>
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>
                  Created: {new Date(workspace.createdAt).toLocaleDateString()}
                </span>
                <span>
                  {workspace.members.length} member{workspace.members.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Workspaces</h1>
        <Button
          variant={ButtonVariant.PRIMARY}
          size={ButtonSize.MEDIUM}
          onClick={handleOpenModal}
          className="flex items-center"
        >
          <FolderPlusIcon className="h-5 w-5 mr-2" />
          Create Workspace
        </Button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner size={SpinnerSize.LARGE} />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            <p>Error loading workspaces. Please try again.</p>
          </div>
        ) : (
          renderWorkspaceCards(workspaces)
        )}
      </div>

      {/* Create Workspace Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Create New Workspace"
        footer={
          <>
            <Button 
              variant={ButtonVariant.OUTLINE} 
              onClick={handleCloseModal}
            >
              Cancel
            </Button>
            <Button 
              variant={ButtonVariant.PRIMARY} 
              onClick={handleCreateWorkspace}
            >
              Create Workspace
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          <div>
            <Input
              type="text"
              name="name"
              label="Workspace Name"
              placeholder="Enter workspace name"
              value={formValues.name}
              onChange={handleFormChange}
              required
            />
          </div>
          <div>
            <label 
              htmlFor="description" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className={clsx(
                "w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500",
                "focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
              )}
              placeholder="Describe the purpose of this workspace"
              value={formValues.description}
              onChange={handleFormChange}
              required
            />
          </div>
          <div>
            <Input
              type="text"
              name="jobId"
              label="Related Job ID (Optional)"
              placeholder="Enter related job ID"
              value={formValues.jobId}
              onChange={handleFormChange}
            />
          </div>
          <div>
            <Input
              type="text"
              name="contractId"
              label="Contract ID (Optional)"
              placeholder="Enter contract ID"
              value={formValues.contractId}
              onChange={handleFormChange}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}