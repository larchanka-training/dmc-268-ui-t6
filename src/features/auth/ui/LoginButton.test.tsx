// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAuthStore } from '../model/store'
import { LoginButton } from './LoginButton'

describe('LoginButton', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
    })
  })

  it('renders login buttons and triggers mock login', () => {
    render(<LoginButton />)
    const githubBtn = screen.getByRole('button', { name: /войти через github/i })
    const mockBtn = screen.getByRole('button', { name: /войти как демо-пользователь/i })

    expect(githubBtn).toBeDefined()
    expect(mockBtn).toBeDefined()

    fireEvent.click(mockBtn)
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })
})
