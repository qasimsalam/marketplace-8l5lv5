import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'; // ^18.2.0
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Share,
  StyleProp,
  ViewStyle,
} from 'react-native'; // 0.72.x
import { useNavigation } from '@react-navigation/native'; // ^6.1.7
import Icon from 'react-native-vector-icons/MaterialIcons'; // ^9.2.0
import FileViewer from 'react-native-file-viewer'; // ^2.1.5
import RNFS from 'react-native-fs'; // ^2.20.0
import Toast from 'react-native-toast-message'; // ^2.1.6

import { useWorkspace } from '../../hooks/useWorkspace';
import { WorkspaceFile, WorkspacePermissions } from '../../types/workspace.types';
import Button from '../common/Button';
import { ButtonVariant, ButtonSize } from '../common/Button';
import Input from '../common/Input';
import { InputType } from '../common/Input';
import Card from '../common/Card';
import { CardVariant, CardElevation } from '../common/Card';
import Spinner from '../common/Spinner';
import { formatFileSize, formatDate } from '../../utils/format';

// Global constants for file handling
const ALLOWED_FILE_TYPES = ['application/pdf', 'text/plain', 'application/json', 'application/vnd.jupyter', 'image/png', 'image/jpeg', 'application/x-python', 'text/csv', 'application/zip'];
const MAX_FILE_SIZE_MB = 50;
const FILE_ICONS = {
  pdf: 'picture-as-pdf',
  image: 'image',
  text: 'description',
  code: 'code',
  csv: 'table-chart',
  json: 'data-object',
  zip: 'folder-zip',
  default: 'insert-drive-file'
};

/**
 * Interface defining the props for the FileExplorer component
 */
export interface FileExplorerProps {
  style?: StyleProp<ViewStyle>;
  onFileSelect?: (file: WorkspaceFile) => void;
  onFileUpload?: (file: WorkspaceFile) => void;
  showHeader?: boolean;
  allowUpload?: boolean;
  allowDelete?: boolean;
  allowDownload?: boolean;
  allowShare?: boolean;
  maxHeight?: number | string;
  testID?: string;
}

/**
 * Determines the appropriate icon to display based on file type
 * @param fileType The MIME type of the file
 * @returns The name of the icon to display from MaterialIcons
 */
const getFileIcon = (fileType: string): string => {
  if (fileType.includes('image/')) {
    return 'image';
  }
  if (fileType.includes('text/')) {
    return 'description';
  }
  if (fileType.includes('application/pdf')) {
    return 'picture-as-pdf';
  }
  if (fileType.includes('application/json')) {
    return 'data-object';
  }
  if (fileType.includes('csv')) {
    return 'table-chart';
  }
  if (fileType.includes('python') || fileType.includes('jupyter')) {
    return 'code';
  }
  if (fileType.includes('zip')) {
    return 'folder-zip';
  }
  return 'insert-drive-file';
};

/**
 * Component for browsing, uploading, and managing files in a workspace on mobile
 * @param props - Props for the FileExplorer component
 * @returns Rendered FileExplorer component
 */
const FileExplorer: React.FC<FileExplorerProps> = ({
  style,
  onFileSelect,
  onFileUpload,
  showHeader = true,
  allowUpload = true,
  allowDelete = true,
  allowDownload = true,
  allowShare = true,
  maxHeight = '100%',
  testID = 'file-explorer'
}) => {
  // Access workspace files and functionality from the useWorkspace hook
  const { files, currentWorkspace, loading, pickAndUploadFile, downloadFile, deleteFile, hasWorkspacePermission } = useWorkspace();

  // Initialize state for search query and refreshing state
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null);

  // Navigation hook for file preview navigation
  const navigation = useNavigation();

  // Filter files based on search query using useMemo for performance
  const filteredFiles = useMemo(() => {
    if (!searchQuery) {
      return files;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return files.filter(file => file.name.toLowerCase().includes(lowerCaseQuery));
  }, [files, searchQuery]);

  // Handle file upload
  const handleUpload = useCallback(async () => {
    if (!currentWorkspace) {
      console.warn('No workspace selected for file upload.');
      return;
    }

    try {
      const uploadedFile = await pickAndUploadFile(currentWorkspace.id);
      if (onFileUpload) {
        onFileUpload(uploadedFile);
      }
      Toast.show({
        type: 'success',
        text1: 'File Uploaded',
        text2: `${uploadedFile.name} uploaded successfully.`
      });
    } catch (error: any) {
      console.error('File upload failed:', error);
      Toast.show({
        type: 'error',
        text1: 'File Upload Failed',
        text2: error?.message || 'An error occurred during file upload.'
      });
    }
  }, [currentWorkspace, pickAndUploadFile, onFileUpload]);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh by re-fetching data (replace with actual data fetching logic)
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // Handle file download
  const handleDownload = useCallback(async (file: WorkspaceFile) => {
    try {
      const localPath = await downloadFile(currentWorkspace!.id, file.id);
      Toast.show({
        type: 'success',
        text1: 'File Downloaded',
        text2: `File saved to ${localPath}`
      });
    } catch (error: any) {
      console.error('File download failed:', error);
      Toast.show({
        type: 'error',
        text1: 'File Download Failed',
        text2: error?.message || 'An error occurred during file download.'
      });
    }
  }, [currentWorkspace, downloadFile]);

  // Handle file deletion
  const handleDelete = useCallback((file: WorkspaceFile) => {
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete ${file.name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFile(currentWorkspace!.id, file.id);
              Toast.show({
                type: 'success',
                text1: 'File Deleted',
                text2: `${file.name} deleted successfully.`
              });
            } catch (error: any) {
              console.error('File deletion failed:', error);
              Toast.show({
                type: 'error',
                text1: 'File Deletion Failed',
                text2: error?.message || 'An error occurred during file deletion.'
              });
            }
          }
        }
      ]
    );
  }, [currentWorkspace, deleteFile]);

  // Handle file sharing
  const handleShare = useCallback(async (file: WorkspaceFile) => {
    try {
      await Share.share({
        message: file.url,
        title: `Share ${file.name}`
      });
    } catch (error: any) {
      console.error('File sharing failed:', error);
      Toast.show({
        type: 'error',
        text1: 'File Sharing Failed',
        text2: error?.message || 'An error occurred during file sharing.'
      });
    }
  }, []);

  const handlePreview = useCallback(async (file: WorkspaceFile) => {
    try {
      const localPath = await downloadFile(currentWorkspace!.id, file.id);
      await FileViewer.open(localPath);
    } catch (error: any) {
      console.error('File preview failed:', error);
      Toast.show({
        type: 'error',
        text1: 'File Preview Failed',
        text2: error?.message || 'An error occurred during file preview.'
      });
    }
  }, [currentWorkspace, downloadFile]);

  // Handle file press (select or preview)
  const handleFilePress = useCallback((file: WorkspaceFile) => {
    if (onFileSelect) {
      onFileSelect(file);
    } else {
      handlePreview(file);
    }
  }, [onFileSelect, handlePreview]);

  return (
    <View style={[styles.container, style, { maxHeight }]}>
      {showHeader && (
        <View style={styles.header}>
          <Input
            style={styles.search}
            type={InputType.TEXT}
            label="Search Files"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search files..."
            testID={`${testID}-search-input`}
          />
        </View>
      )}

      {allowUpload && hasWorkspacePermission(WorkspacePermissions.FILE_CREATE) && currentWorkspace && (
        <Button
          style={styles.uploadButton}
          text="Upload File"
          variant={ButtonVariant.SECONDARY}
          size={ButtonSize.SMALL}
          onPress={handleUpload}
          testID={`${testID}-upload-button`}
        />
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <Spinner size={SpinnerSize.MEDIUM} />
        </View>
      ) : filteredFiles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No files found.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFiles}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <Card variant={CardVariant.OUTLINE} style={styles.fileItem} testID={`${testID}-file-item-${item.id}`}>
              <TouchableOpacity style={styles.fileItemTouchable} onPress={() => handleFilePress(item)}>
                <View style={styles.fileInfo}>
                  <Icon name={getFileIcon(item.fileType)} size={30} color="#666" style={styles.fileIcon} />
                  <View>
                    <Text style={styles.fileName}>{item.name}</Text>
                    <Text style={styles.fileDetails}>
                      {formatFileSize(item.size)} - {formatDate(item.createdAt)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              <View style={styles.fileActions}>
                {allowDownload && (
                  <TouchableOpacity onPress={() => handleDownload(item)} style={styles.actionButton} testID={`${testID}-download-button-${item.id}`}>
                    <Icon name="file-download" size={24} color="#333" />
                  </TouchableOpacity>
                )}
                {allowShare && (
                  <TouchableOpacity onPress={() => handleShare(item)} style={styles.actionButton} testID={`${testID}-share-button-${item.id}`}>
                    <Icon name="share" size={24} color="#333" />
                  </TouchableOpacity>
                )}
                {allowDelete && hasWorkspacePermission(WorkspacePermissions.WORKSPACE_EDIT) && (
                  <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionButton} testID={`${testID}-delete-button-${item.id}`}>
                    <Icon name="delete" size={24} color="#333" />
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          style={styles.fileList}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  header: {
    marginBottom: 10,
  },
  search: {
    marginBottom: 0,
  },
  uploadButton: {
    marginBottom: 10,
  },
  fileList: {
    flex: 1,
  },
  fileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    marginBottom: 5,
  },
  fileItemTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIcon: {
    marginRight: 10,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
  },
  fileDetails: {
    fontSize: 12,
    color: '#666',
  },
  fileActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  },
});

export default FileExplorer;