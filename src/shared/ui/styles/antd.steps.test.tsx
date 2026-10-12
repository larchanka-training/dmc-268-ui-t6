// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { Steps } from 'antd'
import { afterEach, describe, expect, it } from 'vitest'

// No @types/node here and Vitest zeroes `.css?raw`: load `fs` untyped to read the real stylesheet.
// Under jsdom `import.meta.url` is not a file URL, so the path is relative to the project root,
// where Vitest runs.
const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: string, encoding: 'utf8') => string
}

// The Steps rules of `antd.css`, written out in full. A rule whose selector no longer matches what
// Ant Design renders goes dead without an error (DESIGN_SYSTEM §11), so each one is matched
// against real steps; their declarations are pinned in `theme/buildTheme.test.ts`.
const RULES = {
  rail: '.ant-steps .ant-steps-item .ant-steps-item-rail',
  finishedRail: '.ant-steps .ant-steps-item .ant-steps-item-rail-finish',
  finished: '.ant-steps.ant-steps-filled .ant-steps-item.ant-steps-item-finish',
  waiting: '.ant-steps.ant-steps-filled .ant-steps-item.ant-steps-item-wait',
} as const

const TITLES = ['Сбор контекста', 'Анализ LLM', 'Публикация'] as const

/** The step that holds the title. */
function step(title: string): Element {
  const found = screen.getByText(title).closest('.ant-steps-item')
  if (found === null) {
    throw new Error(`step «${title}» not found`)
  }
  return found
}

function rail(title: string): Element {
  const found = step(title).querySelector('.ant-steps-item-rail')
  if (found === null) {
    throw new Error(`rail after «${title}» not found`)
  }
  return found
}

afterEach(() => {
  cleanup()
})

describe('the Steps rules of antd.css', () => {
  it('are exactly these selectors', () => {
    const css = readFileSync('src/shared/ui/styles/antd.css', 'utf8')
    const selectors = [...css.matchAll(/^(\.ant-steps[^{]*?)\s*\{/gm)].map((match) =>
      (match[1] ?? '').replace(/\s+/g, ' '),
    )
    expect(selectors).toEqual(Object.values(RULES))
  })

  it('match the finished and the waiting step that Ant Design renders, and their rails', () => {
    render(
      <Steps
        current={1}
        items={[
          { title: TITLES[0], status: 'finish' },
          { title: TITLES[1], status: 'process' },
          { title: TITLES[2], status: 'wait' },
        ]}
        size="small"
      />,
    )
    expect(step(TITLES[0]).matches(RULES.finished)).toBe(true)
    expect(step(TITLES[1]).matches(RULES.finished)).toBe(false)
    expect(step(TITLES[2]).matches(RULES.waiting)).toBe(true)
    expect(step(TITLES[0]).matches(RULES.waiting)).toBe(false)
    expect(rail(TITLES[0]).matches(RULES.rail)).toBe(true)
    expect(rail(TITLES[1]).matches(RULES.rail)).toBe(true)
    // The rail into the stage in progress stays neutral.
    expect(rail(TITLES[0]).matches(RULES.finishedRail)).toBe(false)
  })

  it('match the rail into a finished step', () => {
    render(
      <Steps
        current={3}
        items={TITLES.map((title) => ({ title, status: 'finish' as const }))}
        size="small"
      />,
    )
    expect(rail(TITLES[0]).matches(RULES.finishedRail)).toBe(true)
    expect(rail(TITLES[1]).matches(RULES.finishedRail)).toBe(true)
  })
})
