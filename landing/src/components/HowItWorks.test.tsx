import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HowItWorks } from './HowItWorks'

describe('HowItWorks', () => {
  it('names the providers for a screen reader in a visually hidden line', () => {
    render(<HowItWorks />)

    const line = screen.getByText('GitHub · GitLab and Bitbucket coming soon')
    expect(line).toHaveProperty('className', 'visually-hidden')
    expect(line.closest('[aria-hidden="true"]')).toBeNull()
  })

  it('dims the GitLab and Bitbucket icons next to a Coming soon label in the decorative row', () => {
    render(<HowItWorks />)

    const label = screen.getByText('Coming soon')
    expect(label.tagName).toBe('SPAN')
    // Обе иконки стоят в той же группе, что и метка, и приглушаются по классу, а не по title.
    const group = label.parentElement
    for (const name of ['GitLab', 'Bitbucket']) {
      const icon = group?.querySelector(`[title="${name}"]`)
      expect(icon?.className).toMatch(/providerIcon/)
    }
    // The row is hidden from a screen reader: the visually hidden line says the same.
    expect(label.closest('[aria-hidden="true"]')).not.toBeNull()
  })
})
