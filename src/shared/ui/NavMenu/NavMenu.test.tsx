// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { NavMenu } from './NavMenu'
import styles from './NavMenu.module.css'

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

  it('names every item for assistive tech, also when the text is hidden in a folded menu', () => {
    render(<NavMenu items={items} label="Разделы" />)
    const menuItems = screen.getAllByRole('menuitem')
    expect(menuItems.map((item) => item.getAttribute('aria-label'))).toEqual([
      'Репозитории',
      'Прогоны',
    ])
  })

  it('keeps the links out of the tab order: the menu moves the focus itself', () => {
    render(<NavMenu items={items} label="Разделы" />)
    expect(screen.getByText('Прогоны').getAttribute('tabindex')).toBe('-1')
  })

  it('selects the item of the current page and indents items by 8px', () => {
    render(<NavMenu items={items} label="Разделы" selectedPath="/runs" />)
    const [repositories, runs] = screen.getAllByRole('menuitem')
    expect(runs?.classList.contains('ant-menu-item-selected')).toBe(true)
    expect(repositories?.classList.contains('ant-menu-item-selected')).toBe(false)
    expect(runs?.style.paddingLeft).toBe('8px')
  })

  it('keeps its own class next to a class of the caller', () => {
    render(<NavMenu className="mine" items={items} label="Разделы" />)
    const nav = screen.getByRole('navigation')
    expect(styles.nav).toBeTruthy()
    expect(nav.classList.contains(styles.nav ?? '')).toBe(true)
    expect(nav.classList.contains('mine')).toBe(true)
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

  it('lets the link work on its own when nobody handles navigation', () => {
    render(<NavMenu items={items} label="Разделы" />)
    const notCancelled = fireEvent.click(screen.getByText('Прогоны'))
    expect(notCancelled).toBe(true)
  })
})
