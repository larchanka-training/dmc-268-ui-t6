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

  it('renders error alert when api fetch fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error on load'))

    renderWithClient(<RepositoriesPage />)

    await waitFor(() => {
      expect(screen.getByText('Ошибка загрузки данных')).toBeDefined()
      expect(screen.getByText('Network error on load')).toBeDefined()
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

    await waitFor(() => {
      expect(screen.getByRole('switch')).toBeDefined()
    })

    const switchBtn = screen.getByRole('switch')
    expect(switchBtn.getAttribute('aria-checked')).toBe('true')

    fireEvent.click(switchBtn)

    await waitFor(() => {
      expect(switchBtn.getAttribute('aria-checked')).toBe('false')
    })

    // While PATCH is in flight, switch must be disabled
    expect(switchBtn.hasAttribute('disabled')).toBe(true)

    // PATCH fails with HTTP 500
    resolvePatch(new Response('Internal Server Error', { status: 500 }))

    // Switch must roll back to original state 'true' via onError
    await waitFor(() => {
      expect(switchBtn.getAttribute('aria-checked')).toBe('true')
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

    globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : ''
      if (urlStr.includes('/api/repos') && init?.method === 'PATCH') {
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
        screen.getByText(/настройки репозитория larchanka-training\/dmc-268-ui-t6/i),
      ).toBeDefined()
    })

    const maxCommentsInput = document.getElementById('maxComments') as HTMLInputElement
    expect(maxCommentsInput).toBeDefined()
    fireEvent.change(maxCommentsInput, { target: { value: '5' } })
    expect(maxCommentsInput.value).toBe('5')

    const saveBtn = screen.getByRole('button', { name: /сохранить/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      // Modal remains open
      expect(
        screen.getByText(/настройки репозитория larchanka-training\/dmc-268-ui-t6/i),
      ).toBeDefined()
      // Value remains entered
      const currentInput = document.getElementById('maxComments') as HTMLInputElement
      expect(currentInput.value).toBe('5')
    })
  })
})
