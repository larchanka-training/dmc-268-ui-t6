import { afterEach, describe, expect, it, vi } from 'vitest'

import { formatLocalDateTime } from './formatLocalDateTime'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('formatLocalDateTime', () => {
  it('shows the next calendar day in a timezone east of UTC', () => {
    vi.stubEnv('TZ', 'Asia/Tokyo')
    expect(formatLocalDateTime('2026-09-18T23:30:00Z')).toBe('2026-09-19 08:30:00')
  })

  it('shows the earlier local hour in a timezone west of UTC', () => {
    vi.stubEnv('TZ', 'America/Los_Angeles')
    expect(formatLocalDateTime('2026-09-18T23:30:00Z')).toBe('2026-09-18 16:30:00')
  })

  it('keeps the four-digit year layout for early dates', () => {
    vi.stubEnv('TZ', 'UTC')
    expect(formatLocalDateTime('0001-01-01T00:00:00Z')).toBe('0001-01-01 00:00:00')
  })
})
