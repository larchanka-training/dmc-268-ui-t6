// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useAuthStore } from '../../features/auth'
import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders login screen title and buttons', () => {
    render(<LoginPage />)
    expect(screen.getByText('AI Code Reviewer')).toBeDefined()
    expect(screen.getByRole('button', { name: /войти через github/i })).toBeDefined()
  })
})
