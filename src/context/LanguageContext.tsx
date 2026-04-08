'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Language = 'EN' | 'JP';

type LanguageContextProps = {
  lang: Language;
  toggleLang: () => void;
};

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Language>('EN');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('petra-lang') as Language | null;
    if (saved) setLang(saved);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('petra-lang', lang);
  }, [lang, mounted]);

  const toggleLang = () => setLang(prev => (prev === 'EN' ? 'JP' : 'EN'));

  if (!mounted) return <div className="hidden" />;

  return (
    <LanguageContext.Provider value={{ lang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
