import React, { useState, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getAvatarUrl } from '@/lib/pocketbase';

interface UserAvatarButtonProps extends React.HTMLAttributes<HTMLDivElement> {
  user: Record<string, unknown> | null;
}

export const UserAvatarButton = forwardRef<HTMLDivElement, UserAvatarButtonProps>(({
  user,
  className = '',
  ...props
}, ref) => {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);
  
  return (
    <div 
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label={t('auth.userAccountOptions')}
      className={`flex items-center justify-center cursor-pointer group relative shrink-0 ${className}`}
      {...props}
    >
      <div className="w-10 h-10 shrink-0 rounded-full bg-secondary overflow-hidden ring-2 ring-transparent group-hover:ring-primary transition-all">
        {(user as Record<string, string>)?.avatar && !imgError ? (
          <img loading="lazy" 
            src={getAvatarUrl(user, 100)} 
            alt={(user as Record<string, string>)?.name || (user as Record<string, string>)?.email} 
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-surface-elevated flex items-center justify-center text-primary font-bold text-sm">
            {user ? ((user as Record<string, string>)?.name || (user as Record<string, string>)?.email || 'U')[0].toUpperCase() : 'G'}
          </div>
        )}
      </div>
      {(user as Record<string, string>)?.tier && (
        <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-surface-nav">
          {(user as Record<string, string>).tier}
        </div>
      )}
    </div>
  );
});

UserAvatarButton.displayName = 'UserAvatarButton';
