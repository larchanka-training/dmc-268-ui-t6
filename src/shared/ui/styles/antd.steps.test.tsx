// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ProgressSteps, type ProgressStepState } from '../ProgressSteps/ProgressSteps'

// No @types/node here and Vitest zeroes `.css?raw`: load `fs` untyped to read the real stylesheet.
// Under jsdom `import.meta.url` is not a file URL, so the path is relative to the project root,
// where Vitest runs.
const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: string, encoding: 'utf8') => string
}

// The Steps rules of `antd.css`, written out in full: the rail between stages. A rule whose
// selector no longer matches what Ant Design renders goes dead without an error
// (DESIGN_SYSTEM §11), so each one is matched against the steps `ProgressSteps` draws; their
// declarations are pinned in `theme/buildTheme.test.ts`.
const RULES = {
  rail: '.ant-steps .ant-steps-item .ant-steps-item-rail',
  finishedRail: '.ant-steps .ant-steps-item .ant-steps-item-rail-finish',
} as const

const TITLES = ['Сбор контекста', 'Анализ LLM', 'Публикация'] as const

function renderSteps(...states: [ProgressStepState, ProgressStepState, ProgressStepState]) {
  return render(
    <ProgressSteps
      steps={TITLES.map((title, index) => ({ key: title, title, state: states[index] ?? 'wait' }))}
    />,
  )
}

/** The rail that leaves the step with this title. */
function rail(title: string): Element {
  const found = screen
    .getByText(title)
    .closest('.ant-steps-item')
    ?.querySelector('.ant-steps-item-rail')
  if (found === null || found === undefined) {
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

  it('match every rail and keep the rail into the stage in progress neutral', () => {
    renderSteps('finish', 'process', 'wait')
    expect(rail(TITLES[0]).matches(RULES.rail)).toBe(true)
    expect(rail(TITLES[1]).matches(RULES.rail)).toBe(true)
    expect(rail(TITLES[0]).matches(RULES.finishedRail)).toBe(false)
  })

  it('match the rail into a finished step', () => {
    renderSteps('finish', 'finish', 'finish')
    expect(rail(TITLES[0]).matches(RULES.finishedRail)).toBe(true)
    expect(rail(TITLES[1]).matches(RULES.finishedRail)).toBe(true)
  })
})
