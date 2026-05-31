import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { WorkspaceSwitcherDropdown } from '@/components/ui/WorkspaceSwitcherDropdown';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ReactFlow, type Node, type Edge, type NodeChange, Background, Panel, useReactFlow, useUpdateNodeInternals, ReactFlowProvider, Handle, Position, BaseEdge, EdgeLabelRenderer, getBezierPath, applyNodeChanges } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { pb, getRecordFileUrl, type WorkflowProcess } from '@/lib/pocketbase';
import { useAuthStore } from '@/store/authStore';
import { getLayoutedElements } from '@/lib/layout';
import { sanitizeForFilter } from '@/lib/parseUtils';
import { getRotatedHandlePosition } from '@/components/canvas/nodes/nodeUtils';
import { Network, Workflow, ExternalLink, RotateCw, Save, LayoutDashboard, ChevronRight, ArrowRightLeft, GitBranch } from 'lucide-react';
import { GryfSpinner } from '@/components/ui/GryfSpinner';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { useToastStore } from '@/store/toastStore';
import { LoadMoreButton } from '@/components/ui/LoadMoreButton';

type ProcessRecord = WorkflowProcess;

interface ProcessLink {
  sourceProcessId: string;
  sourceProcessName: string;
  targetProcessId: string;
  targetProcessName: string;
  targetNodeLabel?: string;
  linkType: 'subworkflow' | 'handoff';
}

// Handle styles — DRY: reuse --canvas-edge / --brand-color like main canvas handles
const inputHandleStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  background: 'hsl(var(--canvas-edge))',
  border: '2px solid hsl(var(--card))',
  boxShadow: '0 0 0 1px hsl(var(--canvas-edge) / 0.3)',
  opacity: 1,
  zIndex: 10,
};

const outputHandleStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  background: 'hsl(var(--card))',
  border: '2px solid hsl(var(--canvas-edge))',
  boxShadow: '0 0 0 1px hsl(var(--canvas-edge) / 0.3)',
  opacity: 1,
  zIndex: 10,
};

// Custom node with 2 rotatable handles (1 input + 1 output)
const ProcessMapNode = ({ data, id }: { data: { label: string; linkCount: number; processId: string; avatarUrl?: string; rotation?: number; onRotate?: () => void }, id: string }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const updateNodeInternals = useUpdateNodeInternals();
  const rotation = data.rotation || 0;

  useEffect(() => {
    updateNodeInternals(id);
  }, [rotation, updateNodeInternals, id]);

  // Compute rotated positions for the 2 handles
  const inputPos = getRotatedHandlePosition(Position.Left, rotation);
  const outputPos = getRotatedHandlePosition(Position.Right, rotation);

  return (
    <>
      {/* Input handle — filled (logical left → rotated) */}
      <Handle type="target" position={inputPos} id="left" style={inputHandleStyle} />
      <div 
        className="group bg-card border border-border/40 dark:border-white/5 hover:border-brand-gold dark:hover:border-brand-gold rounded-xl px-5 py-3 w-[260px] shadow-md transition-all duration-300 hover:shadow-glow hover:shadow-xl hover:scale-[1.02] pointer-events-auto relative"
      >
          {/* Rotation button — appears on hover, top-right corner */}
          <SimpleTooltip content={t('props.rotateHandles')} side="top">
            <div
              className="absolute -top-11 right-0 bg-card/90 backdrop-blur-md border border-border/60 dark:border-white/10 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] rounded-full p-1 flex items-center justify-center cursor-pointer hover:text-foreground hover:bg-secondary transition-all text-muted-foreground opacity-0 group-hover:opacity-100 z-20 pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                data.onRotate?.();
              }}
            >
              <div className="w-7 h-7 flex items-center justify-center rounded-full hover:text-brand-gold hover:bg-brand-gold/10 transition-all">
                <RotateCw size={14} strokeWidth={2.5} />
              </div>
            </div>
          </SimpleTooltip>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 flex items-center justify-center shrink-0 transition-colors overflow-hidden ${
              !data.avatarUrl ? 'rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20' : 'rounded-full border border-border/20'
            }`}>
              {data.avatarUrl ? (
                <img loading="lazy" src={data.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <Workflow size={18} className="text-purple-500" />
              )}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-semibold text-sm text-foreground truncate">{data.label}</span>
              {data.linkCount > 0 && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Network size={10} className="text-purple-400" />
                  {data.linkCount} {t('processMap.connections')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <SimpleTooltip content={t('props.openInThisTab')}>
                <button 
                  className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-brand-gold hover:bg-brand-gold/10 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/app/${data.processId}`);
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </SimpleTooltip>
              <SimpleTooltip content={t('props.openInNewTab')}>
                <button 
                  className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-brand-gold hover:bg-brand-gold/10 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`/app/${data.processId}`, '_blank');
                  }}
                >
                  <ExternalLink size={14} />
                </button>
              </SimpleTooltip>
            </div>
          </div>
        </div>
      {/* Output handle — outlined (logical right → rotated) */}
      <Handle type="source" position={outputPos} id="right" style={outputHandleStyle} />
    </>
  );
};

// Removed external definition, defined inline inside useMemo

// Compute best source/target handles based on relative node positions

// Custom edge to match the canvas HTML label exactly
const ProcessMapEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  style?: React.CSSProperties;
  markerEnd?: string;
  data?: { label?: string; fullLabel?: string; isSelected?: boolean; linkType?: string };
}) => {
  const { t } = useTranslation();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isSelected = data?.isSelected;
  const linkType = data?.linkType || 'handoff';

  // Preserve original dash pattern on selection — solid stays solid
  const mergedStyle = {
    ...style,
    ...(isSelected ? { stroke: 'hsl(var(--brand-color))', strokeWidth: 2.5 } : {}),
  };

  return (
    <>
      {/* Invisible wider path for easier click target */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: 'pointer' }}
      />
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={mergedStyle} id={id} />
      {/* Icon badge on the line — offset from label */}
      <EdgeLabelRenderer>
        {/* Type icon — positioned exactly at edge midpoint */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <SimpleTooltip content={
            linkType === 'subworkflow' ? t('processMap.linkSubworkflow') :
            t('processMap.linkHandoff')
          }>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shadow-md transition-colors ${
              isSelected ? 'bg-brand-gold shadow-glow' :
              'bg-purple-500 shadow-purple-500/30'
            }`}>
              {linkType === 'subworkflow' && <GitBranch size={10} className="text-white" />}
              {linkType === 'handoff' && <ArrowRightLeft size={10} className="text-white" />}
            </div>
          </SimpleTooltip>
        </div>
        {/* Target node label — positioned to the right of the icon */}
        {data?.label && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(0%, -50%) translate(${labelX + 16}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <SimpleTooltip content={data.fullLabel || data.label}>
              <div className={`rounded-full border px-2 py-0.5 flex items-center justify-center shrink-0 transition-colors cursor-default ${
                isSelected ? 'bg-brand-gold/10 border-brand-gold/50' :
                'bg-card border-border'
              }`}>
                <span className={`text-[10px] font-semibold truncate max-w-[80px] ${
                  isSelected ? 'text-brand-gold' : 'text-foreground'
                }`}>
                  {data.label}
                </span>
              </div>
            </SimpleTooltip>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
};

// Removed external definition, defined inline inside useMemo

// --- Layout persistence helpers ---
async function loadSavedPositions(workspaceId: string): Promise<Record<string, { x: number; y: number }>> {
  try {
    const records = await pb.collection('WORKFLOW_process_map_layouts').getList(1, 1, {
      filter: `workspace = '${sanitizeForFilter(workspaceId)}'`,
      requestKey: null,
    });
    if (records.items.length > 0) {
      const pos = records.items[0].positions;
      return typeof pos === 'string' ? JSON.parse(pos) : (pos || {});
    }
  } catch { /* collection may not exist yet */ }
  return {};
}

async function saveSavedPositions(workspaceId: string, positions: Record<string, { x: number; y: number }>) {
  try {
    const records = await pb.collection('WORKFLOW_process_map_layouts').getList(1, 1, {
      filter: `workspace = '${sanitizeForFilter(workspaceId)}'`,
      requestKey: null,
    });
    if (records.items.length > 0) {
      await pb.collection('WORKFLOW_process_map_layouts').update(records.items[0].id, {
        positions: JSON.stringify(positions),
      });
    } else {
      await pb.collection('WORKFLOW_process_map_layouts').create({
        workspace: workspaceId,
        positions: JSON.stringify(positions),
      });
    }
  } catch (err) {
    console.error('Error saving process map layout:', err);
    throw err;
  }
}

const nodeTypes = { processMapNode: ProcessMapNode };
const edgeTypes = { processMapEdge: ProcessMapEdge };

// Inner component that uses useReactFlow hooks (requires ReactFlowProvider)
const ProcessMapInner = () => {
  const { t } = useTranslation();
  const { activeWorkspace } = useAuthStore();
  const [processes, setProcesses] = useState<ProcessRecord[]>([]);
  const [links, setLinks] = useState<ProcessLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [savedPositions, setSavedPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [positionsLoaded, setPositionsLoaded] = useState(false);
  const [nodeRotations, setNodeRotations] = useState<Record<string, number>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const layoutVersionRef = useRef(0);
  const { zoomIn, zoomOut, fitView: rfFitView } = useReactFlow();

  // Rotate a node's handles by 90°
  const handleRotateNode = useCallback((nodeId: string) => {
    setNodeRotations(prev => {
      const current = prev[nodeId] || 0;
      return { ...prev, [nodeId]: (current + 90) % 360 };
    });
    setIsDirty(true);
  }, []);

  const fetchData = useCallback(async () => {
    if (!activeWorkspace) return;
    setIsLoading(true);
    try {
      // Load saved positions and process data in parallel
      const [records, loadedPositions] = await Promise.all([
        pb.collection('WORKFLOW_processes').getList(1, 50, {
          filter: `workspace = '${sanitizeForFilter(activeWorkspace.id)}'`,
          fields: 'id,name,nodes,avatar',
          requestKey: null,
        }),
        loadSavedPositions(activeWorkspace.id),
      ]);
      setProcesses(records.items as ProcessRecord[]);
      setPage(records.page);
      setTotalPages(records.totalPages);
      setSavedPositions(loadedPositions);
      // Restore saved rotations into nodeRotations state
      const restoredRotations: Record<string, number> = {};
      for (const [id, pos] of Object.entries(loadedPositions)) {
        const rot = (pos as { rotation?: number }).rotation;
        if (rot) restoredRotations[id] = rot;
      }
      if (Object.keys(restoredRotations).length > 0) {
        setNodeRotations(prev => ({ ...prev, ...restoredRotations }));
      }
      setPositionsLoaded(true);

      // Extract cross-workflow links
      const foundLinks: ProcessLink[] = [];
      const processNameMap: Record<string, string> = {};
      for (const proc of records.items) {
        processNameMap[proc.id] = proc.name || 'Unnamed';
      }

      for (const proc of records.items) {
        let nodes: { type?: string; data?: { targetWorkflowId?: string; targetNodeId?: string; targetNodeLabel?: string; targetWorkflowName?: string; actionTypes?: string[]; actionType?: string } }[] = [];
        if (typeof proc.nodes === 'string') {
          try { nodes = JSON.parse(proc.nodes as string); } catch { continue; }
        } else if (Array.isArray(proc.nodes)) {
          nodes = proc.nodes as typeof nodes;
        }
        for (const node of nodes) {
          if (node.data?.targetWorkflowId && node.data.targetWorkflowId !== proc.id) {
            const isSubworkflow = node.type === 'subworkflow';
            foundLinks.push({
              sourceProcessId: proc.id,
              sourceProcessName: processNameMap[proc.id],
              targetProcessId: node.data.targetWorkflowId,
              targetProcessName: processNameMap[node.data.targetWorkflowId] || node.data.targetWorkflowName || 'Unknown',
              targetNodeLabel: node.data.targetNodeLabel,
              linkType: isSubworkflow ? 'subworkflow' : 'handoff',
            });
          }
        }
      }
      setLinks(foundLinks);
    } catch (err) {
      console.error('Error fetching process map data:', err);
      useToastStore.getState().showToast(t('common.error'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace, t]);

  const handleLoadMore = useCallback(async () => {
    if (!activeWorkspace || page >= totalPages) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const records = await pb.collection('WORKFLOW_processes').getList(nextPage, 50, {
        filter: `workspace = '${sanitizeForFilter(activeWorkspace.id)}'`,
        fields: 'id,name,nodes,avatar',
        requestKey: null,
      });

      const newProcesses = records.items as ProcessRecord[];
      const allProcs = [...processes, ...newProcesses];
      
      // Extract cross-workflow links for the newly loaded items
      const newLinks: ProcessLink[] = [];
      const processNameMap: Record<string, string> = {};
      for (const proc of allProcs) {
        processNameMap[proc.id] = proc.name || 'Unnamed';
      }

      for (const proc of newProcesses) {
        let nodes: { type?: string; data?: { targetWorkflowId?: string; targetNodeId?: string; targetNodeLabel?: string; targetWorkflowName?: string; actionTypes?: string[]; actionType?: string } }[] = [];
        if (typeof proc.nodes === 'string') {
          try { nodes = JSON.parse(proc.nodes as string); } catch { continue; }
        } else if (Array.isArray(proc.nodes)) {
          nodes = proc.nodes as typeof nodes;
        }
        for (const node of nodes) {
          if (node.data?.targetWorkflowId && node.data.targetWorkflowId !== proc.id) {
            const isSubworkflow = node.type === 'subworkflow';
            newLinks.push({
              sourceProcessId: proc.id,
              sourceProcessName: processNameMap[proc.id],
              targetProcessId: node.data.targetWorkflowId,
              targetProcessName: processNameMap[node.data.targetWorkflowId] || node.data.targetWorkflowName || 'Unknown',
              targetNodeLabel: node.data.targetNodeLabel,
              linkType: isSubworkflow ? 'subworkflow' : 'handoff',
            });
          }
        }
      }
      
      setProcesses(prev => [...prev, ...newProcesses]);
      setLinks(prevLinks => [...prevLinks, ...newLinks]);
      
      setPage(records.page);
      setTotalPages(records.totalPages);
    } catch (err) {
      console.error('Error loading more processes:', err);
      useToastStore.getState().showToast(t('common.error'), 'error');
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeWorkspace, page, totalPages, processes, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build ReactFlow nodes and edges
  const { flowNodes, flowEdges } = useMemo(() => {
    if (processes.length === 0 || !positionsLoaded) return { flowNodes: [], flowEdges: [] };

    // Count links per process
    const linkCountMap: Record<string, number> = {};
    for (const link of links) {
      linkCountMap[link.sourceProcessId] = (linkCountMap[link.sourceProcessId] || 0) + 1;
      linkCountMap[link.targetProcessId] = (linkCountMap[link.targetProcessId] || 0) + 1;
    }

    const nodes: Node[] = processes.map((proc, idx) => ({
      id: proc.id,
      type: 'processMapNode',
      position: savedPositions[proc.id] || { x: (idx % 4) * 320, y: Math.floor(idx / 4) * 160 },
      data: {
        label: proc.name || 'Unnamed',
        linkCount: linkCountMap[proc.id] || 0,
        processId: proc.id,
        avatarUrl: proc.avatar ? getRecordFileUrl('WORKFLOW_processes', { id: proc.id }, proc.avatar, 200) : undefined,
        rotation: nodeRotations[proc.id] || 0,
        onRotate: () => handleRotateNode(proc.id),
      },
    }));

    // Deduplicate edges (same source-target pair)
    const edgeSet = new Set<string>();
    const rawEdges: { link: ProcessLink; edgeId: string }[] = [];
    for (const link of links) {
      const key = `${link.sourceProcessId}->${link.targetProcessId}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      rawEdges.push({ link, edgeId: `pm-${link.sourceProcessId}-${link.targetProcessId}` });
    }

    // Smart layout: separate connected and disconnected nodes
    const connectedIds = new Set<string>();
    for (const link of links) {
      connectedIds.add(link.sourceProcessId);
      connectedIds.add(link.targetProcessId);
    }

    const connectedNodes = nodes.filter(n => connectedIds.has(n.id));
    const disconnectedNodes = nodes.filter(n => !connectedIds.has(n.id));

    // Check if we have saved positions for connected nodes
    const allConnectedHaveSavedPos = connectedNodes.length > 0 && connectedNodes.every(n => !!savedPositions[n.id]);

    let layoutedConnected: Node[] = connectedNodes;

    // Only run dagre if we don't have saved positions for connected nodes
    if (!allConnectedHaveSavedPos && connectedNodes.length > 0 && rawEdges.length > 0) {
      // Build temp edges for dagre (simple left→right)
      const tempEdges: Edge[] = rawEdges.map(({ link, edgeId }) => ({
        id: edgeId,
        source: link.sourceProcessId,
        target: link.targetProcessId,
        type: 'processMapEdge',
      }));
      try {
        const result = getLayoutedElements(connectedNodes, tempEdges, 'LR');
        layoutedConnected = result.nodes;
      } catch { /* fallback positions */ }
    }

    // Build final edges — always connect right (source) → left (target)
    // DRY: Read CSS variables once — matches main canvas edge/brand styling
    const edgeColor = 'hsl(var(--canvas-edge))';
    const brandColor = 'hsl(var(--brand-color))';

    const edges: Edge[] = rawEdges.map(({ link, edgeId }) => {
      const isSelected = selectedEdgeId === edgeId;
      const linkStyles: Record<string, { color: string; dash: string; width: number }> = {
        subworkflow: { color: edgeColor, dash: '0', width: 2 },    // solid, brand-colored
        handoff:     { color: edgeColor, dash: '8, 4', width: 2 },  // dashed, brand-colored
      };
      const ls = linkStyles[link.linkType] || linkStyles.handoff;
      return {
        id: edgeId,
        source: link.sourceProcessId,
        target: link.targetProcessId,
        sourceHandle: 'right',
        targetHandle: 'left',
        type: 'processMapEdge',
        animated: link.linkType !== 'subworkflow',
        style: {
          stroke: isSelected ? brandColor : ls.color,
          strokeWidth: isSelected ? 2.5 : ls.width,
          strokeDasharray: ls.dash,
          cursor: 'pointer',
        },
        data: {
          label: link.targetNodeLabel ? (link.targetNodeLabel.length > 15 ? link.targetNodeLabel.substring(0, 12) + '...' : link.targetNodeLabel) : '',
          fullLabel: link.targetNodeLabel || '',
          isSelected,
          linkType: link.linkType,
        },
      };
    });

    // Find the bounding box of connected nodes to place grid below
    let maxY = 0;
    for (const n of layoutedConnected) {
      if (n.position.y + 80 > maxY) maxY = n.position.y + 80;
    }
    const gridStartY = connectedNodes.length > 0 ? maxY + 120 : 0;

    // Arrange disconnected nodes — use saved pos or compact grid
    const cols = 4;
    const colWidth = 300;
    const rowHeight = 90;
    const layoutedDisconnected = disconnectedNodes.map((n, idx) => ({
      ...n,
      position: savedPositions[n.id] || { x: (idx % cols) * colWidth, y: gridStartY + Math.floor(idx / cols) * rowHeight },
    }));

    return { flowNodes: [...layoutedConnected, ...layoutedDisconnected], flowEdges: edges };
  }, [processes, links, selectedEdgeId, savedPositions, positionsLoaded, handleRotateNode, nodeRotations]);

  // Local draggable node state
  const [displayNodes, setDisplayNodes] = useState<Node[]>([]);

  useEffect(() => {
    // If layout was reset, we just replace entirely
    if (layoutVersionRef.current !== layoutVersion) {
      layoutVersionRef.current = layoutVersion;
      setDisplayNodes(flowNodes);
      return;
    }

    setDisplayNodes(prev => {
      // If node set changed (different IDs), full replace
      const prevIds = new Set(prev.map(n => n.id));
      const newIds = new Set(flowNodes.map(n => n.id));
      
      if (prev.length === 0 || prevIds.size !== newIds.size || [...newIds].some(id => !prevIds.has(id))) {
        return flowNodes;
      }
      // Otherwise merge: keep dragged positions, update data (rotation, etc.)
      const flowMap = new Map(flowNodes.map(n => [n.id, n]));
      return prev.map(n => {
        const updated = flowMap.get(n.id);
        if (!updated) return n;
        return { ...n, data: updated.data };
      });
    });
  }, [flowNodes, layoutVersion]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setDisplayNodes(nds => applyNodeChanges(changes, nds));
  }, []);

  // Mark layout as dirty on drag (no auto-save)
  const handleNodeDragStop = useCallback(() => {
    setIsDirty(true);
  }, []);

  // Explicit save — user clicks Save button (positions + rotations)
  const handleSaveLayout = useCallback(async () => {
    if (!activeWorkspace) return;
    setIsSaving(true);
    try {
      const positions: Record<string, { x: number; y: number; rotation?: number }> = {};
      for (const n of displayNodes) {
        positions[n.id] = { 
          x: Math.round(n.position.x), 
          y: Math.round(n.position.y),
          ...(nodeRotations[n.id] ? { rotation: nodeRotations[n.id] } : {}),
        };
      }
      setSavedPositions(positions);
      await saveSavedPositions(activeWorkspace.id, positions);
      setIsDirty(false);
    } catch {
      useToastStore.getState().showToast(t('common.error'), 'error');
    } finally {
      setIsSaving(false);
    }
  }, [activeWorkspace, displayNodes, nodeRotations, t]);

  // Reset layout — clear saved positions and re-dagre
  const handleResetLayout = useCallback(async () => {
    if (!activeWorkspace) return;
    setSavedPositions({});
    setNodeRotations({});
    setPositionsLoaded(true); // trigger re-compute with empty positions
    setLayoutVersion(v => v + 1);
    setIsDirty(false);
    try {
      // Delete saved layout from DB
      const records = await pb.collection('WORKFLOW_process_map_layouts').getList(1, 1, {
        filter: `workspace = '${sanitizeForFilter(activeWorkspace.id)}'`,
        requestKey: null,
      });
      if (records.items.length > 0) {
        await pb.collection('WORKFLOW_process_map_layouts').delete(records.items[0].id);
      }
    } catch { /* ignore */ }
    // Fit view after layout reset
    setTimeout(() => rfFitView({ duration: 800 }), 100);
  }, [activeWorkspace, rfFitView]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <GryfSpinner size={40} label={t('common.loading')} />
      </div>
    );
  }

  if (processes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center">
            <Network size={32} className="text-purple-500" />
          </div>
          <h3 className="font-semibold text-foreground">{t('processMap.noProcesses')}</h3>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* No-links overlay */}
      {links.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="flex flex-col items-center gap-3 text-center p-8 bg-card/90 backdrop-blur rounded-2xl border border-border shadow-lg pointer-events-auto">
            <Network size={40} className="text-muted-foreground" />
            <h3 className="font-semibold text-foreground">{t('processMap.noLinks')}</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {t('processMap.subtitle')}
            </p>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={displayNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        onEdgeClick={(_event, edge) => {
          setSelectedEdgeId(prev => prev === edge.id ? null : edge.id);
        }}
        onPaneClick={() => setSelectedEdgeId(null)}
        zoomOnScroll
        panOnScroll={false}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        {/* Same background as GryfCanvas (DRY) */}
        <Background gap={24} size={2} color="hsl(var(--muted-foreground))" className="opacity-10" />

        {/* Zoom controls — same style as GryfCanvas bottom-right panel (DRY) */}
        <Panel position="bottom-right" className="mb-6 mr-6">
          <div className="bg-card p-2 rounded-full shadow-lg border border-border flex gap-1 pointer-events-auto">
            <SimpleTooltip content={t('canvas.zoomIn')}>
              <button 
                onClick={() => zoomIn()}
                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors"
              >
                +
              </button>
            </SimpleTooltip>
            <SimpleTooltip content={t('canvas.zoomOut')}>
              <button 
                onClick={() => zoomOut()}
                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors"
              >
                -
              </button>
            </SimpleTooltip>
            <SimpleTooltip content={t('canvas.fitView')}>
              <button 
                onClick={() => rfFitView({ duration: 800 })}
                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14v6h6M20 10V4h-6M10 20H4v-6M14 4h6v6"/></svg>
              </button>
            </SimpleTooltip>
          </div>
        </Panel>

        {/* Unified Top Bar (styled like project editor nav bar) */}
        <Panel position="top-center" className="mt-4 sm:mt-6 z-50">
          <div className="flex items-center gap-2 sm:gap-3 bg-surface-nav px-3 sm:px-4 py-2 rounded-full border border-transparent dark:border-border shadow-xl max-w-[calc(100vw-2rem)] pointer-events-auto">
            <div className="flex items-center gap-2 px-1">
              <Network size={16} className="text-purple-500 hidden sm:block" />
              <h2 className="text-sm font-bold text-foreground whitespace-nowrap hidden sm:block">{t('processMap.title')}</h2>
              <div className="w-px h-4 bg-secondary mx-1 hidden sm:block" />
              <WorkspaceSwitcherDropdown />
            </div>
            
            <div className="w-px h-5 bg-secondary shrink-0" />
            
            <div className="flex items-center gap-3 px-1">
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                {processes.length} {t('processMap.processes')}
              </span>
              <span className="text-xs font-semibold text-brand-gold whitespace-nowrap">
                {links.length} {t('processMap.connections')}
              </span>
            </div>

            <div className="w-px h-5 bg-secondary shrink-0" />

            <SimpleTooltip content={t('processMap.resetLayout')}>
              <button 
                onClick={handleResetLayout}
                className="w-8 h-8 rounded-full flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-secondary transition-colors shrink-0"
              >
                <LayoutDashboard size={14} />
              </button>
            </SimpleTooltip>

            <SimpleTooltip content={t('processMap.saveLayout')}>
              <button 
                onClick={handleSaveLayout}
                disabled={isSaving || !isDirty}
                className="flex items-center gap-1.5 text-xs font-bold bg-brand-gold text-background px-3 py-1.5 rounded-full hover:bg-brand-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <Save size={14} />
                {isSaving ? t('common.saving') : t('common.save')}
              </button>
            </SimpleTooltip>
          </div>
        </Panel>

        {page < totalPages && (
          <Panel position="bottom-center" className="mb-6 z-50">
            <LoadMoreButton
              onClick={handleLoadMore}
              isLoading={isLoadingMore}
              label={t('common.loadMoreProcesses')}
              className="bg-brand-gold text-background hover:bg-brand-gold/90 shadow-xl border-none"
            />
          </Panel>
        )}
      </ReactFlow>
    </>
  );
};

// Wrapper with ReactFlowProvider so we can use useReactFlow hooks
export const ProcessMapTab = () => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      <ReactFlowProvider>
        <ProcessMapInner />
      </ReactFlowProvider>
    </div>
  );
};
