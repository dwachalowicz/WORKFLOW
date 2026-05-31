import { 
  LayoutGrid, Users, Contact, Settings, Bell, UserCircle, Network, Lock, ChevronDown, Mail
} from 'lucide-react';
import { useState, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getAvatarUrl, getRecordFileUrl } from '@/lib/pocketbase';
import { getTierLimits } from '@/lib/tierLimits';
import { ThemeToggleButton } from '@/components/ui/ThemeToggleButton';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { useClickOutside } from '@/hooks/useClickOutside';
import { navBtnClass, NavDivider } from './navHelpers';
import { UserMenuPopover } from '@/components/ui/UserMenuPopover';

/** User avatar with optional tier badge — shared between both navs */
const UserAvatarButton = ({
  user,
  onClick,
}: {
  user: Record<string, unknown> | null;
  onClick: () => void;
}) => (
  <div 
    className="flex items-center justify-center cursor-pointer group relative"
    onClick={onClick}
  >
    <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden ring-2 ring-transparent group-hover:ring-brand-gold transition-all">
      {(user as Record<string, string>)?.avatar ? (
        <img 
          src={getAvatarUrl(user, 100)} 
          alt={(user as Record<string, string>)?.name || (user as Record<string, string>)?.email} 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-surface-elevated flex items-center justify-center text-brand-gold font-bold text-sm">
          {((user as Record<string, string>)?.name || (user as Record<string, string>)?.email || 'U')[0].toUpperCase()}
        </div>
      )}
    </div>
    {(user as Record<string, string>)?.tier && (
      <div className="absolute -bottom-1 -right-1 bg-brand-gold text-background text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-surface-nav">
        {(user as Record<string, string>).tier}
      </div>
    )}
  </div>
);

interface FloatingDashboardNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenWorkspaceSwitcher: () => void;
}

export const FloatingDashboardNav = ({ activeTab, setActiveTab, onOpenWorkspaceSwitcher }: FloatingDashboardNavProps) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const { user, pendingInvitations, pendingMembersCount, unreadNotificationsCount, setProfileModalOpen, activeWorkspace } = useAuthStore();
  const limits = getTierLimits(user?.tier);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();

  useClickOutside(userMenuRef, () => {
    if (isUserMenuOpen) setIsUserMenuOpen(false);
  });

  useClickOutside(langMenuRef, () => {
    if (isLangMenuOpen) setIsLangMenuOpen(false);
  });

  return (
    <>
    {/* Desktop Sidebar */}
    <div className="absolute top-6 left-6 z-[100] hidden md:block">
      <div className="flex flex-col items-center bg-surface-nav rounded-[2rem] p-2 pb-2 shadow-xl gap-4 border border-transparent dark:border-white/5">
        {/* Logo Section */}
        <SimpleTooltip content={<span className="text-brand-gold font-extrabold tracking-wider">gryf.ai</span>} side="right">
          <a 
            href="/"
            className="flex items-center justify-center w-full mt-2 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="w-8 h-8 gryf-logo-mask" />
          </a>
        </SimpleTooltip>

        <div className="flex flex-col items-center w-full gap-3 pb-0">
          <NavDivider />
          
          {/* Workspace Switcher */}
          <SimpleTooltip content={t('dashboard.manageWorkspaces')} side="right">
            <button 
              onClick={onOpenWorkspaceSwitcher}
              className={`cursor-pointer w-10 h-10 rounded-full flex items-center justify-center bg-brand-gold text-background font-bold text-sm uppercase transition-all hover:scale-105 overflow-hidden ${activeTab === 'workspaces' ? 'ring-2 ring-white/30 scale-105' : ''}`}
            >
              {activeWorkspace?.avatar ? (
                <img 
                  src={getRecordFileUrl('WORKFLOW_workspaces', activeWorkspace, activeWorkspace.avatar, 80)}
                  alt={activeWorkspace.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                activeWorkspace?.name?.charAt(0) || 'W'
              )}
            </button>
          </SimpleTooltip>

          <NavDivider />

          {/* Primary Navigation — ordered by importance & ergonomics */}
          <SimpleTooltip content={t('dashboard.processes')} side="right">
            <button 
              onClick={() => setActiveTab('processes')}
              className={navBtnClass(activeTab === 'processes')}
            >
              <LayoutGrid size={18} />
            </button>
          </SimpleTooltip>

          <SimpleTooltip content={limits.canUseProcessMap ? t('dashboard.processMap') : t('tierLimits.processMapLocked')} side="right">
            <button 
              onClick={() => limits.canUseProcessMap && setActiveTab('processmap')}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors border relative ${
                !limits.canUseProcessMap
                  ? 'bg-surface-elevated text-muted-foreground/40 border-transparent cursor-not-allowed'
                  : activeTab === 'processmap' ? 'bg-surface-elevated text-brand-gold border-transparent cursor-pointer' : 'bg-surface-elevated text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent hover:border-border-hover cursor-pointer'
              }`}
            >
              <Network size={18} />
              {!limits.canUseProcessMap && (
                <Lock size={12} className="absolute -bottom-1 -right-1 text-muted-foreground" />
              )}
            </button>
          </SimpleTooltip>

          <NavDivider />

          {/* Team & People */}
          <SimpleTooltip content={t('dashboard.members')} side="right">
            <div className="relative">
              <button 
                onClick={() => setActiveTab('members')}
                className={navBtnClass(activeTab === 'members')}
              >
                <Users size={18} />
              </button>
              {pendingMembersCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-surface-nav">
                  {pendingMembersCount}
                </div>
              )}
            </div>
          </SimpleTooltip>

          <SimpleTooltip content={t('dashboard.groups')} side="right">
            <button 
              onClick={() => setActiveTab('groups')}
              className={navBtnClass(activeTab === 'groups')}
            >
              <Contact size={18} />
            </button>
          </SimpleTooltip>

          <SimpleTooltip content={t('dashboard.invitations')} side="right">
            <div className="relative">
              <button 
                onClick={() => setActiveTab('invitations')}
                className={navBtnClass(activeTab === 'invitations')}
              >
                <Mail size={18} />
              </button>
              {pendingInvitations.length > 0 && (
                <div className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-surface-nav">
                  {pendingInvitations.length}
                </div>
              )}
            </div>
          </SimpleTooltip>

          <SimpleTooltip content={t('dashboard.notifications')} side="right">
            <div className="relative">
              <button 
                onClick={() => setActiveTab('notifications')}
                className={navBtnClass(activeTab === 'notifications')}
              >
                <Bell size={18} />
              </button>
              {unreadNotificationsCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-brand-gold text-background text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-surface-nav">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </div>
              )}
            </div>
          </SimpleTooltip>

          <NavDivider />

          {/* Utility — Settings, Theme, Language */}
          <SimpleTooltip content={t('dashboard.settings')} side="right">
            <button 
              onClick={() => setActiveTab('settings')}
              className={navBtnClass(activeTab === 'settings')}
            >
              <Settings size={18} />
            </button>
          </SimpleTooltip>

          <ThemeToggleButton />

          {/* Language Selector Popover */}
          <div className="relative flex justify-center items-center h-10 w-10" ref={langMenuRef}>
            <button 
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="cursor-pointer flex items-center gap-1 text-muted-foreground hover:text-brand-gold transition-colors text-xs font-bold uppercase"
            >
              <span>{localStorage.getItem('gryf-lang') === 'en' ? 'EN' : 'PL'}</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${isLangMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Language Menu Popover */}
            {isLangMenuOpen && (
              <div className="absolute left-[calc(100%+12px)] bottom-0 bg-card border border-border rounded-xl shadow-2xl py-1.5 min-w-[120px] z-[150] animate-in fade-in slide-in-from-left-2 duration-150">
                <button
                  onClick={() => {
                    localStorage.setItem('gryf-lang', 'pl');
                    i18n.changeLanguage('pl');
                    setIsLangMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${localStorage.getItem('gryf-lang') !== 'en' ? 'text-brand-gold' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                >
                  PL (Polski)
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('gryf-lang', 'en');
                    i18n.changeLanguage('en');
                    setIsLangMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${localStorage.getItem('gryf-lang') === 'en' ? 'text-brand-gold' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                >
                  EN (English)
                </button>
              </div>
            )}
          </div>

          <NavDivider />

          {/* User Profile with Popover */}
          <div className="relative" ref={userMenuRef}>
            <UserAvatarButton 
              user={user}
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            />

            {/* User Menu Popover */}
            {isUserMenuOpen && <UserMenuPopover onClose={() => setIsUserMenuOpen(false)} />}
          </div>
        </div>
      </div>

    </div>

    {/* Mobile Bottom Navigation */}
    <div className="fixed bottom-0 left-0 right-0 z-[100] md:hidden bg-surface-nav border-t border-border shadow-2xl">
      <div className="flex items-center justify-around px-2 py-2">
        <button onClick={onOpenWorkspaceSwitcher} className={`cursor-pointer flex items-center justify-center p-2 rounded-xl transition-colors ${activeTab === 'workspaces' ? 'text-brand-gold bg-brand-gold/10' : 'text-muted-foreground'}`}>
          {activeWorkspace?.avatar ? (
            <img src={getRecordFileUrl('WORKFLOW_workspaces', activeWorkspace, activeWorkspace.avatar, 32)} alt="" className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-brand-gold text-background flex items-center justify-center text-xs font-bold">
              {(activeWorkspace?.name || 'W').charAt(0).toUpperCase()}
            </div>
          )}
        </button>
        <button onClick={() => setActiveTab('processes')} className={`cursor-pointer flex items-center justify-center p-2 rounded-xl transition-colors ${activeTab === 'processes' ? 'text-brand-gold bg-brand-gold/10' : 'text-muted-foreground'}`}>
          <LayoutGrid size={22} />
        </button>
        <button onClick={() => limits.canUseProcessMap && setActiveTab('processmap')} className={`flex items-center justify-center p-2 rounded-xl transition-colors ${!limits.canUseProcessMap ? 'text-muted-foreground/40 cursor-not-allowed' : activeTab === 'processmap' ? 'text-brand-gold bg-brand-gold/10 cursor-pointer' : 'text-muted-foreground cursor-pointer'}`}>
          <div className="relative">
            <Network size={22} />
            {!limits.canUseProcessMap && <Lock size={14} className="absolute -bottom-1 -right-1 text-muted-foreground" />}
          </div>
        </button>
        <button onClick={() => setActiveTab('members')} className={`cursor-pointer flex items-center justify-center p-2 rounded-xl transition-colors relative ${activeTab === 'members' ? 'text-brand-gold bg-brand-gold/10' : 'text-muted-foreground'}`}>
          <Users size={22} />
          {pendingMembersCount > 0 && (
            <div className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
              {pendingMembersCount}
            </div>
          )}
        </button>
        <button onClick={() => setActiveTab('invitations')} className={`cursor-pointer flex items-center justify-center p-2 rounded-xl transition-colors relative ${activeTab === 'invitations' ? 'text-brand-gold bg-brand-gold/10' : 'text-muted-foreground'}`}>
          <Mail size={22} />
          {pendingInvitations.length > 0 && (
            <div className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
              {pendingInvitations.length}
            </div>
          )}
        </button>
        <button onClick={() => setActiveTab('notifications')} className={`cursor-pointer flex items-center justify-center p-2 rounded-xl transition-colors relative ${activeTab === 'notifications' ? 'text-brand-gold bg-brand-gold/10' : 'text-muted-foreground'}`}>
          <Bell size={22} />
          {unreadNotificationsCount > 0 && (
            <div className="absolute -top-0.5 -right-0.5 bg-brand-gold text-background text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
              {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
            </div>
          )}
        </button>
        <button onClick={() => { setProfileModalOpen(true); }} className="cursor-pointer flex items-center justify-center p-2 rounded-xl text-muted-foreground">
          {user?.avatar ? (
            <img src={getAvatarUrl(user, 28)} alt="" className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <UserCircle size={22} />
          )}
        </button>
      </div>
    </div>
    </>
  );
};
