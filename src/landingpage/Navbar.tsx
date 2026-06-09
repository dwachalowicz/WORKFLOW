import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { FullScreenMobileMenu } from './FullScreenMobileMenu';
import { LanguageSelector } from './components/LanguageSelector';
import { UserMenuDropdown } from './components/UserMenuDropdown';
import { NavLinks } from './components/NavLinks';

export const Navbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="w-full max-w-[1600px] mx-auto px-[5%] md:px-16 flex items-center justify-between py-6 absolute top-0 left-1/2 transform -translate-x-1/2 z-50">
      {/* Left Logo (Gryf Sygnet) */}
      <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.location.href = '/'}>
        <div className="h-12 w-12 bg-brand-gold" style={{ WebkitMaskImage: 'url(/gryf-ai-logo.svg)', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskImage: 'url(/gryf-ai-logo.svg)', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center' }}></div>
        <div className="flex flex-col items-start leading-tight">
          <span className="text-white font-black text-xl tracking-wider">flow.gryf.ai</span>
          <span className="text-white/50 text-[10px] font-bold tracking-[0.2em] uppercase mt-0.5">v0.1.3 Beta</span>
        </div>
      </div>

      {/* Center Links */}
      <div className="hidden md:flex items-center gap-12 text-[13px] font-medium text-white/50 uppercase tracking-wide">
        <NavLinks variant="static" />
      </div>

      {/* Right side (Language + Avatar with Pro Badge + Hamburger) */}
      <div className="flex items-center gap-4 md:gap-6">
        
        {/* Language Selector */}
        <LanguageSelector />
        
        {/* User Menu */}
        <UserMenuDropdown />

        {/* Hamburger Button */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden text-white/70 hover:text-white transition-colors p-1"
        >
          <Menu size={24} />
        </button>
      </div>

      <FullScreenMobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </nav>
  );
};
