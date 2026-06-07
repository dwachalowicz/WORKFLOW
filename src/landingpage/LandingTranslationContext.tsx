import React, { createContext, useContext, useEffect, useState } from 'react';
import { pb, type LandingTranslation } from '../lib/pocketbase';
import i18n from '../i18n/config';
import { formatWidows } from '../lib/utils';

type Language = 'pl' | 'en';

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  isLoading: boolean;
}

const LandingTranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const LandingTranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('gryf-lang') as Language) || 'pl';
  });
  const [translations, setTranslations] = useState<Record<string, LandingTranslation>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        const records = await pb.collection('WORKFLOW_landing_translations').getFullList({
          requestKey: null,
        });
        const map: Record<string, LandingTranslation> = {};
        records.forEach(r => {
          map[r.key] = r;
        });
        setTranslations(map);
      } catch (error) {
        console.error('Failed to load landing translations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTranslations();
  }, []);

  const t = (key: string, fallback?: string) => {
    // 1. Check PocketBase database
    const record = translations[key];
    if (record && record[language]) {
      return formatWidows(record[language] as string);
    }
    
    // 2. Check i18next system (pl.ts / en.ts) directly through instance and force namespace/lang
    const i18nResult = i18n.t(key, { lng: language, ns: 'translation' });
    if (i18nResult && i18nResult !== key) {
      return formatWidows(i18nResult as string);
    }

    // 3. Fallback
    return formatWidows(fallback !== undefined ? fallback : key);
  };

  const setLanguage = (lang: Language) => {
    localStorage.setItem('gryf-lang', lang);
    setLanguageState(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <LandingTranslationContext.Provider value={{ language, setLanguage, t, isLoading }}>
      {children}
    </LandingTranslationContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useLandingTranslation = () => {
  const context = useContext(LandingTranslationContext);
  if (context === undefined) {
    throw new Error('useLandingTranslation must be used within a LandingTranslationProvider');
  }
  return context;
};
