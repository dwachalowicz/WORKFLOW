import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { UserAvatarButton } from '../../components/ui/UserAvatarButton';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useLandingTranslation } from '../LandingTranslationContext';

export const UserMenuDropdown: React.FC = () => {
  const { t } = useLandingTranslation();
  const { user, isAuthenticated, setProfileModalOpen, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useClickOutside(menuRef, () => {
    if (isOpen) setIsOpen(false);
  });

  const handleAvatarClick = () => {
    if (isAuthenticated) {
      setIsOpen(!isOpen);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <UserAvatarButton user={user} onClick={handleAvatarClick} />
      
      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+12px)] bg-landing-card border border-white/10 rounded-xl shadow-2xl py-1.5 min-w-[180px] z-[100] animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2 border-b border-white/10">
            <p className="text-sm font-medium text-white truncate">{user?.name || t('common.user')}</p>
            <p className="text-xs text-white/70 truncate">{user?.email}</p>
          </div>

          <button onClick={() => { setIsOpen(false); setProfileModalOpen(true); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
            <UserCircle size={16} /> {t('landing.usermenudropdown.text1')}
          </button>
          <button onClick={() => { setIsOpen(false); navigate('/dashboard'); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
            <div className="w-4 h-4 bg-primary/20 rounded flex items-center justify-center text-primary text-[10px] font-bold">G</div> {t('landing.usermenudropdown.text2')}
          </button>

          <div className="mx-2 h-px bg-gray-800 my-1" />

          <button onClick={() => { setIsOpen(false); logout(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:text-red-400 hover:bg-white/5 transition-colors">
            <LogOut size={16} /> {t('landing.usermenudropdown.text3')}
          </button>
        </div>
      )}
    </div>
  );
};
