// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { PageHeader } from './PageHeader'

afterEach(() => {
  cleanup()
})

describe('PageHeader', () => {
  it('renders the title as the page heading', () => {
    render(<PageHeader title="Прогоны" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Прогоны' })).toBeTruthy()
  })

  it('renders the description and the actions when given', () => {
    render(
      <PageHeader
        actions={<button type="button">Обновить</button>}
        description="Подключено: 3"
        title="Репозитории"
      />,
    )
    expect(screen.getByText('Подключено: 3')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Обновить' })).toBeTruthy()
  })
})
