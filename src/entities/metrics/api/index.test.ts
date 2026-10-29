import { describe, expect, it } from 'vitest'

import { metricsSummaryEndpoint } from './index'

describe('metricsSummaryEndpoint', () => {
  it('sends the range and omits repo when it is absent', () => {
    expect(metricsSummaryEndpoint({ range: '7d' }).path).toBe('/metrics/summary?range=7d')
  })

  it('sends the range as given and encodes the repo', () => {
    expect(metricsSummaryEndpoint({ range: '30d', repo: 'org/repo' }).path).toBe(
      '/metrics/summary?range=30d&repo=org%2Frepo',
    )
  })

  it('rejects an unknown range before the request is sent', () => {
    expect(() => metricsSummaryEndpoint({ range: '1h' as '7d' })).toThrow()
  })
})
