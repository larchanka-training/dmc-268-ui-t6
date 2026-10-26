// Public API of the interface language. Every text a user reads comes from the dictionaries in
// `locales/`; `pnpm lint` rejects Cyrillic text anywhere else in src/.
export { Trans, useTranslation } from 'react-i18next'
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
