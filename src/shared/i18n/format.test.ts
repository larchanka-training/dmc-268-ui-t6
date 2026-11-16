import { afterEach, describe, expect, it } from 'vitest'

import { formatDuration, formatNumber, formatUsd } from './format'
import { i18n } from './i18n'

afterEach(() => {
  void i18n.changeLanguage('ru')
})

describe('formatting by language', () => {
  it('writes durations with English units', () => {
    void i18n.changeLanguage('en')
    expect(formatDuration(400)).toBe('<1 sec')
    expect(formatDuration(19_000)).toBe('19 sec')
    expect(formatDuration(125_000)).toBe('2 min 5 sec')
  })

  it('turns to whole seconds at one second and to minutes at one minute', () => {
    void i18n.changeLanguage('en')
    expect(formatDuration(999)).toBe('<1 sec')
    expect(formatDuration(1000)).toBe('1 sec')
    expect(formatDuration(1999.5)).toBe('1 sec')
    expect(formatDuration(59_999)).toBe('59 sec')
    expect(formatDuration(60_000)).toBe('1 min 0 sec')
  })

  it('writes durations with Russian units', () => {
    void i18n.changeLanguage('ru')
    expect(formatDuration(400)).toBe('<1 с')
    expect(formatDuration(19_000)).toBe('19 с')
    expect(formatDuration(125_000)).toBe('2 мин 5 с')
  })

  it('writes zero dollars without cents and keeps two decimals otherwise', () => {
    expect(formatUsd(0)).toBe('$0')
    expect(formatUsd(1.5)).toBe('$1.50')
    expect(formatUsd(0.2)).toBe('$0.20')
  })

  it('groups digits and writes the decimal mark of the language', () => {
    void i18n.changeLanguage('en')
    expect(formatNumber(12345.5)).toBe('12,345.5')
    void i18n.changeLanguage('ru')
    // Russian groups thousands with a no-break space.
    expect(formatNumber(12345.5)).toBe('12 345,5')
  })
})
