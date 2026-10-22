import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { translations } from '../translations';

const STORAGE_KEY = 'farmer-dost-language';
const LanguageContext = createContext(null);

function initialLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && translations[stored] ? stored : 'en';
  } catch { return 'en'; }
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(initialLanguage);
  const setLanguage = useCallback((next) => {
    if (!translations[next]) return;
    setLanguageState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Preference remains active for this visit. */ }
  }, []);
  const t = useCallback((key) => translations[language][key] ?? translations.en[key] ?? key, [language]);
  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
