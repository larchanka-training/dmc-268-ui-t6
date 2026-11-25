// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, assert, describe, expect, it, vi } from 'vitest'

import { disabledRagIndex } from '../../entities/repository'
import type { MetricsSummary } from '../../entities/metrics'
import { AnalyticsPage } from './AnalyticsPage'
import * as durationByDay from './ui/DurationByDay'
import * as findingsByDay from './ui/FindingsByDay'

// Flipped by the tests of a chart that throws: no data makes a real chart throw.
const crash = vi.hoisted(() => ({ findingsByDay: false, durationByDay: false }))

vi.mock('./ui/FindingsByDay', async (importOriginal) => {
  const actual = await importOriginal<typeof findingsByDay>()
  return {
    FindingsByDay: (props: Parameters<typeof actual.FindingsByDay>[0]) => {
      if (crash.findingsByDay) throw new Error('chart failed')
      return <actual.FindingsByDay {...props} />
    },
  }
})

vi.mock('./ui/DurationByDay', async (importOriginal) => {
  const actual = await importOriginal<typeof durationByDay>()
  return {
    DurationByDay: (props: Parameters<typeof actual.DurationByDay>[0]) => {
      if (crash.durationByDay) throw new Error('chart failed')
      return <actual.DurationByDay {...props} />
    },
  }
})

const REPO = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  provider: 'github' as const,
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

const statusCounts = {
  queued: 0,
  running: 0,
  publishing: 0,
  succeeded: 11,
  failed: 12,
  cancelled: 13,
  skipped: 14,
}

function summary(overrides: Partial<MetricsSummary> = {}): MetricsSummary {
  return {
    range: '7d',
    totals: {
      runsByStatus: statusCounts,
      pullsByVerdict: { blocking: 21, attention: 22, clean: 23, noVerdict: 24 },
      findingsBySeverity: { critical: 31, high: 32, medium: 33, low: 34, info: 35 },
      findingsByCategory: { security: 1, correctness: 2, performance: 0, readability: 1 },
      succeededAverageDurationSeconds: 125,
      tokensIn: 10,
      tokensOut: 4,
      costUsd: 1.5,
    },
    series: [
      {
        day: '2026-10-26',
        findingsByCategory: { security: 2, correctness: 7, performance: 0, readability: 8 },
        runCount: 1,
        averageDurationSeconds: 4,
        costUsd: 0.2,
      },
      {
        day: '2026-10-27',
        findingsByCategory: { security: 0, correctness: 3, performance: 1, readability: 1 },
        runCount: 2,
        averageDurationSeconds: 9,
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
    totals: {
      ...summary().totals,
      runsByStatus: {
        queued: 0,
        running: 0,
        publishing: 0,
        succeeded: 0,
        failed: 0,
        cancelled: 0,
        skipped: 0,
      },
      succeededAverageDurationSeconds: 0,
    },
    series: [],
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

const EMPTY_PERIOD =
  'В этом периоде нет завершённых прогонов. Учитываются только завершённые ревью в подключённых репозиториях.'

function renderPage(initialEntry = '/analytics') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path: '/analytics', element: <AnalyticsPage /> },
      { path: '/repositories', element: <div>repositories</div> },
    ],
    { initialEntries: [initialEntry] },
  )
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
  vi.restoreAllMocks()
  crash.findingsByDay = false
  crash.durationByDay = false
})

describe('AnalyticsPage', () => {
  it('shows the tiles, including critical apart from high, and the day table', async () => {
    stubFetch((url) =>
      url.pathname.endsWith('/repos')
        ? { status: 200, body: [REPO] }
        : { status: 200, body: summary() },
    )
    const { container } = renderPage()
    expect(await screen.findByText('Критические')).toBeTruthy()
    const tile = (label: string): string =>
      screen.getByText(label).closest('div')?.querySelector('dd')?.textContent ?? ''
    expect(tile('Прогоны: Успешные')).toBe('11')
    expect(tile('Прогоны: С ошибкой')).toBe('12')
    expect(tile('Прогоны: Отменённые')).toBe('13')
    expect(tile('Прогоны: Пропущенные')).toBe('14')
    expect(tile('Pull request: Блокирующие')).toBe('21')
    expect(tile('Pull request: Требуют внимания')).toBe('22')
    expect(tile('Pull request: Чистые')).toBe('23')
    expect(tile('Pull request: Без вердикта')).toBe('24')
    expect(tile('Критические')).toBe('31')
    expect(tile('Высокие')).toBe('32')
    expect(tile('Средние')).toBe('33')
    expect(tile('Низкие')).toBe('34')
    expect(tile('Информационные')).toBe('35')
    expect(screen.getByText('2 мин 5 с')).toBeTruthy()
    expect(screen.getByText('$1.50')).toBeTruthy()
    expect(screen.getByText('$0')).toBeTruthy()
    expect(tile('Токены на входе')).toBe('10')
    expect(tile('Токены на выходе')).toBe('4')
    expect(screen.getByRole('heading', { name: 'Числа по дням' })).toBeTruthy()
    expect(screen.getByRole('table')).toBeTruthy()
    expect(container.querySelectorAll('title')).toHaveLength(0)
    const findingsGroup = screen.getByRole('group', { name: 'Находки по дням' })
    expect(findingsGroup.querySelectorAll('rect')).toHaveLength(6)
    const durationGroup = screen.getByRole('group', { name: 'Средняя длительность по дням' })
    expect(durationGroup.querySelectorAll('circle')).toHaveLength(2)
    for (const name of ['Безопасность', 'Дефект', 'Производительность', 'Стиль']) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0)
    }
    const legend = container.querySelector('ul')
    const dots = legend?.querySelectorAll('li span')
    expect(dots?.length).toBe(4)
  })

  // The stub stands where the failed chart stood: findings first, the duration after them.
  it.each([
    ['findingsByDay', 'Находки по дням', 'Средняя длительность по дням', 'nextElementSibling'],
    ['durationByDay', 'Средняя длительность по дням', 'Находки по дням', 'previousElementSibling'],
  ] as const)(
    'shows the block stub in place of %s when it throws and keeps the rest',
    async (chart, failed, other, side) => {
      // React reports the error the boundary caught to the console.
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      crash[chart] = true
      stubFetch((url) =>
        url.pathname.endsWith('/repos')
          ? { status: 200, body: [REPO] }
          : { status: 200, body: summary() },
      )
      renderPage()

      const stub = (
        await screen.findByText('Не удалось загрузить этот блок, обновите страницу')
      ).closest('[role="alert"]')
      // Only the failed chart gives way: one stub, not one per chart.
      expect(screen.getAllByText('Не удалось загрузить этот блок, обновите страницу')).toHaveLength(
        1,
      )
      expect(screen.queryByRole('group', { name: failed })).toBeNull()
      const otherFigure = screen.getByRole('group', { name: other }).closest('figure')
      expect(stub?.parentElement).toBe(otherFigure?.parentElement)
      expect(stub?.[side]).toBe(otherFigure)
      expect(screen.getByText('Критические')).toBeTruthy()
      expect(screen.getByRole('heading', { name: 'Числа по дням' })).toBeTruthy()
      expect(screen.getByRole('table')).toBeTruthy()
    },
  )

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
    await screen.findByText('Критические')
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
    expect(await screen.findByText(EMPTY_PERIOD)).toBeTruthy()
    expect(container.querySelector('svg[role="group"]')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Числа по дням' })).toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByText('Критические')).toBeNull()
    expect(screen.getByText('acme')).toBeTruthy()
    expect(screen.getByText('paused-team')).toBeTruthy()
  })

  it('leads to the repositories from an empty week and keeps the repository', async () => {
    const fetchMock = stubFetch((url) =>
      url.pathname.endsWith('/repos')
        ? { status: 200, body: [REPO] }
        : { status: 200, body: emptySummary() },
    )
    const { router } = renderPage('/analytics?repo=org/repo')
    const description = await screen.findByText(EMPTY_PERIOD)
    const requests = summaryRequests(fetchMock)
    const last = requests[requests.length - 1]
    expect(last?.searchParams.get('range')).toBe('7d')
    expect(last?.searchParams.get('repo')).toBe('org/repo')

    const empty = description.closest('.ant-empty')
    expect(empty).toBeTruthy()
    expect(within(empty as HTMLElement).queryAllByRole('button')).toHaveLength(0)
    const link = within(empty as HTMLElement).getByRole('link', { name: 'К репозиториям' })
    expect(link.getAttribute('href')).toBe('/repositories')
    fireEvent.click(link)
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/repositories')
    })
  })

  it('leads to the repositories when 30 days are empty', async () => {
    stubFetch((url) =>
      url.pathname.endsWith('/repos')
        ? { status: 200, body: [] }
        : { status: 200, body: emptySummary() },
    )
    const { router } = renderPage('/analytics?range=30d')
    await screen.findByText(EMPTY_PERIOD)
    const link = screen.getByRole('link', { name: 'К репозиториям' })
    expect(link.getAttribute('href')).toBe('/repositories')
    fireEvent.click(link)
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/repositories')
    })
  })

  it('keeps the repository filter when 30 days for that repository are empty', async () => {
    const fetchMock = stubFetch((url) =>
      url.pathname.endsWith('/repos')
        ? { status: 200, body: [REPO] }
        : { status: 200, body: emptySummary() },
    )
    const { router } = renderPage('/analytics?range=30d&repo=org/repo')
    await screen.findByText(EMPTY_PERIOD)
    const requests = summaryRequests(fetchMock)
    const last = requests[requests.length - 1]
    expect(last?.searchParams.get('range')).toBe('30d')
    expect(last?.searchParams.get('repo')).toBe('org/repo')
    expect(screen.getByRole('link', { name: 'К репозиториям' }).getAttribute('href')).toBe(
      '/repositories',
    )
    expect(screen.getByRole('button', { name: 'Сбросить фильтр' })).toBeTruthy()
    expect(new URLSearchParams(router.state.location.search).get('repo')).toBe('org/repo')
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
    expect(screen.queryByText(EMPTY_PERIOD)).toBeNull()
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(await screen.findByText('Критические')).toBeTruthy()
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

  it('breaks the duration line on an empty day and shows a dash for a zero average', async () => {
    stubFetch((url) =>
      url.pathname.endsWith('/repos')
        ? { status: 200, body: [REPO] }
        : {
            status: 200,
            body: summary({
              totals: { ...summary().totals, succeededAverageDurationSeconds: 0 },
              series: [
                {
                  day: '2026-10-25',
                  findingsByCategory: {
                    security: 0,
                    correctness: 0,
                    performance: 0,
                    readability: 0,
                  },
                  runCount: 2,
                  averageDurationSeconds: 10,
                  costUsd: 0,
                },
                {
                  day: '2026-10-26',
                  findingsByCategory: {
                    security: 0,
                    correctness: 0,
                    performance: 0,
                    readability: 0,
                  },
                  runCount: 0,
                  averageDurationSeconds: 0,
                  costUsd: 0,
                },
                {
                  day: '2026-10-27',
                  findingsByCategory: {
                    security: 0,
                    correctness: 0,
                    performance: 0,
                    readability: 0,
                  },
                  runCount: 1,
                  averageDurationSeconds: 4,
                  costUsd: 0,
                },
              ],
            }),
          },
    )
    const { container } = renderPage()
    expect(await screen.findByText('Критические')).toBeTruthy()
    const duration = [...container.querySelectorAll('figure')].find((figure) =>
      figure.textContent.includes('Средняя длительность по дням'),
    )
    expect(duration?.querySelectorAll('polyline')).toHaveLength(2)
    const circles = [...(duration?.querySelectorAll('circle') ?? [])]
    expect(circles).toHaveLength(2)
    const cys = circles.map((node) => node.getAttribute('cy'))
    expect(new Set(cys).size).toBe(2)
    expect(cys.every((cy) => Number(cy) < 196)).toBe(true)
    const average = screen.getByText('Средняя длительность').closest('div')?.querySelector('dd')
    expect(average?.textContent).toBe('—')
  })

  it('omits a day that had runs but no successful duration', async () => {
    stubFetch((url) =>
      url.pathname.endsWith('/repos')
        ? { status: 200, body: [REPO] }
        : {
            status: 200,
            body: summary({
              totals: { ...summary().totals, succeededAverageDurationSeconds: 10 },
              series: [
                {
                  day: '2026-10-25',
                  findingsByCategory: {
                    security: 0,
                    correctness: 0,
                    performance: 0,
                    readability: 0,
                  },
                  runCount: 2,
                  averageDurationSeconds: 10,
                  costUsd: 0,
                },
                {
                  day: '2026-10-26',
                  findingsByCategory: {
                    security: 0,
                    correctness: 0,
                    performance: 0,
                    readability: 0,
                  },
                  runCount: 3,
                  averageDurationSeconds: 0,
                  costUsd: 0,
                },
                {
                  day: '2026-10-27',
                  findingsByCategory: {
                    security: 0,
                    correctness: 0,
                    performance: 0,
                    readability: 0,
                  },
                  runCount: 1,
                  averageDurationSeconds: 4,
                  costUsd: 0,
                },
              ],
            }),
          },
    )
    const { container } = renderPage()
    expect(await screen.findByText('Критические')).toBeTruthy()
    const duration = [...container.querySelectorAll('figure')].find((figure) =>
      figure.textContent.includes('Средняя длительность по дням'),
    )
    expect(duration?.querySelectorAll('polyline')).toHaveLength(2)
    const circles = [...(duration?.querySelectorAll('circle') ?? [])]
    expect(circles).toHaveLength(2)
    expect(circles.every((node) => Number(node.getAttribute('cy')) < 196)).toBe(true)
    const row = screen.getByRole('row', { name: /2026-10-26/ })
    expect(row.textContent).toContain('—')
    expect(row.textContent).not.toContain('<1')
  })

  it('paints series with theme tokens, shared helpTarget :focus-visible rule, and no hex', () => {
    const root = join(process.cwd(), 'src/pages/analytics')
    const findingsCss = readFileSync(join(root, 'ui/FindingsByDay.module.css'), 'utf8')
    const durationCss = readFileSync(join(root, 'ui/DurationByDay.module.css'), 'utf8')
    const headingCss = readFileSync(join(root, 'ui/ChartHeading.module.css'), 'utf8')
    const pageCss = readFileSync(join(root, 'AnalyticsPage.module.css'), 'utf8')
    const helpTargetCss = readFileSync(
      join(process.cwd(), 'src/shared/ui/MetricTooltip/MetricTooltip.module.css'),
      'utf8',
    )

    expect(helpTargetCss).toMatch(/\.helpTarget:focus-visible\b/)
    expect(helpTargetCss).toContain('outline: 2px solid var(--rv-link);')
    expect(helpTargetCss).toContain('cursor: help;')

    for (const color of ['--rv-critical', '--rv-high', '--rv-warning', '--rv-link']) {
      expect(findingsCss).toContain(`fill: var(${color});`)
    }
    expect(durationCss).toContain('var(--rv-accent)')

    const allCss = [findingsCss, durationCss, headingCss, pageCss, helpTargetCss].join('\n')
    expect(allCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('shows tooltips explaining all 17 tiles on focus and hover, and closes on Escape', async () => {
    stubFetch((url) =>
      url.pathname.endsWith('/repos')
        ? { status: 200, body: [REPO] }
        : { status: 200, body: summary() },
    )
    renderPage()
    const tilesList = (await screen.findByText('Критические')).closest('dl')
    assert(tilesList)
    const criticalDt = screen.getByText('Критические')
    expect(criticalDt.getAttribute('tabindex')).toBe('0')
    expect(criticalDt.className).toContain('helpTarget')
    const criticalTile = criticalDt.closest('div')
    assert(criticalTile)
    expect(criticalTile.getAttribute('tabindex')).toBeNull()
    expect(criticalTile.getAttribute('aria-labelledby')).toBeNull()

    const tiles = [
      ['Прогоны: Успешные', 'Число прогонов ревью со статусом «Успешные» за выбранный период'],
      ['Прогоны: С ошибкой', 'Число прогонов ревью со статусом «С ошибкой» за выбранный период'],
      ['Прогоны: Отменённые', 'Число прогонов ревью со статусом «Отменённые» за выбранный период'],
      [
        'Прогоны: Пропущенные',
        'Число прогонов ревью со статусом «Пропущенные» за выбранный период',
      ],
      [
        'Pull request: Блокирующие',
        'Число pull request с вердиктом «Блокирующие» (хотя бы одна находка critical или high) за выбранный период',
      ],
      [
        'Pull request: Требуют внимания',
        'Число pull request с вердиктом «Требуют внимания» (только находки medium или low) за выбранный период',
      ],
      [
        'Pull request: Чистые',
        'Число pull request с вердиктом «Чистые» (полная проверка, нет находок выше info) за выбранный период',
      ],
      [
        'Pull request: Без вердикта',
        'Число pull request без вердикта (прогон с ошибкой, отменён или пропущен; проверка неполная и без находок выше info; проверка только по списку файлов) за выбранный период',
      ],
      ['Критические', 'Число критических находок (дают вердикт «Блокирующие») за выбранный период'],
      [
        'Высокие',
        'Число находок высокой важности (дают вердикт «Блокирующие») за выбранный период',
      ],
      [
        'Средние',
        'Число находок средней важности (без более важных дают вердикт «Требуют внимания») за выбранный период',
      ],
      [
        'Низкие',
        'Число находок низкой важности (без более важных дают вердикт «Требуют внимания») за выбранный период',
      ],
      ['Информационные', 'Число информационных находок (на вердикт не влияют) за выбранный период'],
      ['Средняя длительность', 'Средняя длительность по успешным прогонам за выбранный период'],
      ['Токены на входе', 'Суммарное число входных токенов за выбранный период'],
      ['Токены на выходе', 'Суммарное число выходных токенов за выбранный период'],
      ['Стоимость', 'Суммарная стоимость в долларах США (USD) за выбранный период'],
    ] as const
    expect(tilesList.querySelectorAll('dt')).toHaveLength(tiles.length)

    for (const [label, expectedText] of tiles) {
      const term = within(tilesList).getByText(label)

      fireEvent.mouseEnter(term)
      expect(await screen.findByText(expectedText)).toBeTruthy()
      fireEvent.mouseLeave(term)
      await waitForElementToBeRemoved(() => screen.queryByText(expectedText))

      fireEvent.focus(term)
      expect(await screen.findByText(expectedText)).toBeTruthy()
      fireEvent.blur(term)
      await waitForElementToBeRemoved(() => screen.queryByText(expectedText))
    }

    // Verify closing tile tooltip on Escape (AC5)
    const criticalHelp = tiles[8][1]
    fireEvent.focus(criticalDt)
    expect(await screen.findByText(criticalHelp)).toBeTruthy()
    fireEvent.keyDown(criticalDt, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByText(criticalHelp)).toBeNull()
    })
  })

  function stubThreeDaySeries() {
    stubFetch((url) =>
      url.pathname.endsWith('/repos')
        ? { status: 200, body: [REPO] }
        : {
            status: 200,
            body: summary({
              series: [
                {
                  day: '2026-10-25',
                  findingsByCategory: {
                    security: 4,
                    correctness: 6,
                    performance: 0,
                    readability: 0,
                  },
                  runCount: 2,
                  averageDurationSeconds: 12.7,
                  costUsd: 0.2,
                },
                {
                  day: '2026-10-26',
                  findingsByCategory: {
                    security: 0,
                    correctness: 5,
                    performance: 0,
                    readability: 0,
                  },
                  runCount: 0,
                  averageDurationSeconds: 0,
                  costUsd: 0,
                },
                {
                  day: '2026-10-27',
                  findingsByCategory: {
                    security: 0,
                    correctness: 0,
                    performance: 0,
                    readability: 2,
                  },
                  runCount: 1,
                  averageDurationSeconds: 125,
                  costUsd: 0,
                },
              ],
            }),
          },
    )
  }

  it('removes native title and does not make axis line a focus stop', async () => {
    stubThreeDaySeries()
    const { container } = renderPage()
    await screen.findByRole('button', { name: 'Находки по дням' })
    expect(container.querySelectorAll('title')).toHaveLength(0)
    expect(container.querySelector('line[tabindex]')).toBeNull()
  })

  it('explains chart axes, period scaling, units, and line gaps via caption buttons on focus and hover', async () => {
    const FINDINGS_HELP =
      'График показывает число находок за день по четырём категориям: Безопасность, Дефект, Производительность и Стиль. Шкала строится от максимума выбранного периода, поэтому графики разных периодов по высоте не сравнимы.'
    const DURATION_HELP =
      'График показывает среднюю длительность успешных прогонов за день. Шкала строится от максимума выбранного периода, поэтому графики разных периодов по высоте не сравнимы. Значения в секундах; в подсказке точки — минуты и секунды. Линия соединяет дни с успешными прогонами; разрыв линии означает, что в этот день не было успешных прогонов.'

    stubThreeDaySeries()
    renderPage()

    const findingsCaption = await screen.findByRole('button', { name: 'Находки по дням' })
    fireEvent.mouseEnter(findingsCaption)
    expect(await screen.findByText(FINDINGS_HELP)).toBeTruthy()
    fireEvent.mouseLeave(findingsCaption)
    await waitForElementToBeRemoved(() => screen.queryByText(FINDINGS_HELP))

    fireEvent.focus(findingsCaption)
    expect(await screen.findByText(FINDINGS_HELP)).toBeTruthy()
    fireEvent.blur(findingsCaption)
    await waitForElementToBeRemoved(() => screen.queryByText(FINDINGS_HELP))

    const durationCaption = screen.getByRole('button', { name: 'Средняя длительность по дням' })
    fireEvent.mouseEnter(durationCaption)
    expect(await screen.findByText(DURATION_HELP)).toBeTruthy()
    fireEvent.mouseLeave(durationCaption)
    await waitForElementToBeRemoved(() => screen.queryByText(DURATION_HELP))

    fireEvent.focus(durationCaption)
    expect(await screen.findByText(DURATION_HELP)).toBeTruthy()
    fireEvent.blur(durationCaption)
    await waitForElementToBeRemoved(() => screen.queryByText(DURATION_HELP))
  })

  it('scales bars to period max and omits zero-value categories from rendering', async () => {
    stubThreeDaySeries()
    const { container } = renderPage()

    const findingsGroup = await screen.findByRole('group', { name: 'Находки по дням' })
    const rects = [...findingsGroup.querySelectorAll('rect')]
    expect(rects).toHaveLength(4)
    expect(container.querySelector('rect.performance')).toBeNull()

    const halfMaxBar = screen.getByRole('graphics-symbol', { name: '2026-10-26: Дефект' })
    assert(halfMaxBar)
    expect(Number(halfMaxBar.getAttribute('height'))).toBeCloseTo(98, 2)
    expect(halfMaxBar.getAttribute('class')).toContain('correctness')
    expect(halfMaxBar.getAttribute('class')).toContain('helpTarget')
  })

  it('navigates bar columns with roving focus and opens tooltip on focus and hover', async () => {
    stubThreeDaySeries()
    renderPage()

    const findingsGroup = await screen.findByRole('group', { name: 'Находки по дням' })
    const rects = [...findingsGroup.querySelectorAll('rect')]
    expect(rects.map((node) => node.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1'])

    const halfMaxBar = screen.getByRole('graphics-symbol', { name: '2026-10-26: Дефект' })
    assert(halfMaxBar)

    fireEvent.mouseEnter(halfMaxBar)
    expect(await screen.findByText('2026-10-26: Дефект — 5 находок')).toBeTruthy()
    fireEvent.mouseLeave(halfMaxBar)
    await waitForElementToBeRemoved(() => screen.queryByText('2026-10-26: Дефект — 5 находок'))

    fireEvent.focus(halfMaxBar)
    expect(await screen.findByText('2026-10-26: Дефект — 5 находок')).toBeTruthy()
    fireEvent.blur(halfMaxBar)
    await waitForElementToBeRemoved(() => screen.queryByText('2026-10-26: Дефект — 5 находок'))

    // Roving ArrowRight moves focus across bars
    const firstBar = rects[0]
    assert(firstBar)
    fireEvent.focus(firstBar)
    fireEvent.keyDown(firstBar, { key: 'ArrowRight' })
    await waitFor(() => {
      expect(rects[1]?.getAttribute('tabindex')).toBe('0')
    })
    fireEvent.blur(firstBar)
  })

  it('formats point duration with formatDuration and omits zero duration points', async () => {
    stubThreeDaySeries()
    renderPage()

    const durationGroup = await screen.findByRole('group', { name: 'Средняя длительность по дням' })
    const circles = [...durationGroup.querySelectorAll('circle')]
    expect(circles).toHaveLength(2)
    expect(circles.map((node) => node.getAttribute('tabindex'))).toEqual(['0', '-1'])

    const fractionalPoint = screen.getByRole('graphics-symbol', { name: '2026-10-25' })
    assert(fractionalPoint)
    expect(fractionalPoint.getAttribute('class')).toContain('point')
    expect(fractionalPoint.getAttribute('class')).toContain('helpTarget')

    const minutePoint = screen.getByRole('graphics-symbol', { name: '2026-10-27' })
    assert(minutePoint)

    // Hover on point
    fireEvent.mouseEnter(fractionalPoint)
    expect(await screen.findByText('2026-10-25: 12 с')).toBeTruthy()
    fireEvent.mouseLeave(fractionalPoint)
    await waitForElementToBeRemoved(() => screen.queryByText('2026-10-25: 12 с'))

    // Verify >60s point
    fireEvent.focus(minutePoint)
    expect(await screen.findByText('2026-10-27: 2 мин 5 с')).toBeTruthy()
    fireEvent.blur(minutePoint)
    await waitForElementToBeRemoved(() => screen.queryByText('2026-10-27: 2 мин 5 с'))
  })

  it('closes chart tooltips on Escape keydown for both bar columns and duration points', async () => {
    stubThreeDaySeries()
    renderPage()

    await screen.findByRole('group', { name: 'Находки по дням' })
    const halfMaxBar = screen.getByRole('graphics-symbol', { name: '2026-10-26: Дефект' })
    assert(halfMaxBar)

    // Focus bar column and verify Esc closes it
    fireEvent.focus(halfMaxBar)
    expect(await screen.findByText('2026-10-26: Дефект — 5 находок')).toBeTruthy()
    fireEvent.keyDown(halfMaxBar, { key: 'Escape', code: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByText('2026-10-26: Дефект — 5 находок')).toBeNull()
    })

    // Focus duration point and verify Esc closes it
    const fractionalPoint = screen.getByRole('graphics-symbol', { name: '2026-10-25' })
    assert(fractionalPoint)
    fireEvent.focus(fractionalPoint)
    expect(await screen.findByText('2026-10-25: 12 с')).toBeTruthy()
    fireEvent.keyDown(fractionalPoint, { key: 'Escape', code: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByText('2026-10-25: 12 с')).toBeNull()
    })
  })
})
