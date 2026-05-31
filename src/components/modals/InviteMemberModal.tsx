import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Loader2, Mail, Users, Shield, Pencil, Eye, CheckCircle, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorAlert } from '@/components/ui/error-alert';
import { FormLabel } from '@/components/ui/form-label';
import { ModalOverlay, ModalContainer, ModalHeader, ModalBody } from '@/components/ui/ModalWrapper';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

type RoleType = 'admin' | 'editor' | 'viewer';

export const InviteMemberModal = ({ isOpen, onClose, workspaceId }: InviteMemberModalProps) => {
  const { t } = useTranslation();
  const { inviteMember } = useAuthStore();

  const ROLES: { value: RoleType; label: string; description: string; icon: typeof Shield }[] = [
    { value: 'admin',  label: t('workspaces.roleAdmin'),  description: t('members.roleAdminDesc'),  icon: Shield },
    { value: 'editor', label: t('workspaces.roleEditor'), description: t('members.roleEditorDesc'), icon: Pencil },
    { value: 'viewer', label: t('workspaces.roleViewer'), description: t('members.roleViewerDesc'), icon: Eye },
  ];
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<RoleType>('editor');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) return;

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await inviteMember(email.trim(), workspaceId, role);
      if (result.isNewUser) {
        // User doesn't exist yet — show success info and stay open briefly
        setSuccessMessage(t('members.inviteSuccessNew'));
        setTimeout(() => {
          setEmail('');
          setRole('editor');
          setSuccessMessage(null);
          onClose();
        }, 2500);
      } else {
        // User exists — close immediately
        setEmail('');
        setRole('editor');
        onClose();
      }
    } catch (err) {
      console.error(err);
      const error = err as Error;
      setError(error.message || t('members.inviteError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose}>
      <ModalContainer size="md">
        <ModalHeader
          icon={Users}
          title={t('members.inviteToWorkspace')}
          onClose={onClose}
        />

        <ModalBody>
          {successMessage ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-full bg-brand-gold/15 flex items-center justify-center">
                <UserPlus className="w-7 h-7 text-brand-gold" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">{t('members.inviteSuccessExisting')}</p>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-[300px]">{successMessage}</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-brand-gold">
                <CheckCircle size={14} />
                <span>{email}</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <FormLabel htmlFor="invite-email">
                  {t('members.emailLabel')}
                </FormLabel>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    id="invite-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@company.com"
                    disabled={isLoading}
                    className="pl-10"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FormLabel>
                  {t('members.workspaceRole')}
                </FormLabel>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(r => {
                    const Icon = r.icon;
                    const isActive = role === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setRole(r.value)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-brand-gold/10 border-brand-gold text-brand-gold shadow-sm shadow-brand-gold/10'
                            : 'bg-secondary/30 border-border text-foreground hover:bg-secondary'
                        }`}
                      >
                        <Icon size={18} className={isActive ? 'text-brand-gold' : 'text-muted-foreground'} />
                        <span className="mt-1.5 text-xs font-bold">{r.label}</span>
                        <span className="text-[9px] opacity-60 mt-0.5 font-normal text-center leading-tight">{r.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <ErrorAlert>{error}</ErrorAlert>

              <div className="pt-2 flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !email.trim() || !email.includes('@')}
                  className="flex-1 flex gap-2"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('members.sendInvitation')}
                </Button>
              </div>
            </form>
          )}
        </ModalBody>
      </ModalContainer>
    </ModalOverlay>
  );
};
