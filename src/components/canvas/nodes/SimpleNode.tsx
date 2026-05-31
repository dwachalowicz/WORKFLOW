import { useTranslation } from 'react-i18next';
import { memo, useEffect, useState } from 'react';
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { Clock, CalendarDays, CheckSquare, Database, ChevronDown, MessageCircle, Ban, Mail, Webhook, CheckCircle2, Network, MoreHorizontal } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { getRotatedHandlePosition, getHandleClass, getDbHandleClass, getSharedNodeClasses } from './nodeUtils';
import { useHandleActive, useNodeVisualState, useNodeRotation } from './useNodeHooks';
import { NodeToolbar } from './NodeToolbar';
import { WorkflowLinkBadge } from './IncomingLinkBadge';
import { GroupAvatar } from '@/components/ui/GroupAvatar';
import { SimpleTooltip, InlineTooltip } from '@/components/ui/tooltip';
import { useCanvasStore } from "@/store/canvasStore";

interface NodeGroup {
  name: string;
  avatar?: string;
  color?: string;
}

interface NodeData {
  label?: string;
  icon?: string;
  checklist?: unknown[];
  variables?: unknown[];
  editors?: NodeGroup[];
  readers?: NodeGroup[];
  rotation?: number;
  description?: string;
  maxDuration?: number;
  maxDurationUnit?: string;
  cost?: number | string;
  type?: string;
  enterActionTypes?: string[];
  exitActionTypes?: string[];
  enterCustomAction?: string;
  exitCustomAction?: string;
}

const ACTION_ICONS: Record<string, typeof Mail> = {
  none: Ban,
  email: Mail,
  webhook: Webhook,
  status: CheckCircle2,
  subworkflow: Network,
  custom: MoreHorizontal
};

const ACTION_COLORS: Record<string, string> = {
  none: 'text-muted-foreground',
  email: 'text-blue-400',
  webhook: 'text-purple-400',
  status: 'text-emerald-400',
  subworkflow: 'text-purple-400',
  custom: 'text-brand-gold'
};

export const SimpleNode = memo(({
  data, selected, id }: { data: NodeData; selected: boolean; id: string }) => {
  const { t } = useTranslation();
  const hasChecklist = data.checklist && data.checklist.length > 0;
  const hasVariables = data.variables && data.variables.length > 0;
  const hasCost = data.cost !== undefined && data.cost !== null && data.cost !== '' && data.cost !== 0 && data.cost !== '0';
  const commentCount = useCanvasStore(state => state.commentCounts[id] || 0);
  const [isExpanded, setIsExpanded] = useState(false);

  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateNodeInternals(id);
    const timeout = setTimeout(() => updateNodeInternals(id), 50);
    return () => clearTimeout(timeout);
  }, [isExpanded, id, updateNodeInternals]);

  useEffect(() => {
    const handleCollapse = () => setIsExpanded(false);
    window.addEventListener('collapseAllNodes', handleCollapse as EventListener);
    return () => window.removeEventListener('collapseAllNodes', handleCollapse as EventListener);
  }, []);

  const { isHandleActive } = useHandleActive(id, selected);
  const { isSearchActive, isMatch, isSimulating, isActiveInSimulation, isViewMode, allGroups } = useNodeVisualState(id, data as Record<string, unknown>);

  const rotation = data.rotation || 0;
  useNodeRotation(id, rotation);

  const editors = data.editors || [];
  const readers = data.readers || [];
  // Filter unique users by name to show in cascade
  const uniqueUsers = allGroups.filter((user, index, self) =>
    index === self.findIndex((t) => t.name === user.name)
  ) as NodeGroup[];

  return (
    <div
      className={getSharedNodeClasses(selected, isSearchActive, isMatch, isSimulating, isActiveInSimulation)}
    >
      {selected && !isViewMode && (
        <NodeToolbar id={id} rotation={rotation} />
      )}
      <WorkflowLinkBadge nodeId={id} />
      
      <Handle
        type="target"
        position={getRotatedHandlePosition(Position.Left, rotation)}
        id="left"
        isConnectableStart={false}
        className={getHandleClass(getRotatedHandlePosition(Position.Left, rotation), isHandleActive('left', 'target'), false, true)}
      />

      {/* Main content – always visible */}
      <div 
        className="px-5 py-3.5 flex items-center justify-between gap-3 group"
      >
        <div 
          className="flex items-center gap-1.5 min-w-0 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <ChevronDown 
            size={14} 
            className={cn("text-muted-foreground transition-transform duration-200 shrink-0 group-hover:text-foreground", isExpanded && "rotate-180")} 
          />
          {(() => {
            const IconCmp = data.icon ? (LucideIcons as Record<string, React.ElementType>)[data.icon] : null;
            return IconCmp ? <IconCmp size={14} className="text-brand-gold shrink-0" /> : null;
          })()}
          <SimpleTooltip content={data.label} side="top">
            <span className="text-sm font-semibold tracking-tight text-foreground leading-tight truncate max-w-[100px] select-none">
              {data.label}
            </span>
          </SimpleTooltip>
        </div>

        {/* Small dot indicators & Avatars (visible without hover) */}
        <div className="flex items-center gap-2 shrink-0">
          
          {uniqueUsers.length > 0 && (
            <div className="group/avatars relative hover:z-50 cursor-help flex items-center">
              <div className={cn("flex", uniqueUsers.length > 1 ? "-space-x-1.5" : "")}>
                {uniqueUsers.slice(0, 3).map((user: NodeGroup, idx: number) => (
                  <GroupAvatar key={idx} group={user} size="xs" className="ring-2 ring-card relative z-10" />
                ))}
                {uniqueUsers.length > 3 && (
                  <div className="w-5 h-5 rounded-full bg-secondary ring-2 ring-card flex items-center justify-center z-20">
                    <span className="text-[8px] text-muted-foreground font-medium">+{uniqueUsers.length - 3}</span>
                  </div>
                )}
              </div>
              
              {/* Tooltip on hover */}
              <InlineTooltip 
                groupName="avatars" 
                className="flex flex-col items-start gap-1 p-2 z-[9999] whitespace-normal min-w-[150px] max-w-[300px]"
              >
                {editors.length > 0 && (
                  <div className="flex flex-col gap-0.5 mb-1.5 last:mb-0">
                    <span className="text-brand-gold font-semibold">{t('ui.editors')}</span> 
                    <span className="leading-snug text-muted-foreground">{[...new Set(editors.map((e: NodeGroup) => e.name))].join(', ')}</span>
                  </div>
                )}
                {readers.length > 0 && (
                  <div className="flex flex-col gap-0.5 mb-1.5 last:mb-0">
                    <span className="text-brand-gold font-semibold">{t('ui.readers')}</span> 
                    <span className="leading-snug text-muted-foreground">{[...new Set(readers.map((e: NodeGroup) => e.name))].join(', ')}</span>
                  </div>
                )}
              </InlineTooltip>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-0.5 max-w-[54px]">
          {hasChecklist && (
            <div className="group/checklist relative flex items-center justify-center p-1 cursor-help">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <InlineTooltip groupName="checklist">
                {t('canvas.hasChecklist')}
              </InlineTooltip>
            </div>
          )}
          {hasVariables && (
            <div className="group/variables relative flex items-center justify-center p-1 cursor-help">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <InlineTooltip groupName="variables">
                {t('canvas.collectsVariables')}
              </InlineTooltip>
            </div>
          )}
          {data.maxDuration && (
            <div className="group/sla relative flex items-center justify-center p-1 cursor-help">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <InlineTooltip groupName="sla">
                SLA: {data.maxDuration}
              </InlineTooltip>
            </div>
          )}
          {hasCost && (
            <div className="group/cost relative flex items-center justify-center p-1 cursor-help">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
              <InlineTooltip groupName="cost">
                {t('canvas.hasCost')}
              </InlineTooltip>
            </div>
          )}
          {editors.length > 0 && (
            <div className="group/editors relative flex items-center justify-center p-1 cursor-help">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
              <InlineTooltip groupName="editors">
                {t('canvas.hasEditors')}
              </InlineTooltip>
            </div>
          )}
          {commentCount > 0 && (
            <div className="group/comments relative flex items-center justify-center p-1 cursor-help">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              <InlineTooltip groupName="comments">
                {commentCount} {commentCount === 1 ? t('canvas.commentOne') : commentCount < 5 ? t('canvas.commentFew') : t('canvas.commentMany')}
              </InlineTooltip>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Source handle on right */}
      <Handle
        type="source"
        position={getRotatedHandlePosition(Position.Right, rotation)}
        id="right"
        isConnectable={true}
        className={getHandleClass(getRotatedHandlePosition(Position.Right, rotation), isHandleActive('right', 'source'))}
      />

      {/* Database connection handle on bottom — square, cyan */}
      <Handle
        type="source"
        position={getRotatedHandlePosition(Position.Bottom, rotation)}
        id="db"
        isConnectable={true}
        className={getDbHandleClass(getRotatedHandlePosition(Position.Bottom, rotation), isHandleActive('db', 'source'))}
      />

      {/* Expanded details – on click */}
      <div className={cn(
        "overflow-hidden transition-all duration-200 ease-out",
        isExpanded ? "max-h-[300px] opacity-100 border-t border-border" : "max-h-0 opacity-0 border-t-0 border-transparent"
      )}>
        <div className="px-5 py-3 space-y-3">
          {/* Description */}
          {data.description && (
            <p className="text-xs text-muted-foreground leading-relaxed">{data.description}</p>
          )}

          {/* Metadata pills */}
          <div className="flex flex-wrap gap-1.5">
            {data.maxDuration && (
              <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                {data.maxDurationUnit === 'd' ? <CalendarDays size={10} /> : <Clock size={10} />} {data.maxDuration}
              </span>
            )}
            {hasChecklist && (
              <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                <CheckSquare size={10} /> {data.checklist!.length} {data.checklist!.length > 1 ? t('canvas.checklistItems') : t('canvas.checklistItem')}
              </span>
            )}
            {hasVariables && (
              <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                <Database size={10} /> {t('canvas.variableCount', { count: data.variables!.length })}
              </span>
            )}
            {commentCount > 0 && (
              <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                <MessageCircle size={10} /> {commentCount}
              </span>
            )}
          </div>

          {/* Assignees - Editors */}
          {data.editors && data.editors.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] text-muted-foreground w-14">{t('ui.editors')}</span>
              <div className="flex -space-x-1.5">
                {data.editors.slice(0, 4).map((group: NodeGroup, idx: number) => (
                  <div key={idx} className="group/editor relative hover:z-10">
                    <GroupAvatar group={group} size="xs" />
                    <InlineTooltip groupName="editor">
                      {group.name}
                    </InlineTooltip>
                  </div>
                ))}
                {data.editors.length > 4 && (
                  <div className="w-5 h-5 rounded-full bg-secondary ring-1 ring-card flex items-center justify-center">
                    <span className="text-[8px] text-muted-foreground font-medium">+{data.editors.length - 4}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assignees - Readers */}
          {data.readers && data.readers.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] text-muted-foreground w-14">{t('ui.readers')}</span>
              <div className="flex -space-x-1.5">
                {data.readers.slice(0, 4).map((group: NodeGroup, idx: number) => (
                  <div key={idx} className="group/reader relative hover:z-10">
                    <GroupAvatar group={group} size="xs" />
                    <InlineTooltip groupName="reader">
                      {group.name}
                    </InlineTooltip>
                  </div>
                ))}
                {data.readers.length > 4 && (
                  <div className="w-5 h-5 rounded-full bg-secondary ring-1 ring-card flex items-center justify-center">
                    <span className="text-[8px] text-muted-foreground font-medium">+{data.readers.length - 4}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {data.enterActionTypes && data.enterActionTypes.length > 0 && !data.enterActionTypes.includes('none') && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] text-muted-foreground w-14">{t('props.startAction')}</span>
              <div className="flex items-center gap-1.5">
                {data.enterActionTypes.map((actionId: string, i: number) => {
                  const isCustom = !ACTION_ICONS[actionId];
                  const Icon = isCustom ? MoreHorizontal : ACTION_ICONS[actionId];
                  const colorClass = isCustom ? ACTION_COLORS['custom'] : (ACTION_COLORS[actionId] || 'text-muted-foreground');
                  return (
                    <SimpleTooltip key={i} content={isCustom ? data.enterCustomAction || actionId : t(`props.action${actionId.charAt(0).toUpperCase() + actionId.slice(1)}`)}>
                      <div className={`flex items-center justify-center w-5 h-5 rounded-md bg-secondary border border-border ${colorClass}`}>
                        <Icon size={10} />
                      </div>
                    </SimpleTooltip>
                  );
                })}
              </div>
            </div>
          )}

          {data.exitActionTypes && data.exitActionTypes.length > 0 && !data.exitActionTypes.includes('none') && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] text-muted-foreground w-14">{t('props.endAction')}</span>
              <div className="flex items-center gap-1.5">
                {data.exitActionTypes.map((actionId: string, i: number) => {
                  const isCustom = !ACTION_ICONS[actionId];
                  const Icon = isCustom ? MoreHorizontal : ACTION_ICONS[actionId];
                  const colorClass = isCustom ? ACTION_COLORS['custom'] : (ACTION_COLORS[actionId] || 'text-muted-foreground');
                  return (
                    <SimpleTooltip key={i} content={isCustom ? data.exitCustomAction || actionId : t(`props.action${actionId.charAt(0).toUpperCase() + actionId.slice(1)}`)}>
                      <div className={`flex items-center justify-center w-5 h-5 rounded-md bg-secondary border border-border ${colorClass}`}>
                        <Icon size={10} />
                      </div>
                    </SimpleTooltip>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

SimpleNode.displayName = 'SimpleNode';
