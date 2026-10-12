import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark'
/** What the user picked. `system` follows the operating system and is the default. */
export type ThemePreference = ThemeMode | 'system'

interface ThemeState {
  /** The theme in effect, with `system` already resolved. */
  mode: ThemeMode
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

export const THEME_STORAGE_KEY = 'dmc_theme_mode'

function systemTheme(): ThemeMode {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function savedTheme(): ThemeMode | null {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    return saved === 'dark' || saved === 'light' ? saved : null
  } catch {
    return null
  }
}

function persist(preference: ThemePreference): void {
  try {
    if (preference === 'system') {
      localStorage.removeItem(THEME_STORAGE_KEY)
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, preference)
    }
  } catch {
    // ignore
  }
}

export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  return savedTheme() ?? systemTheme()
}

export function getInitialPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  return savedTheme() ?? 'system'
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: getInitialTheme(),
  preference: getInitialPreference(),
  setPreference: (preference: ThemePreference) => {
    persist(preference)
    set({ preference, mode: preference === 'system' ? systemTheme() : preference })
  },
}))

// While the preference is `system`, follow the operating system as it changes.
if (typeof window !== 'undefined') {
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (useThemeStore.getState().preference === 'system') {
        useThemeStore.setState({ mode: systemTheme() })
      }
    })
  } catch {
    // matchMedia is unavailable: the theme simply stays as resolved at start
  }
}
