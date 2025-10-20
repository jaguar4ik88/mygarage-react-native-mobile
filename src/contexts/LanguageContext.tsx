import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';

export type Language = 'uk' | 'en' | 'ru';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
  isLanguageLoaded: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>((i18n.language as Language) || 'uk');
  const [isLanguageLoaded, setIsLanguageLoaded] = useState(false);

  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('app_language');
        if (savedLanguage && (savedLanguage === 'uk' || savedLanguage === 'en' || savedLanguage === 'ru')) {
          await i18n.changeLanguage(savedLanguage);
          setLanguageState(savedLanguage as Language);
        } else {
          // Use auto-detected language from i18n initialization
          const current = (i18n.language as Language) || 'uk';
          setLanguageState(current);
        }
      } catch (error) {
        console.error('Error loading saved language:', error);
      } finally {
        setIsLanguageLoaded(true);
      }
    };
    loadSavedLanguage();

    // Sync local state when i18n language changes
    const handler = () => setLanguageState((i18n.language as Language) || 'uk');
    i18n.on('languageChanged', handler);
    return () => { i18n.off('languageChanged', handler); };
  }, []);

  const setLanguage = async (newLanguage: Language) => {
    try {
      console.log('Changing language to:', newLanguage);
      await i18n.changeLanguage(newLanguage);
      setLanguageState(newLanguage);
      await AsyncStorage.setItem('app_language', newLanguage);
      console.log('Language changed successfully to:', newLanguage);
    } catch (error) {
      console.error('Error saving language:', error);
      // Fallback to current language if change fails
      setLanguageState(i18n.language as Language || 'uk');
    }
  };

  const t = (key: string): string => {
    if (!i18n.isInitialized) {
      console.warn('i18n not initialized yet, returning key:', key);
      return key;
    }
    return i18n.t(key as any) as unknown as string;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isLanguageLoaded }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
    }
  return context;
};
