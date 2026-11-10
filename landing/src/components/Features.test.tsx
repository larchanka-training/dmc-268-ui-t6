import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Features } from './Features'

describe('Features', () => {
  it('shows the six feature cards in order', () => {
    render(<Features />)

    const section = screen.getByRole('region', { name: 'Signal, not noise.' })
    const titles = within(section)
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
    expect(titles).toEqual([
      'AI-powered reviews',
      'Full transparency',
      'Less noise, more signal',
      'Merge protection',
      'Code index',
      'Branch filter',
    ])
  })
})
