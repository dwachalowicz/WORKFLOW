import type { StateCreator } from 'zustand';
import type { CanvasState, ProcessSlice } from '../canvasTypes';
import i18n from '@/i18n/config';
import { pb } from '@/lib/pocketbase';
import { checkProcessLockStatus } from '@/lib/limitEnforcer';
import { useAuthStore } from '../authStore';
import { sanitizeForFilter } from '@/lib/parseUtils';
import { parseNodesSafe, parseEdgesSafe } from '@/lib/schemas';
import { getTierLimits } from '@/lib/tierLimits';
import type { Node, Edge } from '@xyflow/react';

export const createProcessSlice: StateCreator<CanvasState, [], [], ProcessSlice> = (set, get) => ({
  currentProcessId: null,
  currentGroupId: null,
  processName: i18n.t('defaults.newProcess'),
  isSaving: false,
  isDirty: false,
  isViewMode: false,
  lockedReason: null,

  setLockedReason: (reason) => set({ lockedReason: reason }),
  setIsDirty: (dirty: boolean) => set({ isDirty: dirty }),
  setViewMode: (viewMode: boolean) => set({ isViewMode: viewMode }),
  setProcessName: (name: string) => set({ processName: name }),

  createNewProcess: (groupId: string | null = null) => {
    set({
      currentProcessId: null,
      currentGroupId: groupId,
      processName: i18n.t('defaults.newProcess'),
      nodes: [
        {
          id: 'start-1',
          type: 'startstop',
          position: { x: 250, y: 50 },
          deletable: false,
          data: { type: 'start', label: 'Start' }
        },
        {
          id: 'stop-1',
          type: 'startstop',
          position: { x: 250, y: 300 },
          data: { type: 'stop', label: 'Stop' }
        }
      ],
      edges: [],
      isDirty: false,
      isViewMode: false,
      lockedReason: null
    });
  },

  importProcess: (nodes: Node[], edges: Edge[]) => {
    set({
      currentProcessId: null,
      processName: i18n.t('defaults.importedProcess'),
      nodes,
      edges,
      isDirty: true
    });
  },

  loadProcess: async (id: string) => {
    try {
      const record = await pb.collection('WORKFLOW_processes').getOne(id, { requestKey: null });
      const loadedNodes = parseNodesSafe(record.nodes);
      const loadedEdges = parseEdgesSafe(record.edges);
      
      // checkProcessLockStatus is statically imported
      const user = useAuthStore.getState().user;
      const activeWorkspace = useAuthStore.getState().activeWorkspace;
      
      const lockStatus = await checkProcessLockStatus(record, user?.tier, activeWorkspace?.isLocked);

      // Enforce read-only mode for workspace viewers regardless of tier limits
      const isViewer = activeWorkspace?.role === 'viewer';

      set({ 
        currentProcessId: record.id,
        processName: record.name,
        nodes: loadedNodes || [],
        edges: loadedEdges || [],
        isDirty: false,
        isViewMode: lockStatus.isLocked || isViewer,
        lockedReason: isViewer ? 'viewer_role' : lockStatus.reason
      });
      setTimeout(() => get().fetchIncomingLinks(), 100);
    } catch (error) {
      console.error('Error loading process:', error);
      throw error;
    }
  },

  saveProcess: async () => {
    const { currentProcessId, processName, nodes, edges, currentGroupId } = get();
    const user = useAuthStore.getState().user;
    const activeWorkspace = useAuthStore.getState().activeWorkspace;
    
    if (!user) {
      throw new Error(i18n.t('storeErrors.mustBeLoggedToSave'));
    }
    if (!activeWorkspace && !currentProcessId) {
      throw new Error(i18n.t('storeErrors.selectWorkspaceFirst'));
    }

    // Prevent viewers from saving — they have read-only access
    if (activeWorkspace?.role === 'viewer') {
      throw new Error(i18n.t('storeErrors.viewerCannotSave'));
    }

    if (activeWorkspace) {
      let existing: { totalItems: number } = { totalItems: 0 };
      try {
        const nameFilter = `workspace = "${sanitizeForFilter(activeWorkspace.id)}" && name = "${sanitizeForFilter(processName)}"` + 
          (currentProcessId ? ` && id != "${sanitizeForFilter(currentProcessId)}"` : '');
        existing = await pb.collection('WORKFLOW_processes').getList(1, 1, {
          filter: nameFilter,
          requestKey: null,
        });
        if (existing.totalItems > 0) {
          throw new Error(i18n.t('storeErrors.duplicateName', { name: processName }));
        }
      } catch (err) {
        if (err instanceof Error && existing.totalItems > 0) throw err;
        console.warn('Duplicate name check failed (network?):', err);
      }
    }

    set({ isSaving: true });
    try {
      const data: Record<string, unknown> = {
        name: processName,
        owner: user.id,
        lastEditedBy: user.id,
        nodes: JSON.stringify(nodes),
        edges: JSON.stringify(edges)
      };
      
      if (activeWorkspace) {
        data.workspace = activeWorkspace.id;
      }
      if (currentGroupId) {
        data.group = currentGroupId;
      }

      if (currentProcessId) {
        await pb.collection('WORKFLOW_processes').update(currentProcessId, data, { fields: 'id' });
      } else {
        if (activeWorkspace) {
          const limits = getTierLimits(user.tier);
          const existingProcesses = await pb.collection('WORKFLOW_processes').getList(1, 1, {
            filter: `workspace = "${sanitizeForFilter(activeWorkspace.id)}"`,
            requestKey: null,
          });
          if (existingProcesses.totalItems >= limits.maxProcesses) {
            set({ isSaving: false });
            throw new Error(i18n.t('tierLimits.processLimitReached', { limit: limits.maxProcesses }));
          }
        }
        const record = await pb.collection('WORKFLOW_processes').create(data, { fields: 'id' });
        set({ currentProcessId: record.id });
      }

      // Label propagation to other processes is now securely and efficiently 
      // handled by the PocketBase backend via the onRecordAfterUpdateSuccess hook.
    } catch (error: unknown) {
      console.error('Error saving process:', error);
      set({ isSaving: false });
      if (typeof error === 'object' && error !== null && 'status' in error && error.status === 404) {
        throw new Error(i18n.t('storeErrors.savePermissionLost'), { cause: error });
      }
      throw error;
    }
    set({ isSaving: false, isDirty: false });
  },
});
