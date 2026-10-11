// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Tag } from './Tag'

afterEach(() => {
  cleanup()
})

describe('Tag', () => {
  it('renders a dot by default and keeps the label as the carrier of meaning', () => {
    render(<Tag tone="success">succeeded</Tag>)
    const tag = screen.getByText('succeeded')
    expect(tag.dataset.variant).toBe('dot')
    expect(tag.dataset.tone).toBe('success')
    expect(tag.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })

  it('renders no dot for a solid tag', () => {
    render(
      <Tag tone="critical" variant="solid">
        critical
      </Tag>,
    )
    const tag = screen.getByText('critical')
    expect(tag.dataset.variant).toBe('solid')
    expect(tag.querySelector('[aria-hidden="true"]')).toBeNull()
  })

  it('shows the icon only for an outline tag', () => {
    const { rerender } = render(
      <Tag icon={<i data-testid="icon" />} variant="outline">
        main
      </Tag>,
    )
    expect(screen.getByTestId('icon')).toBeTruthy()
    rerender(<Tag icon={<i data-testid="icon" />}>main</Tag>)
    expect(screen.queryByTestId('icon')).toBeNull()
  })

  it('marks the dot as pulsing for a state in progress', () => {
    render(
      <Tag pulse tone="info">
        running
      </Tag>,
    )
    const dot = screen.getByText('running').querySelector('[aria-hidden="true"]')
    expect(dot?.getAttribute('data-pulse')).toBe('true')
  })
})
