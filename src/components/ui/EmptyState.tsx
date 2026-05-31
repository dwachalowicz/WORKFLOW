import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  iconClassName?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
  iconClassName,
}) => {
  return (
    <Card className={cn("p-12 flex flex-col items-center justify-center text-center text-muted-foreground border-dashed", className)}>
      <Icon size={48} className={cn("mb-4 opacity-20", iconClassName)} />
      {title && <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>}
      {description && <div className="text-sm">{description}</div>}
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
};
