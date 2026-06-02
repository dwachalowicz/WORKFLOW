import { create } from 'zustand';
export interface RadialMenuConfig {
  isOpen: boolean;
  x: number;
  y: number;
  contextNodeId?: string | null;
}

interface UiState {
  radialMenuConfig: RadialMenuConfig;
  isPropertiesPanelCollapsed: boolean;
  propertiesPanelHighlightTrigger: number;
  isProcessListModalOpen: boolean;
  isTutorialActive: boolean;

  isSearchPanelOpen: boolean;
  isStatsPanelOpen: boolean;
  isAiPanelOpen: boolean;
  isChecklistPanelOpen: boolean;
  isFirstDashboardMount: boolean;

  setRadialMenuConfig: (config: RadialMenuConfig) => void;
  setPropertiesPanelCollapsed: (collapsed: boolean) => void;
  setTutorialActive: (active: boolean) => void;
  highlightPropertiesPanel: () => void;
  setProcessListModalOpen: (isOpen: boolean) => void;

  setSearchPanelOpen: (isOpen: boolean) => void;
  setStatsPanelOpen: (isOpen: boolean) => void;
  setAiPanelOpen: (isOpen: boolean) => void;
  setChecklistPanelOpen: (isOpen: boolean) => void;
  setFirstDashboardMount: (isFirst: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  radialMenuConfig: { isOpen: false, x: 0, y: 0, contextNodeId: null },
  isPropertiesPanelCollapsed: false,
  propertiesPanelHighlightTrigger: 0,
  isProcessListModalOpen: false,
  isTutorialActive: false,

  isSearchPanelOpen: false,
  isStatsPanelOpen: false,
  isAiPanelOpen: false,
  isChecklistPanelOpen: false,
  isFirstDashboardMount: true,

  setRadialMenuConfig: (config) => set({ radialMenuConfig: config }),
  setPropertiesPanelCollapsed: (collapsed) => set({ isPropertiesPanelCollapsed: collapsed }),
  setTutorialActive: (active) => set({ isTutorialActive: active }),
  highlightPropertiesPanel: () => set((state) => ({ propertiesPanelHighlightTrigger: state.propertiesPanelHighlightTrigger + 1 })),
  setProcessListModalOpen: (isOpen) => set({ isProcessListModalOpen: isOpen }),

  setSearchPanelOpen: (isOpen) => set({ isSearchPanelOpen: isOpen }),
  setStatsPanelOpen: (isOpen) => set({ isStatsPanelOpen: isOpen }),
  setAiPanelOpen: (isOpen) => set({ isAiPanelOpen: isOpen }),
  setChecklistPanelOpen: (isOpen) => set({ isChecklistPanelOpen: isOpen }),
  setFirstDashboardMount: (isFirst) => set({ isFirstDashboardMount: isFirst }),
}));
