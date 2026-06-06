import { Moon, Sun } from 'lucide-react';
import { useState, useRef } from 'react';
import { useThemeToggle, THEME_COLORS } from '@/hooks/useThemeToggle';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { useClickOutside } from '@/hooks/useClickOutside';
import { NAV_BTN_STATIC } from '@/components/layout/navHelpers';

export const ThemeToggleButton = () => {
  const { isDark, toggleTheme, brandColor, changeBrandColor } = useThemeToggle();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => {
    if (isOpen) setIsOpen(false);
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  const toggleOpen = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setDropdownPos({
          top: rect.top + rect.height / 2,
          left: rect.right + 12,
        });
      }
      setIsOpen(true);
    }
  };

  const navBtnClass = NAV_BTN_STATIC;

  return (
    <div className="relative" ref={menuRef}>
      <SimpleTooltip content={t('dashboard.switchTheme') || 'Theme & Color'} side="right">
        <button 
          ref={triggerRef}
          onClick={toggleOpen}
          aria-label={t('dashboard.switchTheme')}
          className={`${navBtnClass} ${isOpen ? 'text-brand-gold bg-secondary' : 'hover:text-brand-gold'}`}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </SimpleTooltip>

      {isOpen && dropdownPos && (
        <div 
          className="fixed -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-1.5 flex items-center gap-2 z-[100] animate-in fade-in slide-in-from-left-2 duration-150"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
        >
          <SimpleTooltip content={isDark ? t('common.lightMode') : t('common.darkMode')} side="top">
            <button
              onClick={toggleTheme}
              aria-label={isDark ? t('common.lightMode') : t('common.darkMode')}
              className="w-8 h-8 rounded-full bg-surface-elevated hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-brand-gold transition-colors"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </SimpleTooltip>

          <div className="w-px h-5 bg-border dark:bg-white/10" />

          <div className="flex gap-2 px-1">
            {THEME_COLORS.map((c) => (
              <SimpleTooltip key={c.name} content={c.name} side="top">
                <button
                  onClick={() => changeBrandColor(c.value)}
                  aria-label={`${t('common.changeColor')} ${c.name}`}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${brandColor === c.value ? 'border-foreground shadow-glow' : 'border-transparent'}`}
                  style={{ backgroundColor: c.hex }}
                />
              </SimpleTooltip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
