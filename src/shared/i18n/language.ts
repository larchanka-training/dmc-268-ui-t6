/** Languages of the interface. English is the default for a new user. */
export const LANGUAGES = ['en', 'ru'] as const
export type Language = (typeof LANGUAGES)[number]

export const DEFAULT_LANGUAGE: Language = 'en'
export const LANGUAGE_STORAGE_KEY = 'dmc_language'

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value)
}

/** The language a value names, or the default one for anything else. */
export function toLanguage(value: unknown): Language {
  return isLanguage(value) ? value : DEFAULT_LANGUAGE
}

function savedLanguage(): Language | null {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return isLanguage(saved) ? saved : null
  } catch {
    return null
  }
}

/** The saved choice, or English when there is none (or no browser storage at all). */
export function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE
  return savedLanguage() ?? DEFAULT_LANGUAGE
}

export function persistLanguage(language: Language): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // ignore: the choice still applies until the page is reloaded
  }
}
