// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { CodeBlock } from './CodeBlock'
import styles from './CodeBlock.module.css'

afterEach(() => {
  cleanup()
})

describe('CodeBlock', () => {
  it('keeps the text as written inside a pre element', () => {
    const { container } = render(<CodeBlock className="mine">{'{\n  "a": 1\n}'}</CodeBlock>)
    const pre = container.querySelector('pre')
    expect(pre?.textContent).toBe('{\n  "a": 1\n}')
    expect(pre?.classList.contains('mine')).toBe(true)
    expect(styles.code).toBeTruthy()
    expect(pre?.classList.contains(styles.code ?? '')).toBe(true)
  })
})
