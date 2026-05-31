import { useToastStore } from '@/store/toastStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const;

const styleMap = {
  success: 'bg-background border-brand-gold/50',
  error: 'bg-destructive/10 border-destructive/50',
  info: 'bg-background border-border',
} as const;

const iconColorMap = {
  success: 'text-brand-gold',
  error: 'text-destructive',
  info: 'text-muted-foreground',
} as const;

const textColorMap = {
  success: 'text-foreground',
  error: 'text-destructive',
  info: 'text-foreground',
} as const;

export const ToastContainer = () => {
  const toasts = useToastStore((s) => s.toasts);
  const dismissToast = useToastStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-toast flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border animate-in slide-in-from-bottom-5 fade-in duration-300 ${styleMap[toast.type]}`}
          >
            <Icon className={`w-5 h-5 shrink-0 ${iconColorMap[toast.type]}`} />
            <p className={`text-sm font-medium flex-1 ${textColorMap[toast.type]}`}>
              {toast.message}
            </p>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
