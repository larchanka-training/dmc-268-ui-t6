import { create } from 'zustand'

import { i18n, persistLanguage, toLanguage, type Language } from '../../../shared/i18n'

interface LanguageState {
  /** The language in effect. English until the user picks another one. */
  language: Language
  setLanguage: (language: Language) => void
}

/**
 * The interface language, stored like the theme (`features/theme`): the choice is saved in
 * localStorage and applied at once, without a reload. The i18next instance is the source of
 * truth; the store follows it, so a change made elsewhere (a test) is seen here too.
 */
export const useLanguageStore = create<LanguageState>(() => ({
  language: toLanguage(i18n.language),
  setLanguage: (language: Language) => {
    persistLanguage(language)
    void i18n.changeLanguage(language)
  },
}))

i18n.on('languageChanged', (language) => {
  useLanguageStore.setState({ language: toLanguage(language) })
})
