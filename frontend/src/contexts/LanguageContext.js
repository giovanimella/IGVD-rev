import React, { createContext, useContext, useState, useEffect } from 'react';
import ptBR from '../locales/pt-BR.json';
import en from '../locales/en.json';
import es from '../locales/es.json';

const translations = {
  'pt-BR': ptBR,
  'en': en,
  'es': es
};

const languageNames = {
  'pt-BR': 'Português (Brasil)',
  'en': 'English',
  'es': 'Español'
};

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Get saved language or default to pt-BR
    const saved = localStorage.getItem('uniozoxx_language');
    return saved || 'pt-BR';
  });

  const [t, setT] = useState(translations[language] || translations['pt-BR']);

  useEffect(() => {
    // Update translations when language changes
    setT(translations[language] || translations['pt-BR']);
    // Save to localStorage
    localStorage.setItem('uniozoxx_language', language);
    // Set HTML lang attribute
    document.documentElement.lang = language;
  }, [language]);

  // Helper function to get nested translation
  const translate = (key) => {
    const keys = key.split('.');
    let result = t;
    for (const k of keys) {
      if (result && result[k]) {
        result = result[k];
      } else {
        // Return key if translation not found
        return key;
      }
    }
    return result;
  };

  const value = {
    language,
    setLanguage,
    t,
    translate,
    languageNames,
    availableLanguages: Object.keys(translations)
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;
