import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark'

interface ThemeState {
  mode: ThemeMode
  toggleTheme: () => void
  setTheme: (mode: ThemeMode) => void
}

export const THEME_STORAGE_KEY = 'dmc_theme_mode'

export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'dark' || saved === 'light') {
      return saved
    }
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
  } catch {
    // ignore
  }
  return 'light'
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: getInitialTheme(),
  toggleTheme: () => {
    const next = get().mode === 'light' ? 'dark' : 'light'
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // ignore
    }
    set({ mode: next })
  },
  setTheme: (mode: ThemeMode) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode)
    } catch {
      // ignore
    }
    set({ mode })
  },
}))
