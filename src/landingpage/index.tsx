import React, { useRef, useEffect, useLayoutEffect, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { LandingTranslationProvider } from './LandingTranslationContext';
import { Navbar } from './Navbar';
import { FloatingLandingNav } from './FloatingLandingNav';
import { HeroSection } from './HeroSection';

// Lazy-load below-the-fold sections to reduce initial bundle
const RadialMenuSection = lazy(() => import('./RadialMenuSection').then(m => ({ default: m.RadialMenuSection })));
const FeaturesSection = lazy(() => import('./FeaturesSection').then(m => ({ default: m.FeaturesSection })));
const WorkflowSection = lazy(() => import('./WorkflowSection').then(m => ({ default: m.WorkflowSection })));
const OrganizationSection = lazy(() => import('./OrganizationSection').then(m => ({ default: m.OrganizationSection })));
const StatsSection = lazy(() => import('./StatsSection').then(m => ({ default: m.StatsSection })));
const StepsSection = lazy(() => import('./StepsSection').then(m => ({ default: m.StepsSection })));
const CasesSection = lazy(() => import('./CasesSection').then(m => ({ default: m.CasesSection })));
const PricingSection = lazy(() => import('./PricingSection').then(m => ({ default: m.PricingSection })));
const Footer = lazy(() => import('./Footer').then(m => ({ default: m.Footer })));
const WorkflowConnections = lazy(() => import('./WorkflowConnections').then(m => ({ default: m.WorkflowConnections })));

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
          <Suspense fallback={<div className="w-full h-96 animate-pulse bg-[#e8ebee]" />}>
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
          </Suspense>
        </main>
        <Suspense fallback={<div className="w-full h-32 animate-pulse bg-[#1a1a1a]" />}>
          <Footer />
        </Suspense>
      </div>
    </LandingTranslationProvider>
  );
};
