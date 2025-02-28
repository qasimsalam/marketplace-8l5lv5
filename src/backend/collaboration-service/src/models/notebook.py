"""
Defines the Notebook model for the AI Talent Marketplace collaboration service, enabling 
AI professionals and clients to create, share, and collaboratively edit Jupyter notebooks 
with support for code execution, real-time updates, and version history.
"""
import uuid
import datetime
import enum
from typing import List, Dict, Optional, Any, Union
from pathlib import Path
import nbformat  # v5.9.2
import json
import re
import os

# Import configuration settings for notebook storage locations
from ..config import settings

# Define enumerations for notebook model
CELL_TYPES = enum.Enum('CELL_TYPES', ['CODE', 'MARKDOWN', 'RAW'])
EXECUTION_STATE = enum.Enum('EXECUTION_STATE', ['IDLE', 'BUSY', 'QUEUED', 'ERROR'])
NOTEBOOK_STATUS = enum.Enum('NOTEBOOK_STATUS', ['DRAFT', 'ACTIVE', 'ARCHIVED', 'DELETED'])

# Constants for filename handling
INVALID_FILENAME_CHARS = re.compile(r'[^a-zA-Z0-9_.-]')
MAX_FILENAME_LENGTH = 255

def sanitize_filename(filename: str) -> str:
    """
    Sanitizes a filename to ensure it's safe for filesystem use
    
    Args:
        filename: Input filename to sanitize
        
    Returns:
        Sanitized filename safe for filesystem use
    """
    if not filename or not filename.strip():
        return "untitled_notebook"
    
    # Replace invalid characters with underscores
    sanitized = INVALID_FILENAME_CHARS.sub('_', filename)
    
    # Remove leading/trailing periods and spaces
    sanitized = sanitized.strip('. ')
    
    # Remove any path traversal attempts
    sanitized = sanitized.replace('..', '_')
    sanitized = sanitized.replace('/', '_')
    sanitized = sanitized.replace('\\', '_')
    
    # Truncate if too long
    if len(sanitized) > MAX_FILENAME_LENGTH:
        sanitized = sanitized[:MAX_FILENAME_LENGTH]
    
    return sanitized

def generate_notebook_path(workspace_id: str, notebook_id: str) -> Path:
    """
    Generates a unique filesystem path for a notebook
    
    Args:
        workspace_id: ID of the workspace containing the notebook
        notebook_id: ID of the notebook
        
    Returns:
        Filesystem path for the notebook file
    """
    # Get the notebook directory from settings
    notebook_dir = Path(settings.JUPYTER_NOTEBOOK_DIR)
    
    # Sanitize IDs for safe filesystem use
    safe_workspace_id = sanitize_filename(workspace_id)
    safe_notebook_id = sanitize_filename(notebook_id)
    
    # Create directory structure based on workspace_id
    workspace_path = notebook_dir / safe_workspace_id
    notebook_path = workspace_path / f"{safe_notebook_id}.ipynb"
    
    # Ensure the directory exists
    os.makedirs(workspace_path, exist_ok=True)
    
    return notebook_path

class NotebookCell:
    """
    Represents a single cell within a Jupyter notebook
    """
    
    def __init__(self, 
                 cell_type: str, 
                 source: str = "", 
                 outputs: List[Dict] = None, 
                 execution_count: Optional[int] = None, 
                 metadata: Dict = None):
        """
        Initialize a new notebook cell
        
        Args:
            cell_type: Type of cell (code, markdown, raw)
            source: Cell source code/content
            outputs: Execution outputs for code cells
            execution_count: Execution count number
            metadata: Additional cell metadata
        """
        self.id = str(uuid.uuid4())
        
        # Validate cell type against CELL_TYPES enum
        if cell_type not in [ct.value for ct in CELL_TYPES]:
            raise ValueError(f"Invalid cell type: {cell_type}. " 
                             f"Must be one of {[ct.value for ct in CELL_TYPES]}")
        
        self.cell_type = cell_type
        self.source = source or ""
        self.outputs = outputs or []
        self.execution_count = execution_count
        self.metadata = metadata or {}
    
    def update_source(self, new_source: str) -> None:
        """
        Update the cell source code or content
        
        Args:
            new_source: New source content
        """
        self.source = new_source
    
    def update_outputs(self, new_outputs: List[Dict], execution_count: Optional[int] = None) -> None:
        """
        Update cell execution outputs
        
        Args:
            new_outputs: New execution outputs
            execution_count: New execution count (optional)
        """
        self.outputs = new_outputs
        if execution_count is not None:
            self.execution_count = execution_count
    
    def clear_outputs(self) -> None:
        """
        Clear all cell outputs
        """
        self.outputs = []
        self.execution_count = None
    
    def to_dict(self) -> Dict:
        """
        Convert cell to dictionary representation
        
        Returns:
            Dictionary with cell data
        """
        return {
            "id": self.id,
            "cell_type": self.cell_type,
            "source": self.source,
            "outputs": self.outputs,
            "execution_count": self.execution_count,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'NotebookCell':
        """
        Create a cell object from a dictionary
        
        Args:
            data: Dictionary with cell data
            
        Returns:
            New cell instance
        """
        return cls(
            cell_type=data.get("cell_type"),
            source=data.get("source", ""),
            outputs=data.get("outputs", []),
            execution_count=data.get("execution_count"),
            metadata=data.get("metadata", {})
        )

class NotebookVersion:
    """
    Represents a specific version of a notebook
    """
    
    def __init__(self, 
                 notebook_id: str, 
                 version_number: str, 
                 file_path: str, 
                 created_by: str, 
                 commit_message: str, 
                 metadata: Dict = None):
        """
        Initialize a new notebook version
        
        Args:
            notebook_id: ID of the notebook
            version_number: Version identifier
            file_path: Path to the version file
            created_by: User ID who created the version
            commit_message: Description of changes
            metadata: Additional version metadata
        """
        self.id = str(uuid.uuid4())
        self.notebook_id = notebook_id
        self.version_number = version_number
        self.file_path = file_path
        self.created_by = created_by
        self.created_at = datetime.datetime.now()
        self.commit_message = commit_message
        self.metadata = metadata or {}
    
    def to_dict(self) -> Dict:
        """
        Convert version to dictionary representation
        
        Returns:
            Dictionary with version data
        """
        return {
            "id": self.id,
            "notebook_id": self.notebook_id,
            "version_number": self.version_number,
            "file_path": self.file_path,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat(),
            "commit_message": self.commit_message,
            "metadata": self.metadata
        }

class Notebook:
    """
    Model representing a Jupyter notebook in the AI Talent Marketplace platform
    """
    
    def __init__(self, 
                 name: str, 
                 workspace_id: str, 
                 created_by: str, 
                 description: str = "", 
                 kernel_name: str = "python3", 
                 metadata: Dict = None):
        """
        Initialize a new notebook
        
        Args:
            name: Notebook name
            workspace_id: ID of the workspace containing the notebook
            created_by: User ID who created the notebook
            description: Optional notebook description
            kernel_name: Jupyter kernel name
            metadata: Additional notebook metadata
        """
        self.id = str(uuid.uuid4())
        self.name = name
        self.description = description or ""
        self.workspace_id = workspace_id
        self.kernel_name = kernel_name or "python3"
        self.status = NOTEBOOK_STATUS.DRAFT
        self.cells = []
        
        # Initialize metadata with nbformat metadata if not provided
        if metadata is None:
            self.metadata = {
                "kernelspec": {
                    "display_name": "Python 3",
                    "language": "python",
                    "name": kernel_name
                },
                "language_info": {
                    "codemirror_mode": {
                        "name": "ipython",
                        "version": 3
                    },
                    "file_extension": ".py",
                    "mimetype": "text/x-python",
                    "name": "python",
                    "nbconvert_exporter": "python",
                    "pygments_lexer": "ipython3",
                    "version": "3.11.0"
                }
            }
        else:
            self.metadata = metadata
        
        self.versions = []
        self.created_at = datetime.datetime.now()
        self.updated_at = self.created_at
        self.created_by = created_by
        self.updated_by = created_by
        self.file_path = generate_notebook_path(workspace_id, self.id)
        self.execution_state = EXECUTION_STATE.IDLE
    
    def add_cell(self, 
                 cell_type: str, 
                 source: str = "", 
                 index: Optional[int] = None, 
                 metadata: Dict = None) -> NotebookCell:
        """
        Add a new cell to the notebook
        
        Args:
            cell_type: Type of cell (code, markdown, raw)
            source: Cell source code/content
            index: Optional position to insert the cell
            metadata: Additional cell metadata
            
        Returns:
            The newly added cell
        """
        # Create new cell
        cell = NotebookCell(cell_type=cell_type, source=source, metadata=metadata)
        
        # Insert at specific position or append
        if index is not None and 0 <= index <= len(self.cells):
            self.cells.insert(index, cell)
        else:
            self.cells.append(cell)
        
        # Update notebook timestamp
        self.updated_at = datetime.datetime.now()
        
        return cell
    
    def update_cell(self, 
                    cell_id: str, 
                    source: Optional[str] = None, 
                    outputs: Optional[List[Dict]] = None, 
                    execution_count: Optional[int] = None) -> bool:
        """
        Update an existing cell
        
        Args:
            cell_id: ID of the cell to update
            source: New cell source (if provided)
            outputs: New cell outputs (if provided)
            execution_count: New execution count (if provided)
            
        Returns:
            True if cell was updated, False if not found
        """
        # Find the cell
        cell = self.get_cell(cell_id)
        if not cell:
            return False
        
        # Update cell properties
        if source is not None:
            cell.update_source(source)
        
        if outputs is not None:
            cell.update_outputs(outputs, execution_count)
        
        # Update notebook timestamp
        self.updated_at = datetime.datetime.now()
        
        return True
    
    def remove_cell(self, cell_id: str) -> bool:
        """
        Remove a cell from the notebook
        
        Args:
            cell_id: ID of the cell to remove
            
        Returns:
            True if cell was removed, False if not found
        """
        for i, cell in enumerate(self.cells):
            if cell.id == cell_id:
                # Remove the cell
                self.cells.pop(i)
                # Update notebook timestamp
                self.updated_at = datetime.datetime.now()
                return True
        
        return False
    
    def get_cell(self, cell_id: str) -> Optional[NotebookCell]:
        """
        Get a cell by id
        
        Args:
            cell_id: ID of the cell to get
            
        Returns:
            The cell if found, None otherwise
        """
        for cell in self.cells:
            if cell.id == cell_id:
                return cell
        
        return None
    
    def reorder_cells(self, cell_order: List[str]) -> bool:
        """
        Change the order of cells in the notebook
        
        Args:
            cell_order: List of cell IDs in the new order
            
        Returns:
            True if reordering was successful
        """
        # Verify all cell IDs exist
        cell_map = {cell.id: cell for cell in self.cells}
        if not all(cell_id in cell_map for cell_id in cell_order):
            return False
        
        # Create new ordered list
        new_cells = []
        for cell_id in cell_order:
            new_cells.append(cell_map[cell_id])
        
        # Update cells list
        self.cells = new_cells
        
        # Update notebook timestamp
        self.updated_at = datetime.datetime.now()
        
        return True
    
    def clear_all_outputs(self) -> None:
        """
        Clear outputs for all cells in the notebook
        """
        for cell in self.cells:
            if cell.cell_type == CELL_TYPES.CODE.value:
                cell.clear_outputs()
        
        # Update notebook timestamp
        self.updated_at = datetime.datetime.now()
    
    def add_version(self, user_id: str, commit_message: str, version_path: str) -> NotebookVersion:
        """
        Create a new version of the notebook
        
        Args:
            user_id: ID of the user creating the version
            commit_message: Description of changes
            version_path: Path where version was saved
            
        Returns:
            The newly created version
        """
        # Generate version number based on length of versions list
        version_number = str(len(self.versions) + 1)
        
        # Create version
        version = NotebookVersion(
            notebook_id=self.id,
            version_number=version_number,
            file_path=version_path,
            created_by=user_id,
            commit_message=commit_message
        )
        
        # Add to versions list
        self.versions.append(version)
        
        # Update notebook metadata
        self.updated_at = datetime.datetime.now()
        self.updated_by = user_id
        
        return version
    
    def get_version(self, version_id: str) -> Optional[NotebookVersion]:
        """
        Get a specific version of the notebook
        
        Args:
            version_id: ID of the version to get
            
        Returns:
            The version if found, None otherwise
        """
        for version in self.versions:
            if version.id == version_id:
                return version
        
        return None
    
    def update_metadata(self, new_metadata: Dict, user_id: str) -> None:
        """
        Update notebook metadata
        
        Args:
            new_metadata: New metadata to merge with existing
            user_id: ID of user making the update
        """
        # Merge new metadata with existing metadata
        self.metadata.update(new_metadata)
        
        # Update notebook timestamps
        self.updated_at = datetime.datetime.now()
        self.updated_by = user_id
    
    def update_execution_state(self, state: str) -> None:
        """
        Update notebook execution state
        
        Args:
            state: New execution state
        """
        # Validate state against EXECUTION_STATE enum
        if state not in [s.value for s in EXECUTION_STATE]:
            raise ValueError(f"Invalid execution state: {state}. " 
                           f"Must be one of {[s.value for s in EXECUTION_STATE]}")
        
        # Update execution_state property
        self.execution_state = EXECUTION_STATE(state)
    
    def archive(self) -> None:
        """
        Archive the notebook
        """
        self.status = NOTEBOOK_STATUS.ARCHIVED
        self.updated_at = datetime.datetime.now()
    
    def restore(self) -> None:
        """
        Restore an archived notebook to active status
        """
        self.status = NOTEBOOK_STATUS.ACTIVE
        self.updated_at = datetime.datetime.now()
    
    def delete(self) -> None:
        """
        Mark the notebook as deleted
        """
        self.status = NOTEBOOK_STATUS.DELETED
        self.updated_at = datetime.datetime.now()
    
    def to_dict(self) -> Dict:
        """
        Convert notebook to dictionary representation
        
        Returns:
            Dictionary with notebook data
        """
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "workspace_id": self.workspace_id,
            "kernel_name": self.kernel_name,
            "status": self.status.value,
            "cells": [cell.to_dict() for cell in self.cells],
            "metadata": self.metadata,
            "versions": [version.to_dict() for version in self.versions],
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "updated_by": self.updated_by,
            "file_path": str(self.file_path),
            "execution_state": self.execution_state.value
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'Notebook':
        """
        Create a notebook object from a dictionary
        
        Args:
            data: Dictionary with notebook data
            
        Returns:
            New notebook instance
        """
        # Create base notebook
        notebook = cls(
            name=data.get("name", "Untitled"),
            workspace_id=data.get("workspace_id"),
            created_by=data.get("created_by"),
            description=data.get("description", ""),
            kernel_name=data.get("kernel_name", "python3"),
            metadata=data.get("metadata", {})
        )
        
        # Set all properties from data
        notebook.id = data.get("id", notebook.id)
        
        # Parse status
        status_str = data.get("status")
        if status_str:
            notebook.status = NOTEBOOK_STATUS(status_str)
        
        # Convert cell dictionaries to NotebookCell objects
        cells_data = data.get("cells", [])
        notebook.cells = [NotebookCell.from_dict(cell_data) for cell_data in cells_data]
        
        # Convert version dictionaries to NotebookVersion objects
        versions_data = data.get("versions", [])
        for version_data in versions_data:
            version = NotebookVersion(
                notebook_id=notebook.id,
                version_number=version_data.get("version_number"),
                file_path=version_data.get("file_path"),
                created_by=version_data.get("created_by"),
                commit_message=version_data.get("commit_message", ""),
                metadata=version_data.get("metadata", {})
            )
            version.id = version_data.get("id", version.id)
            
            # Parse created_at if present
            created_at_str = version_data.get("created_at")
            if created_at_str:
                version.created_at = datetime.datetime.fromisoformat(created_at_str)
            
            notebook.versions.append(version)
        
        # Parse timestamps
        created_at_str = data.get("created_at")
        if created_at_str:
            notebook.created_at = datetime.datetime.fromisoformat(created_at_str)
        
        updated_at_str = data.get("updated_at")
        if updated_at_str:
            notebook.updated_at = datetime.datetime.fromisoformat(updated_at_str)
        
        notebook.updated_by = data.get("updated_by", notebook.created_by)
        
        # Ensure file_path is properly set
        file_path_str = data.get("file_path")
        if file_path_str:
            notebook.file_path = Path(file_path_str)
        
        # Parse execution state
        execution_state_str = data.get("execution_state")
        if execution_state_str:
            notebook.execution_state = EXECUTION_STATE(execution_state_str)
        
        return notebook
    
    def save_to_file(self, file_path: Optional[Path] = None) -> Path:
        """
        Save notebook to an .ipynb file
        
        Args:
            file_path: Optional custom path to save to (uses self.file_path by default)
            
        Returns:
            Path where notebook was saved
        """
        if file_path is None:
            file_path = self.file_path
        
        # Convert notebook to nbformat compatible dictionary
        nb_dict = {
            "cells": [],
            "metadata": self.metadata,
            "nbformat": 4,
            "nbformat_minor": 5
        }
        
        # Convert cells to nbformat structure
        for cell in self.cells:
            cell_dict = {
                "cell_type": cell.cell_type,
                "metadata": cell.metadata,
                "source": cell.source
            }
            
            # Add outputs and execution_count for code cells
            if cell.cell_type == CELL_TYPES.CODE.value:
                cell_dict["outputs"] = cell.outputs
                cell_dict["execution_count"] = cell.execution_count
            
            nb_dict["cells"].append(cell_dict)
        
        # Ensure directory exists for file_path
        os.makedirs(file_path.parent, exist_ok=True)
        
        # Write JSON-formatted notebook to file
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(nb_dict, f, indent=2)
        
        return file_path
    
    @classmethod
    def load_from_file(cls, file_path: Path) -> 'Notebook':
        """
        Load notebook from an .ipynb file
        
        Args:
            file_path: Path to the .ipynb file
            
        Returns:
            Notebook instance loaded from file
        """
        # Read .ipynb file content
        with open(file_path, 'r', encoding='utf-8') as f:
            nb_dict = json.load(f)
        
        # Extract notebook metadata, cells, and properties
        # Get workspace_id and notebook_id from path
        parts = file_path.parts
        
        # Assuming path structure: notebook_dir/workspace_id/notebook_id.ipynb
        notebook_dir = Path(settings.JUPYTER_NOTEBOOK_DIR)
        
        # Get workspace_id and notebook_id
        try:
            if notebook_dir.name in parts:
                idx = parts.index(notebook_dir.name)
                if idx + 2 < len(parts):
                    workspace_id = parts[idx + 1]
                    notebook_id = parts[idx + 2].replace('.ipynb', '')
                else:
                    workspace_id = file_path.parent.name
                    notebook_id = file_path.stem
            else:
                workspace_id = file_path.parent.name
                notebook_id = file_path.stem
        except (ValueError, IndexError):
            workspace_id = file_path.parent.name
            notebook_id = file_path.stem
        
        # Create notebook instance from extracted data
        metadata = nb_dict.get('metadata', {})
        kernel_name = (
            metadata.get('kernelspec', {}).get('name', 'python3')
            if metadata
            else 'python3'
        )
        
        notebook = cls(
            name=file_path.stem,
            workspace_id=workspace_id,
            created_by="system",  # Default creator
            kernel_name=kernel_name,
            metadata=metadata
        )
        
        # Override id
        notebook.id = notebook_id
        
        # Set file_path
        notebook.file_path = file_path
        
        # Parse cells
        for cell_dict in nb_dict.get('cells', []):
            cell_type = cell_dict.get('cell_type')
            source = cell_dict.get('source', '')
            metadata = cell_dict.get('metadata', {})
            
            # Create cell
            cell = NotebookCell(
                cell_type=cell_type,
                source=source,
                metadata=metadata
            )
            
            # Add outputs for code cells
            if cell_type == CELL_TYPES.CODE.value:
                outputs = cell_dict.get('outputs', [])
                execution_count = cell_dict.get('execution_count')
                cell.outputs = outputs
                cell.execution_count = execution_count
            
            notebook.cells.append(cell)
        
        return notebook