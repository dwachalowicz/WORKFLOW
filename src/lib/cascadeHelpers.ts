/**
 * Cascade deletion helpers.
 *
 * Centralised functions that guarantee no orphan records are left
 * behind when a parent entity is deleted.
 */
import { pb } from './pocketbase';


// ── Process ──────────────────────────────────────────────────────

/**
 * Cascade-delete a single process and all its child records:
 *   - WORKFLOW_versions
 *   - WORKFLOW_comments
 *
 * @param processId  ID of the process to delete
 */
export async function cascadeDeleteProcess(
  processId: string
): Promise<void> {
  const versions = await pb.collection('WORKFLOW_versions').getFullList({ filter: `process = '${processId}'` });
  await Promise.allSettled(versions.map(v => pb.collection('WORKFLOW_versions').delete(v.id)));

  const comments = await pb.collection('WORKFLOW_comments').getFullList({ filter: `process = '${processId}'` });
  await Promise.allSettled(comments.map(c => pb.collection('WORKFLOW_comments').delete(c.id)));

  await pb.collection('WORKFLOW_processes').delete(processId);
}

// ── Batch helpers ────────────────────────────────────────────────

/**
 * Cascade-delete multiple processes (e.g. all processes in a folder).
 */
export async function cascadeDeleteProcesses(
  processIds: string[]
): Promise<void> {
  if (!processIds.length) return;

  // Process in chunks to avoid URL length limits if there are many processes
  const chunkSize = 50;
  for (let i = 0; i < processIds.length; i += chunkSize) {
    const chunk = processIds.slice(i, i + chunkSize);
    const filterParts = chunk.map(id => `process = '${id}'`);
    const filterQuery = filterParts.join(' || ');

    const versions = await pb.collection('WORKFLOW_versions').getFullList({ filter: filterQuery });
    await Promise.allSettled(versions.map(v => pb.collection('WORKFLOW_versions').delete(v.id)));

    const comments = await pb.collection('WORKFLOW_comments').getFullList({ filter: filterQuery });
    await Promise.allSettled(comments.map(c => pb.collection('WORKFLOW_comments').delete(c.id)));
  }

  await Promise.allSettled(
    processIds.map(id => pb.collection('WORKFLOW_processes').delete(id))
  );
}
