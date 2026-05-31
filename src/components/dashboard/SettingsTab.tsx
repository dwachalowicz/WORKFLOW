import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { pb } from '@/lib/pocketbase';
import { cascadeDeleteWorkspace } from '@/lib/workspaceService';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormLabel } from '@/components/ui/form-label';
import { useTranslation } from 'react-i18next';
import { useToastStore } from '@/store/toastStore';
import { useConfirmStore } from '@/store/confirmStore';
import { Card } from '@/components/ui/card';
import { WorkspaceSwitcherDropdown } from '@/components/ui/WorkspaceSwitcherDropdown';
import { DashboardPageLayout } from '@/components/dashboard/layout/DashboardPageLayout';
import { DashboardHeader } from '@/components/dashboard/layout/DashboardHeader';

export const SettingsTab = () => {
  const { t } = useTranslation();
  const { activeWorkspace, setActiveWorkspace } = useAuthStore();

  const [editingWorkspaceName, setEditingWorkspaceName] = useState(activeWorkspace?.name || '');
  const [prevWorkspaceId, setPrevWorkspaceId] = useState(activeWorkspace?.id);
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);

  const isAdminOrOwner = activeWorkspace?.role === 'owner' || activeWorkspace?.role === 'admin';

  if (activeWorkspace?.id !== prevWorkspaceId) {
    setPrevWorkspaceId(activeWorkspace?.id);
    setEditingWorkspaceName(activeWorkspace?.name || '');
  }

  const handleUpdateWorkspaceName = async () => {
    if (!activeWorkspace || !editingWorkspaceName.trim()) return;
    if (editingWorkspaceName === activeWorkspace.name) return;

    setIsSavingWorkspace(true);
    try {
      const updated = await pb.collection('WORKFLOW_workspaces').update(activeWorkspace.id, {
        name: editingWorkspaceName.trim()
      });
      await useAuthStore.getState().fetchWorkspaces();
      setActiveWorkspace(updated.id);
      useToastStore.getState().showToast(t('settingsTab.nameUpdated'), 'success');
    } catch (err) {
      console.error('Error updating workspace name:', err);
      useToastStore.getState().showToast(t('settingsTab.nameUpdateError'), 'error');
    } finally {
      setIsSavingWorkspace(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspace) return;
    const confirmed = await useConfirmStore.getState().confirm({
      title: t('workspaces.deleteConfirm'),
      message: activeWorkspace.name,
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
    });
    if (!confirmed) return;

    try {
      await cascadeDeleteWorkspace(activeWorkspace.id);
      await useAuthStore.getState().fetchWorkspaces();
      setActiveWorkspace('');
      useToastStore.getState().showToast(t('settingsTab.wsDeleted'), 'success');
    } catch (err) {
      console.error('Error deleting workspace:', err);
      useToastStore.getState().showToast(t('settingsTab.wsDeleteError'), 'error');
    }
  };

  return (
    <DashboardPageLayout maxWidth="max-w-[1200px]">
      <DashboardHeader 
        title={t('settingsTab.title')}
        subtitle={
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t('dashboard.workspace')}</span>
            <WorkspaceSwitcherDropdown />
          </div>
        }
      />
      
      {isAdminOrOwner ? (
        <>
          {/* General Info */}
          <Card className="p-4 sm:p-8 mb-8">
            <h2 className="text-xl font-bold mb-4">{t('settingsTab.generalInfo')}</h2>
            <div className="space-y-4 max-w-md">
              <div>
                <FormLabel variant="muted" className="mb-2">{t('settingsTab.workspaceName')}</FormLabel>
                <div className="flex items-center gap-3">
                  <Input 
                    type="text"
                    value={editingWorkspaceName}
                    onChange={(e) => setEditingWorkspaceName(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleUpdateWorkspaceName}
                    disabled={isSavingWorkspace || editingWorkspaceName === activeWorkspace?.name || !editingWorkspaceName.trim()}
                    size="sm"
                  >
                    {isSavingWorkspace ? t('common.saving') : t('common.save')}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card className="bg-destructive/5 border-destructive/20 p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-destructive mb-2">{t('settingsTab.dangerZoneTitle')}</h2>
                <p className="text-sm text-foreground/80 mb-6 max-w-2xl">
                  {t('settingsTab.dangerZoneDesc')}
                </p>
                <Button 
                  variant="destructive"
                  onClick={handleDeleteWorkspace}
                  className="flex items-center gap-2"
                >
                  <Trash2 size={18} />
                  {t('settingsTab.deleteWorkspace')}
                </Button>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-4 sm:p-8">
          <p className="text-sm text-muted-foreground">{t('settingsTab.viewerReadOnly')}</p>
        </Card>
      )}
    </DashboardPageLayout>
  );
};
