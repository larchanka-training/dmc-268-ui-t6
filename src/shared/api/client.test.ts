// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  apiClient,
  ApiError,
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
  setMockTransport,
  setOnUnauthorized,
} from './client'
import type { Endpoint } from './endpoints'

describe('apiClient', () => {
  const originalFetch = globalThis.fetch
  const testEndpoint: Endpoint = { method: 'GET', path: '/test' }

  beforeEach(() => {
    setAccessToken(null)
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    setAccessToken(null)
  })

  it('manages in-memory access token correctly', () => {
    expect(getAccessToken()).toBeNull()
    setAccessToken('sample-jwt-token')
    expect(getAccessToken()).toBe('sample-jwt-token')
    setAccessToken(null)
    expect(getAccessToken()).toBeNull()
  })

  it('adds Authorization Bearer header when token is in memory', async () => {
    setAccessToken('in-memory-token')

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
    expect(headers.get('Authorization')).toBe('Bearer in-memory-token')
    expect(requestInit?.credentials).toBe('include')
    expect(result).toEqual({ ok: true })
  })

  it('handles 401 by attempting refresh and retrying request on success', async () => {
    setAccessToken('expired-token')

    const mockFetch = vi
      .fn()
      // First call to /test returns 401
      .mockResolvedValueOnce(
        new Response('Unauthorized', {
          status: 401,
          statusText: 'Unauthorized',
        }),
      )
      // Call to /api/auth/refresh returns 200 with new token conforming to schema
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accessToken: 'refreshed-token',
            tokenType: 'Bearer',
            expiresIn: 900,
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      )
      // Retried call to /test returns 200
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )

    globalThis.fetch = mockFetch

    const result = await apiClient<{ success: boolean }>(testEndpoint)
    expect(result).toEqual({ success: true })
    expect(getAccessToken()).toBe('refreshed-token')
  })

  it('handles 401 when refresh fails by clearing token and invoking onUnauthorized', async () => {
    const onUnauthorized = vi.fn()
    setOnUnauthorized(onUnauthorized)
    setAccessToken('expired-token')

    const mockFetch = vi
      .fn()
      // First call to /test returns 401
      .mockResolvedValueOnce(
        new Response('Unauthorized', {
          status: 401,
          statusText: 'Unauthorized',
        }),
      )
      // Call to /api/auth/refresh returns 401
      .mockResolvedValueOnce(
        new Response('Refresh Expired', {
          status: 401,
          statusText: 'Unauthorized',
        }),
      )

    globalThis.fetch = mockFetch

    await expect(apiClient(testEndpoint)).rejects.toThrow(ApiError)
    expect(getAccessToken()).toBeNull()
    expect(onUnauthorized).toHaveBeenCalled()
  })

  it('handles 401 when refresh response fails Zod schema validation', async () => {
    const onUnauthorized = vi.fn()
    setOnUnauthorized(onUnauthorized)
    setAccessToken('expired-token')

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('Unauthorized', {
          status: 401,
          statusText: 'Unauthorized',
        }),
      )
      // Invalid response lacking tokenType and expiresIn
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ invalid: 'format' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )

    globalThis.fetch = mockFetch

    await expect(apiClient(testEndpoint)).rejects.toThrow(ApiError)
    expect(getAccessToken()).toBeNull()
    expect(onUnauthorized).toHaveBeenCalled()
  })

  it('routes refreshAccessToken through mockTransportHandler when configured', async () => {
    const mockHandler = vi.fn().mockImplementation((endpoint: Endpoint) => {
      if (endpoint.path === '/auth/refresh') {
        return {
          accessToken: 'mock_refreshed_token',
          tokenType: 'Bearer',
          expiresIn: 900,
        }
      }
      return undefined
    })

    setMockTransport(mockHandler)

    const token = await refreshAccessToken()
    expect(token).toBe('mock_refreshed_token')
    expect(getAccessToken()).toBe('mock_refreshed_token')
    expect(mockHandler).toHaveBeenCalledTimes(1)

    setMockTransport(null)
  })

  it('coalesces concurrent refreshAccessToken calls into a single promise', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          accessToken: 'coalesced_token',
          tokenType: 'Bearer',
          expiresIn: 900,
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )
    globalThis.fetch = mockFetch

    const [token1, token2] = await Promise.all([refreshAccessToken(), refreshAccessToken()])

    expect(token1).toBe('coalesced_token')
    expect(token2).toBe('coalesced_token')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('retries with updated token without second refresh if already refreshed', async () => {
    setAccessToken('new_already_refreshed_token')

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ retry: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    globalThis.fetch = mockFetch

    // Request was sent with stale 'old_stale_token', but in-memory token is already 'new_already_refreshed_token'
    const result = await apiClient<{ retry: boolean }>(testEndpoint, {
      token: 'old_stale_token',
    })

    expect(result).toEqual({ retry: true })
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
