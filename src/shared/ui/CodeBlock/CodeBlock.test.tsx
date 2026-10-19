// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { CodeBlock } from './CodeBlock'
import styles from './CodeBlock.module.css'

const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: URL, encoding: 'utf8') => string
}
const STYLESHEET_PATH = './CodeBlock.module.css'

function codeRules(): CSSStyleRule[] {
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

describe('CodeBlock', () => {
  it('sets the specification code line height to 21px', () => {
    expect(codeRules().find((rule) => rule.selectorText === '.code')?.style.lineHeight).toBe('21px')
  })

  it('defines a 2px link outline for keyboard focus', () => {
    const focus = codeRules().find((rule) => rule.selectorText === '.code:focus-visible')
    expect(focus?.style.outline).toBe('2px solid var(--rv-link)')
  })

  it('keeps the text as written inside a pre element', () => {
    const { container } = render(<CodeBlock className="mine">{'{\n  "a": 1\n}'}</CodeBlock>)
    const pre = container.querySelector('pre')
    expect(pre?.textContent).toBe('{\n  "a": 1\n}')
    expect(pre?.classList.contains('mine')).toBe(true)
    expect(styles.code).toBeTruthy()
    expect(pre?.classList.contains(styles.code ?? '')).toBe(true)
    expect(pre?.hasAttribute('tabindex')).toBe(false)
  })
})
