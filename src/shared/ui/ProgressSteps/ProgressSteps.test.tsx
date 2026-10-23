// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ProgressSteps, type ProgressStep, type ProgressStepState } from './ProgressSteps'
import styles from './ProgressSteps.module.css'

// No @types/node here and Vitest zeroes `.css?raw`: load `fs` untyped to read the real stylesheet.
// Under jsdom `import.meta.url` is not a file URL, so the path is relative to the project root,
// where Vitest runs.
const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: string, encoding: 'utf8') => string
}

/** Declarations of each selector of the module, grouped selectors split, on one line each. */
function rules(): Map<string, string> {
  const css = readFileSync('src/shared/ui/ProgressSteps/ProgressSteps.module.css', 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  )
  const map = new Map<string, string>()
  for (const [, selectors = '', body = ''] of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const declarations = body.replace(/\s+/g, ' ').trim()
    for (const selector of selectors.split(',')) {
      const key = selector.replace(/\s+/g, ' ').trim()
      map.set(key, `${map.get(key) ?? ''} ${declarations}`.trim())
    }
  }
  return map
}

const ALL_STATES: (ProgressStep & { title: string })[] = [
  { key: 'a', title: 'Ждёт', state: 'wait' },
  { key: 'b', title: 'Идёт', state: 'process' },
  { key: 'c', title: 'Готов', state: 'finish' },
  { key: 'd', title: 'Упал', state: 'error', note: 'llm_timeout' },
  { key: 'e', title: 'Стоп', state: 'stopped', note: 'Остановлено' },
]

function step(title: string): HTMLElement {
  const found = screen.getByText(title).closest('.ant-steps-item')
  if (!(found instanceof HTMLElement)) {
    throw new Error(`step «${title}» not found`)
  }
  return found
}

function mark(title: string): HTMLElement {
  const found = step(title).querySelector('.ant-steps-item-icon [data-state]')
  if (!(found instanceof HTMLElement)) {
    throw new Error(`mark of «${title}» not found`)
  }
  return found
}

function row(...states: ProgressStepState[]): ProgressStep[] {
  return states.map((state, index) => ({
    key: String(index),
    title: `Этап ${String(index)}`,
    state,
  }))
}

afterEach(() => {
  cleanup()
})

describe('ProgressSteps', () => {
  it('draws one mark per state: a number while waiting or in progress, a glyph otherwise', () => {
    render(<ProgressSteps steps={ALL_STATES} />)
    for (const { title, state } of ALL_STATES) {
      expect(mark(title).getAttribute('data-state')).toBe(state)
      expect(mark(title).classList.contains(styles.mark ?? '')).toBe(true)
    }
    expect(mark('Ждёт').textContent).toBe('1')
    expect(mark('Идёт').textContent).toBe('2')
    const glyphs = ['Готов', 'Упал', 'Стоп'].map((title) => {
      expect(mark(title).textContent).toBe('')
      return mark(title).querySelector('svg path')?.getAttribute('d')
    })
    // A check, a cross and a dash: three different glyphs.
    expect(new Set(glyphs).size).toBe(3)
    expect(glyphs).not.toContain(undefined)
  })

  it('attaches the title styles and state to every rendered title', () => {
    render(<ProgressSteps steps={ALL_STATES} />)
    for (const { title, state } of ALL_STATES) {
      const element = screen.getByText(title)
      expect(element.classList.contains(styles.title ?? '')).toBe(true)
      expect(element.getAttribute('data-state')).toBe(state)
    }
  })

  it('puts the note on the line under the title, only where there is one', () => {
    render(<ProgressSteps steps={ALL_STATES} />)
    const note = screen.getByText('llm_timeout')
    expect(note.classList.contains(styles.note ?? '')).toBe(true)
    expect(note.closest('.ant-steps-item-content')).not.toBeNull()
    expect(step('Стоп').querySelector('.ant-steps-item-content')?.textContent).toBe('Остановлено')
    expect(step('Ждёт').querySelector('.ant-steps-item-content')).toBeNull()
  })

  it('shows a stopped step to Ant Design as a waiting one, never as an error', () => {
    render(<ProgressSteps steps={ALL_STATES} />)
    expect(step('Стоп').className).toContain('ant-steps-item-wait')
    expect(step('Стоп').className).not.toContain('ant-steps-item-error')
    expect(step('Упал').className).toContain('ant-steps-item-error')
  })

  it.each([
    [['finish', 'process', 'wait'], 1],
    [['finish', 'error', 'wait'], 1],
    [['finish', 'finish', 'stopped'], 2],
  ] as const)('makes the step in progress, failed or stopped the current one: %j', (states, at) => {
    const { container } = render(<ProgressSteps steps={row(...states)} />)
    const active = container.querySelectorAll('.ant-steps-item-active')
    expect(active).toHaveLength(1)
    expect(active[0]?.textContent).toContain(`Этап ${String(at)}`)
  })

  it.each([[['wait', 'wait', 'wait']], [['finish', 'finish', 'finish']]] as const)(
    'has no current step when every step waits or every one is finished: %j',
    (states) => {
      const { container } = render(<ProgressSteps steps={row(...states)} />)
      expect(container.querySelector('.ant-steps-item-active')).toBeNull()
    },
  )

  it('uses the small Ant Design root and keeps its own class next to a class of the caller', () => {
    const { container } = render(<ProgressSteps className="mine" steps={ALL_STATES} />)
    const root = container.querySelector('.ant-steps')
    expect(root?.matches('.ant-steps.ant-steps-small')).toBe(true)
    expect(root?.classList.contains('mine')).toBe(true)
    expect(styles.steps).toBeTruthy()
    expect(root?.classList.contains(styles.steps ?? '')).toBe(true)
  })

  // jsdom applies no styles: the stylesheet is read, and the browser check measures the result.
  it('draws every mark as a 20px ring without a fill, and sizes the box of Ant Design to it', () => {
    const css = rules()
    const ring = css.get('.mark') ?? ''
    expect(ring).toContain('width: 20px;')
    expect(ring).toContain('height: 20px;')
    expect(ring).toContain('box-sizing: border-box;')
    expect(ring).toContain('border: 1.5px solid var(--rv-border-strong);')
    expect(ring).toContain('border-radius: 50%;')
    // No rule of the mark, whatever its state, fills the ring.
    const markRules = [...css].filter(([selector]) => selector.startsWith('.mark'))
    expect(markRules.length).toBeGreaterThanOrEqual(6)
    for (const [selector, body] of markRules) {
      expect(body, selector).not.toContain('background')
    }
    expect(ring).toContain('font-size: 11px;')
    expect(ring).toContain('font-weight: 600;')
    expect(css.get('.mark svg')).toContain('width: 12px; height: 12px;')
    expect(css.get('.mark svg')).toContain('stroke-width: 1.5;')
    expect(css.get('.steps:global(.ant-steps.ant-steps-small)')).toBe(
      '--ant-cmp-steps-icon-size: 20px;',
    )
  })

  it.each([
    ['wait', 'var(--rv-border-strong)', 'var(--rv-text-3)', 'var(--rv-text-2)', '400'],
    ['process', 'var(--rv-link)', 'var(--rv-link)', 'var(--rv-text)', '500'],
    ['finish', 'var(--rv-border-strong)', 'var(--rv-success)', 'var(--rv-text)', '400'],
    ['error', 'var(--rv-danger)', 'var(--rv-danger)', 'var(--rv-text)', '500'],
    ['stopped', 'var(--rv-warning)', 'var(--rv-warning)', 'var(--rv-text)', '500'],
  ])(
    'colours a %s step: ring %s, glyph %s, title %s at %s',
    (state, ring, glyph, title, weight) => {
      const css = rules()
      /** The value a property takes for this state: its own rule, else the base one. */
      const value = (base: string, property: string): string => {
        const own = css.get(`${base}[data-state='${state}']`) ?? ''
        const pick = (body: string): string | undefined =>
          new RegExp(`(?:^|; |^\\s*)${property}: ([^;]+);`).exec(body)?.[1]
        return pick(own) ?? pick(css.get(base) ?? '') ?? ''
      }
      const baseBorder = /border: 1\.5px solid ([^;]+);/.exec(css.get('.mark') ?? '')?.[1]
      expect(value('.mark', 'border-color') || baseBorder).toBe(ring)
      expect(value('.mark', 'color')).toBe(glyph)
      expect(value('.title', 'color')).toBe(title)
      expect(value('.title', 'font-weight')).toBe(weight)
    },
  )

  it('never paints the accent of the primary action', () => {
    const css = readFileSync('src/shared/ui/ProgressSteps/ProgressSteps.module.css', 'utf8')
    expect(css).not.toContain('--rv-accent')
  })

  it('names every mark by its state for a screen reader', () => {
    render(<ProgressSteps steps={ALL_STATES} />)
    const names = {
      wait: 'Ждёт',
      process: 'Идёт',
      finish: 'Готово',
      error: 'Ошибка',
      stopped: 'Остановлено',
    }
    for (const { title, state } of ALL_STATES) {
      expect(mark(title).getAttribute('role')).toBe('img')
      expect(mark(title).getAttribute('aria-label')).toBe(names[state])
    }
    expect(screen.getAllByRole('img').map((node) => node.getAttribute('aria-label'))).toEqual([
      'Ждёт',
      'Идёт',
      'Готово',
      'Ошибка',
      'Остановлено',
    ])
  })

  it('writes the note in the secondary text colour, a size smaller', () => {
    expect(rules().get('.note')).toBe('color: var(--rv-text-2); font-size: var(--rv-fs-xs);')
  })
})
