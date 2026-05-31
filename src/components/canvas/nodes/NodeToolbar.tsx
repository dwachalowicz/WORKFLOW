import { useTranslation } from 'react-i18next';
import { memo } from 'react';
import { RotateCw, Menu } from 'lucide-react';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { useCanvasStore } from "@/store/canvasStore";
import { useUiStore } from "@/store/uiStore";

/**
 * Shared toolbar with Rotate + Menu buttons displayed above selected nodes.
 * Replaces 6+ identical toolbar implementations across node components.
 */
interface NodeToolbarProps {
  id: string;
  rotation: number;
  className?: string;
}

export const NodeToolbar = memo(({ id, rotation, className = 'absolute -top-11 right-0 flex items-center z-50 pointer-events-none' }: NodeToolbarProps) => {
  const { t } = useTranslation();
  const updateNode = useCanvasStore(state => state.updateNode);
  const isViewMode = useCanvasStore(state => state.isViewMode);
  const setRadialMenuConfig = useUiStore(state => state.setRadialMenuConfig);

  if (isViewMode) return null;

  return (
    <div className={className}>
      <div className="bg-card/90 backdrop-blur-md border border-border/60 dark:border-white/10 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] rounded-full p-1 flex items-center pointer-events-auto">
        <SimpleTooltip content={t('canvas.rotateHandles')} side="top">
          <button
            className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-brand-gold hover:bg-brand-gold/10 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              updateNode(id, { rotation: (rotation + 90) % 360 });
            }}
          >
            <RotateCw size={14} strokeWidth={2.5} />
          </button>
        </SimpleTooltip>
        
        <div className="w-px h-4 bg-border/60 mx-1" />
        
        <SimpleTooltip content={t('canvas.nodeMenu')} side="top">
          <button
            className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            onClick={(e) => {
              e.stopPropagation();
              setRadialMenuConfig({
                isOpen: true,
                x: e.clientX,
                y: e.clientY,
                contextNodeId: id,
              });
            }}
          >
            <Menu size={14} strokeWidth={2.5} />
          </button>
        </SimpleTooltip>
      </div>
    </div>
  );
});

NodeToolbar.displayName = 'NodeToolbar';
