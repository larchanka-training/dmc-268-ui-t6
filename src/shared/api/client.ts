import { API_BASE_URL } from '../config/env'
import type { Endpoint } from './endpoints'
import { resolveUrl } from './endpoints'

export interface RequestOptions extends Omit<RequestInit, 'method' | 'body'> {
  body?: unknown
  token?: string | null
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

let authErrorHandler: (() => void) | null = null

export function setOnUnauthorized(handler: () => void) {
  authErrorHandler = handler
}

export const AUTH_TOKEN_KEY = 'dmc_auth_token'

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token)
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY)
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export async function apiClient<T>(endpoint: Endpoint, options: RequestOptions = {}): Promise<T> {
  const url = resolveUrl(API_BASE_URL, endpoint)
  const token = options.token !== undefined ? options.token : getStoredToken()

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
  })

  if (response.status === 401) {
    authErrorHandler?.()
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
