import { useToastStore } from '@/store/toastStore';
import i18n from '@/i18n/config';

/**
 * Centralized error handler — replaces the repetitive try/catch → console.error → showToast pattern.
 *
 * Usage:
 *   await tryCatchToast(
 *     () => pb.collection('X').delete(id),
 *     { errorKey: 'errors.deleteFailed' }
 *   );
 *
 *   const result = await tryCatchToast(
 *     () => pb.collection('X').getFullList(),
 *     { errorKey: 'errors.fetchFailed', fallback: [] }
 *   );
 */

interface TryCatchOptions<T> {
  /** i18n key or literal string shown in error toast */
  errorKey?: string;
  /** Fallback value returned on error (default: undefined) */
  fallback?: T;
  /** If true, suppress console.error (default: false) */
  silent?: boolean;
  /** Optional callback before toast (e.g. setLoading(false)) */
  onError?: (err: unknown) => void;
}

/**
 * Execute an async operation with standardized error handling.
 * On failure: logs to console (in DEV), shows toast, returns fallback.
 */
export async function tryCatchToast<T>(
  fn: () => Promise<T>,
  options: TryCatchOptions<T> = {}
): Promise<T | undefined> {
  const { errorKey, fallback, silent = false, onError } = options;
  try {
    return await fn();
  } catch (err) {
    if (!silent && import.meta.env.DEV) {
      console.error(`[tryCatchToast] ${errorKey || 'unknown'}:`, err);
    }
    if (errorKey) {
      const translated = i18n.t(errorKey);
      // If i18n returns the key itself (missing translation), show generic error
      const message = translated !== errorKey ? translated : i18n.t('common.error');
      useToastStore.getState().showToast(message, 'error');
    }
    onError?.(err);
    return fallback as T | undefined;
  }
}

/**
 * Synchronous version for non-async contexts (rare).
 */
export function tryCatchSync<T>(
  fn: () => T,
  options: Pick<TryCatchOptions<T>, 'fallback' | 'silent'> = {}
): T | undefined {
  const { fallback, silent = false } = options;
  try {
    return fn();
  } catch (err) {
    if (!silent && import.meta.env.DEV) {
      console.error('[tryCatchSync]:', err);
    }
    return fallback as T | undefined;
  }
}
