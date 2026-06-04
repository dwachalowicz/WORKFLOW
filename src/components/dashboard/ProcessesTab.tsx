/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef, useCallback, lazy, Suspense, useMemo, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { pb, getRecordFileUrl, getAvatarUrl } from '@/lib/pocketbase';
import { 
  FolderGit2, 
  Plus, 
  LayoutGrid, 
  Pencil,
  Folder,
  FolderOpen,
  Upload,
  Trash2,
  MoreVertical,
  ChevronLeft,
  FolderPlus,
  GripVertical,
  ArrowUpFromLine,
  Copy,
  Image as ImageIcon,
  Globe,
  Share2,
  Clock,
  Lock,
  LayoutTemplate
} from 'lucide-react';
import { getIcon } from '@/lib/iconMap';
import { GryfSpinner } from '@/components/ui/GryfSpinner';
import { LoadMoreButton } from '@/components/ui/LoadMoreButton';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToastStore } from '@/store/toastStore';
import { DashboardPageLayout } from '@/components/dashboard/layout/DashboardPageLayout';
import { SearchInput } from '@/components/ui/SearchInput';
import { WorkspaceSwitcherDropdown } from '@/components/ui/WorkspaceSwitcherDropdown';
import { useTranslation } from 'react-i18next';
import { getTierLimits } from '@/lib/tierLimits';
import { cascadeDeleteProcess, cascadeDeleteProcesses } from '@/lib/cascadeHelpers';
import { sanitizeForFilter } from '@/lib/parseUtils';
import { useConfirmStore } from '@/store/confirmStore';
import { getLockedProcessIdsForWorkspace } from '@/lib/limitEnforcer';
import type { WorkflowProcess, ProcessGroup } from '@/lib/pocketbase';
import { useClickOutside } from '@/hooks/useClickOutside';
import { usePBSubscription } from '@/hooks/usePBSubscription';
import { useLockTimer } from '@/hooks/useLockTimer';
import { Card } from '@/components/ui/card';

// ── Lazy-loaded modals ───────────────────────────────────────
const AvatarCropModal = lazy(() => import('@/components/modals/AvatarCropModal').then(m => ({ default: m.AvatarCropModal })));
const ShareModal = lazy(() => import('@/components/modals/ShareModal').then(m => ({ default: m.ShareModal })));
const TemplatesModal = lazy(() => import('@/components/modals/TemplatesModal').then(m => ({ default: m.TemplatesModal })));

type Process = WorkflowProcess;
type Group = ProcessGroup;

// Shared PocketBase field projection for process list queries — avoids fetching heavy nodes/edges data
const PROCESS_LIST_FIELDS = 'id,name,created,updated,avatar,icon,isPublic,locked_by,locked_at,group,expand.lastEditedBy.id,expand.lastEditedBy.name,expand.lastEditedBy.email,expand.lastEditedBy.avatar,expand.locked_by.id,expand.locked_by.name,expand.locked_by.email,expand.locked_by.avatar';


export const ProcessesTab = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, activeWorkspace } = useAuthStore();
  const limits = getTierLimits(user?.tier);
  
  // Live clock for lock-badge freshness (updates every 30s)
  const now = useLockTimer();
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  
  // null = root view, string = inside a folder
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  const [lockedProcessIds, setLockedProcessIds] = useState<Set<string>>(new Set());
  
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // All processes across workspace (for search)
  const [allWorkspaceProcesses, setAllWorkspaceProcesses] = useState<Process[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState('');

  // Folder process counts
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotalPages, setSearchTotalPages] = useState(1);

  // Drag state
  const [draggingProcessId, setDraggingProcessId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragOverRoot, setDragOverRoot] = useState(false);

  // Context menu state (for processes)
  const [contextMenu, setContextMenu] = useState<{ processId: string; x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Context menu state (for folders)
  const [folderContextMenu, setFolderContextMenu] = useState<{ groupId: string; x: number; y: number } | null>(null);
  const folderContextMenuRef = useRef<HTMLDivElement>(null);

  // Avatar crop modal state
  const [avatarModal, setAvatarModal] = useState<{ collectionName: string; recordId: string; currentUrl: string; currentIcon?: string } | null>(null);

  // Share modal state
  const [shareModalProcessId, setShareModalProcessId] = useState<string | null>(null);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);

  useClickOutside(contextMenuRef, () => {
    if (contextMenu) setContextMenu(null);
  });

  useClickOutside(folderContextMenuRef, () => {
    if (folderContextMenu) setFolderContextMenu(null);
  });

  // Viewport boundary adjustment for process context menu
  useLayoutEffect(() => {
    const el = contextMenuRef.current;
    if (!el || !contextMenu) return;
    const rect = el.getBoundingClientRect();
    let newTop = contextMenu.y;
    let newLeft = contextMenu.x - rect.width;
    if (newTop + rect.height > window.innerHeight) {
      newTop = Math.max(0, window.innerHeight - rect.height - 8);
    }
    if (newLeft < 0) newLeft = 8;
    if (newLeft + rect.width > window.innerWidth) {
      newLeft = Math.max(0, window.innerWidth - rect.width - 8);
    }
    el.style.top = `${newTop}px`;
    el.style.left = `${newLeft}px`;
  }, [contextMenu]);

  // Viewport boundary adjustment for folder context menu
  useLayoutEffect(() => {
    const el = folderContextMenuRef.current;
    if (!el || !folderContextMenu) return;
    const rect = el.getBoundingClientRect();
    let newTop = folderContextMenu.y;
    let newLeft = folderContextMenu.x - rect.width;
    if (newTop + rect.height > window.innerHeight) {
      newTop = Math.max(0, window.innerHeight - rect.height - 8);
    }
    if (newLeft < 0) newLeft = 8;
    if (newLeft + rect.width > window.innerWidth) {
      newLeft = Math.max(0, window.innerWidth - rect.width - 8);
    }
    el.style.top = `${newTop}px`;
    el.style.left = `${newLeft}px`;
  }, [folderContextMenu]);

  const fetchAllProcesses = useCallback(async (query?: string) => {
    if (!activeWorkspace || !user) return;
    setIsSearching(true);
    try {
      let filterStr = `workspace = '${sanitizeForFilter(activeWorkspace.id)}'`;
      if (query && query.trim()) {
        filterStr += ` && name ~ '${sanitizeForFilter(query.trim())}'`;
      }
      const allRecords = await pb.collection('WORKFLOW_processes').getList(1, 50, {
        filter: filterStr,
        sort: '-created',
        expand: 'lastEditedBy,locked_by',
        fields: PROCESS_LIST_FIELDS,
        requestKey: null,
      });
      setAllWorkspaceProcesses(allRecords.items as Process[]);
      setSearchPage(allRecords.page);
      setSearchTotalPages(allRecords.totalPages);
      
      const lockedIds = await getLockedProcessIdsForWorkspace(activeWorkspace.id);
      setLockedProcessIds(lockedIds);
    } catch (err) {
      console.error('Error searching processes:', err);
      useToastStore.getState().showToast(t('common.error'), 'error');
    } finally {
      setIsSearching(false);
    }
  }, [activeWorkspace, user, t]);

  const fetchData = useCallback(async () => {
    if (!activeWorkspace || !user) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (currentFolderId === null) {
        // Root view: fetch all groups + unassigned processes
        const [groupRecords, processRecords] = await Promise.all([
          pb.collection('WORKFLOW_process_groups').getFullList({
            filter: `workspace = '${sanitizeForFilter(activeWorkspace.id)}'`,
            sort: 'name',
            requestKey: null,
          }),
          pb.collection('WORKFLOW_processes').getList(1, 50, {
            filter: `workspace = '${sanitizeForFilter(activeWorkspace.id)}' && group = ''`,
            sort: '-created',
            expand: 'lastEditedBy,locked_by',
            fields: PROCESS_LIST_FIELDS,
            requestKey: null,
          })
        ]);
        setGroups(groupRecords as Group[]);
        setProcesses(processRecords.items as Process[]);
        setPage(processRecords.page);
        setTotalPages(processRecords.totalPages);
        setIsLoading(false); // Unblock UI immediately
        // Fetch process counts per folder using a single DB query via custom endpoint
        const fetchFolderCounts = async () => {
          try {
            const counts = await pb.send(`/api/folder-stats/${activeWorkspace.id}`, { 
              method: 'GET',
              requestKey: null
            });
            setFolderCounts(counts);
          } catch (err) {
            if ((err as { isAbort?: boolean })?.isAbort) return;
            console.error('Error fetching folder stats:', err);
            useToastStore.getState().showToast(t('common.error'), 'error');
          }
        };
        fetchFolderCounts();
      } else {
        // Folder view: fetch processes in this folder
        const processRecords = await pb.collection('WORKFLOW_processes').getList(1, 50, {
          filter: `group = '${sanitizeForFilter(currentFolderId)}'`,
          sort: '-created',
          expand: 'lastEditedBy,locked_by',
          fields: PROCESS_LIST_FIELDS,
          requestKey: null,
        });
        setProcesses(processRecords.items as Process[]);
        setPage(processRecords.page);
        setTotalPages(processRecords.totalPages);
      }
      
      const lockedIds = await getLockedProcessIdsForWorkspace(activeWorkspace.id);
      setLockedProcessIds(lockedIds);
    } catch (err) {
      const error = err as Error;
      console.error('Error fetching data:', err);
      useToastStore.getState().showToast(t('common.error'), 'error');
      setErrorMsg(error?.message || t('common.unknownError'));
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace, user, currentFolderId, t]);

  useEffect(() => {
    if (activeWorkspace) {
      setCurrentFolderId(null);
      setSearchQuery('');
    } else {
      setGroups([]);
      setProcesses([]);
      setAllWorkspaceProcesses([]);
      setCurrentFolderId(null);
    }
     
  }, [activeWorkspace]);

  useEffect(() => {
    if (activeWorkspace) {
      fetchData();
    }
  }, [currentFolderId, activeWorkspace, fetchData]);

  // When search query changes, fetch all workspace processes for global search
  useEffect(() => {
    if (!activeWorkspace || !user) return;
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        fetchAllProcesses(searchQuery);
      } else {
        setAllWorkspaceProcesses([]);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, activeWorkspace, user, fetchAllProcesses]);

  // Realtime Subscriptions for Dashboard Live Updates
  const handleProcessUpdate = useCallback((e: import('pocketbase').RecordSubscription<Process>) => {
    // Safety check - though filter should catch this
    if (e.record.workspace !== activeWorkspace?.id) return;
    
    setProcesses(prev => {
      if (e.action === 'create') {
        const matchesView = currentFolderId === null ? !e.record.group : e.record.group === currentFolderId;
        if (!matchesView) return prev;
        if (prev.some(p => p.id === e.record.id)) return prev;
        return [e.record, ...prev];
      }
      if (e.action === 'update') {
        const matchesView = currentFolderId === null ? !e.record.group : e.record.group === currentFolderId;
        if (!matchesView) {
          return prev.filter(p => p.id !== e.record.id);
        }
        if (!prev.some(p => p.id === e.record.id)) {
          return [e.record, ...prev];
        }
        return prev.map(p => p.id === e.record.id ? { ...p, ...e.record } : p);
      }
      if (e.action === 'delete') {
        return prev.filter(p => p.id !== e.record.id);
      }
      return prev;
    });

    setAllWorkspaceProcesses(prev => {
      if (e.action === 'create') {
        if (prev.some(p => p.id === e.record.id)) return prev;
        if (e.record.group) {
          setFolderCounts(fc => ({ ...fc, [e.record.group]: (fc[e.record.group] || 0) + 1 }));
        }
        return [e.record, ...prev];
      }
      if (e.action === 'update') {
        const existing = prev.find(p => p.id === e.record.id);
        if (existing && existing.group !== e.record.group) {
          setFolderCounts(fc => {
            const next = { ...fc };
            if (existing.group) next[existing.group] = Math.max(0, (next[existing.group] || 0) - 1);
            if (e.record.group) next[e.record.group] = (next[e.record.group] || 0) + 1;
            return next;
          });
        }
        return prev.map(p => p.id === e.record.id ? { ...p, ...e.record } : p);
      }
      if (e.action === 'delete') {
        const existing = prev.find(p => p.id === e.record.id);
        if (existing && existing.group) {
          setFolderCounts(fc => ({ ...fc, [existing.group]: Math.max(0, (fc[existing.group] || 0) - 1) }));
        }
        return prev.filter(p => p.id !== e.record.id);
      }
      return prev;
    });
  }, [activeWorkspace?.id, currentFolderId]);

  const handleGroupUpdate = useCallback((e: import('pocketbase').RecordSubscription<Group>) => {
    if (e.record.workspace !== activeWorkspace?.id) return;
    
    setGroups(prev => {
      if (e.action === 'create') {
        if (prev.some(g => g.id === e.record.id)) return prev;
        return [...prev, e.record].sort((a, b) => a.name.localeCompare(b.name));
      }
      if (e.action === 'update') {
        return prev.map(g => g.id === e.record.id ? { ...g, ...e.record } : g).sort((a, b) => a.name.localeCompare(b.name));
      }
      if (e.action === 'delete') {
        return prev.filter(g => g.id !== e.record.id);
      }
      return prev;
    });
  }, [activeWorkspace?.id]);

  const workspaceId = activeWorkspace?.id;
  const subscriptionOptions = useMemo(() => ({ 
    filter: workspaceId ? `workspace = "${sanitizeForFilter(workspaceId)}"` : '',
    expand: 'locked_by,lastEditedBy'
  }), [workspaceId]);

  usePBSubscription<Process>('WORKFLOW_processes', '*', handleProcessUpdate, !!activeWorkspace, subscriptionOptions);
  usePBSubscription<Group>('WORKFLOW_process_groups', '*', handleGroupUpdate, !!activeWorkspace, subscriptionOptions);

  const handleLoadMore = async () => {
    if (!activeWorkspace || !user) return;
    
    setIsLoadingMore(true);
    try {
      if (searchQuery.trim()) {
        const nextPage = searchPage + 1;
        const moreRecords = await pb.collection('WORKFLOW_processes').getList(nextPage, 50, {
          filter: `workspace = '${sanitizeForFilter(activeWorkspace.id)}' && name ~ '${sanitizeForFilter(searchQuery.trim())}'`,
          sort: '-created',
          expand: 'lastEditedBy,locked_by',
          fields: PROCESS_LIST_FIELDS,
          requestKey: null,
        });
        setAllWorkspaceProcesses(prev => [...prev, ...moreRecords.items as Process[]]);
        setSearchPage(moreRecords.page);
        setSearchTotalPages(moreRecords.totalPages);
      } else {
        const nextPage = page + 1;
        const filterStr = currentFolderId === null
          ? `workspace = '${sanitizeForFilter(activeWorkspace.id)}' && group = ''`
          : `group = '${sanitizeForFilter(currentFolderId)}'`;
          
        const moreRecords = await pb.collection('WORKFLOW_processes').getList(nextPage, 50, {
          filter: filterStr,
          sort: '-created',
          expand: 'lastEditedBy,locked_by',
          fields: PROCESS_LIST_FIELDS,
          requestKey: null,
        });
        setProcesses(prev => [...prev, ...moreRecords.items as Process[]]);
        setPage(moreRecords.page);
        setTotalPages(moreRecords.totalPages);
      }
    } catch (err) {
      console.error('Error loading more processes:', err);
      useToastStore.getState().showToast(t('common.error'), 'error');
    } finally {
      setIsLoadingMore(false);
    }
  };


  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !activeWorkspace) return;

    // Check for duplicate folder name in this workspace
    const trimmedName = newGroupName.trim();
    const isDuplicate = groups.some(g => g.name.toLowerCase() === trimmedName.toLowerCase());
    if (isDuplicate) {
      useToastStore.getState().showToast(t('processes.folderDuplicateAlert', { name: trimmedName }), 'error');
      return;
    }

    try {
      const record = await pb.collection('WORKFLOW_process_groups').create({
        name: trimmedName,
        workspace: activeWorkspace.id
      });
      setGroups(prev => {
        if (prev.some(g => g.id === record.id)) return prev;
        return [...prev, record as Group].sort((a, b) => a.name.localeCompare(b.name));
      });
      setNewGroupName('');
      setIsCreatingGroup(false);
    } catch (err) {
      console.error('Error creating folder:', err);
      useToastStore.getState().showToast(t('processes.folderCreateError'), 'error');
    }
  };

  const handleRenameFolder = async (groupId: string) => {
    const trimmedName = renameFolderValue.trim();
    if (!trimmedName) {
      setRenamingFolderId(null);
      return;
    }

    // Check for duplicate folder name in this workspace
    const isDuplicate = groups.some(g => g.id !== groupId && g.name.toLowerCase() === trimmedName.toLowerCase());
    if (isDuplicate) {
      useToastStore.getState().showToast(t('processes.folderDuplicateAlert', { name: trimmedName }), 'error');
      return;
    }

    try {
      const updatedGroup = await pb.collection('WORKFLOW_process_groups').update(groupId, {
        name: trimmedName
      });
      setGroups(prev => prev.map(g => g.id === groupId ? (updatedGroup as Group) : g));
      setRenamingFolderId(null);
    } catch (err) {
      console.error('Error renaming folder:', err);
      useToastStore.getState().showToast(t('common.error'), 'error');
    }
  };

  const createNewProcess = async () => {
    if (activeWorkspace?.isLocked || activeWorkspace?.role === 'viewer') {
      useToastStore.getState().showToast(
        activeWorkspace?.role === 'viewer'
          ? t('storeErrors.viewerCannotSave')
          : t('processes.workspaceLocked'),
        'error'
      );
      return;
    }
    try {
      const allProcesses = await pb.collection('WORKFLOW_processes').getList(1, 1, {
        filter: `workspace = "${sanitizeForFilter(activeWorkspace!.id)}"`,
        requestKey: null,
      });
      if (allProcesses.totalItems >= limits.maxProcesses) {
        useToastStore.getState().showToast(t('tierLimits.processLimitReached', { limit: limits.maxProcesses }), 'error');
        return;
      }

      const { useCanvasStore } = await import('@/store/canvasStore');
      useCanvasStore.getState().createNewProcess(currentFolderId);
      navigate('/app');
    } catch (err) {
      console.error(err);
      useToastStore.getState().showToast(t('common.error'), 'error');
    }
  };

  const handleLoadProcess = async (processId: string) => {
    try {
      const { useCanvasStore } = await import('@/store/canvasStore');
      await useCanvasStore.getState().loadProcess(processId);
      useCanvasStore.getState().refreshCommentCounts();
      navigate(`/app/${processId}`);
    } catch (err) {
      console.error(err);
      useToastStore.getState().showToast(t('processes.processLoadError'), 'error');
    }
  };

  const handleDownloadProcess = async (proc: Process) => {
    try {
      const fullProc = await pb.collection('WORKFLOW_processes').getOne(proc.id, { requestKey: null });
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
        nodes: fullProc.nodes,
        edges: fullProc.edges
      }, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${proc.name || 'proces'}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (err) {
      console.error('Error downloading JSON:', err);
      useToastStore.getState().showToast(t('common.error'), 'error');
    }
  };


  const handleDeleteProcess = async (proc: Process) => {
    const confirmed = await useConfirmStore.getState().confirm({
      title: t('processes.deleteConfirm', { name: proc.name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
    });
    if (!confirmed) return;

    try {
      await cascadeDeleteProcess(proc.id, activeWorkspace?.id);
      setProcesses(prev => prev.filter(p => p.id !== proc.id));
      setAllWorkspaceProcesses(prev => prev.filter(p => p.id !== proc.id));
    } catch (err) {
      console.error('Error deleting process:', err);
      useToastStore.getState().showToast(t('processes.processDeleteError'), 'error');
    }
  };

  const handleDeleteGroup = async (e: React.MouseEvent, group: Group) => {
    e.stopPropagation();
    
    try {
      const groupProcesses = await pb.collection('WORKFLOW_processes').getFullList({
        filter: `group = '${sanitizeForFilter(group.id)}'`,
        fields: 'id',
      });

      if (groupProcesses.length > 0) {
        const confirmed = await useConfirmStore.getState().confirm({
          title: t('processes.folderDeleteConfirmWithProcesses', { count: groupProcesses.length }),
          confirmLabel: t('common.delete'),
          cancelLabel: t('common.cancel'),
        });
        if (!confirmed) {
          return;
        }
        await cascadeDeleteProcesses(
          groupProcesses.map(p => p.id),
          activeWorkspace?.id
        );
      } else {
        const confirmed = await useConfirmStore.getState().confirm({
          title: t('processes.folderDeleteConfirm', { name: group.name }),
          confirmLabel: t('common.delete'),
          cancelLabel: t('common.cancel'),
        });
        if (!confirmed) {
          return;
        }
      }

      await pb.collection('WORKFLOW_process_groups').delete(group.id);
      setGroups(prev => prev.filter(g => g.id !== group.id));
    } catch (err) {
      console.error('Error deleting folder:', err);
      useToastStore.getState().showToast(t('processes.folderDeleteError'), 'error');
    }
  };

  const handleRemoveFromFolder = async (proc: Process) => {
    try {
      await pb.collection('WORKFLOW_processes').update(proc.id, {
        group: '',
      });
      setProcesses(prev => prev.filter(p => p.id !== proc.id));
      // Keep process in allWorkspaceProcesses — it's not deleted, just moved to root
      setAllWorkspaceProcesses(prev => prev.map(p => p.id === proc.id ? { ...p, group: '' } : p));
    } catch (err) {
      console.error('Error removing process from folder:', JSON.stringify(err, null, 2), err);
      const errMsg = (err as { response?: { message?: string }; message?: string })?.response?.message || (err as { message?: string })?.message || '';
      useToastStore.getState().showToast(t('processes.removeFromFolderError') + (errMsg ? ` (${errMsg})` : ''), 'error');
    }
  };

  // --- Drag & Drop ---
  const handleDragStart = (e: React.DragEvent, proc: Process) => {
    e.dataTransfer.setData('processId', proc.id);
    setDraggingProcessId(proc.id);
  };

  const handleDragEnd = () => {
    setDraggingProcessId(null);
    setDragOverFolderId(null);
    setDragOverRoot(false);
  };

  const handleDropOnFolder = async (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();
    setDragOverFolderId(null);
    const processId = e.dataTransfer.getData('processId');
    if (!processId) return;
    
    try {
      await pb.collection('WORKFLOW_processes').update(processId, {
        group: targetGroupId,
      });
      setProcesses(prev => prev.filter(p => p.id !== processId));
      setAllWorkspaceProcesses(prev => prev.filter(p => p.id !== processId));
      setFolderCounts(prev => ({
        ...prev,
        [targetGroupId]: (prev[targetGroupId] || 0) + 1
      }));
    } catch (err) {
      console.error('Error moving process:', JSON.stringify(err, null, 2), err);
      const errMsg = (err as { response?: { message?: string }; message?: string })?.response?.message || (err as { message?: string })?.message || '';
      useToastStore.getState().showToast(t('processes.moveError') + (errMsg ? ` (${errMsg})` : ''), 'error');
    }
  };

  const handleDropOnRoot = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverRoot(false);
    const processId = e.dataTransfer.getData('processId');
    if (!processId) return;
    
    try {
      await pb.collection('WORKFLOW_processes').update(processId, {
        group: '',
      });
      // Refresh the view
      fetchData();
    } catch (err) {
      console.error('Error moving process:', JSON.stringify(err, null, 2), err);
      const errMsg = (err as { response?: { message?: string }; message?: string })?.response?.message || (err as { message?: string })?.message || '';
      useToastStore.getState().showToast(t('processes.moveError') + (errMsg ? ` (${errMsg})` : ''), 'error');
    }
  };

  const handleDuplicateProcess = async (proc: Process) => {
    try {
      // Tier gate: maxProcesses
      const allProcesses = await pb.collection('WORKFLOW_processes').getList(1, 1, {
        filter: `workspace = "${sanitizeForFilter(activeWorkspace!.id)}"`,
        requestKey: null,
      });
      if (allProcesses.totalItems >= limits.maxProcesses) {
        useToastStore.getState().showToast(t('tierLimits.processLimitReached', { limit: limits.maxProcesses }), 'error');
        return;
      }
      const baseName = proc.name || t('processes.processNoName');
      // Find existing copies to determine next number
      const escapedCopyName = t('processes.copyName').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const copyMatch = baseName.match(new RegExp(`^(.+)(${escapedCopyName})(\\d+)$`));
      const origName = copyMatch ? copyMatch[1] : baseName;
      
      // Find highest copy number among existing processes
      const existing = processes.filter(p => p.name?.startsWith(origName + t('processes.copyName')));
      let maxNum = 1;
      for (const ep of existing) {
        const m = ep.name?.match(new RegExp(t('processes.copyName').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\d+)$'));
        if (m) maxNum = Math.max(maxNum, parseInt(m[1]));
      }
      const newName = `${origName}${t('processes.copyName')}${maxNum + 1}`;

      const fullProc = await pb.collection('WORKFLOW_processes').getOne(proc.id, { requestKey: null });

      const data: Record<string, unknown> = {
        name: newName,
        nodes: typeof fullProc.nodes === 'string' ? fullProc.nodes : JSON.stringify(fullProc.nodes),
        edges: typeof fullProc.edges === 'string' ? fullProc.edges : JSON.stringify(fullProc.edges),
        owner: user!.id,
        group: proc.group || '',
        workspace: activeWorkspace!.id,
      };
      const newRecord = await pb.collection('WORKFLOW_processes').create(data, {
        fields: 'id,name,created,updated,avatar,icon,isPublic,locked_by,locked_at,group'
      });
      setProcesses(prev => [newRecord as Process, ...prev]);
    } catch (err) {
      console.error('Error duplicating process:', err);
      useToastStore.getState().showToast(t('processes.duplicateError'), 'error');
    }
  };

  const getProcessAvatarUrl = (proc: Process) => {
    if (!proc.avatar) return '';
    return getRecordFileUrl('WORKFLOW_processes', proc, proc.avatar, 200);
  };



  const isSearchActive = searchQuery.trim().length > 0;
  // When searching, use allWorkspaceProcesses (which is already filtered by backend); otherwise filter current view
  const filteredProcesses = useMemo(() => isSearchActive ? allWorkspaceProcesses : processes.filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase())), [isSearchActive, allWorkspaceProcesses, processes, searchQuery]);
  const currentFolder = useMemo(() => currentFolderId ? groups.find(g => g.id === currentFolderId) : null, [currentFolderId, groups]);

  if (!activeWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <FolderGit2 size={48} className="opacity-20 mb-4" />
        <p>{t('processes.selectWorkspace')}</p>
      </div>
    );
  }

  return (
    <DashboardPageLayout maxWidth="max-w-[1200px]">
          {/* Header */}
          <header className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <div>
                {currentFolderId ? (
                  <>
                    <h1 className="text-xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3 flex-wrap">
                      <Button 
                        variant="ghost"
                        size="icon"
                        onClick={() => setCurrentFolderId(null)}
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <ChevronLeft size={16} />
                      </Button>
                      <WorkspaceSwitcherDropdown />
                      <span className="text-border/50 font-light mx-1 hidden sm:inline">/</span>
                      <FolderOpen size={28} className="text-brand-gold" />
                      <span className="truncate max-w-[200px] sm:max-w-[400px]">{currentFolder?.name || 'Folder'}</span>
                    </h1>
                  </>
                ) : (
                  <>
                    <h1 className="text-xl sm:text-3xl font-bold text-foreground mb-2">{t('dashboard.processesAndFolders')}</h1>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-muted-foreground">{t('dashboard.workspace')}</span>
                      <WorkspaceSwitcherDropdown />
                    </div>
                  </>
                )}
              </div>
              <Button 
                onClick={createNewProcess}
                size="pill"
                disabled={activeWorkspace?.isLocked || activeWorkspace?.role === 'viewer'}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <Plus size={18} />
                {t('processes.createProcess')}
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {!currentFolderId && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={activeWorkspace?.isLocked || activeWorkspace?.role === 'viewer'}
                  onClick={() => setIsCreatingGroup(true)}
                  className="flex items-center gap-2"
                >
                  <FolderPlus size={16} />
                  {t('processes.createFolder')}
                </Button>
              )}
              {!currentFolderId && limits.canUseTemplates && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsTemplatesOpen(true)}
                  className="flex items-center gap-2"
                >
                  <LayoutTemplate size={16} />
                  {t('processes.templates')}
                </Button>
              )}
              <SearchInput 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('processes.searchProcess')}
                wrapperClassName="max-w-md"
              />
            </div>
          </header>

          {/* New Folder Input */}
          {isCreatingGroup && !currentFolderId && (
            <div className="pb-4">
              <form onSubmit={handleCreateGroup} className="flex items-center gap-3 max-w-sm">
                <Input
                  type="text"
                  autoFocus
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onBlur={() => { if(!newGroupName) setIsCreatingGroup(false); }}
                  placeholder={t('processes.folderName')}
                  className="flex-1"
                />
                <Button 
                  type="submit"
                  size="sm"
                >
                  {t('common.create')}
                </Button>
                <Button 
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setIsCreatingGroup(false); setNewGroupName(''); }}
                >
                  {t('common.cancel')}
                </Button>
              </form>
            </div>
          )}

          {/* Error */}
          {errorMsg && (
            <div className="mb-4 text-center py-3 px-4 text-xs text-red-500 bg-red-500/10 rounded-lg">
              {t('processes.error')}: {errorMsg}
            </div>
          )}

          {/* Content Grid */}
          <div 
            className="pt-4 pb-20"
            onDragOver={currentFolderId ? (e) => { e.preventDefault(); setDragOverRoot(true); } : undefined}
            onDragLeave={currentFolderId ? () => setDragOverRoot(false) : undefined}
            onDrop={currentFolderId ? handleDropOnRoot : undefined}
          >
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[50vh]">
            <GryfSpinner size={36} />
          </div>
        ) : (
          <>
            {/* Drop zone indicator when inside folder - for dragging back to root */}
            {currentFolderId && dragOverRoot && draggingProcessId && (
              <div className="mb-6 p-6 rounded-2xl border-2 border-dashed border-brand-gold/40 bg-brand-gold/5 text-center text-sm text-muted-foreground">
                <ArrowUpFromLine size={20} className="mx-auto mb-2 text-brand-gold" />
                {t('processes.dropToRemoveFromFolder')}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-20 max-w-[1200px] w-full mx-auto">
              
              {/* Create Process Card — always first */}
              <div 
                onClick={(activeWorkspace?.isLocked || activeWorkspace?.role === 'viewer') ? undefined : createNewProcess}
                className={`group rounded-2xl p-5 flex flex-col items-center justify-center min-h-[180px] transition-all ${
                  (activeWorkspace?.isLocked || activeWorkspace?.role === 'viewer') ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50' : 'bg-brand-gold hover:bg-brand-gold/90 cursor-pointer text-background'
                }`}
              >
                {(activeWorkspace?.isLocked || activeWorkspace?.role === 'viewer') ? <Lock size={32} className="mb-3" /> : <Plus size={32} className="mb-3" />}
                <span className="font-bold text-sm">
                  {activeWorkspace?.isLocked 
                    ? t('common.locked') 
                    : activeWorkspace?.role === 'viewer'
                      ? t('tierLimits.readOnlyMode')
                      : t('processes.createProcess')}
                </span>
              </div>

              {currentFolderId === null && !isSearchActive && groups.map(group => (
                <Card
                  key={group.id}
                  onClick={() => {
                    if (renamingFolderId !== group.id) {
                      setCurrentFolderId(group.id);
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverFolderId(group.id);
                  }}
                  onDragLeave={() => setDragOverFolderId(null)}
                  onDrop={(e) => { e.stopPropagation(); handleDropOnFolder(e, group.id); }}
                  className={`group/card p-5 cursor-pointer flex flex-col min-h-[180px] transition-all relative ${
                    dragOverFolderId === group.id 
                      ? 'border-brand-gold/60 bg-brand-gold/5 scale-[1.02]' 
                      : 'border-border/50 hover:border-foreground/20'
                  }`}
                >
                  {/* 3-dot menu for folder */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = (e.target as HTMLElement).closest('button')!.getBoundingClientRect();
                        setFolderContextMenu({ groupId: group.id, x: rect.right, y: rect.bottom });
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-colors ${
                      dragOverFolderId === group.id ? 'bg-brand-gold/20 text-brand-gold' : 'bg-secondary/50 text-muted-foreground'
                    }`}>
                      <Folder size={28} />
                    </div>
                    {renamingFolderId === group.id ? (
                      <form 
                        onSubmit={(e) => { e.preventDefault(); handleRenameFolder(group.id); }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full flex flex-col items-center gap-2 mb-1"
                      >
                        <input
                          autoFocus
                          value={renameFolderValue}
                          onChange={(e) => setRenameFolderValue(e.target.value)}
                          onBlur={() => handleRenameFolder(group.id)}
                          onKeyDown={(e) => { if (e.key === 'Escape') setRenamingFolderId(null); }}
                          className="text-sm font-bold text-foreground text-center bg-secondary border border-border/50 rounded-lg px-3 py-1 outline-none focus:border-foreground/30 w-full max-w-[160px]"
                        />
                      </form>
                    ) : (
                      <h3 className="text-sm font-bold text-foreground text-center truncate max-w-full">{group.name}</h3>
                    )}
                    <span className="text-xs text-muted-foreground mt-1">
                      {folderCounts[group.id] ?? 0} {(folderCounts[group.id] ?? 0) === 1 ? t('processes.processOne') : t('processes.processMany')}
                    </span>
                  </div>
                </Card>
              ))}

              {/* Process Cards */}
              {filteredProcesses.map((proc) => {
                const isProcessLocked = lockedProcessIds.has(proc.id) || activeWorkspace?.isLocked;
                
                return (
                <Card 
                  key={proc.id} 
                  draggable={!isProcessLocked}
                  onDragStart={isProcessLocked ? undefined : (e) => handleDragStart(e, proc)}
                  onDragEnd={isProcessLocked ? undefined : handleDragEnd}
                  className={`group/card p-5 hover:border-foreground/20 transition-all cursor-pointer flex flex-col min-h-[180px] relative ${
                    draggingProcessId === proc.id ? 'opacity-50 scale-95' : ''
                  } ${isProcessLocked ? 'opacity-70 grayscale-[30%]' : ''}`}
                  onClick={() => handleLoadProcess(proc.id)}
                >
                  {/* Drag handle + Public badge + Context Menu */}
                  <div className="flex justify-between items-center mb-auto">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing transition-colors"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <GripVertical size={16} />
                    </div>

                    {/* Adaptive badges: icon-only when 2+ visible, full label when single */}
                    {(() => {
                      const isEditedByOther = !!(proc.locked_by && proc.locked_at && (now - new Date(proc.locked_at).getTime() < 3 * 60 * 1000));
                      const badgeCount = (proc.isPublic ? 1 : 0) + (isProcessLocked ? 1 : 0) + (isEditedByOther ? 1 : 0);
                      const compact = badgeCount >= 2;

                      return (
                        <div className="flex items-center gap-1">
                          {proc.isPublic && (
                            <SimpleTooltip content={t('processes.sharePublic')}>
                              <div className={`flex items-center rounded-full bg-green-500/15 text-green-500 text-[11px] font-semibold ${compact ? 'w-6 h-6 justify-center' : 'gap-1.5 px-2.5 py-1'}`}>
                                <Globe size={compact ? 12 : 11} />
                                {!compact && <span>{t('processes.public')}</span>}
                              </div>
                            </SimpleTooltip>
                          )}

                          {isProcessLocked && (
                            <SimpleTooltip content={t('tierLimits.readOnlyMode')}>
                              <div className={`flex items-center rounded-full bg-red-500/15 text-red-500 text-[11px] font-semibold ${compact ? 'w-6 h-6 justify-center' : 'gap-1.5 px-2.5 py-1'}`}>
                                <Lock size={compact ? 12 : 14} />
                                {!compact && <span>{t('common.locked', 'Read Only')}</span>}
                              </div>
                            </SimpleTooltip>
                          )}

                          {isEditedByOther && (
                            <SimpleTooltip content={t('processes.editedBy', { name: proc.expand?.locked_by?.name || proc.expand?.locked_by?.email || t('processes.unknownUser') })}>
                              <div className={`flex items-center rounded-full bg-amber-500/15 text-amber-400 text-[11px] font-semibold ${compact ? 'w-6 h-6 justify-center' : 'gap-1.5 px-2.5 py-1'}`}>
                                <Lock size={compact ? 12 : 14} />
                                {!compact && <span>{t('processes.locked')}</span>}
                              </div>
                            </SimpleTooltip>
                          )}
                        </div>
                      );
                    })()}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = (e.target as HTMLElement).closest('button')!.getBoundingClientRect();
                        setContextMenu({ 
                          processId: proc.id, 
                          x: rect.right, 
                          y: rect.bottom 
                        });
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                  
                  {/* Avatar/Icon */}
                  {(() => {
                    const avatarUrl = getProcessAvatarUrl(proc);
                    const IconCmp = proc.icon ? getIcon(proc.icon) : null;
                    if (avatarUrl) {
                      return (
                        <div className="flex justify-center my-2">
                          <div className="w-12 h-12 rounded-full overflow-hidden border border-border/30">
                            <img loading="lazy" src={avatarUrl} alt={proc.name} className="w-full h-full object-cover" />
                          </div>
                        </div>
                      );
                    }
                    if (IconCmp) {
                      return (
                        <div className="flex justify-center my-2">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-secondary/50 text-foreground transition-colors group-hover/card:bg-brand-gold group-hover/card:text-background">
                            <IconCmp size={24} />
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  {/* Process Info */}
                  <div className="mt-auto pt-4">
                    <h3 className="text-base font-bold mb-1 truncate">
                      {proc.name || t('processes.processNoName')}
                    </h3>
                    {(() => {
                      const editor = proc.expand?.lastEditedBy || user;
                      return (
                        <SimpleTooltip content={
                          <div className="flex items-center gap-2">
                            {editor?.avatar ? (
                              <img loading="lazy" src={getAvatarUrl(editor, 40)} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-[9px] font-bold">
                                {(editor?.name || editor?.email || '?').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span>{editor?.name || editor?.email || t('processes.unknownUser')} · {new Date(proc.created).toLocaleDateString()} {new Date(proc.created).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        }>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground w-fit">
                            <Clock size={12} />
                            <span>{new Date(proc.updated).toLocaleDateString()} {new Date(proc.updated).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </SimpleTooltip>
                      );
                    })()}
                  </div>
                </Card>
              )})}
              {/* Empty states */}
              {filteredProcesses.length === 0 && groups.length === 0 && !isCreatingGroup && !isSearchActive && (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  {t('processes.noProcessesAndFolders')}
                </div>
              )}
              
              {filteredProcesses.length === 0 && isSearchActive && (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  {isSearching ? t('processes.searching') : t('processes.noSearchResults')}
                </div>
              )}
            </div>

            {/* Load More Button */}
            {!isLoading && ((!isSearchActive && page < totalPages) || (isSearchActive && searchPage < searchTotalPages)) && (
              <div className="flex justify-center mt-6 mb-12">
                <LoadMoreButton 
                  onClick={handleLoadMore} 
                  isLoading={isLoadingMore}
                  label={t('common.loadMoreProcesses')}
                />
              </div>
            )}
          </>
        )}
        </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          ref={contextMenuRef}
          className="fixed z-[100] bg-card border border-border/50 rounded-xl py-1 min-w-[180px] animate-in fade-in-0 zoom-in-95"
          style={{ 
            top: contextMenu.y, 
            left: contextMenu.x,
          }}
        >
          {(() => {
            const proc = filteredProcesses.find(p => p.id === contextMenu.processId);
            if (!proc) return null;
            const isProcessLocked = lockedProcessIds.has(proc.id) || activeWorkspace?.isLocked;
            const isViewer = activeWorkspace?.role === 'viewer';
            return (
              <>
                <button
                  onClick={() => { handleLoadProcess(proc.id); setContextMenu(null); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors text-left"
                >
                  <LayoutGrid size={14} className="text-muted-foreground" />
                  {isProcessLocked ? t('processes.openReadOnly', 'Otwórz do odczytu') : t('processes.openEditor')}
                </button>
                {!isProcessLocked && !isViewer && (
                  <button
                    onClick={() => { handleDuplicateProcess(proc); setContextMenu(null); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors text-left"
                  >
                    <Copy size={14} className="text-muted-foreground" />
                    {t('processes.duplicate')}
                  </button>
                )}
                <button
                  onClick={() => { handleDownloadProcess(proc); setContextMenu(null); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors text-left"
                >
                  <Upload size={14} className="text-muted-foreground" />
                  {t('processes.exportJson')}
                </button>
                {!isViewer && (
                  <button
                    onClick={() => { setAvatarModal({ collectionName: 'WORKFLOW_processes', recordId: proc.id, currentUrl: getProcessAvatarUrl(proc), currentIcon: proc.icon }); setContextMenu(null); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors text-left"
                  >
                    <ImageIcon size={14} className="text-muted-foreground" />
                    {t('processes.changeAvatar')}
                  </button>
                )}
                {proc.avatar && !isViewer && (
                  <button
                    onClick={async () => {
                      try {
                        await pb.collection('WORKFLOW_processes').update(proc.id, { avatar: null });
                        fetchData();
                      } catch (err) { console.error('Error removing avatar:', err); }
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
                  >
                    <Trash2 size={14} />
                    {t('processes.removeAvatar')}
                  </button>
                )}
                {!isViewer && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShareModalProcessId(proc.id); setContextMenu(null); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors text-left"
                  >
                    <Share2 size={14} className="text-muted-foreground" />
                    {t('processes.share')}
                  </button>
                )}
                {currentFolderId && !isViewer && (
                  <button
                    onClick={() => { handleRemoveFromFolder(proc); setContextMenu(null); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors text-left"
                  >
                    <ArrowUpFromLine size={14} className="text-muted-foreground" />
                    {t('processes.removeFromFolder')}
                  </button>
                )}
                {!isViewer && (
                  <>
                    <div className="h-px bg-border/50 my-1" />
                    <button
                      onClick={() => { handleDeleteProcess(proc); setContextMenu(null); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
                    >
                      <Trash2 size={14} />
                      {t('processes.deletePermanently')}
                    </button>
                  </>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Folder Context Menu */}
      {folderContextMenu && (() => {
        const group = groups.find(g => g.id === folderContextMenu.groupId);
        if (!group) return null;
        return (
          <div 
            ref={folderContextMenuRef}
            className="fixed z-[100] bg-card border border-border/50 rounded-xl py-1 min-w-[180px] animate-in fade-in-0 zoom-in-95"
            style={{ 
              top: folderContextMenu.y, 
              left: folderContextMenu.x,
            }}
          >
            <button
              onClick={() => { setCurrentFolderId(group.id); setFolderContextMenu(null); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors text-left"
            >
              <FolderOpen size={14} className="text-muted-foreground" />
              {t('processes.openFolder')}
            </button>
            {activeWorkspace?.role !== 'viewer' && (
              <>
                <button
                  onClick={() => {
                    setRenamingFolderId(group.id);
                    setRenameFolderValue(group.name);
                    setFolderContextMenu(null);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors text-left"
                >
                  <Pencil size={14} className="text-muted-foreground" />
                  {t('processes.renameFolder')}
                </button>
                <div className="h-px bg-border/50 my-1" />
                <button
                  onClick={(e) => { handleDeleteGroup(e, group); setFolderContextMenu(null); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
                >
                  <Trash2 size={14} />
                  {t('processes.deleteFolder')}
                </button>
              </>
            )}
          </div>
        );
      })()}

      {/* Avatar Crop Modal */}
      {avatarModal && (
        <Suspense fallback={null}>
          <AvatarCropModal
            isOpen={true}
            onClose={() => setAvatarModal(null)}
            collectionName={avatarModal.collectionName}
            recordId={avatarModal.recordId}
            currentAvatarUrl={avatarModal.currentUrl}
            currentIcon={avatarModal.currentIcon}
            onSaved={() => { setAvatarModal(null); fetchData(); }}
            title={t('avatar.title')}
          />
        </Suspense>
      )}

      {/* Share Modal */}
      {shareModalProcessId && (
        <Suspense fallback={null}>
          <ShareModal
            isOpen={true}
            onClose={() => setShareModalProcessId(null)}
            processId={shareModalProcessId}
            onSaved={() => { setShareModalProcessId(null); fetchData(); }}
          />
        </Suspense>
      )}

      {/* Templates Modal */}
      <Suspense fallback={null}>
        <TemplatesModal isOpen={isTemplatesOpen} onClose={() => setIsTemplatesOpen(false)} />
      </Suspense>
    </DashboardPageLayout>
  );
};
