"""
Workspace Service for AI Talent Marketplace collaboration features.

This service provides comprehensive workspace management for collaboration between
AI professionals and clients, including workspace creation, access control, file
management, and real-time collaboration features.
"""

import logging
import datetime
import os
from typing import Dict, List, Optional, Any, Union, Tuple
import uuid

# pymongo v4.5.0
import pymongo
from bson import ObjectId

# redis v4.6.0
import redis

# Internal imports
from ..config import settings
from ..models.workspace import (
    Workspace, WorkspaceMember, WorkspaceFile, WorkspaceActivity,
    WORKSPACE_ROLES, WORKSPACE_STATUS, WORKSPACE_PERMISSIONS
)
from ..models.notebook import Notebook, CELL_TYPES, NOTEBOOK_STATUS
from ..utils.file_manager import FILE_MANAGER

# Configure logger
logger = logging.getLogger(__name__)

# Setup MongoDB connection
mongodb_client = pymongo.MongoClient(settings.MONGODB_URI)
db = mongodb_client[settings.MONGODB_DB_NAME]
workspaces_collection = db.workspaces
notebooks_collection = db.notebooks
activities_collection = db.activities

def setup_indexes() -> None:
    """
    Sets up MongoDB indexes for optimal query performance
    """
    try:
        # Create index on workspace_id field in notebooks_collection
        notebooks_collection.create_index("workspace_id")
        
        # Create index on contract_id field in workspaces_collection
        workspaces_collection.create_index("contract_id")
        
        # Create index on job_id field in workspaces_collection
        workspaces_collection.create_index("job_id")
        
        # Create indexes on created_at and updated_at fields for time-based queries
        workspaces_collection.create_index("created_at")
        workspaces_collection.create_index("updated_at")
        
        # Create text index on name and description fields for search functionality
        workspaces_collection.create_index([("name", pymongo.TEXT), ("description", pymongo.TEXT)])
        
        logger.info("MongoDB indexes setup complete")
    except Exception as e:
        logger.error(f"Error setting up MongoDB indexes: {str(e)}")
        raise

def setup_redis_connection() -> redis.Redis:
    """
    Initializes and returns a Redis connection for real-time updates
    
    Returns:
        Redis client instance
    """
    try:
        # Create Redis client using host, port, and password from settings
        redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD,
            decode_responses=True  # Automatically decode responses to strings
        )
        
        # Test connection to ensure Redis is available
        redis_client.ping()
        logger.info("Redis connection established")
        
        return redis_client
    except redis.ConnectionError as e:
        logger.error(f"Failed to connect to Redis: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Error setting up Redis connection: {str(e)}")
        raise

class WorkspaceService:
    """
    Service class that handles workspace operations and management
    
    This service provides comprehensive workspace management for the AI Talent Marketplace 
    collaboration platform, handling creation, access control, file management, and 
    real-time collaboration features.
    """
    
    def __init__(self):
        """
        Initialize the workspace service with database connections
        """
        # Set up database connections
        self.db = db
        self.workspaces_collection = workspaces_collection
        self.notebooks_collection = notebooks_collection
        self.activities_collection = activities_collection
        
        # Set up database indexes
        setup_indexes()
        
        # Set up Redis connection for real-time updates
        self.redis_client = setup_redis_connection()
        
        # Ensure file storage paths exist
        os.makedirs(settings.FILE_STORAGE_PATH, exist_ok=True)
        os.makedirs(settings.JUPYTER_NOTEBOOK_DIR, exist_ok=True)
        
        logger.info("WorkspaceService initialized")
    
    def create_workspace(self, name: str, description: str, owner_id: str, 
                        contract_id: str, job_id: str, metadata: Dict = None) -> Workspace:
        """
        Creates a new workspace for collaboration
        
        Args:
            name: Workspace name
            description: Workspace description
            owner_id: User ID of the workspace owner
            contract_id: Associated contract ID
            job_id: Associated job ID
            metadata: Optional metadata dictionary
            
        Returns:
            Newly created workspace
        """
        try:
            # Create a new Workspace instance with provided parameters
            workspace = Workspace(
                name=name,
                description=description,
                contract_id=contract_id,
                job_id=job_id,
                owner_id=owner_id,
                metadata=metadata or {}
            )
            
            # Insert workspace document into workspaces_collection
            workspace_dict = workspace.to_dict()
            result = self.workspaces_collection.insert_one(workspace_dict)
            
            if not result.acknowledged:
                raise Exception("Failed to insert workspace document")
            
            # Record workspace creation activity
            self.record_activity(
                workspace_id=workspace.id,
                user_id=owner_id,
                activity_type="workspace_created",
                data={"workspace_name": name}
            )
            
            # Log workspace creation event
            logger.info(f"Workspace created: {workspace.id} by user {owner_id}")
            
            # Publish workspace creation event to Redis
            self.redis_client.publish(
                "workspace_events",
                f"workspace:{workspace.id}:created"
            )
            
            return workspace
        
        except Exception as e:
            logger.error(f"Error creating workspace: {str(e)}")
            raise
    
    def get_workspace(self, workspace_id: str) -> Optional[Workspace]:
        """
        Retrieves a workspace by its ID
        
        Args:
            workspace_id: Workspace ID to retrieve
            
        Returns:
            Retrieved workspace or None if not found
        """
        try:
            # Query workspaces_collection for document with matching id
            workspace_doc = self.workspaces_collection.find_one({"id": workspace_id})
            
            if workspace_doc:
                # Convert document to Workspace object using from_dict
                return Workspace.from_dict(workspace_doc)
            
            return None
        
        except Exception as e:
            logger.error(f"Error retrieving workspace {workspace_id}: {str(e)}")
            return None
    
    def update_workspace(self, workspace_id: str, updates: Dict, user_id: str) -> Optional[Workspace]:
        """
        Updates workspace information
        
        Args:
            workspace_id: ID of the workspace to update
            updates: Dictionary of fields to update
            user_id: ID of the user making the update
            
        Returns:
            Updated workspace or None if not found
        """
        try:
            # Get existing workspace using get_workspace()
            workspace = self.get_workspace(workspace_id)
            
            if not workspace:
                logger.warning(f"Workspace not found for update: {workspace_id}")
                return None
            
            # Validate that user has permission to update the workspace
            if not workspace.has_access(user_id, WORKSPACE_PERMISSIONS.ADMIN.name):
                logger.warning(f"User {user_id} not authorized to update workspace {workspace_id}")
                raise ValueError("You don't have permission to update this workspace")
            
            # Apply updates to workspace fields (name, description, metadata)
            if "name" in updates:
                workspace.name = updates["name"]
            
            if "description" in updates:
                workspace.description = updates["description"]
            
            if "metadata" in updates and isinstance(updates["metadata"], dict):
                workspace.metadata.update(updates["metadata"])
            
            # Update updated_at timestamp
            workspace.updated_at = datetime.datetime.utcnow()
            
            # Save changes to workspaces_collection
            result = self.workspaces_collection.replace_one(
                {"id": workspace_id},
                workspace.to_dict()
            )
            
            if not result.matched_count:
                logger.warning(f"No workspace found with ID {workspace_id} for update")
                return None
            
            # Record workspace update activity
            self.record_activity(
                workspace_id=workspace_id,
                user_id=user_id,
                activity_type="workspace_updated",
                data={"updates": {k: v for k, v in updates.items() if k != "metadata"}}
            )
            
            # Publish workspace update event to Redis
            self.redis_client.publish(
                "workspace_events",
                f"workspace:{workspace_id}:updated"
            )
            
            return workspace
        
        except Exception as e:
            logger.error(f"Error updating workspace {workspace_id}: {str(e)}")
            if isinstance(e, ValueError):
                raise
            return None
    
    def delete_workspace(self, workspace_id: str, user_id: str) -> bool:
        """
        Marks a workspace as deleted (soft delete)
        
        Args:
            workspace_id: ID of the workspace to delete
            user_id: ID of the user requesting deletion
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get existing workspace using get_workspace()
            workspace = self.get_workspace(workspace_id)
            
            if not workspace:
                logger.warning(f"Workspace not found for deletion: {workspace_id}")
                return False
            
            # Validate that user has permission to delete the workspace
            if not workspace.has_access(user_id, WORKSPACE_PERMISSIONS.ADMIN.name):
                logger.warning(f"User {user_id} not authorized to delete workspace {workspace_id}")
                raise ValueError("You don't have permission to delete this workspace")
            
            # Call workspace.delete() to mark as deleted
            workspace.delete()
            
            # Update document in workspaces_collection
            result = self.workspaces_collection.update_one(
                {"id": workspace_id},
                {"$set": {"status": WORKSPACE_STATUS.DELETED.name, "updated_at": datetime.datetime.utcnow().isoformat()}}
            )
            
            if not result.matched_count:
                logger.warning(f"No workspace found with ID {workspace_id} for deletion")
                return False
            
            # Record workspace deletion activity
            self.record_activity(
                workspace_id=workspace_id,
                user_id=user_id,
                activity_type="workspace_deleted",
                data={}
            )
            
            # Publish workspace deletion event to Redis
            self.redis_client.publish(
                "workspace_events",
                f"workspace:{workspace_id}:deleted"
            )
            
            return True
        
        except Exception as e:
            logger.error(f"Error deleting workspace {workspace_id}: {str(e)}")
            if isinstance(e, ValueError):
                raise
            return False
    
    def archive_workspace(self, workspace_id: str, user_id: str) -> bool:
        """
        Archives a workspace (makes it read-only)
        
        Args:
            workspace_id: ID of the workspace to archive
            user_id: ID of the user requesting archival
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get existing workspace using get_workspace()
            workspace = self.get_workspace(workspace_id)
            
            if not workspace:
                logger.warning(f"Workspace not found for archival: {workspace_id}")
                return False
            
            # Validate that user has permission to archive the workspace
            if not workspace.has_access(user_id, WORKSPACE_PERMISSIONS.ADMIN.name):
                logger.warning(f"User {user_id} not authorized to archive workspace {workspace_id}")
                raise ValueError("You don't have permission to archive this workspace")
            
            # Call workspace.archive() to set status to ARCHIVED
            workspace.archive()
            
            # Update document in workspaces_collection
            result = self.workspaces_collection.update_one(
                {"id": workspace_id},
                {"$set": {"status": WORKSPACE_STATUS.ARCHIVED.name, "updated_at": datetime.datetime.utcnow().isoformat()}}
            )
            
            if not result.matched_count:
                logger.warning(f"No workspace found with ID {workspace_id} for archival")
                return False
            
            # Record workspace archival activity
            self.record_activity(
                workspace_id=workspace_id,
                user_id=user_id,
                activity_type="workspace_archived",
                data={}
            )
            
            # Publish workspace archival event to Redis
            self.redis_client.publish(
                "workspace_events",
                f"workspace:{workspace_id}:archived"
            )
            
            return True
        
        except Exception as e:
            logger.error(f"Error archiving workspace {workspace_id}: {str(e)}")
            if isinstance(e, ValueError):
                raise
            return False
    
    def restore_workspace(self, workspace_id: str, user_id: str) -> bool:
        """
        Restores an archived workspace to active status
        
        Args:
            workspace_id: ID of the workspace to restore
            user_id: ID of the user requesting restoration
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get existing workspace using get_workspace()
            workspace = self.get_workspace(workspace_id)
            
            if not workspace:
                logger.warning(f"Workspace not found for restoration: {workspace_id}")
                return False
            
            # Validate that user has permission to restore the workspace
            if not workspace.has_access(user_id, WORKSPACE_PERMISSIONS.ADMIN.name):
                logger.warning(f"User {user_id} not authorized to restore workspace {workspace_id}")
                raise ValueError("You don't have permission to restore this workspace")
            
            # Call workspace.restore() to set status to ACTIVE
            workspace.restore()
            
            # Update document in workspaces_collection
            result = self.workspaces_collection.update_one(
                {"id": workspace_id},
                {"$set": {"status": WORKSPACE_STATUS.ACTIVE.name, "updated_at": datetime.datetime.utcnow().isoformat()}}
            )
            
            if not result.matched_count:
                logger.warning(f"No workspace found with ID {workspace_id} for restoration")
                return False
            
            # Record workspace restoration activity
            self.record_activity(
                workspace_id=workspace_id,
                user_id=user_id,
                activity_type="workspace_restored",
                data={}
            )
            
            # Publish workspace restoration event to Redis
            self.redis_client.publish(
                "workspace_events",
                f"workspace:{workspace_id}:restored"
            )
            
            return True
        
        except Exception as e:
            logger.error(f"Error restoring workspace {workspace_id}: {str(e)}")
            if isinstance(e, ValueError):
                raise
            return False
    
    def list_workspaces(self, user_id: str = None, status: str = None, 
                        contract_id: str = None, job_id: str = None,
                        skip: int = 0, limit: int = 50) -> List[Workspace]:
        """
        Lists workspaces with optional filtering
        
        Args:
            user_id: Optional user ID to filter workspaces where user is a member
            status: Optional status filter (from WORKSPACE_STATUS)
            contract_id: Optional contract ID filter
            job_id: Optional job ID filter
            skip: Number of records to skip (pagination)
            limit: Maximum number of records to return (pagination)
            
        Returns:
            List of matching workspaces
        """
        try:
            # Construct query filter based on parameters
            query_filter = {}
            
            # If user_id provided, filter for workspaces where user is a member
            if user_id:
                query_filter["members.user_id"] = user_id
            
            # If status provided, filter by workspace status
            if status:
                if status not in [s.name for s in WORKSPACE_STATUS]:
                    raise ValueError(f"Invalid status: {status}")
                query_filter["status"] = status
            else:
                # By default, exclude deleted workspaces
                query_filter["status"] = {"$ne": WORKSPACE_STATUS.DELETED.name}
            
            # If contract_id provided, filter by related contract
            if contract_id:
                query_filter["contract_id"] = contract_id
            
            # If job_id provided, filter by related job
            if job_id:
                query_filter["job_id"] = job_id
            
            # Apply pagination with skip and limit
            cursor = self.workspaces_collection.find(query_filter).skip(skip).limit(limit)
            
            # Convert each document to Workspace object
            workspaces = [Workspace.from_dict(doc) for doc in cursor]
            
            return workspaces
        
        except Exception as e:
            logger.error(f"Error listing workspaces: {str(e)}")
            raise
    
    def add_workspace_member(self, workspace_id: str, user_id: str, role: str, 
                           permissions: Dict[str, bool] = None, added_by: str = None) -> Optional[WorkspaceMember]:
        """
        Adds a new member to a workspace
        
        Args:
            workspace_id: ID of the workspace
            user_id: ID of the user to add
            role: Role for the new member (from WORKSPACE_ROLES)
            permissions: Optional custom permissions
            added_by: ID of the user adding the member
            
        Returns:
            Newly added member or None if workspace not found
        """
        try:
            # Get existing workspace using get_workspace()
            workspace = self.get_workspace(workspace_id)
            
            if not workspace:
                logger.warning(f"Workspace not found when adding member: {workspace_id}")
                return None
            
            # Validate that added_by user has permission to add members
            if added_by and not workspace.has_access(added_by, WORKSPACE_PERMISSIONS.ADMIN.name):
                logger.warning(f"User {added_by} not authorized to add members to workspace {workspace_id}")
                raise ValueError("You don't have permission to add members to this workspace")
            
            # Call workspace.add_member() with user_id, role, and permissions
            member = workspace.add_member(user_id, role, permissions)
            
            # Update document in workspaces_collection
            result = self.workspaces_collection.update_one(
                {"id": workspace_id},
                {"$set": {
                    "members": [m.to_dict() for m in workspace.members],
                    "updated_at": datetime.datetime.utcnow().isoformat()
                }}
            )
            
            if not result.matched_count:
                logger.warning(f"No workspace found with ID {workspace_id} when adding member")
                return None
            
            # Record member addition activity
            self.record_activity(
                workspace_id=workspace_id,
                user_id=added_by or user_id,
                activity_type="member_added",
                data={"user_id": user_id, "role": role}
            )
            
            # Publish member addition event to Redis
            self.redis_client.publish(
                "workspace_events",
                f"workspace:{workspace_id}:member_added:{user_id}"
            )
            
            return member
        
        except Exception as e:
            logger.error(f"Error adding member to workspace {workspace_id}: {str(e)}")
            if isinstance(e, ValueError):
                raise
            return None
    
    def remove_workspace_member(self, workspace_id: str, user_id: str, removed_by: str) -> bool:
        """
        Removes a member from a workspace
        
        Args:
            workspace_id: ID of the workspace
            user_id: ID of the user to remove
            removed_by: ID of the user removing the member
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get existing workspace using get_workspace()
            workspace = self.get_workspace(workspace_id)
            
            if not workspace:
                logger.warning(f"Workspace not found when removing member: {workspace_id}")
                return False
            
            # Validate that removed_by user has permission to remove members
            if not workspace.has_access(removed_by, WORKSPACE_PERMISSIONS.ADMIN.name):
                # Users can always remove themselves
                if removed_by != user_id:
                    logger.warning(f"User {removed_by} not authorized to remove member {user_id} from workspace {workspace_id}")
                    raise ValueError("You don't have permission to remove members from this workspace")
            
            # Call workspace.remove_member() with user_id
            if not workspace.remove_member(user_id):
                return False
            
            # Update document in workspaces_collection
            result = self.workspaces_collection.update_one(
                {"id": workspace_id},
                {"$set": {
                    "members": [m.to_dict() for m in workspace.members],
                    "updated_at": datetime.datetime.utcnow().isoformat()
                }}
            )
            
            if not result.matched_count:
                logger.warning(f"No workspace found with ID {workspace_id} when removing member")
                return False
            
            # Record member removal activity
            self.record_activity(
                workspace_id=workspace_id,
                user_id=removed_by,
                activity_type="member_removed",
                data={"user_id": user_id}
            )
            
            # Publish member removal event to Redis
            self.redis_client.publish(
                "workspace_events",
                f"workspace:{workspace_id}:member_removed:{user_id}"
            )
            
            return True
        
        except Exception as e:
            logger.error(f"Error removing member from workspace {workspace_id}: {str(e)}")
            if isinstance(e, ValueError):
                raise
            return False
    
    def update_member_role(self, workspace_id: str, user_id: str, new_role: str, updated_by: str) -> bool:
        """
        Updates a member's role in a workspace
        
        Args:
            workspace_id: ID of the workspace
            user_id: ID of the user to update
            new_role: New role to assign (from WORKSPACE_ROLES)
            updated_by: ID of the user updating the role
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get existing workspace using get_workspace()
            workspace = self.get_workspace(workspace_id)
            
            if not workspace:
                logger.warning(f"Workspace not found when updating member role: {workspace_id}")
                return False
            
            # Validate that updated_by user has permission to update roles
            if not workspace.has_access(updated_by, WORKSPACE_PERMISSIONS.ADMIN.name):
                logger.warning(f"User {updated_by} not authorized to update roles in workspace {workspace_id}")
                raise ValueError("You don't have permission to update member roles in this workspace")
            
            # Validate role
            if new_role not in [r.name for r in WORKSPACE_ROLES]:
                raise ValueError(f"Invalid role: {new_role}")
            
            # Call workspace.update_member_role() with user_id and new_role
            if not workspace.update_member_role(user_id, new_role):
                return False
            
            # Update document in workspaces_collection
            result = self.workspaces_collection.update_one(
                {"id": workspace_id},
                {"$set": {
                    "members": [m.to_dict() for m in workspace.members],
                    "updated_at": datetime.datetime.utcnow().isoformat()
                }}
            )
            
            if not result.matched_count:
                logger.warning(f"No workspace found with ID {workspace_id} when updating member role")
                return False
            
            # Record role update activity
            self.record_activity(
                workspace_id=workspace_id,
                user_id=updated_by,
                activity_type="member_role_updated",
                data={"user_id": user_id, "new_role": new_role}
            )
            
            # Publish role update event to Redis
            self.redis_client.publish(
                "workspace_events",
                f"workspace:{workspace_id}:member_role_updated:{user_id}"
            )
            
            return True
        
        except Exception as e:
            logger.error(f"Error updating member role in workspace {workspace_id}: {str(e)}")
            if isinstance(e, ValueError):
                raise
            return False
    
    def get_workspace_members(self, workspace_id: str) -> List[Dict]:
        """
        Retrieves the members of a workspace
        
        Args:
            workspace_id: ID of the workspace
            
        Returns:
            List of workspace members
        """
        try:
            # Get existing workspace using get_workspace()
            workspace = self.get_workspace(workspace_id)
            
            if not workspace:
                logger.warning(f"Workspace not found when getting members: {workspace_id}")
                return []
            
            # If workspace found, return workspace.members list
            members_dict = [member.to_dict() for member in workspace.members]
            
            return members_dict
        
        except Exception as e:
            logger.error(f"Error getting workspace members for {workspace_id}: {str(e)}")
            return []
    
    def update_member_activity(self, workspace_id: str, user_id: str) -> bool:
        """
        Updates the last activity timestamp for a member
        
        Args:
            workspace_id: ID of the workspace
            user_id: ID of the user
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get existing workspace using get_workspace()
            workspace = self.get_workspace(workspace_id)
            
            if not workspace:
                logger.warning(f"Workspace not found when updating member activity: {workspace_id}")
                return False
            
            # Call workspace.update_activity() with user_id
            if not workspace.update_activity(user_id):
                return False
            
            # Update document in workspaces_collection if changed
            member = workspace.get_member(user_id)
            if member:
                result = self.workspaces_collection.update_one(
                    {"id": workspace_id, "members.user_id": user_id},
                    {"$set": {"members.$.last_active_at": member.last_active_at.isoformat()}}
                )
                
                return result.matched_count > 0
            
            return False
        
        except Exception as e:
            logger.error(f"Error updating member activity in workspace {workspace_id}: {str(e)}")
            return False
    
    def has_access(self, workspace_id: str, user_id: str, permission: str = None) -> bool:
        """
        Checks if a user has specific access to a workspace
        
        Args:
            workspace_id: ID of the workspace
            user_id: ID of the user
            permission: Specific permission to check (from WORKSPACE_PERMISSIONS)
            
        Returns:
            True if user has access, False otherwise
        """
        try:
            # Get existing workspace using get_workspace()
            workspace = self.get_workspace(workspace_id)
            
            if not workspace:
                logger.warning(f"Workspace not found when checking access: {workspace_id}")
                return False
            
            # If workspace not found, return False
            # Call workspace.has_access() with user_id and permission
            return workspace.has_access(user_id, permission)
        
        except Exception as e:
            logger.error(f"Error checking access for user {user_id} in workspace {workspace_id}: {str(e)}")
            return False
    
    def upload_file(self, workspace_id: str, user_id: str, filename: str, content: bytes, 
                   description: str = "", metadata: Dict = None) -> Dict:
        """
        Uploads a file to a workspace
        
        Args:
            workspace_id: ID of the workspace
            user_id: ID of the user uploading the file
            filename: Name of the file
            content: Binary content of the file
            description: Optional file description
            metadata: Optional metadata dictionary
            
        Returns:
            File information including path and metadata
            
        Raises:
            ValueError: If user doesn't have permission or file is invalid
        """
        try:
            # Validate that user has WRITE permission for the workspace
            if not self.has_access(workspace_id, user_id, WORKSPACE_PERMISSIONS.WRITE.name):
                logger.warning(f"User {user_id} not authorized to upload files to workspace {workspace_id}")
                raise ValueError("You don't have permission to upload files to this workspace")
            
            # Use FILE_MANAGER.upload_file to save the file
            file_info = FILE_MANAGER.upload_file(workspace_id, filename, content)
            
            # Get workspace and add file to workspace.files
            workspace = self.get_workspace(workspace_id)
            
            if not workspace:
                logger.warning(f"Workspace not found after file upload: {workspace_id}")
                raise ValueError(f"Workspace not found: {workspace_id}")
            
            # Add file to workspace
            workspace_file = workspace.add_file(
                name=file_info['name'],
                file_path=file_info['path'],
                file_type=os.path.splitext(filename)[1].lstrip('.').lower(),
                size=file_info['size'],
                mimetype=file_info['type'],
                created_by=user_id,
                description=description,
                metadata=metadata or {}
            )
            
            # Update workspace document in workspaces_collection
            result = self.workspaces_collection.update_one(
                {"id": workspace_id},
                {"$set": {
                    "files": [f.to_dict() for f in workspace.files],
                    "updated_at": datetime.datetime.utcnow().isoformat()
                }}
            )
            
            if not result.matched_count:
                logger.warning(f"No workspace found with ID {workspace_id} after file upload")
                raise ValueError(f"Failed to update workspace with new file: {workspace_id}")
            
            # Record file upload activity
            self.record_activity(
                workspace_id=workspace_id,
                user_id=user_id,
                activity_type="file_uploaded",
                data={"file_id": workspace_file.id, "filename": filename}
            )
            
            # Publish file upload event to Redis
            self.redis_client.publish(
                "workspace_events",
                f"workspace:{workspace_id}:file_uploaded:{workspace_file.id}"
            )
            
            # Return file information dictionary
            return workspace_file.to_dict()
        
        except Exception as e:
            logger.error(f"Error uploading file to workspace {workspace_id}: {str(e)}")
            if isinstance(e, ValueError):
                raise
            raise ValueError(f"Error uploading file: {str(e)}")
    
    def download_file(self, workspace_id: str, file_id: str, user_id: str) -> Tuple[bytes, str, str]:
        """
        Downloads a file from a workspace
        
        Args:
            workspace_id: ID of the workspace
            file_id: ID of the file to download
            user_id: ID of the user downloading the file
            
        Returns:
            Tuple of (bytes content, str filename, str mimetype)
            
        Raises:
            ValueError: If user doesn't have permission or file is not found
        """
        try:
            # Validate that user has READ permission for the workspace
            if not self.has_access(workspace_id, user_id, WORKSPACE_PERMISSIONS.READ.name):
                logger.warning(f"User {user_id} not authorized to download files from workspace {workspace_id}")
                raise ValueError("You don't have permission to download files from this workspace")
            
            # Get workspace and find file with matching file_id
            workspace = self.get_workspace(workspace_id)
            
            if not workspace:
                logger.warning(f"Workspace not found when downloading file: {workspace_id}")
                raise ValueError(f"Workspace not found: {workspace_id}")
            
            # Find the file
            workspace_file = workspace.get_file(file_id)
            
            if not workspace_file:
                logger.warning(f"File not found in workspace: {file_id}")
                raise ValueError(f"File not found: {file_id}")
            
            # Use FILE_MANAGER.download_file to get file content
            content, filename, mimetype = FILE_MANAGER.download_file(workspace_file.file_path)
            
            # Record file download activity
            self.record_activity(
                workspace_id=workspace_id,
                user_id=user_id,
                activity_type="file_downloaded",
                data={"file_id": file_id, "filename": workspace_file.name}
            )
            
            # Return tuple with file content, filename, and mimetype
            return content, filename, mimetype
        
        except Exception as e:
            logger.error(f"Error downloading file {file_id} from workspace {workspace_id}: {str(e)}")
            if isinstance(e, ValueError):
                raise
            if isinstance(e, FileNotFoundError):
                raise ValueError(f"File not found: {file_id}")
            raise ValueError(f"Error downloading file: {str(e)}")
    
    def delete_file(self, workspace_id: str, file_id: str, user_id: str) -> bool:
        """
        Deletes a file from a workspace
        
        Args:
            workspace_id: ID of the workspace
            file_id: ID of the file to delete
            user_id: ID of the user deleting the file
            
        Returns:
            True if successful, False otherwise
            
        Raises:
            ValueError: If user doesn't have permission
        """
        try:
            # Validate that user has WRITE permission for the workspace
            if not self.has_access(workspace_id, user_id, WORKSPACE_PERMISSIONS.WRITE.name):
                logger.warning(f"User {user_id} not authorized to delete files from workspace {workspace_id}")
                raise ValueError("You don't have permission to delete files from this workspace")
            
            # Get workspace and find file with matching file_id
            workspace = self.get_workspace(workspace_id)
            
            if not workspace:
                logger.warning(f"Workspace not found when deleting file: {workspace_id}")
                return False
            
            # Find the file
            workspace_file = workspace.get_file(file_id)
            
            if not workspace_file:
                logger.warning(f"File not found in workspace: {file_id}")
                return False
            
            # Use FILE_MANAGER.delete_file to remove the file
            if not FILE_MANAGER.delete_file(workspace_file.file_path):
                logger.warning(f"Failed to delete file from storage: {workspace_file.file_path}")
                return False
            
            # Call workspace.remove_file() to update workspace record
            if not workspace.remove_file(file_id):
                logger.warning(f"Failed to remove file from workspace: {file_id}")
                return False
            
            # Update workspace document in workspaces_collection
            result = self.workspaces_collection.update_one(
                {"id": workspace_id},
                {"$set": {
                    "files": [f.to_dict() for f in workspace.files],
                    "updated_at": datetime.datetime.utcnow().isoformat()
                }}
            )
            
            if not result.matched_count:
                logger.warning(f"No workspace found with ID {workspace_id} after file deletion")
                return False
            
            # Record file deletion activity
            self.record_activity(
                workspace_id=workspace_id,
                user_id=user_id,
                activity_type="file_deleted",
                data={"file_id": file_id, "filename": workspace_file.name}
            )
            
            # Publish file deletion event to Redis
            self.redis_client.publish(
                "workspace_events",
                f"workspace:{workspace_id}:file_deleted:{file_id}"
            )
            
            return True
        
        except Exception as e:
            logger.error(f"Error deleting file {file_id} from workspace {workspace_id}: {str(e)}")
            if isinstance(e, ValueError):
                raise
            return False
    
    def list_files(self, workspace_id: str, user_id: str, file_type: str = None) -> List[Dict]:
        """
        Lists files in a workspace with optional filtering
        
        Args:
            workspace_id: ID of the workspace
            user_id: ID of the user requesting the list
            file_type: Optional filter for file type
            
        Returns:
            List of file information dictionaries
            
        Raises:
            ValueError: If user doesn't have permission
        """
        try:
            # Validate that user has READ permission for the workspace
            if not self.has_access(workspace_id, user_id, WORKSPACE_PERMISSIONS.READ.name):
                logger.warning(f"User {user_id} not authorized to list files in workspace {workspace_id}")
                raise ValueError("You don't have permission to list files in this workspace")
            
            # Get workspace and extract files list
            workspace = self.get_workspace(workspace_id)
            
            if not workspace:
                logger.warning(f"Workspace not found when listing files: {workspace_id}")
                return []
            
            # Get the list of files
            files = workspace.files
            
            # If file_type provided, filter files by type
            if file_type:
                files = [f for f in files if f.file_type.lower() == file_type.lower()]
            
            # Convert each file to dictionary representation
            files_dict = [f.to_dict() for f in files]
            
            return files_dict
        
        except Exception as e:
            logger.error(f"Error listing files in workspace {workspace_id}: {str(e)}")
            if isinstance(e, ValueError):
                raise
            return []
    
    def create_notebook(self, workspace_id: str, name: str, user_id: str, 
                       description: str = "", kernel_name: str = "python3",
                       metadata: Dict = None) -> Notebook:
        """
        Creates a new Jupyter notebook in a workspace
        
        Args:
            workspace_id: ID of the workspace
            name: Name of the notebook
            user_id: ID of the user creating the notebook
            description: Optional notebook description
            kernel_name: Jupyter kernel name to use
            metadata: Optional metadata dictionary
            
        Returns:
            Newly created notebook
            
        Raises:
            ValueError: If user doesn't have permission
        """
        try:
            # Validate that user has WRITE permission for the workspace
            if not self.has_access(workspace_id, user_id, WORKSPACE_PERMISSIONS.WRITE.name):
                logger.warning(f"User {user_id} not authorized to create notebooks in workspace {workspace_id}")
                raise ValueError("You don't have permission to create notebooks in this workspace")
            
            # Create new Notebook instance with provided parameters
            notebook = Notebook(
                name=name,
                workspace_id=workspace_id,
                created_by=user_id,
                description=description,
                kernel_name=kernel_name,
                metadata=metadata or {}
            )
            
            # Add a default markdown cell with notebook title
            notebook.add_cell(
                cell_type=CELL_TYPES.MARKDOWN.name,
                source=f"# {name}\n\nCreated on {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}"
            )
            
            # Add a default code cell
            notebook.add_cell(
                cell_type=CELL_TYPES.CODE.name,
                source="# Write your code here\n\n"
            )
            
            # Save notebook to disk using FILE_MANAGER.save_notebook
            file_path = FILE_MANAGER.save_notebook(notebook, workspace_id)
            notebook.file_path = file_path
            
            # Insert notebook document into notebooks_collection
            notebook_dict = notebook.to_dict()
            result = self.notebooks_collection.insert_one(notebook_dict)
            
            if not result.acknowledged:
                raise Exception("Failed to insert notebook document")
            
            # Record notebook creation activity
            self.record_activity(
                workspace_id=workspace_id,
                user_id=user_id,
                activity_type="notebook_created",
                data={"notebook_id": notebook.id, "notebook_name": name}
            )
            
            # Publish notebook creation event to Redis
            self.redis_client.publish(
                "workspace_events",
                f"workspace:{workspace_id}:notebook_created:{notebook.id}"
            )
            
            return notebook
        
        except Exception as e:
            logger.error(f"Error creating notebook in workspace {workspace_id}: {str(e)}")
            if isinstance(e, ValueError):
                raise
            raise ValueError(f"Error creating notebook: {str(e)}")
    
    def get_notebook(self, notebook_id: str, user_id: str) -> Optional[Notebook]:
        """
        Retrieves a notebook by its ID
        
        Args:
            notebook_id: ID of the notebook to retrieve
            user_id: ID of the user requesting the notebook
            
        Returns:
            Retrieved notebook or None if not found
            
        Raises:
            ValueError: If user doesn't have permission
        """
        try:
            # Query notebooks_collection for document with matching id
            notebook_doc = self.notebooks_collection.find_one({"id": notebook_id})
            
            if not notebook_doc:
                logger.warning(f"Notebook not found: {notebook_id}")
                return None
            
            # If found, convert document to Notebook object using from_dict
            notebook = Notebook.from_dict(notebook_doc)
            
            # Validate that user has access to the notebook's workspace
            if not self.has_access(notebook.workspace_id, user_id, WORKSPACE_PERMISSIONS.READ.name):
                logger.warning(f"User {user_id} not authorized to access notebook {notebook_id}")
                raise ValueError("You don't have permission to access this notebook")
            
            # If not found or no access, return None
            return notebook
        
        except Exception as e:
            logger.error(f"Error retrieving notebook {notebook_id}: {str(e)}")
            if isinstance(e, ValueError):
                raise
            return None
    
    def update_notebook(self, notebook_id: str, updates: Dict, user_id: str) -> Optional[Notebook]:
        """
        Updates a Jupyter notebook
        
        Args:
            notebook_id: ID of the notebook to update
            updates: Dictionary of updates to apply
            user_id: ID of the user making the update
            
        Returns:
            Updated notebook or None if not found
            
        Raises:
            ValueError: If user doesn't have permission
        """
        try:
            # Get existing notebook using get_notebook()
            notebook = self.get_notebook(notebook_id, user_id)
            
            if not notebook:
                logger.warning(f"Notebook not found for update: {notebook_id}")
                return None
            
            # Validate that user has WRITE permission for the workspace
            if not self.has_access(notebook.workspace_id, user_id, WORKSPACE_PERMISSIONS.WRITE.name):
                logger.warning(f"User {user_id} not authorized to update notebook {notebook_id}")
                raise ValueError("You don't have permission to update this notebook")
            
            # Apply updates to notebook fields
            if "name" in updates:
                notebook.name = updates["name"]
            
            if "description" in updates:
                notebook.description = updates["description"]
            
            if "kernel_name" in updates:
                notebook.kernel_name = updates["kernel_name"]
            
            if "cells" in updates and isinstance(updates["cells"], list):
                # Clear existing cells
                notebook.cells = []
                
                # Add updated cells
                for cell_data in updates["cells"]:
                    cell_type = cell_data.get("cell_type")
                    source = cell_data.get("source", "")
                    outputs = cell_data.get("outputs", [])
                    execution_count = cell_data.get("execution_count")
                    metadata = cell_data.get("metadata", {})
                    
                    # Create cell
                    cell = notebook.add_cell(cell_type, source, metadata=metadata)
                    
                    # Add outputs for code cells
                    if cell_type == CELL_TYPES.CODE.name and outputs:
                        cell.update_outputs(outputs, execution_count)
            
            if "metadata" in updates and isinstance(updates["metadata"], dict):
                notebook.update_metadata(updates["metadata"], user_id)
            
            # Update notebook timestamps
            notebook.updated_at = datetime.datetime.utcnow()
            notebook.updated_by = user_id
            
            # Save updated notebook to disk using FILE_MANAGER.save_notebook
            file_path = FILE_MANAGER.save_notebook(notebook, notebook.workspace_id)
            notebook.file_path = file_path
            
            # Update document in notebooks_collection
            result = self.notebooks_collection.replace_one(
                {"id": notebook_id},
                notebook.to_dict()
            )
            
            if not result.matched_count:
                logger.warning(f"No notebook found with ID {notebook_id} for update")
                return None
            
            # Record notebook update activity
            self.record_activity(
                workspace_id=notebook.workspace_id,
                user_id=user_id,
                activity_type="notebook_updated",
                data={"notebook_id": notebook_id, "updates": {k: v for k, v in updates.items() if k != "cells" and k != "metadata"}}
            )
            
            # Publish notebook update event to Redis
            self.redis_client.publish(
                "workspace_events",
                f"workspace:{notebook.workspace_id}:notebook_updated:{notebook_id}"
            )
            
            return notebook
        
        except Exception as e:
            logger.error(f"Error updating notebook {notebook_id}: {str(e)}")
            if isinstance(e, ValueError):
                raise
            return None
    
    def delete_notebook(self, notebook_id: str, user_id: str) -> bool:
        """
        Marks a notebook as deleted (soft delete)
        
        Args:
            notebook_id: ID of the notebook to delete
            user_id: ID of the user requesting deletion
            
        Returns:
            True if successful, False otherwise
            
        Raises:
            ValueError: If user doesn't have permission
        """
        try:
            # Get existing notebook using get_notebook()
            notebook = self.get_notebook(notebook_id, user_id)
            
            if not notebook:
                logger.warning(f"Notebook not found for deletion: {notebook_id}")
                return False
            
            # Validate that user has WRITE permission for the workspace
            if not self.has_access(notebook.workspace_id, user_id, WORKSPACE_PERMISSIONS.WRITE.name):
                logger.warning(f"User {user_id} not authorized to delete notebook {notebook_id}")
                raise ValueError("You don't have permission to delete this notebook")
            
            # Call notebook.delete() to mark as deleted
            notebook.delete()
            
            # Update document in notebooks_collection
            result = self.notebooks_collection.update_one(
                {"id": notebook_id},
                {"$set": {"status": NOTEBOOK_STATUS.DELETED.name, "updated_at": datetime.datetime.utcnow().isoformat()}}
            )
            
            if not result.matched_count:
                logger.warning(f"No notebook found with ID {notebook_id} for deletion")
                return False
            
            # Record notebook deletion activity
            self.record_activity(
                workspace_id=notebook.workspace_id,
                user_id=user_id,
                activity_type="notebook_deleted",
                data={"notebook_id": notebook_id, "notebook_name": notebook.name}
            )
            
            # Publish notebook deletion event to Redis
            self.redis_client.publish(
                "workspace_events",
                f"workspace:{notebook.workspace_id}:notebook_deleted:{notebook_id}"
            )
            
            return True
        
        except Exception as e:
            logger.error(f"Error deleting notebook {notebook_id}: {str(e)}")
            if isinstance(e, ValueError):
                raise
            return False
    
    def list_notebooks(self, workspace_id: str, user_id: str, status: str = None) -> List[Notebook]:
        """
        Lists notebooks in a workspace
        
        Args:
            workspace_id: ID of the workspace
            user_id: ID of the user requesting the list
            status: Optional status filter (from NOTEBOOK_STATUS)
            
        Returns:
            List of notebook objects
            
        Raises:
            ValueError: If user doesn't have permission
        """
        try:
            # Validate that user has READ permission for the workspace
            if not self.has_access(workspace_id, user_id, WORKSPACE_PERMISSIONS.READ.name):
                logger.warning(f"User {user_id} not authorized to list notebooks in workspace {workspace_id}")
                raise ValueError("You don't have permission to list notebooks in this workspace")
            
            # Construct query filter with workspace_id
            query_filter = {"workspace_id": workspace_id}
            
            # If status provided, filter by notebook status
            if status:
                if status not in [s.name for s in NOTEBOOK_STATUS]:
                    raise ValueError(f"Invalid status: {status}")
                query_filter["status"] = status
            else:
                # By default, exclude deleted notebooks
                query_filter["status"] = {"$ne": NOTEBOOK_STATUS.DELETED.name}
            
            # Query notebooks_collection with constructed filter
            cursor = self.notebooks_collection.find(query_filter)
            
            # Convert each document to Notebook object
            notebooks = [Notebook.from_dict(doc) for doc in cursor]
            
            return notebooks
        
        except Exception as e:
            logger.error(f"Error listing notebooks in workspace {workspace_id}: {str(e)}")
            if isinstance(e, ValueError):
                raise
            return []
    
    def record_activity(self, workspace_id: str, user_id: str, activity_type: str, data: Dict = None) -> WorkspaceActivity:
        """
        Records an activity in a workspace
        
        Args:
            workspace_id: ID of the workspace
            user_id: ID of the user performing the activity
            activity_type: Type of activity
            data: Optional data related to the activity
            
        Returns:
            Created activity record
        """
        try:
            # Create WorkspaceActivity instance with provided parameters
            activity = WorkspaceActivity(
                workspace_id=workspace_id,
                user_id=user_id,
                activity_type=activity_type,
                data=data or {}
            )
            
            # Insert activity document into activities_collection
            activity_dict = activity.to_dict()
            self.activities_collection.insert_one(activity_dict)
            
            # Publish activity event to Redis for real-time updates
            self.redis_client.publish(
                "workspace_activities",
                f"workspace:{workspace_id}:activity:{activity.id}"
            )
            
            return activity
        
        except Exception as e:
            logger.error(f"Error recording activity in workspace {workspace_id}: {str(e)}")
            # Continue without failing if activity recording fails
            return None
    
    def get_activities(self, workspace_id: str, user_id: str, 
                      activity_type: str = None, limit: int = 50) -> List[WorkspaceActivity]:
        """
        Retrieves activities for a workspace
        
        Args:
            workspace_id: ID of the workspace
            user_id: ID of the user requesting activities
            activity_type: Optional activity type filter
            limit: Maximum number of activities to return
            
        Returns:
            List of activity records
            
        Raises:
            ValueError: If user doesn't have permission
        """
        try:
            # Validate that user has READ permission for the workspace
            if not self.has_access(workspace_id, user_id, WORKSPACE_PERMISSIONS.READ.name):
                logger.warning(f"User {user_id} not authorized to view activities in workspace {workspace_id}")
                raise ValueError("You don't have permission to view activities in this workspace")
            
            # Construct query filter with workspace_id
            query_filter = {"workspace_id": workspace_id}
            
            # If activity_type provided, filter by type
            if activity_type:
                query_filter["activity_type"] = activity_type
            
            # Query activities_collection with filter and sort by timestamp
            cursor = self.activities_collection.find(query_filter).sort("timestamp", pymongo.DESCENDING).limit(limit)
            
            # Initialize empty list for activities
            activities = []
            
            # Convert each document to WorkspaceActivity object
            for doc in cursor:
                activity = WorkspaceActivity(
                    workspace_id=doc["workspace_id"],
                    user_id=doc["user_id"],
                    activity_type=doc["activity_type"],
                    data=doc.get("data", {})
                )
                activity.id = doc["id"]
                activity.timestamp = datetime.datetime.fromisoformat(doc["timestamp"])
                activities.append(activity)
            
            return activities
        
        except Exception as e:
            logger.error(f"Error getting activities for workspace {workspace_id}: {str(e)}")
            if isinstance(e, ValueError):
                raise
            return []
    
    def cleanup_inactive_workspaces(self) -> int:
        """
        Archives workspaces that have been inactive beyond the threshold
        
        Returns:
            Number of workspaces archived
        """
        try:
            # Calculate inactivity threshold using WORKSPACE_INACTIVITY_TIMEOUT
            timeout = settings.WORKSPACE_INACTIVITY_TIMEOUT
            threshold = datetime.datetime.utcnow() - datetime.timedelta(seconds=timeout)
            
            # Query for active workspaces not modified since threshold
            query_filter = {
                "status": WORKSPACE_STATUS.ACTIVE.name,
                "updated_at": {"$lt": threshold.isoformat()}
            }
            
            # Find inactive workspaces
            inactive_workspaces = self.workspaces_collection.find(query_filter)
            
            # For each inactive workspace, call archive_workspace()
            count = 0
            for workspace_doc in inactive_workspaces:
                workspace = Workspace.from_dict(workspace_doc)
                
                # Archives the workspace if all members are also inactive
                if workspace.is_inactive():
                    self.archive_workspace(workspace.id, "system")
                    count += 1
            
            # Log cleanup results
            logger.info(f"Archived {count} inactive workspaces")
            
            # Return count of archived workspaces
            return count
        
        except Exception as e:
            logger.error(f"Error cleaning up inactive workspaces: {str(e)}")
            return 0
    
    def hard_delete_workspace(self, workspace_id: str, admin_id: str) -> bool:
        """
        Permanently deletes a workspace and all associated resources
        
        Args:
            workspace_id: ID of the workspace to delete
            admin_id: ID of the administrator performing the deletion
            
        Returns:
            True if successful, False otherwise
            
        Raises:
            ValueError: If user doesn't have administrative privileges
        """
        try:
            # Validate that admin_id has administrative privileges
            workspace = self.get_workspace(workspace_id)
            
            if not workspace:
                logger.warning(f"Workspace not found for hard deletion: {workspace_id}")
                return False
            
            # Check if the admin is either a system admin or the workspace owner
            is_admin = False  # This would be replaced with an actual admin check
            is_owner = workspace.get_member(admin_id) and workspace.get_member(admin_id).role == WORKSPACE_ROLES.OWNER.name
            
            if not (is_admin or is_owner):
                logger.warning(f"User {admin_id} not authorized for hard delete of workspace {workspace_id}")
                raise ValueError("You don't have permission to permanently delete this workspace")
            
            # Delete all associated notebooks from notebooks_collection
            self.notebooks_collection.delete_many({"workspace_id": workspace_id})
            
            # Delete all activities from activities_collection
            self.activities_collection.delete_many({"workspace_id": workspace_id})
            
            # Use FILE_MANAGER.cleanup_workspace_files to remove files
            FILE_MANAGER.cleanup_workspace_files(workspace_id)
            
            # Delete workspace document from workspaces_collection
            result = self.workspaces_collection.delete_one({"id": workspace_id})
            
            if not result.deleted_count:
                logger.warning(f"No workspace found with ID {workspace_id} for hard deletion")
                return False
            
            # Log permanent deletion
            logger.info(f"Workspace {workspace_id} permanently deleted by admin {admin_id}")
            
            return True
        
        except Exception as e:
            logger.error(f"Error performing hard delete of workspace {workspace_id}: {str(e)}")
            if isinstance(e, ValueError):
                raise
            return False