import { useState, useId } from 'react';
import { motion } from 'framer-motion';

/* ── Animated Ring (completeness gauge) ── */
export const CompletionRing = ({ pct, size = 120, label }: { pct: number; size?: number; label: string }) => {
  const r = size / 2, sw = 7, ir = r - sw - 4, circ = 2 * Math.PI * ir;
  const filled = circ * (pct / 100);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={r} cy={r} r={ir} fill="none" className="stroke-muted-foreground/15" strokeWidth={sw} />
        <motion.circle cx={r} cy={r} r={ir} fill="none" stroke="#bc9b59" strokeWidth={sw}
          strokeDasharray={`${filled} ${circ - filled}`} strokeDashoffset={circ * 0.25}
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${filled} ${circ - filled}` }}
          transition={{ duration: 1, ease: 'easeOut' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className="text-2xl font-bold text-foreground tabular-nums leading-none"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          {pct}<span className="text-sm text-muted-foreground">%</span>
        </motion.span>
        {label && <span className="text-[9px] text-muted-foreground uppercase tracking-widest mt-1">{label}</span>}
      </div>
    </div>
  );
};



// Color constants for completeness criteria
const SLA_COLOR = '#10b981';   // emerald-500 (matches node SLA dot)
const COST_COLOR = '#06b6d4';  // cyan-500
const TEAM_COLOR = '#8b5cf6';  // violet-500

export { SLA_COLOR, COST_COLOR, TEAM_COLOR };

/* ── Gradient bar chart for completeness ── */
export interface BarItem {
  hasSla: boolean;
  hasCost: boolean;
  hasTeam: boolean;
  label: string;
}

export const CompletenessBarChart = ({ items, w = 380, h = 50, baseId }: { items: BarItem[]; w?: number; h?: number; baseId?: string }) => {
  const [hov, setHov] = useState<number | null>(null);
  const fallbackId = useId();
  const uid = (baseId || fallbackId).replace(/:/g, '');
  if (items.length === 0) return null;
  const barW = Math.min(20, (w - 8) / items.length - 4);
  const gap = 4;
  const totalW = items.length * (barW + gap) - gap;
  const offsetX = (w - totalW) / 2;
  const topPad = 4;
  const trackH = h - topPad;

  return (
    <div className="relative" style={{ width: w, height: h }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
        <defs>
          {/* Single-criterion fills */}
          <linearGradient id={`${uid}-sla`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={SLA_COLOR} stopOpacity="0.7" /><stop offset="100%" stopColor={SLA_COLOR} />
          </linearGradient>
          <linearGradient id={`${uid}-cost`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={COST_COLOR} stopOpacity="0.7" /><stop offset="100%" stopColor={COST_COLOR} />
          </linearGradient>
          <linearGradient id={`${uid}-team`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={TEAM_COLOR} stopOpacity="0.7" /><stop offset="100%" stopColor={TEAM_COLOR} />
          </linearGradient>
          {/* Two-criteria gradients */}
          <linearGradient id={`${uid}-sla-cost`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={SLA_COLOR} /><stop offset="100%" stopColor={COST_COLOR} />
          </linearGradient>
          <linearGradient id={`${uid}-sla-team`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={SLA_COLOR} /><stop offset="100%" stopColor={TEAM_COLOR} />
          </linearGradient>
          <linearGradient id={`${uid}-cost-team`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={COST_COLOR} /><stop offset="100%" stopColor={TEAM_COLOR} />
          </linearGradient>
          {/* All three */}
          <linearGradient id={`${uid}-all`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={SLA_COLOR} /><stop offset="40%" stopColor={COST_COLOR} /><stop offset="100%" stopColor={TEAM_COLOR} />
          </linearGradient>
        </defs>
        {items.map((item, i) => {
          const x = offsetX + i * (barW + gap);
          const score = (item.hasSla ? 1 : 0) + (item.hasCost ? 1 : 0) + (item.hasTeam ? 1 : 0);
          const barH = Math.max(4, (score / 3) * trackH);
          const barY = topPad + trackH - barH;
          // Pick gradient by exact combination
          let gradId = '';
          if (score === 3) gradId = `${uid}-all`;
          else if (item.hasSla && item.hasCost) gradId = `${uid}-sla-cost`;
          else if (item.hasSla && item.hasTeam) gradId = `${uid}-sla-team`;
          else if (item.hasCost && item.hasTeam) gradId = `${uid}-cost-team`;
          else if (item.hasSla) gradId = `${uid}-sla`;
          else if (item.hasCost) gradId = `${uid}-cost`;
          else if (item.hasTeam) gradId = `${uid}-team`;
          return (
            <g key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} style={{ cursor: 'pointer' }}>
              <rect x={x} y={topPad} width={barW} height={trackH} rx={barW / 2} className="fill-muted-foreground/10" />
              {score > 0 && (
                <motion.rect x={x} width={barW} rx={barW / 2}
                  fill={`url(#${gradId})`}
                  initial={{ height: 0, y: topPad + trackH }} animate={{ height: barH, y: barY }}
                  transition={{ duration: 0.4, delay: i * 0.025 }}
                  style={{ filter: hov === i ? 'brightness(1.2)' : 'none', opacity: hov === i ? 1 : 0.9 }} />
              )}
            </g>
          );
        })}
      </svg>
      {hov !== null && items[hov] && (
        <div className="absolute bg-popover text-popover-foreground text-[10px] px-2.5 py-1.5 rounded-lg whitespace-nowrap pointer-events-none z-10 font-medium border border-border shadow-lg"
          style={{ left: Math.min(Math.max(offsetX + hov * (barW + gap), 40), w - 100), top: -22, transform: 'translateX(-20%)' }}>
          {items[hov].label}: {[items[hov].hasSla && 'SLA', items[hov].hasCost && 'Cost', items[hov].hasTeam && 'Team'].filter(Boolean).join(' + ') || '—'}
        </div>
      )}
    </div>
  );
};
