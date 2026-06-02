import { useTranslation } from 'react-i18next';
import { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Panel,
  ConnectionMode,
  useReactFlow,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Edge,
  reconnectEdge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { SimpleNode } from './nodes/SimpleNode';

import { StartStopNode } from './nodes/StartStopNode';
import { DatabaseNode } from './nodes/DatabaseNode';
import { SubworkflowNode } from './nodes/SubworkflowNode';
import { NoteNode } from './nodes/NoteNode';
import { CustomEdge } from './edges/CustomEdge';
import { useStore } from 'zustand';
import { RadialMenu } from '@/components/ui/RadialMenu';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { useCanvasStore } from "@/store/canvasStore";
import { useUiStore } from "@/store/uiStore";

const nodeTypes = {
  simple: SimpleNode,
  startstop: StartStopNode,
  database: DatabaseNode,
  subworkflow: SubworkflowNode,
  note: NoteNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

const generateSafeId = () => {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().slice(0, 9)
    : Math.random().toString(36).substring(2, 11);
};

export const GryfCanvas = () => {
  const { t } = useTranslation();
  // Use bound store state
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const storeOnNodesChange = useCanvasStore((state) => state.onNodesChange);
  const storeOnEdgesChange = useCanvasStore((state) => state.onEdgesChange);
  const onConnect = useCanvasStore((state) => state.onConnect);
  const addNode = useCanvasStore((state) => state.addNode);
  const isViewMode = useCanvasStore((state) => state.isViewMode);

  // Radial Menu State
  const menuConfig = useUiStore((state) => state.radialMenuConfig);
  const setMenuConfig = useUiStore((state) => state.setRadialMenuConfig);

  // Undo/Redo from zundo temporal store
  const { undo, redo } = useStore(useCanvasStore.temporal);
  const canUndo = useStore(useCanvasStore.temporal, s => s.pastStates.length > 0);
  const canRedo = useStore(useCanvasStore.temporal, s => s.futureStates.length > 0);

  // Prevent undo stack pollution by ignoring dimension, selection, and drag changes
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    // In view mode, only allow select and dimension changes (no position/remove/add)
    if (isViewMode) {
      const allowed = changes.filter(c => c.type === 'dimensions' || c.type === 'select');
      if (allowed.length === 0) return;
      useCanvasStore.temporal.getState().pause();
      storeOnNodesChange(allowed);
      useCanvasStore.temporal.getState().resume();
      return;
    }

    const isEphemeral = changes.every(c => 
      c.type === 'dimensions' || 
      c.type === 'select' || 
      (c.type === 'position' && c.dragging)
    );
    
    if (isEphemeral) {
      useCanvasStore.temporal.getState().pause();
    }
    
    storeOnNodesChange(changes);
    
    if (isEphemeral) {
      useCanvasStore.temporal.getState().resume();
    }
  }, [storeOnNodesChange, isViewMode]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    // In view mode, only allow select changes
    if (isViewMode) {
      const allowed = changes.filter(c => c.type === 'select');
      if (allowed.length === 0) return;
      useCanvasStore.temporal.getState().pause();
      storeOnEdgesChange(allowed);
      useCanvasStore.temporal.getState().resume();
      return;
    }

    const isEphemeral = changes.every(c => c.type === 'select');
    
    if (isEphemeral) {
      useCanvasStore.temporal.getState().pause();
    }
    
    storeOnEdgesChange(changes);
    
    if (isEphemeral) {
      useCanvasStore.temporal.getState().resume();
    }
  }, [storeOnEdgesChange, isViewMode]);

  const { screenToFlowPosition, deleteElements, setNodes, setEdges, zoomIn, zoomOut, fitView: rfFitView } = useReactFlow();

  // Global Keyboard Shortcuts
  useEffect(() => {
    if (isViewMode) return; // No keyboard shortcuts in view mode
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedNodes = useCanvasStore.getState().nodes.filter(n => n.selected && n.data?.type !== 'start');
        const selectedEdges = useCanvasStore.getState().edges.filter(e => e.selected);
        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          e.preventDefault();
          deleteElements({ nodes: selectedNodes, edges: selectedEdges });
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, isViewMode, deleteElements]);


  // Listen for note creation from FloatingNavBar (outside ReactFlowProvider)
  useEffect(() => {
    if (isViewMode) return;
    const handleAddNote = (e: Event) => {
      const { screenX, screenY } = (e as CustomEvent).detail;
      const flowPos = screenToFlowPosition({ x: screenX, y: screenY });
      addNode({
        id: `note-${generateSafeId()}`,
        type: 'note',
        position: flowPos,
        data: { text: '' }
      });
    };
    window.addEventListener('addNoteFromNav', handleAddNote);
    return () => window.removeEventListener('addNoteFromNav', handleAddNote);
  }, [isViewMode, screenToFlowPosition, addNode]);

  const onPaneClick = useCallback(() => {
    window.dispatchEvent(new CustomEvent('collapseAllNodes'));
  }, []);

  const onNodeClick = useCallback(() => {
    if (useCanvasStore.getState().isVersionModalOpen) {
      useCanvasStore.getState().setVersionModalOpen(false);
    }
  }, []);

  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    if (isViewMode) return; // No radial menu in view mode
    setMenuConfig({
      isOpen: true,
      x: event.clientX,
      y: event.clientY
    });
  }, [isViewMode, setMenuConfig]);

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: import('@xyflow/react').Node) => {
    event.preventDefault();
    if (isViewMode) return; // No context menu in view mode
    
    // Auto-select the node when right-clicked
    setNodes(nodes => nodes.map(n => ({
      ...n,
      selected: n.id === node.id
    })));
    
    // Deselect edges
    setEdges(edges => edges.map(e => ({
      ...e,
      selected: false
    })));

    setMenuConfig({
      isOpen: true,
      x: event.clientX,
      y: event.clientY,
      contextNodeId: node.id
    });
  }, [setMenuConfig, setNodes, setEdges, isViewMode]);

  // Helper: generate next unique name for a given base among existing node labels
  const getNextUniqueName = useCallback((baseName: string) => {
    const currentNodes = useCanvasStore.getState().nodes;
    const existingLabels = new Set(currentNodes.map(n => n.data?.label).filter(Boolean));
    let num = 1;
    while (existingLabels.has(`${baseName} ${num}`)) {
      num++;
    }
    return `${baseName} ${num}`;
  }, []);

  const handleRadialMenuAction = useCallback((action: string) => {
    // Generate a random ID
    const newId = `node-${generateSafeId()}`;
    
    // Convert screen click coordinates to flow coordinates
    const flowPosition = screenToFlowPosition({ x: menuConfig.x, y: menuConfig.y });
    
    // Add offset so the node doesn't spawn exactly under the cursor, adjusted to avoid overlap
    const spawnPosition = { x: flowPosition.x + 40, y: flowPosition.y - 80 };

    switch(action) {
      case 'copy': {
        const nodeToCopy = useCanvasStore.getState().nodes.find(n => n.id === menuConfig.contextNodeId) 
          || useCanvasStore.getState().nodes.find(n => n.selected);
        
        if (nodeToCopy) {
          const copyLabel = nodeToCopy.data?.label ? getNextUniqueName(nodeToCopy.data.label as string) : undefined;
          addNode({
            ...nodeToCopy,
            id: newId,
            selected: true,
            position: spawnPosition,
            data: { ...structuredClone(nodeToCopy.data), ...(copyLabel ? { label: copyLabel } : {}) }
          });
        }
        break;
      }
      case 'add_task':
        addNode({
          id: newId,
          type: 'simple',
          position: spawnPosition,
          data: {
            label: getNextUniqueName(t('defaults.newStage')),
            description: '',
            editors: [],
            readers: []
          }
        });
        break;
      case 'add_subworkflow':
        addNode({
          id: newId,
          type: 'subworkflow',
          position: spawnPosition,
          data: {
            label: getNextUniqueName(t('defaults.otherWorkflow')),
            targetWorkflowId: null,
            targetWorkflowName: ''
          }
        });
        break;
      case 'add_stop':
        addNode({
          id: newId,
          type: 'startstop',
          position: spawnPosition,
          data: {
            label: getNextUniqueName(t('defaults.stop')),
            type: 'stop'
          }
        });
        break;
      case 'add_database':
        addNode({
          id: newId,
          type: 'database',
          position: spawnPosition,
          data: {
            label: getNextUniqueName(t('nodes.database'))
          }
        });
        break;
      case 'delete': {
        const targetNodeId = menuConfig.contextNodeId;
        if (targetNodeId) {
          const targetNode = useCanvasStore.getState().nodes.find(n => n.id === targetNodeId);
          if (targetNode && targetNode.data?.type !== 'start') {
            deleteElements({ nodes: [targetNode] });
          }
        } else {
          const selectedNodes = useCanvasStore.getState().nodes.filter(n => n.selected && n.data?.type !== 'start');
          const selectedEdges = useCanvasStore.getState().edges.filter(e => e.selected);
          deleteElements({ nodes: selectedNodes, edges: selectedEdges });
        }
        break;
      }
    }
  }, [menuConfig, addNode, screenToFlowPosition, deleteElements, getNextUniqueName, t]);

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      // Validate the new connection before reconnecting
      if (newConnection.source === newConnection.target) return;
      if (!isValidConnection(newConnection)) return;
      setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
    },
    [setEdges, isValidConnection]
  );

  const isValidConnection = useCallback((connection: Connection) => {
    // Prevent self-connections
    if (connection.source === connection.target) return false;

    return true;
  }, []);

  return (
    <div className="flex-1 h-full w-full relative" style={{ touchAction: 'none' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={isViewMode ? undefined : onConnect}
        onReconnect={isViewMode ? undefined : onReconnect}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'custom' }}
        proOptions={{ hideAttribution: true }}
        onDragOver={undefined}
        onDrop={undefined}
        onPaneClick={onPaneClick}
        onNodeClick={onNodeClick}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        connectionMode={ConnectionMode.Strict}
        nodesDraggable={!isViewMode}
        nodesConnectable={!isViewMode}
        multiSelectionKeyCode="Shift"
        selectionOnDrag={false}
        panOnDrag
        zoomOnPinch
        preventScrolling
        fitView
      >
        <Background gap={24} size={2} color="hsl(var(--muted-foreground))" className="opacity-10" />
        
        {/* Canvas Toolbar / Panel - Moved to bottom right */}
        <Panel position="bottom-right" className="mb-20 md:mb-6 mr-6 tour-bottom-controls">
          <div className="bg-card p-2 rounded-full shadow-lg border border-border flex gap-2 pointer-events-auto">
            <div className="flex gap-1">
              <SimpleTooltip content={t('canvas.zoomIn')}>
                <button 
                  onClick={() => zoomIn()}
                  aria-label={t('canvas.zoomIn')}
                  className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors"
                >
                  +
                </button>
              </SimpleTooltip>
              <SimpleTooltip content={t('canvas.zoomOut')}>
                <button 
                  onClick={() => zoomOut()}
                  aria-label={t('canvas.zoomOut')}
                  className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors"
                >
                  -
                </button>
              </SimpleTooltip>
              <SimpleTooltip content={t('canvas.fitView')}>
                <button 
                  onClick={() => rfFitView({ duration: 800 })}
                  aria-label={t('canvas.fitView')}
                  className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14v6h6M20 10V4h-6M10 20H4v-6M14 4h6v6"/></svg>
                </button>
              </SimpleTooltip>
            </div>
            
            {!isViewMode && (
              <>
                <div className="w-px bg-secondary mx-1 self-stretch my-1"></div>
                
                <div className="flex gap-1">
                  <SimpleTooltip content={t('canvas.undoTooltip')}>
                    <button 
                      onClick={() => undo()}
                      disabled={!canUndo}
                      className="px-3 py-1.5 text-xs font-medium rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      {t('canvas.undo')}
                    </button>
                  </SimpleTooltip>
                  <SimpleTooltip content={t('canvas.redo')}>
                    <button 
                      onClick={() => redo()}
                      disabled={!canRedo}
                      className="px-3 py-1.5 text-xs font-medium rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      {t('canvas.redoLabel')}
                    </button>
                  </SimpleTooltip>
                </div>
              </>
            )}
          </div>
        </Panel>

        {/* Radial Menu - hidden in view mode */}
        {!isViewMode && (() => {
          const contextNode = nodes.find(n => n.id === menuConfig.contextNodeId);
          const isStartNode = contextNode?.data?.type === 'start';
          return (
            <RadialMenu 
              x={menuConfig.x} 
              y={menuConfig.y} 
              isOpen={menuConfig.isOpen} 
              onClose={() => setMenuConfig({ ...menuConfig, isOpen: false })}
              onAction={handleRadialMenuAction}
              hasContextNode={!!menuConfig.contextNodeId}
              isStartNode={isStartNode}
            />
          );
        })()}
      </ReactFlow>
    </div>
  );
};
