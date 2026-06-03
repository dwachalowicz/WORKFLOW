import { useTranslation } from 'react-i18next';
import type { Edge } from '@xyflow/react';
import { Trash2, ArrowRightLeft, Eye, Save, ArrowUpDown, X, Plus, ChevronRight, ChevronDown, UserPlus, Database } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, SimpleTooltip } from '@/components/ui/tooltip';
import { GroupPickerDropdown } from '@/components/ui/GroupPickerDropdown';
import type { GroupRef } from '@/lib/groupService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GroupListSection } from '@/components/panels/properties/GroupListSection';

import { useCanvasStore } from '@/store/canvasStore';

interface EdgePropertiesPanelProps {
  activeEdge: Edge;
  isViewMode: boolean;
  isHighlighted: boolean;
  collapsedSections: Record<string, boolean>;
  toggleSection: (key: string) => void;
  onCollapse: () => void;
  onDeselect: () => void;
  onDelete: () => void;
  setEdges: (updater: (edges: Edge[]) => Edge[]) => void;
}

export const EdgePropertiesPanel = ({
  activeEdge,
  isViewMode,
  isHighlighted,
  collapsedSections,
  toggleSection,
  onCollapse,
  onDeselect,
  onDelete,
  setEdges,
}: EdgePropertiesPanelProps) => {
  const { t } = useTranslation();
  const nodes = useCanvasStore(state => state.nodes);
  const edges = useCanvasStore(state => state.edges);

  const decisionMakers = activeEdge.data?.decisionMakers || [];
  const sourceNode = nodes.find(n => n.id === activeEdge.source);
  const sourceVariables = sourceNode?.data?.variables || [];

  const conditionType = activeEdge.data?.conditionType || 'text';

  const rawRules = activeEdge.data?.rules;
  let rules = Array.isArray(rawRules) ? rawRules : [];

  if (rules.length === 0 && activeEdge.data?.ruleVariable) {
    rules = [{
      id: 'legacy-1',
      variable: activeEdge.data.ruleVariable,
      operator: activeEdge.data.ruleOperator || '==',
      value: activeEdge.data.ruleValue || ''
    }];
  }
  const ruleCombinator = activeEdge.data?.ruleCombinator || 'AND';

  const otherEdgesFromSameSource = edges.filter(e => e.source === activeEdge.source && e.id !== activeEdge.id);
  const hasElseEdgeAlready = otherEdgesFromSameSource.some(e => e.data?.conditionType === 'else');

  const updateEdgeCondition = (updates: Record<string, unknown>) => {
    if (isViewMode) return;
    setEdges(eds => eds.map(ed => {
      if (ed.id === activeEdge.id) {
        const newData = { ...ed.data, ...updates };
        let newLabel = ed.label;
        const currentConditionType = newData.conditionType || 'text';

        if (currentConditionType === 'rule') {
          const currentRules = newData.rules || [];
          if (currentRules.length > 0) {
            const parts = currentRules.map((r: { variable?: string; operator?: string; value?: string }) => r.variable ? (r.operator === 'notEmpty' ? `${r.variable} ≠ ∅` : `${r.variable} ${r.operator} ${r.value}`) : t('props.incomplete'));
            const joiner = newData.ruleCombinator === 'OR' ? t('props.orJoiner') : t('props.andJoiner');
            newLabel = parts.join(joiner);
          } else {
            newLabel = t('props.noConditionsLabel');
          }
        } else if (currentConditionType === 'else') {
          newLabel = t('props.elseAutoLabel');
        } else if (currentConditionType === 'text') {
          newLabel = newData.customText !== undefined ? newData.customText : (ed.label || '');
        }

        return { ...ed, label: newLabel, data: { ...newData, label: newLabel } };
      }
      return ed;
    }));
  };

  const handleAddDecisionMaker = (group: GroupRef) => {
    setEdges(eds => eds.map(edge => {
      if (edge.id === activeEdge.id) {
        return { ...edge, data: { ...edge.data, decisionMakers: [...(edge.data?.decisionMakers || []), group] } };
      }
      return edge;
    }));
  };

  const handleRemoveDecisionMaker = (indexToRemove: number) => {
    setEdges(eds => eds.map(edge => {
      if (edge.id === activeEdge.id) {
        const arr = [...(edge.data?.decisionMakers || [])];
        arr.splice(indexToRemove, 1);
        return { ...edge, data: { ...edge.data, decisionMakers: arr } };
      }
      return edge;
    }));
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[99] lg:hidden"
        onClick={onCollapse}
      />
    <aside className={`w-80 border-l border-border bg-card flex flex-col shrink-0 transition-all duration-300 tour-properties-panel fixed right-0 top-0 h-[calc(100%-3.5rem)] lg:h-full z-[100] lg:relative lg:z-auto shadow-2xl lg:shadow-none ${isHighlighted ? 'ring-2 ring-inset ring-brand-gold shadow-[0_0_15px_rgba(188,155,89,0.3)] z-[100]' : ''}`}>
      <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-foreground">
          <ArrowRightLeft size={16} className="text-muted-foreground" />
          <h2 className="font-semibold text-sm">{t('props.edgeProperties')}</h2>
        </div>
        <div className="flex items-center gap-1">
          <SimpleTooltip content={t('props.collapsePanel')}>
            <Button variant="iconGhost" size="iconSm" onClick={onCollapse}>
              <ChevronRight size={14} />
            </Button>
          </SimpleTooltip>
          {!isViewMode && (
            <SimpleTooltip content={t('props.deleteEdge')}>
              <Button variant="iconDestructive" size="iconSm" onClick={onDelete}>
                <Trash2 size={14} />
              </Button>
            </SimpleTooltip>
          )}
          <SimpleTooltip content={t('common.close')}>
            <Button variant="iconGhost" size="iconSm" onClick={onDeselect}>
              <X size={14} />
            </Button>
          </SimpleTooltip>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        {/* DB Operation selector — only for database edges */}
        {activeEdge.data?.dbOperation !== undefined && (
          <section className="bg-secondary/20 rounded-xl border border-border/40 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Database size={14} className="text-cyan-500" />
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('props.dbOperation')}</h3>
            </div>
            <div className="flex bg-muted/80 dark:bg-secondary p-1 rounded-lg border border-border">
              {[
                { id: 'read', icon: Eye, label: t('props.dbRead'), color: 'text-emerald-400' },
                { id: 'write', icon: Save, label: t('props.dbWrite'), color: 'text-amber-400' },
                { id: 'readwrite', icon: ArrowUpDown, label: t('props.dbReadWrite'), color: 'text-cyan-400' },
              ].map(op => {
                const isActive = (activeEdge.data?.dbOperation || 'read') === op.id;
                const Icon = op.icon;
                return (
                  <Button
                    key={op.id}
                    variant="ghost"
                    size="sm"
                    className={`flex-1 h-8 text-[11px] px-1 gap-1 font-medium whitespace-nowrap ${isActive ? 'bg-card shadow-sm hover:bg-card border border-border/50 ' + op.color : 'text-foreground/60 hover:text-foreground/80'}`}
                    onClick={() => {
                      if (isViewMode) return;
                      setEdges(eds => eds.map(ed => 
                        ed.id === activeEdge.id 
                          ? { ...ed, data: { ...ed.data, dbOperation: op.id } } 
                          : ed
                      ));
                    }}
                  >
                    <Icon size={12} />
                    {op.label}
                  </Button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground">{t('props.dbOperationHint')}</p>
          </section>
        )}

        {/* Regular condition section — hidden for DB edges */}
        {activeEdge.data?.dbOperation === undefined && (
        <section className="bg-secondary/20 rounded-xl border border-border/40 p-3 space-y-4">
          <Button 
            variant="ghost" 
            onClick={() => toggleSection('condition')} 
            className="flex items-center justify-between w-full p-0 h-auto hover:bg-transparent"
          >
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('props.condition')}</h3>
            <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${collapsedSections['condition'] ? '-rotate-90' : ''}`} />
          </Button>
          
          {!collapsedSections['condition'] && (
            <>
          <div className="flex bg-muted/80 dark:bg-secondary p-1 rounded-lg border border-border">
            <Button
              variant="ghost"
              size="sm"
              className={`flex-1 h-7 text-xs font-medium ${conditionType === 'text' ? 'bg-card shadow-sm text-foreground hover:bg-card border border-border/50' : 'text-foreground/60 hover:text-foreground/80'}`}
              onClick={() => updateEdgeCondition({ conditionType: 'text' })}
            >
              {t('props.customText')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`flex-1 h-7 text-xs font-medium ${conditionType === 'rule' ? 'bg-card shadow-sm text-foreground hover:bg-card border border-border/50' : 'text-foreground/60 hover:text-foreground/80'}`}
              onClick={() => updateEdgeCondition({ conditionType: 'rule' })}
            >
              {t('props.rule')}
            </Button>
            <SimpleTooltip content={hasElseEdgeAlready && conditionType !== 'else' ? t('props.elseOnlyOne') : ""}>
              <div className="flex-1 flex">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`flex-1 h-7 text-xs font-medium ${conditionType === 'else' ? 'bg-card shadow-sm text-foreground hover:bg-card border border-border/50' : 'text-foreground/60 hover:text-foreground/80'} ${hasElseEdgeAlready && conditionType !== 'else' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => {
                    if (hasElseEdgeAlready && conditionType !== 'else') return;
                    updateEdgeCondition({ conditionType: 'else' });
                  }}
                >
                  {t('props.elseLabel')}
                </Button>
              </div>
            </SimpleTooltip>
          </div>

          {conditionType === 'text' && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">{t('props.textLabel')}</label>
              <Input 
                value={(activeEdge.data?.customText !== undefined ? activeEdge.data.customText : (activeEdge.label as string)) || ''} 
                key={activeEdge.id + '-label-text'}
                placeholder={t('props.textPlaceholder')}
                onChange={(e) => updateEdgeCondition({ customText: e.target.value })}
                readOnly={isViewMode}
              />
            </div>
          )}

          {conditionType === 'else' && (
            <div className="space-y-3 p-3 bg-secondary/50 rounded-xl border border-border">
              <p className="text-xs text-muted-foreground text-center">{t('props.elseDesc')}</p>
              <p className="text-[10px] text-muted-foreground text-center font-medium mt-2">{t('props.elseHint')}</p>
            </div>
          )}

          {conditionType === 'rule' && (
            <div className="space-y-4 p-3 bg-secondary/50 rounded-xl border border-border">
              {sourceVariables.length > 0 ? (
                <>
                  {rules.length > 1 && (
                    <div className="flex bg-background p-1 rounded-lg border border-border mb-2 gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm"
                            className={`flex-1 min-h-[24px] h-auto py-1 px-1 whitespace-normal leading-tight text-center text-[10px] ${ruleCombinator === 'AND' ? 'bg-secondary shadow-sm text-foreground hover:bg-secondary' : 'text-muted-foreground'}`}
                            onClick={() => updateEdgeCondition({ ruleCombinator: 'AND' })}
                          >{t('props.allMatch')}</Button>
                        </TooltipTrigger>
                        <TooltipContent><p className="max-w-xs text-center text-xs">{t('props.allMatchDesc')}</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm"
                            className={`flex-1 min-h-[24px] h-auto py-1 px-1 whitespace-normal leading-tight text-center text-[10px] ${ruleCombinator === 'OR' ? 'bg-secondary shadow-sm text-foreground hover:bg-secondary' : 'text-muted-foreground'}`}
                            onClick={() => updateEdgeCondition({ ruleCombinator: 'OR' })}
                          >{t('props.anyMatch')}</Button>
                        </TooltipTrigger>
                        <TooltipContent><p className="max-w-xs text-center text-xs">{t('props.anyMatchDesc')}</p></TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    {rules.map((rule: { id: string; variable?: string; operator?: string; value?: string }, idx: number) => (
                      <div key={rule.id} className="relative p-3 bg-background border border-border rounded-lg space-y-2 group">
                         {!isViewMode && (
                           <Button variant="iconDestructive" size="iconSm"
                             onClick={() => { updateEdgeCondition({ rules: rules.filter((r: { id: string }) => r.id !== rule.id) }); }}
                             className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                           ><Trash2 size={12} /></Button>
                         )}
                         <div className="pr-8">
                          <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block mb-1">{t('props.variable')}</label>
                          <select 
                            className="w-full bg-secondary border border-border rounded-md px-2 py-1 text-xs text-foreground focus:border-brand-gold outline-none"
                            value={rule.variable}
                            onChange={(e) => { const nr = [...rules]; nr[idx] = { ...nr[idx], variable: e.target.value }; updateEdgeCondition({ rules: nr }); }}
                            disabled={isViewMode}
                          >
                            <option value="" disabled>{t('props.selectVar')}</option>
                            {sourceVariables.map((v: { name: string; type?: string }, i: number) => (
                              <option key={i} value={v.name}>{v.name} ({v.type})</option>
                            ))}
                          </select>
                         </div>
                         <div className="flex gap-2">
                           <div className="flex-[3]">
                            <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block mb-1">{t('props.operator')}</label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="w-full">
                                  <select 
                                    className="w-full bg-secondary border border-border rounded-md px-2 py-1 text-xs text-foreground focus:border-brand-gold outline-none cursor-help"
                                    value={rule.operator}
                                    onChange={(e) => { const nr = [...rules]; nr[idx] = { ...nr[idx], operator: e.target.value }; updateEdgeCondition({ rules: nr }); }}
                                    disabled={isViewMode}
                                  >
                                    <option value="==">==</option>
                                    <option value="!=">!=</option>
                                    <option value=">">&gt;</option>
                                    <option value="<">&lt;</option>
                                    <option value=">=">&gt;=</option>
                                    <option value="<=">&lt;=</option>
                                    <option value="zawiera">{t('props.containsLabel')}</option>
                                    <option value="notEmpty">{t('props.notEmptyLabel')}</option>
                                  </select>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <div className="space-y-1 text-[11px] max-w-[200px]">
                                  <p><strong className="text-brand-gold">==</strong> : {t('props.opEquals')}</p>
                                  <p><strong className="text-brand-gold">!=</strong> : {t('props.opNotEquals')}</p>
                                  <p><strong className="text-brand-gold">&gt;</strong> : {t('props.opGreater')}</p>
                                  <p><strong className="text-brand-gold">&lt;</strong> : {t('props.opLess')}</p>
                                  <p><strong className="text-brand-gold">&gt;=</strong> : {t('props.opGreaterEq')}</p>
                                  <p><strong className="text-brand-gold">&lt;=</strong> : {t('props.opLessEq')}</p>
                                  <p><strong className="text-brand-gold">{t('props.containsLabel')}</strong> : {t('props.opContains')}</p>
                                  <p><strong className="text-brand-gold">{t('props.notEmptyLabel')}</strong> : {t('props.opNotEmpty')}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                           </div>
                           {rule.operator !== 'notEmpty' && (
                           <div className="flex-[4]">
                            <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block mb-1">{t('props.value')}</label>
                            <input 
                              className="w-full bg-secondary border border-border rounded-md px-2 py-1 text-xs text-foreground focus:border-brand-gold outline-none" 
                              value={rule.value} 
                              placeholder={t('props.valuePlaceholder')}
                              onChange={(e) => { const nr = [...rules]; nr[idx] = { ...nr[idx], value: e.target.value }; updateEdgeCondition({ rules: nr }); }}
                              readOnly={isViewMode}
                            />
                           </div>
                           )}
                         </div>
                      </div>
                    ))}
                    {rules.length === 0 && (
                      <div className="text-[11px] text-muted-foreground text-center py-2 bg-background border border-dashed border-border rounded-lg">
                        {t('props.noConditions')}
                      </div>
                    )}
                  </div>
                  {!isViewMode && (
                    <Button variant="outline" onClick={() => updateEdgeCondition({ rules: [...rules, { id: crypto.randomUUID(), variable: '', operator: '==', value: '' }] })} className="w-full border-dashed mt-2">
                      <Plus size={14} className="mr-1" /> {t('props.addCondition')}
                    </Button>
                  )}
                </>
              ) : (
                <div className="text-xs text-center text-muted-foreground p-2">{t('props.noSourceVars')}</div>
              )}
            </div>
          )}
            </>
          )}
        </section>
        )}

        {/* Responsibility section — also hidden for DB edges */}
        {activeEdge.data?.dbOperation === undefined && (
        <section className="bg-secondary/20 rounded-xl border border-border/40 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => toggleSection('responsibility')} className="flex-1 flex items-center justify-start p-0 h-auto hover:bg-transparent">
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('props.responsibility')}</h3>
            </Button>
            <div className="flex items-center gap-2">
              {!isViewMode && (
                <GroupPickerDropdown
                  onSelect={handleAddDecisionMaker}
                  excludeIds={(activeEdge?.data?.decisionMakers || []).map((dm: GroupRef) => dm.id).filter(Boolean)}
                  trigger={
                    <SimpleTooltip content={t('props.assignDecider')}>
                      <Button variant="iconGhost" size="iconSm" className="border border-border">
                        <UserPlus size={12} />
                      </Button>
                    </SimpleTooltip>
                  }
                />
              )}
              <Button variant="ghost" size="iconSm" onClick={() => toggleSection('responsibility')}>
                <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${collapsedSections['responsibility'] ? '-rotate-90' : ''}`} />
              </Button>
            </div>
          </div>
          {!collapsedSections['responsibility'] && (
            <>
              <GroupListSection
                groups={decisionMakers}
                onAdd={handleAddDecisionMaker}
                onRemove={handleRemoveDecisionMaker}
                addTooltip={t('props.assignDecider')}
                removeTooltip={t('props.removeDecider')}
                emptyText={t('props.noDeciders')}
                isViewMode={isViewMode}
              />
              <p className="text-[10px] text-muted-foreground">{t('props.deciderHint')}</p>
            </>
          )}
        </section>
        )}
      </div>
    </aside>
    </>
  );
};
