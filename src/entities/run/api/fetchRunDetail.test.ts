import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchRunDetail } from './index'
import { RunDetailSchema } from '../model/schemas'

vi.mock('../../../shared/api/client', () => ({
  apiClient: vi.fn(),
}))

import { apiClient } from '../../../shared/api/client'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fetchRunDetail', () => {
  it('parses a running run detail wire payload', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({
      id: '11111111-1111-4111-8111-000000000002',
      engine: 'deep',
      model: 'claude-sonnet-5',
      status: 'running',
      startedAt: '2026-09-18T11:20:00.000Z',
      finishedAt: null,
      attempt: 1,
      cancelRequested: false,
      trigger: 'webhook',
      createdAt: '2026-09-18T11:00:00.000Z',
      summaryOnly: false,
      pullRequest: {
        repo: 'org/repo',
        number: 32,
        title: 'Title',
        url: 'https://github.com/org/repo/pull/32',
        headSha: 'abc1234567890abc1234567890abc1234567890',
      },
      actionCount: 12,
      errorCode: null,
      findings: [],
      summary: null,
      verdict: null,
      severityCounts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      budget: null,
    })

    const run = await fetchRunDetail('11111111-1111-4111-8111-000000000002')
    expect(RunDetailSchema.safeParse(run).success).toBe(true)
    expect(run.findings).toEqual([])
    expect(run.verdict).toBeNull()
  })

  it('reports zero dropped findings and stays silent when nothing is dropped', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.mocked(apiClient).mockResolvedValueOnce({
      id: '11111111-1111-4111-8111-000000000002',
      engine: 'deep',
      model: 'claude-sonnet-5',
      status: 'running',
      startedAt: '2026-09-18T11:20:00.000Z',
      finishedAt: null,
      attempt: 1,
      cancelRequested: false,
      trigger: 'webhook',
      createdAt: '2026-09-18T11:00:00.000Z',
      summaryOnly: false,
      pullRequest: {
        repo: 'org/repo',
        number: 32,
        title: 'Title',
        url: 'https://github.com/org/repo/pull/32',
        headSha: 'abc1234567890abc1234567890abc1234567890',
      },
      actionCount: 12,
      errorCode: null,
      findings: [],
      summary: null,
      verdict: null,
      severityCounts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      budget: null,
    })

    const run = await fetchRunDetail('11111111-1111-4111-8111-000000000002')
    expect(run.droppedFindings).toBe(0)
    expect(warn).not.toHaveBeenCalled()
  })

  it('drops invalid findings entries instead of failing the whole payload', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.mocked(apiClient).mockResolvedValueOnce({
      id: '11111111-1111-4111-8111-000000000002',
      engine: 'deep',
      model: 'claude-sonnet-5',
      status: 'succeeded',
      startedAt: '2026-09-18T11:20:00.000Z',
      finishedAt: '2026-09-18T11:55:00.000Z',
      attempt: 1,
      cancelRequested: false,
      trigger: 'webhook',
      createdAt: '2026-09-18T11:00:00.000Z',
      summaryOnly: false,
      pullRequest: {
        repo: 'org/repo',
        number: 32,
        title: 'Title',
        url: 'https://github.com/org/repo/pull/32',
        headSha: 'abc1234567890abc1234567890abc1234567890',
      },
      actionCount: 1,
      errorCode: null,
      findings: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          file: 'src/a.ts',
          oldLine: null,
          newLine: 1,
          endLine: null,
          side: 'RIGHT',
          severity: 'critical',
          category: 'security',
          title: 'Valid',
          body: 'ok',
          suggestion: null,
          confidence: 0.9,
          ruleName: null,
        },
        { id: 'not-a-uuid', file: '', severity: 'nope' },
        { id: 'also-not-a-uuid', file: '', severity: 'nope' },
      ],
      summary: null,
      verdict: null,
      severityCounts: { critical: 1, high: 0, medium: 0, low: 0, info: 0 },
      budget: null,
    })

    const run = await fetchRunDetail('11111111-1111-4111-8111-000000000002')
    expect(run.findings).toHaveLength(1)
    expect(run.findings[0]?.title).toBe('Valid')
    // The drop is explicit: counted next to the detail and logged once with the run id.
    expect(run.droppedFindings).toBe(2)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith('fetchRunDetail: dropped invalid findings', {
      runId: '11111111-1111-4111-8111-000000000002',
      dropped: 2,
    })
  })
})
