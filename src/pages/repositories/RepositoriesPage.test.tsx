// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App } from 'antd'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RepositoriesPage } from './RepositoriesPage'

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <App>{ui}</App>
    </QueryClientProvider>,
  )
}

describe('RepositoriesPage', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
    globalThis.fetch = originalFetch
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
        patchSpy()
        return Promise.resolve(new Response('Server Error', { status: 500 }))
      }
      return Promise.resolve(
        new Response(JSON.stringify([mockRepo]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
    })

    renderWithClient(<RepositoriesPage />)

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

    // After PATCH failure, modal must stay open with values intact
    expect(screen.getByText('Настройки репозитория larchanka-training/dmc-268-ui-t6')).toBeDefined()
    const currentInput = document.getElementById('maxComments') as HTMLInputElement
    expect(currentInput.value).toBe('5')
  })
})
