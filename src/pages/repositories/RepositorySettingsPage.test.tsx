// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { App, ConfigProvider } from 'antd'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  disabledRagIndex,
  REPOSITORIES_QUERY_KEY,
  type RagIndex,
  type Repository,
} from '../../entities/repository'
import { ragPollTimedOutText } from '../../features/repository-settings'
import { advance } from '../../test/advanceTimers'
import { RepositorySettingsPage } from './RepositorySettingsPage'

const UI_REPO: Repository = {
  provider: 'github',
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
  ragEnabled: false,
  ragIndex: disabledRagIndex,
}

const API_REPO: Repository = {
  provider: 'github',
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
  ragEnabled: false,
  ragIndex: disabledRagIndex,
}

// A repository whose branch filter is set.
const FULL_REPO: Repository = {
  ...UI_REPO,
  branchFilter: ['main', 'release/*'],
  severityThreshold: 'all',
}

// The GitHub App lost access: the api serves the stored preference as `enabled: false` (api PR #156).
const UNREACHABLE_REPO: Repository = { ...UI_REPO, enabled: false, installationAvailable: false }

const READY_SHA = 'f00dbabe0123456789abcdef0123456789abcdef'

// RAG on, its index published (api#145).
const RAG_READY_REPO: Repository = {
  ...UI_REPO,
  ragEnabled: true,
  ragIndex: {
    status: 'ready',
    indexedCommitSha: READY_SHA,
    indexedAt: '2026-10-20T08:15:30.000Z',
    fileCount: 214,
    symbolCount: 3187,
    lastErrorCode: null,
  },
}

// RAG on, the build stopped on a limit: no index is used, the code is shown as sent (api#145).
const RAG_FAILED_REPO: Repository = {
  ...UI_REPO,
  ragEnabled: true,
  ragIndex: { ...disabledRagIndex, status: 'failed', lastErrorCode: 'limit_exceeded:symbols' },
}

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
const SAVED_OFF_TEXT =
  'Выбор сохранён. Авто-ревью останется выключенным, когда доступ к GitHub App восстановится.'
// Regular expressions: antd adds an icon named «loading» to the name of a loading button.
const ENABLE_CHOICE_LABEL = /Включить авто-ревью/
const KEEP_OFF_CHOICE_LABEL = /Оставить выключенным/
const AUTO_REVIEW_ERROR_TITLE = 'Не удалось изменить автоматическое ревью'
const ENGLISH_422_MSG = 'String should match pattern'
const STALE_NOTICE = 'Не удалось обновить настройки. Показаны значения, загруженные ранее.'
const RETRY_LABEL = /Повторить попытку/
const DIFFERS_NOTICE =
  'На сервере сохранены другие значения. В форме — ваши правки поверх загруженных ранее.'
const LOAD_SERVER_LABEL = 'Загрузить значения с сервера'
const NEVER_OPTION = 'Никогда (запускать ревью без ожидания CI)'
const RADIO_ALL = 'All — critical, high, medium, low, info'
const RADIO_WARN = 'Warn & Crit — critical, high, medium, low'
const RADIO_CRIT = 'Only Critical — critical, high'

// The rules block of the page: every test of the page gets this answer unless it sets its own.
const PRESENT_RULES = {
  status: 'present',
  branch: 'release/2.1',
  path: '.review/rules.md',
  checkedAt: '2026-10-14T09:30:15.000Z',
  sha: '1111111aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  text: '# Rules',
  ignoreMasks: [],
  diagnostics: [],
}

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
  /** The repository ids GET /api/repos/{id}/rules-status was asked for; not counted in `gets`. */
  rulesRequests: string[]
  /** What the rules-status GET answers. */
  rulesStatus: Response
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
    rulesRequests: [],
    rulesStatus: new Response(JSON.stringify(PRESENT_RULES), { status: 200 }),
    fetchMock: vi.fn<typeof fetch>((input, init) => {
      const url = urlOf(input)
      const rules = /^\/api\/repos\/([^/]+)\/rules-status$/.exec(url.pathname)
      if (rules?.[1] !== undefined) {
        backend.rulesRequests.push(rules[1])
        return Promise.resolve(backend.rulesStatus.clone())
      }
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
          const stored = backend.repos.find((repo) => repo.id === id)
          const merged = { ...stored, ...body } as Repository
          // The api serves `enabled AND installationAvailable` (api PR #156, SD §6.9), and
          // `ragEnabled` the same way. A switch-on starts the index from `empty`, RAG off serves
          // it `disabled`, anything else keeps it (api#145, like `ragIndexAfterPatch` of the mocks).
          const ragEnabled = merged.ragEnabled && merged.installationAvailable
          const switchedOn = body.ragEnabled === true && stored?.ragEnabled !== true
          const saved: Repository = {
            ...merged,
            enabled: merged.enabled && merged.installationAvailable,
            ragEnabled,
            ragIndex: !ragEnabled
              ? { ...disabledRagIndex }
              : switchedOn
                ? { ...disabledRagIndex, status: 'empty' }
                : merged.ragIndex,
          }
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

/**
 * `withoutMotion` takes the antd animations off: a closed confirm then leaves the document at
 * once, where jsdom would keep it for the length of a leave animation that never ends.
 */
function renderPage(
  entry: string,
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  { withoutMotion = false }: { withoutMotion?: boolean } = {},
) {
  const router = createMemoryRouter(
    [
      {
        path: '/repositories/:repoId/settings',
        element: (
          <QueryClientProvider client={client}>
            <ConfigProvider theme={{ token: { motion: !withoutMotion } }}>
              <App>
                <RepositorySettingsPage />
              </App>
            </ConfigProvider>
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

function ragSwitch(): HTMLElement {
  return screen.getByRole('switch', { name: 'RAG' })
}

/** The RAG section: the switch, the hint and the status of the index. */
function ragSection(): HTMLElement {
  return screen.getByRole('region', { name: 'RAG' })
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

function cancelButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Отменить изменения' })
}

/** The state of every blocker the router holds (the page registers one). */
function blockerStates(router: { state: { blockers: Map<string, { state: string }> } }): string[] {
  return [...router.state.blockers.values()].map((blocker) => blocker.state)
}

const LEAVE_TITLE = 'Уйти без сохранения?'
const LEAVE_TEXT = 'Изменения настроек не сохранены и пропадут.'

/** The confirm that asks before the page is left with a draft. */
function leaveDialog(): HTMLElement {
  return screen.getByRole('dialog', { name: LEAVE_TITLE })
}

function leaveDialogButton(name: string): HTMLElement {
  return within(leaveDialog()).getByRole('button', { name })
}

function retryButton(): HTMLElement {
  return screen.getByRole('button', { name: RETRY_LABEL })
}

function loadServerButton(): HTMLElement {
  return screen.getByRole('button', { name: LOAD_SERVER_LABEL })
}

/**
 * Opens the settings of `repository` from a cached list (limit 3) while the refetch on open
 * fails; the server has moved on to `serverMaxComments` (7, unless told otherwise) by the time
 * anyone retries.
 */
async function openWithFailedRefresh(
  repository: Repository = UI_REPO,
  serverMaxComments = 7,
): Promise<{ backend: Backend; client: QueryClient }> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  client.setQueryData(REPOSITORIES_QUERY_KEY, [{ ...repository, maxComments: 3 }])
  const backend = stubBackend([{ ...repository, maxComments: serverMaxComments }])
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
  it('uses the Bitbucket provider in settings and unavailable-access guidance', async () => {
    const repository: Repository = {
      ...UI_REPO,
      provider: 'bitbucket',
      fullName: 'private-space/private-repo',
      url: 'https://bitbucket.org/private-space/private-repo',
      enabled: false,
      installationAvailable: false,
    }
    stubBackend([repository])
    renderPage(settingsPath(repository.id))
    expect(await screen.findByText('private-space/private-repo')).toBeTruthy()
    expect(screen.getByText('Bitbucket')).toBeTruthy()
    expect(screen.getByText(/У Bitbucket Cloud нет доступа к этому репозиторию/)).toBeTruthy()
    expect(screen.getByText('Нет доступа Bitbucket Cloud — RAG недоступен')).toBeTruthy()
    expect(screen.queryByText(/GitHub App/)).toBeNull()
  })

  it('opens the settings of the repository from the URL', async () => {
    const backend = stubBackend([UI_REPO, API_REPO])

    renderPage(settingsPath(UI_REPO.id))

    expect(await screen.findByRole('heading', { name: 'Настройки репозитория' })).toBeTruthy()
    expect(screen.getByText('larchanka-training/dmc-268-ui-t6')).toBeTruthy()
    expect(inputValue(LIMIT_LABEL)).toBe('10')
    expect(selectedText(CI_LABEL)).toBe('Авто (ожидать CI при наличии проверок)')
    expect(selectedText(VERDICT_LABEL)).toBe('Комментарий (при любых замечаниях)')
    expect(saveButton().disabled).toBe(true)
    // The repository comes from the list: no request of its own. The rules block asks for its status.
    await waitFor(() => {
      expect(backend.rulesRequests).toEqual([UI_REPO.id])
    })
    expect(backend.fetchMock.mock.calls.map(([input]) => urlOf(input).pathname)).toEqual([
      '/api/repos',
      `/api/repos/${UI_REPO.id}/rules-status`,
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

    const errorText = await screen.findByText(SERVER_500_TEXT)
    expect(screen.queryByLabelText(LIMIT_LABEL)).toBeNull()
    // Browser round 9, 5c: the button is under the error text, in the description, and not in the
    // `action` slot, which lays an Alert out as a row beside the text (antd 6 names it
    // `ant-alert-actions`).
    expect(errorText.closest('.ant-alert')?.querySelector('.ant-alert-actions')).toBeNull()
    const retry = retryButton()
    expect(retry.closest('.ant-alert-description')).not.toBeNull()
    expect(retry.closest('.ant-alert-description')).toBe(
      errorText.closest('.ant-alert-description'),
    )
    expect(errorText.compareDocumentPosition(retry) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(retry.className).toContain('ant-btn-primary')

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

  it('lets «Отменить изменения» undo an emptied limit that «Сохранить» cannot send', async () => {
    const backend = stubBackend([UI_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '' } })

    // Emptying the limit is a draft (Cancel can undo it) but no change a PATCH could carry.
    expect(inputValue(LIMIT_LABEL)).toBe('')
    expect(saveButton().disabled).toBe(true)
    expect(cancelButton().disabled).toBe(false)

    fireEvent.click(cancelButton())

    await waitFor(() => {
      expect(inputValue(LIMIT_LABEL)).toBe('10')
    })
    expect(cancelButton().disabled).toBe(true)
    expect(saveButton().disabled).toBe(true)
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
    // The rules block has a Skeleton of its own until its status arrives.
    await screen.findByText('Файл найден')
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
    // Browser round 9, 5c: the button is under the text, in the description, and not in the
    // `action` slot, which lays an Alert out as a row beside the text (antd 6 names it
    // `ant-alert-actions`).
    expect(notice.closest('.ant-alert')?.querySelector('.ant-alert-actions')).toBeNull()
    expect(retryButton().closest('.ant-alert')).toBe(notice.closest('.ant-alert'))
    expect(retryButton().closest('.ant-alert-description')).not.toBeNull()
    expect(
      notice.compareDocumentPosition(retryButton()) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
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

    // The draft would be lost with the form of this repository: the page asks first.
    act(() => {
      void router.navigate(settingsPath(API_REPO.id))
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Уйти' }))

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
    await waitFor(() => {
      expect(inputValue(LIMIT_LABEL)).toBe('7')
      expect(saveButton().disabled).toBe(true)
    })
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText(CI_LABEL))
    })
  })

  it('keeps what was typed, and says the server holds other values, when the retry succeeds', async () => {
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
    // The server holds limit 7, the form was opened with 3: the draft stays over old values.
    expect(screen.getByText(DIFFERS_NOTICE)).toBeTruthy()
    expect(loadServerButton()).toBeTruthy()
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
    // The draft stays over old values, and the page says so.
    expect(screen.getByText(DIFFERS_NOTICE)).toBeTruthy()
    expect(loadServerButton()).toBeTruthy()
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
    // The draft stays over old values, and the page says so.
    expect(screen.getByText(DIFFERS_NOTICE)).toBeTruthy()
    expect(loadServerButton()).toBeTruthy()
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

  it('brings the fresh values into an untouched form, without remounting it, when a background refetch succeeds', async () => {
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
    await settle()
    // The fields are the ones the user was looking at, with the server's values.
    expect(screen.getByLabelText(LIMIT_LABEL)).toBe(limit)
    expect(limit.value).toBe('7')
    expect(saveButton().disabled).toBe(true)
    expect(screen.queryByText(DIFFERS_NOTICE)).toBeNull()
  })

  it('keeps the focus of a field of an untouched form when a background refetch brings fresh values', async () => {
    const { backend, client } = await openWithFailedRefresh()
    const limit = screen.getByLabelText<HTMLInputElement>(LIMIT_LABEL)
    limit.focus()

    backend.failList = false
    await act(async () => {
      await client.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY })
    })

    await waitFor(() => {
      expect(screen.queryByText(STALE_NOTICE)).toBeNull()
    })
    await settle()
    expect(screen.getByLabelText(LIMIT_LABEL)).toBe(limit)
    expect(limit.value).toBe('7')
    expect(document.activeElement).toBe(limit)
  })

  it('brings the fresh values and moves focus to the first field when a background refetch takes away the notice and the retry had the focus', async () => {
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
    // Without a remount, and with the server's values.
    expect(screen.getByLabelText(LIMIT_LABEL)).toBe(limit)
    expect(limit.value).toBe('7')
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

  it('keeps the draft over the old values and says the server holds other ones when a background refetch brings them', async () => {
    const { backend, client } = await openWithFailedRefresh()
    await chooseOption(CI_LABEL, NEVER_OPTION)

    backend.failList = false
    await act(async () => {
      await client.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY })
    })

    await waitFor(() => {
      expect(screen.queryByText(STALE_NOTICE)).toBeNull()
    })
    const notice = screen.getByText(DIFFERS_NOTICE)
    expect(notice.closest('.ant-alert')?.classList.contains('ant-alert-info')).toBe(true)
    expect(loadServerButton().className).not.toContain('ant-btn-primary')
    // The draft stays as typed; the untouched fields keep the values they were opened with.
    expect(selectedText(CI_LABEL)).toBe(NEVER_OPTION)
    expect(inputValue(LIMIT_LABEL)).toBe('3')
    expect(saveButton().disabled).toBe(false)
  })

  it('shows no notice when a background refetch brings the values the form was opened with, draft or not', async () => {
    const { backend, client } = await openWithFailedRefresh(UI_REPO, 3)
    await chooseOption(CI_LABEL, NEVER_OPTION)

    backend.failList = false
    await act(async () => {
      await client.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY })
    })

    await waitFor(() => {
      expect(screen.queryByText(STALE_NOTICE)).toBeNull()
    })
    await settle()
    expect(screen.queryByText(DIFFERS_NOTICE)).toBeNull()
    expect(screen.queryByRole('button', { name: LOAD_SERVER_LABEL })).toBeNull()
    expect(selectedText(CI_LABEL)).toBe(NEVER_OPTION)
    expect(saveButton().disabled).toBe(false)
  })

  it('moves the focus of the retry to «Загрузить значения с сервера» when the notice that replaces it says the server holds other values', async () => {
    const { backend } = await openWithFailedRefresh()
    await chooseOption(CI_LABEL, NEVER_OPTION)

    backend.failList = false
    const retry = retryButton()
    retry.focus()
    fireEvent.click(retry)

    await waitFor(() => {
      expect(screen.queryByText(STALE_NOTICE)).toBeNull()
    })
    await waitFor(() => {
      expect(document.activeElement).toBe(loadServerButton())
    })
    expect(screen.getByText(DIFFERS_NOTICE)).toBeTruthy()
    expect(selectedText(CI_LABEL)).toBe(NEVER_OPTION)
  })

  describe('when the server holds other values than the draft was typed over', () => {
    /** A draft (the CI wait), then a background refetch that brings limit 7: the info notice. */
    async function openWithDraftOverOtherValues() {
      const opened = await openWithFailedRefresh()
      await chooseOption(CI_LABEL, NEVER_OPTION)
      opened.backend.failList = false
      await act(async () => {
        await opened.client.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY })
      })
      await screen.findByText(DIFFERS_NOTICE)
      return opened
    }

    it('puts the server values into every field, closes the notice and focuses the first field on «Загрузить значения с сервера»', async () => {
      await openWithDraftOverOtherValues()
      expect(inputValue(LIMIT_LABEL)).toBe('3')

      const button = loadServerButton()
      button.focus()
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.queryByText(DIFFERS_NOTICE)).toBeNull()
      })
      expect(inputValue(LIMIT_LABEL)).toBe('7')
      expect(selectedText(CI_LABEL)).toBe('Авто (ожидать CI при наличии проверок)')
      expect(saveButton().disabled).toBe(true)
      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByLabelText(CI_LABEL))
      })
    })

    it('loads the server values, not the old ones, on «Отменить изменения»', async () => {
      await openWithDraftOverOtherValues()

      fireEvent.click(screen.getByRole('button', { name: 'Отменить изменения' }))

      await waitFor(() => {
        expect(screen.queryByText(DIFFERS_NOTICE)).toBeNull()
      })
      expect(inputValue(LIMIT_LABEL)).toBe('7')
      expect(selectedText(CI_LABEL)).toBe('Авто (ожидать CI при наличии проверок)')
      expect(saveButton().disabled).toBe(true)
      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByLabelText(CI_LABEL))
      })
    })

    it('closes the notice after a successful save and sends only what was changed', async () => {
      const { backend } = await openWithDraftOverOtherValues()

      fireEvent.click(saveButton())

      await waitFor(() => {
        expect(backend.patches).toHaveLength(1)
      })
      expect(backend.patches[0]).toEqual({ id: UI_REPO.id, body: { waitForCi: 'never' } })
      await waitFor(() => {
        expect(screen.queryByText(DIFFERS_NOTICE)).toBeNull()
      })
      await waitFor(() => {
        expect(saveButton().disabled).toBe(true)
      })
      expect(inputValue(LIMIT_LABEL)).toBe('7')
    })

    it('loads the server values on «Отменить изменения» while an auto-review toggle is being saved', async () => {
      const { backend } = await openWithDraftOverOtherValues()
      let release = (): void => undefined
      backend.patchGate = new Promise<void>((resolve) => {
        release = resolve
      })
      fireEvent.click(autoReviewSwitch())
      await waitFor(() => {
        expect(backend.patches).toHaveLength(1)
      })
      await settle()

      // The toggle's optimistic copy touches no field of the form, so Cancel is not held back by it.
      fireEvent.click(screen.getByRole('button', { name: 'Отменить изменения' }))

      await waitFor(() => {
        expect(screen.queryByText(DIFFERS_NOTICE)).toBeNull()
      })
      expect(inputValue(LIMIT_LABEL)).toBe('7')
      expect(selectedText(CI_LABEL)).toBe('Авто (ожидать CI при наличии проверок)')
      expect(saveButton().disabled).toBe(true)
      release()
    })

    it('keeps «Загрузить значения с сервера» disabled while a save runs, and enabled again when the save fails', async () => {
      const { backend } = await openWithDraftOverOtherValues()
      backend.failPatch = true
      let release = (): void => undefined
      backend.patchGate = new Promise<void>((resolve) => {
        release = resolve
      })

      fireEvent.click(saveButton())
      await waitFor(() => {
        expect(backend.patches).toHaveLength(1)
      })
      await settle()

      // The cache holds the optimistic copy of the patch, which the server has not confirmed: the
      // button must not load it.
      expect(loadServerButton().hasAttribute('disabled')).toBe(true)
      fireEvent.click(loadServerButton())
      expect(inputValue(LIMIT_LABEL)).toBe('3')
      expect(selectedText(CI_LABEL)).toBe(NEVER_OPTION)
      expect(screen.getByText(DIFFERS_NOTICE)).toBeTruthy()

      release()
      expect(await screen.findByText(SERVER_500_TEXT)).toBeTruthy()
      await waitFor(() => {
        expect(loadServerButton().hasAttribute('disabled')).toBe(false)
      })
      // By a pattern: the loading icon of a save that was held stays in the name in jsdom.
      expect(screen.getByRole<HTMLButtonElement>('button', { name: /Сохранить/ }).disabled).toBe(
        false,
      )
      // The draft, the notice and the old baseline are all still there: the failed save changed
      // nothing, and the form holds no value the server does not.
      expect(screen.getByText(DIFFERS_NOTICE)).toBeTruthy()
      expect(inputValue(LIMIT_LABEL)).toBe('3')
      expect(selectedText(CI_LABEL)).toBe(NEVER_OPTION)
      expect(backend.patches).toEqual([{ id: UI_REPO.id, body: { waitForCi: 'never' } }])
    })

    it('keeps «Загрузить значения с сервера» disabled while a save is still running after a toggle settles', async () => {
      const { backend } = await openWithDraftOverOtherValues()
      // The form's save is held and will fail; the switch's choice is answered at once.
      backend.failPatch = true
      let release = (): void => undefined
      backend.patchGate = new Promise<void>((resolve) => {
        release = resolve
      })
      fireEvent.click(saveButton())
      await waitFor(() => {
        expect(backend.patches).toHaveLength(1)
      })
      backend.failPatch = false
      backend.patchGate = null
      fireEvent.click(autoReviewSwitch())
      await waitFor(() => {
        expect(backend.patches).toHaveLength(2)
      })
      await settle()
      // The choice has settled, the save has not: the cache still holds the save's optimistic copy.
      expect(loadServerButton().hasAttribute('disabled')).toBe(true)
      release()
      expect(await screen.findByText(SERVER_500_TEXT)).toBeTruthy()
      await waitFor(() => {
        expect(loadServerButton().hasAttribute('disabled')).toBe(false)
      })
    })
  })

  it('keeps the stale warning, and says nothing about other values, while a save runs and after it fails', async () => {
    const { backend } = await openWithFailedRefresh()
    await chooseOption(CI_LABEL, NEVER_OPTION)
    backend.failPatch = true
    let release = (): void => undefined
    backend.patchGate = new Promise<void>((resolve) => {
      release = resolve
    })

    fireEvent.click(saveButton())
    await waitFor(() => {
      expect(backend.patches).toHaveLength(1)
    })
    await settle()

    // The optimistic copy in the cache is not an answer of the server: it takes no warning away.
    expect(screen.getByText(STALE_NOTICE)).toBeTruthy()
    expect(screen.queryByText(DIFFERS_NOTICE)).toBeNull()

    release()
    expect(await screen.findByText(SERVER_500_TEXT)).toBeTruthy()
    await settle()

    // The list still fails to load, so the failed save has not brought a fresh answer either.
    expect(screen.getByText(STALE_NOTICE)).toBeTruthy()
    expect(screen.queryByText(DIFFERS_NOTICE)).toBeNull()
    expect(selectedText(CI_LABEL)).toBe(NEVER_OPTION)
  })

  it('refreshes the untouched fields from the answer to a save made over stale values', async () => {
    // The form shows limit 3, the server holds 7, and the list still fails to load.
    const { backend } = await openWithFailedRefresh()
    await chooseOption(CI_LABEL, NEVER_OPTION)

    fireEvent.click(saveButton())

    await waitFor(() => {
      expect(backend.patches).toHaveLength(1)
    })
    // The limit was not edited: it must not travel with the save.
    expect(backend.patches[0]).toEqual({ id: UI_REPO.id, body: { waitForCi: 'never' } })
    await waitFor(() => {
      expect(inputValue(LIMIT_LABEL)).toBe('7')
    })
    expect(selectedText(CI_LABEL)).toBe(NEVER_OPTION)
    // The baseline is the answer, and so are the fields: nothing is left to save.
    expect(saveButton().disabled).toBe(true)
    expect(screen.queryByText(STALE_NOTICE)).toBeNull()
    expect(screen.queryByText(DIFFERS_NOTICE)).toBeNull()
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

  it('explains why auto-review will not run and offers the two choices when installationAvailable is false', async () => {
    const backend = stubBackend([UNREACHABLE_REPO])
    renderPage(settingsPath(UI_REPO.id))

    expect(await screen.findByText(/у GitHub App нет доступа к этому репозиторию/i)).toBeTruthy()
    expect(screen.getByText(/автоматическое ревью не запустится/i)).toBeTruthy()
    expect(
      screen.getByText(/сохранённый выбор здесь не показывается, пока доступа нет/i),
    ).toBeTruthy()
    expect(screen.queryByText(/переключатель сохраняет выбор/i)).toBeNull()
    expect(screen.getByRole('button', { name: ENABLE_CHOICE_LABEL })).toBeTruthy()
    expect(screen.getByRole('button', { name: KEEP_OFF_CHOICE_LABEL })).toBeTruthy()

    // The switch shows what the server says and cannot be used: the choice is made in the warning.
    expect(autoReviewSwitch().getAttribute('aria-checked')).toBe('false')
    expect(autoReviewSwitch().hasAttribute('disabled')).toBe(true)
    expect(backend.patches).toEqual([])
  })

  it('saves the choice both ways without GitHub App access, and the switch stays off and disabled', async () => {
    const backend = stubBackend([UNREACHABLE_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.click(screen.getByRole('button', { name: ENABLE_CHOICE_LABEL }))

    const turnedOn = await screen.findByText(SAVED_FOR_LATER_TEXT)
    expect(turnedOn.closest('.ant-message-info')).not.toBeNull()
    expect(backend.patches).toEqual([{ id: UI_REPO.id, body: { enabled: true } }])
    expect(autoReviewSwitch().getAttribute('aria-checked')).toBe('false')
    expect(autoReviewSwitch().hasAttribute('disabled')).toBe(true)
    // It is no error and not the usual toast.
    expect(screen.queryByText(AUTO_REVIEW_ERROR_TITLE)).toBeNull()
    expect(screen.queryByText('Автоматическое ревью включено')).toBeNull()
    // Still one warning, and the next load agrees with the answer.
    expect(screen.getAllByText(/у GitHub App нет доступа к этому репозиторию/i)).toHaveLength(1)
    expect(backend.repos[0]?.enabled).toBe(false)
    await waitFor(() => {
      expect(
        screen.getByRole<HTMLButtonElement>('button', { name: KEEP_OFF_CHOICE_LABEL }).disabled,
      ).toBe(false)
    })

    fireEvent.click(screen.getByRole('button', { name: KEEP_OFF_CHOICE_LABEL }))

    const keptOff = await screen.findByText(SAVED_OFF_TEXT)
    expect(keptOff.closest('.ant-message-info')).not.toBeNull()
    expect(backend.patches).toEqual([
      { id: UI_REPO.id, body: { enabled: true } },
      { id: UI_REPO.id, body: { enabled: false } },
    ])
    expect(autoReviewSwitch().getAttribute('aria-checked')).toBe('false')
    expect(autoReviewSwitch().hasAttribute('disabled')).toBe(true)
    expect(screen.queryByText('Автоматическое ревью выключено')).toBeNull()
    expect(screen.queryByText(AUTO_REVIEW_ERROR_TITLE)).toBeNull()
  })

  it('keeps the switch off, not loading and disabled while the choice is being saved', async () => {
    // The optimistic update keeps the served `enabled` (off) for this repository; the switch must
    // not show the choice either way.
    const backend = stubBackend([UNREACHABLE_REPO])
    let release = (): void => undefined
    backend.patchGate = new Promise<void>((resolve) => {
      release = resolve
    })
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.click(screen.getByRole('button', { name: ENABLE_CHOICE_LABEL }))
    await waitFor(() => {
      expect(backend.patches).toHaveLength(1)
    })

    expect(autoReviewSwitch().getAttribute('aria-checked')).toBe('false')
    expect(autoReviewSwitch().hasAttribute('disabled')).toBe(true)
    expect(autoReviewSwitch().className).not.toContain('ant-switch-loading')

    release()
    await screen.findByText(SAVED_FOR_LATER_TEXT)
    expect(autoReviewSwitch().getAttribute('aria-checked')).toBe('false')
  })

  it('shows the error under the warning when the choice cannot be saved', async () => {
    const backend = stubBackend([UNREACHABLE_REPO])
    backend.failPatch = true
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.click(screen.getByRole('button', { name: KEEP_OFF_CHOICE_LABEL }))

    expect(await screen.findByText(AUTO_REVIEW_ERROR_TITLE)).toBeTruthy()
    expect(screen.getByText(SERVER_500_TEXT)).toBeTruthy()
    expect(screen.queryByText(SAVED_OFF_TEXT)).toBeNull()
    expect(backend.patches).toEqual([{ id: UI_REPO.id, body: { enabled: false } }])
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

  it('tells that the choice is saved, not applied, when the switch is turned off and GitHub App access is gone', async () => {
    // The switch is on, then the access goes: the answer to «off» carries installationAvailable
    // false. Whatever the user chose, the access decides, and the message says that it is kept.
    const backend = stubBackend([UI_REPO])
    backend.patchResponse = () =>
      new Response(JSON.stringify({ ...UI_REPO, enabled: false, installationAvailable: false }), {
        status: 200,
      })
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)
    expect(autoReviewSwitch().getAttribute('aria-checked')).toBe('true')

    fireEvent.click(autoReviewSwitch())

    const message = await screen.findByText(SAVED_OFF_TEXT)
    expect(message.closest('.ant-message-info')).not.toBeNull()
    expect(backend.patches).toEqual([{ id: UI_REPO.id, body: { enabled: false } }])
    expect(screen.queryByText('Автоматическое ревью выключено')).toBeNull()
    expect(screen.queryByText(SAVED_FOR_LATER_TEXT)).toBeNull()
    expect(screen.queryByText(AUTO_REVIEW_ERROR_TITLE)).toBeNull()
  })

  it('keeps the focus on the clicked choice button when the choice is saved without GitHub App access', async () => {
    const backend = stubBackend([UNREACHABLE_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)
    const keepOff = screen.getByRole<HTMLButtonElement>('button', { name: KEEP_OFF_CHOICE_LABEL })
    const observer = dropFocusWhenDisabled(keepOff)
    try {
      keepOff.focus()

      fireEvent.click(keepOff)
      await screen.findByText(SAVED_OFF_TEXT)

      expect(backend.patches).toHaveLength(1)
      await waitFor(() => {
        expect(document.activeElement).toBe(keepOff)
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

describe('RepositorySettingsPage: RAG', () => {
  it('switches RAG on at once with PATCH {ragEnabled} only', async () => {
    const backend = stubBackend([UI_REPO, API_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)
    expect(ragSwitch().getAttribute('aria-checked')).toBe('false')
    expect(within(ragSection()).getByText('Выключен')).toBeTruthy()

    // An unsaved edit of the form must not travel with the switch.
    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })
    fireEvent.click(ragSwitch())

    const toast = await screen.findByText('RAG включён')
    expect(toast.closest('.ant-message-success')).not.toBeNull()
    expect(backend.patches).toEqual([{ id: UI_REPO.id, body: { ragEnabled: true } }])
    expect(ragSwitch().getAttribute('aria-checked')).toBe('true')
    // The server has no index for it yet.
    expect(await within(ragSection()).findByText('Не построен')).toBeTruthy()
    expect(inputValue(LIMIT_LABEL)).toBe('5')
    expect(saveButton().disabled).toBe(false)
  })

  it('switches RAG off with PATCH {ragEnabled: false} and drops the index from the status', async () => {
    const backend = stubBackend([RAG_READY_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)
    expect(ragSwitch().getAttribute('aria-checked')).toBe('true')

    fireEvent.click(ragSwitch())

    const toast = await screen.findByText('RAG выключен')
    expect(toast.closest('.ant-message-success')).not.toBeNull()
    expect(backend.patches).toEqual([{ id: UI_REPO.id, body: { ragEnabled: false } }])
    expect(ragSwitch().getAttribute('aria-checked')).toBe('false')
    expect(within(ragSection()).getByText('Выключен')).toBeTruthy()
    expect(within(ragSection()).queryByText(READY_SHA.slice(0, 7))).toBeNull()
  })

  it('shows the error in the section and rolls the switch back when PATCH fails', async () => {
    const backend = stubBackend([UI_REPO])
    backend.failPatch = true
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)
    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })

    fireEvent.click(ragSwitch())

    const section = ragSection()
    expect(await within(section).findByText(SERVER_500_TEXT)).toBeTruthy()
    expect(within(section).getByText('Не удалось изменить настройку RAG')).toBeTruthy()
    expect(backend.patches).toEqual([{ id: UI_REPO.id, body: { ragEnabled: true } }])
    await waitFor(() => {
      expect(ragSwitch().getAttribute('aria-checked')).toBe('false')
    })
    expect(within(section).getByText('Выключен')).toBeTruthy()
    expect(screen.queryByText('RAG включён')).toBeNull()
    // The failed switch holds nothing back: the draft can be saved.
    await waitFor(() => {
      expect(saveButton().disabled).toBe(false)
    })
  })

  it('keeps the switch off and disabled without GitHub App access, and says why', async () => {
    const backend = stubBackend([UNREACHABLE_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    const section = ragSection()
    expect(ragSwitch().getAttribute('aria-checked')).toBe('false')
    expect(ragSwitch().hasAttribute('disabled')).toBe(true)
    expect(within(section).getByText('Нет доступа GitHub App — RAG недоступен')).toBeTruthy()
    expect(within(section).getByText('Выключен')).toBeTruthy()
    expect(backend.patches).toEqual([])
  })

  it('shows the commit and the time of a ready index', async () => {
    stubBackend([RAG_READY_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    const section = ragSection()
    expect(ragSwitch().getAttribute('aria-checked')).toBe('true')
    expect(within(section).getByText('Готов')).toBeTruthy()
    expect(within(section).getByText(READY_SHA.slice(0, 7)).tagName).toBe('CODE')
    expect(within(section).getByText('обновлён 20.10.2026, 08:15:30')).toBeTruthy()
    expect(section.textContent).not.toContain('UTC')
  })

  it('shows the error code of a failed index as the server sent it', async () => {
    stubBackend([RAG_FAILED_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    const section = ragSection()
    expect(within(section).getByText('Ошибка')).toBeTruthy()
    expect(within(section).getByText('limit_exceeded:symbols').tagName).toBe('CODE')
  })

  // Fake timers: `findBy*`, `waitFor` and the helpers built on them would wait for timers that
  // only `advance` moves. The page is read with `getBy*` after an `advance`.
  describe('polling of the index status', () => {
    /** What the next GET answers for the index of the first repository. */
    function serveIndex(backend: Backend, ragIndex: RagIndex): void {
      backend.repos = backend.repos.map((repo, i) => (i === 0 ? { ...repo, ragIndex } : repo))
    }

    afterEach(() => {
      vi.useRealTimers()
    })

    it('polls every 5 s after a switch-on and stops once the index is ready', async () => {
      vi.useFakeTimers()
      const backend = stubBackend([UI_REPO])
      renderPage(settingsPath(UI_REPO.id))
      await advance(0)
      expect(within(ragSection()).getByText('Выключен')).toBeTruthy()

      fireEvent.click(ragSwitch())
      await advance(0)
      expect(backend.patches).toEqual([{ id: UI_REPO.id, body: { ragEnabled: true } }])
      // The PATCH answers an index nobody has built yet, and the refetch after it says the same.
      expect(within(ragSection()).getByText('Не построен')).toBeTruthy()
      const afterSwitchOn = backend.gets

      serveIndex(backend, { ...disabledRagIndex, status: 'building' })
      await advance(4999)
      expect(backend.gets).toBe(afterSwitchOn)
      await advance(1)
      expect(backend.gets).toBe(afterSwitchOn + 1)
      // TanStack hands the answer to the page from a zero-delay timer set once the request is over.
      await advance(1)
      expect(within(ragSection()).getByText('Строится…')).toBeTruthy()

      serveIndex(backend, RAG_READY_REPO.ragIndex)
      await advance(4998)
      expect(backend.gets).toBe(afterSwitchOn + 1)
      await advance(1)
      expect(backend.gets).toBe(afterSwitchOn + 2)
      await advance(1)
      expect(within(ragSection()).getByText('Готов')).toBeTruthy()
      expect(within(ragSection()).getByText(READY_SHA.slice(0, 7))).toBeTruthy()

      // A published index is final: no request however long the page stays open.
      await advance(60_000)
      expect(backend.gets).toBe(afterSwitchOn + 2)
    })

    it('stops polling a build that is not over after 120 s, and says so', async () => {
      vi.useFakeTimers()
      const backend = stubBackend([
        { ...UI_REPO, ragEnabled: true, ragIndex: { ...disabledRagIndex, status: 'building' } },
      ])
      renderPage(settingsPath(UI_REPO.id))
      await advance(0)
      expect(within(ragSection()).getByText('Строится…')).toBeTruthy()
      expect(within(ragSection()).queryByText(ragPollTimedOutText())).toBeNull()
      const opened = backend.gets

      await advance(119_999)
      expect(within(ragSection()).queryByText(ragPollTimedOutText())).toBeNull()
      // A poll every 5 s inside the window: 23 of them, none at its end.
      expect(backend.gets).toBe(opened + 23)
      await advance(1)
      expect(within(ragSection()).getByText(ragPollTimedOutText())).toBeTruthy()
      expect(backend.gets).toBe(opened + 23)

      await advance(60_000)
      expect(backend.gets).toBe(opened + 23)
    })
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

  it('names the line and the reason of a refused mask and sends nothing', async () => {
    const backend = stubBackend([FULL_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    // The refused mask is on line 3 of the text, after a blank line.
    fireEvent.change(branchFilterField(), { target: { value: 'main\n\nrelease..x' } })
    fireEvent.click(saveButton())

    expect(await screen.findByText('Маска в строке 3: «..» и «//» недопустимы')).toBeTruthy()
    expect(backend.patches).toEqual([])
    expect(branchFilterField().value).toBe('main\n\nrelease..x')

    // Fixing the line takes the message away and lets the save through.
    fireEvent.change(branchFilterField(), { target: { value: 'main\n\nrelease.x' } })
    await waitFor(() => {
      expect(screen.queryByText(/Маска в строке/)).toBeNull()
    })
    fireEvent.click(saveButton())
    await waitFor(() => {
      expect(backend.patches).toEqual([
        { id: UI_REPO.id, body: { branchFilter: ['main', 'release.x'] } },
      ])
    })
  })

  // The client judges the grammar itself; the 422 of api PR #156 is the fallback for a mask it
  // accepts and the server does not (the two rules drifted).
  it('shows the 422 of api PR #156 under the branch filter and keeps the masks', async () => {
    const backend = stubBackend([FULL_REPO])
    // The body as FastAPI renders a ValueError of the list validator: the whole field is the
    // location, there is no mask index, and `msg` is English.
    backend.patchResponse = unprocessable([
      {
        type: 'value_error',
        loc: ['body', 'branchFilter'],
        msg: "Value error, branch pattern 'feature/new' is not accepted",
        input: ['main', 'feature/new'],
        ctx: { error: {} },
      },
    ])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(branchFilterField(), { target: { value: 'main\nfeature/new' } })
    fireEvent.click(saveButton())

    const field = branchFilterField().closest<HTMLElement>('.ant-form-item')
    if (field === null) {
      throw new Error('the branch filter has no form item')
    }
    expect(await within(field).findByText('Сервер не принял значение')).toBeTruthy()
    expect(backend.patches).toEqual([
      { id: UI_REPO.id, body: { branchFilter: ['main', 'feature/new'] } },
    ])
    // The server's English text is never shown and nothing is reported above the form.
    expect(screen.queryByText(/Value error/)).toBeNull()
    expect(screen.queryByText('Не удалось сохранить настройки')).toBeNull()
    expect(screen.queryByText(/Маска в строке/)).toBeNull()
    expect(branchFilterField().value).toBe('main\nfeature/new')
    expect(saveButton().disabled).toBe(false)

    // Editing the field takes the server's complaint away.
    fireEvent.change(branchFilterField(), { target: { value: 'main\nfeature/old' } })
    await waitFor(() => {
      expect(screen.queryByText('Сервер не принял значение')).toBeNull()
    })
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
    expect(screen.getByText('Сервер не принял значение')).toBeTruthy()
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

  it('lets «Отменить изменения» undo a branch filter edited only by whitespace', async () => {
    const backend = stubBackend([FULL_REPO])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    // A blank line and trailing spaces: the same two masks, so no PATCH, but the text differs.
    fireEvent.change(branchFilterField(), { target: { value: 'main\n\nrelease/*  ' } })

    expect(branchFilterField().value).toBe('main\n\nrelease/*  ')
    expect(saveButton().disabled).toBe(true)
    expect(cancelButton().disabled).toBe(false)

    fireEvent.click(cancelButton())

    await waitFor(() => {
      expect(branchFilterField().value).toBe('main\nrelease/*')
    })
    expect(cancelButton().disabled).toBe(true)
    expect(backend.patches).toEqual([])
  })

  it('takes the 422 under the branch filter away on «Отменить изменения»', async () => {
    const backend = stubBackend([FULL_REPO])
    backend.patchResponse = unprocessable([
      { loc: ['body', 'branchFilter'], msg: ENGLISH_422_MSG, type: 'value_error' },
    ])
    renderPage(settingsPath(UI_REPO.id))
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.change(branchFilterField(), { target: { value: 'main\nfeature/new' } })
    fireEvent.click(saveButton())
    expect(await screen.findByText('Сервер не принял значение')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Отменить изменения' }))

    await waitFor(() => {
      expect(screen.queryByText('Сервер не принял значение')).toBeNull()
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

describe('RepositorySettingsPage: leaving with a draft', () => {
  const RUNS_SEARCH = '?repo=larchanka-training%2Fdmc-268-ui-t6'

  function renderLeavingPage() {
    return renderPage(
      settingsPath(UI_REPO.id),
      new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      { withoutMotion: true },
    )
  }

  it('asks before leaving with a draft, and «Остаться» keeps the page and the draft', async () => {
    stubBackend([UI_REPO])
    const { router } = renderLeavingPage()
    await screen.findByLabelText(LIMIT_LABEL)
    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })

    fireEvent.click(screen.getByRole('link', { name: 'История проверок' }))

    expect(await screen.findByRole('dialog', { name: LEAVE_TITLE })).toBeTruthy()
    // One dialog for one block.
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(within(leaveDialog()).getByText(LEAVE_TEXT)).toBeTruthy()
    // The danger button of the design system (outlined), not a second primary next to «Сохранить».
    const leave = leaveDialogButton('Уйти')
    expect(leave.classList.contains('ant-btn-color-dangerous')).toBe(true)
    expect(leave.classList.contains('ant-btn-variant-outlined')).toBe(true)
    expect(screen.queryByTestId('runs-route')).toBeNull()

    fireEvent.click(leaveDialogButton('Остаться'))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: LEAVE_TITLE })).toBeNull()
    })
    expect(blockerStates(router)).toEqual(['unblocked'])
    expect(router.state.location.pathname).toBe(settingsPath(UI_REPO.id))
    expect(screen.queryByTestId('runs-route')).toBeNull()
    expect(inputValue(LIMIT_LABEL)).toBe('5')
    expect(saveButton().disabled).toBe(false)
  })

  it('leaves for the run history on «Уйти»', async () => {
    stubBackend([UI_REPO])
    const { router } = renderLeavingPage()
    await screen.findByLabelText(LIMIT_LABEL)
    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })

    fireEvent.click(screen.getByRole('link', { name: 'История проверок' }))
    await screen.findByRole('dialog', { name: LEAVE_TITLE })
    fireEvent.click(leaveDialogButton('Уйти'))

    expect(await screen.findByTestId('runs-route')).toBeTruthy()
    expect(router.state.location.pathname).toBe('/runs')
    expect(router.state.location.search).toBe(RUNS_SEARCH)
  })

  it('asks again for the next attempt after «Остаться»', async () => {
    stubBackend([UI_REPO])
    renderLeavingPage()
    await screen.findByLabelText(LIMIT_LABEL)
    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })
    const link = screen.getByRole('link', { name: 'История проверок' })

    fireEvent.click(link)
    await screen.findByRole('dialog', { name: LEAVE_TITLE })
    fireEvent.click(leaveDialogButton('Остаться'))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: LEAVE_TITLE })).toBeNull()
    })

    fireEvent.click(link)

    expect(await screen.findByRole('dialog', { name: LEAVE_TITLE })).toBeTruthy()
    expect(screen.queryByTestId('runs-route')).toBeNull()
  })

  it('asks for an emptied limit too: anything typed is a draft', async () => {
    stubBackend([UI_REPO])
    renderLeavingPage()
    await screen.findByLabelText(LIMIT_LABEL)
    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '' } })
    // No PATCH could carry it, but the page would lose it.
    expect(saveButton().disabled).toBe(true)

    fireEvent.click(screen.getByRole('link', { name: 'История проверок' }))

    expect(await screen.findByRole('dialog', { name: LEAVE_TITLE })).toBeTruthy()
    expect(screen.queryByTestId('runs-route')).toBeNull()
  })

  it('puts the focus on «Остаться» when the dialog opens, so an Enter keeps the draft', async () => {
    stubBackend([UI_REPO])
    renderLeavingPage()
    await screen.findByLabelText(LIMIT_LABEL)
    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })

    fireEvent.click(screen.getByRole('link', { name: 'История проверок' }))
    await screen.findByRole('dialog', { name: LEAVE_TITLE })

    await waitFor(() => {
      expect(document.activeElement).toBe(leaveDialogButton('Остаться'))
    })
  })

  it('opens the dialog without a deprecation warning from Ant Design', async () => {
    stubBackend([UI_REPO])
    // Ant Design 6 reports a deprecated prop through `console.error` (the `warning` of
    // @rc-component/util) and, under an `App` that is not strict, through `console.warn`; browser
    // round 10 caught `autoFocusButton` this way. The warning is logged while the `Modal` renders.
    const spies = [
      vi.spyOn(console, 'error').mockImplementation(() => undefined),
      vi.spyOn(console, 'warn').mockImplementation(() => undefined),
    ]
    try {
      renderLeavingPage()
      await screen.findByLabelText(LIMIT_LABEL)
      fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })

      fireEvent.click(screen.getByRole('link', { name: 'История проверок' }))
      await screen.findByRole('dialog', { name: LEAVE_TITLE })
      await waitFor(() => {
        expect(document.activeElement).toBe(leaveDialogButton('Остаться'))
      })

      const deprecations = spies.flatMap((spy) =>
        spy.mock.calls
          .map((args) => args.map(String).join(' '))
          .filter((line) => line.toLowerCase().includes('deprecated')),
      )
      expect(deprecations).toEqual([])
    } finally {
      for (const spy of spies) {
        spy.mockRestore()
      }
    }
  })

  it('takes the dialog out of the document when the page goes while it is open', async () => {
    stubBackend([UI_REPO])
    // The `App` that holds the dialog stays when the page is taken out, as it does in the app:
    // where the whole tree goes, the dialog goes with it, and the test would prove nothing.
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const router = createMemoryRouter(
      [
        {
          path: '/repositories/:repoId/settings',
          element: <RepositorySettingsPage />,
        },
      ],
      { initialEntries: [settingsPath(UI_REPO.id)] },
    )
    const tree = (withPage: boolean) => (
      <QueryClientProvider client={client}>
        <ConfigProvider theme={{ token: { motion: false } }}>
          <App>{withPage ? <RouterProvider router={router} /> : null}</App>
        </ConfigProvider>
      </QueryClientProvider>
    )
    const { rerender } = render(tree(true))
    await screen.findByLabelText(LIMIT_LABEL)
    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('link', { name: 'История проверок' }))
    await screen.findByRole('dialog', { name: LEAVE_TITLE })

    rerender(tree(false))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: LEAVE_TITLE })).toBeNull()
    })
    expect(screen.queryByText(LEAVE_TITLE)).toBeNull()
  })

  it('asks after a failed save too: the draft is still on the page', async () => {
    const backend = stubBackend([UI_REPO])
    backend.failPatch = true
    renderLeavingPage()
    await screen.findByLabelText(LIMIT_LABEL)
    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })
    fireEvent.click(saveButton())
    expect(await screen.findByText(SERVER_500_TEXT)).toBeTruthy()
    expect(backend.patches).toHaveLength(1)

    fireEvent.click(screen.getByRole('link', { name: 'История проверок' }))

    expect(await screen.findByRole('dialog', { name: LEAVE_TITLE })).toBeTruthy()
    expect(screen.queryByTestId('runs-route')).toBeNull()
  })

  it('asks when a draft sits over other values of the server (the info notice is shown)', async () => {
    const { backend, client } = await openWithFailedRefresh()
    await chooseOption(CI_LABEL, NEVER_OPTION)
    backend.failList = false
    await act(async () => {
      await client.invalidateQueries({ queryKey: REPOSITORIES_QUERY_KEY })
    })
    await screen.findByText(DIFFERS_NOTICE)

    fireEvent.click(screen.getByRole('link', { name: 'История проверок' }))

    expect(await screen.findByRole('dialog', { name: LEAVE_TITLE })).toBeTruthy()
    expect(screen.queryByTestId('runs-route')).toBeNull()
  })

  describe('on the browser Back button', () => {
    /** The settings page one step above `/runs` in the history, with a draft typed. */
    async function openWithDraftAboveRuns() {
      stubBackend([UI_REPO])
      const rendered = renderPage('/runs', undefined, { withoutMotion: true })
      await act(async () => {
        await rendered.router.navigate(settingsPath(UI_REPO.id))
      })
      await screen.findByLabelText(LIMIT_LABEL)
      fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })
      await act(async () => {
        await rendered.router.navigate(-1)
      })
      await screen.findByRole('dialog', { name: LEAVE_TITLE })
      return rendered
    }

    it('asks, and «Остаться» keeps the page and the draft', async () => {
      const { router } = await openWithDraftAboveRuns()
      expect(router.state.location.pathname).toBe(settingsPath(UI_REPO.id))
      expect(screen.queryByTestId('runs-route')).toBeNull()

      fireEvent.click(leaveDialogButton('Остаться'))

      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: LEAVE_TITLE })).toBeNull()
      })
      expect(blockerStates(router)).toEqual(['unblocked'])
      expect(router.state.location.pathname).toBe(settingsPath(UI_REPO.id))
      expect(screen.queryByTestId('runs-route')).toBeNull()
      expect(inputValue(LIMIT_LABEL)).toBe('5')
    })

    it('asks, and «Уйти» goes back', async () => {
      const { router } = await openWithDraftAboveRuns()

      fireEvent.click(leaveDialogButton('Уйти'))

      expect(await screen.findByTestId('runs-route')).toBeTruthy()
      expect(router.state.location.pathname).toBe('/runs')
    })
  })

  it('leaves at once, without a dialog, when nothing was typed', async () => {
    stubBackend([UI_REPO])
    const { router } = renderLeavingPage()
    await screen.findByLabelText(LIMIT_LABEL)

    fireEvent.click(screen.getByRole('link', { name: 'История проверок' }))

    expect(await screen.findByTestId('runs-route')).toBeTruthy()
    expect(router.state.location.pathname).toBe('/runs')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('leaves at once after «Отменить изменения» took the draft back', async () => {
    stubBackend([UI_REPO])
    renderLeavingPage()
    await screen.findByLabelText(LIMIT_LABEL)
    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })
    fireEvent.click(cancelButton())
    await waitFor(() => {
      expect(inputValue(LIMIT_LABEL)).toBe('10')
    })

    fireEvent.click(screen.getByRole('link', { name: 'История проверок' }))

    expect(await screen.findByTestId('runs-route')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('leaves without a dialog after a successful save', async () => {
    const backend = stubBackend([UI_REPO])
    renderLeavingPage()
    await screen.findByLabelText(LIMIT_LABEL)
    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })
    fireEvent.click(saveButton())
    await screen.findByText('Настройки репозитория успешно сохранены')
    expect(backend.patches).toHaveLength(1)
    await waitFor(() => {
      expect(saveButton().disabled).toBe(true)
    })

    fireEvent.click(screen.getByRole('link', { name: 'История проверок' }))

    expect(await screen.findByTestId('runs-route')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('does not block a change of the search or the hash of the same page', async () => {
    stubBackend([UI_REPO])
    const { router } = renderLeavingPage()
    await screen.findByLabelText(LIMIT_LABEL)
    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })

    await act(async () => {
      await router.navigate(`${settingsPath(UI_REPO.id)}?from=list#rules`)
    })

    expect(router.state.location.search).toBe('?from=list')
    expect(router.state.location.hash).toBe('#rules')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(inputValue(LIMIT_LABEL)).toBe('5')
  })

  it('asks before a reload or a tab close with a draft, and not without one', async () => {
    stubBackend([UI_REPO])
    renderLeavingPage()
    await screen.findByLabelText(LIMIT_LABEL)

    const clean = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(clean)
    expect(clean.defaultPrevented).toBe(false)

    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })

    // jsdom's plain Event has a boolean `returnValue` that cancels the event: an accessor on the
    // event stands in for the string one of a browser's, and records what the page assigns.
    let assigned: unknown = 'unset'
    const dirty = new Event('beforeunload', { cancelable: true })
    Object.defineProperty(dirty, 'returnValue', {
      get: () => assigned,
      set: (value: unknown) => {
        assigned = value
      },
    })
    window.dispatchEvent(dirty)
    expect(dirty.defaultPrevented).toBe(true)
    // Some browsers show the prompt only for this.
    expect(assigned).toBe('')
  })

  it('does not ask before a reload once the draft is saved', async () => {
    stubBackend([UI_REPO])
    renderLeavingPage()
    await screen.findByLabelText(LIMIT_LABEL)
    fireEvent.change(screen.getByLabelText(LIMIT_LABEL), { target: { value: '5' } })
    fireEvent.click(saveButton())
    await screen.findByText('Настройки репозитория успешно сохранены')
    await waitFor(() => {
      expect(saveButton().disabled).toBe(true)
    })

    const saved = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(saved)

    expect(saved.defaultPrevented).toBe(false)
  })

  it('takes the beforeunload listener off with the page', async () => {
    stubBackend([UI_REPO])
    const added = vi.spyOn(window, 'addEventListener')
    const removed = vi.spyOn(window, 'removeEventListener')
    try {
      const { unmount } = renderLeavingPage()
      await screen.findByLabelText(LIMIT_LABEL)
      const listeners = added.mock.calls.filter(([type]) => type === 'beforeunload')
      expect(listeners).toHaveLength(1)

      unmount()

      const listener = listeners[0]?.[1]
      expect(
        removed.mock.calls.some(([type, fn]) => type === 'beforeunload' && fn === listener),
      ).toBe(true)
    } finally {
      added.mockRestore()
      removed.mockRestore()
    }
  })
})

// The test build has no mocks: the rules block asks the api, as it does on every environment (the
// page on the mock transport is RepositorySettingsPage.rules.test.tsx).
describe('RepositorySettingsPage: rules status outside mock mode', () => {
  it('sends GET /api/repos/{id}/rules-status and renders the answer', async () => {
    const backend = stubBackend([UI_REPO])
    renderPage(settingsPath(UI_REPO.id))

    const block = await screen.findByRole('region', { name: 'Правила ревью' })

    expect(await within(block).findByText('Файл найден')).toBeTruthy()
    expect(within(block).getByText('release/2.1')).toBeTruthy()
    expect(backend.rulesRequests).toEqual([UI_REPO.id])
  })

  it('shows the load error, not a missing file, when the rules-status request fails', async () => {
    const backend = stubBackend([UI_REPO])
    backend.rulesStatus = new Response('Server Error', { status: 500 })
    renderPage(settingsPath(UI_REPO.id))

    const block = await screen.findByRole('region', { name: 'Правила ревью' })

    expect(await within(block).findByText('Не удалось загрузить статус правил')).toBeTruthy()
    expect(within(block).queryByText(/дефолтные правила/)).toBeNull()
    expect(within(block).getByRole('button', { name: 'Повторить' })).toBeTruthy()
  })
})
