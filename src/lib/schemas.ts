import { z } from 'zod';

/** Minimal node schema — validates structure, passes through extra fields */
const nodeSchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.unknown()).optional().transform(v => v ?? {}),
}).passthrough();

/** Minimal edge schema */
const edgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
}).passthrough();

const nodesArraySchema = z.array(nodeSchema);
const edgesArraySchema = z.array(edgeSchema);

/** Safely parse nodes from raw DB value. Returns [] on invalid data. */
export function parseNodesSafe(raw: unknown): z.infer<typeof nodesArraySchema> {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(data)) return [];
    const result = nodesArraySchema.safeParse(data);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

/** Safely parse edges from raw DB value. Returns [] on invalid data. */
export function parseEdgesSafe(raw: unknown): z.infer<typeof edgesArraySchema> {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(data)) return [];
    const result = edgesArraySchema.safeParse(data);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}
