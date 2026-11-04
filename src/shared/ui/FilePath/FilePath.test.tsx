// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { FilePath } from './FilePath'
import styles from './FilePath.module.css'

const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: URL, encoding: 'utf8') => string
}
const STYLESHEET_PATH = './FilePath.module.css'

function pathStyle(): CSSStyleDeclaration | undefined {
  const style = document.createElement('style')
  style.textContent = readFileSync(new URL(STYLESHEET_PATH, import.meta.url), 'utf8')
  document.head.append(style)
  try {
    return [...(style.sheet?.cssRules ?? [])].find(
      (rule): rule is CSSStyleRule => rule instanceof CSSStyleRule && rule.selectorText === '.path',
    )?.style
  } finally {
    style.remove()
  }
}

afterEach(() => {
  cleanup()
})

describe('FilePath', () => {
  it('renders the given path as its text', () => {
    const path = 'src/widgets/diff-viewer/ui/RunDiff.tsx'
    render(<FilePath path={path} />)
    expect(screen.getByText(path)).toBeTruthy()
  })

  it('wraps a long path at any character instead of cutting it', () => {
    const style = pathStyle()
    expect(style?.getPropertyValue('overflow-wrap')).toBe('anywhere')
    expect(style?.getPropertyValue('text-overflow')).toBe('')
    expect(style?.getPropertyValue('white-space')).toBe('')
  })

  it('is monospace 12px in the secondary colour, from the tokens', () => {
    const style = pathStyle()
    expect(style?.getPropertyValue('font-family')).toBe('var(--rv-font-mono)')
    expect(style?.getPropertyValue('font-size')).toBe('var(--rv-fs-xs)')
    expect(style?.getPropertyValue('color')).toBe('var(--rv-text-2)')
  })

  it('keeps its own look next to the class of the caller', () => {
    render(<FilePath className="placed-by-screen" path="package.json" />)
    const element = screen.getByText('package.json')
    expect(element.classList.contains('placed-by-screen')).toBe(true)
    expect(styles.path).toBeTruthy()
    expect(element.classList.contains(styles.path ?? '')).toBe(true)
  })
})
