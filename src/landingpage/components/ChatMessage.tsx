import React, { useContext } from 'react';
import { motion, useInView } from 'framer-motion';
import { ChatAnimationContext } from './ChatAnimationContext';

export const TypewriterText: React.FC<{ text: string, delay?: number, speed?: number }> = ({ text, delay = 0, speed = 10 }) => {
  const [displayedText, setDisplayedText] = React.useState('\u200B');
  const ref = React.useRef(null);
  
  // Try to use context if available, otherwise fallback to own in-view
  const context = useContext(ChatAnimationContext);
  const ownInView = useInView(ref, { once: false, amount: 0.1 });
  const isInView = context ? context.hasStarted : ownInView;
  
  React.useEffect(() => {
    if (isInView) {
      let interval: NodeJS.Timeout;
      const timeout = setTimeout(() => {
        let i = 0;
        interval = setInterval(() => {
          setDisplayedText(text.slice(0, i + 1));
          i++;
          if (i > text.length) clearInterval(interval);
        }, speed);
      }, delay * 1000);
      
      return () => {
        clearTimeout(timeout);
        clearInterval(interval);
      };
    } else {
      const t = setTimeout(() => setDisplayedText('\u200B'), 0);
      return () => clearTimeout(t);
    }
  }, [isInView, text, delay, speed]);

  return <span ref={ref}>{displayedText}</span>;
};

/**
 * Shared hook for context-aware delayed reveal.
 * Returns true while the element should be hidden (before its delay fires).
 */
function useContextDelay(delay: number): boolean {
  const context = useContext(ChatAnimationContext);
  const hasStarted = context?.hasStarted ?? false;
  const hasContext = !!context;
  const [timerFired, setTimerFired] = React.useState(false);

  React.useEffect(() => {
    if (!hasStarted) return;
    const t = setTimeout(() => setTimerFired(true), delay * 1000);
    return () => {
      clearTimeout(t);
      setTimerFired(false);
    };
  }, [hasStarted, delay]);

  if (!hasContext) return false;
  if (!hasStarted) return true;
  return !timerFired;
}

export const DelayedReveal: React.FC<{ delay: number, children: React.ReactNode }> = ({ delay, children }) => {
  const isDelayed = useContextDelay(delay);
  if (isDelayed) return null;
  return <>{children}</>;
};

interface ChatMessageProps {
  type: 'user' | 'ai';
  delay: number;
  children: React.ReactNode;
  isWide?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ type, delay, children, isWide = false }) => {
  const isUser = type === 'user';
  const context = useContext(ChatAnimationContext);
  const isDelayed = useContextDelay(delay);
  
  return (
    <motion.div 
      initial="hidden"
      animate={context?.hasStarted && !isDelayed ? "visible" : "hidden"}
      whileInView={!context ? "visible" : undefined}
      viewport={{ once: false, amount: 0.1 }}
      variants={{
        hidden: { opacity: 0, y: 10, transition: { duration: 0 } },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: context ? 0 : delay } }
      }}
      className={`${isUser ? 'self-end flex-row-reverse' : 'self-start'} items-start gap-3 ${isWide ? 'max-w-[95%]' : 'max-w-[88%]'}`}
      style={{ display: isDelayed ? 'none' : 'flex' }}
    >
      <div className={`w-8 h-8 rounded-full ${isUser ? 'bg-landing-section' : 'bg-[#0a0a0a]'} overflow-hidden shrink-0 flex items-center justify-center shadow-md`}>
        <img loading="lazy" 
          src={isUser ? "/landingpage/avatar-hero1.webp" : "/landingpage/avatar-gryf.webp"} 
          alt={isUser ? "User" : "Gryf AI Chatbot"} 
          className={`w-full h-full object-cover ${!isUser && 'scale-110'}`} 
        />
      </div>
      
      <div className={`text-[13.5px] shadow-sm ${
        isUser 
          ? 'bg-[#1f2024] text-[#eee] px-4 py-2.5 rounded-2xl rounded-tr-sm' 
          : 'bg-[#1d1e24] text-[#d4d4d4] p-4 rounded-2xl rounded-tl-sm'
      } ${!isUser && isWide ? 'flex flex-col gap-3 min-w-[240px]' : ''}`}>
        {children}
      </div>
    </motion.div>
  );
};
