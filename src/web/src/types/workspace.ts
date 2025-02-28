/**
 * TypeScript type definitions for workspace-related entities in the AI Talent Marketplace web application.
 * Defines interfaces, enumerations, and types for collaborative workspaces, notebooks, files,
 * and permissions supporting real-time collaboration between AI professionals and clients.
 */

import { Job } from './job';
import { User } from '../../../backend/shared/src/types/user.types';
import { Permission } from './auth';

/**
 * Enumeration of possible workspace statuses
 */
export enum WorkspaceStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

/**
 * Enumeration of possible member roles in a workspace
 */
export enum WorkspaceRole {
  OWNER = 'owner',
  EDITOR = 'editor',
  VIEWER = 'viewer'
}

/**
 * Enumeration of possible notebook cell types
 */
export enum CellType {
  CODE = 'code',
  MARKDOWN = 'markdown',
  RAW = 'raw'
}

/**
 * Enumeration of possible notebook execution states
 */
export enum ExecutionState {
  IDLE = 'idle',
  BUSY = 'busy',
  QUEUED = 'queued',
  ERROR = 'error'
}

/**
 * Enumeration of possible notebook statuses
 */
export enum NotebookStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

/**
 * Object containing workspace permission constants
 */
export const WorkspacePermissions = {
  VIEW: 'workspace:view',
  EDIT: 'workspace:edit',
  EXECUTE: 'workspace:execute',
  ADMIN: 'workspace:admin'
};

/**
 * Mapping of workspace roles to their permissions
 */
export const RolePermissions = {
  OWNER: [
    WorkspacePermissions.VIEW,
    WorkspacePermissions.EDIT,
    WorkspacePermissions.EXECUTE,
    WorkspacePermissions.ADMIN
  ],
  EDITOR: [
    WorkspacePermissions.VIEW,
    WorkspacePermissions.EDIT,
    WorkspacePermissions.EXECUTE
  ],
  VIEWER: [
    WorkspacePermissions.VIEW
  ]
};

/**
 * Interface representing a user with access to a workspace
 */
export interface WorkspaceUser {
  id: string;
  userId: string;
  user: User;
  role: WorkspaceRole;
  permissions: string[];
  lastActive: Date;
}

/**
 * Interface representing a file stored in a workspace
 */
export interface WorkspaceFile {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  filePath: string;
  fileType: string;
  size: number;
  mimetype: string;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  url: string;
  versions: FileVersion[];
  metadata: Record<string, any>;
}

/**
 * Interface representing a version of a file
 */
export interface FileVersion {
  id: string;
  fileId: string;
  versionNumber: number;
  filePath: string;
  createdBy: string;
  createdAt: Date;
  commitMessage: string;
  url: string;
}

/**
 * Interface representing a cell in a Jupyter notebook
 */
export interface Cell {
  id: string;
  notebookId: string;
  cellType: CellType;
  source: string;
  outputs: any[];
  executionCount: number | null;
  metadata: Record<string, any>;
  order: number;
}

/**
 * Interface representing a version of a notebook
 */
export interface NotebookVersion {
  id: string;
  notebookId: string;
  versionNumber: number;
  filePath: string;
  createdBy: string;
  createdAt: Date;
  commitMessage: string;
  url: string;
}

/**
 * Interface representing a Jupyter notebook in a workspace
 */
export interface Notebook {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  kernelName: string;
  status: NotebookStatus;
  cells: Cell[];
  metadata: Record<string, any>;
  versions: NotebookVersion[];
  executionState: ExecutionState;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  filePath: string;
  url: string;
}

/**
 * Interface for tracking activity within a workspace
 */
export interface WorkspaceActivity {
  id: string;
  workspaceId: string;
  userId: string;
  activityType: string;
  data: Record<string, any>;
  timestamp: Date;
}

/**
 * Interface representing a collaborative workspace in the AI Talent Marketplace
 */
export interface Workspace {
  id: string;
  name: string;
  description: string;
  contractId: string;
  jobId: string;
  status: WorkspaceStatus;
  members: WorkspaceUser[];
  files: WorkspaceFile[];
  notebooks: Notebook[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

/**
 * Interface for workspace creation and editing form values
 */
export interface WorkspaceFormValues {
  name: string;
  description: string;
  contractId: string;
  jobId: string;
  members: {userId: string, role: WorkspaceRole}[];
}

/**
 * Interface for notebook creation and editing form values
 */
export interface NotebookFormValues {
  name: string;
  description: string;
  kernelName: string;
  workspaceId: string;
}

/**
 * Interface for cell creation and editing form values
 */
export interface CellFormValues {
  cellType: CellType;
  source: string;
  order: number;
  notebookId: string;
}

/**
 * Enumeration of WebSocket event types for workspace collaboration
 */
export enum WorkspaceSocketEvent {
  JOIN_WORKSPACE = 'join_workspace',
  LEAVE_WORKSPACE = 'leave_workspace',
  JOIN_NOTEBOOK = 'join_notebook',
  LEAVE_NOTEBOOK = 'leave_notebook',
  CELL_UPDATED = 'cell_updated',
  CELL_EXECUTED = 'cell_executed',
  CELL_ADDED = 'cell_added',
  CELL_REMOVED = 'cell_removed',
  USER_PRESENCE = 'user_presence',
  FILE_UPLOADED = 'file_uploaded',
  FILE_DELETED = 'file_deleted'
}

/**
 * Interface defining the workspace state in Redux store
 */
export interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  notebooks: Notebook[];
  currentNotebook: Notebook | null;
  files: WorkspaceFile[];
  loading: boolean;
  error: string | null;
  activeUsers: Record<string, {userId: string, lastActive: Date}>;
}