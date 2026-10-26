import i18next, { type i18n as I18n } from 'i18next'
import { initReactI18next } from 'react-i18next'

import { getInitialLanguage, LANGUAGES } from './language'
import { en } from './locales/en'
import { ru } from './locales/ru'

export const resources = {
  en: { translation: en },
  ru: { translation: ru },
} as const

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: typeof en }
  }
}

/**
 * The one i18next instance of the app. The dictionaries are bundled, so it is ready right after
 * this module loads: no Suspense, no flash of keys. Code outside React reads texts with
 * `i18n.t(...)` at call time; a component calls `useTranslation()`, which also re-renders it
 * when the language changes.
 */
export const i18n: I18n = i18next.createInstance()

void i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  supportedLngs: LANGUAGES,
  initAsync: false,
  // React escapes the output itself.
  interpolation: { escapeValue: false },
})
