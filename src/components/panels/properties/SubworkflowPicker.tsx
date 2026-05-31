/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { pb, type WorkflowProcess } from '@/lib/pocketbase';
import { sanitizeForFilter } from '@/lib/parseUtils';
import { ChevronRight, ExternalLink, Workflow } from 'lucide-react';
import { GryfSpinner } from '@/components/ui/GryfSpinner';
import { Button } from '@/components/ui/button';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { useToastStore } from '@/store/toastStore';

import type { Node } from '@xyflow/react';
import { useCanvasStore } from "@/store/canvasStore";

type WorkspaceProcess = WorkflowProcess;

interface SubworkflowPickerProps {
  activeNode: Node;
  updateNode: (id: string, data: Record<string, unknown>) => void;
  isViewMode: boolean;
}

export const SubworkflowPicker = ({ activeNode, updateNode, isViewMode }: SubworkflowPickerProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeWorkspace, user } = useAuthStore();
  const currentProcessId = useCanvasStore(state => state.currentProcessId);

  const [processes, setProcesses] = useState<WorkspaceProcess[]>([]);
  const [targetNodes, setTargetNodes] = useState<{ id: string; label: string; type: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingNodes, setIsLoadingNodes] = useState(false);

  const isStop = activeNode?.type === 'startstop' && activeNode?.data?.type === 'stop';
  const sectionTitle = isStop ? t('props.stopTargetWorkflow') : t('props.relatedProcess');

  // Fetch all workspace processes
  const fetchProcesses = useCallback(async () => {
    if (!activeWorkspace || !user) return;
    setIsLoading(true);
    try {
      const records = await pb.collection('WORKFLOW_processes').getList(1, 500, {
        filter: `workspace = '${sanitizeForFilter(activeWorkspace.id)}'`,
        sort: 'name',
        fields: 'id,name,group',
        requestKey: null,
      });
      // Exclude current process
      const filtered = records.items.filter(r => r.id !== currentProcessId);
      setProcesses(filtered as WorkspaceProcess[]);
    } catch (err) {
      console.error('Error fetching workspace processes:', err);
      useToastStore.getState().showToast(t('common.error'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace, user, currentProcessId, t]);

  useEffect(() => {
    fetchProcesses();
  }, [fetchProcesses]);

  // Load target process nodes when a process is selected
  const fetchTargetNodes = useCallback(async (processId: string) => {
    setIsLoadingNodes(true);
    try {
      const record = await pb.collection('WORKFLOW_processes').getOne(processId, {
        fields: 'nodes',
        requestKey: null,
      });
      let nodes: { id: string; data?: { label?: string }; type?: string }[] = [];
      if (typeof record.nodes === 'string') {
        try { nodes = JSON.parse(record.nodes); } catch { nodes = []; }
      } else if (Array.isArray(record.nodes)) {
        nodes = record.nodes;
      }
      // Filter to business-logic nodes only
      const relevant = nodes
        .filter(n => ['simple', 'startstop', 'gateway', 'subworkflow', 'database'].includes(n.type || ''))
        .map(n => ({
          id: n.id,
          label: n.data?.label || n.type || 'Unnamed',
          type: n.type || 'unknown',
        }));
      setTargetNodes(relevant);
    } catch (err) {
      console.error('Error fetching target process nodes:', err);
      useToastStore.getState().showToast(t('common.error'), 'error');
      setTargetNodes([]);
    } finally {
      setIsLoadingNodes(false);
    }
  }, [t]);

  // When targetWorkflowId changes, load its nodes
  useEffect(() => {
    const twId = activeNode?.data?.targetWorkflowId;
    if (twId) {
      fetchTargetNodes(twId);
    } else {
      setTargetNodes([]);
    }
  }, [activeNode?.data?.targetWorkflowId, fetchTargetNodes]);

  const handleProcessSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    updateNode(activeNode.id, { 
      targetWorkflowId: val, 
      targetWorkflowName: val ? name : '',
      targetNodeId: '',
      targetNodeLabel: '',
    });
  };

  const handleNodeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const label = e.target.options[e.target.selectedIndex].text;
    updateNode(activeNode.id, { 
      targetNodeId: val, 
      targetNodeLabel: val ? label : '',
    });
  };

  const handleOpenLinkedProcess = (newTab: boolean) => {
    const targetId = activeNode?.data?.targetWorkflowId;
    if (!targetId) return;
    const url = `/app/${targetId}`;
    if (newTab) {
      window.open(url, '_blank');
    } else {
      navigate(url);
    }
  };

  const selectedProcessId = activeNode?.data?.targetWorkflowId || '';
  const selectedNodeId = activeNode?.data?.targetNodeId || '';

  return (
    <section className="bg-secondary/20 rounded-xl border border-border/40 p-3 space-y-3">
      <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Workflow size={12} className="text-purple-500" />
        {sectionTitle}
      </h3>

      {/* Process Selector */}
      <div className="space-y-1.5 relative">
        <label className="text-xs text-muted-foreground font-medium">{t('props.subworkflowQuestion')}</label>
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <GryfSpinner size={14} />
            {t('props.loadingProcesses')}
          </div>
        ) : (
          <>
            <select 
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all appearance-none cursor-pointer"
              value={selectedProcessId}
              onChange={handleProcessSelect}
              disabled={isViewMode}
            >
              <option value="">{t('props.subworkflowPlaceholder')}</option>
              {processes.length === 0 ? (
                <option value="" disabled>{t('props.noProcesses')}</option>
              ) : (
                processes.map(p => (
                  <option key={p.id} value={p.id}>{p.name || 'Unnamed'}</option>
                ))
              )}
            </select>
            <div className="absolute right-3 top-[34px] pointer-events-none text-muted-foreground">
              <ChevronRight size={14} className="rotate-90" />
            </div>
          </>
        )}
      </div>

      {/* Target Node Selector — only when a process is selected */}
      {selectedProcessId && (
        <div className="space-y-1.5 relative">
          <label className="text-xs text-muted-foreground font-medium">{t('props.selectTargetNode')}</label>
          {isLoadingNodes ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <GryfSpinner size={14} />
              {t('common.loading')}
            </div>
          ) : (
            <>
              <select 
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all appearance-none cursor-pointer"
                value={selectedNodeId}
                onChange={handleNodeSelect}
                disabled={isViewMode}
              >
                <option value="">{t('props.noTargetNode')}</option>
                {targetNodes.map(n => (
                  <option key={n.id} value={n.id}>{n.label} ({n.type})</option>
                ))}
              </select>
              <div className="absolute right-3 top-[34px] pointer-events-none text-muted-foreground">
                <ChevronRight size={14} className="rotate-90" />
              </div>
            </>
          )}
        </div>
      )}

      {/* Link to open the connected process */}
      {selectedProcessId && (
        <div className="flex items-center gap-2 p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
          <ExternalLink size={14} className="text-purple-500 shrink-0" />
          <span className="text-xs text-foreground font-medium truncate flex-1">
            {activeNode?.data?.targetWorkflowName || t('props.openLinkedProcess')}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <SimpleTooltip content={t('props.openInThisTab')}>
              <Button 
                variant="ghost" 
                size="iconSm" 
                onClick={() => handleOpenLinkedProcess(false)}
                className="h-6 w-6 text-purple-500 hover:text-purple-400 hover:bg-purple-500/20"
              >
                <ChevronRight size={12} />
              </Button>
            </SimpleTooltip>
            <SimpleTooltip content={t('props.openInNewTab')}>
              <Button 
                variant="ghost" 
                size="iconSm" 
                onClick={() => handleOpenLinkedProcess(true)}
                className="h-6 w-6 text-purple-500 hover:text-purple-400 hover:bg-purple-500/20"
              >
                <ExternalLink size={12} />
              </Button>
            </SimpleTooltip>
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        {isStop ? t('props.stopTargetHint') : t('props.subworkflowHint')}
      </p>
    </section>
  );
};
