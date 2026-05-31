import { motion, AnimatePresence } from 'framer-motion';
import { GryfSpinner } from './GryfSpinner';

interface InitialLoaderProps {
  isLoading: boolean;
}

export const InitialLoader = ({ isLoading }: InitialLoaderProps) => {
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
            <GryfSpinner size={48} label="Loading..." />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
