import React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface DashboardHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  iconClassName,
  actions,
  className,
}) => {
  return (
    <header className={cn("flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4", className)}>
      <div>
        <h1 className="text-xl sm:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          {Icon && <Icon className={cn("text-brand-gold", iconClassName)} />}
          {title}
        </h1>
        {subtitle && <div className="text-muted-foreground">{subtitle}</div>}
      </div>
      {actions && (
        <div className="flex items-center gap-3 flex-wrap">
          {actions}
        </div>
      )}
    </header>
  );
};
