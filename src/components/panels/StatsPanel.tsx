import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Edit3, Gavel } from 'lucide-react';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { CompletionRing, CompletenessBarChart, SLA_COLOR, COST_COLOR, TEAM_COLOR } from './stats/StatsCharts';
import type { BarItem } from './stats/StatsCharts';
import { useUiStore } from "@/store/uiStore";
import { useCanvasStore } from "@/store/canvasStore";

function parseDurationToHours(d: unknown, unit?: string): number {
  if (!d && d !== 0) return 0;
  if (typeof d === 'number') { if (unit === 'd') return d * 24; return d; }
  const s = String(d).trim();
  if (!s) return 0;
  const num = parseFloat(s);
  if (!isNaN(num) && /^[\d.,]+$/.test(s)) { if (unit === 'd') return num * 24; return num; }
  let hours = 0;
  const hMatch = s.match(/(\d+(?:[.,]\d+)?)\s*h/i);
  if (hMatch) hours += parseFloat(hMatch[1].replace(',', '.'));
  const dMatch = s.match(/(\d+(?:[.,]\d+)?)\s*d/i);
  if (dMatch) hours += parseFloat(dMatch[1].replace(',', '.')) * 24;
  const mMatch = s.match(/(\d+(?:[.,]\d+)?)\s*m/i);
  if (mMatch) hours += parseFloat(mMatch[1].replace(',', '.')) / 60;
  return hours;
}
function fmtHours(h: number): string {
  if (!h) return '—';
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h % 1 === 0 ? h : h.toFixed(1)}h`;
  const days = h / 24;
  return `${days % 1 === 0 ? days : days.toFixed(1)}d`;
}

const Mod = ({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <motion.div className={`bg-card rounded-2xl border border-border/50 px-6 py-5 ${className}`}
    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay }}>
    {children}
  </motion.div>
);

const NavBtn = ({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) => (
  <Button variant="iconGhost" size="iconSm" onClick={onClick} disabled={disabled} className="text-muted-foreground hover:text-foreground disabled:text-muted-foreground/30">
    {children}
  </Button>
);

export const StatsPanel = () => {
  const { t } = useTranslation();
  const isOpen = useUiStore(s => s.isStatsPanelOpen);
  const setOpen = useUiStore(s => s.setStatsPanelOpen);
  const nodes = useCanvasStore(s => s.nodes);
  const edges = useCanvasStore(s => s.edges);
  const [pathIdx, setPathIdx] = useState(0);
  const [bnIdx, setBnIdx] = useState(0);

  const base = useMemo(() => {
    const adj = new Map<string, string[]>(), nType = new Map<string, string>(), nLabel = new Map<string, string>();
    const inD = new Map<string, number>(), outD = new Map<string, number>();
    for (const n of nodes) {
      adj.set(n.id, []); inD.set(n.id, 0); outD.set(n.id, 0);
      nType.set(n.id, n.type || 'simple');
      nLabel.set(n.id, n.data?.label || n.data?.text?.slice(0, 20) || n.id);
    }
    const flowEdges = edges.filter(e => nType.get(e.source) !== 'database' && nType.get(e.target) !== 'database');
    for (const e of edges) adj.get(e.source)?.push(e.target);
    for (const e of flowEdges) { outD.set(e.source, (outD.get(e.source) || 0) + 1); inD.set(e.target, (inD.get(e.target) || 0) + 1); }

    const tc: Record<string, number> = {};
    for (const n of nodes) { const t = n.type || 'simple'; tc[t] = (tc[t] || 0) + 1; }
    const stages = (tc['simple'] || 0) + (tc['subworkflow'] || 0), startStop = tc['startstop'] || 0, dbs = tc['database'] || 0;

    let branching = 0;
    for (const n of nodes) {
      if (['startstop', 'note', 'database'].includes(n.type || '')) continue;
      if ((adj.get(n.id) || []).filter(t => nType.get(t) !== 'database').length > 1) branching++;
    }

    const starts = nodes.filter(n => n.type === 'startstop' && n.data?.type === 'start').map(n => n.id);
    const ends = new Set(nodes.filter(n => n.type === 'startstop' && n.data?.type === 'stop').map(n => n.id));
    const allPaths: string[][] = [];
    function dfs(c: string, v: string[]) {
      if (ends.has(c)) { allPaths.push([...v]); return; }
      const neighbors = (adj.get(c) || []).filter(nb => nType.get(nb) !== 'database');
      if (neighbors.length === 0) { allPaths.push([...v]); return; }
      for (const nb of neighbors) { if (!v.includes(nb)) { v.push(nb); dfs(nb, v); v.pop(); } }
    }
    for (const s of starts) dfs(s, [s]);
    allPaths.sort((a, b) => b.length - a.length);

    const total = nodes.length || 1;
    const donut = [
      { pct: stages / total, color: '#bc9b59', label: t('stats.stages'), count: stages },
      { pct: startStop / total, color: '#22c55e', label: 'Start/Stop', count: startStop },
      { pct: dbs / total, color: '#06b6d4', label: t('stats.databases'), count: dbs },
      { pct: (total - stages - startStop - dbs) / total, color: '#8b5cf6', label: t('stats.other'), count: total - stages - startStop - dbs },
    ].filter(s => s.pct > 0);

    const workNodes = nodes.filter(n => n.type === 'simple' || n.type === 'subworkflow');
    const wTotal = workNodes.length || 1;
    let hasSla = 0, hasCost = 0, hasTeam = 0;
    const completenessPerNode: number[] = [];
    for (const n of workNodes) {
      const costVal = n.data?.cost;
      const hasCostBool = costVal !== undefined && costVal !== null && costVal !== '' && costVal !== 0 && costVal !== '0';
      let score = 0, checks = 0;
      if (n.data?.maxDuration && n.data.maxDuration !== 0 && n.data.maxDuration !== '0') { hasSla++; score++; } checks++;
      if (hasCostBool) { hasCost++; score++; } checks++;
      if ((n.data?.editors?.length || 0) > 0) { hasTeam++; score++; } checks++;
      completenessPerNode.push(checks > 0 ? score / checks : 0);
    }
    const avgCompleteness = Math.round((completenessPerNode.reduce((a, b) => a + b, 0) / wTotal) * 100);
    const completenessItems: BarItem[] = workNodes.map((n) => {
      const costVal = n.data?.cost;
      const hasCostVal = costVal !== undefined && costVal !== null && costVal !== '' && costVal !== 0 && costVal !== '0';
      return {
        hasSla: !!n.data?.maxDuration && n.data.maxDuration !== 0 && n.data.maxDuration !== '0',
        hasCost: hasCostVal,
        hasTeam: (n.data?.editors?.length || 0) > 0,
        label: n.data?.label || n.id
      };
    });

    return { flowEdges: flowEdges.length, stages, branching, allPaths, donut, inD, outD, nType, nLabel, avgCompleteness, hasSla, hasCost, hasTeam, wTotal, completenessItems };
  }, [nodes, edges, t]);

  const pathStats = useMemo(() => {
    const path = base.allPaths[pathIdx] || [];
    const pathSet = new Set(path);
    const pathNodes = nodes.filter(n => pathSet.has(n.id));

    let slaHours = 0, slaCount = 0, maxSlaH = 0, maxSlaLabel = '';
    let costSum = 0, costCount = 0;
    for (const n of pathNodes) {
      if (n.data?.maxDuration) {
        const h = parseDurationToHours(n.data.maxDuration, n.data?.maxDurationUnit);
        if (h > 0) { slaHours += h; slaCount++; if (h > maxSlaH) { maxSlaH = h; maxSlaLabel = n.data?.label || ''; } }
      }
      if (n.data?.cost) {
        const costVal = parseFloat(String(n.data.cost).replace(/[^\d.,]/g, '').replace(',', '.'));
        if (!isNaN(costVal) && costVal > 0) { costSum += costVal; costCount++; }
      }
    }

    const tm = new Map<string, { name: string; editorTasks: number; decisionTasks: number; avatar?: string }>();
    for (const n of pathNodes) {
      for (const p of (n.data?.editors || [])) {
        if (!p?.name) continue;
        const ex = tm.get(p.name);
        if (ex) ex.editorTasks++; else tm.set(p.name, { name: p.name, editorTasks: 1, decisionTasks: 0, avatar: p.avatar });
      }
    }
    for (const e of edges) {
      if (!pathSet.has(e.source) || !pathSet.has(e.target)) continue;
      for (const dm of (e.data?.decisionMakers || [])) {
        if (!dm?.name) continue;
        const ex = tm.get(dm.name);
        if (ex) ex.decisionTasks++; else tm.set(dm.name, { name: dm.name, editorTasks: 0, decisionTasks: 1, avatar: dm.avatar });
      }
    }
    const team = [...tm.values()].sort((a, b) => (b.editorTasks + b.decisionTasks) - (a.editorTasks + a.decisionTasks)).slice(0, 8);

    const bottlenecks = pathNodes.filter(n => n.type !== 'note' && n.type !== 'database' && n.type !== 'startstop')
      .map(n => ({ id: n.id, label: n.data?.label || n.id, deg: (base.inD.get(n.id) || 0) + (base.outD.get(n.id) || 0) }))
      .sort((a, b) => b.deg - a.deg).slice(0, 10);

    return { length: path.length, slaHours, slaCount, maxSlaLabel, costSum, costCount, team, bottlenecks };
  }, [nodes, base.allPaths, pathIdx, base.inD, base.outD, edges]);

  const clampPath = (i: number) => { setPathIdx(Math.max(0, Math.min(i, base.allPaths.length - 1))); setBnIdx(0); };
  const clampBn = (i: number) => setBnIdx(Math.max(0, Math.min(i, pathStats.bottlenecks.length - 1)));
  const bn = pathStats.bottlenecks[bnIdx];
  const hasPaths = base.allPaths.length > 0;



  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-[100] flex items-center justify-center pb-14 md:pb-0"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <motion.div className="relative w-[95vw] md:w-[90vw] max-w-[1000px] max-h-[85vh] md:max-h-[90vh] bg-background rounded-2xl md:rounded-3xl border border-border shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.25 }}>

            {/* Header */}
            <div className="flex items-center justify-between px-4 md:px-8 pt-5 md:pt-7 pb-2">
              <div>
                <h2 className="text-xl font-bold text-foreground tracking-tight">{t('stats.title')}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{nodes.length} {t('stats.nodesLower')} · {base.flowEdges} {t('stats.connectionsLower')}</p>
              </div>
              <Button variant="iconGhost" size="iconSm" onClick={() => setOpen(false)} className="bg-secondary/20 hover:bg-secondary/40">
                <X size={15} />
              </Button>
            </div>

            <div className="px-4 md:px-8 pb-6 md:pb-8 pt-4 space-y-5 overflow-y-auto max-h-[calc(85vh-80px)] md:max-h-[calc(90vh-80px)]">

              {/* ── Completeness (full width) ── */}
              <Mod delay={0.1}>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <CompletionRing pct={base.avgCompleteness} size={90} label="" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">{t('ui.completeness')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <CompletenessBarChart items={base.completenessItems} w={720} h={56} />
                    <div className="flex items-center justify-center gap-6 mt-2">
                      <SimpleTooltip content={t('stats.slaTooltip')}>
                        <div className="flex items-center gap-1.5 text-xs cursor-help">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SLA_COLOR }} />
                          <span className="text-muted-foreground">SLA</span>
                          <span className="text-foreground font-semibold tabular-nums">{base.hasSla}/{base.wTotal}</span>
                        </div>
                      </SimpleTooltip>
                      <SimpleTooltip content={t('stats.costTooltip')}>
                        <div className="flex items-center gap-1.5 text-xs cursor-help">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COST_COLOR }} />
                          <span className="text-muted-foreground">{t('stats.cost')}</span>
                          <span className="text-foreground font-semibold tabular-nums">{base.hasCost}/{base.wTotal}</span>
                        </div>
                      </SimpleTooltip>
                      <SimpleTooltip content={t('stats.teamTooltip')}>
                        <div className="flex items-center gap-1.5 text-xs cursor-help">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TEAM_COLOR }} />
                          <span className="text-muted-foreground">{t('properties.editors')}</span>
                          <span className="text-foreground font-semibold tabular-nums">{base.hasTeam}/{base.wTotal}</span>
                        </div>
                      </SimpleTooltip>
                    </div>
                  </div>
                </div>
              </Mod>

              {/* ── Path selector & Mini Visualization ── */}
              {hasPaths && (
                <div className="flex flex-col gap-3">
                  <motion.div className="flex items-center justify-center gap-4 py-3.5 bg-muted/50 rounded-2xl border border-border/50"
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
                    <NavBtn onClick={() => clampPath(pathIdx - 1)} disabled={pathIdx === 0}><ChevronLeft size={16} /></NavBtn>
                    <div className="text-center min-w-[140px]">
                      <span className="text-sm font-bold text-foreground tabular-nums">
                        {t('stats.path')} {pathIdx + 1} <span className="text-muted-foreground font-normal">/ {base.allPaths.length}</span>
                      </span>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {pathStats.length} {t('statsExt.steps')} · {pathStats.length === base.allPaths[0]?.length ? t('stats.longest') : pathStats.length === base.allPaths[base.allPaths.length - 1]?.length ? t('stats.shortest') : t('stats.average')}
                      </div>
                    </div>
                    <NavBtn onClick={() => clampPath(pathIdx + 1)} disabled={pathIdx >= base.allPaths.length - 1}><ChevronRight size={16} /></NavBtn>
                  </motion.div>

                  {/* Mini visualization */}
                  <motion.div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin px-1"
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.25 }}>
                    {base.allPaths[pathIdx].map((nodeId, idx) => {
                       const node = nodes.find(n => n.id === nodeId);
                       if (!node) return null;
                       const type = node.type || 'simple';
                       const label = node.data?.label || node.data?.text?.slice(0, 20) || nodeId;
                       let colorClass = "bg-card border-border text-foreground";
                       
                       if (type === 'startstop') {
                         if (node.data?.type === 'start') {
                           colorClass = "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400";
                         } else {
                           colorClass = "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400";
                         }
                       } else if (type === 'subworkflow') {
                         colorClass = "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400";
                       } else if (type === 'database') {
                         colorClass = "bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400";
                       }
                       
                       return (
                         <div key={`${pathIdx}-${nodeId}-${idx}`} className="flex items-center gap-1.5 flex-shrink-0">
                           <SimpleTooltip content={label} side="top">
                             <div className={`flex items-center justify-center px-3 py-1.5 rounded-[10px] border text-[11px] font-medium max-w-[120px] truncate transition-colors ${colorClass}`}>
                               <span className="truncate">{label}</span>
                             </div>
                           </SimpleTooltip>
                           {idx < base.allPaths[pathIdx].length - 1 && (
                             <div className="text-muted-foreground/40 flex-shrink-0">
                               <ChevronRight size={14} />
                             </div>
                           )}
                         </div>
                       )
                    })}
                  </motion.div>
                </div>
              )}
              {!hasPaths && (
                <div className="text-center text-xs text-muted-foreground py-2">{t('statsExt.noCompletePaths')}</div>
              )}

              {/* ── Row 2: Path-dependent stats ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Bottleneck */}
                <Mod delay={0.25}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">{t('statsExt.bottleneck')}</span>
                    </div>
                    {pathStats.bottlenecks.length > 1 && (
                      <div className="flex items-center gap-1">
                        <NavBtn onClick={() => clampBn(bnIdx - 1)} disabled={bnIdx === 0}><ChevronLeft size={12} /></NavBtn>
                        <span className="text-[10px] text-muted-foreground tabular-nums">{bnIdx + 1}/{pathStats.bottlenecks.length}</span>
                        <NavBtn onClick={() => clampBn(bnIdx + 1)} disabled={bnIdx >= pathStats.bottlenecks.length - 1}><ChevronRight size={12} /></NavBtn>
                      </div>
                    )}
                  </div>
                  {bn ? (
                    <>
                      <SimpleTooltip content={bn.label} side="top">
                        <div className="text-lg font-bold text-foreground truncate cursor-default">{bn.label}</div>
                      </SimpleTooltip>
                      <div className="text-xs text-muted-foreground mt-1.5">{bn.deg} {t('stats.connections')}</div>
                    </>
                  ) : <div className="text-2xl text-muted-foreground font-normal">-</div>}
                </Mod>

                {/* SLA */}
                <Mod delay={0.3}>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-widest mb-3 font-medium">{t('statsExt.executionTime')}</div>
                  <div className="text-3xl font-bold text-foreground leading-none tracking-tight">{fmtHours(pathStats.slaHours)}</div>
                  <div className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {pathStats.slaCount > 0 ? t('statsExt.sumFromStages', { count: pathStats.slaCount, label: pathStats.maxSlaLabel }) : t('statsExt.noTimesSet')}
                  </div>
                </Mod>

                {/* Cost */}
                <Mod delay={0.35}>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-widest mb-3 font-medium">{t('statsExt.pathCost')}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground leading-none tracking-tight">{pathStats.costCount > 0 ? pathStats.costSum.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'}</span>
                    {pathStats.costCount > 0 && <span className="text-sm text-muted-foreground font-medium">PLN</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {pathStats.costCount > 0 ? t('statsExt.sumCostFromStages', { count: pathStats.costCount }) : t('statsExt.noCostsSet')}
                  </div>
                </Mod>
              </div>

              {/* ── Team workload ── */}
              <Mod delay={0.4}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">
                      {t('stats.teamWorkload')} · {pathStats.team.length} {t('stats.groups')}
                    </span>
                    {hasPaths && <span className="text-[10px] text-muted-foreground/60 ml-1">({t('stats.path')} {pathIdx + 1})</span>}
                  </div>
                </div>
                {pathStats.team.length > 0 ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {pathStats.team.map((p, i) => {
                      const totalTasks = p.editorTasks + p.decisionTasks;
                      const maxT = Math.max(...pathStats.team.map(t => t.editorTasks + t.decisionTasks), 1);
                      const pctW = Math.round((totalTasks / maxT) * 100);
                      return (
                        <motion.div key={`${pathIdx}-${i}`}
                          className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-3.5 hover:bg-muted/70 transition-colors"
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.04 }}>
                          {p.avatar ? (
                            <img loading="lazy" src={p.avatar} alt={p.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-brand-gold/15 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold text-brand-gold">{p.name[0]}</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <SimpleTooltip content={p.name} side="top">
                              <div className="text-sm text-foreground truncate font-medium cursor-default">{p.name}</div>
                            </SimpleTooltip>
                            <SimpleTooltip content={`${t('stats.workload')}: ${totalTasks} / ${maxT} max (${pctW}%)`}>
                              <div className="mt-2 h-1.5 bg-muted-foreground/10 rounded-full overflow-hidden cursor-help">
                                <motion.div className="h-full rounded-full bg-brand-gold" key={pathIdx}
                                  initial={{ width: 0 }} animate={{ width: `${pctW}%` }}
                                  transition={{ duration: 0.5, delay: 0.05 + i * 0.04 }} />
                              </div>
                            </SimpleTooltip>
                          </div>
                          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                            {p.editorTasks > 0 && (
                              <SimpleTooltip content={t('stats.editor')}>
                                <span className="flex items-center gap-1 text-sm text-muted-foreground font-bold tabular-nums cursor-help">
                                  <Edit3 size={11} />{p.editorTasks}
                                </span>
                              </SimpleTooltip>
                            )}
                            {p.decisionTasks > 0 && (
                              <SimpleTooltip content={t('stats.decider')}>
                                <span className="flex items-center gap-1 text-sm text-muted-foreground font-bold tabular-nums cursor-help">
                                  <Gavel size={11} />{p.decisionTasks}
                                </span>
                              </SimpleTooltip>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('statsExt.noAssigned')}</p>
                )}
              </Mod>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
