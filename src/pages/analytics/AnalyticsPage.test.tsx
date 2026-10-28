// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { disabledRagIndex } from '../../entities/repository'
import type { MetricsSummary } from '../../entities/metrics'
import { AnalyticsPage } from './AnalyticsPage'

const REPO = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  fullName: 'org/repo',
  url: 'https://github.com/org/repo',
  defaultBranch: 'main',
  enabled: true,
  defaultEngine: 'fast' as const,
  waitForCi: 'auto' as const,
  maxComments: 5,
  reviewEvent: 'COMMENT' as const,
  branchFilter: [],
  severityThreshold: 'all' as const,
  installationAvailable: true,
  ragEnabled: false,
  ragIndex: disabledRagIndex,
}

function summary(overrides: Partial<MetricsSummary> = {}): MetricsSummary {
  return {
    range: '7d',
    runsByStatus: { succeeded: 2, failed: 1, cancelled: 0, skipped: 1 },
    pullsByVerdict: { blocking: 1, attention: 0, clean: 3, noVerdict: 2 },
    findingsBySeverity: { critical: 5, high: 4, medium: 3, low: 2, info: 1 },
    findingsByCategory: { security: 1, correctness: 2, performance: 0, readability: 1 },
    averageDurationMs: 125000,
    tokensIn: 10,
    tokensOut: 4,
    costUsd: 1.5,
    series: [
      {
        day: '2026-10-26',
        findings: { security: 2, correctness: 1, performance: 0, readability: 0 },
        runCount: 1,
        averageDurationMs: 4000,
        costUsd: 0.2,
      },
      {
        day: '2026-10-27',
        findings: { security: 0, correctness: 3, performance: 1, readability: 1 },
        runCount: 2,
        averageDurationMs: 9000,
        costUsd: 0,
      },
    ],
    workspaces: [
      { name: 'acme', dailyBudgetUsd: 0, spentTodayUsd: 1.5, paused: false },
      { name: 'paused-team', dailyBudgetUsd: 10, spentTodayUsd: 1, paused: true },
    ],
    ...overrides,
  }
}

function emptySummary(): MetricsSummary {
  return summary({
    runsByStatus: { succeeded: 0, failed: 0, cancelled: 0, skipped: 0 },
    series: [],
    averageDurationMs: null,
  })
}

interface Answer {
  status: number
  body: unknown
}

function stubFetch(handler: (url: URL) => Answer) {
  const fetchMock = vi.fn<typeof fetch>((input) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const url = new URL(href, 'http://localhost')
    const answer = handler(url)
    return Promise.resolve(
      new Response(JSON.stringify(answer.body), {
        status: answer.status,
        headers: { 'content-type': 'application/json' },
      }),
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage(initialEntry = '/analytics') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter([{ path: '/analytics', element: <AnalyticsPage /> }], {
    initialEntries: [initialEntry],
  })
  return {
    router,
    ...render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  }
}

function summaryRequests(fetchMock: ReturnType<typeof stubFetch>): URL[] {
  return fetchMock.mock.calls
    .map(([input]) => {
      const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      return new URL(href, 'http://localhost')
    })
    .filter((url) => url.pathname.endsWith('/metrics/summary'))
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AnalyticsPage', () => {
  it('shows the tiles, including critical apart from high, and the day table', async () => {
    stubFetch((url) =>
      url.pathname.endsWith('/repos')
        ? { status: 200, body: [REPO] }
        : { status: 200, body: summary() },
    )
    const { container } = renderPage()
    expect(await screen.findByText('critical')).toBeTruthy()
    expect(screen.getByText('critical').closest('div')?.textContent).toContain('5')
    expect(screen.getByText('high').closest('div')?.textContent).toContain('4')
    expect(screen.getByText('2 мин 5 с')).toBeTruthy()
    expect(screen.getByText('$1.50')).toBeTruthy()
    expect(screen.getByText('10')).toBeTruthy()
    expect(screen.getByRole('table', { name: 'Числа по дням' })).toBeTruthy()
    const titles = [...container.querySelectorAll('title')].map((node) => node.textContent)
    expect(titles).toContain('Security 2')
    expect(titles).toContain('4000')
    expect(screen.getAllByText('Security').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Bug').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Performance').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Style').length).toBeGreaterThan(0)
  })

  it('requests 7d when the address says 24h, and 30d after the period changes', async () => {
    const fetchMock = stubFetch((url) =>
      url.pathname.endsWith('/repos')
        ? { status: 200, body: [REPO] }
        : { status: 200, body: summary({ range: '30d' }) },
    )
    const { router } = renderPage('/analytics?range=24h&tab=keep')
    await screen.findByRole('heading', { name: 'Аналитика' })
    await waitFor(() => {
      const first = summaryRequests(fetchMock)[0]
      expect(first?.searchParams.get('range')).toBe('7d')
      expect(first?.searchParams.get('range')).not.toBe('24h')
    })
    fireEvent.click(screen.getByRole('radio', { name: '30 дней' }))
    await waitFor(() => {
      expect(router.state.location.search).toContain('range=30d')
      const requests = summaryRequests(fetchMock)
      expect(requests[requests.length - 1]?.searchParams.get('range')).toBe('30d')
    })
    expect(router.state.location.search).toContain('tab=keep')
  })

  it('puts the repository in the address and keeps the period when it is reset', async () => {
    const fetchMock = stubFetch((url) =>
      url.pathname.endsWith('/repos')
        ? { status: 200, body: [REPO] }
        : { status: 200, body: summary() },
    )
    const { router } = renderPage('/analytics?range=30d')
    await screen.findByText('critical')
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Репозиторий' }))
    await waitFor(() => {
      expect(document.querySelectorAll('.ant-select-item-option').length).toBeGreaterThan(1)
    })
    const option = [...document.querySelectorAll('.ant-select-item-option')].find(
      (candidate) => candidate.textContent === 'org/repo',
    )
    if (option === undefined) {
      throw new Error('repository option is not rendered')
    }
    fireEvent.click(option)
    await waitFor(() => {
      expect(router.state.location.search).toContain('repo=org%2Frepo')
      expect(router.state.location.search).toContain('range=30d')
      const requests = summaryRequests(fetchMock)
      expect(requests[requests.length - 1]?.searchParams.get('repo')).toBe('org/repo')
    })
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить фильтр' }))
    await waitFor(() => {
      expect(router.state.location.search).not.toContain('repo=')
      expect(router.state.location.search).toContain('range=30d')
    })
  })

  it('shows an empty period without charts and keeps the budget', async () => {
    stubFetch((url) =>
      url.pathname.endsWith('/repos')
        ? { status: 200, body: [] }
        : { status: 200, body: emptySummary() },
    )
    const { container } = renderPage()
    expect(await screen.findByText('В этом периоде нет завершённых прогонов')).toBeTruthy()
    expect(container.querySelector('svg[role="img"]')).toBeNull()
    expect(screen.queryByRole('table', { name: 'Числа по дням' })).toBeNull()
    expect(screen.queryByText('critical')).toBeNull()
    expect(screen.getByText('acme')).toBeTruthy()
    expect(screen.getByText('paused-team')).toBeTruthy()
  })

  it('shows an error alert with retry instead of the empty state', async () => {
    let fail = true
    stubFetch((url) => {
      if (url.pathname.endsWith('/repos')) {
        return { status: 200, body: [] }
      }
      if (fail) {
        return { status: 500, body: {} }
      }
      return { status: 200, body: summary() }
    })
    renderPage()
    expect(await screen.findByText('Ошибка загрузки')).toBeTruthy()
    expect(screen.queryByText('В этом периоде нет завершённых прогонов')).toBeNull()
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(await screen.findByText('critical')).toBeTruthy()
  })

  it('shows the pause alert from the flag and "limit not set" for a zero limit', async () => {
    stubFetch((url) =>
      url.pathname.endsWith('/repos')
        ? { status: 200, body: [REPO] }
        : { status: 200, body: summary() },
    )
    renderPage('/analytics?repo=org/repo')
    expect(
      await screen.findByText('Дневной бюджет исчерпан, ревью на паузе до 00:00 UTC'),
    ).toBeTruthy()
    expect(screen.getByText(/Лимит не задан/)).toBeTruthy()
    const budget = screen.getByRole('region', { name: 'Бюджет на сегодня' })
    expect(budget.querySelector('input, textarea')).toBeNull()
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })

  it('paints series with theme tokens and no hex', () => {
    const root = join(process.cwd(), 'src/pages/analytics')
    const css = [
      readFileSync(join(root, 'ui/FindingsByDay.module.css'), 'utf8'),
      readFileSync(join(root, 'ui/DurationByDay.module.css'), 'utf8'),
      readFileSync(join(root, 'AnalyticsPage.module.css'), 'utf8'),
    ].join('\n')
    expect(css).toContain('var(--rv-critical)')
    expect(css).toContain('var(--rv-high)')
    expect(css).toContain('var(--rv-warning)')
    expect(css).toContain('var(--rv-link)')
    expect(css).toContain('var(--rv-accent)')
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
