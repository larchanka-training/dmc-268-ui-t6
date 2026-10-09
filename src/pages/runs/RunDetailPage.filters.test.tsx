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
import { mockSummaryOnlyDiff } from '../../app/mocks/app-state'
import { mockRawDiffForRun, REVIEW_ATTENTION_RUN_ID } from '../../app/mocks/mockRunReview'
import { initMockTransport, withMockTransportOverlay } from '../../app/mocks/mockTransport'
import { SAMPLE_PATCHES } from '../../shared/fixtures/sample.patch'
import { DEMO_RUN_ID } from '../../shared/config/demoRun'
import { setAccessToken, setMockTransport } from '../../shared/api/client'
import { useAuthStore } from '../../features/auth'
import { useDiffViewerStore } from '../../widgets/diff-viewer'
import { useRunInspectorStore } from '../../widgets/run-inspector'
import { RunDetailPage } from './RunDetailPage'

// Demo run (hand-counted from the mocks): 8 findings + 3 published comments, all on files with a
// diff, so the displayed set is 11. By badge group: Critical 3 (critical + 2 high), Warning 6
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
  return { router, ...view }
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
    .map((card) => card.querySelector('.inline-comment-header strong')?.textContent ?? '')
    .sort()
}

function searchInput(): HTMLInputElement {
  return screen.getByPlaceholderText('Поиск по замечаниям')
}

function selectedTags(name: string): string[] {
  const selector = screen.getByRole('combobox', { name }).closest('.ant-select')
  return [...(selector?.querySelectorAll('.ant-select-selection-item') ?? [])].map(
    (tag) => tag.textContent,
  )
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
    useDiffViewerStore.setState({ viewType: 'unified', selectedFile: null })
    useRunInspectorStore.setState({ expandedKeys: [], selectedActionIndex: null })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    setAccessToken(null)
    setMockTransport(null)
  })

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
    expect(selectedTags('Файлы')).toEqual(['src/utils/retry.ts'])
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
  })

  it('keeps file= of a file the run does not have in the URL and hides nothing', async () => {
    const initial = '?file=gone.ts'
    const { router } = renderRunDetail(`${DEMO}${initial}`)

    await findBar()
    await screen.findByText('Critical: unsafe pattern')
    expect(router.state.location.search).toBe(initial)
    expect(screen.getByText(counter(TOTAL, TOTAL))).toBeTruthy()
    expect(selectedTags('Файлы')).toEqual(['gone.ts'])
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
    expect(screen.getByText(counter(1, TOTAL))).toBeTruthy()

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
    const { router } = renderRunDetail(`${DEMO}?tab=x&file=src%2Fa.ts&severity=critical&q=unsafe`)

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
})
