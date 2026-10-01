// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '../../features/auth'
import { CallbackPage } from './CallbackPage'

describe('CallbackPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      isLoading: false,
      error: null,
      isAuthenticated: false,
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('displays error if code query param is absent', async () => {
    window.history.pushState({}, '', '/auth/callback')

    render(<CallbackPage />)
    await waitFor(() => {
      expect(screen.getByText('Ошибка авторизации')).toBeDefined()
    })
  })

  it('renders CallbackPage inside StrictMode and exchanges code exactly once', async () => {
    window.history.pushState({}, '', '/auth/callback?code=test_code_strict&state=xyz')

    const handleCallbackSpy = vi.fn().mockResolvedValue(undefined)
    useAuthStore.setState({
      handleCallback: handleCallbackSpy,
    })

    const onSuccess = vi.fn()

    render(
      <React.StrictMode>
        <CallbackPage onSuccess={onSuccess} />
      </React.StrictMode>,
    )

    await waitFor(() => {
      expect(handleCallbackSpy).toHaveBeenCalledTimes(1)
      expect(handleCallbackSpy).toHaveBeenCalledWith('test_code_strict', 'xyz')
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })
  })

  it('displays user-friendly error and clears state when GitHub returns error=access_denied', async () => {
    sessionStorage.setItem('dmc_auth_oauth_state', 'active_state')
    window.history.pushState({}, '', '/auth/callback?error=access_denied')

    const onBackToLogin = vi.fn()
    render(<CallbackPage onBackToLogin={onBackToLogin} />)

    await waitFor(() => {
      expect(screen.getByText('Ошибка авторизации')).toBeDefined()
      expect(screen.getByText('Доступ отклонён пользователем на стороне GitHub')).toBeDefined()
      expect(sessionStorage.getItem('dmc_auth_oauth_state')).toBeNull()
    })

    const backButton = screen.getByRole('button', { name: /вернуться к экрану входа/i })
    backButton.click()
    expect(onBackToLogin).toHaveBeenCalledTimes(1)
  })
})
