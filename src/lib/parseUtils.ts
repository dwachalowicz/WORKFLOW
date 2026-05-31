/**
 * Shared utilities for parsing serialized workflow data from PocketBase records.
 *
 * PocketBase stores nodes/edges as JSON text or raw arrays depending on
 * how the record was written.  These helpers normalise both representations
 * into plain arrays, eliminating the duplicated try/catch logic that was
 * previously scattered across 6+ files.
 */

import type { Node, Edge } from '@xyflow/react';

/** Parse a `nodes` field that may be a JSON string or an array */
export function parseNodesFromRecord(raw: unknown): Node[] {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) return raw as Node[];
  return [];
}

/** Parse an `edges` field that may be a JSON string or an array */
export function parseEdgesFromRecord(raw: unknown): Edge[] {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) return raw as Edge[];
  return [];
}

/**
 * Sanitize a value before interpolating into PocketBase filter strings.
 * Removes quotes and backslashes to prevent filter injection.
 *
 * Centralised here so every file uses the same implementation.
 */
export const sanitizeForFilter = (v: string): string =>
  v.replace(/["'\\]/g, '');
