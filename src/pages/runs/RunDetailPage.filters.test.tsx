// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { z } from 'zod'

vi.mock('../../shared/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/config/env')>()
  return {
    ...actual,
    USE_MOCKS: true,
    isMockMode: () => true,
  }
})

import { RawFileDiffSchema } from '../../entities/diff'
import { runQueryKeys, type RunDetail, type RunStatus } from '../../entities/run'
import { mockReviewComments, mockRunSessions, mockSummaryOnlyDiff } from '../../app/mocks/app-state'
import {
  buildMockRunDetail,
  mockRawDiffForRun,
  mockReviewFindings,
  REVIEW_ATTENTION_RUN_ID,
} from '../../app/mocks/mockRunReview'
import { initMockTransport, withMockTransportOverlay } from '../../app/mocks/mockTransport'
import { SAMPLE_PATCHES } from '../../shared/fixtures/sample.patch'
import { DEMO_RUN_ID } from '../../shared/config/demoRun'
import { setAccessToken, setMockTransport } from '../../shared/api/client'
import { useAuthStore } from '../../features/auth'
import { useDiffViewerStore } from '../../widgets/diff-viewer'
import { useRunInspectorStore } from '../../widgets/run-inspector'
import { stubResponsiveSelectLayout } from '../../test/responsiveSelectLayout'
import { RunDetailPage } from './RunDetailPage'

// Demo run (hand-counted from the mocks): 8 findings + 3 published comments with distinct ids,
// so the merged displayed set is 11. By badge group: Critical 3 (critical + 2 high), Warning 6
// (3 medium + 1 low finding, 1 medium + 1 low comment), Info 2 (1 finding + 1 comment).
// By file: src/a.ts 8, README.md 2, src/utils/retry.ts 1; app/notify.py and package.json 0.
const DEMO = `/runs/${DEMO_RUN_ID}`
const TOTAL = 11

function renderRunDetail(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter([{ path: '/runs/:runId', element: <RunDetailPage /> }], {
    initialEntries: [path],
  })
  const view = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { client, router, ...view }
}

function runWithStatus(status: RunStatus): RunDetail {
  const session = mockRunSessions.find((run) => run.id === DEMO_RUN_ID)
  if (session === undefined) {
    throw new Error('demo session is missing')
  }
  return {
    ...buildMockRunDetail(session),
    status,
    finishedAt: null,
    findings: [],
    verdict: null,
    summary: null,
    severityCounts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
  }
}

async function findBar(): Promise<HTMLElement> {
  return screen.findByTestId('finding-filters-bar')
}

function counter(shown: number, total: number): string {
  return `Показано ${String(shown)} из ${String(total)} замечаний`
}

function cardTitles(): string[] {
  return screen
    .queryAllByTestId('inline-comment')
    .map((card) => card.querySelector('[aria-expanded] strong')?.textContent ?? '')
    .sort()
}

function searchInput(): HTMLInputElement {
  return screen.getByRole('textbox', { name: 'Поиск по замечаниям' })
}

/** The chips of a select, without the hidden «+ N ...» chip of `maxTagCount="responsive"`. */
function selectedTags(name: string): string[] {
  const selector = screen.getByRole('combobox', { name }).closest('.ant-select')
  return [
    ...(selector?.querySelectorAll(
      '.ant-select-content-item:not(.ant-select-content-item-rest) .ant-select-selection-item',
    ) ?? []),
  ].map((tag) => tag.textContent)
}

function pick(name: string, optionText: string): void {
  fireEvent.mouseDown(screen.getByRole('combobox', { name }))
  const option = [...document.querySelectorAll('.ant-select-item-option')].find(
    (candidate) => candidate.textContent === optionText,
  )
  if (option === undefined) {
    throw new Error(`option "${optionText}" is not rendered`)
  }
  fireEvent.click(option)
}

async function back(router: ReturnType<typeof renderRunDetail>['router']): Promise<void> {
  await act(async () => {
    await router.navigate(-1)
  })
}

describe('RunDetailPage filters in the URL', () => {
  beforeEach(() => {
    initMockTransport()
    setAccessToken('mock_jwt_token_skvertl_dmc')
    useAuthStore.setState({
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: null,
    })
    useDiffViewerStore.setState({ viewType: 'unified' })
    useRunInspectorStore.setState({ expandedKeys: [] })
    stubResponsiveSelectLayout()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    setAccessToken(null)
    setMockTransport(null)
  })

  it.each(
    (['queued', 'running', 'publishing'] as const).flatMap((status) =>
      ['?severity=critical', '?q=unmatched'].map((query) => ({ status, query })),
    ),
  )('retains the diff and $query while $status has no findings yet', async ({ status, query }) => {
    withMockTransportOverlay((endpoint) => {
      if (endpoint.method === 'GET' && endpoint.path === `/runs/${DEMO_RUN_ID}`) {
        return runWithStatus(status)
      }
      if (endpoint.method === 'GET' && endpoint.path === `/runs/${DEMO_RUN_ID}/comments`) {
        return []
      }
      return undefined
    })
    const initial = query
    const { client, container, router } = renderRunDetail(`${DEMO}${initial}`)

    await findBar()
    await waitFor(() => {
      expect(client.getQueryState(runQueryKeys.comments(DEMO_RUN_ID))?.status).toBe('success')
    })
    expect(container.querySelectorAll('.diff-theme')).toHaveLength(4)
    expect(screen.getByRole('status').textContent).toBe(
      'Замечания появятся после завершения прогона',
    )
    expect(screen.queryByText(counter(0, 0))).toBeNull()
    expect(screen.queryByTestId('findings-filter-empty')).toBeNull()
    expect(selectedTags('Критичность')).toEqual(query.includes('severity') ? ['Critical'] : [])
    expect(searchInput().value).toBe(query.includes('q=') ? 'unmatched' : '')
    expect(router.state.location.search).toBe(initial)
  })

  it('keeps an effective file filter during pending even without any content match', async () => {
    withMockTransportOverlay((endpoint) => {
      if (endpoint.method === 'GET' && endpoint.path === `/runs/${DEMO_RUN_ID}`) {
        return runWithStatus('running')
      }
      if (endpoint.method === 'GET' && endpoint.path === `/runs/${DEMO_RUN_ID}/comments`) {
        return []
      }
      return undefined
    })
    const initial = '?file=README.md&severity=critical&q=unmatched'
    const { client, container, router } = renderRunDetail(`${DEMO}${initial}`)

    await findBar()
    await waitFor(() => {
      expect(client.getQueryState(runQueryKeys.comments(DEMO_RUN_ID))?.status).toBe('success')
    })
    expect(container.querySelectorAll('.diff-theme')).toHaveLength(1)
    expect(container.querySelector('.diff-theme strong')?.textContent).toBe('README.md')
    expect(screen.queryByText('src/a.ts')).toBeNull()
    expect(selectedTags('Файлы')).toEqual(['README.md'])
    expect(screen.queryByTestId('findings-filter-empty')).toBeNull()
    expect(router.state.location.search).toBe(initial)
  })

  it.each([
    { query: '?severity=critical', shown: 3, files: 1 },
    { query: '?q=unmatched', shown: 0, files: 0 },
  ])(
    'applies $query without navigation when the same run succeeds',
    async ({ query, shown, files }) => {
      let run = runWithStatus('running')
      withMockTransportOverlay((endpoint) => {
        if (endpoint.method === 'GET' && endpoint.path === `/runs/${DEMO_RUN_ID}`) {
          return run
        }
        if (endpoint.method === 'GET' && endpoint.path === `/runs/${DEMO_RUN_ID}/comments`) {
          return []
        }
        return undefined
      })
      const { client, container, router } = renderRunDetail(`${DEMO}${query}`)
      await findBar()
      await screen.findByText('Замечания появятся после завершения прогона')
      await waitFor(() => {
        expect(client.getQueryState(runQueryKeys.comments(DEMO_RUN_ID))?.status).toBe('success')
      })
      expect(container.querySelectorAll('.diff-theme')).toHaveLength(4)

      run = { ...run, status: 'succeeded', findings: mockReviewFindings }
      await act(async () => {
        await client.invalidateQueries({ queryKey: runQueryKeys.detail(DEMO_RUN_ID), exact: true })
      })

      await screen.findByText(counter(shown, 8))
      expect(screen.queryByText('Замечания появятся после завершения прогона')).toBeNull()
      expect(container.querySelectorAll('.diff-theme')).toHaveLength(files)
      expect(screen.queryByTestId('findings-filter-empty') !== null).toBe(shown === 0)
      expect(router.state.location.search).toBe(query)
    },
  )

  it('shows empty filters and every finding for a URL without filter params', async () => {
    const { router } = renderRunDetail(DEMO)

    await findBar()
    await screen.findByText('Critical: unsafe pattern')
    expect(screen.getByText(counter(TOTAL, TOTAL))).toBeTruthy()
    expect(searchInput().value).toBe('')
    expect(selectedTags('Файлы')).toEqual([])
    expect(selectedTags('Критичность')).toEqual([])
    expect(router.state.location.search).toBe('')
  })

  it('applies ?severity=critical&q=… on load, as a reload or a new tab would', async () => {
    renderRunDetail(`${DEMO}?severity=critical&q=unsafe`)

    await findBar()
    await screen.findByText('Critical: unsafe pattern')
    expect(screen.getByText(counter(1, TOTAL))).toBeTruthy()
    expect(cardTitles()).toEqual(['Critical: unsafe pattern'])
    expect(searchInput().value).toBe('unsafe')
    expect(selectedTags('Критичность')).toEqual(['Critical'])
    // the search expands the card
    expect(screen.getByText('Replace with a safe alternative.')).toBeTruthy()
  })

  it('applies a file filter from the URL: only that file is shown', async () => {
    renderRunDetail(`${DEMO}?file=src%2Futils%2Fretry.ts`)

    await findBar()
    await screen.findByText('Retry without backoff')
    expect(screen.getByText(counter(1, TOTAL))).toBeTruthy()
    expect(cardTitles()).toEqual(['Retry without backoff'])
    expect(selectedTags('Файлы')).toEqual(['retry.ts'])
    expect(screen.queryByText('Docs tone')).toBeNull()
  })

  it('renders a garbage URL as unfiltered and leaves the URL alone until the user acts', async () => {
    const garbage = `?tab=x&severity=bogus&severity=high&file=&q=${'x'.repeat(250)}`
    const { router } = renderRunDetail(`${DEMO}${garbage}`)

    await findBar()
    expect(router.state.location.search).toBe(garbage)
    // severity is dropped, the empty file is dropped, q is cut to 200 chars: nothing contains xxx…
    expect(searchInput().value).toBe('x'.repeat(200))
    expect(selectedTags('Критичность')).toEqual([])
    expect(selectedTags('Файлы')).toEqual([])
  })

  it('does not crash on malformed percent-encoding in the filter params', async () => {
    renderRunDetail(`${DEMO}?file=%&severity=%E0%A4%A&q=%E0%A4%A`)

    // the bar and the page render; the broken severity is dropped, the rest is just odd text
    await findBar()
    expect(screen.getByTestId('run-detail-page')).toBeTruthy()
    expect(selectedTags('Критичность')).toEqual([])
  })

  it('drops the garbage from the URL at the first change and keeps other params', async () => {
    const { router } = renderRunDetail(`${DEMO}?tab=x&severity=bogus&file=&severity=info`)

    await findBar()
    expect(selectedTags('Критичность')).toEqual(['Info'])
    pick('Критичность', 'Critical')

    await waitFor(() => {
      expect(new URLSearchParams(router.state.location.search).getAll('severity')).toEqual([
        'critical',
        'info',
      ])
    })
    const params = new URLSearchParams(router.state.location.search)
    expect(params.get('tab')).toBe('x')
    expect(params.has('file')).toBe(false)
  })

  it('keeps file= of a file that is not loaded yet while /diff loads and after it', async () => {
    const release: { open: () => void } = { open: () => undefined }
    const gate = new Promise<void>((resolve) => {
      release.open = resolve
    })
    withMockTransportOverlay((endpoint) => {
      if (endpoint.path === `/runs/${DEMO_RUN_ID}/diff` && endpoint.method === 'GET') {
        return gate.then(() =>
          z.array(RawFileDiffSchema).parse(
            mockRawDiffForRun(
              DEMO_RUN_ID,
              SAMPLE_PATCHES.map(({ filename, patch }) => ({ filename, patch })),
              mockSummaryOnlyDiff,
            ),
          ),
        )
      }
      return undefined
    })
    const initial = '?file=src%2Futils%2Fretry.ts'
    const { router } = renderRunDetail(`${DEMO}${initial}`)

    await screen.findByTestId('run-detail-page')
    await screen.findByText('Прогон PR #', { exact: false })
    // /diff is pending: no diff, no bar yet, and the URL is untouched
    expect(screen.queryByTestId('finding-filters-bar')).toBeNull()
    expect(router.state.location.search).toBe(initial)

    release.open()
    await findBar()
    await screen.findByText('Retry without backoff')
    expect(router.state.location.search).toBe(initial)
    expect(cardTitles()).toEqual(['Retry without backoff'])
    expect(selectedTags('Файлы')).toEqual(['retry.ts'])
  })

  it('keeps file= of a file the run does not have in the URL and hides nothing', async () => {
    const initial = '?file=gone.ts'
    const { container, router } = renderRunDetail(`${DEMO}${initial}`)

    await findBar()
    await screen.findByText('Critical: unsafe pattern')
    expect(container.querySelectorAll('.diff-theme')).toHaveLength(4)
    expect(router.state.location.search).toBe(initial)
    expect(screen.getByText(counter(TOTAL, TOTAL))).toBeTruthy()
    expect(selectedTags('Файлы')).toEqual([])
    expect(screen.getByRole('button', { name: 'Сбросить фильтры' })).toHaveProperty(
      'disabled',
      true,
    )
  })

  it('selects and applies only known files in a mixed URL without rewriting it', async () => {
    const initial = '?file=gone.ts&file=README.md'
    const { container, router } = renderRunDetail(`${DEMO}${initial}`)

    await findBar()
    await screen.findByText(counter(2, TOTAL))
    expect(selectedTags('Файлы')).toEqual(['README.md'])
    expect(container.querySelectorAll('.diff-theme')).toHaveLength(1)
    expect(cardTitles()).toEqual(['Docs tone', 'Docs tone inconsistency'])
    expect(screen.getByRole('button', { name: 'Сбросить фильтры' })).toHaveProperty(
      'disabled',
      false,
    )
    expect(router.state.location.search).toBe(initial)
  })

  it.each([
    { action: 'add', files: ['README.md', 'src/a.ts', 'gone.ts'], tags: ['README.md', 'a.ts'] },
    { action: 'clear', files: ['gone.ts'], tags: [] },
    { action: 'severity', files: ['gone.ts', 'README.md'], tags: ['README.md'] },
  ])(
    'preserves unknown file params on a mixed URL when selecting $action',
    async ({ action, files, tags }) => {
      const { router } = renderRunDetail(`${DEMO}?tab=x&file=gone.ts&file=README.md`)
      await findBar()
      await screen.findByText(counter(2, TOTAL))

      if (action === 'add') {
        pick('Файлы', 'src/a.ts (8)')
      } else if (action === 'clear') {
        fireEvent.click(screen.getByRole('button', { name: 'Очистить выбор файлов' }))
      } else {
        pick('Критичность', 'Critical')
      }

      await waitFor(() => {
        const params = new URLSearchParams(router.state.location.search)
        expect(params.getAll('file')).toEqual(files)
        expect(params.getAll('severity')).toEqual(action === 'severity' ? ['critical'] : [])
        expect(params.get('tab')).toBe('x')
        expect(selectedTags('Файлы')).toEqual(tags)
      })
      if (action === 'clear') {
        expect(screen.getByRole('button', { name: 'Сбросить фильтры' })).toHaveProperty(
          'disabled',
          true,
        )
        expect(screen.getByText(counter(TOTAL, TOTAL))).toBeTruthy()
      }
    },
  )

  it('retains an unknown selected file through file changes until a finding makes it known', async () => {
    let run = runWithStatus('running')
    withMockTransportOverlay((endpoint) => {
      if (endpoint.method === 'GET' && endpoint.path === `/runs/${DEMO_RUN_ID}`) {
        return run
      }
      if (endpoint.method === 'GET' && endpoint.path === `/runs/${DEMO_RUN_ID}/comments`) {
        return []
      }
      return undefined
    })
    const { client, router } = renderRunDetail(`${DEMO}?file=later.ts&file=README.md`)
    await findBar()
    await waitFor(() => {
      expect(client.getQueryState(runQueryKeys.comments(DEMO_RUN_ID))?.status).toBe('success')
    })
    expect(selectedTags('Файлы')).toEqual(['README.md'])
    pick('Файлы', 'src/a.ts (0)')
    await waitFor(() => {
      expect(router.state.location.search).toBe('?file=README.md&file=src%2Fa.ts&file=later.ts')
    })
    pick('Критичность', 'Critical')
    await waitFor(() => {
      expect(router.state.location.search).toBe(
        '?file=README.md&file=src%2Fa.ts&file=later.ts&severity=critical',
      )
    })

    const finding = mockReviewFindings[0]
    if (finding === undefined) {
      throw new Error('demo finding is missing')
    }
    run = {
      ...run,
      status: 'succeeded',
      findings: [{ ...finding, file: 'later.ts', title: 'Late finding outside diff' }],
    }
    await act(async () => {
      await client.invalidateQueries({ queryKey: runQueryKeys.detail(DEMO_RUN_ID), exact: true })
    })

    await screen.findByText('Late finding outside diff')
    expect(selectedTags('Файлы')).toEqual(['README.md', 'a.ts', 'later.ts'])
    expect(screen.getByText(counter(1, 1))).toBeTruthy()
    expect(router.state.location.search).toBe(
      '?file=README.md&file=src%2Fa.ts&file=later.ts&severity=critical',
    )
  })

  it('recovers a pending comment-only file into chips while preserving unknown URL files', async () => {
    let run = runWithStatus('running')
    const firstComment = mockReviewComments[0]
    if (firstComment === undefined) {
      throw new Error('demo comment is missing')
    }
    const comment = {
      ...firstComment,
      file: 'src/later.ts',
      severity: 'high',
      title: 'Recovered comment outside diff',
      body: 'Recovered comment body',
    }
    const release: { open: () => void } = { open: () => undefined }
    const gate = new Promise<void>((resolve) => {
      release.open = resolve
    })
    withMockTransportOverlay((endpoint) => {
      if (endpoint.method === 'GET' && endpoint.path === `/runs/${DEMO_RUN_ID}`) {
        return run
      }
      if (endpoint.method === 'GET' && endpoint.path === `/runs/${DEMO_RUN_ID}/comments`) {
        return gate.then(() => [comment])
      }
      return undefined
    })
    const initial = '?tab=x&file=src%2Flater.ts&file=gone.ts&severity=critical&q=recovered'
    const { client, container, router } = renderRunDetail(`${DEMO}${initial}`)

    await findBar()
    expect(container.querySelectorAll('.diff-theme')).toHaveLength(4)
    expect(selectedTags('Файлы')).toEqual([])
    expect(screen.getByRole('status').textContent).toBe(
      'Замечания появятся после завершения прогона',
    )
    expect(screen.queryByTestId('findings-filter-empty')).toBeNull()
    expect(router.state.location.search).toBe(initial)

    pick('Файлы', 'README.md (0)')
    await waitFor(() => {
      const params = new URLSearchParams(router.state.location.search)
      expect(params.getAll('file')).toEqual(['README.md', 'src/later.ts', 'gone.ts'])
      expect(selectedTags('Файлы')).toEqual(['README.md'])
    })
    const selectedUrl = router.state.location.search
    expect(container.querySelectorAll('.diff-theme')).toHaveLength(1)

    release.open()
    await screen.findByText('Recovered comment outside diff')
    await waitFor(() => {
      expect(selectedTags('Файлы')).toEqual(['README.md', 'later.ts'])
    })
    expect(cardTitles()).toEqual(['Recovered comment outside diff'])
    expect(screen.getByText('Recovered comment body')).toBeTruthy()
    expect(container.querySelectorAll('.diff-theme')).toHaveLength(1)
    expect(screen.getByRole('status').textContent).toBe(
      'Замечания появятся после завершения прогона',
    )
    expect(router.state.location.search).toBe(selectedUrl)

    run = { ...run, status: 'succeeded' }
    await act(async () => {
      await client.invalidateQueries({ queryKey: runQueryKeys.detail(DEMO_RUN_ID), exact: true })
    })

    await screen.findByText(counter(1, 1))
    expect(container.querySelectorAll('.diff-theme')).toHaveLength(0)
    expect(cardTitles()).toEqual(['Recovered comment outside diff'])
    expect(selectedTags('Файлы')).toEqual(['README.md', 'later.ts'])
    expect(router.state.location.search).toBe(selectedUrl)

    fireEvent.click(screen.getByRole('button', { name: 'Очистить выбор файлов' }))
    await waitFor(() => {
      expect(new URLSearchParams(router.state.location.search).getAll('file')).toEqual(['gone.ts'])
      expect(selectedTags('Файлы')).toEqual([])
    })
    expect(screen.getByText(counter(1, 1))).toBeTruthy()
  })

  it('writes a file selection to the URL as a repeatable file param', async () => {
    const { router } = renderRunDetail(DEMO)

    await findBar()
    await screen.findByText('Critical: unsafe pattern')
    pick('Файлы', 'src/a.ts (8)')
    pick('Файлы', 'README.md (2)')

    await waitFor(() => {
      expect(router.state.location.search).toBe('?file=src%2Fa.ts&file=README.md')
    })
    expect(screen.getByText(counter(10, TOTAL))).toBeTruthy()
  })

  it('pushes a select change: back restores the previous filters', async () => {
    const { router } = renderRunDetail(`${DEMO}?severity=critical`)

    await findBar()
    await screen.findByText('Critical: unsafe pattern')
    expect(screen.getByText(counter(3, TOTAL))).toBeTruthy()

    pick('Критичность', 'Warning')
    await waitFor(() => {
      expect(router.state.location.search).toBe('?severity=critical&severity=warning')
    })
    expect(router.state.historyAction).toBe('PUSH')
    expect(screen.getByText(counter(9, TOTAL))).toBeTruthy()

    await back(router)
    await waitFor(() => {
      expect(screen.getByText(counter(3, TOTAL))).toBeTruthy()
    })
    expect(router.state.location.search).toBe('?severity=critical')
    expect(selectedTags('Критичность')).toEqual(['Critical'])
  })

  it('replaces the entry while typing: one back skips the typed characters', async () => {
    const { router } = renderRunDetail(DEMO)

    await findBar()
    await screen.findByText('Critical: unsafe pattern')
    pick('Критичность', 'Critical')
    await waitFor(() => {
      expect(router.state.location.search).toBe('?severity=critical')
    })

    fireEvent.change(searchInput(), { target: { value: 'u' } })
    await waitFor(() => {
      expect(router.state.location.search).toBe('?severity=critical&q=u')
    })
    expect(router.state.historyAction).toBe('REPLACE')
    fireEvent.change(searchInput(), { target: { value: 'unsafe' } })
    await waitFor(() => {
      expect(router.state.location.search).toBe('?severity=critical&q=unsafe')
    })
    expect(router.state.historyAction).toBe('REPLACE')
    // the write comes from the debounce timer, outside act: the page follows the router a moment later
    await screen.findByText(counter(1, TOTAL))

    // the select pushed one entry, typing replaced it: back leaves the page without a query
    await back(router)
    await waitFor(() => {
      expect(router.state.location.search).toBe('')
    })
    expect(screen.getByText(counter(TOTAL, TOTAL))).toBeTruthy()
    expect(searchInput().value).toBe('')
  })

  it('shows empty filters after navigating to another run without a query', async () => {
    const { router } = renderRunDetail(`${DEMO}?severity=critical&q=unsafe`)

    await findBar()
    await screen.findByText('Critical: unsafe pattern')
    expect(screen.getByText(counter(1, TOTAL))).toBeTruthy()

    await act(async () => {
      await router.navigate(`/runs/${REVIEW_ATTENTION_RUN_ID}`)
    })

    // that run has no findings, only the 3 published comments
    await waitFor(() => {
      expect(screen.getByText(counter(3, 3))).toBeTruthy()
    })
    expect(router.state.location.search).toBe('')
    expect(searchInput().value).toBe('')
    expect(selectedTags('Критичность')).toEqual([])
    expect(selectedTags('Файлы')).toEqual([])
  })

  it('reset clears the filter params, keeps the others, and pushes', async () => {
    const { router } = renderRunDetail(
      `${DEMO}?tab=x&file=gone.ts&file=src%2Fa.ts&severity=critical&q=unsafe`,
    )

    await findBar()
    await screen.findByText('Critical: unsafe pattern')
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить фильтры', hidden: false }))

    await waitFor(() => {
      expect(router.state.location.search).toBe('?tab=x')
    })
    expect(router.state.historyAction).toBe('PUSH')
    expect(screen.getByText(counter(TOTAL, TOTAL))).toBeTruthy()
    expect(searchInput().value).toBe('')

    await back(router)
    await waitFor(() => {
      expect(screen.getByText(counter(1, TOTAL))).toBeTruthy()
    })
  })

  it('reset on a URL with only filter params leaves a clean URL', async () => {
    const { router } = renderRunDetail(`${DEMO}?severity=critical`)

    await findBar()
    await screen.findByText('Critical: unsafe pattern')
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить фильтры' }))

    await waitFor(() => {
      expect(router.state.location.search).toBe('')
    })
    expect(router.state.location.pathname).toBe(DEMO)
  })

  it('does not flash the empty message for a query that only a comment matches while /comments loads', async () => {
    const release: { open: () => void } = { open: () => undefined }
    const gate = new Promise<void>((resolve) => {
      release.open = resolve
    })
    withMockTransportOverlay((endpoint) => {
      if (endpoint.path === `/runs/${DEMO_RUN_ID}/comments` && endpoint.method === 'GET') {
        return gate.then(() => mockReviewComments.map((comment) => ({ ...comment })))
      }
      return undefined
    })
    renderRunDetail(`${DEMO}?q=inconsistency`)

    // /diff is in, /comments is not: 8 findings, none matches, and still no message
    await findBar()
    await screen.findByText(counter(0, 8))
    expect(screen.queryByTestId('findings-filter-empty')).toBeNull()

    release.open()
    await screen.findByText(counter(1, TOTAL))
    expect(screen.queryByTestId('findings-filter-empty')).toBeNull()
    expect(cardTitles()).toEqual(['Docs tone inconsistency'])
  })
})
