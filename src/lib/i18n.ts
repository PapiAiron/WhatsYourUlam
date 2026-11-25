import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en.json';
import fil from '@/locales/fil.json';

let savedLocale: string | null = null;
try {
  savedLocale = typeof window !== 'undefined' ? window.localStorage.getItem('smp_locale') : null;
} catch {
  savedLocale = null;
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fil: { translation: fil },
  },
  lng: savedLocale === 'fil' ? 'fil' : 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
