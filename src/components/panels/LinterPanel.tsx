import { AlertCircle, CheckCircle2, TriangleAlert, X } from 'lucide-react';
import { useMemo, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { useReactFlow } from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useCanvasStore } from "@/store/canvasStore";

export const LinterPanel = () => {
  // Use structural selectors so lint doesn't re-run when nodes are just dragged (position-only changes)
  const nodesFingerprint = useCanvasStore(state =>
    state.nodes.map(n => `${n.id}:${n.type}:${n.data?.type}:${n.data?.label}`).join('|')
  );
  const nodes = useCanvasStore(state => state.nodes);
  const edges = useCanvasStore(state => state.edges);
  const incomingLinks = useCanvasStore(state => state.incomingLinks);
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { fitView, setNodes, setEdges } = useReactFlow();
  const { t } = useTranslation();

  useClickOutside(panelRef, () => {
    if (isOpen) setIsOpen(false);
  });

  const issues = useMemo(() => {
    const newIssues: { type: 'error' | 'warning', message: string, nodeId?: string }[] = [];

    const hasStart = nodes.some(n => n.type === 'startstop' && n.data?.type === 'start');
    const hasStop = nodes.some(n => n.type === 'startstop' && n.data?.type === 'stop');

    if (!hasStart) {
      newIssues.push({ type: 'error', message: t('linter.missingStart') });
    }
    if (!hasStop) {
      newIssues.push({ type: 'error', message: t('linter.missingStop') });
    }

    nodes.forEach(node => {
      if (node.type === 'note') return; // Notatki ignorujemy

      const incomingEdges = edges.filter(e => e.target === node.id);
      const outgoingEdges = edges.filter(e => e.source === node.id);

      const hasIncomingLink = (incomingLinks[node.id] || []).length > 0;

      if (incomingEdges.length === 0 && outgoingEdges.length === 0 && !hasIncomingLink) {
        newIssues.push({ type: 'warning', message: t('lint.isolated', { name: node.data?.label || t('nodes.unnamed') }), nodeId: node.id });
      } else {
        if (node.type === 'database') {
          // Database nodes connected via any handle type are valid — no additional warnings needed
        } else if (node.type === 'startstop') {
          if (node.data?.type === 'start' && outgoingEdges.length === 0) {
            newIssues.push({ type: 'warning', message: t('lint.startNoOutput'), nodeId: node.id });
          }
          if (node.data?.type === 'stop' && incomingEdges.length === 0 && !hasIncomingLink) {
            newIssues.push({ type: 'error', message: t('lint.stopNoInput'), nodeId: node.id });
          }
        } else if (node.type === 'subworkflow') {
          if (incomingEdges.length === 0 && !hasIncomingLink) {
            newIssues.push({ type: 'error', message: t('lint.noInput', { name: node.data?.label || t('nodes.unnamed') }), nodeId: node.id });
          }
          // Subworkflows can be terminal, so no warning for missing output
        } else {
          if (incomingEdges.length === 0 && !hasIncomingLink) {
            newIssues.push({ type: 'error', message: t('lint.noInput', { name: node.data?.label || t('nodes.unnamed') }), nodeId: node.id });
          }
          if (outgoingEdges.length === 0) {
            newIssues.push({ type: 'warning', message: t('lint.noOutput', { name: node.data?.label || t('nodes.unnamed') }), nodeId: node.id });
          }
        }
      }
    });

    // Validate DB edges: check operation type is set
    edges.forEach(edge => {
      if (edge.data?.dbOperation !== undefined) {
        const op = edge.data.dbOperation;
        if (!op || (op !== 'read' && op !== 'write' && op !== 'readwrite')) {
          const targetDb = nodes.find(n => n.id === edge.target);
          newIssues.push({ 
            type: 'warning', 
            message: t('lint.dbNoOperation', { name: targetDb?.data?.label || t('nodes.unnamed') }),
            nodeId: edge.target 
          });
        }
      }
    });

    return newIssues;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesFingerprint, edges, incomingLinks, t]);

  const handleIssueClick = (nodeId?: string) => {
    if (!nodeId) return;
    
    // Deselect all edges
    setEdges(eds => eds.map(e => ({ ...e, selected: false })));
    
    // Select the specific node and deselect others
    setNodes(nds => nds.map(n => ({
      ...n,
      selected: n.id === nodeId
    })));
    
    // Center the view on the node with some zoom
    fitView({ nodes: [{ id: nodeId }], duration: 800, padding: 0.5, maxZoom: 1.2 });
  };

  const errorsCount = issues.filter(i => i.type === 'error').length;

  return (
    <div className="absolute top-20 md:top-auto md:bottom-6 z-40 flex flex-col gap-2 left-6 md:left-[28px] md:[@media(max-height:880px)]:left-[88px] transition-all duration-300" ref={panelRef}>
      {isOpen && (
        <div className="bg-surface-nav border border-border rounded-[2rem] shadow-2xl p-5 w-80 animate-in slide-in-from-top-4 md:slide-in-from-bottom-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              {t('lint.title')}
            </h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {issues.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-green-500/80 p-2 bg-green-500/10 rounded-xl">
                <CheckCircle2 size={16} />
                <span>{t('linter.valid')}</span>
              </div>
            ) : (
              issues.map((issue, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleIssueClick(issue.nodeId)}
                  className={cn(
                    "flex items-start gap-3 py-1.5 px-2 hover:bg-secondary/30 rounded-xl transition-colors group",
                    issue.nodeId ? "cursor-pointer" : ""
                  )}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-1.5 shrink-0 shadow-sm",
                    issue.type === 'error' ? "bg-red-500 shadow-red-500/50" : "bg-amber-500 shadow-amber-500/50"
                  )} />
                  <span className="text-sm text-foreground/90 leading-tight group-hover:text-foreground transition-colors">{issue.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <SimpleTooltip content={t('linter.title')} side="right">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg border border-transparent bg-surface-elevated hover:bg-secondary tour-linter",
            issues.length === 0 
              ? "text-green-500"
              : errorsCount > 0 
                ? "text-red-500"
                : "text-amber-500"
          )}
        >
          {issues.length === 0 ? (
            <CheckCircle2 size={20} />
          ) : errorsCount > 0 ? (
            <AlertCircle size={20} />
          ) : (
            <TriangleAlert size={20} />
          )}
          {issues.length > 0 && (
            <span className={`absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full ${errorsCount > 0 ? 'bg-red-500' : 'bg-amber-500'} text-xs font-bold text-foreground border-[3px] border-surface-nav shadow-sm`}>
              {issues.length}
            </span>
          )}
        </button>
      </SimpleTooltip>
    </div>
  );
};
