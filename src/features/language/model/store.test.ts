// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import { i18n, LANGUAGE_STORAGE_KEY } from '../../../shared/i18n'
import { useLanguageStore } from './store'

afterEach(() => {
  localStorage.clear()
})

describe('useLanguageStore', () => {
  it('applies the choice at once and saves it', () => {
    useLanguageStore.getState().setLanguage('en')
    expect(i18n.language).toBe('en')
    expect(useLanguageStore.getState().language).toBe('en')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en')

    useLanguageStore.getState().setLanguage('ru')
    expect(i18n.language).toBe('ru')
    expect(useLanguageStore.getState().language).toBe('ru')
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ru')
  })

  it('follows a change made on the i18n instance directly', () => {
    void i18n.changeLanguage('en')
    expect(useLanguageStore.getState().language).toBe('en')
  })
})
