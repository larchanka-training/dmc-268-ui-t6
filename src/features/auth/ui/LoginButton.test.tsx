// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useAuthStore } from '../model/store'
import { LoginButton } from './LoginButton'

describe('LoginButton', () => {
  beforeEach(() => {
    useAuthStore.setState({
      isLoading: false,
      error: null,
      isAuthenticated: false,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders login buttons and triggers mock login', () => {
    render(<LoginButton showMockButton={true} />)
    const githubBtn = screen.getByRole('button', { name: /войти через github/i })
    const mockBtn = screen.getByRole('button', { name: /войти как демо-пользователь/i })

    expect(githubBtn).toBeDefined()
    expect(mockBtn).toBeDefined()

    // Mock login should work when explicitly triggered or allowed
    useAuthStore.setState({
      loginAsMockUser: () => {
        useAuthStore.setState({ isAuthenticated: true })
      },
    })

    fireEvent.click(mockBtn)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })
})
