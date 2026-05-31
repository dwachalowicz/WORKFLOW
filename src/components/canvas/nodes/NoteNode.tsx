import { useTranslation } from 'react-i18next';
import { memo, useState, useEffect, useRef } from 'react';
import { type NodeProps, useUpdateNodeInternals } from '@xyflow/react';
import { StickyNote, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCanvasStore } from "@/store/canvasStore";
import { useUiStore } from "@/store/uiStore";
import { useSimulationStore } from "@/store/simulationStore";

export const NoteNode = memo(({
  id, data, selected }: NodeProps) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const isViewMode = useCanvasStore((state) => state.isViewMode);

  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateNodeInternals(id);
    const timeout = setTimeout(() => updateNodeInternals(id), 50);
    return () => clearTimeout(timeout);
  }, [isExpanded, id, updateNodeInternals]);

  useEffect(() => {
    const handleCollapse = () => setIsExpanded(false);
    window.addEventListener('collapseAllNodes', handleCollapse as EventListener);
    return () => window.removeEventListener('collapseAllNodes', handleCollapse as EventListener);
  }, []);

  const updateNode = useCanvasStore(state => state.updateNode);
  const searchQuery = useUiStore(state => state.searchQuery);
  const searchSelectedUsers = useUiStore(state => state.searchSelectedUsers);
  const isSimulating = useSimulationStore(state => state.isSimulating);

  // Local state + debounced sync to avoid store spam on every keystroke
  const [localText, setLocalText] = useState(data.text || '');
  const localTextRef = useRef(localText);
  const isLocalEdit = useRef(false);

  // Keep ref in sync for unmount flush
  useEffect(() => {
    localTextRef.current = localText;
  }, [localText]);

  // Sync from store → local (only when not actively editing)
  useEffect(() => {
    if (!isLocalEdit.current) {
      setLocalText(data.text || '');
    }
  }, [data.text]);

  // Debounced sync from local → store
  useEffect(() => {
    if (!isLocalEdit.current) return;
    const timer = setTimeout(() => {
      updateNode(id, { text: localText });
      isLocalEdit.current = false;
    }, 500);
    return () => clearTimeout(timer);
  }, [localText, updateNode, id]);

  // Flush on unmount to prevent data loss if node is removed while typing
  useEffect(() => {
    return () => {
      if (isLocalEdit.current) {
        updateNode(id, { text: localTextRef.current });
      }
    };
  }, [id, updateNode]);

  const isSearchActive = searchQuery.trim().length > 0 || searchSelectedUsers.length > 0;
  const matchesText = !searchQuery.trim() || localText?.toLowerCase().includes(searchQuery.toLowerCase());
  const matchesUser = searchSelectedUsers.length === 0;
  const isMatch = isSearchActive && matchesText && matchesUser;

  return (
    <div
      className={cn(
        "relative transition-all duration-300 ease-out shadow-md hover:shadow-xl",
        isExpanded ? "w-[280px] rounded-xl border bg-card" : "w-12 h-12 rounded-full bg-card border flex items-center justify-center hover:scale-[1.05]",
        selected && !isSimulating ? "border-brand-gold scale-[1.02] z-10 shadow-glow" : (!isSimulating ? "border-border/40 dark:border-white/5 hover:border-brand-gold hover:shadow-glow" : ""),
        isSearchActive && !isMatch && !isSimulating ? "opacity-30 grayscale" : "",
        isSearchActive && isMatch && !selected && !isSimulating ? "border-brand-gold shadow-glow z-20" : "",
        isSimulating ? "opacity-30 grayscale blur-[1px] pointer-events-none" : ""
      )}
    >
      {!isExpanded && (
        <div 
          className="cursor-pointer flex items-center justify-center w-full h-full" 
          onClick={() => setIsExpanded(true)}
        >
          <StickyNote size={18} className="text-brand-gold" />
        </div>
      )}

      {/* Expanded Content Wrapper */}
      {isExpanded && (
        <>
          {/* Header */}
          <div 
            className="px-4 py-3 flex items-center justify-between group cursor-pointer"
            onClick={() => setIsExpanded(false)}
          >
            <div className="flex items-center gap-2">
              <ChevronDown 
                size={14} 
                className="text-muted-foreground transition-transform duration-200 shrink-0 group-hover:text-foreground rotate-180" 
              />
              <StickyNote size={14} className="text-brand-gold" />
              <span className="text-sm font-semibold tracking-tight text-foreground select-none">{t('nodes.note')}</span>
            </div>
          </div>

          {/* Expanded Content */}
          <div className="border-t border-border">
            <div className="p-4">
              <textarea
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:border-brand-gold outline-none transition-all placeholder:text-muted-foreground/50 resize-y min-h-[100px]"
                placeholder={t('canvas.notePlaceholder')}
                value={localText}
                readOnly={isViewMode}
                onChange={(e) => { isLocalEdit.current = true; setLocalText(e.target.value); }}
                onKeyDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
});

NoteNode.displayName = 'NoteNode';

