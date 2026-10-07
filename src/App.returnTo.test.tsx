// @vitest-environment jsdom
import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// «Демо-вход» is rendered only in a mock build; same switch as `LoginButton.test.tsx`.
vi.mock('./shared/config/buildFlags', () => ({
  VITE_MOCKS_BUILD: true,
  mocksEnabledAtRuntime: (isMockMode: () => boolean) => isMockMode(),
}))

vi.mock('./shared/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./shared/config/env')>()
  return {
    ...actual,
    USE_MOCKS: true,
    isMockMode: () => true,
  }
})

import App from './App'
import { MOCK_OAUTH_CODE, initMockTransport } from './app/mocks/mockTransport'
import { createRoutes } from './app/routes'
import {
  AUTH_RETURN_TO_KEY,
  MOCK_TOKEN,
  STATE_STORAGE_KEY,
  saveAuthReturnTo,
  setMockAuthAdapter,
  useAuthStore,
} from './features/auth'
import { setAccessToken, setMockTransport } from './shared/api/client'

const RUN_PATH = '/runs/11111111-1111-4111-8111-000000000004'

function resetSession(): void {
  sessionStorage.clear()
  setAccessToken(null)
  useAuthStore.setState({
    isAuthenticated: false,
    isLoading: false,
    isInitialized: true,
    error: null,
  })
}

function signIn(): void {
  setAccessToken(MOCK_TOKEN)
  useAuthStore.setState({ isAuthenticated: true })
}

// `src/main.tsx` renders the app inside <StrictMode>; the return-to flow must hold there too.
function renderRouted(initialEntry: string) {
  const router = createMemoryRouter(createRoutes(), { initialEntries: [initialEntry] })
  render(
    <StrictMode>
      <App router={router} />
    </StrictMode>,
  )
  return router
}

describe('return to the original route after login (StrictMode)', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    resetSession()
    initMockTransport()
    // An authenticated session opens the run stream through `fetch`; answer it with a 404.
    globalThis.fetch = vi
      .fn()
      .mockImplementation(() => Promise.resolve(new Response(null, { status: 404 })))
  })

  afterEach(() => {
    cleanup()
    globalThis.fetch = originalFetch
    resetSession()
    setMockAuthAdapter(null)
    setMockTransport(null)
    window.history.replaceState(null, '', '/')
  })

  it('opens the saved route when /login is visited with an active session', async () => {
    saveAuthReturnTo(RUN_PATH)
    signIn()

    const router = renderRouted('/login')

    await waitFor(() => {
      expect(router.state.location.pathname).not.toBe('/login')
    })
    expect(router.state.location.pathname).toBe(RUN_PATH)
  })

  it('opens the saved route after the mock «Демо-вход»', async () => {
    const router = renderRouted(RUN_PATH)

    const demoLogin = await screen.findByRole('button', { name: /войти как демо-пользователь/i })
    expect(router.state.location.pathname).toBe('/login')
    expect(sessionStorage.getItem(AUTH_RETURN_TO_KEY)).toBe(RUN_PATH)

    fireEvent.click(demoLogin)

    await waitFor(() => {
      expect(router.state.location.pathname).not.toBe('/login')
    })
    expect(router.state.location.pathname).toBe(RUN_PATH)
  })

  it('opens the saved route after the OAuth callback', async () => {
    saveAuthReturnTo(RUN_PATH)
    // `CallbackPage` reads the code and state from `window.location`, not from the memory router.
    sessionStorage.setItem(STATE_STORAGE_KEY, 'csrf_test_state')
    const callbackUrl = `/auth/callback?code=${MOCK_OAUTH_CODE}&state=csrf_test_state`
    window.history.pushState({}, '', callbackUrl)

    const router = renderRouted(callbackUrl)

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(RUN_PATH)
    })
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(sessionStorage.getItem(AUTH_RETURN_TO_KEY)).toBeNull()
  })

  it('removes the saved route once it is used, so a later /login goes to the fallback', async () => {
    saveAuthReturnTo(RUN_PATH)
    signIn()

    const router = renderRouted('/login')

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(RUN_PATH)
    })
    await waitFor(() => {
      expect(sessionStorage.getItem(AUTH_RETURN_TO_KEY)).toBeNull()
    })

    await act(async () => {
      await router.navigate('/login')
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/repositories')
    })
  })
})
