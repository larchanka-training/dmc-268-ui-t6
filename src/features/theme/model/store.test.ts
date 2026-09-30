// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { THEME_STORAGE_KEY, useThemeStore } from './store'

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
