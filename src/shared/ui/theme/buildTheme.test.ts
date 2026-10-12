import { theme as antdTheme } from 'antd'
import { describe, expect, it } from 'vitest'

import { buildTheme } from './buildTheme'
import { RV_PALETTE, type RvPalette, type RvThemeMode } from './palette'

const MODES = ['dark', 'light'] as const

// No @types/node here: load `fs` untyped to read the real stylesheet.
const FS_MODULE = 'node:fs'
const { readFileSync } = (await import(/* @vite-ignore */ FS_MODULE)) as {
  readFileSync: (path: URL, encoding: 'utf8') => string
}

/** The tokens every Ant Design component finally reads, after both algorithms ran. */
function resolved(mode: RvThemeMode): ReturnType<typeof antdTheme.getDesignToken> {
  return antdTheme.getDesignToken(buildTheme(mode))
}

describe('buildTheme', () => {
  it('runs the stock algorithm of the mode first and pins the palette after it', () => {
    const dark = buildTheme('dark').algorithm
    const light = buildTheme('light').algorithm
    expect(Array.isArray(dark) && dark[0]).toBe(antdTheme.darkAlgorithm)
    expect(Array.isArray(light) && light[0]).toBe(antdTheme.defaultAlgorithm)
    expect(Array.isArray(dark) && dark).toHaveLength(2)
  })

  it('sets the page background and the text colour of each mode', () => {
    expect(buildTheme('dark').token?.colorBgLayout).toBe('#090d18')
    expect(buildTheme('dark').token?.colorText).toBe('#f8fafc')
    expect(buildTheme('light').token?.colorBgLayout).toBe('#ffffff')
    expect(buildTheme('light').token?.colorText).toBe('#0b1220')
  })

  it('keeps the control heights of the specification in both modes', () => {
    for (const mode of MODES) {
      const { token } = buildTheme(mode)
      expect([token?.controlHeightSM, token?.controlHeight, token?.controlHeightLG]).toEqual([
        26, 32, 40,
      ])
    }
  })

  it('keeps the accent and the status colours exactly as specified after the algorithm', () => {
    const dark = resolved('dark')
    expect(dark.colorPrimary).toBe('#2563eb')
    expect(dark.colorPrimaryHover).toBe('#356eee')
    expect(dark.colorPrimaryActive).toBe('#1d4fd0')
    expect(dark.colorLink).toBe('#60a5fa')
    expect(dark.colorSuccess).toBe('#4ade80')
    expect(dark.colorWarning).toBe('#fbbf24')
    expect(dark.colorError).toBe('#f87171')
    const light = resolved('light')
    expect(light.colorPrimary).toBe('#2563eb')
    expect(light.colorLink).toBe('#1d4ed8')
    expect(light.colorSuccess).toBe('#15803d')
    expect(light.colorWarning).toBe('#a16207')
    expect(light.colorError).toBe('#dc2626')
  })

  it('colours status text with the status colour itself in both modes', () => {
    const dark = resolved('dark')
    expect([dark.colorSuccessText, dark.colorWarningText, dark.colorErrorText]).toEqual([
      '#4ade80',
      '#fbbf24',
      '#f87171',
    ])
    const light = resolved('light')
    expect([light.colorSuccessText, light.colorWarningText, light.colorErrorText]).toEqual([
      '#15803d',
      '#a16207',
      '#dc2626',
    ])
  })

  it('gives every status a tinted background of its own hue, never a grey one', () => {
    const dark = resolved('dark')
    expect([dark.colorSuccessBg, dark.colorSuccessBgHover, dark.colorSuccessBorder]).toEqual([
      '#132a2c',
      '#1a3e36',
      '#20533f',
    ])
    expect([dark.colorErrorBg, dark.colorErrorBgHover, dark.colorErrorBorder]).toEqual([
      '#281d2b',
      '#402633',
      '#58303b',
    ])
    expect([dark.colorWarningBg, dark.colorInfoBg]).toEqual(['#292621', '#16233b'])
    const light = resolved('light')
    expect([light.colorSuccessBg, light.colorSuccessBgHover, light.colorSuccessBorder]).toEqual([
      '#e0f7e8',
      '#c6f0d5',
      '#b4d6c1',
    ])
    expect([light.colorErrorBg, light.colorErrorBgHover, light.colorErrorBorder]).toEqual([
      '#fdecec',
      '#fbd6d6',
      '#f4baba',
    ])
    expect([light.colorWarningBg, light.colorInfoBg]).toEqual(['#f6efe6', '#e8edfb'])
  })

  it('draws the focus ring of Ant Design with the link colour, which is visible on the page', () => {
    expect(resolved('dark').colorPrimaryBorder).toBe('#60a5fa')
    expect(resolved('light').colorPrimaryBorder).toBe('#1d4ed8')
    expect(resolved('dark').lineWidthFocus).toBe(2)
  })

  it('gives a primary button its own hover and press steps in both modes', () => {
    for (const mode of MODES) {
      const button = buildTheme(mode).components?.Button
      expect(button?.colorPrimary).toBe('#2563eb')
      expect(button?.colorPrimaryHover).toBe('#356eee')
      expect(button?.colorPrimaryActive).toBe('#1d4fd0')
    }
  })

  it('keeps a secondary button neutral on hover and press, text and border included', () => {
    const dark = buildTheme('dark').components?.Button
    expect(dark?.defaultHoverBg).toBe('#222737')
    expect(dark?.defaultActiveBg).toBe('#2a3042')
    expect([dark?.defaultHoverColor, dark?.defaultActiveColor]).toEqual(['#f8fafc', '#f8fafc'])
    expect([dark?.defaultHoverBorderColor, dark?.defaultActiveBorderColor]).toEqual([
      'rgba(148, 163, 184, 0.2)',
      'rgba(148, 163, 184, 0.2)',
    ])
    const light = buildTheme('light').components?.Button
    expect(light?.defaultHoverBg).toBe('#ebeced')
    expect(light?.defaultActiveBg).toBe('#dfe2e6')
    expect([light?.defaultHoverColor, light?.defaultActiveColor]).toEqual(['#0b1220', '#0b1220'])
    expect([light?.defaultHoverBorderColor, light?.defaultActiveBorderColor]).toEqual([
      'rgba(15, 23, 42, 0.16)',
      'rgba(15, 23, 42, 0.16)',
    ])
  })

  it('rounds a modal by 10px and keeps a large button at the control radius', () => {
    for (const mode of MODES) {
      const { components } = buildTheme(mode)
      expect(components?.Modal?.borderRadiusLG).toBe(10)
      expect(components?.Button?.borderRadiusLG).toBe(6)
    }
  })

  it('draws an avatar without a picture as a neutral circle', () => {
    expect(buildTheme('dark').components?.Avatar).toEqual({
      colorTextPlaceholder: '#1a2238',
      colorTextLightSolid: '#f8fafc',
    })
    expect(buildTheme('light').components?.Avatar).toEqual({
      colorTextPlaceholder: '#e4e9f2',
      colorTextLightSolid: '#0b1220',
    })
  })

  it('uses a separate sidebar background only in the light mode', () => {
    expect(buildTheme('dark').components?.Layout?.siderBg).toBe('#090d18')
    expect(buildTheme('light').components?.Layout?.siderBg).toBe('#f8f9fc')
  })

  it('leaves animations on by default and turns them off for reduced motion', () => {
    expect(buildTheme('dark').token?.motion).toBe(true)
    expect(buildTheme('dark', { reducedMotion: false }).token?.motion).toBe(true)
    expect(buildTheme('dark', { reducedMotion: true }).token?.motion).toBe(false)
  })
})

// `tokens.css` repeats the palette for plain CSS. The two copies are written by hand, so this
// test is what keeps them from drifting apart.
describe('tokens.css', () => {
  const css = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  )

  function block(selector: string): Record<string, string> {
    const start = css.indexOf(`${selector} {`)
    expect(start).toBeGreaterThanOrEqual(0)
    const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
    const vars: Record<string, string> = {}
    for (const declaration of body.split(';')) {
      const colon = declaration.indexOf(':')
      if (colon > 0) {
        vars[declaration.slice(0, colon).trim()] = declaration
          .slice(colon + 1)
          .replace(/\s+/g, ' ')
          .trim()
      }
    }
    return vars
  }

  /** Brings both notations to one form: `#fff` and `rgb(1 2 3 / 12%)` against the TS strings. */
  function normalise(value: string): string {
    return value
      .replace(/#([0-9a-f])([0-9a-f])([0-9a-f])\b/gi, '#$1$1$2$2$3$3')
      .replace(
        /rgb\((\d+) (\d+) (\d+) \/ (\d+)%\)/g,
        (_match, r: string, g: string, b: string, alpha: string) =>
          `rgba(${r}, ${g}, ${b}, ${String(Number(alpha) / 100)})`,
      )
      .toLowerCase()
  }

  const SHARED: Record<string, keyof RvPalette> = {
    '--rv-bg': 'bg',
    '--rv-bg-raised': 'bgRaised',
    '--rv-surface': 'surface',
    '--rv-surface-3': 'surface3',
    '--rv-border': 'border',
    '--rv-border-strong': 'borderStrong',
    '--rv-text': 'text',
    '--rv-text-2': 'text2',
    '--rv-text-3': 'text3',
    '--rv-accent': 'accent',
    '--rv-accent-hover': 'accentHover',
    '--rv-link': 'link',
    '--rv-success': 'success',
    '--rv-warning': 'warning',
    '--rv-danger': 'danger',
    '--rv-hover': 'hover',
    '--rv-selected': 'selected',
    '--rv-overlay': 'mask',
    '--rv-pop-bg': 'popover',
    '--rv-pop-shadow': 'popoverShadow',
  }

  it('holds the same colours as the palette of the Ant Design theme in both modes', () => {
    const dark = block(":root,\n[data-rv-theme='dark']")
    const vars = { dark, light: { ...dark, ...block("[data-rv-theme='light']") } }
    for (const mode of MODES) {
      for (const [name, key] of Object.entries(SHARED)) {
        expect(normalise(vars[mode][name] ?? ''), `${name} in ${mode}`).toBe(
          RV_PALETTE[mode][key].toLowerCase(),
        )
      }
    }
  })

  it('lets a subtree force the dark palette inside a light page', () => {
    expect(css).toContain(":root,\n[data-rv-theme='dark'] {")
    expect(css).not.toContain(":root[data-rv-theme='light']")
  })
})
