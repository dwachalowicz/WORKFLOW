
import { useState, useEffect, lazy, Suspense, Component, type ErrorInfo, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getTierLimits } from '@/lib/tierLimits';
import { FloatingDashboardNav } from '@/components/layout/FloatingDashboardNav';
import { GryfSpinner } from '@/components/ui/GryfSpinner';
import i18n from '@/i18n/config';

// ── Lazy-loaded tabs (code splitting) ────────────────────────
const ProcessesTab = lazy(() => import('@/components/dashboard/ProcessesTab').then(m => ({ default: m.ProcessesTab })));
const WorkspacesTab = lazy(() => import('@/components/dashboard/WorkspacesTab').then(m => ({ default: m.WorkspacesTab })));
const GroupsTab = lazy(() => import('@/components/dashboard/GroupsTab').then(m => ({ default: m.GroupsTab })));
const MembersTab = lazy(() => import('@/components/dashboard/MembersTab').then(m => ({ default: m.MembersTab })));
const InvitationsTab = lazy(() => import('@/components/dashboard/InvitationsTab').then(m => ({ default: m.InvitationsTab })));
const SettingsTab = lazy(() => import('@/components/dashboard/SettingsTab').then(m => ({ default: m.SettingsTab })));
const ProcessMapTab = lazy(() => import('@/components/dashboard/ProcessMapTab').then(m => ({ default: m.ProcessMapTab })));
const NotificationsTab = lazy(() => import('@/components/dashboard/NotificationsTab').then(m => ({ default: m.NotificationsTab })));

import { useUiStore } from '@/store/uiStore';

const TabLoader = () => {
  const isFirstDashboardMount = useUiStore(state => state.isFirstDashboardMount);
  const [show, setShow] = useState(!isFirstDashboardMount);

  useEffect(() => {
    if (!isFirstDashboardMount) {
      const timer = setTimeout(() => setShow(true), 300);
      return () => clearTimeout(timer);
    }
  }, [isFirstDashboardMount]);

  if (isFirstDashboardMount) {
    return (
      <div className="fixed inset-0 z-loader bg-background flex items-center justify-center flex-col">
        <GryfSpinner size={48} label={i18n.t('common.loading')} />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex items-center justify-center">
      {show && <GryfSpinner size={36} />}
    </div>
  );
};

type TabType = 'processes' | 'members' | 'groups' | 'settings' | 'invitations' | 'workspaces' | 'processmap' | 'notifications';

const VALID_TABS: TabType[] = ['processes', 'members', 'groups', 'settings', 'invitations', 'workspaces', 'processmap', 'notifications'];

// Error Boundary for lazy-loaded tab content
class TabErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Tab Error Boundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
          <p className="text-lg font-semibold mb-2">{i18n.t('errors.somethingWentWrong')}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-sm text-brand-gold hover:underline"
          >
            {i18n.t('errors.tryAgain')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const DashboardPage = () => {
  const { tab: urlTab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const limits = getTierLimits(user?.tier);
  
  const activeTab: TabType = (urlTab && VALID_TABS.includes(urlTab as TabType)) 
    ? (urlTab as TabType) 
    : 'processes';

  // Tier gate: redirect from processmap if not allowed
  useEffect(() => {
    if (activeTab === 'processmap' && !limits.canUseProcessMap) {
      navigate('/dashboard/processes', { replace: true });
    }
  }, [activeTab, limits.canUseProcessMap, navigate]);

  const handleTabChange = (newTab: TabType) => {
    navigate(`/dashboard/${newTab}`);
  };

  useEffect(() => {
    // Mark initial loading as complete after Dashboard renders.
    // Subsequent tab loads will use a small, delayed loader.
    useUiStore.getState().setFirstDashboardMount(false);

    // Refresh workspace data (including roles) on every Dashboard visit.
    // This catches external role changes (e.g. owner changed user from editor→viewer)
    // without requiring a full page reload.
    useAuthStore.getState().fetchWorkspaces();
  }, []);

  // Safeguard against missing data
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) return null;



  return (
    <div className="flex h-screen w-screen bg-background text-foreground font-sans overflow-hidden">
      <FloatingDashboardNav 
        activeTab={activeTab} 
        setActiveTab={handleTabChange as (tab: string) => void} 
        onOpenWorkspaceSwitcher={() => handleTabChange('workspaces')}
      />

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col bg-background overflow-hidden pl-0 md:pl-24 pb-20 md:pb-0">
        <Suspense fallback={<TabLoader />}>
          <TabErrorBoundary>
            {activeTab === 'workspaces' && <WorkspacesTab onSwitchTab={(tab) => handleTabChange(tab as TabType)} />}
            {activeTab === 'processes' && <ProcessesTab />}
            {activeTab === 'groups' && <GroupsTab />}
            {activeTab === 'members' && <MembersTab />}
            {activeTab === 'invitations' && <InvitationsTab />}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'settings' && <SettingsTab />}
            {activeTab === 'processmap' && limits.canUseProcessMap && <ProcessMapTab />}
          </TabErrorBoundary>
        </Suspense>
      </main>
    </div>
  );
};

