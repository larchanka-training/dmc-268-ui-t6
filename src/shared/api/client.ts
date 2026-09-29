import { API_BASE_URL } from '../config/env'
import type { Endpoint } from './endpoints'
import { endpoints, resolveUrl } from './endpoints'
import { RefreshResponseSchema, type RefreshResponse } from './schemas'

export { RefreshResponseSchema, type RefreshResponse }

export interface RequestOptions extends Omit<RequestInit, 'method' | 'body'> {
  body?: unknown
  token?: string | null
  _isRetry?: boolean
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly data: unknown,
  ) {
    super(`API Error ${String(status)}: ${statusText}`)
    this.name = 'ApiError'
  }
}

let inMemoryAccessToken: string | null = null
let authErrorHandler: (() => void) | null = null

export type MockTransportHandler = (endpoint: Endpoint, options: RequestOptions) => unknown

let mockTransportHandler: MockTransportHandler | null = null

export function setMockTransport(handler: MockTransportHandler | null): void {
  mockTransportHandler = handler
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken
}

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token
}

export function setOnUnauthorized(handler: () => void): void {
  authErrorHandler = handler
}

let refreshPromise: Promise<string | null> | null = null

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      let rawData: unknown

      if (mockTransportHandler) {
        const mockResult = await mockTransportHandler(endpoints.auth.refresh(), {
          credentials: 'include',
        })
        if (mockResult !== undefined) {
          rawData = mockResult
        }
      }

      if (rawData === undefined) {
        const url = resolveUrl(API_BASE_URL, endpoints.auth.refresh())
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        if (!res.ok) {
          setAccessToken(null)
          authErrorHandler?.()
          return null
        }

        rawData = await res.json()
      }

      const parseResult = RefreshResponseSchema.safeParse(rawData)
      if (!parseResult.success) {
        setAccessToken(null)
        authErrorHandler?.()
        return null
      }

      setAccessToken(parseResult.data.accessToken)
      return parseResult.data.accessToken
    } catch {
      setAccessToken(null)
      authErrorHandler?.()
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export async function apiClient<T>(endpoint: Endpoint, options: RequestOptions = {}): Promise<T> {
  if (mockTransportHandler) {
    const mockResult = await mockTransportHandler(endpoint, options)
    if (mockResult !== undefined) {
      return mockResult as T
    }
  }

  const url = resolveUrl(API_BASE_URL, endpoint)
  const token = options.token !== undefined ? options.token : getAccessToken()

  const headers = new Headers(options.headers)

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let body: BodyInit | undefined
  if (options.body !== undefined) {
    if (typeof options.body === 'string') {
      body = options.body
    } else {
      headers.set('Content-Type', 'application/json')
      body = JSON.stringify(options.body)
    }
  }

  const response = await fetch(url, {
    ...options,
    method: endpoint.method,
    headers,
    body,
    credentials: options.credentials ?? 'include',
  })

  // Handle 401 Unauthorized with token refresh for non-auth endpoints
  if (response.status === 401) {
    const isAuthEndpoint = endpoint.path.startsWith('/auth/')
    if (!isAuthEndpoint && !options._isRetry) {
      const currentToken = getAccessToken()
      if (token && currentToken && currentToken !== token) {
        return apiClient<T>(endpoint, {
          ...options,
          token: currentToken,
          _isRetry: true,
        })
      }

      const newToken = await refreshAccessToken()
      if (newToken) {
        return apiClient<T>(endpoint, {
          ...options,
          token: newToken,
          _isRetry: true,
        })
      }
    } else {
      setAccessToken(null)
      authErrorHandler?.()
    }
  }

  if (!response.ok) {
    let errorData: unknown
    try {
      const rawText = await response.text()
      try {
        errorData = JSON.parse(rawText)
      } catch {
        errorData = rawText
      }
    } catch {
      errorData = null
    }
    throw new ApiError(response.status, response.statusText, errorData)
  }

  if (response.status === 204) {
    return null as T
  }

  const rawText = await response.text()
  if (!rawText) {
    return null as T
  }

  try {
    return JSON.parse(rawText) as T
  } catch {
    return rawText as unknown as T
  }
}
