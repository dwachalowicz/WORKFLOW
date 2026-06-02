/**
 * Comment service for node-level comments in workflow processes.
 */
import { pb, type WorkflowComment } from './pocketbase';
import type { RecordModel } from 'pocketbase';
import { sanitizeForFilter } from './parseUtils';
import i18n from '@/i18n/config';
import { getTierLimits } from './tierLimits';
import { useAuthStore } from '@/store/authStore';

export type Comment = WorkflowComment;



/**
 * Fetch all comments for a process, optionally filtered by node_id.
 */
export async function fetchComments(processId: string, nodeId?: string): Promise<Comment[]> {
  let filter = `process = "${sanitizeForFilter(processId)}"`;
  if (nodeId) filter += ` && node_id = "${sanitizeForFilter(nodeId)}"`;

  try {
    const records = await pb.collection('WORKFLOW_comments').getFullList({
      filter,
      expand: 'author',
      requestKey: null,
    });
    
    // Sort locally to prevent 400 errors if the DB schema hides or blocks the 'created' field sort
    records.sort((a: RecordModel, b: RecordModel) => {
      const dateStrA = a.created || a.createdAt || a.created_at || '';
      const dateStrB = b.created || b.createdAt || b.created_at || '';
      const dateA = new Date(dateStrA ? dateStrA.replace(' ', 'T') : 0).getTime();
      const dateB = new Date(dateStrB ? dateStrB.replace(' ', 'T') : 0).getTime();
      return dateB - dateA;
    });
    
    return records as Comment[];
  } catch (err) {
    console.error('fetchComments failed:', err);
    return [];
  }
}

/**
 * Get comment counts per node for a given process.
 * Returns a Map<nodeId, count>.
 */
export async function fetchCommentCounts(processId: string): Promise<Map<string, number>> {
  const records = await pb.collection('WORKFLOW_comments').getFullList({
    filter: `process = "${sanitizeForFilter(processId)}" && resolved = false`,
    fields: 'node_id',
    requestKey: null,
  });
  const counts = new Map<string, number>();
  for (const r of records) {
    const nodeId = r.node_id as string;
    counts.set(nodeId, (counts.get(nodeId) || 0) + 1);
  }
  return counts;
}

/**
 * Add a comment to a node.
 * Respects maxCommentsPerProcess tier limit.
 */
export async function addComment(processId: string, nodeId: string, authorId: string, content: string, parentId?: string): Promise<Comment> {
  // Tier gate: maxCommentsPerProcess
  const user = useAuthStore.getState().user;
  const limits = getTierLimits(user?.tier);
  
  const existing = await pb.collection('WORKFLOW_comments').getList(1, 1, {
    filter: `process = "${sanitizeForFilter(processId)}"`,
    requestKey: null,
  });
  if (existing.totalItems >= limits.maxCommentsPerProcess) {
    throw new Error(i18n.t('tierLimits.commentLimitReached', { limit: limits.maxCommentsPerProcess }));
  }

  const data: Record<string, unknown> = {
    process: processId,
    node_id: nodeId,
    author: authorId,
    content,
    resolved: false,
  };
  if (parentId) {
    data.parent_id = parentId;
  }

  const record = await pb.collection('WORKFLOW_comments').create(data);
  // Fetch with expand to get author details
  const expanded = await pb.collection('WORKFLOW_comments').getOne(record.id, {
    expand: 'author',
  });

  return expanded as Comment;
}

/**
 * Toggle resolved status of a comment.
 */
export async function toggleResolveComment(commentId: string, resolved: boolean): Promise<void> {
  await pb.collection('WORKFLOW_comments').update(commentId, { resolved });
}

/**
 * Delete a comment.
 */
export async function deleteComment(commentId: string): Promise<void> {
  await pb.collection('WORKFLOW_comments').delete(commentId);
}
