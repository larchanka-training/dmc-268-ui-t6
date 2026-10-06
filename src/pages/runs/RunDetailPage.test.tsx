// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'

vi.mock('../../shared/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/config/env')>()
  return {
    ...actual,
    USE_MOCKS: true,
    isMockMode: () => true,
  }
})

import { z } from 'zod'

import { RawFileDiffSchema } from '../../entities/diff'
import { mockRunsListPage } from '../../app/mocks/mockRunsList.fixture'
import { buildMockRunDetail } from '../../app/mocks/mockRunReview'
import { initMockTransport, withMockTransportOverlay } from '../../app/mocks/mockTransport'
import { SAMPLE_PATCHES } from '../../shared/fixtures/sample.patch'
import { REVIEW_LEGACY_RUN_ID } from '../../app/mocks/mockRunReview'
import { DEMO_RUN_ID } from '../../shared/config/demoRun'
import { ApiError, setAccessToken, setMockTransport } from '../../shared/api/client'
import { runQueryKeys } from '../../entities/run'
import { useAuthStore } from '../../features/auth'
import { useDiffViewerStore } from '../../widgets/diff-viewer'
import { useRunInspectorStore } from '../../widgets/run-inspector'
import { RunDetailPage } from './RunDetailPage'

function renderRunDetail(runId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter([{ path: '/runs/:runId', element: <RunDetailPage /> }], {
    initialEntries: [`/runs/${runId}`],
  })
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('RunDetailPage', () => {
  beforeEach(() => {
    initMockTransport()
    setAccessToken('mock_jwt_token_skvertl_dmc')
    useAuthStore.setState({
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
    })
    useDiffViewerStore.setState({ viewType: 'unified', selectedFile: null })
    useRunInspectorStore.setState({ expandedKeys: [], selectedActionIndex: null })
  })

  afterEach(() => {
    cleanup()
    setAccessToken(null)
    setMockTransport(null)
  })

  it('renders run header, action log, and diff on mocks', async () => {
    renderRunDetail(DEMO_RUN_ID)
    await waitFor(() => {
      expect(screen.getByTestId('run-detail-page')).toBeTruthy()
    })
    expect(screen.getByText('succeeded')).toBeTruthy()
    expect(screen.getByText('get_tree ×19')).toBeTruthy()
    expect(screen.getByText('src/a.ts')).toBeTruthy()
  })

  it('renders a legacy RunSession payload without review extras', async () => {
    renderRunDetail(REVIEW_LEGACY_RUN_ID)
    await waitFor(() => {
      expect(screen.getByTestId('run-detail-page')).toBeTruthy()
    })
    expect(screen.getByText('running')).toBeTruthy()
    expect(screen.queryByText('Blocking')).toBeNull()
    expect(screen.queryByText('Attention')).toBeNull()
  })

  it('expands a collapsed action group in the inspector', async () => {
    renderRunDetail(DEMO_RUN_ID)
    await waitFor(() => {
      expect(screen.getByText('get_tree ×19')).toBeTruthy()
    })
    expect(screen.queryByText(/#5 get_tree/)).toBeNull()
    act(() => {
      useRunInspectorStore.getState().setExpandedKeys(['group-2'])
    })
    expect(screen.getByText(/#5 get_tree/)).toBeTruthy()
  })

  it('shows DiffSuggestion after expanding a finding with a suggestion', async () => {
    renderRunDetail(DEMO_RUN_ID)
    await waitFor(() => {
      expect(screen.getByText('Critical: unsafe pattern')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('Critical: unsafe pattern'))
    await waitFor(() => {
      expect(screen.getByTestId('diff-suggestion')).toBeTruthy()
    })
    expect(screen.getByText('const SAFE = 2')).toBeTruthy()
  })

  it('shows Warning and Info severity badges on inline findings', async () => {
    renderRunDetail(DEMO_RUN_ID)
    await waitFor(() => {
      expect(screen.getByText('Medium severity sample')).toBeTruthy()
    })
    expect(screen.getAllByText('Warning').length).toBeGreaterThan(0)
    expect(screen.getByText('Docs tone')).toBeTruthy()
    expect(screen.getAllByText('Info').length).toBeGreaterThan(0)
  })

  it('shows an endLine range label for multiline findings', async () => {
    renderRunDetail(DEMO_RUN_ID)
    await waitFor(() => {
      expect(screen.getByText('Multiline range finding')).toBeTruthy()
    })
    const multilineComment = screen
      .getByText('Multiline range finding')
      .closest('[data-testid="inline-comment"]')
    expect(multilineComment).toBeTruthy()
    expect(within(multilineComment as HTMLElement).getByText('L4–5')).toBeTruthy()
  })

  it('switches the diff viewer to split mode', async () => {
    const { container } = renderRunDetail(DEMO_RUN_ID)
    await waitFor(() => {
      expect(container.querySelector('table.diff-unified')).toBeTruthy()
    })
    act(() => {
      useDiffViewerStore.getState().setViewType('split')
    })
    await waitFor(() => {
      expect(container.querySelector('table.diff-split')).toBeTruthy()
    })
  })

  it('shows attention verdict badge from mock run detail', async () => {
    renderRunDetail('11111111-1111-4111-8111-000000000009')
    await waitFor(() => {
      expect(screen.getByText('Attention')).toBeTruthy()
    })
  })

  it('shows clean verdict badge from mock run detail', async () => {
    renderRunDetail('11111111-1111-4111-8111-000000000010')
    await waitFor(() => {
      expect(screen.getByText('Clean')).toBeTruthy()
    })
  })

  it('shows findings outside the loaded diff in a dedicated block', async () => {
    renderRunDetail(DEMO_RUN_ID)
    await waitFor(() => {
      expect(screen.getByTestId('findings-outside-diff')).toBeTruthy()
    })
    expect(screen.getByText('Outside diff')).toBeTruthy()
  })

  it('shows outside-diff findings when /diff returns patch null for that file', async () => {
    const session = mockRunsListPage.items.find((run) => run.id === DEMO_RUN_ID)
    if (!session) {
      throw new Error('demo run missing from mock list')
    }
    withMockTransportOverlay((endpoint) => {
      if (endpoint.path === `/runs/${DEMO_RUN_ID}/diff` && endpoint.method === 'GET') {
        return z.array(RawFileDiffSchema).parse([{ filename: 'docs/huge.md', patch: null }])
      }
      if (endpoint.path === `/runs/${DEMO_RUN_ID}` && endpoint.method === 'GET') {
        return {
          ...buildMockRunDetail(session),
          findings: [
            {
              id: '33333333-3333-4333-8333-000000000020',
              file: 'docs/huge.md',
              oldLine: null,
              newLine: 1,
              endLine: null,
              side: 'RIGHT',
              severity: 'info',
              category: 'readability',
              title: 'Page patchless finding',
              body: 'No inline anchor on run page',
              suggestion: null,
              confidence: 0.5,
              ruleName: null,
            },
          ],
        }
      }
      return undefined
    })

    renderRunDetail(DEMO_RUN_ID)
    await waitFor(() => {
      expect(screen.getByTestId('findings-outside-diff')).toBeTruthy()
    })
    expect(screen.getByText('Page patchless finding')).toBeTruthy()
  })

  it('shows outside-diff findings when the file is missing from /diff', async () => {
    const session = mockRunsListPage.items.find((run) => run.id === DEMO_RUN_ID)
    if (!session) {
      throw new Error('demo run missing from mock list')
    }
    withMockTransportOverlay((endpoint) => {
      if (endpoint.path === `/runs/${DEMO_RUN_ID}/diff` && endpoint.method === 'GET') {
        return z
          .array(RawFileDiffSchema)
          .parse(SAMPLE_PATCHES.map(({ filename, patch }) => ({ filename, patch })))
      }
      if (endpoint.path === `/runs/${DEMO_RUN_ID}` && endpoint.method === 'GET') {
        return {
          ...buildMockRunDetail(session),
          findings: [
            {
              id: '33333333-3333-4333-8333-000000000021',
              file: 'src/not-in-diff.ts',
              oldLine: null,
              newLine: 10,
              endLine: null,
              side: 'RIGHT',
              severity: 'low',
              category: 'correctness',
              title: 'Page missing-file finding',
              body: 'File not in /diff payload',
              suggestion: null,
              confidence: 0.4,
              ruleName: null,
            },
          ],
        }
      }
      return undefined
    })

    renderRunDetail(DEMO_RUN_ID)
    await waitFor(() => {
      expect(screen.getByTestId('findings-outside-diff')).toBeTruthy()
    })
    expect(screen.getByText('Page missing-file finding')).toBeTruthy()
  })

  it('shows a not-found message for an unknown run id', async () => {
    renderRunDetail('00000000-0000-4000-8000-000000000099')
    await waitFor(() => {
      expect(screen.getByTestId('run-detail-run-error')).toBeTruthy()
    })
    expect(screen.getByText('Прогон не найден')).toBeTruthy()
  })

  it('shows the Critical severity badge on inline findings', async () => {
    renderRunDetail(DEMO_RUN_ID)
    await waitFor(() => {
      expect(screen.getByText('Critical: unsafe pattern')).toBeTruthy()
    })
    expect(screen.getAllByText('Critical').length).toBeGreaterThan(0)
  })

  it('invalidates run list after a successful rerun', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    const router = createMemoryRouter([{ path: '/runs/:runId', element: <RunDetailPage /> }], {
      initialEntries: [`/runs/${DEMO_RUN_ID}`],
    })
    render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Перезапустить')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('Перезапустить'))

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: runQueryKeys.list() })
    })
  })

  it('refetches run detail when the cache is invalidated like a live stream event', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const router = createMemoryRouter([{ path: '/runs/:runId', element: <RunDetailPage /> }], {
      initialEntries: [`/runs/${DEMO_RUN_ID}`],
    })
    render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('succeeded')).toBeTruthy()
    })

    const session = mockRunsListPage.items.find((run) => run.id === DEMO_RUN_ID)
    if (!session) {
      throw new Error('demo run missing from mock list')
    }
    session.status = 'running'
    session.finishedAt = null

    await act(async () => {
      await client.invalidateQueries({ queryKey: runQueryKeys.detail(DEMO_RUN_ID) })
    })

    await waitFor(() => {
      expect(screen.getByText('running')).toBeTruthy()
    })
  })

  it('shows a dedicated message when diff loading fails with 404', async () => {
    initMockTransport()
    setMockTransport((endpoint) => {
      const diffMatch = /^\/runs\/([^/]+)\/diff$/.exec(endpoint.path)
      if (diffMatch && endpoint.method === 'GET') {
        throw new ApiError(404, 'Not Found', null)
      }
      if (endpoint.path === '/runs' && endpoint.method === 'GET') {
        return {
          items: [
            {
              id: DEMO_RUN_ID,
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
                title: 'feat: demo',
                url: 'https://github.com/larchanka-training/dmc-268-ui-t6/pull/34',
                headSha: 'abcdef1234567890abcdef1234567890abcdef12',
              },
              actionCount: 10,
              errorCode: null,
            },
          ],
          nextCursor: null,
        }
      }
      const runMatch = /^\/runs\/([^/]+)$/.exec(endpoint.path)
      if (runMatch && endpoint.method === 'GET' && runMatch[1] === DEMO_RUN_ID) {
        return {
          id: DEMO_RUN_ID,
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
            title: 'feat: demo',
            url: 'https://github.com/larchanka-training/dmc-268-ui-t6/pull/34',
            headSha: 'abcdef1234567890abcdef1234567890abcdef12',
          },
          actionCount: 10,
          errorCode: null,
          findings: [],
          summary: null,
          verdict: null,
          severityCounts: null,
          budget: null,
        }
      }
      return undefined
    })

    renderRunDetail(DEMO_RUN_ID)
    await waitFor(() => {
      expect(screen.getByTestId('run-detail-diff-error')).toBeTruthy()
    })
    expect(screen.getByText('Дифф для этого прогона не найден')).toBeTruthy()
    expect(screen.getByTestId('run-detail-page')).toBeTruthy()
    expect(screen.getByText('Перезапустить')).toBeTruthy()
  })
})
