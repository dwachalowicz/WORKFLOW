import { useMemo } from 'react';
import { CheckSquare, ChevronRight, Circle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCanvasStore } from "@/store/canvasStore";

/**
 * GlobalChecklist — renders a consolidated view of all checklists
 * across all nodes in the current workflow.
 */
export const GlobalChecklist = () => {
  const { t } = useTranslation();
  const nodes = useCanvasStore(s => s.nodes);

  const checklistData = useMemo(() => {
    return nodes
      .filter(n => n.data?.checklist && n.data.checklist.length > 0)
      .map(n => ({
        nodeId: n.id,
        label: n.data?.label || n.id,
        type: n.type || 'simple',
        items: (n.data?.checklist || []) as Array<{ id: string; label: string; required: boolean }>,
      }));
  }, [nodes]);

  const totalItems = checklistData.reduce((sum, n) => sum + n.items.length, 0);
  const requiredItems = checklistData.reduce((sum, n) => sum + n.items.filter(i => i.required).length, 0);

  if (checklistData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <CheckSquare size={32} className="mb-3 opacity-40" />
        <p className="text-sm font-medium">{t('globalChecklist.noChecklist')}</p>
        <p className="text-xs mt-1 max-w-[200px] text-center opacity-60">
          {t('globalChecklist.addHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-foreground">{t('globalChecklist.summary')}</span>
          <span className="text-muted-foreground font-mono text-xs">{requiredItems}/{totalItems}</span>
        </div>
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-brand-gold rounded-full transition-all duration-500"
            style={{ width: `${totalItems > 0 ? Math.round((requiredItems / totalItems) * 100) : 0}%` }}
          />
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <AlertCircle size={10} className="text-brand-gold" />
            {requiredItems} {t('globalChecklist.required')}
          </span>
          <span className="flex items-center gap-1">
            <Circle size={10} className="text-muted-foreground/40" />
            {totalItems - requiredItems} {t('globalChecklist.optional')}
          </span>
        </div>
      </div>

      {/* Per-node checklists */}
      {checklistData.map(nodeData => (
        <div key={nodeData.nodeId} className="bg-card border border-border/50 rounded-xl overflow-hidden">
          {/* Node header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-secondary/30">
            <ChevronRight size={12} className="text-muted-foreground" />
            <span className="text-xs font-bold text-foreground truncate">{nodeData.label}</span>
            <span className="ml-auto text-[10px] text-muted-foreground font-mono">
              {nodeData.items.filter(i => i.required).length}/{nodeData.items.length}
            </span>
          </div>

          {/* Items */}
          <div className="divide-y divide-border/20">
            {nodeData.items.map((item, idx) => (
              <div key={item.id || idx} className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/20 transition-colors">
                <Circle size={14} className={`shrink-0 ${item.required ? 'text-brand-gold' : 'text-muted-foreground/40'}`} />
                <span className="text-sm flex-1 text-foreground">
                  {item.label}
                </span>
                {item.required && (
                  <span className="text-[9px] font-bold text-brand-gold uppercase tracking-wider">{t('globalChecklist.requiredBadge')}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
