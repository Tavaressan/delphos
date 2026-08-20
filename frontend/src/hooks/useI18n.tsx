import React, { createContext, useContext, useState, ReactNode } from 'react';

type Locale = 'pt-BR' | 'en';

type Translations = {
  [key in Locale]: {
    [key: string]: string;
  };
};

const translations: Translations = {
  'pt-BR': {
    greeting: 'Olá',
    // add more translations here
  },
  'en': {
    greeting: 'Hello',
    // add more translations here
  }
};

type I18nContextType = {
  locale: Locale;
  t: (key: string) => string;
  changeLanguage: (lang: Locale) => void;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('pt-BR');

  const t = (key: string) => {
    return translations[locale][key] || key;
  };

  const changeLanguage = (lang: Locale) => {
    setLocale(lang);
  };

  return (
    <I18nContext.Provider value={{ locale, t, changeLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
