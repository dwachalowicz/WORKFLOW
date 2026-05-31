import React from 'react';
import { useTranslation } from 'react-i18next';
import { Ban, Mail, Webhook, CheckCircle2, MoreHorizontal, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { GroupListSection, GroupAddButton } from './GroupListSection';
import type { GroupRef } from '@/lib/groupService';

interface ActionSelectorProps {
  label: string;
  question: string;
  hint: string;
  actions: string[];
  onChange: (newActions: string[]) => void;
  targetWorkflowId?: string;
  onClearTargetWorkflow?: () => void;
  hideNone?: boolean;
  // Email group props
  emailGroups?: GroupRef[];
  onAddEmailGroup?: (group: GroupRef) => void;
  onRemoveEmailGroup?: (index: number) => void;
  isViewMode?: boolean;
  // Handoff toggle (Stop nodes only)
  showHandoff?: boolean;
  handoffActive?: boolean;
  onHandoffToggle?: () => void;
}

export const ActionSelector = ({ 
  label, 
  question, 
  hint, 
  actions, 
  onChange, 
  targetWorkflowId, 
  onClearTargetWorkflow,
  hideNone = false,
  // Email group props
  emailGroups = [],
  onAddEmailGroup,
  onRemoveEmailGroup,
  isViewMode = false,
  // Handoff toggle
  showHandoff = false,
  handoffActive = false,
  onHandoffToggle,
}: ActionSelectorProps) => {
  const { t } = useTranslation();

  const predefinedActions = ['none', 'email', 'webhook', 'status'];
  const allAvailableActions = [
    { id: 'none', icon: Ban, label: t('props.actionNone') },
    { id: 'email', icon: Mail, label: t('props.actionEmail') },
    { id: 'webhook', icon: Webhook, label: t('props.actionWebhook') },
    { id: 'status', icon: CheckCircle2, label: t('props.actionStatus') },
    { id: 'custom', icon: MoreHorizontal, label: t('props.actionCustom') }
  ];

  const availableActions = hideNone 
    ? allAvailableActions.filter(a => a.id !== 'none')
    : allAvailableActions;

  const hasCustom = actions.some((a: string) => !predefinedActions.includes(a));
  const customValue = actions.find((a: string) => !predefinedActions.includes(a)) || '';
  const hasEmail = actions.includes('email');

  const content = (
    <>
      <div className="space-y-4">
        <label className="text-xs text-muted-foreground font-medium block">{question}</label>
        <div className="flex gap-2 flex-wrap">
          {availableActions.map((action) => {
            const isActive = action.id === 'custom' 
              ? hasCustom
              : action.id === 'none'
                ? actions.includes('none') && !handoffActive
                : actions.includes(action.id);

            return (
              <React.Fragment key={action.id}>
                <SimpleTooltip content={action.label}>
                  <Button
                    variant={isActive ? "outline" : "iconGhost"}
                    size="icon"
                    disabled={isViewMode}
                    onClick={() => {
                      let newActions = [...actions];
                      if (action.id === 'custom') {
                        if (isActive) {
                          newActions = newActions.filter(a => predefinedActions.includes(a));
                        } else {
                          newActions = newActions.filter(a => a !== 'none');
                          newActions.push('custom');
                        }
                      } else if (action.id === 'none') {
                        newActions = ['none'];
                      } else {
                        if (isActive) {
                          newActions = newActions.filter(a => a !== action.id);
                        } else {
                          newActions = newActions.filter(a => a !== 'none');
                          newActions.push(action.id);
                        }
                      }
                      if (newActions.length === 0 && !hideNone) newActions = ['none'];
                      
                      if (!newActions.includes('subworkflow') && targetWorkflowId && onClearTargetWorkflow) {
                        onClearTargetWorkflow();
                      }
                      onChange(newActions);
                    }}
                    className={isActive ? "text-brand-gold border-brand-gold bg-brand-gold/10" : "bg-secondary border-border"}
                  >
                    <action.icon size={16} />
                  </Button>
                </SimpleTooltip>
                {/* Handoff icon — right after None */}
                {action.id === 'none' && showHandoff && onHandoffToggle && (
                  <SimpleTooltip content={handoffActive ? t('props.handoffDisable') : t('props.handoffEnable')}>
                    <Button
                      variant={handoffActive ? "outline" : "iconGhost"}
                      size="icon"
                      disabled={isViewMode}
                      onClick={onHandoffToggle}
                      className={handoffActive ? "text-purple-400 border-purple-400 bg-purple-500/10" : "bg-secondary border-border"}
                    >
                      <Network size={16} />
                    </Button>
                  </SimpleTooltip>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Email Group Picker — shown when email action is active */}
      {hasEmail && onAddEmailGroup && onRemoveEmailGroup && (
        <div className="space-y-2 mt-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <Mail size={11} className="text-blue-400" />
              {t('props.emailRecipients')}
            </label>
            {!isViewMode && (
              <GroupAddButton
                onSelect={onAddEmailGroup}
                excludeIds={emailGroups.map(g => g.id).filter(Boolean)}
                tooltip={t('props.addEmailGroup')}
              />
            )}
          </div>
          <GroupListSection
            groups={emailGroups}
            onAdd={onAddEmailGroup}
            onRemove={onRemoveEmailGroup}
            addTooltip={t('props.addEmailGroup')}
            removeTooltip={t('props.removeEmailGroup')}
            emptyText={t('props.noEmailGroups')}
            isViewMode={isViewMode}
          />
          <p className="text-[10px] text-muted-foreground">{t('props.emailGroupsHint')}</p>
        </div>
      )}

      {hasCustom && (
        <div className="space-y-1.5 mt-2">
          <label className="text-xs text-muted-foreground font-medium">{t('props.actionCustomLabel')}</label>
          <input 
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 outline-none transition-all"
            value={customValue === 'custom' ? '' : customValue}
            readOnly={isViewMode}
            onChange={(e) => {
              const val = e.target.value || 'custom';
              const newActions = actions.map(a => !predefinedActions.includes(a) ? val : a);
              onChange(newActions);
            }}
            placeholder={t('props.actionCustomPlaceholder')}
            autoFocus
          />
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </>
  );

  if (!label) return content;

  return (
    <section className="space-y-3">
      <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</h3>
      {content}
    </section>
  );
};
