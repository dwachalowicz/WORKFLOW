import { motion, AnimatePresence } from 'framer-motion';
import { GryfSpinner } from './GryfSpinner';
import { useTranslation } from 'react-i18next';

interface InitialLoaderProps {
  isLoading: boolean;
}

export const InitialLoader = ({ isLoading }: InitialLoaderProps) => {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="initial-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] bg-background flex items-center justify-center flex-col"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <GryfSpinner size={48} label={t('common.loading')} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
