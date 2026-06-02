import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Share2, Copy, Check, Lock, Globe, X } from 'lucide-react';
import { pb } from '@/lib/pocketbase';
import { useAuthStore } from '@/store/authStore';
import { getTierLimits } from '@/lib/tierLimits';
import { tryCatchToast } from '@/lib/errorHandler';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModalOverlay, ModalContainer, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/ModalWrapper';
import { FormLabel } from '@/components/ui/form-label';
import { useCanvasStore } from "@/store/canvasStore";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  processId?: string | null;
  onSaved?: () => void;
}

export const ShareModal = ({ isOpen, onClose, processId: propProcessId, onSaved }: ShareModalProps) => {
  const { t } = useTranslation();
  const storeProcessId = useCanvasStore(state => state.currentProcessId);
  const processId = propProcessId ?? storeProcessId;
  const user = useAuthStore(state => state.user);
  const limits = getTierLimits(user?.tier);
  const [isPublic, setIsPublic] = useState(false);
  const [password, setPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [clearPassword, setClearPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchProcessData = async () => {
      if (!processId) return;
      const record = await tryCatchToast(
        () => pb.collection('WORKFLOW_processes').getOne(processId)
      );
      if (record) {
        setIsPublic(record.isPublic || false);
        setPassword('');
        setClearPassword(false);
      }

      // Use dedicated server endpoint to check password status
      // (publicPassword is a hidden field — regular users can't read it via SDK)
      try {
        const pwdStatus = await pb.send('/api/process/has-password', {
          method: 'POST',
          body: { processId },
        });
        setHasPassword(pwdStatus.hasPassword || false);
      } catch {
        setHasPassword(false);
      }
    };

    if (isOpen && processId) {
      fetchProcessData();
    }
  }, [isOpen, processId]);

  const handleSave = async () => {
    if (!processId) return;
    setIsLoading(true);

    // 1. Save isPublic via normal SDK update
    const result = await tryCatchToast(
      () => pb.collection('WORKFLOW_processes').update(processId, { isPublic }),
      { errorKey: t('errors.shareSaveFail') }
    );

    // 2. Handle password via dedicated server endpoint
    // (hidden field can't be written by regular users via SDK)
    if (result) {
      const shouldSetPassword = password.length > 0;
      const shouldClearPassword = clearPassword && !password;

      if (shouldSetPassword || shouldClearPassword) {
        try {
          const pwdResult = await pb.send('/api/process/set-password', {
            method: 'POST',
            body: {
              processId,
              password: shouldClearPassword ? '' : password,
            },
          });
          setHasPassword(pwdResult.hasPassword || false);
        } catch (err) {
          console.error('Failed to update share password:', err);
          setIsLoading(false);
          return; // Don't close modal or call onSaved on password failure
        }
      }

      onSaved?.();
      onClose();
    }

    setIsLoading(false);
  };

  const shareUrl = processId ? `${window.location.origin}/shared/${processId}` : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose}>
      <ModalContainer size="md">
        <ModalHeader
          icon={Share2}
          iconBrandBg
          title={t('ui.publicSharing')}
          subtitle={t('share.description')}
          onClose={onClose}
        />

        <ModalBody className="space-y-6">
          {!processId ? (
            <div className="text-center text-muted-foreground p-4 bg-secondary/50 rounded-xl">
              {t('share.saveFirst')}
            </div>
          ) : !limits.canSharePublic ? (
            /* ── Tier gate: sharing not available ── */
            <div className="text-center p-6 bg-secondary/30 rounded-xl space-y-2">
              <div className="w-12 h-12 rounded-full bg-brand-gold/10 flex items-center justify-center mx-auto mb-3">
                <Lock size={20} className="text-brand-gold" />
              </div>
              <p className="text-sm font-bold text-foreground">{t('tierLimits.shareLocked')}</p>
              <p className="text-xs text-muted-foreground">{t('tierLimits.upgradeHint')}</p>
            </div>
          ) : (
            <>
              {/* Toggle Switch */}
              <label className="flex items-center justify-between cursor-pointer group p-4 border border-border rounded-xl hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isPublic ? 'bg-brand-gold/20 text-brand-gold' : 'bg-secondary text-muted-foreground'}`}>
                    <Globe size={20} />
                  </div>
                  <div>
                    <div className="font-bold">{t('ui.publicLink')}</div>
                    <div className="text-xs text-muted-foreground">{t('share.anyoneCanView')}</div>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <Switch 
                    checked={isPublic} 
                    onCheckedChange={setIsPublic} 
                  />
                </div>
              </label>

              {isPublic && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <FormLabel className="mb-2">{t('share.copyLink')}</FormLabel>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="text" 
                        readOnly 
                        value={shareUrl}
                        className="font-mono"
                      />
                      <SimpleTooltip content={t('share.copyLinkTooltip')}>
                        <Button 
                          onClick={copyToClipboard}
                          variant={copied ? "default" : "secondary"}
                          size="icon"
                          className={copied ? "bg-green-500 hover:bg-green-600" : ""}
                        >
                          {copied ? <Check size={18} /> : <Copy size={18} />}
                        </Button>
                      </SimpleTooltip>
                    </div>
                  </div>

                  {limits.canShareWithPassword ? (
                    <div>
                      <FormLabel className="flex items-center gap-2 mb-2">
                        <Lock size={14} className="text-brand-gold" />
                        {t('share.passwordLabel')}
                      </FormLabel>
                      <Input 
                        type="password" 
                        placeholder={t('share.passwordPlaceholder')}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (e.target.value) setClearPassword(false);
                        }}
                      />
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-muted-foreground">
                          {clearPassword
                            ? t('share.passwordWillBeCleared') 
                            : hasPassword && !password
                              ? t('share.passwordSet')
                              : t('share.passwordHint')}
                        </p>
                        {hasPassword && !password && !clearPassword && (
                          <button
                            type="button"
                            onClick={() => setClearPassword(true)}
                            className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
                          >
                            <X size={12} />
                            {t('share.clearPassword')}
                          </button>
                        )}
                        {clearPassword && (
                          <button
                            type="button"
                            onClick={() => setClearPassword(false)}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {t('common.cancel')}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/30 border border-border/50">
                      <Lock size={14} className="text-muted-foreground shrink-0" />
                      <p className="text-xs text-muted-foreground">{t('tierLimits.passwordLocked')}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </ModalBody>

        <ModalFooter>
          <Button 
            onClick={onClose}
            variant="ghost"
          >
            {t('common.cancel')}
          </Button>
          {processId && limits.canSharePublic && (
            <Button 
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? t('common.saving') : t('common.save')}
            </Button>
          )}
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>
  );
};
