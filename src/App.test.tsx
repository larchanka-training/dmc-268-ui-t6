// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('App root integration', () => {
  it('renders application with layout and navigation', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('AI Code Reviewer')).toBeDefined()
      expect(screen.getByText('Репозитории')).toBeDefined()
    })
  })
})
