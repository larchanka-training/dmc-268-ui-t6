// @vitest-environment jsdom
import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

// No @types/node here and Vitest zeroes `.css?raw`: load `fs` untyped to read the real stylesheet.
// Under jsdom `import.meta.url` is not a file URL, so the path is relative to the project root,
// where Vitest runs.
const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: string, encoding: 'utf8') => string
}

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

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce()
    })
    expect(observedIntents).toEqual(['ready'])
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

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce()
    })
    expect(exchange).toHaveBeenCalledOnce()
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

    const onSuccess = vi.fn()

    render(<CallbackPage onSuccess={onSuccess} />)

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce()
    })
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
    const onSuccess = vi.fn()
    view.rerender(<CallbackPage onSuccess={onSuccess} />)

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce()
    })
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

describe('CallbackPage success', () => {
  it('has no success screen: the exchange screen stays up while onSuccess fires', async () => {
    initMockTransport()
    sessionStorage.setItem(STATE_STORAGE_KEY, 'csrf_test_state')
    window.history.pushState(
      {},
      '',
      '/auth/callback?code=github_exchange_code&state=csrf_test_state',
    )
    const onScreenWhenCalled: (string | null)[] = []
    const onSuccess = vi.fn(() => {
      onScreenWhenCalled.push(
        screen.queryByText('Авторизация через GitHub...')?.textContent ?? null,
      )
    })

    render(<CallbackPage onSuccess={onSuccess} />)

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce()
    })
    // Let the state update that would have swapped the screen reach the DOM.
    await act(async () => {
      await Promise.resolve()
    })
    expect(onScreenWhenCalled).toEqual(['Авторизация через GitHub...'])
    expect(screen.getByText('Авторизация через GitHub...')).toBeTruthy()
    expect(screen.queryByText('Авторизация успешна!')).toBeNull()
    expect(screen.queryByText('Перенаправляем в панель управления...')).toBeNull()
  })
})

describe('CallbackPage.module.css', () => {
  const css = readFileSync('src/pages/auth/CallbackPage.module.css', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')

  function declarations(selector: string): string {
    const start = css.indexOf(`${selector} {`)
    expect(start, selector).toBeGreaterThanOrEqual(0)
    return css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
  }

  it('fades the screen in with the tokens of the design system, opacity only', () => {
    expect(declarations('.content')).toContain(
      'animation: content-fade-in var(--rv-motion-fade) var(--rv-ease);',
    )
    expect(css).toContain('@keyframes content-fade-in { from { opacity: 0; } }')
    expect(css).not.toContain('transform')
  })

  it('shows the screen from the first frame: no delay, no hidden state', () => {
    expect(css).not.toMatch(/animation-delay|visibility|pointer-events/)
  })

  it('shows the screen at once under reduced motion', () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{ \.content \{ animation: none; \} \}/,
    )
  })
})
