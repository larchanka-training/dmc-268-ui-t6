// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useState, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  disabledRagIndex,
  useRepository,
  useUpdateRepository,
  type Repository,
} from '../../../entities/repository'
import { advance, settle } from '../../../test/advanceTimers'
import { useRagIndexPolling } from './useRagIndexPolling'

const REPO: Repository = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  fullName: 'org/repo',
  url: 'https://github.com/org/repo',
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

interface Backend {
  /** The repository as the server stores it; GET /api/repos answers it. */
  repo: Repository
  gets: number
  /** While set, GET /api/repos answers only after this promise resolves. */
  listGate: Promise<void> | null
}

/**
 * Stands in for the network: GET /api/repos, a PATCH of `ragEnabled` that the api answers at once
 * (a switch-on starts the index from `empty`), and any other PATCH, a settings save, which waits
 * for `saveAnswered` and is refused.
 */
function stubBackend(repo: Repository, saveAnswered: Promise<void>): Backend {
  const backend: Backend = { repo, gets: 0, listGate: null }
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>((_input, init) => {
      if (init?.method !== 'PATCH') {
        backend.gets += 1
        const answer = (): Response => new Response(JSON.stringify([backend.repo]), { status: 200 })
        return backend.listGate === null ? Promise.resolve(answer()) : backend.listGate.then(answer)
      }
      const body = JSON.parse(typeof init.body === 'string' ? init.body : '{}') as Record<
        string,
        unknown
      >
      if (body.ragEnabled !== true) {
        return saveAnswered.then(() => new Response('Server Error', { status: 500 }))
      }
      backend.repo = {
        ...backend.repo,
        ragEnabled: true,
        ragIndex: { ...disabledRagIndex, status: 'empty' },
      }
      return Promise.resolve(new Response(JSON.stringify(backend.repo), { status: 200 }))
    }),
  )
  return backend
}

/** The settings page's wiring of the three hooks, without the page. */
function useRagSettings(id: string) {
  const { data: repository, refetch } = useRepository(id)
  const update = useUpdateRepository()
  const [enabledAt, setEnabledAt] = useState<number | null>(null)
  const polling = useRagIndexPolling(repository?.ragIndex.status, enabledAt, refetch)
  // As the page does: the switch-on is marked once its PATCH has succeeded.
  const switchOn = (): Promise<void> =>
    update.mutateAsync({ id, patch: { ragEnabled: true } }).then(() => {
      setEnabledAt(Date.now())
    })
  return { repository, update, polling, switchOn }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

// Fake timers: the hooks are read after an `advance`/`settle`, never with `waitFor`.
describe('useRagIndexPolling with the repository hooks', () => {
  it('keeps waiting for the index after a settings save made alongside the switch-on fails', async () => {
    let answerSave = (): void => undefined
    const saveAnswered = new Promise<void>((resolve) => {
      answerSave = resolve
    })
    const backend = stubBackend(REPO, saveAnswered)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useRagSettings(REPO.id), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    await settle()
    expect(result.current.repository?.ragIndex.status).toBe('disabled')
    expect(backend.gets).toBe(1)

    // A settings save is sent and stays open ...
    act(() => {
      result.current.update.mutate({ id: REPO.id, patch: { maxComments: 3 } })
    })
    await settle()
    // ... while RAG is switched on and the api answers with an `empty` index.
    act(() => {
      void result.current.switchOn()
    })
    await settle()
    expect(result.current.repository).toMatchObject({
      ragEnabled: true,
      ragIndex: { status: 'empty' },
    })
    expect(result.current.polling).toBe('waiting')

    // The save is refused; once both updates have settled the list is asked again. The answer
    // takes a while, as on a network, so the page renders what the cache holds meanwhile.
    let answerList = (): void => undefined
    backend.listGate = new Promise<void>((resolve) => {
      answerList = resolve
    })
    answerSave()
    await settle()
    expect(backend.gets).toBe(2)
    backend.listGate = null
    answerList()
    await settle()
    expect(result.current.repository).toMatchObject({
      maxComments: 10,
      ragEnabled: true,
      ragIndex: { status: 'empty' },
    })
    expect(result.current.polling).toBe('waiting')

    // The window of the switch-on goes on: the first poll comes 5 s after it.
    await advance(4999)
    expect(backend.gets).toBe(2)
    await advance(1)
    expect(backend.gets).toBe(3)
    expect(result.current.polling).toBe('waiting')
  })
})
