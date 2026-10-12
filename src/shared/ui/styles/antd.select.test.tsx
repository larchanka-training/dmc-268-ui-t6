// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { Select } from 'antd'
import { afterEach, describe, expect, it } from 'vitest'

// No @types/node here and Vitest zeroes `.css?raw`: load `fs` untyped to read the real stylesheet.
// Under jsdom `import.meta.url` is not a file URL, so the path is relative to the project root,
// where Vitest runs.
const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: string, encoding: 'utf8') => string
}

// The Select rules of `antd.css`, written out in full. A rule whose selector no longer matches
// what Ant Design renders goes dead without an error (DESIGN_SYSTEM §11), so each one is matched
// against a real select. The check mark's colour is pinned in `theme/buildTheme.test.ts`.
const RULES = {
  checkMark:
    '.ant-select-dropdown .ant-select-item.ant-select-item-option-selected:not(.ant-select-item-option-disabled) .ant-select-item-option-state',
  focusedClear: '.ant-select .ant-select-clear:focus-visible',
  arrowUnderFocusedClear: '.ant-select:has(.ant-select-clear:focus-visible) .ant-select-suffix',
  disabledArrow: '.ant-select.ant-select-disabled .ant-select-suffix',
} as const

const CSS = readFileSync('src/shared/ui/styles/antd.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** `selector { declarations }` of every Select rule, whitespace collapsed. */
function selectRules(): string[] {
  return [...CSS.matchAll(/^(\.ant-select[^{]*?)\s*\{([^}]*)\}/gm)].map(
    (match) =>
      `${(match[1] ?? '').replace(/\s+/g, ' ')} { ${(match[2] ?? '').trim().replace(/\s+/g, ' ')} }`,
  )
}

function renderSelect() {
  return render(
    <Select
      allowClear
      mode="multiple"
      open
      options={[
        { value: 'critical', label: 'Critical' },
        { value: 'info', label: 'Info' },
      ]}
      value={['critical']}
    />,
  )
}

function only(selector: string, root: ParentNode = document): HTMLElement {
  const found = root.querySelectorAll<HTMLElement>(selector)
  expect(found).toHaveLength(1)
  const [element] = found
  if (element === undefined) {
    throw new Error(`${selector} not found`)
  }
  return element
}

afterEach(() => {
  cleanup()
})

describe('the Select rules of antd.css', () => {
  it('are exactly these, the focused clear button with the focus ring of §7', () => {
    expect(selectRules()).toEqual([
      `${RULES.checkMark} { color: var(--rv-text); }`,
      `${RULES.disabledArrow} { color: var(--ant-color-text-disabled); }`,
      `${RULES.focusedClear} { border-radius: 50%; opacity: 1; outline: 2px solid var(--rv-link); outline-offset: 2px; }`,
      `${RULES.arrowUnderFocusedClear} { opacity: 0; }`,
    ])
  })

  it('match the clear button only while it has the keyboard focus, and the arrow under it', () => {
    const { container } = renderSelect()
    const clear = only('.ant-select-clear', container)
    const arrow = only('.ant-select-suffix', container)
    expect(clear.matches(RULES.focusedClear)).toBe(false)
    expect(arrow.matches(RULES.arrowUnderFocusedClear)).toBe(false)

    clear.focus()

    expect(clear.matches(RULES.focusedClear)).toBe(true)
    expect(arrow.matches(RULES.arrowUnderFocusedClear)).toBe(true)
  })

  it('match the arrow of a disabled select and not of an enabled one', () => {
    const { container } = render(
      <>
        <Select disabled options={[{ value: 'a', label: 'A' }]} value="a" />
        <Select options={[{ value: 'a', label: 'A' }]} value="a" />
      </>,
    )
    const [disabledArrow, enabledArrow] = [...container.querySelectorAll('.ant-select-suffix')]
    expect(disabledArrow?.matches(RULES.disabledArrow)).toBe(true)
    expect(enabledArrow?.matches(RULES.disabledArrow)).toBe(false)
  })

  it('match the check mark of a selected option and not of the others', () => {
    renderSelect()
    const [selected, other] = [
      ...document.querySelectorAll('.ant-select-item-option .ant-select-item-option-state'),
    ]
    expect(selected?.matches(RULES.checkMark)).toBe(true)
    expect(other?.matches(RULES.checkMark) ?? false).toBe(false)
  })
})
