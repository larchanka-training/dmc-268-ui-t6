// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../shared/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/config/env')>()
  return {
    ...actual,
    USE_MOCKS: true,
    isMockMode: () => true,
  }
})

import { initMockTransport, withMockTransportOverlay } from '../../app/mocks/mockTransport'
import { STATE_STORAGE_KEY } from '../../features/auth'
import { ApiError } from '../../shared/api/client'
import { CallbackPage } from './CallbackPage'

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  window.history.replaceState(null, '', '/')
})

describe('CallbackPage OAuth errors', () => {
  it('shows a fixed Russian message instead of error_description', async () => {
    window.history.pushState({}, '', '/auth/callback?error=access_denied&error_description=Evil')

    render(<CallbackPage />)

    await waitFor(() => {
      expect(screen.getByText('Доступ отклонён пользователем на стороне GitHub')).toBeTruthy()
    })
    expect(screen.queryByText('Evil')).toBeNull()
  })

  it('clears OAuth state from sessionStorage when GitHub returns ?error=', async () => {
    sessionStorage.setItem(STATE_STORAGE_KEY, 'saved_state')
    window.history.pushState({}, '', '/auth/callback?error=access_denied')

    render(<CallbackPage />)

    await waitFor(() => {
      expect(screen.getByText('Доступ отклонён пользователем на стороне GitHub')).toBeTruthy()
    })
    expect(sessionStorage.getItem(STATE_STORAGE_KEY)).toBeNull()
  })

  it('shows Russian text when the callback API returns an English detail string', async () => {
    initMockTransport()
    withMockTransportOverlay((endpoint) => {
      if (endpoint.path === '/auth/github/callback' && endpoint.method === 'POST') {
        throw new ApiError(400, 'Bad Request', { detail: 'invalid GitHub authorization code' })
      }
      return undefined
    })
    sessionStorage.setItem(STATE_STORAGE_KEY, 'csrf_test_state')
    window.history.pushState(
      {},
      '',
      '/auth/callback?code=github_exchange_code&state=csrf_test_state',
    )

    render(<CallbackPage />)

    await waitFor(() => {
      expect(screen.getByText('Недействительный код авторизации GitHub')).toBeTruthy()
    })
  })

  it('shows a Russian message when code is missing', async () => {
    window.history.pushState({}, '', '/auth/callback')

    render(<CallbackPage />)

    await waitFor(() => {
      expect(screen.getByText('Отсутствует код авторизации (параметр code не найден)')).toBeTruthy()
    })
  })
})
