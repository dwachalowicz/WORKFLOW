import { useState, useEffect, useRef } from 'react';
// Per-effect eslint suppressions used instead of whole-file disable
import { Plus, Search, X, Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchGroups, createGroup, getGroupAvatarUrl, toGroupRef, GROUP_COLORS } from '@/lib/groupService';
import type { WorkflowGroup, GroupRef } from '@/lib/groupService';
import { useAuthStore } from '@/store/authStore';
import { AvatarCropper } from '@/components/ui/AvatarCropper';
import { tryCatchToast } from '@/lib/errorHandler';
import { useClickOutside } from '@/hooks/useClickOutside';

// ── Main Component ───────────────────────────────────────────
interface GroupPickerDropdownProps {
  /** Called when a group is selected */
  onSelect: (group: GroupRef) => void;
  /** Groups already assigned (to filter them out) */
  excludeIds?: string[];
  /** Trigger element (defaults to UserPlus button) */
  trigger?: React.ReactNode;
}

/**
 * GroupPickerDropdown — dropdown to pick a group from workspace or create a new one.
 * Used by PropertiesPanel for editors, readers, and decisionMakers.
 */
export const GroupPickerDropdown = ({ onSelect, excludeIds = [], trigger }: GroupPickerDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();
  const [groups, setGroups] = useState<WorkflowGroup[]>([]);
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Avatar state
  const [newAvatarBlob, setNewAvatarBlob] = useState<Blob | null>(null);
  const [newAvatarPreview, setNewAvatarPreview] = useState('');
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeWorkspace = useAuthStore(s => s.activeWorkspace);

  useClickOutside([dropdownRef, panelRef], () => {
    if (isOpen) {
      setIsOpen(false);
      setIsCreating(false);
      setSearch('');
    }
  });

  // Load groups when opened
  useEffect(() => {
    if (isOpen && activeWorkspace) {
      const timer = setTimeout(() => {
        setIsLoading(true);
        fetchGroups(activeWorkspace.id)
          .then(setGroups)
          .finally(() => setIsLoading(false));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeWorkspace]);

  // Focus search when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredGroups = groups
    .filter(g => !excludeIds.includes(g.id))
    .filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  const handleSelectGroup = (group: WorkflowGroup) => {
    onSelect(toGroupRef(group));
    setIsOpen(false);
    setSearch('');
  };

  // ── File selected → open cropper ──
  const handleFileSelected = (file: File) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setCropImageSrc(reader.result?.toString() || null);
    });
    reader.readAsDataURL(file);
  };

  const handleCropped = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setNewAvatarBlob(blob);
    setNewAvatarPreview(url);
    setCropImageSrc(null);
  };

  const resetCreateForm = () => {
    setIsCreating(false);
    setNewGroupName('');
    setNewGroupColor(GROUP_COLORS[0]);
    setNewAvatarBlob(null);
    setNewAvatarPreview('');
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !activeWorkspace) return;
    setIsLoading(true);
    const avatarFile = newAvatarBlob ? new File([newAvatarBlob], 'avatar.webp', { type: 'image/webp' }) : undefined;
    const group = await tryCatchToast(
      () => createGroup(activeWorkspace.id, newGroupName.trim(), {
        color: newGroupColor,
        avatarFile,
      })
    );
    if (group) {
      onSelect(toGroupRef(group));
      resetCreateForm();
      setIsOpen(false);
    }
    setIsLoading(false);
  };

  // Dropdown position (fixed)
  const triggerRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);

  const openDropdown = () => {
    if (isOpen) { setIsOpen(false); return; }
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setDropdownPos({
          top: rect.bottom + 4,
          right: window.innerWidth - rect.right,
        });
      }
    };
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef}>
      {/* Cropper overlay (above everything) */}
      {cropImageSrc && (
        <AvatarCropper imageSrc={cropImageSrc} onCropped={handleCropped} onCancel={() => setCropImageSrc(null)} />
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); e.target.value = ''; }} />

      {/* Trigger */}
      <div ref={triggerRef} onClick={openDropdown}>
        {trigger || (
          <button className="w-6 h-6 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors border border-border">
            <Plus size={12} />
          </button>
        )}
      </div>

      {/* Dropdown — fixed to avoid parent overflow clipping */}
      {isOpen && dropdownPos && (
        <div ref={panelRef} className="fixed w-72 bg-card border border-border rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
          style={{ top: dropdownPos.top, right: dropdownPos.right }}>
          {!isCreating ? (
            <>
              {/* Search */}
              <div className="p-2 border-b border-border/50">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={t('groupPicker.searchPlaceholder')}
                    className="w-full bg-secondary border border-border rounded-lg pl-7 pr-3 py-1.5 text-xs text-foreground focus:border-brand-gold outline-none"
                  />
                </div>
              </div>

              {/* Groups list */}
              <div className="max-h-48 overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">{t('groupPicker.loading')}</div>
                ) : filteredGroups.length > 0 ? (
                  filteredGroups.map(group => (
                    <button
                      key={group.id}
                      onClick={() => handleSelectGroup(group)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-secondary/60 transition-colors text-left"
                    >
                      {group.avatar ? (
                        <img loading="lazy"
                          src={getGroupAvatarUrl(group)}
                          alt={group.name}
                          className="w-6 h-6 rounded-full object-cover ring-1 ring-border shrink-0"
                        />
                      ) : (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-foreground ring-1 ring-border shrink-0"
                          style={{ backgroundColor: (!group.color || group.color === '#bc9b59') ? 'hsl(var(--brand-color))' : group.color }}
                        >
                          {group.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground truncate">{group.name}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    {search ? t('common.noResults') : t('groupPicker.noGroups')}
                  </div>
                )}
              </div>

              {/* Create new */}
              <div className="p-2 border-t border-border/50">
                <button
                  onClick={() => {
                    setIsCreating(true);
                    setNewGroupName(search);
                    setSearch('');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-brand-gold hover:bg-brand-gold/10 transition-colors"
                >
                  <Plus size={12} />
                  {search ? t('groupPicker.createNewWith', { name: search }) : t('groupPicker.createNew')}
                </button>
              </div>
            </>
          ) : (
            /* Create new group form with avatar */
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">{t('groupPicker.newGroup')}</span>
                <button
                  onClick={resetCreateForm}
                  className="w-5 h-5 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
                >
                  <X size={10} />
                </button>
              </div>

              {/* Avatar + Name row */}
              <div className="flex items-center gap-3">
                {/* Avatar circle */}
                <div className="relative group/av cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-10 h-10 rounded-full border-2 border-dashed border-border group-hover/av:border-brand-gold flex items-center justify-center transition-colors overflow-hidden">
                    {newAvatarPreview ? (
                      <img loading="lazy" src={newAvatarPreview} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-foreground" style={{ backgroundColor: newGroupColor === '#bc9b59' ? 'hsl(var(--brand-color))' : newGroupColor }}>
                        {newGroupName ? newGroupName.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover/av:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="w-3 h-3 text-foreground" />
                  </div>
                </div>

                {/* Name input */}
                <input
                  type="text"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder={t('groupPicker.groupNamePlaceholder')}
                  className="flex-1 bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:border-brand-gold outline-none"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreateGroup()}
                />
              </div>

              {/* Remove avatar link */}
              {newAvatarPreview && (
                <button onClick={() => { setNewAvatarBlob(null); setNewAvatarPreview(''); }}
                  className="text-[10px] text-muted-foreground hover:text-destructive transition-colors">
                  {t('groups.removeAvatar')}
                </button>
              )}

              {/* Color picker — hidden when avatar is set */}
              {!newAvatarPreview && (
                <div className="flex gap-1.5 flex-wrap">
                  {GROUP_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewGroupColor(color)}
                      className={`w-5 h-5 rounded-full transition-all ${newGroupColor === color ? 'ring-2 ring-offset-1 ring-offset-card ring-brand-gold scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: color === '#bc9b59' ? 'hsl(var(--brand-color))' : color }}
                    />
                  ))}
                </div>
              )}

              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || isLoading}
                className="w-full bg-brand-gold text-background py-1.5 rounded-lg text-xs font-bold hover:bg-brand-gold/90 transition-colors disabled:opacity-50"
              >
                {isLoading ? t('groupPicker.creating') : t('groupPicker.createGroup')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
