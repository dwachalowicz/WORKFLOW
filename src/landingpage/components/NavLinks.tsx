import React from 'react';
import { useLandingTranslation } from '../LandingTranslationContext';
import { useAuthStore } from '../../store/authStore';

interface NavLinksProps {
  variant?: 'floating' | 'static';
}

export const NavLinks: React.FC<NavLinksProps> = ({ variant = 'static' }) => {
  const { t } = useLandingTranslation();
  const { isAuthenticated } = useAuthStore();

  const isFloating = variant === 'floating';

  const baseClass = isFloating
    ? "px-4 py-2 text-[13px] font-medium text-white/70 hover:text-white hover:bg-white/5 rounded-full transition-colors uppercase tracking-wider"
    : "hover:text-white transition-colors";

  const appClass = isFloating
    ? "px-4 py-2 text-[13px] font-medium text-[#1a1b1e] bg-brand-gold rounded-full transition-all duration-300 hover:bg-brand-gold hover:text-white hover:scale-105 hover:shadow-none hover:border-transparent uppercase tracking-wider"
    : "hover:text-white transition-colors";

  return (
    <>
      <a href="/#oferta" className={baseClass}>
        {t('landing.navlinks.text1')}
      </a>
      <a href="/faq" className={baseClass}>
        FAQ
      </a>
      <a href="/page/regulamin" className={baseClass}>
        {t('landing.navlinks.text2')}
      </a>
      <a href="/#plany" className={baseClass}>
        {t('landing.navlinks.text3')}
      </a>
      {isFloating ? (
        <a href="/dashboard" className={appClass}>
          {t('landing.navlinks.text4')}
        </a>
      ) : (
        <a href={isAuthenticated ? "/dashboard" : "/login"} className={appClass}>
          {isAuthenticated ? (t('landing.navlinks.text5')) : (t('landing.navlinks.text6'))}
        </a>
      )}
    </>
  );
};
