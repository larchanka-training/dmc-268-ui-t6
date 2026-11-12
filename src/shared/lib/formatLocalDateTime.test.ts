import { afterEach, describe, expect, it, vi } from 'vitest'

import { i18n } from '../i18n'
import { formatLocalDateTime } from './formatLocalDateTime'

afterEach(async () => {
  vi.unstubAllEnvs()
  await i18n.changeLanguage('ru')
})

describe('formatLocalDateTime', () => {
  it('shows the next calendar day in Tokyo with English notation', async () => {
    vi.stubEnv('TZ', 'Asia/Tokyo')
    await i18n.changeLanguage('en')
    expect(formatLocalDateTime('2026-09-18T23:30:00Z')).toBe('09/19/2026, 08:30:00')
  })

  it('shows the earlier local hour in Los Angeles with Russian notation', async () => {
    vi.stubEnv('TZ', 'America/Los_Angeles')
    await i18n.changeLanguage('ru')
    expect(formatLocalDateTime('2026-09-18T23:30:00Z')).toBe('18.09.2026, 16:30:00')
  })

  it('changes notation when the interface language changes', async () => {
    vi.stubEnv('TZ', 'Asia/Tokyo')
    await i18n.changeLanguage('en')
    expect(formatLocalDateTime('2026-09-18T23:30:00Z')).toBe('09/19/2026, 08:30:00')
    await i18n.changeLanguage('ru')
    expect(formatLocalDateTime('2026-09-18T23:30:00Z')).toBe('19.09.2026, 08:30:00')
  })
})
