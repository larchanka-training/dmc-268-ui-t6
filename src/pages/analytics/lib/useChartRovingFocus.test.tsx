// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { JSX } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { useChartRovingFocus } from './useChartRovingFocus'

function TestChart(props: { count: number }): JSX.Element {
  const { getItemProps } = useChartRovingFocus<SVGRectElement>(props.count)
  return (
    <svg role="group">
      {Array.from({ length: props.count }, (_, index) => (
        <rect key={index} data-testid={`bar-${String(index)}`} {...getItemProps(index)} />
      ))}
    </svg>
  )
}

describe('useChartRovingFocus', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders safely when count === 0', () => {
    render(<TestChart count={0} />)
    expect(screen.queryByRole('group')).toBeDefined()
  })

  it.each([
    ['ArrowRight', 1, 2],
    ['ArrowDown', 1, 2],
    ['ArrowLeft', 1, 0],
    ['ArrowUp', 1, 0],
    ['Home', 2, 0],
    ['End', 0, 4],
  ])('moves active index on %s from index %i to %i', (key, fromIndex, toIndex) => {
    render(<TestChart count={5} />)
    const fromBar = screen.getByTestId(`bar-${String(fromIndex)}`)
    fireEvent.focus(fromBar)
    expect(fromBar.getAttribute('tabindex')).toBe('0')

    fireEvent.keyDown(fromBar, { key })
    const targetBar = screen.getByTestId(`bar-${String(toIndex)}`)
    expect(targetBar.getAttribute('tabindex')).toBe('0')
    expect(document.activeElement).toBe(targetBar)
  })

  it('wraps forward from the last item to the first item', () => {
    render(<TestChart count={4} />)
    const lastBar = screen.getByTestId('bar-3')
    fireEvent.focus(lastBar)
    expect(lastBar.getAttribute('tabindex')).toBe('0')

    fireEvent.keyDown(lastBar, { key: 'ArrowRight' })
    const firstBar = screen.getByTestId('bar-0')
    expect(firstBar.getAttribute('tabindex')).toBe('0')
    expect(document.activeElement).toBe(firstBar)
  })

  it('wraps backward from the first item to the last item', () => {
    render(<TestChart count={4} />)
    const firstBar = screen.getByTestId('bar-0')
    fireEvent.focus(firstBar)
    expect(firstBar.getAttribute('tabindex')).toBe('0')

    fireEvent.keyDown(firstBar, { key: 'ArrowLeft' })
    const lastBar = screen.getByTestId('bar-3')
    expect(lastBar.getAttribute('tabindex')).toBe('0')
    expect(document.activeElement).toBe(lastBar)
  })

  it('clamps safe active index when item count shrinks from 30 to 7', () => {
    const { rerender } = render(<TestChart count={30} />)
    const bar25 = screen.getByTestId('bar-25')
    fireEvent.focus(bar25)
    expect(bar25.getAttribute('tabindex')).toBe('0')

    rerender(<TestChart count={7} />)
    const clampedBar = screen.getByTestId('bar-6')
    expect(clampedBar.getAttribute('tabindex')).toBe('0')
  })
})
