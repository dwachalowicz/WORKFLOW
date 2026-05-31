/**
 * PocketBase mock for Vitest.
 *
 * Provides vi.fn() stubs for every PB method used in the codebase,
 * so stores and components can be tested without a live backend.
 */
import { vi } from 'vitest';

// Default empty results – each test can override via mockResolvedValueOnce
const emptyList = { items: [], totalItems: 0, totalPages: 0, page: 1, perPage: 50 };

const createMockCollection = () => ({
  getFullList: vi.fn().mockResolvedValue([]),
  getList: vi.fn().mockResolvedValue(emptyList),
  getOne: vi.fn().mockResolvedValue({}),
  create: vi.fn().mockResolvedValue({ id: 'mock-id' }),
  update: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue(undefined),
  subscribe: vi.fn().mockResolvedValue(undefined),
  unsubscribe: vi.fn().mockResolvedValue(undefined),
});

// Keep a registry so tests can access specific collection mocks
const collections: Record<string, ReturnType<typeof createMockCollection>> = {};

export const getCollectionMock = (name: string) => {
  if (!collections[name]) collections[name] = createMockCollection();
  return collections[name];
};

export const resetAllCollections = () => {
  Object.keys(collections).forEach(k => delete collections[k]);
};

export const pb = {
  collection: vi.fn((name: string) => getCollectionMock(name)),
  authStore: {
    model: null as Record<string, unknown> | null,
    token: '',
    isValid: false,
    clear: vi.fn(),
    onChange: vi.fn(),
  },
  send: vi.fn().mockResolvedValue({}),
  baseUrl: 'https://pb.test.local',
};

// Helper: cast as the real PocketBase type consumers expect
export const getAvatarUrl = vi.fn().mockReturnValue('');
export const getRecordFileUrl = vi.fn().mockReturnValue('');
