import { motion } from 'framer-motion';

interface GryfSpinnerProps {
  /** Size of the logo in pixels (default: 32) */
  size?: number;
  /** Optional loading text below the spinner */
  label?: string;
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * Reusable Gryf branded spinner — spinning logo with dynamic brand color.
 * Use this for all content/section loading states instead of generic Loader2 spinners.
 *
 * Uses CSS mask so the logo inherits the dynamic brand-gold color.
 * The logo is not perfectly circular (griffin head extends),
 * so we use 15% extra padding so the rotation doesn't clip.
 */
export const GryfSpinner = ({ size = 28, label, className = '' }: GryfSpinnerProps) => {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div
        style={{
          width: size * 1.5,
          height: size * 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <motion.div
          style={{
            width: size,
            height: size,
            maskImage: 'url(/gryf-ai-logo.svg)',
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskImage: 'url(/gryf-ai-logo.svg)',
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            transformOrigin: '43.86% 51.54%',
          }}
          className="bg-brand-gold"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>
      {label && (
        <motion.span
          className="text-sm text-brand-gold/60 font-semibold tracking-wide"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          {label}
        </motion.span>
      )}
    </div>
  );
};
