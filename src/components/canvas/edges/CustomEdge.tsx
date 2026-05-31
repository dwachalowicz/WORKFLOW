import { memo, useCallback, useMemo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow, useStore as useReactFlowStore } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import { Trash2, Eye, Save, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InlineTooltip } from '@/components/ui/tooltip';
import { GroupAvatar } from '@/components/ui/GroupAvatar';
import { useTranslation } from 'react-i18next';
import { useCanvasStore } from "@/store/canvasStore";
import { useUiStore } from "@/store/uiStore";
import { useSimulationStore } from "@/store/simulationStore";

export const CustomEdge = memo(({
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
  selected,
  label,
  source,
  target
}: EdgeProps) => {
  const { setEdges } = useReactFlow();
  const { t } = useTranslation();
  const sourceNode = useCanvasStore(state => state.nodes.find(n => n.id === source));
  const targetNode = useCanvasStore(state => state.nodes.find(n => n.id === target));
  const searchQuery = useUiStore(state => state.searchQuery);
  const searchSelectedUsers = useUiStore(state => state.searchSelectedUsers);
  const isDataEdge = sourceNode?.type === 'database' || targetNode?.type === 'database';
  const isDbHandleEdge = data?.dbOperation !== undefined; // New DB handle system
  const dbOperation: string = (data?.dbOperation as string) || 'read';
  const isSubworkflowEdge = targetNode?.type === 'subworkflow';
  const [edgePath, baseLabelX, baseLabelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Handle multiple edges between the same nodes to prevent badge overlap
  // Memoized and subscribed ONLY to parallel edges to prevent global re-renders
  const parallelData = useReactFlowStore(useCallback((s) => {
    const parallelEdges = s.edges
      .filter(e => (e.source === source && e.target === target) || (e.source === target && e.target === source))
      .sort((a, b) => a.id.localeCompare(b.id));
    const idx = parallelEdges.findIndex(e => e.id === id);
    return `${idx}_${parallelEdges.length}`; // Primitive string avoids unnecessary re-renders
  }, [source, target, id]));

  const [edgeIndex, totalParallel] = useMemo(() => parallelData.split('_').map(Number), [parallelData]);

  let labelXOffset = 0;
  let labelYOffset = 0;

  if (totalParallel > 1) {
    const relativeIndex = edgeIndex - (totalParallel - 1) / 2;
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    
    // Perpendicular vector
    const nx = -dy / len;
    const ny = dx / len;
    
    // 40px separation between badges
    const offsetMagnitude = relativeIndex * 40;
    
    labelXOffset = nx * offsetMagnitude;
    labelYOffset = ny * offsetMagnitude;
  }

  const labelX = baseLabelX + labelXOffset;
  const labelY = baseLabelY + labelYOffset;

  const allDecisionMakers = data?.decisionMakers || [];
  const decisionMakers = allDecisionMakers.filter((dm: Record<string, unknown>, index: number, self: Record<string, unknown>[]) =>
    index === self.findIndex((t: Record<string, unknown>) => t.name === dm.name)
  );
  const labelText = (label as string) || (data?.label as string) || (data?.customText as string);
  const hasLabel = !!labelText && labelText.trim().length > 0;

  const isSearchActive = searchQuery.trim().length > 0 || searchSelectedUsers.length > 0;
  const matchesText = !searchQuery.trim() || labelText?.toLowerCase().includes(searchQuery.toLowerCase());
  const matchesUser = searchSelectedUsers.length === 0 || decisionMakers.some((u: Record<string, unknown>) => searchSelectedUsers.includes(u.name as string));
  const isMatch = isSearchActive && matchesText && matchesUser;
  const isViewMode = useCanvasStore(state => state.isViewMode);

  // Simulation State
  const isSimulating = useSimulationStore(state => state.isSimulating);
  const isActiveInSimulation = useSimulationStore(state => state.activeSimulationEdges.includes(id));

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEdges(edges => edges.filter(edge => edge.id !== id));
  };

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
          ...style,
          ...(!isSimulating && !isDataEdge && !isDbHandleEdge && !isSubworkflowEdge ? {
             strokeDasharray: '8 4',
             stroke: 'hsl(var(--canvas-edge))',
             strokeWidth: 2,
          } : {}),
          ...(isDataEdge && !isSimulating && !isSubworkflowEdge && !isDbHandleEdge ? { 
            strokeDasharray: '5 5',
            stroke: '#06b6d4',
            strokeWidth: 2,
          } : {}),
          ...(isDbHandleEdge && !isSimulating ? { 
            strokeDasharray: '6 4', 
            strokeWidth: 2,
            stroke: '#06b6d4'
          } : {}),
          ...(isSubworkflowEdge && !isSimulating ? { 
            strokeDasharray: '8 4', 
            stroke: '#a855f7', 
            strokeWidth: 2 
          } : {}),
          ...(isSearchActive && !isMatch && !isSimulating ? { opacity: 0.2 } : {}),
          ...(isSearchActive && isMatch && !isSimulating ? { stroke: 'hsl(var(--brand-color))', strokeWidth: 3, opacity: 1, filter: 'drop-shadow(0 0 5px hsl(var(--brand-color) / 0.5))' } : {}),
          ...(isSimulating && !isActiveInSimulation ? { opacity: 0.15, filter: 'grayscale(1)' } : {}),
          ...(isSimulating && isActiveInSimulation ? { 
            stroke: '#10b981', // emerald-500
            strokeWidth: 3.5, 
            opacity: 1, 
            filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.8))',
            strokeDasharray: '8 8',
          } : {}),
          ...(!isSimulating ? { animation: 'flowAnimationSlow 2s linear infinite' } : {}),
          ...(isSimulating && isActiveInSimulation ? { animation: 'flowAnimation 0.5s linear infinite' } : {})
        }}
        className={cn(
          !isSimulating && "flow-edge-animation-slow",
          isSimulating && isActiveInSimulation && "flow-edge-animation"
        )}
      />
      {/* DB operation icon with tooltip */}
      {isDbHandleEdge && !isSimulating && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              opacity: isSearchActive && !isMatch ? 0.2 : 1,
              zIndex: selected ? 30 : 1,
            }}
            className="nodrag nopan flex items-center gap-1.5"
          >
            <div className={cn(
              "group/dbop relative flex items-center justify-center w-6 h-6 rounded-full shrink-0 cursor-help shadow-sm",
              dbOperation === 'write' ? 'bg-amber-500 text-white' :
              dbOperation === 'readwrite' ? 'bg-cyan-500 text-white' :
              'bg-emerald-500 text-white'
            )}>
              {dbOperation === 'write' ? <Save size={12} strokeWidth={2.5} /> :
               dbOperation === 'readwrite' ? <ArrowUpDown size={12} strokeWidth={2.5} /> :
               <Eye size={12} strokeWidth={2.5} />}
              <InlineTooltip groupName="dbop">
                {dbOperation === 'write' ? t('props.dbWrite') :
                 dbOperation === 'readwrite' ? t('props.dbReadWrite') :
                 t('props.dbRead')}
              </InlineTooltip>
            </div>
            {/* Delete button — same as regular edges */}
            {selected && !isViewMode && (
              <button 
                onClick={handleDelete}
                className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-surface-elevated transition-colors border border-transparent dark:border-border"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
      {(decisionMakers.length > 0 || hasLabel || selected) && !isDbHandleEdge && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              opacity: (isSearchActive && !isMatch) || (isSimulating && !isActiveInSimulation) ? 0.2 : 1,
              zIndex: selected ? 30 : ((isSearchActive && isMatch) || (isSimulating && isActiveInSimulation) ? 20 : 1)
            }}
            className={cn("flex items-center gap-1.5 nodrag nopan transition-opacity", (isSearchActive && !isMatch) || (isSimulating && !isActiveInSimulation) ? "grayscale blur-[0.5px]" : "")}
          >
            {(decisionMakers.length > 0 || hasLabel) && (
              <div 
                className={cn(
                  "bg-card rounded-full border flex items-center justify-center cursor-pointer transition-all shrink-0",
                  (selected && !isSimulating) || (isSearchActive && isMatch && !isSimulating) ? "border-brand-gold ring-1 ring-brand-gold/30 shadow-glow" : "border-border",
                  isSimulating && isActiveInSimulation ? "border-emerald-500 ring-2 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "",
                  hasLabel && decisionMakers.length === 0 ? "px-2.5 py-1" : "",
                  !hasLabel && decisionMakers.length > 0 ? "p-1" : "",
                  hasLabel && decisionMakers.length > 0 ? "pl-3 pr-1 py-1" : ""
                )}
              >
                
                {hasLabel && (
                  <div className={cn("group/label relative flex items-center justify-center shrink-0", decisionMakers.length > 0 ? "mr-1.5" : "")}>
                    <span className="text-[10px] font-semibold text-foreground truncate max-w-[50px]">
                      {labelText}
                    </span>
                    <InlineTooltip groupName="label">
                      {labelText}
                    </InlineTooltip>
                  </div>
                )}

                {decisionMakers.length > 0 && (
                  <div className="group/avatars relative hover:z-50 cursor-help shrink-0 flex items-center">
                    <div className={cn("flex", decisionMakers.length > 1 ? "-space-x-1.5" : "")}>
                      {decisionMakers.slice(0, 3).map((dm: Record<string, unknown>, idx: number) =>
                        <GroupAvatar key={idx} group={dm} size="xs" className="ring-2 ring-card relative z-10" />
                      )}
                      {decisionMakers.length > 3 && (
                        <div className="w-5 h-5 rounded-full bg-secondary ring-2 ring-card flex items-center justify-center z-20 shrink-0">
                          <span className="text-[8px] text-muted-foreground font-medium">+{decisionMakers.length - 3}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Tooltip on hover */}
                    <InlineTooltip 
                      groupName="avatars" 
                      className="flex flex-col items-start gap-1 p-2 z-[9999] whitespace-normal min-w-[150px] max-w-[300px]"
                    >
                      <div className="flex flex-col gap-0.5 mb-1.5 last:mb-0">
                        <span className="text-brand-gold font-semibold">{t('nodeCanvas.deciders')}</span> 
                        <span className="leading-snug text-muted-foreground">{[...new Set(decisionMakers.map((dm: Record<string, unknown>) => dm.name as string))].join(', ')}</span>
                      </div>
                    </InlineTooltip>
                  </div>
                )}
              </div>
            )}
            
            {/* Show delete icon only when selected and NOT in view mode */}
            {selected && !isViewMode && (
              <div className="group/trash relative flex items-center justify-center">
                <button 
                  onClick={handleDelete}
                  className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-surface-elevated transition-colors border border-transparent dark:border-border"
                >
                  <Trash2 size={12} />
                </button>
                <InlineTooltip groupName="trash">
                  {t('nodeCanvas.deleteEdge')}
                </InlineTooltip>
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

CustomEdge.displayName = 'CustomEdge';
