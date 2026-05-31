import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModalOverlay, ModalContainer, ModalBody } from '@/components/ui/ModalWrapper';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'default';
}

/**
 * Reusable confirmation dialog to replace all window.confirm() calls.
 * Matches the premium design language (dark mode, brand styling).
 */
export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'destructive',
}: ConfirmDialogProps) => {
  if (!isOpen) return null;

  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose} zIndex="high" closeOnOverlayClick>
      <ModalContainer size="sm">
        <ModalBody>
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              variant === 'destructive' ? 'bg-destructive/10' : 'bg-brand-gold/10'
            }`}>
              <AlertTriangle size={24} className={
                variant === 'destructive' ? 'text-destructive' : 'text-brand-gold'
              } />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
              {message && (
                <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
              )}
            </div>

            <div className="flex gap-3 w-full pt-2">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                {cancelLabel || 'Anuluj'}
              </Button>
              <Button
                onClick={() => { onConfirm(); onClose(); }}
                variant={variant === 'destructive' ? 'destructive' : 'default'}
                className="flex-1"
              >
                {confirmLabel || t('common.confirm')}
              </Button>
            </div>
          </div>
        </ModalBody>
      </ModalContainer>
    </ModalOverlay>
  );
};
