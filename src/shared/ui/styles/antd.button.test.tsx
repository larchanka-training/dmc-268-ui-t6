// @vitest-environment jsdom
import { cleanup, render, renderHook } from '@testing-library/react'
import { Button, ConfigProvider } from 'antd'
import type { JSX, ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { useDisabledButtonClass } from '../lib/useDisabledButtonClass'
import { buildTheme } from '../theme/buildTheme'
import { RV_PALETTE } from '../theme/palette'

// No @types/node here and Vitest zeroes `.css?raw`: load `fs` untyped to read the real stylesheet.
// Under jsdom `import.meta.url` is not a file URL, so the path is relative to the project root,
// where Vitest runs.
const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: string, encoding: 'utf8') => string
}

// The Button rule of `antd.css`, written out in full. A rule whose selector no longer matches
// what Ant Design renders goes dead without an error (DESIGN_SYSTEM §11), so it is matched against
// real buttons. The colours behind its variables are pinned in `theme/buildTheme.test.ts`.
const RULE = '.ant-btn.ant-btn-color-dangerous.ant-btn-variant-outlined'

const CSS = readFileSync('src/shared/ui/styles/antd.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** `selector { declarations }` of every Button rule, whitespace collapsed. */
function buttonRules(): string[] {
  return [...CSS.matchAll(/^(\.ant-btn[^{]*?)\s*\{([^}]*)\}/gm)].map(
    (match) =>
      `${(match[1] ?? '').replace(/\s+/g, ' ')} { ${(match[2] ?? '').trim().replace(/\s+/g, ' ')} }`,
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

/** Every rule Ant Design injected so far: its selectors and the text of its declarations. */
function injectedRules(): { selectors: string[]; body: string }[] {
  const css = [...document.querySelectorAll('style')].map((style) => style.textContent).join('\n')
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selectors: (match[1] ?? '').split(','),
    body: match[2] ?? '',
  }))
}

/** The selector without `:where(…)`, which weighs nothing, as the rest weighs in classes. */
function classesOf(selector: string): { plain: string; classes: number } {
  const plain = selector.replace(/:where\([^)]*\)/g, '').trim()
  return { plain, classes: plain.match(/\.[\w-]+/g)?.length ?? 0 }
}

afterEach(() => {
  cleanup()
})

describe('the Button rule of antd.css', () => {
  it('is exactly this one, the outlined danger button with its own rest, hover and press', () => {
    expect(buttonRules()).toEqual([
      `${RULE} { --ant-btn-bg-color: var(--rv-surface); --ant-btn-bg-color-hover: var(--rv-danger-bg); --ant-btn-bg-color-active: var(--rv-danger-bg-active); }`,
    ])
  })

  it('matches a danger default button and no other variant', () => {
    const { container } = render(
      <>
        <Button danger>Остановить</Button>
        <Button danger type="primary">
          Удалить
        </Button>
        <Button danger type="text">
          Сбросить
        </Button>
        <Button>Отмена</Button>
        <Button type="primary">Сохранить</Button>
        <Button type="text">Закрыть</Button>
      </>,
    )
    const matching = [...container.querySelectorAll('button')].filter((button) =>
      button.matches(RULE),
    )
    expect(matching.map((button) => button.textContent)).toEqual(['Остановить'])
  })

  it('is heavier than every rule of Ant Design that sets the same variables on that button', () => {
    const { container } = render(<Button danger>Удалить</Button>)
    const button = only('button', container)
    const ours = classesOf(RULE).classes
    const contenders = injectedRules().flatMap(({ selectors, body }) =>
      /--ant-btn-bg-color(-hover|-active)?\s*:/.test(body)
        ? selectors.map(classesOf).filter(({ plain }) => button.matches(plain))
        : [],
    )
    // The library's rules for this button are found, and each one weighs less than ours.
    expect(contenders.length).toBeGreaterThan(0)
    for (const { plain, classes } of contenders) {
      expect(classes, plain).toBeLessThan(ours)
    }
  })
})

describe('the Button theme', () => {
  /** The declarations Ant Design writes on `.ant-btn` itself: where its component tokens land. */
  function onButton(mode: 'dark' | 'light'): string {
    render(
      <ConfigProvider theme={buildTheme(mode)}>
        <Button type="text">Отмена</Button>
      </ConfigProvider>,
    )
    const rule = injectedRules().find(
      ({ selectors, body }) =>
        selectors.some((selector) => /^\.css-var-[^.\s]+\.ant-btn$/.test(selector.trim())) &&
        body.includes('--ant-button-'),
    )
    return (rule?.body ?? '').replace(/\s+/g, '')
  }

  it('hands the press colours of a text and a danger text button to the button alone', () => {
    for (const mode of ['dark', 'light'] as const) {
      const p = RV_PALETTE[mode]
      const own = onButton(mode)
      cleanup()
      expect(own, mode).toContain(`--ant-color-fill:${p.buttonTextActive.replace(/\s+/g, '')}`)
      expect(own, mode).toContain(`--ant-color-error-bg-active:${p.dangerBgActive}`)
    }
  })

  it('leaves the page-wide error background of the press for the rest of the app', () => {
    render(
      <ConfigProvider theme={buildTheme('dark')}>
        <Button type="text">Отмена</Button>
      </ConfigProvider>,
    )
    const root = injectedRules().find(({ selectors }) =>
      selectors.some((selector) => /^\.css-var-[^.\s]+$/.test(selector.trim())),
    )
    expect(root?.body).toContain(`--ant-color-error-bg-active:${RV_PALETTE.dark.dangerBorder}`)
  })
})

// RunControls' aria-disabled cancel relies on these antd rules; an antd upgrade that changes them
// turns this red.
describe('the disabled class of useDisabledButtonClass', () => {
  /** The button that keeps the focus but looks disabled, as «Отмена запрошена» in RunControls. */
  function ClassDisabledButton(): JSX.Element {
    const disabledClass = useDisabledButtonClass()
    return (
      <Button aria-disabled className={disabledClass}>
        Отмена запрошена
      </Button>
    )
  }

  /** A natively disabled default button next to a default one with the class, and the class. */
  function renderPair(): { native: HTMLElement; classed: HTMLElement; disabledClass: string } {
    const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
      <ConfigProvider theme={buildTheme('light')}>{children}</ConfigProvider>
    )
    const { container } = render(
      <>
        <Button disabled>Отмена</Button>
        <ClassDisabledButton />
      </>,
      { wrapper },
    )
    const { result } = renderHook(() => useDisabledButtonClass(), { wrapper })
    const classed = only('button[aria-disabled="true"]', container)
    expect(classed.classList.contains(result.current)).toBe(true)
    return { native: only('button[disabled]', container), classed, disabledClass: result.current }
  }

  /** Whether the element matches any selector of a rule, `:where(…)` set aside as classesOf() does. */
  function ruleMatches(element: HTMLElement, selectors: string[]): boolean {
    return selectors.some((selector) => element.matches(classesOf(selector).plain))
  }

  const NOT_ALLOWED = /cursor\s*:\s*not-allowed/
  const OUTLINE = /(?:^|;)\s*outline\s*:/

  it('gives the button the look of a natively disabled one', () => {
    const { native, classed } = renderPair()
    const rules = injectedRules().filter(
      ({ selectors, body }) =>
        NOT_ALLOWED.test(body) ||
        (selectors.some((selector) => /:disabled|-disabled/.test(selector)) &&
          (ruleMatches(native, selectors) || ruleMatches(classed, selectors))),
    )
    for (const { selectors } of rules) {
      expect(ruleMatches(classed, selectors), selectors.join(',')).toBe(
        ruleMatches(native, selectors),
      )
    }
    // The disabled look itself is found, and it reaches both buttons.
    expect(
      rules.some(
        ({ selectors, body }) =>
          NOT_ALLOWED.test(body) &&
          ruleMatches(native, selectors) &&
          ruleMatches(classed, selectors),
      ),
    ).toBe(true)
  })

  it('leaves the button without hover and press, as a natively disabled one', () => {
    const { disabledClass } = renderPair()
    const selectors = injectedRules()
      .flatMap((rule) => rule.selectors)
      .filter(
        (selector) => /:(hover|active)\b/.test(selector) && selector.includes(':not(:disabled)'),
      )
    // The library's hover and press selectors are found, and each one leaves out the class.
    expect(selectors.length).toBeGreaterThan(0)
    for (const selector of selectors) {
      expect(selector).toContain(`:not(.${disabledClass})`)
    }
  })

  it('keeps the focus ring that a natively disabled button never shows, as a focusable button must', () => {
    const { native, classed } = renderPair()

    classed.focus()

    expect(document.activeElement).toBe(classed)
    const rings = injectedRules().filter(
      ({ selectors, body }) =>
        OUTLINE.test(body) && ruleMatches(classed, selectors) && !ruleMatches(native, selectors),
    )
    expect(rings.length).toBeGreaterThan(0)
  })
})
