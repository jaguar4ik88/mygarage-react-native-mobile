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

// Initialize i18n synchronously first
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'uk', // Default language
    fallbackLng: 'uk',
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


