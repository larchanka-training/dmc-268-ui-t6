import { z } from 'zod'

import { RawFileDiffSchema } from '../../entities/diff'
import {
  ACTIVE_RUN_STATUSES,
  RunListQuerySchema,
  type RunListPage,
  type RunSession,
  type RunStatus,
} from '../../entities/run'
import { makeDuoActions } from '../../entities/run/lib/duoActions.fixture'
import {
  disabledRagIndex,
  RepositorySchema,
  UpdateRepositorySchema,
  type RagIndex,
  type Repository,
  type RulesStatus,
  type UpdateRepositoryInput,
} from '../../entities/repository'
import { setMockAuthAdapter, useAuthStore } from '../../features/auth'
import type { BitbucketConnectionItem } from '../../features/bitbucket-connections/model/schemas'
import {
  ApiError,
  setAccessToken,
  setMockTransport,
  type MockTransportHandler,
} from '../../shared/api/client'
import { USE_MOCKS } from '../../shared/config/env'
import { applyRunUpdated } from '../providers/runStreamConnect'
import { SAMPLE_FILE_A_LINES, SAMPLE_PATCHES } from '../../shared/fixtures/sample.patch'
import {
  mockCurrentUser,
  mockRepositories,
  mockReviewComments,
  mockSummaryOnlyDiff,
  MOCK_NOW,
} from './app-state'
import { mockRulesStatuses } from './mockRulesStatus'
import { mockRunsListPage } from './mockRunsList.fixture'
import { buildMockRunDetail, mockRawDiffForRun, REVIEW_DEMO_RUN_ID } from './mockRunReview'
import {
  buildWalkingRunDetail,
  currentWalkingRun,
  FAILED_RUN_ID,
  makeFailedRunActions,
  resetWalkingRun,
  startWalkingRun,
  WALKING_RUN_ID,
} from './mockRunTimeline'

export const MOCK_TOKEN = 'mock_jwt_token_skvertl_dmc'
export const MOCK_OAUTH_CODE = 'mock_code_123'

// Working copy of the fixture: PATCH edits stay here, `mockRepositories` is never written. Its
// `enabled` and `ragEnabled` are the stored preferences; what the transport serves is
// `serveRepository` of it.
let repositories: Repository[] = structuredClone(mockRepositories)
let runSessions: RunSession[] = structuredClone(mockRunsListPage.items)
const MOCK_BITBUCKET_WORKSPACE_ID = '123e4567-e89b-12d3-a456-426614174000'
const MOCK_BITBUCKET_INSTALLATION_ID = '55555555-5555-4555-8555-555555555555'
const BITBUCKET_WEBHOOK_EVENTS = [
  'repo:push',
  'pullrequest:created',
  'pullrequest:updated',
  'pullrequest:fulfilled',
  'pullrequest:rejected',
] as const
const MOCK_BITBUCKET_REPOSITORIES = [
  {
    uuid: '66666666-6666-4666-8666-666666666666',
    repositoryId: '77777777-7777-4777-8777-777777777777',
    workspaceSlug: 'demo-bitbucket',
    slug: 'private-repo',
    name: 'Private repo',
    isPrivate: true,
    htmlUrl: 'https://bitbucket.org/demo-bitbucket/private-repo',
  },
  {
    uuid: '88888888-8888-4888-8888-888888888888',
    repositoryId: '99999999-9999-4999-8999-999999999999',
    workspaceSlug: 'demo-bitbucket',
    slug: 'second-repo',
    name: 'Second repo',
    isPrivate: false,
    htmlUrl: 'https://bitbucket.org/demo-bitbucket/second-repo',
  },
] as const
let bitbucketConnections: BitbucketConnectionItem[] = []
let bitbucketToken: string | null = null
let bitbucketCredentialGeneration = 1
let bitbucketHookSequence = 0
const createdRunIds = new Set<string>()
// Repositories whose rules status has been asked for since `initMockTransport`.
const rulesStatusAsked = new Set<string>()

/** GETs after a switch-on that still answer `building`; the next one publishes `ready` (ui#102, D3). */
export const MOCK_RAG_BUILD_GETS = 2
export const MOCK_RAG_INDEXED_SHA = 'c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00'
// Repository id -> GETs already served as `building` since its RAG was switched on.
const ragBuildTicks = new Map<string, number>()

/**
 * A copy of a stored repository as the api serves it: `enabled` is the effective
 * `enabled AND installationAvailable` (api `repository_settings.py:27`, SD §6.9), so a
 * repository the GitHub App cannot reach reads `enabled: false` whatever was stored, and the
 * stored preference is write-only there. `ragEnabled` is masked the same way, and the index of a
 * repository whose effective `ragEnabled` is false reads `disabled` (api#145).
 */
function serveRepository(repository: Repository): Repository {
  const ragEnabled = repository.ragEnabled && repository.installationAvailable
  return {
    ...structuredClone(repository),
    enabled: repository.enabled && repository.installationAvailable,
    ragEnabled,
    ragIndex: ragEnabled ? structuredClone(repository.ragIndex) : { ...disabledRagIndex },
  }
}

/**
 * The stored index after a PATCH. Only a change of the stored `ragEnabled` moves it: switching RAG
 * off drops the index (`disabled`), switching it on starts from `empty`, as no index is built until
 * api#143. Re-sending the stored value, or a patch without `ragEnabled`, keeps the index.
 */
function ragIndexAfterPatch(stored: Repository, patch: UpdateRepositoryInput): RagIndex {
  if (patch.ragEnabled === undefined || patch.ragEnabled === stored.ragEnabled) {
    return stored.ragIndex
  }
  return patch.ragEnabled ? { ...disabledRagIndex, status: 'empty' } : { ...disabledRagIndex }
}

/**
 * One GET of the simulated index build (ui#102, D3), in place on the stored row: the first
 * `MOCK_RAG_BUILD_GETS` GETs after a switch-on answer `building`, the next one publishes `ready`.
 * Called by the GETs, not by `serveRepository`: the PATCH answer stays `empty`. A repository the
 * GitHub App cannot reach, or whose RAG is off, builds nothing.
 */
function tickRagBuild(stored: Repository): void {
  const ticks = ragBuildTicks.get(stored.id)
  if (ticks === undefined) return
  if (!stored.ragEnabled || !stored.installationAvailable) {
    ragBuildTicks.delete(stored.id)
    return
  }
  if (ticks < MOCK_RAG_BUILD_GETS) {
    ragBuildTicks.set(stored.id, ticks + 1)
    stored.ragIndex = { ...disabledRagIndex, status: 'building' }
    return
  }
  ragBuildTicks.delete(stored.id)
  stored.ragIndex = {
    status: 'ready',
    indexedCommitSha: MOCK_RAG_INDEXED_SHA,
    indexedAt: new Date().toISOString(),
    fileCount: 42,
    symbolCount: 310,
    lastErrorCode: null,
  }
}

/**
 * The repository as stored, before `serveRepository`: its `enabled` and `ragEnabled` are the user's
 * preferences, which the api never returns while the GitHub App has no access, and its `ragIndex`
 * is the index served while RAG is effectively on. For tests; the app does not call it.
 */
export function readStoredMockRepository(id: string): Repository | undefined {
  return structuredClone(repositories.find((repo) => repo.id === id))
}

function findRunSession(id: string) {
  const session =
    id === WALKING_RUN_ID ? currentWalkingRun().session : runSessions.find((run) => run.id === id)
  return session ? structuredClone(session) : undefined
}

/**
 * The api default of `limit` (50) is mirrored, and so is its cap, through `RunListQuerySchema`
 * (`limit` 1..100, else 422).
 */
const MOCK_RUN_LIST_DEFAULT_LIMIT = 50
const MOCK_RUN_CURSOR = /^mock:(\d+)$/

function invalidRunListQuery(field: 'cursor' | 'limit' | 'repo' | 'status'): ApiError {
  return new ApiError(422, 'Unprocessable Entity', {
    detail: [{ loc: ['query', field], msg: 'invalid value', type: 'value_error' }],
  })
}

/**
 * `GET /runs` as the api serves it: filtered by `repo`, cut at `limit` (default 50), continued by
 * an opaque cursor. The cursor here is `mock:<offset>`; a client must not read it.
 */
function listMockRuns(search: string): RunListPage {
  const params = new URLSearchParams(search)
  const rawLimit = params.get('limit')
  const parsed = RunListQuerySchema.safeParse({
    status: params.get('status') ?? undefined,
    repo: params.get('repo') ?? undefined,
    cursor: params.get('cursor') ?? undefined,
    limit: rawLimit === null ? undefined : Number(rawLimit),
  })
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0]
    throw invalidRunListQuery(
      field === 'cursor' || field === 'limit' || field === 'status' ? field : 'repo',
    )
  }
  const { repo, cursor, limit = MOCK_RUN_LIST_DEFAULT_LIMIT } = parsed.data
  let offset = 0
  if (cursor !== undefined) {
    const match = MOCK_RUN_CURSOR.exec(cursor)
    if (!match) {
      throw invalidRunListQuery('cursor')
    }
    offset = Number(match[1])
  }

  const matching = runSessions.filter(
    (item) => repo === undefined || item.pullRequest.repo === repo,
  )
  const end = offset + limit
  return {
    items: matching.slice(offset, end).map((item) => {
      const run = item.id === WALKING_RUN_ID ? currentWalkingRun().session : item
      return { ...run, pullRequest: { ...run.pullRequest } }
    }),
    nextCursor: end < matching.length ? `mock:${String(end)}` : null,
  }
}

interface ValidationDetailItem {
  loc: (string | number)[]
  msg: string
  type: string
}

function unprocessable(detail: ValidationDetailItem[]): ApiError {
  return new ApiError(422, 'Unprocessable Entity', { detail })
}

/**
 * Whether a branch mask is one the mock accepts: the refusals listed by the merged api
 * (`contracts/openapi.yaml:1465-1469`, `_pattern_error` in api PR #156) after the length checks
 * Zod already makes. `*` and `**` stay valid; `*` three times in a row does not. The api judges
 * the real grammar; the mock stands in for it with its refusals the same, as an independent copy.
 * The settings form refuses the same masks and drops repeats before it sends (`branchMaskError`),
 * so this 422 is reached only by direct transport calls and tests.
 */
function isMockBranchMaskValid(mask: string): boolean {
  const refused =
    /[\s\p{Cc}\p{Cs}]/u.test(mask) ||
    mask.includes('***') ||
    /[?[\]{}!\\~^:]/.test(mask) ||
    mask.includes('..') ||
    mask.includes('//') ||
    mask.split('/').some((segment) => segment.startsWith('.')) ||
    mask.startsWith('/') ||
    mask.startsWith('-') ||
    mask.endsWith('/') ||
    mask.endsWith('.') ||
    mask.endsWith('.lock') ||
    mask === '@'
  return !refused
}

/**
 * The 422 for a PATCH body the api would not take. A schema violation keeps its Zod location,
 * except in `branchFilter`: a refused mask, a repeated one, an empty or a long one and a list
 * that is too long are all a single item at the field, `['body', 'branchFilter']`, with no mask
 * index. api PR #156 validates the whole list in one validator, so it cannot say which mask it
 * refused.
 */
function validatePatchBody(body: object): UpdateRepositoryInput {
  const parsed = UpdateRepositorySchema.safeParse(body)
  if (!parsed.success) {
    const detail: ValidationDetailItem[] = []
    for (const issue of parsed.error.issues) {
      const path = issue.path.map((segment) =>
        typeof segment === 'symbol' ? String(segment) : segment,
      )
      const atBranchFilter = path[0] === 'branchFilter'
      if (atBranchFilter && detail.some((item) => item.loc[1] === 'branchFilter')) {
        continue
      }
      detail.push({
        loc: atBranchFilter ? ['body', 'branchFilter'] : ['body', ...path],
        msg: issue.message,
        type: 'value_error',
      })
    }
    throw unprocessable(detail)
  }
  const masks = parsed.data.branchFilter ?? []
  if (new Set(masks).size !== masks.length || !masks.every(isMockBranchMaskValid)) {
    throw unprocessable([
      {
        loc: ['body', 'branchFilter'],
        msg: 'Value error, invalid branch filter',
        type: 'value_error',
      },
    ])
  }
  return parsed.data
}

/**
 * `GET /repos/{id}/rules-status`. The answer comes after the caller has had its turn, as a network
 * answer would, and a request cancelled by then is refused with the abort and uses nothing up:
 * StrictMode in `pnpm dev` cancels the first GET of the rules block at once, and the `pending` of a
 * newly connected repository belongs to the GET that stays.
 */
async function answerRulesStatus(
  id: string | undefined,
  signal: AbortSignal | null | undefined,
): Promise<RulesStatus> {
  await Promise.resolve()
  signal?.throwIfAborted()

  const repository = repositories.find((item) => item.id === id)
  const status: RulesStatus | undefined =
    id === undefined
      ? undefined
      : (mockRulesStatuses[id] ??
        (repository?.provider === 'bitbucket'
          ? {
              status: 'missing',
              branch: repository.defaultBranch,
              path: '.review/rules.md',
              checkedAt: MOCK_NOW,
              sha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
              defaultsVersion: 'v1',
            }
          : undefined))
  if (id === undefined || !status || !repository) {
    throw new ApiError(404, 'Not Found', { message: 'Repository not found' })
  }
  // A newly connected repository (the fixture says there is no file): the worker has not read it
  // yet, so its first GET is `pending`; the next one shows the fixture, as the finished read.
  if (status.status === 'missing' && !rulesStatusAsked.has(id)) {
    rulesStatusAsked.add(id)
    return {
      status: 'pending',
      branch: status.branch,
      path: status.path,
      sha: null,
      checkedAt: null,
    }
  }
  return structuredClone(status)
}

function handleMockTransport(
  endpoint: Parameters<MockTransportHandler>[0],
  options: Parameters<MockTransportHandler>[1],
): unknown {
  if (endpoint.path === '/repos' && endpoint.method === 'GET') {
    repositories.forEach(tickRagBuild)
    return repositories.map(serveRepository)
  }

  const queryStart = endpoint.path.indexOf('?')
  const pathname = queryStart === -1 ? endpoint.path : endpoint.path.slice(0, queryStart)
  const bitbucketMatch = /^\/workspaces\/([^/]+)\/bitbucket\/(.*)$/.exec(pathname)
  if (bitbucketMatch) {
    const [, workspaceId, suffix] = bitbucketMatch
    if (workspaceId !== MOCK_BITBUCKET_WORKSPACE_ID) {
      throw new ApiError(404, 'Not Found', { detail: 'workspace_not_found' })
    }
    if (suffix === 'discovery' && endpoint.method === 'POST') {
      const body = z
        .object({ bitbucketWorkspace: z.string(), apiToken: z.string().min(1) })
        .parse(options.body)
      return {
        repositories:
          body.bitbucketWorkspace === 'demo-bitbucket'
            ? MOCK_BITBUCKET_REPOSITORIES.map((repo) => ({
                uuid: repo.uuid,
                workspaceSlug: repo.workspaceSlug,
                slug: repo.slug,
                name: repo.name,
                isPrivate: repo.isPrivate,
                htmlUrl: repo.htmlUrl,
              }))
            : [],
        nextCursor: null,
      }
    }
    if (suffix === 'connections' && endpoint.method === 'GET') {
      return { connections: structuredClone(bitbucketConnections), nextCursor: null }
    }
    if (suffix === 'connections' && endpoint.method === 'POST') {
      const body = z
        .object({
          bitbucketWorkspace: z.string(),
          repositorySlug: z.string(),
          repositoryUuid: z.uuid(),
          apiToken: z.string().min(1),
        })
        .parse(options.body)
      const repo = MOCK_BITBUCKET_REPOSITORIES.find(
        (item) =>
          item.workspaceSlug === body.bitbucketWorkspace && item.slug === body.repositorySlug,
      )
      if (!repo)
        throw new ApiError(422, 'Unprocessable Entity', { detail: 'repository_inaccessible' })
      if (repo.uuid !== body.repositoryUuid) {
        throw new ApiError(409, 'Conflict', { detail: 'repository_uuid_mismatch' })
      }
      if (bitbucketToken !== null && bitbucketToken !== body.apiToken) {
        throw new ApiError(409, 'Conflict', { detail: 'credential_rotation_required' })
      }
      const existing = bitbucketConnections.find((item) => item.repositoryUuid === repo.uuid)
      if (existing) {
        return {
          id: existing.id,
          repositoryId: existing.repositoryId,
          repositoryUuid: existing.repositoryUuid,
          workspaceSlug: existing.workspaceSlug,
          repositorySlug: existing.repositorySlug,
          status: existing.status,
          credentialGeneration: existing.credentialGeneration,
          webhook: null,
        }
      }
      bitbucketToken = body.apiToken
      const webhookUrl = `https://api.example.test/webhooks/bitbucket/${MOCK_BITBUCKET_INSTALLATION_ID}/${repo.repositoryId}`
      const item: BitbucketConnectionItem = {
        id: MOCK_BITBUCKET_INSTALLATION_ID,
        repositoryId: repo.repositoryId,
        repositoryUuid: repo.uuid,
        workspaceSlug: repo.workspaceSlug,
        repositorySlug: repo.slug,
        status: 'awaiting_webhook',
        credentialGeneration: bitbucketCredentialGeneration,
        webhookUrl,
      }
      bitbucketConnections.push(item)
      const base = mockRepositories[0]
      if (!base) throw new Error('Missing demo repository fixture')
      repositories.push({
        ...structuredClone(base),
        id: repo.repositoryId,
        provider: 'bitbucket',
        fullName: `${repo.workspaceSlug}/${repo.slug}`,
        url: repo.htmlUrl,
        defaultBranch: 'main',
        enabled: true,
        waitForCi: 'never',
        reviewEvent: 'COMMENT',
        installationAvailable: true,
        ragEnabled: false,
        ragIndex: { ...disabledRagIndex },
      })
      bitbucketHookSequence += 1
      return {
        id: item.id,
        repositoryId: item.repositoryId,
        repositoryUuid: item.repositoryUuid,
        workspaceSlug: item.workspaceSlug,
        repositorySlug: item.repositorySlug,
        status: item.status,
        credentialGeneration: item.credentialGeneration,
        webhook: {
          url: webhookUrl,
          events: [...BITBUCKET_WEBHOOK_EVENTS],
          secret: `demo-hook-${String(bitbucketHookSequence)}`,
        },
      }
    }
    const rotateCredential = /^connections\/([^/]+)\/credential$/.exec(suffix ?? '')
    if (rotateCredential && endpoint.method === 'PUT') {
      if (rotateCredential[1] !== MOCK_BITBUCKET_INSTALLATION_ID || !bitbucketConnections.length) {
        throw new ApiError(404, 'Not Found', { detail: 'connection_not_found' })
      }
      bitbucketToken = z.object({ apiToken: z.string().min(1) }).parse(options.body).apiToken
      bitbucketCredentialGeneration += 1
      bitbucketConnections = bitbucketConnections.map((item) => ({
        ...item,
        credentialGeneration: bitbucketCredentialGeneration,
      }))
      return {
        id: MOCK_BITBUCKET_INSTALLATION_ID,
        credentialGeneration: bitbucketCredentialGeneration,
      }
    }
    const binding = /^connections\/([^/]+)\/repositories\/([^/]+)(\/webhook-secret)?$/.exec(
      suffix ?? '',
    )
    if (binding) {
      const [, installationId, repositoryId, action] = binding
      const item = bitbucketConnections.find((entry) => entry.repositoryId === repositoryId)
      if (installationId !== MOCK_BITBUCKET_INSTALLATION_ID || !item) {
        if (!action && endpoint.method === 'DELETE') return null
        throw new ApiError(404, 'Not Found', { detail: 'repository_not_found' })
      }
      if (action === '/webhook-secret' && endpoint.method === 'POST') {
        bitbucketHookSequence += 1
        return {
          url: item.webhookUrl,
          events: [...BITBUCKET_WEBHOOK_EVENTS],
          secret: `demo-hook-${String(bitbucketHookSequence)}`,
        }
      }
      if (!action && endpoint.method === 'DELETE') {
        bitbucketConnections = bitbucketConnections.filter(
          (entry) => entry.repositoryId !== repositoryId,
        )
        repositories = repositories.filter((entry) => entry.id !== repositoryId)
        if (!bitbucketConnections.length) bitbucketToken = null
        return null
      }
    }
    throw new ApiError(404, 'Not Found', { detail: 'connection_not_found' })
  }
  if (pathname === '/runs' && endpoint.method === 'GET') {
    return listMockRuns(queryStart === -1 ? '' : endpoint.path.slice(queryStart + 1))
  }

  // Before the repository itself: `/repos/{id}/rules-status` must not be read as an id.
  const rulesStatusMatch = /^\/repos\/([^/]+)\/rules-status$/.exec(endpoint.path)
  if (rulesStatusMatch && endpoint.method === 'GET') {
    return answerRulesStatus(rulesStatusMatch[1], options.signal)
  }

  const repoDetailMatch = /^\/repos\/([^/]+)$/.exec(endpoint.path)
  if (repoDetailMatch && endpoint.method === 'GET') {
    const repo = repositories.find((r) => r.id === repoDetailMatch[1])
    if (!repo) {
      throw new ApiError(404, 'Not Found', { message: 'Repository not found' })
    }
    tickRagBuild(repo)
    return serveRepository(repo)
  }

  if (endpoint.path.startsWith('/repos/') && endpoint.method === 'PATCH') {
    const id = endpoint.path.replace('/repos/', '')
    const index = repositories.findIndex((r) => r.id === id)
    let stored = repositories[index]
    if (stored === undefined) {
      throw new ApiError(404, 'Not Found', { message: 'Repository not found' })
    }
    if (options.body && typeof options.body === 'object') {
      const patch = validatePatchBody(options.body)
      if (stored.provider === 'bitbucket') {
        const unsupportedField =
          patch.waitForCi !== undefined && patch.waitForCi !== 'never'
            ? 'waitForCi'
            : patch.reviewEvent === 'REQUEST_CHANGES'
              ? 'reviewEvent'
              : null
        if (unsupportedField) {
          throw unprocessable([
            {
              loc: ['body', unsupportedField],
              msg:
                unsupportedField === 'waitForCi'
                  ? 'bitbucket_wait_for_ci_unsupported'
                  : 'bitbucket_review_event_unsupported',
              type: 'value_error',
            },
          ])
        }
      }
      const wasRagEnabled = stored.ragEnabled
      // The patch is stored as sent: `enabled` and `ragEnabled` are the preferences, served through
      // `serveRepository`.
      stored = RepositorySchema.parse({
        ...stored,
        ...patch,
        ragIndex: ragIndexAfterPatch(stored, patch),
      })
      repositories[index] = stored
      if (patch.ragEnabled === true && !wasRagEnabled) ragBuildTicks.set(stored.id, 0)
      if (patch.ragEnabled === false) ragBuildTicks.delete(stored.id)
    }
    return serveRepository(stored)
  }

  const runDetailMatch = /^\/runs\/([^/]+)$/.exec(endpoint.path)
  if (runDetailMatch && endpoint.method === 'GET') {
    const runId = runDetailMatch[1]
    if (!runId) {
      throw new ApiError(404, 'Not Found', { message: 'Run not found' })
    }
    if (runId === WALKING_RUN_ID) {
      startWalkingRun()
    }
    const session = findRunSession(runId)
    if (!session) {
      throw new ApiError(404, 'Not Found', { message: 'Run not found' })
    }
    return runId === WALKING_RUN_ID ? buildWalkingRunDetail(session) : buildMockRunDetail(session)
  }

  const runDiffMatch = /^\/runs\/([^/]+)\/diff$/.exec(endpoint.path)
  if (runDiffMatch && endpoint.method === 'GET') {
    const runId = runDiffMatch[1]
    if (!runId) {
      throw new ApiError(404, 'Not Found', { message: 'Run not found' })
    }
    const session = findRunSession(runId)
    if (!session) {
      throw new ApiError(404, 'Not Found', { message: 'Run not found' })
    }
    const raw = mockRawDiffForRun(
      runId === WALKING_RUN_ID ? REVIEW_DEMO_RUN_ID : runId,
      SAMPLE_PATCHES.map(({ filename, patch }) => ({ filename, patch })),
      mockSummaryOnlyDiff,
    )
    return z.array(RawFileDiffSchema).parse(raw)
  }

  if (endpoint.path === '/auth/me' && endpoint.method === 'GET') {
    return {
      ...mockCurrentUser,
      workspaces: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'larchanka-training',
          installationId: 12345,
        },
      ],
    }
  }

  if (endpoint.path === '/auth/refresh' && endpoint.method === 'POST') {
    return {
      accessToken: MOCK_TOKEN,
      tokenType: 'Bearer',
      expiresIn: 900,
      user: mockCurrentUser,
    }
  }

  if (endpoint.path === '/auth/github/callback' && endpoint.method === 'POST') {
    return {
      accessToken: MOCK_TOKEN,
      tokenType: 'Bearer',
      expiresIn: 900,
      user: mockCurrentUser,
    }
  }

  if (endpoint.path === '/auth/logout' && endpoint.method === 'POST') {
    return null
  }

  const runActionsMatch = /^\/runs\/([^/]+)\/actions$/.exec(endpoint.path)
  if (runActionsMatch && endpoint.method === 'GET') {
    const runId = runActionsMatch[1]
    if (runId === WALKING_RUN_ID) {
      startWalkingRun()
      return currentWalkingRun().actions
    }
    if (!runId || !findRunSession(runId)) {
      throw new ApiError(404, 'Not Found', { message: 'Run not found' })
    }
    if (createdRunIds.has(runId)) return []
    return runId === FAILED_RUN_ID ? makeFailedRunActions() : makeDuoActions(runId)
  }

  const actionResponseMatch = /^\/runs\/([^/]+)\/actions\/(\d+)\/response$/.exec(endpoint.path)
  if (actionResponseMatch && endpoint.method === 'GET') {
    const runId = actionResponseMatch[1]
    if (!runId || !findRunSession(runId)) {
      throw new ApiError(404, 'Not Found', { message: 'Run not found' })
    }
    return {
      path: 'src/file3.ts',
      startLine: 1,
      totalLines: 340,
      content: 'loaded blob response',
    }
  }

  const runCommentsMatch = /^\/runs\/([^/]+)\/comments$/.exec(endpoint.path)
  if (runCommentsMatch && endpoint.method === 'GET') {
    const runId = runCommentsMatch[1]
    if (!runId || !findRunSession(runId)) {
      throw new ApiError(404, 'Not Found', { message: 'Run not found' })
    }
    // Created runs have no review; fixture reviews follow the existing timeline.
    const published =
      createdRunIds.has(runId) ||
      runId === FAILED_RUN_ID ||
      (runId === WALKING_RUN_ID && currentWalkingRun().session.status !== 'succeeded')
        ? []
        : mockReviewComments
    return published.map((comment) => ({ ...comment }))
  }

  const runFilesMatch = /^\/runs\/([^/]+)\/files\?(.+)$/.exec(endpoint.path)
  if (runFilesMatch && endpoint.method === 'GET') {
    const runId = runFilesMatch[1]
    const query = runFilesMatch[2]
    if (!runId || !query || !findRunSession(runId)) {
      throw new ApiError(404, 'Not Found', { message: 'Run not found' })
    }
    const params = new URLSearchParams(query)
    const offset = Number(params.get('offset') ?? '0')
    const limit = Number(params.get('limit') ?? '200')
    const lines = SAMPLE_FILE_A_LINES.slice(offset, offset + limit)
    return {
      path: params.get('path') ?? 'src/a.ts',
      startLine: offset + 1,
      lines,
      totalLines: SAMPLE_FILE_A_LINES.length,
      nextOffset: offset + limit < SAMPLE_FILE_A_LINES.length ? offset + limit : null,
    }
  }

  const runCancelMatch = /^\/runs\/([^/]+)\/cancel$/.exec(endpoint.path)
  if (runCancelMatch && endpoint.method === 'POST') {
    const runId = runCancelMatch[1]
    const session = runId ? findRunSession(runId) : undefined
    if (!session) {
      throw new ApiError(404, 'Not Found', { message: 'Run not found' })
    }
    session.cancelRequested = true
    if (session.status === 'queued') {
      session.status = 'cancelled'
    }
    if (runId !== WALKING_RUN_ID) {
      const index = runSessions.findIndex((run) => run.id === runId)
      runSessions[index] = structuredClone(session)
    }
    return session
  }

  const runRerunMatch = /^\/runs\/([^/]+)\/rerun$/.exec(endpoint.path)
  if (runRerunMatch && endpoint.method === 'POST') {
    const runId = runRerunMatch[1]
    const session = runId ? findRunSession(runId) : undefined
    if (!session) {
      throw new ApiError(404, 'Not Found', { message: 'Run not found' })
    }
    const activeSibling = runSessions.find(
      (item) =>
        item.id !== session.id &&
        item.pullRequest.repo === session.pullRequest.repo &&
        item.pullRequest.number === session.pullRequest.number &&
        ACTIVE_RUN_STATUSES.some(
          (status) =>
            status ===
            (item.id === WALKING_RUN_ID ? currentWalkingRun().session.status : item.status),
        ),
    )
    if (activeSibling) {
      throw new ApiError(409, 'Conflict', { detail: 'Active run already exists' })
    }
    const rerun: RunSession = {
      ...session,
      id: crypto.randomUUID(),
      status: 'queued' as const,
      startedAt: null,
      finishedAt: null,
      attempt: session.attempt + 1,
      cancelRequested: false,
      trigger: 'rerun' as const,
      createdAt: new Date().toISOString(),
      actionCount: 0,
      errorCode: null,
    }
    runSessions.unshift(rerun)
    createdRunIds.add(rerun.id)
    return structuredClone(rerun)
  }

  return undefined
}

export function initMockTransport(): void {
  if (!USE_MOCKS) return

  repositories = structuredClone(mockRepositories)
  runSessions = structuredClone(mockRunsListPage.items)
  bitbucketConnections = []
  bitbucketToken = null
  bitbucketCredentialGeneration = 1
  bitbucketHookSequence = 0
  createdRunIds.clear()
  rulesStatusAsked.clear()
  ragBuildTicks.clear()
  resetWalkingRun()

  setMockAuthAdapter({
    getMockOAuthCode: () => MOCK_OAUTH_CODE,
    loginAsMockUser: () => {
      setAccessToken(MOCK_TOKEN)
      useAuthStore.setState({
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    },
    isMockToken: (token) => token === MOCK_TOKEN,
  })

  setMockTransport(handleMockTransport)
}

/** Runs `overlay` first; falls back to the default mock handler (for tests). */
export function withMockTransportOverlay(overlay: MockTransportHandler): void {
  if (!USE_MOCKS) return
  initMockTransport()
  setMockTransport((endpoint, options) => {
    const overridden = overlay(endpoint, options)
    if (overridden !== undefined) {
      return overridden
    }
    return handleMockTransport(endpoint, options)
  })
}

/** How often `startMockRunEvents` looks at the walking run's status. */
export const MOCK_RUN_EVENTS_INTERVAL_MS = 500

/**
 * Stands in for the SSE stream, which is not opened on mocks: whenever the walking run's status
 * changes, applies the `run.updated` event the api would have sent. Returns a function that stops it.
 * `main.tsx` starts it next to `initMockTransport`; `initMockTransport` itself starts no timer.
 */
export function startMockRunEvents(): () => void {
  if (!USE_MOCKS) {
    return () => undefined
  }
  let lastStatus: RunStatus | undefined
  const timer = setInterval(() => {
    const { session } = currentWalkingRun()
    if (session.status !== lastStatus) {
      lastStatus = session.status
      applyRunUpdated({ runId: session.id, status: session.status })
    }
  }, MOCK_RUN_EVENTS_INTERVAL_MS)
  return () => {
    clearInterval(timer)
  }
}
