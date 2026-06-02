import type { StateCreator } from 'zustand';
import type { CanvasState, VersionSlice } from '../canvasTypes';
import i18n from '@/i18n/config';
import { pb } from '@/lib/pocketbase';
import { useAuthStore } from '../authStore';
import { getTierLimits } from '@/lib/tierLimits';
import { sanitizeForFilter } from '@/lib/parseUtils';
import { parseNodesSafe, parseEdgesSafe } from '@/lib/schemas';

export const createVersionSlice: StateCreator<CanvasState, [], [], VersionSlice> = (set, get) => ({
  isVersionModalOpen: false,
  versions: [],
  isLoadingVersions: false,
  isSavingVersion: false,

  setVersionModalOpen: (isOpen: boolean) => set({ isVersionModalOpen: isOpen }),

  saveVersion: async (label?: string) => {
    if (get().isSavingVersion) return;
    const { currentProcessId, processName, nodes, edges } = get();
    const user = useAuthStore.getState().user;

    if (!user) throw new Error(i18n.t('storeErrors.mustBeLoggedIn'));
    if (!currentProcessId) throw new Error(i18n.t('storeErrors.saveProcessFirst'));

    set({ isSavingVersion: true });
    try {
      const limits = getTierLimits(user.tier);
      let nextVersion = 1;
      try {
        const allVersions = await pb.collection('WORKFLOW_versions').getFullList({
          filter: `process = "${sanitizeForFilter(currentProcessId)}"`,
          sort: 'version_number',
          fields: 'id,version_number',
          requestKey: null,
        });
        
        if (allVersions.length > 0) {
          nextVersion = allVersions[allVersions.length - 1].version_number + 1;
        }

        if (allVersions.length >= limits.maxVersionsPerProcess) {
          const toDelete = allVersions.slice(0, allVersions.length - limits.maxVersionsPerProcess + 1);
          for (const old of toDelete) {
            await pb.collection('WORKFLOW_versions').delete(old.id);
          }
        }
      } catch { /* first version */ }

      await pb.collection('WORKFLOW_versions').create({
        process: currentProcessId,
        version_number: nextVersion,
        label: label || i18n.t('defaults.versionLabel', { number: nextVersion }),
        nodes_data: JSON.stringify(nodes),
        edges_data: JSON.stringify(edges),
        process_name: processName,
        created_by: user.id,
      }, { fields: 'id' });

      await get().listVersions();
    } finally {
      set({ isSavingVersion: false });
    }
  },

  listVersions: async () => {
    const { currentProcessId } = get();
    if (!currentProcessId) {
      set({ versions: [], isLoadingVersions: false });
      return;
    }
    set({ isLoadingVersions: true });
    try {
      const records = await pb.collection('WORKFLOW_versions').getFullList({
        filter: `process = "${sanitizeForFilter(currentProcessId)}"`,
        sort: '-version_number',
        expand: 'created_by',
        fields: 'id,version_number,label,created,expand.created_by.id,expand.created_by.name,expand.created_by.email,expand.created_by.avatar',
        requestKey: null,
      });
      set({ versions: records, isLoadingVersions: false });
    } catch {
      set({ versions: [], isLoadingVersions: false });
    }
  },

  loadVersion: async (versionId: string) => {
    const record = await pb.collection('WORKFLOW_versions').getOne(versionId);
    const loadedNodes = parseNodesSafe(record.nodes_data);
    const loadedEdges = parseEdgesSafe(record.edges_data);
    const restoredName = record.process_name || get().processName;

    set({
      nodes: loadedNodes || [],
      edges: loadedEdges || [],
      processName: restoredName,
      isDirty: true
    });

    const { currentProcessId } = get();
    const user = useAuthStore.getState().user;
    if (currentProcessId && user) {
      let nextVersion = 1;
      try {
        const existing = await pb.collection('WORKFLOW_versions').getList(1, 1, {
          filter: `process = "${sanitizeForFilter(currentProcessId)}"`,
          sort: '-version_number',
          requestKey: null,
        });
        if (existing.items.length > 0) {
          nextVersion = existing.items[0].version_number + 1;
        }
      } catch { /* ignore */ }

      await pb.collection('WORKFLOW_versions').create({
        process: currentProcessId,
        version_number: nextVersion,
        label: i18n.t('defaults.restoredFrom', { number: record.version_number }),
        nodes_data: JSON.stringify(loadedNodes || []),
        edges_data: JSON.stringify(loadedEdges || []),
        process_name: restoredName,
        created_by: user.id,
      }, { fields: 'id' });

      await get().listVersions();
    }
  },

  deleteVersion: async (versionId: string) => {
    await pb.collection('WORKFLOW_versions').delete(versionId);
    await get().listVersions();
  }
});
