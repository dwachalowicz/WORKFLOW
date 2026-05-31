import { describe, it, expect, vi } from 'vitest';
import { tryCatchToast, tryCatchSync } from '../errorHandler';
import { useToastStore } from '@/store/toastStore';

describe('tryCatchToast', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('returns result on success', async () => {
    const result = await tryCatchToast(() => Promise.resolve(42));
    expect(result).toBe(42);
  });

  it('returns undefined on error with no fallback', async () => {
    const result = await tryCatchToast(() => Promise.reject(new Error('fail')), { silent: true });
    expect(result).toBeUndefined();
  });

  it('returns fallback value on error', async () => {
    const result = await tryCatchToast(
      () => Promise.reject(new Error('fail')),
      { fallback: [], silent: true }
    );
    expect(result).toEqual([]);
  });

  it('shows toast when errorKey is provided', async () => {
    await tryCatchToast(
      () => Promise.reject(new Error('fail')),
      { errorKey: 'errors.test', silent: true }
    );
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('errors.test');
    expect(toasts[0].type).toBe('error');
  });

  it('does not show toast when no errorKey', async () => {
    await tryCatchToast(
      () => Promise.reject(new Error('fail')),
      { silent: true }
    );
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('calls onError callback on failure', async () => {
    const onError = vi.fn();
    await tryCatchToast(
      () => Promise.reject(new Error('boom')),
      { onError, silent: true }
    );
    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('does not call onError on success', async () => {
    const onError = vi.fn();
    await tryCatchToast(() => Promise.resolve('ok'), { onError });
    expect(onError).not.toHaveBeenCalled();
  });
});

describe('tryCatchSync', () => {
  it('returns result on success', () => {
    const result = tryCatchSync(() => 'hello');
    expect(result).toBe('hello');
  });

  it('returns undefined on error with no fallback', () => {
    const result = tryCatchSync(() => { throw new Error('fail'); }, { silent: true });
    expect(result).toBeUndefined();
  });

  it('returns fallback on error', () => {
    const result = tryCatchSync(
      () => { throw new Error('fail'); },
      { fallback: 'default', silent: true }
    );
    expect(result).toBe('default');
  });
});
