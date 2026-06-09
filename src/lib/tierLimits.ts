/**
 * Tier-based limits for the FLOW.GRYF.AI Workflow platform.
 * 
 * Configuration is loaded from PocketBase collection `WORKFLOW_tier_config`.
 * Hardcoded defaults are used as fallback if the DB is unreachable.
 *
 * Call `loadTierConfig()` once during app initialization.
 * After that, `getTierLimits()` returns cached, synchronous results.
 */

import { pb } from '@/lib/pocketbase';

export type UserTier = 'FREE' | 'MEDIUM' | 'PRO';

export interface TierLimits {
  /** Max number of workspaces user can own */
  maxWorkspaces: number;
  /** Max number of version snapshots per process */
  maxVersionsPerProcess: number;
  /** Max number of processes across all workspaces */
  maxProcesses: number;

  // ── Canvas limits ──────────────────────────────────────────────
  /** Max nodes (excl. notes) per process */
  maxNodesPerProcess: number;
  /** Max edges per process */
  maxEdgesPerProcess: number;
  /** Max sticky notes per process */
  maxNotesPerProcess: number;

  // ── Workspace / team limits ────────────────────────────────────
  /** Max active + pending members per workspace */
  maxMembersPerWorkspace: number;
  /** Max groups (folders) per workspace */
  maxGroupsPerWorkspace: number;

  // ── Per-process detail limits ──────────────────────────────────
  /** Max comments per process */
  maxCommentsPerProcess: number;
  /** Max process variables per process */
  maxVariablesPerProcess: number;
  /** Max checklist items per single node */
  maxChecklistItemsPerNode: number;

  // ── AI ─────────────────────────────────────────────────────────
  /** AI assistant availability: 'none' | 'byok' */
  aiAccess: 'none' | 'byok';
  /** Max messages kept in AI conversation memory */
  aiMemoryLength: number;

  // ── Feature flags ──────────────────────────────────────────────
  /** Can use templates library */
  canUseTemplates: boolean;
  /** Can use presentation mode */
  canPresent: boolean;
  /** Can create subworkflow nodes */
  canUseSubworkflows: boolean;
  /** Can configure cross-workflow triggers (enter/exit actions) */
  canUseCrossWorkflowTriggers: boolean;
  /** Can view Process Map */
  canUseProcessMap: boolean;
  /** Can share processes via public link */
  canSharePublic: boolean;
  /** Can protect shared links with password */
  canShareWithPassword: boolean;
  /** Can view advanced stats panel */
  canUseAdvancedStats: boolean;
}

/** Extended interface with display metadata from DB */
export interface TierConfig extends TierLimits {
  label: string;
  color: string;
  bgColor: string;
  priceMonthly: number;
  priceAnnual: number;
  priceMonthlyPln: number;
  priceAnnualPln: number;
  priceMonthlyEur: number;
  priceAnnualEur: number;
  sortOrder: number;
}

// ── Hardcoded fallbacks (used if DB is unreachable) ─────────────────

const INF = 999999; // PocketBase can't store Infinity — we use 999999 as "unlimited"

/** Convert DB value (999999) to JS Infinity for runtime checks */
function toInf(val: number): number {
  return val >= INF ? Infinity : val;
}

const FALLBACK_CONFIG: Record<UserTier, TierConfig> = {
  FREE: {
    label: 'Free', color: 'text-muted-foreground', bgColor: 'bg-gray-500/10',
    priceMonthly: 0, priceAnnual: 0,
    priceMonthlyPln: 0, priceAnnualPln: 0,
    priceMonthlyEur: 0, priceAnnualEur: 0,
    sortOrder: 0,
    maxWorkspaces: 1, maxVersionsPerProcess: 5, maxProcesses: 10,
    maxNodesPerProcess: 25, maxEdgesPerProcess: 30, maxNotesPerProcess: 3,
    maxMembersPerWorkspace: 2, maxGroupsPerWorkspace: 2,
    maxCommentsPerProcess: 10, maxVariablesPerProcess: 3, maxChecklistItemsPerNode: 3,
    aiAccess: 'byok', aiMemoryLength: 10,
    canUseTemplates: false, canPresent: false, canUseSubworkflows: false,
    canUseCrossWorkflowTriggers: false, canUseProcessMap: false,
    canSharePublic: false, canShareWithPassword: false, canUseAdvancedStats: false,
  },
  MEDIUM: {
    label: 'Medium', color: 'text-blue-400', bgColor: 'bg-blue-500/10',
    priceMonthly: 12, priceAnnual: 9,
    priceMonthlyPln: 49, priceAnnualPln: 39,
    priceMonthlyEur: 12, priceAnnualEur: 9,
    sortOrder: 1,
    maxWorkspaces: 3, maxVersionsPerProcess: 25, maxProcesses: 20,
    maxNodesPerProcess: 100, maxEdgesPerProcess: 150, maxNotesPerProcess: 20,
    maxMembersPerWorkspace: 5, maxGroupsPerWorkspace: 10,
    maxCommentsPerProcess: 100, maxVariablesPerProcess: 15, maxChecklistItemsPerNode: 10,
    aiAccess: 'byok', aiMemoryLength: 20,
    canUseTemplates: true, canPresent: true, canUseSubworkflows: true,
    canUseCrossWorkflowTriggers: false, canUseProcessMap: true,
    canSharePublic: true, canShareWithPassword: false, canUseAdvancedStats: true,
  },
  PRO: {
    label: 'Pro', color: 'text-brand-gold', bgColor: 'bg-brand-gold/10',
    priceMonthly: 35, priceAnnual: 28,
    priceMonthlyPln: 149, priceAnnualPln: 119,
    priceMonthlyEur: 35, priceAnnualEur: 28,
    sortOrder: 2,
    maxWorkspaces: 10, maxVersionsPerProcess: 100, maxProcesses: 100,
    maxNodesPerProcess: Infinity, maxEdgesPerProcess: Infinity, maxNotesPerProcess: Infinity,
    maxMembersPerWorkspace: 20, maxGroupsPerWorkspace: Infinity,
    maxCommentsPerProcess: Infinity, maxVariablesPerProcess: Infinity, maxChecklistItemsPerNode: Infinity,
    aiAccess: 'byok', aiMemoryLength: 50,
    canUseTemplates: true, canPresent: true, canUseSubworkflows: true,
    canUseCrossWorkflowTriggers: true, canUseProcessMap: true,
    canSharePublic: true, canShareWithPassword: true, canUseAdvancedStats: true,
  },
};

// ── Runtime cache ──────────────────────────────────────────────────

let tierConfigCache: Record<string, TierConfig> | null = null;
let configLoaded = false;

/**
 * Map a raw PocketBase record to our TierConfig shape.
 */
function mapRecordToConfig(rec: Record<string, unknown>): TierConfig {
  const num = (v: unknown, fallback: number) => Number(v ?? fallback);
  return {
    label: String(rec.label || rec.tier || ''),
    color: String(rec.color || 'text-muted-foreground'),
    bgColor: String(rec.bg_color || 'bg-gray-500/10'),
    priceMonthly: num(rec.price_monthly, 0),
    priceAnnual: num(rec.price_annual, 0),
    priceMonthlyPln: num(rec.price_monthly_pln, num(rec.price_monthly, 0) * 4),
    priceAnnualPln: num(rec.price_annual_pln, num(rec.price_annual, 0) * 4),
    priceMonthlyEur: num(rec.price_monthly_eur, num(rec.price_monthly, 0)),
    priceAnnualEur: num(rec.price_annual_eur, num(rec.price_annual, 0)),
    sortOrder: num(rec.sort_order, 0),
    maxWorkspaces: num(rec.max_workspaces, 1),
    maxProcesses: toInf(num(rec.max_processes, 10)),
    maxVersionsPerProcess: toInf(num(rec.max_versions_per_process, 5)),
    maxNodesPerProcess: toInf(num(rec.max_nodes_per_process, 25)),
    maxEdgesPerProcess: toInf(num(rec.max_edges_per_process, 30)),
    maxNotesPerProcess: toInf(num(rec.max_notes_per_process, 3)),
    maxMembersPerWorkspace: num(rec.max_members_per_workspace, 2),
    maxGroupsPerWorkspace: toInf(num(rec.max_groups_per_workspace, 2)),
    maxCommentsPerProcess: toInf(num(rec.max_comments_per_process, 10)),
    maxVariablesPerProcess: toInf(num(rec.max_variables_per_process, 3)),
    maxChecklistItemsPerNode: toInf(num(rec.max_checklist_items_per_node, 3)),
    aiAccess: (rec.ai_access || 'none') as 'none' | 'byok',
    aiMemoryLength: num(rec.ai_memory_length, 4),
    canUseTemplates: !!rec.can_use_templates,
    canPresent: !!rec.can_present,
    canUseSubworkflows: !!rec.can_use_subworkflows,
    canUseCrossWorkflowTriggers: !!rec.can_use_cross_workflow_triggers,
    canUseProcessMap: !!rec.can_use_process_map,
    canSharePublic: !!rec.can_share_public,
    canShareWithPassword: !!rec.can_share_with_password,
    canUseAdvancedStats: !!rec.can_use_advanced_stats,
  };
}

let tierConfigPromise: Promise<void> | null = null;

/**
 * Load tier configuration from PocketBase.
 * Should be called once during app initialization (e.g. in App.tsx useEffect).
 * Falls back to hardcoded defaults if the fetch fails.
 * Also subscribes to realtime changes — admin edits in PB are instantly reflected.
 */
export async function loadTierConfig(): Promise<void> {
  if (configLoaded) return;
  if (tierConfigPromise) return tierConfigPromise;

  tierConfigPromise = (async () => {
    try {
      const records = await pb.collection('WORKFLOW_tier_config').getFullList({
        sort: 'sort_order',
        requestKey: null,
      });
      if (records.length > 0) {
        const cache: Record<string, TierConfig> = {};
        for (const rec of records) {
          const tierKey = (rec.tier as string).toUpperCase();
          cache[tierKey] = mapRecordToConfig(rec);
        }
        tierConfigCache = cache;
        if (import.meta.env.DEV) console.log(`[TierConfig] Loaded ${records.length} tier(s) from database`);
      }

      // Subscribe to realtime changes — admin edits are instantly reflected
      pb.collection('WORKFLOW_tier_config').subscribe('*', (e) => {
        if (e.action === 'create' || e.action === 'update') {
          const tierKey = (e.record.tier as string).toUpperCase();
          if (!tierConfigCache) tierConfigCache = {};
          tierConfigCache[tierKey] = mapRecordToConfig(e.record);
          if (import.meta.env.DEV) console.log(`[TierConfig] Realtime: ${e.action} tier "${tierKey}"`);
        } else if (e.action === 'delete') {
          const tierKey = (e.record.tier as string).toUpperCase();
          if (tierConfigCache) delete tierConfigCache[tierKey];
          if (import.meta.env.DEV) console.log(`[TierConfig] Realtime: deleted tier "${tierKey}"`);
        }
      }).catch(err => {
        const error = err as { isAbort?: boolean };
        if (error.isAbort) return;
        console.warn('[TierConfig] Realtime subscription failed:', err);
      });
    } catch (err) {
      console.warn('[TierConfig] Failed to load from DB, using fallback defaults:', err);
    }
    configLoaded = true;
    tierConfigPromise = null;
  })();

  return tierConfigPromise;
}

/**
 * Cleanup: unsubscribe from realtime tier config changes and reset loaded state.
 * Call this during app unmount or hot-reload cleanup to prevent SSE leaks.
 */
export function unloadTierConfig(): void {
  pb.collection('WORKFLOW_tier_config').unsubscribe('*').catch(() => {
    // Ignore errors during cleanup — connection may already be closed
  });
  configLoaded = false;
}

/**
 * Get the full list of all tier configs (for pricing pages etc.)
 */
export function getAllTierConfigs(): TierConfig[] {
  const source = tierConfigCache || FALLBACK_CONFIG;
  return Object.values(source).sort((a, b) => a.sortOrder - b.sortOrder);
}

// ── Public API (synchronous, cached) ───────────────────────────────

/**
 * Compute effective tier, downgrading to FREE if subscription has expired.
 */
export function getEffectiveTier(tier?: UserTier | string, tierExpiresAt?: string | null): UserTier {
  const raw = ((tier || 'FREE').toUpperCase()) as UserTier;
  if (raw === 'FREE') return 'FREE';
  // If no expiration is set, treat as permanent (admin-granted)
  if (!tierExpiresAt) return raw;
  const expiryDate = new Date(tierExpiresAt);
  if (isNaN(expiryDate.getTime())) return raw; // invalid date — keep tier
  return expiryDate.getTime() > Date.now() ? raw : 'FREE';
}

/**
 * Get limits for a given user tier.
 * Returns cached DB config if available, otherwise hardcoded fallback.
 */
export function getTierLimits(tier?: UserTier | string): TierLimits {
  const key = (tier || 'FREE').toUpperCase();
  const source = tierConfigCache || FALLBACK_CONFIG;
  return source[key as UserTier] || source['FREE'] || FALLBACK_CONFIG.FREE;
}

/**
 * Get full config (limits + display metadata) for a tier.
 */
export function getTierConfig(tier?: UserTier | string): TierConfig {
  const key = (tier || 'FREE').toUpperCase();
  const source = tierConfigCache || FALLBACK_CONFIG;
  return source[key as UserTier] || source['FREE'] || FALLBACK_CONFIG.FREE;
}

/**
 * Display label for a tier (from DB if available)
 */
export function getTierLabel(tier?: UserTier | string): string {
  return getTierConfig(tier).label;
}

/**
 * Brand color for tier badge (from DB if available)
 */
export function getTierColor(tier?: UserTier | string): string {
  return getTierConfig(tier).color;
}

/**
 * Background color for tier badge (from DB if available)
 */
export function getTierBgColor(tier?: UserTier | string): string {
  return getTierConfig(tier).bgColor;
}

/**
 * Format a numeric limit for display.
 * Returns "∞" for Infinity, otherwise the number.
 */
export function formatLimit(value: number): string {
  return value === Infinity ? '∞' : String(value);
}
