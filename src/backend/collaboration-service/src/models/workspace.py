"""
Workspace model for the AI Talent Marketplace collaboration service.

This module defines the data models for collaborative workspaces that enable real-time
collaboration between AI professionals and clients. It includes models for workspaces,
workspace members, files, and activity tracking with support for Jupyter notebooks,
file sharing, and project management functionality.
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any
from pathlib import Path

# pydantic v2.0.0
from pydantic import BaseModel, Field

# pymongo v4.5.0
from bson import ObjectId

# Internal imports
from ..config import settings

# Define workspace enums
WORKSPACE_STATUS = Enum('WORKSPACE_STATUS', ['ACTIVE', 'ARCHIVED', 'DELETED'])
WORKSPACE_ROLES = Enum('WORKSPACE_ROLES', ['OWNER', 'EDITOR', 'VIEWER'])
WORKSPACE_PERMISSIONS = Enum('WORKSPACE_PERMISSIONS', ['READ', 'WRITE', 'EXECUTE', 'ADMIN'])

def generate_workspace_path(workspace_id: str) -> Path:
    """
    Generates a unique filesystem path for a workspace.
    
    Args:
        workspace_id: The unique identifier of the workspace
        
    Returns:
        Path object representing the workspace directory
    """
    base_path = Path(settings.FILE_STORAGE_PATH)
    workspace_path = base_path / workspace_id
    return workspace_path

class WorkspaceMember:
    """
    Represents a member of a workspace with their role and permissions.
    
    This class tracks a user's role within a workspace, their permissions,
    and their activity status for collaboration features.
    """
    
    def __init__(self, user_id: str, role: str, permissions: Dict[str, bool] = None):
        """
        Initialize a new workspace member.
        
        Args:
            user_id: The unique identifier of the user
            role: The member's role in the workspace (from WORKSPACE_ROLES)
            permissions: Optional dictionary of permissions for the member
        """
        self.user_id = user_id
        
        # Validate the role
        valid_roles = [r.name for r in WORKSPACE_ROLES]
        if role not in valid_roles:
            raise ValueError(f"Invalid role: {role}. Must be one of {valid_roles}")
        
        self.role = role
        self.last_active_at = datetime.utcnow()
        
        # Initialize permissions based on role if not provided
        if permissions is None:
            self.permissions = self._default_permissions_for_role(role)
        else:
            self.permissions = permissions

    def _default_permissions_for_role(self, role: str) -> Dict[str, bool]:
        """
        Generate default permissions based on the user's role.
        
        Args:
            role: The member's role
            
        Returns:
            Dictionary of permission settings
        """
        if role == WORKSPACE_ROLES.OWNER.name:
            return {perm.name: True for perm in WORKSPACE_PERMISSIONS}
        elif role == WORKSPACE_ROLES.EDITOR.name:
            return {
                WORKSPACE_PERMISSIONS.READ.name: True,
                WORKSPACE_PERMISSIONS.WRITE.name: True,
                WORKSPACE_PERMISSIONS.EXECUTE.name: True,
                WORKSPACE_PERMISSIONS.ADMIN.name: False
            }
        elif role == WORKSPACE_ROLES.VIEWER.name:
            return {
                WORKSPACE_PERMISSIONS.READ.name: True,
                WORKSPACE_PERMISSIONS.WRITE.name: False,
                WORKSPACE_PERMISSIONS.EXECUTE.name: False,
                WORKSPACE_PERMISSIONS.ADMIN.name: False
            }
        else:
            # Default minimal permissions
            return {perm.name: False for perm in WORKSPACE_PERMISSIONS}
    
    def has_permission(self, permission: str) -> bool:
        """
        Check if member has a specific permission.
        
        Args:
            permission: The permission to check (from WORKSPACE_PERMISSIONS)
            
        Returns:
            True if permission is granted, False otherwise
        """
        # Validate the permission
        valid_permissions = [p.name for p in WORKSPACE_PERMISSIONS]
        if permission not in valid_permissions:
            raise ValueError(f"Invalid permission: {permission}. Must be one of {valid_permissions}")
        
        # Owners always have all permissions
        if self.role == WORKSPACE_ROLES.OWNER.name:
            return True
        
        # Check the permission in the permissions dictionary
        return self.permissions.get(permission, False)
    
    def update_activity(self) -> None:
        """
        Update the last active timestamp for the member.
        """
        self.last_active_at = datetime.utcnow()
    
    def change_role(self, new_role: str) -> bool:
        """
        Update the member's role and adjust permissions accordingly.
        
        Args:
            new_role: The new role to assign (from WORKSPACE_ROLES)
            
        Returns:
            True if role was updated successfully
        """
        # Validate the new role
        valid_roles = [r.name for r in WORKSPACE_ROLES]
        if new_role not in valid_roles:
            raise ValueError(f"Invalid role: {new_role}. Must be one of {valid_roles}")
        
        # Update the role
        self.role = new_role
        
        # Update permissions based on new role
        self.permissions = self._default_permissions_for_role(new_role)
        
        return True
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert member to dictionary representation.
        
        Returns:
            Dictionary with member data
        """
        return {
            "user_id": self.user_id,
            "role": self.role,
            "last_active_at": self.last_active_at.isoformat(),
            "permissions": self.permissions
        }

class WorkspaceFile:
    """
    Represents a file stored in the workspace.
    
    This class tracks metadata about files uploaded to the workspace,
    including version history, type information, and access details.
    """
    
    def __init__(
        self,
        name: str,
        file_path: str,
        file_type: str,
        size: int,
        mimetype: str,
        created_by: str,
        description: str = "",
        metadata: Dict[str, Any] = None
    ):
        """
        Initialize a new workspace file.
        
        Args:
            name: File name
            file_path: Path to the stored file
            file_type: Type of file (extension)
            size: File size in bytes
            mimetype: MIME type of the file
            created_by: User ID of the creator
            description: Optional file description
            metadata: Optional metadata dictionary
        """
        self.id = str(uuid.uuid4())
        self.name = name
        self.description = description
        self.file_path = file_path
        self.file_type = file_type
        self.size = size
        self.mimetype = mimetype
        self.created_by = created_by
        self.created_at = datetime.utcnow()
        self.updated_at = self.created_at
        self.updated_by = created_by
        self.versions = []
        self.metadata = metadata or {}
    
    def update_metadata(self, new_metadata: Dict[str, Any], user_id: str) -> None:
        """
        Update file metadata.
        
        Args:
            new_metadata: New metadata to add or update
            user_id: User ID performing the update
        """
        self.metadata.update(new_metadata)
        self.updated_at = datetime.utcnow()
        self.updated_by = user_id
    
    def add_version(self, version_path: str, user_id: str, commit_message: str) -> Dict[str, Any]:
        """
        Add a new version of the file.
        
        Args:
            version_path: Path to the new version of the file
            user_id: User ID of the version creator
            commit_message: Message describing the changes
            
        Returns:
            Version information dictionary
        """
        version_info = {
            "id": str(uuid.uuid4()),
            "path": version_path,
            "created_at": datetime.utcnow(),
            "created_by": user_id,
            "commit_message": commit_message
        }
        
        self.versions.append(version_info)
        self.updated_at = datetime.utcnow()
        self.updated_by = user_id
        
        return version_info
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert file to dictionary representation.
        
        Returns:
            Dictionary with file data
        """
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "file_path": self.file_path,
            "file_type": self.file_type,
            "size": self.size,
            "mimetype": self.mimetype,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "updated_by": self.updated_by,
            "versions": self.versions,
            "metadata": self.metadata
        }

class Workspace:
    """
    Model representing a collaborative workspace in the AI Talent Marketplace platform.
    
    This class is the central model for collaboration features, managing workspace
    members, files, and permissions for real-time collaboration between AI professionals
    and clients.
    """
    
    def __init__(
        self,
        name: str,
        description: str,
        contract_id: str,
        job_id: str,
        owner_id: str,
        metadata: Dict[str, Any] = None
    ):
        """
        Initialize a new workspace.
        
        Args:
            name: Workspace name
            description: Workspace description
            contract_id: Associated contract ID
            job_id: Associated job ID
            owner_id: User ID of the workspace owner
            metadata: Optional metadata dictionary
        """
        self.id = str(uuid.uuid4())
        self.name = name
        self.description = description
        self.contract_id = contract_id
        self.job_id = job_id
        self.status = WORKSPACE_STATUS.ACTIVE.name
        
        # Initialize members list with owner
        self.members = []
        self.add_member(owner_id, WORKSPACE_ROLES.OWNER.name)
        
        self.files = []
        self.created_by = owner_id
        self.created_at = datetime.utcnow()
        self.updated_at = self.created_at
        
        # Generate workspace path
        self.workspace_path = generate_workspace_path(self.id)
        
        # Initialize metadata
        self.metadata = metadata or {}
    
    def add_member(self, user_id: str, role: str, permissions: Dict[str, bool] = None) -> WorkspaceMember:
        """
        Add a new member to the workspace.
        
        Args:
            user_id: User ID to add
            role: Role for the new member (from WORKSPACE_ROLES)
            permissions: Optional custom permissions
            
        Returns:
            The newly added member
        """
        # Check if user is already a member
        existing_member = self.get_member(user_id)
        if existing_member:
            return existing_member
        
        # Create new member
        member = WorkspaceMember(user_id, role, permissions)
        self.members.append(member)
        self.updated_at = datetime.utcnow()
        
        return member
    
    def remove_member(self, user_id: str) -> bool:
        """
        Remove a member from the workspace.
        
        Args:
            user_id: User ID to remove
            
        Returns:
            True if member was removed, False if not found
        """
        for i, member in enumerate(self.members):
            if member.user_id == user_id:
                del self.members[i]
                self.updated_at = datetime.utcnow()
                return True
        
        return False
    
    def get_member(self, user_id: str) -> Optional[WorkspaceMember]:
        """
        Get a member by user_id.
        
        Args:
            user_id: User ID to find
            
        Returns:
            The member if found, None otherwise
        """
        for member in self.members:
            if member.user_id == user_id:
                return member
        
        return None
    
    def update_member_role(self, user_id: str, new_role: str) -> bool:
        """
        Update a member's role in the workspace.
        
        Args:
            user_id: User ID to update
            new_role: New role to assign
            
        Returns:
            True if role was updated, False if member not found
        """
        member = self.get_member(user_id)
        
        if member:
            member.change_role(new_role)
            self.updated_at = datetime.utcnow()
            return True
        
        return False
    
    def update_activity(self, user_id: str) -> bool:
        """
        Update activity timestamp for a workspace member.
        
        Args:
            user_id: User ID to update
            
        Returns:
            True if member activity was updated, False if not found
        """
        member = self.get_member(user_id)
        
        if member:
            member.update_activity()
            return True
        
        return False
    
    def is_inactive(self) -> bool:
        """
        Check if the workspace is inactive based on member activity.
        
        Returns:
            True if workspace is inactive, False otherwise
        """
        # Get inactivity timeout from settings
        timeout = settings.WORKSPACE_INACTIVITY_TIMEOUT
        
        # Calculate threshold datetime
        threshold = datetime.utcnow().timestamp() - timeout
        threshold_datetime = datetime.fromtimestamp(threshold)
        
        # Check if any member has been active after the threshold
        for member in self.members:
            if member.last_active_at > threshold_datetime:
                return False
        
        # If no members have been active, the workspace is inactive
        return True
    
    def add_file(
        self,
        name: str,
        file_path: str,
        file_type: str,
        size: int,
        mimetype: str,
        created_by: str,
        description: str = "",
        metadata: Dict[str, Any] = None
    ) -> WorkspaceFile:
        """
        Add a file to the workspace.
        
        Args:
            name: File name
            file_path: Path to the stored file
            file_type: Type of file (extension)
            size: File size in bytes
            mimetype: MIME type of the file
            created_by: User ID of the creator
            description: Optional file description
            metadata: Optional metadata dictionary
            
        Returns:
            The newly created file
        """
        file = WorkspaceFile(
            name=name,
            file_path=file_path,
            file_type=file_type,
            size=size,
            mimetype=mimetype,
            created_by=created_by,
            description=description,
            metadata=metadata
        )
        
        self.files.append(file)
        self.updated_at = datetime.utcnow()
        
        return file
    
    def get_file(self, file_id: str) -> Optional[WorkspaceFile]:
        """
        Get a file by id.
        
        Args:
            file_id: File ID to find
            
        Returns:
            The file if found, None otherwise
        """
        for file in self.files:
            if file.id == file_id:
                return file
        
        return None
    
    def remove_file(self, file_id: str) -> bool:
        """
        Remove a file from the workspace.
        
        Args:
            file_id: File ID to remove
            
        Returns:
            True if file was removed, False if not found
        """
        for i, file in enumerate(self.files):
            if file.id == file_id:
                del self.files[i]
                self.updated_at = datetime.utcnow()
                return True
        
        return False
    
    def archive(self) -> None:
        """
        Archive the workspace.
        """
        self.status = WORKSPACE_STATUS.ARCHIVED.name
        self.updated_at = datetime.utcnow()
    
    def restore(self) -> None:
        """
        Restore an archived workspace to active status.
        """
        self.status = WORKSPACE_STATUS.ACTIVE.name
        self.updated_at = datetime.utcnow()
    
    def delete(self) -> None:
        """
        Mark the workspace as deleted.
        """
        self.status = WORKSPACE_STATUS.DELETED.name
        self.updated_at = datetime.utcnow()
    
    def has_access(self, user_id: str, permission: Optional[str] = None) -> bool:
        """
        Check if a user has specific permission for this workspace.
        
        Args:
            user_id: User ID to check
            permission: Optional specific permission to check
            
        Returns:
            True if user has permission, False otherwise
        """
        member = self.get_member(user_id)
        
        if not member:
            return False
        
        # If no specific permission is checked, just confirm membership
        if permission is None:
            return True
        
        return member.has_permission(permission)
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert workspace to dictionary representation.
        
        Returns:
            Dictionary with workspace data
        """
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "contract_id": self.contract_id,
            "job_id": self.job_id,
            "status": self.status,
            "members": [member.to_dict() for member in self.members],
            "files": [file.to_dict() for file in self.files],
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "workspace_path": str(self.workspace_path),
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Workspace':
        """
        Create a workspace object from a dictionary.
        
        Args:
            data: Dictionary with workspace data
            
        Returns:
            New workspace instance
        """
        # Create workspace with required fields
        workspace = cls(
            name=data["name"],
            description=data["description"],
            contract_id=data["contract_id"],
            job_id=data["job_id"],
            owner_id=data["created_by"],
            metadata=data.get("metadata", {})
        )
        
        # Update workspace ID and timestamps
        workspace.id = data["id"]
        workspace.created_at = datetime.fromisoformat(data["created_at"])
        workspace.updated_at = datetime.fromisoformat(data["updated_at"])
        workspace.status = data["status"]
        
        # Clear auto-generated members and load from data
        workspace.members = []
        for member_data in data["members"]:
            member = WorkspaceMember(
                user_id=member_data["user_id"],
                role=member_data["role"],
                permissions=member_data["permissions"]
            )
            member.last_active_at = datetime.fromisoformat(member_data["last_active_at"])
            workspace.members.append(member)
        
        # Clear auto-generated files and load from data
        workspace.files = []
        for file_data in data["files"]:
            file = WorkspaceFile(
                name=file_data["name"],
                file_path=file_data["file_path"],
                file_type=file_data["file_type"],
                size=file_data["size"],
                mimetype=file_data["mimetype"],
                created_by=file_data["created_by"],
                description=file_data.get("description", ""),
                metadata=file_data.get("metadata", {})
            )
            file.id = file_data["id"]
            file.created_at = datetime.fromisoformat(file_data["created_at"])
            file.updated_at = datetime.fromisoformat(file_data["updated_at"])
            file.updated_by = file_data["updated_by"]
            file.versions = file_data.get("versions", [])
            workspace.files.append(file)
        
        # Update workspace path
        workspace.workspace_path = Path(data["workspace_path"])
        
        return workspace

class WorkspaceActivity:
    """
    Model for tracking workspace activity and events.
    
    This class records user actions and system events within workspaces
    for auditing, notifications, and activity feeds.
    """
    
    def __init__(
        self,
        workspace_id: str,
        user_id: str,
        activity_type: str,
        data: Dict[str, Any] = None
    ):
        """
        Initialize a new workspace activity record.
        
        Args:
            workspace_id: Associated workspace ID
            user_id: User performing the activity
            activity_type: Type of activity
            data: Optional data related to the activity
        """
        self.id = str(uuid.uuid4())
        self.workspace_id = workspace_id
        self.user_id = user_id
        self.activity_type = activity_type
        self.data = data or {}
        self.timestamp = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert activity to dictionary representation.
        
        Returns:
            Dictionary with activity data
        """
        return {
            "id": self.id,
            "workspace_id": self.workspace_id,
            "user_id": self.user_id,
            "activity_type": self.activity_type,
            "data": self.data,
            "timestamp": self.timestamp.isoformat()
        }