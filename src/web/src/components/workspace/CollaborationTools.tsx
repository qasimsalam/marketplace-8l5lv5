import React, { useState, useEffect, useCallback } from 'react'; // ^18.2.0
import clsx from 'clsx'; // ^1.2.1
import { useParams } from 'react-router-dom'; // ^6.8.1
import { TabsIcon, CodeIcon, FolderIcon, ChatIcon } from '@heroicons/react'; // ^2.0.18

// Internal imports
import JupyterNotebook from './JupyterNotebook';
import FileExplorer from './FileExplorer';
import ChatWindow from '../messages/ChatWindow';
import Button, { ButtonVariant } from '../common/Button';
import Spinner, { SpinnerSize } from '../common/Spinner';
import Modal, { ModalSize } from '../common/Modal';
import useWorkspace from '../../hooks/useWorkspace';
import { useWorkspaceWebSocket } from '../../hooks/useWebSocket';
import { Workspace, WorkspacePermissions, WorkspaceFile } from '../../types/workspace';

/**
 * Enum for different collaboration tool types
 */
export enum ToolType {
  NOTEBOOK = 'notebook',
  FILES = 'files',
  CHAT = 'chat',
}

/**
 * Props interface for the CollaborationTools component
 */
export interface CollaborationToolsProps {
  /**
   * Optional CSS class name for styling the component
   */
  className?: string;
  /**
   * Initial tool to display on component mount
   */
  initialTool?: ToolType;
}

/**
 * Main component that integrates various collaboration tools into a cohesive interface
 */
const CollaborationTools: React.FC<CollaborationToolsProps> = ({ className, initialTool = ToolType.NOTEBOOK }) => {
  // Destructure props to access className and other properties
  // Get workspaceId from URL parameters using useParams hook
  const { workspaceId } = useParams<{ workspaceId: string }>();

  // Initialize workspace state using useWorkspace hook
  const { currentWorkspace, fetchWorkspace, hasWorkspacePermission } = useWorkspace();

  // Initialize WebSocket connection using useWorkspaceWebSocket hook
  const { isConnected, joinWorkspace, leaveWorkspace } = useWorkspaceWebSocket();

  // Set up state for active tool tab selection
  const [activeTool, setActiveTool] = useState<ToolType>(initialTool);

  // Set up state for milestone progress tracking
  const [milestoneProgress, setMilestoneProgress] = useState(75); // Example value

  // Set up state for loading
  const [loading, setLoading] = useState(true);

  // Implement useEffect to fetch workspace data on component mount
  useEffect(() => {
    const loadWorkspace = async () => {
      if (workspaceId) {
        try {
          setLoading(true);
          await fetchWorkspace(workspaceId);
        } finally {
          setLoading(false);
        }
      }
    };

    loadWorkspace();
  }, [workspaceId, fetchWorkspace]);

  // Implement useEffect to establish WebSocket connection for real-time collaboration
  useEffect(() => {
    if (workspaceId && !loading) {
      joinWorkspace(workspaceId).catch((err) => {
        console.error('Failed to join workspace session:', err);
      });

      return () => {
        leaveWorkspace(workspaceId).catch((err) => {
          console.error('Failed to leave workspace session:', err);
        });
      };
    }
  }, [workspaceId, loading, joinWorkspace, leaveWorkspace]);

  /**
   * Function to change the currently active collaboration tool
   * @param toolType
   */
  const handleToolChange = (toolType: string) => {
    // Update the active tool state
    setActiveTool(toolType as ToolType);

    // Track tool change analytics event if needed
  };

  /**
   * Function to handle milestone submission for review
   */
  const handleMilestoneSubmit = async () => {
    // Set loading state to true
    // Call the appropriate API to submit milestone for review
    // Update local milestone state
    // Handle success case with notification
    // Handle error case with appropriate message
    // Set loading state back to false
    console.log('Milestone submitted for review');
  };

  /**
   * Function to handle file selection from the FileExplorer
   * @param file
   */
  const handleFileSelect = (file: WorkspaceFile) => {
    // Check file type to determine appropriate action
    // Open notebook files in Jupyter notebook tool
    // Open other file types in appropriate viewers or editors
    // Update active tool state if needed
    if (file.fileType === 'application/vnd.jupyter.notebook') {
      setActiveTool(ToolType.NOTEBOOK);
    }
  };

  /**
   * Function to render the appropriate tool based on active selection
   */
  const renderToolContent = () => {
    switch (activeTool) {
      case ToolType.NOTEBOOK:
        return <JupyterNotebook className="flex-1" />;
      case ToolType.FILES:
        return <FileExplorer className="flex-1" onFileSelect={handleFileSelect} />;
      case ToolType.CHAT:
        return (
          currentWorkspace?.contractId ? (
            <ChatWindow
              conversationId={currentWorkspace.contractId}
              title="Project Chat"
              participant={{
                id: 'client',
                name: 'Client',
                avatar: '/path/to/client/avatar.jpg',
              }}
              onClose={() => console.log('Chat window closed')}
              className="flex-1"
            />
          ) : (
            <div>No contract associated with this workspace.</div>
          )
        );
      default:
        return <div>Select a collaboration tool</div>;
    }
  };

  /**
   * Function to display milestone progress and actions
   */
  const renderMilestoneProgress = () => {
    return (
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Milestone Progress:</span>
          <span className="text-sm text-gray-500">{milestoneProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
          <div
            className="bg-green-500 h-2.5 rounded-full"
            style={{ width: `${milestoneProgress}%` }}
          ></div>
        </div>
        <Button variant={ButtonVariant.PRIMARY} onClick={handleMilestoneSubmit}>
          Submit for Review
        </Button>
      </div>
    );
  };

  // Render the main component container with appropriate styling
  return (
    <div className={clsx('flex flex-col h-full', className)}>
      {/* Render tab navigation with icons for switching between tools */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          <a
            href="#"
            className={clsx(
              'py-4 px-1 border-b-2 font-medium text-sm',
              activeTool === ToolType.NOTEBOOK
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap',
              'flex items-center space-x-2'
            )}
            onClick={() => handleToolChange(ToolType.NOTEBOOK)}
          >
            <CodeIcon className="h-5 w-5" aria-hidden="true" />
            <span>Jupyter Notebook</span>
          </a>
          <a
            href="#"
            className={clsx(
              'py-4 px-1 border-b-2 font-medium text-sm',
              activeTool === ToolType.FILES
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap',
              'flex items-center space-x-2'
            )}
            onClick={() => handleToolChange(ToolType.FILES)}
          >
            <FolderIcon className="h-5 w-5" aria-hidden="true" />
            <span>Files</span>
          </a>
          <a
            href="#"
            className={clsx(
              'py-4 px-1 border-b-2 font-medium text-sm',
              activeTool === ToolType.CHAT
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'whitespace-nowrap',
              'flex items-center space-x-2'
            )}
            onClick={() => handleToolChange(ToolType.CHAT)}
          >
            <ChatIcon className="h-5 w-5" aria-hidden="true" />
            <span>Chat</span>
          </a>
        </nav>
      </div>

      {/* Render the active tool content (JupyterNotebook, FileExplorer, or ChatWindow) */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <Spinner size={SpinnerSize.LARGE} />
          </div>
        ) : (
          renderToolContent()
        )}
      </div>

      {/* Render milestone progress tracking section */}
      {hasWorkspacePermission(WorkspacePermissions.EDIT) && renderMilestoneProgress()}
    </div>
  );
};

export default CollaborationTools;