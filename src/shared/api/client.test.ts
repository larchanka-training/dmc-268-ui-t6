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

const mockUserFixture = {
  id: 114473628,
  login: 'skvertl',
  name: 'Denis Skvertl',
  avatarUrl: null,
}

describe('apiClient', () => {
  const originalFetch = globalThis.fetch
  const testEndpoint: Endpoint = { method: 'GET', path: '/test' }

  beforeEach(() => {
    setAccessToken(null)
    setMockTransport(null)
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    setAccessToken(null)
    setMockTransport(null)
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

  it('handles 401 by attempting refresh and retrying request on success with user fixture', async () => {
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
      // Call to /api/auth/refresh returns 200 with new token conforming to AuthSession schema
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accessToken: 'refreshed-token',
            tokenType: 'Bearer',
            expiresIn: 900,
            user: mockUserFixture,
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

  it('triggers onUnauthorized and resets token when refresh returns 401', async () => {
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
      .mockResolvedValueOnce(
        new Response('Invalid refresh cookie', {
          status: 401,
          statusText: 'Unauthorized',
        }),
      )

    globalThis.fetch = mockFetch

    await expect(apiClient(testEndpoint)).rejects.toThrow(ApiError)
    expect(getAccessToken()).toBeNull()
    expect(onUnauthorized).toHaveBeenCalled()
  })

  it('rejects and resets token when refresh response does not match RefreshResponseSchema', async () => {
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
          user: mockUserFixture,
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

  it('coalesces concurrent 401s into single refresh and retries both requests', async () => {
    setAccessToken('expired_token_1')
    let refreshResolve: (res: Response) => void = vi.fn()
    const refreshPromise = new Promise<Response>((resolve) => {
      refreshResolve = resolve
    })

    let req1Count = 0
    let req2Count = 0

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/auth/refresh')) {
        return refreshPromise
      }
      if (url.includes('/resource-1')) {
        req1Count++
        if (req1Count === 1) {
          return Promise.resolve(new Response('Unauthorized', { status: 401 }))
        }
        return Promise.resolve(
          new Response(JSON.stringify({ item: 1 }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        )
      }
      if (url.includes('/resource-2')) {
        req2Count++
        if (req2Count === 1) {
          return Promise.resolve(new Response('Unauthorized', { status: 401 }))
        }
        return Promise.resolve(
          new Response(JSON.stringify({ item: 2 }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        )
      }
      return Promise.resolve(new Response(null, { status: 404 }))
    })
    globalThis.fetch = mockFetch

    const ep1: Endpoint = { method: 'GET', path: '/resource-1' }
    const ep2: Endpoint = { method: 'GET', path: '/resource-2' }

    // Start two concurrent requests that both receive 401
    const promise1 = apiClient<{ item: number }>(ep1)
    const promise2 = apiClient<{ item: number }>(ep2)

    // Wait until refresh is requested
    await vi.waitFor(() => {
      const refreshCalls = mockFetch.mock.calls.filter(([url]) =>
        String(url).includes('/auth/refresh'),
      )
      expect(refreshCalls).toHaveLength(1)
    })

    // Now resolve the refresh response with AuthSession schema fixture
    refreshResolve(
      new Response(
        JSON.stringify({
          accessToken: 'coalesced_new_token',
          tokenType: 'Bearer',
          expiresIn: 900,
          user: mockUserFixture,
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )

    const [res1, res2] = await Promise.all([promise1, promise2])
    expect(res1).toEqual({ item: 1 })
    expect(res2).toEqual({ item: 2 })

    // Verify exactly one refresh call was executed across both concurrent requests
    const refreshCalls = mockFetch.mock.calls.filter(([url]) =>
      String(url).includes('/auth/refresh'),
    )
    expect(refreshCalls).toHaveLength(1)
    expect(getAccessToken()).toBe('coalesced_new_token')
  })

  it('does not trigger a second refresh and logs out if retry also gets 401', async () => {
    const onUnauthorized = vi.fn()
    setOnUnauthorized(onUnauthorized)
    setAccessToken('stale-token')

    let requestCount = 0
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/auth/refresh')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              accessToken: 'refreshed-once-token',
              tokenType: 'Bearer',
              expiresIn: 900,
              user: mockUserFixture,
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        )
      }
      requestCount++
      // Both the first attempt and the retried attempt return 401
      return Promise.resolve(new Response('Unauthorized', { status: 401 }))
    })
    globalThis.fetch = mockFetch

    await expect(apiClient(testEndpoint)).rejects.toThrow(ApiError)
    expect(requestCount).toBe(2) // 1st try + 1 retry

    const refreshCalls = mockFetch.mock.calls.filter(([url]) =>
      String(url).includes('/auth/refresh'),
    )
    expect(refreshCalls).toHaveLength(1) // only 1 refresh call, no infinite loop
    expect(onUnauthorized).toHaveBeenCalled()
  })

  it('does not call refresh when receiving 401 on /auth/* endpoints', async () => {
    const onUnauthorized = vi.fn()
    setOnUnauthorized(onUnauthorized)

    const mockFetch = vi.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 }))
    globalThis.fetch = mockFetch

    const authEndpoint: Endpoint = { method: 'GET', path: '/auth/me' }
    await expect(apiClient(authEndpoint)).rejects.toThrow(ApiError)

    const refreshCalls = mockFetch.mock.calls.filter(([url]) =>
      String(url).includes('/auth/refresh'),
    )
    expect(refreshCalls).toHaveLength(0)
  })

  it('sends refresh with credentials: include and retried request with new Authorization: Bearer', async () => {
    setAccessToken('token_v1')
    let requestCount = 0

    const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/auth/refresh')) {
        expect(init?.credentials).toBe('include')
        return Promise.resolve(
          new Response(
            JSON.stringify({
              accessToken: 'token_v2',
              tokenType: 'Bearer',
              expiresIn: 900,
              user: mockUserFixture,
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        )
      }

      requestCount++
      if (requestCount === 1) {
        const headers = new Headers(init?.headers)
        expect(headers.get('Authorization')).toBe('Bearer token_v1')
        return Promise.resolve(new Response('Unauthorized', { status: 401 }))
      }

      const headers = new Headers(init?.headers)
      expect(headers.get('Authorization')).toBe('Bearer token_v2')
      return Promise.resolve(
        new Response(JSON.stringify({ verified: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
    })
    globalThis.fetch = mockFetch

    const result = await apiClient<{ verified: boolean }>(testEndpoint)
    expect(result).toEqual({ verified: true })
    expect(requestCount).toBe(2)
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
