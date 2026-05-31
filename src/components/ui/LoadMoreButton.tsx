import React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { GryfSpinner } from '@/components/ui/GryfSpinner';

interface LoadMoreButtonProps extends Omit<ButtonProps, 'children' | 'onClick'> {
  onClick: () => void;
  isLoading?: boolean;
  label: string;
}

export const LoadMoreButton = React.forwardRef<HTMLButtonElement, LoadMoreButtonProps>(({
  onClick,
  isLoading = false,
  label,
  className,
  variant = 'secondary',
  ...props
}, ref) => {
  return (
    <Button 
      ref={ref}
      variant={variant} 
      onClick={onClick}
      disabled={isLoading || props.disabled}
      className={`rounded-full px-8 py-6 text-sm font-semibold ${className || ''}`}
      {...props}
    >
      {isLoading ? <GryfSpinner size={20} className="mr-2" /> : null}
      {label}
    </Button>
  );
});

LoadMoreButton.displayName = 'LoadMoreButton';
