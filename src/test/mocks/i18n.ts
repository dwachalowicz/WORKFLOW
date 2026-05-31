/**
 * Minimal i18n mock for testing.
 * Returns the translation key as-is so assertions can match on keys.
 */
import { vi } from 'vitest';

const t = vi.fn((key: string) => key);

export const useTranslation = () => ({
  t,
  i18n: {
    language: 'en',
    changeLanguage: vi.fn(),
  },
});

export default {
  t,
  use: () => ({ init: () => {} }),
  init: vi.fn(),
  language: 'en',
};
