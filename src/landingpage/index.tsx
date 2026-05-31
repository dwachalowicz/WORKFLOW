import React, { useRef, useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { LandingTranslationProvider } from './LandingTranslationContext';
import { Navbar } from './Navbar';
import { FloatingLandingNav } from './FloatingLandingNav';
import { HeroSection } from './HeroSection';
import { RadialMenuSection } from './RadialMenuSection';
import { FeaturesSection } from './FeaturesSection';
import { WorkflowSection } from './WorkflowSection';
import { OrganizationSection } from './OrganizationSection';
import { StatsSection } from './StatsSection';
import { StepsSection } from './StepsSection';
import { CasesSection } from './CasesSection';
import { PricingSection } from './PricingSection';
import { Footer } from './Footer';
import { WorkflowConnections } from './WorkflowConnections';

export const LandingPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Force dark mode on landing page regardless of dashboard theme setting.
  // Brand color is still read from localStorage by useThemeToggle in child components.
  useLayoutEffect(() => {
    const html = document.documentElement;
    const savedTheme = localStorage.getItem('gryf-theme');
    html.classList.add('dark');

    return () => {
      // Restore original theme on unmount (e.g. navigating to dashboard)
      if (savedTheme === 'light') {
        html.classList.remove('dark');
      }
    };
  }, []);

  useEffect(() => {
    if (location.hash) {
      setTimeout(() => {
        const id = location.hash.replace('#', '');
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.hash]);

  return (
    <LandingTranslationProvider>
      <div className="min-h-screen font-sans selection:bg-brand-gold/30">
        <Navbar />
        <FloatingLandingNav />
        <main className="relative">
          <HeroSection />
          <div ref={containerRef} className="bg-[#f1f4f6] bg-[radial-gradient(#ffffff_1.5px,transparent_1.5px)] [background-size:30px_30px] relative w-full z-0">
            <WorkflowConnections containerRef={containerRef} />
            <RadialMenuSection />
            <FeaturesSection />
            <WorkflowSection />
            <OrganizationSection />
            <StatsSection />
          </div>
          <StepsSection />
          <CasesSection />
          <PricingSection />
        </main>
        <Footer />
      </div>
    </LandingTranslationProvider>
  );
};
