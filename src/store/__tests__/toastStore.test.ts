import { describe, it, expect } from 'vitest';
import { useToastStore } from '../toastStore';

describe('toastStore', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('starts with empty toasts', () => {
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it('showToast adds a toast', () => {
    useToastStore.getState().showToast('Test message');
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('Test message');
    expect(toasts[0].type).toBe('success'); // default type
  });

  it('showToast respects type parameter', () => {
    useToastStore.getState().showToast('Error!', 'error');
    expect(useToastStore.getState().toasts[0].type).toBe('error');

    useToastStore.getState().showToast('Info!', 'info');
    const toasts = useToastStore.getState().toasts;
    expect(toasts[toasts.length - 1].type).toBe('info');
  });

  it('dismissToast removes specific toast', () => {
    useToastStore.getState().showToast('A');
    useToastStore.getState().showToast('B');
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(2);

    useToastStore.getState().dismissToast(toasts[0].id);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].message).toBe('B');
  });

  it('limits visible toasts to MAX_VISIBLE_TOASTS (5)', () => {
    for (let i = 0; i < 7; i++) {
      useToastStore.getState().showToast(`Toast ${i}`);
    }
    expect(useToastStore.getState().toasts.length).toBeLessThanOrEqual(5);
  });

  it('generates unique IDs', () => {
    useToastStore.getState().showToast('A');
    useToastStore.getState().showToast('B');
    const toasts = useToastStore.getState().toasts;
    expect(toasts[0].id).not.toBe(toasts[1].id);
  });
});
