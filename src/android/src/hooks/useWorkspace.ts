/**
 * Custom React hook for workspace functionality in the AI Talent Marketplace Android app
 * 
 * Provides comprehensive workspace management, real-time collaboration, file operations,
 * and Jupyter notebook integration with offline support for mobile.
 * 
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetInfo } from '@react-native-community/netinfo';

// Import Redux hooks
import { useAppDispatch, useAppSelector } from '../store';

// Import auth hook for user information and permissions
import useAuth from './useAuth';

// Import API services
import { workspaceAPI } from '../lib/api';
import { messageSocketService } from '../lib/websocket';

// Import types
import {
  Workspace,
  WorkspaceFile,
  Notebook,
  Cell,
  Message,
  WorkspaceActivity,
  WorkspaceFormValues,
  NotebookFormValues,
  CellFormValues,
  WorkspaceState,
  WorkspaceSocketEvent,
  WorkspacePermissions,
  WorkspaceContextType
} from '../types/workspace.types';

// Global constants
const WORKSPACE_STORAGE_KEY = 'ai_talent_marketplace_workspaces';
const FILE_DOWNLOAD_CHUNK_SIZE = 1024 * 1024; // 1MB chunks
const MAX_OFFLINE_STORAGE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Custom React hook that provides comprehensive workspace functionality for the mobile application
 * 
 * @returns {WorkspaceContextType} Object containing workspace state and functions
 */
function useWorkspace(): WorkspaceContextType {
  // Access redux state and dispatch
  const dispatch = useAppDispatch();
  const workspaceState = useAppSelector(state => state.workspace);
  
  // Local state for tracking network connectivity
  const [isOffline, setIsOffline] = useState<boolean>(false);
  
  // Local state for file download progress
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  
  // Reference to active WebSocket connection
  const socketRef = useRef<any>(null);
  
  // Get user and permissions from auth hook
  const { user, hasPermission } = useAuth();
  
  /**
   * Leaves the current workspace and cleans up WebSocket connection
   * 
   * @returns Promise that resolves when workspace is left
   */
  const leaveWorkspace = useCallback(async (): Promise<void> => {
    try {
      if (socketRef.current) {
        // Get current workspace ID
        const workspaceId = workspaceState.currentWorkspace?.id;
        
        if (workspaceId) {
          // Leave the workspace room
          await messageSocketService.emit('leave_workspace', { workspaceId });
        }
        
        // Clean up event handlers
        if (socketRef.current.handlers) {
          socketRef.current.handlers.forEach((unsubscribe: () => void) => unsubscribe());
        }
        
        // Clear the socket reference
        socketRef.current = null;
      }
    } catch (error) {
      console.error('Error leaving workspace:', error);
    }
  }, [workspaceState.currentWorkspace]);
  
  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !state.isConnected;
      setIsOffline(offline);
      
      // If coming back online, sync pending changes
      if (!offline && workspaceState.currentWorkspace) {
        syncWorkspaceOffline(workspaceState.currentWorkspace.id);
      }
    });
    
    // Check initial network state
    NetInfo.fetch().then(state => {
      setIsOffline(!state.isConnected);
    });
    
    return () => {
      unsubscribe();
    };
  }, [workspaceState.currentWorkspace]);
  
  /**
   * Fetches all workspaces the user has access to
   * 
   * @returns Promise resolving to array of workspaces
   */
  const getWorkspaces = useCallback(async (): Promise<Workspace[]> => {
    try {
      // Check if offline and return cached workspaces if available
      if (isOffline) {
        const cachedData = await AsyncStorage.getItem(WORKSPACE_STORAGE_KEY);
        if (cachedData) {
          const { workspaces, timestamp } = JSON.parse(cachedData);
          // Consider data valid if less than 1 day old
          if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
            return workspaces;
          }
        }
        throw new Error('You are offline and no cached data is available');
      }
      
      // Fetch workspaces from API
      const result = await workspaceAPI.getWorkspaces();
      
      // Save to cache for offline use
      await AsyncStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify({
        workspaces: result.workspaces,
        timestamp: Date.now()
      }));
      
      return result.workspaces;
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      throw error;
    }
  }, [isOffline]);
  
  /**
   * Fetches a specific workspace by ID
   * 
   * @param id Workspace ID
   * @returns Promise resolving to workspace details
   */
  const getWorkspace = useCallback(async (id: string): Promise<Workspace> => {
    try {
      // Check if offline and return cached workspace if available
      if (isOffline) {
        const cachedData = await AsyncStorage.getItem(`${WORKSPACE_STORAGE_KEY}_${id}`);
        if (cachedData) {
          const { workspace, timestamp } = JSON.parse(cachedData);
          // Consider data valid if less than 1 day old
          if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
            return workspace;
          }
        }
        throw new Error('You are offline and no cached data is available for this workspace');
      }
      
      // Fetch workspace from API
      const workspace = await workspaceAPI.getWorkspaceById(id);
      
      // Save to cache for offline use
      await AsyncStorage.setItem(`${WORKSPACE_STORAGE_KEY}_${id}`, JSON.stringify({
        workspace,
        timestamp: Date.now()
      }));
      
      return workspace;
    } catch (error) {
      console.error(`Error fetching workspace ${id}:`, error);
      throw error;
    }
  }, [isOffline]);
  
  /**
   * Refreshes the workspaces list (pull-to-refresh functionality)
   * 
   * @returns Promise that resolves when refresh is complete
   */
  const refreshWorkspaces = useCallback(async (): Promise<void> => {
    try {
      // Only attempt refresh if online
      if (!isOffline) {
        const result = await workspaceAPI.getWorkspaces();
        
        // Update cache
        await AsyncStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify({
          workspaces: result.workspaces,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('Error refreshing workspaces:', error);
      throw error;
    }
  }, [isOffline]);
  
  /**
   * Creates a new workspace
   * 
   * @param data Workspace creation data
   * @returns Promise resolving to the created workspace
   */
  const createWorkspace = useCallback(async (data: WorkspaceFormValues): Promise<Workspace> => {
    try {
      // Must be online to create a workspace
      if (isOffline) {
        throw new Error('Cannot create a workspace while offline');
      }
      
      // Create workspace via API
      const workspace = await workspaceAPI.createWorkspace(data);
      
      // Update local cache
      const cachedData = await AsyncStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (cachedData) {
        const { workspaces, timestamp } = JSON.parse(cachedData);
        await AsyncStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify({
          workspaces: [workspace, ...workspaces],
          timestamp: Date.now()
        }));
      }
      
      return workspace;
    } catch (error) {
      console.error('Error creating workspace:', error);
      throw error;
    }
  }, [isOffline]);
  
  /**
   * Updates an existing workspace
   * 
   * @param id Workspace ID
   * @param data Workspace update data
   * @returns Promise resolving to the updated workspace
   */
  const updateWorkspace = useCallback(async (id: string, data: Partial<WorkspaceFormValues>): Promise<Workspace> => {
    try {
      // Must be online to update a workspace
      if (isOffline) {
        throw new Error('Cannot update a workspace while offline');
      }
      
      // Update workspace via API
      const updatedWorkspace = await workspaceAPI.updateWorkspace(id, data);
      
      // Update local cache
      const cachedData = await AsyncStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (cachedData) {
        const { workspaces, timestamp } = JSON.parse(cachedData);
        const updatedWorkspaces = workspaces.map((w: Workspace) => 
          w.id === id ? updatedWorkspace : w
        );
        await AsyncStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify({
          workspaces: updatedWorkspaces,
          timestamp: Date.now()
        }));
      }
      
      // Update individual workspace cache
      await AsyncStorage.setItem(`${WORKSPACE_STORAGE_KEY}_${id}`, JSON.stringify({
        workspace: updatedWorkspace,
        timestamp: Date.now()
      }));
      
      return updatedWorkspace;
    } catch (error) {
      console.error(`Error updating workspace ${id}:`, error);
      throw error;
    }
  }, [isOffline]);
  
  /**
   * Archives a workspace (changes status to ARCHIVED)
   * 
   * @param id Workspace ID
   * @returns Promise that resolves when archiving is complete
   */
  const archiveWorkspace = useCallback(async (id: string): Promise<void> => {
    try {
      // Must be online to archive a workspace
      if (isOffline) {
        throw new Error('Cannot archive a workspace while offline');
      }
      
      // Update workspace with ARCHIVED status
      await workspaceAPI.updateWorkspace(id, { status: 'ARCHIVED' });
      
      // Update local cache
      const cachedData = await AsyncStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (cachedData) {
        const { workspaces, timestamp } = JSON.parse(cachedData);
        const updatedWorkspaces = workspaces.map((w: Workspace) => 
          w.id === id ? { ...w, status: 'ARCHIVED' } : w
        );
        await AsyncStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify({
          workspaces: updatedWorkspaces,
          timestamp: Date.now()
        }));
      }
      
      // Update individual workspace cache
      const cachedWorkspace = await AsyncStorage.getItem(`${WORKSPACE_STORAGE_KEY}_${id}`);
      if (cachedWorkspace) {
        const { workspace, timestamp } = JSON.parse(cachedWorkspace);
        await AsyncStorage.setItem(`${WORKSPACE_STORAGE_KEY}_${id}`, JSON.stringify({
          workspace: { ...workspace, status: 'ARCHIVED' },
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error(`Error archiving workspace ${id}:`, error);
      throw error;
    }
  }, [isOffline]);
  
  /**
   * Deletes a workspace
   * 
   * @param id Workspace ID
   * @returns Promise that resolves when deletion is complete
   */
  const deleteWorkspace = useCallback(async (id: string): Promise<void> => {
    try {
      // Must be online to delete a workspace
      if (isOffline) {
        throw new Error('Cannot delete a workspace while offline');
      }
      
      // Delete workspace via API
      await workspaceAPI.deleteWorkspace(id);
      
      // Update local cache
      const cachedData = await AsyncStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (cachedData) {
        const { workspaces, timestamp } = JSON.parse(cachedData);
        const updatedWorkspaces = workspaces.filter((w: Workspace) => w.id !== id);
        await AsyncStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify({
          workspaces: updatedWorkspaces,
          timestamp: Date.now()
        }));
      }
      
      // Remove individual workspace cache
      await AsyncStorage.removeItem(`${WORKSPACE_STORAGE_KEY}_${id}`);
    } catch (error) {
      console.error(`Error deleting workspace ${id}:`, error);
      throw error;
    }
  }, [isOffline]);
  
  /**
   * Joins a workspace for real-time collaboration
   * 
   * @param id Workspace ID
   * @returns Promise that resolves when workspace is joined
   */
  const joinWorkspace = useCallback(async (id: string): Promise<void> => {
    try {
      // Skip if offline
      if (isOffline) {
        console.log('Currently offline, join workspace will be deferred until online');
        return;
      }
      
      // Leave any previously joined workspace
      if (socketRef.current) {
        await leaveWorkspace();
      }
      
      // Establish WebSocket connection for the workspace
      socketRef.current = messageSocketService;
      
      // Join the workspace room
      await messageSocketService.emit('join_workspace', { workspaceId: id }, true);
      
      // Set up event listeners for real-time updates
      const handleUserPresence = (data: any) => {
        // Handle user presence updates (who's online)
        console.log('User presence update:', data);
        // Normally would dispatch to Redux, but we're working directly with state here
      };
      
      const handleCellUpdate = (data: any) => {
        // Handle notebook cell updates
        console.log('Cell update received:', data);
        // Normally would dispatch to Redux
      };
      
      const handleFileUpdate = (data: any) => {
        // Handle file additions or updates
        console.log('File update received:', data);
        // Normally would dispatch to Redux
      };
      
      const handleMessage = (data: any) => {
        // Handle incoming messages
        console.log('Message received:', data);
        // Normally would dispatch to Redux
      };
      
      // Register event handlers
      messageSocketService.on(WorkspaceSocketEvent.USER_PRESENCE, handleUserPresence);
      messageSocketService.on(WorkspaceSocketEvent.CELL_UPDATED, handleCellUpdate);
      messageSocketService.on(WorkspaceSocketEvent.FILE_UPLOADED, handleFileUpdate);
      messageSocketService.on(WorkspaceSocketEvent.MESSAGE_SENT, handleMessage);
      
      // Store the event handler unsubscribe functions for cleanup
      socketRef.current.handlers = [
        () => messageSocketService.off(WorkspaceSocketEvent.USER_PRESENCE, handleUserPresence),
        () => messageSocketService.off(WorkspaceSocketEvent.CELL_UPDATED, handleCellUpdate),
        () => messageSocketService.off(WorkspaceSocketEvent.FILE_UPLOADED, handleFileUpdate),
        () => messageSocketService.off(WorkspaceSocketEvent.MESSAGE_SENT, handleMessage)
      ];
    } catch (error) {
      console.error(`Error joining workspace ${id}:`, error);
      throw error;
    }
  }, [isOffline, leaveWorkspace]);
  
  /**
   * Fetches notebooks for a workspace
   * 
   * @param workspaceId Workspace ID
   * @returns Promise resolving to notebooks array
   */
  const getNotebooks = useCallback(async (workspaceId: string): Promise<Notebook[]> => {
    try {
      // Check if offline and return cached notebooks if available
      if (isOffline) {
        const cachedData = await AsyncStorage.getItem(`${WORKSPACE_STORAGE_KEY}_${workspaceId}_notebooks`);
        if (cachedData) {
          const { notebooks, timestamp } = JSON.parse(cachedData);
          // Consider data valid if less than 1 day old
          if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
            return notebooks;
          }
        }
        throw new Error('You are offline and no cached notebook data is available');
      }
      
      // Fetch notebooks from API
      const notebooks = await workspaceAPI.getNotebooks(workspaceId);
      
      // Save to cache for offline use
      await AsyncStorage.setItem(`${WORKSPACE_STORAGE_KEY}_${workspaceId}_notebooks`, JSON.stringify({
        notebooks,
        timestamp: Date.now()
      }));
      
      return notebooks;
    } catch (error) {
      console.error(`Error fetching notebooks for workspace ${workspaceId}:`, error);
      throw error;
    }
  }, [isOffline]);
  
  /**
   * Fetches a specific notebook by ID
   * 
   * @param id Notebook ID
   * @returns Promise resolving to notebook details
   */
  const getNotebook = useCallback(async (id: string): Promise<Notebook> => {
    try {
      // Check if offline and return cached notebook if available
      if (isOffline) {
        const cachedData = await AsyncStorage.getItem(`${WORKSPACE_STORAGE_KEY}_notebook_${id}`);
        if (cachedData) {
          const { notebook, timestamp } = JSON.parse(cachedData);
          // Consider data valid if less than 1 day old
          if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
            return notebook;
          }
        }
        throw new Error('You are offline and no cached data is available for this notebook');
      }
      
      // Fetch notebook from API
      const notebook = await workspaceAPI.getNotebookById(id);
      
      // Save to cache for offline use
      await AsyncStorage.setItem(`${WORKSPACE_STORAGE_KEY}_notebook_${id}`, JSON.stringify({
        notebook,
        timestamp: Date.now()
      }));
      
      return notebook;
    } catch (error) {
      console.error(`Error fetching notebook ${id}:`, error);
      throw error;
    }
  }, [isOffline]);
  
  /**
   * Creates a new Jupyter notebook
   * 
   * @param data Notebook creation data
   * @returns Promise resolving to the created notebook
   */
  const createNotebook = useCallback(async (data: NotebookFormValues): Promise<Notebook> => {
    try {
      // Must be online to create a notebook
      if (isOffline) {
        throw new Error('Cannot create a notebook while offline');
      }
      
      // Create notebook via API
      const notebook = await workspaceAPI.createNotebook(
        data.workspaceId,
        data.name,
        data.description,
        data.kernelName
      );
      
      // Update workspace notebooks cache
      const cachedData = await AsyncStorage.getItem(`${WORKSPACE_STORAGE_KEY}_${data.workspaceId}_notebooks`);
      if (cachedData) {
        const { notebooks, timestamp } = JSON.parse(cachedData);
        await AsyncStorage.setItem(`${WORKSPACE_STORAGE_KEY}_${data.workspaceId}_notebooks`, JSON.stringify({
          notebooks: [notebook, ...notebooks],
          timestamp: Date.now()
        }));
      }
      
      // Cache individual notebook
      await AsyncStorage.setItem(`${WORKSPACE_STORAGE_KEY}_notebook_${notebook.id}`, JSON.stringify({
        notebook,
        timestamp: Date.now()
      }));
      
      return notebook;
    } catch (error) {
      console.error('Error creating notebook:', error);
      throw error;
    }
  }, [isOffline]);
  
  /**
   * Updates an existing notebook
   * 
   * @param id Notebook ID
   * @param data Notebook update data
   * @returns Promise resolving to the updated notebook
   */
  const updateNotebook = useCallback(async (id: string, data: Partial<NotebookFormValues>): Promise<Notebook> => {
    try {
      // Must be online to update a notebook
      if (isOffline) {
        throw new Error('Cannot update a notebook while offline');
      }
      
      // Update notebook via API
      const updatedNotebook = await workspaceAPI.updateNotebook(
        id,
        data.name || '',
        data.description || ''
      );
      
      // Get workspace ID from updated notebook
      const workspaceId = updatedNotebook.workspaceId;
      
      // Update workspace notebooks cache
      const cachedData = await AsyncStorage.getItem(`${WORKSPACE_STORAGE_KEY}_${workspaceId}_notebooks`);
      if (cachedData) {
        const { notebooks, timestamp } = JSON.parse(cachedData);
        const updatedNotebooks = notebooks.map((n: Notebook) => 
          n.id === id ? updatedNotebook : n
        );
        await AsyncStorage.setItem(`${WORKSPACE_STORAGE_KEY}_${workspaceId}_notebooks`, JSON.stringify({
          notebooks: updatedNotebooks,
          timestamp: Date.now()
        }));
      }
      
      // Update individual notebook cache
      await AsyncStorage.setItem(`${WORKSPACE_STORAGE_KEY}_notebook_${id}`, JSON.stringify({
        notebook: updatedNotebook,
        timestamp: Date.now()
      }));
      
      return updatedNotebook;
    } catch (error) {
      console.error(`Error updating notebook ${id}:`, error);
      throw error;
    }
  }, [isOffline]);
  
  /**
   * Deletes a notebook
   * 
   * @param id Notebook ID
   * @returns Promise that resolves when deletion is complete
   */
  const deleteNotebook = useCallback(async (id: string): Promise<void> => {
    try {
      // Must be online to delete a notebook
      if (isOffline) {
        throw new Error('Cannot delete a notebook while offline');
      }
      
      // Get notebook details first to know the workspace ID
      let workspaceId: string;
      const cachedData = await AsyncStorage.getItem(`${WORKSPACE_STORAGE_KEY}_notebook_${id}`);
      if (cachedData) {
        const { notebook } = JSON.parse(cachedData);
        workspaceId = notebook.workspaceId;
      } else {
        const notebook = await workspaceAPI.getNotebookById(id);
        workspaceId = notebook.workspaceId;
      }
      
      // Delete notebook via API
      await workspaceAPI.deleteNotebook(id);
      
      // Update workspace notebooks cache
      const cachedNotebooks = await AsyncStorage.getItem(`${WORKSPACE_STORAGE_KEY}_${workspaceId}_notebooks`);
      if (cachedNotebooks) {
        const { notebooks, timestamp } = JSON.parse(cachedNotebooks);
        const updatedNotebooks = notebooks.filter((n: Notebook) => n.id !== id);
        await AsyncStorage.setItem(`${WORKSPACE_STORAGE_KEY}_${workspaceId}_notebooks`, JSON.stringify({
          notebooks: updatedNotebooks,
          timestamp: Date.now()
        }));
      }
      
      // Remove individual notebook cache
      await AsyncStorage.removeItem(`${WORKSPACE_STORAGE_KEY}_notebook_${id}`);
    } catch (error) {
      console.error(`Error deleting notebook ${id}:`, error);
      throw error;
    }
  }, [isOffline]);
  
  /**
   * Adds a new cell to a notebook
   * 
   * @param notebookId Notebook ID
   * @param data Cell creation data
   * @returns Promise resolving to the created cell
   */
  const addCell = useCallback(async (notebookId: string, data: CellFormValues): Promise<Cell> => {
    try {
      // Must be online to add a cell
      if (isOffline) {
        throw new Error('Cannot add a cell while offline');
      }
      
      // In a real implementation, we would call the API to add a cell
      // For this example, we'll simulate it since the API interface doesn't expose a direct addCell method
      
      // Get the current notebook
      const notebook = await getNotebook(notebookId);
      
      // Create a new cell (this is a simulation)
      const newCell: Cell = {
        id: `temp_${Date.now()}`, // Would be generated by server
        notebookId,
        cellType: data.cellType,
        source: data.source,
        outputs: [],
        executionCount: null,
        metadata: {},
        order: data.order,
        isEditing: false,
        isExecuting: false,
        editedBy: user?.id || ''
      };
      
      // Update the notebook with the new cell
      notebook.cells = [...notebook.cells, newCell];
      
      // Update notebook cache
      await AsyncStorage.setItem(`${WORKSPACE_STORAGE_KEY}_notebook_${notebookId}`, JSON.stringify({
        notebook,
        timestamp: Date.now()
      }));
      
      // Emit WebSocket event for real-time collaboration (if online)
      if (socketRef.current) {
        messageSocketService.emit(WorkspaceSocketEvent.CELL_ADDED, {
          notebookId,
          cell: newCell
        });
      }
      
      return newCell;
    } catch (error) {
      console.error(`Error adding cell to notebook ${notebookId}:`, error);
      throw error;
    }
  }, [isOffline, user, getNotebook]);
  
  /**
   * Updates a cell in a notebook
   * 
   * @param notebookId Notebook ID
   * @param cellId Cell ID
   * @param data Cell update data
   * @returns Promise resolving to the updated cell
   */
  const updateCell = useCallback(async (
    notebookId: string,
    cellId: string,
    data: Partial<CellFormValues>
  ): Promise<Cell> => {
    try {
      // Must be online to update a cell
      if (isOffline) {
        throw new Error('Cannot update a cell while offline');
      }
      
      // Get the current notebook
      const notebook = await getNotebook(notebookId);
      
      // Find the cell to update
      const cellIndex = notebook.cells.findIndex(cell => cell.id === cellId);
      if (cellIndex === -1) {
        throw new Error(`Cell ${cellId} not found in notebook ${notebookId}`);
      }
      
      // Update the cell
      const updatedCell: Cell = {
        ...notebook.cells[cellIndex],
        ...(data.cellType && { cellType: data.cellType }),
        ...(data.source && { source: data.source }),
        ...(data.order && { order: data.order })
      };
      
      // Update the notebook with the updated cell
      notebook.cells[cellIndex] = updatedCell;
      
      // Update notebook cache
      await AsyncStorage.setItem(`${WORKSPACE_STORAGE_KEY}_notebook_${notebookId}`, JSON.stringify({
        notebook,
        timestamp: Date.now()
      }));
      
      // Emit WebSocket event for real-time collaboration (if online)
      if (socketRef.current) {
        messageSocketService.emit(WorkspaceSocketEvent.CELL_UPDATED, {
          notebookId,
          cellId,
          updates: data
        });
      }
      
      return updatedCell;
    } catch (error) {
      console.error(`Error updating cell ${cellId} in notebook ${notebookId}:`, error);
      throw error;
    }
  }, [isOffline, getNotebook]);
  
  /**
   * Executes a cell in a notebook
   * 
   * @param notebookId Notebook ID
   * @param cellId Cell ID
   * @returns Promise resolving to the executed cell with outputs
   */
  const executeCell = useCallback(async (notebookId: string, cellId: string): Promise<Cell> => {
    try {
      // Must be online to execute a cell
      if (isOffline) {
        throw new Error('Cannot execute a cell while offline');
      }
      
      // Execute cell via API
      const executedCell = await workspaceAPI.executeCell(notebookId, cellId);
      
      // Get and update the notebook in cache
      const cachedData = await AsyncStorage.getItem(`${WORKSPACE_STORAGE_KEY}_notebook_${notebookId}`);
      if (cachedData) {
        const { notebook, timestamp } = JSON.parse(cachedData);
        
        // Update the cell in the notebook
        const updatedCells = notebook.cells.map((cell: Cell) => 
          cell.id === cellId ? executedCell : cell
        );
        
        notebook.cells = updatedCells;
        
        // Update notebook cache
        await AsyncStorage.setItem(`${WORKSPACE_STORAGE_KEY}_notebook_${notebookId}`, JSON.stringify({
          notebook,
          timestamp: Date.now()
        }));
      }
      
      // Emit WebSocket event for real-time collaboration (if online)
      if (socketRef.current) {
        messageSocketService.emit(WorkspaceSocketEvent.CELL_EXECUTED, {
          notebookId,
          cellId,
          cell: executedCell
        });
      }
      
      return executedCell;
    } catch (error) {
      console.error(`Error executing cell ${cellId} in notebook ${notebookId}:`, error);
      throw error;
    }
  }, [isOffline]);
  
  /**
   * Deletes a cell from a notebook
   * 
   * @param notebookId Notebook ID
   * @param cellId Cell ID
   * @returns Promise that resolves when deletion is complete
   */
  const deleteCell = useCallback(async (notebookId: string, cellId: string): Promise<void> => {
    try {
      // Must be online to delete a cell
      if (isOffline) {
        throw new Error('Cannot delete a cell while offline');
      }
      
      // Get the current notebook
      const notebook = await getNotebook(notebookId);
      
      // Remove the cell
      notebook.cells = notebook.cells.filter(cell => cell.id !== cellId);
      
      // Update notebook cache
      await AsyncStorage.setItem(`${WORKSPACE_STORAGE_KEY}_notebook_${notebookId}`, JSON.stringify({
        notebook,
        timestamp: Date.now()
      }));
      
      // Emit WebSocket event for real-time collaboration (if online)
      if (socketRef.current) {
        messageSocketService.emit(WorkspaceSocketEvent.CELL_REMOVED, {
          notebookId,
          cellId
        });
      }
    } catch (error) {
      console.error(`Error deleting cell ${cellId} from notebook ${notebookId}:`, error);
      throw error;
    }
  }, [isOffline, getNotebook]);
  
  /**
   * Uploads a file to a workspace with progress tracking
   * 
   * @param workspaceId Workspace ID
   * @param file File object with uri, name and type
   * @returns Promise resolving to the uploaded file information
   */
  const uploadFile = useCallback(async (
    workspaceId: string,
    file: { uri: string; name: string; type: string }
  ): Promise<WorkspaceFile> => {
    try {
      // Must be online to upload a file
      if (isOffline) {
        throw new Error('Cannot upload a file while offline');
      }
      
      // Upload file via API with progress tracking
      const uploadedFile = await workspaceAPI.uploadWorkspaceFile(
        workspaceId,
        file,
        (progress: number) => {
          // Update progress state for this file
          setDownloadProgress(prev => ({
            ...prev,
            [file.name]: progress
          }));
        }
      );
      
      // Reset progress when complete
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[file.name];
        return newProgress;
      });
      
      // Emit WebSocket event for real-time collaboration (if online)
      if (socketRef.current) {
        messageSocketService.emit(WorkspaceSocketEvent.FILE_UPLOADED, {
          workspaceId,
          file: uploadedFile
        });
      }
      
      return uploadedFile;
    } catch (error) {
      console.error(`Error uploading file to workspace ${workspaceId}:`, error);
      throw error;
    }
  }, [isOffline]);
  
  /**
   * Downloads and caches a file locally
   * 
   * @param fileId File ID
   * @returns Promise resolving to the local URI of the downloaded file
   */
  const downloadFile = useCallback(async (fileId: string): Promise<string> => {
    try {
      // Check if file is already cached
      const cachedFile = await AsyncStorage.getItem(`${WORKSPACE_STORAGE_KEY}_file_${fileId}`);
      if (cachedFile) {
        const { localUri, timestamp } = JSON.parse(cachedFile);
        // Consider cache valid if less than 1 day old
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          return localUri;
        }
      }
      
      // Must be online to download a file if not cached
      if (isOffline) {
        throw new Error('You are offline and the requested file is not cached');
      }
      
      // In a real implementation, we would use React Native's FileSystem API to download the file
      // For this example, we'll simulate it and return a fake URI
      
      // Set initial progress
      setDownloadProgress(prev => ({
        ...prev,
        [fileId]: 0
      }));
      
      // Simulate download progress
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 10;
        if (progress <= 100) {
          setDownloadProgress(prev => ({
            ...prev,
            [fileId]: progress
          }));
        } else {
          clearInterval(progressInterval);
        }
      }, 200);
      
      // Simulate file download with delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Clear progress interval if still running
      clearInterval(progressInterval);
      
      // Generate a fake local URI (in a real app, this would be a file:// URI)
      const localUri = `file:///data/user/0/com.aitalentmarketplace/files/${fileId}`;
      
      // Cache the file information
      await AsyncStorage.setItem(`${WORKSPACE_STORAGE_KEY}_file_${fileId}`, JSON.stringify({
        localUri,
        timestamp: Date.now()
      }));
      
      // Reset progress when complete
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[fileId];
        return newProgress;
      });
      
      return localUri;
    } catch (error) {
      console.error(`Error downloading file ${fileId}:`, error);
      throw error;
    }
  }, [isOffline]);
  
  /**
   * Deletes a file from a workspace
   * 
   * @param fileId File ID
   * @returns Promise that resolves when deletion is complete
   */
  const deleteFile = useCallback(async (fileId: string): Promise<void> => {
    try {
      // Must be online to delete a file
      if (isOffline) {
        throw new Error('Cannot delete a file while offline');
      }
      
      // Delete file via API
      await workspaceAPI.deleteFile(fileId);
      
      // Remove file from cache
      await AsyncStorage.removeItem(`${WORKSPACE_STORAGE_KEY}_file_${fileId}`);
      
      // Emit WebSocket event for real-time collaboration (if online)
      if (socketRef.current) {
        messageSocketService.emit(WorkspaceSocketEvent.FILE_DELETED, {
          fileId
        });
      }
    } catch (error) {
      console.error(`Error deleting file ${fileId}:`, error);
      throw error;
    }
  }, [isOffline]);
  
  /**
   * Sends a message in a workspace
   * 
   * @param workspaceId Workspace ID
   * @param content Message content
   * @param attachments Optional file attachments
   * @returns Promise resolving to the sent message
   */
  const sendMessage = useCallback(async (
    workspaceId: string,
    content: string,
    attachments?: { uri: string; name: string; type: string }[]
  ): Promise<Message> => {
    try {
      // Generate a temporary message ID
      const messageId = `temp_${Date.now()}`;
      
      // Create a message object for optimistic UI updates
      const optimisticMessage: Message = {
        id: messageId,
        workspaceId,
        senderId: user?.id || '',
        senderName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        senderAvatarUrl: '', // This would come from user profile
        content,
        attachments: [],
        createdAt: new Date(),
        isRead: true,
        readBy: [user?.id || '']
      };
      
      // If offline, queue the message for later sending
      if (isOffline) {
        // In a real app, we would store this in a persistent queue for later sending
        console.log('Offline, queueing message for later sending:', optimisticMessage);
        
        // Store in a special offline messages queue
        const offlineMessages = await AsyncStorage.getItem(`${WORKSPACE_STORAGE_KEY}_offline_messages`);
        let messages = offlineMessages ? JSON.parse(offlineMessages) : [];
        messages.push({
          message: optimisticMessage,
          timestamp: Date.now()
        });
        await AsyncStorage.setItem(`${WORKSPACE_STORAGE_KEY}_offline_messages`, JSON.stringify(messages));
        
        return optimisticMessage;
      }
      
      // Handle file attachments if provided
      let messageAttachments: { id: string; name: string; url: string; type: string }[] = [];
      if (attachments && attachments.length > 0) {
        // Upload each attachment
        for (const attachment of attachments) {
          const uploadedFile = await workspaceAPI.uploadWorkspaceFile(workspaceId, attachment);
          messageAttachments.push({
            id: uploadedFile.id,
            name: uploadedFile.name,
            url: uploadedFile.url,
            type: uploadedFile.fileType
          });
        }
      }
      
      // In a real implementation, we would call the API to send a message
      // For this example, we'll simulate it
      
      // Add attachments to the message
      optimisticMessage.attachments = messageAttachments;
      
      // Emit WebSocket event for real-time communication
      if (socketRef.current) {
        messageSocketService.emit(WorkspaceSocketEvent.MESSAGE_SENT, {
          workspaceId,
          message: optimisticMessage
        });
      }
      
      return optimisticMessage;
    } catch (error) {
      console.error(`Error sending message in workspace ${workspaceId}:`, error);
      throw error;
    }
  }, [isOffline, user]);
  
  /**
   * Fetches messages for a workspace
   * 
   * @param workspaceId Workspace ID
   * @returns Promise resolving to messages array
   */
  const getMessages = useCallback(async (workspaceId: string): Promise<Message[]> => {
    try {
      // Check if offline and return cached messages if available
      if (isOffline) {
        const cachedData = await AsyncStorage.getItem(`${WORKSPACE_STORAGE_KEY}_${workspaceId}_messages`);
        if (cachedData) {
          const { messages, timestamp } = JSON.parse(cachedData);
          // Messages are always considered valid in offline mode
          return messages;
        }
        return []; // Return empty array if no cache
      }
      
      // In a real implementation, we would call the API to get messages
      // For this example, we'll simulate it with an empty array
      const messages: Message[] = [];
      
      // Cache the messages
      await AsyncStorage.setItem(`${WORKSPACE_STORAGE_KEY}_${workspaceId}_messages`, JSON.stringify({
        messages,
        timestamp: Date.now()
      }));
      
      return messages;
    } catch (error) {
      console.error(`Error fetching messages for workspace ${workspaceId}:`, error);
      throw error;
    }
  }, [isOffline]);
  
  /**
   * Marks messages in a workspace as read
   * 
   * @param workspaceId Workspace ID
   * @returns Promise that resolves when messages are marked as read
   */
  const markMessagesAsRead = useCallback(async (workspaceId: string): Promise<void> => {
    try {
      // If offline, track read status locally
      if (isOffline) {
        // Update local cache to mark messages as read
        const cachedData = await AsyncStorage.getItem(`${WORKSPACE_STORAGE_KEY}_${workspaceId}_messages`);
        if (cachedData) {
          const { messages, timestamp } = JSON.parse(cachedData);
          
          // Mark all messages as read
          const updatedMessages = messages.map((msg: Message) => ({
            ...msg,
            isRead: true,
            readBy: [...new Set([...(msg.readBy || []), user?.id || ''])]
          }));
          
          // Update cache
          await AsyncStorage.setItem(`${WORKSPACE_STORAGE_KEY}_${workspaceId}_messages`, JSON.stringify({
            messages: updatedMessages,
            timestamp: Date.now()
          }));
        }
        return;
      }
      
      // In a real implementation, we would call the API to mark messages as read
      // For this example, we'll simulate it
      
      // Emit WebSocket event to notify other users
      if (socketRef.current) {
        messageSocketService.emit('mark_as_read', {
          workspaceId,
          userId: user?.id || ''
        });
      }
    } catch (error) {
      console.error(`Error marking messages as read in workspace ${workspaceId}:`, error);
      throw error;
    }
  }, [isOffline, user]);
  
  /**
   * Resets any error state
   */
  const resetError = useCallback((): void => {
    // In a real implementation, we would dispatch an action to reset the error state
    console.log('Resetting error state');
  }, []);
  
  /**
   * Synchronizes workspace data for offline use
   * 
   * @param workspaceId Workspace ID
   * @returns Promise that resolves when sync is complete
   */
  const syncWorkspaceOffline = useCallback(async (workspaceId: string): Promise<void> => {
    try {
      // Skip if already offline
      if (isOffline) {
        console.log('Cannot sync workspace while offline');
        return;
      }
      
      console.log(`Syncing workspace ${workspaceId} for offline use`);
      
      // Fetch and cache workspace details
      const workspace = await workspaceAPI.getWorkspaceById(workspaceId);
      await AsyncStorage.setItem(`${WORKSPACE_STORAGE_KEY}_${workspaceId}`, JSON.stringify({
        workspace,
        timestamp: Date.now()
      }));
      
      // Fetch and cache notebooks
      const notebooks = await workspaceAPI.getNotebooks(workspaceId);
      await AsyncStorage.setItem(`${WORKSPACE_STORAGE_KEY}_${workspaceId}_notebooks`, JSON.stringify({
        notebooks,
        timestamp: Date.now()
      }));
      
      // Cache each notebook individually for offline access
      for (const notebook of notebooks) {
        await AsyncStorage.setItem(`${WORKSPACE_STORAGE_KEY}_notebook_${notebook.id}`, JSON.stringify({
          notebook,
          timestamp: Date.now()
        }));
      }
      
      // Sync messages (in a real app, we would fetch and cache messages)
      
      // Check if there are any pending offline messages to send
      const offlineMessages = await AsyncStorage.getItem(`${WORKSPACE_STORAGE_KEY}_offline_messages`);
      if (offlineMessages) {
        const messages = JSON.parse(offlineMessages);
        const workspaceMessages = messages.filter((m: any) => m.message.workspaceId === workspaceId);
        
        // Send any pending messages
        for (const item of workspaceMessages) {
          try {
            // In a real implementation, we would call the API to send these messages
            console.log('Sending offline message:', item.message);
            
            // Remove from offline queue after sending
            const remainingMessages = messages.filter((m: any) => 
              m.message.id !== item.message.id
            );
            await AsyncStorage.setItem(`${WORKSPACE_STORAGE_KEY}_offline_messages`, 
              JSON.stringify(remainingMessages)
            );
          } catch (error) {
            console.error('Error sending offline message:', error);
          }
        }
      }
      
      console.log(`Workspace ${workspaceId} synced for offline use`);
    } catch (error) {
      console.error(`Error syncing workspace ${workspaceId} for offline use:`, error);
      throw error;
    }
  }, [isOffline]);
  
  // Clean up WebSocket connection when component unmounts
  useEffect(() => {
    return () => {
      // Clean up websocket connection
      leaveWorkspace();
    };
  }, [leaveWorkspace]);
  
  // Return the workspace API
  return useMemo(() => ({
    workspaceState,
    getWorkspaces,
    getWorkspace,
    refreshWorkspaces,
    createWorkspace,
    updateWorkspace,
    archiveWorkspace,
    deleteWorkspace,
    joinWorkspace,
    leaveWorkspace,
    getNotebooks,
    getNotebook,
    createNotebook,
    updateNotebook,
    deleteNotebook,
    addCell,
    updateCell,
    executeCell,
    deleteCell,
    uploadFile,
    downloadFile,
    deleteFile,
    sendMessage,
    getMessages,
    markMessagesAsRead,
    resetError,
    syncWorkspaceOffline
  }), [
    workspaceState,
    getWorkspaces,
    getWorkspace,
    refreshWorkspaces,
    createWorkspace,
    updateWorkspace,
    archiveWorkspace,
    deleteWorkspace,
    joinWorkspace,
    leaveWorkspace,
    getNotebooks,
    getNotebook,
    createNotebook,
    updateNotebook,
    deleteNotebook,
    addCell,
    updateCell,
    executeCell,
    deleteCell,
    uploadFile,
    downloadFile,
    deleteFile,
    sendMessage,
    getMessages,
    markMessagesAsRead,
    resetError,
    syncWorkspaceOffline
  ]);
}

/**
 * Creates a React Context for providing workspace state and functions across the component tree
 * 
 * @returns React Context for workspace functionality
 */
export const createWorkspaceContext = (): React.Context<WorkspaceContextType | null> => {
  return createContext<WorkspaceContextType | null>(null);
};

// Create the workspace context
export const WorkspaceContext = createWorkspaceContext();

/**
 * React Context Provider component for workspace functionality
 * 
 * @param props Component props with children
 * @returns Provider component with context value
 */
export const WorkspaceProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  // Use the workspace hook to get all functionality
  const workspaceValue = useWorkspace();
  
  // Memoize the context value to prevent unnecessary re-renders
  const memoizedValue = useMemo(() => workspaceValue, [workspaceValue]);
  
  // Provide the workspace context to all child components
  return (
    <WorkspaceContext.Provider value={memoizedValue}>
      {children}
    </WorkspaceContext.Provider>
  );
};

// Export the hook for direct use
export default useWorkspace;