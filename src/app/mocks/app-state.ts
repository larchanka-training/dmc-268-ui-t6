import { makeDuoActions } from '../../entities/run'
import type { RunAction, RunSession } from '../../entities/run'
import { fromPatch } from '../../entities/diff'
import type { FileDiff, RawFileDiff } from '../../entities/diff'
import type { ReviewComment } from '../../entities/review'
import { SAMPLE_PATCHES } from '../../shared/fixtures/sample.patch'

export const MOCK_NOW = '2026-09-18T12:00:00.000Z'

const REPO = 'larchanka-training/dmc-268-ui-t6'

function pullRequestUrl(number: number): string {
  return `https://github.com/${REPO}/pull/${String(number)}`
}

const QUEUED_ID = '11111111-1111-4111-8111-000000000001'
const RUNNING_ID = '11111111-1111-4111-8111-000000000002'
const PUBLISHING_ID = '11111111-1111-4111-8111-000000000003'
const COMPLETED_ID = '11111111-1111-4111-8111-000000000004'
const FAILED_ID = '11111111-1111-4111-8111-000000000005'
const CANCELLED_ID = '11111111-1111-4111-8111-000000000006'
const SKIPPED_ID = '11111111-1111-4111-8111-000000000007'
const SUMMARY_ONLY_ID = '11111111-1111-4111-8111-000000000008'

export const mockRunSessions: RunSession[] = [
  {
    id: QUEUED_ID,
    engine: 'fast',
    model: null,
    status: 'queued',
    startedAt: null,
    finishedAt: null,
    attempt: 1,
    cancelRequested: false,
    summaryOnly: false,
    pullRequest: {
      repo: REPO,
      number: 31,
      title: 'feat: add login flow',
      url: pullRequestUrl(31),
      headSha: 'aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111',
    },
    actionCount: 0,
    errorCode: null,
  },
  {
    id: RUNNING_ID,
    engine: 'deep',
    model: 'claude-sonnet-5',
    status: 'running',
    startedAt: '2026-09-18T11:20:00.000Z',
    finishedAt: null,
    attempt: 1,
    cancelRequested: false,
    summaryOnly: false,
    pullRequest: {
      repo: REPO,
      number: 32,
      title: 'feat: refactor diff viewer',
      url: pullRequestUrl(32),
      headSha: 'bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222',
    },
    actionCount: 12,
    errorCode: null,
  },
  {
    id: PUBLISHING_ID,
    engine: 'deep',
    model: 'claude-sonnet-5',
    status: 'publishing',
    startedAt: '2026-09-18T11:56:00.000Z',
    finishedAt: null,
    attempt: 1,
    cancelRequested: false,
    summaryOnly: false,
    pullRequest: {
      repo: REPO,
      number: 33,
      title: 'feat: publish review results',
      url: pullRequestUrl(33),
      headSha: 'cccc3333cccc3333cccc3333cccc3333cccc3333',
    },
    actionCount: 33,
    errorCode: null,
  },
  {
    id: COMPLETED_ID,
    engine: 'deep',
    model: 'claude-sonnet-5',
    status: 'succeeded',
    startedAt: '2026-09-18T11:50:00.000Z',
    finishedAt: '2026-09-18T11:55:12.000Z',
    attempt: 1,
    cancelRequested: false,
    summaryOnly: false,
    pullRequest: {
      repo: REPO,
      number: 34,
      title: 'feat: frontend architecture skeleton',
      url: pullRequestUrl(34),
      headSha: 'abcdef1234567890abcdef1234567890abcdef12',
    },
    actionCount: 34,
    errorCode: null,
  },
  {
    id: FAILED_ID,
    engine: 'deep',
    model: 'claude-sonnet-5',
    status: 'failed',
    startedAt: '2026-09-18T10:30:00.000Z',
    finishedAt: '2026-09-18T10:45:00.000Z',
    attempt: 3,
    cancelRequested: false,
    summaryOnly: false,
    pullRequest: {
      repo: REPO,
      number: 35,
      title: 'feat: add timeout handling',
      url: pullRequestUrl(35),
      headSha: 'dddd5555dddd5555dddd5555dddd5555dddd5555',
    },
    actionCount: 8,
    errorCode: 'llm_timeout',
  },
  {
    id: CANCELLED_ID,
    engine: 'fast',
    model: 'claude-sonnet-5',
    status: 'cancelled',
    startedAt: '2026-09-18T09:00:00.000Z',
    finishedAt: '2026-09-18T09:10:00.000Z',
    attempt: 1,
    cancelRequested: true,
    summaryOnly: false,
    pullRequest: {
      repo: REPO,
      number: 36,
      title: 'feat: experimental caching layer',
      url: pullRequestUrl(36),
      headSha: 'eeee6666eeee6666eeee6666eeee6666eeee6666',
    },
    actionCount: 5,
    errorCode: null,
  },
  {
    id: SKIPPED_ID,
    engine: 'fast',
    model: null,
    status: 'skipped',
    startedAt: '2026-09-18T08:00:00.000Z',
    finishedAt: '2026-09-18T08:00:00.000Z',
    attempt: 1,
    cancelRequested: false,
    summaryOnly: false,
    pullRequest: {
      repo: REPO,
      number: 37,
      title: 'feat: housekeeping pass',
      url: pullRequestUrl(37),
      headSha: 'ffff7777ffff7777ffff7777ffff7777ffff7777',
    },
    actionCount: 1,
    errorCode: 'no_reviewable_changes',
  },
]

export const mockSummaryOnlyRun: RunSession = {
  id: SUMMARY_ONLY_ID,
  engine: 'deep',
  model: 'claude-sonnet-5',
  status: 'succeeded',
  startedAt: '2026-09-18T07:00:00.000Z',
  finishedAt: '2026-09-18T07:20:00.000Z',
  attempt: 1,
  cancelRequested: false,
  summaryOnly: true,
  pullRequest: {
    repo: REPO,
    number: 38,
    title: 'feat: large cross-cutting refactor',
    url: pullRequestUrl(38),
    headSha: 'aaaa8888aaaa8888aaaa8888aaaa8888aaaa8888',
  },
  actionCount: 20,
  errorCode: null,
}

export const mockSummaryOnlyDiff: RawFileDiff[] = [
  { filename: 'src/big-one.ts', patch: null },
  { filename: 'src/big-two.ts', patch: null },
  { filename: 'src/big-three.ts', patch: null },
]

export const mockFileDiffs: FileDiff[] = SAMPLE_PATCHES.map(fromPatch)

export const mockReviewComments: ReviewComment[] = [
  {
    id: '22222222-2222-4222-8222-000000000001',
    file: 'src/a.ts',
    oldLine: null,
    newLine: 2,
    endLine: null,
    body: 'This magic number should be extracted into a named constant for clarity.',
    ruleName: 'no-magic-numbers',
    severity: 'medium',
    category: 'readability',
    title: 'Magic number replaced a named line',
    createdAt: '2026-09-18T11:55:00.000Z',
  },
  {
    id: '22222222-2222-4222-8222-000000000002',
    file: 'src/a.ts',
    oldLine: 3,
    newLine: 4,
    endLine: 5,
    body: 'The renamed variable correctly reflects its updated purpose.',
    ruleName: null,
    severity: 'info',
    category: 'correctness',
    title: 'Variable rename looks correct',
    createdAt: '2026-09-18T11:55:05.000Z',
  },
  {
    id: '22222222-2222-4222-8222-000000000003',
    file: 'README.md',
    oldLine: null,
    newLine: 2,
    endLine: null,
    body: 'Consider matching the tone of the rest of the documentation.',
    ruleName: 'docs-tone',
    severity: 'low',
    category: 'readability',
    title: 'Docs tone inconsistency',
    createdAt: '2026-09-18T11:55:10.000Z',
  },
]

export const mockRunActions: RunAction[] = makeDuoActions(COMPLETED_ID)

export interface MockUiState {
  runInspector: {
    selectedRunId: string
    expandedKeys: string[]
  }
  diffViewer: {
    selectedFile: string
    viewType: 'unified' | 'split'
    expandedRanges: Record<string, boolean>
  }
}

export const mockUiState: MockUiState = {
  runInspector: {
    selectedRunId: COMPLETED_ID,
    expandedKeys: ['group-2', 'action-33'],
  },
  diffViewer: {
    selectedFile: 'src/a.ts',
    viewType: 'unified',
    expandedRanges: {},
  },
}
