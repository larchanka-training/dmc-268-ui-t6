import { describe, expect, it } from 'vitest'

import { endpoints, resolveUrl } from './endpoints'

describe('endpoints', () => {
  it('builds the run action response endpoint', () => {
    expect(endpoints.runs.actionResponse('abc', 3)).toEqual({
      method: 'GET',
      path: '/runs/abc/actions/3/response',
    })
  })

  it('builds the cancel endpoint with POST', () => {
    expect(endpoints.runs.cancel('x').method).toBe('POST')
  })

  it('resolves a URL against a base with a trailing slash', () => {
    expect(resolveUrl('/api/', endpoints.stream())).toBe('/api/stream')
  })
})
