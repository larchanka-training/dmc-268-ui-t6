// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { PageHeader } from './PageHeader'

// No @types/node here and Vitest zeroes `.css?raw`: load `fs` untyped to read the real stylesheets.
// Under jsdom `import.meta.url` is not a file URL, so the paths are relative to the project root,
// where Vitest runs.
const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: string, encoding: 'utf8') => string
}

interface CssRule {
  selector: string
  declarations: string
}

function cssRules(path: string): CssRule[] {
  const css = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: (match[1] ?? '').trim().replace(/\s+/g, ' '),
    declarations: (match[2] ?? '').trim().replace(/\s+/g, ' '),
  }))
}

/** Classes, attributes and pseudo-classes of a simple selector: the middle part of specificity. */
function specificity(selector: string): number {
  return (selector.match(/\.[\w-]+|\[[^\]]*\]|:(?!:)[\w-]+/g) ?? []).length
}

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

describe('the focus ring of the PageHeader heading', () => {
  const ring = cssRules('src/shared/ui/PageHeader/PageHeader.module.css').filter((rule) =>
    rule.selector.includes(':focus-visible'),
  )
  // The reset of Ant Design that takes the outline off an element with `tabindex="-1"`.
  const reset = cssRules('node_modules/antd/dist/reset.css').find((rule) =>
    rule.selector.includes('tabindex'),
  )

  it('is drawn as the DESIGN_SYSTEM §7 ring, on keyboard focus only', () => {
    expect(ring).toHaveLength(1)
    expect(ring[0]?.selector).toContain('.title')
    expect(ring[0]?.declarations).toBe('outline: 2px solid var(--rv-link); outline-offset: 2px;')
  })

  it('is more specific than the reset, so the order of the stylesheets does not matter', () => {
    expect(reset?.declarations).toBe('outline: none;')
    expect(specificity(ring[0]?.selector ?? '')).toBeGreaterThan(specificity(reset?.selector ?? ''))
  })
})
