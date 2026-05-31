import { pb } from './pocketbase';
import { parseNodesFromRecord, parseEdgesFromRecord, sanitizeForFilter } from './parseUtils';
import i18n from '@/i18n/config';
import { getTierLimits } from './tierLimits';
import { useAuthStore } from '@/store/authStore';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export interface WorkflowGroup {
  id: string;
  name: string;
  workspace: string;
  avatar?: string;
  color?: string;
  created: string;
  updated: string;
}

/** Shape stored on nodes/edges — lightweight reference */
export interface GroupRef {
  id: string;
  name: string;
  avatar?: string;
  color?: string;
}

// ── In-memory cache ──────────────────────────────────────────────

let _cache: WorkflowGroup[] = [];
let _cacheWorkspaceId = '';
let _cacheTimestamp = 0;
const CACHE_TTL = 30_000; // 30s

function isCacheValid(workspaceId: string): boolean {
  return (
    _cacheWorkspaceId === workspaceId &&
    Date.now() - _cacheTimestamp < CACHE_TTL
  );
}

// ── Public API ───────────────────────────────────────────────────

/**
 * Fetch all groups for a workspace.
 */
export async function fetchGroups(
  workspaceId: string
): Promise<WorkflowGroup[]> {
  if (isCacheValid(workspaceId)) return _cache;

  try {
    const filter = `workspace = '${sanitizeForFilter(workspaceId)}'`;

    const records = await pb.collection('WORKFLOW_groups').getFullList<WorkflowGroup>({
      filter,
      sort: 'name',
      requestKey: null,
    });

    _cache = records;
    _cacheWorkspaceId = workspaceId;
    _cacheTimestamp = Date.now();

    return records;
  } catch (err: unknown) {
    if ((err as { isAbort?: boolean })?.isAbort || String(err).includes('autocancelled')) {
      return _cache; // Ignore auto-cancellation
    }
    console.error('Error fetching groups:', err);
    return _cache; // fallback to stale cache
  }
}

/** Invalidate the cache so next fetchGroups() fetches fresh data */
export function invalidateGroupCache(): void {
  _cacheTimestamp = 0;
}

/**
 * Create a new group in a workspace.
 * Respects maxGroupsPerWorkspace tier limit.
 */
export async function createGroup(
  workspaceId: string,
  name: string,
  options?: { color?: string; avatarFile?: File }
): Promise<WorkflowGroup> {
  // Tier gate: maxGroupsPerWorkspace
  const user = useAuthStore.getState().user;
  const limits = getTierLimits(user?.tier);

  const existingGroups = await pb.collection('WORKFLOW_groups').getList(1, 1, {
    filter: `workspace = '${sanitizeForFilter(workspaceId)}'`,
    requestKey: null,
  });
  if (existingGroups.totalItems >= limits.maxGroupsPerWorkspace) {
    throw new Error(i18n.t('tierLimits.groupLimitReached', { limit: limits.maxGroupsPerWorkspace }));
  }

  const formData = new FormData();
  formData.append('name', name.trim());
  formData.append('workspace', workspaceId);
  if (options?.color) formData.append('color', options.color);
  if (options?.avatarFile) {
    if (options.avatarFile.size > MAX_AVATAR_SIZE) throw new Error(i18n.t('errors.avatarTooLarge'));
    if (!ALLOWED_IMAGE_TYPES.includes(options.avatarFile.type)) throw new Error(i18n.t('errors.invalidImageType'));
    formData.append('avatar', options.avatarFile);
  }

  const record = await pb.collection('WORKFLOW_groups').create<WorkflowGroup>(formData);
  invalidateGroupCache();
  return record;
}

/** Update group name, color, or avatar */
export async function updateGroup(
  groupId: string,
  data: { name?: string; color?: string; avatarFile?: File | null }
): Promise<WorkflowGroup> {
  const formData = new FormData();
  if (data.name !== undefined) formData.append('name', data.name.trim());
  if (data.color !== undefined) formData.append('color', data.color);
  if (data.avatarFile === null) {
    // Remove avatar
    formData.append('avatar', '');
  } else if (data.avatarFile) {
    if (data.avatarFile.size > MAX_AVATAR_SIZE) throw new Error(i18n.t('errors.avatarTooLarge'));
    if (!ALLOWED_IMAGE_TYPES.includes(data.avatarFile.type)) throw new Error(i18n.t('errors.invalidImageType'));
    formData.append('avatar', data.avatarFile);
  }

  const record = await pb.collection('WORKFLOW_groups').update<WorkflowGroup>(groupId, formData);
  invalidateGroupCache();
  return record;
}

/** Delete a group and remove its references from all processes in the workspace */
export async function deleteGroup(groupId: string, workspaceId: string): Promise<void> {
  // 1. Delete the group from DB
  await pb.collection('WORKFLOW_groups').delete(groupId);
  invalidateGroupCache();

  // 2. Clean up dangling references in all workspace processes
  try {
    const allProcesses = await pb.collection('WORKFLOW_processes').getFullList({
      filter: `workspace = '${sanitizeForFilter(workspaceId)}' && (nodes ~ '"${sanitizeForFilter(groupId)}"' || edges ~ '"${sanitizeForFilter(groupId)}"')`,
      fields: 'id,nodes,edges',
      requestKey: null,
    });

    for (const proc of allProcesses) {
      const nodes = parseNodesFromRecord(proc.nodes);
      const edges = parseEdgesFromRecord(proc.edges);
      let changed = false;

      // Helper to clean arrays of GroupRefs
      const cleanGroupArray = (arr?: GroupRef[]) => {
        if (!Array.isArray(arr)) return arr;
        const filtered = arr.filter(g => g?.id !== groupId);
        if (filtered.length !== arr.length) changed = true;
        return filtered;
      };

      // Clean nodes
      for (const node of nodes) {
        if (node.data) {
          if (node.data.editors) node.data.editors = cleanGroupArray(node.data.editors);
          if (node.data.readers) node.data.readers = cleanGroupArray(node.data.readers);
          if (node.data.decisionMakers) node.data.decisionMakers = cleanGroupArray(node.data.decisionMakers);
        }
      }

      // Clean edges
      for (const edge of edges) {
        if (edge.data) {
          if (edge.data.editors) edge.data.editors = cleanGroupArray(edge.data.editors);
          if (edge.data.readers) edge.data.readers = cleanGroupArray(edge.data.readers);
          if (edge.data.decisionMakers) edge.data.decisionMakers = cleanGroupArray(edge.data.decisionMakers);
        }
      }

      // Update process if changed
      if (changed) {
        await pb.collection('WORKFLOW_processes').update(proc.id, {
          nodes: JSON.stringify(nodes),
          edges: JSON.stringify(edges),
        });
      }
    }
  } catch (err) {
    console.error('Error cleaning up dangling group references:', err);
  }
}

/** Get avatar URL for a group */
export function getGroupAvatarUrl(group: WorkflowGroup | GroupRef, size = 100): string {
  if (!group.avatar) return '';
  if (group.avatar.startsWith('http')) return group.avatar;
  return `${pb.baseUrl}/api/files/WORKFLOW_groups/${group.id}/${group.avatar}?thumb=${size}x${size}`;
}

/** Convert a full group record to a lightweight ref for storing on nodes/edges */
export function toGroupRef(group: WorkflowGroup): GroupRef {
  return {
    id: group.id,
    name: group.name,
    avatar: group.avatar ? getGroupAvatarUrl(group) : undefined,
    color: group.color || undefined,
  };
}

/** Predefined color palette for new groups */
export const GROUP_COLORS = [
  '#bc9b59', // brand gold
  '#6366f1', // indigo
  '#22c55e', // green
  '#ef4444', // red
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f97316', // orange
];
