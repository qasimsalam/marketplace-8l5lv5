"""
File Manager Utility for the Collaboration Service.

This module provides functionality for managing files within the collaboration service,
including uploading, downloading, and listing files, as well as specialized handling
for Jupyter notebooks. It supports both local filesystem and S3 cloud storage.
"""
import os
import shutil
import logging
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import uuid
import mimetypes
import asyncio
import aiofiles
from datetime import datetime

# boto3 v1.28.38
import boto3
# botocore v1.31.38 
from botocore.exceptions import ClientError
# nbformat v5.9.2
import nbformat
import json

from ..config import settings

# Configure logger for this module
logger = logging.getLogger(__name__)

# Global S3 client
S3_CLIENT = None

# Regular expression for invalid filename characters
INVALID_FILENAME_CHARS = r'[^a-zA-Z0-9_.-]'

def init_storage() -> None:
    """
    Initialize storage based on configuration settings.
    
    This function checks the storage settings and initializes either local storage
    directories or connects to S3 bucket depending on the configuration.
    """
    global S3_CLIENT
    
    # Initialize S3 client if S3 storage is enabled
    if settings.USE_S3_STORAGE:
        S3_CLIENT = init_s3_client()
        logger.info(f"Initialized S3 storage with bucket: {settings.S3_BUCKET_NAME}")
    
    # Ensure local directories exist regardless of storage mode
    # (we still need local directories for temporary files)
    os.makedirs(settings.FILE_STORAGE_PATH, exist_ok=True)
    os.makedirs(settings.JUPYTER_NOTEBOOK_DIR, exist_ok=True)
    
    logger.info(f"Storage initialized. Mode: {'S3' if settings.USE_S3_STORAGE else 'Local'}")

def init_s3_client() -> boto3.client:
    """
    Initialize the S3 client for cloud storage.
    
    Returns:
        boto3.client: Initialized S3 client
    """
    client = boto3.client('s3')
    
    # Check if the bucket exists
    try:
        client.head_bucket(Bucket=settings.S3_BUCKET_NAME)
        logger.info(f"S3 bucket '{settings.S3_BUCKET_NAME}' exists")
    except ClientError as e:
        error_code = int(e.response['Error']['Code'])
        if error_code == 404:
            # Bucket doesn't exist, create it
            logger.info(f"Creating S3 bucket '{settings.S3_BUCKET_NAME}'")
            client.create_bucket(Bucket=settings.S3_BUCKET_NAME)
        else:
            # Other error occurred
            logger.error(f"Error accessing S3 bucket: {str(e)}")
            raise
    
    return client

def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename to ensure it's safe for filesystem use.
    
    Args:
        filename: The original filename
        
    Returns:
        str: Sanitized filename safe for filesystem use
    """
    if not filename or filename.strip() == '':
        # Generate a random name if no filename is provided
        return f"{uuid.uuid4().hex}.file"
    
    # Replace invalid characters with underscores
    sanitized = re.sub(INVALID_FILENAME_CHARS, '_', filename)
    
    # Remove any leading/trailing periods or spaces
    sanitized = sanitized.strip('. ')
    
    # Remove any path traversal attempts
    sanitized = sanitized.replace('..', '')
    sanitized = os.path.basename(sanitized)
    
    # Limit to 255 characters which is the max filename length on most filesystems
    if len(sanitized) > 255:
        base, ext = os.path.splitext(sanitized)
        sanitized = base[:255-len(ext)] + ext
    
    # If sanitization resulted in an empty string, generate a random name
    if not sanitized:
        return f"{uuid.uuid4().hex}.file"
    
    return sanitized

def generate_storage_path(workspace_id: str, filename: str) -> Path:
    """
    Generate a storage path for a file within a workspace.
    
    Args:
        workspace_id: The ID of the workspace
        filename: The name of the file
        
    Returns:
        Path: Path object for the file
    """
    # Sanitize inputs to prevent path traversal
    safe_workspace_id = sanitize_filename(workspace_id)
    safe_filename = sanitize_filename(filename)
    
    # Create the full path
    storage_path = Path(settings.FILE_STORAGE_PATH) / safe_workspace_id / safe_filename
    
    return storage_path

def is_file_allowed(filename: str) -> bool:
    """
    Check if a file type is allowed based on configuration.
    
    Args:
        filename: The name of the file to check
        
    Returns:
        bool: True if file type is allowed, False otherwise
    """
    if not filename:
        return False
    
    # Extract file extension
    ext = os.path.splitext(filename)[1].lower().lstrip('.')
    
    # Check if extension is in the allowed list
    return ext in settings.ALLOWED_FILE_TYPES

def check_file_size(file_size: int) -> bool:
    """
    Check if file size is within allowed limits.
    
    Args:
        file_size: Size of the file in bytes
        
    Returns:
        bool: True if file size is allowed, False otherwise
    """
    # Convert bytes to MB
    size_mb = file_size / (1024 * 1024)
    
    # Check against max allowed size
    return size_mb <= settings.MAX_FILE_SIZE_MB

def get_mimetype(filename: str) -> str:
    """
    Determine the MIME type of a file.
    
    Args:
        filename: The name of the file
        
    Returns:
        str: MIME type of the file
    """
    mime_type, _ = mimetypes.guess_type(filename)
    
    # Default to binary if type cannot be determined
    if mime_type is None:
        mime_type = 'application/octet-stream'
    
    return mime_type

class FileManager:
    """
    Manages file operations for workspaces and notebooks with support for local and S3 storage.
    
    This class handles all file-related operations including uploads, downloads, 
    listing, and special handling for Jupyter notebooks. It supports both local
    filesystem storage and S3 cloud storage based on configuration.
    """
    
    def __init__(self):
        """
        Initialize the file manager with configuration settings.
        """
        # Initialize storage
        init_storage()
        
        # Set instance variables
        self.use_s3 = settings.USE_S3_STORAGE
        self.s3_client = S3_CLIENT if self.use_s3 else None
        self.bucket_name = settings.S3_BUCKET_NAME
        self.storage_path = Path(settings.FILE_STORAGE_PATH)
        self.notebook_path = Path(settings.JUPYTER_NOTEBOOK_DIR)
        
        # Ensure directories exist
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self.notebook_path.mkdir(parents=True, exist_ok=True)
    
    def upload_file(self, workspace_id: str, filename: str, content: bytes) -> Dict[str, Any]:
        """
        Upload a file to storage.
        
        Args:
            workspace_id: ID of the workspace
            filename: Name of the file
            content: Binary content of the file
            
        Returns:
            dict: File information including path, size, and type
            
        Raises:
            ValueError: If file type is not allowed or file size exceeds limit
        """
        # Check if file type is allowed
        if not is_file_allowed(filename):
            logger.warning(f"File type not allowed: {filename}")
            raise ValueError(f"File type not allowed: {filename}")
        
        # Check file size
        if not check_file_size(len(content)):
            logger.warning(f"File size exceeds limit: {filename}")
            raise ValueError(f"File size exceeds {settings.MAX_FILE_SIZE_MB}MB limit")
        
        # Sanitize filename
        safe_filename = sanitize_filename(filename)
        
        # Generate storage path
        file_path = generate_storage_path(workspace_id, safe_filename)
        
        try:
            if self.use_s3:
                # Ensure the workspace directory exists in S3
                s3_key = f"{workspace_id}/{safe_filename}"
                
                # Upload to S3
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=s3_key,
                    Body=content,
                    ContentType=get_mimetype(safe_filename)
                )
                
                logger.info(f"File uploaded to S3: {s3_key}")
                file_path_str = s3_key
            else:
                # Ensure the workspace directory exists locally
                file_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Write to local file
                with open(file_path, 'wb') as f:
                    f.write(content)
                
                logger.info(f"File uploaded to local storage: {file_path}")
                file_path_str = str(file_path)
            
            # Return file information
            return {
                'path': file_path_str,
                'name': safe_filename,
                'size': len(content),
                'type': get_mimetype(safe_filename),
                'workspace_id': workspace_id,
                'upload_time': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error uploading file {safe_filename}: {str(e)}")
            raise
    
    def download_file(self, file_path: str) -> Tuple[bytes, str, str]:
        """
        Download a file from storage.
        
        Args:
            file_path: Path to the file
            
        Returns:
            tuple: (bytes content, str filename, str mimetype)
            
        Raises:
            FileNotFoundError: If the file doesn't exist
        """
        try:
            if self.use_s3:
                # Parse S3 key from file_path
                s3_key = file_path
                
                # Check if file exists in S3
                try:
                    self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
                except ClientError as e:
                    if e.response['Error']['Code'] == '404':
                        raise FileNotFoundError(f"File not found in S3: {s3_key}")
                    else:
                        raise
                
                # Download from S3
                response = self.s3_client.get_object(Bucket=self.bucket_name, Key=s3_key)
                content = response['Body'].read()
                
                # Extract filename from S3 key
                filename = os.path.basename(s3_key)
                logger.info(f"File downloaded from S3: {s3_key}")
            else:
                # Convert to Path object
                local_path = Path(file_path)
                
                # Check if file exists locally
                if not local_path.exists():
                    raise FileNotFoundError(f"File not found: {local_path}")
                
                # Read from local file
                with open(local_path, 'rb') as f:
                    content = f.read()
                
                filename = local_path.name
                logger.info(f"File downloaded from local storage: {local_path}")
            
            # Determine mimetype
            mimetype = get_mimetype(filename)
            
            return content, filename, mimetype
            
        except Exception as e:
            if isinstance(e, FileNotFoundError):
                raise
            logger.error(f"Error downloading file {file_path}: {str(e)}")
            raise
    
    def delete_file(self, file_path: str) -> bool:
        """
        Delete a file from storage.
        
        Args:
            file_path: Path to the file
            
        Returns:
            bool: True if deletion successful, False otherwise
        """
        try:
            if self.use_s3:
                # Parse S3 key from file_path
                s3_key = file_path
                
                # Check if file exists in S3
                try:
                    self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
                except ClientError as e:
                    if e.response['Error']['Code'] == '404':
                        logger.warning(f"File not found in S3: {s3_key}")
                        return False
                    else:
                        raise
                
                # Delete from S3
                self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
                logger.info(f"File deleted from S3: {s3_key}")
            else:
                # Convert to Path object
                local_path = Path(file_path)
                
                # Check if file exists locally
                if not local_path.exists():
                    logger.warning(f"File not found: {local_path}")
                    return False
                
                # Delete local file
                os.remove(local_path)
                logger.info(f"File deleted from local storage: {local_path}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error deleting file {file_path}: {str(e)}")
            return False
    
    def copy_file(self, source_path: str, target_path: str) -> bool:
        """
        Copy a file to a new location.
        
        Args:
            source_path: Path to the source file
            target_path: Path to the target location
            
        Returns:
            bool: True if copy successful, False otherwise
        """
        try:
            if self.use_s3:
                # Parse S3 keys
                source_key = source_path
                target_key = target_path
                
                # Check if source file exists
                try:
                    self.s3_client.head_object(Bucket=self.bucket_name, Key=source_key)
                except ClientError as e:
                    if e.response['Error']['Code'] == '404':
                        logger.warning(f"Source file not found in S3: {source_key}")
                        return False
                    else:
                        raise
                
                # Copy within S3
                self.s3_client.copy_object(
                    Bucket=self.bucket_name,
                    CopySource={'Bucket': self.bucket_name, 'Key': source_key},
                    Key=target_key
                )
                logger.info(f"File copied in S3: {source_key} -> {target_key}")
            else:
                # Convert to Path objects
                source_local = Path(source_path)
                target_local = Path(target_path)
                
                # Check if source file exists
                if not source_local.exists():
                    logger.warning(f"Source file not found: {source_local}")
                    return False
                
                # Ensure target directory exists
                target_local.parent.mkdir(parents=True, exist_ok=True)
                
                # Copy local file
                shutil.copy2(source_local, target_local)
                logger.info(f"File copied locally: {source_local} -> {target_local}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error copying file {source_path} -> {target_path}: {str(e)}")
            return False
    
    def list_files(self, workspace_id: str, file_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List all files in a workspace.
        
        Args:
            workspace_id: ID of the workspace
            file_type: Optional filter by file extension
            
        Returns:
            list: List of file information dictionaries
        """
        try:
            result = []
            
            if self.use_s3:
                # List objects in S3 with workspace_id prefix
                prefix = f"{workspace_id}/"
                
                response = self.s3_client.list_objects_v2(
                    Bucket=self.bucket_name,
                    Prefix=prefix
                )
                
                if 'Contents' in response:
                    for obj in response['Contents']:
                        key = obj['Key']
                        
                        # Skip if it's a directory marker
                        if key.endswith('/'):
                            continue
                        
                        # Extract filename from key
                        filename = os.path.basename(key)
                        
                        # Filter by file type if specified
                        if file_type:
                            ext = os.path.splitext(filename)[1].lower().lstrip('.')
                            if ext != file_type.lower():
                                continue
                        
                        # Get file metadata
                        file_info = {
                            'path': key,
                            'name': filename,
                            'size': obj['Size'],
                            'type': get_mimetype(filename),
                            'workspace_id': workspace_id,
                            'last_modified': obj['LastModified'].isoformat()
                        }
                        
                        result.append(file_info)
            else:
                # Get workspace directory
                workspace_dir = self.storage_path / workspace_id
                
                # Check if directory exists
                if not workspace_dir.exists():
                    return []
                
                # Scan directory
                for file_path in workspace_dir.glob('*'):
                    if file_path.is_file():
                        filename = file_path.name
                        
                        # Filter by file type if specified
                        if file_type:
                            ext = os.path.splitext(filename)[1].lower().lstrip('.')
                            if ext != file_type.lower():
                                continue
                        
                        # Get file metadata
                        stats = file_path.stat()
                        
                        file_info = {
                            'path': str(file_path),
                            'name': filename,
                            'size': stats.st_size,
                            'type': get_mimetype(filename),
                            'workspace_id': workspace_id,
                            'last_modified': datetime.fromtimestamp(stats.st_mtime).isoformat()
                        }
                        
                        result.append(file_info)
            
            return result
            
        except Exception as e:
            logger.error(f"Error listing files for workspace {workspace_id}: {str(e)}")
            return []
    
    def create_version(self, file_path: str, workspace_id: str) -> str:
        """
        Create a new version of a file.
        
        Args:
            file_path: Path to the file
            workspace_id: ID of the workspace
            
        Returns:
            str: Path to the versioned file
            
        Raises:
            FileNotFoundError: If the source file doesn't exist
        """
        try:
            # Generate version identifier
            timestamp = int(datetime.now().timestamp())
            version_id = f"{timestamp}_{uuid.uuid4().hex[:8]}"
            
            if self.use_s3:
                # Parse S3 key
                s3_key = file_path
                filename = os.path.basename(s3_key)
                
                # Generate versioned key
                name, ext = os.path.splitext(filename)
                versioned_filename = f"{name}_v{version_id}{ext}"
                versioned_key = f"{workspace_id}/versions/{versioned_filename}"
                
                # Copy the file
                success = self.copy_file(s3_key, versioned_key)
                
                if not success:
                    raise FileNotFoundError(f"Failed to create version for file: {s3_key}")
                
                return versioned_key
            else:
                # Convert to Path object
                local_path = Path(file_path)
                
                if not local_path.exists():
                    raise FileNotFoundError(f"File not found: {local_path}")
                
                # Generate versioned path
                filename = local_path.name
                name, ext = os.path.splitext(filename)
                versioned_filename = f"{name}_v{version_id}{ext}"
                
                # Create versions directory
                versions_dir = self.storage_path / workspace_id / 'versions'
                versions_dir.mkdir(parents=True, exist_ok=True)
                
                versioned_path = versions_dir / versioned_filename
                
                # Copy the file
                shutil.copy2(local_path, versioned_path)
                
                return str(versioned_path)
                
        except Exception as e:
            logger.error(f"Error creating version for file {file_path}: {str(e)}")
            raise
    
    def save_notebook(self, notebook: Any, workspace_id: str) -> str:
        """
        Save a Jupyter notebook to storage.
        
        Args:
            notebook: Notebook object or dictionary
            workspace_id: ID of the workspace
            
        Returns:
            str: Path where notebook was saved
            
        Raises:
            ValueError: If notebook is invalid
        """
        try:
            # Ensure notebook is in the right format
            nb = nbformat.from_dict(notebook) if isinstance(notebook, dict) else notebook
            
            # Get notebook filepath
            notebook_name = getattr(notebook, 'metadata', {}).get('filename', f"notebook_{uuid.uuid4().hex[:8]}.ipynb")
            if not notebook_name.endswith('.ipynb'):
                notebook_name += '.ipynb'
            
            # Sanitize filename
            safe_notebook_name = sanitize_filename(notebook_name)
            
            if self.use_s3:
                # Generate S3 key
                s3_key = f"{workspace_id}/notebooks/{safe_notebook_name}"
                
                # Convert notebook to JSON
                notebook_json = json.dumps(nbformat.writes(nb))
                
                # Upload to S3
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=s3_key,
                    Body=notebook_json,
                    ContentType='application/json'
                )
                
                logger.info(f"Notebook saved to S3: {s3_key}")
                return s3_key
            else:
                # Generate local path
                notebook_dir = self.notebook_path / workspace_id
                notebook_dir.mkdir(parents=True, exist_ok=True)
                
                notebook_path = notebook_dir / safe_notebook_name
                
                # Write notebook to file
                with open(notebook_path, 'w', encoding='utf-8') as f:
                    nbformat.write(nb, f)
                
                logger.info(f"Notebook saved locally: {notebook_path}")
                return str(notebook_path)
                
        except Exception as e:
            logger.error(f"Error saving notebook for workspace {workspace_id}: {str(e)}")
            raise
    
    def load_notebook(self, notebook_path: str) -> Dict[str, Any]:
        """
        Load a Jupyter notebook from storage.
        
        Args:
            notebook_path: Path to the notebook
            
        Returns:
            dict: Loaded notebook data structure
            
        Raises:
            FileNotFoundError: If the notebook doesn't exist
        """
        try:
            if self.use_s3:
                # Parse S3 key
                s3_key = notebook_path
                
                # Check if notebook exists
                try:
                    self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
                except ClientError as e:
                    if e.response['Error']['Code'] == '404':
                        raise FileNotFoundError(f"Notebook not found in S3: {s3_key}")
                    else:
                        raise
                
                # Download from S3
                response = self.s3_client.get_object(Bucket=self.bucket_name, Key=s3_key)
                content = response['Body'].read().decode('utf-8')
                
                # Parse JSON content
                notebook = nbformat.reads(content, as_version=4)
                logger.info(f"Notebook loaded from S3: {s3_key}")
            else:
                # Convert to Path object
                local_path = Path(notebook_path)
                
                # Check if notebook exists
                if not local_path.exists():
                    raise FileNotFoundError(f"Notebook not found: {local_path}")
                
                # Read notebook
                with open(local_path, 'r', encoding='utf-8') as f:
                    notebook = nbformat.read(f, as_version=4)
                
                logger.info(f"Notebook loaded from local storage: {local_path}")
            
            return nbformat.to_dict(notebook)
            
        except Exception as e:
            if isinstance(e, FileNotFoundError):
                raise
            logger.error(f"Error loading notebook {notebook_path}: {str(e)}")
            raise
    
    async def async_upload_file(self, workspace_id: str, filename: str, content: bytes) -> Dict[str, Any]:
        """
        Asynchronously upload a file to storage.
        
        Args:
            workspace_id: ID of the workspace
            filename: Name of the file
            content: Binary content of the file
            
        Returns:
            dict: File information including path, size, and type
            
        Raises:
            ValueError: If file type is not allowed or file size exceeds limit
        """
        # Check if file type is allowed
        if not is_file_allowed(filename):
            logger.warning(f"File type not allowed: {filename}")
            raise ValueError(f"File type not allowed: {filename}")
        
        # Check file size
        if not check_file_size(len(content)):
            logger.warning(f"File size exceeds limit: {filename}")
            raise ValueError(f"File size exceeds {settings.MAX_FILE_SIZE_MB}MB limit")
        
        # Sanitize filename
        safe_filename = sanitize_filename(filename)
        
        # Generate storage path
        file_path = generate_storage_path(workspace_id, safe_filename)
        
        try:
            if self.use_s3:
                # For S3, we'll use asyncio.to_thread to make the boto3 call non-blocking
                s3_key = f"{workspace_id}/{safe_filename}"
                
                # Define the S3 upload function
                def s3_upload():
                    self.s3_client.put_object(
                        Bucket=self.bucket_name,
                        Key=s3_key,
                        Body=content,
                        ContentType=get_mimetype(safe_filename)
                    )
                
                # Run in a thread to avoid blocking
                await asyncio.to_thread(s3_upload)
                
                logger.info(f"File asynchronously uploaded to S3: {s3_key}")
                file_path_str = s3_key
            else:
                # Ensure the workspace directory exists locally
                file_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Write to local file asynchronously
                async with aiofiles.open(file_path, 'wb') as f:
                    await f.write(content)
                
                logger.info(f"File asynchronously uploaded to local storage: {file_path}")
                file_path_str = str(file_path)
            
            # Return file information
            return {
                'path': file_path_str,
                'name': safe_filename,
                'size': len(content),
                'type': get_mimetype(safe_filename),
                'workspace_id': workspace_id,
                'upload_time': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error asynchronously uploading file {safe_filename}: {str(e)}")
            raise
    
    async def async_download_file(self, file_path: str) -> Tuple[bytes, str, str]:
        """
        Asynchronously download a file from storage.
        
        Args:
            file_path: Path to the file
            
        Returns:
            tuple: (bytes content, str filename, str mimetype)
            
        Raises:
            FileNotFoundError: If the file doesn't exist
        """
        try:
            if self.use_s3:
                # Parse S3 key from file_path
                s3_key = file_path
                
                # Define the S3 download function
                def s3_download():
                    # Check if file exists
                    try:
                        self.s3_client.head_object(Bucket=self.bucket_name, Key=s3_key)
                    except ClientError as e:
                        if e.response['Error']['Code'] == '404':
                            raise FileNotFoundError(f"File not found in S3: {s3_key}")
                        else:
                            raise
                    
                    # Download from S3
                    response = self.s3_client.get_object(Bucket=self.bucket_name, Key=s3_key)
                    return response['Body'].read()
                
                # Run in a thread to avoid blocking
                content = await asyncio.to_thread(s3_download)
                
                # Extract filename from S3 key
                filename = os.path.basename(s3_key)
                logger.info(f"File asynchronously downloaded from S3: {s3_key}")
            else:
                # Convert to Path object
                local_path = Path(file_path)
                
                # Check if file exists locally
                if not local_path.exists():
                    raise FileNotFoundError(f"File not found: {local_path}")
                
                # Read from local file asynchronously
                async with aiofiles.open(local_path, 'rb') as f:
                    content = await f.read()
                
                filename = local_path.name
                logger.info(f"File asynchronously downloaded from local storage: {local_path}")
            
            # Determine mimetype
            mimetype = get_mimetype(filename)
            
            return content, filename, mimetype
            
        except Exception as e:
            if isinstance(e, FileNotFoundError):
                raise
            logger.error(f"Error asynchronously downloading file {file_path}: {str(e)}")
            raise
    
    def ensure_workspace_directory(self, workspace_id: str) -> Path:
        """
        Ensure workspace directory structure exists.
        
        Args:
            workspace_id: ID of the workspace
            
        Returns:
            Path: Path to workspace directory
        """
        # Sanitize workspace_id
        safe_workspace_id = sanitize_filename(workspace_id)
        
        # Create workspace directory path
        workspace_dir = self.storage_path / safe_workspace_id
        
        # Ensure directory exists
        workspace_dir.mkdir(parents=True, exist_ok=True)
        
        return workspace_dir
    
    def cleanup_workspace_files(self, workspace_id: str) -> bool:
        """
        Clean up all files associated with a workspace.
        
        Args:
            workspace_id: ID of the workspace
            
        Returns:
            bool: True if cleanup successful, False otherwise
        """
        try:
            # Sanitize workspace_id
            safe_workspace_id = sanitize_filename(workspace_id)
            
            if self.use_s3:
                # List all objects with workspace_id prefix
                prefix = f"{safe_workspace_id}/"
                
                response = self.s3_client.list_objects_v2(
                    Bucket=self.bucket_name,
                    Prefix=prefix
                )
                
                if 'Contents' in response:
                    # Create a list of objects to delete
                    objects_to_delete = [{'Key': obj['Key']} for obj in response['Contents']]
                    
                    # Delete objects in batches (S3 API limits to 1000 objects per request)
                    for i in range(0, len(objects_to_delete), 1000):
                        batch = objects_to_delete[i:i+1000]
                        self.s3_client.delete_objects(
                            Bucket=self.bucket_name,
                            Delete={'Objects': batch}
                        )
                
                logger.info(f"Cleaned up S3 files for workspace {workspace_id}")
            else:
                # Get workspace directory paths
                workspace_dir = self.storage_path / safe_workspace_id
                notebook_dir = self.notebook_path / safe_workspace_id
                
                # Remove workspace directory if it exists
                if workspace_dir.exists():
                    shutil.rmtree(workspace_dir)
                
                # Remove notebook directory if it exists
                if notebook_dir.exists():
                    shutil.rmtree(notebook_dir)
                
                logger.info(f"Cleaned up local files for workspace {workspace_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error cleaning up workspace {workspace_id}: {str(e)}")
            return False

# Initialize a singleton instance
FILE_MANAGER = FileManager()