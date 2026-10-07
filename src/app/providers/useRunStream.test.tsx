// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../shared/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/config/env')>()
  return {
    ...actual,
    isMockMode: vi.fn(),
  }
})

import { useAuthStore } from '../../features/auth'
import { setAccessToken } from '../../shared/api/client'
import { isMockMode } from '../../shared/config/env'
import { useRunStreamSubscription } from './useRunStream'

function streamRequests(fetchSpy: ReturnType<typeof vi.fn>): unknown[] {
  return fetchSpy.mock.calls.filter(([url]) => String(url).includes('/stream'))
}

describe('useRunStreamSubscription', () => {
  const originalFetch = globalThis.fetch
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchSpy = vi
      .fn()
      .mockImplementation(() => Promise.resolve(new Response(null, { status: 503 })))
    globalThis.fetch = fetchSpy as typeof fetch
    setAccessToken('token_a')
    useAuthStore.setState({ isAuthenticated: true })
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    setAccessToken(null)
    useAuthStore.setState({ isAuthenticated: false })
    vi.resetAllMocks()
  })

  it('sends no request to the stream endpoint when the app runs on mocks', async () => {
    vi.mocked(isMockMode).mockReturnValue(true)

    const { unmount } = renderHook(() => {
      useRunStreamSubscription()
    })
    await act(async () => {
      await Promise.resolve()
    })
    unmount()

    expect(streamRequests(fetchSpy)).toEqual([])
  })

  it('requests the stream endpoint when the app does not run on mocks', async () => {
    vi.mocked(isMockMode).mockReturnValue(false)

    const { unmount } = renderHook(() => {
      useRunStreamSubscription()
    })
    await act(async () => {
      await Promise.resolve()
    })
    unmount()

    expect(streamRequests(fetchSpy)).toHaveLength(1)
  })
})
