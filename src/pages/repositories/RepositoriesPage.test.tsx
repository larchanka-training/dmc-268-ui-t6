// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RepositoriesPage } from './RepositoriesPage'

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

    render(<RepositoriesPage />)

    await waitFor(() => {
      expect(screen.getByText('Подключенные репозитории')).toBeDefined()
      expect(screen.getByText('larchanka-training/dmc-268-ui-t6')).toBeDefined()
    })
  })

  it('renders error alert when api fetch fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error on load'))

    render(<RepositoriesPage />)

    await waitFor(() => {
      expect(screen.getByText('Ошибка загрузки данных')).toBeDefined()
      expect(screen.getByText('Network error on load')).toBeDefined()
    })
  })
})
