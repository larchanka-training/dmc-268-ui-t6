// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { Input } from 'antd'
import { afterEach, describe, expect, it } from 'vitest'

// No @types/node here and Vitest zeroes `.css?raw`: load `fs` untyped to read the real stylesheet.
// Under jsdom `import.meta.url` is not a file URL, so the path is relative to the project root,
// where Vitest runs.
const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: string, encoding: 'utf8') => string
}

// The Input rules of `antd.css`, written out in full. A rule whose selector no longer matches what
// Ant Design renders goes dead without an error (DESIGN_SYSTEM §11), so it is matched against a
// real input with a clear button.
const FOCUSED_CLEAR =
  '.ant-input-affix-wrapper .ant-input-suffix .ant-input-clear-icon:focus-visible'

const CSS = readFileSync('src/shared/ui/styles/antd.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

afterEach(() => {
  cleanup()
})

describe('the Input rules of antd.css', () => {
  it('are exactly this one: the focused clear button with the 2px focus ring of §7', () => {
    const rules = [...CSS.matchAll(/^(\.ant-input[^{]*?)\s*\{([^}]*)\}/gm)].map(
      (match) =>
        `${(match[1] ?? '').replace(/\s+/g, ' ')} { ${(match[2] ?? '').trim().replace(/\s+/g, ' ')} }`,
    )
    expect(rules).toEqual([
      `${FOCUSED_CLEAR} { border-radius: 50%; outline: 2px solid var(--rv-link); outline-offset: 2px; }`,
    ])
  })

  it('match the clear button only while it has the keyboard focus', () => {
    const { container } = render(<Input allowClear defaultValue="утечка" />)
    const clear = container.querySelector<HTMLElement>('.ant-input-clear-icon')
    expect(clear).not.toBeNull()
    expect(clear?.matches(FOCUSED_CLEAR)).toBe(false)

    clear?.focus()

    expect(clear?.matches(FOCUSED_CLEAR)).toBe(true)
  })
})
