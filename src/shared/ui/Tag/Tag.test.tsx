// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Tag } from './Tag'
import styles from './Tag.module.css'

const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: URL, encoding: 'utf8') => string
}
const STYLESHEET_PATH = './Tag.module.css'

function tagRules(): CSSStyleRule[] {
  const style = document.createElement('style')
  style.textContent = readFileSync(new URL(STYLESHEET_PATH, import.meta.url), 'utf8')
  document.head.append(style)
  try {
    return [...(style.sheet?.cssRules ?? [])].filter(
      (rule): rule is CSSStyleRule => rule instanceof CSSStyleRule,
    )
  } finally {
    style.remove()
  }
}

afterEach(() => {
  cleanup()
})

describe('Tag', () => {
  it('keeps the critical solid label at weight 500 while retaining its 22% tint', () => {
    const rules = tagRules()
    const base = rules.find((rule) => rule.selectorText === '.tag')
    const critical = rules.find(
      (rule) => rule.selectorText === ".tag[data-variant='solid'][data-tone='critical']",
    )
    const criticalWeight = critical?.style.fontWeight
    expect(criticalWeight === '' ? base?.style.fontWeight : criticalWeight).toBe('500')
    expect(critical?.style.background).toBe('color-mix(in srgb, var(--tone) 22%, transparent)')
  })

  it('renders a dot by default and keeps the label as the carrier of meaning', () => {
    render(<Tag tone="success">succeeded</Tag>)
    const tag = screen.getByText('succeeded')
    expect(tag.dataset.variant).toBe('dot')
    expect(tag.dataset.tone).toBe('success')
    expect(tag.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })

  it('renders no dot for a solid tag', () => {
    render(
      <Tag className="caller-class" tone="critical" variant="solid">
        critical
      </Tag>,
    )
    const tag = screen.getByText('critical')
    expect(tag.dataset.variant).toBe('solid')
    expect(tag.classList.contains('caller-class')).toBe(true)
    expect(styles.tag).toBeTruthy()
    expect(tag.classList.contains(styles.tag ?? '')).toBe(true)
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

  it('leaves the dot still unless a pulse is asked for', () => {
    render(<Tag tone="info">queued</Tag>)
    const dot = screen.getByText('queued').querySelector('[aria-hidden="true"]')
    expect(dot).not.toBeNull()
    expect(dot?.hasAttribute('data-pulse')).toBe(false)
  })

  it('falls back to the neutral tone', () => {
    render(<Tag>draft</Tag>)
    expect(screen.getByText('draft').dataset.tone).toBe('neutral')
  })
})
