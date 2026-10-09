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

  // Same rule as the API verdict (api PIPELINE_SPEC §11): counts are final only for a
  // succeeded run that reviewed line by line.
  it.each([
    { name: 'a running run', run: { ...baseRun, status: 'running' as const, finishedAt: null } },
    { name: 'a summary-only run', run: { ...baseRun, summaryOnly: true } },
  ])('hides the zero counts of $name', ({ run }) => {
    render(
      <RunHeader
        now={new Date('2026-09-18T12:00:00.000Z')}
        run={run}
        severityCounts={{ critical: 0, high: 0, medium: 0, low: 0, info: 0 }}
        verdict={null}
      />,
    )
    expect(screen.queryByText('Находки')).toBeNull()
    expect(screen.queryByText('critical: 0')).toBeNull()
  })

  // The API counts every finding, the client drops the ones that fail the format check:
  // the note explains why the header can show more findings than there are cards.
  it('explains dropped findings next to the counts and hides the note at zero', () => {
    const counts = { critical: 2, high: 0, medium: 0, low: 0, info: 0 }
    const { rerender } = render(
      <RunHeader
        droppedFindings={2}
        now={new Date('2026-09-18T12:00:00.000Z')}
        run={baseRun}
        severityCounts={counts}
      />,
    )
    expect(screen.getByText('Не показано находок: 2 — не прошли проверку формата')).toBeTruthy()

    rerender(
      <RunHeader
        droppedFindings={0}
        now={new Date('2026-09-18T12:00:00.000Z')}
        run={baseRun}
        severityCounts={counts}
      />,
    )
    expect(screen.queryByText(/Не показано находок/)).toBeNull()
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

  it('does not render a link for unsafe PR URLs', () => {
    render(
      <RunHeader
        now={new Date('2026-09-18T12:00:00.000Z')}
        run={{
          ...baseRun,
          pullRequest: {
            ...baseRun.pullRequest,
            url: 'javascript:alert(1)',
          },
        }}
      />,
    )
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText(/#34/)).toBeTruthy()
  })
})

// The count in the run detail lags the polled log (the detail is refetched on `run.updated`, the log
// every 3 s): the header shows the larger of the two numbers, and works without the log length.
describe('RunHeader action count', () => {
  const NOW = new Date('2026-09-18T12:00:00.000Z')

  function actionCountCell(): string | null {
    const item = screen.getByText('Действий').closest('.ant-descriptions-item')
    return item?.querySelector('.ant-descriptions-item-content')?.textContent ?? null
  }

  it('shows the count of the run when no log length is given', () => {
    render(<RunHeader now={NOW} run={baseRun} />)
    expect(actionCountCell()).toBe('10')
  })

  it('shows the longer log when it is ahead of the count of the run', () => {
    render(<RunHeader loggedActions={14} now={NOW} run={baseRun} />)
    expect(actionCountCell()).toBe('14')
  })

  it('shows the count of the run when it is ahead of the log', () => {
    render(<RunHeader loggedActions={3} now={NOW} run={baseRun} />)
    expect(actionCountCell()).toBe('10')
  })

  it('shows the same number when both agree, and 0 for an empty run', () => {
    const { rerender } = render(<RunHeader loggedActions={10} now={NOW} run={baseRun} />)
    expect(actionCountCell()).toBe('10')
    rerender(<RunHeader loggedActions={0} now={NOW} run={{ ...baseRun, actionCount: 0 }} />)
    expect(actionCountCell()).toBe('0')
  })
})
