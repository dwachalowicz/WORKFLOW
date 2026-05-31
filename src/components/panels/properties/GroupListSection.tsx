import { Trash2, UserPlus } from 'lucide-react';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { GroupPickerDropdown } from '@/components/ui/GroupPickerDropdown';
import { GroupAvatar } from '@/components/ui/GroupAvatar';
import { Button } from '@/components/ui/button';
import type { GroupRef } from '@/lib/groupService';

/**
 * Reusable group list section for editors, readers, and decision makers.
 * Replaces 3 identical list + picker + remove patterns in PropertiesPanel.
 */
interface GroupListSectionProps {
  groups: GroupRef[];
  onAdd: (group: GroupRef) => void;
  onRemove: (index: number) => void;
  addTooltip: string;
  removeTooltip: string;
  emptyText: string;
  isViewMode: boolean;
}

export const GroupListSection = ({
  groups,
  onRemove,
  removeTooltip,
  emptyText,
  isViewMode,
}: GroupListSectionProps) => {
  return (
    <>
      <div className="space-y-2 max-h-[160px] overflow-y-auto">
        {groups.length > 0 ? (
          groups.map((g: GroupRef, idx: number) => (
            <div key={idx} className="flex items-center justify-between bg-secondary p-2 pl-3 rounded-xl border border-border group">
              <div className="flex items-center gap-3">
                <GroupAvatar group={g} size="sm" />
                <span className="text-sm font-medium text-foreground">{g.name}</span>
              </div>
              {!isViewMode && (
                <SimpleTooltip content={removeTooltip}>
                  <Button
                    variant="iconDestructive"
                    size="iconSm"
                    onClick={() => onRemove(idx)}
                    className="opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={12} />
                  </Button>
                </SimpleTooltip>
              )}
            </div>
          ))
        ) : (
          <div className="text-xs text-muted-foreground p-2 text-center bg-secondary/50 rounded-xl border border-border/50">
            {emptyText}
          </div>
        )}
      </div>
    </>
  );
};

/**
 * Picker button for adding groups (used in section headers).
 */
interface GroupAddButtonProps {
  onSelect: (group: GroupRef) => void;
  excludeIds: string[];
  tooltip: string;
}

export const GroupAddButton = ({ onSelect, excludeIds, tooltip }: GroupAddButtonProps) => (
  <GroupPickerDropdown
    onSelect={onSelect}
    excludeIds={excludeIds}
    trigger={
      <SimpleTooltip content={tooltip}>
        <Button variant="iconGhost" size="iconSm" className="border border-border">
          <UserPlus size={12} />
        </Button>
      </SimpleTooltip>
    }
  />
);
