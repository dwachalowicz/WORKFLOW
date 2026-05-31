/* eslint-disable react-hooks/set-state-in-effect */
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { pb } from '@/lib/pocketbase';
import { cascadeDeleteWorkspace } from '@/lib/workspaceService';
import { 
  Plus, 
  Check, 
  Users, 
  FolderGit2, 
  LayoutGrid,
  Settings,
  Trash2,
  MoreVertical,
  Pencil,
  Crown,
  Eye,
  Edit3,
  Image as ImageIcon,
  LogIn,
  LogOut as LogOutIcon,
  Copy,
  KeyRound,
  RefreshCw,
  PowerOff
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { GryfSpinner } from '@/components/ui/GryfSpinner';
import { AvatarCropModal } from '@/components/modals/AvatarCropModal';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToastStore } from '@/store/toastStore';

import { useConfirmStore } from '@/store/confirmStore';
import { useClickOutside } from '@/hooks/useClickOutside';
import { Card } from '@/components/ui/card';
import { DashboardPageLayout } from '@/components/dashboard/layout/DashboardPageLayout';
import { DashboardHeader } from '@/components/dashboard/layout/DashboardHeader';
import { EmptyState } from '@/components/ui/EmptyState';

interface WorkspaceInfo {
  id: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  avatar?: string;
  joinCode?: string;
  processCount?: number;
  memberCount?: number;
  folderCount?: number;
}

interface WorkspacesTabProps {
  onSwitchTab: (tab: string) => void;
}

export const WorkspacesTab = ({ onSwitchTab }: WorkspacesTabProps) => {
  const { t } = useTranslation();
  const { workspaces, activeWorkspace, setActiveWorkspace, createWorkspace, fetchWorkspaces, joinByCode, leaveWorkspace } = useAuthStore();
  
  const [wsInfos, setWsInfos] = useState<WorkspaceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Join by code
  const [isJoining, setIsJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  // Rename
  const [renamingWsId, setRenamingWsId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ wsId: string; x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Avatar crop modal
  const [avatarModal, setAvatarModal] = useState<{ wsId: string; currentUrl: string; currentIcon?: string } | null>(null);

  useClickOutside(contextMenuRef, () => {
    if (contextMenu) setContextMenu(null);
  });

  const fetchEnrichedWorkspaces = useCallback(async () => {
    setIsLoading(true);
    if (workspaces.length === 0) {
      setWsInfos([]);
      setIsLoading(false);
      return;
    }
    
    // 1. Render workspaces immediately using base data
    setWsInfos(workspaces.map(ws => ({
      ...ws,
      processCount: undefined,
      memberCount: undefined,
      folderCount: undefined,
      joinCode: ws.joinCode,
    })));

    // 2. Fetch all stats in a single optimized DB query via custom endpoint
    try {
      const statsRes = await fetch(`${pb.baseUrl}/api/workspace-stats`, {
        headers: {
          'Authorization': pb.authStore.token
        }
      });
      
      if (!statsRes.ok) {
        throw new Error('Failed to load workspace stats');
      }
      
      const stats = await statsRes.json();
      
      setWsInfos(prev => prev.map(ws => ({
        ...ws,
        processCount: stats[ws.id]?.processCount ?? 0,
        memberCount: stats[ws.id]?.memberCount ?? 0,
        folderCount: stats[ws.id]?.folderCount ?? 0,
        joinCode: stats[ws.id]?.joinCode || ws.joinCode,
      })));
      
    } catch (err) {
      console.error('Error loading workspace stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaces]);

  useEffect(() => {
    fetchEnrichedWorkspaces();
  }, [fetchEnrichedWorkspaces]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newWsName.trim();
    if (!trimmed) return;

    // Check for duplicate workspace name
    const isDuplicate = workspaces.some(w => w.name.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) {
      useToastStore.getState().showToast(t('workspaces.duplicateName'), 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await createWorkspace(trimmed);
      setNewWsName('');
      setIsCreating(false);
    } catch (err) {
      console.error('Error creating workspace:', err);
      const msg = err instanceof Error ? err.message : t('workspaces.createError');
      useToastStore.getState().showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectWorkspace = (wsId: string) => {
    setActiveWorkspace(wsId);
    onSwitchTab('processes');
  };

  const handleRename = async (wsId: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenamingWsId(null);
      return;
    }

    // Check for duplicate workspace name (exclude current workspace)
    const isDuplicate = workspaces.some(w => w.id !== wsId && w.name.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) {
      useToastStore.getState().showToast(t('workspaces.duplicateName'), 'error');
      return;
    }

    try {
      await pb.collection('WORKFLOW_workspaces').update(wsId, { name: trimmed });
      await fetchWorkspaces();
      setRenamingWsId(null);
    } catch (err) {
      console.error('Error renaming workspace:', err);
      const msg = err instanceof Error ? err.message : t('common.error');
      useToastStore.getState().showToast(msg, 'error');
    }
  };

  const handleDeleteWorkspace = async (wsId: string) => {
    const confirmed = await useConfirmStore.getState().confirm({
      title: t('workspaces.deleteConfirm'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
    });
    if (!confirmed) return;

    try {
      await cascadeDeleteWorkspace(wsId);
      await fetchWorkspaces();
    } catch (err) {
      console.error('Error deleting workspace:', err);
      useToastStore.getState().showToast(t('errors.deleteWorkspaceFail'), 'error');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown size={12} />;
      case 'editor': return <Edit3 size={12} />;
      default: return <Eye size={12} />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'editor': return t('workspaces.roleEditor');
      default: return t('workspaces.roleViewer');
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-brand-gold/20 text-brand-gold';
      case 'editor': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-secondary text-muted-foreground';
    }
  };

  const buildAvatarUrl = (wsInfo: WorkspaceInfo) => {
    if (!wsInfo.avatar) return '';
    return `${pb.baseUrl}/api/files/WORKFLOW_workspaces/${wsInfo.id}/${wsInfo.avatar}?thumb=100x100`;
  };

  return (
    <DashboardPageLayout maxWidth="max-w-[1200px]">
      <DashboardHeader 
        title={t('workspaces.title')}
        subtitle={`${t('workspaces.subtitle')} · ${workspaces.length} workspace`}
        actions={
          <>
            <Button 
              variant="secondary"
              size="pill"
              onClick={() => setIsJoining(true)}
              className="flex items-center gap-2"
            >
              <LogIn size={16} />
              {t('workspaces.joinByCode')}
            </Button>
            <Button 
              size="pill"
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2"
            >
              <Plus size={18} />
              {t('workspaces.createWorkspace')}
            </Button>
          </>
        }
        className="mb-6"
      />

          {/* New Workspace Input */}
          {isCreating && (
            <div className="pb-4">
              <form onSubmit={handleCreate} className="flex items-center gap-3 max-w-md">
                <Input
                  type="text"
                  autoFocus
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  onBlur={() => { if (!newWsName) setIsCreating(false); }}
                  placeholder={t('workspaces.workspaceName')}
                  className="flex-1"
                />
                <Button type="submit" disabled={isSubmitting} size="sm">
                  {isSubmitting ? t('common.creating') : t('common.create')}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setIsCreating(false); setNewWsName(''); }}>
                  {t('common.cancel')}
                </Button>
              </form>
            </div>
          )}

          {/* Join by Code */}
          {isJoining && (
            <div className="pb-4">
              <form onSubmit={async (e) => {
                e.preventDefault();
                setJoinError('');
                try {
                  await joinByCode(joinCode);
                  setJoinCode('');
                  setIsJoining(false);
                  useToastStore.getState().showToast(t('workspaces.joinRequestSent'), 'success');
                } catch (err) {
                  setJoinError(err instanceof Error ? err.message : t('common.unknownError'));
                }
              }} className="flex items-center gap-3 max-w-md">
                <div className="relative flex-1">
                  <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    autoFocus
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    onBlur={() => { if (!joinCode) setIsJoining(false); }}
                    placeholder={t('workspaces.joinCodePlaceholder')}
                    maxLength={16}
                    className="w-full bg-card border border-border/50 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-foreground/30 text-foreground uppercase tracking-wider font-mono"
                  />
                </div>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-brand-gold text-background rounded-xl text-sm font-bold hover:bg-brand-gold/90 transition-colors"
                >
                  {t('workspaces.join')}
                </button>
                <button 
                  type="button"
                  onClick={() => { setIsJoining(false); setJoinCode(''); setJoinError(''); }}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </form>
              {joinError && <p className="text-xs text-destructive mt-2">{joinError}</p>}
            </div>
          )}

          {/* Content Grid */}
          <div className="pt-4 pb-20">
            {isLoading && wsInfos.length === 0 ? (
              <div className="flex justify-center items-center min-h-[50vh]">
                <GryfSpinner size={36} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {/* Create Workspace Card — always first */}
                <div 
                  onClick={() => setIsCreating(true)}
                  className="group bg-brand-gold hover:bg-brand-gold/90 rounded-2xl p-5 cursor-pointer flex flex-col items-center justify-center min-h-[220px] transition-all"
                >
                  <Plus size={32} className="text-background mb-3" />
                  <span className="text-background font-bold text-sm">{t('workspaces.newWorkspace')}</span>
                </div>

                {/* Workspace Cards */}
                {wsInfos.map((ws) => {
                  const isActive = activeWorkspace?.id === ws.id;
                  const isRenaming = renamingWsId === ws.id;
                  const avatarUrl = buildAvatarUrl(ws);

                  return (
                    <Card
                      key={ws.id}
                      onClick={() => {
                        if (!isRenaming) handleSelectWorkspace(ws.id);
                      }}
                      className={`group/card p-5 cursor-pointer flex flex-col min-h-[220px] transition-all relative overflow-hidden ${
                        isActive 
                          ? 'border-brand-gold/60 ring-1 ring-brand-gold/20' 
                          : 'hover:border-foreground/20'
                      }`}
                    >
                      {/* Shared workspace explicit indicator */}
                      {ws.role !== 'admin' && (
                        <div className="absolute top-0 inset-x-0 flex justify-center pointer-events-none z-10">
                          <div className="bg-foreground/5 backdrop-blur-md text-muted-foreground border-b border-x border-border/50 text-[10px] font-semibold px-3 py-1 rounded-b-lg uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                            <Users size={12} />
                            {t('workspaces.sharedWorkspace')}
                          </div>
                        </div>
                      )}
                      {/* Active badge */}
                      {isActive && (
                        <div className="absolute top-3 left-3">
                          <div className="w-6 h-6 rounded-full bg-brand-gold flex items-center justify-center text-background">
                            <Check size={14} />
                          </div>
                        </div>
                      )}

                      {/* 3-dot menu — visible for all roles */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = (e.target as HTMLElement).closest('button')!.getBoundingClientRect();
                              setContextMenu({ wsId: ws.id, x: rect.right, y: rect.bottom });
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                          >
                          <MoreVertical size={14} />
                        </button>
                      </div>

                      {/* Avatar/Icon */}
                      <div className="flex-1 flex flex-col items-center justify-center">
                        {avatarUrl ? (
                          <div className="w-14 h-14 rounded-full overflow-hidden mb-3 border border-border/30">
                            <img loading="lazy" src={avatarUrl} alt={ws.name} className="w-full h-full object-cover" />
                          </div>
                        ) : ws.icon ? (
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-colors ${
                            isActive 
                              ? 'bg-brand-gold text-background' 
                              : 'bg-brand-gold/10 text-brand-gold border border-brand-gold/30'
                          }`}>
                            {(() => {
                              const IconCmp = (LucideIcons as Record<string, React.ElementType>)[ws.icon];
                              return IconCmp ? <IconCmp size={24} /> : <div className="font-bold text-2xl">{ws.name.charAt(0).toUpperCase()}</div>;
                            })()}
                          </div>
                        ) : (
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 font-bold text-2xl transition-colors ${
                            isActive 
                              ? 'bg-brand-gold text-background' 
                              : 'bg-secondary/50 text-foreground'
                          }`}>
                            {ws.name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        {/* Name or rename input */}
                        {isRenaming ? (
                          <form 
                            onSubmit={(e) => { e.preventDefault(); handleRename(ws.id); }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full flex flex-col items-center gap-2"
                          >
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={() => handleRename(ws.id)}
                              onKeyDown={(e) => { if (e.key === 'Escape') setRenamingWsId(null); }}
                              className="text-sm font-bold text-foreground text-center bg-secondary border border-border/50 rounded-lg px-3 py-1 outline-none focus:border-foreground/30 w-full max-w-[160px]"
                            />
                          </form>
                        ) : (
                          <h3 className="text-sm font-bold text-foreground text-center truncate max-w-full">
                            {ws.name}
                          </h3>
                        )}

                        {/* Role badge */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 flex items-center gap-1 ${getRoleBadgeClass(ws.role)}`}>
                          {getRoleIcon(ws.role)}
                          {getRoleLabel(ws.role)}
                        </span>
                      </div>

                      {/* Stats footer */}
                      <div className="mt-auto pt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground border-t border-border/30">
                        <SimpleTooltip content={t('dashboard.processes')} side="top">
                          <div className="flex items-center gap-1.5">
                            <LayoutGrid size={12} />
                            <span>{ws.processCount ?? 0}</span>
                          </div>
                        </SimpleTooltip>
                        <SimpleTooltip content={t('workspaces.folders')} side="top">
                          <div className="flex items-center gap-1.5">
                            <FolderGit2 size={12} />
                            <span>{ws.folderCount ?? 0}</span>
                          </div>
                        </SimpleTooltip>
                        <SimpleTooltip content={t('workspaces.membersTab')} side="top">
                          <div className="flex items-center gap-1.5">
                            <Users size={12} />
                            <span>{ws.memberCount ?? 0}</span>
                          </div>
                        </SimpleTooltip>
                      </div>
                    </Card>
                  );
                })}

                {/* Empty state */}
                {wsInfos.length === 0 && !isCreating && (
                  <div className="col-span-full">
                    <EmptyState 
                      icon={FolderGit2}
                      title={t('workspaces.noWorkspaces')}
                      className="border-none bg-transparent shadow-none my-8"
                    />
                  </div>
                )}
              </div>
            )}
        </div>

      {contextMenu && (() => {
        const ws = wsInfos.find(w => w.id === contextMenu.wsId);
        if (!ws) return null;
        return (
          <div 
            ref={contextMenuRef}
            className="fixed z-[100] bg-card border border-border/50 rounded-xl py-1 min-w-[180px] animate-in fade-in-0 zoom-in-95"
            style={{ 
              top: contextMenu.y, 
              left: contextMenu.x,
              transform: 'translateX(-100%)'
            }}
          >
            <button
              onClick={() => {
                handleSelectWorkspace(ws.id);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors text-left"
            >
              <LayoutGrid size={14} className="text-muted-foreground" />
              {t('workspaces.goToProcesses')}
            </button>
            <button
              onClick={() => {
                setActiveWorkspace(ws.id);
                onSwitchTab('settings');
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors text-left"
            >
              <Settings size={14} className="text-muted-foreground" />
              {t('workspaces.settings')}
            </button>
            <button
              onClick={() => {
                setActiveWorkspace(ws.id);
                onSwitchTab('members');
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors text-left"
            >
              <Users size={14} className="text-muted-foreground" />
              {t('workspaces.membersTab')}
            </button>
            <button
              onClick={() => {
                setRenamingWsId(ws.id);
                setRenameValue(ws.name);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors text-left"
            >
              <Pencil size={14} className="text-muted-foreground" />
              {t('workspaces.renameWorkspace')}
            </button>
            <button
              onClick={() => {
                setAvatarModal({ wsId: ws.id, currentUrl: buildAvatarUrl(ws), currentIcon: ws.icon });
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors text-left"
            >
              <ImageIcon size={14} className="text-muted-foreground" />
              {t('workspaces.changeAvatar')}
            </button>
            {ws.avatar && (
              <button
                onClick={async () => {
                  try {
                    await pb.collection('WORKFLOW_workspaces').update(ws.id, { avatar: null });
                    fetchEnrichedWorkspaces();
                    fetchWorkspaces();
                  } catch (err) { console.error('Error removing avatar:', err); }
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
              >
                <Trash2 size={14} />
                {t('workspaces.removeAvatar')}
              </button>
            )}
            {ws.role === 'admin' && (
              <>
                {ws.joinCode ? (
                  <>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(ws.joinCode!);
                        setContextMenu(null);
                        useToastStore.getState().showToast(`${t('workspaces.codeCopied')}: ${ws.joinCode}`, 'success');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors text-left"
                    >
                      <Copy size={14} className="text-muted-foreground" />
                      {t('workspaces.copyJoinCode')}
                    </button>
                    <button
                      onClick={async () => {
                        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                        const randomArray = new Uint8Array(12);
                        crypto.getRandomValues(randomArray);
                        const code = Array.from(randomArray).map(b => chars[b % chars.length]).join('');
                        try {
                          await pb.collection('WORKFLOW_workspaces').update(ws.id, { join_code: code });
                          await fetchWorkspaces();
                          fetchEnrichedWorkspaces();
                          setContextMenu(null);
                          useToastStore.getState().showToast(t('workspaces.joinCodeRegenerated'), 'success');
                        } catch {
                          useToastStore.getState().showToast(t('common.error'), 'error');
                        }
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors text-left"
                    >
                      <RefreshCw size={14} className="text-muted-foreground" />
                      {t('workspaces.regenerateJoinCode')}
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await pb.collection('WORKFLOW_workspaces').update(ws.id, { join_code: "" });
                          await fetchWorkspaces();
                          fetchEnrichedWorkspaces();
                          setContextMenu(null);
                          useToastStore.getState().showToast(t('workspaces.joinCodeDisabled'), 'success');
                        } catch {
                          useToastStore.getState().showToast(t('common.error'), 'error');
                        }
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-orange-500 hover:bg-orange-500/10 transition-colors text-left"
                    >
                      <PowerOff size={14} className="text-orange-500/70" />
                      {t('workspaces.disableJoinCode')}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={async () => {
                      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                      const randomArray = new Uint8Array(12);
                      crypto.getRandomValues(randomArray);
                      const code = Array.from(randomArray).map(b => chars[b % chars.length]).join('');
                      try {
                        await pb.collection('WORKFLOW_workspaces').update(ws.id, { join_code: code });
                        await fetchWorkspaces();
                        fetchEnrichedWorkspaces();
                        setContextMenu(null);
                        useToastStore.getState().showToast(t('workspaces.joinCodeRegenerated'), 'success');
                      } catch {
                        useToastStore.getState().showToast(t('common.error'), 'error');
                      }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors text-left"
                  >
                    <RefreshCw size={14} className="text-muted-foreground" />
                    {t('workspaces.regenerateJoinCode')}
                  </button>
                )}
              </>
            )}
            {(!ws.role || ws.role !== 'admin') && ws.joinCode && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(ws.joinCode!);
                  setContextMenu(null);
                  useToastStore.getState().showToast(`${t('workspaces.codeCopied')}: ${ws.joinCode}`, 'success');
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors text-left"
              >
                <Copy size={14} className="text-muted-foreground" />
                {t('workspaces.copyJoinCode')}
              </button>
            )}
            <div className="h-px bg-border/50 my-1" />
            {ws.role === 'admin' ? (
              <button
                onClick={() => {
                  handleDeleteWorkspace(ws.id);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
              >
                <Trash2 size={14} />
                {t('workspaces.deleteWorkspace')}
              </button>
            ) : (
              <button
                onClick={async () => {
                  const confirmed = await useConfirmStore.getState().confirm({
                    title: t('workspaces.leaveConfirm'),
                    message: `"${ws.name}"`,
                    confirmLabel: t('common.confirm'),
                    cancelLabel: t('common.cancel'),
                  });
                  if (!confirmed) return;
                  try {
                    await leaveWorkspace(ws.id);
                    setContextMenu(null);
                  } catch (err) {
                    useToastStore.getState().showToast(err instanceof Error ? err.message : String(err), 'error');
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
              >
                <LogOutIcon size={14} />
                {t('workspaces.leaveWorkspace')}
              </button>
            )}
          </div>
        );
      })()}

      {/* Avatar Crop Modal — workspace avatars at 100x100 webp */}
      {avatarModal && (
        <AvatarCropModal
          isOpen={true}
          onClose={() => setAvatarModal(null)}
          collectionName="WORKFLOW_workspaces"
          recordId={avatarModal.wsId}
          currentAvatarUrl={avatarModal.currentUrl}
          currentIcon={avatarModal.currentIcon}
          targetSize={100}
          onSaved={() => { setAvatarModal(null); fetchEnrichedWorkspaces(); fetchWorkspaces(); }}
          title={t('workspaces.changeAvatar')}
        />
      )}
    </DashboardPageLayout>
  );
};
