"""
Test suite for workspace functionality in the AI Talent Marketplace collaboration service.

This module provides comprehensive tests for workspace creation, member management,
file operations, and access control to ensure robust and secure collaborative workspaces 
for AI professionals and clients.
"""

import pytest
import unittest.mock as mock
import fakeredis
import mongomock
import uuid
import os
import tempfile
import shutil
from datetime import datetime, timedelta

# Import workspace models and enums for testing
from ..src.models.workspace import (
    Workspace, WorkspaceMember, WorkspaceFile, 
    WORKSPACE_ROLES, WORKSPACE_STATUS, WORKSPACE_PERMISSIONS
)

# Import workspace service for integration testing
from ..src.services.workspace_service import WorkspaceService

# Import file management utilities for testing file operations
from ..src.utils.file_manager import FILE_MANAGER

# Import configuration settings for test environment
from ..src.config import settings

# Test constants
TEST_USER_ID = "00000000-0000-0000-0000-000000000001"
TEST_USER_2_ID = "00000000-0000-0000-0000-000000000002"
TEST_CONTRACT_ID = "00000000-0000-0000-0000-000000000003"
TEST_JOB_ID = "00000000-0000-0000-0000-000000000004"

# Global variables for test environment
TEMP_FILE_STORAGE_PATH = None
MONGO_CLIENT_MOCK = None
REDIS_CLIENT_MOCK = None

def setup_module():
    """Setup function that runs once before all tests in the module."""
    global TEMP_FILE_STORAGE_PATH, MONGO_CLIENT_MOCK, REDIS_CLIENT_MOCK
    
    # Create temporary directory for file storage during tests
    TEMP_FILE_STORAGE_PATH = tempfile.mkdtemp()
    
    # Patch settings.FILE_STORAGE_PATH to use temporary directory
    settings.FILE_STORAGE_PATH = TEMP_FILE_STORAGE_PATH
    
    # Set up MongoDB mock for workspace, notebook, and activity collections
    MONGO_CLIENT_MOCK = mongomock.MongoClient()
    
    # Set up Redis mock for real-time collaboration
    REDIS_CLIENT_MOCK = fakeredis.FakeRedis()
    
    # Initialize test environment variables
    os.makedirs(os.path.join(TEMP_FILE_STORAGE_PATH, 'notebooks'), exist_ok=True)

def teardown_module():
    """Teardown function that runs once after all tests in the module."""
    global TEMP_FILE_STORAGE_PATH
    
    # Clean up temporary test directories
    shutil.rmtree(TEMP_FILE_STORAGE_PATH, ignore_errors=True)
    
    # Reset mocked services
    # (MongoDB and Redis mocks will be garbage collected)
    
    # Reset global test variables
    TEMP_FILE_STORAGE_PATH = None
    MONGO_CLIENT_MOCK = None
    REDIS_CLIENT_MOCK = None

def create_test_workspace(name="Test Workspace", description="Test Description", owner_id=TEST_USER_ID):
    """Helper function to create a test workspace instance with predefined parameters."""
    workspace = Workspace(
        name=name,
        description=description,
        contract_id=TEST_CONTRACT_ID,
        job_id=TEST_JOB_ID,
        owner_id=owner_id,
        metadata={"test_key": "test_value"}
    )
    return workspace

def create_test_file_content(file_type):
    """Helper function to create sample file content for testing."""
    if file_type == 'py':
        content = """
def hello_world():
    print("Hello, world!")
    
if __name__ == "__main__":
    hello_world()
"""
    elif file_type == 'txt':
        content = "This is a sample text file for testing.\nIt has multiple lines.\nEnd of file."
    elif file_type == 'json':
        content = '{\n  "name": "Test",\n  "value": 42,\n  "nested": {"key": "value"}\n}'
    else:
        content = f"Test content for {file_type} file type"
    
    return content.encode('utf-8')


class TestWorkspaceModel:
    """Unit tests for the Workspace model class."""
    
    def test_workspace_creation(self):
        """Test creating a Workspace instance with various parameters."""
        # Create a workspace with minimum required parameters
        workspace = create_test_workspace()
        
        # Verify all properties are correctly initialized
        assert workspace.name == "Test Workspace"
        assert workspace.description == "Test Description"
        assert workspace.contract_id == TEST_CONTRACT_ID
        assert workspace.job_id == TEST_JOB_ID
        assert workspace.status == WORKSPACE_STATUS.ACTIVE.name
        
        # Verify default values are assigned where not specified
        assert isinstance(workspace.id, str)
        assert workspace.created_at is not None
        assert workspace.updated_at is not None
        assert workspace.created_by == TEST_USER_ID
        assert workspace.metadata == {"test_key": "test_value"}
        
        # Verify workspace_path is correctly generated
        assert str(workspace.workspace_path).endswith(workspace.id)
        
        # Verify owner is added as a member with OWNER role
        assert len(workspace.members) == 1
        assert workspace.members[0].user_id == TEST_USER_ID
        assert workspace.members[0].role == WORKSPACE_ROLES.OWNER.name
    
    def test_add_member(self):
        """Test adding members to a workspace."""
        workspace = create_test_workspace()
        
        # Add members with different roles
        editor_member = workspace.add_member(TEST_USER_2_ID, WORKSPACE_ROLES.EDITOR.name)
        
        # Verify members are added correctly
        assert len(workspace.members) == 2
        assert editor_member.user_id == TEST_USER_2_ID
        assert editor_member.role == WORKSPACE_ROLES.EDITOR.name
        
        # Verify duplicate members are not added
        duplicate_member = workspace.add_member(TEST_USER_2_ID, WORKSPACE_ROLES.EDITOR.name)
        assert len(workspace.members) == 2  # Count should not increase
        assert duplicate_member.user_id == TEST_USER_2_ID  # Should return existing member
        
        # Verify member permissions are set based on roles
        assert editor_member.has_permission(WORKSPACE_PERMISSIONS.READ.name)
        assert editor_member.has_permission(WORKSPACE_PERMISSIONS.WRITE.name)
        assert not editor_member.has_permission(WORKSPACE_PERMISSIONS.ADMIN.name)
        
        # Add a viewer member
        viewer_member = workspace.add_member("viewer-user", WORKSPACE_ROLES.VIEWER.name)
        assert viewer_member.has_permission(WORKSPACE_PERMISSIONS.READ.name)
        assert not viewer_member.has_permission(WORKSPACE_PERMISSIONS.WRITE.name)
    
    def test_remove_member(self):
        """Test removing members from a workspace."""
        workspace = create_test_workspace()
        
        # Create a test workspace with multiple members
        workspace.add_member(TEST_USER_2_ID, WORKSPACE_ROLES.EDITOR.name)
        workspace.add_member("viewer-user", WORKSPACE_ROLES.VIEWER.name)
        assert len(workspace.members) == 3
        
        # Remove a specific member
        result = workspace.remove_member(TEST_USER_2_ID)
        
        # Verify member is removed from workspace.members
        assert result is True
        assert len(workspace.members) == 2
        assert workspace.get_member(TEST_USER_2_ID) is None
        
        # Attempt to remove non-existent member
        result = workspace.remove_member("non-existent-user")
        
        # Verify no changes when removing non-existent member
        assert result is False
        assert len(workspace.members) == 2  # Count should not change
    
    def test_get_member(self):
        """Test retrieving members by user_id."""
        workspace = create_test_workspace()
        
        # Create a test workspace with multiple members
        workspace.add_member(TEST_USER_2_ID, WORKSPACE_ROLES.EDITOR.name)
        workspace.add_member("viewer-user", WORKSPACE_ROLES.VIEWER.name)
        
        # Retrieve member using get_member(user_id)
        member = workspace.get_member(TEST_USER_2_ID)
        
        # Verify correct member is returned
        assert member is not None
        assert member.user_id == TEST_USER_2_ID
        assert member.role == WORKSPACE_ROLES.EDITOR.name
        
        # Attempt to retrieve non-existent member
        non_existent = workspace.get_member("non-existent-user")
        
        # Verify None is returned for non-existent member
        assert non_existent is None
    
    def test_update_member_role(self):
        """Test updating a member's role in a workspace."""
        workspace = create_test_workspace()
        
        # Create a test workspace with multiple members
        workspace.add_member(TEST_USER_2_ID, WORKSPACE_ROLES.EDITOR.name)
        
        # Update role for a specific member
        result = workspace.update_member_role(TEST_USER_2_ID, WORKSPACE_ROLES.VIEWER.name)
        
        # Verify role is updated correctly
        assert result is True
        member = workspace.get_member(TEST_USER_2_ID)
        assert member.role == WORKSPACE_ROLES.VIEWER.name
        
        # Verify permissions are adjusted based on new role
        assert member.has_permission(WORKSPACE_PERMISSIONS.READ.name)
        assert not member.has_permission(WORKSPACE_PERMISSIONS.WRITE.name)
        
        # Test updating role for non-existent member returns False
        result = workspace.update_member_role("non-existent-user", WORKSPACE_ROLES.EDITOR.name)
        assert result is False
    
    def test_has_access(self):
        """Test permission checking for workspace members."""
        workspace = create_test_workspace()
        
        # Create test workspace with members of different roles
        workspace.add_member(TEST_USER_2_ID, WORKSPACE_ROLES.EDITOR.name)
        workspace.add_member("viewer-user", WORKSPACE_ROLES.VIEWER.name)
        
        # Check access for various permission types
        
        # Verify OWNER has all permissions
        assert workspace.has_access(TEST_USER_ID, WORKSPACE_PERMISSIONS.READ.name)
        assert workspace.has_access(TEST_USER_ID, WORKSPACE_PERMISSIONS.WRITE.name)
        assert workspace.has_access(TEST_USER_ID, WORKSPACE_PERMISSIONS.EXECUTE.name)
        assert workspace.has_access(TEST_USER_ID, WORKSPACE_PERMISSIONS.ADMIN.name)
        
        # Verify EDITOR has appropriate permissions
        assert workspace.has_access(TEST_USER_2_ID, WORKSPACE_PERMISSIONS.READ.name)
        assert workspace.has_access(TEST_USER_2_ID, WORKSPACE_PERMISSIONS.WRITE.name)
        assert workspace.has_access(TEST_USER_2_ID, WORKSPACE_PERMISSIONS.EXECUTE.name)
        assert not workspace.has_access(TEST_USER_2_ID, WORKSPACE_PERMISSIONS.ADMIN.name)
        
        # Verify VIEWER has limited permissions
        assert workspace.has_access("viewer-user", WORKSPACE_PERMISSIONS.READ.name)
        assert not workspace.has_access("viewer-user", WORKSPACE_PERMISSIONS.WRITE.name)
        assert not workspace.has_access("viewer-user", WORKSPACE_PERMISSIONS.EXECUTE.name)
        assert not workspace.has_access("viewer-user", WORKSPACE_PERMISSIONS.ADMIN.name)
        
        # Verify non-members have no access
        assert not workspace.has_access("non-member-user", WORKSPACE_PERMISSIONS.READ.name)
        
        # Verify base membership check without specific permission
        assert workspace.has_access(TEST_USER_ID)
        assert not workspace.has_access("non-member-user")
    
    def test_add_file(self):
        """Test adding files to a workspace."""
        workspace = create_test_workspace()
        
        # Add files with various parameters
        file1 = workspace.add_file(
            name="test_file.py",
            file_path="/path/to/test_file.py",
            file_type="py",
            size=1024,
            mimetype="text/x-python",
            created_by=TEST_USER_ID,
            description="Test Python file",
            metadata={"language": "python"}
        )
        
        # Verify files are added correctly to workspace.files
        assert len(workspace.files) == 1
        assert file1 in workspace.files
        
        # Verify file metadata is properly recorded
        assert file1.name == "test_file.py"
        assert file1.file_path == "/path/to/test_file.py"
        assert file1.file_type == "py"
        assert file1.size == 1024
        assert file1.mimetype == "text/x-python"
        assert file1.created_by == TEST_USER_ID
        assert file1.description == "Test Python file"
        assert file1.metadata == {"language": "python"}
        
        # Verify timestamps are set correctly
        assert file1.created_at is not None
        assert file1.updated_at is not None
        assert file1.updated_by == TEST_USER_ID
    
    def test_remove_file(self):
        """Test removing files from a workspace."""
        workspace = create_test_workspace()
        
        # Create a test workspace with multiple files
        file1 = workspace.add_file(
            name="test_file1.py",
            file_path="/path/to/test_file1.py",
            file_type="py",
            size=1024,
            mimetype="text/x-python",
            created_by=TEST_USER_ID
        )
        
        file2 = workspace.add_file(
            name="test_file2.txt",
            file_path="/path/to/test_file2.txt",
            file_type="txt",
            size=512,
            mimetype="text/plain",
            created_by=TEST_USER_ID
        )
        
        assert len(workspace.files) == 2
        
        # Remove a specific file
        result = workspace.remove_file(file1.id)
        
        # Verify file is removed from workspace.files
        assert result is True
        assert len(workspace.files) == 1
        assert workspace.get_file(file1.id) is None
        assert workspace.get_file(file2.id) is not None
        
        # Attempt to remove non-existent file
        result = workspace.remove_file("non-existent-file-id")
        
        # Verify no changes when removing non-existent file
        assert result is False
        assert len(workspace.files) == 1  # Count should not change
    
    def test_workspace_status_changes(self):
        """Test status changes for a workspace."""
        workspace = create_test_workspace()
        
        # Create a test workspace with ACTIVE status
        assert workspace.status == WORKSPACE_STATUS.ACTIVE.name
        initial_updated_at = workspace.updated_at
        
        # Wait a bit to ensure updated_at changes
        import time
        time.sleep(0.001)
        
        # Call workspace.archive() and verify status change
        workspace.archive()
        assert workspace.status == WORKSPACE_STATUS.ARCHIVED.name
        assert workspace.updated_at > initial_updated_at
        
        # Store updated_at for next comparison
        archived_updated_at = workspace.updated_at
        time.sleep(0.001)
        
        # Call workspace.restore() and verify status change
        workspace.restore()
        assert workspace.status == WORKSPACE_STATUS.ACTIVE.name
        assert workspace.updated_at > archived_updated_at
        
        # Store updated_at for next comparison
        restored_updated_at = workspace.updated_at
        time.sleep(0.001)
        
        # Call workspace.delete() and verify status change
        workspace.delete()
        assert workspace.status == WORKSPACE_STATUS.DELETED.name
        assert workspace.updated_at > restored_updated_at
    
    def test_workspace_to_dict(self):
        """Test serializing a workspace to dictionary."""
        workspace = create_test_workspace()
        
        # Create a test workspace with members and files
        workspace.add_member(TEST_USER_2_ID, WORKSPACE_ROLES.EDITOR.name)
        workspace.add_file(
            name="test_file.py",
            file_path="/path/to/test_file.py",
            file_type="py",
            size=1024,
            mimetype="text/x-python",
            created_by=TEST_USER_ID,
            description="Test Python file"
        )
        
        # Call workspace.to_dict()
        workspace_dict = workspace.to_dict()
        
        # Verify dictionary contains all workspace properties
        assert workspace_dict["id"] == workspace.id
        assert workspace_dict["name"] == workspace.name
        assert workspace_dict["description"] == workspace.description
        assert workspace_dict["contract_id"] == workspace.contract_id
        assert workspace_dict["job_id"] == workspace.job_id
        assert workspace_dict["status"] == workspace.status
        assert workspace_dict["created_by"] == workspace.created_by
        assert workspace_dict["metadata"] == workspace.metadata
        
        # Verify members and files are properly serialized
        assert len(workspace_dict["members"]) == 2
        assert len(workspace_dict["files"]) == 1
        assert workspace_dict["members"][0]["user_id"] == TEST_USER_ID
        assert workspace_dict["members"][1]["user_id"] == TEST_USER_2_ID
        assert workspace_dict["files"][0]["name"] == "test_file.py"
        
        # Verify datetime objects are converted to ISO format
        assert isinstance(workspace_dict["created_at"], str)
        assert isinstance(workspace_dict["updated_at"], str)
    
    def test_workspace_from_dict(self):
        """Test creating a workspace from a dictionary."""
        # Create a test workspace
        original_workspace = create_test_workspace()
        original_workspace.add_member(TEST_USER_2_ID, WORKSPACE_ROLES.EDITOR.name)
        original_workspace.add_file(
            name="test_file.py",
            file_path="/path/to/test_file.py",
            file_type="py",
            size=1024,
            mimetype="text/x-python",
            created_by=TEST_USER_ID
        )
        
        # Convert to dictionary
        workspace_dict = original_workspace.to_dict()
        
        # Create a new workspace from the dictionary
        workspace = Workspace.from_dict(workspace_dict)
        
        # Verify workspace instance properties match dictionary
        assert workspace.id == original_workspace.id
        assert workspace.name == original_workspace.name
        assert workspace.description == original_workspace.description
        assert workspace.contract_id == original_workspace.contract_id
        assert workspace.job_id == original_workspace.job_id
        assert workspace.status == original_workspace.status
        assert workspace.created_by == original_workspace.created_by
        assert workspace.metadata == original_workspace.metadata
        
        # Verify members and files are properly reconstructed
        assert len(workspace.members) == 2
        assert len(workspace.files) == 1
        assert workspace.members[0].user_id == TEST_USER_ID
        assert workspace.members[1].user_id == TEST_USER_2_ID
        assert workspace.members[0].role == WORKSPACE_ROLES.OWNER.name
        assert workspace.members[1].role == WORKSPACE_ROLES.EDITOR.name
        assert workspace.files[0].name == "test_file.py"
        assert workspace.files[0].file_type == "py"
        
        # Verify workspace_path is properly reconstructed
        assert workspace.workspace_path == original_workspace.workspace_path
    
    def test_is_inactive(self):
        """Test workspace inactivity detection."""
        workspace = create_test_workspace()
        
        # Add members with recent activity timestamps
        workspace.add_member(TEST_USER_2_ID, WORKSPACE_ROLES.EDITOR.name)
        
        # Verify workspace is not inactive
        assert workspace.is_inactive() is False
        
        # Modify member activity to be older than timeout
        timeout = settings.WORKSPACE_INACTIVITY_TIMEOUT + 3600  # Add buffer
        for member in workspace.members:
            member.last_active_at = datetime.utcnow() - timedelta(seconds=timeout)
        
        # Verify workspace is now detected as inactive
        assert workspace.is_inactive() is True


class TestWorkspaceMember:
    """Unit tests for the WorkspaceMember class."""
    
    def test_member_creation(self):
        """Test creating a WorkspaceMember instance."""
        # Create members with different roles
        owner = WorkspaceMember(TEST_USER_ID, WORKSPACE_ROLES.OWNER.name)
        editor = WorkspaceMember(TEST_USER_2_ID, WORKSPACE_ROLES.EDITOR.name)
        viewer = WorkspaceMember("viewer-user", WORKSPACE_ROLES.VIEWER.name)
        
        # Verify properties are correctly initialized
        assert owner.user_id == TEST_USER_ID
        assert editor.user_id == TEST_USER_2_ID
        assert viewer.user_id == "viewer-user"
        
        assert owner.role == WORKSPACE_ROLES.OWNER.name
        assert editor.role == WORKSPACE_ROLES.EDITOR.name
        assert viewer.role == WORKSPACE_ROLES.VIEWER.name
        
        # Verify last_active_at is set to current time
        assert (datetime.utcnow() - owner.last_active_at).total_seconds() < 1
        
        # Verify permissions are set based on role
        assert owner.has_permission(WORKSPACE_PERMISSIONS.ADMIN.name)
        assert editor.has_permission(WORKSPACE_PERMISSIONS.WRITE.name)
        assert viewer.has_permission(WORKSPACE_PERMISSIONS.READ.name)
        assert not viewer.has_permission(WORKSPACE_PERMISSIONS.WRITE.name)
        
        # Test with custom permissions overriding defaults
        custom_perms = {
            WORKSPACE_PERMISSIONS.READ.name: True,
            WORKSPACE_PERMISSIONS.WRITE.name: True,
            WORKSPACE_PERMISSIONS.EXECUTE.name: False,
            WORKSPACE_PERMISSIONS.ADMIN.name: False
        }
        custom_member = WorkspaceMember("custom-user", WORKSPACE_ROLES.VIEWER.name, custom_perms)
        
        assert custom_member.has_permission(WORKSPACE_PERMISSIONS.WRITE.name)
        assert not custom_member.has_permission(WORKSPACE_PERMISSIONS.EXECUTE.name)
    
    def test_has_permission(self):
        """Test permission checking for members."""
        # Create members with different roles
        owner = WorkspaceMember(TEST_USER_ID, WORKSPACE_ROLES.OWNER.name)
        editor = WorkspaceMember(TEST_USER_2_ID, WORKSPACE_ROLES.EDITOR.name)
        viewer = WorkspaceMember("viewer-user", WORKSPACE_ROLES.VIEWER.name)
        
        # Check various permissions for each role
        
        # Verify OWNER has all permissions automatically
        assert owner.has_permission(WORKSPACE_PERMISSIONS.READ.name)
        assert owner.has_permission(WORKSPACE_PERMISSIONS.WRITE.name)
        assert owner.has_permission(WORKSPACE_PERMISSIONS.EXECUTE.name)
        assert owner.has_permission(WORKSPACE_PERMISSIONS.ADMIN.name)
        
        # Verify other roles have only their assigned permissions
        assert editor.has_permission(WORKSPACE_PERMISSIONS.READ.name)
        assert editor.has_permission(WORKSPACE_PERMISSIONS.WRITE.name)
        assert editor.has_permission(WORKSPACE_PERMISSIONS.EXECUTE.name)
        assert not editor.has_permission(WORKSPACE_PERMISSIONS.ADMIN.name)
        
        assert viewer.has_permission(WORKSPACE_PERMISSIONS.READ.name)
        assert not viewer.has_permission(WORKSPACE_PERMISSIONS.WRITE.name)
        assert not viewer.has_permission(WORKSPACE_PERMISSIONS.EXECUTE.name)
        assert not viewer.has_permission(WORKSPACE_PERMISSIONS.ADMIN.name)
        
        # Test invalid permission checks
        with pytest.raises(ValueError):
            owner.has_permission("INVALID_PERMISSION")
    
    def test_update_activity(self):
        """Test updating member activity timestamp."""
        # Create a member with initial timestamp
        member = WorkspaceMember(TEST_USER_ID, WORKSPACE_ROLES.EDITOR.name)
        
        # Record the initial timestamp
        initial_timestamp = member.last_active_at
        
        # Wait briefly
        import time
        time.sleep(0.001)
        
        # Call update_activity()
        member.update_activity()
        
        # Verify last_active_at is updated to later time
        assert member.last_active_at > initial_timestamp
    
    def test_change_role(self):
        """Test changing a member's role."""
        # Create a member with EDITOR role
        member = WorkspaceMember(TEST_USER_ID, WORKSPACE_ROLES.EDITOR.name)
        
        # Initial permissions
        assert member.role == WORKSPACE_ROLES.EDITOR.name
        assert member.has_permission(WORKSPACE_PERMISSIONS.WRITE.name)
        
        # Change role to VIEWER
        result = member.change_role(WORKSPACE_ROLES.VIEWER.name)
        
        # Verify role is updated
        assert result is True
        assert member.role == WORKSPACE_ROLES.VIEWER.name
        
        # Verify permissions are adjusted based on new role
        assert member.has_permission(WORKSPACE_PERMISSIONS.READ.name)
        assert not member.has_permission(WORKSPACE_PERMISSIONS.WRITE.name)
        
        # Test with invalid role values
        with pytest.raises(ValueError):
            member.change_role("INVALID_ROLE")
    
    def test_to_dict(self):
        """Test serializing a member to dictionary."""
        # Create a test member
        member = WorkspaceMember(TEST_USER_ID, WORKSPACE_ROLES.EDITOR.name)
        
        # Call member.to_dict()
        member_dict = member.to_dict()
        
        # Verify dictionary contains all member properties
        assert member_dict["user_id"] == TEST_USER_ID
        assert member_dict["role"] == WORKSPACE_ROLES.EDITOR.name
        assert "permissions" in member_dict
        
        # Verify datetime objects are properly serialized
        assert isinstance(member_dict["last_active_at"], str)
        
        # Verify role is converted to string representation
        assert isinstance(member_dict["role"], str)


class TestWorkspaceFile:
    """Unit tests for the WorkspaceFile class."""
    
    def test_file_creation(self):
        """Test creating a WorkspaceFile instance."""
        # Create files with different parameters
        file1 = WorkspaceFile(
            name="test_file.py",
            file_path="/path/to/test_file.py",
            file_type="py",
            size=1024,
            mimetype="text/x-python",
            created_by=TEST_USER_ID,
            description="Test Python file",
            metadata={"language": "python"}
        )
        
        file2 = WorkspaceFile(
            name="test_file.txt",
            file_path="/path/to/test_file.txt",
            file_type="txt",
            size=512,
            mimetype="text/plain",
            created_by=TEST_USER_ID
        )
        
        # Verify properties are correctly initialized
        assert file1.name == "test_file.py"
        assert file1.file_path == "/path/to/test_file.py"
        assert file1.file_type == "py"
        assert file1.size == 1024
        assert file1.mimetype == "text/x-python"
        assert file1.created_by == TEST_USER_ID
        assert file1.description == "Test Python file"
        assert file1.metadata == {"language": "python"}
        
        # Verify timestamps are set to current time
        assert (datetime.utcnow() - file1.created_at).total_seconds() < 1
        assert file1.updated_at == file1.created_at
        assert file1.updated_by == TEST_USER_ID
        
        # Verify versions list is initially empty
        assert file1.versions == []
        
        # Verify default values are used when not specified
        assert file2.description == ""
        assert file2.metadata == {}
    
    def test_update_metadata(self):
        """Test updating file metadata."""
        # Create a test file
        file = WorkspaceFile(
            name="test_file.py",
            file_path="/path/to/test_file.py",
            file_type="py",
            size=1024,
            mimetype="text/x-python",
            created_by=TEST_USER_ID,
            metadata={"language": "python"}
        )
        
        # Initial state
        assert file.metadata == {"language": "python"}
        initial_updated_at = file.updated_at
        
        # Wait briefly
        import time
        time.sleep(0.001)
        
        # Update metadata with new values
        file.update_metadata({"version": "3.9", "framework": "pytest"}, TEST_USER_2_ID)
        
        # Verify metadata is merged correctly
        assert file.metadata == {
            "language": "python",
            "version": "3.9",
            "framework": "pytest"
        }
        
        # Verify updated_at is updated
        assert file.updated_at > initial_updated_at
        
        # Verify updated_by is set correctly
        assert file.updated_by == TEST_USER_2_ID
    
    def test_add_version(self):
        """Test adding file versions."""
        # Create a test file
        file = WorkspaceFile(
            name="test_file.py",
            file_path="/path/to/test_file.py",
            file_type="py",
            size=1024,
            mimetype="text/x-python",
            created_by=TEST_USER_ID
        )
        
        # Initial state
        assert file.versions == []
        initial_updated_at = file.updated_at
        
        # Wait briefly
        import time
        time.sleep(0.001)
        
        # Add multiple versions with different paths and messages
        version1 = file.add_version("/path/to/version1.py", TEST_USER_ID, "Initial version")
        version2 = file.add_version("/path/to/version2.py", TEST_USER_2_ID, "Added feature X")
        
        # Verify versions are added to versions list
        assert len(file.versions) == 2
        assert version1 in file.versions
        assert version2 in file.versions
        
        # Verify version information contains expected fields
        assert "id" in version1
        assert version1["path"] == "/path/to/version1.py"
        assert version1["created_by"] == TEST_USER_ID
        assert version1["commit_message"] == "Initial version"
        assert "created_at" in version1
        
        assert version2["path"] == "/path/to/version2.py"
        assert version2["created_by"] == TEST_USER_2_ID
        
        # Verify updated_at and updated_by are set correctly
        assert file.updated_at > initial_updated_at
        assert file.updated_by == TEST_USER_2_ID
    
    def test_to_dict(self):
        """Test serializing a file to dictionary."""
        # Create a test file with versions
        file = WorkspaceFile(
            name="test_file.py",
            file_path="/path/to/test_file.py",
            file_type="py",
            size=1024,
            mimetype="text/x-python",
            created_by=TEST_USER_ID,
            description="Test Python file",
            metadata={"language": "python"}
        )
        
        # Add a version
        file.add_version("/path/to/version1.py", TEST_USER_ID, "Initial version")
        
        # Call file.to_dict()
        file_dict = file.to_dict()
        
        # Verify dictionary contains all file properties
        assert file_dict["id"] == file.id
        assert file_dict["name"] == file.name
        assert file_dict["file_path"] == file.file_path
        assert file_dict["file_type"] == file.file_type
        assert file_dict["size"] == file.size
        assert file_dict["mimetype"] == file.mimetype
        assert file_dict["created_by"] == file.created_by
        assert file_dict["description"] == file.description
        assert file_dict["metadata"] == file.metadata
        
        # Verify versions list is properly serialized
        assert len(file_dict["versions"]) == 1
        assert file_dict["versions"][0]["path"] == "/path/to/version1.py"
        assert file_dict["versions"][0]["commit_message"] == "Initial version"
        
        # Verify datetime objects are properly serialized
        assert isinstance(file_dict["created_at"], str)
        assert isinstance(file_dict["updated_at"], str)


class TestWorkspaceService:
    """Integration tests for the WorkspaceService class."""
    
    def setup_method(self):
        """Setup method that runs before each test."""
        # Initialize mongodb mock client
        self.mongodb_mock = mongomock.MongoClient()
        self.db = self.mongodb_mock['collaboration_service']
        
        # Create collections
        self.workspaces_collection = self.db.workspaces
        self.notebooks_collection = self.db.notebooks
        self.activities_collection = self.db.activities
        
        # Create Redis mock
        self.redis_mock = fakeredis.FakeRedis()
        
        # Create the workspace service
        self.workspace_service = WorkspaceService()
        
        # Replace the service's collections and redis client with our mocks
        self.workspace_service.db = self.db
        self.workspace_service.workspaces_collection = self.workspaces_collection
        self.workspace_service.notebooks_collection = self.notebooks_collection
        self.workspace_service.activities_collection = self.activities_collection
        self.workspace_service.redis_client = self.redis_mock
        
        # Back up original FILE_MANAGER methods
        self.original_upload_file = FILE_MANAGER.upload_file
        self.original_download_file = FILE_MANAGER.download_file
        self.original_delete_file = FILE_MANAGER.delete_file
    
    def teardown_method(self):
        """Teardown method that runs after each test."""
        # Clear collections after each test
        self.workspaces_collection.delete_many({})
        self.notebooks_collection.delete_many({})
        self.activities_collection.delete_many({})
        
        # Restore original FILE_MANAGER methods
        FILE_MANAGER.upload_file = self.original_upload_file
        FILE_MANAGER.download_file = self.original_download_file
        FILE_MANAGER.delete_file = self.original_delete_file
    
    def test_create_workspace(self):
        """Test creating a workspace through service."""
        # Call create_workspace() with test parameters
        workspace = self.workspace_service.create_workspace(
            name="Test Integration Workspace",
            description="Test Description",
            owner_id=TEST_USER_ID,
            contract_id=TEST_CONTRACT_ID,
            job_id=TEST_JOB_ID,
            metadata={"test_key": "test_value"}
        )
        
        # Verify workspace is created with correct properties
        assert workspace.name == "Test Integration Workspace"
        assert workspace.description == "Test Description"
        assert workspace.contract_id == TEST_CONTRACT_ID
        assert workspace.job_id == TEST_JOB_ID
        assert workspace.created_by == TEST_USER_ID
        assert workspace.metadata == {"test_key": "test_value"}
        assert workspace.status == WORKSPACE_STATUS.ACTIVE.name
        
        # Verify workspace is stored in MongoDB collection
        workspace_doc = self.workspace_service.workspaces_collection.find_one({"id": workspace.id})
        assert workspace_doc is not None
        assert workspace_doc["name"] == "Test Integration Workspace"
        
        # Verify activity record is created
        activity_doc = self.workspace_service.activities_collection.find_one({"workspace_id": workspace.id})
        assert activity_doc is not None
        assert activity_doc["activity_type"] == "workspace_created"
    
    def test_get_workspace(self):
        """Test retrieving a workspace by ID."""
        # Create a test workspace
        workspace = self.workspace_service.create_workspace(
            name="Test Integration Workspace",
            description="Test Description",
            owner_id=TEST_USER_ID,
            contract_id=TEST_CONTRACT_ID,
            job_id=TEST_JOB_ID
        )
        
        # Call get_workspace() with workspace ID
        retrieved_workspace = self.workspace_service.get_workspace(workspace.id)
        
        # Verify correct workspace is returned
        assert retrieved_workspace is not None
        assert retrieved_workspace.id == workspace.id
        assert retrieved_workspace.name == workspace.name
        assert len(retrieved_workspace.members) == 1
        assert retrieved_workspace.members[0].user_id == TEST_USER_ID
        
        # Test with non-existent ID
        non_existent = self.workspace_service.get_workspace("non-existent-id")
        
        # Verify None is returned for non-existent workspace
        assert non_existent is None
    
    def test_update_workspace(self):
        """Test updating workspace properties."""
        # Create a test workspace
        workspace = self.workspace_service.create_workspace(
            name="Original Name",
            description="Original Description",
            owner_id=TEST_USER_ID,
            contract_id=TEST_CONTRACT_ID,
            job_id=TEST_JOB_ID,
            metadata={"original_key": "original_value"}
        )
        
        # Prepare updates to name, description, and metadata
        updates = {
            "name": "Updated Name",
            "description": "Updated Description",
            "metadata": {
                "new_key": "new_value"
            }
        }
        
        # Call update_workspace() with updates
        updated_workspace = self.workspace_service.update_workspace(
            workspace.id,
            updates,
            TEST_USER_ID
        )
        
        # Verify workspace properties are updated
        assert updated_workspace.name == "Updated Name"
        assert updated_workspace.description == "Updated Description"
        assert "new_key" in updated_workspace.metadata
        assert updated_workspace.metadata["new_key"] == "new_value"
        assert "original_key" in updated_workspace.metadata
        
        # Verify update is persisted in database
        workspace_doc = self.workspace_service.workspaces_collection.find_one({"id": workspace.id})
        assert workspace_doc["name"] == "Updated Name"
        assert workspace_doc["description"] == "Updated Description"
    
    def test_delete_workspace(self):
        """Test soft deleting a workspace."""
        # Create a test workspace
        workspace = self.workspace_service.create_workspace(
            name="Test Workspace",
            description="Test Description",
            owner_id=TEST_USER_ID,
            contract_id=TEST_CONTRACT_ID,
            job_id=TEST_JOB_ID
        )
        
        # Call delete_workspace() with owner ID
        result = self.workspace_service.delete_workspace(workspace.id, TEST_USER_ID)
        
        # Verify workspace status is set to DELETED
        assert result is True
        
        # Verify update is persisted in database
        workspace_doc = self.workspace_service.workspaces_collection.find_one({"id": workspace.id})
        assert workspace_doc["status"] == WORKSPACE_STATUS.DELETED.name
        
        # Verify workspace is still retrievable but marked deleted
        deleted_workspace = self.workspace_service.get_workspace(workspace.id)
        assert deleted_workspace is not None
        assert deleted_workspace.status == WORKSPACE_STATUS.DELETED.name
    
    def test_archive_and_restore_workspace(self):
        """Test archiving and restoring a workspace."""
        # Create a test workspace
        workspace = self.workspace_service.create_workspace(
            name="Test Workspace",
            description="Test Description",
            owner_id=TEST_USER_ID,
            contract_id=TEST_CONTRACT_ID,
            job_id=TEST_JOB_ID
        )
        
        # Call archive_workspace() with owner ID
        result = self.workspace_service.archive_workspace(workspace.id, TEST_USER_ID)
        
        # Verify workspace status is set to ARCHIVED
        assert result is True
        workspace_doc = self.workspace_service.workspaces_collection.find_one({"id": workspace.id})
        assert workspace_doc["status"] == WORKSPACE_STATUS.ARCHIVED.name
        
        # Call restore_workspace() with owner ID
        result = self.workspace_service.restore_workspace(workspace.id, TEST_USER_ID)
        
        # Verify workspace status is set back to ACTIVE
        assert result is True
        workspace_doc = self.workspace_service.workspaces_collection.find_one({"id": workspace.id})
        assert workspace_doc["status"] == WORKSPACE_STATUS.ACTIVE.name
    
    def test_list_workspaces(self):
        """Test listing workspaces with filters."""
        # Create multiple test workspaces with different properties
        workspace1 = self.workspace_service.create_workspace(
            name="Workspace 1",
            description="Active workspace for user 1",
            owner_id=TEST_USER_ID,
            contract_id=TEST_CONTRACT_ID,
            job_id=TEST_JOB_ID
        )
        
        workspace2 = self.workspace_service.create_workspace(
            name="Workspace 2",
            description="Active workspace for user 2",
            owner_id=TEST_USER_2_ID,
            contract_id=TEST_CONTRACT_ID,
            job_id="different-job-id"
        )
        
        # Archive workspace2
        self.workspace_service.archive_workspace(workspace2.id, TEST_USER_2_ID)
        
        workspace3 = self.workspace_service.create_workspace(
            name="Workspace 3",
            description="Another active workspace for user 1",
            owner_id=TEST_USER_ID,
            contract_id="different-contract-id",
            job_id=TEST_JOB_ID
        )
        
        # Test listing by user_id
        user1_workspaces = self.workspace_service.list_workspaces(user_id=TEST_USER_ID)
        assert len(user1_workspaces) == 2
        assert any(w.id == workspace1.id for w in user1_workspaces)
        assert any(w.id == workspace3.id for w in user1_workspaces)
        
        # Test listing by status
        archived_workspaces = self.workspace_service.list_workspaces(status=WORKSPACE_STATUS.ARCHIVED.name)
        assert len(archived_workspaces) == 1
        assert archived_workspaces[0].id == workspace2.id
        
        # Test listing by contract_id and job_id
        contract_workspaces = self.workspace_service.list_workspaces(contract_id=TEST_CONTRACT_ID)
        assert len(contract_workspaces) == 2  # workspace1 and workspace2 (even though archived)
        
        job_workspaces = self.workspace_service.list_workspaces(job_id=TEST_JOB_ID)
        assert len(job_workspaces) == 2  # workspace1 and workspace3
        
        # Test pagination with skip and limit parameters
        paginated_workspaces = self.workspace_service.list_workspaces(skip=1, limit=1)
        assert len(paginated_workspaces) == 1  # Should get only one workspace
    
    def test_add_workspace_member(self):
        """Test adding members to a workspace."""
        # Create a test workspace
        workspace = self.workspace_service.create_workspace(
            name="Test Workspace",
            description="Test Description",
            owner_id=TEST_USER_ID,
            contract_id=TEST_CONTRACT_ID,
            job_id=TEST_JOB_ID
        )
        
        # Call add_workspace_member() with new user
        member = self.workspace_service.add_workspace_member(
            workspace.id,
            TEST_USER_2_ID,
            WORKSPACE_ROLES.EDITOR.name,
            added_by=TEST_USER_ID
        )
        
        # Verify member is added with specified role
        assert member is not None
        assert member.user_id == TEST_USER_2_ID
        assert member.role == WORKSPACE_ROLES.EDITOR.name
        
        # Verify update is persisted in database
        workspace_doc = self.workspace_service.workspaces_collection.find_one({"id": workspace.id})
        assert len(workspace_doc["members"]) == 2
        assert any(m["user_id"] == TEST_USER_2_ID for m in workspace_doc["members"])
        
        # Verify activity record is created for member addition
        activity_doc = self.workspace_service.activities_collection.find_one({
            "workspace_id": workspace.id,
            "activity_type": "member_added"
        })
        assert activity_doc is not None
        assert activity_doc["data"]["user_id"] == TEST_USER_2_ID
    
    def test_remove_workspace_member(self):
        """Test removing members from a workspace."""
        # Create a test workspace with multiple members
        workspace = self.workspace_service.create_workspace(
            name="Test Workspace",
            description="Test Description",
            owner_id=TEST_USER_ID,
            contract_id=TEST_CONTRACT_ID,
            job_id=TEST_JOB_ID
        )
        
        self.workspace_service.add_workspace_member(
            workspace.id,
            TEST_USER_2_ID,
            WORKSPACE_ROLES.EDITOR.name,
            added_by=TEST_USER_ID
        )
        
        # Call remove_workspace_member() for specific user
        result = self.workspace_service.remove_workspace_member(
            workspace.id,
            TEST_USER_2_ID,
            removed_by=TEST_USER_ID
        )
        
        # Verify member is removed from workspace
        assert result is True
        
        # Verify update is persisted in database
        workspace_doc = self.workspace_service.workspaces_collection.find_one({"id": workspace.id})
        assert len(workspace_doc["members"]) == 1
        assert not any(m["user_id"] == TEST_USER_2_ID for m in workspace_doc["members"])
        
        # Verify activity record is created for member removal
        activity_doc = self.workspace_service.activities_collection.find_one({
            "workspace_id": workspace.id,
            "activity_type": "member_removed"
        })
        assert activity_doc is not None
        assert activity_doc["data"]["user_id"] == TEST_USER_2_ID
    
    def test_update_member_role(self):
        """Test updating a member's role through service."""
        # Create a test workspace with members
        workspace = self.workspace_service.create_workspace(
            name="Test Workspace",
            description="Test Description",
            owner_id=TEST_USER_ID,
            contract_id=TEST_CONTRACT_ID,
            job_id=TEST_JOB_ID
        )
        
        self.workspace_service.add_workspace_member(
            workspace.id,
            TEST_USER_2_ID,
            WORKSPACE_ROLES.EDITOR.name,
            added_by=TEST_USER_ID
        )
        
        # Call update_member_role() with new role
        result = self.workspace_service.update_member_role(
            workspace.id,
            TEST_USER_2_ID,
            WORKSPACE_ROLES.VIEWER.name,
            updated_by=TEST_USER_ID
        )
        
        # Verify member's role is updated
        assert result is True
        
        # Verify update is persisted in database
        workspace_doc = self.workspace_service.workspaces_collection.find_one({"id": workspace.id})
        member_doc = next((m for m in workspace_doc["members"] if m["user_id"] == TEST_USER_2_ID), None)
        assert member_doc is not None
        assert member_doc["role"] == WORKSPACE_ROLES.VIEWER.name
        
        # Verify activity record is created for role update
        activity_doc = self.workspace_service.activities_collection.find_one({
            "workspace_id": workspace.id,
            "activity_type": "member_role_updated"
        })
        assert activity_doc is not None
        assert activity_doc["data"]["user_id"] == TEST_USER_2_ID
        assert activity_doc["data"]["new_role"] == WORKSPACE_ROLES.VIEWER.name
    
    def test_upload_file(self):
        """Test uploading files to a workspace."""
        # Create a test workspace
        workspace = self.workspace_service.create_workspace(
            name="Test Workspace",
            description="Test Description",
            owner_id=TEST_USER_ID,
            contract_id=TEST_CONTRACT_ID,
            job_id=TEST_JOB_ID
        )
        
        # Generate test file content
        file_content = create_test_file_content("py")
        filename = "test_script.py"
        
        # Mock FILE_MANAGER.upload_file to avoid actual file operations
        FILE_MANAGER.upload_file = mock.Mock(return_value={
            'path': f"/mock/path/{workspace.id}/{filename}",
            'name': filename,
            'size': len(file_content),
            'type': 'text/x-python',
            'workspace_id': workspace.id,
            'upload_time': datetime.now().isoformat()
        })
        
        # Call upload_file() with content and metadata
        file_info = self.workspace_service.upload_file(
            workspace.id,
            TEST_USER_ID,
            filename,
            file_content,
            description="Test Python script",
            metadata={"language": "python"}
        )
        
        # Verify file is saved to storage (mock was called)
        FILE_MANAGER.upload_file.assert_called_once()
        
        # Verify file record is added to workspace
        assert file_info is not None
        assert file_info["name"] == filename
        assert file_info["description"] == "Test Python script"
        assert file_info["metadata"] == {"language": "python"}
        
        # Verify file is persisted in database
        workspace_doc = self.workspace_service.workspaces_collection.find_one({"id": workspace.id})
        assert len(workspace_doc["files"]) == 1
        assert workspace_doc["files"][0]["name"] == filename
    
    def test_download_file(self):
        """Test downloading files from a workspace."""
        # Create a test workspace
        workspace = self.workspace_service.create_workspace(
            name="Test Workspace",
            description="Test Description",
            owner_id=TEST_USER_ID,
            contract_id=TEST_CONTRACT_ID,
            job_id=TEST_JOB_ID
        )
        
        # Upload a test file
        file_content = create_test_file_content("py")
        filename = "test_script.py"
        
        # Mock FILE_MANAGER.upload_file and download_file
        FILE_MANAGER.upload_file = mock.Mock(return_value={
            'path': f"/mock/path/{workspace.id}/{filename}",
            'name': filename,
            'size': len(file_content),
            'type': 'text/x-python',
            'workspace_id': workspace.id,
            'upload_time': datetime.now().isoformat()
        })
        
        FILE_MANAGER.download_file = mock.Mock(return_value=(
            file_content,
            filename,
            'text/x-python'
        ))
        
        # Upload file first
        file_info = self.workspace_service.upload_file(
            workspace.id,
            TEST_USER_ID,
            filename,
            file_content
        )
        
        # Call download_file() with file ID
        content, name, mimetype = self.workspace_service.download_file(
            workspace.id,
            file_info["id"],
            TEST_USER_ID
        )
        
        # Verify correct file content is returned
        assert content == file_content
        assert name == filename
        assert mimetype == 'text/x-python'
        
        # Verify FILE_MANAGER.download_file was called correctly
        FILE_MANAGER.download_file.assert_called_once()
    
    def test_delete_file(self):
        """Test deleting files from a workspace."""
        # Create a test workspace
        workspace = self.workspace_service.create_workspace(
            name="Test Workspace",
            description="Test Description",
            owner_id=TEST_USER_ID,
            contract_id=TEST_CONTRACT_ID,
            job_id=TEST_JOB_ID
        )
        
        # Upload test files
        file_content = create_test_file_content("py")
        filename = "test_script.py"
        
        # Mock FILE_MANAGER.upload_file and delete_file
        FILE_MANAGER.upload_file = mock.Mock(return_value={
            'path': f"/mock/path/{workspace.id}/{filename}",
            'name': filename,
            'size': len(file_content),
            'type': 'text/x-python',
            'workspace_id': workspace.id,
            'upload_time': datetime.now().isoformat()
        })
        
        FILE_MANAGER.delete_file = mock.Mock(return_value=True)
        
        # Upload file first
        file_info = self.workspace_service.upload_file(
            workspace.id,
            TEST_USER_ID,
            filename,
            file_content
        )
        
        # Call delete_file() with file ID
        result = self.workspace_service.delete_file(
            workspace.id,
            file_info["id"],
            TEST_USER_ID
        )
        
        # Verify file is removed from storage
        assert result is True
        FILE_MANAGER.delete_file.assert_called_once()
        
        # Verify file record is removed from workspace
        workspace_doc = self.workspace_service.workspaces_collection.find_one({"id": workspace.id})
        assert len(workspace_doc["files"]) == 0
    
    def test_list_files(self):
        """Test listing files in a workspace."""
        # Create a test workspace
        workspace = self.workspace_service.create_workspace(
            name="Test Workspace",
            description="Test Description",
            owner_id=TEST_USER_ID,
            contract_id=TEST_CONTRACT_ID,
            job_id=TEST_JOB_ID
        )
        
        # Upload multiple files of different types
        FILE_MANAGER.upload_file = mock.Mock(side_effect=lambda ws_id, filename, content: {
            'path': f"/mock/path/{ws_id}/{filename}",
            'name': filename,
            'size': len(content),
            'type': 'text/x-python' if filename.endswith('.py') else 'text/plain',
            'workspace_id': ws_id,
            'upload_time': datetime.now().isoformat()
        })
        
        # Upload files
        file1_info = self.workspace_service.upload_file(
            workspace.id,
            TEST_USER_ID,
            "script1.py",
            create_test_file_content("py")
        )
        
        file2_info = self.workspace_service.upload_file(
            workspace.id,
            TEST_USER_ID,
            "script2.py",
            create_test_file_content("py")
        )
        
        file3_info = self.workspace_service.upload_file(
            workspace.id,
            TEST_USER_ID,
            "data.txt",
            create_test_file_content("txt")
        )
        
        # Call list_files() without filters
        all_files = self.workspace_service.list_files(workspace.id, TEST_USER_ID)
        
        # Verify all files are listed
        assert len(all_files) == 3
        assert any(f["name"] == "script1.py" for f in all_files)
        assert any(f["name"] == "script2.py" for f in all_files)
        assert any(f["name"] == "data.txt" for f in all_files)
        
        # Test filtering by file_type
        python_files = self.workspace_service.list_files(workspace.id, TEST_USER_ID, file_type="py")
        assert len(python_files) == 2
        assert all(f["file_type"] == "py" for f in python_files)
        
        text_files = self.workspace_service.list_files(workspace.id, TEST_USER_ID, file_type="txt")
        assert len(text_files) == 1
        assert text_files[0]["name"] == "data.txt"
    
    def test_access_control(self):
        """Test workspace access control."""
        # Create a test workspace with members of different roles
        workspace = self.workspace_service.create_workspace(
            name="Test Workspace",
            description="Test Description",
            owner_id=TEST_USER_ID,
            contract_id=TEST_CONTRACT_ID,
            job_id=TEST_JOB_ID
        )
        
        # Add members with different roles
        self.workspace_service.add_workspace_member(
            workspace.id,
            TEST_USER_2_ID,
            WORKSPACE_ROLES.EDITOR.name,
            added_by=TEST_USER_ID
        )
        
        self.workspace_service.add_workspace_member(
            workspace.id,
            "viewer-user",
            WORKSPACE_ROLES.VIEWER.name,
            added_by=TEST_USER_ID
        )
        
        # Test operations with insufficient permissions
        
        # Viewer can't upload files (requires WRITE)
        with pytest.raises(ValueError, match="permission"):
            self.workspace_service.upload_file(
                workspace.id,
                "viewer-user",
                "test.txt",
                b"test content"
            )
        
        # Non-member can't access anything
        with pytest.raises(ValueError, match="permission"):
            self.workspace_service.list_files(
                workspace.id,
                "non-member-user"
            )
        
        # Editor can't delete workspaces (requires ADMIN)
        with pytest.raises(ValueError, match="permission"):
            self.workspace_service.delete_workspace(
                workspace.id,
                TEST_USER_2_ID
            )
        
        # Test operations with sufficient permissions
        
        # Editor can upload files
        mock_file_content = b"test content"
        FILE_MANAGER.upload_file = mock.Mock(return_value={
            'path': f"/mock/path/{workspace.id}/test.txt",
            'name': "test.txt",
            'size': len(mock_file_content),
            'type': 'text/plain',
            'workspace_id': workspace.id,
            'upload_time': datetime.now().isoformat()
        })
        
        file_info = self.workspace_service.upload_file(
            workspace.id,
            TEST_USER_2_ID,
            "test.txt",
            mock_file_content
        )
        assert file_info is not None
        
        # Viewer can list files
        files = self.workspace_service.list_files(
            workspace.id,
            "viewer-user"
        )
        assert files is not None
        
        # Owner can delete workspace
        result = self.workspace_service.delete_workspace(
            workspace.id,
            TEST_USER_ID
        )
        assert result is True
    
    def test_record_activity(self):
        """Test recording workspace activities."""
        # Create a test workspace
        workspace = self.workspace_service.create_workspace(
            name="Test Workspace",
            description="Test Description",
            owner_id=TEST_USER_ID,
            contract_id=TEST_CONTRACT_ID,
            job_id=TEST_JOB_ID
        )
        
        # Record various activity types
        self.workspace_service.record_activity(
            workspace_id=workspace.id,
            user_id=TEST_USER_ID,
            activity_type="custom_activity",
            data={"key1": "value1", "key2": 42}
        )
        
        self.workspace_service.record_activity(
            workspace_id=workspace.id,
            user_id=TEST_USER_2_ID,
            activity_type="another_activity",
            data={"text": "Something happened"}
        )
        
        # Verify activities are stored in database
        activities = list(self.workspace_service.activities_collection.find({"workspace_id": workspace.id}))
        
        # Should have at least 3 activities (workspace_created + the two we added)
        assert len(activities) >= 3
        
        # Find our specific activities
        custom_activity = next((a for a in activities if a["activity_type"] == "custom_activity"), None)
        another_activity = next((a for a in activities if a["activity_type"] == "another_activity"), None)
        
        # Verify activities include correct metadata
        assert custom_activity is not None
        assert custom_activity["user_id"] == TEST_USER_ID
        assert custom_activity["data"]["key1"] == "value1"
        assert custom_activity["data"]["key2"] == 42
        
        assert another_activity is not None
        assert another_activity["user_id"] == TEST_USER_2_ID
        assert another_activity["data"]["text"] == "Something happened"
        
        # Test retrieving activities with filters
        filtered_activities = self.workspace_service.get_activities(
            workspace_id=workspace.id,
            user_id=TEST_USER_ID,
            activity_type="custom_activity"
        )
        
        assert len(filtered_activities) == 1
        assert filtered_activities[0].activity_type == "custom_activity"
        assert filtered_activities[0].user_id == TEST_USER_ID
    
    def test_cleanup_inactive_workspaces(self):
        """Test automatic archiving of inactive workspaces."""
        # Create test workspaces
        active_workspace = self.workspace_service.create_workspace(
            name="Active Workspace",
            description="Recent activity",
            owner_id=TEST_USER_ID,
            contract_id=TEST_CONTRACT_ID,
            job_id=TEST_JOB_ID
        )
        
        inactive_workspace = self.workspace_service.create_workspace(
            name="Inactive Workspace",
            description="No recent activity",
            owner_id=TEST_USER_ID,
            contract_id=TEST_CONTRACT_ID,
            job_id=TEST_JOB_ID
        )
        
        # Calculate an inactive timestamp
        timeout = settings.WORKSPACE_INACTIVITY_TIMEOUT + 3600  # Add buffer
        inactive_time = (datetime.utcnow() - timedelta(seconds=timeout)).isoformat()
        
        # Update inactive workspace to have old last_active_at for all members
        self.workspaces_collection.update_one(
            {"id": inactive_workspace.id},
            {"$set": {
                "members.$[].last_active_at": inactive_time,
                "updated_at": inactive_time
            }}
        )
        
        # Call cleanup_inactive_workspaces()
        archived_count = self.workspace_service.cleanup_inactive_workspaces()
        
        # Verify inactive workspaces are archived
        assert archived_count >= 1
        inactive_doc = self.workspaces_collection.find_one({"id": inactive_workspace.id})
        assert inactive_doc["status"] == WORKSPACE_STATUS.ARCHIVED.name
        
        # Verify active workspaces remain unchanged
        active_doc = self.workspaces_collection.find_one({"id": active_workspace.id})
        assert active_doc["status"] == WORKSPACE_STATUS.ACTIVE.name