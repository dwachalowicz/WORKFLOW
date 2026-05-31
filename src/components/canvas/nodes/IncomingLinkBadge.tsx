import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Network, ExternalLink, ChevronRight, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { useCanvasStore } from "@/store/canvasStore";

interface LinkEntry {
  processId: string;
  processName: string;
}

interface WorkflowLinkBadgeProps {
  nodeId: string;
  /** outgoing link data from node.data for Stop nodes */
  outgoingTargetId?: string;
  outgoingTargetName?: string;
  /** When true, positions the outgoing badge to overlap a circular parent's arc */
  circular?: boolean;
}

/**
 * Unified badge for both incoming and outgoing cross-workflow links.
 * - Incoming (left, ↙): other workflows that link INTO this node
 * - Outgoing (right, ↗): workflow this node links TO (Stop → next workflow)
 * Popovers close on canvas click. z-index above NodeToolbar.
 */
export const WorkflowLinkBadge = memo(({ nodeId, outgoingTargetId, outgoingTargetName, circular = false }: WorkflowLinkBadgeProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const incoming = useCanvasStore(state => state.incomingLinks[nodeId]) || [];
  const [openPanel, setOpenPanel] = useState<'incoming' | 'outgoing' | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const hasIncoming = incoming.length > 0;
  const hasOutgoing = !!outgoingTargetId;

  // Close popover on any canvas/pane click (outside badge)
  const handleOutsideClick = useCallback((e: Event) => {
    if (popoverRef.current && !popoverRef.current.contains(e.target as HTMLElement)) {
      setOpenPanel(null);
    }
  }, []);

  useEffect(() => {
    if (openPanel) {
      // Use both click and pointerdown — ReactFlow canvas uses pointer events
      document.addEventListener('click', handleOutsideClick, true);
      document.addEventListener('pointerdown', handleOutsideClick, true);
      return () => {
        document.removeEventListener('click', handleOutsideClick, true);
        document.removeEventListener('pointerdown', handleOutsideClick, true);
      };
    }
  }, [openPanel, handleOutsideClick]);

  if (!hasIncoming && !hasOutgoing) return null;

  const incomingEntries: LinkEntry[] = incoming.map(l => ({
    processId: l.sourceProcessId,
    processName: l.sourceProcessName,
  }));

  const outgoingEntries: LinkEntry[] = hasOutgoing
    ? [{ processId: outgoingTargetId!, processName: outgoingTargetName || 'Unnamed' }]
    : [];

  const renderPopover = (
    direction: 'incoming' | 'outgoing',
    entries: LinkEntry[],
    positionClass: string
  ) => (
    <div 
      className={`absolute ${positionClass} z-[200] bg-card border border-border rounded-xl shadow-2xl min-w-[220px] py-1 animate-in fade-in slide-in-from-top-1 duration-200`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1.5 border-b border-border flex items-center gap-1.5">
        {direction === 'incoming' 
          ? <ArrowDownLeft size={10} className="text-purple-400" />
          : <ArrowUpRight size={10} className="text-purple-400" />
        }
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          {direction === 'incoming' ? t('processMap.incomingLinks') : t('processMap.outgoingLinks')}
        </span>
      </div>
      {entries.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2 px-3 py-1.5 hover:bg-secondary/50 transition-colors group">
          <Network size={12} className="text-purple-400 shrink-0" />
          <span className="text-xs text-foreground truncate flex-1">{entry.processName}</span>
          <SimpleTooltip content={t('props.openInThisTab')}>
            <button 
              className="w-5 h-5 flex items-center justify-center rounded-full text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10 transition-colors opacity-0 group-hover:opacity-100"
              onClick={() => { setOpenPanel(null); navigate(`/app/${entry.processId}`); }}
            >
              <ChevronRight size={10} />
            </button>
          </SimpleTooltip>
          <SimpleTooltip content={t('props.openInNewTab')}>
            <button 
              className="w-5 h-5 flex items-center justify-center rounded-full text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10 transition-colors opacity-0 group-hover:opacity-100"
              onClick={() => window.open(`/app/${entry.processId}`, '_blank')}
            >
              <ExternalLink size={10} />
            </button>
          </SimpleTooltip>
        </div>
      ))}
    </div>
  );

  return (
    <div ref={popoverRef}>
      {/* Incoming badge — top-left */}
      {hasIncoming && (
        <div className="absolute -top-3 -left-3 z-[110]">
          <SimpleTooltip content={`⇠ ${incomingEntries.map(e => e.processName).join(', ')}`}>
            <div 
              className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500 shadow-lg shadow-purple-500/30 cursor-pointer hover:scale-110 transition-transform"
              onClick={(e) => { e.stopPropagation(); setOpenPanel(openPanel === 'incoming' ? null : 'incoming'); }}
            >
              <ArrowDownLeft size={10} className="text-white" />
              {incoming.length > 1 && (
                <span className="absolute -bottom-1 -right-1 text-[7px] font-bold bg-white text-purple-600 rounded-full w-3 h-3 flex items-center justify-center shadow-sm">
                  {incoming.length}
                </span>
              )}
            </div>
          </SimpleTooltip>
          {openPanel === 'incoming' && renderPopover('incoming', incomingEntries, 'top-7 left-0')}
        </div>
      )}

      {/* Outgoing badge — bottom-right (avoids NodeToolbar at top-right) */}
      {hasOutgoing && (
        <div className={`absolute ${circular ? 'bottom-0 right-0' : '-bottom-3 -right-3'} z-[110]`}>
          <SimpleTooltip content={`⇢ ${outgoingTargetName || 'Unnamed'}`}>
            <div 
              className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-500 shadow-lg shadow-purple-500/30 cursor-pointer hover:scale-110 transition-transform"
              onClick={(e) => { e.stopPropagation(); setOpenPanel(openPanel === 'outgoing' ? null : 'outgoing'); }}
            >
              <ArrowUpRight size={10} className="text-white" />
            </div>
          </SimpleTooltip>
          {openPanel === 'outgoing' && renderPopover('outgoing', outgoingEntries, 'bottom-7 right-0')}
        </div>
      )}
    </div>
  );
});

WorkflowLinkBadge.displayName = 'WorkflowLinkBadge';
