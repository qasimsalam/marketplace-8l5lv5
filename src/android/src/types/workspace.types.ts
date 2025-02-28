/**
 * TypeScript type definitions for workspace-related entities in the AI Talent Marketplace Android application.
 * This file defines interfaces, enumerations, and types necessary for collaborative workspaces,
 * Jupyter notebooks, file management, and real-time collaboration between AI professionals and clients.
 * 
 * @version 1.0.0
 */

import { User } from '../../../backend/shared/src/types/user.types';
import { Permission } from './auth.types';
import { Job } from './job.types';

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
  ERROR = 'error',
  STARTING = 'starting'
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
 * Type for workspace permission strings
 */
export type WorkspacePermission = string;

/**
 * Object containing workspace permission constants
 */
export const WorkspacePermissions = {
  VIEW: 'workspace:view' as WorkspacePermission,
  EDIT: 'workspace:edit' as WorkspacePermission,
  EXECUTE: 'workspace:execute' as WorkspacePermission,
  ADMIN: 'workspace:admin' as WorkspacePermission,
  WORKSPACE_VIEW: Permission.WORKSPACE_VIEW as WorkspacePermission,
  WORKSPACE_EDIT: Permission.WORKSPACE_EDIT as WorkspacePermission,
  NOTEBOOK_CREATE: 'notebook:create' as WorkspacePermission,
  FILE_CREATE: 'file:create' as WorkspacePermission,
};

/**
 * Mapping of workspace roles to their permissions
 */
export const RolePermissions = {
  OWNER: [
    WorkspacePermissions.VIEW,
    WorkspacePermissions.EDIT,
    WorkspacePermissions.EXECUTE,
    WorkspacePermissions.ADMIN,
    WorkspacePermissions.WORKSPACE_VIEW,
    WorkspacePermissions.WORKSPACE_EDIT,
    WorkspacePermissions.NOTEBOOK_CREATE,
    WorkspacePermissions.FILE_CREATE
  ],
  EDITOR: [
    WorkspacePermissions.VIEW,
    WorkspacePermissions.EDIT,
    WorkspacePermissions.EXECUTE,
    WorkspacePermissions.WORKSPACE_VIEW,
    WorkspacePermissions.WORKSPACE_EDIT,
    WorkspacePermissions.NOTEBOOK_CREATE,
    WorkspacePermissions.FILE_CREATE
  ],
  VIEWER: [
    WorkspacePermissions.VIEW,
    WorkspacePermissions.WORKSPACE_VIEW
  ]
};

/**
 * Interface representing a user with access to a workspace
 */
export interface WorkspaceMember {
  userId: string;
  user: User;
  role: WorkspaceRole;
  permissions: WorkspacePermission[];
  lastActive: Date;
  isOnline: boolean;
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
 * Interface representing a file stored in a workspace with Android-specific properties
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
  localUri: string; // Android local storage URI
  isDownloading: boolean; // Flag for download status
  downloadProgress: number; // Progress indicator for downloads
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
  isEditing: boolean;
  isExecuting: boolean;
  editedBy: string;
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
 * Interface representing a Jupyter notebook in a workspace with Android-specific properties
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
  localUri: string; // Android local storage URI
  isDownloaded: boolean; // Flag indicating if notebook is available offline
  activeUsers: string[]; // List of users currently viewing/editing the notebook
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
  userName: string;
  userAvatarUrl: string;
}

/**
 * Interface representing a milestone in a workspace
 */
export interface Milestone {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  amount: number;
  dueDate: Date;
  completionPercentage: number;
  status: string;
  paymentStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface representing a message in workspace chat
 */
export interface Message {
  id: string;
  workspaceId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string;
  content: string;
  attachments: { id: string; name: string; url: string; type: string }[];
  createdAt: Date;
  isRead: boolean;
  readBy: string[];
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
  jobTitle: string;
  status: WorkspaceStatus;
  members: WorkspaceMember[];
  files: WorkspaceFile[];
  notebooks: Notebook[];
  milestones: Milestone[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
  unreadMessages: number;
  activeUserCount: number;
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
  FILE_DELETED = 'file_deleted',
  MESSAGE_SENT = 'message_sent',
  MILESTONE_UPDATED = 'milestone_updated'
}

/**
 * Interface defining the workspace state with Android-specific properties
 */
export interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  notebooks: Notebook[];
  currentNotebook: Notebook | null;
  files: WorkspaceFile[];
  messages: Message[];
  activities: WorkspaceActivity[];
  loading: boolean;
  refreshing: boolean; // For Android pull-to-refresh functionality
  error: string | null;
  activeUsers: Record<string, {userId: string, lastActive: Date}>;
  isOffline: boolean; // Indicates if app is working in offline mode
  syncStatus: Record<string, 'synced' | 'syncing' | 'failed' | 'pending'>;
}

/**
 * Interface for a lightweight workspace item optimized for list display on Android
 */
export interface WorkspaceListItem {
  id: string;
  name: string;
  jobTitle: string;
  status: WorkspaceStatus;
  memberCount: number;
  unreadMessages: number;
  activeUserCount: number;
  updatedAt: Date;
}

/**
 * Interface for the workspace context used with React Context API in Android
 */
export interface WorkspaceContextType {
  workspaceState: WorkspaceState;
  getWorkspaces: () => Promise<Workspace[]>;
  getWorkspace: (id: string) => Promise<Workspace>;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (data: WorkspaceFormValues) => Promise<Workspace>;
  updateWorkspace: (id: string, data: Partial<WorkspaceFormValues>) => Promise<Workspace>;
  archiveWorkspace: (id: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  joinWorkspace: (id: string) => Promise<void>;
  leaveWorkspace: () => Promise<void>;
  getNotebooks: (workspaceId: string) => Promise<Notebook[]>;
  getNotebook: (id: string) => Promise<Notebook>;
  createNotebook: (data: NotebookFormValues) => Promise<Notebook>;
  updateNotebook: (id: string, data: Partial<NotebookFormValues>) => Promise<Notebook>;
  deleteNotebook: (id: string) => Promise<void>;
  addCell: (notebookId: string, data: CellFormValues) => Promise<Cell>;
  updateCell: (notebookId: string, cellId: string, data: Partial<CellFormValues>) => Promise<Cell>;
  executeCell: (notebookId: string, cellId: string) => Promise<Cell>;
  deleteCell: (notebookId: string, cellId: string) => Promise<void>;
  uploadFile: (workspaceId: string, file: { uri: string, name: string, type: string }) => Promise<WorkspaceFile>;
  downloadFile: (fileId: string) => Promise<string>;
  deleteFile: (fileId: string) => Promise<void>;
  sendMessage: (workspaceId: string, content: string, attachments?: {uri: string, name: string, type: string}[]) => Promise<Message>;
  getMessages: (workspaceId: string) => Promise<Message[]>;
  markMessagesAsRead: (workspaceId: string) => Promise<void>;
  resetError: () => void;
  syncWorkspaceOffline: (workspaceId: string) => Promise<void>;
}