import { useEffect, useCallback, useMemo } from 'react';
import { useUpdateNodeInternals, type Edge } from '@xyflow/react';
import { useCanvasStore } from "@/store/canvasStore";
import { useSimulationStore } from "@/store/simulationStore";

/**
 * Hook to check if a specific handle is visually active (selected node or selected edge).
 * Replaces 5 identical inline implementations across all node components.
 */
/** Selector that computes a Map<nodeId, Edge[]> from all edges — O(E) once, O(1) per node lookup.
 *  Cached: only recomputes when edges array reference changes. */
let _cachedEdges: Edge[] | null = null;
let _cachedMap: Map<string, Edge[]> = new Map();

const selectEdgesByNode = (state: { edges: Edge[] }): Map<string, Edge[]> => {
  if (state.edges === _cachedEdges) return _cachedMap;
  _cachedEdges = state.edges;
  const map = new Map<string, Edge[]>();
  for (const e of state.edges) {
    const srcArr = map.get(e.source);
    if (srcArr) srcArr.push(e); else map.set(e.source, [e]);
    if (e.target !== e.source) {
      const tgtArr = map.get(e.target);
      if (tgtArr) tgtArr.push(e); else map.set(e.target, [e]);
    }
  }
  _cachedMap = map;
  return map;
};

export const useHandleActive = (id: string, selected: boolean) => {
  const edges = useCanvasStore(state => state.edges);
  const edgesByNode = useCanvasStore(selectEdgesByNode);
  const EMPTY_EDGES: Edge[] = useMemo(() => [], []);
  const nodeEdges = edgesByNode.get(id) ?? EMPTY_EDGES;

  const isHandleActive = useCallback((handleId: string | null | undefined, type: 'source' | 'target') => {
    if (selected) return true;
    return nodeEdges.some(e => {
      if (!e.selected) return false;
      if (type === 'source') {
        return e.source === id && (!e.sourceHandle || e.sourceHandle === handleId);
      } else {
        return e.target === id && (!e.targetHandle || e.targetHandle === handleId);
      }
    });
  }, [nodeEdges, id, selected]);

  const isAnyHandleActive = useMemo(() => 
    selected || nodeEdges.some((e: Edge) => e.selected && (e.source === id || e.target === id)),
    [nodeEdges, id, selected]
  );

  return { isHandleActive, isAnyHandleActive, edges };
};

/**
 * Hook for node visual state: search highlighting, simulation state, and dim className.
 * Replaces identical logic in all 5 node components.
 */
interface NodeGroupRef {
  name?: string;
  [key: string]: unknown;
}

export const useNodeVisualState = (id: string, data: Record<string, unknown>) => {
  const searchQuery = useCanvasStore(state => state.searchQuery);
  const searchSelectedUsers = useCanvasStore(state => state.searchSelectedUsers);
  const isSimulating = useSimulationStore(state => state.isSimulating);
  const isActiveInSimulation = useSimulationStore(state => state.activeSimulationNodes.includes(id));
  const isViewMode = useCanvasStore(state => state.isViewMode);

  const allGroups = [...((data.editors as NodeGroupRef[]) || []), ...((data.readers as NodeGroupRef[]) || [])];

  const isSearchActive = searchQuery.trim().length > 0 || searchSelectedUsers.length > 0;

  // Default text matching — check label. Override in specific node if needed.
  const searchableLabel = (data.label as string) || '';
  const matchesText = !searchQuery.trim() || searchableLabel.toLowerCase().includes(searchQuery.toLowerCase());
  const matchesUser = searchSelectedUsers.length === 0 || allGroups.some((u: NodeGroupRef) => searchSelectedUsers.includes(u.name as string));
  const isMatch = isSearchActive && matchesText && matchesUser;

  return {
    isSearchActive,
    isMatch,
    isSimulating,
    isActiveInSimulation,
    isViewMode,
    allGroups,
  };
};

/**
 * Hook to manage handle rotation and auto-update internals.
 * Replaces identical useEffect + rotation logic in all 5 nodes.
 */
export const useNodeRotation = (id: string, rotation: number) => {
  const updateNodeInternals = useUpdateNodeInternals();
  const updateNode = useCanvasStore(state => state.updateNode);

  useEffect(() => {
    updateNodeInternals(id);
    
    // The node handles have a 200ms CSS transition.
    // Force React Flow to recalculate edge positions during and after the animation.
    const timeout1 = setTimeout(() => updateNodeInternals(id), 50);
    const timeout2 = setTimeout(() => updateNodeInternals(id), 100);
    const timeout3 = setTimeout(() => updateNodeInternals(id), 250);
    
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [rotation, updateNodeInternals, id]);

  const rotate = () => updateNode(id, { rotation: (rotation + 90) % 360 });

  return { rotate };
};
