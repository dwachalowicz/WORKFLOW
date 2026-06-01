import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { pb, getAvatarUrl, type WorkflowUser } from '@/lib/pocketbase';
import { Users, Mail, Loader2 } from 'lucide-react';
import { InviteMemberModal } from '@/components/modals/InviteMemberModal';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useToastStore } from '@/store/toastStore';
import { sanitizeForFilter } from '@/lib/parseUtils';
import { useConfirmStore } from '@/store/confirmStore';
import { Card } from '@/components/ui/card';
import { GryfSpinner } from '@/components/ui/GryfSpinner';
import { WorkspaceSwitcherDropdown } from '@/components/ui/WorkspaceSwitcherDropdown';
import { DashboardPageLayout } from '@/components/dashboard/layout/DashboardPageLayout';
import { DashboardHeader } from '@/components/dashboard/layout/DashboardHeader';
import { EmptyState } from '@/components/ui/EmptyState';

interface MemberRecord {
  id: string;
  role: string;
  status: string;
  invited_email?: string;
  invited_by?: string;
  expand?: { user?: WorkflowUser };
}

export const MembersTab = () => {
  const { t } = useTranslation();
  const { activeWorkspace, user } = useAuthStore();
  const isAdminOrOwner = activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin';

  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isInviteMemberModalOpen, setIsInviteMemberModalOpen] = useState(false);
  const [processingMemberIds, setProcessingMemberIds] = useState<Set<string>>(new Set());

  const fetchMembers = useCallback(async () => {
    if (!activeWorkspace) return;
    setIsLoadingMembers(true);

    // 1. Fetch members in two batches to avoid PocketBase 400 on expand with empty user
    let invitedMembers: MemberRecord[] = [];

    // 1a. Records with linked user (expand works safely)
    try {
      const linked = await pb.collection('WORKFLOW_workspace_members').getFullList({
        filter: `workspace = '${sanitizeForFilter(activeWorkspace.id)}' && status != 'rejected' && user != ""`,
        expand: 'user',
        fields: 'id,role,status,invited_email,invited_by,expand.user.id,expand.user.name,expand.user.email,expand.user.avatar',
        requestKey: null
      });
      invitedMembers = linked as MemberRecord[];
    } catch (err: unknown) {
      const pbErr = err as { message?: string; response?: unknown };
      console.error('Error fetching linked members:', pbErr.message, pbErr.response);
      useToastStore.getState().showToast(t('common.error'), 'error');
    }

    // 1b. Email-only invitations (no expand needed)
    try {
      const emailOnly = await pb.collection('WORKFLOW_workspace_members').getFullList({
        filter: `workspace = '${sanitizeForFilter(activeWorkspace.id)}' && invited_email != "" && status != 'rejected' && user = ""`,
        fields: 'id,role,status,invited_email,invited_by',
        requestKey: null
      });
      const emailRecords = (emailOnly as MemberRecord[]).map(r => ({
        ...r,
        expand: undefined, // no user to expand
      }));
      invitedMembers = [...invitedMembers, ...emailRecords];
    } catch (err: unknown) {
      const pbErr = err as { message?: string; response?: unknown };
      console.error('Error fetching email invitations:', pbErr.message, pbErr.response);
      useToastStore.getState().showToast(t('common.error'), 'error');
    }

    // 2. Always inject workspace owner as a virtual "owner" member
    const ownerInList = invitedMembers.some(
      (m) => m.expand?.user?.id === activeWorkspace.owner
    );

    if (!ownerInList && activeWorkspace.owner) {
      try {
        const ownerRecord = await pb.collection('WORKFLOW_users').getOne(activeWorkspace.owner, {
          requestKey: null,
        });
        const ownerMember: MemberRecord = {
          id: '__owner__',
          role: 'owner',
          status: 'active',
          expand: {
            user: {
              id: ownerRecord.id,
              name: ownerRecord.name as string,
              email: ownerRecord.email as string,
              avatar: ownerRecord.avatar as string,
            },
          },
        };
        invitedMembers = [ownerMember, ...invitedMembers];
      } catch {
        // Owner user not found — skip
      }
    }

    setMembers(invitedMembers);
    setIsLoadingMembers(false);
  }, [activeWorkspace, t]);

  useEffect(() => {
    if (activeWorkspace && user) {
      const timer = setTimeout(() => {
        fetchMembers();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeWorkspace, user, fetchMembers]);

  const handleUpdateMemberStatus = async (memberId: string, newStatus: string) => {
    setProcessingMemberIds(prev => new Set(prev).add(memberId));
    try {
      await pb.collection('WORKFLOW_workspace_members').update(memberId, {
        status: newStatus
      });
      setMembers(members.map(m => m.id === memberId ? { ...m, status: newStatus } : m));
      // Refresh pending members count in the nav badge
      useAuthStore.getState().fetchWorkspaces();
      if (newStatus === 'active') {
        useToastStore.getState().showToast(t('members.memberApproved', { defaultValue: 'Członek zatwierdzony' }), 'success');
      }
    } catch (err) {
      console.error('Error updating member status:', err);
      useToastStore.getState().showToast(t('common.error'), 'error');
    } finally {
      setProcessingMemberIds(prev => {
        const next = new Set(prev);
        next.delete(memberId);
        return next;
      });
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    try {
      await pb.collection('WORKFLOW_workspace_members').update(memberId, {
        role: newRole
      });
      setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    } catch (err) {
      console.error('Error updating member role:', err);
      useToastStore.getState().showToast(t('settingsTab.roleUpdateError'), 'error');
    }
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (memberUserId === user?.id) {
      useToastStore.getState().showToast(t('settingsTab.cannotRemoveSelf'), 'error');
      return;
    }
    
    
    const confirmed = await useConfirmStore.getState().confirm({
      title: t('settingsTab.removeMemberConfirm'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
    });
    if (!confirmed) return;
    
    try {
      await pb.collection('WORKFLOW_workspace_members').delete(memberId);
      setMembers(members.filter(m => m.id !== memberId));
    } catch (err) {
      console.error('Error removing member:', err);
      useToastStore.getState().showToast(t('settingsTab.removeMemberError'), 'error');
    }
  };

  return (
    <DashboardPageLayout maxWidth="max-w-[1200px]">
      <DashboardHeader
        title={t('dashboard.members')}
        subtitle={
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t('dashboard.workspace')}</span>
            <WorkspaceSwitcherDropdown />
          </div>
        }
        actions={
          isAdminOrOwner ? (
            <Button 
              onClick={() => setIsInviteMemberModalOpen(true)}
              size="pill"
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Users size={18} />
              {t('members.inviteMember')}
            </Button>
          ) : undefined
        }
      />

      {isLoadingMembers ? (
        <div className="flex justify-center items-center min-h-[50vh]">
          <GryfSpinner size={36} label={t('common.loading')} />
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/20 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="p-4 font-medium">{t('common.user')}</th>
                <th className="p-4 font-medium">{t('members.role')}</th>
                <th className="p-4 font-medium">{t('members.status')}</th>
                <th className="p-4 font-medium text-right">{t('common.edit')}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const memberUser = m.expand?.user;
                const isEmailOnly = !memberUser && !!m.invited_email;
                const displayEmail = memberUser?.email || m.invited_email || '';
                const displayName = memberUser?.name || displayEmail || t('common.unknownUser');
                return (
                  <tr key={m.id} className={`border-b border-border/30 hover:bg-secondary/10 transition-colors ${isEmailOnly ? 'opacity-75' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                          {memberUser?.avatar ? (
                            <img loading="lazy" src={getAvatarUrl(memberUser as import('@/lib/pocketbase').WorkflowUser, 100)} alt="Avatar" className="w-full h-full object-cover" />
                          ) : isEmailOnly ? (
                            <Mail size={14} className="text-muted-foreground" />
                          ) : (
                            <span className="text-xs font-bold text-muted-foreground uppercase">
                              {(displayName || 'U').charAt(0)}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{displayName}</div>
                          {!isEmailOnly && <div className="text-xs text-muted-foreground">{displayEmail}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {m.role === 'owner' ? (
                        <span className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/30">
                          {t('workspaces.roleOwner')}
                        </span>
                      ) : (
                        <select 
                          value={m.role}
                          onChange={(e) => handleUpdateMemberRole(m.id, e.target.value)}
                          disabled={!isAdminOrOwner || m.expand?.user?.id === user?.id}
                          className={`text-xs font-bold px-2.5 py-1.5 rounded-full outline-none cursor-pointer border ${
                            m.role === 'admin' ? 'bg-brand-gold/20 text-brand-gold border-brand-gold/30' 
                            : m.role === 'editor' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                            : 'bg-secondary text-muted-foreground border-border'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <option value="admin">{t('workspaces.roleAdmin')}</option>
                          <option value="editor">{t('workspaces.roleEditor')}</option>
                          <option value="viewer">{t('workspaces.roleViewer')}</option>
                        </select>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        m.status === 'active' ? 'bg-green-500/10 text-green-500' 
                        : m.status === 'pending_registration' ? 'bg-orange-500/10 text-orange-400'
                        : m.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500'
                        : 'bg-secondary text-muted-foreground'
                      }`}>
                        {m.status === 'pending_registration' ? t('members.pendingRegistration') 
                         : m.status === 'pending' ? t('members.pending')
                         : m.status === 'active' ? t('members.active')
                         : m.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {m.status === 'pending' && !m.invited_by && isAdminOrOwner && (
                         <Button 
                           variant="outline"
                           size="sm"
                           onClick={() => handleUpdateMemberStatus(m.id, 'active')}
                           disabled={processingMemberIds.has(m.id)}
                           className="text-xs mr-2 border-green-500/30 text-green-500 hover:bg-green-500/10"
                         >
                           {processingMemberIds.has(m.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : t('members.approve')}
                         </Button>
                      )}
                      {isAdminOrOwner && m.role !== 'owner' && m.expand?.user?.id !== user?.id && (
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(m.id, m.expand?.user?.id ?? '')}
                          className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          {t('settingsTab.removeMemberBtn')}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-0">
                    <EmptyState 
                      icon={Users}
                      title={t('settingsTab.noMembers')}
                      className="border-none bg-transparent shadow-none my-8"
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </Card>
      )}

      {activeWorkspace && (
        <InviteMemberModal 
          isOpen={isInviteMemberModalOpen} 
          onClose={() => {
            setIsInviteMemberModalOpen(false);
            fetchMembers();
          }}
          workspaceId={activeWorkspace.id}
        />
      )}
    </DashboardPageLayout>
  );
};
