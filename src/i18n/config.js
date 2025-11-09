import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import he from './locales/he.json'

// Get saved language from localStorage or default to Hebrew
const savedLanguage = localStorage.getItem('language') || 'he'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      he: { translation: he }
    },
    lng: savedLanguage,
    fallbackLng: 'he',
    interpolation: {
      escapeValue: false // React already safes from xss
    }
  })

export default i18n
