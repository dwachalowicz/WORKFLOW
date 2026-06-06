import React, { useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import * as LucideIcons from 'lucide-react';
import { useClickOutside } from '@/hooks/useClickOutside';
import { ICON_MAP } from '@/lib/iconMap';

interface IconPickerDropdownProps {
  value?: string;
  onChange: (iconName: string) => void;
  disabled?: boolean;
}

const ALL_ICONS = Object.keys(ICON_MAP).sort();

export const IconPickerDropdown = ({ value, onChange, disabled }: IconPickerDropdownProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, () => {
    setIsOpen(false);
    setSearch('');
  });

  const CurrentIcon = value ? (LucideIcons as Record<string, React.ElementType>)[value] : null;

  const filteredIcons = useMemo(() => {
    if (!search) return ALL_ICONS.slice(0, 150);
    const lower = search.toLowerCase();
    return ALL_ICONS.filter(name => name.toLowerCase().includes(lower)).slice(0, 150);
  }, [search]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 flex items-center justify-center bg-secondary border border-border rounded-xl text-muted-foreground hover:text-foreground transition-colors"
      >
        {CurrentIcon ? <CurrentIcon size={20} className="text-foreground" /> : <LucideIcons.Image size={20} />}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-card border border-border rounded-xl shadow-xl z-50 w-72 flex flex-col gap-3">
          <input
            type="text"
            className="w-full bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:border-brand-gold outline-none"
            placeholder={t('avatar.searchIcon')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="grid grid-cols-6 gap-1 max-h-56 overflow-y-auto p-1 pr-2 custom-scrollbar">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
                setSearch('');
              }}
              className={`flex items-center justify-center p-2 rounded-lg transition-colors border ${!value ? 'border-brand-gold bg-brand-gold/10' : 'border-transparent hover:bg-secondary'}`}
              title={t('common.none')}
            >
              <LucideIcons.Ban size={18} className="text-muted-foreground" />
            </button>
            {filteredIcons.map(iconName => {
              const IconComp = (LucideIcons as Record<string, React.ElementType>)[iconName];
              if (!IconComp) return null;
              const isSelected = value === iconName;
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => {
                    onChange(iconName);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  title={iconName}
                  className={`flex items-center justify-center p-2 rounded-lg transition-colors border ${isSelected ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' : 'border-transparent hover:bg-secondary text-muted-foreground'}`}
                >
                  <IconComp size={18} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
