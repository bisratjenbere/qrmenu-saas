'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Locale, ADMIN_TRANSLATIONS, t as translate } from '@qrmenu/shared';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'EN',
  setLocale: () => {},
  toggleLanguage: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('EN');

  useEffect(() => {
    const saved = localStorage.getItem('admin_locale') as Locale;
    if (saved === 'EN' || saved === 'AM') {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('admin_locale', newLocale);
  };

  const toggleLanguage = () => {
    setLocale(locale === 'EN' ? 'AM' : 'EN');
  };

  const t = (key: string) => translate(key, locale);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
