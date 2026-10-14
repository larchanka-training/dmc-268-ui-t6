// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { mockRunsListPage } from '../../app/mocks/mockRunsList.fixture'
import type { RunListPage, RunSession } from '../../entities/run'
import { RunsPage } from './RunsPage'

const API_REPO = 'larchanka-training/dmc-268-api-t6'
const API_REPO_SEARCH = '?repo=larchanka-training%2Fdmc-268-api-t6'
const INFRA_REPO = 'larchanka-training/dmc-268-infra-t6'

type Handler = (url: URL, call: number) => RunListPage | Response

function urlOf(input: Parameters<typeof fetch>[0]): URL {
  const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  return new URL(href, 'http://localhost')
}

/** Stands in for the network: `handler` sees the URL the page requested and answers the list. */
function stubFetch(handler: Handler) {
  const fetchMock = vi.fn<typeof fetch>((input) => {
    // The mock has recorded this call already, so the first request is call 1.
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

function listedRun(index: number): RunSession {
  const run = mockRunsListPage.items[index]
  if (!run) {
    throw new Error(`the fixture has no run ${String(index)}`)
  }
  return run
}

function renderPage(initialEntry = '/runs') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      {
        path: '/runs',
        element: (
          <QueryClientProvider client={client}>
            <RunsPage />
          </QueryClientProvider>
        ),
      },
      {
        path: '/runs/:runId',
        element: <div data-testid="run-detail-route">detail</div>,
      },
    ],
    { initialEntries: [initialEntry] },
  )
  return { router, ...render(<RouterProvider router={router} />) }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('RunsPage', () => {
  it('renders PR rows from the loaded page', async () => {
    stubFetch(() => mockRunsListPage)

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Прогоны' })).toBeTruthy()
    })

    expect(await screen.findByText('feat: frontend architecture skeleton')).toBeTruthy()
  })

  it('navigates to /runs/{id} when a table row is clicked', async () => {
    stubFetch(() => mockRunsListPage)

    const demoRun = mockRunsListPage.items.find((run) => run.status === 'succeeded')
    if (!demoRun) {
      throw new Error('fixture must include a succeeded run')
    }
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(demoRun.pullRequest.title)).toBeTruthy()
    })

    fireEvent.click(screen.getByText(demoRun.pullRequest.title))
    expect(await screen.findByTestId('run-detail-route')).toBeTruthy()
  })

  it('gives every run a link, so it opens from the keyboard and in a new tab', async () => {
    const page: RunListPage = { items: mockRunsListPage.items.slice(0, 12), nextCursor: null }
    stubFetch(() => page)

    const demoRun = page.items.find((run) => run.status === 'succeeded')
    if (!demoRun) {
      throw new Error('fixture must include a succeeded run')
    }
    const { router } = renderPage()

    const links = await screen.findAllByRole('link')
    expect(links).toHaveLength(12)
    const link = links.find((item) => item.getAttribute('href') === `/runs/${demoRun.id}`)
    expect(link?.textContent).toBe(`#${String(demoRun.pullRequest.number)}`)

    if (!link) {
      throw new Error('the run has no link')
    }

    // A click with a modifier belongs to the browser (a new tab): this tab stays on the list.
    fireEvent.click(link, { ctrlKey: true })
    expect(router.state.location.pathname).toBe('/runs')

    // A plain click is one navigation, not two: the row leaves it to the link, so one step
    // back returns to the list.
    fireEvent.click(link)
    expect(await screen.findByTestId('run-detail-route')).toBeTruthy()
    await act(async () => {
      await router.navigate(-1)
    })
    expect(router.state.location.pathname).toBe('/runs')
  })

  it('requests only the runs of the repo from the URL', async () => {
    const fetchMock = stubFetch(() => ({ items: [listedRun(0)], nextCursor: null }))

    renderPage(`/runs${API_REPO_SEARCH}`)

    await screen.findByText(listedRun(0).pullRequest.title)
    const [url, ...rest] = requestedUrls(fetchMock)
    expect(rest).toEqual([])
    expect(url?.pathname).toBe('/api/runs')
    expect(url?.searchParams.get('repo')).toBe(API_REPO)
    expect(url?.searchParams.get('limit')).toBe('20')
    expect(url?.searchParams.has('cursor')).toBe(false)
  })

  it('requests every run when the URL has no repo or an unusable one', async () => {
    const fetchMock = stubFetch(() => ({ items: [listedRun(0)], nextCursor: null }))

    renderPage('/runs?repo=')

    await screen.findByText(listedRun(0).pullRequest.title)
    const urls = requestedUrls(fetchMock)
    expect(urls).toHaveLength(1)
    expect(urls[0]?.searchParams.has('repo')).toBe(false)
    expect(screen.queryByRole('button', { name: 'Сбросить фильтр' })).toBeNull()
  })

  it('shows the active filter and resets it', async () => {
    const fetchMock = stubFetch(() => ({ items: [listedRun(0)], nextCursor: null }))

    const { router } = renderPage(`/runs${API_REPO_SEARCH}`)

    await screen.findByText(listedRun(0).pullRequest.title)
    expect(
      screen.getByText(`Pull request'ы репозитория ${API_REPO}`, { exact: false }),
    ).toBeTruthy()
    expect(screen.getByText(API_REPO)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Сбросить фильтр' }))

    await waitFor(() => {
      expect(router.state.location.search).toBe('')
    })
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Сбросить фильтр' })).toBeNull()
    })
    expect(screen.queryByText(API_REPO)).toBeNull()
    const urls = requestedUrls(fetchMock)
    expect(urls[urls.length - 1]?.searchParams.has('repo')).toBe(false)

    // The reset is a navigation: one step back brings the filter back.
    await act(async () => {
      await router.navigate(-1)
    })
    expect(router.state.location.search).toBe(API_REPO_SEARCH)
    expect(await screen.findByRole('button', { name: 'Сбросить фильтр' })).toBeTruthy()
  })

  it('shows a filtered-empty message naming the repo', async () => {
    stubFetch(() => ({ items: [], nextCursor: null }))

    const { router } = renderPage('/runs?repo=larchanka-training%2Fdmc-268-infra-t6')

    expect(await screen.findByText(`Для репозитория ${INFRA_REPO} прогонов ещё нет`)).toBeTruthy()
    expect(screen.queryByText('Нет прогонов ревью')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Показать все прогоны' }))

    await waitFor(() => {
      expect(router.state.location.search).toBe('')
    })
    expect(await screen.findByText('Нет прогонов ревью')).toBeTruthy()
    expect(screen.queryByText(`Для репозитория ${INFRA_REPO} прогонов ещё нет`)).toBeNull()
  })

  it('keeps the plain empty message when no filter is set', async () => {
    stubFetch(() => ({ items: [], nextCursor: null }))

    renderPage()

    expect(await screen.findByText('Нет прогонов ревью')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Показать все прогоны' })).toBeNull()
  })

  it('appends rows on «Показать ещё»', async () => {
    const fetchMock = stubFetch((url) =>
      url.searchParams.get('cursor') === 'cursor-a'
        ? { items: [listedRun(2)], nextCursor: null }
        : { items: [listedRun(0), listedRun(1)], nextCursor: 'cursor-a' },
    )

    renderPage()

    await screen.findByText(listedRun(0).pullRequest.title)
    expect(screen.queryByText(listedRun(2).pullRequest.title)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Показать ещё' }))

    expect(await screen.findByText(listedRun(2).pullRequest.title)).toBeTruthy()
    expect(screen.getByText(listedRun(0).pullRequest.title)).toBeTruthy()
    expect(screen.getByText(listedRun(1).pullRequest.title)).toBeTruthy()
    // The last page has no cursor: nothing left to load.
    expect(screen.queryByRole('button', { name: 'Показать ещё' })).toBeNull()
    expect(requestedUrls(fetchMock).map((url) => url.searchParams.get('cursor'))).toEqual([
      null,
      'cursor-a',
    ])
  })

  it('shows a run once when two loaded pages both contain it', async () => {
    stubFetch((url) =>
      url.searchParams.get('cursor') === 'cursor-a'
        ? { items: [listedRun(1), listedRun(2)], nextCursor: null }
        : { items: [listedRun(0), listedRun(1)], nextCursor: 'cursor-a' },
    )

    renderPage()

    await screen.findByText(listedRun(0).pullRequest.title)
    fireEvent.click(screen.getByRole('button', { name: 'Показать ещё' }))
    await screen.findByText(listedRun(2).pullRequest.title)

    expect(screen.getAllByText(listedRun(1).pullRequest.title)).toHaveLength(1)
  })

  it('keeps loaded rows and offers retry when the next page fails', async () => {
    const fetchMock = stubFetch((url, call) => {
      if (url.searchParams.get('cursor') === null) {
        return { items: [listedRun(0), listedRun(1)], nextCursor: 'cursor-a' }
      }
      return call === 2
        ? new Response('{}', { status: 500, statusText: 'Internal Server Error' })
        : { items: [listedRun(2)], nextCursor: null }
    })

    renderPage()

    await screen.findByText(listedRun(0).pullRequest.title)
    fireEvent.click(screen.getByRole('button', { name: 'Показать ещё' }))

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Не удалось загрузить следующую страницу')).toBeTruthy()
    // The rows of the first page stay on the screen, and the whole-page error is not shown.
    expect(screen.getByText(listedRun(0).pullRequest.title)).toBeTruthy()
    expect(screen.getByText(listedRun(1).pullRequest.title)).toBeTruthy()
    expect(screen.queryByText('Ошибка загрузки')).toBeNull()

    fireEvent.click(within(alert).getByRole('button', { name: 'Повторить' }))

    expect(await screen.findByText(listedRun(2).pullRequest.title)).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(requestedUrls(fetchMock).map((url) => url.searchParams.get('cursor'))).toEqual([
      null,
      'cursor-a',
      'cursor-a',
    ])
  })

  it('shows the load error and no table when the first page fails', async () => {
    stubFetch(() => new Response('{}', { status: 500, statusText: 'Internal Server Error' }))

    renderPage()

    expect(await screen.findByText('Ошибка загрузки')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })
})
