// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { RunListPage, RunSession } from '../../entities/run'
import { AuditPage } from './AuditPage'

type Handler = (url: URL, call: number) => RunListPage | Response

function urlOf(input: Parameters<typeof fetch>[0]): URL {
  const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  return new URL(href, 'http://localhost')
}

function stubFetch(handler: Handler) {
  const fetchMock = vi.fn<typeof fetch>((input) => {
    const answer = handler(urlOf(input), fetchMock.mock.calls.length)
    return Promise.resolve(
      answer instanceof Response ? answer : new Response(JSON.stringify(answer), { status: 200 }),
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function requestedUrls(fetchMock: ReturnType<typeof stubFetch>): URL[] {
  return fetchMock.mock.calls.map(([input]) => urlOf(input))
}

function session(overrides: Partial<RunSession> = {}): RunSession {
  return {
    id: '11111111-1111-4111-8111-000000000301',
    engine: 'fast',
    model: null,
    status: 'failed',
    startedAt: '2026-09-18T11:50:00.000Z',
    finishedAt: '2026-09-18T11:55:12.000Z',
    attempt: 1,
    cancelRequested: false,
    trigger: 'webhook',
    createdAt: '2026-09-18T11:00:00.000Z',
    summaryOnly: false,
    pullRequest: {
      repo: 'org/repo',
      number: 7,
      title: 'feat: audit row',
      url: 'https://github.com/org/repo/pull/7',
      headSha: 'abcdef1234567890abcdef1234567890abcdef12',
    },
    actionCount: 1,
    errorCode: 'budget_exceeded',
    ...overrides,
  }
}

function renderPage(initialEntry = '/audit') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      {
        path: '/audit',
        element: (
          <QueryClientProvider client={client}>
            <AuditPage />
          </QueryClientProvider>
        ),
      },
      { path: '/runs/:runId', element: <div>detail</div> },
    ],
    { initialEntries: [initialEntry] },
  )
  return { router, ...render(<RouterProvider router={router} />) }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AuditPage', () => {
  it('shows the journal columns and opens the run from the row link', async () => {
    stubFetch(() => ({
      items: [
        session({ triggeredBy: 'octocat', usage: { tokensIn: 10, tokensOut: 4, costUsd: 1.5 } }),
      ],
      nextCursor: null,
    }))
    renderPage()
    expect(await screen.findByText('18.09.2026, 11:50:00')).toBeTruthy()
    for (const heading of [
      'Начат',
      'Репозиторий',
      'PR',
      'Тип запуска',
      'Запустил',
      'Статус',
      'Длительность',
      'Токены на входе',
      'Токены на выходе',
      'Стоимость',
    ]) {
      expect(screen.getByRole('columnheader', { name: heading })).toBeTruthy()
    }
    expect(screen.getByText('org/repo')).toBeTruthy()
    expect(screen.getByText('webhook')).toBeTruthy()
    expect(screen.getByText('octocat')).toBeTruthy()
    expect(screen.getByText('5 мин 12 с')).toBeTruthy()
    expect(screen.getByText('10')).toBeTruthy()
    expect(screen.getByText('4')).toBeTruthy()
    expect(screen.getByText('$1.50')).toBeTruthy()
    const link = screen.getByRole('link', { name: '#7' })
    expect(link.getAttribute('href')).toBe('/runs/11111111-1111-4111-8111-000000000301')
    link.focus()
    expect(document.activeElement).toBe(link)
  })

  it('shows the limit phrase without the code, the raw code when it is unknown, and a dash when it is null', async () => {
    stubFetch(() => ({
      items: [
        session(),
        session({
          id: '11111111-1111-4111-8111-000000000302',
          errorCode: 'not_a_limit',
          pullRequest: {
            repo: 'org/repo',
            number: 8,
            title: 'unknown',
            url: 'https://github.com/org/repo/pull/8',
            headSha: 'abcdef1234567890abcdef1234567890abcdef12',
          },
        }),
        session({
          id: '11111111-1111-4111-8111-000000000303',
          errorCode: null,
          pullRequest: {
            repo: 'org/repo',
            number: 9,
            title: 'none',
            url: 'https://github.com/org/repo/pull/9',
            headSha: 'abcdef1234567890abcdef1234567890abcdef12',
          },
        }),
      ],
      nextCursor: null,
    }))
    renderPage()
    await screen.findByText('feat: audit row')
    const cells = screen.getAllByTestId('audit-reason')
    expect(cells[0]?.textContent).toContain('Превышен лимит стоимости прогона.')
    expect(cells[0]?.textContent).not.toContain('budget_exceeded')
    expect(cells[1]?.textContent).toContain('not_a_limit')
    expect(cells[2]?.textContent).toContain('—')
  })

  it('shows a dash without an initiator and zeros without usage', async () => {
    stubFetch(() => ({
      items: [
        session({ id: '11111111-1111-4111-8111-000000000304', triggeredBy: null, errorCode: null }),
        session({
          id: '11111111-1111-4111-8111-000000000305',
          usage: { tokensIn: 0, tokensOut: 0, costUsd: 0 },
          errorCode: null,
          pullRequest: {
            repo: 'org/repo',
            number: 11,
            title: 'zeros',
            url: 'https://github.com/org/repo/pull/11',
            headSha: 'abcdef1234567890abcdef1234567890abcdef12',
          },
        }),
      ],
      nextCursor: null,
    }))
    renderPage()
    await screen.findByText('zeros')
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('$0').length).toBeGreaterThanOrEqual(1)
  })

  it('sends repo and status from the address and starts again when the status changes', async () => {
    const fetchMock = stubFetch(() => ({ items: [session()], nextCursor: null }))
    renderPage('/audit?repo=org/repo&status=failed&tab=keep')
    await screen.findByText('feat: audit row')
    const first = requestedUrls(fetchMock)[0]
    expect(first?.searchParams.get('repo')).toBe('org/repo')
    expect(first?.searchParams.get('status')).toBe('failed')
    expect(first?.searchParams.get('cursor')).toBeNull()

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Статус' }))
    const option = [...document.querySelectorAll('.ant-select-item-option')].find(
      (candidate) => candidate.textContent === 'succeeded',
    )
    if (option === undefined) {
      throw new Error('status option is not rendered')
    }
    fireEvent.click(option)
    await waitFor(() => {
      const urls = requestedUrls(fetchMock)
      const last = urls[urls.length - 1]
      expect(last?.searchParams.get('status')).toBe('succeeded')
      expect(last?.searchParams.get('cursor')).toBeNull()
    })
  })

  it('drops an unknown status and does not send it', async () => {
    const fetchMock = stubFetch(() => ({ items: [], nextCursor: null }))
    renderPage('/audit?status=nope')
    await screen.findByText('Нет прогонов ревью')
    expect(requestedUrls(fetchMock)[0]?.searchParams.get('status')).toBeNull()
  })

  it('requests the next page with the cursor and keeps rows when that page fails', async () => {
    const second = session({
      id: '11111111-1111-4111-8111-000000000306',
      pullRequest: {
        repo: 'org/repo',
        number: 12,
        title: 'next page',
        url: 'https://github.com/org/repo/pull/12',
        headSha: 'abcdef1234567890abcdef1234567890abcdef12',
      },
    })
    const fetchMock = stubFetch((url, call) => {
      if (url.searchParams.get('cursor') === null) {
        return { items: [session()], nextCursor: 'cursor-a' }
      }
      return call === 2
        ? new Response('{}', { status: 500, statusText: 'Internal Server Error' })
        : { items: [second], nextCursor: null }
    })
    renderPage()
    await screen.findByText('feat: audit row')
    const more = screen.getByRole('button', { name: 'Показать ещё' })
    more.focus()
    fireEvent.click(more)
    const alert = await screen.findByRole('alert')
    expect(screen.getByText('feat: audit row')).toBeTruthy()
    expect(within(alert).getByRole('button', { name: 'Повторить' })).toBeTruthy()
    fireEvent.click(within(alert).getByRole('button', { name: 'Повторить' }))
    expect(await screen.findByText('next page')).toBeTruthy()
    expect(requestedUrls(fetchMock).map((url) => url.searchParams.get('cursor'))).toEqual([
      null,
      'cursor-a',
      'cursor-a',
    ])
  })

  it('moves focus to the link of the first new row after «Показать ещё»', async () => {
    const second = session({
      id: '11111111-1111-4111-8111-000000000307',
      pullRequest: {
        repo: 'org/repo',
        number: 13,
        title: 'focused row',
        url: 'https://github.com/org/repo/pull/13',
        headSha: 'abcdef1234567890abcdef1234567890abcdef12',
      },
    })
    stubFetch((url) =>
      url.searchParams.get('cursor') === 'cursor-a'
        ? { items: [second], nextCursor: null }
        : { items: [session()], nextCursor: 'cursor-a' },
    )
    renderPage()
    await screen.findByText('feat: audit row')
    const more = screen.getByRole('button', { name: 'Показать ещё' })
    more.focus()
    fireEvent.click(more)
    await screen.findByText('focused row')
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('link', { name: '#13' }))
    })
  })
})
