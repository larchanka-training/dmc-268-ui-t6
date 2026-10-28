// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getInitialLanguage, LANGUAGE_STORAGE_KEY, persistLanguage } from './language'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
  vi.resetModules()
})

describe('interface language', () => {
  it('is English for a new user', () => {
    expect(getInitialLanguage()).toBe('en')
  })

  it('starts a fresh app in English when nothing is saved', async () => {
    // A fresh module graph of its own, not one left by the order of the tests.
    vi.resetModules()
    const { i18n } = await import('./i18n')
    expect(i18n.language).toBe('en')
    expect(i18n.t('layout.nav.runs')).toBe('Runs')
  })

  it('keeps the saved choice after a reload', async () => {
    persistLanguage('ru')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ru')
    // A reload is a fresh copy of the module graph reading the same storage.
    vi.resetModules()
    const { i18n } = await import('./i18n')
    expect(i18n.language).toBe('ru')
    expect(i18n.t('layout.nav.runs')).toBe('Прогоны')
  })

  it('treats anything else in the storage as no choice', () => {
    for (const garbage of ['de', '', 'RU', 'ru-RU', '{"lang":"ru"}']) {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, garbage)
      expect(getInitialLanguage()).toBe('en')
    }
  })

  it('still starts when the storage cannot be read or written', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(getInitialLanguage()).toBe('en')
    expect(() => {
      persistLanguage('ru')
    }).not.toThrow()
  })
})
