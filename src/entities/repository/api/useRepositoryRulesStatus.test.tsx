// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { disabledRagIndex, type RulesStatus } from '../model/schemas'
import {
  REPOSITORIES_QUERY_KEY,
  repoRulesStatusQueryKey,
  useRepositoryRulesStatus,
  useUpdateRepository,
} from './index'

const FIRST_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const SECOND_ID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
const FIRST_SHA = '1111111111111111111111111111111111111111'
const SECOND_SHA = '2222222222222222222222222222222222222222'

const REPO = {
  id: FIRST_ID,
  fullName: 'org/first',
  url: 'https://github.com/org/first',
  defaultBranch: 'main',
  enabled: true,
  defaultEngine: 'fast',
  waitForCi: 'auto',
  maxComments: 10,
  reviewEvent: 'COMMENT',
  branchFilter: [],
  severityThreshold: 'all',
  installationAvailable: true,
  ragEnabled: false,
  ragIndex: disabledRagIndex,
}

function missingStatus(sha: string): RulesStatus {
  return {
    status: 'missing',
    branch: 'main',
    path: '.review/rules.md',
    checkedAt: '2026-10-14T09:30:00.000Z',
    sha,
    defaultsVersion: '2026-10-01',
  }
}

interface Backend {
  rulesRequests: string[]
  patches: number
  fetchMock: ReturnType<typeof vi.fn<typeof fetch>>
}

/** The network: rules status per repository (a promise of the body), the list and a PATCH. */
function stubBackend(
  rules: (id: string) => Promise<Response> = (id) =>
    Promise.resolve(
      new Response(JSON.stringify(missingStatus(id === FIRST_ID ? FIRST_SHA : SECOND_SHA))),
    ),
): Backend {
  const backend: Backend = {
    rulesRequests: [],
    patches: 0,
    fetchMock: vi.fn<typeof fetch>((input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const match = /^\/api\/repos\/([^/]+)\/rules-status$/.exec(url)
      if (match?.[1] !== undefined) {
        backend.rulesRequests.push(match[1])
        return rules(match[1])
      }
      if (init?.method === 'PATCH') {
        backend.patches += 1
        return Promise.resolve(new Response(JSON.stringify({ ...REPO, maxComments: 3 })))
      }
      return Promise.resolve(new Response(JSON.stringify([REPO])))
    }),
  }
  vi.stubGlobal('fetch', backend.fetchMock)
  return backend
}

// The app's own defaults: a fresh query is not refetched on mount unless the hook insists.
function appLikeClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } })
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('useRepositoryRulesStatus', () => {
  it('fetches the rules status of the repository and parses it', async () => {
    const backend = stubBackend()
    const client = appLikeClient()

    const { result } = renderHook(() => useRepositoryRulesStatus(FIRST_ID, { enabled: true }), {
      wrapper: wrapper(client),
    })

    await waitFor(() => {
      expect(result.current.data?.status).toBe('missing')
    })
    expect(result.current.data?.sha).toBe(FIRST_SHA)
    expect(backend.fetchMock.mock.calls[0]?.[0]).toBe(`/api/repos/${FIRST_ID}/rules-status`)
  })

  it('sends no request while it is disabled', async () => {
    const backend = stubBackend()
    const client = appLikeClient()

    const { result } = renderHook(() => useRepositoryRulesStatus(FIRST_ID, { enabled: false }), {
      wrapper: wrapper(client),
    })

    // Give a request the time it would need to start.
    await act(async () => {
      await Promise.resolve()
    })
    expect(backend.fetchMock).not.toHaveBeenCalled()
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('fails on a body that is not a rules status', async () => {
    stubBackend(() => Promise.resolve(new Response(JSON.stringify({ status: 'present' }))))
    const client = appLikeClient()

    const { result } = renderHook(() => useRepositoryRulesStatus(FIRST_ID, { enabled: true }), {
      wrapper: wrapper(client),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    expect(result.current.data).toBeUndefined()
  })

  it('keeps the key outside the repos prefix', async () => {
    stubBackend()
    const client = appLikeClient()

    const { result } = renderHook(() => useRepositoryRulesStatus(FIRST_ID, { enabled: true }), {
      wrapper: wrapper(client),
    })
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(repoRulesStatusQueryKey(FIRST_ID)).toEqual(['repoRulesStatus', FIRST_ID])
    expect(client.getQueryCache().findAll({ queryKey: REPOSITORIES_QUERY_KEY })).toHaveLength(0)
    expect(client.getQueryData(repoRulesStatusQueryKey(FIRST_ID))).toMatchObject({
      status: 'missing',
    })
  })

  it('refetches when reopened', async () => {
    const backend = stubBackend()
    const client = appLikeClient()

    const first = renderHook(() => useRepositoryRulesStatus(FIRST_ID, { enabled: true }), {
      wrapper: wrapper(client),
    })
    await waitFor(() => {
      expect(first.result.current.isSuccess).toBe(true)
    })
    first.unmount()
    expect(backend.rulesRequests).toHaveLength(1)

    // The cached answer is fresh for 30 s, yet reopening the page asks again.
    const second = renderHook(() => useRepositoryRulesStatus(FIRST_ID, { enabled: true }), {
      wrapper: wrapper(client),
    })

    await waitFor(() => {
      expect(backend.rulesRequests).toHaveLength(2)
    })
    await waitFor(() => {
      expect(second.result.current.isFetching).toBe(false)
    })
  })

  it('drops the answer when its last viewer leaves, so a reopen starts empty', async () => {
    stubBackend()
    const client = appLikeClient()

    const first = renderHook(() => useRepositoryRulesStatus(FIRST_ID, { enabled: true }), {
      wrapper: wrapper(client),
    })
    await waitFor(() => {
      expect(first.result.current.isSuccess).toBe(true)
    })
    first.unmount()
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(client.getQueryData(repoRulesStatusQueryKey(FIRST_ID))).toBeUndefined()
  })

  it('does not hand the answer for one repository to another', async () => {
    let releaseSecond: (response: Response) => void = () => undefined
    stubBackend((id) =>
      id === FIRST_ID
        ? Promise.resolve(new Response(JSON.stringify(missingStatus(FIRST_SHA))))
        : new Promise<Response>((resolve) => {
            releaseSecond = resolve
          }),
    )
    const client = appLikeClient()

    const { result, rerender } = renderHook(
      ({ id }) => useRepositoryRulesStatus(id, { enabled: true }),
      { wrapper: wrapper(client), initialProps: { id: FIRST_ID } },
    )
    await waitFor(() => {
      expect(result.current.data?.sha).toBe(FIRST_SHA)
    })

    rerender({ id: SECOND_ID })

    // No placeholder: the first repository's answer is gone while the second one loads.
    expect(result.current.data).toBeUndefined()
    expect(result.current.isPending).toBe(true)
    releaseSecond(new Response(JSON.stringify(missingStatus(SECOND_SHA))))
    await waitFor(() => {
      expect(result.current.data?.sha).toBe(SECOND_SHA)
    })
  })

  it('does not cancel or refetch rules on a settings save', async () => {
    let releaseRules: (response: Response) => void = () => undefined
    const backend = stubBackend(
      () =>
        new Promise<Response>((resolve) => {
          releaseRules = resolve
        }),
    )
    const client = appLikeClient()
    client.setQueryData(REPOSITORIES_QUERY_KEY, [REPO])

    const { result } = renderHook(
      () => ({
        rules: useRepositoryRulesStatus(FIRST_ID, { enabled: true }),
        update: useUpdateRepository(),
      }),
      { wrapper: wrapper(client) },
    )
    await waitFor(() => {
      expect(backend.rulesRequests).toHaveLength(1)
    })

    // The rules request is in flight when the save starts and settles.
    await act(async () => {
      await result.current.update.mutateAsync({ id: FIRST_ID, patch: { maxComments: 3 } })
    })
    expect(backend.patches).toBe(1)
    releaseRules(new Response(JSON.stringify(missingStatus(FIRST_SHA))))

    await waitFor(() => {
      expect(result.current.rules.data?.sha).toBe(FIRST_SHA)
    })
    expect(backend.rulesRequests).toHaveLength(1)
  })
})
