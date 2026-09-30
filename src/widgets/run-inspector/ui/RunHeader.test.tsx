// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { RunSession } from '../../../entities/run'
import { RunHeader } from './RunHeader'

const baseRun: RunSession = {
  id: '11111111-1111-4111-8111-000000000004',
  engine: 'deep',
  model: 'claude-sonnet-5',
  status: 'succeeded',
  startedAt: '2026-09-18T11:50:00.000Z',
  finishedAt: '2026-09-18T11:55:12.000Z',
  attempt: 1,
  cancelRequested: false,
  summaryOnly: false,
  pullRequest: {
    repo: 'larchanka-training/dmc-268-ui-t6',
    number: 34,
    title: 'feat: skeleton',
    url: 'https://github.com/larchanka-training/dmc-268-ui-t6/pull/34',
    headSha: 'abcdef1234567890abcdef1234567890abcdef12',
    author: 'octocat',
    headRef: 'feat/x',
    baseRef: 'main',
  },
  actionCount: 10,
  errorCode: null,
}

afterEach(() => {
  cleanup()
})

describe('RunHeader PR metadata', () => {
  it('shows repo, short sha, author, branches, verdict and counts when provided', () => {
    render(
      <RunHeader
        now={new Date('2026-09-18T12:00:00.000Z')}
        run={baseRun}
        severityCounts={{ critical: 1, high: 0, medium: 0, low: 0, info: 0 }}
        verdict="blocking"
      />,
    )
    expect(screen.getByText('larchanka-training/dmc-268-ui-t6')).toBeTruthy()
    expect(screen.getByText('abcdef1')).toBeTruthy()
    expect(screen.getByText('octocat')).toBeTruthy()
    expect(screen.getByText('feat/x → main')).toBeTruthy()
    expect(screen.getByText('Blocking')).toBeTruthy()
    expect(screen.getByText('critical: 1')).toBeTruthy()
  })

  it('renders without author, branches or verdict when absent', () => {
    render(
      <RunHeader
        now={new Date('2026-09-18T12:00:00.000Z')}
        run={{
          ...baseRun,
          pullRequest: {
            repo: baseRun.pullRequest.repo,
            number: baseRun.pullRequest.number,
            title: baseRun.pullRequest.title,
            url: baseRun.pullRequest.url,
            headSha: baseRun.pullRequest.headSha,
          },
        }}
        verdict={null}
      />,
    )
    expect(screen.queryByText('octocat')).toBeNull()
    expect(screen.queryByText(/→/)).toBeNull()
    expect(screen.queryByText('Blocking')).toBeNull()
  })
})
