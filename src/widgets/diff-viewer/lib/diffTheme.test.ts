import { theme } from 'antd'
import { describe, expect, it } from 'vitest'

import { diffThemeVars } from './diffTheme'

// No @types/node here and Vitest zeroes `.css?raw`: load `fs` untyped to read the real stylesheet.
const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: URL, encoding: 'utf8') => string
}

type Rgba = readonly [number, number, number, number]

function parseColor(value: string): Rgba {
  const hex = /^#([0-9a-f]{3,8})$/i.exec(value)
  if (hex?.[1] !== undefined) {
    const digits =
      hex[1].length <= 4
        ? hex[1]
            .split('')
            .map((d) => d + d)
            .join('')
        : hex[1]
    const channel = (i: number): number => parseInt(digits.slice(i * 2, i * 2 + 2), 16)
    return [channel(0), channel(1), channel(2), digits.length === 8 ? channel(3) / 255 : 1]
  }
  const fn = /^rgba?\(([^)]+)\)$/i.exec(value)
  if (fn?.[1] !== undefined) {
    const [r, g, b, a] = fn[1].split(',').map((part) => Number(part.trim()))
    if (r !== undefined && g !== undefined && b !== undefined) {
      return [r, g, b, a ?? 1]
    }
  }
  throw new Error(`Unsupported colour: ${value}`)
}

/** `fg` laid over an opaque `bg` — the pixel a user actually sees. */
function composite(fg: Rgba, bg: Rgba): Rgba {
  const [r, g, b, a] = fg
  return [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a), 1]
}

/** WCAG 2 relative luminance. */
function luminance([r, g, b]: Rgba): number {
  const lin = (c: number): number => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrastRatio(a: Rgba, b: Rgba): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05)
}

const ALGORITHMS = [
  ['light', theme.defaultAlgorithm],
  ['dark', theme.darkAlgorithm],
] as const

/** Palette variables the highlight CSS must reference. */
const TOKEN_CLASSES_REQUIRED = [
  'keyword',
  'string',
  'comment',
  'number',
  'function',
  'class-name',
  'builtin',
  'boolean',
  'constant',
  'operator',
  'regex',
  'tag',
  'attr-name',
  'attr-value',
  'property',
  'decorator',
]

/** `[background variable, text variable]` for every surface the diff paints. */
const SURFACES = [
  ['--diff-background-color', '--diff-text-color'],
  ['--diff-selection-background-color', '--diff-selection-text-color'],
  ['--diff-gutter-insert-background-color', '--diff-gutter-insert-text-color'],
  ['--diff-gutter-delete-background-color', '--diff-gutter-delete-text-color'],
  ['--diff-gutter-selected-background-color', '--diff-gutter-selected-text-color'],
  ['--diff-code-insert-background-color', '--diff-code-insert-text-color'],
  ['--diff-code-delete-background-color', '--diff-code-delete-text-color'],
  ['--diff-code-insert-edit-background-color', '--diff-code-insert-edit-text-color'],
  ['--diff-code-delete-edit-background-color', '--diff-code-delete-edit-text-color'],
  ['--diff-code-selected-background-color', '--diff-code-selected-text-color'],
] as const

/** The eight syntax slots of FRONTEND_ARCHITECTURE.md §6; the mapper and the CSS are both held to it. */
const TOKEN_SLOTS = [
  '--diff-token-keyword',
  '--diff-token-string',
  '--diff-token-number',
  '--diff-token-function',
  '--diff-token-tag',
  '--diff-token-attribute',
  '--diff-token-special',
  '--diff-token-comment',
] as const

function varOf(vars: Record<string, string>, name: string): string {
  const value = vars[name]
  if (value === undefined) {
    throw new Error(`diffThemeVars does not emit ${name}`)
  }
  return value
}

describe('contrast helper', () => {
  it('measures black on white as 21:1 and identical colours as 1:1', () => {
    expect(contrastRatio(parseColor('#000000'), parseColor('#ffffff'))).toBeCloseTo(21, 5)
    expect(contrastRatio(parseColor('#336699'), parseColor('#336699'))).toBeCloseTo(1, 5)
  })

  it('composites alpha colours before measuring (the pre-fix dark-theme defect)', () => {
    const lightInsertBg = parseColor('#eaffee')
    const darkText = composite(parseColor('rgba(255,255,255,0.85)'), lightInsertBg)
    expect(contrastRatio(darkText, lightInsertBg)).toBeLessThan(1.1)
  })
})

describe.each(ALGORITHMS)('diffThemeVars (%s algorithm)', (_name, algorithm) => {
  const token = theme.getDesignToken({ algorithm })
  const vars = diffThemeVars(token)
  /** The page background the diff sits on: must be opaque, everything else is laid over it. */
  const container = (): Rgba => {
    const color = parseColor(varOf(vars, '--diff-background-color'))
    expect(color[3]).toBe(1)
    return color
  }

  /** A surface colour as seen on screen: laid over the container background. */
  const surface = (name: string): Rgba => composite(parseColor(varOf(vars, name)), container())

  it('is deterministic for a given token', () => {
    expect(diffThemeVars(token)).toEqual(vars)
  })

  it.each(SURFACES)('%s keeps its text twin %s at 4.5:1', (background, text) => {
    const bg = surface(background)
    const fg = composite(parseColor(varOf(vars, text)), bg)
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5)
  })

  it('maps the line roles to literal antd tokens (insert is success, delete is error)', () => {
    expect(vars['--diff-code-insert-background-color']).toBe(token.colorSuccessBg)
    expect(vars['--diff-code-delete-background-color']).toBe(token.colorErrorBg)
    expect(vars['--diff-gutter-insert-background-color']).toBe(token.colorSuccessBgHover)
    expect(vars['--diff-gutter-delete-background-color']).toBe(token.colorErrorBgFilledHover)
    expect(vars['--diff-text-color']).toBe(token.colorText)
    expect(vars['--diff-omit-gutter-line-color']).toBe(token.colorError)
  })

  it('paints the line backgrounds distinctly from the container', () => {
    for (const name of [
      '--diff-code-insert-background-color',
      '--diff-code-delete-background-color',
      '--diff-gutter-insert-background-color',
      '--diff-gutter-delete-background-color',
    ]) {
      expect(varOf(vars, name)).not.toBe(varOf(vars, '--diff-background-color'))
    }
    expect(varOf(vars, '--diff-code-insert-background-color')).not.toBe(
      varOf(vars, '--diff-code-delete-background-color'),
    )
  })

  const tokenVars = Object.keys(vars).filter((name) => name.startsWith('--diff-token-'))

  it('emits exactly the eight syntax slots', () => {
    expect([...tokenVars].sort()).toEqual([...TOKEN_SLOTS].sort())
  })

  it.each(['container', 'code insert', 'code delete'])(
    'every syntax colour holds 3:1 on the %s background',
    (where) => {
      const bgName = {
        container: '--diff-background-color',
        'code insert': '--diff-code-insert-background-color',
        'code delete': '--diff-code-delete-background-color',
      }[where]
      if (bgName === undefined) {
        throw new Error(where)
      }
      const bg = surface(bgName)
      for (const name of tokenVars) {
        const fg = composite(parseColor(varOf(vars, name)), bg)
        expect(contrastRatio(fg, bg), `${name} on ${where}`).toBeGreaterThanOrEqual(3)
      }
    },
  )

  it('never paints a syntax colour in the plain text colour', () => {
    const text = varOf(vars, '--diff-text-color')
    const textOnContainer = composite(parseColor(text), container())
    for (const name of tokenVars) {
      expect(varOf(vars, name), name).not.toBe(text)
      const onContainer = composite(parseColor(varOf(vars, name)), container())
      expect(onContainer, name).not.toEqual(textOnContainer)
    }
  })

  it('sets every text twin explicitly (the library resolves them on :root)', () => {
    const text = varOf(vars, '--diff-text-color')
    for (const [, textVar] of SURFACES) {
      expect(varOf(vars, textVar)).toBe(text)
    }
  })

  it('differs between algorithms', () => {
    const other = diffThemeVars(
      theme.getDesignToken({
        algorithm: algorithm === theme.darkAlgorithm ? theme.defaultAlgorithm : theme.darkAlgorithm,
      }),
    )
    expect(other['--diff-code-insert-background-color']).not.toBe(
      vars['--diff-code-insert-background-color'],
    )
  })
})

describe('diff-theme.css', () => {
  const diffThemeCss = readFileSync(
    new URL('../ui/diff-theme.css', import.meta.url),
    'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, '')
  const rules = [...diffThemeCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selectors: (match[1] ?? '')
      .split(',')
      .map((selector) => selector.trim())
      .filter((selector) => selector !== ''),
    declarations: match[2] ?? '',
  }))
  const classesOf = (selectors: string[]): string[] =>
    selectors.map((selector) => {
      const match = /^\.diff-theme \.token\.([a-z][a-z0-9-]*)$/.exec(selector)
      if (match?.[1] === undefined) {
        throw new Error(`Unexpected selector shape: ${selector}`)
      }
      return match[1]
    })
  const varsOfRule = (declarations: string): string[] =>
    [...declarations.matchAll(/var\((--diff-token-[a-z-]+)\)/g)].map((m) => m[1] ?? '')
  const emitted: readonly string[] = TOKEN_SLOTS

  it('is read from disk and holds rules', () => {
    expect(rules.length).toBeGreaterThan(0)
  })

  it('contains no colour literal', () => {
    expect(diffThemeCss).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(diffThemeCss).not.toMatch(/\b(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\(/i)
  })

  it('only has `.diff-theme .token.<class> { color: var(--diff-token-*) }` rules', () => {
    for (const { selectors, declarations } of rules) {
      expect(() => classesOf(selectors)).not.toThrow()
      expect(declarations.replace(/\s+/g, ' ').trim()).toMatch(
        /^color: var\(--diff-token-[a-z-]+\);$/,
      )
    }
  })

  it('styles every required token class', () => {
    const styled = rules.flatMap(({ selectors }) => classesOf(selectors))
    for (const cls of TOKEN_CLASSES_REQUIRED) {
      expect(styled, cls).toContain(cls)
    }
  })

  it.each([
    ['keyword', '--diff-token-keyword'],
    ['string', '--diff-token-string'],
    ['comment', '--diff-token-comment'],
    ['number', '--diff-token-number'],
    ['function', '--diff-token-function'],
  ])('colors .token.%s from %s', (cls, variable) => {
    const rule = rules.find(({ selectors }) => classesOf(selectors).includes(cls))
    expect(rule, cls).toBeDefined()
    expect(rule?.declarations.replace(/\s+/g, ' ').trim()).toBe(`color: var(${variable});`)
  })

  it('styles each class in exactly one rule (rule order must not decide the colour)', () => {
    const styled = rules.flatMap(({ selectors }) => classesOf(selectors))
    expect(styled.filter((cls, i) => styled.indexOf(cls) !== i)).toEqual([])
  })

  it('never recolours `punctuation` (Prism aliases it onto decorators and interpolation)', () => {
    const styled = rules.flatMap(({ selectors }) => classesOf(selectors))
    expect(styled).not.toContain('punctuation')
  })

  it('references only the eight syntax slots, and every one of them', () => {
    const referenced = [...new Set(rules.flatMap(({ declarations }) => varsOfRule(declarations)))]
    expect(referenced.filter((name) => !emitted.includes(name))).toEqual([])
    expect(emitted.filter((name) => !referenced.includes(name))).toEqual([])
  })
})

describe('diff-theme.css wiring', () => {
  it.each(['DiffViewer.tsx', 'DiffSuggestion.tsx'])(
    'ui/%s imports ./diff-theme.css (jsdom loads no CSS, so only the source shows it)',
    (component) => {
      const source = readFileSync(new URL(`../ui/${component}`, import.meta.url), 'utf8')
      expect(source).toMatch(/^import '\.\/diff-theme\.css'$/m)
    },
  )
})
