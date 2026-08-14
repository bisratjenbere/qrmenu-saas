'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Locale, ct } from '@qrmenu/shared';

interface CustomerLanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const CustomerLanguageContext = createContext<CustomerLanguageContextType>({
  locale: 'AM',
  setLocale: () => {},
  toggleLanguage: () => {},
  t: (key: string) => key,
});

export function CustomerLanguageProvider({
  children,
  defaultLocale = 'AM',
}: {
  children: React.ReactNode;
  defaultLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const saved = localStorage.getItem('customer_locale') as Locale;
    if (saved === 'EN' || saved === 'AM') setLocaleState(saved);
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('customer_locale', newLocale);
  };

  const toggleLanguage = () => setLocale(locale === 'EN' ? 'AM' : 'EN');
  const t = (key: string) => ct(key, locale);

  return (
    <CustomerLanguageContext.Provider value={{ locale, setLocale, toggleLanguage, t }}>
      {children}
    </CustomerLanguageContext.Provider>
  );
}

export function useCustomerLanguage() {
  return useContext(CustomerLanguageContext);
}
