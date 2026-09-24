// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RepositoriesPage } from './RepositoriesPage'

describe('RepositoriesPage', () => {
  it('renders repository list within layout', async () => {
    render(<RepositoriesPage />)

    await waitFor(() => {
      expect(screen.getByText('Подключенные репозитории')).toBeDefined()
      expect(screen.getByText('Подключить репозиторий')).toBeDefined()
    })
  })
})
