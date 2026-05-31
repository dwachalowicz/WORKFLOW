import type { StateCreator } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import type { Connection, NodeChange, EdgeChange, Node } from '@xyflow/react';
import type { CanvasState, GraphSlice } from '../canvasTypes';
import { useAuthStore } from '../authStore';
import { getTierLimits } from '@/lib/tierLimits';
import { getLayoutedElements } from '@/lib/layout';
import { useToastStore } from '@/store/toastStore';
import i18n from '@/i18n/config';

export const createGraphSlice: StateCreator<CanvasState, [], [], GraphSlice> = (set, get) => ({
  nodes: [],
  edges: [],
  
  onNodesChange: (changes: NodeChange[]) => {
    const hasContentChange = changes.some(c => c.type !== 'select' && c.type !== 'dimensions');
    set({
      nodes: applyNodeChanges(changes, get().nodes),
      ...(hasContentChange ? { isDirty: true } : {}),
    });
  },
  
  onEdgesChange: (changes: EdgeChange[]) => {
    const hasContentChange = changes.some(c => c.type !== 'select');
    set({
      edges: applyEdgeChanges(changes, get().edges),
      ...(hasContentChange ? { isDirty: true } : {}),
    });
  },
  
  onConnect: (connection: Connection) => {
    const state = get();
    const targetNode = state.nodes.find(n => n.id === connection.target);
    
    const user = useAuthStore.getState().user;
    const limits = getTierLimits(user?.tier);
    if (state.edges.length >= limits.maxEdgesPerProcess) {
      console.warn(`[Tier] Edge limit reached (${limits.maxEdgesPerProcess})`);
      useToastStore.getState().showToast(i18n.t('tierLimits.edgeLimit', { limit: limits.maxEdgesPerProcess }), 'error');
      return;
    }

    if (connection.sourceHandle === 'db') {
      if (!targetNode || targetNode.type !== 'database') {
        return;
      }
      set((s) => ({
        edges: addEdge({ ...connection, data: { dbOperation: 'read' } }, s.edges),
        isDirty: true
      }));
      return;
    }
    if (targetNode?.type === 'database') {
      return;
    }
    set((s) => ({
      edges: addEdge(connection, s.edges),
      isDirty: true
    }));
  },

  addNode: (node: Node) => {
    const state = get();
    const user = useAuthStore.getState().user;
    const limits = getTierLimits(user?.tier);

    if (node.type === 'subworkflow' && !limits.canUseSubworkflows) {
      console.warn(`[Tier] Subworkflows locked for tier ${user?.tier}`);
      useToastStore.getState().showToast(i18n.t('tierLimits.subworkflowLocked'), 'error');
      return;
    }

    if (node.type === 'note') {
      const noteCount = state.nodes.filter(n => n.type === 'note').length;
      if (noteCount >= limits.maxNotesPerProcess) {
        console.warn(`[Tier] Note limit reached (${limits.maxNotesPerProcess})`);
        useToastStore.getState().showToast(i18n.t('tierLimits.noteLimit', { limit: limits.maxNotesPerProcess }), 'error');
        return;
      }
    } else {
      const nodeCount = state.nodes.filter(n => n.type !== 'note').length;
      if (nodeCount >= limits.maxNodesPerProcess) {
        console.warn(`[Tier] Node limit reached (${limits.maxNodesPerProcess})`);
        useToastStore.getState().showToast(i18n.t('tierLimits.nodeLimit', { limit: limits.maxNodesPerProcess }), 'error');
        return;
      }
    }

    set((s) => ({
      nodes: [
        ...s.nodes.map(n => node.selected ? { ...n, selected: false } : n),
        node
      ],
      isDirty: true
    }));
  },

  autoLayout: () => {
    const { nodes, edges } = get();
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges);
    set({ nodes: layoutedNodes, edges: layoutedEdges, isDirty: true });
  },

  updateNode: (id: string, data: Record<string, unknown>) => {
    set((state) => ({
      nodes: state.nodes.map(node => node.id === id ? { ...node, data: { ...node.data, ...data } } : node),
      isDirty: true
    }));
  },

  updateEdge: (id: string, data: Record<string, unknown>) => {
    set((state) => ({
      edges: state.edges.map(edge => edge.id === id ? { ...edge, data: { ...edge.data, ...data } } : edge),
      isDirty: true
    }));
  },
});
