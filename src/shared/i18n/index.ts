// Public API of the interface language. Every text a user reads comes from the dictionaries in
// `locales/`; `pnpm lint` rejects Cyrillic text anywhere else in src/.
// `errorReason` is the exception that stays Russian in both languages: the nine limit phrases.
export { useTranslation } from 'react-i18next'
export { errorReason } from './locales/ru/limitReasons'
export { formatDateTime, formatDuration, formatNumber } from './format'
export { i18n } from './i18n'
export {
  DEFAULT_LANGUAGE,
  getInitialLanguage,
  isLanguage,
  LANGUAGE_STORAGE_KEY,
  LANGUAGES,
  persistLanguage,
  toLanguage,
} from './language'
export type { Language } from './language'
export { LANGUAGE_NAMES } from './languageNames'
