import { describe, it, expect } from 'vitest';
import { parseNodesSafe, parseEdgesSafe } from '../schemas';

describe('parseNodesSafe', () => {
  it('returns empty array for null', () => {
    expect(parseNodesSafe(null)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(parseNodesSafe(undefined)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseNodesSafe('')).toEqual([]);
  });

  it('parses valid JSON string', () => {
    const nodes = [{ id: 'n1', type: 'process', position: { x: 0, y: 0 }, data: {} }];
    const result = parseNodesSafe(JSON.stringify(nodes));
    expect(result).toEqual(nodes);
  });

  it('parses array directly', () => {
    const nodes = [{ id: 'n1', type: 'process', position: { x: 10, y: 20 }, data: { label: 'Test' } }];
    const result = parseNodesSafe(nodes);
    expect(result).toEqual(nodes);
  });

  it('returns empty array for invalid JSON string', () => {
    expect(parseNodesSafe('{invalid json')).toEqual([]);
  });

  it('returns empty array for non-array JSON', () => {
    expect(parseNodesSafe('{"key": "value"}')).toEqual([]);
  });

  it('returns empty array for number input', () => {
    expect(parseNodesSafe(42)).toEqual([]);
  });

  it('handles empty array', () => {
    expect(parseNodesSafe([])).toEqual([]);
  });

  it('handles array with multiple nodes', () => {
    const nodes = [
      { id: 'n1', type: 'startstop', position: { x: 0, y: 0 }, data: { type: 'start' } },
      { id: 'n2', type: 'process', position: { x: 200, y: 100 }, data: { label: 'Task 1' } },
      { id: 'n3', type: 'startstop', position: { x: 400, y: 0 }, data: { type: 'stop' } },
    ];
    expect(parseNodesSafe(nodes)).toEqual(nodes);
  });
});

describe('parseEdgesSafe', () => {
  it('returns empty array for null', () => {
    expect(parseEdgesSafe(null)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(parseEdgesSafe(undefined)).toEqual([]);
  });

  it('parses valid JSON string', () => {
    const edges = [{ id: 'e1', source: 'n1', target: 'n2' }];
    const result = parseEdgesSafe(JSON.stringify(edges));
    expect(result).toEqual(edges);
  });

  it('parses array directly', () => {
    const edges = [{ id: 'e1', source: 'n1', target: 'n2', data: { label: 'Yes' } }];
    expect(parseEdgesSafe(edges)).toEqual(edges);
  });

  it('returns empty array for malformed data', () => {
    expect(parseEdgesSafe('not-json')).toEqual([]);
  });

  it('handles empty array', () => {
    expect(parseEdgesSafe([])).toEqual([]);
  });
});
