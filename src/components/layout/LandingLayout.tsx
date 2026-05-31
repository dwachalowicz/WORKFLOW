import React, { ReactNode } from 'react';
import { LandingTranslationProvider } from '../../landingpage/LandingTranslationContext';
import { Navbar } from '../../landingpage/Navbar';
import { FloatingLandingNav } from '../../landingpage/FloatingLandingNav';
import { Footer } from '../../landingpage/Footer';

interface LandingLayoutProps {
  children: ReactNode;
}

export const LandingLayout: React.FC<LandingLayoutProps> = ({ children }) => {
  return (
    <LandingTranslationProvider>
      <div className="min-h-screen font-sans selection:bg-brand-gold/30 bg-[#f1f4f6] text-[#1a1a1a] flex flex-col relative">
        {/* Dark banner for the transparent Navbar to sit on */}
        <div className="bg-[#111] h-[100px] absolute top-0 left-0 w-full z-0 pointer-events-none" />
        
        <Navbar />
        <FloatingLandingNav />
        <main className="relative pt-[120px] pb-24 flex-grow z-10 w-full">
          {children}
        </main>
        <Footer />
      </div>
    </LandingTranslationProvider>
  );
};
