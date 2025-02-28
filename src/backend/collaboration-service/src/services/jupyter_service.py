"""
Jupyter Service for the AI Talent Marketplace collaboration platform.

This module provides Jupyter notebook integration, enabling real-time execution of code,
kernel management, and collaborative editing of notebooks for AI professionals and clients
working together on projects.
"""

import logging
import json
import os
import uuid
import asyncio
import threading
import queue
import time
from typing import Dict, List, Optional, Any, Tuple, Union
from datetime import datetime

# jupyter_client v8.3.0
import jupyter_client
from jupyter_client.kernelspec import KernelSpecManager

# nbformat v5.9.2
import nbformat

# nbconvert v7.7.2
import nbconvert

# Internal imports
from ..config import settings
from ..models.notebook import Notebook, CELL_TYPES, EXECUTION_STATE
from ..utils.file_manager import FILE_MANAGER
from ..services.workspace_service import WorkspaceService

# Configure logger
logger = logging.getLogger(__name__)

# Global variables to track active kernels and their execution states
active_kernels = {}
kernel_execution_states = {}

def setup_jupyter_directories() -> None:
    """
    Ensures that necessary directories for Jupyter notebooks exist.
    
    This function creates the main Jupyter notebook directory and subdirectories
    for kernels and sessions if they don't already exist.
    """
    try:
        # Get base notebook directory from settings
        notebook_dir = settings.JUPYTER_NOTEBOOK_DIR
        
        # Create main notebook directory if it doesn't exist
        os.makedirs(notebook_dir, exist_ok=True)
        
        # Create subdirectories for kernels and sessions
        kernels_dir = os.path.join(notebook_dir, 'kernels')
        sessions_dir = os.path.join(notebook_dir, 'sessions')
        
        os.makedirs(kernels_dir, exist_ok=True)
        os.makedirs(sessions_dir, exist_ok=True)
        
        logger.info(f"Jupyter directories setup completed: {notebook_dir}")
    except Exception as e:
        logger.error(f"Error setting up Jupyter directories: {str(e)}")
        raise


class JupyterExecution:
    """
    Helper class for managing execution of code in Jupyter kernels.
    
    This class handles the actual execution of code in a kernel, manages
    the collection of outputs, and provides methods to check execution status
    and retrieve results.
    """
    
    def __init__(self, execution_id: str, notebook_id: str, cell_id: str, 
                 code: str, kernel_client):
        """
        Initialize a new execution context.
        
        Args:
            execution_id: Unique identifier for this execution
            notebook_id: ID of the notebook containing the cell
            cell_id: ID of the cell being executed
            code: The code to execute
            kernel_client: Jupyter kernel client for execution
        """
        self.execution_id = execution_id
        self.notebook_id = notebook_id
        self.cell_id = cell_id
        self.code = code
        self.kernel_client = kernel_client
        self.output_queue = queue.Queue()
        self.start_time = datetime.now()
        self.is_completed = False
        self.outputs = []
        self.execution_thread = None
    
    def start(self):
        """
        Starts code execution in a separate thread.
        
        This method initializes the execution thread and starts it, allowing
        the execution to run asynchronously.
        """
        # Create a new thread for execution
        self.execution_thread = threading.Thread(
            target=self._execution_worker,
            daemon=True
        )
        
        # Start the thread
        self.execution_thread.start()
        
        logger.info(f"Started execution {self.execution_id} for notebook {self.notebook_id}, cell {self.cell_id}")
    
    def _execution_worker(self):
        """
        Worker function that runs in a thread to execute code.
        
        This method handles the actual communication with the kernel client,
        processes messages from the kernel, and collects outputs.
        """
        try:
            # Send execute request to the kernel
            msg_id = self.kernel_client.execute(self.code)
            
            # Set up timeout based on settings
            timeout = settings.JUPYTER_EXECUTION_TIMEOUT
            end_time = datetime.now().timestamp() + timeout
            
            # Process messages until completion or timeout
            while not self.is_completed and datetime.now().timestamp() < end_time:
                try:
                    # Try to get a message from the kernel with a small timeout
                    # Note: Using a small timeout (0.1s) to allow checking the overall timeout
                    msg = self.kernel_client.get_iopub_msg(timeout=0.1)
                    
                    # Process message content based on msg_type
                    parent_id = msg.get('parent_header', {}).get('msg_id', None)
                    
                    if parent_id != msg_id:
                        continue  # Skip messages not related to this execution
                    
                    msg_type = msg['msg_type']
                    content = msg['content']
                    
                    if msg_type == 'status':
                        # Check if execution completed
                        if content.get('execution_state') == 'idle':
                            # Wait a bit to ensure all output is received
                            time.sleep(0.1)
                            self.is_completed = True
                            break
                    
                    elif msg_type == 'stream':
                        # Handle stream output (stdout/stderr)
                        self.outputs.append({
                            'output_type': 'stream',
                            'name': content.get('name', 'stdout'),
                            'text': content.get('text', '')
                        })
                    
                    elif msg_type == 'execute_result':
                        # Handle execution result
                        self.outputs.append({
                            'output_type': 'execute_result',
                            'execution_count': content.get('execution_count', None),
                            'data': content.get('data', {}),
                            'metadata': content.get('metadata', {})
                        })
                    
                    elif msg_type == 'display_data':
                        # Handle display data (e.g., plots)
                        self.outputs.append({
                            'output_type': 'display_data',
                            'data': content.get('data', {}),
                            'metadata': content.get('metadata', {})
                        })
                    
                    elif msg_type == 'error':
                        # Handle error messages
                        self.outputs.append({
                            'output_type': 'error',
                            'ename': content.get('ename', ''),
                            'evalue': content.get('evalue', ''),
                            'traceback': content.get('traceback', [])
                        })
                
                except queue.Empty:
                    # No message available, continue polling
                    continue
            
            # Check if execution timed out
            if not self.is_completed:
                self.outputs.append({
                    "output_type": "error",
                    "ename": "TimeoutError",
                    "evalue": f"Execution timed out after {timeout} seconds",
                    "traceback": []
                })
                self.is_completed = True
                logger.warning(f"Execution {self.execution_id} timed out after {timeout} seconds")
            else:
                logger.info(f"Execution {self.execution_id} completed with {len(self.outputs)} outputs")
            
        except Exception as e:
            # Log any unexpected errors
            logger.error(f"Error during execution {self.execution_id}: {str(e)}")
            self.outputs.append({
                "output_type": "error",
                "ename": type(e).__name__,
                "evalue": str(e),
                "traceback": []
            })
            self.is_completed = True
    
    def get_status(self) -> Dict[str, Any]:
        """
        Gets current status of execution.
        
        Returns:
            Dictionary with execution status information including
            completion status, duration, and output count.
        """
        # Calculate execution duration
        duration = (datetime.now() - self.start_time).total_seconds()
        
        # Check if execution has timed out
        timeout = settings.JUPYTER_EXECUTION_TIMEOUT
        is_timeout = not self.is_completed and duration > timeout
        
        status_info = {
            "execution_id": self.execution_id,
            "notebook_id": self.notebook_id,
            "cell_id": self.cell_id,
            "is_completed": self.is_completed or is_timeout,
            "duration": duration,
            "output_count": len(self.outputs),
            "start_time": self.start_time.isoformat(),
            "status": "completed" if self.is_completed else "timeout" if is_timeout else "running"
        }
        
        return status_info
    
    def get_results(self) -> Dict[str, Any]:
        """
        Gets the results of execution.
        
        Returns:
            Dictionary with execution results including outputs and status.
        """
        status = self.get_status()
        
        # Include outputs with status information
        results = {
            **status,
            "outputs": self.outputs
        }
        
        return results
    
    def interrupt(self) -> bool:
        """
        Interrupts the running execution.
        
        Returns:
            True if interrupted successfully, False otherwise.
        """
        try:
            # Only attempt to interrupt if execution is still running
            if not self.is_completed and self.execution_thread and self.execution_thread.is_alive():
                # Send interrupt signal to kernel
                self.kernel_client.interrupt_kernel()
                
                # Mark execution as completed with interrupted status
                self.is_completed = True
                self.outputs.append({
                    "output_type": "error",
                    "ename": "KeyboardInterrupt",
                    "evalue": "Execution was interrupted",
                    "traceback": []
                })
                
                logger.info(f"Execution {self.execution_id} was interrupted")
                return True
            
            return False
        
        except Exception as e:
            logger.error(f"Error interrupting execution {self.execution_id}: {str(e)}")
            return False


class JupyterService:
    """
    Service class that provides Jupyter notebook functionality.
    
    This service manages Jupyter kernels, notebook execution, and integration
    with the AI Talent Marketplace platform for collaborative coding features.
    """
    
    def __init__(self):
        """
        Initialize the Jupyter service.
        
        Sets up dictionaries to track active kernels and their states,
        and initializes the workspace service for access control.
        """
        # Initialize dictionaries to track kernels and states
        self.active_kernels = {}
        self.kernel_execution_states = {}
        
        # Initialize workspace service for access control
        self.workspace_service = WorkspaceService()
        
        # Ensure Jupyter directories exist
        setup_jupyter_directories()
        
        logger.info("JupyterService initialized")
    
    def start_kernel(self, notebook_id: str, user_id: str, kernel_name: str = "python3") -> Dict[str, Any]:
        """
        Starts a Jupyter kernel for a notebook.
        
        Args:
            notebook_id: ID of the notebook
            user_id: ID of the user requesting kernel start
            kernel_name: Name of the kernel to start (default: python3)
            
        Returns:
            Dictionary with kernel information including kernel_id
            
        Raises:
            ValueError: If user doesn't have access or notebook not found
        """
        try:
            # Get notebook from workspace service
            notebook = self.workspace_service.get_notebook(notebook_id, user_id)
            
            if not notebook:
                logger.warning(f"Notebook not found: {notebook_id}")
                raise ValueError(f"Notebook not found: {notebook_id}")
            
            # Verify user has access to the notebook's workspace
            if not self.workspace_service.has_access(notebook.workspace_id, user_id, "EXECUTE"):
                logger.warning(f"User {user_id} doesn't have EXECUTE permission for notebook {notebook_id}")
                raise ValueError("You don't have permission to execute code in this notebook")
            
            # Check if kernel already exists for this notebook
            if notebook_id in self.active_kernels:
                # Return existing kernel information
                kernel_manager = self.active_kernels[notebook_id]
                kernel_id = kernel_manager.kernel_id
                
                logger.info(f"Using existing kernel {kernel_id} for notebook {notebook_id}")
                
                # Ensure kernel is still alive
                if not kernel_manager.is_alive():
                    # Restart dead kernel
                    logger.warning(f"Kernel {kernel_id} is dead, restarting...")
                    kernel_manager.restart_kernel()
                
                # Return kernel information
                return {
                    "kernel_id": kernel_id,
                    "kernel_name": kernel_name,
                    "notebook_id": notebook_id,
                    "status": "reused"
                }
            
            # Create kernel manager with specified kernel name
            kernel_manager = jupyter_client.KernelManager(kernel_name=kernel_name)
            
            # Start the kernel
            kernel_manager.start_kernel()
            kernel_id = kernel_manager.kernel_id
            
            # Store kernel manager in active_kernels dictionary
            self.active_kernels[notebook_id] = kernel_manager
            
            # Set kernel state to IDLE
            self.kernel_execution_states[notebook_id] = {
                "state": EXECUTION_STATE.IDLE.name,
                "last_activity": datetime.now().isoformat()
            }
            
            # Update notebook's execution_state to IDLE
            notebook.update_execution_state(EXECUTION_STATE.IDLE.name)
            
            logger.info(f"Started kernel {kernel_id} ({kernel_name}) for notebook {notebook_id}")
            
            # Return kernel information
            return {
                "kernel_id": kernel_id,
                "kernel_name": kernel_name,
                "notebook_id": notebook_id,
                "status": "started"
            }
        
        except Exception as e:
            logger.error(f"Error starting kernel for notebook {notebook_id}: {str(e)}")
            if isinstance(e, ValueError):
                raise
            raise ValueError(f"Failed to start kernel: {str(e)}")
    
    def stop_kernel(self, notebook_id: str, user_id: str) -> bool:
        """
        Stops a running Jupyter kernel.
        
        Args:
            notebook_id: ID of the notebook
            user_id: ID of the user requesting kernel stop
            
        Returns:
            True if successful, False otherwise
            
        Raises:
            ValueError: If user doesn't have access or kernel not found
        """
        try:
            # Verify kernel exists for the notebook
            if notebook_id not in self.active_kernels:
                logger.warning(f"No kernel found for notebook {notebook_id}")
                return False
            
            # Get notebook to verify access
            notebook = self.workspace_service.get_notebook(notebook_id, user_id)
            
            if not notebook:
                logger.warning(f"Notebook not found: {notebook_id}")
                raise ValueError(f"Notebook not found: {notebook_id}")
            
            # Verify user has access to the notebook's workspace
            if not self.workspace_service.has_access(notebook.workspace_id, user_id, "EXECUTE"):
                logger.warning(f"User {user_id} doesn't have EXECUTE permission for notebook {notebook_id}")
                raise ValueError("You don't have permission to manage kernels in this notebook")
            
            # Get kernel manager
            kernel_manager = self.active_kernels[notebook_id]
            kernel_id = kernel_manager.kernel_id
            
            # Shutdown the kernel
            kernel_manager.shutdown_kernel()
            
            # Remove from active_kernels and kernel_execution_states
            del self.active_kernels[notebook_id]
            
            if notebook_id in self.kernel_execution_states:
                del self.kernel_execution_states[notebook_id]
            
            # Update notebook's execution_state to IDLE
            notebook.update_execution_state(EXECUTION_STATE.IDLE.name)
            
            logger.info(f"Stopped kernel {kernel_id} for notebook {notebook_id}")
            
            return True
        
        except Exception as e:
            logger.error(f"Error stopping kernel for notebook {notebook_id}: {str(e)}")
            if isinstance(e, ValueError):
                raise
            return False
    
    def restart_kernel(self, notebook_id: str, user_id: str) -> bool:
        """
        Restarts a Jupyter kernel.
        
        Args:
            notebook_id: ID of the notebook
            user_id: ID of the user requesting kernel restart
            
        Returns:
            True if successful, False otherwise
            
        Raises:
            ValueError: If user doesn't have access or kernel not found
        """
        try:
            # Verify kernel exists for the notebook
            if notebook_id not in self.active_kernels:
                logger.warning(f"No kernel found for notebook {notebook_id}")
                return False
            
            # Get notebook to verify access
            notebook = self.workspace_service.get_notebook(notebook_id, user_id)
            
            if not notebook:
                logger.warning(f"Notebook not found: {notebook_id}")
                raise ValueError(f"Notebook not found: {notebook_id}")
            
            # Verify user has access to the notebook's workspace
            if not self.workspace_service.has_access(notebook.workspace_id, user_id, "EXECUTE"):
                logger.warning(f"User {user_id} doesn't have EXECUTE permission for notebook {notebook_id}")
                raise ValueError("You don't have permission to manage kernels in this notebook")
            
            # Get kernel manager
            kernel_manager = self.active_kernels[notebook_id]
            kernel_id = kernel_manager.kernel_id
            
            # Restart the kernel
            kernel_manager.restart_kernel()
            
            # Update execution state
            self.kernel_execution_states[notebook_id] = {
                "state": EXECUTION_STATE.IDLE.name,
                "last_activity": datetime.now().isoformat()
            }
            
            # Update notebook's execution_state to IDLE
            notebook.update_execution_state(EXECUTION_STATE.IDLE.name)
            
            logger.info(f"Restarted kernel {kernel_id} for notebook {notebook_id}")
            
            return True
        
        except Exception as e:
            logger.error(f"Error restarting kernel for notebook {notebook_id}: {str(e)}")
            if isinstance(e, ValueError):
                raise
            return False
    
    def execute_code(self, notebook_id: str, cell_id: str, code: str, user_id: str) -> Dict[str, Any]:
        """
        Synchronously executes code in a notebook cell.
        
        Args:
            notebook_id: ID of the notebook
            cell_id: ID of the cell to execute
            code: Code to execute
            user_id: ID of the user requesting execution
            
        Returns:
            Execution results including outputs and status
            
        Raises:
            ValueError: If user doesn't have access, kernel not found, or execution fails
        """
        try:
            # Verify kernel exists for the notebook
            if notebook_id not in self.active_kernels:
                # Try to start a kernel for this notebook
                logger.info(f"No kernel found for notebook {notebook_id}, starting new kernel")
                self.start_kernel(notebook_id, user_id)
            
            # Get notebook to verify access and find the cell
            notebook = self.workspace_service.get_notebook(notebook_id, user_id)
            
            if not notebook:
                logger.warning(f"Notebook not found: {notebook_id}")
                raise ValueError(f"Notebook not found: {notebook_id}")
            
            # Verify user has access to the notebook's workspace
            if not self.workspace_service.has_access(notebook.workspace_id, user_id, "EXECUTE"):
                logger.warning(f"User {user_id} doesn't have EXECUTE permission for notebook {notebook_id}")
                raise ValueError("You don't have permission to execute code in this notebook")
            
            # Get the cell
            cell = notebook.get_cell(cell_id)
            
            if not cell:
                logger.warning(f"Cell not found: {cell_id} in notebook {notebook_id}")
                raise ValueError(f"Cell not found: {cell_id}")
            
            # Get kernel manager and create client
            kernel_manager = self.active_kernels[notebook_id]
            kernel_client = kernel_manager.client()
            
            # Set kernel state to BUSY
            self.kernel_execution_states[notebook_id] = {
                "state": EXECUTION_STATE.BUSY.name,
                "last_activity": datetime.now().isoformat()
            }
            
            # Update notebook's execution_state to BUSY
            notebook.update_execution_state(EXECUTION_STATE.BUSY.name)
            
            # Execute code using kernel client
            logger.info(f"Executing code in notebook {notebook_id}, cell {cell_id}")
            
            # Start execution timer
            start_time = datetime.now()
            
            # Send execute request
            msg_id = kernel_client.execute(code)
            
            # Collect outputs
            outputs = []
            execution_count = None
            
            # Set up timeout from settings
            timeout = settings.JUPYTER_EXECUTION_TIMEOUT
            end_time = start_time.timestamp() + timeout
            
            # Process iopub messages until execution completes or times out
            while datetime.now().timestamp() < end_time:
                try:
                    # Get a message from the kernel
                    msg = kernel_client.get_iopub_msg(timeout=0.1)
                    
                    # Check if message is related to our execution request
                    parent_id = msg.get('parent_header', {}).get('msg_id', None)
                    if parent_id != msg_id:
                        continue
                    
                    msg_type = msg.get('msg_type', '')
                    content = msg.get('content', {})
                    
                    if msg_type == 'status':
                        if content.get('execution_state') == 'idle':
                            # Execution completed
                            break
                    
                    elif msg_type == 'execute_input':
                        # This message contains the execution count
                        execution_count = content.get('execution_count')
                    
                    elif msg_type == 'stream':
                        # Stream output (stdout/stderr)
                        outputs.append({
                            'output_type': 'stream',
                            'name': content.get('name', 'stdout'),
                            'text': content.get('text', '')
                        })
                    
                    elif msg_type == 'execute_result':
                        # Execution result
                        outputs.append({
                            'output_type': 'execute_result',
                            'execution_count': content.get('execution_count'),
                            'data': content.get('data', {}),
                            'metadata': content.get('metadata', {})
                        })
                    
                    elif msg_type == 'display_data':
                        # Display data (e.g., plots)
                        outputs.append({
                            'output_type': 'display_data',
                            'data': content.get('data', {}),
                            'metadata': content.get('metadata', {})
                        })
                    
                    elif msg_type == 'error':
                        # Error output
                        outputs.append({
                            'output_type': 'error',
                            'ename': content.get('ename', ''),
                            'evalue': content.get('evalue', ''),
                            'traceback': content.get('traceback', [])
                        })
                
                except queue.Empty:
                    # No messages available, continue waiting
                    continue
            
            # Check if execution timed out
            elapsed_time = (datetime.now() - start_time).total_seconds()
            timed_out = elapsed_time >= timeout
            
            if timed_out:
                logger.warning(f"Code execution timed out after {timeout} seconds")
                outputs.append({
                    'output_type': 'error',
                    'ename': 'TimeoutError',
                    'evalue': f'Execution timed out after {timeout} seconds',
                    'traceback': []
                })
            
            # Update cell with new outputs and execution_count
            cell.update_outputs(outputs, execution_count)
            
            # Set kernel state back to IDLE
            self.kernel_execution_states[notebook_id] = {
                "state": EXECUTION_STATE.IDLE.name,
                "last_activity": datetime.now().isoformat()
            }
            
            # Update notebook's execution_state to IDLE
            notebook.update_execution_state(EXECUTION_STATE.IDLE.name)
            
            # Save updated notebook
            FILE_MANAGER.save_notebook(notebook, notebook.workspace_id)
            
            logger.info(f"Code execution completed with {len(outputs)} outputs")
            
            # Return execution results
            return {
                "notebook_id": notebook_id,
                "cell_id": cell_id,
                "execution_count": execution_count,
                "outputs": outputs,
                "duration": elapsed_time,
                "status": "timeout" if timed_out else "success"
            }
        
        except Exception as e:
            logger.error(f"Error executing code: {str(e)}")
            
            # Ensure kernel state is reset to IDLE
            if notebook_id in self.kernel_execution_states:
                self.kernel_execution_states[notebook_id] = {
                    "state": EXECUTION_STATE.IDLE.name,
                    "last_activity": datetime.now().isoformat()
                }
            
            # Try to update notebook execution state if possible
            try:
                notebook = self.workspace_service.get_notebook(notebook_id, user_id)
                if notebook:
                    notebook.update_execution_state(EXECUTION_STATE.IDLE.name)
            except:
                pass
            
            if isinstance(e, ValueError):
                raise
            raise ValueError(f"Code execution failed: {str(e)}")
    
    async def execute_code_async(self, notebook_id: str, cell_id: str, code: str, user_id: str) -> str:
        """
        Asynchronously executes code in a notebook cell.
        
        Args:
            notebook_id: ID of the notebook
            cell_id: ID of the cell to execute
            code: Code to execute
            user_id: ID of the user requesting execution
            
        Returns:
            Execution ID for tracking the async operation
            
        Raises:
            ValueError: If user doesn't have access or kernel not found
        """
        try:
            # Verify kernel exists for the notebook
            if notebook_id not in self.active_kernels:
                # Try to start a kernel for this notebook
                logger.info(f"No kernel found for notebook {notebook_id}, starting new kernel")
                self.start_kernel(notebook_id, user_id)
            
            # Get notebook to verify access
            notebook = self.workspace_service.get_notebook(notebook_id, user_id)
            
            if not notebook:
                logger.warning(f"Notebook not found: {notebook_id}")
                raise ValueError(f"Notebook not found: {notebook_id}")
            
            # Verify user has access to the notebook's workspace
            if not self.workspace_service.has_access(notebook.workspace_id, user_id, "EXECUTE"):
                logger.warning(f"User {user_id} doesn't have EXECUTE permission for notebook {notebook_id}")
                raise ValueError("You don't have permission to execute code in this notebook")
            
            # Get the cell
            cell = notebook.get_cell(cell_id)
            
            if not cell:
                logger.warning(f"Cell not found: {cell_id} in notebook {notebook_id}")
                raise ValueError(f"Cell not found: {cell_id}")
            
            # Generate a unique execution ID
            execution_id = str(uuid.uuid4())
            
            # Get kernel manager and create client
            kernel_manager = self.active_kernels[notebook_id]
            kernel_client = kernel_manager.client()
            
            # Set kernel state to BUSY
            self.kernel_execution_states[notebook_id] = {
                "state": EXECUTION_STATE.BUSY.name,
                "last_activity": datetime.now().isoformat(),
                "execution_id": execution_id
            }
            
            # Update notebook's execution_state to BUSY
            notebook.update_execution_state(EXECUTION_STATE.BUSY.name)
            
            # Create execution helper
            execution = JupyterExecution(
                execution_id=execution_id,
                notebook_id=notebook_id,
                cell_id=cell_id,
                code=code,
                kernel_client=kernel_client
            )
            
            # Start execution in background thread
            execution.start()
            
            # Run a background task to update the cell when execution completes
            asyncio.create_task(self._process_execution_results(execution, notebook, cell))
            
            logger.info(f"Started async execution {execution_id} for notebook {notebook_id}, cell {cell_id}")
            
            # Return execution ID for tracking
            return execution_id
        
        except Exception as e:
            logger.error(f"Error starting async code execution: {str(e)}")
            
            # Ensure kernel state is reset to IDLE
            if notebook_id in self.kernel_execution_states:
                self.kernel_execution_states[notebook_id] = {
                    "state": EXECUTION_STATE.IDLE.name,
                    "last_activity": datetime.now().isoformat()
                }
            
            if isinstance(e, ValueError):
                raise
            raise ValueError(f"Failed to start code execution: {str(e)}")
    
    async def _process_execution_results(self, execution: JupyterExecution, notebook: Notebook, cell):
        """
        Processes results from an asynchronous execution when it completes.
        
        Args:
            execution: JupyterExecution instance
            notebook: Notebook where execution is running
            cell: Cell being executed
        """
        try:
            # Wait for execution to complete (polling)
            max_wait = settings.JUPYTER_EXECUTION_TIMEOUT + 5  # Add 5 seconds buffer
            wait_interval = 0.5  # Check every half second
            
            for _ in range(int(max_wait / wait_interval)):
                if execution.is_completed:
                    break
                await asyncio.sleep(wait_interval)
            
            # If not completed by now, force completion
            if not execution.is_completed:
                execution.is_completed = True
                execution.outputs.append({
                    "output_type": "error",
                    "ename": "TimeoutError",
                    "evalue": f"Execution timed out after {settings.JUPYTER_EXECUTION_TIMEOUT} seconds",
                    "traceback": []
                })
            
            # Get results
            results = execution.get_results()
            
            # Update the cell with outputs
            cell.update_outputs(results["outputs"], None)  # execution_count might be None
            
            # Update notebook state
            notebook.update_execution_state(EXECUTION_STATE.IDLE.name)
            
            # Update kernel state
            notebook_id = notebook.id
            if notebook_id in self.kernel_execution_states:
                self.kernel_execution_states[notebook_id] = {
                    "state": EXECUTION_STATE.IDLE.name,
                    "last_activity": datetime.now().isoformat()
                }
            
            # Save updated notebook
            FILE_MANAGER.save_notebook(notebook, notebook.workspace_id)
            
            logger.info(f"Async execution {execution.execution_id} completed and results processed")
        
        except Exception as e:
            logger.error(f"Error processing execution results: {str(e)}")
            
            # Ensure kernel state is reset to IDLE
            notebook_id = notebook.id
            if notebook_id in self.kernel_execution_states:
                self.kernel_execution_states[notebook_id] = {
                    "state": EXECUTION_STATE.IDLE.name,
                    "last_activity": datetime.now().isoformat()
                }
            
            # Update notebook execution state
            try:
                notebook.update_execution_state(EXECUTION_STATE.IDLE.name)
            except:
                pass
    
    def interrupt_execution(self, notebook_id: str, user_id: str) -> bool:
        """
        Interrupts a running code execution.
        
        Args:
            notebook_id: ID of the notebook
            user_id: ID of the user requesting interruption
            
        Returns:
            True if interrupted successfully, False otherwise
            
        Raises:
            ValueError: If user doesn't have access or kernel not found
        """
        try:
            # Verify kernel exists for the notebook
            if notebook_id not in self.active_kernels:
                logger.warning(f"No kernel found for notebook {notebook_id}")
                return False
            
            # Get notebook to verify access
            notebook = self.workspace_service.get_notebook(notebook_id, user_id)
            
            if not notebook:
                logger.warning(f"Notebook not found: {notebook_id}")
                raise ValueError(f"Notebook not found: {notebook_id}")
            
            # Verify user has access to the notebook's workspace
            if not self.workspace_service.has_access(notebook.workspace_id, user_id, "EXECUTE"):
                logger.warning(f"User {user_id} doesn't have EXECUTE permission for notebook {notebook_id}")
                raise ValueError("You don't have permission to interrupt execution in this notebook")
            
            # Verify kernel is in BUSY state
            if notebook_id not in self.kernel_execution_states or \
               self.kernel_execution_states[notebook_id]["state"] != EXECUTION_STATE.BUSY.name:
                logger.warning(f"No active execution to interrupt for notebook {notebook_id}")
                return False
            
            # Get kernel manager
            kernel_manager = self.active_kernels[notebook_id]
            
            # Interrupt the kernel
            kernel_manager.interrupt_kernel()
            
            # Set kernel state to IDLE
            self.kernel_execution_states[notebook_id] = {
                "state": EXECUTION_STATE.IDLE.name,
                "last_activity": datetime.now().isoformat()
            }
            
            # Update notebook's execution_state to IDLE
            notebook.update_execution_state(EXECUTION_STATE.IDLE.name)
            
            logger.info(f"Interrupted execution for notebook {notebook_id}")
            
            return True
        
        except Exception as e:
            logger.error(f"Error interrupting execution: {str(e)}")
            if isinstance(e, ValueError):
                raise
            return False
    
    def get_kernel_status(self, notebook_id: str, user_id: str) -> Dict[str, Any]:
        """
        Gets the current status of a notebook's kernel.
        
        Args:
            notebook_id: ID of the notebook
            user_id: ID of the user requesting status
            
        Returns:
            Kernel status information
            
        Raises:
            ValueError: If user doesn't have access or notebook not found
        """
        try:
            # Get notebook to verify access
            notebook = self.workspace_service.get_notebook(notebook_id, user_id)
            
            if not notebook:
                logger.warning(f"Notebook not found: {notebook_id}")
                raise ValueError(f"Notebook not found: {notebook_id}")
            
            # Verify user has access to the notebook's workspace
            if not self.workspace_service.has_access(notebook.workspace_id, user_id, "READ"):
                logger.warning(f"User {user_id} doesn't have READ permission for notebook {notebook_id}")
                raise ValueError("You don't have permission to view this notebook's kernel status")
            
            # Check if kernel exists
            kernel_exists = notebook_id in self.active_kernels
            kernel_id = self.active_kernels[notebook_id].kernel_id if kernel_exists else None
            
            # Get current execution state
            execution_state = None
            execution_info = {}
            
            if notebook_id in self.kernel_execution_states:
                state_info = self.kernel_execution_states[notebook_id]
                execution_state = state_info["state"]
                
                # Copy state info excluding sensitive data
                execution_info = {k: v for k, v in state_info.items() if k != "kernel_client"}
            else:
                execution_state = EXECUTION_STATE.IDLE.name
            
            # Prepare status response
            status = {
                "notebook_id": notebook_id,
                "kernel_exists": kernel_exists,
                "kernel_id": kernel_id,
                "kernel_name": notebook.kernel_name,
                "execution_state": execution_state,
                "execution_info": execution_info,
                "notebook_execution_state": notebook.execution_state.name
            }
            
            return status
        
        except Exception as e:
            logger.error(f"Error getting kernel status: {str(e)}")
            if isinstance(e, ValueError):
                raise
            raise ValueError(f"Failed to get kernel status: {str(e)}")
    
    def list_available_kernels(self) -> List[Dict[str, Any]]:
        """
        Lists all available Jupyter kernels.
        
        Returns:
            List of available kernel specifications
        """
        try:
            # Get kernel specs manager
            kernel_spec_manager = jupyter_client.kernelspec.KernelSpecManager()
            
            # Get available kernels
            kernel_specs = kernel_spec_manager.find_kernel_specs()
            
            # Format results
            kernels = []
            
            for name, path in kernel_specs.items():
                try:
                    # Get detailed spec
                    spec = kernel_spec_manager.get_kernel_spec(name)
                    
                    kernels.append({
                        "name": name,
                        "display_name": spec.display_name,
                        "language": spec.language,
                        "path": path
                    })
                except Exception as e:
                    logger.warning(f"Error loading kernel spec for {name}: {str(e)}")
                    # Include basic info even if detailed spec fails
                    kernels.append({
                        "name": name,
                        "display_name": name,
                        "language": "unknown",
                        "path": path
                    })
            
            return kernels
        
        except Exception as e:
            logger.error(f"Error listing available kernels: {str(e)}")
            # Return empty list on error rather than failing
            return []
    
    def complete_code(self, notebook_id: str, code: str, cursor_pos: int, user_id: str) -> Dict[str, Any]:
        """
        Provides code completion suggestions.
        
        Args:
            notebook_id: ID of the notebook
            code: Code to complete
            cursor_pos: Position of cursor in the code
            user_id: ID of the user requesting completion
            
        Returns:
            Completion suggestions
            
        Raises:
            ValueError: If user doesn't have access or kernel not found
        """
        try:
            # Verify kernel exists for the notebook
            if notebook_id not in self.active_kernels:
                # Try to start a kernel for this notebook
                logger.info(f"No kernel found for notebook {notebook_id}, starting new kernel")
                self.start_kernel(notebook_id, user_id)
            
            # Get notebook to verify access
            notebook = self.workspace_service.get_notebook(notebook_id, user_id)
            
            if not notebook:
                logger.warning(f"Notebook not found: {notebook_id}")
                raise ValueError(f"Notebook not found: {notebook_id}")
            
            # Verify user has access to the notebook's workspace
            if not self.workspace_service.has_access(notebook.workspace_id, user_id, "READ"):
                logger.warning(f"User {user_id} doesn't have READ permission for notebook {notebook_id}")
                raise ValueError("You don't have permission to use code completion in this notebook")
            
            # Get kernel manager and create client
            kernel_manager = self.active_kernels[notebook_id]
            kernel_client = kernel_manager.client()
            
            # Send complete_request
            msg_id = kernel_client.complete(code, cursor_pos)
            
            # Wait for response
            reply = kernel_client.get_shell_msg(timeout=2.0)
            
            # Check if reply is for our request
            if reply.get('parent_header', {}).get('msg_id') != msg_id:
                logger.warning("Received unrelated completion reply")
                return {
                    "matches": [],
                    "cursor_start": cursor_pos,
                    "cursor_end": cursor_pos,
                    "metadata": {},
                    "status": "error"
                }
            
            # Extract completion data
            content = reply.get('content', {})
            
            return {
                "matches": content.get('matches', []),
                "cursor_start": content.get('cursor_start', cursor_pos),
                "cursor_end": content.get('cursor_end', cursor_pos),
                "metadata": content.get('metadata', {}),
                "status": "ok"
            }
        
        except Exception as e:
            logger.error(f"Error during code completion: {str(e)}")
            if isinstance(e, ValueError):
                raise
            # Return empty completions on error
            return {
                "matches": [],
                "cursor_start": cursor_pos,
                "cursor_end": cursor_pos,
                "metadata": {},
                "status": "error",
                "error": str(e)
            }
    
    def update_notebook_cell(self, notebook_id: str, cell_id: str, source: str = None, 
                           outputs: List = None, user_id: str = None) -> Dict[str, Any]:
        """
        Updates a cell in a notebook.
        
        Args:
            notebook_id: ID of the notebook
            cell_id: ID of the cell to update
            source: New source code/content (optional)
            outputs: New cell outputs (optional)
            user_id: ID of the user making the update
            
        Returns:
            Updated cell information
            
        Raises:
            ValueError: If user doesn't have access or cell not found
        """
        try:
            # Get notebook
            notebook = self.workspace_service.get_notebook(notebook_id, user_id)
            
            if not notebook:
                logger.warning(f"Notebook not found: {notebook_id}")
                raise ValueError(f"Notebook not found: {notebook_id}")
            
            # Verify user has access to the notebook's workspace
            if not self.workspace_service.has_access(notebook.workspace_id, user_id, "WRITE"):
                logger.warning(f"User {user_id} doesn't have WRITE permission for notebook {notebook_id}")
                raise ValueError("You don't have permission to update cells in this notebook")
            
            # Get the cell
            cell = notebook.get_cell(cell_id)
            
            if not cell:
                logger.warning(f"Cell not found: {cell_id} in notebook {notebook_id}")
                raise ValueError(f"Cell not found: {cell_id}")
            
            # Update cell
            updated = False
            
            if source is not None:
                cell.update_source(source)
                updated = True
            
            if outputs is not None:
                cell.update_outputs(outputs)
                updated = True
            
            if updated:
                # Save updated notebook
                FILE_MANAGER.save_notebook(notebook, notebook.workspace_id)
                
                logger.info(f"Updated cell {cell_id} in notebook {notebook_id}")
            
            # Return updated cell data
            return cell.to_dict()
        
        except Exception as e:
            logger.error(f"Error updating notebook cell: {str(e)}")
            if isinstance(e, ValueError):
                raise
            raise ValueError(f"Failed to update cell: {str(e)}")
    
    def get_notebook(self, notebook_id: str, user_id: str) -> Optional[Notebook]:
        """
        Gets a notebook with its cells and metadata.
        
        Args:
            notebook_id: ID of the notebook to retrieve
            user_id: ID of the user requesting the notebook
            
        Returns:
            The notebook object if found and accessible
            
        Raises:
            ValueError: If user doesn't have access
        """
        try:
            # Use workspace service to get notebook
            notebook = self.workspace_service.get_notebook(notebook_id, user_id)
            
            if not notebook:
                logger.warning(f"Notebook not found: {notebook_id}")
                return None
            
            return notebook
        
        except Exception as e:
            logger.error(f"Error retrieving notebook: {str(e)}")
            if isinstance(e, ValueError):
                raise
            return None
    
    def export_notebook(self, notebook_id: str, format: str, user_id: str) -> Dict[str, Any]:
        """
        Exports a notebook to another format.
        
        Args:
            notebook_id: ID of the notebook to export
            format: Format to export to (python, html, pdf, markdown)
            user_id: ID of the user requesting export
            
        Returns:
            Export result with content and format information
            
        Raises:
            ValueError: If user doesn't have access, format is invalid, or export fails
        """
        try:
            # Get notebook
            notebook = self.workspace_service.get_notebook(notebook_id, user_id)
            
            if not notebook:
                logger.warning(f"Notebook not found: {notebook_id}")
                raise ValueError(f"Notebook not found: {notebook_id}")
            
            # Verify user has access to the notebook's workspace
            if not self.workspace_service.has_access(notebook.workspace_id, user_id, "READ"):
                logger.warning(f"User {user_id} doesn't have READ permission for notebook {notebook_id}")
                raise ValueError("You don't have permission to export this notebook")
            
            # Validate format
            valid_formats = ["python", "html", "pdf", "markdown"]
            if format not in valid_formats:
                raise ValueError(f"Invalid export format: {format}. Must be one of {valid_formats}")
            
            # Load notebook file
            nb_data = FILE_MANAGER.load_notebook(notebook.file_path)
            nb = nbformat.from_dict(nb_data)
            
            # Determine exporter class based on format
            if format == "python":
                from nbconvert.exporters import PythonExporter
                exporter = PythonExporter()
                extension = ".py"
                mimetype = "text/x-python"
            elif format == "html":
                from nbconvert.exporters import HTMLExporter
                exporter = HTMLExporter()
                extension = ".html"
                mimetype = "text/html"
            elif format == "pdf":
                from nbconvert.exporters import PDFExporter
                exporter = PDFExporter()
                extension = ".pdf"
                mimetype = "application/pdf"
            elif format == "markdown":
                from nbconvert.exporters import MarkdownExporter
                exporter = MarkdownExporter()
                extension = ".md"
                mimetype = "text/markdown"
            
            # Convert notebook
            (output, resources) = exporter.from_notebook_node(nb)
            
            # Generate filename
            filename = f"{notebook.name}{extension}"
            
            # Return export result
            return {
                "content": output,
                "filename": filename,
                "mimetype": mimetype,
                "format": format,
                "notebook_id": notebook_id
            }
        
        except Exception as e:
            logger.error(f"Error exporting notebook: {str(e)}")
            if isinstance(e, ValueError):
                raise
            raise ValueError(f"Failed to export notebook: {str(e)}")
    
    def cleanup_idle_kernels(self) -> int:
        """
        Cleans up kernels that have been idle for too long.
        
        Returns:
            Number of kernels cleaned up
        """
        try:
            # Get current time
            now = datetime.now()
            
            # Calculate idle threshold
            idle_threshold = settings.JUPYTER_KERNEL_TIMEOUT  # in seconds
            
            # Track number of kernels cleaned up
            cleanup_count = 0
            
            # Iterate through active kernels and check last activity time
            notebooks_to_check = list(self.kernel_execution_states.keys())
            
            for notebook_id in notebooks_to_check:
                try:
                    # Skip if notebook_id is not in active_kernels
                    if notebook_id not in self.active_kernels:
                        continue
                    
                    # Get execution state info
                    state_info = self.kernel_execution_states[notebook_id]
                    
                    # Check if kernel is busy
                    if state_info["state"] == EXECUTION_STATE.BUSY.name:
                        continue
                    
                    # Parse last activity timestamp
                    last_activity = datetime.fromisoformat(state_info["last_activity"])
                    
                    # Calculate idle time in seconds
                    idle_seconds = (now - last_activity).total_seconds()
                    
                    # If idle time exceeds threshold, shut down the kernel
                    if idle_seconds > idle_threshold:
                        logger.info(f"Cleaning up idle kernel for notebook {notebook_id} (idle for {idle_seconds} seconds)")
                        
                        # Get kernel manager
                        kernel_manager = self.active_kernels[notebook_id]
                        
                        # Shutdown kernel
                        kernel_manager.shutdown_kernel()
                        
                        # Remove from tracking dictionaries
                        del self.active_kernels[notebook_id]
                        del self.kernel_execution_states[notebook_id]
                        
                        cleanup_count += 1
                
                except Exception as e:
                    logger.error(f"Error cleaning up kernel for notebook {notebook_id}: {str(e)}")
                    # Continue with next kernel
            
            logger.info(f"Cleaned up {cleanup_count} idle kernels")
            return cleanup_count
        
        except Exception as e:
            logger.error(f"Error in cleanup_idle_kernels: {str(e)}")
            return 0