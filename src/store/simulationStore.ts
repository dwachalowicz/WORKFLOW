import { create } from 'zustand';
import type { Edge } from '@xyflow/react';

interface SimulationHistoryEntry {
  nodeId: string;
  edgeId: string | null;
}

interface SimulationState {
  isSimulating: boolean;
  simulationHistory: SimulationHistoryEntry[];
  simulationCurrentNodeId: string | null;
  simulationPendingChoices: Edge[];
  activeSimulationNodes: string[];
  activeSimulationEdges: string[];

  toggleSimulation: (firstStartId: string | null) => void;
  nextSimulationStep: (getOutgoingValidEdges: (nodeId: string) => Edge[]) => void;
  prevSimulationStep: () => void;
  makeSimulationChoice: (edge: Edge) => void;
  resetSimulation: (firstStartId: string | null) => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  isSimulating: false,
  simulationHistory: [],
  simulationCurrentNodeId: null,
  simulationPendingChoices: [],
  activeSimulationNodes: [],
  activeSimulationEdges: [],

  toggleSimulation: (firstStartId: string | null) => {
    const isSimulating = !get().isSimulating;
    if (isSimulating) {
      set({ 
        isSimulating: true, 
        simulationHistory: [], 
        simulationCurrentNodeId: firstStartId,
        simulationPendingChoices: [],
        activeSimulationNodes: firstStartId ? [firstStartId] : [],
        activeSimulationEdges: []
      });
    } else {
      set({ 
        isSimulating: false, 
        simulationHistory: [], 
        simulationCurrentNodeId: null,
        simulationPendingChoices: [],
        activeSimulationNodes: [],
        activeSimulationEdges: []
      });
    }
  },

  nextSimulationStep: (getOutgoingValidEdges: (nodeId: string) => Edge[]) => {
    const { simulationCurrentNodeId, simulationHistory, simulationPendingChoices } = get();
    if (!simulationCurrentNodeId || simulationPendingChoices.length > 0) return;

    const validEdges = getOutgoingValidEdges(simulationCurrentNodeId);

    if (validEdges.length === 0) {
      return;
    }

    if (validEdges.length === 1) {
      const edge = validEdges[0];
      const newHistory = [...simulationHistory, { nodeId: simulationCurrentNodeId, edgeId: edge.id }];
      set({
        simulationHistory: newHistory,
        simulationCurrentNodeId: edge.target,
        activeSimulationNodes: [edge.target],
        activeSimulationEdges: [edge.id],
        simulationPendingChoices: []
      });
    } else {
      set({
        simulationPendingChoices: validEdges,
        activeSimulationEdges: validEdges.map(e => e.id)
      });
    }
  },

  makeSimulationChoice: (edge: Edge) => {
    const { simulationCurrentNodeId, simulationHistory } = get();
    if (!simulationCurrentNodeId) return;

    const newHistory = [...simulationHistory, { nodeId: simulationCurrentNodeId, edgeId: edge.id }];
    set({
      simulationHistory: newHistory,
      simulationCurrentNodeId: edge.target,
      activeSimulationNodes: [edge.target],
      activeSimulationEdges: [edge.id],
      simulationPendingChoices: []
    });
  },

  prevSimulationStep: () => {
    const { simulationHistory, simulationPendingChoices } = get();
    if (simulationPendingChoices.length > 0) {
      set({ 
        simulationPendingChoices: [],
        activeSimulationEdges: simulationHistory.length > 0 ? [simulationHistory[simulationHistory.length - 1].edgeId!] : []
      });
      return;
    }
    if (simulationHistory.length > 0) {
      const newHistory = [...simulationHistory];
      const prev = newHistory.pop()!;
      const prevActiveEdge = newHistory.length > 0 ? newHistory[newHistory.length - 1].edgeId : null;
      set({
        simulationHistory: newHistory,
        simulationCurrentNodeId: prev.nodeId,
        activeSimulationNodes: [prev.nodeId],
        activeSimulationEdges: prevActiveEdge ? [prevActiveEdge] : [],
        simulationPendingChoices: []
      });
    }
  },

  resetSimulation: (firstStartId: string | null) => {
    set({ 
      simulationHistory: [], 
      simulationCurrentNodeId: firstStartId,
      simulationPendingChoices: [],
      activeSimulationNodes: firstStartId ? [firstStartId] : [],
      activeSimulationEdges: []
    });
  }
}));
