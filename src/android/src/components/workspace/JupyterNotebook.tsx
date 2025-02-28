import React from 'react'; // ^18.2.0
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  StyleProp,
} from 'react'; // ^18.2.0
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  ViewStyle,
} from 'react-native'; // 0.72.x
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'; // ^9.2.0
import Markdown from 'react-native-markdown-display'; // ^7.0.0-alpha.2
import SyntaxHighlighter from 'react-native-syntax-highlighter'; // ^2.1.0
import WebView from 'react-native-webview'; // ^13.3.1

// Internal imports
import useWorkspace from '../../hooks/useWorkspace';
import useAuth from '../../hooks/useAuth';
import {
  Notebook,
  Cell,
  CellType,
  ExecutionState,
  CellFormValues,
  WorkspacePermissions,
} from '../../types/workspace.types';
import Button from '../common/Button';
import { ButtonVariant, ButtonSize } from '../common/Button';
import Card from '../common/Card';
import { CardVariant } from '../common/Card';
import Spinner from '../common/Spinner';
import { SpinnerSize } from '../common/Spinner';
import { colors } from '../../styles/colors';
import { spacing, shadow } from '../../styles/layout';

// Global constants
const DEFAULT_CELL_SOURCE = '# New Cell\n\nEnter your content here...';
const DEFAULT_CODE_CELL_SOURCE = '# Enter your code here\n\n';
const OUTPUT_MIME_TYPES = ['text/plain', 'text/html', 'image/png', 'image/jpeg', 'application/json'];

/**
 * Props interface for JupyterNotebook component
 */
export interface JupyterNotebookProps {
  notebookId: string;
  workspaceId: string;
  onSave: (notebook: Notebook) => void;
  readOnly?: boolean;
  autoSave?: boolean;
  showToolbar?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Props interface for CodeCell component
 */
export interface CodeCellProps {
  cell: Cell;
  onUpdate: (cellId: string, data: Partial<CellFormValues>) => Promise<void>;
  onExecute: (cellId: string) => Promise<void>;
  onDelete: (cellId: string) => Promise<void>;
  readOnly?: boolean;
  isEditing: boolean;
  setEditingCellId: (cellId: string | null) => void;
}

/**
 * Props interface for MarkdownCell component
 */
export interface MarkdownCellProps {
  cell: Cell;
  onUpdate: (cellId: string, data: Partial<CellFormValues>) => Promise<void>;
  onDelete: (cellId: string) => Promise<void>;
  readOnly?: boolean;
  isEditing: boolean;
  setEditingCellId: (cellId: string | null) => void;
}

/**
 * Props interface for CellOutput component
 */
export interface CellOutputProps {
  output: any;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * Main component for displaying and interacting with Jupyter notebooks
 */
const JupyterNotebook: React.FC<JupyterNotebookProps> = ({
  notebookId,
  workspaceId,
  onSave,
  readOnly = false,
  autoSave = true,
  showToolbar = true,
  style,
}) => {
  // Access workspace state and notebook operations from useWorkspace hook
  const { workspaceState, getNotebook, updateNotebook, addCell, updateCell, executeCell, deleteCell } = useWorkspace();

  // Initialize loading state and editor states with useState
  const [loading, setLoading] = useState(true);
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [editingCellId, setEditingCellId] = useState<string | null>(null);

  // Set up useEffect to fetch notebook data when component mounts
  useEffect(() => {
    const fetchNotebook = async () => {
      setLoading(true);
      try {
        const fetchedNotebook = await getNotebook(notebookId);
        setNotebook(fetchedNotebook);
      } catch (error) {
        Alert.alert('Error', 'Failed to load notebook');
      } finally {
        setLoading(false);
      }
    };

    fetchNotebook();
  }, [notebookId, getNotebook]);

  // Handle permissions checking with useAuth hook
  const { hasPermission } = useAuth();
  const canEdit = useMemo(() => hasPermission(WorkspacePermissions.EDIT), [hasPermission]);

  // Implement handlers for adding, updating, executing, and deleting cells
  const handleAddCell = useCallback(async (cellType: CellType) => {
    if (!notebook) return;

    const newCellOrder = notebook.cells.length > 0 ? Math.max(...notebook.cells.map(c => c.order)) + 1 : 1;

    const newCellData: CellFormValues = {
      cellType: cellType,
      source: cellType === CellType.CODE ? DEFAULT_CODE_CELL_SOURCE : DEFAULT_CELL_SOURCE,
      order: newCellOrder,
      notebookId: notebook.id,
    };

    try {
      const newCell = await addCell(notebook.id, newCellData);
      if (newCell) {
        setNotebook(prevNotebook => {
          if (!prevNotebook) return prevNotebook;
          return { ...prevNotebook, cells: [...prevNotebook.cells, newCell] };
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add cell');
    }
  }, [notebook, addCell]);

  const handleUpdateCell = useCallback(async (cellId: string, data: Partial<CellFormValues>) => {
    if (!notebook) return;

    try {
      await updateCell(notebook.id, cellId, data);
      setNotebook(prevNotebook => {
        if (!prevNotebook) return prevNotebook;
        const updatedCells = prevNotebook.cells.map(cell =>
          cell.id === cellId ? { ...cell, ...data } : cell
        );
        return { ...prevNotebook, cells: updatedCells };
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to update cell');
    }
  }, [notebook, updateCell]);

  const handleExecuteCell = useCallback(async (cellId: string) => {
    if (!notebook) return;

    try {
      await executeCell(notebook.id, cellId);
      setNotebook(prevNotebook => {
        if (!prevNotebook) return prevNotebook;
        const updatedCells = prevNotebook.cells.map(cell => {
          if (cell.id === cellId) {
            return { ...cell, isExecuting: true };
          }
          return cell;
        });
        return { ...prevNotebook, cells: updatedCells };
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to execute cell');
    }
  }, [notebook, executeCell]);

  const handleDeleteCell = useCallback(async (cellId: string) => {
    if (!notebook) return;

    Alert.alert(
      'Delete Cell',
      'Are you sure you want to delete this cell?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: async () => {
            try {
              await deleteCell(notebook.id, cellId);
              setNotebook(prevNotebook => {
                if (!prevNotebook) return prevNotebook;
                const updatedCells = prevNotebook.cells.filter(cell => cell.id !== cellId);
                return { ...prevNotebook, cells: updatedCells };
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to delete cell');
            }
          },
        },
      ],
      { cancelable: false }
    );
  }, [notebook, deleteCell]);

  // Create optimized cell rendering with useMemo
  const renderCells = useMemo(() => {
    if (!notebook) return null;

    return notebook.cells.sort((a, b) => a.order - b.order).map(cell => {
      if (cell.cellType === CellType.CODE) {
        return (
          <CodeCell
            key={cell.id}
            cell={cell}
            onUpdate={handleUpdateCell}
            onExecute={handleExecuteCell}
            onDelete={handleDeleteCell}
            readOnly={readOnly || !canEdit}
            isEditing={editingCellId === cell.id}
            setEditingCellId={setEditingCellId}
          />
        );
      } else if (cell.cellType === CellType.MARKDOWN) {
        return (
          <MarkdownCell
            key={cell.id}
            cell={cell}
            onUpdate={handleUpdateCell}
            onDelete={handleDeleteCell}
            readOnly={readOnly || !canEdit}
            isEditing={editingCellId === cell.id}
            setEditingCellId={setEditingCellId}
          />
        );
      } else {
        return <Text key={cell.id}>Unsupported cell type</Text>;
      }
    });
  }, [notebook, handleUpdateCell, handleExecuteCell, handleDeleteCell, readOnly, canEdit, editingCellId]);

  // Implement cell type switching functionality
  const switchCellType = useCallback((cellId: string, newCellType: CellType) => {
    handleUpdateCell(cellId, { cellType: newCellType });
  }, [handleUpdateCell]);

  // Set up auto-save functionality with debounced cell updates
  const debouncedUpdateCell = useCallback(
    debounce((cellId: string, data: Partial<CellFormValues>) => {
      handleUpdateCell(cellId, data);
    }, 500),
    [handleUpdateCell]
  );

  return (
    <SafeAreaView style={[styles.safeArea, style]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <Text style={styles.title}>{notebook?.name}</Text>
            </View>
            {renderCells}
            {!readOnly && canEdit && (
              <Button
                title="Add Cell"
                onPress={() => handleAddCell(CellType.CODE)}
                variant={ButtonVariant.SECONDARY}
                size={ButtonSize.SMALL}
                style={styles.addCellButton}
              />
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};

/**
 * Component for rendering and interacting with code cells
 */
const CodeCell: React.FC<CodeCellProps> = ({
  cell,
  onUpdate,
  onExecute,
  onDelete,
  readOnly = false,
  isEditing,
  setEditingCellId,
}) => {
  // Implement state for tracking editing mode
  const [isExecuting, setIsExecuting] = useState(false);

  // Set up reference to TextInput for focus management
  const textInputRef = useRef<TextInput>(null);

  // Render code editor with syntax highlighting when in edit mode
  // Render code display with syntax highlighting when not editing
  // Display execution status and execution count
  // Render cell outputs based on MIME type
  // Implement execution button with loading state
  // Add edit/save toggle button
  // Provide delete button with confirmation
  // Handle focus and blur events for editing
  // Apply appropriate styling for mobile view

  return (
    <Card style={styles.cellContainer}>
      <View style={styles.cellHeader}>
        <Text style={styles.cellHeaderText}>Code</Text>
        <View style={styles.cellActions}>
          {!readOnly && (
            <>
              <TouchableOpacity
                onPress={() => setEditingCellId(isEditing ? null : cell.id)}
                style={styles.actionButton}
              >
                <MaterialIcons name={isEditing ? 'save' : 'edit'} size={24} color={colors.primary[500]} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDelete(cell.id)} style={styles.actionButton}>
                <MaterialIcons name="delete" size={24} color={colors.error[500]} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
      {isEditing ? (
        <TextInput
          ref={textInputRef}
          style={styles.codeEditor}
          value={cell.source}
          multiline
          onChangeText={text => onUpdate(cell.id, { source: text })}
          onBlur={() => setEditingCellId(null)}
          autoFocus
        />
      ) : (
        <SyntaxHighlighter
          style={styles.codeDisplay}
          language="javascript"
          value={cell.source}
          highlighter={{ style: styles.codeHighlight }}
        />
      )}
      <View style={styles.cellOutput}>
        {cell.outputs && cell.outputs.map((output, index) => (
          <CellOutput key={index} output={output} />
        ))}
      </View>
      <TouchableOpacity
        onPress={() => onExecute(cell.id)}
        style={styles.executeButton}
        disabled={isExecuting}
      >
        {isExecuting ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Text style={styles.executeButtonText}>Execute</Text>
        )}
      </TouchableOpacity>
    </Card>
  );
};

/**
 * Component for rendering and editing markdown cells
 */
const MarkdownCell: React.FC<MarkdownCellProps> = ({
  cell,
  onUpdate,
  onDelete,
  readOnly = false,
  isEditing,
  setEditingCellId,
}) => {
  // Implement state for tracking editing mode
  // Set up reference to TextInput for focus management
  // Render TextInput with markdown content when in edit mode
  // Render Markdown component with rendered content when not editing
  // Implement edit/preview toggle button
  // Provide delete button with confirmation
  // Handle focus and blur events for editing
  // Apply appropriate styling for mobile view

  return (
    <Card style={styles.cellContainer}>
      <View style={styles.cellHeader}>
        <Text style={styles.cellHeaderText}>Markdown</Text>
        <View style={styles.cellActions}>
          {!readOnly && (
            <>
              <TouchableOpacity
                onPress={() => setEditingCellId(isEditing ? null : cell.id)}
                style={styles.actionButton}
              >
                <MaterialIcons name={isEditing ? 'save' : 'edit'} size={24} color={colors.primary[500]} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDelete(cell.id)} style={styles.actionButton}>
                <MaterialIcons name="delete" size={24} color={colors.error[500]} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
      {isEditing ? (
        <TextInput
          style={styles.markdownEditor}
          value={cell.source}
          multiline
          onChangeText={text => onUpdate(cell.id, { source: text })}
          onBlur={() => setEditingCellId(null)}
          autoFocus
        />
      ) : (
        <Markdown style={markdownStyles}>{cell.source}</Markdown>
      )}
    </Card>
  );
};

/**
 * Component for rendering cell execution outputs
 */
const CellOutput: React.FC<CellOutputProps> = ({ output }) => {
  // Destructure props to get output data
  // Determine appropriate renderer based on output MIME type
  // Render text output for text/plain
  // Render WebView for HTML content
  // Render Image for image outputs
  // Render JSON viewer for JSON outputs
  // Handle error outputs with appropriate styling
  // Provide collapsible UI for large outputs
  // Apply styling based on output type

  const renderer = determineOutputRenderer(output);

  switch (renderer) {
    case 'text/plain':
      return <Text style={styles.output}>{output.text}</Text>;
    case 'text/html':
      return <WebView source={{ html: output.data }} style={styles.webView} />;
    case 'image/png':
    case 'image/jpeg':
      return <Text>Image Output</Text>; // Implement image rendering
    case 'application/json':
      return <Text>JSON Output</Text>; // Implement JSON rendering
    case 'error':
      return <Text style={styles.errorOutput}>{output.traceback.join('\n')}</Text>;
    default:
      return <Text>Unsupported output type</Text>;
  }
};

/**
 * Helper function to determine the appropriate renderer for a cell output
 */
const determineOutputRenderer = (output: any): string => {
  if (output.output_type === 'stream') {
    return 'text/plain';
  } else if (output.output_type === 'display_data' || output.output_type === 'execute_result') {
    if (output.data['text/html']) {
      return 'text/html';
    } else if (output.data['image/png']) {
      return 'image/png';
    } else if (output.data['image/jpeg']) {
      return 'image/jpeg';
    } else if (output.data['application/json']) {
      return 'application/json';
    } else {
      return 'text/plain';
    }
  } else if (output.output_type === 'error') {
    return 'error';
  }
  return 'text/plain';
};

/**
 * Utility function to debounce cell updates
 */
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function(...args: any) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.m,
  },
  header: {
    marginBottom: spacing.l,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  cellContainer: {
    marginBottom: spacing.m,
  },
  cellHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  cellHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.secondary,
  },
  cellActions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: spacing.s,
  },
  codeEditor: {
    height: 150,
    borderColor: colors.gray[400],
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.s,
    fontSize: 14,
    color: colors.text.primary,
  },
  codeDisplay: {
    padding: spacing.s,
  },
  codeHighlight: {
    backgroundColor: colors.background.secondary,
  },
  markdownEditor: {
    height: 150,
    borderColor: colors.gray[400],
    borderWidth: 1,
    borderRadius: 4,
    padding: spacing.s,
    fontSize: 14,
    color: colors.text.primary,
  },
  cellOutput: {
    marginTop: spacing.s,
  },
  output: {
    fontSize: 14,
    color: colors.text.primary,
    padding: spacing.s,
    backgroundColor: colors.background.secondary,
    borderRadius: 4,
  },
  errorOutput: {
    fontSize: 14,
    color: colors.error[500],
    padding: spacing.s,
    backgroundColor: colors.background.secondary,
    borderRadius: 4,
  },
  webView: {
    height: 200,
  },
  addCellButton: {
    marginTop: spacing.l,
  },
  executeButton: {
    backgroundColor: colors.primary[500],
    padding: spacing.s,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: spacing.s,
  },
  executeButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 16,
    color: colors.text.primary,
  },
});

export default JupyterNotebook;