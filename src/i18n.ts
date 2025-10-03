import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import uk from './localization/uk.json';
import en from './localization/en.json';
import ru from './localization/ru.json';

const resources = {
  uk: { translation: uk },
  en: { translation: en },
  ru: { translation: ru },
};

// Determine initial language from device locale
const detectInitialLanguage = (): 'uk' | 'ru' | 'en' => {
  try {
    const locale = (Intl.DateTimeFormat().resolvedOptions().locale || '').toLowerCase();
    // Examples: 'uk', 'uk-ua', 'ru', 'ru-ru', 'en-us', etc.
    if (locale.startsWith('uk')) return 'uk';
    if (locale.startsWith('ru')) return 'ru';
    return 'en';
  } catch (_) {
    return 'en';
  }
};

const initialLanguage = detectInitialLanguage();

// Initialize i18n synchronously first
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage, // Device-based default language
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });

// Then load saved language asynchronously
const getLanguageTag = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem('app_language');
    if (savedLanguage && (savedLanguage === 'uk' || savedLanguage === 'en' || savedLanguage === 'ru')) {
      await i18n.changeLanguage(savedLanguage);
    }
  } catch (error) {
    console.error('Error loading saved language:', error);
  }
};

getLanguageTag();

export default i18n;


