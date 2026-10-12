// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { mockRunsListPage } from '../../app/mocks/mockRunsList.fixture'
import { RunsPage } from './RunsPage'

vi.mock('../../entities/run', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../entities/run')>()
  return {
    ...actual,
    useRunList: vi.fn(),
  }
})

import { useRunList } from '../../entities/run'

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
  vi.clearAllMocks()
})

describe('RunsPage', () => {
  it('renders PR rows from HTTP-loaded mock fixture data', async () => {
    vi.mocked(useRunList).mockReturnValue({
      data: mockRunsListPage,
      isLoading: false,
      isError: false,
      error: null,
      isPending: false,
      isLoadingError: false,
      isRefetchError: false,
      isSuccess: true,
      status: 'success',
      fetchStatus: 'idle',
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRunList>)

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Прогоны' })).toBeTruthy()
    })

    expect(screen.getByText('feat: frontend architecture skeleton')).toBeTruthy()
  })

  it('navigates to /runs/{id} when a table row is clicked', async () => {
    vi.mocked(useRunList).mockReturnValue({
      data: mockRunsListPage,
      isLoading: false,
      isError: false,
      error: null,
      isPending: false,
      isLoadingError: false,
      isRefetchError: false,
      isSuccess: true,
      status: 'success',
      fetchStatus: 'idle',
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRunList>)

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
    vi.mocked(useRunList).mockReturnValue({
      data: mockRunsListPage,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRunList>)

    const demoRun = mockRunsListPage.items.find((run) => run.status === 'succeeded')
    if (!demoRun) {
      throw new Error('fixture must include a succeeded run')
    }
    const { router } = renderPage()

    const links = await screen.findAllByRole('link')
    expect(links).toHaveLength(mockRunsListPage.items.length)
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
})
