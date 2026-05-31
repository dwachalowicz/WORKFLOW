import React, { useState, useEffect, useRef } from 'react';
// import { useLandingTranslation } from './LandingTranslationContext';
import { Menu, Palette } from 'lucide-react';
import { FullScreenMobileMenu } from './FullScreenMobileMenu';
import { useThemeToggle, THEME_COLORS } from '../hooks/useThemeToggle';
import { useClickOutside } from '../hooks/useClickOutside';
import { LanguageSelector } from './components/LanguageSelector';
import { UserMenuDropdown } from './components/UserMenuDropdown';
import { NavLinks } from './components/NavLinks';

const NavDivider = () => <div className="w-px h-6 bg-white/10 mx-1" />;

export const FloatingLandingNav: React.FC = () => {
  const { brandColor, changeBrandColor } = useThemeToggle();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const colorMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 150) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useClickOutside(colorMenuRef, () => {
    if (isColorMenuOpen) setIsColorMenuOpen(false);
  });

  return (
    <>
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 transform ${isScrolled ? 'translate-y-0 opacity-100' : '-translate-y-24 opacity-0 pointer-events-none'}`}>
        <div className="flex items-center gap-2 bg-landing-card/90 backdrop-blur-md rounded-full p-2 shadow-2xl border border-white/10">
          
          {/* Logo */}
          <div className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/5 transition-colors cursor-pointer" onClick={() => window.location.href = '/'}>
            <div className="h-6 w-6 bg-brand-gold" style={{ WebkitMaskImage: 'url(/gryf-ai-logo.svg)', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskImage: 'url(/gryf-ai-logo.svg)', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center' }}></div>
          </div>

          <NavDivider />

          {/* Center Links (Desktop only) */}
          <div className="hidden md:flex items-center gap-1 px-2">
            <NavLinks variant="floating" />
          </div>

          <div className="hidden md:block">
            <NavDivider />
          </div>

          {/* Right side tools */}
          <div className="flex items-center gap-2 pr-1">
            {/* Color Picker Toggle */}
            <div className="relative hidden md:block" ref={colorMenuRef}>
              <button 
                onClick={() => setIsColorMenuOpen(!isColorMenuOpen)}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${isColorMenuOpen ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/30' : 'bg-transparent text-white/70 hover:text-white hover:bg-white/10 border border-transparent'}`}
                title="Theme Color"
              >
                <Palette size={16} />
              </button>
              
              {isColorMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+12px)] bg-landing-card border border-white/10 rounded-xl shadow-2xl p-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-150 flex gap-2">
                  {THEME_COLORS.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => changeBrandColor(c.value)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${brandColor === c.value ? 'border-white shadow-glow scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Language Selector */}
            <LanguageSelector />
            
            {/* User Menu */}
            <UserMenuDropdown />

            {/* Hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-colors md:hidden"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </div>

      <FullScreenMobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </>
  );
};
