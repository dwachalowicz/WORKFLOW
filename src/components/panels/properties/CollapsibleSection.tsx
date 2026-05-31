import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  isCollapsed,
  onToggle,
  headerAction,
  children
}) => {
  return (
    <section className="bg-secondary/20 rounded-xl border border-border/40 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onToggle} className="flex items-center justify-between flex-1 p-0 h-auto hover:bg-transparent">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-left">{title}</h3>
        </Button>
        <div className="flex items-center gap-2">
          {headerAction}
          <Button variant="ghost" onClick={onToggle} className="p-0 h-auto hover:bg-transparent px-2">
            <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
          </Button>
        </div>
      </div>
      {!isCollapsed && (
        <div className="space-y-3 pt-2">
          {children}
        </div>
      )}
    </section>
  );
};
