import { useEffect, useCallback, useMemo } from 'react';
import { useUpdateNodeInternals, type Edge } from '@xyflow/react';
import { useCanvasStore } from "@/store/canvasStore";
import { useUiStore } from "@/store/uiStore";
import { useSimulationStore } from "@/store/simulationStore";

/**
 * Hook to check if a specific handle is visually active (selected node or selected edge).
 * Replaces 5 identical inline implementations across all node components.
 */
export const useHandleActive = (id: string, selected: boolean) => {
  const edges = useCanvasStore(state => state.edges);

  const isHandleActive = useCallback((handleId: string | null | undefined, type: 'source' | 'target') => {
    if (selected) return true;
    return edges.some(e => {
      if (!e.selected) return false;
      if (type === 'source') {
        return e.source === id && (!e.sourceHandle || e.sourceHandle === handleId);
      } else {
        return e.target === id && (!e.targetHandle || e.targetHandle === handleId);
      }
    });
  }, [edges, id, selected]);

  const isAnyHandleActive = useMemo(() => 
    selected || edges.some((e: Edge) => e.selected && (e.source === id || e.target === id)),
    [edges, id, selected]
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
  const searchQuery = useUiStore(state => state.searchQuery);
  const searchSelectedUsers = useUiStore(state => state.searchSelectedUsers);
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
