import React, { useState, useEffect, useCallback, useRef } from 'react'; // ^18.2.0
import clsx from 'clsx'; // ^1.2.1
import { useParams } from 'react-router-dom'; // ^6.8.1
import MonacoEditor from '@monaco-editor/react'; // ^4.4.6
import { MarkdownPreview } from '@uiw/react-markdown-preview'; // ^4.1.13
import { 
  PlayIcon, 
  PlusIcon, 
  TrashIcon, 
  ArrowPathIcon, 
  DocumentDuplicateIcon 
} from '@heroicons/react/24/outline'; // ^2.0.18

import Button, { ButtonVariant, ButtonSize } from '../common/Button';
import Spinner, { SpinnerSize, SpinnerColor } from '../common/Spinner';
import useWorkspace from '../../hooks/useWorkspace';
import { useWorkspaceWebSocket } from '../../hooks/useWebSocket';
import { 
  Notebook, 
  Cell, 
  CellType, 
  ExecutionState,
  WorkspacePermissions
} from '../../types/workspace';

// Debounce interval for cell content updates to avoid excessive WebSocket messages
const DEBOUNCE_INTERVAL = 500;

/**
 * Interface for JupyterNotebook component props
 */
export interface JupyterNotebookProps {
  /**
   * Optional CSS class name for styling the notebook container
   */
  className?: string;
  /**
   * Optional initial content for new cells
   */
  initialCell?: string;
  /**
   * Optional callback function when notebook is saved
   */
  onSave?: (notebook: Notebook) => void;
}

/**
 * A React component that provides an interactive Jupyter notebook interface within the AI Talent Marketplace workspace.
 * Enables real-time collaborative code editing, execution, and visualization for AI professionals and clients.
 */
const JupyterNotebook: React.FC<JupyterNotebookProps> = ({
  className,
  initialCell,
  onSave
}) => {
  // Get notebook ID from URL params
  const { notebookId } = useParams<{ notebookId: string }>();
  
  // Access workspace state and methods
  const { 
    currentNotebook,
    fetchNotebook,
    updateCell,
    executeCell,
    addCell,
    deleteCell,
    hasWorkspacePermission
  } = useWorkspace();

  // Set up WebSocket for real-time collaboration
  const {
    joinNotebook,
    leaveNotebook,
    onCellUpdate,
    onCellExecutionResult,
    onUserPresence
  } = useWorkspaceWebSocket();

  // Local state for UI and editing
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCellId, setActiveCellId] = useState<string | null>(null);
  const [cellStates, setCellStates] = useState<Record<string, string>>({});
  const [editorInstances, setEditorInstances] = useState<Record<string, any>>({});
  const [executionStates, setExecutionStates] = useState<Record<string, ExecutionState>>({});
  const [collaborators, setCollaborators] = useState<Record<string, { name: string, color: string, lastActive: Date }>>({});
  
  // Refs for debouncing cell updates
  const updateTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
  
  // Monaco editor options
  const editorOptions = {
    minimap: { enabled: false },
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    automaticLayout: true,
    fontSize: 14,
    tabSize: 4,
    scrollbar: {
      useShadows: false,
      verticalHasArrows: false,
      horizontalHasArrows: false,
      vertical: 'auto',
      horizontal: 'auto'
    }
  };

  // Fetch notebook data on component mount
  useEffect(() => {
    const loadNotebook = async () => {
      if (!notebookId) {
        setError('No notebook ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        await fetchNotebook(notebookId);
        setLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load notebook';
        setError(errorMessage);
        setLoading(false);
      }
    };

    loadNotebook();
  }, [notebookId, fetchNotebook]);

  // Set up WebSocket connection for real-time collaboration
  useEffect(() => {
    if (notebookId && !loading) {
      joinNotebook(notebookId).catch((err) => {
        console.error('Failed to join notebook session:', err);
      });

      return () => {
        leaveNotebook(notebookId).catch((err) => {
          console.error('Failed to leave notebook session:', err);
        });
      };
    }
  }, [notebookId, loading, joinNotebook, leaveNotebook]);

  // Set up cell update handler via WebSocket
  useEffect(() => {
    if (!notebookId) return;

    const unsubscribe = onCellUpdate(notebookId, (data: { cellId: string; cellData: any }) => {
      const { cellId, cellData } = data;
      
      // Don't update if this is our own edit (handled locally)
      if (cellData.userId && cellData.userId === currentNotebook?.cells.find(c => c.id === cellId)?.metadata?.lastEditedBy) {
        return;
      }

      // Update cell state
      if (cellData.source !== undefined) {
        setCellStates(prev => ({
          ...prev,
          [cellId]: cellData.source
        }));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [notebookId, onCellUpdate, currentNotebook]);

  // Set up execution result handler via WebSocket
  useEffect(() => {
    if (!notebookId) return;

    const unsubscribe = onCellExecutionResult(notebookId, (data: { 
      cellId: string; 
      outputs: any[]; 
      executionCount: number 
    }) => {
      const { cellId } = data;
      
      // Update execution state
      setExecutionStates(prev => ({
        ...prev,
        [cellId]: ExecutionState.IDLE
      }));
    });

    return () => {
      unsubscribe();
    };
  }, [notebookId, onCellExecutionResult]);

  // Set up user presence handler
  useEffect(() => {
    if (!notebookId) return;

    const unsubscribe = onUserPresence(notebookId, (data: { 
      userId: string; 
      name: string;
      color: string;
      lastActive: Date 
    }) => {
      setCollaborators(prev => ({
        ...prev,
        [data.userId]: {
          name: data.name,
          color: data.color,
          lastActive: new Date(data.lastActive)
        }
      }));
    });

    return () => {
      unsubscribe();
    };
  }, [notebookId, onUserPresence]);

  /**
   * Handles cell content changes with debouncing to prevent excessive updates
   */
  const handleCellChange = useCallback((cellId: string, newValue: string) => {
    // Update local state immediately for responsiveness
    setCellStates(prev => ({
      ...prev,
      [cellId]: newValue
    }));

    // Clear any existing timeout for this cell
    if (updateTimeoutsRef.current[cellId]) {
      clearTimeout(updateTimeoutsRef.current[cellId]);
    }

    // Set new timeout for debounced update
    updateTimeoutsRef.current[cellId] = setTimeout(() => {
      // Send update to server
      updateCell(notebookId!, cellId, { source: newValue });
    }, DEBOUNCE_INTERVAL);
  }, [notebookId, updateCell]);

  /**
   * Handles execution of code in a cell
   */
  const handleExecuteCell = useCallback(async (cellId: string) => {
    if (!notebookId || !currentNotebook) return;

    const cell = currentNotebook.cells.find(c => c.id === cellId);
    if (!cell || cell.cellType !== CellType.CODE) return;

    // Update execution state
    setExecutionStates(prev => ({
      ...prev,
      [cellId]: ExecutionState.BUSY
    }));

    try {
      // Get cell content from local state or fallback to original
      const cellContent = cellStates[cellId] || cell.source;
      await executeCell(notebookId, cellId, cellContent);
    } catch (err) {
      setExecutionStates(prev => ({
        ...prev,
        [cellId]: ExecutionState.ERROR
      }));
      console.error('Failed to execute cell:', err);
    }
  }, [notebookId, currentNotebook, cellStates, executeCell]);

  /**
   * Handles adding a new cell to the notebook
   */
  const handleAddCell = useCallback(async (afterIndex: number, cellType: CellType = CellType.CODE) => {
    if (!notebookId || !currentNotebook) return;

    // Calculate order for new cell
    let newOrder = 1000; // Default high value
    
    if (afterIndex < 0) {
      // Add to beginning
      if (currentNotebook.cells.length > 0) {
        newOrder = currentNotebook.cells[0].order / 2;
      }
    } else if (afterIndex >= currentNotebook.cells.length - 1) {
      // Add to end
      if (currentNotebook.cells.length > 0) {
        newOrder = currentNotebook.cells[currentNotebook.cells.length - 1].order + 1000;
      }
    } else {
      // Add between cells
      const prevOrder = currentNotebook.cells[afterIndex].order;
      const nextOrder = currentNotebook.cells[afterIndex + 1].order;
      newOrder = (prevOrder + nextOrder) / 2;
    }

    // Create new cell
    try {
      const newCellData = {
        cellType,
        source: initialCell || '',
        order: newOrder,
        notebookId
      };
      
      const newCell = await addCell(notebookId, newCellData);
      if (newCell) {
        // Focus the new cell
        setActiveCellId(newCell.id);
      }
    } catch (err) {
      console.error('Failed to add cell:', err);
    }
  }, [notebookId, currentNotebook, initialCell, addCell]);

  /**
   * Handles deleting a cell from the notebook
   */
  const handleDeleteCell = useCallback(async (cellId: string) => {
    if (!notebookId) return;
    
    try {
      await deleteCell(notebookId, cellId);
      
      // Clear cell state
      setCellStates(prev => {
        const newState = { ...prev };
        delete newState[cellId];
        return newState;
      });
      
      // Clear execution state
      setExecutionStates(prev => {
        const newState = { ...prev };
        delete newState[cellId];
        return newState;
      });
      
      // Clear editor instance
      setEditorInstances(prev => {
        const newState = { ...prev };
        delete newState[cellId];
        return newState;
      });
      
      // Clear active cell if deleted
      if (activeCellId === cellId) {
        setActiveCellId(null);
      }
    } catch (err) {
      console.error('Failed to delete cell:', err);
    }
  }, [notebookId, activeCellId, deleteCell]);

  /**
   * Handles changing a cell's type between code and markdown
   */
  const handleCellTypeChange = useCallback(async (cellId: string, currentType: CellType) => {
    if (!notebookId || !currentNotebook) return;
    
    const newType = currentType === CellType.CODE ? CellType.MARKDOWN : CellType.CODE;
    
    try {
      await updateCell(notebookId, cellId, { cellType: newType });
    } catch (err) {
      console.error('Failed to change cell type:', err);
    }
  }, [notebookId, currentNotebook, updateCell]);

  /**
   * Renders a single notebook cell
   */
  const renderCell = useCallback((cell: Cell, index: number) => {
    const isActive = activeCellId === cell.id;
    const isCode = cell.cellType === CellType.CODE;
    const isMarkdown = cell.cellType === CellType.MARKDOWN;
    const executionState = executionStates[cell.id] || cell.executionState || ExecutionState.IDLE;
    const isExecuting = executionState === ExecutionState.BUSY;
    const hasError = executionState === ExecutionState.ERROR;
    
    // Get cell content from state or fallback to original
    const cellContent = cellStates[cell.id] !== undefined ? cellStates[cell.id] : cell.source;
    
    return (
      <div 
        key={cell.id}
        className={clsx(
          'notebook-cell',
          'relative border rounded-md my-4 overflow-hidden transition-all',
          isActive ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300',
          hasError && 'border-red-300'
        )}
      >
        {/* Cell toolbar */}
        <div className="notebook-cell-toolbar absolute right-2 top-2 z-10 opacity-50 hover:opacity-100 transition-opacity">
          {renderCellToolbar(cell)}
        </div>
        
        {/* Execution count for code cells */}
        {isCode && (
          <div className="absolute left-2 top-2 text-xs text-gray-500 font-mono">
            {cell.executionCount !== null ? `[${cell.executionCount}]` : '[ ]'}
          </div>
        )}
        
        {/* Cell content */}
        <div 
          className="cell-content p-4 pt-8"
          onClick={() => setActiveCellId(cell.id)}
        >
          {isCode && (
            <MonacoEditor
              height="auto"
              language="python"
              theme="vs-light"
              value={cellContent}
              options={{
                ...editorOptions,
                readOnly: !hasWorkspacePermission(WorkspacePermissions.EDIT) || isExecuting
              }}
              onChange={(value) => handleCellChange(cell.id, value || '')}
              onMount={(editor) => {
                setEditorInstances(prev => ({
                  ...prev,
                  [cell.id]: editor
                }));
                
                // Set minimum height
                const contentHeight = Math.max(
                  100,
                  Math.min(400, editor.getContentHeight())
                );
                editor.layout({ width: editor.getLayoutInfo().width, height: contentHeight });
                
                // Auto-adjust height on content change
                editor.onDidContentSizeChange(() => {
                  const contentHeight = Math.max(
                    100, 
                    Math.min(400, editor.getContentHeight())
                  );
                  editor.layout({ width: editor.getLayoutInfo().width, height: contentHeight });
                });
              }}
            />
          )}
          
          {isMarkdown && !isActive && (
            <div 
              className="markdown-preview cursor-pointer"
              onClick={() => setActiveCellId(cell.id)}
            >
              <MarkdownPreview source={cellContent} />
            </div>
          )}
          
          {isMarkdown && isActive && (
            <MonacoEditor
              height="auto"
              language="markdown"
              theme="vs-light"
              value={cellContent}
              options={{
                ...editorOptions,
                readOnly: !hasWorkspacePermission(WorkspacePermissions.EDIT)
              }}
              onChange={(value) => handleCellChange(cell.id, value || '')}
              onMount={(editor) => {
                setEditorInstances(prev => ({
                  ...prev,
                  [cell.id]: editor
                }));
                
                // Set minimum height
                const contentHeight = Math.max(
                  100,
                  Math.min(400, editor.getContentHeight())
                );
                editor.layout({ width: editor.getLayoutInfo().width, height: contentHeight });
                
                // Auto-adjust height on content change
                editor.onDidContentSizeChange(() => {
                  const contentHeight = Math.max(
                    100, 
                    Math.min(400, editor.getContentHeight())
                  );
                  editor.layout({ width: editor.getLayoutInfo().width, height: contentHeight });
                });
              }}
            />
          )}
        </div>
        
        {/* Cell outputs */}
        {isCode && cell.outputs && cell.outputs.length > 0 && (
          <div className="cell-outputs p-4 border-t border-gray-200 bg-gray-50">
            {cell.outputs.map((output, i) => {
              if (output.output_type === 'stream') {
                return (
                  <pre key={i} className="whitespace-pre-wrap font-mono text-sm">
                    {output.text}
                  </pre>
                );
              } else if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
                // Handle different MIME types
                if (output.data && output.data['text/html']) {
                  return (
                    <div 
                      key={i} 
                      className="html-output"
                      dangerouslySetInnerHTML={{ __html: output.data['text/html'] }}
                    />
                  );
                } else if (output.data && output.data['image/png']) {
                  return (
                    <img 
                      key={i} 
                      src={`data:image/png;base64,${output.data['image/png']}`} 
                      alt="Cell output" 
                      className="max-w-full"
                    />
                  );
                } else if (output.data && output.data['text/plain']) {
                  return (
                    <pre key={i} className="whitespace-pre-wrap font-mono text-sm">
                      {output.data['text/plain']}
                    </pre>
                  );
                }
              } else if (output.output_type === 'error') {
                return (
                  <div key={i} className="error-output text-red-600 font-mono text-sm whitespace-pre-wrap">
                    <div className="font-bold">{output.ename}: {output.evalue}</div>
                    {output.traceback && (
                      <pre className="mt-2">
                        {Array.isArray(output.traceback) 
                          ? output.traceback.join('\n') 
                          : output.traceback}
                      </pre>
                    )}
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}
        
        {/* Add cell button */}
        <div className="add-cell-button flex justify-center -mb-4 opacity-0 hover:opacity-100 transition-opacity">
          <Button
            variant={ButtonVariant.GHOST}
            size={ButtonSize.SMALL}
            className="rounded-full"
            onClick={() => handleAddCell(index)}
            ariaLabel="Add cell"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }, [
    activeCellId, 
    cellStates, 
    editorOptions, 
    executionStates, 
    handleCellChange, 
    hasWorkspacePermission, 
    handleAddCell
  ]);

  /**
   * Renders the toolbar for a specific cell with actions
   */
  const renderCellToolbar = useCallback((cell: Cell) => {
    const isExecuting = executionStates[cell.id] === ExecutionState.BUSY;
    
    return (
      <div className="flex space-x-1">
        {cell.cellType === CellType.CODE && (
          <Button
            variant={ButtonVariant.GHOST}
            size={ButtonSize.SMALL}
            className="rounded-full"
            disabled={!hasWorkspacePermission(WorkspacePermissions.EXECUTE) || isExecuting}
            isLoading={isExecuting}
            onClick={() => handleExecuteCell(cell.id)}
            ariaLabel="Execute cell"
          >
            <PlayIcon className="h-4 w-4" />
          </Button>
        )}
        
        <Button
          variant={ButtonVariant.GHOST}
          size={ButtonSize.SMALL}
          className="rounded-full"
          disabled={!hasWorkspacePermission(WorkspacePermissions.EDIT)}
          onClick={() => handleCellTypeChange(cell.id, cell.cellType)}
          ariaLabel={`Change to ${cell.cellType === CellType.CODE ? 'markdown' : 'code'}`}
        >
          {cell.cellType === CellType.CODE ? 'M' : 'C'}
        </Button>
        
        <Button
          variant={ButtonVariant.GHOST}
          size={ButtonSize.SMALL}
          className="rounded-full"
          disabled={!hasWorkspacePermission(WorkspacePermissions.EDIT)}
          onClick={() => handleDeleteCell(cell.id)}
          ariaLabel="Delete cell"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
        
        <Button
          variant={ButtonVariant.GHOST}
          size={ButtonSize.SMALL}
          className="rounded-full"
          disabled={!hasWorkspacePermission(WorkspacePermissions.EDIT)}
          onClick={() => {
            const cellIndex = currentNotebook?.cells.findIndex(c => c.id === cell.id) || 0;
            handleAddCell(cellIndex, cell.cellType);
          }}
          ariaLabel="Duplicate cell"
        >
          <DocumentDuplicateIcon className="h-4 w-4" />
        </Button>
      </div>
    );
  }, [
    executionStates,
    hasWorkspacePermission,
    handleExecuteCell,
    handleCellTypeChange,
    handleDeleteCell,
    handleAddCell,
    currentNotebook
  ]);

  /**
   * Renders the main notebook toolbar with global actions
   */
  const renderNotebookToolbar = useCallback(() => {
    return (
      <div className="notebook-toolbar flex justify-between items-center mb-4 p-2 bg-gray-50 rounded-md">
        <div className="left-buttons flex space-x-2">
          <Button
            variant={ButtonVariant.OUTLINE}
            size={ButtonSize.SMALL}
            disabled={!hasWorkspacePermission(WorkspacePermissions.EDIT)}
            onClick={() => handleAddCell(-1)}
            ariaLabel="Add cell at beginning"
          >
            Add Cell <PlusIcon className="h-4 w-4 ml-1 inline-block" />
          </Button>
          
          <Button
            variant={ButtonVariant.OUTLINE}
            size={ButtonSize.SMALL}
            disabled={!hasWorkspacePermission(WorkspacePermissions.EDIT) || !currentNotebook}
            onClick={() => {
              if (currentNotebook) {
                onSave?.(currentNotebook);
              }
            }}
            ariaLabel="Save notebook"
          >
            Save
          </Button>
        </div>
        
        <div className="right-buttons flex space-x-2">
          <Button
            variant={ButtonVariant.OUTLINE}
            size={ButtonSize.SMALL}
            disabled={!hasWorkspacePermission(WorkspacePermissions.EXECUTE)}
            onClick={() => {
              // Restart kernel - would be implemented with a backend endpoint
              console.log('Restart kernel');
            }}
            ariaLabel="Restart kernel"
          >
            <ArrowPathIcon className="h-4 w-4" /> Restart Kernel
          </Button>
        </div>
      </div>
    );
  }, [currentNotebook, handleAddCell, hasWorkspacePermission, onSave]);

  // Render loading spinner
  if (loading) {
    return (
      <div className={clsx('jupyter-notebook-loading flex justify-center items-center p-10', className)}>
        <Spinner size={SpinnerSize.LARGE} />
      </div>
    );
  }

  // Render error state
  if (error || !currentNotebook) {
    return (
      <div className={clsx('jupyter-notebook-error p-4 text-red-600', className)}>
        <h3 className="text-lg font-semibold mb-2">Failed to load notebook</h3>
        <p>{error || 'Notebook not found'}</p>
      </div>
    );
  }

  // Render notebook
  return (
    <div className={clsx('jupyter-notebook', className)}>
      {/* Notebook header */}
      <div className="notebook-header mb-4">
        <h2 className="text-xl font-semibold">{currentNotebook.name}</h2>
        {currentNotebook.description && (
          <p className="text-gray-600 mt-1">{currentNotebook.description}</p>
        )}
        
        {/* Collaborators */}
        {Object.keys(collaborators).length > 0 && (
          <div className="collaborators mt-2 flex items-center">
            <span className="text-sm text-gray-500 mr-2">Collaborating:</span>
            <div className="flex -space-x-2">
              {Object.entries(collaborators).map(([userId, data]) => (
                <div 
                  key={userId}
                  className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: data.color }}
                  title={data.name}
                >
                  {data.name.substring(0, 1).toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Notebook toolbar */}
      {renderNotebookToolbar()}
      
      {/* Notebook cells */}
      <div className="notebook-cells">
        {currentNotebook.cells.length === 0 ? (
          <div className="empty-notebook text-center p-10 bg-gray-50 rounded-md">
            <p className="text-gray-500 mb-4">This notebook is empty</p>
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={() => handleAddCell(-1)}
              disabled={!hasWorkspacePermission(WorkspacePermissions.EDIT)}
            >
              Add Cell <PlusIcon className="h-4 w-4 ml-1 inline-block" />
            </Button>
          </div>
        ) : (
          currentNotebook.cells
            .sort((a, b) => a.order - b.order)
            .map((cell, index) => renderCell(cell, index))
        )}
      </div>
      
      {/* Add cell button at end */}
      {currentNotebook.cells.length > 0 && (
        <div className="add-cell-end flex justify-center mt-4">
          <Button
            variant={ButtonVariant.OUTLINE}
            onClick={() => handleAddCell(currentNotebook.cells.length - 1)}
            disabled={!hasWorkspacePermission(WorkspacePermissions.EDIT)}
          >
            Add Cell <PlusIcon className="h-4 w-4 ml-1 inline-block" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default JupyterNotebook;