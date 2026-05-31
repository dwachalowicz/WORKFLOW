import { UserCircle, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';

interface UserMenuPopoverProps {
  onClose: () => void;
  className?: string;
}

export const UserMenuPopover = ({ onClose, className = "absolute left-[calc(100%+12px)] bottom-0" }: UserMenuPopoverProps) => {
  const { t } = useTranslation();
  const { user, setProfileModalOpen, logout } = useAuthStore();

  return (
    <div className={`${className} bg-card border border-border rounded-xl shadow-2xl py-1.5 min-w-[180px] z-[150] animate-in fade-in slide-in-from-left-2 duration-150`}>
      <div className="px-3 py-2 border-b border-border">
        <p className="text-sm font-medium text-foreground truncate">{user?.name || t('common.user')}</p>
        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
      </div>

      <button
        onClick={() => {
          onClose();
          setProfileModalOpen(true);
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <UserCircle size={16} />
        {t('profile.editProfile')}
      </button>

      <div className="mx-2 h-px bg-border my-1" />

      <button
        onClick={() => {
          onClose();
          logout();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
      >
        <LogOut size={16} />
        {t('auth.logout')}
      </button>
    </div>
  );
};
