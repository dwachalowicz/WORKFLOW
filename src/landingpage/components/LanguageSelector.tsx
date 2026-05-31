import React, { useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLandingTranslation } from '../LandingTranslationContext';
import { useClickOutside } from '../../hooks/useClickOutside';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLandingTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => {
    if (isOpen) setIsOpen(false);
  });

  return (
    <div className="relative flex justify-center items-center h-10 w-10 shrink-0" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-0.5 text-white/70 hover:text-brand-gold transition-colors text-[11px] font-bold uppercase tracking-widest"
      >
        <span>{language}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+12px)] bg-landing-card border border-white/10 rounded-xl shadow-2xl py-1.5 min-w-[120px] z-[100] animate-in fade-in slide-in-from-top-2 duration-150">
          <button
            onClick={() => { setLanguage('pl'); setIsOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${language === 'pl' ? 'text-brand-gold' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
          >
            PL (Polski)
          </button>
          <button
            onClick={() => { setLanguage('en'); setIsOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${language === 'en' ? 'text-brand-gold' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
          >
            EN (English)
          </button>
        </div>
      )}
    </div>
  );
};
