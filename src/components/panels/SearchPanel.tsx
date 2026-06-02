import { Search, X, Users, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useUiStore } from "@/store/uiStore";
import { useCanvasStore } from "@/store/canvasStore";
import { SidePanel } from '@/components/ui/side-panel';
import { GroupAvatar } from '@/components/ui/GroupAvatar';

export const SearchPanel = () => {
  const { t } = useTranslation();
  const isSearchPanelOpen = useUiStore(state => state.isSearchPanelOpen);
  const setSearchPanelOpen = useUiStore(state => state.setSearchPanelOpen);
  const searchQuery = useCanvasStore(state => state.searchQuery);
  const setSearchQuery = useCanvasStore(state => state.setSearchQuery);
  const searchSelectedUsers = useCanvasStore(state => state.searchSelectedUsers);
  const setSearchSelectedUsers = useCanvasStore(state => state.setSearchSelectedUsers);
  
  const nodes = useCanvasStore(state => state.nodes);
  const edges = useCanvasStore(state => state.edges);
  // Structural fingerprint: only recompute when editors/readers/decisionMakers change, not on drag
  const usersFingerprint = useCanvasStore(state => {
    const parts: string[] = [];
    for (const n of state.nodes) {
      const eds = (n.data?.editors as { name?: string }[]) || [];
      const rds = (n.data?.readers as { name?: string }[]) || [];
      for (const u of [...eds, ...rds]) if (u?.name) parts.push(u.name);
    }
    for (const e of state.edges) {
      const dms = (e.data?.decisionMakers as { name?: string }[]) || [];
      for (const u of dms) if (u?.name) parts.push(u.name);
    }
    return parts.sort().join('|');
  });

  // Collect unique users from nodes and edges
  const uniqueUsers = useMemo(() => {
    const usersMap = new Map();

    nodes.forEach(node => {
      const editors = node.data?.editors || [];
      const readers = node.data?.readers || [];
      [...editors, ...readers].forEach((u: Record<string, unknown>) => {
        if (u && u.name) usersMap.set(u.name, u);
      });
    });

    edges.forEach(edge => {
      const dms = edge.data?.decisionMakers || [];
      dms.forEach((u: Record<string, unknown>) => {
        if (u && u.name) usersMap.set(u.name, u);
      });
    });

    return Array.from(usersMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usersFingerprint]);

  const toggleUser = (userName: string) => {
    if (searchSelectedUsers.includes(userName)) {
      setSearchSelectedUsers(searchSelectedUsers.filter(n => n !== userName));
    } else {
      setSearchSelectedUsers([...searchSelectedUsers, userName]);
    }
  };

  if (!isSearchPanelOpen) return null;

  return (
    <SidePanel position="left" width="md:w-80" className="animate-in fade-in slide-in-from-left-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Search size={16} className="text-brand-gold" />
            {t('searchPanel.title')}
          </h3>
          <button 
            onClick={() => {
              setSearchPanelOpen(false);
              setSearchQuery('');
              setSearchSelectedUsers([]);
            }}
            className="w-6 h-6 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Text Search */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">{t('searchPanel.byName')}</label>
            <div className="relative">
              <input
                type="text"
                placeholder={t('searchPanel.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-foreground focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 outline-none transition-all placeholder:text-muted-foreground/50"
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Users Filter */}
          {uniqueUsers.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Users size={12} />
                {t('searchPanel.filterByGroups')}
              </label>
              <div className="space-y-1.5">
                {uniqueUsers.map((user: Record<string, unknown>) => {
                  const userName = user.name as string;
                  const isSelected = searchSelectedUsers.includes(userName);
                  return (
                    <div 
                      key={userName}
                      onClick={() => toggleUser(userName)}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all border",
                        isSelected 
                          ? "bg-brand-gold/10 border-brand-gold/30 text-foreground" 
                          : "bg-secondary border-transparent hover:border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors shrink-0",
                        isSelected ? "bg-brand-gold border-brand-gold text-background" : "border-muted"
                      )}>
                        {isSelected && <Check size={10} strokeWidth={3} />}
                      </div>
                      <GroupAvatar group={user as { name?: string; avatar?: string; color?: string }} size="sm" />
                      <span className="text-sm font-medium truncate">{userName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {uniqueUsers.length === 0 && (
            <div className="text-xs text-center text-muted-foreground/60 p-4 border border-dashed border-border rounded-xl bg-secondary/50">
              {t('searchPanel.noUsersOnCanvas')}
            </div>
          )}
        </div>

        {/* Footer / Clear filters */}
        {(searchQuery || searchSelectedUsers.length > 0) && (
          <div className="p-3 border-t border-border bg-muted/10">
            <button 
              onClick={() => {
                setSearchQuery('');
                setSearchSelectedUsers([]);
              }}
              className="w-full py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
            >
              {t('searchPanel.clearFilters')}
            </button>
          </div>
        )}
    </SidePanel>
  );
};
