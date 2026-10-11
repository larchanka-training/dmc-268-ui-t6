// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { THEME_STORAGE_KEY, getInitialPreference, getInitialTheme, useThemeStore } from './store'

describe('useThemeStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useThemeStore.setState({ mode: 'light' })
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('toggles mode from light to dark and back', () => {
    expect(useThemeStore.getState().mode).toBe('light')
    useThemeStore.getState().toggleTheme()
    expect(useThemeStore.getState().mode).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

    useThemeStore.getState().toggleTheme()
    expect(useThemeStore.getState().mode).toBe('light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })

  it('sets theme explicitly', () => {
    useThemeStore.getState().setTheme('dark')
    expect(useThemeStore.getState().mode).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })
})

describe('useThemeStore preference', () => {
  beforeEach(() => {
    localStorage.clear()
    useThemeStore.setState({ mode: 'light', preference: 'system' })
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('remembers an explicit choice and applies it', () => {
    useThemeStore.getState().setPreference('dark')
    expect(useThemeStore.getState().preference).toBe('dark')
    expect(useThemeStore.getState().mode).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('follows the operating system and forgets the saved choice for "system"', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: query.includes('prefers-color-scheme: dark'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    useThemeStore.getState().setPreference('system')
    expect(useThemeStore.getState().preference).toBe('system')
    expect(useThemeStore.getState().mode).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })

  it('turns a toggle into an explicit choice', () => {
    useThemeStore.getState().toggleTheme()
    expect(useThemeStore.getState().preference).toBe('dark')
  })

  it('starts from "system" when nothing is saved and from the saved value otherwise', () => {
    expect(getInitialPreference()).toBe('system')
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    expect(getInitialPreference()).toBe('dark')
  })
})

describe('getInitialTheme', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('returns saved theme from localStorage when "dark"', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    expect(getInitialTheme()).toBe('dark')
  })

  it('returns saved theme from localStorage when "light" even if system prefers dark', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: query.includes('prefers-color-scheme: dark'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    expect(getInitialTheme()).toBe('light')
  })

  it('returns "dark" when no stored theme but system prefers dark mode', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: query.includes('prefers-color-scheme: dark'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    expect(getInitialTheme()).toBe('dark')
  })

  it('defaults to "light" when no stored theme and system does not prefer dark', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    expect(getInitialTheme()).toBe('light')
  })

  it('falls back to "light" when localStorage throws security error', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Access denied')
    })

    expect(getInitialTheme()).toBe('light')
  })
})
