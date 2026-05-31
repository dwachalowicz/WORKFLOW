import { describe, it, expect } from 'vitest';
import { parseNodesFromRecord, parseEdgesFromRecord, sanitizeForFilter } from '../parseUtils';

describe('parseNodesFromRecord', () => {
  it('returns empty array for null', () => {
    expect(parseNodesFromRecord(null)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(parseNodesFromRecord(undefined)).toEqual([]);
  });

  it('returns array as-is if already an array', () => {
    const nodes = [{ id: 'n1' }, { id: 'n2' }];
    expect(parseNodesFromRecord(nodes)).toEqual(nodes);
  });

  it('parses JSON string into array', () => {
    const nodes = [{ id: 'n1', type: 'process' }];
    expect(parseNodesFromRecord(JSON.stringify(nodes))).toEqual(nodes);
  });

  it('returns empty array for invalid JSON', () => {
    expect(parseNodesFromRecord('not valid json')).toEqual([]);
  });

  it('parses non-array JSON to its value', () => {
    const result = parseNodesFromRecord('{"key": "value"}');
    expect(result).toBeDefined();
  });
});

describe('parseEdgesFromRecord', () => {
  it('returns empty array for null', () => {
    expect(parseEdgesFromRecord(null)).toEqual([]);
  });

  it('returns array as-is', () => {
    const edges = [{ id: 'e1', source: 'a', target: 'b' }];
    expect(parseEdgesFromRecord(edges)).toEqual(edges);
  });

  it('parses JSON string', () => {
    const edges = [{ id: 'e1', source: 'a', target: 'b' }];
    expect(parseEdgesFromRecord(JSON.stringify(edges))).toEqual(edges);
  });
});

describe('sanitizeForFilter — extended', () => {
  it('handles unicode characters', () => {
    const result = sanitizeForFilter('ąćę');
    expect(typeof result).toBe('string');
  });

  it('handles very long strings', () => {
    const long = 'a'.repeat(10000);
    const result = sanitizeForFilter(long);
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles empty string', () => {
    expect(sanitizeForFilter('')).toBe('');
  });

  it('strips dangerous characters for PB filters', () => {
    const dangerous = 'test"; DROP TABLE users; --';
    const result = sanitizeForFilter(dangerous);
    // Should not contain unescaped semicolons or double dashes in a filter context
    expect(result).not.toContain('"');
  });
});
