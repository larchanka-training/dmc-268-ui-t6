// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { createRef } from 'react'
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

  it('renders only the heading when there is nothing else to show', () => {
    const { container } = render(<PageHeader title="Прогоны" />)
    expect(container.querySelector('p')).toBeNull()
    expect(container.querySelectorAll('header > *')).toHaveLength(1)
  })

  it('treats an empty description and empty actions as absent', () => {
    for (const empty of [null, '', false] as const) {
      const { container, unmount } = render(
        <PageHeader actions={empty} description={empty} title="Прогоны" />,
      )
      expect(container.querySelector('p')).toBeNull()
      expect(container.querySelectorAll('header > *')).toHaveLength(1)
      unmount()
    }
  })

  it('leaves the heading out of the focus order by default', () => {
    render(<PageHeader title="Прогоны" />)
    expect(screen.getByRole('heading', { name: 'Прогоны' }).hasAttribute('tabindex')).toBe(false)
  })

  it('exposes the heading to a ref and lets a script focus it', () => {
    const titleRef = createRef<HTMLHeadingElement>()
    render(<PageHeader title="Прогоны" titleRef={titleRef} />)

    const heading = screen.getByRole('heading', { name: 'Прогоны' })
    expect(titleRef.current).toBe(heading)
    // Focusable by `focus()`, but not a stop of the Tab key.
    expect(heading.getAttribute('tabindex')).toBe('-1')
    titleRef.current?.focus()
    expect(document.activeElement).toBe(heading)
  })
})
