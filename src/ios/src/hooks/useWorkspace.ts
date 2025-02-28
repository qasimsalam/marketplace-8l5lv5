import { useState, useEffect, useCallback, useMemo } from 'react'; // ^18.2.0
import { useSelector, useDispatch } from 'react-redux'; // ^8.1.1
import { NetInfo } from '@react-native-community/netinfo'; // ^9.3.10
import { Platform, Alert } from 'react-native'; // 0.72.x
import DocumentPicker from 'react-native-document-picker'; // ^8.2.0
import RNFS from 'react-native-fs'; // ^2.20.0
import { createAsyncThunk } from '@reduxjs/toolkit'; // ^1.9.5

import { RootState } from '../store';
import { 
  Workspace, 
  Notebook, 
  WorkspaceFile, 
  Cell, 
  WorkspaceSocketEvent, 
  WorkspaceFormValues, 
  NotebookFormValues, 
  CellFormValues, 
  WorkspaceMember, 
  WorkspaceRole, 
  WorkspaceStatus,
  WorkspacePermissions
} from '../types/workspace.types';
import useAuth from './useAuth';
import api from '../lib/api';
import { messageSocketService, ConnectionState } from '../lib/websocket';

/**
 * Interface defining the return value of the useWorkspace hook
 */
export interface UseWorkspaceResult {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  notebooks: Notebook[];
  currentNotebook: Notebook | null;
  files: WorkspaceFile[];
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  uploadProgress: number;
  activeUsers: Record<string, {userId: string, lastActive: Date}>;
  
  fetchWorkspaces: () => Promise<Workspace[]>;
  fetchWorkspace: (id: string) => Promise<Workspace>;
  createWorkspace: (data: WorkspaceFormValues) => Promise<Workspace>;
  updateWorkspace: (id: string, data: Partial<WorkspaceFormValues>) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<boolean>;
  
  fetchNotebooks: (workspaceId: string) => Promise<Notebook[]>;
  fetchNotebook: (notebookId: string) => Promise<Notebook>;
  createNotebook: (data: NotebookFormValues) => Promise<Notebook>;
  updateNotebook: (id: string, data: Partial<NotebookFormValues>) => Promise<Notebook>;
  deleteNotebook: (id: string) => Promise<boolean>;
  
  executeCell: (notebookId: string, cellId: string, code: string) => Promise<any>;
  updateCell: (notebookId: string, cellId: string, data: Partial<CellFormValues>) => Promise<Cell>;
  
  pickAndUploadFile: (workspaceId: string) => Promise<WorkspaceFile>;
  downloadFile: (workspaceId: string, fileId: string) => Promise<string>;
  deleteFile: (workspaceId: string, fileId: string) => Promise<boolean>;
  
  addMember: (workspaceId: string, userId: string, role: WorkspaceRole) => Promise<WorkspaceMember>;
  removeMember: (workspaceId: string, userId: string) => Promise<boolean>;
  updateMemberRole: (workspaceId: string, userId: string, role: WorkspaceRole) => Promise<boolean>;
  
  joinWorkspace: (workspaceId: string) => Promise<boolean>;
  leaveWorkspace: () => Promise<void>;
  
  clearError: () => void;
  hasWorkspacePermission: (permission: string) => boolean;
}

/**
 * Custom hook that provides workspace management and collaboration functionality
 * for the AI Talent Marketplace iOS application
 * 
 * @returns Workspace state and methods
 */
const useWorkspace = (): UseWorkspaceResult => {
  // Extract workspace state from Redux store using useSelector
  const { 
    workspaces, 
    currentWorkspace, 
    notebooks, 
    currentNotebook, 
    files, 
    loading, 
    error,
    activeUsers
  } = useSelector((state: RootState) => state.workspace);
  
  // Get dispatch function for Redux actions
  const dispatch = useDispatch();
  
  // Get authentication information from useAuth hook
  const { user, hasPermission } = useAuth();
  
  // Initialize local state for file uploads and offline status
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  
  /**
   * Fetches all workspaces for the current user
   */
  const fetchWorkspaces = useCallback(async (): Promise<Workspace[]> => {
    try {
      // In a real implementation, we would dispatch a Redux action
      // that would handle the API call and state updates
      // For example: const resultAction = await dispatch(fetchWorkspacesThunk());
      
      // Direct API call as a fallback
      const workspaces = await api.workspace.getWorkspaces();
      
      // Update Redux state
      // dispatch({ type: 'workspace/setWorkspaces', payload: workspaces });
      
      return workspaces;
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      // dispatch({ type: 'workspace/setError', payload: error.message });
      throw error;
    }
  }, [dispatch]);
  
  /**
   * Fetches a specific workspace by ID
   */
  const fetchWorkspace = useCallback(async (id: string): Promise<Workspace> => {
    try {
      // In a real implementation, we would dispatch a Redux action
      // For example: const resultAction = await dispatch(fetchWorkspaceThunk(id));
      
      // Direct API call
      const workspace = await api.workspace.getWorkspace(id);
      
      // Update Redux state
      // dispatch({ type: 'workspace/setCurrentWorkspace', payload: workspace });
      
      return workspace;
    } catch (error) {
      console.error('Error fetching workspace:', error);
      // dispatch({ type: 'workspace/setError', payload: error.message });
      throw error;
    }
  }, [dispatch]);
  
  /**
   * Creates a new workspace
   */
  const createWorkspace = useCallback(async (data: WorkspaceFormValues): Promise<Workspace> => {
    try {
      // This would typically dispatch a Redux action
      // that would handle API call and state updates
      
      // For now, we'll throw an error as this is not implemented in the API
      // In a real implementation, it would be something like:
      // return await dispatch(createWorkspaceThunk(data)).unwrap();
      
      throw new Error('Workspace creation not implemented in API');
    } catch (error) {
      console.error('Error creating workspace:', error);
      // dispatch({ type: 'workspace/setError', payload: error.message });
      throw error;
    }
  }, [dispatch]);
  
  /**
   * Updates an existing workspace
   */
  const updateWorkspace = useCallback(async (id: string, data: Partial<WorkspaceFormValues>): Promise<Workspace> => {
    try {
      // This would typically dispatch a Redux action
      // For now, we'll throw an error as this is not implemented in the API
      throw new Error('Workspace update not implemented in API');
    } catch (error) {
      console.error('Error updating workspace:', error);
      // dispatch({ type: 'workspace/setError', payload: error.message });
      throw error;
    }
  }, [dispatch]);
  
  /**
   * Deletes a workspace
   */
  const deleteWorkspace = useCallback(async (id: string): Promise<boolean> => {
    try {
      // This would typically dispatch a Redux action
      // For now, we'll throw an error as this is not implemented in the API
      throw new Error('Workspace deletion not implemented in API');
    } catch (error) {
      console.error('Error deleting workspace:', error);
      // dispatch({ type: 'workspace/setError', payload: error.message });
      throw error;
    }
  }, [dispatch]);
  
  /**
   * Fetches notebooks for a workspace
   */
  const fetchNotebooks = useCallback(async (workspaceId: string): Promise<Notebook[]> => {
    try {
      // API call to get notebooks for a workspace
      const notebooks = await api.workspace.getNotebooks(workspaceId);
      
      // Update Redux state
      // dispatch({ type: 'workspace/setNotebooks', payload: notebooks });
      
      return notebooks;
    } catch (error) {
      console.error('Error fetching notebooks:', error);
      // dispatch({ type: 'workspace/setError', payload: error.message });
      throw error;
    }
  }, [dispatch]);
  
  /**
   * Fetches a specific notebook
   */
  const fetchNotebook = useCallback(async (notebookId: string): Promise<Notebook> => {
    try {
      // Need to ensure current workspace is selected
      if (!currentWorkspace) {
        throw new Error('No current workspace selected');
      }
      
      // API call to get notebook details
      const notebook = await api.workspace.getNotebook(
        currentWorkspace.id, 
        notebookId
      );
      
      // Update Redux state
      // dispatch({ type: 'workspace/setCurrentNotebook', payload: notebook });
      
      return notebook;
    } catch (error) {
      console.error('Error fetching notebook:', error);
      // dispatch({ type: 'workspace/setError', payload: error.message });
      throw error;
    }
  }, [currentWorkspace, dispatch]);
  
  /**
   * Creates a new notebook in a workspace
   */
  const createNotebook = useCallback(async (data: NotebookFormValues): Promise<Notebook> => {
    try {
      // API call to create a notebook
      const notebook = await api.workspace.createNotebook(data.workspaceId, data);
      
      // Update Redux state
      // dispatch({ type: 'workspace/addNotebook', payload: notebook });
      
      return notebook;
    } catch (error) {
      console.error('Error creating notebook:', error);
      // dispatch({ type: 'workspace/setError', payload: error.message });
      throw error;
    }
  }, [dispatch]);
  
  /**
   * Updates an existing notebook
   */
  const updateNotebook = useCallback(async (id: string, data: Partial<NotebookFormValues>): Promise<Notebook> => {
    try {
      // This would typically dispatch a Redux action
      // For now, we'll throw an error as this is not implemented in the API
      throw new Error('Notebook update not implemented in API');
    } catch (error) {
      console.error('Error updating notebook:', error);
      // dispatch({ type: 'workspace/setError', payload: error.message });
      throw error;
    }
  }, [dispatch]);
  
  /**
   * Deletes a notebook
   */
  const deleteNotebook = useCallback(async (id: string): Promise<boolean> => {
    try {
      // This would typically dispatch a Redux action
      // For now, we'll throw an error as this is not implemented in the API
      throw new Error('Notebook deletion not implemented in API');
    } catch (error) {
      console.error('Error deleting notebook:', error);
      // dispatch({ type: 'workspace/setError', payload: error.message });
      throw error;
    }
  }, [dispatch]);
  
  /**
   * Executes a cell in a notebook
   */
  const executeCell = useCallback(async (notebookId: string, cellId: string, code: string): Promise<any> => {
    try {
      // This would typically dispatch a Redux action that would:
      // 1. Update the cell state to show it's executing
      // 2. Make an API call to execute the code
      // 3. Update the cell with the execution results
      
      // For now, we'll throw an error as this is not implemented in the API
      throw new Error('Cell execution not implemented in API');
    } catch (error) {
      console.error('Error executing cell:', error);
      // dispatch({ type: 'workspace/setError', payload: error.message });
      throw error;
    }
  }, [dispatch]);
  
  /**
   * Updates a cell in a notebook
   */
  const updateCell = useCallback(async (notebookId: string, cellId: string, data: Partial<CellFormValues>): Promise<Cell> => {
    try {
      // This would typically dispatch a Redux action
      // For now, we'll throw an error as this is not implemented in the API
      throw new Error('Cell update not implemented in API');
    } catch (error) {
      console.error('Error updating cell:', error);
      // dispatch({ type: 'workspace/setError', payload: error.message });
      throw error;
    }
  }, [dispatch]);
  
  /**
   * Opens file picker and uploads the selected file to a workspace
   */
  const pickAndUploadFile = useCallback(async (workspaceId: string): Promise<WorkspaceFile> => {
    try {
      // Open document picker
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });
      
      // Handle single file selection
      const file = Array.isArray(result) ? result[0] : result;
      
      // Reset upload progress
      setUploadProgress(0);
      
      // Upload file to server
      const uploadedFile = await api.workspace.uploadFile(workspaceId, {
        uri: file.uri,
        type: file.type,
        name: file.name
      });
      
      // Set progress to 100% when complete
      setUploadProgress(100);
      
      // Update Redux state
      // dispatch({ type: 'workspace/addFile', payload: uploadedFile });
      
      return uploadedFile;
    } catch (error) {
      // Handle user cancellation
      if (DocumentPicker.isCancel(error)) {
        console.log('User cancelled file picker');
        throw new Error('File selection cancelled');
      }
      
      console.error('Error picking and uploading file:', error);
      // dispatch({ type: 'workspace/setError', payload: error.message });
      throw error;
    }
  }, [dispatch]);
  
  /**
   * Downloads a file from a workspace to local storage
   */
  const downloadFile = useCallback(async (workspaceId: string, fileId: string): Promise<string> => {
    try {
      // Find file in state
      const file = files.find(f => f.id === fileId);
      
      if (!file) {
        throw new Error('File not found');
      }
      
      // Set up local file path
      const localPath = `${RNFS.DocumentDirectoryPath}/${file.name}`;
      
      // Check if file already exists locally
      const exists = await RNFS.exists(localPath);
      if (exists) {
        return localPath;
      }
      
      // Reset progress
      setUploadProgress(0);
      
      // Set up download configuration
      const downloadOptions = {
        fromUrl: file.url,
        toFile: localPath,
        progress: (res: { bytesWritten: number, contentLength: number }) => {
          const progress = Math.round((res.bytesWritten / res.contentLength) * 100);
          setUploadProgress(progress);
        },
        progressDivider: 5, // Report progress every 5%
      };
      
      // Start download
      const result = await RNFS.downloadFile(downloadOptions).promise;
      
      // Check if download was successful
      if (result.statusCode === 200) {
        setUploadProgress(100);
        return localPath;
      } else {
        throw new Error(`Download failed with status code ${result.statusCode}`);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      // dispatch({ type: 'workspace/setError', payload: error.message });
      throw error;
    }
  }, [files, dispatch]);
  
  /**
   * Deletes a file from a workspace
   */
  const deleteFile = useCallback(async (workspaceId: string, fileId: string): Promise<boolean> => {
    try {
      // Call API to delete file
      const success = await api.workspace.deleteFile(workspaceId, fileId);
      
      if (success) {
        // Update Redux state
        // dispatch({ type: 'workspace/removeFile', payload: fileId });
      }
      
      return success;
    } catch (error) {
      console.error('Error deleting file:', error);
      // dispatch({ type: 'workspace/setError', payload: error.message });
      throw error;
    }
  }, [dispatch]);
  
  /**
   * Adds a member to a workspace
   */
  const addMember = useCallback(async (workspaceId: string, userId: string, role: WorkspaceRole): Promise<WorkspaceMember> => {
    try {
      // This would typically dispatch a Redux action
      // For now, we'll throw an error as this is not implemented in the API
      throw new Error('Add member not implemented in API');
    } catch (error) {
      console.error('Error adding member:', error);
      // dispatch({ type: 'workspace/setError', payload: error.message });
      throw error;
    }
  }, [dispatch]);
  
  /**
   * Removes a member from a workspace
   */
  const removeMember = useCallback(async (workspaceId: string, userId: string): Promise<boolean> => {
    try {
      // This would typically dispatch a Redux action
      // For now, we'll throw an error as this is not implemented in the API
      throw new Error('Remove member not implemented in API');
    } catch (error) {
      console.error('Error removing member:', error);
      // dispatch({ type: 'workspace/setError', payload: error.message });
      throw error;
    }
  }, [dispatch]);
  
  /**
   * Updates a member's role in a workspace
   */
  const updateMemberRole = useCallback(async (workspaceId: string, userId: string, role: WorkspaceRole): Promise<boolean> => {
    try {
      // This would typically dispatch a Redux action
      // For now, we'll throw an error as this is not implemented in the API
      throw new Error('Update member role not implemented in API');
    } catch (error) {
      console.error('Error updating member role:', error);
      // dispatch({ type: 'workspace/setError', payload: error.message });
      throw error;
    }
  }, [dispatch]);
  
  /**
   * Joins a workspace for real-time collaboration via WebSocket
   */
  const joinWorkspace = useCallback(async (workspaceId: string): Promise<boolean> => {
    try {
      // Check if WebSocket is connected
      if (!messageSocketService.isConnected()) {
        // Try to connect
        await messageSocketService.connect();
      }
      
      // Join the workspace room for real-time updates
      const joined = await messageSocketService.joinConversation(workspaceId);
      
      if (joined) {
        console.log(`Joined workspace ${workspaceId} for real-time collaboration`);
      } else {
        console.warn(`Failed to join workspace ${workspaceId}`);
      }
      
      return joined;
    } catch (error) {
      console.error('Error joining workspace for real-time collaboration:', error);
      return false;
    }
  }, []);
  
  /**
   * Leaves the current workspace WebSocket channel
   */
  const leaveWorkspace = useCallback(async (): Promise<void> => {
    try {
      if (currentWorkspace && messageSocketService.isConnected()) {
        await messageSocketService.leaveConversation(currentWorkspace.id);
        console.log(`Left workspace ${currentWorkspace.id}`);
      }
    } catch (error) {
      console.error('Error leaving workspace:', error);
    }
  }, [currentWorkspace]);
  
  /**
   * Handles network connectivity changes
   */
  const handleNetworkChange = useCallback((state: { isConnected: boolean }) => {
    const wasOffline = isOffline;
    const nowOffline = !state.isConnected;
    
    // Update offline state
    setIsOffline(nowOffline);
    
    // Show alert when connection is lost
    if (!wasOffline && nowOffline) {
      Alert.alert(
        'You are offline',
        'Some workspace features may be limited until your connection is restored.',
        [{ text: 'OK' }]
      );
    }
    
    // Attempt to reconnect WebSocket when connection is restored
    if (wasOffline && !nowOffline && currentWorkspace) {
      messageSocketService.reconnect().then(() => {
        joinWorkspace(currentWorkspace.id);
      }).catch(error => {
        console.error('Error reconnecting to workspace:', error);
      });
    }
  }, [isOffline, currentWorkspace, joinWorkspace]);
  
  /**
   * Clears workspace error state
   */
  const clearWorkspaceError = useCallback(() => {
    // Update Redux state
    // dispatch({ type: 'workspace/clearError' });
  }, [dispatch]);
  
  /**
   * Checks if the current user has a specific workspace permission
   */
  const hasWorkspacePermission = useCallback((permission: string): boolean => {
    // First check global permissions
    if (hasPermission(permission)) {
      return true;
    }
    
    // Then check workspace-specific permissions
    if (currentWorkspace && user) {
      const member = currentWorkspace.members.find(m => m.userId === user.id);
      if (member) {
        return member.permissions.includes(permission);
      }
    }
    
    return false;
  }, [hasPermission, currentWorkspace, user]);
  
  // Set up useEffect to monitor network connectivity changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(handleNetworkChange);
    
    // Initial network check
    NetInfo.fetch().then(state => {
      setIsOffline(!state.isConnected);
    });
    
    // Clean up subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [handleNetworkChange]);
  
  // Set up useEffect to join workspace WebSocket channel when currentWorkspace changes
  useEffect(() => {
    if (currentWorkspace && !isOffline) {
      joinWorkspace(currentWorkspace.id).catch(error => {
        console.error('Error joining workspace channel:', error);
      });
      
      // Set up WebSocket event handlers
      const handleUserPresence = (data: any) => {
        // Would update active users in Redux store
        // dispatch({ type: 'workspace/updateActiveUsers', payload: data });
      };
      
      // Set up connection state change handler
      const unsubscribe = messageSocketService.onConnectionStateChange((state) => {
        console.log('WebSocket connection state changed:', state);
      });
      
      // Clean up when workspace changes or component unmounts
      return () => {
        leaveWorkspace().catch(error => {
          console.error('Error leaving workspace channel:', error);
        });
        unsubscribe();
      };
    }
  }, [currentWorkspace, isOffline, joinWorkspace, leaveWorkspace, dispatch]);
  
  // Set up useEffect to clean up WebSocket connection on unmount
  useEffect(() => {
    return () => {
      if (messageSocketService.isConnected()) {
        messageSocketService.disconnect().catch(error => {
          console.error('Error disconnecting WebSocket:', error);
        });
      }
    };
  }, []);
  
  // Return workspace state and all workspace methods for use in components
  return {
    // State
    workspaces,
    currentWorkspace,
    notebooks,
    currentNotebook,
    files,
    loading,
    error,
    isOffline,
    uploadProgress,
    activeUsers,
    
    // Methods
    fetchWorkspaces,
    fetchWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    
    fetchNotebooks,
    fetchNotebook,
    createNotebook,
    updateNotebook,
    deleteNotebook,
    
    executeCell,
    updateCell,
    
    pickAndUploadFile,
    downloadFile,
    deleteFile,
    
    addMember,
    removeMember,
    updateMemberRole,
    
    joinWorkspace,
    leaveWorkspace,
    
    clearError: clearWorkspaceError,
    hasWorkspacePermission,
  };
};

export default useWorkspace;