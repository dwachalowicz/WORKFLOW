import { describe, it, expect } from 'vitest';
import { useConfirmStore } from '../confirmStore';

describe('confirmStore', () => {
  it('starts closed', () => {
    expect(useConfirmStore.getState().isOpen).toBe(false);
  });

  it('confirm opens the dialog and resolves true on onConfirm', async () => {
    const promise = useConfirmStore.getState().confirm({
      title: 'Delete?',
      message: 'Are you sure?',
    });

    // Dialog should now be open
    expect(useConfirmStore.getState().isOpen).toBe(true);
    expect(useConfirmStore.getState().title).toBe('Delete?');
    expect(useConfirmStore.getState().message).toBe('Are you sure?');

    // Simulate user clicking confirm
    useConfirmStore.getState().onConfirm();

    const result = await promise;
    expect(result).toBe(true);
    expect(useConfirmStore.getState().isOpen).toBe(false);
  });

  it('close resolves the promise with false', async () => {
    const promise = useConfirmStore.getState().confirm({
      title: 'Test',
    });

    expect(useConfirmStore.getState().isOpen).toBe(true);

    useConfirmStore.getState().close();

    const result = await promise;
    expect(result).toBe(false);
    expect(useConfirmStore.getState().isOpen).toBe(false);
  });

  it('uses default variant destructive', () => {
    useConfirmStore.getState().confirm({ title: 'X' });
    expect(useConfirmStore.getState().variant).toBe('destructive');
    useConfirmStore.getState().close();
  });

  it('accepts custom variant', () => {
    useConfirmStore.getState().confirm({ title: 'X', variant: 'default' });
    expect(useConfirmStore.getState().variant).toBe('default');
    useConfirmStore.getState().close();
  });
});
