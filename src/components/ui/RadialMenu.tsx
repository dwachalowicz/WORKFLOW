import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { SquarePlus, Trash2, Copy, X, Database, Workflow, Flag, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getTierLimits } from '@/lib/tierLimits';

interface RadialMenuProps {
  x: number;
  y: number;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
  hasContextNode?: boolean;
  isStartNode?: boolean;
}

export const RadialMenu = ({ x, y, isOpen, onClose, onAction, hasContextNode = false, isStartNode = false }: RadialMenuProps) => {
  const { t } = useTranslation();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isCenterHovered, setIsCenterHovered] = useState(false);
  const user = useAuthStore(s => s.user);
  const limits = getTierLimits(user?.tier);
  
  // We need to adjust position to be centered on the cursor
  const MENU_SIZE = 260; // Approximate size based on benchmark
  const offset = MENU_SIZE / 2;

  // Handle clicking outside to close
  useEffect(() => {
    const handleClick = () => {
      if (isOpen) onClose();
    };
    
    if (isOpen) {
      // Small timeout to avoid immediate closing if triggered via click
      setTimeout(() => {
        window.addEventListener('click', handleClick);
      }, 10);
      return () => window.removeEventListener('click', handleClick);
    }
  }, [isOpen, onClose]);

  const items = [
    { id: 'add_task', icon: SquarePlus, label: t('radial.addTask'), rotation: 0 },
    { id: 'add_database', icon: Database, label: t('radial.database'), rotation: 60 },
    { id: 'add_subworkflow', icon: Workflow, label: limits.canUseSubworkflows ? t('radial.subworkflow') : t('tierLimits.subworkflowLocked'), rotation: 120, tierLocked: !limits.canUseSubworkflows },
    { id: 'add_stop', icon: Flag, label: t('radial.stop'), rotation: 180 },
    { id: 'copy', icon: Copy, label: t('radial.duplicate'), rotation: 240 },
    { id: 'delete', icon: Trash2, label: t('common.delete'), rotation: 300 },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.05 } }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed z-50 pointer-events-auto tour-radial-menu"
          style={{ 
            left: x - offset, 
            top: y - offset,
            width: MENU_SIZE,
            height: MENU_SIZE
          }}
          onContextMenu={(e) => e.preventDefault()} // Prevent native context menu over ours
        >
          <div className="relative w-full h-full rounded-full bg-surface-nav/90 backdrop-blur-sm shadow-2xl flex items-center justify-center overflow-hidden border border-transparent dark:border-border">
            
            {/* Menu Items arranged in circle */}
            {items.map((item) => {
              const Icon = item.icon;
              const isTierLocked = !!(item as { tierLocked?: boolean }).tierLocked;
              const isDisabled = 
                isTierLocked ||
                (!hasContextNode && ['delete', 'copy'].includes(item.id)) ||
                (isStartNode && ['delete', 'copy'].includes(item.id));
              
              return (
                <div
                  key={item.id}
                  className="absolute inset-0 flex items-start justify-center pt-3 pointer-events-none"
                  style={{ transform: `rotate(${item.rotation}deg)` }}
                >
                  <div 
                    style={{ transform: `rotate(-${item.rotation}deg)` }}
                    className={`p-4 rounded-full flex flex-col items-center justify-center group ${
                      isDisabled 
                        ? 'opacity-30 cursor-not-allowed pointer-events-none' 
                        : 'pointer-events-auto cursor-pointer'
                    }`}
                    onMouseEnter={() => !isDisabled && setHoveredItem(item.id)}
                    onMouseLeave={() => !isDisabled && setHoveredItem(null)}
                    onClick={(e) => {
                      if (isDisabled) return;
                      e.stopPropagation();
                      onAction(item.id);
                      onClose();
                    }}
                  >
                    <div className="relative">
                      <Icon className="text-muted-foreground group-hover:text-brand-gold transition-colors drop-shadow-sm group-hover:drop-shadow-glow" size={26} />
                      {isTierLocked && (
                        <Lock size={14} className="absolute -bottom-1 -right-1 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Center Logo Area */}
            <div 
              className="absolute z-10 w-24 h-24 rounded-full bg-secondary border border-border flex items-center justify-center cursor-pointer hover:bg-surface-elevated transition-colors"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              onMouseEnter={() => setIsCenterHovered(true)}
              onMouseLeave={() => setIsCenterHovered(false)}
            >
              {hoveredItem ? (
                <span className="text-[11px] font-bold text-brand-gold text-center px-2 animate-in fade-in zoom-in duration-200">
                  {items.find(i => i.id === hoveredItem)?.label}
                </span>
              ) : isCenterHovered ? (
                <X className="text-muted-foreground drop-shadow-glow animate-in fade-in zoom-in duration-200" size={32} />
              ) : (
                <div className="w-12 h-12 gryf-logo-mask animate-in fade-in zoom-in duration-200" />
              )}
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
