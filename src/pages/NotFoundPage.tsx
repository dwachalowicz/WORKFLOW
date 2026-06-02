import React, { useLayoutEffect } from 'react';
import { useLandingTranslation, LandingTranslationProvider } from '../landingpage/LandingTranslationContext';
import { Navbar } from '../landingpage/Navbar';
import { Footer } from '../landingpage/Footer';
import { Link } from 'react-router-dom';

const NotFoundContent = () => {
  const { t } = useLandingTranslation();

  useLayoutEffect(() => {
    const html = document.documentElement;
    const savedTheme = localStorage.getItem('gryf-theme');
    html.classList.add('dark');

    return () => {
      if (savedTheme === 'light') {
        html.classList.remove('dark');
      }
    };
  }, []);

  return (
    <div className="min-h-screen font-sans selection:bg-brand-gold/30 bg-[#0f1115] text-white flex flex-col relative overflow-hidden">
      <Navbar />
      
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 pt-40 pb-16">
        <div className="text-center">
          <h1 className="text-8xl md:text-9xl font-bold text-brand-gold mb-4">
            {t('notFound.title', '404')}
          </h1>
          <h2 className="text-3xl md:text-4xl font-semibold mb-6 text-white">
            {t('notFound.subtitle', 'Nie znaleziono strony')}
          </h2>
          <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto mb-10">
            {t('notFound.desc', 'Strona, której szukasz nie istnieje, została usunięta lub zmieniono jej adres.')}
          </p>
          
          <Link 
            to="/" 
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-neutral-200 transition-all duration-300 transform hover:scale-105"
          >
            {t('notFound.backToHome', 'Wróć na stronę główną')}
          </Link>
        </div>
      </main>

      {/* Decorative background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-gold/10 rounded-full blur-[120px] pointer-events-none" />

      <Footer />
    </div>
  );
};

export const NotFoundPage: React.FC = () => {
  return (
    <LandingTranslationProvider>
      <NotFoundContent />
    </LandingTranslationProvider>
  );
};
