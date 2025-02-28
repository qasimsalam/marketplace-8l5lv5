"""
API Routes for the AI Talent Marketplace collaboration service.

This module defines the HTTP API endpoints for workspace management, file operations,
Jupyter notebook integration, and real-time collaboration features to support
AI professionals and clients working together on projects.
"""

import logging
from typing import List, Dict, Optional, Any
import jwt

# FastAPI - v0.100.0
from fastapi import APIRouter, Depends, HTTPException, status, Body, Path, Query, File, UploadFile, BackgroundTasks
from fastapi.responses import StreamingResponse

# Pydantic - v2.0.0
from pydantic import BaseModel, Field

# Internal imports
from ..config import settings, API_PREFIX, ALLOWED_FILE_TYPES, MAX_FILE_SIZE_MB
from ..models.workspace import Workspace, WORKSPACE_ROLES, WORKSPACE_STATUS, WORKSPACE_PERMISSIONS
from ..models.notebook import Notebook, CELL_TYPES, NOTEBOOK_STATUS, EXECUTION_STATE
from ..services.workspace_service import WorkspaceService
from ..services.jupyter_service import JupyterService
from ..utils.file_manager import FILE_MANAGER

# Initialize router with tags
router = APIRouter(tags=["Collaboration"])

# Configure logger
logger = logging.getLogger(__name__)

# Initialize services
workspace_service = WorkspaceService()
jupyter_service = JupyterService()

# Pydantic models for request validation
class WorkspaceCreate(BaseModel):
    """Pydantic model for workspace creation request data"""
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(default="")
    contract_id: str = Field(...)
    job_id: str = Field(...)
    metadata: Optional[Dict[str, Any]] = Field(default=None)

class WorkspaceUpdate(BaseModel):
    """Pydantic model for workspace update request data"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None)
    metadata: Optional[Dict[str, Any]] = Field(default=None)

class MemberAdd(BaseModel):
    """Pydantic model for adding a member to a workspace"""
    user_id: str = Field(...)
    role: str = Field(...)  # Must be one of WORKSPACE_ROLES
    permissions: Optional[Dict[str, bool]] = Field(default=None)

class MemberUpdate(BaseModel):
    """Pydantic model for updating a member's role in a workspace"""
    role: str = Field(...)  # Must be one of WORKSPACE_ROLES

class NotebookCreate(BaseModel):
    """Pydantic model for notebook creation request data"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(default="")
    kernel_name: Optional[str] = Field(default="python3")
    metadata: Optional[Dict[str, Any]] = Field(default=None)

class NotebookUpdate(BaseModel):
    """Pydantic model for notebook update request data"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None)
    metadata: Optional[Dict[str, Any]] = Field(default=None)

class CellUpdate(BaseModel):
    """Pydantic model for updating a notebook cell"""
    source: Optional[str] = Field(default=None)
    outputs: Optional[List[Dict[str, Any]]] = Field(default=None)
    execution_count: Optional[int] = Field(default=None)

class CodeExecute(BaseModel):
    """Pydantic model for code execution request"""
    code: str = Field(...)


# Helper functions
async def get_current_user(token: str) -> Dict[str, Any]:
    """
    Dependency function to authenticate and get current user from JWT token
    
    Args:
        token: JWT token from Authorization header
        
    Returns:
        User information including ID and role
        
    Raises:
        HTTPException: If token is invalid or missing
    """
    try:
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Remove Bearer prefix if present
        if token.startswith("Bearer "):
            token = token.replace("Bearer ", "")
        
        # Decode and verify token
        # Note: In production, you would use proper secret key & algorithms
        # For this implementation, we assume the token is already verified by the API Gateway
        payload = jwt.decode(token, options={"verify_signature": False})
        
        # Extract user information from token payload
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Return user information
        return {
            "id": user_id,
            "role": payload.get("role", "user"),
        }
    
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def verify_workspace_access(workspace_id: str, current_user: Dict[str, Any], permission: str) -> bool:
    """
    Verifies user access to a workspace with specific permission
    
    Args:
        workspace_id: ID of the workspace to check
        current_user: User information from JWT token
        permission: Permission to check (from WORKSPACE_PERMISSIONS)
        
    Returns:
        True if access is allowed
        
    Raises:
        HTTPException: If access is denied
    """
    user_id = current_user["id"]
    
    # Check if user has the specified permission
    has_access = workspace_service.has_access(workspace_id, user_id, permission)
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You don't have {permission} permission for this workspace"
        )
    
    return True


# Workspace routes
@router.get("/workspaces")
async def list_workspaces(
    current_user: Dict[str, Any] = Depends(get_current_user),
    status: Optional[str] = Query(None),
    contract_id: Optional[str] = Query(None),
    job_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """
    List workspaces with optional filtering
    """
    user_id = current_user["id"]
    
    try:
        workspaces = workspace_service.list_workspaces(
            user_id=user_id,
            status=status,
            contract_id=contract_id,
            job_id=job_id,
            skip=skip,
            limit=limit
        )
        
        # Convert workspaces to dictionaries for JSON response
        return [workspace.to_dict() for workspace in workspaces]
    
    except Exception as e:
        logger.error(f"Error listing workspaces: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list workspaces: {str(e)}"
        )


@router.post("/workspaces", status_code=status.HTTP_201_CREATED)
async def create_workspace(
    workspace: WorkspaceCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new workspace
    """
    user_id = current_user["id"]
    
    try:
        new_workspace = workspace_service.create_workspace(
            name=workspace.name,
            description=workspace.description,
            owner_id=user_id,
            contract_id=workspace.contract_id,
            job_id=workspace.job_id,
            metadata=workspace.metadata
        )
        
        return new_workspace.to_dict()
    
    except Exception as e:
        logger.error(f"Error creating workspace: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create workspace: {str(e)}"
        )


@router.get("/workspaces/{workspace_id}")
async def get_workspace(
    workspace_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a specific workspace by ID
    """
    user_id = current_user["id"]
    
    try:
        # Verify user has access to the workspace
        await verify_workspace_access(workspace_id, current_user, WORKSPACE_PERMISSIONS.READ.name)
        
        # Get the workspace
        workspace = workspace_service.get_workspace(workspace_id)
        
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workspace with ID {workspace_id} not found"
            )
        
        return workspace.to_dict()
    
    except HTTPException:
        # Pass through HTTP exceptions
        raise
    
    except Exception as e:
        logger.error(f"Error retrieving workspace {workspace_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve workspace: {str(e)}"
        )


@router.put("/workspaces/{workspace_id}")
async def update_workspace(
    workspace_id: str = Path(...),
    workspace: WorkspaceUpdate = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a workspace
    """
    user_id = current_user["id"]
    
    try:
        # Verify user has WRITE permission for the workspace
        await verify_workspace_access(workspace_id, current_user, WORKSPACE_PERMISSIONS.WRITE.name)
        
        # Prepare updates dictionary
        updates = {}
        if workspace.name is not None:
            updates["name"] = workspace.name
        if workspace.description is not None:
            updates["description"] = workspace.description
        if workspace.metadata is not None:
            updates["metadata"] = workspace.metadata
        
        # Update the workspace
        updated_workspace = workspace_service.update_workspace(
            workspace_id=workspace_id,
            updates=updates,
            user_id=user_id
        )
        
        if not updated_workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workspace with ID {workspace_id} not found"
            )
        
        return updated_workspace.to_dict()
    
    except HTTPException:
        # Pass through HTTP exceptions
        raise
    
    except Exception as e:
        logger.error(f"Error updating workspace {workspace_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update workspace: {str(e)}"
        )


@router.delete("/workspaces/{workspace_id}")
async def delete_workspace(
    workspace_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a workspace (soft delete)
    """
    user_id = current_user["id"]
    
    try:
        # Verify user has ADMIN permission for the workspace
        await verify_workspace_access(workspace_id, current_user, WORKSPACE_PERMISSIONS.ADMIN.name)
        
        # Delete the workspace
        success = workspace_service.delete_workspace(
            workspace_id=workspace_id,
            user_id=user_id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workspace with ID {workspace_id} not found"
            )
        
        return {"message": "Workspace deleted successfully"}
    
    except HTTPException:
        # Pass through HTTP exceptions
        raise
    
    except Exception as e:
        logger.error(f"Error deleting workspace {workspace_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete workspace: {str(e)}"
        )


# Member routes
@router.get("/workspaces/{workspace_id}/members")
async def get_workspace_members(
    workspace_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get members of a workspace
    """
    try:
        # Verify user has access to the workspace
        await verify_workspace_access(workspace_id, current_user, WORKSPACE_PERMISSIONS.READ.name)
        
        # Get workspace members
        members = workspace_service.get_workspace_members(workspace_id)
        
        return members
    
    except HTTPException:
        # Pass through HTTP exceptions
        raise
    
    except Exception as e:
        logger.error(f"Error getting workspace members for {workspace_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get workspace members: {str(e)}"
        )


@router.post("/workspaces/{workspace_id}/members", status_code=status.HTTP_201_CREATED)
async def add_workspace_member(
    workspace_id: str = Path(...),
    member: MemberAdd = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Add a member to a workspace
    """
    user_id = current_user["id"]
    
    try:
        # Verify user has ADMIN permission for the workspace
        await verify_workspace_access(workspace_id, current_user, WORKSPACE_PERMISSIONS.ADMIN.name)
        
        # Validate role
        valid_roles = [role.name for role in WORKSPACE_ROLES]
        if member.role not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role: {member.role}. Must be one of {valid_roles}"
            )
        
        # Add member to workspace
        new_member = workspace_service.add_workspace_member(
            workspace_id=workspace_id,
            user_id=member.user_id,
            role=member.role,
            permissions=member.permissions,
            added_by=user_id
        )
        
        if not new_member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workspace with ID {workspace_id} not found"
            )
        
        return new_member.to_dict()
    
    except HTTPException:
        # Pass through HTTP exceptions
        raise
    
    except Exception as e:
        logger.error(f"Error adding member to workspace {workspace_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add workspace member: {str(e)}"
        )


@router.put("/workspaces/{workspace_id}/members/{user_id}")
async def update_member_role(
    workspace_id: str = Path(...),
    user_id: str = Path(...),
    member: MemberUpdate = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a member's role in a workspace
    """
    current_user_id = current_user["id"]
    
    try:
        # Verify user has ADMIN permission for the workspace
        await verify_workspace_access(workspace_id, current_user, WORKSPACE_PERMISSIONS.ADMIN.name)
        
        # Validate role
        valid_roles = [role.name for role in WORKSPACE_ROLES]
        if member.role not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role: {member.role}. Must be one of {valid_roles}"
            )
        
        # Update member role
        success = workspace_service.update_member_role(
            workspace_id=workspace_id,
            user_id=user_id,
            new_role=member.role,
            updated_by=current_user_id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Member {user_id} not found in workspace {workspace_id}"
            )
        
        return {"message": f"Member role updated to {member.role}"}
    
    except HTTPException:
        # Pass through HTTP exceptions
        raise
    
    except Exception as e:
        logger.error(f"Error updating member role in workspace {workspace_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update member role: {str(e)}"
        )


@router.delete("/workspaces/{workspace_id}/members/{user_id}")
async def remove_workspace_member(
    workspace_id: str = Path(...),
    user_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Remove a member from a workspace
    """
    current_user_id = current_user["id"]
    
    try:
        # Verify user has ADMIN permission for the workspace
        # (unless they're removing themselves)
        if current_user_id != user_id:
            await verify_workspace_access(workspace_id, current_user, WORKSPACE_PERMISSIONS.ADMIN.name)
        
        # Remove member from workspace
        success = workspace_service.remove_workspace_member(
            workspace_id=workspace_id,
            user_id=user_id,
            removed_by=current_user_id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Member {user_id} not found in workspace {workspace_id}"
            )
        
        return {"message": "Member removed successfully"}
    
    except HTTPException:
        # Pass through HTTP exceptions
        raise
    
    except Exception as e:
        logger.error(f"Error removing member from workspace {workspace_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove workspace member: {str(e)}"
        )


# File routes
@router.get("/workspaces/{workspace_id}/files")
async def list_files(
    workspace_id: str = Path(...),
    file_type: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    List files in a workspace
    """
    user_id = current_user["id"]
    
    try:
        # Verify user has READ permission for the workspace
        await verify_workspace_access(workspace_id, current_user, WORKSPACE_PERMISSIONS.READ.name)
        
        # List files in workspace
        files = workspace_service.list_files(
            workspace_id=workspace_id,
            user_id=user_id,
            file_type=file_type
        )
        
        return files
    
    except HTTPException:
        # Pass through HTTP exceptions
        raise
    
    except Exception as e:
        logger.error(f"Error listing files in workspace {workspace_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list files: {str(e)}"
        )


@router.post("/workspaces/{workspace_id}/files", status_code=status.HTTP_201_CREATED)
async def upload_file(
    workspace_id: str = Path(...),
    file: UploadFile = File(...),
    description: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Upload a file to a workspace
    """
    user_id = current_user["id"]
    
    try:
        # Verify user has WRITE permission for the workspace
        await verify_workspace_access(workspace_id, current_user, WORKSPACE_PERMISSIONS.WRITE.name)
        
        # Validate file type
        if not FILE_MANAGER.is_file_allowed(file.filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not allowed: {file.filename}"
            )
        
        # Read file content
        content = await file.read()
        
        # Validate file size
        if not FILE_MANAGER.check_file_size(len(content)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds {MAX_FILE_SIZE_MB}MB limit"
            )
        
        # Upload file to workspace
        file_info = workspace_service.upload_file(
            workspace_id=workspace_id,
            user_id=user_id,
            filename=file.filename,
            content=content,
            description=description or "",
            metadata={"content_type": file.content_type}
        )
        
        return file_info
    
    except HTTPException:
        # Pass through HTTP exceptions
        raise
    
    except Exception as e:
        logger.error(f"Error uploading file to workspace {workspace_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )


@router.get("/workspaces/{workspace_id}/files/{file_id}")
async def download_file(
    workspace_id: str = Path(...),
    file_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Download a file from a workspace
    """
    user_id = current_user["id"]
    
    try:
        # Verify user has READ permission for the workspace
        await verify_workspace_access(workspace_id, current_user, WORKSPACE_PERMISSIONS.READ.name)
        
        # Download file from workspace
        content, filename, mimetype = workspace_service.download_file(
            workspace_id=workspace_id,
            file_id=file_id,
            user_id=user_id
        )
        
        # Return file as StreamingResponse
        def iterfile():
            yield content
        
        return StreamingResponse(
            iterfile(),
            media_type=mimetype,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    except HTTPException:
        # Pass through HTTP exceptions
        raise
    
    except ValueError as e:
        logger.error(f"Error downloading file {file_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    
    except Exception as e:
        logger.error(f"Error downloading file {file_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download file: {str(e)}"
        )


@router.delete("/workspaces/{workspace_id}/files/{file_id}")
async def delete_file(
    workspace_id: str = Path(...),
    file_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a file from a workspace
    """
    user_id = current_user["id"]
    
    try:
        # Verify user has WRITE permission for the workspace
        await verify_workspace_access(workspace_id, current_user, WORKSPACE_PERMISSIONS.WRITE.name)
        
        # Delete file from workspace
        success = workspace_service.delete_file(
            workspace_id=workspace_id,
            file_id=file_id,
            user_id=user_id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File with ID {file_id} not found"
            )
        
        return {"message": "File deleted successfully"}
    
    except HTTPException:
        # Pass through HTTP exceptions
        raise
    
    except Exception as e:
        logger.error(f"Error deleting file {file_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete file: {str(e)}"
        )


# Notebook routes
@router.get("/workspaces/{workspace_id}/notebooks")
async def list_notebooks(
    workspace_id: str = Path(...),
    status: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    List notebooks in a workspace
    """
    user_id = current_user["id"]
    
    try:
        # Verify user has READ permission for the workspace
        await verify_workspace_access(workspace_id, current_user, WORKSPACE_PERMISSIONS.READ.name)
        
        # List notebooks in workspace
        notebooks = workspace_service.list_notebooks(
            workspace_id=workspace_id,
            user_id=user_id,
            status=status
        )
        
        # Convert notebooks to dictionaries for JSON response
        return [notebook.to_dict() for notebook in notebooks]
    
    except HTTPException:
        # Pass through HTTP exceptions
        raise
    
    except Exception as e:
        logger.error(f"Error listing notebooks in workspace {workspace_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list notebooks: {str(e)}"
        )


@router.post("/workspaces/{workspace_id}/notebooks", status_code=status.HTTP_201_CREATED)
async def create_notebook(
    workspace_id: str = Path(...),
    notebook: NotebookCreate = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new notebook in a workspace
    """
    user_id = current_user["id"]
    
    try:
        # Verify user has WRITE permission for the workspace
        await verify_workspace_access(workspace_id, current_user, WORKSPACE_PERMISSIONS.WRITE.name)
        
        # Create notebook in workspace
        new_notebook = workspace_service.create_notebook(
            workspace_id=workspace_id,
            name=notebook.name,
            user_id=user_id,
            description=notebook.description,
            kernel_name=notebook.kernel_name,
            metadata=notebook.metadata
        )
        
        return new_notebook.to_dict()
    
    except HTTPException:
        # Pass through HTTP exceptions
        raise
    
    except Exception as e:
        logger.error(f"Error creating notebook in workspace {workspace_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create notebook: {str(e)}"
        )


@router.get("/notebooks/{notebook_id}")
async def get_notebook(
    notebook_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a specific notebook by ID
    """
    user_id = current_user["id"]
    
    try:
        # Get notebook from workspace service
        notebook = jupyter_service.get_notebook(notebook_id, user_id)
        
        if not notebook:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Notebook with ID {notebook_id} not found"
            )
        
        return notebook.to_dict()
    
    except HTTPException:
        # Pass through HTTP exceptions
        raise
    
    except ValueError as e:
        logger.error(f"Error retrieving notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    
    except Exception as e:
        logger.error(f"Error retrieving notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve notebook: {str(e)}"
        )


@router.put("/notebooks/{notebook_id}")
async def update_notebook(
    notebook_id: str = Path(...),
    notebook: NotebookUpdate = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a notebook
    """
    user_id = current_user["id"]
    
    try:
        # Get notebook to check workspace access
        nb = workspace_service.get_notebook(notebook_id, user_id)
        
        if not nb:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Notebook with ID {notebook_id} not found"
            )
        
        # Verify user has WRITE permission for the workspace
        await verify_workspace_access(nb.workspace_id, current_user, WORKSPACE_PERMISSIONS.WRITE.name)
        
        # Prepare updates dictionary
        updates = {}
        if notebook.name is not None:
            updates["name"] = notebook.name
        if notebook.description is not None:
            updates["description"] = notebook.description
        if notebook.metadata is not None:
            updates["metadata"] = notebook.metadata
        
        # Update the notebook
        updated_notebook = workspace_service.update_notebook(
            notebook_id=notebook_id,
            updates=updates,
            user_id=user_id
        )
        
        if not updated_notebook:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Notebook with ID {notebook_id} not found"
            )
        
        return updated_notebook.to_dict()
    
    except HTTPException:
        # Pass through HTTP exceptions
        raise
    
    except ValueError as e:
        logger.error(f"Error updating notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    
    except Exception as e:
        logger.error(f"Error updating notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update notebook: {str(e)}"
        )


@router.delete("/notebooks/{notebook_id}")
async def delete_notebook(
    notebook_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a notebook (soft delete)
    """
    user_id = current_user["id"]
    
    try:
        # Get notebook to check workspace access
        nb = workspace_service.get_notebook(notebook_id, user_id)
        
        if not nb:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Notebook with ID {notebook_id} not found"
            )
        
        # Verify user has WRITE permission for the workspace
        await verify_workspace_access(nb.workspace_id, current_user, WORKSPACE_PERMISSIONS.WRITE.name)
        
        # Delete the notebook
        success = workspace_service.delete_notebook(
            notebook_id=notebook_id,
            user_id=user_id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Notebook with ID {notebook_id} not found"
            )
        
        return {"message": "Notebook deleted successfully"}
    
    except HTTPException:
        # Pass through HTTP exceptions
        raise
    
    except ValueError as e:
        logger.error(f"Error deleting notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    
    except Exception as e:
        logger.error(f"Error deleting notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete notebook: {str(e)}"
        )


@router.put("/notebooks/{notebook_id}/cells/{cell_id}")
async def update_notebook_cell(
    notebook_id: str = Path(...),
    cell_id: str = Path(...),
    cell: CellUpdate = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a cell in a notebook
    """
    user_id = current_user["id"]
    
    try:
        # Get notebook to check workspace access
        nb = workspace_service.get_notebook(notebook_id, user_id)
        
        if not nb:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Notebook with ID {notebook_id} not found"
            )
        
        # Verify user has WRITE permission for the workspace
        await verify_workspace_access(nb.workspace_id, current_user, WORKSPACE_PERMISSIONS.WRITE.name)
        
        # Update the cell
        updated_cell = jupyter_service.update_notebook_cell(
            notebook_id=notebook_id,
            cell_id=cell_id,
            source=cell.source,
            outputs=cell.outputs,
            user_id=user_id
        )
        
        return updated_cell
    
    except HTTPException:
        # Pass through HTTP exceptions
        raise
    
    except ValueError as e:
        logger.error(f"Error updating cell {cell_id} in notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    
    except Exception as e:
        logger.error(f"Error updating cell {cell_id} in notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update cell: {str(e)}"
        )


@router.post("/notebooks/{notebook_id}/kernel/start")
async def start_kernel(
    notebook_id: str = Path(...),
    kernel_name: str = Query("python3"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Start a kernel for a notebook
    """
    user_id = current_user["id"]
    
    try:
        # Get notebook to check workspace access
        nb = workspace_service.get_notebook(notebook_id, user_id)
        
        if not nb:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Notebook with ID {notebook_id} not found"
            )
        
        # Verify user has EXECUTE permission for the workspace
        await verify_workspace_access(nb.workspace_id, current_user, WORKSPACE_PERMISSIONS.EXECUTE.name)
        
        # Start the kernel
        kernel_info = jupyter_service.start_kernel(
            notebook_id=notebook_id,
            user_id=user_id,
            kernel_name=kernel_name
        )
        
        return kernel_info
    
    except HTTPException:
        # Pass through HTTP exceptions
        raise
    
    except ValueError as e:
        logger.error(f"Error starting kernel for notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    
    except Exception as e:
        logger.error(f"Error starting kernel for notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start kernel: {str(e)}"
        )


@router.post("/notebooks/{notebook_id}/kernel/stop")
async def stop_kernel(
    notebook_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Stop a notebook's kernel
    """
    user_id = current_user["id"]
    
    try:
        # Get notebook to check workspace access
        nb = workspace_service.get_notebook(notebook_id, user_id)
        
        if not nb:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Notebook with ID {notebook_id} not found"
            )
        
        # Verify user has EXECUTE permission for the workspace
        await verify_workspace_access(nb.workspace_id, current_user, WORKSPACE_PERMISSIONS.EXECUTE.name)
        
        # Stop the kernel
        success = jupyter_service.stop_kernel(
            notebook_id=notebook_id,
            user_id=user_id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No kernel found for notebook {notebook_id}"
            )
        
        return {"message": "Kernel stopped successfully"}
    
    except HTTPException:
        # Pass through HTTP exceptions
        raise
    
    except ValueError as e:
        logger.error(f"Error stopping kernel for notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    
    except Exception as e:
        logger.error(f"Error stopping kernel for notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop kernel: {str(e)}"
        )


@router.post("/notebooks/{notebook_id}/kernel/restart")
async def restart_kernel(
    notebook_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Restart a notebook's kernel
    """
    user_id = current_user["id"]
    
    try:
        # Get notebook to check workspace access
        nb = workspace_service.get_notebook(notebook_id, user_id)
        
        if not nb:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Notebook with ID {notebook_id} not found"
            )
        
        # Verify user has EXECUTE permission for the workspace
        await verify_workspace_access(nb.workspace_id, current_user, WORKSPACE_PERMISSIONS.EXECUTE.name)
        
        # Restart the kernel
        success = jupyter_service.restart_kernel(
            notebook_id=notebook_id,
            user_id=user_id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No kernel found for notebook {notebook_id}"
            )
        
        return {"message": "Kernel restarted successfully"}
    
    except HTTPException:
        # Pass through HTTP exceptions
        raise
    
    except ValueError as e:
        logger.error(f"Error restarting kernel for notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    
    except Exception as e:
        logger.error(f"Error restarting kernel for notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to restart kernel: {str(e)}"
        )


@router.get("/notebooks/{notebook_id}/kernel/status")
async def get_kernel_status(
    notebook_id: str = Path(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get kernel status for a notebook
    """
    user_id = current_user["id"]
    
    try:
        # Get kernel status
        status_info = jupyter_service.get_kernel_status(
            notebook_id=notebook_id,
            user_id=user_id
        )
        
        return status_info
    
    except HTTPException:
        # Pass through HTTP exceptions
        raise
    
    except ValueError as e:
        logger.error(f"Error getting kernel status for notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    
    except Exception as e:
        logger.error(f"Error getting kernel status for notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get kernel status: {str(e)}"
        )


@router.post("/notebooks/{notebook_id}/cells/{cell_id}/execute")
async def execute_code(
    notebook_id: str = Path(...),
    cell_id: str = Path(...),
    code_execute: CodeExecute = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Execute code in a notebook cell
    """
    user_id = current_user["id"]
    
    try:
        # Get notebook to check workspace access
        nb = workspace_service.get_notebook(notebook_id, user_id)
        
        if not nb:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Notebook with ID {notebook_id} not found"
            )
        
        # Verify user has EXECUTE permission for the workspace
        await verify_workspace_access(nb.workspace_id, current_user, WORKSPACE_PERMISSIONS.EXECUTE.name)
        
        # Execute the code
        results = jupyter_service.execute_code(
            notebook_id=notebook_id,
            cell_id=cell_id,
            code=code_execute.code,
            user_id=user_id
        )
        
        return results
    
    except HTTPException:
        # Pass through HTTP exceptions
        raise
    
    except ValueError as e:
        logger.error(f"Error executing code in notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    
    except Exception as e:
        logger.error(f"Error executing code in notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute code: {str(e)}"
        )


@router.get("/notebooks/{notebook_id}/export")
async def export_notebook(
    notebook_id: str = Path(...),
    format: str = Query("python", regex="^(python|html|pdf|markdown)$"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Export a notebook to different format
    """
    user_id = current_user["id"]
    
    try:
        # Get notebook to check workspace access
        nb = workspace_service.get_notebook(notebook_id, user_id)
        
        if not nb:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Notebook with ID {notebook_id} not found"
            )
        
        # Verify user has READ permission for the workspace
        await verify_workspace_access(nb.workspace_id, current_user, WORKSPACE_PERMISSIONS.READ.name)
        
        # Export the notebook
        export_result = jupyter_service.export_notebook(
            notebook_id=notebook_id,
            format=format,
            user_id=user_id
        )
        
        # Return exported content as a streaming response
        def iterfile():
            yield export_result["content"]
        
        return StreamingResponse(
            iterfile(),
            media_type=export_result["mimetype"],
            headers={"Content-Disposition": f"attachment; filename={export_result['filename']}"}
        )
    
    except HTTPException:
        # Pass through HTTP exceptions
        raise
    
    except ValueError as e:
        logger.error(f"Error exporting notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    except Exception as e:
        logger.error(f"Error exporting notebook {notebook_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export notebook: {str(e)}"
        )


# Activity routes
@router.get("/workspaces/{workspace_id}/activities")
async def get_activities(
    workspace_id: str = Path(...),
    activity_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get activities for a workspace
    """
    user_id = current_user["id"]
    
    try:
        # Verify user has READ permission for the workspace
        await verify_workspace_access(workspace_id, current_user, WORKSPACE_PERMISSIONS.READ.name)
        
        # Get workspace activities
        activities = workspace_service.get_activities(
            workspace_id=workspace_id,
            user_id=user_id,
            activity_type=activity_type,
            limit=limit
        )
        
        # Convert activities to dictionaries for JSON response
        return [activity.to_dict() for activity in activities]
    
    except HTTPException:
        # Pass through HTTP exceptions
        raise
    
    except ValueError as e:
        logger.error(f"Error getting activities for workspace {workspace_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    
    except Exception as e:
        logger.error(f"Error getting activities for workspace {workspace_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get activities: {str(e)}"
        )