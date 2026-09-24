import { describe, expect, it } from 'vitest'

import { runApi } from './index'

const UUID = '0f3b2c1e-6a1d-4c8b-9e2f-1a2b3c4d5e6f'

describe('runApi', () => {
  it('parses an empty run list page', () => {
    expect(runApi.list.response.safeParse({ items: [], nextCursor: null }).success).toBe(true)
  })

  it('accepts a succeeded run.updated event and rejects an unknown status', () => {
    expect(runApi.stream.event.safeParse({ runId: UUID, status: 'succeeded' }).success).toBe(true)
    expect(runApi.stream.event.safeParse({ runId: UUID, status: 'unknown' }).success).toBe(false)
  })

  it('builds the detail endpoint path', () => {
    expect(runApi.detail.endpoint('id-1').path).toBe('/runs/id-1')
  })
})
