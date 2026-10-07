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

  it('builds the rerun endpoint with POST', () => {
    expect(endpoints.runs.rerun('x')).toEqual({
      method: 'POST',
      path: '/runs/x/rerun',
    })
  })

  it('builds auth endpoints correctly', () => {
    expect(endpoints.auth.githubCallback()).toEqual({
      method: 'POST',
      path: '/auth/github/callback',
    })
    expect(endpoints.auth.refresh()).toEqual({
      method: 'POST',
      path: '/auth/refresh',
    })
    expect(endpoints.auth.me()).toEqual({
      method: 'GET',
      path: '/auth/me',
    })
    expect(endpoints.auth.logout()).toEqual({
      method: 'POST',
      path: '/auth/logout',
    })
  })

  it('builds repository endpoints correctly', () => {
    expect(endpoints.repos.list()).toEqual({
      method: 'GET',
      path: '/repos',
    })
    expect(endpoints.repos.detail('repo-123')).toEqual({
      method: 'GET',
      path: '/repos/repo-123',
    })
    expect(endpoints.repos.update('repo-123')).toEqual({
      method: 'PATCH',
      path: '/repos/repo-123',
    })
  })

  it('resolves a URL against a base with a trailing slash', () => {
    expect(resolveUrl('/api/', endpoints.stream())).toBe('/api/stream')
  })
})
