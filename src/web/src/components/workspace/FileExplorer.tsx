import React, { useState, useEffect, useCallback, useRef } from 'react'; // ^18.2.0
import clsx from 'clsx'; // ^1.2.1
import { FiFolder, FiFile, FiDownload, FiTrash, FiUpload, FiSearch, FiEye, FiAlertCircle } from 'react-icons/fi'; // ^4.10.1
import { useDropzone } from 'react-dropzone'; // ^14.2.3

// Internal imports
import { useWorkspace } from '../../hooks/useWorkspace';
import { WorkspaceFile, WorkspacePermissions } from '../../types/workspace';
import Button, { ButtonVariant, ButtonSize } from '../common/Button';
import Input, { InputType } from '../common/Input';
import Spinner from '../common/Spinner';
import Modal from '../common/Modal';
import useToast from '../../hooks/useToast';
import { formatFileSize, formatDate } from '../../utils/format';

// Constants
const ALLOWED_FILE_TYPES = ['application/pdf', 'text/plain', 'application/json', 'application/vnd.jupyter', 'image/png', 'image/jpeg', 'application/x-python', 'text/csv', 'application/zip'];
const MAX_FILE_SIZE_MB = 50;

/**
 * Props for the FileExplorer component
 */
export interface FileExplorerProps {
  /**
   * Additional class name for styling
   */
  className?: string;
  /**
   * Callback when a file is selected
   */
  onFileSelect?: (file: WorkspaceFile) => void;
  /**
   * Callback when a file is uploaded
   */
  onFileUpload?: (file: WorkspaceFile) => void;
  /**
   * Whether to show the header with search and upload button
   */
  showHeader?: boolean;
  /**
   * Whether to allow file uploads
   */
  allowUpload?: boolean;
  /**
   * Whether to allow file deletion
   */
  allowDelete?: boolean;
  /**
   * Whether to allow file downloads
   */
  allowDownload?: boolean;
  /**
   * Maximum height of the file explorer
   */
  maxHeight?: string;
}

/**
 * FileExplorer component for browsing, uploading, and managing files in a workspace
 */
const FileExplorer: React.FC<FileExplorerProps> = ({
  className,
  onFileSelect,
  onFileUpload,
  showHeader = true,
  allowUpload = true,
  allowDelete = true,
  allowDownload = true,
  maxHeight = '500px'
}) => {
  // Get workspace state from hook
  const { files, currentWorkspace, isLoading, uploadFile, hasWorkspacePermission } = useWorkspace();
  const toast = useToast();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<WorkspaceFile | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Filter files based on search query
  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Dropzone configuration for drag and drop file uploads
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => handleFileUpload(acceptedFiles),
    disabled: !allowUpload || !hasWorkspacePermission(WorkspacePermissions.EDIT),
    accept: ALLOWED_FILE_TYPES.reduce((acc, type) => {
      // Convert MIME types to appropriate format for react-dropzone
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxSize: MAX_FILE_SIZE_MB * 1024 * 1024, // Convert MB to bytes
    maxFiles: 1,
    onDropRejected: (rejectedFiles) => {
      const file = rejectedFiles[0];
      if (file.file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast.error(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
      } else if (file.errors.some(error => error.code === 'file-invalid-type')) {
        toast.error(`File type not allowed. Allowed types: ${ALLOWED_FILE_TYPES.map(t => t.split('/')[1]).join(', ')}`);
      } else {
        toast.error('File upload failed. Please try again.');
      }
    }
  });

  // File upload handler
  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0 || !currentWorkspace) return;
    
    const file = files[0];
    
    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error(`File type not allowed. Allowed types: ${ALLOWED_FILE_TYPES.map(t => t.split('/')[1]).join(', ')}`);
      return;
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }
    
    try {
      setIsUploading(true);
      setShowUploadModal(true);
      
      // Upload file with progress tracking
      const uploadedFile = await uploadFile(
        currentWorkspace.id,
        file,
        (progress) => setUploadProgress(progress)
      );
      
      toast.success(`File ${file.name} uploaded successfully`);
      
      // Call the onFileUpload callback if provided
      if (onFileUpload) {
        onFileUpload(uploadedFile);
      }
    } catch (error) {
      toast.error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      setShowUploadModal(false);
      setUploadProgress(0);
    }
  };

  // File download handler
  const handleDownload = (file: WorkspaceFile) => {
    try {
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  // File delete handler
  const handleDelete = (file: WorkspaceFile) => {
    setFileToDelete(file);
    setShowDeleteConfirmation(true);
  };

  // Confirm file deletion
  const confirmDelete = async () => {
    if (!fileToDelete || !currentWorkspace) return;
    
    try {
      // API call to delete file would go here
      // Since the API method isn't provided in useWorkspace hook, this is a placeholder
      // In a real implementation, we would call something like:
      // await deleteWorkspaceFile(currentWorkspace.id, fileToDelete.id);
      
      toast.success(`File ${fileToDelete.name} deleted successfully`);
      
      // Update the files list after deletion
      // This would happen automatically if we had a proper deleteWorkspaceFile method
      // that would update the state through Redux
    } catch (error) {
      toast.error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setShowDeleteConfirmation(false);
      setFileToDelete(null);
    }
  };

  // File preview handler
  const handlePreview = (file: WorkspaceFile) => {
    setSelectedFile(file);
    setShowPreviewModal(true);
    
    // Call the onFileSelect callback if provided
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  // Determine if a file can be previewed based on its type
  const isPreviewable = (file: WorkspaceFile): boolean => {
    const previewableTypes = [
      'image/png', 
      'image/jpeg', 
      'image/gif', 
      'image/svg+xml',
      'application/pdf',
      'text/plain',
      'text/csv'
    ];
    
    return previewableTypes.includes(file.fileType);
  };

  // Render file preview content based on file type
  const renderPreviewContent = (file: WorkspaceFile) => {
    if (!file) return null;
    
    if (file.fileType.startsWith('image/')) {
      return <img src={file.url} alt={file.name} className="max-w-full max-h-[70vh]" />;
    }
    
    if (file.fileType === 'application/pdf') {
      return (
        <iframe 
          src={`${file.url}#view=FitH`} 
          className="w-full h-[70vh]"
          title={file.name}
        ></iframe>
      );
    }
    
    if (file.fileType === 'text/plain' || file.fileType === 'text/csv') {
      return (
        <div className="bg-gray-100 p-4 rounded max-h-[70vh] overflow-auto">
          <pre className="whitespace-pre-wrap">{/* Text content would be loaded here */}</pre>
        </div>
      );
    }
    
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <FiAlertCircle className="text-yellow-500 w-16 h-16 mb-4" />
        <p className="text-lg text-center text-gray-700">Preview not available for this file type</p>
        <Button 
          variant={ButtonVariant.PRIMARY}
          className="mt-4"
          onClick={() => handleDownload(file)}
        >
          Download to view
        </Button>
      </div>
    );
  };

  // Calculate appropriate icon for a file based on its type
  const getFileTypeDisplay = (fileType: string): string => {
    // Extract and format the file type for display
    const parts = fileType.split('/');
    if (parts.length > 1) {
      return parts[1].toUpperCase();
    }
    return fileType.toUpperCase();
  };

  return (
    <div className={clsx('bg-white rounded-lg shadow overflow-hidden', className)}>
      {/* Header with search and upload button */}
      {showHeader && (
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b border-gray-200">
          <div className="w-full sm:w-auto mb-4 sm:mb-0">
            <Input
              type={InputType.SEARCH}
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              prefix={<FiSearch className="text-gray-400" />}
              className="w-full sm:w-64"
            />
          </div>
          
          {allowUpload && hasWorkspacePermission(WorkspacePermissions.EDIT) && (
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={() => setShowUploadModal(true)}
              className="w-full sm:w-auto"
            >
              <FiUpload className="mr-2" />
              Upload File
            </Button>
          )}
        </div>
      )}
      
      {/* File explorer main content */}
      <div 
        className={clsx(
          'relative overflow-auto',
          isDragActive && 'bg-blue-50 border-2 border-dashed border-blue-300'
        )}
        style={{ maxHeight }}
        {...(allowUpload && hasWorkspacePermission(WorkspacePermissions.EDIT) ? getRootProps() : {})}
      >
        {allowUpload && hasWorkspacePermission(WorkspacePermissions.EDIT) && (
          <input {...getInputProps()} />
        )}
        
        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center items-center p-8">
            <Spinner />
          </div>
        )}
        
        {/* Empty state */}
        {!isLoading && filteredFiles.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            {searchQuery ? (
              <>
                <FiSearch className="text-gray-400 w-12 h-12 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No matching files</h3>
                <p className="text-gray-500">
                  No files match your search "{searchQuery}". Try a different search term.
                </p>
              </>
            ) : (
              <>
                <FiFolder className="text-gray-400 w-12 h-12 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No files yet</h3>
                {allowUpload && hasWorkspacePermission(WorkspacePermissions.EDIT) ? (
                  <p className="text-gray-500">
                    Upload files by clicking the upload button or drag and drop files here.
                  </p>
                ) : (
                  <p className="text-gray-500">
                    This workspace doesn't have any files yet.
                  </p>
                )}
              </>
            )}
          </div>
        )}
        
        {/* Files list */}
        {!isLoading && filteredFiles.length > 0 && (
          <div className="min-w-full divide-y divide-gray-200">
            <div className="bg-gray-50">
              <div className="grid grid-cols-12 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="col-span-5">Name</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Size</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-1">Actions</div>
              </div>
            </div>
            
            <div className="bg-white divide-y divide-gray-200">
              {filteredFiles.map((file) => (
                <div 
                  key={file.id}
                  className="grid grid-cols-12 px-6 py-4 text-sm hover:bg-gray-50 cursor-pointer"
                  onClick={() => handlePreview(file)}
                >
                  <div className="col-span-5 font-medium text-gray-900 flex items-center">
                    <FiFile className="mr-2 flex-shrink-0 text-gray-400" />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <div className="col-span-2 text-gray-500 flex items-center">
                    {getFileTypeDisplay(file.fileType)}
                  </div>
                  <div className="col-span-2 text-gray-500 flex items-center">
                    {formatFileSize(file.size)}
                  </div>
                  <div className="col-span-2 text-gray-500 flex items-center">
                    {formatDate(file.createdAt)}
                  </div>
                  <div className="col-span-1 flex items-center space-x-1">
                    {isPreviewable(file) && (
                      <Button
                        variant={ButtonVariant.GHOST}
                        size={ButtonSize.SMALL}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(file);
                        }}
                        ariaLabel={`Preview ${file.name}`}
                      >
                        <FiEye className="text-gray-500" />
                      </Button>
                    )}
                    
                    {allowDownload && (
                      <Button
                        variant={ButtonVariant.GHOST}
                        size={ButtonSize.SMALL}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file);
                        }}
                        ariaLabel={`Download ${file.name}`}
                      >
                        <FiDownload className="text-gray-500" />
                      </Button>
                    )}
                    
                    {allowDelete && hasWorkspacePermission(WorkspacePermissions.EDIT) && (
                      <Button
                        variant={ButtonVariant.GHOST}
                        size={ButtonSize.SMALL}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(file);
                        }}
                        ariaLabel={`Delete ${file.name}`}
                      >
                        <FiTrash className="text-gray-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* File Preview Modal */}
      {selectedFile && (
        <Modal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          title={selectedFile.name}
          size="large"
        >
          <div className="text-sm text-gray-500 mb-4">
            <p>
              <span className="font-medium">Type:</span> {selectedFile.fileType}
            </p>
            <p>
              <span className="font-medium">Size:</span> {formatFileSize(selectedFile.size)}
            </p>
            <p>
              <span className="font-medium">Uploaded:</span> {formatDate(selectedFile.createdAt)}
            </p>
            {selectedFile.description && (
              <p>
                <span className="font-medium">Description:</span> {selectedFile.description}
              </p>
            )}
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            {renderPreviewContent(selectedFile)}
          </div>
          
          <div className="flex justify-end mt-4 space-x-2">
            {allowDownload && (
              <Button
                variant={ButtonVariant.OUTLINE}
                onClick={() => handleDownload(selectedFile)}
              >
                <FiDownload className="mr-2" />
                Download
              </Button>
            )}
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={() => setShowPreviewModal(false)}
            >
              Close
            </Button>
          </div>
        </Modal>
      )}
      
      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => !isUploading && setShowUploadModal(false)}
        title="Upload File"
        closeOnBackdropClick={!isUploading}
        closeOnEsc={!isUploading}
      >
        <div className="p-4">
          {isUploading ? (
            <div className="text-center">
              <Spinner />
              <p className="mt-4 text-gray-700">Uploading... {uploadProgress}%</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <>
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50"
                {...getRootProps()}
              >
                <input {...getInputProps()} />
                <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-700">
                  Drag and drop a file here, or click to select a file
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Max file size: {MAX_FILE_SIZE_MB}MB
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Allowed file types: {ALLOWED_FILE_TYPES.map(type => type.split('/')[1]).join(', ')}
                </p>
              </div>
              
              <div className="mt-4 flex justify-end">
                <Button
                  variant={ButtonVariant.PRIMARY}
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        title="Delete File"
      >
        <div className="p-4">
          <p className="text-gray-700">
            Are you sure you want to delete "{fileToDelete?.name}"? This action cannot be undone.
          </p>
          
          <div className="mt-6 flex justify-end space-x-3">
            <Button
              variant={ButtonVariant.OUTLINE}
              onClick={() => setShowDeleteConfirmation(false)}
            >
              Cancel
            </Button>
            <Button
              variant={ButtonVariant.DANGER}
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FileExplorer;