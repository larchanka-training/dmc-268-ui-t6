// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { mockRunsListPage } from '../../app/mocks/mockRunsList.fixture'
import { RunsPage } from './RunsPage'

vi.mock('../../entities/run/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../entities/run/api')>()
  return {
    ...actual,
    useRunList: vi.fn(),
    useRunDetail: vi.fn(() => ({
      data: undefined,
      isLoading: true,
      isError: false,
    })),
    useRunDiff: vi.fn(() => ({
      data: undefined,
      isLoading: true,
      isError: false,
    })),
  }
})

import { useRunList } from '../../entities/run/api'

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
  return render(<RouterProvider router={router} />)
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
    } as ReturnType<typeof useRunList>)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText("Pull request'ы с ревью")).toBeTruthy()
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
    } as ReturnType<typeof useRunList>)

    const demoRun = mockRunsListPage.items.find((run) => run.status === 'succeeded')!
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(demoRun.pullRequest.title)).toBeTruthy()
    })

    fireEvent.click(screen.getByText(demoRun.pullRequest.title))
    expect(await screen.findByTestId('run-detail-route')).toBeTruthy()
  })
})
