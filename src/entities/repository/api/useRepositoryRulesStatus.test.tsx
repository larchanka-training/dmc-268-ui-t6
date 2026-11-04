// @vitest-environment jsdom
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { disabledRagIndex, type RulesStatus } from '../model/schemas'
import {
  REPOSITORIES_QUERY_KEY,
  repoRulesStatusQueryKey,
  useRepositoryRulesStatus,
  useRepositoryRulesStatusRetry,
  useUpdateRepository,
} from './index'

const FIRST_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const SECOND_ID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
const FIRST_SHA = '1111111111111111111111111111111111111111'
const SECOND_SHA = '2222222222222222222222222222222222222222'

const REPO = {
  provider: 'github',
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
    defaultsVersion: 'v1',
  }
}

const RULES_PATH = '.review/rules.md'
const CHECKED_AT = '2026-10-14T09:30:00.000Z'

function presentStatus(): RulesStatus {
  return {
    status: 'present',
    branch: 'main',
    path: RULES_PATH,
    checkedAt: CHECKED_AT,
    sha: FIRST_SHA,
    text: '# Rules',
    ignoreMasks: [],
    diagnostics: [],
  }
}

function invalidStatus(): RulesStatus {
  return {
    status: 'invalid',
    branch: 'main',
    path: RULES_PATH,
    checkedAt: CHECKED_AT,
    sha: FIRST_SHA,
    text: null,
    diagnostics: [
      {
        code: 'policy_document_too_large',
        message: 'Too large',
        line: null,
        column: null,
        retryable: false,
      },
    ],
  }
}

/** The one status that offers a retry: it is final for the polling all the same. */
function retryableUnavailableStatus(checkedAt = CHECKED_AT): RulesStatus {
  return {
    status: 'unavailable',
    branch: 'main',
    path: RULES_PATH,
    checkedAt,
    sha: null,
    diagnostics: [
      {
        code: 'policy_fetch_transient',
        message: 'GitHub is down',
        line: null,
        column: null,
        retryable: true,
      },
    ],
  }
}

function pendingStatus(): RulesStatus {
  return { status: 'pending', branch: 'main', path: '.review/rules.md', sha: null, checkedAt: null }
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

/** One answer per request, the last one repeats; `'error'` is a 500. */
function answers(...bodies: (RulesStatus | 'error')[]): Backend {
  const backend: Backend = stubBackend(() => {
    // The stub counts a request before it asks for the answer: the count is the request's number.
    const body = bodies[Math.min(backend.rulesRequests.length, bodies.length) - 1]
    return Promise.resolve(
      body === 'error'
        ? new Response('Server Error', { status: 500 })
        : new Response(JSON.stringify(body)),
    )
  })
  return backend
}

/** Lets the timers up to `ms` run, and the requests and renders they cause. */
async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

afterEach(() => {
  cleanup()
  focusManager.setFocused(undefined)
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useRepositoryRulesStatus', () => {
  it('fetches the rules status of the repository and parses it', async () => {
    const backend = stubBackend()
    const client = appLikeClient()

    const { result } = renderHook(() => useRepositoryRulesStatus(FIRST_ID), {
      wrapper: wrapper(client),
    })

    await waitFor(() => {
      expect(result.current.data?.status).toBe('missing')
    })
    expect(result.current.data?.sha).toBe(FIRST_SHA)
    expect(backend.fetchMock.mock.calls[0]?.[0]).toBe(`/api/repos/${FIRST_ID}/rules-status`)
  })

  it('fails on a body that is not a rules status', async () => {
    stubBackend(() => Promise.resolve(new Response(JSON.stringify({ status: 'present' }))))
    const client = appLikeClient()

    const { result } = renderHook(() => useRepositoryRulesStatus(FIRST_ID), {
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

    const { result } = renderHook(() => useRepositoryRulesStatus(FIRST_ID), {
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

    const first = renderHook(() => useRepositoryRulesStatus(FIRST_ID), {
      wrapper: wrapper(client),
    })
    await waitFor(() => {
      expect(first.result.current.isSuccess).toBe(true)
    })
    first.unmount()
    expect(backend.rulesRequests).toHaveLength(1)

    // The cached answer is fresh for 30 s, yet reopening the page asks again.
    const second = renderHook(() => useRepositoryRulesStatus(FIRST_ID), {
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

    const first = renderHook(() => useRepositoryRulesStatus(FIRST_ID), {
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

    const { result, rerender } = renderHook(({ id }) => useRepositoryRulesStatus(id), {
      wrapper: wrapper(client),
      initialProps: { id: FIRST_ID },
    })
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
        rules: useRepositoryRulesStatus(FIRST_ID),
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

describe('useRepositoryRulesStatus: polling a pending status', () => {
  function mount(client = appLikeClient()) {
    return renderHook(() => useRepositoryRulesStatus(FIRST_ID), {
      wrapper: wrapper(client),
    })
  }

  it('asks every 3 s while the status is pending and stops when a result arrives', async () => {
    vi.useFakeTimers()
    const backend = answers(pendingStatus(), pendingStatus(), missingStatus(FIRST_SHA))

    const { result } = mount()
    await advance(0)
    expect(backend.rulesRequests).toHaveLength(1)
    expect(result.current.data?.status).toBe('pending')

    await advance(2999)
    expect(backend.rulesRequests).toHaveLength(1)
    await advance(1)
    expect(backend.rulesRequests).toHaveLength(2)
    expect(result.current.data?.status).toBe('pending')

    await advance(3000)
    expect(backend.rulesRequests).toHaveLength(3)
    // TanStack hands the answer to the hook from a zero-delay timer set once the request is over.
    await advance(1)
    expect(result.current.data?.status).toBe('missing')
    expect(result.current.getPendingPollDeadline()).toBeNull()

    // The result is final: no request however long we wait.
    await advance(60_000)
    expect(backend.rulesRequests).toHaveLength(3)
  })

  it.each([
    ['missing', () => missingStatus(FIRST_SHA)],
    ['present', presentStatus],
    ['invalid', invalidStatus],
    ['unavailable, even when it can be retried', retryableUnavailableStatus],
  ])('does not poll a status that was not pending to begin with: %s', async (_name, body) => {
    vi.useFakeTimers()
    const backend = answers(body())

    mount()
    await advance(0)
    await advance(60_000)

    expect(backend.rulesRequests).toHaveLength(1)
  })

  it('goes on polling after a failed poll and stops at the result', async () => {
    vi.useFakeTimers()
    const backend = answers(pendingStatus(), 'error', missingStatus(FIRST_SHA))

    const { result } = mount()
    await advance(0)
    expect(result.current.data?.status).toBe('pending')
    // Reading `isError` makes the hook watch it: TanStack re-renders only for the props it was asked.
    expect(result.current.isError).toBe(false)

    await advance(3000)
    await advance(1)
    expect(backend.rulesRequests).toHaveLength(2)
    // The failure keeps the last answer: the status is still `pending`, only the request failed.
    expect(result.current.isError).toBe(true)
    expect(result.current.data?.status).toBe('pending')

    await advance(3000)
    await advance(1)
    expect(backend.rulesRequests).toHaveLength(3)
    expect(result.current.isError).toBe(false)
    expect(result.current.data?.status).toBe('missing')

    await advance(60_000)
    expect(backend.rulesRequests).toHaveLength(3)
  })

  it('stops a still-pending poll after a 60 s window', async () => {
    vi.useFakeTimers()
    const backend = answers(pendingStatus())

    const { result } = mount()
    await advance(0)
    expect(result.current.data?.status).toBe('pending')

    await advance(60_000)
    expect(backend.rulesRequests).toHaveLength(20)
    await advance(60_000)
    expect(backend.rulesRequests).toHaveLength(20)
  })

  it('does not extend the pending window when a poll fails', async () => {
    vi.useFakeTimers()
    const backend = answers(pendingStatus(), 'error', pendingStatus())

    const { result } = mount()
    await advance(0)
    const deadline = result.current.getPendingPollDeadline()

    await advance(3000)
    expect(backend.rulesRequests).toHaveLength(2)
    expect(result.current.data?.status).toBe('pending')

    await advance(60_000)
    expect(result.current.getPendingPollDeadline()).toBe(deadline)
    expect(backend.rulesRequests).toHaveLength(20)
    await advance(30_000)
    expect(backend.rulesRequests).toHaveLength(20)
  })

  it('starts a new pending window when the user retries after it expires', async () => {
    vi.useFakeTimers()
    const backend = answers(pendingStatus())

    const { result } = mount()
    await advance(0)
    const firstDeadline = result.current.getPendingPollDeadline()
    await advance(60_000)
    expect(backend.rulesRequests).toHaveLength(20)

    await act(async () => {
      await result.current.refetch()
    })
    await advance(1)
    expect(backend.rulesRequests).toHaveLength(21)
    expect(result.current.getPendingPollDeadline()).toBe((firstDeadline ?? 0) + 60_000)

    await advance(3000)
    expect(backend.rulesRequests).toHaveLength(22)
  })

  it('does not send an expired pending request when a hidden tab regains focus', async () => {
    vi.useFakeTimers()
    const backend = answers(pendingStatus())

    const { result } = mount()
    await advance(0)
    expect(result.current.data?.status).toBe('pending')

    focusManager.setFocused(false)
    await advance(60_000)
    expect(backend.rulesRequests).toHaveLength(1)

    focusManager.setFocused(true)
    await advance(3000)
    expect(backend.rulesRequests).toHaveLength(1)
    await advance(60_000)
    expect(backend.rulesRequests).toHaveLength(1)
  })

  it('starts a retried window when the delayed pending answer arrives', async () => {
    vi.useFakeTimers()
    let releaseRetry: (response: Response) => void = () => undefined
    const backend = stubBackend(() =>
      backend.rulesRequests.length <= 20
        ? Promise.resolve(new Response(JSON.stringify(pendingStatus())))
        : new Promise<Response>((resolve) => {
            releaseRetry = resolve
          }),
    )
    const { result } = mount()
    await advance(0)
    await advance(60_000)
    expect(backend.rulesRequests).toHaveLength(20)

    let retry: ReturnType<typeof result.current.refetch> | undefined
    act(() => {
      retry = result.current.refetch()
    })
    expect(backend.rulesRequests).toHaveLength(21)
    await advance(5000)

    const answeredAt = Date.now()
    await act(async () => {
      releaseRetry(new Response(JSON.stringify(pendingStatus())))
      await retry
    })
    await advance(1)
    expect(result.current.getPendingPollDeadline()).toBe(answeredAt + 60_000)
  })

  it('stops polling when the last viewer leaves', async () => {
    vi.useFakeTimers()
    const backend = answers(pendingStatus())

    const view = mount()
    await advance(0)
    await advance(3000)
    expect(backend.rulesRequests).toHaveLength(2)
    view.unmount()

    await advance(60_000)
    expect(backend.rulesRequests).toHaveLength(2)
  })
})

describe('useRepositoryRulesStatusRetry: waiting for a new result after a retry', () => {
  const LATER = '2026-10-14T09:31:15.000Z'
  // Far enough to be well past the window of any retry below.
  const LONG_AFTER = 300_000

  function deniedStatus(): RulesStatus {
    return {
      status: 'unavailable',
      branch: 'main',
      path: '.review/rules.md',
      checkedAt: CHECKED_AT,
      sha: null,
      diagnostics: [
        {
          code: 'policy_access_denied',
          message: 'No access',
          line: null,
          column: null,
          retryable: false,
        },
      ],
    }
  }

  function mount(client = appLikeClient()) {
    return renderHook(({ id }) => useRepositoryRulesStatusRetry(id), {
      initialProps: { id: FIRST_ID },
      wrapper: wrapper(client),
    })
  }

  /** Mounts on the first answer and presses "Retry"; the request of the press has been answered. */
  async function mountAndRetry() {
    const view = mount()
    await advance(0)
    act(() => {
      view.result.current.retry()
    })
    await advance(1)
    return view
  }

  it('does not poll a retryable unavailable status before the retry', async () => {
    vi.useFakeTimers()
    const backend = answers(retryableUnavailableStatus())

    const { result } = mount()
    await advance(0)
    expect(result.current.awaitingResult).toBe(false)

    await advance(LONG_AFTER)
    expect(backend.rulesRequests).toHaveLength(1)
  })

  it('asks at once and then every 3 s after a retry, and says it is waiting', async () => {
    vi.useFakeTimers()
    const backend = answers(retryableUnavailableStatus())

    const { result } = mount()
    await advance(0)
    act(() => {
      result.current.retry()
    })
    await advance(0)
    expect(backend.rulesRequests).toHaveLength(2)
    expect(result.current.awaitingResult).toBe(true)

    await advance(2999)
    expect(backend.rulesRequests).toHaveLength(2)
    await advance(1)
    expect(backend.rulesRequests).toHaveLength(3)
    await advance(3000)
    expect(backend.rulesRequests).toHaveLength(4)
    expect(result.current.awaitingResult).toBe(true)
  })

  it('stops when checkedAt changes, even though the status is the same', async () => {
    vi.useFakeTimers()
    const backend = answers(
      retryableUnavailableStatus(),
      retryableUnavailableStatus(),
      retryableUnavailableStatus(LATER),
    )

    const { result } = await mountAndRetry()
    expect(result.current.awaitingResult).toBe(true)

    await advance(3000)
    await advance(1)
    expect(backend.rulesRequests).toHaveLength(3)
    expect(result.current.query.data?.checkedAt).toBe(LATER)
    expect(result.current.awaitingResult).toBe(false)

    await advance(LONG_AFTER)
    expect(backend.rulesRequests).toHaveLength(3)
  })

  it('stops when the status changes', async () => {
    vi.useFakeTimers()
    const backend = answers(
      retryableUnavailableStatus(),
      retryableUnavailableStatus(),
      missingStatus(FIRST_SHA),
    )

    const { result } = await mountAndRetry()
    await advance(3000)
    await advance(1)
    expect(result.current.query.data?.status).toBe('missing')
    expect(result.current.awaitingResult).toBe(false)

    await advance(LONG_AFTER)
    expect(backend.rulesRequests).toHaveLength(3)
  })

  it('does not poll at all when the answer to the retry is already new', async () => {
    vi.useFakeTimers()
    const backend = answers(retryableUnavailableStatus(), retryableUnavailableStatus(LATER))

    const { result } = await mountAndRetry()
    expect(result.current.query.data?.checkedAt).toBe(LATER)
    expect(result.current.awaitingResult).toBe(false)

    await advance(LONG_AFTER)
    expect(backend.rulesRequests).toHaveLength(2)
  })

  it('gives up 60 s after the retry and asks nothing more', async () => {
    vi.useFakeTimers()
    const backend = answers(retryableUnavailableStatus())

    const { result } = await mountAndRetry()

    await advance(59_998)
    expect(result.current.awaitingResult).toBe(true)
    await advance(1)
    expect(result.current.awaitingResult).toBe(false)
    const asked = backend.rulesRequests.length
    // The first request, the retry, and a poll every 3 s up to the end of the window.
    expect(asked).toBeGreaterThanOrEqual(1 + 1 + 19)

    await advance(LONG_AFTER)
    expect(backend.rulesRequests).toHaveLength(asked)
  })

  it('waits again on the next retry after the window', async () => {
    vi.useFakeTimers()
    const backend = answers(retryableUnavailableStatus())

    const { result } = await mountAndRetry()
    await advance(LONG_AFTER)
    expect(result.current.awaitingResult).toBe(false)
    const asked = backend.rulesRequests.length

    act(() => {
      result.current.retry()
    })
    await advance(1)
    expect(result.current.awaitingResult).toBe(true)
    expect(backend.rulesRequests).toHaveLength(asked + 1)
    await advance(3000)
    expect(backend.rulesRequests).toHaveLength(asked + 2)

    await advance(LONG_AFTER)
    expect(result.current.awaitingResult).toBe(false)
  })

  it.each([
    ['missing', () => missingStatus(FIRST_SHA)],
    ['present', presentStatus],
    ['invalid', invalidStatus],
    ['unavailable that cannot be retried', deniedStatus],
  ])('asks once and does not wait after a retry of: %s', async (_name, body) => {
    vi.useFakeTimers()
    const backend = answers(body())

    const { result } = await mountAndRetry()
    expect(backend.rulesRequests).toHaveLength(2)
    expect(result.current.awaitingResult).toBe(false)

    await advance(LONG_AFTER)
    expect(backend.rulesRequests).toHaveLength(2)
  })

  it('asks once and does not wait when the first load failed: there is no record to compare', async () => {
    vi.useFakeTimers()
    const backend = answers('error', retryableUnavailableStatus())

    const { result } = await mountAndRetry()
    expect(result.current.query.data?.status).toBe('unavailable')
    expect(result.current.awaitingResult).toBe(false)

    await advance(LONG_AFTER)
    expect(backend.rulesRequests).toHaveLength(2)
  })

  it('polls a pending status as before and never calls that waiting for a retry', async () => {
    vi.useFakeTimers()
    const backend = answers(pendingStatus(), pendingStatus(), missingStatus(FIRST_SHA))

    const { result } = mount()
    await advance(0)
    expect(result.current.awaitingResult).toBe(false)
    await advance(3000)
    expect(result.current.awaitingResult).toBe(false)
    await advance(3000)
    await advance(1)
    expect(result.current.query.data?.status).toBe('missing')

    await advance(LONG_AFTER)
    expect(backend.rulesRequests).toHaveLength(3)
  })

  it('hands over to the pending polling when the retry brings pending', async () => {
    vi.useFakeTimers()
    const backend = answers(
      retryableUnavailableStatus(),
      pendingStatus(),
      pendingStatus(),
      missingStatus(FIRST_SHA),
    )

    const { result } = await mountAndRetry()
    expect(result.current.query.data?.status).toBe('pending')
    expect(result.current.awaitingResult).toBe(false)

    await advance(3000)
    await advance(3000)
    await advance(1)
    expect(result.current.query.data?.status).toBe('missing')

    await advance(LONG_AFTER)
    expect(backend.rulesRequests).toHaveLength(4)
  })

  it('bounds pending after an unavailable retry and starts a new pending window on Retry', async () => {
    vi.useFakeTimers()
    const backend = answers(retryableUnavailableStatus(), pendingStatus())

    const { result } = await mountAndRetry()
    expect(result.current.query.data?.status).toBe('pending')
    expect(result.current.awaitingResult).toBe(false)
    const firstDeadline = result.current.query.getPendingPollDeadline()
    if (firstDeadline === null) throw new Error('Pending must start a polling window')

    await advance(60_000)
    const asked = backend.rulesRequests.length
    await advance(30_000)
    expect(backend.rulesRequests).toHaveLength(asked)

    act(() => {
      result.current.retry()
    })
    await advance(1)
    expect(backend.rulesRequests).toHaveLength(asked + 1)
    expect(result.current.query.getPendingPollDeadline()).toBeGreaterThan(firstDeadline)
  })

  it('goes on after a failed poll inside the window and stops at the result', async () => {
    vi.useFakeTimers()
    const backend = answers(
      retryableUnavailableStatus(),
      retryableUnavailableStatus(),
      'error',
      retryableUnavailableStatus(LATER),
    )

    const { result } = await mountAndRetry()
    // Reading `isError` makes the hook watch it: TanStack re-renders only for the props it was asked.
    expect(result.current.query.isError).toBe(false)

    await advance(3000)
    await advance(1)
    expect(result.current.query.isError).toBe(true)
    expect(result.current.awaitingResult).toBe(true)

    await advance(3000)
    await advance(1)
    expect(result.current.query.isError).toBe(false)
    expect(result.current.query.data?.checkedAt).toBe(LATER)
    expect(result.current.awaitingResult).toBe(false)

    await advance(LONG_AFTER)
    expect(backend.rulesRequests).toHaveLength(4)
  })

  it('stops at the end of the window when every poll fails', async () => {
    vi.useFakeTimers()
    const backend = answers(retryableUnavailableStatus(), 'error')

    const { result } = await mountAndRetry()
    await advance(60_000)
    expect(result.current.query.isError).toBe(true)
    expect(result.current.awaitingResult).toBe(false)
    const asked = backend.rulesRequests.length

    await advance(LONG_AFTER)
    expect(backend.rulesRequests).toHaveLength(asked)
  })

  it('waits again on a retry of the load error over a retryable status', async () => {
    vi.useFakeTimers()
    let answer: RulesStatus | 'error' = retryableUnavailableStatus()
    const backend = stubBackend(() =>
      Promise.resolve(
        answer === 'error'
          ? new Response('Server Error', { status: 500 })
          : new Response(JSON.stringify(answer)),
      ),
    )

    const { result } = mount()
    await advance(0)
    answer = 'error'
    act(() => {
      result.current.retry()
    })
    await advance(LONG_AFTER)
    expect(result.current.query.isError).toBe(true)
    expect(result.current.awaitingResult).toBe(false)
    const asked = backend.rulesRequests.length

    // The server answers again, with the same record: the read it was asked for is still to come.
    answer = retryableUnavailableStatus()
    act(() => {
      result.current.retry()
    })
    await advance(1)
    expect(result.current.query.isError).toBe(false)
    expect(result.current.awaitingResult).toBe(true)
    await advance(3000)
    expect(backend.rulesRequests).toHaveLength(asked + 2)
  })

  it('starts the window over on a retry of the load error inside it', async () => {
    vi.useFakeTimers()
    let answer: RulesStatus | 'error' = retryableUnavailableStatus()
    stubBackend(() =>
      Promise.resolve(
        answer === 'error'
          ? new Response('Server Error', { status: 500 })
          : new Response(JSON.stringify(answer)),
      ),
    )

    const { result } = await mountAndRetry()
    // Reading `isError` makes the hook watch it: TanStack re-renders only for the props it was asked.
    expect(result.current.query.isError).toBe(false)
    answer = 'error'
    await advance(30_000)
    expect(result.current.query.isError).toBe(true)

    answer = retryableUnavailableStatus()
    act(() => {
      result.current.retry()
    })
    await advance(1)

    // 89 s after the first retry, 59 s after this one.
    await advance(59_000)
    expect(result.current.awaitingResult).toBe(true)
    await advance(1000)
    expect(result.current.awaitingResult).toBe(false)
  })

  it('stops polling when the last viewer leaves', async () => {
    vi.useFakeTimers()
    const backend = answers(retryableUnavailableStatus())

    const view = await mountAndRetry()
    await advance(3000)
    const asked = backend.rulesRequests.length
    view.unmount()

    await advance(LONG_AFTER)
    expect(backend.rulesRequests).toHaveLength(asked)
  })

  it('does not wait for another repository with the same checkedAt', async () => {
    vi.useFakeTimers()
    const backend = answers(retryableUnavailableStatus())

    const view = await mountAndRetry()
    expect(view.result.current.awaitingResult).toBe(true)

    view.rerender({ id: SECOND_ID })
    await advance(1)
    expect(view.result.current.query.data?.checkedAt).toBe(CHECKED_AT)
    expect(view.result.current.awaitingResult).toBe(false)

    await advance(LONG_AFTER)
    expect(backend.rulesRequests.filter((id) => id === SECOND_ID)).toHaveLength(1)
  })
})
