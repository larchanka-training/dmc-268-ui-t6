import type { Language } from './language'

/**
 * The name of each language in that language itself («English», «Русский»), the same in every
 * interface language: a user who cannot read the current one still finds their own. The only
 * Cyrillic outside the dictionaries; `eslint.config.js` lets this file through the guard.
 */
export const LANGUAGE_NAMES: Readonly<Record<Language, string>> = {
  en: 'English',
  ru: 'Русский',
}
