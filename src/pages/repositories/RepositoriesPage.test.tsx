// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { App, ConfigProvider } from 'antd'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  activateAccessRefreshIntent,
  peekAuthReturnTo,
  saveAccessRefreshIntent,
  saveAuthReturnTo,
  useAuthStore,
} from '../../features/auth'
import { REPOSITORIES_QUERY_KEY, useRepositories, type Repository } from '../../entities/repository'

import { RepositoriesPage } from './RepositoriesPage'

vi.mock('../../shared/config/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../shared/config/env')>()),
  GITHUB_CLIENT_ID: 'test-client',
}))

function renderWithClient(
  ui: React.ReactElement,
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  }),
) {
  return render(
    <QueryClientProvider client={queryClient}>
      <App>{ui}</App>
    </QueryClientProvider>,
  )
}

describe('RepositoriesPage', () => {
  const originalFetch = globalThis.fetch
  const originalAuth = useAuthStore.getState()

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    globalThis.fetch = originalFetch
    useAuthStore.setState(originalAuth, true)
    sessionStorage.clear()
  })

  it('refreshes fresh cached repositories immediately and adds delayed repositories after five seconds', async () => {
    vi.useFakeTimers()
    saveAccessRefreshIntent()
    activateAccessRefreshIntent()
    const oldRepo: Repository = {
      id: '11111111-1111-4111-8111-111111111111',
      fullName: 'org/old-repo',
      url: 'https://github.com/org/old-repo',
      defaultBranch: 'main',
      enabled: true,
      defaultEngine: 'fast',
      waitForCi: 'auto',
      maxComments: 10,
      reviewEvent: 'COMMENT',
    }
    const newRepo: Repository = {
      ...oldRepo,
      id: '22222222-2222-4222-8222-222222222222',
      fullName: 'org/new-repo',
      url: 'https://github.com/org/new-repo',
    }
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    })
    client.setQueryData(REPOSITORIES_QUERY_KEY, [oldRepo])
    let requests = 0
    globalThis.fetch = vi.fn(() => {
      requests += 1
      return Promise.resolve(
        new Response(JSON.stringify(requests === 1 ? [oldRepo] : [oldRepo, newRepo]), {
          status: 200,
        }),
      )
    })

    renderWithClient(<RepositoriesPage />, client)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(
      screen.getByText(
        'Обновляем список репозиториев после авторизации через GitHub. Это может занять до двух минут',
      ),
    ).toBeDefined()
    expect(requests).toBe(1)
    expect(screen.getByText('org/old-repo')).toBeDefined()
    expect(screen.queryByText('org/new-repo')).toBeNull()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(requests).toBe(2)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(screen.getByText('org/new-repo')).toBeDefined()
  })

  it('starts GitHub authorization with repositories as the return route without logout', async () => {
    const loginWithGitHub = vi.fn()
    const logout = vi.fn()
    useAuthStore.setState({ loginWithGitHub, logout, isAuthenticated: true })
    saveAuthReturnTo('/runs/stale-route')
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }),
        ),
      )

    renderWithClient(<RepositoriesPage />)
    await screen.findByText(/Репозитории ещё не подключены/)
    fireEvent.click(screen.getByRole('button', { name: 'Обновить доступ' }))

    expect(loginWithGitHub).toHaveBeenCalledOnce()
    expect(peekAuthReturnTo()).toBe('/repositories')
    expect(sessionStorage.getItem('dmc_auth_access_refresh')).toBe('pending')
    expect(logout).not.toHaveBeenCalled()
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('ends automatic refresh at two minutes and offers a one-shot manual refresh', async () => {
    vi.useFakeTimers()
    saveAccessRefreshIntent()
    activateAccessRefreshIntent()
    const loginWithGitHub = vi.fn()
    useAuthStore.setState({ loginWithGitHub })
    globalThis.fetch = vi.fn(() => Promise.resolve(new Response('[]', { status: 200 })))
    renderWithClient(<RepositoriesPage />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120000)
    })

    expect(globalThis.fetch).toHaveBeenCalledTimes(24)
    expect(
      screen.getByText(
        'Автоматическое обновление завершено. Если нужный репозиторий ещё не появился, обновите список вручную',
      ),
    ).toBeDefined()
    expect(screen.queryByText(/Это может занять до двух минут/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Обновить список' }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000)
    })
    expect(globalThis.fetch).toHaveBeenCalledTimes(25)
    expect(loginWithGitHub).not.toHaveBeenCalled()
  })

  it('cancels an active repository request and stops polling when leaving the page', async () => {
    vi.useFakeTimers()
    saveAccessRefreshIntent()
    activateAccessRefreshIntent()
    let signal: AbortSignal | null | undefined
    globalThis.fetch = vi.fn((_url, options?: RequestInit) => {
      signal = options?.signal
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
    })
    const view = renderWithClient(<RepositoriesPage />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(signal).toBeInstanceOf(AbortSignal)

    view.unmount()
    expect(signal?.aborted).toBe(true)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000)
    })
    expect(globalThis.fetch).toHaveBeenCalledOnce()
  })

  it('shows ordinary refresh pending and does not replace an active automatic request', async () => {
    vi.useFakeTimers()
    saveAccessRefreshIntent()
    activateAccessRefreshIntent()
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    })
    client.setQueryData(REPOSITORIES_QUERY_KEY, [])
    let signal: AbortSignal | null | undefined
    globalThis.fetch = vi.fn((_url, options?: RequestInit) => {
      signal = options?.signal
      return new Promise<Response>(() => undefined)
    })
    renderWithClient(<RepositoriesPage />, client)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })

    const refresh = screen.getByRole('button', { name: /Обновить$/ })
    expect(within(refresh).getByRole('img', { name: 'loading' })).toBeDefined()
    fireEvent.click(refresh)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(globalThis.fetch).toHaveBeenCalledOnce()
    expect(signal?.aborted).toBe(false)
  })

  it('keeps one slow GET active and ends waiting independently of its settlement', async () => {
    vi.useFakeTimers()
    saveAccessRefreshIntent()
    activateAccessRefreshIntent()
    let resolveRequest!: (response: Response) => void
    const response = new Promise<Response>((resolve) => {
      resolveRequest = resolve
    })
    globalThis.fetch = vi
      .fn()
      .mockImplementationOnce(() => response)
      .mockImplementation(() => Promise.resolve(new Response('[]', { status: 200 })))
    renderWithClient(
      <ConfigProvider theme={{ token: { motion: false } }}>
        <RepositoriesPage />
      </ConfigProvider>,
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120000)
    })
    expect(globalThis.fetch).toHaveBeenCalledOnce()
    expect(screen.queryByText(/Это может занять до двух минут/)).toBeNull()
    const manual = screen.getByRole('button', { name: /Обновить список$/ })
    expect(within(manual).getByRole('img', { name: 'loading' })).toBeDefined()
    await act(async () => {
      resolveRequest(new Response('[]', { status: 200 }))
      await response
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000)
    })
    expect(globalThis.fetch).toHaveBeenCalledOnce()
    const settledManual = screen.getByRole('button', { name: 'Обновить список' })
    expect(within(settledManual).queryByRole('img', { name: 'loading' })).toBeNull()
    fireEvent.click(settledManual)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000)
    })
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })

  it('skips delayed background ticks once the absolute deadline has passed', async () => {
    vi.useFakeTimers()
    saveAccessRefreshIntent()
    activateAccessRefreshIntent()
    globalThis.fetch = vi.fn(() => Promise.resolve(new Response('[]', { status: 200 })))
    renderWithClient(<RepositoriesPage />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    vi.setSystemTime(Date.now() + 120001)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(globalThis.fetch).toHaveBeenCalledOnce()
    expect(screen.queryByText(/Это может занять до двух минут/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Обновить список' })).toBeDefined()
  })

  it('does not poll ordinary mounts or restart a consumed refresh after revisiting', async () => {
    vi.useFakeTimers()
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    })
    globalThis.fetch = vi.fn(() => Promise.resolve(new Response('[]', { status: 200 })))
    const ordinary = renderWithClient(<RepositoriesPage />, client)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000)
    })
    expect(globalThis.fetch).toHaveBeenCalledOnce()
    expect(screen.queryByText(/Это может занять до двух минут/)).toBeNull()
    ordinary.unmount()
    saveAccessRefreshIntent()
    activateAccessRefreshIntent()
    const refresh = renderWithClient(<RepositoriesPage />, client)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    refresh.unmount()
    renderWithClient(<RepositoriesPage />, client)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000)
    })
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    expect(screen.queryByText(/Это может занять до двух минут/)).toBeNull()
  })

  it('does not overlap requests or duplicate the refresh loop in StrictMode', async () => {
    vi.useFakeTimers()
    saveAccessRefreshIntent()
    activateAccessRefreshIntent()
    let active = 0
    let maximumActive = 0
    let completed = 0
    let aborted = 0
    globalThis.fetch = vi.fn((_url, options?: RequestInit) => {
      active += 1
      maximumActive = Math.max(maximumActive, active)
      return new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(() => {
          active -= 1
          completed += 1
          resolve(new Response('[]', { status: 200 }))
        }, 2)
        options?.signal?.addEventListener('abort', () => {
          clearTimeout(timer)
          active -= 1
          aborted += 1
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
    })
    render(
      <StrictMode>
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <App>
            <RepositoriesPage />
          </App>
        </QueryClientProvider>
      </StrictMode>,
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120000)
    })
    expect(maximumActive).toBe(1)
    expect(aborted).toBe(1)
    expect(completed).toBe(24)
    expect(screen.queryByText(/Это может занять до двух минут/)).toBeNull()
  })

  it('continues after network errors within the same window and stops at its deadline', async () => {
    vi.useFakeTimers()
    saveAccessRefreshIntent()
    activateAccessRefreshIntent()
    globalThis.fetch = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
    renderWithClient(<RepositoriesPage />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(screen.getByText('Ошибка загрузки данных')).toBeDefined()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(119999)
    })
    expect(globalThis.fetch).toHaveBeenCalledTimes(24)
    expect(screen.queryByText(/Это может занять до двух минут/)).toBeNull()
  })

  it('adds repositories after an initially empty response without ending the waiting window', async () => {
    vi.useFakeTimers()
    saveAccessRefreshIntent()
    activateAccessRefreshIntent()
    const repository: Repository = {
      id: '22222222-2222-4222-8222-222222222222',
      fullName: 'org/new-repo',
      url: 'https://github.com/org/new-repo',
      defaultBranch: 'main',
      enabled: true,
      defaultEngine: 'fast',
      waitForCi: 'auto',
      maxComments: 10,
      reviewEvent: 'COMMENT',
    }
    let requests = 0
    globalThis.fetch = vi.fn(() => {
      requests += 1
      return Promise.resolve(
        new Response(JSON.stringify(requests === 1 ? [] : [repository]), { status: 200 }),
      )
    })
    renderWithClient(<RepositoriesPage />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(screen.getByText(/Репозитории ещё не подключены/)).toBeDefined()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(screen.getByText('org/new-repo')).toBeDefined()
    expect(screen.getByText(/Это может занять до двух минут/)).toBeDefined()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(requests).toBe(3)
  })

  it('only cancels a shared GET after the last query observer leaves', async () => {
    vi.useFakeTimers()
    saveAccessRefreshIntent()
    activateAccessRefreshIntent()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    let signal: AbortSignal | null | undefined
    globalThis.fetch = vi.fn((_url, options?: RequestInit) => {
      signal = options?.signal
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
    })
    const page = renderWithClient(<RepositoriesPage />, client)
    const observer = renderHook(() => useRepositories(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    page.unmount()
    expect(signal?.aborted).toBe(false)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000)
    })
    expect(globalThis.fetch).toHaveBeenCalledOnce()
    observer.unmount()
    expect(signal?.aborted).toBe(true)
  })

  it('keeps repository mutation invalidation working during the refresh window', async () => {
    vi.useFakeTimers()
    saveAccessRefreshIntent()
    activateAccessRefreshIntent()
    let repository: Repository = {
      id: '22222222-2222-4222-8222-222222222222',
      fullName: 'org/new-repo',
      url: 'https://github.com/org/new-repo',
      defaultBranch: 'main',
      enabled: true,
      defaultEngine: 'fast',
      waitForCi: 'auto',
      maxComments: 10,
      reviewEvent: 'COMMENT',
    }
    let gets = 0
    globalThis.fetch = vi.fn((_url, options?: RequestInit) => {
      if (options?.method === 'PATCH') {
        repository = { ...repository, enabled: false }
        return Promise.resolve(new Response(JSON.stringify(repository), { status: 200 }))
      }
      gets += 1
      return Promise.resolve(new Response(JSON.stringify([repository]), { status: 200 }))
    })
    renderWithClient(<RepositoriesPage />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    fireEvent.click(screen.getByRole('switch', { name: 'Ревью для org/new-repo' }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(gets).toBe(2)
    expect(
      screen.getByRole('switch', { name: 'Ревью для org/new-repo' }).getAttribute('aria-checked'),
    ).toBe('false')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(gets).toBe(3)
    expect(screen.getByText(/Это может занять до двух минут/)).toBeDefined()
  })

  it('preserves an optimistic toggle during delayed PATCH and does not extend the polling deadline', async () => {
    vi.useFakeTimers()
    saveAccessRefreshIntent()
    activateAccessRefreshIntent()
    const repository: Repository = {
      id: '22222222-2222-4222-8222-222222222222',
      fullName: 'org/delayed-repo',
      url: 'https://github.com/org/delayed-repo',
      defaultBranch: 'main',
      enabled: true,
      defaultEngine: 'fast',
      waitForCi: 'auto',
      maxComments: 10,
      reviewEvent: 'COMMENT',
    }
    let resolvePatch!: (response: Response) => void
    const patch = new Promise<Response>((resolve) => {
      resolvePatch = resolve
    })
    let serverRepository = repository
    let gets = 0
    globalThis.fetch = vi.fn((_url, options?: RequestInit) => {
      if (options?.method === 'PATCH') return patch
      gets += 1
      return Promise.resolve(new Response(JSON.stringify([serverRepository]), { status: 200 }))
    })
    renderWithClient(<RepositoriesPage />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    const toggle = screen.getByRole('switch', { name: 'Ревью для org/delayed-repo' })
    fireEvent.click(toggle)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(toggle.getAttribute('aria-checked')).toBe('false')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(toggle.getAttribute('aria-checked')).toBe('false')
    expect(gets).toBe(1)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(114998)
    })
    expect(screen.queryByText(/Это может занять до двух минут/)).toBeNull()
    expect(gets).toBe(1)

    serverRepository = { ...repository, enabled: false }
    await act(async () => {
      resolvePatch(new Response(JSON.stringify(serverRepository), { status: 200 }))
      await patch
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000)
    })
    expect(gets).toBe(2)
    expect(toggle.getAttribute('aria-checked')).toBe('false')
    expect(toggle.hasAttribute('disabled')).toBe(false)
    expect(screen.queryByText(/Это может занять до двух минут/)).toBeNull()
  })

  it('preserves optimistic and confirmed rows until both concurrent PATCH requests finish', async () => {
    vi.useFakeTimers()
    saveAccessRefreshIntent()
    activateAccessRefreshIntent()
    const first: Repository = {
      id: '11111111-1111-4111-8111-111111111111',
      fullName: 'org/first-repo',
      url: 'https://github.com/org/first-repo',
      defaultBranch: 'main',
      enabled: true,
      defaultEngine: 'fast',
      waitForCi: 'auto',
      maxComments: 10,
      reviewEvent: 'COMMENT',
    }
    const second: Repository = {
      ...first,
      id: '22222222-2222-4222-8222-222222222222',
      fullName: 'org/second-repo',
      url: 'https://github.com/org/second-repo',
    }
    let resolveFirst!: (response: Response) => void
    const firstPatch = new Promise<Response>((resolve) => {
      resolveFirst = resolve
    })
    let resolveSecond!: (response: Response) => void
    const secondPatch = new Promise<Response>((resolve) => {
      resolveSecond = resolve
    })
    let resolveStaleGet!: (response: Response) => void
    const staleGet = new Promise<Response>((resolve) => {
      resolveStaleGet = resolve
    })
    let secondPending = true
    let serverRepositories = [first, second]
    let gets = 0
    globalThis.fetch = vi.fn((url: RequestInfo | URL, options?: RequestInit) => {
      if (options?.method === 'PATCH') {
        const requestUrl = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
        return requestUrl.includes(first.id) ? firstPatch : secondPatch
      }
      gets += 1
      if (gets === 2 && secondPending) return staleGet
      return Promise.resolve(new Response(JSON.stringify(serverRepositories), { status: 200 }))
    })
    renderWithClient(<RepositoriesPage />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    const firstToggle = screen.getByRole('switch', { name: 'Ревью для org/first-repo' })
    const secondToggle = screen.getByRole('switch', { name: 'Ревью для org/second-repo' })
    fireEvent.click(firstToggle)
    fireEvent.click(secondToggle)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(firstToggle.getAttribute('aria-checked')).toBe('false')
    expect(secondToggle.getAttribute('aria-checked')).toBe('false')

    await act(async () => {
      resolveFirst(new Response(JSON.stringify({ ...first, enabled: false }), { status: 200 }))
      await firstPatch
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(firstToggle.getAttribute('aria-checked')).toBe('false')
    expect(firstToggle.hasAttribute('disabled')).toBe(false)
    await act(async () => {
      // The polling GET would have captured these old values before PATCH 1 settled.
      // With the guard it never starts, and resolving this prepared response is harmless.
      resolveStaleGet(new Response(JSON.stringify([first, second]), { status: 200 }))
      await staleGet
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(firstToggle.getAttribute('aria-checked')).toBe('false')
    expect(firstToggle.hasAttribute('disabled')).toBe(false)
    expect(secondToggle.getAttribute('aria-checked')).toBe('false')
    expect(secondToggle.hasAttribute('disabled')).toBe(true)
    expect(gets).toBe(1)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(gets).toBe(1)

    serverRepositories = [
      { ...first, enabled: false },
      { ...second, enabled: false },
    ]
    secondPending = false
    await act(async () => {
      resolveSecond(new Response(JSON.stringify(serverRepositories[1]), { status: 200 }))
      await secondPatch
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(gets).toBe(2)
    expect(firstToggle.getAttribute('aria-checked')).toBe('false')
    expect(secondToggle.getAttribute('aria-checked')).toBe('false')
    expect(secondToggle.hasAttribute('disabled')).toBe(false)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(gets).toBe(3)
  })

  it('skips the initial access-refresh microtask when a repository PATCH is already pending', async () => {
    vi.useFakeTimers()
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    })
    const repository: Repository = {
      id: '11111111-1111-4111-8111-111111111111',
      fullName: 'org/pending-repo',
      url: 'https://github.com/org/pending-repo',
      defaultBranch: 'main',
      enabled: true,
      defaultEngine: 'fast',
      waitForCi: 'auto',
      maxComments: 10,
      reviewEvent: 'COMMENT',
    }
    client.setQueryData(REPOSITORIES_QUERY_KEY, [repository])
    let gets = 0
    globalThis.fetch = vi.fn((_url, options?: RequestInit) => {
      if (options?.method === 'PATCH') return new Promise<Response>(() => undefined)
      gets += 1
      return Promise.resolve(new Response(JSON.stringify([repository]), { status: 200 }))
    })
    const ordinary = renderWithClient(<RepositoriesPage />, client)
    fireEvent.click(screen.getByRole('switch', { name: 'Ревью для org/pending-repo' }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    ordinary.unmount()
    saveAccessRefreshIntent()
    activateAccessRefreshIntent()

    renderWithClient(<RepositoriesPage />, client)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(gets).toBe(0)
    expect(
      screen
        .getByRole('switch', { name: 'Ревью для org/pending-repo' })
        .getAttribute('aria-checked'),
    ).toBe('false')
    expect(screen.getByText(/Это может занять до двух минут/)).toBeDefined()
  })

  it('renders repository list within layout on successful load', async () => {
    const mockRepo = {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      fullName: 'larchanka-training/dmc-268-ui-t6',
      url: 'https://github.com/larchanka-training/dmc-268-ui-t6',
      defaultBranch: 'main',
      enabled: true,
      defaultEngine: 'fast',
      waitForCi: 'auto',
      maxComments: 10,
      reviewEvent: 'COMMENT',
    }

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([mockRepo]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    renderWithClient(<RepositoriesPage />)

    await waitFor(() => {
      expect(screen.getByText('Подключенные репозитории')).toBeDefined()
      expect(screen.getByText('larchanka-training/dmc-268-ui-t6')).toBeDefined()
    })
  })

  it('renders error alert when api fetch fails with network TypeError', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    renderWithClient(<RepositoriesPage />)

    await waitFor(() => {
      expect(screen.getByText('Ошибка загрузки данных')).toBeDefined()
      expect(screen.getByText('Ошибка сети. Проверьте подключение к интернету.')).toBeDefined()
      expect(screen.queryByText(/ещё не подключены/i)).toBeNull()
    })
  })

  it('renders error alert and hides repository list when api returns invalid schema', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ invalid: 'shape' }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    renderWithClient(<RepositoriesPage />)

    await waitFor(() => {
      expect(screen.getByText('Ошибка загрузки данных')).toBeDefined()
      expect(
        screen.getByText('Неожиданный формат данных от сервера. Пожалуйста, обновите страницу.'),
      ).toBeDefined()
      expect(screen.queryByText(/ещё не подключены/i)).toBeNull()
      expect(screen.queryByText('Подключенные репозитории')).toBeNull()
    })
  })

  it('optimistically toggles switch and rolls back to original state on PATCH error', async () => {
    const mockRepo = {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      fullName: 'larchanka-training/dmc-268-ui-t6',
      url: 'https://github.com/larchanka-training/dmc-268-ui-t6',
      defaultBranch: 'main',
      enabled: true,
      defaultEngine: 'fast',
      waitForCi: 'auto',
      maxComments: 10,
      reviewEvent: 'COMMENT',
    }

    let resolvePatch: (res: Response) => void = vi.fn()
    const patchPromise = new Promise<Response>((resolve) => {
      resolvePatch = resolve
    })

    let getCallCount = 0
    globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : ''
      if (urlStr.includes('/api/repos') && init?.method === 'PATCH') {
        return patchPromise
      }
      getCallCount++
      if (getCallCount === 1) {
        return Promise.resolve(
          new Response(JSON.stringify([mockRepo]), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        )
      }
      // Subsequent GET queries do not complete so rollback is purely verified from onError
      return new Promise<Response>(() => undefined)
    })

    renderWithClient(<RepositoriesPage />)

    const switchBtn = await screen.findByRole('switch', {
      name: 'Ревью для larchanka-training/dmc-268-ui-t6',
    })
    expect(switchBtn.getAttribute('aria-checked')).toBe('true')

    fireEvent.click(switchBtn)

    await waitFor(() => {
      expect(switchBtn.getAttribute('aria-checked')).toBe('false')
    })

    // While PATCH is in flight, switch must be disabled
    expect(switchBtn.hasAttribute('disabled')).toBe(true)

    // PATCH fails with HTTP 500
    resolvePatch(new Response('Internal Server Error', { status: 500 }))

    // Switch must roll back to original state 'true' via onError and display formatted error
    expect(
      await screen.findByText('Внутренняя ошибка сервера (500). Повторите попытку позже.'),
    ).toBeDefined()

    await waitFor(() => {
      expect(switchBtn.getAttribute('aria-checked')).toBe('true')
    })
  })

  it('supports parallel row mutations: disables both while pending, and reenables completed row independently', async () => {
    const repo1 = {
      id: '11111111-1111-4111-8111-111111111111',
      fullName: 'org/repo-1',
      url: 'https://github.com/org/repo-1',
      defaultBranch: 'main',
      enabled: true,
      defaultEngine: 'fast',
      waitForCi: 'auto',
      maxComments: 10,
      reviewEvent: 'COMMENT',
    }
    const repo2 = {
      id: '22222222-2222-4222-8222-222222222222',
      fullName: 'org/repo-2',
      url: 'https://github.com/org/repo-2',
      defaultBranch: 'main',
      enabled: true,
      defaultEngine: 'fast',
      waitForCi: 'auto',
      maxComments: 10,
      reviewEvent: 'COMMENT',
    }

    let resolvePatch1!: (res: Response) => void
    const patch1Promise = new Promise<Response>((resolve) => {
      resolvePatch1 = resolve
    })

    let resolvePatch2!: (res: Response) => void
    const patch2Promise = new Promise<Response>((resolve) => {
      resolvePatch2 = resolve
    })

    let getReposCount = 0
    globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : ''
      if (init?.method === 'PATCH') {
        if (urlStr.includes(repo1.id)) {
          return patch1Promise
        }
        if (urlStr.includes(repo2.id)) {
          return patch2Promise
        }
      }
      if (!init?.method || init.method === 'GET') {
        getReposCount++
      }
      return Promise.resolve(
        new Response(JSON.stringify([repo1, repo2]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
    })

    renderWithClient(<RepositoriesPage />)

    const switch1 = await screen.findByRole('switch', { name: 'Ревью для org/repo-1' })
    const switch2 = await screen.findByRole('switch', { name: 'Ревью для org/repo-2' })

    expect(switch1.hasAttribute('disabled')).toBe(false)
    expect(switch2.hasAttribute('disabled')).toBe(false)
    expect(getReposCount).toBe(1)

    // 1. Toggle repo1 -> switch1 becomes disabled, switch2 is still enabled
    fireEvent.click(switch1)
    await waitFor(() => {
      expect(switch1.hasAttribute('disabled')).toBe(true)
      expect(switch2.hasAttribute('disabled')).toBe(false)
    })

    // 2. Toggle repo2 -> now BOTH switches are disabled
    fireEvent.click(switch2)
    await waitFor(() => {
      expect(switch1.hasAttribute('disabled')).toBe(true)
      expect(switch2.hasAttribute('disabled')).toBe(true)
    })

    // 3. Resolve patch1 -> switch1 becomes enabled again, while switch2 remains disabled
    resolvePatch1(
      new Response(JSON.stringify({ ...repo1, enabled: false }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    await waitFor(() => {
      expect(switch1.hasAttribute('disabled')).toBe(false)
      expect(switch2.hasAttribute('disabled')).toBe(true)
    })

    // While patch2 is still in-flight, onSettled must NOT prematurely trigger GET /api/repos
    expect(getReposCount).toBe(1)

    // 4. Resolve patch2 -> switch2 becomes enabled again and queryClient invalidates queries
    resolvePatch2(
      new Response(JSON.stringify({ ...repo2, enabled: false }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    await waitFor(() => {
      expect(switch1.hasAttribute('disabled')).toBe(false)
      expect(switch2.hasAttribute('disabled')).toBe(false)
    })

    await waitFor(() => {
      expect(getReposCount).toBe(2)
    })
  })

  it('keeps settings modal open with entered values when PATCH fails with 500', async () => {
    const mockRepo = {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      fullName: 'larchanka-training/dmc-268-ui-t6',
      url: 'https://github.com/larchanka-training/dmc-268-ui-t6',
      defaultBranch: 'main',
      enabled: true,
      defaultEngine: 'fast',
      waitForCi: 'auto',
      maxComments: 10,
      reviewEvent: 'COMMENT',
    }

    const patchSpy = vi.fn()
    globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : ''
      if (urlStr.includes('/api/repos') && init?.method === 'PATCH') {
        patchSpy(typeof init.body === 'string' ? JSON.parse(init.body) : undefined)
        return Promise.resolve(new Response('Server Error', { status: 500 }))
      }
      return Promise.resolve(
        new Response(JSON.stringify([mockRepo]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
    })

    // motion: false makes a closing modal leave the accessibility tree at once, so the
    // role query below tells an open modal from a closed one
    renderWithClient(
      <ConfigProvider theme={{ token: { motion: false } }}>
        <RepositoriesPage />
      </ConfigProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('larchanka-training/dmc-268-ui-t6')).toBeDefined()
    })

    const settingsBtn = screen.getByLabelText(/настройки larchanka-training\/dmc-268-ui-t6/i)
    fireEvent.click(settingsBtn)

    await waitFor(() => {
      expect(
        screen.getByText('Настройки репозитория larchanka-training/dmc-268-ui-t6'),
      ).toBeDefined()
    })

    const maxCommentsInput = document.getElementById('maxComments') as HTMLInputElement
    expect(maxCommentsInput).not.toBeNull()
    fireEvent.change(maxCommentsInput, { target: { value: '5' } })
    expect(maxCommentsInput.value).toBe('5')

    const saveBtn = screen.getByRole('button', { name: /сохранить/i })
    fireEvent.click(saveBtn)

    // Wait until PATCH request has actually been executed and message error is shown
    await screen.findByText('Внутренняя ошибка сервера (500). Повторите попытку позже.')
    expect(patchSpy).toHaveBeenCalledTimes(1)
    expect(patchSpy).toHaveBeenCalledWith(expect.objectContaining({ maxComments: 5 }))

    // After PATCH failure, modal must stay open with values intact
    expect(
      screen.getByRole('dialog', {
        name: 'Настройки репозитория larchanka-training/dmc-268-ui-t6',
      }),
    ).toBeDefined()
    expect(screen.getByText('Настройки репозитория larchanka-training/dmc-268-ui-t6')).toBeDefined()
    const currentInput = document.getElementById('maxComments') as HTMLInputElement
    expect(currentInput.value).toBe('5')
  })
})
