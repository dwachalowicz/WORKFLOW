/* eslint-disable react-hooks/set-state-in-effect */
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, Loader2, LayoutGrid, FolderOpen, Users, History, MessageSquare } from 'lucide-react';
import { GryfSpinner } from '@/components/ui/GryfSpinner';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModalOverlay, ModalContainer, ModalHeader, ModalBody } from '@/components/ui/ModalWrapper';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InfoRow = ({ icon: Icon, text, detail }: { icon: React.ElementType; text: string; detail: string }) => (
  <div className="flex items-center gap-3 px-3 py-2.5 bg-card rounded-xl border border-border">
    <Icon size={16} className="text-brand-gold shrink-0" />
    <div>
      <p className="text-sm text-foreground">{text}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  </div>
);

export const DeleteAccountModal = ({ isOpen, onClose }: DeleteAccountModalProps) => {
  const { t } = useTranslation();
  const { deleteAccount, getAccountDeletionInfo, user } = useAuthStore();
  const [step, setStep] = useState<'info' | 'confirm'>('info');
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState({ processCount: 0, workspaceCount: 0, membershipCount: 0, versionCount: 0, commentCount: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setStep('info');
      setConfirmText('');
      setError('');
      setIsDeleting(false);
      setIsLoading(true);
      getAccountDeletionInfo().then(data => {
        setInfo(data);
        setIsLoading(false);
      });
    }
  }, [isOpen, getAccountDeletionInfo]);

  const handleDelete = async () => {
    if (confirmText !== t('auth.confirmWord')) return;
    setIsDeleting(true);
    setError('');
    try {
      await deleteAccount();
      window.location.href = '/';
    } catch (err) {
      const error = err as Error;
      setError(error?.message || t('auth.deleteError'));
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose} zIndex="high" closeOnOverlayClick>
      <ModalContainer size="md">
        <ModalHeader
          icon={AlertTriangle}
          iconClassName="text-destructive"
          title={t('auth.deleteAccount')}
          onClose={onClose}
        />

        <ModalBody>
          {step === 'info' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('auth.deletionWarningIntro')} <span className="text-destructive font-semibold">{t('auth.deleteIrreversible').replace(/<\/?span>/g, '')}</span>.
                {' '}{t('auth.allDataDeleted')}
              </p>

              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <GryfSpinner size={24} />
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">{t('auth.whatWillBeDeleted')}</p>
                  
                  <InfoRow icon={LayoutGrid} text={info.processCount === 1 ? t('auth.processCountOne', { count: info.processCount }) : t('auth.processCount', { count: info.processCount })} detail={t('auth.allProcesses')} />
                  <InfoRow icon={FolderOpen} text={info.workspaceCount === 1 ? t('auth.workspaceCountOne', { count: info.workspaceCount }) : t('auth.workspaceCountLabel', { count: info.workspaceCount })} detail={t('auth.withFolders')} />
                  {info.versionCount > 0 && (
                    <InfoRow icon={History} text={info.versionCount === 1 ? t('auth.versionCountOne', { count: info.versionCount }) : t('auth.versionCount', { count: info.versionCount })} detail={t('versions.title')} />
                  )}
                  {info.commentCount > 0 && (
                    <InfoRow icon={MessageSquare} text={info.commentCount === 1 ? t('auth.commentCountOne', { count: info.commentCount }) : t('auth.commentCountLabel', { count: info.commentCount })} detail={t('properties.comments')} />
                  )}
                  <InfoRow icon={Users} text={info.membershipCount === 1 ? t('auth.membershipCountOne', { count: info.membershipCount }) : t('auth.membershipCount', { count: info.membershipCount })} detail={t('auth.membershipDesc')} />
                </div>
              )}

              <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2.5 mt-3">
                <p className="text-xs text-destructive leading-relaxed">
                  <strong>{t('common.warning')}:</strong> {t('auth.warningInvitedUsers').replace(/<\/?strong>/g, '')}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={() => setStep('confirm')}
                  disabled={isLoading}
                  variant="destructive"
                  className="flex-1"
                >
                  {t('auth.continueBtn')}
                </Button>
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('auth.toConfirmDeletion')} <span className="text-foreground font-medium">{user?.email}</span>, {t('auth.typeToConfirm').toLowerCase()}:
              </p>

              <div className="bg-card border border-border rounded-xl px-3 py-2 text-center">
                <span className="text-destructive font-bold text-lg tracking-widest">{t('auth.confirmWord')}</span>
              </div>

              <Input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={t('auth.confirmPlaceholder')}
                autoFocus
                className="w-full"
              />

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => setStep('info')}
                  disabled={isDeleting}
                  variant="outline"
                  className="flex-1"
                >
                  {t('auth.goBack')}
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={confirmText !== t('auth.confirmWord') || isDeleting}
                  variant="destructive"
                  className="flex-1 flex gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {t('auth.deleting')}
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      {t('auth.deleteForever')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </ModalBody>
      </ModalContainer>
    </ModalOverlay>
  );
};
