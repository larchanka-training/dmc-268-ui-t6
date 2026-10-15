// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Repository, UpdateRepositoryInput } from '../model/schemas'
import { REPOSITORIES_QUERY_KEY, useUpdateRepository } from './index'

const REACHABLE: Repository = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  fullName: 'org/reachable',
  url: 'https://github.com/org/reachable',
  defaultBranch: 'main',
  enabled: true,
  defaultEngine: 'fast',
  waitForCi: 'auto',
  maxComments: 10,
  reviewEvent: 'COMMENT',
  branchFilter: [],
  severityThreshold: 'all',
  installationAvailable: true,
}
// The api serves `enabled AND installationAvailable` (api PR #156, SD §6.9): `false` here whatever
// the user stored.
const UNREACHABLE: Repository = {
  ...REACHABLE,
  id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  fullName: 'org/unreachable',
  url: 'https://github.com/org/unreachable',
  enabled: false,
  installationAvailable: false,
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

/**
 * What the list cache holds for `repo` while the PATCH with `patch` is still open, that is, what
 * the optimistic update wrote. The PATCH has been sent by the time this reads the cache:
 * `mutationFn` runs after `onMutate`.
 */
async function cachedWhilePatchIsOpen(
  repo: Repository,
  patch: UpdateRepositoryInput,
): Promise<Repository | undefined> {
  let release = (): void => undefined
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const fetchMock = vi.fn<typeof fetch>(() =>
    gate.then(() => new Response(JSON.stringify(repo), { status: 200 })),
  )
  vi.stubGlobal('fetch', fetchMock)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData<Repository[]>(REPOSITORIES_QUERY_KEY, [repo])
  const { result } = renderHook(() => useUpdateRepository(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })

  act(() => {
    result.current.mutate({ id: repo.id, patch })
  })
  await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  const cached = client.getQueryData<Repository[]>(REPOSITORIES_QUERY_KEY)?.[0]

  release()
  await waitFor(() => {
    expect(result.current.isPending).toBe(false)
  })
  return cached
}

describe('useUpdateRepository: optimistic update', () => {
  it('keeps `enabled` off for a repository the GitHub App cannot reach, whatever the patch says', async () => {
    // The cached `enabled` is the served value; a stored choice is write-only and never shown.
    const cached = await cachedWhilePatchIsOpen(UNREACHABLE, { enabled: true })

    expect(cached?.enabled).toBe(false)
    expect(cached?.installationAvailable).toBe(false)
  })

  it.each([true, false])(
    'follows the patch for a repository the GitHub App can reach (enabled: %s)',
    async (enabled) => {
      const cached = await cachedWhilePatchIsOpen({ ...REACHABLE, enabled: !enabled }, { enabled })

      expect(cached?.enabled).toBe(enabled)
    },
  )

  it.each([REACHABLE, UNREACHABLE])(
    'merges the other fields as before and leaves `enabled` alone ($fullName)',
    async (repo) => {
      const cached = await cachedWhilePatchIsOpen(repo, {
        maxComments: 3,
        branchFilter: ['main'],
      })

      expect(cached).toEqual({ ...repo, maxComments: 3, branchFilter: ['main'] })
    },
  )
})
