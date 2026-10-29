// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { RunSession } from '../../../entities/run'
import { RunHeader } from './RunHeader'
import styles from './RunHeader.module.css'

const baseRun: RunSession = {
  id: '11111111-1111-4111-8111-000000000004',
  engine: 'deep',
  model: 'claude-sonnet-5',
  status: 'succeeded',
  startedAt: '2026-09-18T11:50:00.000Z',
  finishedAt: '2026-09-18T11:55:12.000Z',
  attempt: 1,
  cancelRequested: false,
  trigger: 'webhook',
  createdAt: '2026-09-18T11:00:00.000Z',
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
  triggeredBy: null,
  usage: { tokensIn: 0, tokensOut: 0, costUsd: 0 },
}

afterEach(() => {
  cleanup()
})

describe('RunHeader metadata layout', () => {
  it('marks the short commit as code with the monospace font hook', () => {
    render(<RunHeader now={new Date('2026-09-18T12:00:00.000Z')} run={baseRun} />)
    const hash = screen.getByText('abcdef1')
    expect(hash.tagName).toBe('CODE')
    expect(styles.commit).toBeTruthy()
    expect(hash.classList.contains(styles.commit ?? '')).toBe(true)
  })

  it('retains the run settings, timing, attempt and error values next to their labels', () => {
    render(
      <RunHeader
        now={new Date('2026-09-18T12:00:00.000Z')}
        run={{ ...baseRun, status: 'failed', attempt: 3, errorCode: 'provider_timeout' }}
      />,
    )
    for (const [label, value] of [
      ['Движок', 'deep'],
      ['Модель', 'claude-sonnet-5'],
      ['Создан', '18.09.2026, 11:00:00'],
      ['Начат', '18.09.2026, 11:50:00'],
      ['Длительность', '5 мин 12 с'],
      ['Попытка', '3'],
      ['Причина', 'Неизвестная причина: provider_timeout'],
    ] as const) {
      expect(screen.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent).toBe(
        value,
      )
    }
  })

  it('shows the reason of a known code with the code next to it', () => {
    render(
      <RunHeader
        now={new Date('2026-09-18T12:00:00.000Z')}
        run={{ ...baseRun, status: 'cancelled', errorCode: 'pr_closed' }}
      />,
    )
    const value = screen.getByText('Причина', { selector: 'dt' }).nextElementSibling
    expect(value?.textContent).toBe('PR закрыт. pr_closed')
    expect(value?.querySelector('code')?.textContent).toBe('pr_closed')
  })

  it('retains complete long repository, PR and branch text', () => {
    render(
      <RunHeader
        now={new Date('2026-09-18T12:00:00.000Z')}
        run={{
          ...baseRun,
          pullRequest: {
            ...baseRun.pullRequest,
            repo: 'organization/very-long-repository-name-for-review-diagnostics',
            title:
              'feat: preserve readable metadata for detailed review diagnostics on narrow screens',
            headRef: 'feat/very-long-branch-name-for-review-diagnostics',
          },
        }}
      />,
    )
    expect(
      screen.getByText('organization/very-long-repository-name-for-review-diagnostics'),
    ).toBeTruthy()
    expect(
      screen
        .getByRole('link', {
          name: '#34 feat: preserve readable metadata for detailed review diagnostics on narrow screens',
        })
        .getAttribute('href'),
    ).toBe('https://github.com/larchanka-training/dmc-268-ui-t6/pull/34')
    expect(
      screen.getByText('feat/very-long-branch-name-for-review-diagnostics → main'),
    ).toBeTruthy()
  })

  it('pairs metadata labels with values in a semantic description list', () => {
    render(<RunHeader now={new Date('2026-09-18T12:00:00.000Z')} run={baseRun} />)
    const label = screen.getByText('Репозиторий', { selector: 'dt' })
    expect(label.closest('dl')).not.toBeNull()
    expect(label.nextElementSibling?.tagName).toBe('DD')
    expect(label.nextElementSibling?.textContent).toBe('larchanka-training/dmc-268-ui-t6')
  })
})

describe('RunHeader run origin', () => {
  // The em dash is rendered by several rows, so a value is read inside its own row.
  function rowValue(label: string): string | null {
    return screen.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent ?? null
  }

  it('marks a rerun in its own row', () => {
    render(
      <RunHeader
        now={new Date('2026-09-18T12:00:00.000Z')}
        run={{ ...baseRun, trigger: 'rerun' as const }}
      />,
    )
    expect(screen.getByText('Перезапущен вручную')).toBeTruthy()
    expect(rowValue('Запуск')).toBe('Перезапущен вручную')
  })

  it.each([
    { name: 'a webhook run', trigger: 'webhook' as const },
    { name: 'a manual run', trigger: 'manual' as const },
    { name: 'a dry run', trigger: 'dry_run' as const },
  ])('shows no origin mark for $name but still shows its creation time', ({ trigger }) => {
    render(<RunHeader now={new Date('2026-09-18T12:00:00.000Z')} run={{ ...baseRun, trigger }} />)
    expect(screen.queryByText('Перезапущен вручную')).toBeNull()
    expect(screen.queryByText('Запуск')).toBeNull()
    expect(rowValue('Создан')).toBe('18.09.2026, 11:00:00')
  })

  it('shows the creation time and a dash for the start time of a queued run', () => {
    render(
      <RunHeader
        now={new Date('2026-09-18T12:00:00.000Z')}
        run={{ ...baseRun, status: 'queued' as const, startedAt: null, finishedAt: null }}
      />,
    )
    expect(rowValue('Создан')).toBe('18.09.2026, 11:00:00')
    expect(rowValue('Начат')).toBe('—')
    expect(rowValue('Длительность')).toBe('—')
  })

  it('labels the start time «Начат» for a started run', () => {
    render(<RunHeader now={new Date('2026-09-18T12:00:00.000Z')} run={baseRun} />)
    expect(rowValue('Начат')).toBe('18.09.2026, 11:50:00')
    expect(screen.queryByText('Запущен')).toBeNull()
  })
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
    if (run.summaryOnly) {
      expect(screen.getByText('Summary-only прогон (дифф > 3 000 строк)')).toBeTruthy()
    }
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
    return screen.getByText('Действий', { selector: 'dt' }).nextElementSibling?.textContent ?? null
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

const LIMIT_REASONS = [
  ['budget_exceeded', 'Превышен лимит стоимости прогона.', 'failed'],
  ['deadline_exceeded', 'Прогон не уложился в лимит времени.', 'failed'],
  ['llm_context_overflow', 'PR не помещается в контекст модели.', 'failed'],
  [
    'llm_rate_limited',
    'Провайдер модели ограничил частоту запросов. Перезапустите прогон позже.',
    'failed',
  ],
  ['verification_budget_exceeded', 'Бюджета недостаточно для обязательной проверки.', 'failed'],
  [
    'verification_context_overflow',
    'Обязательные данные проверки не помещаются в контекст.',
    'failed',
  ],
  ['publication_payload_too_large', 'Результат превышает лимит публикации VCS.', 'failed'],
  ['budget_paused', 'Дневной бюджет исчерпан, ревью на паузе.', 'skipped'],
  [
    'verification_deadline_exceeded',
    'Недостаточно времени для обязательной проверки.',
    'cancelled',
  ],
] as const

describe('RunHeader limit reason', () => {
  const NOW = new Date('2026-09-18T12:00:00.000Z')

  it.each(LIMIT_REASONS)(
    'shows an alert with the phrase and the code for %s',
    (code, phrase, status) => {
      render(
        <RunHeader
          now={NOW}
          run={{
            ...baseRun,
            status,
            finishedAt: '2026-09-18T11:55:12.000Z',
            errorCode: code,
          }}
        />,
      )
      const alert = screen.getByTestId('run-limit-reason')
      expect(alert.textContent).toContain(phrase)
      expect(alert.querySelector('code')?.textContent).toBe(code)
      expect(alert.className).toContain(
        status === 'failed' ? 'ant-alert-error' : 'ant-alert-warning',
      )
    },
  )

  it('does not add a limit alert for an unknown code and keeps the reason row', () => {
    render(
      <RunHeader now={NOW} run={{ ...baseRun, status: 'failed', errorCode: 'provider_timeout' }} />,
    )
    expect(screen.queryByTestId('run-limit-reason')).toBeNull()
    expect(screen.getByText('Причина', { selector: 'dt' }).nextElementSibling?.textContent).toBe(
      'Неизвестная причина: provider_timeout',
    )
  })

  it('keeps the summary-only line', () => {
    render(<RunHeader now={NOW} run={{ ...baseRun, summaryOnly: true }} />)
    expect(screen.getByText('Summary-only прогон (дифф > 3 000 строк)')).toBeTruthy()
    expect(screen.queryByTestId('run-limit-reason')).toBeNull()
  })
})

describe('RunHeader starter and budget', () => {
  const NOW = new Date('2026-09-18T12:00:00.000Z')

  function row(label: string): string {
    return screen.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent ?? ''
  }

  it('shows a dash when nobody started the run and when there is no budget', () => {
    const { container } = render(<RunHeader now={NOW} run={baseRun} />)
    expect(row('Запустил')).toBe('—')
    expect(row('Токены на входе')).toBe('—')
    expect(row('Токены на выходе')).toBe('—')
    expect(row('Стоимость')).toBe('—')
    expect(row('Лимит токенов')).toBe('—')
    expect(row('Лимит стоимости')).toBe('—')
    expect(container.querySelector('input, textarea, button')).toBeNull()
  })

  it('shows the login and the budget numbers without an editor', () => {
    const { container } = render(
      <RunHeader
        budget={{ tokensIn: 10, tokensOut: 4, costUsd: 1.5, tokenLimit: 1000, costLimitUsd: 2 }}
        now={NOW}
        run={{ ...baseRun, triggeredBy: 'octocat' }}
      />,
    )
    expect(row('Запустил')).toBe('octocat')
    expect(row('Токены на входе')).toBe('10')
    expect(row('Токены на выходе')).toBe('4')
    expect(row('Стоимость')).toBe('$1.50')
    expect(row('Лимит токенов')).toBe('1000')
    expect(row('Лимит стоимости')).toBe('$2.00')
    expect(container.querySelector('input, textarea, button')).toBeNull()
  })

  it('shows a dash for a null initiator', () => {
    render(<RunHeader now={NOW} run={{ ...baseRun, triggeredBy: null }} />)
    expect(row('Запустил')).toBe('—')
  })
})
