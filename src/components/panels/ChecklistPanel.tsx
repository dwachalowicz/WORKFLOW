import { useTranslation } from 'react-i18next';
import { GlobalChecklist } from '@/components/panels/GlobalChecklist';
import { X, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUiStore } from "@/store/uiStore";
import { useCanvasStore } from "@/store/canvasStore";
import { SidePanel } from '@/components/ui/side-panel';

const MotionSidePanel = motion.create(SidePanel);

export const ChecklistPanel = () => {
  const { t } = useTranslation();
  const isOpen = useUiStore(s => s.isChecklistPanelOpen);
  const setOpen = useUiStore(s => s.setChecklistPanelOpen);
  const isViewMode = useCanvasStore(s => s.isViewMode);

  if (!isOpen || isViewMode) return null;

  return (
    <AnimatePresence>
      <MotionSidePanel
        position="left"
        width="md:w-[380px]"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <CheckSquare size={16} className="text-brand-gold" />
          <h3 className="text-sm font-bold text-foreground flex-1">{t('ui.globalChecklist')}</h3>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-full bg-secondary hover:bg-destructive/10 hover:text-destructive flex items-center justify-center text-muted-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-border">
          <GlobalChecklist />
        </div>
      </MotionSidePanel>
    </AnimatePresence>
  );
};
