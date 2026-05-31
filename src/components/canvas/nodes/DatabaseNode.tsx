import { useTranslation } from 'react-i18next';
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { Database } from 'lucide-react';
import { getRotatedHandlePosition, getDbHandleClass } from './nodeUtils';
import { useHandleActive, useNodeVisualState, useNodeRotation } from './useNodeHooks';
import { NodeToolbar } from './NodeToolbar';

import type { NodeProps } from '@xyflow/react';

export const DatabaseNode = memo(({
  data, selected, id }: NodeProps) => {
  const { t } = useTranslation();
  const { isHandleActive, isAnyHandleActive } = useHandleActive(id, selected);
  const { isSearchActive, isMatch, isViewMode, isSimulating, isActiveInSimulation } = useNodeVisualState(id, data);

  const rotation = data.rotation || 0;
  useNodeRotation(id, rotation);

  return (
    <div className={cn(
      "relative w-16 h-16 rounded-full border bg-card flex items-center justify-center transition-all duration-300 shadow-md hover:shadow-xl",
      selected && !isSimulating
        ? "border-brand-gold scale-105 z-10 shadow-glow" 
        : (!isSimulating ? "border-cyan-500/60 hover:border-brand-gold hover:shadow-glow hover:scale-[1.05]" : ""),
      isSearchActive && !isMatch && !isSimulating ? "opacity-30 grayscale" : "",
      isSearchActive && isMatch && !selected && !isSimulating ? "border-brand-gold shadow-glow z-20" : "",
      isSimulating && isActiveInSimulation ? "border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)] scale-[1.05] z-30" : "",
      isSimulating && !isActiveInSimulation ? "opacity-30 grayscale blur-[1px] border-border" : ""
    )}>
      {selected && !isViewMode && (
        <NodeToolbar id={id} rotation={rotation} />
      )}
      
      {/* Single target handle — DB resource receives connections from process steps */}
      <Handle 
        type="target" 
        position={getRotatedHandlePosition(Position.Top, rotation)} 
        id="db" 
        isConnectableStart={false}
        className={getDbHandleClass(getRotatedHandlePosition(Position.Top, rotation), isHandleActive('db', 'target'), true)} 
      />
      
      <div className="flex flex-col items-center justify-center gap-1">
        <Database size={20} className={cn("transition-colors", isAnyHandleActive ? "text-brand-gold" : "text-cyan-500")} />
      </div>
      
      {/* Label below - Displayed as a tooltip */}
      {selected && (
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 z-[100] pointer-events-none animate-in fade-in zoom-in duration-200">
          <div className="relative bg-black text-white text-[10px] px-3 py-1.5 rounded whitespace-nowrap shadow-xl">
            <span className="font-semibold">{data.label || t('nodes.database')}</span>
            {/* Arrow pointing up */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
});

DatabaseNode.displayName = 'DatabaseNode';

