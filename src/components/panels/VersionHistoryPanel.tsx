import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { X, History, Loader2, Trash2, RotateCcw, Tag, Plus, AlertTriangle, GitCompare, PlusCircle, MinusCircle, RefreshCw } from 'lucide-react';
import { GryfSpinner } from '@/components/ui/GryfSpinner';
import { useAuthStore } from '@/store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAvatarUrl } from '@/lib/pocketbase';
import { useCanvasStore } from "@/store/canvasStore";
import { deepCompareNode, deepCompareEdge, type DiffResult } from '@/lib/diffUtils';

export const VersionHistoryPanel = () => {
  const { t } = useTranslation();
  const isOpen = useCanvasStore((s) => s.isVersionModalOpen);
  const setOpen = useCanvasStore((s) => s.setVersionModalOpen);
  const versions = useCanvasStore((s) => s.versions);
  const isLoading = useCanvasStore((s) => s.isLoadingVersions);
  const saveVersion = useCanvasStore((s) => s.saveVersion);
  const listVersions = useCanvasStore((s) => s.listVersions);
  const loadVersion = useCanvasStore((s) => s.loadVersion);
  const deleteVersion = useCanvasStore((s) => s.deleteVersion);
  const currentProcessId = useCanvasStore((s) => s.currentProcessId);
  const isViewMode = useCanvasStore((s) => s.isViewMode);
  const user = useAuthStore((s) => s.user);

  const [newLabel, setNewLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);

  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);

  useEffect(() => {
    if (isOpen && currentProcessId) {
      listVersions();
    }
  }, [isOpen, currentProcessId, listVersions]);

  const handleSaveVersion = async () => {
    if (isSaving) return;
    setError(null);
    setIsSaving(true);
    try {
      await saveVersion(newLabel || undefined);
      setNewLabel('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('versions.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadVersion = async (versionId: string) => {
    if (isRestoring) return;
    setError(null);
    setIsRestoring(versionId);
    try {
      await loadVersion(versionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('versions.loadError'));
    } finally {
      setIsRestoring(null);
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    setError(null);
    try {
      await deleteVersion(versionId);
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('versions.deleteError'));
    }
  };

  const handleCompare = (version: Record<string, unknown>) => {
    try {
      const vNodesRaw = version.nodes_data || [];
      const vEdgesRaw = version.edges_data || [];
      const vNodes: Record<string, unknown>[] = typeof vNodesRaw === 'string' ? JSON.parse(vNodesRaw) : vNodesRaw;
      const vEdges: Record<string, unknown>[] = typeof vEdgesRaw === 'string' ? JSON.parse(vEdgesRaw) : vEdgesRaw;

      const currentNodeIds = new Set(nodes.map((n: Record<string, unknown>) => n.id));
      const versionNodeIds = new Set(vNodes.map((n: Record<string, unknown>) => n.id));
      const versionNodeMap = new Map(vNodes.map((n: Record<string, unknown>) => [n.id, n]));

      const nodesAdded: string[] = [];
      const nodesRemoved: string[] = [];
      const nodesChanged: NodeChange[] = [];

      // Nodes added (in current but not in version)
      for (const n of nodes as Record<string, unknown>[]) {
        if (!versionNodeIds.has(n.id)) {
          const nData = n.data as Record<string, unknown> | undefined;
          nodesAdded.push(nData?.label as string || n.id as string);
        }
      }
      // Nodes removed (in version but not current)
      for (const n of vNodes) {
        if (!currentNodeIds.has(n.id)) {
          const nData = n.data as Record<string, unknown> | undefined;
          nodesRemoved.push(nData?.label as string || n.id as string);
        }
      }
      // Nodes in both → deep compare every property
      for (const n of nodes as Record<string, unknown>[]) {
        const vn = versionNodeMap.get(n.id);
        if (vn) {
          const details = deepCompareNode(n, vn, t);
          if (details.length > 0) {
            const nData = n.data as Record<string, unknown> | undefined;
            nodesChanged.push({ nodeLabel: nData?.label as string || n.id as string, details });
          }
        }
      }

      // Edges
      const currentEdgeIds = new Set(edges.map((e: Record<string, unknown>) => e.id));
      const versionEdgeIds = new Set(vEdges.map((e: Record<string, unknown>) => e.id));
      const versionEdgeMap = new Map(vEdges.map((e: Record<string, unknown>) => [e.id, e]));

      const edgesAdded: string[] = [];
      const edgesRemoved: string[] = [];
      const edgesChanged: EdgeChange[] = [];

      for (const e of edges as Record<string, unknown>[]) {
        if (!versionEdgeIds.has(e.id)) {
          const srcNode = (nodes as Record<string, unknown>[]).find(n => n.id === e.source);
          const tgtNode = (nodes as Record<string, unknown>[]).find(n => n.id === e.target);
          const srcData = srcNode?.data as Record<string, unknown> | undefined;
          const tgtData = tgtNode?.data as Record<string, unknown> | undefined;
          edgesAdded.push(`${srcData?.label || e.source} → ${tgtData?.label || e.target}`);
        }
      }
      for (const e of vEdges) {
        if (!currentEdgeIds.has(e.id)) {
          const srcNode = vNodes.find(n => n.id === e.source);
          const tgtNode = vNodes.find(n => n.id === e.target);
          const srcData = srcNode?.data as Record<string, unknown> | undefined;
          const tgtData = tgtNode?.data as Record<string, unknown> | undefined;
          edgesRemoved.push(`${srcData?.label || e.source} → ${tgtData?.label || e.target}`);
        }
      }
      // Edges in both → deep compare
      for (const e of edges as Record<string, unknown>[]) {
        const ve = versionEdgeMap.get(e.id);
        if (ve) {
          const details = deepCompareEdge(e, ve, nodes as Record<string, unknown>[], vNodes, t);
          if (details.length > 0) {
            const srcNode = (nodes as Record<string, unknown>[]).find(n => n.id === e.source);
            const tgtNode = (nodes as Record<string, unknown>[]).find(n => n.id === e.target);
            const srcData = srcNode?.data as Record<string, unknown> | undefined;
            const tgtData = tgtNode?.data as Record<string, unknown> | undefined;
            edgesChanged.push({
              edgeLabel: `${srcData?.label || e.source} → ${tgtData?.label || e.target}`,
              details
            });
          }
        }
      }

      setDiffResult({
        versionLabel: (version.label as string) || `v${version.version_number}`,
        nodesAdded,
        nodesRemoved,
        nodesChanged,
        edgesAdded,
        edgesRemoved,
        edgesChanged,
      });
    } catch (err) {
      console.error('Diff error:', err);
    }
  };


  const formatDate = (dateStr?: string) => {
    if (!dateStr) return t('versionsExt.noDate');
    try {
      let dateObj: Date;
      if (dateStr.includes('T')) {
        dateObj = new Date(dateStr);
      } else {
        dateObj = new Date(dateStr.replace(' ', 'T'));
      }
      
      if (isNaN(dateObj.getTime())) {
        // Fallback to manual formatting if Date parsing fails
        const parts = dateStr.split(/[ T]/);
        if (parts.length >= 2) {
          const [y, m, d] = parts[0].split('-');
          const [time] = parts[1].split('.');
          const [h, min] = time.split(':');
          return `${d}.${m}.${y}, ${h}:${min}`;
        }
        return dateStr;
      }
      
      return dateObj.toLocaleDateString(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) + ', ' + dateObj.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          className="fixed top-0 right-0 h-full w-full md:w-[380px] z-[90] bg-surface-nav border-l border-border shadow-2xl flex flex-col pb-14 md:pb-0"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-brand-gold/10 flex items-center justify-center">
                <History size={16} className="text-brand-gold" />
              </div>
              <div>
                <h2 className="text-foreground font-semibold text-sm">{t('versionsExt.title')}</h2>
                <p className="text-[10px] text-muted-foreground">{t('versions.subtitle')}</p>
              </div>
            </div>
            <Button
              variant="iconGhost"
              size="iconSm"
              onClick={() => setOpen(false)}
            >
              <X size={14} />
            </Button>
          </div>

          {/* Save new version */}
          {!isViewMode && currentProcessId && user && (
            <div className="px-5 py-3.5 border-b border-border bg-card shrink-0">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveVersion()}
                    placeholder={t('versionsExt.labelPlaceholder')}
                    className="pl-8"
                  />
                </div>
                <Button
                  onClick={handleSaveVersion}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 shrink-0"
                >
                  {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  {t('versionsExt.saveVersion')}
                </Button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-5 py-2.5 bg-red-500/10 border-b border-red-500/20 shrink-0">
              <p className="text-[11px] text-red-400 flex items-center gap-1.5">
                <AlertTriangle size={11} /> {error}
              </p>
            </div>
          )}

          {/* Version list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <GryfSpinner size={24} />
              </div>
            ) : !currentProcessId ? (
              <div className="py-16 text-center px-6">
                <History size={28} className="mx-auto text-muted-foreground mb-3" />
                <p className="text-xs text-muted-foreground">{t('versionsExt.saveFirstTitle')}</p>
                <p className="text-[10px] text-muted-foreground">{t('versions.saveProcessHint')}</p>
              </div>
            ) : versions.length === 0 ? (
              <div className="py-16 text-center px-6">
                <History size={28} className="mx-auto text-muted-foreground mb-3" />
                <p className="text-xs text-muted-foreground">{t('versionsExt.noVersions')}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{t('versionsExt.noVersionsHint')}</p>
              </div>
            ) : (
              <div className="relative px-5 py-4 pl-10">
                {/* Timeline base line */}
                <div className="absolute left-[23px] top-6 bottom-4 w-px bg-border/50" />
                
                {versions.map((v, idx) => {
                  const author = v.expand?.created_by;
                  const authorName = author?.name || t('common.unknownUser');
                  const avatarUrl = getAvatarUrl(author, 40)
                    || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=1a1b1e&color=bc9b59`;

                  return (
                    <motion.div
                      key={v.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="group relative mb-6 last:mb-0"
                    >
                      {/* Timeline dot */}
                      <div className="absolute -left-[20px] top-[14px] w-2 h-2 rounded-full bg-brand-gold ring-[3px] ring-surface-nav z-10" />

                      <div className="bg-card border border-border rounded-xl p-3 hover:border-brand-gold/40 hover:shadow-md transition-all shadow-sm flex flex-col gap-2.5">
                        {/* Górna sekcja: Informacje */}
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <SimpleTooltip content={authorName} side="top">
                            <div className="shrink-0 mt-0.5 cursor-help">
                              <img loading="lazy" 
                                src={avatarUrl} 
                                alt={authorName}
                                className="w-8 h-8 rounded-full object-cover ring-1 ring-border"
                              />
                            </div>
                          </SimpleTooltip>

                          {/* Info */}
                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono font-bold text-brand-gold">
                                  v{v.version_number}
                                </span>
                                {idx === 0 && (
                                  <span className="text-[8px] uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full font-bold">
                                    {t('versionsExt.latest')}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                                {formatDate((v.created as string) || (v.updated as string) || ((v as Record<string, unknown>).created_at as string))}
                              </span>
                            </div>
                            
                            <SimpleTooltip content={v.label || `${t('versionsExt.snapshot')} #${v.version_number}`} side="top">
                              <p className="text-sm text-foreground font-semibold truncate mt-0.5 cursor-default">
                                {v.label || `${t('versionsExt.snapshot')} #${v.version_number}`}
                              </p>
                            </SimpleTooltip>
                          </div>
                        </div>

                        {/* Dolna sekcja: Akcje */}
                        <div className="flex items-center justify-end gap-1.5 border-t border-border/50 pt-2.5 relative">
                          {/* Compare */}
                          <SimpleTooltip content={t("versions.compareWithCurrent")} side="top">
                            <Button
                              variant="iconGhost"
                              size="iconSm"
                              onClick={() => handleCompare(v as Record<string, unknown>)}
                              className="text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10"
                            >
                              <GitCompare size={14} />
                            </Button>
                          </SimpleTooltip>

                          {!isViewMode && (
                            <>
                              {/* Restore */}
                              <SimpleTooltip content={t("versions.restoreVersion")} side="top">
                                <Button
                                  variant="iconGhost"
                                  size="iconSm"
                                  onClick={() => handleLoadVersion(v.id)}
                                  disabled={isRestoring === v.id}
                                  className="text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10"
                                >
                                  {isRestoring === v.id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <RotateCcw size={14} />
                                  )}
                                </Button>
                              </SimpleTooltip>

                              {/* Delete */}
                              {confirmDeleteId === v.id ? (
                                <div className="flex items-center gap-1.5 absolute right-0 bottom-full mb-1.5 bg-card border border-destructive/20 rounded-lg p-1.5 shadow-xl z-20">
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteVersion(v.id)}
                                    className="h-6 text-[10px] px-2.5 py-1"
                                  >
                                    {t('common.yes')}
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="h-6 text-[10px] px-2.5 py-1"
                                  >
                                    {t('common.no')}
                                  </Button>
                                </div>
                              ) : (
                                <SimpleTooltip content={t("versions.deleteVersion")} side="top">
                                  <Button
                                    variant="iconDestructive"
                                    size="iconSm"
                                    onClick={() => setConfirmDeleteId(v.id)}
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </SimpleTooltip>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Diff Result Overlay */}
          {diffResult && (
            <div className="px-5 py-4 border-t border-border bg-card shrink-0 animate-in slide-in-from-bottom-2 duration-200 max-h-[50vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3 sticky top-0 bg-card pb-2 z-10">
                <div className="flex items-center gap-2">
                  <GitCompare size={14} className="text-blue-400" />
                  <span className="text-xs font-bold text-foreground">Diff: {diffResult.versionLabel} → {t('versionsExt.current')}</span>
                </div>
                <Button variant="iconGhost" size="iconSm" onClick={() => setDiffResult(null)}>
                  <X size={14} />
                </Button>
              </div>

              {/* Summary counters */}
              <div className="flex flex-wrap gap-2 mb-3">
                {diffResult.nodesAdded.length > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">+{diffResult.nodesAdded.length} {t('versions.nodes')}</span>}
                {diffResult.nodesRemoved.length > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-semibold">-{diffResult.nodesRemoved.length} {t('versions.nodes')}</span>}
                {diffResult.nodesChanged.length > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold">~{diffResult.nodesChanged.length} {t('versions.changedNodes')}</span>}
                {diffResult.edgesAdded.length > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">+{diffResult.edgesAdded.length} {t('versions.edges')}</span>}
                {diffResult.edgesRemoved.length > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-semibold">-{diffResult.edgesRemoved.length} {t('versions.edges')}</span>}
                {diffResult.edgesChanged.length > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold">~{diffResult.edgesChanged.length} {t('versions.changedEdges')}</span>}
              </div>

              <div className="space-y-3 text-xs">
                {/* Nodes Added */}
                {diffResult.nodesAdded.length > 0 && (
                  <div className="flex items-start gap-2">
                    <PlusCircle size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-emerald-400 font-semibold">{t('versions.addedNodes')} ({diffResult.nodesAdded.length}):</span>
                      <p className="text-muted-foreground">{diffResult.nodesAdded.join(', ')}</p>
                    </div>
                  </div>
                )}

                {/* Nodes Removed */}
                {diffResult.nodesRemoved.length > 0 && (
                  <div className="flex items-start gap-2">
                    <MinusCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-red-400 font-semibold">{t('versions.removedNodes')} ({diffResult.nodesRemoved.length}):</span>
                      <p className="text-muted-foreground">{diffResult.nodesRemoved.join(', ')}</p>
                    </div>
                  </div>
                )}

                {/* Nodes Changed – with details */}
                {diffResult.nodesChanged.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <RefreshCw size={13} className="text-amber-400 shrink-0" />
                      <span className="text-amber-400 font-semibold">{t('versions.modifiedNodes')} ({diffResult.nodesChanged.length}):</span>
                    </div>
                    {diffResult.nodesChanged.map((nc, idx) => (
                      <div key={idx} className="ml-5 p-2 bg-secondary/50 border border-border rounded-lg">
                        <p className="text-foreground font-semibold text-[11px] mb-1">📌 {nc.nodeLabel}</p>
                        <ul className="space-y-0.5">
                          {nc.details.map((d, i) => (
                            <li key={i} className="text-muted-foreground text-[10px] pl-2 border-l-2 border-amber-500/30">
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {/* Edges Added */}
                {diffResult.edgesAdded.length > 0 && (
                  <div className="flex items-start gap-2 pt-1 border-t border-border/50">
                    <PlusCircle size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-emerald-400 font-semibold">{t('versions.addedEdges')} ({diffResult.edgesAdded.length}):</span>
                      {diffResult.edgesAdded.map((e, i) => (
                        <p key={i} className="text-muted-foreground text-[10px]">{e}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edges Removed */}
                {diffResult.edgesRemoved.length > 0 && (
                  <div className="flex items-start gap-2">
                    <MinusCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-red-400 font-semibold">{t('versions.removedEdges')} ({diffResult.edgesRemoved.length}):</span>
                      {diffResult.edgesRemoved.map((e, i) => (
                        <p key={i} className="text-muted-foreground text-[10px]">{e}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edges Changed – with details */}
                {diffResult.edgesChanged.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <RefreshCw size={13} className="text-blue-400 shrink-0" />
                      <span className="text-blue-400 font-semibold">{t('versions.modifiedEdges')} ({diffResult.edgesChanged.length}):</span>
                    </div>
                    {diffResult.edgesChanged.map((ec, idx) => (
                      <div key={idx} className="ml-5 p-2 bg-secondary/50 border border-border rounded-lg">
                        <p className="text-foreground font-semibold text-[11px] mb-1">🔗 {ec.edgeLabel}</p>
                        <ul className="space-y-0.5">
                          {ec.details.map((d, i) => (
                            <li key={i} className="text-muted-foreground text-[10px] pl-2 border-l-2 border-blue-500/30">
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {/* No changes */}
                {diffResult.nodesAdded.length === 0 && diffResult.nodesRemoved.length === 0 && diffResult.nodesChanged.length === 0 && diffResult.edgesAdded.length === 0 && diffResult.edgesRemoved.length === 0 && diffResult.edgesChanged.length === 0 && (
                  <p className="text-muted-foreground italic">{t('versionsExt.noDiff')}</p>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          {versions.length > 0 && (
            <div className="px-5 py-2.5 border-t border-border bg-background shrink-0">
              <p className="text-[9px] text-muted-foreground text-center">
                {t('versions.versionsCount', { count: versions.length })} · {t('versions.restoreWarning')}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
