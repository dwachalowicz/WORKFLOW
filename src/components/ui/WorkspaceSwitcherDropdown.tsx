import { useState, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useClickOutside } from '@/hooks/useClickOutside';
import { ChevronDown, Check, Crown, Edit3, Eye, Users, Lock } from 'lucide-react';
import { getRecordFileUrl } from '@/lib/pocketbase';
import { useTranslation } from 'react-i18next';

export const WorkspaceSwitcherDropdown = () => {
  const { t } = useTranslation();
  const { workspaces, activeWorkspace, setActiveWorkspace } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside([dropdownRef], () => {
    if (isOpen) setIsOpen(false);
  });

  const handleSelect = (workspaceId: string) => {
    setActiveWorkspace(workspaceId);
    setIsOpen(false);
  };

  if (!activeWorkspace || workspaces.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="relative inline-block" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group px-2 py-1 -ml-2 rounded-lg hover:bg-secondary/50"
        >
          <span className="font-medium text-sm flex items-center gap-1.5">
            {activeWorkspace.name}
            {activeWorkspace.isLocked && <Lock size={12} className="text-muted-foreground" title={t('common.locked', 'Zablokowany')} />}
          </span>
          <ChevronDown 
            size={14} 
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`} 
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 py-1.5">
            <div className="max-h-[300px] overflow-y-auto">
              {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => handleSelect(ws.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/60 transition-colors text-left"
              >
                {ws.avatar ? (
                  <img 
                    loading="lazy"
                    src={getRecordFileUrl('WORKFLOW_workspaces', { id: ws.id }, ws.avatar, 100)} 
                    alt={ws.name}
                    className="w-6 h-6 rounded-md object-cover ring-1 ring-border shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground ring-1 ring-border shrink-0">
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <div className={`text-sm truncate ${activeWorkspace.id === ws.id ? 'font-bold text-brand-gold' : 'font-medium text-foreground'}`}>
                    {ws.name}
                  </div>
                  {ws.isLocked && <Lock size={12} className="text-muted-foreground shrink-0" title={t('common.locked', 'Zablokowany')} />}
                </div>
                {activeWorkspace.id === ws.id && (
                  <Check size={14} className="text-brand-gold shrink-0" />
                )}
              </button>
            ))}
            </div>
          </div>
        )}
      </div>

      {activeWorkspace.role && activeWorkspace.role !== 'admin' && (
        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-foreground/5 backdrop-blur-sm border border-border/50 rounded-md text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          <Users size={12} />
          {t('workspaces.sharedWorkspace')}
        </span>
      )}
      {activeWorkspace.role && (
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
          activeWorkspace.role === 'admin'
            ? 'bg-brand-gold/20 text-brand-gold'
            : activeWorkspace.role === 'editor'
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-secondary text-muted-foreground'
        }`}>
          {activeWorkspace.role === 'admin' ? <Crown size={12} /> : activeWorkspace.role === 'editor' ? <Edit3 size={12} /> : <Eye size={12} />}
          {activeWorkspace.role === 'admin' ? 'Admin' : activeWorkspace.role === 'editor' ? t('workspaces.roleEditor') : t('workspaces.roleViewer')}
        </span>
      )}
    </div>
  );
};
