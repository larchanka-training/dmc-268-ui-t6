// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter } from 'react-router'
// The router component of the app (`src/App.tsx`): it commits router state in `startTransition`,
// which `RouterProvider` from `react-router` (used by the other page tests) does not.
import { RouterProvider } from 'react-router/dom'

vi.mock('../../shared/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/config/env')>()
  return {
    ...actual,
    USE_MOCKS: true,
    isMockMode: () => true,
  }
})

import { REVIEW_ATTENTION_RUN_ID } from '../../app/mocks/mockRunReview'
import { initMockTransport } from '../../app/mocks/mockTransport'
import { DEMO_RUN_ID } from '../../shared/config/demoRun'
import { setAccessToken, setMockTransport } from '../../shared/api/client'
import { useAuthStore } from '../../features/auth'
import { useDiffViewerStore } from '../../widgets/diff-viewer'
import { useRunInspectorStore } from '../../widgets/run-inspector'
import { RunDetailPage } from './RunDetailPage'

const DEMO = `/runs/${DEMO_RUN_ID}`

function renderApp(path: string) {
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

type Router = ReturnType<typeof renderApp>['router']

async function ready(): Promise<HTMLInputElement> {
  await screen.findByTestId('finding-filters-bar')
  // 8 findings + 3 comments of the demo run: wait until /comments has landed too
  await screen.findByText(/ из 11 замечаний$/)
  return searchInput()
}

function searchInput(): HTMLInputElement {
  return screen.getByPlaceholderText('Поиск по замечаниям')
}

/**
 * One keystroke as a browser delivers it: the text goes into the *current* DOM value at the caret and
 * a native `input` event follows, with no `act` and no waiting for React in between.
 */
function keystroke(input: HTMLInputElement, text: string): void {
  const start = input.selectionStart ?? input.value.length
  const end = input.selectionEnd ?? input.value.length
  input.setRangeText(text, start, end, 'end')
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function pickSeverity(optionText: string): void {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Критичность' }))
  const option = [...document.querySelectorAll('.ant-select-item-option')].find(
    (candidate) => candidate.textContent === optionText,
  )
  if (option === undefined) {
    throw new Error(`option "${optionText}" is not rendered`)
  }
  fireEvent.click(option)
}

async function back(router: Router): Promise<void> {
  await act(async () => {
    await router.navigate(-1)
  })
}

async function forward(router: Router): Promise<void> {
  await act(async () => {
    await router.navigate(1)
  })
}

/** The click of a select option as a native event: the navigation starts, React has not committed it yet. */
function pickSeverityNative(optionText: string): void {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Критичность' }))
  const option = [...document.querySelectorAll('.ant-select-item-option')].find(
    (candidate) => candidate.textContent === optionText,
  )
  if (option === undefined) {
    throw new Error(`option "${optionText}" is not rendered`)
  }
  option.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

describe('RunDetailPage search box on the app router', () => {
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

  it('keeps both characters of two keystrokes dispatched back to back, then writes q once', async () => {
    const { router } = renderApp(DEMO)
    const input = await ready()

    keystroke(input, 'a')
    keystroke(input, 'b')
    expect(input.value).toBe('ab')

    await waitFor(() => {
      expect(router.state.location.search).toBe('?q=ab')
    })
    expect(input.value).toBe('ab')
    expect(router.state.historyAction).toBe('REPLACE')
  })

  it('does not touch the URL before the debounce has passed', async () => {
    const { router } = renderApp(DEMO)
    const input = await ready()

    keystroke(input, 'a')
    keystroke(input, 'b')
    keystroke(input, 'c')
    await pause(100)
    expect(input.value).toBe('abc')
    expect(router.state.location.search).toBe('')

    await waitFor(() => {
      expect(router.state.location.search).toBe('?q=abc')
    })
  })

  it('keeps the caret of an insert in the middle of the text', async () => {
    const { router } = renderApp(`${DEMO}?q=abc`)
    const input = await ready()
    expect(input.value).toBe('abc')

    input.setSelectionRange(1, 1)
    keystroke(input, 'x')

    expect(input.value).toBe('axbc')
    expect(input.selectionStart).toBe(2)
    await waitFor(() => {
      expect(router.state.location.search).toBe('?q=axbc')
    })
    expect(input.value).toBe('axbc')
    expect(input.selectionStart).toBe(2)
  })

  it('shows the previous text again when the user goes back after typing', async () => {
    const { router } = renderApp(`${DEMO}?q=old`)
    const input = await ready()

    // a select pushes an entry, typing then replaces its q
    pickSeverity('Critical')
    await waitFor(() => {
      expect(router.state.location.search).toBe('?severity=critical&q=old')
    })
    input.setSelectionRange(input.value.length, input.value.length)
    keystroke(input, ' more')
    await waitFor(() => {
      expect(router.state.location.search).toBe('?severity=critical&q=old+more')
    })
    expect(input.value).toBe('old more')

    await back(router)

    await waitFor(() => {
      expect(searchInput().value).toBe('old')
    })
    expect(router.state.location.search).toBe('?q=old')
  })

  it('is not overwritten when the URL catches up with an earlier part of what was typed', async () => {
    const { router } = renderApp(DEMO)
    const input = await ready()

    keystroke(input, 'a')
    await waitFor(() => {
      expect(router.state.location.search).toBe('?q=a')
    })
    keystroke(input, 'b')
    keystroke(input, 'c')
    expect(input.value).toBe('abc')

    await waitFor(() => {
      expect(router.state.location.search).toBe('?q=abc')
    })
    expect(input.value).toBe('abc')
  })

  it('clears the text and writes q away when the input is cleared', async () => {
    const { router } = renderApp(`${DEMO}?severity=critical&q=unsafe`)
    await ready()

    const clearIcon = document.querySelector('.ant-input-clear-icon')
    expect(clearIcon).not.toBeNull()
    if (clearIcon !== null) {
      fireEvent.click(clearIcon)
    }

    expect(searchInput().value).toBe('')
    await waitFor(() => {
      expect(router.state.location.search).toBe('?severity=critical')
    })
  })

  it('reset clears the text, also when it was typed a moment ago, and no late write follows', async () => {
    const { router } = renderApp(DEMO)
    const input = await ready()

    keystroke(input, 'u')
    keystroke(input, 'n')
    expect(input.value).toBe('un')
    fireEvent.click(screen.getByRole('button', { name: 'Сбросить фильтры' }))

    expect(searchInput().value).toBe('')
    await pause(400)
    expect(router.state.location.search).toBe('')
    expect(searchInput().value).toBe('')
    expect(screen.getByText('Показано 11 из 11 замечаний')).toBeTruthy()
  })

  it('reset clears the text that came from the URL', async () => {
    const { router } = renderApp(`${DEMO}?q=unsafe`)
    await ready()
    expect(searchInput().value).toBe('unsafe')

    fireEvent.click(screen.getByRole('button', { name: 'Сбросить фильтры' }))

    await waitFor(() => {
      expect(router.state.location.search).toBe('')
    })
    expect(searchInput().value).toBe('')
  })

  it('a severity change during a pending write keeps both the typed text and the severity', async () => {
    const { router } = renderApp(DEMO)
    const input = await ready()

    keystroke(input, 'a')
    keystroke(input, 'b')
    keystroke(input, 'c')
    pickSeverity('Warning')

    expect(searchInput().value).toBe('abc')
    await waitFor(() => {
      expect(router.state.location.search).toBe('?severity=warning&q=abc')
    })
    expect(router.state.historyAction).toBe('PUSH')
    // the cancelled debounce must not write again, with stale filters or at all
    await pause(400)
    expect(router.state.location.search).toBe('?severity=warning&q=abc')
    expect(searchInput().value).toBe('abc')
  })

  // The uncommitted window itself (a write built before a slow commit lands) needs a slow render;
  // it is covered by the hook test in useFindingFiltersParams.test.tsx. This one checks the outcome.
  it('typing right after a severity change ends with both in the URL', async () => {
    const { router } = renderApp(DEMO)
    const input = await ready()

    pickSeverity('Critical')
    keystroke(input, 'u')
    keystroke(input, 'n')

    await waitFor(() => {
      expect(router.state.location.search).toBe('?severity=critical&q=un')
    })
    expect(searchInput().value).toBe('un')
  })

  it('typing, then back onto an entry that differs only by a select: its text, nothing written', async () => {
    const { router } = renderApp(`${DEMO}?q=old`)
    const input = await ready()
    pickSeverity('Critical')
    await waitFor(() => {
      expect(router.state.location.search).toBe('?severity=critical&q=old')
    })

    input.setSelectionRange(input.value.length, input.value.length)
    keystroke(input, ' more')
    expect(input.value).toBe('old more')
    await back(router)

    await waitFor(() => {
      expect(searchInput().value).toBe('old')
    })
    await pause(400)
    expect(router.state.location.search).toBe('?q=old')
    expect(searchInput().value).toBe('old')
  })

  it('typing, then forward onto an entry that differs only by a select: its text, nothing written', async () => {
    const { router } = renderApp(`${DEMO}?q=old`)
    const input = await ready()
    pickSeverity('Critical')
    await waitFor(() => {
      expect(router.state.location.search).toBe('?severity=critical&q=old')
    })
    await back(router)
    await waitFor(() => {
      expect(router.state.location.search).toBe('?q=old')
    })

    input.setSelectionRange(input.value.length, input.value.length)
    keystroke(input, ' more')
    expect(input.value).toBe('old more')
    await forward(router)

    await waitFor(() => {
      expect(router.state.location.search).toBe('?severity=critical&q=old')
    })
    await waitFor(() => {
      expect(searchInput().value).toBe('old')
    })
    await pause(400)
    expect(router.state.location.search).toBe('?severity=critical&q=old')
    expect(searchInput().value).toBe('old')
  })

  it('an outside push with another q replaces the typed text', async () => {
    const { router } = renderApp(`${DEMO}?q=old`)
    const input = await ready()

    input.setSelectionRange(input.value.length, input.value.length)
    keystroke(input, 'x')
    await act(async () => {
      await router.navigate(`${DEMO}?q=link`)
    })

    await waitFor(() => {
      expect(searchInput().value).toBe('link')
    })
    await pause(400)
    expect(router.state.location.search).toBe('?q=link')
    expect(searchInput().value).toBe('link')
  })

  it('an outside push that keeps q but changes another filter drops the typed text and its write', async () => {
    const { router } = renderApp(DEMO)
    const input = await ready()

    keystroke(input, 'a')
    keystroke(input, 'b')
    keystroke(input, 'c')
    await act(async () => {
      await router.navigate(`${DEMO}?severity=info`)
    })

    await waitFor(() => {
      expect(searchInput().value).toBe('')
    })
    await pause(400)
    expect(router.state.location.search).toBe('?severity=info')
    expect(searchInput().value).toBe('')
  })

  it('a select during a pending write is not taken for an outside navigation', async () => {
    const { router } = renderApp(DEMO)
    const input = await ready()

    keystroke(input, 'a')
    keystroke(input, 'b')
    keystroke(input, 'c')
    pickSeverityNative('Warning')
    // the select's navigation has started and React has not committed it: the user keeps typing
    keystroke(input, 'd')
    expect(input.value).toBe('abcd')

    await waitFor(() => {
      expect(router.state.location.search).toBe('?severity=warning&q=abcd')
    })
    await pause(400)
    expect(router.state.location.search).toBe('?severity=warning&q=abcd')
    expect(searchInput().value).toBe('abcd')
  })

  it('drops a pending write when the user leaves for another run', async () => {
    const { router } = renderApp(DEMO)
    const input = await ready()

    keystroke(input, 'a')
    keystroke(input, 'b')
    await act(async () => {
      await router.navigate(`/runs/${REVIEW_ATTENTION_RUN_ID}`)
    })
    await pause(400)

    expect(router.state.location.pathname).toBe(`/runs/${REVIEW_ATTENTION_RUN_ID}`)
    expect(router.state.location.search).toBe('')
  })
})
