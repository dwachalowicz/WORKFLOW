/**
 * Cascade deletion helpers.
 *
 * Centralised functions that guarantee no orphan records are left
 * behind when a parent entity is deleted.
 */
import { pb } from './pocketbase';
import { sanitizeForFilter } from './parseUtils';


// ── Process ──────────────────────────────────────────────────────

/**
 * Cascade-delete a single process and all its child records:
 *   - WORKFLOW_versions
 *   - WORKFLOW_comments
 *
 * @param processId  ID of the process to delete
 */
export async function cascadeDeleteProcess(
  processId: string,
  workspaceId?: string
): Promise<void> {
  const versions = await pb.collection('WORKFLOW_versions').getFullList({ filter: `process = '${sanitizeForFilter(processId)}'` });
  await Promise.allSettled(versions.map(v => pb.collection('WORKFLOW_versions').delete(v.id)));

  const comments = await pb.collection('WORKFLOW_comments').getFullList({ filter: `process = '${sanitizeForFilter(processId)}'` });
  await Promise.allSettled(comments.map(c => pb.collection('WORKFLOW_comments').delete(c.id)));

  await pb.collection('WORKFLOW_processes').delete(processId);

  // Clean up cross-workflow references: other processes may have subworkflow nodes
  // pointing to the deleted process via targetWorkflowId
  if (workspaceId) {
    try {
      const referring = await pb.collection('WORKFLOW_processes').getFullList({
        filter: `workspace = '${sanitizeForFilter(workspaceId)}' && nodes ~ '"${sanitizeForFilter(processId)}"'`,
        fields: 'id,nodes',
        requestKey: null,
      });
      for (const proc of referring) {
        let nodes: { data?: { targetWorkflowId?: string | null; targetWorkflowName?: string }; [k: string]: unknown }[];
        try { nodes = typeof proc.nodes === 'string' ? JSON.parse(proc.nodes) : proc.nodes; } catch { continue; }
        if (!Array.isArray(nodes)) continue;
        let changed = false;
        for (const n of nodes) {
          if (n.data?.targetWorkflowId === processId) {
            n.data.targetWorkflowId = null;
            n.data.targetWorkflowName = '';
            changed = true;
          }
        }
        if (changed) {
          await pb.collection('WORKFLOW_processes').update(proc.id, { nodes: JSON.stringify(nodes) }).catch(console.error);
        }
      }
    } catch (err) {
      console.warn('[cascadeDeleteProcess] Failed to clean cross-workflow references:', err);
    }
  }
}

// ── Batch helpers ────────────────────────────────────────────────

/**
 * Cascade-delete multiple processes (e.g. all processes in a folder).
 * Also cleans up cross-workflow targetWorkflowId references when workspaceId is provided.
 */
export async function cascadeDeleteProcesses(
  processIds: string[],
  workspaceId?: string
): Promise<void> {
  if (!processIds.length) return;

  // Process in chunks to avoid URL length limits if there are many processes
  const chunkSize = 50;
  for (let i = 0; i < processIds.length; i += chunkSize) {
    const chunk = processIds.slice(i, i + chunkSize);
    const filterParts = chunk.map(id => `process = '${sanitizeForFilter(id)}'`);
    const filterQuery = filterParts.join(' || ');

    const versions = await pb.collection('WORKFLOW_versions').getFullList({ filter: filterQuery });
    await Promise.allSettled(versions.map(v => pb.collection('WORKFLOW_versions').delete(v.id)));

    const comments = await pb.collection('WORKFLOW_comments').getFullList({ filter: filterQuery });
    await Promise.allSettled(comments.map(c => pb.collection('WORKFLOW_comments').delete(c.id)));
  }

  await Promise.allSettled(
    processIds.map(id => pb.collection('WORKFLOW_processes').delete(id))
  );

  // Clean up cross-workflow references for all deleted process IDs
  if (workspaceId && processIds.length > 0) {
    try {
      const deletedSet = new Set(processIds);
      // Build a filter that matches any of the deleted IDs in the nodes JSON
      const nodeFilterParts = processIds.map(id => `nodes ~ '"${sanitizeForFilter(id)}"'`);
      const referring = await pb.collection('WORKFLOW_processes').getFullList({
        filter: `workspace = '${sanitizeForFilter(workspaceId)}' && (${nodeFilterParts.join(' || ')})`,
        fields: 'id,nodes',
        requestKey: null,
      });
      for (const proc of referring) {
        let nodes: { data?: { targetWorkflowId?: string | null; targetWorkflowName?: string }; [k: string]: unknown }[];
        try { nodes = typeof proc.nodes === 'string' ? JSON.parse(proc.nodes) : proc.nodes; } catch { continue; }
        if (!Array.isArray(nodes)) continue;
        let changed = false;
        for (const n of nodes) {
          if (n.data?.targetWorkflowId && deletedSet.has(n.data.targetWorkflowId)) {
            n.data.targetWorkflowId = null;
            n.data.targetWorkflowName = '';
            changed = true;
          }
        }
        if (changed) {
          await pb.collection('WORKFLOW_processes').update(proc.id, { nodes: JSON.stringify(nodes) }).catch(console.error);
        }
      }
    } catch (err) {
      console.warn('[cascadeDeleteProcesses] Failed to clean cross-workflow references:', err);
    }
  }
}
