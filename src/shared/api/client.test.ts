// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AUTH_TOKEN_KEY,
  apiClient,
  ApiError,
  getStoredToken,
  setOnUnauthorized,
  setStoredToken,
} from './client'
import type { Endpoint } from './endpoints'

describe('apiClient', () => {
  const originalFetch = globalThis.fetch
  const testEndpoint: Endpoint = { method: 'GET', path: '/test' }

  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('manages token storage correctly', () => {
    expect(getStoredToken()).toBeNull()
    setStoredToken('sample-jwt-token')
    expect(getStoredToken()).toBe('sample-jwt-token')
    setStoredToken(null)
    expect(getStoredToken()).toBeNull()
  })

  it('adds Authorization Bearer header when token is stored', async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'stored-token')

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    globalThis.fetch = mockFetch

    const result = await apiClient<{ ok: boolean }>(testEndpoint)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [requestUrl, requestInit] = (mockFetch.mock.calls[0] ?? []) as [
      string | undefined,
      RequestInit | undefined,
    ]
    expect(requestUrl).toBeDefined()
    const headers = new Headers(requestInit?.headers)
    expect(headers.get('Authorization')).toBe('Bearer stored-token')
    expect(result).toEqual({ ok: true })
  })

  it('handles 401 Unauthorized by invoking the callback', async () => {
    const onUnauthorized = vi.fn()
    setOnUnauthorized(onUnauthorized)

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('Unauthorized', {
        status: 401,
        statusText: 'Unauthorized',
      }),
    )

    await expect(apiClient(testEndpoint)).rejects.toThrow(ApiError)
    expect(onUnauthorized).toHaveBeenCalled()
  })

  it('serializes json body and sets content-type for POST requests', async () => {
    const postEndpoint: Endpoint = { method: 'POST', path: '/create' }
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    )
    globalThis.fetch = mockFetch

    await apiClient(postEndpoint, { body: { name: 'demo' } })

    const [requestUrl, requestInit] = (mockFetch.mock.calls[0] ?? []) as [
      string | undefined,
      RequestInit | undefined,
    ]
    expect(requestUrl).toBeDefined()
    const headers = new Headers(requestInit?.headers)
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(requestInit?.body).toBe(JSON.stringify({ name: 'demo' }))
  })
})
