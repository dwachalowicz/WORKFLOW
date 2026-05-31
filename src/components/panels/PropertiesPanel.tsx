import { useTranslation } from 'react-i18next';
import { useReactFlow } from '@xyflow/react';
import { useState, useEffect } from 'react';
import { Trash2, Settings, UserPlus, Plus, ChevronRight, ChevronLeft, ChevronDown, Type, Hash, Calendar, ToggleLeft, MousePointerClick, Mail, Webhook, Clock, Network, MoreHorizontal } from 'lucide-react';
import { CollapsibleSection } from './properties/CollapsibleSection';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { NodeComments } from '@/components/panels/NodeComments';
import { GroupPickerDropdown } from '@/components/ui/GroupPickerDropdown';
import { ActionSelector } from './properties/ActionSelector';
import type { GroupRef } from '@/lib/groupService';
import { Button } from '@/components/ui/button';
import { GroupListSection } from '@/components/panels/properties/GroupListSection';
import { EdgePropertiesPanel } from '@/components/panels/properties/EdgePropertiesPanel';
import { SubworkflowPicker } from '@/components/panels/properties/SubworkflowPicker';
import { IconPickerDropdown } from '@/components/ui/IconPickerDropdown';
import { useAuthStore } from '@/store/authStore';
import { getTierLimits } from '@/lib/tierLimits';
import { useUiStore } from "@/store/uiStore";
import { useCanvasStore } from "@/store/canvasStore";
import { DebouncedInput } from '@/components/ui/DebouncedInput';
import { DebouncedTextarea } from '@/components/ui/DebouncedTextarea';
import { useShallow } from 'zustand/react/shallow';

export const PropertiesPanel = () => {
  const { t } = useTranslation();
  const isCollapsed = useUiStore(state => state.isPropertiesPanelCollapsed);
  const setIsCollapsed = useUiStore(state => state.setPropertiesPanelCollapsed);
  const highlightTrigger = useUiStore(state => state.propertiesPanelHighlightTrigger);
  const isViewMode = useCanvasStore(state => state.isViewMode);
  const incomingLinks = useCanvasStore(state => state.incomingLinks);
  const { setEdges, setNodes } = useReactFlow();
  
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    if (highlightTrigger > 0) {
      setIsHighlighted(true);
      const timer = setTimeout(() => setIsHighlighted(false), 500);
      return () => clearTimeout(timer);
    }
  }, [highlightTrigger]);


  const updateNode = useCanvasStore(state => state.updateNode);
  
  // Use shallow comparison to avoid re-renders when nodes/edges only change positions (dragging)
  const activeNode = useCanvasStore(useShallow(state => {
    const n = state.nodes.find(node => node.selected);
    return n ? { id: n.id, type: n.type, data: n.data } : null;
  })) as import('@xyflow/react').Node | null;
  
  const activeEdge = useCanvasStore(useShallow(state => {
    const e = state.edges.find(edge => edge.selected);
    return e ? { id: e.id, source: e.source, target: e.target, label: e.label, data: e.data } : null;
  })) as import('@xyflow/react').Edge | null;

  const user = useAuthStore(s => s.user);
  const limits = getTierLimits(user?.tier);

  const handleDeleteEdge = () => {
    if (activeEdge) {
      setEdges(edges => edges.filter(e => e.id !== activeEdge.id));
    }
  };

  const handleDeleteNode = () => {
    if (activeNode) {
      setNodes(nodes => nodes.filter(n => n.id !== activeNode.id));
      setEdges(edges => edges.filter(e => e.source !== activeNode.id && e.target !== activeNode.id));
    }
  };

  // ── Group handlers (node-level) — generic add/remove for editors & readers ──
  const handleAddGroupRef = (field: 'editors' | 'readers', group: GroupRef) => {
    if (!activeNode) return;
    setNodes(nodes => nodes.map(node => {
      if (node.id === activeNode.id) {
        const updated = [...(node.data?.[field] || []), group];
        return { ...node, data: { ...node.data, [field]: updated } };
      }
      return node;
    }));
  };

  const handleRemoveGroupRef = (field: 'editors' | 'readers', indexToRemove: number) => {
    if (!activeNode) return;
    setNodes(nodes => nodes.map(node => {
      if (node.id === activeNode.id) {
        const updated = [...(node.data?.[field] || [])];
        updated.splice(indexToRemove, 1);
        return { ...node, data: { ...node.data, [field]: updated } };
      }
      return node;
    }));
  };

  const handleAddEditor = (group: GroupRef) => handleAddGroupRef('editors', group);
  const handleRemoveEditor = (idx: number) => handleRemoveGroupRef('editors', idx);
  const handleAddReader = (group: GroupRef) => handleAddGroupRef('readers', group);
  const handleRemoveReader = (idx: number) => handleRemoveGroupRef('readers', idx);





  if (isCollapsed) {
    return (
      <>
        {/* Desktop collapsed rail */}
        <aside className="w-12 border-l border-border bg-card hidden lg:flex flex-col items-center py-4 shrink-0 h-full">
          <SimpleTooltip content={t('props.expandPanel')} side="right">
            <Button 
              variant="iconGhost"
              size="icon"
              onClick={() => setIsCollapsed(false)}
            >
              <ChevronLeft size={16} />
            </Button>
          </SimpleTooltip>
        </aside>
        {/* Mobile floating button */}
        <button
          onClick={() => setIsCollapsed(false)}
          className="lg:hidden fixed top-20 right-3 z-[90] w-10 h-10 rounded-full bg-brand-gold text-background shadow-lg flex items-center justify-center hover:bg-brand-gold/90 transition-colors"
          aria-label={t('props.expandPanel')}
        >
          <Settings size={18} />
        </button>
      </>
    );
  }

  if (!activeNode && !activeEdge) {
    return (
      <>
        {/* Desktop empty state */}
        <aside className="w-80 border-l border-border bg-card hidden lg:flex flex-col h-full shrink-0 tour-properties-panel">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground text-sm">{t('properties.title')}</h2>
            <SimpleTooltip content={t('props.collapsePanel')}>
              <Button 
                variant="iconGhost"
                size="icon"
                onClick={() => setIsCollapsed(true)}
              >
                <ChevronRight size={16} />
              </Button>
            </SimpleTooltip>
          </div>
          <div className="flex-1 p-5 flex flex-col items-center justify-center overflow-auto">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3 text-muted-foreground">
              <Settings size={24} />
            </div>
            <p className="text-sm text-muted-foreground text-center">{t('props.selectNodeOrEdge')}</p>
          </div>
        </aside>
        {/* Mobile floating button */}
        <button
          onClick={() => setIsCollapsed(true)}
          className="lg:hidden fixed top-20 right-3 z-[90] w-10 h-10 rounded-full bg-card border border-border text-muted-foreground shadow-lg flex items-center justify-center"
          aria-label={t('props.collapsePanel')}
        >
          <Settings size={18} />
        </button>
      </>
    );
  }

  if (activeEdge) {
    return (
      <EdgePropertiesPanel
        activeEdge={activeEdge}
        isViewMode={isViewMode}
        isHighlighted={isHighlighted}
        collapsedSections={collapsedSections}
        toggleSection={toggleSection}
        onCollapse={() => setIsCollapsed(true)}
        onDeselect={() => setEdges(edges => edges.map(e => ({ ...e, selected: false })))}
        onDelete={handleDeleteEdge}
        setEdges={setEdges}
      />
    );
  }


  // Active Node
  const editors = activeNode?.data?.editors || [];
  const readers = activeNode?.data?.readers || [];

  const predefinedTriggers = ['manual', 'email', 'webhook', 'schedule', 'subworkflow'];

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[99] lg:hidden"
        onClick={() => setIsCollapsed(true)}
      />
    <aside className={`w-80 border-l border-border bg-card flex flex-col shrink-0 transition-all duration-300 tour-properties-panel fixed right-0 top-0 h-[calc(100%-3.5rem)] lg:h-full z-[100] lg:relative lg:z-auto shadow-2xl lg:shadow-none ${isHighlighted ? 'ring-2 ring-inset ring-brand-gold shadow-[0_0_15px_rgba(188,155,89,0.3)] z-[100]' : ''}`}>
      <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
        <h2 className="font-semibold text-foreground text-sm">{activeNode?.data?.label || activeNode?.id}</h2>
        <div className="flex items-center gap-1">
          <SimpleTooltip content={t('props.collapsePanel')}>
            <Button 
              variant="iconGhost"
              size="iconSm"
              onClick={() => setIsCollapsed(true)}
            >
              <ChevronRight size={14} />
            </Button>
          </SimpleTooltip>
          {!isViewMode && (
            <SimpleTooltip content={t('common.delete')}>
              <Button 
                variant="iconDestructive"
                size="iconSm"
                onClick={handleDeleteNode}
              >
                <Trash2 size={14} />
              </Button>
            </SimpleTooltip>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {/* Basic Properties */}
        <CollapsibleSection title={t('props.general')} isCollapsed={!!collapsedSections['general']} onToggle={() => toggleSection('general')}>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">{t('props.label')}</label>
            <DebouncedInput 
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 outline-none transition-all" 
              value={(activeNode?.data?.label as string) || ''} 
              onChangeValue={(val) => !isViewMode && updateNode(activeNode!.id, { label: val })}
              readOnly={isViewMode}
            />
          </div>
          {activeNode?.type !== 'startstop' && activeNode?.type !== 'database' && (
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">{t('avatar.iconTab')}</label>
            <IconPickerDropdown 
              value={(activeNode?.data?.icon as string) || ''}
              onChange={(iconName) => !isViewMode && updateNode(activeNode!.id, { icon: iconName })}
              disabled={isViewMode}
            />
          </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">{t('properties.description')}</label>
            <DebouncedTextarea 
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 outline-none transition-all resize-none leading-relaxed"
              rows={3}
              value={(activeNode?.data?.description as string) || ''} 
              onChangeValue={(val) => !isViewMode && updateNode(activeNode!.id, { description: val })}
              placeholder={t('props.descPlaceholder')}
              readOnly={isViewMode}
            />
          </div>
          {/* SLA & Cost — only for process steps, not databases */}
          {activeNode?.type !== 'database' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium truncate block">{t('props.slaTime')}</label>
              <div className="flex items-stretch gap-0 h-9">
                <input 
                  type="number"
                  min="0"
                  step="any"
                  className="flex-1 min-w-0 bg-secondary border border-border rounded-l-xl px-2 text-sm text-foreground focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                  value={activeNode?.data?.maxDuration ?? ''} 
                  onChange={(e) => !isViewMode && updateNode(activeNode.id, { maxDuration: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="0"
                  readOnly={isViewMode}
                />
                <button
                  type="button"
                  onClick={() => !isViewMode && updateNode(activeNode.id, { maxDurationUnit: 'h' })}
                  className={`border-y border-r border-border px-2 text-[11px] font-semibold transition-colors whitespace-nowrap bg-secondary ${(!activeNode?.data?.maxDurationUnit || activeNode?.data?.maxDurationUnit === 'h') ? 'text-brand-gold' : 'text-muted-foreground hover:text-foreground'}`}
                >{t('props.hours')}</button>
                <button
                  type="button"
                  onClick={() => !isViewMode && updateNode(activeNode.id, { maxDurationUnit: 'd' })}
                  className={`border-y border-r border-border rounded-r-xl px-2 text-[11px] font-semibold transition-colors whitespace-nowrap bg-secondary ${activeNode?.data?.maxDurationUnit === 'd' ? 'text-brand-gold' : 'text-muted-foreground hover:text-foreground'}`}
                >{t('props.days')}</button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium truncate block">{t('props.cost')} ({t('props.costCurrency')})</label>
              <input 
                type="number"
                min="0"
                step="any"
                className="w-full h-9 bg-secondary border border-border rounded-xl px-3 text-sm text-foreground focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                value={activeNode?.data?.cost ?? ''} 
                onChange={(e) => !isViewMode && updateNode(activeNode.id, { cost: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="0"
                readOnly={isViewMode}
              />
            </div>
          </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">{t('props.externalLink')}</label>
            <DebouncedInput 
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 outline-none transition-all" 
              value={(activeNode?.data?.externalLink as string) || ''} 
              onChangeValue={(val) => !isViewMode && updateNode(activeNode!.id, { externalLink: val })}
              placeholder="https://..."
              readOnly={isViewMode}
            />
          </div>
          
        </CollapsibleSection>

        {activeNode?.type === 'startstop' && activeNode?.data?.type === 'start' && (
          <CollapsibleSection title={t('props.trigger')} isCollapsed={!!collapsedSections['trigger']} onToggle={() => toggleSection('trigger')}>

            <div className="space-y-3">
              <label className="text-xs text-muted-foreground font-medium">{t('props.triggerQuestion')}</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { id: 'manual', icon: MousePointerClick, label: t('props.triggerManual') },
                  { id: 'email', icon: Mail, label: t('props.triggerEmail') },
                  { id: 'webhook', icon: Webhook, label: t('props.triggerWebhook') },
                  { id: 'schedule', icon: Clock, label: t('props.triggerSchedule') },
                  { id: 'subworkflow', icon: Network, label: t('props.triggerSubworkflow') },
                  { id: 'custom', icon: MoreHorizontal, label: t('props.triggerCustom') }
                ].map(trigger => {
                  // Multiselect: get current triggers as array
                  const currentTriggers: string[] = Array.isArray(activeNode?.data?.triggerTypes) 
                    ? activeNode.data.triggerTypes 
                    : (activeNode?.data?.triggerType ? [activeNode.data.triggerType] : ['manual']);
                  
                  // Subworkflow trigger is auto-detected — active when incoming links exist
                  const hasIncomingLinks = activeNode?.id && (
                    (incomingLinks[activeNode.id]?.length > 0) || 
                    (incomingLinks['__process__']?.length > 0)
                  );
                  const isSubworkflowAutoActive = trigger.id === 'subworkflow' && hasIncomingLinks;
                  const isSubworkflowLocked = trigger.id === 'subworkflow';
                  const isTierLocked = trigger.id === 'subworkflow' && !limits.canUseCrossWorkflowTriggers;
                  
                  const isActive = trigger.id === 'custom' 
                    ? currentTriggers.some((t: string) => !predefinedTriggers.includes(t))
                    : trigger.id === 'subworkflow'
                      ? isSubworkflowAutoActive
                      : currentTriggers.includes(trigger.id);
                  
                  const isLocked = isSubworkflowLocked || isTierLocked;
                  
                  const tooltipContent = trigger.id === 'subworkflow'
                    ? (isSubworkflowAutoActive 
                        ? t('props.triggerSubworkflowAuto') 
                        : t('props.triggerSubworkflowNone'))
                    : trigger.label;
                  
                  return (
                    <SimpleTooltip key={trigger.id} content={tooltipContent}>
                      <span className={isLocked ? 'cursor-not-allowed' : ''}>
                        <Button
                          variant={isActive ? "outline" : "iconGhost"}
                          size="icon"
                          disabled={isLocked || isViewMode}
                          onClick={() => {
                            if (isLocked || isViewMode) return;
                            let newTriggers = [...currentTriggers];
                            if (trigger.id === 'custom') {
                              if (isActive) {
                                newTriggers = newTriggers.filter(t => predefinedTriggers.includes(t));
                              } else {
                                newTriggers.push('custom');
                              }
                            } else {
                              if (isActive) {
                                newTriggers = newTriggers.filter(t => t !== trigger.id);
                              } else {
                                newTriggers.push(trigger.id);
                              }
                            }
                            if (newTriggers.length === 0) newTriggers = ['manual'];
                            updateNode(activeNode.id, { triggerTypes: newTriggers, triggerType: newTriggers[0] });
                          }}
                          className={isActive ? (isLocked ? "text-purple-400 border-purple-400 bg-purple-500/10 opacity-80 pointer-events-none" : "text-brand-gold border-brand-gold bg-brand-gold/10") : (isLocked ? "bg-secondary border-border opacity-50 pointer-events-none" : "bg-secondary border-border")}
                        >
                          <trigger.icon size={16} />
                        </Button>
                      </span>
                    </SimpleTooltip>
                  );
                })}
              </div>
            </div>
            {(() => {
              const currentTriggers: string[] = Array.isArray(activeNode?.data?.triggerTypes) 
                ? activeNode.data.triggerTypes 
                : (activeNode?.data?.triggerType ? [activeNode.data.triggerType] : ['manual']);
              const hasCustom = currentTriggers.some((t: string) => !predefinedTriggers.includes(t));
              if (!hasCustom) return null;
              const customValue = currentTriggers.find((t: string) => !predefinedTriggers.includes(t)) || '';
              return (
                <div className="space-y-1.5 mt-2">
                  <label className="text-xs text-muted-foreground font-medium">{t('props.triggerCustomLabel')}</label>
                  <input 
                    className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 outline-none transition-all"
                    value={customValue === 'custom' ? '' : customValue}
                    onChange={(e) => {
                      const val = e.target.value || 'custom';
                      const newTriggers = currentTriggers.map(t => !predefinedTriggers.includes(t) ? val : t);
                      updateNode(activeNode.id, { triggerTypes: newTriggers, triggerType: newTriggers[0] });
                    }}
                    placeholder={t('props.triggerCustomPlaceholder')}
                    autoFocus
                  />
                </div>
              );
            })()}
            <p className="text-[10px] text-muted-foreground">{t('props.triggerHint')}</p>
            
        </CollapsibleSection>
        )}

        {activeNode?.type === 'startstop' && activeNode?.data?.type === 'stop' && (
          <CollapsibleSection title={t('props.endAction')} isCollapsed={!!collapsedSections['stopActions']} onToggle={() => toggleSection('stopActions')}>
<ActionSelector
              isViewMode={isViewMode}
              label=""
              question={t('props.endActionQuestion')}
              hint={t('props.actionHint')}
              actions={Array.isArray(activeNode?.data?.actionTypes) ? activeNode.data.actionTypes : (activeNode?.data?.actionType ? [activeNode.data.actionType] : ['none'])}
              onChange={(newActions) => {
                const updates: Record<string, unknown> = { actionTypes: newActions, actionType: newActions[0] };
                updateNode(activeNode.id, updates);
              }}
              emailGroups={activeNode?.data?.exitEmailGroups || []}
              onAddEmailGroup={(group: GroupRef) => {
                const current = activeNode?.data?.exitEmailGroups || [];
                updateNode(activeNode.id, { exitEmailGroups: [...current, group] });
              }}
              onRemoveEmailGroup={(idx: number) => {
                const current = [...(activeNode?.data?.exitEmailGroups || [])];
                current.splice(idx, 1);
                updateNode(activeNode.id, { exitEmailGroups: current });
              }}
              showHandoff
              handoffActive={!!activeNode?.data?.targetWorkflowId}
              onHandoffToggle={() => {
                if (isViewMode) return;
                if (activeNode?.data?.targetWorkflowId) {
                  updateNode(activeNode.id, {
                    targetWorkflowId: '',
                    targetWorkflowName: '',
                    targetNodeId: '',
                    targetNodeLabel: '',
                  });
                  setCollapsedSections(prev => ({ ...prev, stopHandoff: false }));
                } else {
                  setCollapsedSections(prev => ({ ...prev, stopHandoff: !prev['stopHandoff'] }));
                }
              }}
            />
        </CollapsibleSection>
        )}

        {(!activeNode?.type || activeNode?.type === 'simple') && (
          <>
        {/* Initial Action */}
        <CollapsibleSection title={t('props.startAction')} isCollapsed={!!collapsedSections['enterActions']} onToggle={() => toggleSection('enterActions')}>
<ActionSelector
              isViewMode={isViewMode}
              label=""
              question={t('props.startActionQuestion')}
              hint={t('props.startActionHint')}
              actions={activeNode?.data?.enterActionTypes || ['none']}
              onChange={(newActions) => {
                updateNode(activeNode.id, { enterActionTypes: newActions });
              }}
              hideNone={false}
              emailGroups={activeNode?.data?.enterEmailGroups || []}
              onAddEmailGroup={(group: GroupRef) => {
                const current = activeNode?.data?.enterEmailGroups || [];
                updateNode(activeNode.id, { enterEmailGroups: [...current, group] });
              }}
              onRemoveEmailGroup={(idx: number) => {
                const current = [...(activeNode?.data?.enterEmailGroups || [])];
                current.splice(idx, 1);
                updateNode(activeNode.id, { enterEmailGroups: current });
              }}
            />
        </CollapsibleSection>

        {/* Final Action */}
        <CollapsibleSection title={t('props.endAction')} isCollapsed={!!collapsedSections['exitActions']} onToggle={() => toggleSection('exitActions')}>
<ActionSelector
              isViewMode={isViewMode}
              label=""
              question={t('props.endActionQuestion')}
              hint={t('props.actionHint')}
              actions={activeNode?.data?.exitActionTypes || ['none']}
              onChange={(newActions) => {
                const updates: Record<string, unknown> = { exitActionTypes: newActions };
                updateNode(activeNode.id, updates);
              }}
              hideNone={false}
              emailGroups={activeNode?.data?.exitEmailGroups || []}
              onAddEmailGroup={(group: GroupRef) => {
                const current = activeNode?.data?.exitEmailGroups || [];
                updateNode(activeNode.id, { exitEmailGroups: [...current, group] });
              }}
              onRemoveEmailGroup={(idx: number) => {
                const current = [...(activeNode?.data?.exitEmailGroups || [])];
                current.splice(idx, 1);
                updateNode(activeNode.id, { exitEmailGroups: current });
              }}
            />
        </CollapsibleSection>

        {/* Roles */}
        <CollapsibleSection title={t('props.permissions')} isCollapsed={!!collapsedSections['permissions']} onToggle={() => toggleSection('permissions')}>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => toggleSection('editors')} className="flex-1 flex items-center justify-start p-0 h-auto hover:bg-transparent">
                <SimpleTooltip content={t('props.editorsTooltip')}>
                  <label className="text-xs text-muted-foreground font-medium cursor-pointer pointer-events-none">{t('properties.editors')}</label>
                </SimpleTooltip>
              </Button>
              <div className="flex items-center gap-2">
                {!isViewMode && (
                  <GroupPickerDropdown
                    onSelect={handleAddEditor}
                    excludeIds={(activeNode?.data?.editors || []).map((e: GroupRef) => e.id).filter(Boolean)}
                    trigger={
                      <SimpleTooltip content={t('props.addEditor')}>
                        <Button variant="iconGhost" size="iconSm" className="border border-border">
                          <UserPlus size={12} />
                        </Button>
                      </SimpleTooltip>
                    }
                  />
                )}
                <Button variant="ghost" size="iconSm" onClick={() => toggleSection('editors')}>
                  <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${collapsedSections['editors'] ? '-rotate-90' : ''}`} />
                </Button>
              </div>
            </div>
            {!collapsedSections['editors'] && (
              <GroupListSection
                groups={editors}
                onAdd={handleAddEditor}
                onRemove={handleRemoveEditor}
                addTooltip={t('props.addEditor')}
                removeTooltip={t('props.removeEditor')}
                emptyText={t('props.noEditors')}
                isViewMode={isViewMode}
              />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => toggleSection('readers')} className="flex-1 flex items-center justify-start p-0 h-auto hover:bg-transparent">
                <SimpleTooltip content={t('props.readersTooltip')}>
                  <label className="text-xs text-muted-foreground font-medium cursor-pointer pointer-events-none">{t('properties.readers')}</label>
                </SimpleTooltip>
              </Button>
              <div className="flex items-center gap-2">
                {!isViewMode && (
                  <GroupPickerDropdown
                    onSelect={handleAddReader}
                    excludeIds={(activeNode?.data?.readers || []).map((r: GroupRef) => r.id).filter(Boolean)}
                    trigger={
                      <SimpleTooltip content={t('props.addReader')}>
                        <Button variant="iconGhost" size="iconSm" className="border border-border">
                          <UserPlus size={12} />
                        </Button>
                      </SimpleTooltip>
                    }
                  />
                )}
                <Button variant="ghost" size="iconSm" onClick={() => toggleSection('readers')}>
                  <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${collapsedSections['readers'] ? '-rotate-90' : ''}`} />
                </Button>
              </div>
            </div>
            {!collapsedSections['readers'] && (
              <GroupListSection
                groups={readers}
                onAdd={handleAddReader}
                onRemove={handleRemoveReader}
                addTooltip={t('props.addReader')}
                removeTooltip={t('props.removeReader')}
                emptyText={t('props.noReaders')}
                isViewMode={isViewMode}
              />
            )}
          </div>
          
        </CollapsibleSection>

        {/* Dynamic Variables */}
        <CollapsibleSection
          title={t('props.variablesData')}
          isCollapsed={!!collapsedSections['variables']}
          onToggle={() => toggleSection('variables')}
          headerAction={
            <>
              {!isViewMode && (
                <SimpleTooltip content={t('props.addVariable')}>
                    <Button 
                      variant="iconGhost"
                      size="iconSm"
                      onClick={() => {
                        const currentVars = activeNode?.data?.variables || [];
                        if (currentVars.length >= limits.maxVariablesPerProcess) {
                          console.warn(`[TierGate] Variable limit reached: ${limits.maxVariablesPerProcess}`);
                          return;
                        }
                        const newVars = [...currentVars, { id: crypto.randomUUID(), name: t('props.newVariable'), type: 'text', required: false }];
                        updateNode(activeNode.id, { variables: newVars });
                      }}
                      className="border border-border"
                    >
                      <Plus size={12} />
                    </Button>
                </SimpleTooltip>
              )}
            </>
          }
        >

            {activeNode?.data?.variables?.map((v: { id?: string; name: string; type: string; required?: boolean }, idx: number) => {
              const varTypes = [
                { value: 'text', icon: Type, label: t('props.varText') },
                { value: 'number', icon: Hash, label: t('props.varNumber') },
                { value: 'date', icon: Calendar, label: t('props.varDate') },
                { value: 'boolean', icon: ToggleLeft, label: t('props.varBoolean') },
              ];
              return (
              <div key={v.id || idx} className="flex items-center gap-1.5 bg-secondary px-2 py-1.5 rounded-lg border border-border group relative">
                <input 
                  className="flex-1 min-w-0 bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground focus:border-brand-gold outline-none"
                  value={v.name}
                  onChange={(e) => {
                    if (isViewMode) return;
                    const newVars = [...activeNode.data.variables];
                    newVars[idx] = { ...newVars[idx], name: e.target.value };
                    updateNode(activeNode.id, { variables: newVars });
                  }}
                  placeholder={t('props.varNamePlaceholder')}
                  readOnly={isViewMode}
                />
                <div className="flex items-center gap-0.5 shrink-0">
                  {varTypes.map((vt) => (
                    <SimpleTooltip key={vt.value} content={vt.label}>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (isViewMode) return;
                          const newVars = [...activeNode.data.variables];
                          newVars[idx] = { ...newVars[idx], type: vt.value };
                          updateNode(activeNode.id, { variables: newVars });
                        }}
                        className={`w-6 h-6 p-0 rounded-md transition-all ${
                          v.type === vt.value
                            ? 'text-brand-gold bg-brand-gold/10 hover:bg-brand-gold/20 hover:text-brand-gold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background'
                        }`}
                        disabled={isViewMode}
                      >
                        <vt.icon size={13} />
                      </Button>
                    </SimpleTooltip>
                  ))}
                </div>
                {!isViewMode && (
                  <Button 
                    variant="iconDestructive"
                    size="iconSm"
                    onClick={() => {
                      const newVars = [...activeNode.data.variables];
                      newVars.splice(idx, 1);
                      updateNode(activeNode.id, { variables: newVars });
                    }}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={12} />
                  </Button>
                )}
              </div>
              );
            })}
            {(!activeNode?.data?.variables || activeNode.data.variables.length === 0) && (
              <div className="text-xs text-muted-foreground p-2 text-center bg-secondary/50 rounded-xl border border-border/50">
                {t('props.noVariables')}
              </div>
            )}
          
        </CollapsibleSection>

        {/* Checklist */}
        <CollapsibleSection
          title={t('properties.checklist')}
          isCollapsed={!!collapsedSections['checklist']}
          onToggle={() => toggleSection('checklist')}
          headerAction={
            <>
              {!isViewMode && (
                <SimpleTooltip content={t('props.addCheckItem')}>
                    <Button 
                      variant="iconGhost"
                      size="iconSm"
                      onClick={() => {
                        const currentChecklist = activeNode?.data?.checklist || [];
                        if (currentChecklist.length >= limits.maxChecklistItemsPerNode) {
                          console.warn(`[TierGate] Checklist limit reached: ${limits.maxChecklistItemsPerNode}`);
                          return;
                        }
                        const newChecklist = [...currentChecklist, { id: crypto.randomUUID(), label: t('props.newCheckItem'), required: false }];
                        updateNode(activeNode.id, { checklist: newChecklist });
                      }}
                      className="border border-border"
                    >
                      <Plus size={12} />
                    </Button>
                </SimpleTooltip>
              )}
            </>
          }
        >

            {activeNode?.data?.checklist?.map((c: { id?: string; label: string; required?: boolean }, idx: number) => (
              <div key={c.id || idx} className="flex items-center gap-1.5 bg-secondary px-2 py-1.5 rounded-lg border border-border group relative">
                <SimpleTooltip content={t('props.checkItemRequiredHint')}>
                  <input 
                    type="checkbox" 
                    className="accent-brand-gold shrink-0 cursor-help" 
                    checked={c.required} 
                    onChange={(e) => {
                      if (isViewMode) return;
                      const newChecklist = [...activeNode.data.checklist];
                      newChecklist[idx] = { ...newChecklist[idx], required: e.target.checked };
                      updateNode(activeNode.id, { checklist: newChecklist });
                    }}
                    disabled={isViewMode}
                  />
                </SimpleTooltip>
                <input 
                  className="flex-1 min-w-0 bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground focus:border-brand-gold outline-none"
                  value={c.label}
                  onChange={(e) => {
                    if (isViewMode) return;
                    const newChecklist = [...activeNode.data.checklist];
                    newChecklist[idx] = { ...newChecklist[idx], label: e.target.value };
                    updateNode(activeNode.id, { checklist: newChecklist });
                  }}
                  placeholder={t('props.checkItemPlaceholder')}
                  readOnly={isViewMode}
                />
                {!isViewMode && (
                  <Button 
                    variant="iconDestructive"
                    size="iconSm"
                    onClick={() => {
                      const newChecklist = [...activeNode.data.checklist];
                      newChecklist.splice(idx, 1);
                      updateNode(activeNode.id, { checklist: newChecklist });
                    }}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={12} />
                  </Button>
                )}
              </div>
            ))}
            {(!activeNode?.data?.checklist || activeNode.data.checklist.length === 0) && (
              <div className="text-xs text-muted-foreground p-2 text-center bg-secondary/50 rounded-xl border border-border/50">
                {t('props.noChecklist')}
              </div>
            )}
          
        </CollapsibleSection>
        </>
        )}

        {/* SubworkflowPicker: subworkflow nodes always; stop nodes with handoff toggle */}
        {activeNode?.type === 'subworkflow' && (
          <SubworkflowPicker activeNode={activeNode} updateNode={updateNode} isViewMode={isViewMode} />
        )}
        {activeNode?.type === 'startstop' && activeNode?.data?.type === 'stop' && 
          (activeNode?.data?.targetWorkflowId || collapsedSections['stopHandoff']) && (
          <SubworkflowPicker activeNode={activeNode} updateNode={updateNode} isViewMode={isViewMode} />
        )}
        {/* Node Comments */}
        {activeNode && (
            <NodeComments key={activeNode.id} nodeId={activeNode.id} />
        )}
      </div>
    </aside>
    </>
  );
};
