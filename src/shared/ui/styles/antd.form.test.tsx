// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { Form, Input } from 'antd'
import { afterEach, describe, expect, it } from 'vitest'

// No @types/node here and Vitest zeroes `.css?raw`: load `fs` untyped to read the real stylesheet.
// Under jsdom `import.meta.url` is not a file URL, so the path is relative to the project root,
// where Vitest runs.
const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: string, encoding: 'utf8') => string
}

// The inline Form rules of `antd.css`, written out in full. A rule whose selector no longer
// matches what Ant Design renders goes dead without an error (DESIGN_SYSTEM §11), so each one is
// matched against a real inline form.
const RULES = {
  row: '.ant-form-inline .ant-form-item .ant-form-item-row',
  label: '.ant-form-inline .ant-form-item .ant-form-item-label',
  control: '.ant-form-inline .ant-form-item .ant-form-item-control',
} as const

const CSS = readFileSync('src/shared/ui/styles/antd.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** The body of the one `@media` block with this condition. */
function mediaBlock(condition: string): string {
  const start = CSS.indexOf(`@media ${condition} {`)
  expect(start).toBeGreaterThanOrEqual(0)
  const end = CSS.indexOf('\n}\n', start)
  return CSS.slice(start, end)
}

/** `selector { declarations }` pairs of a block, whitespace collapsed. */
function rules(block: string): string[] {
  return [...block.matchAll(/(\.ant-form-inline[^{]*?)\s*\{([^}]*)\}/g)].map(
    (match) =>
      `${(match[1] ?? '').replace(/\s+/g, ' ')} { ${(match[2] ?? '').trim().replace(/\s+/g, ' ')} }`,
  )
}

afterEach(() => {
  cleanup()
})

describe('the inline Form rules of antd.css', () => {
  it('keep a label beside its control from 576px up, only the control narrowing', () => {
    expect(rules(mediaBlock('(width >= 576px)'))).toEqual([
      `${RULES.row} { flex-wrap: nowrap; }`,
      `${RULES.label} { flex-shrink: 0; }`,
    ])
  })

  it('put the label above a full-width control below 576px', () => {
    expect(rules(mediaBlock('(width < 576px)'))).toEqual([
      `${RULES.label}, ${RULES.control} { flex: 0 0 100%; max-width: 100%; }`,
    ])
  })

  it('are the only inline Form rules of the stylesheet', () => {
    expect(rules(CSS)).toHaveLength(3)
  })

  it('match the row, the label and the control that an inline form renders', () => {
    render(
      <Form layout="inline">
        <Form.Item htmlFor="search" label="Поиск">
          <Input id="search" />
        </Form.Item>
      </Form>,
    )
    const label = screen.getByText('Поиск').closest('.ant-form-item-label')
    const row = label?.parentElement
    const control = screen.getByRole('textbox').closest('.ant-form-item-control')
    expect(row?.matches(RULES.row)).toBe(true)
    expect(label?.matches(RULES.label)).toBe(true)
    expect(control?.matches(RULES.control)).toBe(true)
  })

  it('leave a form of another layout alone', () => {
    render(
      <Form layout="horizontal">
        <Form.Item htmlFor="search" label="Поиск">
          <Input id="search" />
        </Form.Item>
      </Form>,
    )
    const label = screen.getByText('Поиск').closest('.ant-form-item-label')
    expect(label?.matches(RULES.label)).toBe(false)
    expect(label?.parentElement?.matches(RULES.row)).toBe(false)
  })
})
