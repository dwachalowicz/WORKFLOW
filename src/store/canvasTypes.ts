import type { WorkflowVersion } from '@/lib/pocketbase';
import type {
  Edge,
  Node,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
} from '@xyflow/react';

export interface ProcessVariable {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'file';
  required: boolean;
}

export interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
}

export type LockedReasonType = 'workspace_limit' | 'process_limit' | 'nodes_limit' | 'edges_limit' | 'notes_limit' | 'variables_limit' | 'checklist_limit' | 'subworkflows_limit' | 'viewer_role' | null;

export interface GraphSlice {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (node: Node) => void;
  autoLayout: () => void;
  updateNode: (id: string, data: Record<string, unknown>) => void;
  updateEdge: (id: string, data: Record<string, unknown>) => void;
}

export interface ProcessSlice {
  currentProcessId: string | null;
  currentGroupId: string | null;
  processName: string;
  isSaving: boolean;
  isDirty: boolean;
  isViewMode: boolean;
  lockedReason: LockedReasonType;
  setProcessName: (name: string) => void;
  saveProcess: () => Promise<void>;
  loadProcess: (id: string) => Promise<void>;
  createNewProcess: (groupId?: string | null) => void;
  importProcess: (nodes: Node[], edges: Edge[]) => void;
  applyAiChanges: (nodes: Node[], edges: Edge[]) => void;
  setIsDirty: (dirty: boolean) => void;
  setViewMode: (viewMode: boolean) => void;
  setLockedReason: (reason: LockedReasonType) => void;
}

export interface VersionSlice {
  isVersionModalOpen: boolean;
  versions: WorkflowVersion[];
  isLoadingVersions: boolean;
  isSavingVersion: boolean;
  setVersionModalOpen: (isOpen: boolean) => void;
  saveVersion: (label?: string) => Promise<void>;
  listVersions: () => Promise<void>;
  loadVersion: (versionId: string) => Promise<void>;
  deleteVersion: (versionId: string) => Promise<void>;
}

export interface MetadataSlice {
  commentCounts: Record<string, number>;
  incomingLinks: Record<string, { sourceProcessId: string; sourceProcessName: string }[]>;
  setCommentCounts: (counts: Record<string, number>) => void;
  refreshCommentCounts: () => Promise<void>;
  fetchIncomingLinks: () => Promise<void>;
}

export interface SearchSlice {
  searchQuery: string;
  searchSelectedUsers: string[];
  setSearchQuery: (query: string) => void;
  setSearchSelectedUsers: (users: string[]) => void;
}

export interface CanvasState extends GraphSlice, ProcessSlice, VersionSlice, MetadataSlice, SearchSlice {}
