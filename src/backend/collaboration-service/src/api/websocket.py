"""
WebSocket API for real-time collaboration features in the AI Talent Marketplace.

This module implements WebSocket endpoints that enable real-time collaboration between
AI professionals and clients, including synchronized editing of Jupyter notebooks,
live code execution, file sharing, and workspace collaboration.
"""

import logging
import json
import asyncio
import typing
from datetime import datetime
import uuid
from typing import Dict, List, Optional, Any, Union

# fastapi v0.100.0
from fastapi import WebSocket, WebSocketDisconnect, Depends, HTTPException, status

# python-jose v3.3.0
import jwt

# redis v4.6.0
import redis

# Internal imports
from ..config import settings, ALLOWED_ORIGINS, REAL_TIME_MESSAGE_HISTORY
from ..services.workspace_service import WorkspaceService, has_access
from ..services.jupyter_service import JupyterService
from ..utils.file_manager import FILE_MANAGER
from ..models.workspace import Workspace, WORKSPACE_PERMISSIONS
from ..models.notebook import Notebook, CELL_TYPES

# Configure logger
logger = logging.getLogger(__name__)

# Initialize services
workspace_service = WorkspaceService()
jupyter_service = JupyterService()

# Initialize global dictionaries for tracking connections and message history
active_connections = {}
message_history = {}

# Initialize Redis client for pub/sub communication
redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    password=settings.REDIS_PASSWORD,
    decode_responses=True
)


class ConnectionManager:
    """
    Manages active WebSocket connections and message distribution.
    
    This class handles tracking of active connections, broadcasting messages
    to connected clients, and maintaining message history for late joiners.
    """
    
    def __init__(self):
        """Initialize connection manager with empty collections."""
        # Dictionary to track active connections by resource ID (workspace/notebook)
        # Structure: {resource_id: {user_id: [websocket, ...], ...}}
        self.active_connections = {}
        
        # Dictionary to store message history by resource ID
        # Structure: {resource_id: [message, ...]}
        self.message_history = {}
        
        # Redis client for pub/sub communication across service instances
        self.redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD,
            decode_responses=True
        )
        
        logger.info("ConnectionManager initialized")
    
    def connect(self, resource_id: str, user_id: str, websocket: WebSocket) -> None:
        """
        Register a new WebSocket connection.
        
        Args:
            resource_id: ID of the resource (workspace/notebook)
            user_id: ID of the user connecting
            websocket: WebSocket connection object
        """
        # Initialize resource entry if it doesn't exist
        if resource_id not in self.active_connections:
            self.active_connections[resource_id] = {}
        
        # Initialize user entry if it doesn't exist
        if user_id not in self.active_connections[resource_id]:
            self.active_connections[resource_id][user_id] = []
        
        # Add websocket to user's connections
        self.active_connections[resource_id][user_id].append(websocket)
        
        logger.info(f"User {user_id} connected to {resource_id}")
    
    def disconnect(self, resource_id: str, user_id: str, websocket: WebSocket) -> None:
        """
        Remove a WebSocket connection.
        
        Args:
            resource_id: ID of the resource (workspace/notebook)
            user_id: ID of the user disconnecting
            websocket: WebSocket connection object
        """
        # Check if resource exists
        if resource_id in self.active_connections:
            # Check if user exists
            if user_id in self.active_connections[resource_id]:
                # Remove websocket from user's connections
                if websocket in self.active_connections[resource_id][user_id]:
                    self.active_connections[resource_id][user_id].remove(websocket)
                
                # Remove user if no connections left
                if not self.active_connections[resource_id][user_id]:
                    del self.active_connections[resource_id][user_id]
            
            # Remove resource if no users left
            if not self.active_connections[resource_id]:
                del self.active_connections[resource_id]
        
        logger.info(f"User {user_id} disconnected from {resource_id}")
    
    async def broadcast(self, resource_id: str, message: Dict[str, Any], exclude: Optional[WebSocket] = None) -> None:
        """
        Broadcast a message to all connections for a resource.
        
        Args:
            resource_id: ID of the resource to broadcast to
            message: Message to broadcast
            exclude: Optional WebSocket connection to exclude from broadcast
        """
        if resource_id not in self.active_connections:
            return
        
        # Add timestamp to message if not present
        if "timestamp" not in message:
            message["timestamp"] = datetime.utcnow().isoformat()
        
        # Add message to history
        self._add_message_to_history(resource_id, message)
        
        # Serialize message to JSON
        message_json = json.dumps(message)
        
        # Broadcast to all connections
        for user_id, connections in self.active_connections[resource_id].items():
            for connection in connections:
                if connection != exclude:
                    try:
                        await connection.send_text(message_json)
                    except Exception as e:
                        logger.error(f"Error sending message to user {user_id}: {str(e)}")
        
        # Publish to Redis for cross-instance distribution
        try:
            await self._publish_to_redis(resource_id, message)
        except Exception as e:
            logger.error(f"Error publishing message to Redis: {str(e)}")
        
        logger.debug(f"Broadcast message to {resource_id}")
    
    async def send_personal_message(self, resource_id: str, user_id: str, message: Dict[str, Any]) -> bool:
        """
        Send a message to a specific user connection.
        
        Args:
            resource_id: ID of the resource
            user_id: ID of the user to send to
            message: Message to send
            
        Returns:
            Success indicator
        """
        # Check if user has connections
        if (resource_id in self.active_connections and 
            user_id in self.active_connections[resource_id] and
            self.active_connections[resource_id][user_id]):
            
            # Add timestamp if not present
            if "timestamp" not in message:
                message["timestamp"] = datetime.utcnow().isoformat()
            
            # Serialize message to JSON
            message_json = json.dumps(message)
            
            # Send to all user's connections
            for connection in self.active_connections[resource_id][user_id]:
                try:
                    await connection.send_text(message_json)
                except Exception as e:
                    logger.error(f"Error sending personal message to user {user_id}: {str(e)}")
                    continue
            
            logger.debug(f"Sent personal message to user {user_id} in {resource_id}")
            return True
        
        return False
    
    async def send_history(self, resource_id: str, websocket: WebSocket) -> None:
        """
        Send message history to a new connection.
        
        Args:
            resource_id: ID of the resource
            websocket: WebSocket connection to send history to
        """
        # Get message history for resource
        history = self.message_history.get(resource_id, [])
        
        if history:
            # Create history container message
            history_message = {
                "type": "history",
                "messages": history,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Send history
            await websocket.send_text(json.dumps(history_message))
            
            logger.debug(f"Sent history ({len(history)} messages) to connection in {resource_id}")
    
    def get_active_users(self, resource_id: str) -> List[str]:
        """
        Get list of active users for a resource.
        
        Args:
            resource_id: ID of the resource
            
        Returns:
            List of active user IDs
        """
        if resource_id in self.active_connections:
            return list(self.active_connections[resource_id].keys())
        
        return []
    
    def _add_message_to_history(self, resource_id: str, message: Dict[str, Any]) -> None:
        """
        Add a message to history for the specified resource.
        
        Args:
            resource_id: ID of the resource
            message: Message to add to history
        """
        # Initialize history for resource if it doesn't exist
        if resource_id not in self.message_history:
            self.message_history[resource_id] = []
        
        # Add message to history
        self.message_history[resource_id].append(message)
        
        # Limit history size
        history_limit = REAL_TIME_MESSAGE_HISTORY
        if len(self.message_history[resource_id]) > history_limit:
            # Remove oldest messages
            self.message_history[resource_id] = self.message_history[resource_id][-history_limit:]
    
    async def _publish_to_redis(self, resource_id: str, message: Dict[str, Any]) -> None:
        """
        Publish a message to Redis for cross-instance distribution.
        
        Args:
            resource_id: ID of the resource
            message: Message to publish
        """
        # Add a field to identify the source instance
        message["_source_instance"] = "instance_id"  # This could be a unique ID for this instance
        
        # Serialize message to JSON
        message_json = json.dumps(message)
        
        # Publish to Redis
        await asyncio.to_thread(
            self.redis_client.publish,
            f"collaboration:{resource_id}",
            message_json
        )


def get_token_from_query(query_string: str) -> Dict[str, Any]:
    """
    Extract and validate JWT token from WebSocket query parameters.
    
    Args:
        query_string: Query string from WebSocket connection
        
    Returns:
        User information from token
        
    Raises:
        HTTPException: If token is invalid or missing
    """
    # Parse query string
    params = {}
    if query_string:
        for param in query_string.split("&"):
            if "=" in param:
                key, value = param.split("=", 1)
                params[key] = value
    
    # Get token from parameters
    token = params.get("token")
    
    if not token:
        logger.warning("No token provided in WebSocket connection")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is required"
        )
    
    try:
        # Decode and verify JWT token
        # In a production environment, you would use the secret key from settings
        # and validate the token signature
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET_KEY, 
            algorithms=["HS256"]
        )
        
        # Check if token is expired
        if "exp" in payload and payload["exp"] < datetime.utcnow().timestamp():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        
        # Return user information from token
        return {
            "user_id": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get("role"),
            "exp": payload.get("exp")
        }
    
    except jwt.JWTError as e:
        logger.warning(f"Invalid token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )


def verify_workspace_access(workspace_id: str, user: Dict[str, Any], permission: str) -> bool:
    """
    Verify that a user has access to a workspace with specific permission.
    
    Args:
        workspace_id: ID of the workspace
        user: User information dictionary
        permission: Permission to check
        
    Returns:
        True if access is allowed, False otherwise
    """
    user_id = user.get("user_id")
    
    # Check access using workspace service
    return workspace_service.has_access(workspace_id, user_id, permission)


def add_message_to_history(resource_id: str, message: Dict[str, Any]) -> None:
    """
    Add a message to the history cache for a workspace or notebook.
    
    Args:
        resource_id: ID of the resource (workspace/notebook)
        message: Message to add to history
    """
    # Initialize history for resource if it doesn't exist
    if resource_id not in message_history:
        message_history[resource_id] = []
    
    # Add message to history
    message_history[resource_id].append(message)
    
    # Limit history size
    if len(message_history[resource_id]) > REAL_TIME_MESSAGE_HISTORY:
        # Remove oldest messages
        message_history[resource_id] = message_history[resource_id][-REAL_TIME_MESSAGE_HISTORY:]


async def broadcast_to_connections(
    resource_id: str, 
    message: Dict[str, Any], 
    exclude_connection: Optional[WebSocket] = None
) -> None:
    """
    Broadcast a message to all active connections for a resource.
    
    Args:
        resource_id: ID of the resource (workspace/notebook)
        message: Message to broadcast
        exclude_connection: Optional connection to exclude from broadcast
    """
    # Check if resource has connections
    if resource_id not in active_connections:
        return
    
    # Add timestamp to message
    if "timestamp" not in message:
        message["timestamp"] = datetime.utcnow().isoformat()
    
    # Add message to history
    add_message_to_history(resource_id, message)
    
    # Serialize message to JSON
    message_json = json.dumps(message)
    
    # Broadcast to all connections
    for user_connections in active_connections[resource_id].values():
        for connection in user_connections:
            if connection != exclude_connection:
                try:
                    await connection.send_text(message_json)
                except Exception as e:
                    logger.error(f"Error broadcasting message: {str(e)}")
    
    # Publish to Redis for cross-service communication
    await publish_to_redis(resource_id, message)


async def handle_notebook_message(
    message: Dict[str, Any], 
    notebook_id: str, 
    user: Dict[str, Any], 
    websocket: WebSocket
) -> Dict[str, Any]:
    """
    Process incoming messages for notebook collaboration.
    
    Args:
        message: Incoming message
        notebook_id: ID of the notebook
        user: User information
        websocket: WebSocket connection
        
    Returns:
        Response message
    """
    user_id = user.get("user_id")
    action = message.get("action")
    
    # Get notebook to check workspace access
    notebook = jupyter_service.get_notebook(notebook_id, user_id)
    
    if not notebook:
        return {
            "status": "error",
            "message": "Notebook not found",
            "action": action
        }
    
    # Get workspace ID from notebook
    workspace_id = notebook.workspace_id
    
    # Check access based on action
    if action == "cell_update":
        # Requires WRITE permission
        if not workspace_service.has_access(workspace_id, user_id, WORKSPACE_PERMISSIONS.WRITE.name):
            return {
                "status": "error",
                "message": "You don't have permission to update cells",
                "action": action
            }
        
        # Extract cell data
        cell_id = message.get("cell_id")
        source = message.get("source")
        
        # Update cell in notebook
        result = jupyter_service.update_notebook_cell(
            notebook_id=notebook_id,
            cell_id=cell_id,
            source=source,
            user_id=user_id
        )
        
        # Create response message
        response = {
            "action": "cell_updated",
            "status": "success",
            "cell_id": cell_id,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Broadcast update to other clients
        await broadcast_to_connections(notebook_id, response, exclude_connection=websocket)
        
        return response
    
    elif action == "code_execute":
        # Requires EXECUTE permission
        if not workspace_service.has_access(workspace_id, user_id, WORKSPACE_PERMISSIONS.EXECUTE.name):
            return {
                "status": "error",
                "message": "You don't have permission to execute code",
                "action": action
            }
        
        # Extract execution data
        cell_id = message.get("cell_id")
        code = message.get("code")
        
        # Execute code asynchronously
        execution_id = await jupyter_service.execute_code_async(
            notebook_id=notebook_id,
            cell_id=cell_id,
            code=code,
            user_id=user_id
        )
        
        # Create response message
        response = {
            "action": "code_executing",
            "status": "success",
            "cell_id": cell_id,
            "execution_id": execution_id,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Broadcast execution to other clients
        await broadcast_to_connections(notebook_id, response, exclude_connection=websocket)
        
        return response
    
    elif action == "cursor_position":
        # Requires READ permission
        if not workspace_service.has_access(workspace_id, user_id, WORKSPACE_PERMISSIONS.READ.name):
            return {
                "status": "error",
                "message": "You don't have permission to view this notebook",
                "action": action
            }
        
        # Extract cursor position data
        cell_id = message.get("cell_id")
        position = message.get("position")
        
        # Create response message
        response = {
            "action": "cursor_position",
            "status": "success",
            "cell_id": cell_id,
            "position": position,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Broadcast cursor position to other clients
        await broadcast_to_connections(notebook_id, response, exclude_connection=websocket)
        
        return response
    
    elif action == "interrupt_execution":
        # Requires EXECUTE permission
        if not workspace_service.has_access(workspace_id, user_id, WORKSPACE_PERMISSIONS.EXECUTE.name):
            return {
                "status": "error",
                "message": "You don't have permission to interrupt execution",
                "action": action
            }
        
        # Interrupt execution
        result = jupyter_service.interrupt_execution(
            notebook_id=notebook_id,
            user_id=user_id
        )
        
        # Create response message
        response = {
            "action": "execution_interrupted",
            "status": "success" if result else "error",
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Broadcast interruption to other clients
        await broadcast_to_connections(notebook_id, response, exclude_connection=websocket)
        
        return response
    
    else:
        return {
            "status": "error",
            "message": f"Unknown action: {action}",
            "action": action
        }


async def handle_workspace_message(
    message: Dict[str, Any], 
    workspace_id: str, 
    user: Dict[str, Any], 
    websocket: WebSocket
) -> Dict[str, Any]:
    """
    Process incoming messages for workspace collaboration.
    
    Args:
        message: Incoming message
        workspace_id: ID of the workspace
        user: User information
        websocket: WebSocket connection
        
    Returns:
        Response message
    """
    user_id = user.get("user_id")
    action = message.get("action")
    
    if action == "file_upload":
        # Requires WRITE permission
        if not workspace_service.has_access(workspace_id, user_id, WORKSPACE_PERMISSIONS.WRITE.name):
            return {
                "status": "error",
                "message": "You don't have permission to upload files",
                "action": action
            }
        
        # Extract file data
        filename = message.get("filename")
        file_content = message.get("content")  # Base64 encoded
        description = message.get("description", "")
        
        # Convert Base64 to bytes if needed
        if isinstance(file_content, str):
            import base64
            try:
                file_content = base64.b64decode(file_content)
            except Exception as e:
                return {
                    "status": "error",
                    "message": f"Invalid file content: {str(e)}",
                    "action": action
                }
        
        # Upload file asynchronously
        file_info = await FILE_MANAGER.async_upload_file(
            workspace_id=workspace_id,
            filename=filename,
            content=file_content
        )
        
        # Create response message
        response = {
            "action": "file_uploaded",
            "status": "success",
            "file_info": file_info,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Record activity
        workspace_service.record_activity(
            workspace_id=workspace_id,
            user_id=user_id,
            activity_type="file_uploaded",
            data={"filename": filename}
        )
        
        # Broadcast file upload to other clients
        await broadcast_to_connections(workspace_id, response, exclude_connection=websocket)
        
        return response
    
    elif action == "chat_message":
        # Requires READ permission
        if not workspace_service.has_access(workspace_id, user_id, WORKSPACE_PERMISSIONS.READ.name):
            return {
                "status": "error",
                "message": "You don't have permission to send messages",
                "action": action
            }
        
        # Extract message data
        content = message.get("content")
        
        # Create response message
        response = {
            "action": "chat_message",
            "status": "success",
            "content": content,
            "user_id": user_id,
            "message_id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Record activity
        workspace_service.record_activity(
            workspace_id=workspace_id,
            user_id=user_id,
            activity_type="chat_message",
            data={"content": content}
        )
        
        # Broadcast chat message to all clients
        await broadcast_to_connections(workspace_id, response, exclude_connection=websocket)
        
        return response
    
    elif action == "presence_update":
        # Requires READ permission
        if not workspace_service.has_access(workspace_id, user_id, WORKSPACE_PERMISSIONS.READ.name):
            return {
                "status": "error",
                "message": "You don't have permission for this workspace",
                "action": action
            }
        
        # Extract presence data
        status = message.get("status", "active")
        
        # Create response message
        response = {
            "action": "presence_update",
            "status": "success",
            "user_id": user_id,
            "presence_status": status,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Broadcast presence update to other clients
        await broadcast_to_connections(workspace_id, response, exclude_connection=websocket)
        
        return response
    
    elif action == "activity_notification":
        # Requires READ permission
        if not workspace_service.has_access(workspace_id, user_id, WORKSPACE_PERMISSIONS.READ.name):
            return {
                "status": "error",
                "message": "You don't have permission for this workspace",
                "action": action
            }
        
        # Extract activity data
        activity_type = message.get("activity_type")
        activity_data = message.get("activity_data", {})
        
        # Record activity
        workspace_service.record_activity(
            workspace_id=workspace_id,
            user_id=user_id,
            activity_type=activity_type,
            data=activity_data
        )
        
        # Create response message
        response = {
            "action": "activity_notification",
            "status": "success",
            "user_id": user_id,
            "activity_type": activity_type,
            "activity_data": activity_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Broadcast activity to other clients
        await broadcast_to_connections(workspace_id, response, exclude_connection=websocket)
        
        return response
    
    else:
        return {
            "status": "error",
            "message": f"Unknown action: {action}",
            "action": action
        }


async def subscribe_to_redis(resource_id: str, websocket: WebSocket) -> None:
    """
    Subscribe to Redis channel for a resource.
    
    Args:
        resource_id: ID of the resource (workspace/notebook)
        websocket: WebSocket connection
    """
    # Create Redis pubsub
    pubsub = redis_client.pubsub()
    
    # Subscribe to channel
    channel = f"collaboration:{resource_id}"
    pubsub.subscribe(channel)
    
    try:
        # Start background task to listen for messages
        while True:
            message = pubsub.get_message(ignore_subscribe_messages=True, timeout=0.1)
            if message:
                # Extract data
                data = message.get("data")
                
                # Skip if not a string (happens with control messages)
                if not isinstance(data, str):
                    continue
                
                try:
                    # Parse JSON data
                    payload = json.loads(data)
                    
                    # Check if message is from this instance
                    source_instance = payload.get("_source_instance")
                    if source_instance == "instance_id":  # Skip our own messages
                        continue
                    
                    # Remove source instance marker
                    if "_source_instance" in payload:
                        del payload["_source_instance"]
                    
                    # Forward message to client
                    await websocket.send_text(json.dumps(payload))
                except json.JSONDecodeError:
                    logger.warning(f"Received invalid JSON from Redis: {data}")
            
            # Check for WebSocket disconnect
            await asyncio.sleep(0.1)
    
    finally:
        # Unsubscribe and close connection
        pubsub.unsubscribe(channel)
        pubsub.close()


async def publish_to_redis(resource_id: str, message: Dict[str, Any]) -> None:
    """
    Publish a message to Redis for distribution to other service instances.
    
    Args:
        resource_id: ID of the resource (workspace/notebook)
        message: Message to publish
    """
    # Add a field to indicate source instance
    message_copy = message.copy()
    message_copy["_source_instance"] = "instance_id"  # This should be a unique identifier for this instance
    
    # Serialize to JSON
    message_json = json.dumps(message_copy)
    
    try:
        # Publish to Redis channel
        await asyncio.to_thread(
            redis_client.publish,
            f"collaboration:{resource_id}",
            message_json
        )
        
        logger.debug(f"Published message to Redis for {resource_id}")
    except Exception as e:
        logger.error(f"Error publishing to Redis: {str(e)}")


async def workspace_websocket_endpoint(websocket: WebSocket, workspace_id: str):
    """
    WebSocket endpoint for real-time workspace collaboration.
    
    Args:
        websocket: WebSocket connection
        workspace_id: ID of the workspace
    """
    # Accept the WebSocket connection
    await websocket.accept()
    
    # Extract user from token in query parameters
    try:
        query = websocket.scope.get("query_string", b"").decode("utf-8")
        user = get_token_from_query(query)
        user_id = user.get("user_id")
    except HTTPException as e:
        # Send error message
        await websocket.send_text(json.dumps({
            "status": "error",
            "message": e.detail,
            "timestamp": datetime.utcnow().isoformat()
        }))
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    # Verify workspace access
    if not verify_workspace_access(workspace_id, user, WORKSPACE_PERMISSIONS.READ.name):
        # Send error message
        await websocket.send_text(json.dumps({
            "status": "error",
            "message": "You don't have access to this workspace",
            "timestamp": datetime.utcnow().isoformat()
        }))
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    # Initialize connections if not exists
    if workspace_id not in active_connections:
        active_connections[workspace_id] = {}
    
    # Add user if not exists
    if user_id not in active_connections[workspace_id]:
        active_connections[workspace_id][user_id] = []
    
    # Add connection
    active_connections[workspace_id][user_id].append(websocket)
    
    try:
        # Send connection acknowledgment
        await websocket.send_text(json.dumps({
            "action": "connection_ack",
            "status": "success",
            "workspace_id": workspace_id,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        }))
        
        # Send message history
        if workspace_id in message_history and message_history[workspace_id]:
            await websocket.send_text(json.dumps({
                "action": "history",
                "messages": message_history[workspace_id],
                "timestamp": datetime.utcnow().isoformat()
            }))
        
        # Start Redis subscription in background task
        redis_task = asyncio.create_task(subscribe_to_redis(workspace_id, websocket))
        
        # Update user activity
        workspace_service.update_member_activity(workspace_id, user_id)
        
        # Broadcast user connection
        await broadcast_to_connections(
            workspace_id,
            {
                "action": "user_connected",
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat()
            },
            exclude_connection=websocket
        )
        
        # Message receiving loop
        while True:
            # Receive message from WebSocket
            data = await websocket.receive_text()
            
            try:
                # Parse message
                message = json.loads(data)
                
                # Process message
                response = await handle_workspace_message(message, workspace_id, user, websocket)
                
                # Send response
                await websocket.send_text(json.dumps(response))
                
                # Update activity timestamp
                workspace_service.update_member_activity(workspace_id, user_id)
            
            except json.JSONDecodeError:
                # Send error for invalid JSON
                await websocket.send_text(json.dumps({
                    "status": "error",
                    "message": "Invalid JSON message",
                    "timestamp": datetime.utcnow().isoformat()
                }))
            
            except Exception as e:
                # Send error message
                await websocket.send_text(json.dumps({
                    "status": "error",
                    "message": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                }))
                logger.error(f"Error processing message: {str(e)}")
    
    except WebSocketDisconnect:
        # Remove connection
        if workspace_id in active_connections and user_id in active_connections[workspace_id]:
            if websocket in active_connections[workspace_id][user_id]:
                active_connections[workspace_id][user_id].remove(websocket)
            
            # Remove user if no connections left
            if not active_connections[workspace_id][user_id]:
                del active_connections[workspace_id][user_id]
                
                # Broadcast user disconnection
                await broadcast_to_connections(
                    workspace_id,
                    {
                        "action": "user_disconnected",
                        "user_id": user_id,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                )
                
                # Record activity
                workspace_service.record_activity(
                    workspace_id=workspace_id,
                    user_id=user_id,
                    activity_type="user_disconnected",
                    data={}
                )
        
        logger.info(f"WebSocket disconnected: user {user_id} from workspace {workspace_id}")
    
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
    
    finally:
        # Clean up Redis subscription
        if 'redis_task' in locals() and not redis_task.done():
            redis_task.cancel()
        
        # Ensure connection is properly removed
        if workspace_id in active_connections and user_id in active_connections[workspace_id]:
            if websocket in active_connections[workspace_id][user_id]:
                active_connections[workspace_id][user_id].remove(websocket)
            
            if not active_connections[workspace_id][user_id]:
                del active_connections[workspace_id][user_id]


async def notebook_websocket_endpoint(websocket: WebSocket, notebook_id: str):
    """
    WebSocket endpoint for real-time Jupyter notebook collaboration.
    
    Args:
        websocket: WebSocket connection
        notebook_id: ID of the notebook
    """
    # Accept the WebSocket connection
    await websocket.accept()
    
    # Extract user from token in query parameters
    try:
        query = websocket.scope.get("query_string", b"").decode("utf-8")
        user = get_token_from_query(query)
        user_id = user.get("user_id")
    except HTTPException as e:
        # Send error message
        await websocket.send_text(json.dumps({
            "status": "error",
            "message": e.detail,
            "timestamp": datetime.utcnow().isoformat()
        }))
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    # Get notebook to verify access
    notebook = jupyter_service.get_notebook(notebook_id, user_id)
    
    if not notebook:
        # Send error message
        await websocket.send_text(json.dumps({
            "status": "error",
            "message": "Notebook not found",
            "timestamp": datetime.utcnow().isoformat()
        }))
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    # Get workspace ID from notebook
    workspace_id = notebook.workspace_id
    
    # Verify workspace access
    if not verify_workspace_access(workspace_id, user, WORKSPACE_PERMISSIONS.READ.name):
        # Send error message
        await websocket.send_text(json.dumps({
            "status": "error",
            "message": "You don't have access to this notebook",
            "timestamp": datetime.utcnow().isoformat()
        }))
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    # Initialize connections if not exists
    if notebook_id not in active_connections:
        active_connections[notebook_id] = {}
    
    # Add user if not exists
    if user_id not in active_connections[notebook_id]:
        active_connections[notebook_id][user_id] = []
    
    # Add connection
    active_connections[notebook_id][user_id].append(websocket)
    
    try:
        # Send connection acknowledgment
        await websocket.send_text(json.dumps({
            "action": "connection_ack",
            "status": "success",
            "notebook_id": notebook_id,
            "workspace_id": workspace_id,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat()
        }))
        
        # Send message history
        if notebook_id in message_history and message_history[notebook_id]:
            await websocket.send_text(json.dumps({
                "action": "history",
                "messages": message_history[notebook_id],
                "timestamp": datetime.utcnow().isoformat()
            }))
        
        # Start Redis subscription in background task
        redis_task = asyncio.create_task(subscribe_to_redis(notebook_id, websocket))
        
        # Update user activity
        workspace_service.update_member_activity(workspace_id, user_id)
        
        # Broadcast user connection
        await broadcast_to_connections(
            notebook_id,
            {
                "action": "user_connected",
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat()
            },
            exclude_connection=websocket
        )
        
        # Record activity
        workspace_service.record_activity(
            workspace_id=workspace_id,
            user_id=user_id,
            activity_type="notebook_opened",
            data={"notebook_id": notebook_id, "notebook_name": notebook.name}
        )
        
        # Message receiving loop
        while True:
            # Receive message from WebSocket
            data = await websocket.receive_text()
            
            try:
                # Parse message
                message = json.loads(data)
                
                # Process message
                response = await handle_notebook_message(message, notebook_id, user, websocket)
                
                # Send response
                await websocket.send_text(json.dumps(response))
                
                # Update activity timestamp
                workspace_service.update_member_activity(workspace_id, user_id)
            
            except json.JSONDecodeError:
                # Send error for invalid JSON
                await websocket.send_text(json.dumps({
                    "status": "error",
                    "message": "Invalid JSON message",
                    "timestamp": datetime.utcnow().isoformat()
                }))
            
            except Exception as e:
                # Send error message
                await websocket.send_text(json.dumps({
                    "status": "error",
                    "message": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                }))
                logger.error(f"Error processing message: {str(e)}")
    
    except WebSocketDisconnect:
        # Remove connection
        if notebook_id in active_connections and user_id in active_connections[notebook_id]:
            if websocket in active_connections[notebook_id][user_id]:
                active_connections[notebook_id][user_id].remove(websocket)
            
            # Remove user if no connections left
            if not active_connections[notebook_id][user_id]:
                del active_connections[notebook_id][user_id]
                
                # Broadcast user disconnection
                await broadcast_to_connections(
                    notebook_id,
                    {
                        "action": "user_disconnected",
                        "user_id": user_id,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                )
                
                # Record activity
                workspace_service.record_activity(
                    workspace_id=workspace_id,
                    user_id=user_id,
                    activity_type="notebook_closed",
                    data={"notebook_id": notebook_id, "notebook_name": notebook.name}
                )
        
        logger.info(f"WebSocket disconnected: user {user_id} from notebook {notebook_id}")
    
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
    
    finally:
        # Clean up Redis subscription
        if 'redis_task' in locals() and not redis_task.done():
            redis_task.cancel()
        
        # Ensure connection is properly removed
        if notebook_id in active_connections and user_id in active_connections[notebook_id]:
            if websocket in active_connections[notebook_id][user_id]:
                active_connections[notebook_id][user_id].remove(websocket)
            
            if not active_connections[notebook_id][user_id]:
                del active_connections[notebook_id][user_id]