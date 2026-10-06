// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { STATE_STORAGE_KEY } from '../../features/auth'
import { CallbackPage } from './CallbackPage'

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  window.history.replaceState(null, '', '/')
})

describe('CallbackPage OAuth errors', () => {
  it('shows a fixed Russian message instead of error_description', async () => {
    window.history.pushState({}, '', '/auth/callback?error=access_denied&error_description=Evil')

    render(<CallbackPage />)

    await waitFor(() => {
      expect(screen.getByText('Доступ отклонён пользователем на стороне GitHub')).toBeTruthy()
    })
    expect(screen.queryByText('Evil')).toBeNull()
  })

  it('clears OAuth state from sessionStorage when GitHub returns ?error=', async () => {
    sessionStorage.setItem(STATE_STORAGE_KEY, 'saved_state')
    window.history.pushState({}, '', '/auth/callback?error=access_denied')

    render(<CallbackPage />)

    await waitFor(() => {
      expect(screen.getByText('Доступ отклонён пользователем на стороне GitHub')).toBeTruthy()
    })
    expect(sessionStorage.getItem(STATE_STORAGE_KEY)).toBeNull()
  })

  it('shows a Russian message when code is missing', async () => {
    window.history.pushState({}, '', '/auth/callback')

    render(<CallbackPage />)

    await waitFor(() => {
      expect(screen.getByText('Отсутствует код авторизации (параметр code не найден)')).toBeTruthy()
    })
  })
})
