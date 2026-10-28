import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { formatDateTime, formatDuration, formatNumber } from './format'
import { i18n } from './i18n'

// A runner in UTC (CI) would pass the "in UTC" tests with no `timeZone` at all: the file runs in a
// zone far from it, so a lost `timeZone: 'UTC'` shows up as another hour.
const runnerZone = process.env.TZ
beforeAll(() => {
  process.env.TZ = 'Asia/Tokyo'
})
afterAll(() => {
  if (runnerZone === undefined) {
    delete process.env.TZ
  } else {
    process.env.TZ = runnerZone
  }
})

afterEach(() => {
  void i18n.changeLanguage('ru')
})

describe('formatting by language', () => {
  it('writes a date and time in the English notation, in UTC', () => {
    void i18n.changeLanguage('en')
    expect(formatDateTime('2026-10-14T09:30:15.123Z')).toBe('10/14/2026, 09:30:15')
    expect(formatDateTime('2026-10-14T12:30:15+03:00')).toBe('10/14/2026, 09:30:15')
  })

  it('writes a date and time in the Russian notation, in UTC', () => {
    void i18n.changeLanguage('ru')
    expect(formatDateTime('2026-10-14T09:30:15.123Z')).toBe('14.10.2026, 09:30:15')
  })

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

  it('groups digits and writes the decimal mark of the language', () => {
    void i18n.changeLanguage('en')
    expect(formatNumber(12345.5)).toBe('12,345.5')
    void i18n.changeLanguage('ru')
    // Russian groups thousands with a no-break space.
    expect(formatNumber(12345.5)).toBe('12 345,5')
  })
})
