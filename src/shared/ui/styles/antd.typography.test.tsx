// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { Typography } from 'antd'
import { afterEach, describe, expect, it } from 'vitest'

// No @types/node here and Vitest zeroes `.css?raw`: load `fs` untyped to read the real stylesheet.
// Under jsdom `import.meta.url` is not a file URL, so the path is relative to the project root,
// where Vitest runs.
const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: string, encoding: 'utf8') => string
}

// The Typography rules of `antd.css`, written out in full. A rule whose selector no longer matches
// what Ant Design renders goes dead without an error (DESIGN_SYSTEM §11), so it is matched against
// a real Typography.
const RULES = {
  code: '.ant-typography code',
} as const

const CSS = readFileSync('src/shared/ui/styles/antd.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** `selector { declarations }` of every Typography rule, whitespace collapsed. */
function typographyRules(): string[] {
  return [...CSS.matchAll(/^(\.ant-typography[^{]*?)\s*\{([^}]*)\}/gm)].map(
    (match) =>
      `${(match[1] ?? '').replace(/\s+/g, ' ')} { ${(match[2] ?? '').trim().replace(/\s+/g, ' ')} }`,
  )
}

afterEach(() => {
  cleanup()
})

describe('the Typography rules of antd.css', () => {
  it('are exactly these: code in text takes the smallest radius of DS §5, not 3px (#239 D10)', () => {
    expect(typographyRules()).toEqual([`${RULES.code} { border-radius: var(--rv-radius-xs); }`])
  })

  it('match the code inside a Typography text', () => {
    const { container } = render(
      <Typography.Text>
        Index failed: <code>rag_timeout</code>
      </Typography.Text>,
    )
    const code = container.querySelector('code')
    expect(code?.matches(RULES.code)).toBe(true)
  })
})
