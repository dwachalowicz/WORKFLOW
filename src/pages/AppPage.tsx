import { useEffect, useState, lazy, Suspense, useMemo } from 'react';
import { GryfCanvas } from '@/components/canvas/GryfCanvas';
import { FloatingNavBar } from '@/components/layout/FloatingNavBar';
import { SimulationControl } from '@/components/panels/SimulationControl';
import { Tutorial } from '@/components/ui/Tutorial';
import { ReactFlowProvider } from '@xyflow/react';
import { Save, Download, Upload, Share2, Lock, FileText } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { useParams, useNavigate } from 'react-router-dom';
import { ShareModal } from '@/components/modals/ShareModal';
import { useTranslation } from 'react-i18next';
import { useToastStore } from '@/store/toastStore';
import { useCanvasStore } from "@/store/canvasStore";
import { useProcessLock } from '@/hooks/useProcessLock';
import { usePBSubscription } from '@/hooks/usePBSubscription';
import { useProcessFileOperations } from '@/hooks/useProcessFileOperations';
import { getDefaultProcessNodes } from '@/lib/templates/defaultProcess';

// Lazy-load heavy panels — reduces initial bundle by ~170KB
const PropertiesPanel = lazy(() => import('@/components/panels/PropertiesPanel').then(m => ({ default: m.PropertiesPanel })));
const LinterPanel = lazy(() => import('@/components/panels/LinterPanel').then(m => ({ default: m.LinterPanel })));
const VersionHistoryPanel = lazy(() => import('@/components/panels/VersionHistoryPanel').then(m => ({ default: m.VersionHistoryPanel })));


export const AppPage = () => {
  const { processId: urlProcessId } = useParams<{ processId?: string }>();
  const navigate = useNavigate();
  const addNode = useCanvasStore((state) => state.addNode);
  const processName = useCanvasStore((state) => state.processName);
  const setProcessName = useCanvasStore((state) => state.setProcessName);
  const saveProcess = useCanvasStore((state) => state.saveProcess);
  const isSaving = useCanvasStore((state) => state.isSaving);
  const lockedReason = useCanvasStore((state) => state.lockedReason);
  const isViewMode = useCanvasStore((state) => state.isViewMode);
  const user = useAuthStore((state) => state.user);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const { t } = useTranslation();
  const showToast = useToastStore((s) => s.showToast);

  const { lockInfo } = useProcessLock(urlProcessId, user?.id);
  const { fileInputRef, handleExport, handleMarkdownExport, handleImport } = useProcessFileOperations();

  const getLockedReasonText = () => {
    switch (lockedReason) {
      case 'workspace_limit': return t('tierLimits.reasonWorkspaceLimit');
      case 'process_limit': return t('tierLimits.reasonProcessLimit');
      case 'nodes_limit': return t('tierLimits.reasonNodesLimit');
      case 'edges_limit': return t('tierLimits.reasonEdgesLimit');
      case 'notes_limit': return t('tierLimits.reasonNotesLimit');
      case 'variables_limit': return t('tierLimits.reasonVariablesLimit');
      case 'checklist_limit': return t('tierLimits.reasonChecklistLimit');
      case 'subworkflows_limit': return t('tierLimits.reasonSubworkflowsLimit');
      case 'viewer_role': return t('tierLimits.reasonViewerRole');
      default: return null;
    }
  };

  const activeWorkspace = useAuthStore((state) => state.activeWorkspace);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isDirty = useCanvasStore.getState().isDirty;
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Refresh workspace roles from server on mount to catch external changes
  useEffect(() => {
    useAuthStore.getState().fetchWorkspaces();
  }, []);

  // Watch for role changes (e.g. user downgraded to viewer in another tab or dashboard)
  useEffect(() => {
    if (activeWorkspace?.role === 'viewer') {
      useCanvasStore.getState().setViewMode(true);
      useCanvasStore.getState().setLockedReason('viewer_role');
    } else if (useCanvasStore.getState().lockedReason === 'viewer_role') {
      // Role changed from viewer → editor/admin: remove viewer lock
      useCanvasStore.getState().setLockedReason(null);
      useCanvasStore.getState().setViewMode(false);
    }
  }, [activeWorkspace?.role]);

  // Realtime comments update
  const refreshCommentCounts = useCanvasStore((s) => s.refreshCommentCounts);
  const commentOptions = useMemo(() => ({ filter: urlProcessId ? `process = "${urlProcessId}"` : '' }), [urlProcessId]);
  
  usePBSubscription('WORKFLOW_comments', '*', (e) => {
    // Only refresh if the comment belongs to the currently opened process
    if (e.record && e.record.process === urlProcessId) {
      refreshCommentCounts();
    }
  }, !!urlProcessId, commentOptions);

  useEffect(() => {
    const initProcess = async () => {
      const storeState = useCanvasStore.getState();
      
      // Load process from URL if present and different from current
      if (urlProcessId && urlProcessId !== storeState.currentProcessId) {
        try {
          await storeState.loadProcess(urlProcessId);
        } catch (err) {
          console.error("Error loading process from URL:", err);
          showToast(t('canvas.importError'), 'error');
          navigate('/dashboard');
        }
      } 
      // Only initialize default empty canvas if NO process ID in URL
      else if (!urlProcessId && storeState.nodes.length === 0) {
        const defaultNodes = getDefaultProcessNodes();
        defaultNodes.forEach(node => addNode(node));
      }
    };

    initProcess();
  }, [urlProcessId, navigate, addNode, t, showToast]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground relative">
      <Tutorial />
      <FloatingNavBar />

      {/* Process Name & Save Bar */}
      <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 sm:gap-3 bg-surface-nav px-3 sm:px-4 py-2 rounded-full border border-transparent dark:border-white/5 shadow-xl tour-save-bar max-w-[calc(100vw-2rem)]">
        <input 
          value={processName}
          readOnly={isViewMode}
          onChange={(e) => {
            if (isViewMode) return;
            setProcessName(e.target.value);
          }}
          className="bg-transparent border-none text-sm font-semibold outline-none w-24 sm:w-48 text-center text-foreground placeholder:text-foreground/50"
          placeholder={t('canvas.processName')}
        />
        <div className="w-px h-5 bg-secondary dark:bg-white/5 hidden sm:block"></div>
        
        <SimpleTooltip content={t('canvas.exportJson')}>
          <button 
            onClick={handleExport}
            disabled={isViewMode}
            className="w-8 h-8 rounded-full hidden sm:flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload size={14} />
          </button>
        </SimpleTooltip>

        <SimpleTooltip content={t('canvas.exportMd', 'Eksportuj Markdown')}>
          <button 
            onClick={handleMarkdownExport}
            disabled={isViewMode}
            className="w-8 h-8 rounded-full hidden sm:flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText size={14} />
          </button>
        </SimpleTooltip>

        <SimpleTooltip content={t('canvas.importJson')}>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isViewMode}
            className="w-8 h-8 rounded-full hidden sm:flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} />
          </button>
        </SimpleTooltip>

        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept=".json"
          onChange={handleImport}
        />

        <SimpleTooltip content={t('canvas.sharePublic')}>
          <button 
            onClick={() => setIsShareModalOpen(true)}
            disabled={!!lockInfo || !!lockedReason}
            className="w-8 h-8 rounded-full hidden sm:flex items-center justify-center text-brand-gold hover:text-foreground hover:bg-brand-gold/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Share2 size={14} />
          </button>
        </SimpleTooltip>

        <div className="w-px h-5 bg-secondary dark:bg-white/5 hidden sm:block"></div>
        
        <SimpleTooltip content={!user ? t('canvas.loginToSave') : t('canvas.saveToDb')}>
          <button 
            onClick={async () => {
              try {
                await saveProcess();
                showToast(t('canvas.saved'), 'success');
              } catch (e) {
                showToast(e instanceof Error ? e.message : t('canvas.saveError'), 'error');
              }
            }}
            disabled={isSaving || !user || isViewMode}
            className="flex items-center gap-1.5 text-xs font-bold bg-brand-gold text-background px-3 py-1.5 rounded-full hover:bg-brand-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            {isSaving ? t('common.saving') : t('common.save')}
          </button>
        </SimpleTooltip>
      </div>

      {/* Lock Banner */}
      {lockInfo && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-amber-500/20 border border-amber-500/40 px-5 py-3 rounded-2xl shadow-xl backdrop-blur-sm animate-in slide-in-from-top-3">
          <Lock size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">{t('canvas.viewMode')}</p>
            <p className="text-xs text-muted-foreground">{t('canvas.lockedBy')} <span className="text-amber-600 dark:text-amber-400 font-medium">{lockInfo.lockedByName}</span></p>
          </div>
        </div>
      )}

      {/* Tier Limit Soft Lock Banner */}
      {!lockInfo && lockedReason && lockedReason !== 'viewer_role' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-red-500/20 border border-red-500/40 px-5 py-3 rounded-2xl shadow-xl backdrop-blur-sm animate-in slide-in-from-top-3">
          <Lock size={18} className="text-red-600 dark:text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">{t('tierLimits.readOnlyMode', 'Tryb tylko do odczytu')}</p>
            <p className="text-xs text-red-600 dark:text-red-200">{getLockedReasonText()}</p>
          </div>
        </div>
      )}

      {/* Viewer Role Banner */}
      {!lockInfo && lockedReason === 'viewer_role' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-amber-500/20 border border-amber-500/40 px-5 py-3 rounded-2xl shadow-xl backdrop-blur-sm animate-in slide-in-from-top-3">
          <Lock size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">{t('canvas.viewMode')}</p>
            <p className="text-xs text-amber-600 dark:text-amber-200">{getLockedReasonText()}</p>
          </div>
        </div>
      )}



      <ReactFlowProvider>
        <Suspense fallback={null}>
          <LinterPanel />
        </Suspense>
        
        {/* Main Canvas Area */}
        <main className="flex-1 relative">
          <GryfCanvas />
          <SimulationControl />
        </main>

        {/* Properties Panel */}
        <Suspense fallback={null}>
          <PropertiesPanel />
        </Suspense>
      </ReactFlowProvider>

      {/* Version History — right-side slide panel */}
      <Suspense fallback={null}>
        <VersionHistoryPanel />
      </Suspense>

      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
      />
    </div>
  );
};
