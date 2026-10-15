// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { App } from 'antd'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { REPOSITORIES_QUERY_KEY, type Repository } from '../../entities/repository'
import { RepositorySettingsPage } from './RepositorySettingsPage'

const UI_REPO: Repository = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  fullName: 'larchanka-training/dmc-268-ui-t6',
  url: 'https://github.com/larchanka-training/dmc-268-ui-t6',
  defaultBranch: 'main',
  enabled: true,
  defaultEngine: 'fast',
  waitForCi: 'auto',
  maxComments: 10,
  reviewEvent: 'COMMENT',
  branchFilter: [],
  severityThreshold: 'all',
  installationAvailable: true,
}

const API_REPO: Repository = {
  id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  fullName: 'larchanka-training/dmc-268-api-t6',
  url: 'https://github.com/larchanka-training/dmc-268-api-t6',
  defaultBranch: 'master',
  enabled: false,
  defaultEngine: 'fast',
  waitForCi: 'never',
  maxComments: 4,
  reviewEvent: 'REQUEST_CHANGES',
  branchFilter: [],
  severityThreshold: 'all',
  installationAvailable: true,
}

// A repository whose branch filter is set.
const FULL_REPO: Repository = {
  ...UI_REPO,
  branchFilter: ['main', 'release/*'],
  severityThreshold: 'all',
}

// The GitHub App lost access: the api serves the stored preference as `enabled: false` (api PR #156).
const UNREACHABLE_REPO: Repository = { ...UI_REPO, enabled: false, installationAvailable: false }

// A valid uuid that no list contains.
const UNKNOWN_ID = 'c3d4e5f6-a7b8-4901-8def-123456789012'

const LIMIT_LABEL = 'Лимит замечаний (1..10)'
const CI_LABEL = 'Ожидание CI'
const VERDICT_LABEL = 'Публикация вердикта'
const SERVER_500_TEXT = 'Внутренняя ошибка сервера (500). Повторите попытку позже.'
const BRANCH_FILTER_LABEL = 'Фильтр веток'
const AUTO_REVIEW_LABEL = 'Автоматическое ревью'
const SAVED_FOR_LATER_TEXT =
  'Выбор сохранён. Авто-ревью включится, когда доступ к GitHub App восстановится.'
const AUTO_REVIEW_ERROR_TITLE = 'Не удалось изменить автоматическое ревью'
const ENGLISH_422_MSG = 'String should match pattern'
const STALE_NOTICE = 'Не удалось обновить настройки. Показаны значения, загруженные ранее.'
const RETRY_LABEL = /Повторить попытку/
const RADIO_ALL = 'All — critical, high, medium, low, info'
const RADIO_WARN = 'Warn & Crit — critical, high, medium, low'
const RADIO_CRIT = 'Only Critical — critical, high'

interface Backend {
  /** What the next GET /api/repos answers. */
  repos: Repository[]
  /** Makes GET /api/repos answer 500 and PATCH answer 500. */
  failList: boolean
  failPatch: boolean
  /** Overrides the answer to every PATCH (a 422, for one). */
  patchResponse: (() => Response) | null
  /** While set, GET /api/repos answers only after this promise resolves. */
  listGate: Promise<void> | null
  /** While set, every PATCH answers only after this promise resolves. */
  patchGate: Promise<void> | null
  gets: number
  patches: { id: string; body: unknown }[]
  fetchMock: ReturnType<typeof vi.fn<typeof fetch>>
}

function urlOf(input: Parameters<typeof fetch>[0]): URL {
  const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  return new URL(href, 'http://localhost')
}

/** Stands in for the network: the repository list and the PATCH of one repository. */
function stubBackend(repos: Repository[]): Backend {
  const backend: Backend = {
    repos,
    failList: false,
    failPatch: false,
    patchResponse: null,
    listGate: null,
    patchGate: null,
    gets: 0,
    patches: [],
    fetchMock: vi.fn<typeof fetch>((input, init) => {
      const url = urlOf(input)
      if (init?.method === 'PATCH') {
        const id = url.pathname.split('/').pop() ?? ''
        const body = JSON.parse(typeof init.body === 'string' ? init.body : '{}') as Record<
          string,
          unknown
        >
        backend.patches.push({ id, body })
        const answer = ((): Response => {
          if (backend.patchResponse !== null) {
            return backend.patchResponse()
          }
          if (backend.failPatch) {
            return new Response('Server Error', { status: 500 })
          }
          const merged = { ...backend.repos.find((repo) => repo.id === id), ...body } as Repository
          // The api serves `enabled AND installationAvailable` (api PR #156, SD §6.9).
          const saved = { ...merged, enabled: merged.enabled && merged.installationAvailable }
          backend.repos = backend.repos.map((repo) => (repo.id === id ? saved : repo))
          return new Response(JSON.stringify(saved), { status: 200 })
        })()
        return backend.patchGate === null
          ? Promise.resolve(answer)
          : backend.patchGate.then(() => answer)
      }
      backend.gets += 1
      const answer = backend.failList
        ? new Response('Server Error', { status: 500 })
        : new Response(JSON.stringify(backend.repos), { status: 200 })
      return backend.listGate === null
        ? Promise.resolve(answer)
        : backend.listGate.then(() => answer)
    }),
  }
  vi.stubGlobal('fetch', backend.fetchMock)
  return backend
}

function renderPage(
  entry: string,
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const router = createMemoryRouter(
    [
      {
        path: '/repositories/:repoId/settings',
        element: (
          <QueryClientProvider client={client}>
            <App>
              <RepositorySettingsPage />
            </App>
          </QueryClientProvider>
        ),
      },
      { path: '/repositories', element: <div data-testid="repositories-route">list</div> },
      { path: '/runs', element: <div data-testid="runs-route">runs</div> },
    ],
    { initialEntries: [entry] },
  )
  return { client, router, ...render(<RouterProvider router={router} />) }
}

function settingsPath(id: string): string {
  return `/repositories/${id}/settings`
}

function inputValue(label: string): string {
  return screen.getByLabelText<HTMLInputElement>(label).value
}

/** The text a Select shows as its chosen value (the open dropdown repeats the options). */
function selectedText(label: string): string | null | undefined {
  return screen.getByLabelText(label).closest('.ant-select')?.querySelector('.ant-select-content')
    ?.textContent
}

function unprocessable(detail: unknown[]): () => Response {
  return () => new Response(JSON.stringify({ detail }), { status: 422 })
}

function branchFilterField(): HTMLTextAreaElement {
  return screen.getByLabelText<HTMLTextAreaElement>(BRANCH_FILTER_LABEL)
}

function autoReviewSwitch(): HTMLElement {
  return screen.getByRole('switch', { name: AUTO_REVIEW_LABEL })
}

/**
 * Browsers hand the focus of a button that turns disabled to <body> (Chrome does, after the
 * render); jsdom keeps it where it was, and cannot blur a disabled element. This does what the
 * browsers do, so a test can tell a component that gives the focus back from one that never
 * loses it.
 */
function dropFocusWhenDisabled(element: HTMLElement): MutationObserver {
  const observer = new MutationObserver(() => {
    if (element.hasAttribute('disabled') && document.activeElement === element) {
      // `blur()` is a no-op on a disabled element in jsdom: move the focus away and drop it.
      const sentinel = document.createElement('div')
      sentinel.tabIndex = -1
      document.body.append(sentinel)
      sentinel.focus()
      sentinel.blur()
      sentinel.remove()
    }
  })
  observer.observe(element, { attributes: true, attributeFilter: ['disabled'] })
  return observer
}

/** Clicks a threshold radio, saves, and waits until the save is over. */
async function saveThreshold(radioName: string, backend: Backend, saves: number): Promise<void> {
  fireEvent.click(screen.getByRole('radio', { name: radioName }))
  await waitFor(() => {
    expect(saveButton().disabled).toBe(false)
  })
  fireEvent.click(saveButton())
  await waitFor(() => {
    expect(backend.patches).toHaveLength(saves)
  })
  await waitFor(() => {
    expect(saveButton().disabled).toBe(true)
  })
}

function saveButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Сохранить' })
}

function retryButton(): HTMLElement {
  return screen.getByRole('button', { name: RETRY_LABEL })
}

/**
 * Opens the settings of `repository` from a cached list (limit 3) while the refetch on open
 * fails; the server has moved on to limit 7 by the time anyone retries.
 */
async function openWithFailedRefresh(
  repository: Repository = UI_REPO,
): Promise<{ backend: Backend; client: QueryClient }> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  client.setQueryData(REPOSITORIES_QUERY_KEY, [{ ...repository, maxComments: 3 }])
  const backend = stubBackend([{ ...repository, maxComments: 7 }])
  backend.failList = true
  renderPage(settingsPath(repository.id), client)
  await screen.findByLabelText(LIMIT_LABEL)
  await screen.findByText(STALE_NOTICE)
  return { backend, client }
}

/** Gives the answer of a request the time to reach the page. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
}

async function chooseOption(label: string, optionText: string): Promise<void> {
  fireEvent.mouseDown(screen.getByLabelText(label))
  await waitFor(() => {
    expect(document.querySelectorAll('.ant-select-item-option').length).toBeGreaterThan(0)
  })
  const option = [...document.querySelectorAll('.ant-select-item-option')].find(
    (item) => item.textContent === optionText,
  )
  if (!option) {
    throw new Error(`no option "${optionText}"`)
  }
  fireEvent.click(option)
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('RepositorySettingsPage', () => {
  it('opens the settings of the repository from the URL', async () => {
    const backend = stubBackend([UI_REPO, API_REPO])

    renderPage(settingsPath(UI_REPO.id))

    expect(await screen.findByRole('heading', { name: 'Настройки репозитория' })).toBeTruthy()
    expect(screen.getByText('larchanka-training/dmc-268-ui-t6')).toBeTruthy()
    expect(inputValue(LIMIT_LABEL)).toBe('10')
    expect(selectedText(CI_LABEL)).toBe('Авто (ожидать CI при наличии проверок)')
    expect(selectedText(VERDICT_LABEL)).toBe('Комментарий (при любых замечаниях)')
    expect(saveButton().disabled).toBe(true)
    // The repository comes from the list: no request of its own.
    expect(backend.fetchMock.mock.calls.map(([input]) => urlOf(input).pathname)).toEqual([
      '/api/repos',
    ])
  })

  it('rejects a non-uuid repoId without a request', async () => {
    const backend = stubBackend([UI_REPO])

    renderPage(settingsPath('not-a-uuid'))

    expect(await screen.findByText('Некорректная ссылка на репозиторий')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'К списку репозиториев' }).getAttribute('href')).toBe(
      '/repositories',
    )
    await act(async () => {
      await Promise.resolve()
    })
    expect(backend.fetchMock).not.toHaveBeenCalled()
  })

  it('shows not-found for an unknown repository', async () => {
    stubBackend([UI_REPO, API_REPO])

    renderPage(settingsPath(UNKNOWN_ID))

    expect(await screen.findByText('Репозиторий не найден или недоступен')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'К списку репозиториев' }).getAttribute('href')).toBe(
      '/repositories',
    )
    expect(screen.queryByLabelText(LIMIT_LABEL)).toBeNull()
  })

  it('shows the load error and loads the repository on retry', async () => {
    const backend = stubBackend([UI_REPO])
    backend.failList = true

    renderPage(settingsPath(UI_REPO.id))

    expect(await screen.findByText(SERVER_500_TEXT)).toBeTruthy()
    expect(screen.queryByLabelText(LIMIT_LABEL)).toBeNull()

    backend.failList = false
    fireEvent.click(screen.getByRole('button', { name: 'Повторить попытку' }))

    expect(await screen.findByLabelText(LIMIT_LABEL)).toBeTruthy()
    expect(screen.queryByText(SERVER_500_TEXT)).toBeNull()
  })

  it('saves only the changed fields and never sends defaultEngine', async () => {
    const backend = stubBackend([UI_REPO, API_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    // The engine is read-only text: no control, no phase-3 option.
    expect(screen.queryByLabelText('Движок анализа')).toBeNull()
    expect(screen.getByText('DiffEngine (быстрый синтаксический анализ)')).toBeTruthy()
    expect(
      screen.getByText('SandboxEngine (глубокий анализ в песочнице) появится в фазе 3'),
    ).toBeTruthy()

    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })
    await chooseOption(VERDICT_LABEL, 'Запрос изменений (при блокирующих)')
    expect(saveButton().disabled).toBe(false)
    fireEvent.click(saveButton())

    await screen.findByText('Настройки репозитория успешно сохранены')
    expect(backend.patches).toEqual([
      { id: UI_REPO.id, body: { maxComments: 5, reviewEvent: 'REQUEST_CHANGES' } },
    ])
    expect(saveButton().disabled).toBe(true)
  })

  it('takes the saved values as the baseline of the next save', async () => {
    const backend = stubBackend([UI_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })
    fireEvent.click(saveButton())
    await waitFor(() => {
      expect(backend.patches).toHaveLength(1)
    })
    await waitFor(() => {
      expect(saveButton().disabled).toBe(true)
    })

    // Back to the value the form was opened with: that is a change against the saved 5.
    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '10' } })
    await waitFor(() => {
      expect(saveButton().disabled).toBe(false)
    })
    fireEvent.click(saveButton())

    await waitFor(() => {
      expect(backend.patches).toHaveLength(2)
    })
    expect(backend.patches[1]).toEqual({ id: UI_REPO.id, body: { maxComments: 10 } })
  })

  it('keeps entered values when PATCH fails with 500', async () => {
    const backend = stubBackend([UI_REPO])
    backend.failPatch = true
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })
    fireEvent.click(saveButton())

    // The error is a message on the page, not a toast that disappears.
    expect(await screen.findByText(SERVER_500_TEXT)).toBeTruthy()
    expect(backend.patches).toEqual([{ id: UI_REPO.id, body: { maxComments: 5 } }])
    expect(inputValue(LIMIT_LABEL)).toBe('5')
    expect(saveButton().disabled).toBe(false)
  })

  it('restores the opened values on «Отменить изменения»', async () => {
    const backend = stubBackend([UI_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })
    await chooseOption(CI_LABEL, 'Никогда (запускать ревью без ожидания CI)')
    expect(selectedText(CI_LABEL)).toBe('Никогда (запускать ревью без ожидания CI)')
    expect(saveButton().disabled).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Отменить изменения' }))

    await waitFor(() => {
      expect(saveButton().disabled).toBe(true)
    })
    expect(inputValue(LIMIT_LABEL)).toBe('10')
    expect(selectedText(CI_LABEL)).toBe('Авто (ожидать CI при наличии проверок)')
    expect(backend.patches).toEqual([])
  })

  it('does not reset the form on a background refetch', async () => {
    const backend = stubBackend([UI_REPO, API_REPO])
    const { client } = renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })

    // The server now reports another limit for the same repository.
    backend.repos = [{ ...UI_REPO, maxComments: 7 }, API_REPO]
    await act(async () => {
      await client.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY })
    })

    expect(backend.gets).toBe(2)
    expect(client.getQueryData<Repository[]>(REPOSITORIES_QUERY_KEY)?.[0]?.maxComments).toBe(7)
    expect(inputValue(LIMIT_LABEL)).toBe('5')
    expect(saveButton().disabled).toBe(false)
  })

  it('keeps the form when a background refetch fails', async () => {
    const backend = stubBackend([UI_REPO])
    const { client } = renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })

    backend.failList = true
    await act(async () => {
      await client.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY })
    })

    expect(backend.gets).toBe(2)
    expect(client.getQueryState(REPOSITORIES_QUERY_KEY)?.status).toBe('error')
    expect(inputValue(LIMIT_LABEL)).toBe('5')
    // Only the request that opens the page speaks of old values.
    expect(screen.queryByText(STALE_NOTICE)).toBeNull()
  })

  it('shows the fresh values, never the cached ones, when the settings open', async () => {
    // The app's staleTime: the cached list is fresh, yet opening the page asks again.
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    })
    client.setQueryData(REPOSITORIES_QUERY_KEY, [{ ...UI_REPO, maxComments: 3 }])
    const backend = stubBackend([{ ...UI_REPO, maxComments: 7 }])
    let release: () => void = () => undefined
    backend.listGate = new Promise<void>((resolve) => {
      release = resolve
    })

    renderPage(settingsPath(UI_REPO.id), client)

    // The request is under way; the cached 3 is not offered as the current value.
    await waitFor(() => {
      expect(backend.gets).toBe(1)
    })
    expect(screen.queryByLabelText(LIMIT_LABEL)).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Настройки репозитория' })).toBeNull()

    release()
    expect(await screen.findByLabelText(LIMIT_LABEL)).toBeTruthy()
    expect(inputValue(LIMIT_LABEL)).toBe('7')
    expect(saveButton().disabled).toBe(true)
  })

  it('waits for the request on open when the cached list lacks the repository', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    })
    // The cache has data (so the query is not pending) but not this repository.
    client.setQueryData(REPOSITORIES_QUERY_KEY, [API_REPO])
    const backend = stubBackend([UI_REPO, API_REPO])
    let release: () => void = () => undefined
    backend.listGate = new Promise<void>((resolve) => {
      release = resolve
    })

    const { container } = renderPage(settingsPath(UI_REPO.id), client)

    // The answer to come may have the repository: a Skeleton, never «не найден».
    await waitFor(() => {
      expect(backend.gets).toBe(1)
    })
    expect(container.querySelector('.ant-skeleton')).not.toBeNull()
    expect(screen.queryByText('Репозиторий не найден или недоступен')).toBeNull()
    expect(screen.queryByLabelText(LIMIT_LABEL)).toBeNull()

    release()
    expect(await screen.findByLabelText(LIMIT_LABEL)).toBeTruthy()
    expect(inputValue(LIMIT_LABEL)).toBe('10')
    expect(screen.queryByText('Репозиторий не найден или недоступен')).toBeNull()
    expect(container.querySelector('.ant-skeleton')).toBeNull()
  })

  it('opens with the cached values and warns that they are old when the refetch on open fails', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    })
    client.setQueryData(REPOSITORIES_QUERY_KEY, [{ ...UI_REPO, maxComments: 3 }])
    const backend = stubBackend([UI_REPO])
    backend.failList = true

    renderPage(settingsPath(UI_REPO.id), client)

    expect(await screen.findByLabelText(LIMIT_LABEL)).toBeTruthy()
    expect(backend.gets).toBe(1)
    expect(client.getQueryState(REPOSITORIES_QUERY_KEY)?.status).toBe('error')
    expect(inputValue(LIMIT_LABEL)).toBe('3')
    const notice = await screen.findByText(STALE_NOTICE)
    expect(notice.closest('.ant-alert')?.classList.contains('ant-alert-warning')).toBe(true)
    // «Сохранить» stays the only primary button of the page.
    expect(retryButton().className).not.toContain('ant-btn-primary')
  })

  it('keeps the form while the list is refetched after a save', async () => {
    // A save invalidates the list: the refetch that follows must not unmount the form.
    const backend = stubBackend([UI_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })
    // The refetch after the save stays pending.
    let release: () => void = () => undefined
    backend.listGate = new Promise<void>((resolve) => {
      release = resolve
    })
    fireEvent.click(saveButton())
    await waitFor(() => {
      expect(backend.patches).toHaveLength(1)
    })
    await waitFor(() => {
      expect(backend.gets).toBe(2)
    })

    expect(screen.queryByLabelText(LIMIT_LABEL)).not.toBeNull()
    expect(inputValue(LIMIT_LABEL)).toBe('5')
    release()
  })

  it('resets the form when another repository opens', async () => {
    stubBackend([UI_REPO, API_REPO])
    const { router } = renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '3' } })
    expect(inputValue(LIMIT_LABEL)).toBe('3')

    await act(async () => {
      await router.navigate(settingsPath(API_REPO.id))
    })

    expect(await screen.findByText('larchanka-training/dmc-268-api-t6')).toBeTruthy()
    expect(inputValue(LIMIT_LABEL)).toBe('4')
    expect(selectedText(CI_LABEL)).toBe('Никогда (запускать ревью без ожидания CI)')
    expect(saveButton().disabled).toBe(true)
  })

  it('links «История проверок» to /runs?repo=<fullName>', async () => {
    stubBackend([UI_REPO])
    const { router } = renderPage(settingsPath(UI_REPO.id))

    const link = await screen.findByRole('link', { name: 'История проверок' })
    expect(link.getAttribute('href')).toBe('/runs?repo=larchanka-training%2Fdmc-268-ui-t6')

    fireEvent.click(link)

    expect(await screen.findByTestId('runs-route')).toBeTruthy()
    expect(router.state.location.pathname).toBe('/runs')
    expect(router.state.location.search).toBe('?repo=larchanka-training%2Fdmc-268-ui-t6')
  })
})

describe('RepositorySettingsPage: a failed refresh on open', () => {
  it('refetches on retry and shows the fresh values when nothing was typed', async () => {
    const { backend } = await openWithFailedRefresh()
    expect(inputValue(LIMIT_LABEL)).toBe('3')

    backend.failList = false
    const retry = retryButton()
    retry.focus()
    fireEvent.click(retry)

    await waitFor(() => {
      expect(screen.queryByText(STALE_NOTICE)).toBeNull()
    })
    expect(backend.gets).toBe(2)
    expect(inputValue(LIMIT_LABEL)).toBe('7')
    expect(saveButton().disabled).toBe(true)
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText(CI_LABEL))
    })
  })

  it('keeps what was typed when the retry succeeds', async () => {
    const { backend } = await openWithFailedRefresh()
    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })

    backend.failList = false
    const retry = retryButton()
    retry.focus()
    fireEvent.click(retry)

    await waitFor(() => {
      expect(screen.queryByText(STALE_NOTICE)).toBeNull()
    })
    expect(backend.gets).toBe(2)
    expect(inputValue(LIMIT_LABEL)).toBe('5')
    expect(saveButton().disabled).toBe(false)
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText(CI_LABEL))
    })
  })

  it('keeps what is typed and focused while the retry is running', async () => {
    const { backend } = await openWithFailedRefresh()
    backend.failList = false
    let release: () => void = () => undefined
    backend.listGate = new Promise<void>((resolve) => {
      release = resolve
    })
    const retry = retryButton()
    retry.focus()
    fireEvent.click(retry)
    await waitFor(() => {
      expect(backend.gets).toBe(2)
    })

    // The user does not wait: they go to the limit and type, and then the answer comes.
    const limit = screen.getByLabelText<HTMLInputElement>(LIMIT_LABEL)
    limit.focus()
    fireEvent.change(limit, { target: { value: '5' } })
    release()

    await waitFor(() => {
      expect(screen.queryByText(STALE_NOTICE)).toBeNull()
    })
    await settle()
    expect(screen.getByLabelText(LIMIT_LABEL)).toBe(limit)
    expect(limit.value).toBe('5')
    expect(document.activeElement).toBe(limit)
  })

  it('keeps an emptied limit and its focus when the retry succeeds with a different limit', async () => {
    const { backend } = await openWithFailedRefresh()
    backend.failList = false
    let release: () => void = () => undefined
    backend.listGate = new Promise<void>((resolve) => {
      release = resolve
    })
    const retry = retryButton()
    retry.focus()
    fireEvent.click(retry)
    await waitFor(() => {
      expect(backend.gets).toBe(2)
    })

    // Emptying the limit is not a change a PATCH could carry, but it is the user's draft.
    const limit = screen.getByLabelText<HTMLInputElement>(LIMIT_LABEL)
    limit.focus()
    fireEvent.change(limit, { target: { value: '' } })
    expect(limit.value).toBe('')
    expect(saveButton().disabled).toBe(true)
    release()

    await waitFor(() => {
      expect(screen.queryByText(STALE_NOTICE)).toBeNull()
    })
    await settle()
    expect(screen.getByLabelText(LIMIT_LABEL)).toBe(limit)
    expect(limit.value).toBe('')
    expect(document.activeElement).toBe(limit)
  })

  it('keeps a branch filter text that only reads as the same list when the retry succeeds', async () => {
    const { backend } = await openWithFailedRefresh(FULL_REPO)
    backend.failList = false
    let release: () => void = () => undefined
    backend.listGate = new Promise<void>((resolve) => {
      release = resolve
    })
    const retry = retryButton()
    retry.focus()
    fireEvent.click(retry)
    await waitFor(() => {
      expect(backend.gets).toBe(2)
    })

    // A blank line and trailing spaces: the same masks, so no PATCH, but the text is typed.
    const filter = branchFilterField()
    filter.focus()
    fireEvent.change(filter, { target: { value: 'main\nrelease/*  \n' } })
    expect(saveButton().disabled).toBe(true)
    release()

    await waitFor(() => {
      expect(screen.queryByText(STALE_NOTICE)).toBeNull()
    })
    await settle()
    expect(branchFilterField()).toBe(filter)
    expect(filter.value).toBe('main\nrelease/*  \n')
    expect(inputValue(LIMIT_LABEL)).toBe('3')
    expect(document.activeElement).toBe(filter)
  })

  it('moves no focus when the retry did not have it', async () => {
    const { backend } = await openWithFailedRefresh()
    backend.failList = false

    // A click with the mouse: Safari does not focus a button for it.
    fireEvent.click(retryButton())

    await waitFor(() => {
      expect(screen.queryByText(STALE_NOTICE)).toBeNull()
    })
    await settle()
    expect(inputValue(LIMIT_LABEL)).toBe('7')
    expect(document.activeElement).toBe(document.body)
  })

  it('keeps the notice and the focus on the retry when the retry fails', async () => {
    const { backend } = await openWithFailedRefresh()

    const retry = retryButton()
    retry.focus()
    fireEvent.click(retry)
    await waitFor(() => {
      expect(backend.gets).toBe(2)
    })
    await settle()

    expect(screen.getByText(STALE_NOTICE)).toBeTruthy()
    expect(retryButton()).toBe(retry)
    expect(document.activeElement).toBe(retry)
    expect(inputValue(LIMIT_LABEL)).toBe('3')
  })

  it('takes the notice away without remounting the form when a background refetch succeeds', async () => {
    const { backend, client } = await openWithFailedRefresh()
    const limit = screen.getByLabelText<HTMLInputElement>(LIMIT_LABEL)
    expect(limit.value).toBe('3')

    backend.failList = false
    await act(async () => {
      await client.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY })
    })

    await waitFor(() => {
      expect(screen.queryByText(STALE_NOTICE)).toBeNull()
    })
    // The fields are the ones the user was looking at, with the values they had.
    expect(screen.getByLabelText(LIMIT_LABEL)).toBe(limit)
    expect(limit.value).toBe('3')
  })

  it('moves focus to the first field, without remounting the form, when a background refetch takes away the notice and the retry had the focus', async () => {
    const { backend, client } = await openWithFailedRefresh()
    const limit = screen.getByLabelText<HTMLInputElement>(LIMIT_LABEL)
    retryButton().focus()

    backend.failList = false
    await act(async () => {
      await client.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY })
    })

    await waitFor(() => {
      expect(screen.queryByText(STALE_NOTICE)).toBeNull()
    })
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText(CI_LABEL))
    })
    // The values are the old ones: only the notice is gone.
    expect(screen.getByLabelText(LIMIT_LABEL)).toBe(limit)
    expect(limit.value).toBe('3')
  })

  it('leaves the focus where the user moved it when a background refetch takes away the notice', async () => {
    const { backend, client } = await openWithFailedRefresh()
    const limit = screen.getByLabelText<HTMLInputElement>(LIMIT_LABEL)
    retryButton().focus()
    // Tab takes the user to the limit before the refetch ends.
    limit.focus()

    backend.failList = false
    await act(async () => {
      await client.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY })
    })

    await waitFor(() => {
      expect(screen.queryByText(STALE_NOTICE)).toBeNull()
    })
    await settle()
    expect(document.activeElement).toBe(limit)
  })

  it('moves no focus when a background refetch takes away the notice and the retry did not have it', async () => {
    const { backend, client } = await openWithFailedRefresh()
    const limit = screen.getByLabelText<HTMLInputElement>(LIMIT_LABEL)
    // The retry lost the focus without anything else taking it: the focus is on <body>.
    const retry = retryButton()
    retry.focus()
    retry.blur()
    expect(document.activeElement).toBe(document.body)

    backend.failList = false
    await act(async () => {
      await client.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY })
    })

    await waitFor(() => {
      expect(screen.queryByText(STALE_NOTICE)).toBeNull()
    })
    await settle()
    expect(screen.getByLabelText(LIMIT_LABEL)).toBe(limit)
    expect(document.activeElement).toBe(document.body)
  })
})

describe('RepositorySettingsPage: auto-review', () => {
  it('toggles auto-review immediately with PATCH {enabled} only', async () => {
    const backend = stubBackend([UI_REPO, API_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)
    expect(autoReviewSwitch().getAttribute('aria-checked')).toBe('true')

    // An unsaved edit of the form must not travel with the switch.
    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })
    fireEvent.click(autoReviewSwitch())

    await screen.findByText('Автоматическое ревью выключено')
    expect(backend.patches).toEqual([{ id: UI_REPO.id, body: { enabled: false } }])
    expect(autoReviewSwitch().getAttribute('aria-checked')).toBe('false')
    expect(inputValue(LIMIT_LABEL)).toBe('5')
    expect(saveButton().disabled).toBe(false)

    fireEvent.click(autoReviewSwitch())
    await waitFor(() => {
      expect(backend.patches).toHaveLength(2)
    })
    expect(backend.patches[1]).toEqual({ id: UI_REPO.id, body: { enabled: true } })
  })

  it('shows the error under the switch and rolls the switch back when PATCH fails', async () => {
    const backend = stubBackend([UI_REPO])
    backend.failPatch = true
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.click(autoReviewSwitch())

    expect(await screen.findByText(SERVER_500_TEXT)).toBeTruthy()
    expect(backend.patches).toEqual([{ id: UI_REPO.id, body: { enabled: false } }])
    await waitFor(() => {
      expect(autoReviewSwitch().getAttribute('aria-checked')).toBe('true')
    })
  })

  it('explains why auto-review will not run and what the switch does when installationAvailable is false', async () => {
    const backend = stubBackend([UNREACHABLE_REPO])
    renderPage(settingsPath(UI_REPO.id))

    expect(await screen.findByText(/у GitHub App нет доступа к этому репозиторию/i)).toBeTruthy()
    expect(screen.getByText(/автоматическое ревью не запустится/i)).toBeTruthy()
    expect(
      screen.getByText(/переключатель сохраняет выбор.*вступит в силу.*доступ к GitHub App/i),
    ).toBeTruthy()
    expect(screen.queryByText(/сохраняет только настройку/i)).toBeNull()

    // The switch shows what the server says and still saves the choice.
    expect(autoReviewSwitch().getAttribute('aria-checked')).toBe('false')
    fireEvent.click(autoReviewSwitch())
    await waitFor(() => {
      expect(backend.patches).toEqual([{ id: UI_REPO.id, body: { enabled: true } }])
    })
  })

  it('tells that the choice is saved, not applied, when it is turned on without GitHub App access', async () => {
    const backend = stubBackend([UNREACHABLE_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.click(autoReviewSwitch())

    const message = await screen.findByText(SAVED_FOR_LATER_TEXT)
    expect(message.closest('.ant-message-info')).not.toBeNull()
    expect(backend.patches).toEqual([{ id: UI_REPO.id, body: { enabled: true } }])
    // The switch shows the server value: off. It is no error and not the usual toast.
    await waitFor(() => {
      expect(autoReviewSwitch().getAttribute('aria-checked')).toBe('false')
    })
    expect(screen.queryByText(AUTO_REVIEW_ERROR_TITLE)).toBeNull()
    expect(screen.queryByText('Автоматическое ревью включено')).toBeNull()
    // Still one warning, and the next load agrees with the answer.
    expect(screen.getAllByText(/у GitHub App нет доступа к этому репозиторию/i)).toHaveLength(1)
    expect(backend.repos[0]?.enabled).toBe(false)
  })

  it('keeps the usual toasts for a repository the GitHub App can reach', async () => {
    stubBackend([{ ...UI_REPO, enabled: false }])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.click(autoReviewSwitch())

    await screen.findByText('Автоматическое ревью включено')
    expect(screen.queryByText(SAVED_FOR_LATER_TEXT)).toBeNull()
    expect(autoReviewSwitch().getAttribute('aria-checked')).toBe('true')
  })

  it('says «выключено», not that the choice waits for access, when the switch is turned off and GitHub App access is gone', async () => {
    // The switch is on, then the access goes: the answer to «off» carries installationAvailable
    // false, and the info message is for turning on only.
    const backend = stubBackend([UI_REPO])
    backend.patchResponse = () =>
      new Response(JSON.stringify({ ...UI_REPO, enabled: false, installationAvailable: false }), {
        status: 200,
      })
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)
    expect(autoReviewSwitch().getAttribute('aria-checked')).toBe('true')

    fireEvent.click(autoReviewSwitch())

    await screen.findByText('Автоматическое ревью выключено')
    expect(backend.patches).toEqual([{ id: UI_REPO.id, body: { enabled: false } }])
    expect(screen.queryByText(SAVED_FOR_LATER_TEXT)).toBeNull()
    expect(screen.queryByText(AUTO_REVIEW_ERROR_TITLE)).toBeNull()
  })

  it('keeps the focus on the switch when the choice is saved without GitHub App access', async () => {
    const backend = stubBackend([UNREACHABLE_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)
    const toggle = autoReviewSwitch()
    const observer = dropFocusWhenDisabled(toggle)
    try {
      toggle.focus()

      fireEvent.click(toggle)
      await screen.findByText(SAVED_FOR_LATER_TEXT)

      expect(backend.patches).toHaveLength(1)
      await waitFor(() => {
        expect(document.activeElement).toBe(toggle)
      })
    } finally {
      observer.disconnect()
    }
  })

  it('keeps the focus on the switch after the usual save', async () => {
    stubBackend([UI_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)
    const toggle = autoReviewSwitch()
    const observer = dropFocusWhenDisabled(toggle)
    try {
      toggle.focus()

      fireEvent.click(toggle)
      await screen.findByText('Автоматическое ревью выключено')

      await waitFor(() => {
        expect(document.activeElement).toBe(toggle)
      })
    } finally {
      observer.disconnect()
    }
  })

  it('does not take the focus from a field the user moved to while the choice was saving', async () => {
    const backend = stubBackend([UI_REPO])
    let release = (): void => undefined
    backend.patchGate = new Promise<void>((resolve) => {
      release = resolve
    })
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)
    const toggle = autoReviewSwitch()
    const observer = dropFocusWhenDisabled(toggle)
    try {
      toggle.focus()
      fireEvent.click(toggle)
      await waitFor(() => {
        expect(backend.patches).toHaveLength(1)
      })
      const limit = screen.getByLabelText(LIMIT_LABEL)
      limit.focus()

      release()
      await screen.findByText('Автоматическое ревью выключено')

      expect(document.activeElement).toBe(limit)
    } finally {
      observer.disconnect()
    }
  })

  it('does not warn about the installation when installationAvailable is true', async () => {
    stubBackend([{ ...UI_REPO, installationAvailable: true }])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    expect(screen.queryByText(/у GitHub App нет доступа/i)).toBeNull()
  })
})

describe('RepositorySettingsPage: branch filter and severity threshold', () => {
  it('shows the saved masks one per line and the saved threshold', async () => {
    stubBackend([{ ...FULL_REPO, severityThreshold: 'warning' }])
    renderPage(settingsPath(UI_REPO.id))

    await screen.findByLabelText(LIMIT_LABEL)
    expect(branchFilterField().value).toBe('main\nrelease/*')
    expect(screen.getByText(/Пусто — все ветки/)).toBeTruthy()
    expect(screen.getByRole<HTMLInputElement>('radio', { name: RADIO_WARN }).checked).toBe(true)
    expect(screen.getByRole<HTMLInputElement>('radio', { name: RADIO_ALL }).checked).toBe(false)
  })

  it('offers All / Warn & Crit / Only Critical and saves each wire value', async () => {
    const backend = stubBackend([FULL_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    // Each option names the levels it keeps.
    expect(screen.getByRole('radiogroup', { name: 'Порог важности замечаний' })).toBeTruthy()
    expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual([
      'all',
      'warning',
      'critical',
    ])
    expect(screen.getByRole<HTMLInputElement>('radio', { name: RADIO_ALL }).checked).toBe(true)
    expect(screen.getByRole('radio', { name: RADIO_WARN })).toBeTruthy()
    expect(screen.getByRole('radio', { name: RADIO_CRIT })).toBeTruthy()

    await saveThreshold(RADIO_WARN, backend, 1)
    await saveThreshold(RADIO_CRIT, backend, 2)
    await saveThreshold(RADIO_ALL, backend, 3)

    expect(backend.patches).toEqual([
      { id: UI_REPO.id, body: { severityThreshold: 'warning' } },
      { id: UI_REPO.id, body: { severityThreshold: 'critical' } },
      { id: UI_REPO.id, body: { severityThreshold: 'all' } },
    ])
  })

  it('sends the masks one per line, trimmed and without duplicates', async () => {
    const backend = stubBackend([FULL_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(branchFilterField(), {
      target: { value: 'main\n\n  release/* \nmain\nhotfix/*\n' },
    })
    fireEvent.click(saveButton())

    await screen.findByText('Настройки репозитория успешно сохранены')
    expect(backend.patches).toEqual([
      { id: UI_REPO.id, body: { branchFilter: ['main', 'release/*', 'hotfix/*'] } },
    ])
  })

  it('sends an empty filter as []', async () => {
    const backend = stubBackend([FULL_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(branchFilterField(), { target: { value: '  \n ' } })
    expect(saveButton().disabled).toBe(false)
    fireEvent.click(saveButton())

    await screen.findByText('Настройки репозитория успешно сохранены')
    expect(backend.patches).toEqual([{ id: UI_REPO.id, body: { branchFilter: [] } }])
    await waitFor(() => {
      expect(saveButton().disabled).toBe(true)
    })
  })

  it('refuses a list over the size limits before any request', async () => {
    const backend = stubBackend([FULL_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(branchFilterField(), {
      target: { value: Array.from({ length: 21 }, (_, i) => `b${String(i)}`).join('\n') },
    })
    fireEvent.click(saveButton())

    expect(await screen.findByText('Не больше 20 масок')).toBeTruthy()
    expect(backend.patches).toEqual([])
  })

  it('shows the 422 of api PR #156 under the branch filter and keeps the masks', async () => {
    const backend = stubBackend([FULL_REPO])
    // The body as FastAPI renders a ValueError of the list validator: the whole field is the
    // location, there is no mask index, and `msg` is English.
    backend.patchResponse = unprocessable([
      {
        type: 'value_error',
        loc: ['body', 'branchFilter'],
        msg: "Value error, branch pattern 'a..b' must not contain '..' or '//'",
        input: ['main', 'a..b'],
        ctx: { error: {} },
      },
    ])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(branchFilterField(), { target: { value: 'main\na..b' } })
    fireEvent.click(saveButton())

    const field = branchFilterField().closest<HTMLElement>('.ant-form-item')
    if (field === null) {
      throw new Error('the branch filter has no form item')
    }
    expect(await within(field).findByText('Сервер не принял значение')).toBeTruthy()
    expect(backend.patches).toEqual([{ id: UI_REPO.id, body: { branchFilter: ['main', 'a..b'] } }])
    // The server's English text is never shown and nothing is reported above the form.
    expect(screen.queryByText(/Value error/)).toBeNull()
    expect(screen.queryByText('Не удалось сохранить настройки')).toBeNull()
    expect(screen.queryByText(/Маска в строке/)).toBeNull()
    expect(branchFilterField().value).toBe('main\na..b')
    expect(saveButton().disabled).toBe(false)

    // Editing the field takes the server's complaint away.
    fireEvent.change(branchFilterField(), { target: { value: 'main\na.b' } })
    await waitFor(() => {
      expect(screen.queryByText('Сервер не принял значение')).toBeNull()
    })
  })

  // api PR #156 names no mask index today. The mapping of an indexed location to the line stays as
  // forward compatibility, so the stubs below answer with an index.
  it('shows the 422 under the branch filter with the line number and keeps the masks', async () => {
    const backend = stubBackend([FULL_REPO])
    backend.patchResponse = unprocessable([
      { loc: ['body', 'branchFilter', 1], msg: ENGLISH_422_MSG, type: 'value_error' },
    ])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(branchFilterField(), { target: { value: 'main\n[oops' } })
    fireEvent.click(saveButton())

    expect(await screen.findByText('Маска в строке 2 не принята сервером')).toBeTruthy()
    expect(backend.patches).toEqual([{ id: UI_REPO.id, body: { branchFilter: ['main', '[oops'] } }])
    // The server's English text is never shown and nothing is reported above the form.
    expect(screen.queryByText(ENGLISH_422_MSG)).toBeNull()
    expect(screen.queryByText('Не удалось сохранить настройки')).toBeNull()
    expect(branchFilterField().value).toBe('main\n[oops')
    expect(saveButton().disabled).toBe(false)

    // Editing the field takes the server's complaint away; the other fields never had one.
    fireEvent.change(branchFilterField(), { target: { value: 'main\n[oops]' } })
    await waitFor(() => {
      expect(screen.queryByText('Маска в строке 2 не принята сервером')).toBeNull()
    })
  })

  it('names the visible line of the refused mask when the text has a blank line and a duplicate', async () => {
    const backend = stubBackend([FULL_REPO])
    // The cleaned list is ['main', '[oops']: the server refuses its second mask.
    backend.patchResponse = unprocessable([
      { loc: ['body', 'branchFilter', 1], msg: ENGLISH_422_MSG, type: 'value_error' },
    ])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(branchFilterField(), { target: { value: '\nmain\nmain\n[oops' } })
    fireEvent.click(saveButton())

    // The mask sits on line 4 of the textarea, not at place 2 of the cleaned list.
    expect(await screen.findByText('Маска в строке 4 не принята сервером')).toBeTruthy()
    expect(screen.queryByText('Маска в строке 2 не принята сервером')).toBeNull()
    expect(backend.patches).toEqual([{ id: UI_REPO.id, body: { branchFilter: ['main', '[oops'] } }])
    expect(branchFilterField().value).toBe('\nmain\nmain\n[oops')
  })

  it('shows the 422 under the threshold', async () => {
    // The UI offers only valid values: the refusal comes from an overlay on the transport.
    const backend = stubBackend([FULL_REPO])
    backend.patchResponse = unprocessable([
      { loc: ['body', 'severityThreshold'], msg: ENGLISH_422_MSG, type: 'enum' },
    ])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.click(screen.getByRole('radio', { name: RADIO_CRIT }))
    fireEvent.click(saveButton())

    expect(await screen.findByText('Сервер не принял порог')).toBeTruthy()
    expect(screen.queryByText(ENGLISH_422_MSG)).toBeNull()
    expect(screen.queryByText('Не удалось сохранить настройки')).toBeNull()
    expect(screen.getByRole<HTMLInputElement>('radio', { name: RADIO_CRIT }).checked).toBe(true)

    fireEvent.click(screen.getByRole('radio', { name: RADIO_WARN }))
    await waitFor(() => {
      expect(screen.queryByText('Сервер не принял порог')).toBeNull()
    })
  })

  it('shows a 422 that names no field in the alert above the form', async () => {
    const backend = stubBackend([FULL_REPO])
    backend.patchResponse = unprocessable([
      { loc: ['body', 'branchFilter', 0], msg: ENGLISH_422_MSG, type: 'value_error' },
      { loc: ['body', 'somethingNew'], msg: ENGLISH_422_MSG, type: 'value_error' },
    ])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(branchFilterField(), { target: { value: 'main' } })
    fireEvent.click(saveButton())

    expect(await screen.findByText('Не удалось сохранить настройки')).toBeTruthy()
    expect(screen.getByText('Некорректные параметры запроса (422).')).toBeTruthy()
    expect(screen.getByText('Маска в строке 1 не принята сервером')).toBeTruthy()
    expect(screen.queryByText(ENGLISH_422_MSG)).toBeNull()
  })

  it('restores the branch filter and the threshold on «Отменить изменения»', async () => {
    const backend = stubBackend([FULL_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(branchFilterField(), { target: { value: 'develop' } })
    fireEvent.click(screen.getByRole('radio', { name: RADIO_CRIT }))
    fireEvent.click(screen.getByRole('button', { name: 'Отменить изменения' }))

    await waitFor(() => {
      expect(saveButton().disabled).toBe(true)
    })
    expect(branchFilterField().value).toBe('main\nrelease/*')
    expect(screen.getByRole<HTMLInputElement>('radio', { name: RADIO_ALL }).checked).toBe(true)
    expect(backend.patches).toEqual([])
  })

  it('takes the 422 under the branch filter away on «Отменить изменения»', async () => {
    const backend = stubBackend([FULL_REPO])
    backend.patchResponse = unprocessable([
      { loc: ['body', 'branchFilter', 1], msg: ENGLISH_422_MSG, type: 'value_error' },
    ])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(branchFilterField(), { target: { value: 'main\n[oops' } })
    fireEvent.click(saveButton())
    expect(await screen.findByText('Маска в строке 2 не принята сервером')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Отменить изменения' }))

    await waitFor(() => {
      expect(screen.queryByText('Маска в строке 2 не принята сервером')).toBeNull()
    })
    expect(branchFilterField().value).toBe('main\nrelease/*')
  })

  it('takes the alert above the form away on «Отменить изменения»', async () => {
    const backend = stubBackend([FULL_REPO])
    backend.failPatch = true
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(branchFilterField(), { target: { value: 'develop' } })
    fireEvent.click(saveButton())
    expect(await screen.findByText('Не удалось сохранить настройки')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Отменить изменения' }))

    await waitFor(() => {
      expect(screen.queryByText('Не удалось сохранить настройки')).toBeNull()
    })
    expect(screen.queryByText(SERVER_500_TEXT)).toBeNull()
  })
})

describe('RepositorySettingsPage: focus', () => {
  it('moves focus to the first field after a successful save', async () => {
    const backend = stubBackend([UI_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })
    saveButton().focus()
    fireEvent.click(saveButton())

    await screen.findByText('Настройки репозитория успешно сохранены')
    expect(backend.patches).toHaveLength(1)
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText(CI_LABEL))
    })
  })

  it('moves focus to the first field after «Отменить изменения»', async () => {
    stubBackend([UI_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })
    const cancel = screen.getByRole('button', { name: 'Отменить изменения' })
    cancel.focus()
    fireEvent.click(cancel)

    await waitFor(() => {
      expect(saveButton().disabled).toBe(true)
    })
    expect(inputValue(LIMIT_LABEL)).toBe('10')
    expect(document.activeElement).toBe(screen.getByLabelText(CI_LABEL))
  })

  it('keeps focus on «Сохранить» when the save fails', async () => {
    const backend = stubBackend([UI_REPO])
    backend.failPatch = true
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })
    saveButton().focus()
    fireEvent.click(saveButton())

    expect(await screen.findByText(SERVER_500_TEXT)).toBeTruthy()
    expect(document.activeElement).toBe(saveButton())
  })
})

// The test build has no mocks, so the rules status is gated off here (the gated-on page is
// RepositorySettingsPage.rules.test.tsx).
describe('RepositorySettingsPage: rules status off mocks', () => {
  it('sends no request when the rules API is gated off', async () => {
    const backend = stubBackend([UI_REPO])
    renderPage(settingsPath(UI_REPO.id))

    const block = await screen.findByRole('region', { name: 'Правила ревью' })
    expect(
      within(block).getByText('Статус правил появится, когда сервер начнёт его отдавать'),
    ).toBeTruthy()

    // Give a request the time it would need to start.
    await new Promise((resolve) => setTimeout(resolve, 20))
    const paths = backend.fetchMock.mock.calls.map(([input]) => urlOf(input).pathname)
    expect(paths.every((path) => !path.includes('rules-status'))).toBe(true)
    expect(paths).toEqual(['/api/repos'])
    expect(within(block).queryByRole('button')).toBeNull()
  })
})
