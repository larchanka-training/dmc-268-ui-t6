import { describe, expect, it } from 'vitest'

import { parseAnalyticsFilter, writeAnalyticsFilter } from './analyticsFilter'

describe('parseAnalyticsFilter', () => {
  it('reads 7d and 30d and keeps a foreign param out of the filter', () => {
    expect(parseAnalyticsFilter(new URLSearchParams('range=30d&tab=x'))).toEqual({ range: '30d' })
    expect(parseAnalyticsFilter(new URLSearchParams('range=7d&repo=org/a'))).toEqual({
      range: '7d',
      repo: 'org/a',
    })
  })

  it('treats a missing range and a hand-written 24h as 7d', () => {
    expect(parseAnalyticsFilter(new URLSearchParams(''))).toEqual({ range: '7d' })
    expect(parseAnalyticsFilter(new URLSearchParams('range=24h'))).toEqual({ range: '7d' })
    expect(parseAnalyticsFilter(new URLSearchParams('range=1h'))).toEqual({ range: '7d' })
  })

  it('drops an empty or overlong repo', () => {
    expect(parseAnalyticsFilter(new URLSearchParams('repo='))).toEqual({ range: '7d' })
    expect(parseAnalyticsFilter(new URLSearchParams(`repo=${'a'.repeat(513)}`))).toEqual({
      range: '7d',
    })
  })
})

describe('writeAnalyticsFilter', () => {
  it('writes 7d or 30d, never 24h, and keeps a foreign param', () => {
    const next = writeAnalyticsFilter(new URLSearchParams('range=24h&tab=x'), {
      range: '7d',
      repo: 'org/a',
    })
    expect(next.get('range')).toBe('7d')
    expect(next.get('repo')).toBe('org/a')
    expect(next.get('tab')).toBe('x')
    expect(next.toString()).not.toContain('24h')
  })

  it('removes the repo and keeps the selected period', () => {
    const next = writeAnalyticsFilter(new URLSearchParams('range=30d&repo=org/a'), { range: '30d' })
    expect(next.get('range')).toBe('30d')
    expect(next.has('repo')).toBe(false)
  })
})
