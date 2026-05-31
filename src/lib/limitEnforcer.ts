import { pb, type WorkflowProcess } from './pocketbase';
import { getTierLimits } from './tierLimits';
import { sanitizeForFilter, parseNodesFromRecord, parseEdgesFromRecord } from './parseUtils';

export interface ProcessLockStatus {
  isLocked: boolean;
  reason: 'workspace_limit' | 'process_limit' | 'nodes_limit' | 'edges_limit' | 'notes_limit' | 'variables_limit' | 'checklist_limit' | 'subworkflows_limit' | 'viewer_role' | null;
}

export async function checkProcessLockStatus(
  process: WorkflowProcess | Record<string, unknown>,
  userTier?: string,
  isWorkspaceLocked?: boolean
): Promise<ProcessLockStatus> {
  const limits = getTierLimits(userTier);

  // 1. Check if workspace is locked
  if (isWorkspaceLocked) {
    return { isLocked: true, reason: 'workspace_limit' };
  }

  // 2. Check internal process limits (nodes, edges, notes, variables, checklists, subworkflows)
  const internalLock = checkProcessInternalLimits(process, userTier);
  if (internalLock.isLocked) {
    return internalLock;
  }

  // 3. Check workspace processes limit
  if (limits.maxProcesses < 999999) {
    try {
      const workspaceId = (process as WorkflowProcess).workspace || '';
      const workspaceProcesses = await pb.collection('WORKFLOW_processes').getFullList({
        filter: `workspace = "${sanitizeForFilter(workspaceId)}"`,
        sort: 'created',
        fields: 'id',
        requestKey: null,
      });

      const processId = (process as WorkflowProcess).id;
      const processIndex = workspaceProcesses.findIndex(p => p.id === processId);
      if (processIndex >= limits.maxProcesses) {
        return { isLocked: true, reason: 'process_limit' };
      }
    } catch (err) {
      console.error('Error fetching workspace processes for limits check', err);
    }
  }

  return { isLocked: false, reason: null };
}

/**
 * Synchronously checks internal process limits (nodes, edges, variables, etc.).
 */
function checkProcessInternalLimits(process: WorkflowProcess | Record<string, unknown>, userTier?: string): ProcessLockStatus {
  const limits = getTierLimits(userTier);
  try {
    let nodesCount = 0;
    let notesCount = 0;
    let totalVariables = 0;
    let maxChecklist = 0;
    let hasSubworkflow = false;

    const pNodes = (process as WorkflowProcess).nodes;
    const pEdges = (process as WorkflowProcess).edges;
    const nodes = parseNodesFromRecord(pNodes);
    const edges = parseEdgesFromRecord(pEdges);

    nodes.forEach((n: { type?: string; data?: { variables?: unknown[]; checklist?: unknown[] } }) => {
      if (n.type === 'note') notesCount++;
      else nodesCount++;
      
      if (n.type === 'subworkflow') hasSubworkflow = true;
      
      const vars = n.data?.variables;
      if (Array.isArray(vars)) totalVariables += vars.length;

      const checklist = n.data?.checklist;
      if (Array.isArray(checklist) && checklist.length > maxChecklist) {
        maxChecklist = checklist.length;
      }
    });

    if (hasSubworkflow && !limits.canUseSubworkflows) return { isLocked: true, reason: 'subworkflows_limit' };
    if (nodesCount > limits.maxNodesPerProcess) return { isLocked: true, reason: 'nodes_limit' };
    if (edges.length > limits.maxEdgesPerProcess) return { isLocked: true, reason: 'edges_limit' };
    if (notesCount > limits.maxNotesPerProcess) return { isLocked: true, reason: 'notes_limit' };
    if (totalVariables > limits.maxVariablesPerProcess) return { isLocked: true, reason: 'variables_limit' };
    if (maxChecklist > limits.maxChecklistItemsPerNode) return { isLocked: true, reason: 'checklist_limit' };

  } catch (err) {
    console.error('Error parsing process nodes/edges for internal limits check', err);
  }
  return { isLocked: false, reason: null };
}

/**
 * Returns a Set of locked process IDs based on the maxProcesses limit and internal limits.
 * Pobiera zablokowane identyfikatory bezpośrednio z serwera (endpoint /api/locked-processes).
 */
export async function getLockedProcessIdsForWorkspace(workspaceId: string): Promise<Set<string>> {

  const lockedIds = new Set<string>();

  try {
    const res = await fetch(`${pb.baseUrl}/api/locked-processes/${workspaceId}?t=${Date.now()}`, {
      headers: {
        'Authorization': pb.authStore.token
      }
    });

    if (res.ok) {
      const ids: string[] = await res.json();
      ids.forEach(id => lockedIds.add(id));
    }
  } catch (err) {
    if (err && typeof err === 'object' && 'isAbort' in err && (err as { isAbort: unknown }).isAbort) {
      // do nothing
    } else {
      console.error('Error checking locked process IDs', err);
    }
  }
  
  return lockedIds;
}
