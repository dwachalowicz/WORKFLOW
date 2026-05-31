import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;
}

const MAX_VISIBLE_TOASTS = 5;
const TOAST_AUTO_DISMISS_MS = 3500;

let _nextId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  showToast: (message, type = 'success') => {
    const id = `toast-${++_nextId}`;
    set((state) => ({
      toasts: [...state.toasts.slice(-(MAX_VISIBLE_TOASTS - 1)), { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, TOAST_AUTO_DISMISS_MS);
  },

  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
