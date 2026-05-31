import React from 'react';
import { cn } from '@/lib/utils';

interface DashboardPageLayoutProps {
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

export const DashboardPageLayout: React.FC<DashboardPageLayoutProps> = ({
  children,
  maxWidth = 'max-w-[1200px]',
  className,
}) => {
  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 overflow-y-auto">
        <div className={cn('w-full mx-auto p-4 md:p-8', maxWidth, className)}>
          {children}
        </div>
      </div>
    </div>
  );
};
