import { describe, it, expect } from 'vitest';
import {
  getEffectiveTier,
  getTierLimits,
  getTierLabel,
  getTierColor,
  getTierBgColor,
  formatLimit,
  type UserTier,
} from '../tierLimits';

describe('getEffectiveTier', () => {
  it('returns FREE when no tier is provided', () => {
    expect(getEffectiveTier()).toBe('FREE');
    expect(getEffectiveTier(undefined)).toBe('FREE');
  });

  it('returns FREE when tier is FREE', () => {
    expect(getEffectiveTier('FREE')).toBe('FREE');
  });

  it('returns tier as-is when no expiration is set', () => {
    expect(getEffectiveTier('PRO')).toBe('PRO');
    expect(getEffectiveTier('MEDIUM')).toBe('MEDIUM');
  });

  it('returns tier when expiration is in the future', () => {
    const future = new Date(Date.now() + 86400000).toISOString(); // +1 day
    expect(getEffectiveTier('PRO', future)).toBe('PRO');
  });

  it('downgrades to FREE when expiration is in the past', () => {
    const past = new Date(Date.now() - 86400000).toISOString(); // -1 day
    expect(getEffectiveTier('PRO', past)).toBe('FREE');
    expect(getEffectiveTier('MEDIUM', past)).toBe('FREE');
  });

  it('keeps tier when expiration date is invalid', () => {
    expect(getEffectiveTier('PRO', 'not-a-date')).toBe('PRO');
  });

  it('handles null expiration (admin-granted)', () => {
    expect(getEffectiveTier('PRO', null)).toBe('PRO');
  });

  it('is case-insensitive', () => {
    expect(getEffectiveTier('pro' as UserTier)).toBe('PRO');
    expect(getEffectiveTier('medium' as UserTier)).toBe('MEDIUM');
  });
});

describe('getTierLimits', () => {
  it('returns limits for FREE tier by default', () => {
    const limits = getTierLimits();
    expect(limits.maxWorkspaces).toBe(1);
    expect(limits.maxProcesses).toBe(10);
    expect(limits.aiAccess).toBe('none');
  });

  it('returns limits for MEDIUM tier', () => {
    const limits = getTierLimits('MEDIUM');
    expect(limits.maxWorkspaces).toBe(3);
    expect(limits.canUseTemplates).toBe(true);
    expect(limits.aiAccess).toBe('byok');
  });

  it('returns limits for PRO tier', () => {
    const limits = getTierLimits('PRO');
    expect(limits.maxWorkspaces).toBe(10);
    expect(limits.canUseCrossWorkflowTriggers).toBe(true);
    expect(limits.canShareWithPassword).toBe(true);
  });

  it('falls back to FREE for unknown tier', () => {
    const limits = getTierLimits('UNKNOWN');
    expect(limits.maxWorkspaces).toBe(1);
  });
});

describe('getTierLabel', () => {
  it('returns label for each tier', () => {
    expect(getTierLabel('FREE')).toBe('Free');
    expect(getTierLabel('MEDIUM')).toBe('Medium');
    expect(getTierLabel('PRO')).toBe('Pro');
  });
});

describe('getTierColor', () => {
  it('returns color class for each tier', () => {
    expect(getTierColor('FREE')).toContain('text-');
    expect(getTierColor('PRO')).toContain('text-');
  });
});

describe('getTierBgColor', () => {
  it('returns bg class for each tier', () => {
    expect(getTierBgColor('FREE')).toContain('bg-');
    expect(getTierBgColor('PRO')).toContain('bg-');
  });
});

describe('formatLimit', () => {
  it('returns ∞ for Infinity', () => {
    expect(formatLimit(Infinity)).toBe('∞');
  });

  it('returns number as string for finite values', () => {
    expect(formatLimit(10)).toBe('10');
    expect(formatLimit(0)).toBe('0');
    expect(formatLimit(999)).toBe('999');
  });
});
