import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight } from 'lucide-react';
import { useLandingTranslation } from './LandingTranslationContext';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useThemeToggle, THEME_COLORS } from '../hooks/useThemeToggle';

interface FullScreenMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FullScreenMobileMenu: React.FC<FullScreenMobileMenuProps> = ({ isOpen, onClose }) => {
  const { language, setLanguage, t } = useLandingTranslation();
  const { isAuthenticated, logout } = useAuthStore();
  const { brandColor, changeBrandColor } = useThemeToggle();
  const navigate = useNavigate();

  // Close on ESC key press
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-landing-card flex flex-col animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-[5%] md:px-16 py-6">
        <div className="flex items-center gap-2 group relative cursor-pointer" onClick={() => { onClose(); window.location.href = '/'; }}>
          <div className="h-12 w-12 bg-brand-gold" style={{ WebkitMaskImage: 'url(/gryf-ai-logo.svg)', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskImage: 'url(/gryf-ai-logo.svg)', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center' }}></div>
        </div>
        <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-colors">
          <X size={28} />
        </button>
      </div>

      {/* Main Links */}
      <div className="flex-1 flex flex-col justify-center px-[10%] md:px-24 gap-6 sm:gap-8 overflow-y-auto py-8">
        <a href="#oferta" onClick={onClose} className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white hover:text-brand-gold transition-colors flex items-center gap-4 group uppercase tracking-tight">
          {t('landing.fullscreenmobilemenu.text1')}
          <ArrowRight className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-brand-gold" size={36} />
        </a>
        <a href="/page/regulamin" onClick={onClose} className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white hover:text-brand-gold transition-colors flex items-center gap-4 group uppercase tracking-tight">
          {t('landing.fullscreenmobilemenu.text2')}
          <ArrowRight className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-brand-gold" size={36} />
        </a>
        <a href="#plany" onClick={onClose} className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white hover:text-brand-gold transition-colors flex items-center gap-4 group uppercase tracking-tight">
          {t('landing.fullscreenmobilemenu.text3')}
          <ArrowRight className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-brand-gold" size={36} />
        </a>
        <a href="/dashboard" onClick={onClose} className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-brand-gold hover:text-white transition-colors flex items-center gap-4 group uppercase tracking-tight">
          {t('landing.fullscreenmobilemenu.text4')}
          <ArrowRight className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-white" size={36} />
        </a>
      </div>

      {/* Footer */}
      <div className="pb-8 px-[10%] md:px-24 flex flex-col w-full mt-auto gap-8">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-8">
          {/* Theme Colors */}
          <div className="flex flex-col gap-3">
            <p className="text-white/30 text-xs font-semibold tracking-widest uppercase">{t('landing.fullscreenmobilemenu.text5')}</p>
            <div className="flex gap-3 items-center">
              {THEME_COLORS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => changeBrandColor(c.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${brandColor === c.value ? 'border-white shadow-glow scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Social Media */}
          <div className="flex flex-col gap-3">
            <p className="text-white/30 text-xs font-semibold tracking-widest uppercase sm:text-right">{t('landing.fullscreenmobilemenu.text9')}</p>
            <div className="flex items-center gap-3 text-white/70 text-xs font-bold">
              <a href="https://www.facebook.com/gryfai" target="_blank" rel="noreferrer" className="hover:text-white transition-colors border border-white/10 rounded-full w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10">fb</a>
              <a href="https://x.com/gryf_ai" target="_blank" rel="noreferrer" className="hover:text-white transition-colors border border-white/10 rounded-full w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10">X</a>
              <a href="https://www.youtube.com/@gryf-ai" target="_blank" rel="noreferrer" className="hover:text-white transition-colors border border-white/10 rounded-full w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10">YT</a>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-white/10">
          <button 
            onClick={() => setLanguage(language === 'pl' ? 'en' : 'pl')}
            className="text-sm font-semibold tracking-widest text-brand-gold border border-brand-gold/30 rounded-full px-6 py-2 uppercase transition-all duration-300 hover:bg-brand-gold hover:text-white hover:scale-105 hover:shadow-none hover:border-transparent"
          >
            {language}
          </button>
          
          {isAuthenticated ? (
            <button onClick={() => { onClose(); logout(); }} className="text-sm font-medium text-white/50 hover:text-white uppercase tracking-wider transition-colors">
              {t('landing.fullscreenmobilemenu.text7')}
            </button>
          ) : (
            <button onClick={() => { onClose(); navigate('/login'); }} className="text-sm font-medium text-white/50 hover:text-white uppercase tracking-wider transition-colors">
              {t('landing.fullscreenmobilemenu.text8')}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
