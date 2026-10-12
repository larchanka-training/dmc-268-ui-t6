// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Logo } from './Logo'

afterEach(() => {
  cleanup()
})

describe('Logo', () => {
  it('is an image with a name when a title is given', () => {
    render(<Logo title="Reviewer" />)
    expect(screen.getByRole('img', { name: 'Reviewer' })).toBeTruthy()
  })

  it('is hidden from assistive tech without a title or with an empty one', () => {
    for (const title of [undefined, ''] as const) {
      const { container, unmount } = render(<Logo title={title} />)
      expect(screen.queryByRole('img')).toBeNull()
      expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
      unmount()
    }
  })
})
