// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CallbackPage } from './CallbackPage'

describe('CallbackPage OAuth errors', () => {
  it('shows a fixed Russian message instead of error_description', async () => {
    window.history.pushState({}, '', '/auth/callback?error=access_denied&error_description=Evil')

    render(<CallbackPage />)

    await waitFor(() => {
      expect(screen.getByText('Доступ отклонён пользователем на стороне GitHub')).toBeTruthy()
    })
    expect(screen.queryByText('Evil')).toBeNull()
  })
})
