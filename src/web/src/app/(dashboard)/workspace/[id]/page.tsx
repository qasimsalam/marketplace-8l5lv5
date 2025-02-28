import React, { useEffect, useState } from 'react'; // ^18.2.0
import { notFound, useParams } from 'next/navigation'; // ^13.0.0

// Internal imports
import CollaborationTools from '../../../components/workspace/CollaborationTools';
import { useWorkspace } from '../../../hooks/useWorkspace';
import { useAuth } from '../../../hooks/useAuth';
import Spinner, { SpinnerSize } from '../../../components/common/Spinner';
import { Metadata } from 'next';
import { Workspace, WorkspacePermissions } from '../../../types/workspace';

/**
 * Server function to generate metadata for the page based on workspace data
 */
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  // Extract workspace ID from params
  const workspaceId = params.id;

  // Fetch workspace data from API (replace with your actual API call)
  // const workspace = await fetchWorkspaceData(workspaceId);

  // Generate appropriate title and description for the page
  const title = `Workspace: ${workspaceId}`; // Replace with workspace name if available
  const description = `Collaboration workspace for project ${workspaceId}`; // Replace with workspace description if available

  // Return metadata object with title, description, and other SEO properties
  return {
    title: title,
    description: description,
    // Add other metadata properties as needed (e.g., openGraph, twitter)
  };
}

/**
 * Main page component for the workspace detail view that displays a specific workspace with all its collaboration tools
 */
const WorkspacePage: React.FC = () => {
  // Get workspace ID from route parameters using useParams hook
  const { id: workspaceId } = useParams<{ id: string }>();

  // Initialize workspace data using useWorkspace hook
  const { fetchWorkspace, currentWorkspace, isLoading, error } = useWorkspace();

  // Initialize auth context using useAuth hook
  const { user, hasPermission } = useAuth();

  // Set up local state for initial tool selection
  const [initialTool, setInitialTool] = useState<string>('notebook');

  // Implement useEffect to fetch workspace data when component mounts or ID changes
  useEffect(() => {
    if (workspaceId) {
      fetchWorkspace(workspaceId);
    }
  }, [workspaceId, fetchWorkspace]);

  // Implement rendering logic for loading state with spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size={SpinnerSize.LARGE} />
      </div>
    );
  }

  // Implement rendering logic for error state with appropriate message
  if (error) {
    return (
      <div className="text-red-500">
        Error: {error}
      </div>
    );
  }

  // Implement rendering logic for unauthorized state if user lacks permissions
  if (currentWorkspace && user && !hasPermission(WorkspacePermissions.VIEW)) {
    return (
      <div className="text-red-500">
        You do not have permission to view this workspace.
      </div>
    );
  }

  // Implement rendering logic for 'not found' state using notFound() for invalid workspace IDs
  if (!currentWorkspace) {
    return notFound();
  }

  // Render workspace header with name, description, and status
  // Render CollaborationTools component as main content area
  return (
    <div className="flex flex-col h-full">
      <header className="bg-gray-100 p-4 border-b border-gray-300">
        <h1 className="text-2xl font-semibold">{currentWorkspace.name}</h1>
        <p className="text-gray-600">{currentWorkspace.description}</p>
        <p className="text-sm text-gray-500">Status: {currentWorkspace.status}</p>
      </header>

      <CollaborationTools initialTool={initialTool} className="flex-1" />
    </div>
  );
};

export default WorkspacePage;