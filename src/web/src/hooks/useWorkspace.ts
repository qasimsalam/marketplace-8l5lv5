/**
 * Custom React hook that provides workspace management functionality for collaborative AI projects
 * in the AI Talent Marketplace web application. Allows users to create, manage, and interact with
 * workspaces, notebooks, and real-time collaboration features.
 * 
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react'; // ^18.0.0
import { useAppDispatch, useAppSelector } from '../store';
import { 
  Workspace, WorkspaceFile, Notebook, Cell, WorkspaceFormValues,
  NotebookFormValues, CellFormValues, WorkspaceStatus, WorkspaceRole,
  CellType, ExecutionState, WorkspaceSocketEvent, WorkspacePermissions
} from '../types/workspace';
import { workspaceAPI } from '../lib/api';
import { workspaceSocketService } from '../lib/websocket';
import useToast from './useToast';
import { useAuth } from './useAuth';

// Debounce interval for real-time updates in milliseconds
const DEBOUNCE_INTERVAL = 500;

/**
 * Custom React hook that provides workspace management functionality for collaborative AI projects
 * 
 * @returns Object containing workspace state and methods
 */
export const useWorkspace = () => {
  // Initialize Redux hooks
  const dispatch = useAppDispatch();
  const { user, hasPermission } = useAuth();
  const toast = useToast();

  // Local state for workspaces and related data
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [currentNotebook, setCurrentNotebook] = useState<Notebook | null>(null);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [activeUsers, setActiveUsers] = useState<Record<string, {userId: string, lastActive: Date}>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches all workspaces for the current user
   */
  const fetchWorkspaces = useCallback(async (page: number = 1, limit: number = 10) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await workspaceAPI.getWorkspaces(page, limit);
      setWorkspaces(response.workspaces);
      return response.workspaces;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch workspaces';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Fetches a specific workspace by ID
   */
  const fetchWorkspace = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const workspace = await workspaceAPI.getWorkspaceById(id);
      setCurrentWorkspace(workspace);
      
      // Update workspace in list if it exists
      setWorkspaces(prevWorkspaces => {
        const index = prevWorkspaces.findIndex(w => w.id === workspace.id);
        if (index !== -1) {
          const updatedWorkspaces = [...prevWorkspaces];
          updatedWorkspaces[index] = workspace;
          return updatedWorkspaces;
        }
        return [...prevWorkspaces, workspace];
      });
      
      // Set files from the workspace
      if (workspace.files) {
        setFiles(workspace.files);
      }
      
      return workspace;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to fetch workspace with ID: ${id}`;
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Creates a new workspace
   */
  const createWorkspace = useCallback(async (data: WorkspaceFormValues) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const workspace = await workspaceAPI.createWorkspace(data);
      
      // Add to workspaces list
      setWorkspaces(prevWorkspaces => [...prevWorkspaces, workspace]);
      setCurrentWorkspace(workspace);
      
      toast.success('Workspace created successfully');
      return workspace;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create workspace';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Updates an existing workspace
   */
  const updateWorkspace = useCallback(async (id: string, data: Partial<WorkspaceFormValues>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const workspace = await workspaceAPI.updateWorkspace(id, data);
      
      // Update in workspaces list
      setWorkspaces(prevWorkspaces => {
        const index = prevWorkspaces.findIndex(w => w.id === id);
        if (index !== -1) {
          const updatedWorkspaces = [...prevWorkspaces];
          updatedWorkspaces[index] = workspace;
          return updatedWorkspaces;
        }
        return prevWorkspaces;
      });
      
      // Update current workspace if it's the one being edited
      if (currentWorkspace?.id === id) {
        setCurrentWorkspace(workspace);
      }
      
      toast.success('Workspace updated successfully');
      return workspace;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to update workspace with ID: ${id}`;
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace, toast]);

  /**
   * Deletes a workspace
   */
  const deleteWorkspace = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Ensure user leaves the workspace before deleting
      if (currentWorkspace?.id === id) {
        await workspaceSocketService.leaveWorkspace(id);
      }
      
      const response = await workspaceAPI.deleteWorkspace(id);
      
      if (response.success) {
        // Remove from workspaces list
        setWorkspaces(prevWorkspaces => prevWorkspaces.filter(w => w.id !== id));
        
        // Clear current workspace if it's the one being deleted
        if (currentWorkspace?.id === id) {
          setCurrentWorkspace(null);
          setNotebooks([]);
          setCurrentNotebook(null);
          setFiles([]);
        }
        
        toast.success('Workspace deleted successfully');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to delete workspace with ID: ${id}`;
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace, toast]);

  /**
   * Fetches notebooks for a specific workspace
   */
  const fetchNotebooks = useCallback(async (workspaceId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await workspaceAPI.getNotebooks(workspaceId);
      setNotebooks(response.notebooks);
      return response.notebooks;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to fetch notebooks for workspace: ${workspaceId}`;
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Fetches a specific notebook by ID
   */
  const fetchNotebook = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const notebook = await workspaceAPI.getNotebookById(id);
      setCurrentNotebook(notebook);
      
      // Update notebook in list if it exists
      setNotebooks(prevNotebooks => {
        const index = prevNotebooks.findIndex(n => n.id === notebook.id);
        if (index !== -1) {
          const updatedNotebooks = [...prevNotebooks];
          updatedNotebooks[index] = notebook;
          return updatedNotebooks;
        }
        return [...prevNotebooks, notebook];
      });
      
      return notebook;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to fetch notebook with ID: ${id}`;
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Creates a new notebook in a workspace
   */
  const createNotebook = useCallback(async (data: NotebookFormValues) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const notebook = await workspaceAPI.createNotebook({
        workspaceId: data.workspaceId,
        name: data.name,
        description: data.description,
        kernelName: data.kernelName
      });
      
      // Add to notebooks list
      setNotebooks(prevNotebooks => [...prevNotebooks, notebook]);
      setCurrentNotebook(notebook);
      
      toast.success('Notebook created successfully');
      return notebook;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create notebook';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Updates an existing notebook
   */
  const updateNotebook = useCallback(async (id: string, data: Partial<NotebookFormValues>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const notebook = await workspaceAPI.updateNotebook(id, {
        name: data.name,
        description: data.description,
        kernelName: data.kernelName
      });
      
      // Update notebook in list
      setNotebooks(prevNotebooks => {
        const index = prevNotebooks.findIndex(n => n.id === id);
        if (index !== -1) {
          const updatedNotebooks = [...prevNotebooks];
          updatedNotebooks[index] = notebook;
          return updatedNotebooks;
        }
        return prevNotebooks;
      });
      
      // Update current notebook if it's the one being edited
      if (currentNotebook?.id === id) {
        setCurrentNotebook(notebook);
      }
      
      toast.success('Notebook updated successfully');
      return notebook;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to update notebook with ID: ${id}`;
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentNotebook, toast]);

  /**
   * Deletes a notebook
   */
  const deleteNotebook = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Ensure user leaves the notebook before deleting
      if (currentNotebook?.id === id) {
        await workspaceSocketService.leaveNotebook(id);
      }
      
      const response = await workspaceAPI.deleteNotebook(id);
      
      if (response.success) {
        // Remove from notebooks list
        setNotebooks(prevNotebooks => prevNotebooks.filter(n => n.id !== id));
        
        // Clear current notebook if it's the one being deleted
        if (currentNotebook?.id === id) {
          setCurrentNotebook(null);
        }
        
        toast.success('Notebook deleted successfully');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to delete notebook with ID: ${id}`;
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentNotebook, toast]);

  /**
   * Adds a cell to a notebook
   */
  const addCell = useCallback((notebookId: string, cellData: CellFormValues) => {
    if (!currentNotebook || currentNotebook.id !== notebookId) {
      toast.error('Notebook not loaded');
      return;
    }
    
    // Create a new cell with a temporary ID
    const newCell: Cell = {
      id: `temp-${Date.now()}`,
      notebookId,
      cellType: cellData.cellType,
      source: cellData.source,
      outputs: [],
      executionCount: null,
      metadata: {},
      order: cellData.order
    };
    
    // Update the current notebook
    setCurrentNotebook(prevNotebook => {
      if (!prevNotebook) return null;
      
      const updatedCells = [...(prevNotebook.cells || []), newCell];
      // Sort cells by order
      updatedCells.sort((a, b) => a.order - b.order);
      
      return {
        ...prevNotebook,
        cells: updatedCells
      };
    });
    
    // Emit cell added event for real-time collaboration
    if (user) {
      workspaceSocketService.emit(WorkspaceSocketEvent.CELL_ADDED, {
        notebookId,
        cell: newCell
      });
    }
    
    return newCell;
  }, [currentNotebook, user, toast]);

  /**
   * Updates a cell in a notebook with real-time collaboration
   */
  const updateCell = useCallback((notebookId: string, cellId: string, cellData: Partial<CellFormValues>) => {
    if (!currentNotebook || currentNotebook.id !== notebookId) {
      toast.error('Notebook not loaded');
      return;
    }
    
    // Find the cell
    const cellIndex = currentNotebook.cells.findIndex(c => c.id === cellId);
    if (cellIndex === -1) {
      toast.error('Cell not found');
      return;
    }
    
    // Update the cell
    setCurrentNotebook(prevNotebook => {
      if (!prevNotebook) return null;
      
      const updatedCells = [...prevNotebook.cells];
      updatedCells[cellIndex] = {
        ...updatedCells[cellIndex],
        ...(cellData.cellType && { cellType: cellData.cellType }),
        ...(cellData.source !== undefined && { source: cellData.source }),
        ...(cellData.order && { order: cellData.order })
      };
      
      return {
        ...prevNotebook,
        cells: updatedCells
      };
    });
    
    // Debounce real-time updates to avoid too many events
    const debounceTimer = setTimeout(() => {
      // Emit cell updated event for real-time collaboration
      if (user) {
        workspaceSocketService.updateCell(notebookId, cellId, {
          ...cellData,
          userId: user.id // Include user ID to identify source of changes
        });
      }
    }, DEBOUNCE_INTERVAL);
    
    return () => clearTimeout(debounceTimer);
  }, [currentNotebook, user, toast]);

  /**
   * Deletes a cell from a notebook
   */
  const deleteCell = useCallback((notebookId: string, cellId: string) => {
    if (!currentNotebook || currentNotebook.id !== notebookId) {
      toast.error('Notebook not loaded');
      return;
    }
    
    // Update the current notebook
    setCurrentNotebook(prevNotebook => {
      if (!prevNotebook) return null;
      
      const updatedCells = prevNotebook.cells.filter(c => c.id !== cellId);
      
      return {
        ...prevNotebook,
        cells: updatedCells
      };
    });
    
    // Emit cell removed event for real-time collaboration
    if (user) {
      workspaceSocketService.emit(WorkspaceSocketEvent.CELL_REMOVED, {
        notebookId,
        cellId,
        userId: user.id
      });
    }
  }, [currentNotebook, user, toast]);

  /**
   * Executes a cell in a notebook
   */
  const executeCell = useCallback(async (notebookId: string, cellId: string, code: string) => {
    if (!currentNotebook || currentNotebook.id !== notebookId) {
      toast.error('Notebook not loaded');
      return;
    }
    
    // Find the cell
    const cellIndex = currentNotebook.cells.findIndex(c => c.id === cellId);
    if (cellIndex === -1) {
      toast.error('Cell not found');
      return;
    }
    
    // Update the cell's execution state
    setCurrentNotebook(prevNotebook => {
      if (!prevNotebook) return null;
      
      const updatedCells = [...prevNotebook.cells];
      updatedCells[cellIndex] = {
        ...updatedCells[cellIndex],
        executionState: ExecutionState.BUSY
      };
      
      return {
        ...prevNotebook,
        cells: updatedCells,
        executionState: ExecutionState.BUSY
      };
    });
    
    try {
      // Execute the cell
      const result = await workspaceAPI.executeCell(notebookId, cellId, code);
      
      // Update the cell with execution results
      setCurrentNotebook(prevNotebook => {
        if (!prevNotebook) return null;
        
        const cellIndex = prevNotebook.cells.findIndex(c => c.id === cellId);
        if (cellIndex === -1) return prevNotebook;
        
        const updatedCells = [...prevNotebook.cells];
        updatedCells[cellIndex] = {
          ...updatedCells[cellIndex],
          outputs: result.outputs,
          executionCount: result.executionCount,
          executionState: ExecutionState.IDLE
        };
        
        return {
          ...prevNotebook,
          cells: updatedCells,
          executionState: ExecutionState.IDLE
        };
      });
      
      // Emit cell executed event for real-time collaboration
      if (user) {
        workspaceSocketService.executeCell(notebookId, cellId);
      }
      
      return result;
    } catch (err) {
      // Update the cell to show execution error
      setCurrentNotebook(prevNotebook => {
        if (!prevNotebook) return null;
        
        const cellIndex = prevNotebook.cells.findIndex(c => c.id === cellId);
        if (cellIndex === -1) return prevNotebook;
        
        const updatedCells = [...prevNotebook.cells];
        updatedCells[cellIndex] = {
          ...updatedCells[cellIndex],
          executionState: ExecutionState.ERROR,
          outputs: [
            {
              output_type: 'error',
              ename: 'ExecutionError',
              evalue: err instanceof Error ? err.message : 'Execution failed',
              traceback: []
            }
          ]
        };
        
        return {
          ...prevNotebook,
          cells: updatedCells,
          executionState: ExecutionState.IDLE
        };
      });
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute cell';
      toast.error(errorMessage);
      throw err;
    }
  }, [currentNotebook, user, toast]);

  /**
   * Uploads a file to a workspace
   */
  const uploadFile = useCallback(async (workspaceId: string, file: File, onProgress?: (progress: number) => void) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const uploadedFile = await workspaceAPI.uploadWorkspaceFile(file, workspaceId, onProgress);
      
      // Add file to files list
      setFiles(prevFiles => [...prevFiles, uploadedFile]);
      
      toast.success('File uploaded successfully');
      
      // Emit file uploaded event for real-time collaboration
      if (user) {
        workspaceSocketService.emit(WorkspaceSocketEvent.FILE_UPLOADED, {
          workspaceId,
          file: uploadedFile
        });
      }
      
      return uploadedFile;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload file';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  /**
   * Checks if the user has a specific workspace permission
   */
  const hasWorkspacePermission = useCallback((permission: string): boolean => {
    if (!currentWorkspace || !user) return false;
    
    // Find the user's role in the workspace
    const member = currentWorkspace.members.find(m => m.userId === user.id);
    if (!member) return false;
    
    // Check if the user's role has the permission
    return member.permissions.includes(permission);
  }, [currentWorkspace, user]);

  /**
   * Clears any error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Set up WebSocket event handlers for real-time collaboration
  useEffect(() => {
    if (!currentWorkspace || !user) return;
    
    // Join the workspace
    const joinWorkspace = async () => {
      try {
        await workspaceSocketService.joinWorkspace(currentWorkspace.id);
      } catch (err) {
        console.error('Failed to join workspace:', err);
        toast.error('Failed to join collaborative workspace');
      }
    };
    
    joinWorkspace();
    
    // Set up user presence handler
    const unsubscribePresence = workspaceSocketService.onUserPresence(
      currentWorkspace.id,
      (data: { userId: string; lastActive: Date }) => {
        setActiveUsers(prev => ({
          ...prev,
          [data.userId]: {
            userId: data.userId,
            lastActive: new Date(data.lastActive)
          }
        }));
      }
    );
    
    // Cleanup function
    return () => {
      unsubscribePresence();
      workspaceSocketService.leaveWorkspace(currentWorkspace.id).catch(console.error);
    };
  }, [currentWorkspace, user, toast]);

  // Set up notebook-specific WebSocket handlers
  useEffect(() => {
    if (!currentNotebook || !user) return;
    
    // Join the notebook
    const joinNotebook = async () => {
      try {
        await workspaceSocketService.joinNotebook(currentNotebook.id);
      } catch (err) {
        console.error('Failed to join notebook:', err);
        toast.error('Failed to join collaborative notebook');
      }
    };
    
    joinNotebook();
    
    // Set up cell update handler
    const unsubscribeCellUpdate = workspaceSocketService.onCellUpdate(
      currentNotebook.id,
      (data: { cellId: string; cellData: any }) => {
        // Only update if the update is from another user (not our own)
        if (data.cellData.userId !== user.id) {
          setCurrentNotebook(prevNotebook => {
            if (!prevNotebook) return null;
            
            const cellIndex = prevNotebook.cells.findIndex(c => c.id === data.cellId);
            if (cellIndex === -1) return prevNotebook;
            
            const updatedCells = [...prevNotebook.cells];
            updatedCells[cellIndex] = {
              ...updatedCells[cellIndex],
              ...data.cellData
            };
            
            return {
              ...prevNotebook,
              cells: updatedCells
            };
          });
        }
      }
    );
    
    // Set up cell execution result handler
    const unsubscribeExecutionResult = workspaceSocketService.onCellExecutionResult(
      currentNotebook.id,
      (data: { cellId: string; outputs: any[]; executionCount: number }) => {
        setCurrentNotebook(prevNotebook => {
          if (!prevNotebook) return null;
          
          const cellIndex = prevNotebook.cells.findIndex(c => c.id === data.cellId);
          if (cellIndex === -1) return prevNotebook;
          
          const updatedCells = [...prevNotebook.cells];
          updatedCells[cellIndex] = {
            ...updatedCells[cellIndex],
            outputs: data.outputs,
            executionCount: data.executionCount,
            executionState: ExecutionState.IDLE
          };
          
          return {
            ...prevNotebook,
            cells: updatedCells
          };
        });
      }
    );
    
    // Cleanup function
    return () => {
      unsubscribeCellUpdate();
      unsubscribeExecutionResult();
      workspaceSocketService.leaveNotebook(currentNotebook.id).catch(console.error);
    };
  }, [currentNotebook, user, toast]);

  return {
    // State
    workspaces,
    currentWorkspace,
    notebooks,
    currentNotebook,
    files,
    activeUsers,
    isLoading,
    error,
    
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
    addCell,
    updateCell,
    deleteCell,
    executeCell,
    uploadFile,
    hasWorkspacePermission,
    clearError
  };
};