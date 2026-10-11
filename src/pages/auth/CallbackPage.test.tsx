// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
import {
  peekAccessRefreshIntent,
  LoginButton,
  saveAccessRefreshIntent,
  setMockAuthAdapter,
  STATE_STORAGE_KEY,
  useAuthStore,
} from '../../features/auth'
import { ApiError, setAccessToken, setMockTransport } from '../../shared/api/client'
import { CallbackPage } from './CallbackPage'

const originalAuth = useAuthStore.getState()

afterEach(() => {
  cleanup()
  useAuthStore.setState(originalAuth, true)
  setMockAuthAdapter(null)
  setMockTransport(null)
  setAccessToken(null)
  sessionStorage.clear()
  window.history.replaceState(null, '', '/')
})

describe('CallbackPage OAuth errors', () => {
  it('makes pending access refresh ready before notifying successful authorization', async () => {
    initMockTransport()
    saveAccessRefreshIntent()
    sessionStorage.setItem(STATE_STORAGE_KEY, 'csrf_test_state')
    window.history.pushState(
      {},
      '',
      '/auth/callback?code=github_exchange_code&state=csrf_test_state',
    )
    const observedIntents: (string | null)[] = []
    const onSuccess = vi.fn(() => {
      observedIntents.push(peekAccessRefreshIntent())
    })

    render(<CallbackPage onSuccess={onSuccess} />)

    await screen.findByText('Авторизация успешна!')
    expect(observedIntents).toEqual(['ready'])
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('shows a fixed Russian message instead of error_description', async () => {
    window.history.pushState({}, '', '/auth/callback?error=access_denied&error_description=Evil')

    render(<CallbackPage />)

    await waitFor(() => {
      expect(screen.getByText('Доступ отклонён пользователем на стороне GitHub')).toBeTruthy()
    })
    expect(screen.queryByText('Evil')).toBeNull()
  })

  it('clears OAuth state from sessionStorage when GitHub returns ?error=', async () => {
    saveAccessRefreshIntent()
    sessionStorage.setItem(STATE_STORAGE_KEY, 'saved_state')
    window.history.pushState({}, '', '/auth/callback?error=access_denied')

    render(<CallbackPage />)

    await waitFor(() => {
      expect(screen.getByText('Доступ отклонён пользователем на стороне GitHub')).toBeTruthy()
    })
    expect(sessionStorage.getItem(STATE_STORAGE_KEY)).toBeNull()
    expect(peekAccessRefreshIntent()).toBeNull()
  })

  it('shows Russian text when the callback API returns an English detail string', async () => {
    saveAccessRefreshIntent()
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
    expect(peekAccessRefreshIntent()).toBeNull()
  })

  it('shows a Russian schema message when the callback API returns 200 without accessToken', async () => {
    saveAccessRefreshIntent()
    initMockTransport()
    withMockTransportOverlay((endpoint) => {
      if (endpoint.path === '/auth/github/callback' && endpoint.method === 'POST') {
        return {}
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
      expect(screen.getByText('Ответ сервера не прошёл проверку схемы')).toBeTruthy()
    })
    expect(peekAccessRefreshIntent()).toBeNull()
  })

  it('activates access refresh once after one successful exchange in StrictMode', async () => {
    const exchange = vi.fn()
    withMockTransportOverlay((endpoint) => {
      if (endpoint.path === '/auth/github/callback' && endpoint.method === 'POST') {
        exchange()
      }
      return undefined
    })
    saveAccessRefreshIntent()
    const onSuccess = vi.fn()
    sessionStorage.setItem(STATE_STORAGE_KEY, 'csrf_test_state')
    window.history.pushState(
      {},
      '',
      '/auth/callback?code=github_exchange_code&state=csrf_test_state',
    )

    render(
      <React.StrictMode>
        <CallbackPage onSuccess={onSuccess} />
      </React.StrictMode>,
    )

    await screen.findByText('Авторизация успешна!')
    expect(exchange).toHaveBeenCalledOnce()
    expect(onSuccess).toHaveBeenCalledOnce()
    expect(peekAccessRefreshIntent()).toBe('ready')
  })

  it('leaves ordinary successful login without an access refresh intent', async () => {
    initMockTransport()
    sessionStorage.setItem(STATE_STORAGE_KEY, 'csrf_test_state')
    window.history.pushState(
      {},
      '',
      '/auth/callback?code=github_exchange_code&state=csrf_test_state',
    )

    render(<CallbackPage onSuccess={vi.fn()} />)

    await screen.findByText('Авторизация успешна!')
    expect(peekAccessRefreshIntent()).toBeNull()
  })

  it('discards abandoned access refresh before ordinary login after logout', async () => {
    initMockTransport()
    useAuthStore.setState({ isAuthenticated: true })
    saveAccessRefreshIntent()
    await useAuthStore.getState().logout()

    const view = render(<LoginButton showMockButton={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Войти через GitHub' }))

    sessionStorage.setItem(STATE_STORAGE_KEY, 'csrf_test_state')
    window.history.pushState(
      {},
      '',
      '/auth/callback?code=github_exchange_code&state=csrf_test_state',
    )
    view.rerender(<CallbackPage onSuccess={vi.fn()} />)

    await screen.findByText('Авторизация успешна!')
    expect(peekAccessRefreshIntent()).toBeNull()
  })

  it('shows a Russian message when code is missing', async () => {
    saveAccessRefreshIntent()
    window.history.pushState({}, '', '/auth/callback')

    render(<CallbackPage />)

    await waitFor(() => {
      expect(screen.getByText('Отсутствует код авторизации (параметр code не найден)')).toBeTruthy()
    })
    expect(peekAccessRefreshIntent()).toBeNull()
  })
})
