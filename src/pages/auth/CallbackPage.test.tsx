// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '../../features/auth'
import { CallbackPage } from './CallbackPage'

describe('CallbackPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('displays error if code query param is absent', async () => {
    window.history.pushState({}, '', '/auth/callback')

    render(<CallbackPage />)
    await waitFor(() => {
      expect(screen.getByText('Ошибка авторизации')).toBeDefined()
    })
  })

  it('processes code and triggers onSuccess when code is present', async () => {
    window.history.pushState({}, '', '/auth/callback?code=mock_code_123')

    const onSuccess = vi.fn()
    render(<CallbackPage onSuccess={onSuccess} />)

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })
})
