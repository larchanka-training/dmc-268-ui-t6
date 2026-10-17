// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { DataTable } from '../DataTable/DataTable'

// No @types/node here and Vitest zeroes `.css?raw`: load `fs` untyped to read the real stylesheet.
// Under jsdom `import.meta.url` is not a file URL, so the path is relative to the project root,
// where Vitest runs.
const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: string, encoding: 'utf8') => string
}

// The pinned-column rules of `antd.css`, written out in full. A rule whose selector no longer
// matches what Ant Design renders goes dead without an error (DESIGN_SYSTEM §11), so each one is
// matched against a real table with a pinned column; the colours behind its variables are pinned
// in `theme/buildTheme.test.ts`.
const RULES = {
  surface: [
    '.ant-table-wrapper .ant-table-thead > tr > th.ant-table-cell-fix',
    '.ant-table-wrapper .ant-table-tbody > tr > td.ant-table-cell-fix',
  ],
  hover:
    '.ant-table-wrapper .ant-table-tbody > tr > td.ant-table-cell-fix.ant-table-cell-row-hover',
} as const

// The pinned column's start-edge line while content scrolls under it. Ant Design marks the pinned
// cells with `-shadow-show` then and draws its shadow in their `::after`, which ours replaces.
const SHADOW_SHOW = 'ant-table-cell-fix-end-shadow-show'
const CUE = [
  `.ant-table-wrapper .ant-table-thead > tr > th.${SHADOW_SHOW}::after`,
  `.ant-table-wrapper .ant-table-tbody > tr > td.${SHADOW_SHOW}::after`,
] as const

const CSS = readFileSync('src/shared/ui/styles/antd.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** `selectors { declarations }` of every rule that names a pinned cell, whitespace collapsed. */
function pinnedRules(): string[] {
  return [...CSS.matchAll(/^([^{}]*ant-table-cell-fix[^{]*?)\s*\{([^}]*)\}/gm)].map(
    (match) =>
      `${(match[1] ?? '').trim().replace(/\s+/g, ' ')} { ${(match[2] ?? '').trim().replace(/\s+/g, ' ')} }`,
  )
}

/** Every rule Ant Design injected so far: its selectors and the text of its declarations. */
function injectedRules(): { selectors: string[]; body: string }[] {
  const css = [...document.querySelectorAll('style')].map((style) => style.textContent).join('\n')
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selectors: (match[1] ?? '').split(','),
    body: match[2] ?? '',
  }))
}

/** Specificity without `:where(…)`, which weighs nothing: classes first, then element names. */
function weightOf(selector: string): { plain: string; weight: [number, number] } {
  const plain = selector.replace(/:where\([^)]*\)/g, '').trim()
  const classes = plain.match(/\.[\w-]+/g)?.length ?? 0
  const elements = plain
    .replace(/\.[\w-]+/g, '')
    .split(/[\s>+~]+/)
    .filter((part) => /^[a-z]/i.test(part)).length
  return { plain, weight: [classes, elements] }
}

function heavier(a: [number, number], b: [number, number]): boolean {
  return a[0] !== b[0] ? a[0] > b[0] : a[1] > b[1]
}

/** A selector without its `::after` (jsdom writes the library's as `:after`), which `Element.matches` cannot test. */
function withoutPseudo(selector: string): string {
  return selector.replace(/::?(?:after|before)\s*$/, '')
}

/**
 * The selectors of Ant Design's rules that set `property` and match `cell`, with their weights. The
 * rules of a pseudo-element (`::after`) are told apart: they style the pseudo-element of a cell
 * (tested through the cell, the pseudo-element left off), not the cell.
 */
function libraryRulesFor(
  cell: Element | undefined,
  property: RegExp,
  pseudoElement = false,
): ReturnType<typeof weightOf>[] {
  return injectedRules().flatMap(({ selectors, body: declarations }) =>
    property.test(declarations)
      ? selectors
          .filter((selector) => /::?(?:after|before)\s*$/.test(selector.trim()) === pseudoElement)
          .map((selector) => weightOf(withoutPseudo(selector.trim())))
          .filter(({ plain }) => cell?.matches(plain) === true)
      : [],
  )
}

const PAINTS = /(^|[;\s])background(-color)?\s*:/
const ANIMATES = /(^|[;\s])transition\s*:/
const SHADOWS = /(^|[;\s])box-shadow\s*:/

interface Row {
  id: number
  name: string
}

function renderPinnedTable(): HTMLElement {
  const { container } = render(
    <DataTable<Row>
      columns={[
        { title: 'Название', dataIndex: 'name', key: 'name' },
        { title: '', key: 'actions', fixed: 'right', render: () => 'Настроить' },
      ]}
      dataSource={[
        { id: 1, name: 'dmc-268-ui-t6' },
        { id: 2, name: 'dmc-268-api-t6' },
      ]}
      rowKey="id"
      scroll={{ x: 900 }}
      tableLayout="auto"
    />,
  )
  return container
}

/** The unpinned cell of the first body row: hovering it hovers the whole row. */
function firstNameCell(container: HTMLElement): Element {
  const found = container.querySelector('tbody tr.ant-table-row td')
  if (found === null) {
    throw new Error('first body cell not found')
  }
  return found
}

afterEach(() => {
  cleanup()
})

describe('the pinned-column rules of antd.css', () => {
  it('are exactly these: an opaque surface for a pinned cell, no fade, the hover laid over it and the line while content is under it', () => {
    expect(pinnedRules()).toEqual([
      `${RULES.surface.join(', ')} { background: var(--rv-bg-raised); transition: none; }`,
      `${RULES.hover} { background: linear-gradient(var(--rv-hover), var(--rv-hover)), var(--rv-bg-raised); }`,
      `${CUE.join(', ')} { border-inline-end: 1px solid var(--rv-border-strong); box-shadow: none; }`,
    ])
  })

  it('match the pinned header and body cells and no other cell', () => {
    const container = renderPinnedTable()
    const [header, body] = RULES.surface
    expect(container.querySelectorAll('th')).toHaveLength(2)
    const pinned = [...container.querySelectorAll('th, td')].filter((cell) =>
      cell.matches(RULES.surface.join(', ')),
    )
    expect(pinned.map((cell) => cell.textContent)).toEqual(['', 'Настроить', 'Настроить'])
    expect(pinned.filter((cell) => cell.matches(header))).toHaveLength(1)
    expect(pinned.filter((cell) => cell.matches(body))).toHaveLength(2)
  })

  it('match the pinned cell of the hovered row only', () => {
    const container = renderPinnedTable()
    const cells = [...container.querySelectorAll('tbody td.ant-table-cell-fix')]
    expect(cells).toHaveLength(2)
    expect(cells.filter((cell) => cell.matches(RULES.hover))).toHaveLength(0)
    fireEvent.mouseEnter(firstNameCell(container))
    expect(cells.map((cell) => cell.matches(RULES.hover))).toEqual([true, false])
  })

  it('are heavier than every rule of Ant Design that paints those cells', () => {
    const container = renderPinnedTable()
    const [headerRule, bodyRule] = RULES.surface
    fireEvent.mouseEnter(firstNameCell(container))
    const header = container.querySelector('thead th.ant-table-cell-fix')
    const [hoveredCell, restingCell] = container.querySelectorAll('tbody td.ant-table-cell-fix')
    const cases: [Element | undefined, string][] = [
      [header ?? undefined, headerRule],
      [restingCell, bodyRule],
      [hoveredCell, RULES.hover],
    ]
    expect(hoveredCell?.classList.contains('ant-table-cell-row-hover')).toBe(true)
    expect(restingCell?.classList.contains('ant-table-cell-row-hover')).toBe(false)
    for (const [cell, rule] of cases) {
      const contenders = libraryRulesFor(cell, PAINTS)
      // The library's rules for the cell are found, and each one weighs less than ours.
      expect(contenders.length, rule).toBeGreaterThan(0)
      for (const { plain, weight } of contenders) {
        expect(heavier(weightOf(rule).weight, weight), `${rule} vs ${plain}`).toBe(true)
      }
    }
  })

  it('are heavier than every rule of Ant Design that fades those cells', () => {
    const container = renderPinnedTable()
    const [headerRule, bodyRule] = RULES.surface
    fireEvent.mouseEnter(firstNameCell(container))
    const header = container.querySelector('thead th.ant-table-cell-fix')
    const [hoveredCell, restingCell] = container.querySelectorAll('tbody td.ant-table-cell-fix')
    // The fade is switched off by the surface rule, which the hovered cell matches as well.
    const cases: [Element | undefined, string][] = [
      [header ?? undefined, headerRule],
      [restingCell, bodyRule],
      [hoveredCell, bodyRule],
    ]
    for (const [cell, rule] of cases) {
      const contenders = libraryRulesFor(cell, ANIMATES)
      expect(contenders.length, rule).toBeGreaterThan(0)
      for (const { plain, weight } of contenders) {
        expect(heavier(weightOf(rule).weight, weight), `${rule} vs ${plain}`).toBe(true)
      }
    }
  })

  it('draw the start-edge line only on the pinned cells Ant Design marks as covering content', () => {
    const container = renderPinnedTable()
    const selector = CUE.map(withoutPseudo).join(', ')
    const cells = [...container.querySelectorAll('th, td')]
    // At the end of the scroll (or when the table fits) nothing is marked, so there is no line.
    expect(cells.filter((cell) => cell.matches(selector))).toHaveLength(0)

    // jsdom has no layout, so Ant Design never marks a cell: put its mark where it would.
    for (const cell of container.querySelectorAll('.ant-table-cell-fix-end')) {
      cell.classList.add(SHADOW_SHOW)
    }
    const drawn = cells.filter((cell) => cell.matches(selector))
    expect(drawn.map((cell) => cell.textContent)).toEqual(['', 'Настроить', 'Настроить'])
    expect(drawn.filter((cell) => cell.matches(withoutPseudo(CUE[0])))).toHaveLength(1)
    expect(drawn.filter((cell) => cell.matches(withoutPseudo(CUE[1])))).toHaveLength(2)
  })

  it('are heavier than every rule of Ant Design that draws a shadow in that place', () => {
    const container = renderPinnedTable()
    for (const cell of container.querySelectorAll('.ant-table-cell-fix-end')) {
      cell.classList.add(SHADOW_SHOW)
    }
    const header = container.querySelector('thead th.ant-table-cell-fix')
    const body = container.querySelector('tbody td.ant-table-cell-fix')
    const cases: [Element | undefined, string][] = [
      [header ?? undefined, CUE[0]],
      [body ?? undefined, CUE[1]],
    ]
    for (const [cell, rule] of cases) {
      // Ant Design still draws its shadow in the `::after` of a marked pinned cell: that is what
      // the line replaces. If the library moves it, this finds none and the rule is dead.
      const contenders = libraryRulesFor(cell, SHADOWS, true)
      expect(contenders.length, rule).toBeGreaterThan(0)
      for (const { plain, weight } of contenders) {
        expect(heavier(weightOf(withoutPseudo(rule)).weight, weight), `${rule} vs ${plain}`).toBe(
          true,
        )
      }
    }
  })
})
