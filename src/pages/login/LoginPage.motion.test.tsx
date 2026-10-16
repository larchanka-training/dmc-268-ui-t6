// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The probe takes the place of the sign-in button, so it sits inside the screen's own provider and
// reads the motion setting that Ant Design components there would get.
vi.mock('../../features/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/auth')>()
  const { theme } = await import('antd')
  const { createElement } = await import('react')
  function LoginButtonProbe() {
    const { token } = theme.useToken()
    return createElement('output', { 'data-testid': 'motion' }, String(token.motion))
  }
  return { ...actual, LoginButton: LoginButtonProbe }
})

import { useAuthStore } from '../../features/auth'
import { DesignSystemProvider } from '../../shared/ui'
import { LoginPage } from './LoginPage'

const originalMatchMedia = window.matchMedia.bind(window)

let queryClient: QueryClient

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  useAuthStore.setState({ isAuthenticated: false, error: null })
})

afterEach(() => {
  cleanup()
  queryClient.clear()
  window.matchMedia = originalMatchMedia
})

/** A controllable `prefers-reduced-motion`: returns a function that flips the setting. */
function mockReducedMotion(initial: boolean): (matches: boolean) => void {
  let matches = initial
  const listeners = new Set<() => void>()
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return query.includes('prefers-reduced-motion') && matches
    },
    media: query,
    addEventListener: (_type: string, listener: () => void) => {
      listeners.add(listener)
    },
    removeEventListener: (_type: string, listener: () => void) => {
      listeners.delete(listener)
    },
  }))
  return (next) => {
    matches = next
    for (const listener of listeners) {
      listener()
    }
  }
}

function renderLogin() {
  return render(
    <QueryClientProvider client={queryClient}>
      <DesignSystemProvider mode="light">
        <LoginPage />
      </DesignSystemProvider>
    </QueryClientProvider>,
  )
}

describe('LoginPage motion', () => {
  it('keeps Ant Design animations on the dark screen while the system does not ask to reduce motion', () => {
    mockReducedMotion(false)
    const { getByTestId } = renderLogin()
    expect(getByTestId('motion').textContent).toBe('true')
  })

  it('stops Ant Design animations on the dark screen under reduced motion and follows a change', () => {
    const setReducedMotion = mockReducedMotion(true)
    const { getByTestId } = renderLogin()
    expect(getByTestId('motion').textContent).toBe('false')
    act(() => {
      setReducedMotion(false)
    })
    expect(getByTestId('motion').textContent).toBe('true')
  })
})
