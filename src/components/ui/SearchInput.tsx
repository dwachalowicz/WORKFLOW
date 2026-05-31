import React from 'react';
import { Search } from 'lucide-react';
import { Input, type InputProps } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchInputProps extends InputProps {
  wrapperClassName?: string;
  iconClassName?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, wrapperClassName, iconClassName, ...props }, ref) => {
    return (
      <div className={cn('relative flex-1', wrapperClassName)}>
        <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10', iconClassName)} size={16} />
        <Input 
          ref={ref}
          type="text"
          className={cn('pl-10', className)}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
