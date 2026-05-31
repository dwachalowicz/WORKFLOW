import PocketBase, { type RecordService } from 'pocketbase';

// ── Core record types ────────────────────────────────────────

export interface WorkflowUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  tier: 'FREE' | 'MEDIUM' | 'PRO';
  ai_model?: string;
  ai_temperature?: number;
  ai_provider?: string;
  tier_expires_at?: string | null;
  created: string;
  updated: string;
}

export interface WorkflowProcess {
  id: string;
  name: string;
  owner: string;
  nodes: unknown;
  edges: unknown;
  workspace?: string;
  group?: string;
  avatar?: string;
  icon?: string;
  isPublic?: boolean;
  lastEditedBy?: string;
  locked_by?: string;
  locked_at?: string;
  created: string;
  updated: string;
  expand?: {
    lastEditedBy?: WorkflowUser;
    locked_by?: WorkflowUser;
  };
}

export interface WorkflowVersion {
  id: string;
  process: string;
  version_number: number;
  label: string;
  nodes_data: unknown;
  edges_data: unknown;
  process_name: string;
  created_by: string;
  created: string;
  updated: string;
  expand?: {
    created_by?: WorkflowUser;
  };
}

export interface WorkflowWorkspace {
  id: string;
  name: string;
  owner: string;
  avatar?: string;
  icon?: string;
  join_code?: string;
  created: string;
  updated: string;
}

export interface WorkspaceMember {
  id: string;
  workspace: string;
  user?: string;
  invited_email?: string;
  role: 'admin' | 'editor' | 'viewer';
  status: string;
  expand?: { workspace?: WorkflowWorkspace; user?: WorkflowUser };
  created: string;
  updated: string;
}

export interface ProcessGroup {
  id: string;
  name: string;
  workspace: string;
  avatar?: string;
  created: string;
  updated: string;
}

export interface WorkflowComment {
  id: string;
  process: string;
  node_id: string;
  author: string;
  content: string;
  resolved: boolean;
  created: string;
  updated: string;
  expand?: { author?: WorkflowUser };
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  nodes_data: unknown[] | string;
  edges_data: unknown[] | string;
  tier_required: string;
  active: boolean;
  created: string;
  updated: string;
}

export interface WfGroup {
  id: string;
  name: string;
  workspace: string;
  avatar?: string;
  color?: string;
  created: string;
  updated: string;
}

export interface ProcessMapLayout {
  id: string;
  workspace: string;
  positions: unknown;
  created: string;
  updated: string;
}

export interface TierConfigRecord {
  id: string;
  tier: string;
  [key: string]: unknown;
  created: string;
  updated: string;
}

export interface PromptRecord {
  id: string;
  key: string;
  content: string;
  active: boolean;
  created: string;
  updated: string;
}

export interface AiModelRecord {
  id: string;
  label: string;
  model_id: string;
  provider: string;
  active: boolean;
  sort_order: number;
  created: string;
  updated: string;
}

export interface QuickPromptRecord {
  id: string;
  label: string;
  prompt: string;
  label_en?: string;
  prompt_en?: string;
  context: string;
  active: boolean;
  sort_order: number;
  created: string;
  updated: string;
}

export interface KatalogNarzedzi {
  id: string;
  NAZWA: string;
  OPIS?: string;
  OPIS_PELNY?: string;
  URL?: string;
  url_film?: string;
  LOGO?: string;
  AKTYWNE: boolean;
  collectionId: string;
  created: string;
  updated: string;
}

export interface LandingTranslation {
  id: string;
  key: string;
  pl: string;
  en: string;
  created: string;
  updated: string;
}

// ── Typed PocketBase client ──────────────────────────────────

interface TypedPocketBase extends PocketBase {
  collection(idOrName: 'WORKFLOW_users'): RecordService<WorkflowUser>;
  collection(idOrName: 'WORKFLOW_processes'): RecordService<WorkflowProcess>;
  collection(idOrName: 'WORKFLOW_versions'): RecordService<WorkflowVersion>;
  collection(idOrName: 'WORKFLOW_workspaces'): RecordService<WorkflowWorkspace>;
  collection(idOrName: 'WORKFLOW_workspace_members'): RecordService<WorkspaceMember>;
  collection(idOrName: 'WORKFLOW_process_groups'): RecordService<ProcessGroup>;
  collection(idOrName: 'WORKFLOW_comments'): RecordService<WorkflowComment>;
  collection(idOrName: 'WORKFLOW_templates'): RecordService<WorkflowTemplate>;
  collection(idOrName: 'WORKFLOW_groups'): RecordService<WfGroup>;
  collection(idOrName: 'WORKFLOW_process_map_layouts'): RecordService<ProcessMapLayout>;
  collection(idOrName: 'WORKFLOW_tier_config'): RecordService<TierConfigRecord>;
  collection(idOrName: 'WORKFLOW_prompts'): RecordService<PromptRecord>;
  collection(idOrName: 'WORKFLOW_ai_models'): RecordService<AiModelRecord>;
  collection(idOrName: 'WORKFLOW_quick_prompts'): RecordService<QuickPromptRecord>;
  collection(idOrName: 'KATALOG_NARZEDZI'): RecordService<KatalogNarzedzi>;
  collection(idOrName: 'landing_translations'): RecordService<LandingTranslation>;
  collection(idOrName: string): RecordService;
}

const PB_URL = import.meta.env.VITE_PB_URL || 'https://pb.gryf.ai';
export const pb = new PocketBase(PB_URL) as TypedPocketBase;

// ── Helpers ──────────────────────────────────────────────────

export const getAvatarUrl = (user: WorkflowUser | null | undefined, size: number = 100) => {
  if (!user || !user.avatar) return '';
  // If the avatar is already a full URL (like from mock), return it
  if (user.avatar.startsWith('http')) return user.avatar;
  
  return `${pb.baseUrl}/api/files/WORKFLOW_users/${user.id}/${user.avatar}?thumb=${size}x${size}`;
};

/** Generic file URL builder for any collection record */
export const getRecordFileUrl = (collectionName: string, record: { id: string } | null | undefined, filename: string, size?: number) => {
  if (!record || !filename) return '';
  if (filename.startsWith('http')) return filename;
  const thumb = size ? `?thumb=${size}x${size}` : '';
  return `${pb.baseUrl}/api/files/${collectionName}/${record.id}/${filename}${thumb}`;
};
