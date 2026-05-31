import '@testing-library/jest-dom';
import { vi } from 'vitest';

// ── Mock PocketBase globally ──
vi.mock('@/lib/pocketbase', () => import('./mocks/pocketbase'));

// ── Mock react-i18next globally ──
vi.mock('react-i18next', () => import('./mocks/i18n'));

// ── Mock i18n config (used directly by workflowStore) ──
vi.mock('@/i18n/config', () => ({
  default: {
    t: (key: string) => key,
    language: 'en',
    changeLanguage: vi.fn(),
  },
}));
