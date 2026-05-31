import type { StateCreator } from 'zustand';
import type { CanvasState, MetadataSlice } from '../canvasTypes';
import { pb } from '@/lib/pocketbase';
import { useAuthStore } from '../authStore';
import { sanitizeForFilter, parseNodesFromRecord } from '@/lib/parseUtils';

import { fetchCommentCounts } from '@/lib/commentService';

export const createMetadataSlice: StateCreator<CanvasState, [], [], MetadataSlice> = (set, get) => ({
  commentCounts: {},
  incomingLinks: {},
  
  setCommentCounts: (counts: Record<string, number>) => set({ commentCounts: counts }),
  
  refreshCommentCounts: async () => {
    const processId = get().currentProcessId;
    if (!processId) return;
    try {
      const countsMap = await fetchCommentCounts(processId);
      const obj: Record<string, number> = {};
      countsMap.forEach((v, k) => { obj[k] = v; });
      set({ commentCounts: obj });
    } catch (err) {
      console.error('Failed to refresh comment counts:', err);
    }
  },
  
  fetchIncomingLinks: async () => {
    const processId = get().currentProcessId;
    if (!processId) return;
    try {
      const { activeWorkspace } = useAuthStore.getState();
      if (!activeWorkspace) return;
      
      // NOTE: The filter uses string-search (~) on JSON because PocketBase lacks
      // native JSON field queries. For large workspaces, consider a dedicated
      // backend endpoint with indexed lookup instead.
      const PAGE_SIZE = 200;
      let page = 1;
      const allProcesses: { id: string; name: string; nodes: unknown }[] = [];
      let hasMore = true;
      while (hasMore) {
        const result = await pb.collection('WORKFLOW_processes').getList(page, PAGE_SIZE, {
          filter: `workspace = '${sanitizeForFilter(activeWorkspace.id)}' && id != '${sanitizeForFilter(processId)}' && nodes ~ '"targetWorkflowId":"${sanitizeForFilter(processId)}"'`,
          fields: 'id,name,nodes',
          requestKey: `incoming-links-${processId}-${page}`,
        });
        allProcesses.push(...result.items.map(item => {
          const rec = item as unknown as Record<string, unknown>;
          return {
            id: item.id,
            name: String(rec.name || ''),
            nodes: rec.nodes,
          };
        }));
        hasMore = result.totalPages > page;
        page++;
      }
      const linkMap: Record<string, { sourceProcessId: string; sourceProcessName: string }[]> = {};
      for (const proc of allProcesses) {
        const nodes: { type?: string; data?: { targetWorkflowId?: string; targetNodeId?: string } }[] = parseNodesFromRecord(proc.nodes);
        for (const node of nodes) {
          if (node.data?.targetWorkflowId === processId) {
            const targetNodeId = node.data.targetNodeId || '__process__';
            if (!linkMap[targetNodeId]) linkMap[targetNodeId] = [];
            linkMap[targetNodeId].push({
              sourceProcessId: proc.id,
              sourceProcessName: proc.name || 'Unnamed',
            });
          }
        }
      }
      set({ incomingLinks: linkMap });
    } catch (err: unknown) {
      if ((err as { isAbort?: boolean })?.isAbort) {
        // Ignore log error if request was intentionally aborted by PocketBase
        return;
      }
      console.error('Error fetching incoming links:', err);
    }
  },
});
