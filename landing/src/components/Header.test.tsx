import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { resetAppUrl } from '../lib/appUrl'
import { Header } from './Header'
import styles from './Header.module.css'

beforeEach(() => {
  resetAppUrl()
})

describe('Header', () => {
  it('links Docs to /docs on the same origin, between Features and Try it now', () => {
    render(<Header />)

    const nav = screen.getByRole('navigation', { name: 'Primary' })
    const docs = screen.getByRole('link', { name: 'Docs' })
    expect(docs.getAttribute('href')).toBe('/docs')
    expect(docs.getAttribute('target')).toBeNull()
    const names = Array.from(nav.querySelectorAll('a'), (link) => link.textContent)
    expect(names).toEqual(['How it works', 'Features', 'Docs', 'Try it now'])
  })

  it('sets only Try it now apart from the grey section links, with no badge', () => {
    render(<Header />)

    const tryIt = screen.getByRole('link', { name: 'Try it now' })
    const how = screen.getByRole('link', { name: 'How it works' })
    const features = screen.getByRole('link', { name: 'Features' })
    // Features carries no extra emphasis class: it looks like How it works.
    expect(features.className).toBe(how.className)
    expect(tryIt.classList.length).toBeGreaterThan(how.classList.length)
    for (const name of how.classList) expect(tryIt.classList.contains(name)).toBe(true)
    expect(tryIt.textContent).toBe('Try it now')
    expect(screen.queryByText(/EAP/)).toBeNull()
  })

  it('keeps Docs apart from the section links that are hidden on phones', () => {
    render(<Header />)

    const docs = screen.getByRole('link', { name: 'Docs' })
    const how = screen.getByRole('link', { name: 'How it works' })
    // Docs has its own class so the phone rule that hides the section links skips it.
    const docsClass = styles.docs ?? ''
    expect(docsClass).not.toBe('')
    expect(docs.classList.contains(docsClass)).toBe(true)
    expect(how.classList.contains(docsClass)).toBe(false)
  })
})
