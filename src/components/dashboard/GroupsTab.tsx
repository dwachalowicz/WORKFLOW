import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
  fetchGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupAvatarUrl,
  invalidateGroupCache,
  GROUP_COLORS,
} from '@/lib/groupService';
import type { WorkflowGroup } from '@/lib/groupService';
import { Plus, Pencil, Trash2, X, Check, Users, Camera } from 'lucide-react';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { tryCatchToast } from '@/lib/errorHandler';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AvatarCropper } from '@/components/ui/AvatarCropper';
import { Card } from '@/components/ui/card';
import { GryfSpinner } from '@/components/ui/GryfSpinner';
import { WorkspaceSwitcherDropdown } from '@/components/ui/WorkspaceSwitcherDropdown';
import { DashboardPageLayout } from '@/components/dashboard/layout/DashboardPageLayout';
import { DashboardHeader } from '@/components/dashboard/layout/DashboardHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';

// ── Main GroupsTab ───────────────────────────────────────────

export const GroupsTab = () => {
  const { t } = useTranslation();
  const activeWorkspace = useAuthStore(s => s.activeWorkspace);
  const [groups, setGroups] = useState<WorkflowGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(GROUP_COLORS[0]);
  const [newAvatarBlob, setNewAvatarBlob] = useState<Blob | null>(null);
  const [newAvatarPreview, setNewAvatarPreview] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const createFileRef = useRef<HTMLInputElement>(null);

  // Cropper
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<'create' | 'edit'>('create');

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editAvatarBlob, setEditAvatarBlob] = useState<Blob | null | undefined>(undefined);
  const [editAvatarPreview, setEditAvatarPreview] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const editFileRef = useRef<HTMLInputElement>(null);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    if (!activeWorkspace) return;
    setIsLoading(true);
    try {
      invalidateGroupCache();
      const records = await fetchGroups(activeWorkspace.id);
      setGroups(records);
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadGroups(); }, [loadGroups]);

  // ── File selected → open cropper ──
  const handleFileSelected = (file: File, target: 'create' | 'edit') => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setCropImageSrc(reader.result?.toString() || null);
      setCropTarget(target);
    });
    reader.readAsDataURL(file);
  };

  const handleCropped = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    if (cropTarget === 'create') {
      setNewAvatarBlob(blob);
      setNewAvatarPreview(url);
    } else {
      setEditAvatarBlob(blob);
      setEditAvatarPreview(url);
    }
    setCropImageSrc(null);
  };

  // ── Create ──
  const handleCreate = async () => {
    if (!newName.trim() || !activeWorkspace) return;
    setIsCreating(true);
    const avatarFile = newAvatarBlob ? new File([newAvatarBlob], 'avatar.webp', { type: 'image/webp' }) : undefined;
    const result = await tryCatchToast(
      () => createGroup(activeWorkspace.id, newName.trim(), { color: newColor, avatarFile })
    );
    if (result) {
      setNewName(''); setNewColor(GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)]);
      setNewAvatarBlob(null); setNewAvatarPreview(''); setShowCreate(false);
      loadGroups();
    }
    setIsCreating(false);
  };

  // ── Edit ──
  const startEdit = (group: WorkflowGroup) => {
    setEditingId(group.id); setEditName(group.name); setEditColor(group.color || GROUP_COLORS[0]);
    setEditAvatarBlob(undefined); setEditAvatarPreview(group.avatar ? getGroupAvatarUrl(group) : '');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setIsSaving(true);
    const avatarFile = editAvatarBlob === null ? null
      : editAvatarBlob ? new File([editAvatarBlob], 'avatar.webp', { type: 'image/webp' }) : undefined;
    const result = await tryCatchToast(
      () => updateGroup(editingId, { name: editName.trim(), color: editColor, avatarFile: avatarFile ?? undefined })
    );
    if (result) { setEditingId(null); loadGroups(); }
    setIsSaving(false);
  };

  // ── Delete ──
  const handleDelete = async (groupId: string) => {
    if (!activeWorkspace) return;
    const result = await tryCatchToast(
      () => deleteGroup(groupId, activeWorkspace.id)
    );
    if (result !== undefined) { setDeletingId(null); loadGroups(); }
  };

  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  const resetCreate = () => { setShowCreate(false); setNewName(''); setNewAvatarBlob(null); setNewAvatarPreview(''); };

  return (
    <DashboardPageLayout maxWidth="max-w-[1200px]">
      {/* Cropper overlay */}
      {cropImageSrc && (
        <AvatarCropper imageSrc={cropImageSrc} onCropped={handleCropped} onCancel={() => setCropImageSrc(null)} />
      )}

      <DashboardHeader
        title={t('groups.title')}
        subtitle={
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t('dashboard.workspace')}</span>
            <WorkspaceSwitcherDropdown />
          </div>
        }
        actions={
          <Button onClick={() => setShowCreate(true)} size="pill" disabled={activeWorkspace?.role === 'viewer'} className="flex items-center gap-2 whitespace-nowrap">
            <Plus size={18} /> {t('groups.newGroup')}
          </Button>
        }
      />

      {/* Search */}
      <SearchInput 
        value={search} 
        onChange={e => setSearch(e.target.value)} 
        placeholder={t('common.search')} 
        wrapperClassName="max-w-md mb-6"
      />

      {/* Create Form */}
      {showCreate && (
        <Card className="p-6 mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">{t('groups.createGroup')}</h3>
            <button onClick={resetCreate} className="w-7 h-7 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <X size={14} />
            </button>
          </div>
          <div className="flex items-start gap-6">
            {/* Avatar with cropper */}
            <div className="shrink-0">
              <input ref={createFileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelected(f, 'create'); e.target.value = ''; }} />
              <div className="relative group cursor-pointer" onClick={() => createFileRef.current?.click()}>
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-border group-hover:border-brand-gold flex items-center justify-center transition-colors overflow-hidden">
                  {newAvatarPreview ? (
                    <img loading="lazy" src={newAvatarPreview} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl font-bold text-foreground" style={{ backgroundColor: newColor }}>
                      {newName ? newName.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-5 h-5 text-foreground" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-1">{t('common.avatar', { defaultValue: 'Avatar' })}</p>
              {newAvatarPreview && (
                <button onClick={(e) => { e.stopPropagation(); setNewAvatarBlob(null); setNewAvatarPreview(''); }}
                  className="text-[10px] text-muted-foreground hover:text-destructive text-center mt-0.5 transition-colors">{t('common.delete')}</button>
              )}
            </div>
            <form className="flex-1 space-y-4" onSubmit={e => { e.preventDefault(); handleCreate(); }}>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">{t('groups.groupName')}</label>
                <Input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder={t('groups.namePlaceholder')}
                  autoFocus />
              </div>
              {!newAvatarPreview && (
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">{t('groups.color')}</label>
                <div className="flex gap-2 flex-wrap">
                  {GROUP_COLORS.map(color => (
                    <button key={color} type="button" onClick={() => setNewColor(color)}
                      onDoubleClick={handleCreate}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setNewColor(color); handleCreate(); } }}
                      className={`w-9 h-9 rounded-full transition-all ${newColor === color ? 'ring-2 ring-offset-2 ring-offset-card ring-brand-gold scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={!newName.trim() || isCreating} size="sm">
                  {isCreating ? t('common.creating') : t('groups.createGroup')}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={resetCreate}>
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* Groups List */}
      {isLoading ? (
        <div className="flex justify-center items-center min-h-[50vh]">
          <GryfSpinner size={36} label={t('common.loading')} />
        </div>
      ) : filteredGroups.length === 0 ? (
        <EmptyState 
          icon={Users}
          title={search ? t('common.noResults') : t('groups.noGroups')}
          description={search ? t('groups.noSearchResults') : t('groups.createFirstHint')}
          className="py-20 border-none bg-transparent shadow-none"
        />
      ) : (
        <div className="space-y-6">
          <GroupsContext.Provider value={{
            editName, editColor, editAvatarPreview, isSaving,
            onCancelEdit: () => setEditingId(null), onSaveEdit: handleSaveEdit,
            onEditNameChange: setEditName, onEditColorChange: setEditColor,
            onEditAvatarFileSelected: (f) => handleFileSelected(f, 'edit'),
            onRemoveEditAvatar: () => { setEditAvatarBlob(null); setEditAvatarPreview(''); },
            editFileRef,
          }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredGroups.map(group => (
              <GroupCard key={group.id} group={group} isEditing={editingId === group.id} isDeleting={deletingId === group.id}
                onStartEdit={() => startEdit(group)}
                onStartDelete={() => setDeletingId(group.id)} onCancelDelete={() => setDeletingId(null)} onConfirmDelete={() => handleDelete(group.id)} />
            ))}
          </div>
          </GroupsContext.Provider>
        </div>
      )}
    </DashboardPageLayout>
  );
};

// ── GroupsContext — shared across all GroupCards ─────────────
interface GroupsContextValue {
  editName: string; editColor: string; editAvatarPreview: string; isSaving: boolean;
  onCancelEdit: () => void; onSaveEdit: () => void;
  onEditNameChange: (n: string) => void; onEditColorChange: (c: string) => void;
  onEditAvatarFileSelected: (f: File) => void;
  onRemoveEditAvatar: () => void;
  editFileRef: React.RefObject<HTMLInputElement | null>;
}

const GroupsContext = createContext<GroupsContextValue>(null!);

// ── GroupCard ────────────────────────────────────────────────
interface GroupCardProps {
  group: WorkflowGroup; isEditing: boolean; isDeleting: boolean;
  onStartEdit: () => void;
  onStartDelete: () => void; onCancelDelete: () => void; onConfirmDelete: () => void;
}

const GroupCard = ({ group, isEditing, isDeleting,
  onStartEdit,
  onStartDelete, onCancelDelete, onConfirmDelete }: GroupCardProps) => {
  const { t } = useTranslation();
  const { editName, editColor, editAvatarPreview, isSaving, onCancelEdit, onSaveEdit, onEditNameChange, onEditColorChange, onEditAvatarFileSelected, onRemoveEditAvatar, editFileRef } = useContext(GroupsContext);

  if (isDeleting) {
    return (
      <Card className="bg-destructive/5 border-destructive/30 p-4 animate-in fade-in duration-150">
        <p className="text-sm text-foreground mb-3">{t('groups.deleteConfirm', { name: group.name })}</p>
        <div className="flex gap-2">
          <Button variant="destructive" size="sm" onClick={onConfirmDelete}>{t('common.delete')}</Button>
          <Button variant="ghost" size="sm" onClick={onCancelDelete}>{t('common.cancel')}</Button>
        </div>
      </Card>
    );
  }

  if (isEditing) {
    return (
      <Card className="border-brand-gold/50 p-4 animate-in fade-in duration-150">
        <form onSubmit={e => { e.preventDefault(); onSaveEdit(); }} className="space-y-3">
          <input ref={editFileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onEditAvatarFileSelected(f); e.target.value = ''; }} />
          <div className="flex items-center gap-3">
            <div className="relative group cursor-pointer shrink-0" onClick={() => editFileRef.current?.click()}>
              <div className="w-10 h-10 rounded-full overflow-hidden border border-dashed border-border group-hover:border-brand-gold transition-colors">
                {editAvatarPreview ? (
                  <img loading="lazy" src={editAvatarPreview} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold text-foreground" style={{ backgroundColor: editColor || '#bc9b59' }}>
                    {editName.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-3 h-3 text-foreground" />
              </div>
            </div>
            <Input type="text" value={editName} onChange={e => onEditNameChange(e.target.value)} className="flex-1 h-8 text-sm"
              autoFocus />
          </div>
          {!editAvatarPreview && (
          <div className="flex gap-1.5 flex-wrap">
            {GROUP_COLORS.map(color => (
              <button key={color} type="button" onClick={() => onEditColorChange(color)}
                onDoubleClick={onSaveEdit}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onEditColorChange(color); onSaveEdit(); } }}
                className={`w-7 h-7 rounded-full transition-all ${editColor === color ? 'ring-2 ring-offset-1 ring-offset-card ring-brand-gold scale-110' : 'hover:scale-105'}`}
                style={{ backgroundColor: color }} />
            ))}
          </div>
          )}
          {editAvatarPreview && (
            <button type="button" onClick={onRemoveEditAvatar} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors">
              {t('processes.removeAvatar')}
            </button>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={!editName.trim() || isSaving} size="sm" className="flex items-center gap-1.5">
              <Check size={12} /> {isSaving ? t('common.saving') : t('common.save')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onCancelEdit}>{t('common.cancel')}</Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card className="p-4 flex items-center justify-between group hover:border-border transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        {group.avatar ? (
          <img loading="lazy" src={getGroupAvatarUrl(group)} alt={group.name} className="w-10 h-10 rounded-full object-cover ring-1 ring-border shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full ring-1 ring-border shrink-0 flex items-center justify-center text-sm font-bold text-foreground"
            style={{ backgroundColor: group.color || '#bc9b59' }}>
            {group.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{group.name}</p>
          <p className="text-[10px] text-muted-foreground">{t('groups.workspaceGroup')}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <SimpleTooltip content={t('common.edit')}>
          <Button variant="iconGhost" size="iconSm" onClick={onStartEdit}>
            <Pencil size={13} />
          </Button>
        </SimpleTooltip>
        <SimpleTooltip content={t('common.delete')}>
          <Button variant="iconGhost" size="iconSm" onClick={onStartDelete} className="hover:bg-destructive/10 hover:text-destructive">
            <Trash2 size={13} />
          </Button>
        </SimpleTooltip>
      </div>
    </Card>
  );
};
