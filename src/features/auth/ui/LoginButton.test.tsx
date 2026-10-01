// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { setMockAuthAdapter, useAuthStore } from '../model/store'
import { LoginButton } from './LoginButton'

describe('LoginButton', () => {
  beforeEach(() => {
    useAuthStore.setState({
      isLoading: false,
      error: null,
      isAuthenticated: false,
    })
    setMockAuthAdapter({
      loginAsMockUser: () => {
        useAuthStore.setState({ isAuthenticated: true })
      },
    })
  })

  afterEach(() => {
    cleanup()
    setMockAuthAdapter(null)
  })

  it('renders login buttons and triggers mock login', async () => {
    render(<LoginButton showMockButton={true} />)
    const githubBtn = screen.getByRole('button', { name: /войти через github/i })
    const mockBtn = screen.getByRole('button', { name: /войти как демо-пользователь/i })

    expect(githubBtn).toBeDefined()
    expect(mockBtn).toBeDefined()

    fireEvent.click(mockBtn)
    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
    })
  })
})
