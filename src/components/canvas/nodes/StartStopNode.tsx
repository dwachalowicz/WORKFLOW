import { memo, useEffect } from 'react';
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { MousePointerClick, Mail, Webhook, Clock, CheckCircle2, Ban, Network, MoreHorizontal } from 'lucide-react';
import { getRotatedHandlePosition, getHandleClass } from './nodeUtils';
import { useHandleActive, useNodeVisualState, useNodeRotation } from './useNodeHooks';
import { NodeToolbar } from './NodeToolbar';
import { WorkflowLinkBadge } from './IncomingLinkBadge';

import type { NodeProps } from '@xyflow/react';

const TRIGGER_ICONS: Record<string, typeof Mail> = {
  manual: MousePointerClick,
  email: Mail,
  webhook: Webhook,
  schedule: Clock,
  subworkflow: Network,
};

const ACTION_ICONS: Record<string, typeof Mail> = {
  none: Ban,
  email: Mail,
  webhook: Webhook,
  status: CheckCircle2,
  subworkflow: Network,
};

const TRIGGER_COLORS: Record<string, string> = {
  manual: '',
  email: 'text-blue-400',
  webhook: 'text-purple-400',
  schedule: 'text-amber-400',
  subworkflow: 'text-purple-400',
};

const ACTION_COLORS: Record<string, string> = {
  none: '',
  email: 'text-blue-400',
  webhook: 'text-purple-400',
  status: 'text-emerald-400',
  subworkflow: 'text-purple-400',
};

export const StartStopNode = memo(({ data, selected, id }: NodeProps) => {
  const isStart = data.type === 'start';
  const { isHandleActive, isAnyHandleActive } = useHandleActive(id, selected);
  const { isSearchActive, isMatch, isSimulating, isActiveInSimulation, isViewMode } = useNodeVisualState(id, data);

  const rotation = data.rotation || 0;
  useNodeRotation(id, rotation);

  // Resolve triggers/actions to arrays (backward-compatible)
  const triggers: string[] = isStart
    ? (Array.isArray(data.triggerTypes) ? data.triggerTypes : (data.triggerType ? [data.triggerType] : ['manual']))
    : [];
  const actions: string[] = !isStart
    ? (Array.isArray(data.actionTypes) ? data.actionTypes : (data.actionType ? [data.actionType] : ['none']))
    : [];

  const items = isStart ? triggers : actions;

  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateNodeInternals(id);
    const timeout = setTimeout(() => updateNodeInternals(id), 50);
    return () => clearTimeout(timeout);
  }, [items.length, id, updateNodeInternals]);
  const iconMap = isStart ? TRIGGER_ICONS : ACTION_ICONS;
  const colorMap = isStart ? TRIGGER_COLORS : ACTION_COLORS;
  const defaultColor = cn("transition-colors", isAnyHandleActive ? "text-brand-gold" : "text-[hsl(var(--canvas-edge))]");

  // Check if stop has a linked workflow
  const hasStopTarget = !isStart && !!data.targetWorkflowId;

  return (
    <div className={cn(
      "relative w-fit min-w-max px-5 py-2.5 rounded-xl border bg-card flex items-center justify-center transition-all duration-300 shadow-md hover:shadow-xl",
      selected && !isSimulating
        ? "border-brand-gold scale-105 z-10 shadow-glow" 
        : (isStart && !isSimulating ? "border-emerald-400/60 hover:border-brand-gold hover:shadow-glow hover:scale-[1.05]" : (!isSimulating ? "border-rose-400/60 hover:border-brand-gold hover:shadow-glow hover:scale-[1.05]" : "")),
      isSearchActive && !isMatch && !isSimulating ? "opacity-30 grayscale" : "",
      isSearchActive && isMatch && !selected && !isSimulating ? "border-brand-gold shadow-glow z-20" : "",
      isSimulating && isActiveInSimulation && isStart ? "border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)] scale-[1.05] z-30" : "",
      isSimulating && isActiveInSimulation && !isStart ? "border-rose-400 shadow-[0_0_20px_rgba(251,113,133,0.3)] scale-[1.05] z-30" : "",
      isSimulating && !isActiveInSimulation ? "opacity-30 grayscale blur-[1px] border-border" : ""
    )}>
      {selected && !isViewMode && (
        <NodeToolbar id={id} rotation={rotation} />
      )}
      <WorkflowLinkBadge 
        nodeId={id} 
        outgoingTargetId={hasStopTarget ? data.targetWorkflowId : undefined}
        outgoingTargetName={hasStopTarget ? data.targetWorkflowName : undefined}
      />
      
      {/* Stop node always has target handle; Start node never has target handle */}
      {!isStart && (
        <Handle 
          type="target" 
          position={getRotatedHandlePosition(Position.Left, rotation)} 
          id="left" 
          isConnectableStart={false} 
          className={getHandleClass(getRotatedHandlePosition(Position.Left, rotation), isHandleActive('left', 'target'), false, true)} 
        />
      )}
      
      <div className="flex items-center gap-2">
        {/* Multi-icon rendering */}
        <div className="flex items-center gap-1">
          {/* Handoff icon for stop nodes with target */}
          {hasStopTarget && (
            <Network size={14} className={cn("transition-colors", "text-purple-400")} />
          )}
          {items.map((item, idx) => {
            // Skip legacy 'subworkflow' text in stop node actions
            if (!isStart && item === 'subworkflow') return null;
            const Icon = iconMap[item] || MoreHorizontal;
            const color = colorMap[item] || defaultColor;
            return <Icon key={idx} size={14} className={cn("transition-colors", color || defaultColor)} />;
          })}
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-xs uppercase tracking-wider text-foreground leading-none">
            {isStart ? 'Start' : 'Stop'}
          </span>
          {(() => {
            // For stop nodes with targetWorkflowId, show handoff badge
            const displayItems = isStart 
              ? items.filter(i => i !== 'manual' && i !== 'none')
              : items.filter(i => i !== 'manual' && i !== 'none' && i !== 'subworkflow');
            
            // Add handoff indicator if stop has target workflow
            if (hasStopTarget && !displayItems.includes('handoff')) {
              displayItems.unshift('handoff');
            }
            
            if (displayItems.length === 0) return null;
            return (
              <span className="text-[8px] text-muted-foreground uppercase tracking-widest mt-0.5 leading-none truncate max-w-[80px]">
                {displayItems.join(', ')}
              </span>
            );
          })()}
        </div>
      </div>
      
      <Handle 
        type="source" 
        position={getRotatedHandlePosition(Position.Right, rotation)} 
        id="right" 
        isConnectable={true}
        className={cn(
          getHandleClass(getRotatedHandlePosition(Position.Right, rotation), isHandleActive('right', 'source')),
          !isStart && "opacity-0 pointer-events-none"
        )} 
      />
    </div>
  );
});

StartStopNode.displayName = 'StartStopNode';

