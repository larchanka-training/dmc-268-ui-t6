import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../shared/config/env', () => ({
  USE_MOCKS: true,
  isMockMode: () => true,
  env: { VITE_USE_MOCKS: true },
  API_BASE_URL: '/api',
  GITHUB_CLIENT_ID: '',
  GITHUB_APP_SLUG: '',
}))

import { RulesStatusSchema, type Repository } from '../../entities/repository'
import {
  connectBitbucketRepository,
  discoverBitbucketRepositories,
  disconnectBitbucketRepository,
  listBitbucketConnections,
  rotateBitbucketCredential,
  rotateBitbucketWebhookSecret,
} from '../../features/bitbucket-connections/api'
import {
  RunDetailSchema,
  RunListPageSchema,
  RunSessionSchema,
  type RunDetail,
  type RunListPage,
  type RunSession,
} from '../../entities/run'
import { ApiError, apiClient } from '../../shared/api/client'
import { endpoints } from '../../shared/api/endpoints'
import { validationErrorLocations } from '../../shared/api/validationError'
import { mockRepositories } from './app-state'
import { mockRunsListPage } from './mockRunsList.fixture'
import { mockRulesStatuses } from './mockRulesStatus'
import { WALKING_RUN_ID } from './mockRunTimeline'
import {
  initMockTransport,
  MOCK_RAG_BUILD_GETS,
  MOCK_RAG_INDEXED_SHA,
  readStoredMockRepository,
} from './mockTransport'

describe('initMockTransport', () => {
  it.each([
    ['waitForCi', 'auto', 'bitbucket_wait_for_ci_unsupported'],
    ['waitForCi', 'always', 'bitbucket_wait_for_ci_unsupported'],
    ['reviewEvent', 'REQUEST_CHANGES', 'bitbucket_review_event_unsupported'],
  ])(
    'rejects unsupported Bitbucket %s=%s without changing stored settings',
    async (field, value, code) => {
      const workspace = '123e4567-e89b-12d3-a456-426614174000'
      initMockTransport()
      const connection = await connectBitbucketRepository(workspace, {
        bitbucketWorkspace: 'demo-bitbucket',
        repositorySlug: 'private-repo',
        repositoryUuid: '66666666-6666-4666-8666-666666666666',
        apiToken: 'demo-token',
      })
      const before = readStoredMockRepository(connection.repositoryId)

      await expect(
        apiClient<Repository>(endpoints.repos.update(connection.repositoryId), {
          body: { maxComments: 7, [field]: value },
        }),
      ).rejects.toMatchObject({
        status: 422,
        data: {
          detail: [{ loc: ['body', field], msg: code, type: 'value_error' }],
        },
      })
      expect(readStoredMockRepository(connection.repositoryId)).toEqual(before)
    },
  )

  it('reuses a Bitbucket binding without showing a second secret and seeds supported settings', async () => {
    const workspace = '123e4567-e89b-12d3-a456-426614174000'
    initMockTransport()
    const request = {
      bitbucketWorkspace: 'demo-bitbucket',
      repositorySlug: 'private-repo',
      repositoryUuid: '66666666-6666-4666-8666-666666666666',
      apiToken: 'demo-token',
    }
    const first = await connectBitbucketRepository(workspace, request)
    const repeated = await connectBitbucketRepository(workspace, request)

    expect(first.webhook?.secret).toBeTruthy()
    expect(repeated).toMatchObject({
      id: first.id,
      repositoryId: first.repositoryId,
      repositoryUuid: first.repositoryUuid,
      webhook: null,
    })
    expect((await listBitbucketConnections(workspace)).connections).toHaveLength(1)
    const repos = await apiClient<Repository[]>(endpoints.repos.list())
    const added = repos.find((repo) => repo.id === first.repositoryId)
    expect(added).toMatchObject({
      provider: 'bitbucket',
      waitForCi: 'never',
      reviewEvent: 'COMMENT',
    })
  })

  it('makes an absent Bitbucket disconnect idempotent and keeps a sibling binding', async () => {
    const workspace = '123e4567-e89b-12d3-a456-426614174000'
    initMockTransport()
    const first = await connectBitbucketRepository(workspace, {
      bitbucketWorkspace: 'demo-bitbucket',
      repositorySlug: 'private-repo',
      repositoryUuid: '66666666-6666-4666-8666-666666666666',
      apiToken: 'demo-token',
    })
    const second = await connectBitbucketRepository(workspace, {
      bitbucketWorkspace: 'demo-bitbucket',
      repositorySlug: 'second-repo',
      repositoryUuid: '88888888-8888-4888-8888-888888888888',
      apiToken: 'demo-token',
    })

    await disconnectBitbucketRepository(workspace, first.id, first.repositoryId)
    await expect(
      disconnectBitbucketRepository(workspace, first.id, first.repositoryId),
    ).resolves.toBeUndefined()
    await expect(
      disconnectBitbucketRepository(
        workspace,
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        second.repositoryId,
      ),
    ).resolves.toBeUndefined()
    expect(
      (await listBitbucketConnections(workspace)).connections.map((item) => item.repositoryId),
    ).toEqual([second.repositoryId])
  })

  it('uses backend detail codes for scoped Bitbucket errors', async () => {
    const workspace = '123e4567-e89b-12d3-a456-426614174000'
    initMockTransport()
    await expect(
      listBitbucketConnections('99999999-9999-4999-8999-999999999999'),
    ).rejects.toMatchObject({ status: 404, data: { detail: 'workspace_not_found' } })
    const first = await connectBitbucketRepository(workspace, {
      bitbucketWorkspace: 'demo-bitbucket',
      repositorySlug: 'private-repo',
      repositoryUuid: '66666666-6666-4666-8666-666666666666',
      apiToken: 'demo-token',
    })
    await expect(
      connectBitbucketRepository(workspace, {
        bitbucketWorkspace: 'demo-bitbucket',
        repositorySlug: 'second-repo',
        repositoryUuid: '88888888-8888-4888-8888-888888888888',
        apiToken: 'different-token',
      }),
    ).rejects.toMatchObject({ status: 409, data: { detail: 'credential_rotation_required' } })
    await expect(
      connectBitbucketRepository(workspace, {
        bitbucketWorkspace: 'demo-bitbucket',
        repositorySlug: 'private-repo',
        repositoryUuid: '88888888-8888-4888-8888-888888888888',
        apiToken: 'demo-token',
      }),
    ).rejects.toMatchObject({ status: 409, data: { detail: 'repository_uuid_mismatch' } })
    await expect(
      rotateBitbucketWebhookSecret(workspace, first.id, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    ).rejects.toMatchObject({ status: 404, data: { detail: 'repository_not_found' } })
  })

  it('simulates scoped Bitbucket discovery, two bindings, rotation and independent disconnect', async () => {
    const workspace = '123e4567-e89b-12d3-a456-426614174000'
    initMockTransport()
    const found = await discoverBitbucketRepositories(workspace, {
      bitbucketWorkspace: 'demo-bitbucket',
      apiToken: 'demo-token',
    })
    expect(found.repositories).toHaveLength(2)
    expect(found.repositories[0]?.isPrivate).toBe(true)
    const first = found.repositories[0]
    const second = found.repositories[1]
    if (!first || !second) throw new Error('missing Bitbucket demo repositories')
    const connected = await Promise.all(
      [first, second].map((repo) =>
        connectBitbucketRepository(workspace, {
          bitbucketWorkspace: repo.workspaceSlug,
          repositorySlug: repo.slug,
          repositoryUuid: repo.uuid,
          apiToken: 'demo-token',
        }),
      ),
    )
    const [firstConnection, secondConnection] = connected
    if (!firstConnection || !secondConnection) throw new Error('missing Bitbucket demo connection')
    expect(firstConnection.id).toBe(secondConnection.id)
    expect((await listBitbucketConnections(workspace)).connections).toHaveLength(2)
    const rotated = await rotateBitbucketCredential(workspace, firstConnection.id, 'new-token')
    expect(rotated.credentialGeneration).toBe(2)
    const hook = await rotateBitbucketWebhookSecret(
      workspace,
      firstConnection.id,
      firstConnection.repositoryId,
    )
    expect(hook.secret).toBeTruthy()
    await disconnectBitbucketRepository(workspace, firstConnection.id, firstConnection.repositoryId)
    expect(
      (await listBitbucketConnections(workspace)).connections.map((item) => item.repositoryUuid),
    ).toEqual([second.uuid])
    await expect(
      listBitbucketConnections('99999999-9999-4999-8999-999999999999'),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it('serves GET /runs from the mock handler', async () => {
    initMockTransport()
    const page = await apiClient<{ items: unknown[] }>(endpoints.runs.list())
    expect(Array.isArray(page.items)).toBe(true)
    expect(page.items.length).toBeGreaterThan(0)
  })

  describe('POST /runs/{id}/rerun', () => {
    const completedRunId = '11111111-1111-4111-8111-000000000004'

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-10-16T12:00:00.000Z'))
      initMockTransport()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('serves the newly queued rerun from GET detail', async () => {
      const created = RunSessionSchema.parse(
        await apiClient<unknown>(endpoints.runs.rerun(completedRunId)),
      )

      const detail = RunDetailSchema.parse(
        await apiClient<unknown>(endpoints.runs.detail(created.id)),
      )

      expect(detail.id).toBe(created.id)
      expect(detail.status).toBe('queued')
      expect(detail.trigger).toBe('rerun')
      expect(detail.createdAt).toBe('2026-10-16T12:00:00.000Z')
      expect(detail.engine).toBe('deep')
      expect(detail.model).toBe('claude-sonnet-5')
      expect(detail.pullRequest).toMatchObject({
        repo: 'larchanka-training/dmc-268-ui-t6',
        number: 34,
        headSha: 'abcdef1234567890abcdef1234567890abcdef12',
      })
      expect(detail.startedAt).toBeNull()
      expect(detail.finishedAt).toBeNull()
      expect(detail.attempt).toBe(2)
      expect(detail.cancelRequested).toBe(false)
      expect(detail.actionCount).toBe(0)
      expect(detail.errorCode).toBeNull()
      expect(detail.findings).toEqual([])
      expect(detail.summary).toBeNull()
      expect(detail.verdict).toBeNull()
      expect(detail.budget).toBeNull()
    })

    it('lists the new run and rejects another rerun of the same PR', async () => {
      const created = await apiClient<RunSession>(endpoints.runs.rerun(completedRunId))

      const page = RunListPageSchema.parse(await apiClient<unknown>(endpoints.runs.list()))
      expect(page.items.find((run) => run.id === created.id)).toEqual(created)
      await expect(apiClient(endpoints.runs.rerun(completedRunId))).rejects.toEqual(
        new ApiError(409, 'Conflict', { detail: 'Active run already exists' }),
      )
    })

    it('persists cancellation of a rerun and permits its replacement', async () => {
      const fixturesBefore = structuredClone(mockRunsListPage)
      const created = await apiClient<RunSession>(endpoints.runs.rerun(completedRunId))

      const cancelled = RunSessionSchema.parse(
        await apiClient<unknown>(endpoints.runs.cancel(created.id)),
      )
      expect(cancelled).toMatchObject({ status: 'cancelled', cancelRequested: true })
      cancelled.status = 'queued'
      cancelled.cancelRequested = false
      cancelled.pullRequest.number = 999

      const detail = RunDetailSchema.parse(
        await apiClient<unknown>(endpoints.runs.detail(created.id)),
      )
      expect(detail).toMatchObject({
        status: 'cancelled',
        cancelRequested: true,
        pullRequest: { number: 34 },
      })
      const page = RunListPageSchema.parse(await apiClient<unknown>(endpoints.runs.list()))
      expect(page.items.find((run) => run.id === created.id)).toMatchObject({
        status: 'cancelled',
        cancelRequested: true,
      })

      const replacement = RunSessionSchema.parse(
        await apiClient<unknown>(endpoints.runs.rerun(completedRunId)),
      )
      expect(replacement.id).not.toBe(created.id)
      expect(replacement).toMatchObject({ status: 'queued', cancelRequested: false })
      await expect(apiClient(endpoints.runs.rerun(completedRunId))).rejects.toEqual(
        new ApiError(409, 'Conflict', { detail: 'Active run already exists' }),
      )
      expect(mockRunsListPage).toEqual(fixturesBefore)
    })

    it('serves empty results for a created rerun before and after cancellation', async () => {
      const created = await apiClient<RunSession>(endpoints.runs.rerun(completedRunId))

      for (const cancelled of [false, true]) {
        if (cancelled) await apiClient(endpoints.runs.cancel(created.id))
        expect.soft(await apiClient<unknown>(endpoints.runs.actions(created.id))).toEqual([])
        expect.soft(await apiClient<unknown>(endpoints.runs.comments(created.id))).toEqual([])
        const detail = RunDetailSchema.parse(
          await apiClient<unknown>(endpoints.runs.detail(created.id)),
        )
        expect(detail.actionCount).toBe(0)
        expect(detail.findings).toEqual([])
      }
    })

    it('preserves fixture results and walking progression after creating a rerun', async () => {
      await apiClient(endpoints.runs.rerun(completedRunId))
      const fixtureRerunId = '11111111-1111-4111-8111-000000000001'
      const fixture = await apiClient<RunDetail>(endpoints.runs.detail(fixtureRerunId))
      expect(fixture).toMatchObject({ status: 'queued', trigger: 'rerun' })
      expect(await apiClient<unknown>(endpoints.runs.actions(fixtureRerunId))).toHaveLength(34)
      expect(await apiClient<unknown>(endpoints.runs.comments(fixtureRerunId))).toHaveLength(3)
      expect(await apiClient<unknown>(endpoints.runs.actions(completedRunId))).toHaveLength(34)
      expect(await apiClient<unknown>(endpoints.runs.comments(completedRunId))).toHaveLength(3)

      expect(await apiClient<unknown>(endpoints.runs.actions(WALKING_RUN_ID))).toEqual([])
      expect(await apiClient<unknown>(endpoints.runs.comments(WALKING_RUN_ID))).toEqual([])
      vi.advanceTimersByTime(2000)
      expect(await apiClient<unknown>(endpoints.runs.actions(WALKING_RUN_ID))).toHaveLength(1)
      expect(await apiClient<unknown>(endpoints.runs.comments(WALKING_RUN_ID))).toEqual([])
      vi.advanceTimersByTime(15_000)
      expect(await apiClient<unknown>(endpoints.runs.actions(WALKING_RUN_ID))).toHaveLength(10)
      expect(await apiClient<unknown>(endpoints.runs.comments(WALKING_RUN_ID))).toHaveLength(3)
    })

    it('lists reruns newest first while preserving fixture order', async () => {
      const before = await apiClient<RunListPage>(endpoints.runs.list())
      const first = await apiClient<RunSession>(endpoints.runs.rerun(completedRunId))
      vi.advanceTimersByTime(1000)
      const second = await apiClient<RunSession>(
        endpoints.runs.rerun('11111111-1111-4111-8111-000000000006'),
      )

      const page = RunListPageSchema.parse(await apiClient<unknown>(endpoints.runs.list()))
      expect(page.items.slice(0, 2).map((run) => run.id)).toEqual([second.id, first.id])
      expect(page.items.slice(2).map((run) => run.id)).toEqual(before.items.map((run) => run.id))
    })

    it('gives different PRs unique UUIDs and resets previous errors and cancellation', async () => {
      const failed = RunSessionSchema.parse(
        await apiClient<unknown>(endpoints.runs.rerun('11111111-1111-4111-8111-000000000005')),
      )
      const cancelled = RunSessionSchema.parse(
        await apiClient<unknown>(endpoints.runs.rerun('11111111-1111-4111-8111-000000000006')),
      )

      expect(failed.id).not.toBe('11111111-1111-4111-8111-000000000005')
      expect(cancelled.id).not.toBe('11111111-1111-4111-8111-000000000006')
      expect(failed.id).not.toBe(cancelled.id)
      expect(failed).toMatchObject({ attempt: 4, actionCount: 0, errorCode: null })
      expect(cancelled).toMatchObject({
        attempt: 2,
        actionCount: 0,
        cancelRequested: false,
      })
    })

    it('isolates POST, detail and list responses from stored sessions and fixtures', async () => {
      const before = structuredClone(mockRunsListPage)
      const created = await apiClient<RunSession>(endpoints.runs.rerun(completedRunId))
      const createdId = created.id
      created.status = 'succeeded'
      created.pullRequest.number = 999

      const detail = await apiClient<RunDetail>(endpoints.runs.detail(createdId))
      expect(detail.status).toBe('queued')
      expect(detail.pullRequest.number).toBe(34)
      detail.pullRequest.repo = 'changed/repo'

      const page = await apiClient<RunListPage>(endpoints.runs.list())
      const listed = page.items.find((run) => run.id === createdId)
      expect(listed?.pullRequest.repo).toBe('larchanka-training/dmc-268-ui-t6')
      if (!listed) throw new Error('rerun is missing from the list')
      listed.pullRequest.title = 'changed title'
      listed.actionCount = 99

      const fresh = await apiClient<RunDetail>(endpoints.runs.detail(createdId))
      expect(fresh.pullRequest.title).toBe('feat: frontend architecture skeleton')
      expect(fresh.actionCount).toBe(0)
      await expect(apiClient(endpoints.runs.rerun(completedRunId))).rejects.toMatchObject({
        status: 409,
        data: { detail: 'Active run already exists' },
      })
      expect(mockRunsListPage).toEqual(before)
    })

    it('drops created runs on re-init and permits a fresh rerun', async () => {
      const created = await apiClient<RunSession>(endpoints.runs.rerun(completedRunId))
      initMockTransport()

      await expect(apiClient(endpoints.runs.detail(created.id))).rejects.toMatchObject({
        status: 404,
      })
      const page = await apiClient<RunListPage>(endpoints.runs.list())
      expect(page.items.some((run) => run.id === created.id)).toBe(false)
      const recreated = RunSessionSchema.parse(
        await apiClient<unknown>(endpoints.runs.rerun(completedRunId)),
      )
      expect(recreated.id).not.toBe(created.id)
      expect(recreated.attempt).toBe(2)
    })

    it('keeps the walking run live in GET detail and list after adding a rerun', async () => {
      await apiClient(endpoints.runs.rerun(completedRunId))
      const initial = await apiClient<RunDetail>(endpoints.runs.detail(WALKING_RUN_ID))
      expect(initial.status).toBe('queued')

      vi.advanceTimersByTime(2000)
      const running = await apiClient<RunDetail>(endpoints.runs.detail(WALKING_RUN_ID))
      expect(running.status).toBe('running')
      expect(running.actionCount).toBe(1)

      vi.advanceTimersByTime(15_000)
      const page = await apiClient<RunListPage>(endpoints.runs.list())
      expect(page.items.find((run) => run.id === WALKING_RUN_ID)?.status).toBe('succeeded')
      const walkingRerun = await apiClient<RunSession>(endpoints.runs.rerun(WALKING_RUN_ID))
      expect(walkingRerun.status).toBe('queued')
      expect(walkingRerun.pullRequest.number).toBe(41)
    })
  })

  describe('GET /runs', () => {
    const API_REPO = 'larchanka-training/dmc-268-api-t6'
    const INFRA_REPO = 'larchanka-training/dmc-268-infra-t6'

    function list(query: Record<string, string>): Promise<RunListPage> {
      const search = new URLSearchParams(query).toString()
      return apiClient<RunListPage>({ method: 'GET', path: `/runs?${search}` })
    }

    beforeEach(() => {
      initMockTransport()
    })

    it('filters GET /runs by repo', async () => {
      const page = await list({ repo: API_REPO })

      expect(page.items).toHaveLength(25)
      expect(page.items.every((run) => run.pullRequest.repo === API_REPO)).toBe(true)
      expect(page.nextCursor).toBeNull()

      const none = await list({ repo: INFRA_REPO })
      expect(none).toEqual({ items: [], nextCursor: null })

      const unknown = await list({ repo: 'someone/else' })
      expect(unknown.items).toEqual([])
    })

    it('lists the runs of every repo when no repo is given', async () => {
      const page = await apiClient<RunListPage>(endpoints.runs.list())

      const repos = new Set(page.items.map((run) => run.pullRequest.repo))
      expect(repos).toEqual(new Set(['larchanka-training/dmc-268-ui-t6', API_REPO]))
      expect(page.nextCursor).toBeNull()
    })

    it('lists a rerun first for its own repo and not for another', async () => {
      const UI_REPO = 'larchanka-training/dmc-268-ui-t6'
      const created = await apiClient<RunSession>(
        endpoints.runs.rerun('11111111-1111-4111-8111-000000000100'),
      )
      expect(created.pullRequest.repo).toBe(API_REPO)

      const own = await list({ repo: API_REPO })
      expect(own.items).toHaveLength(26)
      expect(own.items[0]).toEqual(created)

      const other = await list({ repo: UI_REPO })
      expect(other.items.some((run) => run.id === created.id)).toBe(false)
      const none = await list({ repo: INFRA_REPO })
      expect(none.items).toEqual([])
    })

    it('paginates with an opaque cursor', async () => {
      const first = await list({ repo: API_REPO, limit: '20' })
      expect(first.items).toHaveLength(20)
      const cursor = first.nextCursor
      if (cursor === null) {
        throw new Error('the first page of 25 runs at limit 20 must have a next cursor')
      }

      const second = await list({ repo: API_REPO, limit: '20', cursor })
      expect(second.items).toHaveLength(5)
      expect(second.nextCursor).toBeNull()

      const ids = [...first.items, ...second.items].map((run) => run.id)
      expect(new Set(ids).size).toBe(25)
    })

    it('answers an unreadable cursor with 422', async () => {
      await expect(list({ cursor: 'not-a-cursor' })).rejects.toMatchObject({ status: 422 })
    })

    it('answers a limit over the api cap with 422 and takes the cap itself', async () => {
      await expect(list({ limit: '101' })).rejects.toMatchObject({ status: 422 })
      await expect(list({ limit: '0' })).rejects.toMatchObject({ status: 422 })
      await expect(list({ limit: '100' })).resolves.toMatchObject({ nextCursor: null })
    })
  })

  describe('GET /repos/{id}/rules-status', () => {
    beforeEach(() => {
      initMockTransport()
    })

    it('serves the rules status of each mock repository', async () => {
      const statuses = await Promise.all(
        mockRepositories.map((repo) =>
          apiClient<unknown>(endpoints.repos.rulesStatus(repo.id)).then((data) =>
            RulesStatusSchema.parse(data),
          ),
        ),
      )

      // The last repository has no rules file: it is a newly connected one, still pending.
      expect(statuses.map((status) => status.status)).toEqual([
        'present',
        'invalid',
        'unavailable',
        'pending',
      ])
    })

    describe('the repository without a rules file', () => {
      const docs = mockRepositories[3]
      if (docs === undefined) {
        throw new Error('the mock has no fourth repository')
      }
      const fetchDocsStatus = () => apiClient<unknown>(endpoints.repos.rulesStatus(docs.id))

      it('answers pending to its first GET, with the branch and without a revision or a time', async () => {
        expect(RulesStatusSchema.parse(await fetchDocsStatus())).toEqual({
          status: 'pending',
          branch: mockRulesStatuses[docs.id]?.branch,
          path: '.review/rules.md',
          sha: null,
          checkedAt: null,
        })
      })

      it('does not use up the pending answer on a first GET that was aborted before the answer', async () => {
        // What StrictMode does in `pnpm dev`: the first GET of the block is cancelled at once.
        const controller = new AbortController()
        const aborted = apiClient<unknown>(endpoints.repos.rulesStatus(docs.id), {
          signal: controller.signal,
        })
        controller.abort()
        await expect(aborted).rejects.toMatchObject({ name: 'AbortError' })

        const second = RulesStatusSchema.parse(await fetchDocsStatus())
        const third = RulesStatusSchema.parse(await fetchDocsStatus())

        expect(second.status).toBe('pending')
        expect(third).toEqual(mockRulesStatuses[docs.id])
      })

      it('answers its fixture from the second GET on', async () => {
        await fetchDocsStatus()

        const second = RulesStatusSchema.parse(await fetchDocsStatus())
        const third = RulesStatusSchema.parse(await fetchDocsStatus())

        expect(second).toEqual(mockRulesStatuses[docs.id])
        expect(second.status).toBe('missing')
        expect(third).toEqual(second)
      })

      it('answers pending again to the first GET after the transport is initialised anew', async () => {
        await fetchDocsStatus()
        await fetchDocsStatus()

        initMockTransport()

        expect(RulesStatusSchema.parse(await fetchDocsStatus()).status).toBe('pending')
      })
    })

    it('answers 404 for a repository it does not know', async () => {
      await expect(
        apiClient<unknown>(endpoints.repos.rulesStatus('22222222-2222-4222-8222-0000000000ff')),
      ).rejects.toMatchObject({ status: 404 })
    })

    it('is matched before the repository itself', async () => {
      const [repo] = mockRepositories
      if (!repo) {
        throw new Error('mock repositories are empty')
      }

      const one = await apiClient<Repository>(endpoints.repos.detail(repo.id))
      const rules = await apiClient<{ status: string }>(endpoints.repos.rulesStatus(repo.id))

      expect(one.id).toBe(repo.id)
      expect(rules.status).toBe('present')
      expect(rules).not.toHaveProperty('fullName')
    })

    it('hands out copies of the rules status', async () => {
      const [repo] = mockRepositories
      if (!repo) {
        throw new Error('mock repositories are empty')
      }
      const first = await apiClient<{ branch: string }>(endpoints.repos.rulesStatus(repo.id))
      first.branch = 'changed'

      const second = await apiClient<{ branch: string }>(endpoints.repos.rulesStatus(repo.id))

      expect(second.branch).not.toBe('changed')
    })
  })

  // api PR #156 (`repository_settings.py:27`): the stored preference is write-only while the
  // GitHub App cannot reach the repository; the api serves `enabled AND installationAvailable`.
  describe('enabled is the effective value', () => {
    const [available, , unreachable] = mockRepositories
    if (available?.installationAvailable !== true || unreachable?.installationAvailable !== false) {
      throw new Error('the first mock repository must be reachable and the third not')
    }

    beforeEach(() => {
      initMockTransport()
    })

    it('reads enabled: false for a repository the GitHub App cannot reach', async () => {
      expect(unreachable.enabled).toBe(true)

      const one = await apiClient<Repository>(endpoints.repos.detail(unreachable.id))
      expect(one.enabled).toBe(false)
      expect(one.installationAvailable).toBe(false)

      const list = await apiClient<Repository[]>(endpoints.repos.list())
      expect(list.find((item) => item.id === unreachable.id)?.enabled).toBe(false)
    })

    it('reads the preference for a repository the GitHub App can reach', async () => {
      const list = await apiClient<Repository[]>(endpoints.repos.list())

      expect(list.find((item) => item.id === available.id)?.enabled).toBe(true)
    })

    it('answers PATCH { enabled: true } for an unreachable repository with enabled: false', async () => {
      const updated = await apiClient<Repository>(endpoints.repos.update(unreachable.id), {
        body: { enabled: true },
      })

      expect(updated.enabled).toBe(false)
      expect(updated.installationAvailable).toBe(false)
      const one = await apiClient<Repository>(endpoints.repos.detail(unreachable.id))
      expect(one.enabled).toBe(false)
    })

    it('answers PATCH { enabled: false } for an unreachable repository with enabled: false', async () => {
      const updated = await apiClient<Repository>(endpoints.repos.update(unreachable.id), {
        body: { enabled: false },
      })

      expect(updated.enabled).toBe(false)
    })

    it('stores the preference of an unreachable repository both ways while serving enabled: false', async () => {
      expect(readStoredMockRepository(unreachable.id)?.enabled).toBe(true)

      const off = await apiClient<Repository>(endpoints.repos.update(unreachable.id), {
        body: { enabled: false },
      })
      expect(off.enabled).toBe(false)
      expect(readStoredMockRepository(unreachable.id)?.enabled).toBe(false)
      expect((await apiClient<Repository>(endpoints.repos.detail(unreachable.id))).enabled).toBe(
        false,
      )

      const on = await apiClient<Repository>(endpoints.repos.update(unreachable.id), {
        body: { enabled: true },
      })
      expect(on.enabled).toBe(false)
      expect(readStoredMockRepository(unreachable.id)?.enabled).toBe(true)
      expect((await apiClient<Repository>(endpoints.repos.detail(unreachable.id))).enabled).toBe(
        false,
      )
    })

    it('answers PATCH of a reachable repository with the preference it stored', async () => {
      const off = await apiClient<Repository>(endpoints.repos.update(available.id), {
        body: { enabled: false },
      })
      expect(off.enabled).toBe(false)
      expect((await apiClient<Repository>(endpoints.repos.detail(available.id))).enabled).toBe(
        false,
      )

      const on = await apiClient<Repository>(endpoints.repos.update(available.id), {
        body: { enabled: true },
      })
      expect(on.enabled).toBe(true)
      expect((await apiClient<Repository>(endpoints.repos.detail(available.id))).enabled).toBe(true)
    })
  })

  describe('ragEnabled is the effective value and decides the index', () => {
    const [ready, , unreachable, ragOff] = mockRepositories
    if (
      ready?.ragIndex.status !== 'ready' ||
      unreachable?.installationAvailable !== false ||
      ragOff?.ragEnabled !== false
    ) {
      throw new Error(
        'the first mock repository must have a ready index, the third no App access, the fourth RAG off',
      )
    }
    const disabled = {
      status: 'disabled',
      indexedCommitSha: null,
      indexedAt: null,
      fileCount: 0,
      symbolCount: 0,
      lastErrorCode: null,
    }
    const empty = { ...disabled, status: 'empty' }

    beforeEach(() => {
      initMockTransport()
    })

    it('serves ragEnabled: false and a disabled index for a repository the GitHub App cannot reach', async () => {
      expect(readStoredMockRepository(unreachable.id)?.ragEnabled).toBe(true)
      expect(readStoredMockRepository(unreachable.id)?.ragIndex.status).toBe('stale')

      const one = await apiClient<Repository>(endpoints.repos.detail(unreachable.id))
      expect(one.ragEnabled).toBe(false)
      expect(one.ragIndex).toEqual(disabled)

      const list = await apiClient<Repository[]>(endpoints.repos.list())
      const row = list.find((item) => item.id === unreachable.id)
      expect(row?.ragEnabled).toBe(false)
      expect(row?.ragIndex).toEqual(disabled)
    })

    it('serves the stored index of a reachable repository with RAG on', async () => {
      const one = await apiClient<Repository>(endpoints.repos.detail(ready.id))

      expect(one.ragEnabled).toBe(true)
      expect(one.ragIndex).toEqual({
        status: 'ready',
        indexedCommitSha: '4f1c2e9a7b3d5e6f8091a2b3c4d5e6f708192a3b',
        indexedAt: '2026-09-18T11:40:00.000Z',
        fileCount: 214,
        symbolCount: 3187,
        lastErrorCode: null,
      })
    })

    it('drops the index on PATCH { ragEnabled: false } and starts from empty on true', async () => {
      const off = await apiClient<Repository>(endpoints.repos.update(ready.id), {
        body: { ragEnabled: false },
      })
      expect(off.ragEnabled).toBe(false)
      expect(off.ragIndex).toEqual(disabled)
      expect((await apiClient<Repository>(endpoints.repos.detail(ready.id))).ragIndex).toEqual(
        disabled,
      )

      const on = await apiClient<Repository>(endpoints.repos.update(ready.id), {
        body: { ragEnabled: true },
      })
      expect(on.ragEnabled).toBe(true)
      expect(on.ragIndex).toEqual(empty)
      // The first GET after a switch-on is the build's first tick (ui#102, D3): the stored index
      // is `empty` until then.
      expect(readStoredMockRepository(ready.id)?.ragIndex).toEqual(empty)
    })

    it('switches RAG on from off with an empty index', async () => {
      const on = await apiClient<Repository>(endpoints.repos.update(ragOff.id), {
        body: { ragEnabled: true },
      })

      expect(on.ragEnabled).toBe(true)
      expect(on.ragIndex).toEqual(empty)
    })

    it('keeps the index when ragEnabled is re-sent unchanged or left out', async () => {
      const same = await apiClient<Repository>(endpoints.repos.update(ready.id), {
        body: { ragEnabled: true },
      })
      expect(same.ragIndex.status).toBe('ready')

      const other = await apiClient<Repository>(endpoints.repos.update(ready.id), {
        body: { maxComments: 3 },
      })
      expect(other.ragEnabled).toBe(true)
      expect(other.ragIndex.status).toBe('ready')
    })

    it('stores ragEnabled of an unreachable repository both ways while serving it off', async () => {
      const off = await apiClient<Repository>(endpoints.repos.update(unreachable.id), {
        body: { ragEnabled: false },
      })
      expect(off.ragEnabled).toBe(false)
      expect(off.ragIndex).toEqual(disabled)
      expect(readStoredMockRepository(unreachable.id)?.ragEnabled).toBe(false)
      expect(readStoredMockRepository(unreachable.id)?.ragIndex).toEqual(disabled)

      const on = await apiClient<Repository>(endpoints.repos.update(unreachable.id), {
        body: { ragEnabled: true },
      })
      expect(on.ragEnabled).toBe(false)
      expect(on.ragIndex).toEqual(disabled)
      expect(readStoredMockRepository(unreachable.id)?.ragEnabled).toBe(true)
      expect(readStoredMockRepository(unreachable.id)?.ragIndex).toEqual(empty)
    })

    it('never writes the read-only ragIndex', async () => {
      const updated = await apiClient<Repository>(endpoints.repos.update(ragOff.id), {
        body: { maxComments: 4, ragIndex: { ...disabled, status: 'ready', fileCount: 1 } },
      })

      expect(updated.maxComments).toBe(4)
      expect(updated.ragIndex).toEqual(disabled)
    })

    it('hands out copies of the index', async () => {
      const one = await apiClient<Repository>(endpoints.repos.detail(ready.id))
      one.ragIndex.fileCount = 0
      expect(
        (await apiClient<Repository>(endpoints.repos.detail(ready.id))).ragIndex.fileCount,
      ).toBe(214)

      const masked = await apiClient<Repository>(endpoints.repos.detail(unreachable.id))
      masked.ragIndex.fileCount = 7
      expect(
        (await apiClient<Repository>(endpoints.repos.detail(unreachable.id))).ragIndex,
      ).toEqual(disabled)
    })
  })

  // ui#102, D3: a switch-on starts a simulated build that GET requests advance, as the worker of
  // api#143 will; PATCH answers the stored `empty`, it never ticks.
  describe('the RAG index build after a switch-on', () => {
    const [ready, , unreachable, docs] = mockRepositories
    if (
      ready?.ragIndex.status !== 'ready' ||
      unreachable?.installationAvailable !== false ||
      docs?.ragEnabled !== false
    ) {
      throw new Error(
        'the first mock repository must have a ready index, the third no App access, the fourth RAG off',
      )
    }
    const disabled = {
      status: 'disabled',
      indexedCommitSha: null,
      indexedAt: null,
      fileCount: 0,
      symbolCount: 0,
      lastErrorCode: null,
    }
    const empty = { ...disabled, status: 'empty' }
    const building = { ...disabled, status: 'building' }
    const published = {
      status: 'ready',
      indexedCommitSha: MOCK_RAG_INDEXED_SHA,
      indexedAt: '2026-10-22T09:30:00.000Z',
      fileCount: 42,
      symbolCount: 310,
      lastErrorCode: null,
    }

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-10-22T09:30:00.000Z'))
      initMockTransport()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    const switchRag = (id: string, ragEnabled: boolean) =>
      apiClient<Repository>(endpoints.repos.update(id), { body: { ragEnabled } })
    const listIndex = async (id: string) =>
      (await apiClient<Repository[]>(endpoints.repos.list())).find((item) => item.id === id)
        ?.ragIndex
    const detailIndex = async (id: string) =>
      (await apiClient<Repository>(endpoints.repos.detail(id))).ragIndex

    it('answers PATCH with empty, then building twice, then ready with the published index', async () => {
      expect(MOCK_RAG_BUILD_GETS).toBe(2)

      const on = await switchRag(docs.id, true)
      expect(on.ragIndex).toEqual(empty)

      expect(await listIndex(docs.id)).toEqual(building)
      expect(await listIndex(docs.id)).toEqual(building)
      expect(await listIndex(docs.id)).toEqual(published)
      expect(await listIndex(docs.id)).toEqual(published)
      expect(await detailIndex(docs.id)).toEqual(published)
    })

    it('ticks the same counter from the list and from the detail', async () => {
      await switchRag(docs.id, true)

      expect(await detailIndex(docs.id)).toEqual(building)
      expect(await listIndex(docs.id)).toEqual(building)
      expect(await detailIndex(docs.id)).toEqual(published)
    })

    it('ticks only the repository that was switched on', async () => {
      await switchRag(docs.id, true)

      expect(await listIndex(docs.id)).toEqual(building)
      expect((await detailIndex(ready.id)).fileCount).toBe(214)
      expect(await listIndex(docs.id)).toEqual(building)
      expect(await listIndex(docs.id)).toEqual(published)
      expect((await detailIndex(ready.id)).fileCount).toBe(214)
    })

    it('does not tick on PATCH', async () => {
      await switchRag(docs.id, true)
      expect(await listIndex(docs.id)).toEqual(building)

      const other = await apiClient<Repository>(endpoints.repos.update(docs.id), {
        body: { maxComments: 4 },
      })
      expect(other.ragIndex).toEqual(building)

      expect(await listIndex(docs.id)).toEqual(building)
      expect(await listIndex(docs.id)).toEqual(published)
    })

    it('does not start a build for a PATCH without ragEnabled', async () => {
      await apiClient<Repository>(endpoints.repos.update(docs.id), { body: { maxComments: 4 } })

      expect(await listIndex(docs.id)).toEqual(disabled)
      expect(await listIndex(docs.id)).toEqual(disabled)
      expect(readStoredMockRepository(docs.id)?.ragIndex).toEqual(disabled)
    })

    it('does not restart a build that PATCH { ragEnabled: true } re-sends', async () => {
      await switchRag(docs.id, true)
      expect(await listIndex(docs.id)).toEqual(building)

      const again = await switchRag(docs.id, true)
      expect(again.ragIndex).toEqual(building)

      expect(await listIndex(docs.id)).toEqual(building)
      expect(await listIndex(docs.id)).toEqual(published)
    })

    it('keeps a ready index that PATCH { ragEnabled: true } re-sends', async () => {
      await switchRag(ready.id, true)

      expect(await listIndex(ready.id)).toMatchObject({ status: 'ready', fileCount: 214 })
      expect(await listIndex(ready.id)).toMatchObject({ status: 'ready', fileCount: 214 })
      expect(await listIndex(ready.id)).toMatchObject({ status: 'ready', fileCount: 214 })
    })

    it('drops the build on PATCH { ragEnabled: false } and ticks no further', async () => {
      await switchRag(docs.id, true)
      expect(await listIndex(docs.id)).toEqual(building)

      const off = await switchRag(docs.id, false)
      expect(off.ragEnabled).toBe(false)
      expect(off.ragIndex).toEqual(disabled)

      for (let get = 0; get < MOCK_RAG_BUILD_GETS + 2; get += 1) {
        expect(await listIndex(docs.id)).toEqual(disabled)
      }
      expect(readStoredMockRepository(docs.id)?.ragIndex).toEqual(disabled)
    })

    it('starts a new build from the first tick after a switch-off and a switch-on', async () => {
      await switchRag(docs.id, true)
      expect(await listIndex(docs.id)).toEqual(building)
      expect(await listIndex(docs.id)).toEqual(building)

      await switchRag(docs.id, false)
      expect((await switchRag(docs.id, true)).ragIndex).toEqual(empty)

      expect(await listIndex(docs.id)).toEqual(building)
      expect(await listIndex(docs.id)).toEqual(building)
      expect(await listIndex(docs.id)).toEqual(published)
    })

    it('never leaves disabled for a repository the GitHub App cannot reach', async () => {
      await switchRag(unreachable.id, false)
      const on = await switchRag(unreachable.id, true)
      expect(on.ragEnabled).toBe(false)
      expect(on.ragIndex).toEqual(disabled)

      for (let get = 0; get < MOCK_RAG_BUILD_GETS + 2; get += 1) {
        expect(await listIndex(unreachable.id)).toEqual(disabled)
        expect(await detailIndex(unreachable.id)).toEqual(disabled)
      }
      expect(readStoredMockRepository(unreachable.id)?.ragIndex).toEqual(empty)
    })

    it('clears the build with initMockTransport', async () => {
      await switchRag(ready.id, false)
      await switchRag(ready.id, true)

      initMockTransport()

      expect(await listIndex(ready.id)).toMatchObject({ status: 'ready', fileCount: 214 })
      expect(await listIndex(docs.id)).toEqual(disabled)
    })

    it('never writes the fixture', async () => {
      await switchRag(docs.id, true)
      await listIndex(docs.id)
      await listIndex(docs.id)
      await listIndex(docs.id)

      expect(mockRepositories[3]?.ragEnabled).toBe(false)
      expect(mockRepositories[3]?.ragIndex).toEqual(disabled)
    })
  })

  describe('PATCH /repos/{id}', () => {
    const [repo] = mockRepositories
    if (!repo) {
      throw new Error('mock repositories are empty')
    }
    const patched = repo.maxComments === 3 ? 4 : 3

    beforeEach(() => {
      initMockTransport()
    })

    it('leaves the exported mockRepositories untouched', async () => {
      const before = structuredClone(mockRepositories)

      const updated = await apiClient<Repository>(endpoints.repos.update(repo.id), {
        body: { maxComments: patched },
      })

      expect(updated.maxComments).toBe(patched)
      expect(mockRepositories).toEqual(before)
    })

    it('serves the patched value from GET one and from the list', async () => {
      await apiClient<Repository>(endpoints.repos.update(repo.id), {
        body: { maxComments: patched },
      })

      const one = await apiClient<Repository>(endpoints.repos.detail(repo.id))
      expect(one.maxComments).toBe(patched)

      const list = await apiClient<Repository[]>(endpoints.repos.list())
      expect(list.find((item) => item.id === repo.id)?.maxComments).toBe(patched)
    })

    it('hands out copies of the working copy and drops it on re-init', async () => {
      const updated = await apiClient<Repository>(endpoints.repos.update(repo.id), {
        body: { maxComments: patched },
      })
      updated.maxComments = patched + 1

      const one = await apiClient<Repository>(endpoints.repos.detail(repo.id))
      expect(one.maxComments).toBe(patched)

      initMockTransport()

      const reset = await apiClient<Repository>(endpoints.repos.detail(repo.id))
      expect(reset.maxComments).toBe(repo.maxComments)
    })

    it('hands out copies of the rows from the list', async () => {
      const first = await apiClient<Repository[]>(endpoints.repos.list())
      const row = first.find((item) => item.id === repo.id)
      if (!row) {
        throw new Error('mock repository is missing from the list')
      }
      row.maxComments = patched

      const one = await apiClient<Repository>(endpoints.repos.detail(repo.id))
      expect(one.maxComments).toBe(repo.maxComments)

      const second = await apiClient<Repository[]>(endpoints.repos.list())
      expect(second.find((item) => item.id === repo.id)?.maxComments).toBe(repo.maxComments)
    })

    it('hands out copies of the branchFilter array', async () => {
      const updated = await apiClient<Repository>(endpoints.repos.update(repo.id), {
        body: { branchFilter: ['main'] },
      })
      updated.branchFilter.push('from-patch')

      const one = await apiClient<Repository>(endpoints.repos.detail(repo.id))
      expect(one.branchFilter).toEqual(['main'])
      one.branchFilter.push('from-detail')

      const list = await apiClient<Repository[]>(endpoints.repos.list())
      const row = list.find((item) => item.id === repo.id)
      expect(row?.branchFilter).toEqual(['main'])
      row?.branchFilter.push('from-list')

      const again = await apiClient<Repository>(endpoints.repos.detail(repo.id))
      expect(again.branchFilter).toEqual(['main'])
    })

    it('saves branchFilter and severityThreshold and serves them back', async () => {
      const updated = await apiClient<Repository>(endpoints.repos.update(repo.id), {
        body: { branchFilter: ['develop', 'hotfix/**'], severityThreshold: 'warning' },
      })

      expect(updated.branchFilter).toEqual(['develop', 'hotfix/**'])
      expect(updated.severityThreshold).toBe('warning')
      const one = await apiClient<Repository>(endpoints.repos.detail(repo.id))
      expect(one.branchFilter).toEqual(['develop', 'hotfix/**'])
      expect(one.severityThreshold).toBe('warning')
    })

    it('saves an empty branchFilter as all branches', async () => {
      const updated = await apiClient<Repository>(endpoints.repos.update(repo.id), {
        body: { branchFilter: [] },
      })

      expect(updated.branchFilter).toEqual([])
    })

    it('never writes the read-only installationAvailable', async () => {
      const [, , unreachable] = mockRepositories
      if (unreachable?.installationAvailable !== false) {
        throw new Error('the third mock repository must be unreachable for the GitHub App')
      }

      const updated = await apiClient<Repository>(endpoints.repos.update(unreachable.id), {
        body: { maxComments: 4, installationAvailable: true },
      })

      expect(updated.maxComments).toBe(4)
      expect(updated.installationAvailable).toBe(false)
    })

    describe('422', () => {
      const repoId = repo.id

      async function rejection(body: unknown): Promise<ApiError> {
        try {
          await apiClient<Repository>(endpoints.repos.update(repoId), { body })
        } catch (error) {
          if (error instanceof ApiError) {
            return error
          }
          throw error
        }
        throw new Error('the PATCH was expected to be rejected')
      }

      // api PR #156 validates the whole list in one validator: one refusal, no mask index.
      it('answers 422 with one item at the field for several invalid branch masks', async () => {
        const error = await rejection({ branchFilter: ['main', 'release 1', 'ok/*', 'feat/a..b'] })

        expect(error.status).toBe(422)
        expect(error.data).toEqual({
          detail: [
            {
              loc: ['body', 'branchFilter'],
              msg: expect.any(String) as string,
              type: 'value_error',
            },
          ],
        })
        expect(validationErrorLocations(error.data)).toEqual([{ path: ['body', 'branchFilter'] }])
      })

      // The masks api PR #156 refuses (`branch_patterns._pattern_error`), one reason each.
      it.each([
        ['whitespace inside', 'release 1'],
        ['leading whitespace', ' main'],
        ['a tab', 'feat\tx'],
        ['a control character', 'feat\u0001x'],
        ['a backslash', 'feat\\x'],
        ['two dots', 'feat/a..b'],
        ['a double slash', 'feat//x'],
        ['a leading slash', '/main'],
        ['a trailing slash', 'feat/'],
        ['a .lock suffix', 'feat/x.lock'],
        ['a tilde', 'feat~1'],
        ['a caret', 'feat^'],
        ['a colon', 'feat:x'],
        ['a question mark', 'feat/?'],
        ['an opening bracket', 'v[0-9]*'],
        ['a closing bracket', 'feat/ab]'],
        ['an opening brace', 'feat/{a,b'],
        ['a closing brace', 'feat/a}'],
        ['an exclamation mark', '!main'],
        ['three stars in a row', 'feat/***'],
        ['a segment starting with a dot', 'feat/.hidden'],
        ['a leading dash', '-main'],
        ['a trailing dot', 'feat.'],
        ['a lone @', '@'],
        ['a lone surrogate', 'feat/\ud800x'],
      ])('rejects a mask with %s', async (_name, mask) => {
        const error = await rejection({ branchFilter: [mask] })

        expect(error.status).toBe(422)
        expect(validationErrorLocations(error.data)).toEqual([{ path: ['body', 'branchFilter'] }])
      })

      it.each([
        'main',
        'release/*',
        'feat/**',
        '*',
        '**',
        'hotfix/v1.2',
        'feature/a-b_c',
        'a@b',
        'feat/\u{1f642}',
      ])('accepts the mask %s', async (mask) => {
        const updated = await apiClient<Repository>(endpoints.repos.update(repo.id), {
          body: { branchFilter: [mask] },
        })

        expect(updated.branchFilter).toEqual([mask])
      })

      it('rejects a repeated mask at the field, once', async () => {
        const error = await rejection({ branchFilter: ['main', 'release/*', 'main', 'release/*'] })

        expect(error.status).toBe(422)
        expect(validationErrorLocations(error.data)).toEqual([{ path: ['body', 'branchFilter'] }])
      })

      it('gives a malformed repeated mask one entry, not one per index', async () => {
        const error = await rejection({ branchFilter: ['a..b', 'a..b'] })

        expect(validationErrorLocations(error.data)).toEqual([{ path: ['body', 'branchFilter'] }])
      })

      it('answers 422 for a schema violation with its location', async () => {
        const error = await rejection({ severityThreshold: 'info' })

        expect(error.status).toBe(422)
        expect(validationErrorLocations(error.data)).toEqual([
          { path: ['body', 'severityThreshold'] },
        ])
      })

      // api PR #156 checks the length of a mask in the same list validator: no mask index either.
      it('answers 422 at the field for an empty mask, a mask over 255 characters and a long list', async () => {
        for (const branchFilter of [
          ['main', ''],
          ['main', 'a'.repeat(256)],
          ['', 'a'.repeat(256)],
          Array.from({ length: 21 }, (_item, index) => `release/${String(index)}`),
        ]) {
          const error = await rejection({ branchFilter })

          expect(error.status).toBe(422)
          expect(validationErrorLocations(error.data)).toEqual([{ path: ['body', 'branchFilter'] }])
        }
      })

      it('answers 422 for an empty patch', async () => {
        const error = await rejection({})

        expect(error.status).toBe(422)
        expect(validationErrorLocations(error.data)).toEqual([{ path: ['body'] }])
      })

      it('leaves the stored repository untouched after a 422', async () => {
        await rejection({ branchFilter: ['bad mask'], maxComments: 2 })

        const one = await apiClient<Repository>(endpoints.repos.detail(repo.id))
        expect(one.branchFilter).toEqual(repo.branchFilter)
        expect(one.maxComments).toBe(repo.maxComments)
      })
    })
  })
})
