import { create } from 'zustand';

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant: 'destructive' | 'default';
  onConfirm: () => void;
  confirm: (opts: {
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'destructive' | 'default';
  }) => Promise<boolean>;
  close: () => void;
}

/**
 * Global confirm dialog store.
 * Usage:
 *   const confirm = useConfirmStore(s => s.confirm);
 *   if (await confirm({ title: 'Delete?', message: 'Are you sure?' })) { ... }
 */
export const useConfirmStore = create<ConfirmState>((set) => ({
  isOpen: false,
  title: '',
  message: undefined,
  confirmLabel: undefined,
  cancelLabel: undefined,
  variant: 'destructive',
  onConfirm: () => {},

  confirm: (opts) =>
    new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        title: opts.title,
        message: opts.message,
        confirmLabel: opts.confirmLabel,
        cancelLabel: opts.cancelLabel,
        variant: opts.variant || 'destructive',
        onConfirm: () => {
          resolve(true);
          set({ isOpen: false });
        },
      });

      // Override close to resolve(false)
      const originalClose = () => {
        resolve(false);
        set({ isOpen: false });
      };
      set({ close: originalClose });
    }),

  close: () => set({ isOpen: false }),
}));
