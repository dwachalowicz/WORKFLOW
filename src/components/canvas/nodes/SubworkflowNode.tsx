import { useTranslation } from 'react-i18next';
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { Workflow } from 'lucide-react';
import { getRotatedHandlePosition, getHandleClass } from './nodeUtils';
import { useHandleActive, useNodeVisualState, useNodeRotation } from './useNodeHooks';
import { NodeToolbar } from './NodeToolbar';
import { WorkflowLinkBadge } from './IncomingLinkBadge';

import type { NodeProps } from '@xyflow/react';

export const SubworkflowNode = memo(({
  data, selected, id }: NodeProps) => {
  const { t } = useTranslation();
  const { isHandleActive, isAnyHandleActive } = useHandleActive(id, selected);
  const { isSearchActive, isMatch, isViewMode, isSimulating, isActiveInSimulation } = useNodeVisualState(id, data);

  const rotation = data.rotation || 0;
  useNodeRotation(id, rotation);

  const hasTarget = !!data.targetWorkflowId;

  return (
    <div className={cn(
      "relative w-16 h-16 rounded-full border bg-card flex items-center justify-center transition-all duration-300 shadow-md hover:shadow-xl",
      selected && !isSimulating
        ? "border-brand-gold scale-105 z-10 shadow-glow" 
        : (!isSimulating ? "border-purple-500/60 hover:border-brand-gold hover:shadow-glow hover:scale-[1.05]" : ""),
      isSearchActive && !isMatch && !isSimulating ? "opacity-30 grayscale" : "",
      isSearchActive && isMatch && !selected && !isSimulating ? "border-brand-gold shadow-glow z-20" : "",
      isSimulating && isActiveInSimulation ? "border-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.3)] scale-[1.05] z-30" : "",
      isSimulating && !isActiveInSimulation ? "opacity-30 grayscale blur-[1px] border-border" : ""
    )}>
      {selected && !isViewMode && (
        <NodeToolbar id={id} rotation={rotation} />
      )}
      
      {/* Input handle — flow enters the subprocess step */}
      <Handle 
        type="target" 
        position={getRotatedHandlePosition(Position.Left, rotation)} 
        id="left" 
        isConnectableStart={false}
        className={getHandleClass(getRotatedHandlePosition(Position.Left, rotation), isHandleActive('left', 'target'), false, true)} 
      />

      {/* Output handle — flow continues after the subprocess (optional) */}
      <Handle 
        type="source" 
        position={getRotatedHandlePosition(Position.Right, rotation)} 
        id="right" 
        isConnectableEnd={false}
        className={getHandleClass(getRotatedHandlePosition(Position.Right, rotation), isHandleActive('right', 'source'), false, false)} 
      />
      
      <div className="flex flex-col items-center justify-center gap-1">
        <Workflow size={20} className={cn("transition-colors", isAnyHandleActive ? "text-brand-gold" : "text-purple-500")} />
      </div>

      {/* Badge showing target workflow */}
      <WorkflowLinkBadge 
        nodeId={id} 
        outgoingTargetId={hasTarget ? data.targetWorkflowId : undefined}
        outgoingTargetName={hasTarget ? data.targetWorkflowName : undefined}
        circular
      />
      
      {/* Label below - Displayed as a tooltip */}
      {selected && (
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 z-[100] pointer-events-none animate-in fade-in zoom-in duration-200">
          <div className="relative bg-black text-white text-[10px] px-3 py-1.5 rounded whitespace-nowrap shadow-xl">
            <span className="font-semibold">{data.targetWorkflowName || t('props.subworkflowPlaceholder')}</span>
            {data.targetNodeLabel && (
              <span className="text-purple-300 ml-1">→ {data.targetNodeLabel}</span>
            )}
            {/* Arrow pointing up */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
});

SubworkflowNode.displayName = 'SubworkflowNode';
