import { useAuthStore } from '@/store/authStore';
import { CheckCircle2, XCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { useToastStore } from '@/store/toastStore';
import { useState } from 'react';
import { DashboardPageLayout } from '@/components/dashboard/layout/DashboardPageLayout';
import { DashboardHeader } from '@/components/dashboard/layout/DashboardHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export const InvitationsTab = () => {
  const { t } = useTranslation();
  const { pendingInvitations, acceptInvitation, rejectInvitation } = useAuthStore();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const handleAccept = async (invitationId: string) => {
    setProcessingIds(prev => new Set(prev).add(invitationId));
    try {
      await acceptInvitation(invitationId);
      useToastStore.getState().showToast(t('invitations.accepted'), 'success');
    } catch (err) {
      console.error('Error accepting invitation:', err);
      useToastStore.getState().showToast(t('common.error'), 'error');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(invitationId);
        return next;
      });
    }
  };

  const handleReject = async (invitationId: string) => {
    setProcessingIds(prev => new Set(prev).add(invitationId));
    try {
      await rejectInvitation(invitationId);
      useToastStore.getState().showToast(t('invitations.rejected'), 'success');
    } catch (err) {
      console.error('Error rejecting invitation:', err);
      useToastStore.getState().showToast(t('common.error'), 'error');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(invitationId);
        return next;
      });
    }
  };

  return (
    <DashboardPageLayout maxWidth="max-w-[1200px]">
      <DashboardHeader 
        title={t('invitations.yourInvitations')}
        subtitle={t('invitations.pendingWorkspaceInvitations')}
      />

      {pendingInvitations.length === 0 ? (
        <EmptyState 
          icon={Mail}
          title={t('invitations.noNewInvitations')}
          description={t('invitations.allProcessed')}
          className="py-20 border-dashed"
        />
      ) : (
        <div className="grid gap-4">
          {pendingInvitations.map(inv => {
            const isProcessing = processingIds.has(inv.id);
            return (
              <Card key={inv.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 gap-4 transition-opacity ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-bold">{inv.workspaceName}</h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold">
                    {t('invitations.asRole', { role: inv.role })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {inv.invitedBy 
                    ? t('invitations.invitedToCollaborateBy', { name: inv.invitedBy.name || inv.invitedBy.email }) 
                    : t('invitations.invitedToCollaborate')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost"
                  onClick={() => handleReject(inv.id)}
                  disabled={isProcessing}
                  className="flex items-center gap-2 hover:bg-destructive/10 hover:text-destructive"
                >
                  <XCircle size={18} /> {t('invitations.reject')}
                </Button>
                <Button 
                  onClick={() => handleAccept(inv.id)}
                  disabled={isProcessing}
                  className="flex items-center gap-2"
                >
                  <CheckCircle2 size={18} /> {t('invitations.accept')}
                </Button>
              </div>
            </Card>
            );
          })}
        </div>
      )}
    </DashboardPageLayout>
  );
};
