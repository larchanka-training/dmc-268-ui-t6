// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { NavMenu } from './NavMenu'

afterEach(() => {
  cleanup()
})

const items = [
  { path: '/repositories', icon: <i />, label: 'Репозитории' },
  { path: '/runs', icon: <i />, label: 'Прогоны' },
]

describe('NavMenu', () => {
  it('is a navigation landmark with a name', () => {
    render(<NavMenu items={items} label="Разделы" />)
    expect(screen.getByRole('navigation', { name: 'Разделы' })).toBeTruthy()
  })

  it('renders every item as a link to its page', () => {
    render(<NavMenu items={items} label="Разделы" />)
    expect(screen.getByText('Репозитории').getAttribute('href')).toBe('/repositories')
    expect(screen.getByText('Прогоны').getAttribute('href')).toBe('/runs')
  })

  it('marks only the current page', () => {
    render(<NavMenu items={items} label="Разделы" selectedPath="/runs" />)
    expect(screen.getByText('Прогоны').getAttribute('aria-current')).toBe('page')
    expect(screen.getByText('Репозитории').hasAttribute('aria-current')).toBe(false)
  })

  it('marks nothing when no page is selected', () => {
    const { container } = render(<NavMenu items={items} label="Разделы" />)
    expect(container.querySelector('[aria-current]')).toBeNull()
  })

  it('navigates inside the app on a plain click and cancels the page load', () => {
    const onNavigate = vi.fn()
    render(<NavMenu items={items} label="Разделы" onNavigate={onNavigate} />)
    const notCancelled = fireEvent.click(screen.getByText('Прогоны'))
    expect(onNavigate).toHaveBeenCalledWith('/runs')
    expect(notCancelled).toBe(false)
  })

  it('leaves a click with a modifier to the browser', () => {
    const onNavigate = vi.fn()
    render(<NavMenu items={items} label="Разделы" onNavigate={onNavigate} />)
    for (const modifier of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }]) {
      const notCancelled = fireEvent.click(screen.getByText('Прогоны'), modifier)
      expect(notCancelled).toBe(true)
    }
    expect(onNavigate).not.toHaveBeenCalled()
  })
})
