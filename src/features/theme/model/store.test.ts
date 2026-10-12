// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { THEME_STORAGE_KEY, getInitialPreference, getInitialTheme, useThemeStore } from './store'

/** `matchMedia` whose answer to "does the system prefer dark" is given by the test. */
function mockSystemTheme(dark: boolean): void {
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: dark && query.includes('prefers-color-scheme: dark'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

beforeEach(() => {
  localStorage.clear()
  useThemeStore.setState({ mode: 'light', preference: 'system' })
})

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('useThemeStore preference', () => {
  it('remembers an explicit choice and applies it', () => {
    useThemeStore.getState().setPreference('dark')
    expect(useThemeStore.getState().preference).toBe('dark')
    expect(useThemeStore.getState().mode).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

    useThemeStore.getState().setPreference('light')
    expect(useThemeStore.getState().preference).toBe('light')
    expect(useThemeStore.getState().mode).toBe('light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })

  it('follows the operating system and forgets the saved choice for "system"', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    mockSystemTheme(true)
    useThemeStore.getState().setPreference('system')
    expect(useThemeStore.getState().preference).toBe('system')
    expect(useThemeStore.getState().mode).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })

  it('resolves "system" to light when the operating system is light', () => {
    useThemeStore.setState({ mode: 'dark', preference: 'dark' })
    mockSystemTheme(false)
    useThemeStore.getState().setPreference('system')
    expect(useThemeStore.getState().mode).toBe('light')
  })

  it('still applies the choice when the storage refuses to save it', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => {
      useThemeStore.getState().setPreference('dark')
    }).not.toThrow()
    expect(useThemeStore.getState().mode).toBe('dark')
    expect(useThemeStore.getState().preference).toBe('dark')
  })

  it('starts from "system" when nothing is saved and from the saved value otherwise', () => {
    expect(getInitialPreference()).toBe('system')
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    expect(getInitialPreference()).toBe('dark')
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    expect(getInitialPreference()).toBe('light')
  })

  it('treats anything else in the storage as no choice', () => {
    mockSystemTheme(true)
    for (const garbage of ['system', 'blue', '', 'DARK', '{"mode":"dark"}']) {
      localStorage.setItem(THEME_STORAGE_KEY, garbage)
      expect(getInitialPreference()).toBe('system')
      expect(getInitialTheme()).toBe('dark')
    }
  })
})

describe('useThemeStore following the operating system', () => {
  /** Loads a fresh copy of the store and returns it with a function that flips the system theme. */
  async function loadStore(systemDark: boolean) {
    let dark = systemDark
    const listeners: (() => void)[] = []
    vi.resetModules()
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => {
      const media = {
        get matches() {
          return dark && query.includes('prefers-color-scheme: dark')
        },
        media: query,
        addEventListener: (_type: string, listener: () => void) => {
          listeners.push(listener)
        },
        removeEventListener: vi.fn(),
      }
      return media as unknown as MediaQueryList
    })
    const fresh = await import('./store')
    return {
      store: fresh.useThemeStore,
      setSystemDark: (value: boolean) => {
        dark = value
        for (const listener of listeners) {
          listener()
        }
      },
    }
  }

  it('subscribes to the system theme and switches with it while the preference is "system"', async () => {
    const { store, setSystemDark } = await loadStore(false)
    expect(store.getState().preference).toBe('system')
    expect(store.getState().mode).toBe('light')

    setSystemDark(true)
    expect(store.getState().mode).toBe('dark')
    expect(store.getState().preference).toBe('system')

    setSystemDark(false)
    expect(store.getState().mode).toBe('light')
  })

  it('keeps an explicit choice when the system theme changes', async () => {
    const { store, setSystemDark } = await loadStore(false)
    store.getState().setPreference('light')

    setSystemDark(true)
    expect(store.getState().mode).toBe('light')
    expect(store.getState().preference).toBe('light')
  })

  it('goes back to following the system after "system" is chosen again', async () => {
    const { store, setSystemDark } = await loadStore(false)
    store.getState().setPreference('light')
    store.getState().setPreference('system')

    setSystemDark(true)
    expect(store.getState().mode).toBe('dark')
  })
})

describe('getInitialTheme', () => {
  it('returns saved theme from localStorage when "dark"', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    expect(getInitialTheme()).toBe('dark')
  })

  it('returns saved theme from localStorage when "light" even if system prefers dark', () => {
    mockSystemTheme(true)
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    expect(getInitialTheme()).toBe('light')
  })

  it('returns "dark" when no stored theme but system prefers dark mode', () => {
    mockSystemTheme(true)
    expect(getInitialTheme()).toBe('dark')
  })

  it('defaults to "light" when no stored theme and system does not prefer dark', () => {
    mockSystemTheme(false)
    expect(getInitialTheme()).toBe('light')
  })

  it('falls back to "light" when localStorage throws security error', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Access denied')
    })
    expect(getInitialTheme()).toBe('light')
  })
})
