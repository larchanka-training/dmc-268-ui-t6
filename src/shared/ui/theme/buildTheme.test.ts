import { theme as antdTheme } from 'antd'
import { describe, expect, it } from 'vitest'

import { buildTheme } from './buildTheme'
import { RV_MOTION_FADE_MS } from './motion'
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
    expect(light.colorError).toBe('#d92626')
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
      '#d92626',
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

  it('shows the focus of a field in the error or warning state with the focus colour', () => {
    expect(resolved('dark').colorErrorOutline).toBe('#60a5fa')
    expect(resolved('dark').colorWarningOutline).toBe('#60a5fa')
    expect(resolved('light').colorErrorOutline).toBe('#1d4ed8')
    expect(resolved('light').colorWarningOutline).toBe('#1d4ed8')
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

/** WCAG contrast ratio of two `#rrggbb` colours. */
function contrast(first: string, second: string): number {
  const luminance = (hex: string): number => {
    const channel = (offset: number): number => {
      const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
  }
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05)
}

/** `color-mix(in srgb, top share, bottom)` for two `#rrggbb` colours. */
function mix(top: string, bottom: string, share: number): string {
  const channel = (offset: number): string => {
    const a = Number.parseInt(top.slice(offset, offset + 2), 16)
    const b = Number.parseInt(bottom.slice(offset, offset + 2), 16)
    return Math.round(a * share + b * (1 - share))
      .toString(16)
      .padStart(2, '0')
  }
  return `#${channel(1)}${channel(3)}${channel(5)}`
}

describe('danger colours', () => {
  it('keeps a danger button readable at rest, on hover and on press in both modes', () => {
    for (const mode of MODES) {
      const p = RV_PALETTE[mode]
      const tokens = resolved(mode)
      expect(buildTheme(mode).components?.Button?.dangerColor).toBe(p.dangerFg)
      expect([tokens.colorError, tokens.colorErrorHover, tokens.colorErrorActive]).toEqual([
        p.danger,
        p.dangerHover,
        p.dangerActive,
      ])
      for (const fill of [p.danger, p.dangerHover, p.dangerActive]) {
        // Filled button: its text on the fill. Outlined button: the same colour as text.
        expect(contrast(p.dangerFg, fill), `${mode} ${fill} fill`).toBeGreaterThanOrEqual(4.5)
        expect(contrast(fill, p.surface), `${mode} ${fill} text`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  // A hovered danger item of a dropdown is tinted, not filled. The shares of the two mixes are
  // read from the stylesheets, so removing or weakening the rule fails this test.
  it('keeps a hovered danger item of a dropdown readable in both modes', () => {
    const antdCss = readFileSync(new URL('../styles/antd.css', import.meta.url), 'utf8')
    const tokensCss = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8')
    const rule = /\.ant-dropdown-menu-item-danger[^{]*\{([^}]*)\}/.exec(antdCss)?.[1] ?? ''
    expect(rule).toContain(
      'background: color-mix(in srgb, var(--rv-danger) var(--rv-tint), transparent)',
    )
    const textShare =
      /color: color-mix\(in srgb, var\(--rv-danger\) (\d+)%, var\(--rv-text\)\)/.exec(rule)?.[1]
    const tints = [...tokensCss.matchAll(/--rv-tint: (\d+)%/g)].map((match) => Number(match[1]))
    expect(textShare).toBeDefined()
    expect(tints).toHaveLength(2)
    const tint = { dark: tints[0] ?? 100, light: tints[1] ?? 100 }
    for (const mode of MODES) {
      const p = RV_PALETTE[mode]
      const background = mix(p.danger, p.popover, tint[mode] / 100)
      const text = mix(p.danger, p.text, Number(textShare) / 100)
      expect(contrast(text, background), mode).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps a selected table row neutral', () => {
    expect(buildTheme('dark').components?.Table?.rowSelectedBg).toBe('rgba(248, 250, 252, 0.08)')
    expect(buildTheme('light').components?.Table?.rowSelectedBg).toBe('rgba(15, 23, 42, 0.06)')
  })

  // Ant Design colours the check mark of a selected option with the accent and has no token for
  // it, so the rule is read from the stylesheet. Its selector must outweigh the library's
  // `.ant-select-dropdown .ant-select-item-option-selected:not(…) .ant-select-item-option-state`.
  it('keeps a multiple Select neutral: chips on the selected surface, a plain check mark', () => {
    expect(buildTheme('dark').components?.Select?.multipleItemBg).toBe('#1a2238')
    expect(buildTheme('light').components?.Select?.multipleItemBg).toBe('#e4e9f2')
    const antdCss = readFileSync(new URL('../styles/antd.css', import.meta.url), 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    )
    const rule = /([^{}]*\.ant-select-item-option-state)\s*\{([^}]*)\}/.exec(antdCss)
    expect(rule?.[2]).toContain('color: var(--rv-text);')
    expect(rule?.[1]).toContain('.ant-select-item-option-selected')
    expect(rule?.[1]?.match(/\.ant-[a-z-]+/g)?.length ?? 0).toBeGreaterThan(4)
  })

  it('gives a disabled control the neutral border of a field, once for every component', () => {
    for (const mode of MODES) {
      const p = RV_PALETTE[mode]
      // Ant Design derives it from the page background, which made it blue in the dark mode.
      expect(resolved(mode).colorBorderDisabled).toBe(p.borderStrong)
      for (const component of ['Button', 'Input', 'InputNumber', 'Select'] as const) {
        expect(buildTheme(mode).components?.[component], component).not.toHaveProperty(
          'colorBorderDisabled',
        )
      }
    }
  })

  it('gives Select and Input the focus, option, icon and text values of the specification', () => {
    for (const mode of MODES) {
      const p = RV_PALETTE[mode]
      const { Select, Input } = buildTheme(mode).components ?? {}
      // §7: the focus halo of a field is 3px, on Select as on Input.
      expect(Select?.controlOutlineWidth).toBe(3)
      expect(Input?.activeShadow).toBe(`0 0 0 3px ${p.focusRing}`)
      // §7 and §3: the option under the keyboard is hovered; a selected one stays selected.
      expect(Select?.optionActiveBg).toBe(p.hover)
      expect(Select?.controlItemBgActiveHover).toBe(p.selected)
      // §4: text in a control is 12.5px; a Select keeps its 21px line, so it stays 32px high.
      expect(Select?.fontSize).toBe(12.5)
      expect((Select?.lineHeight ?? 0) * (Select?.fontSize ?? 0)).toBeCloseTo(21)
      expect(Input?.inputFontSize).toBe(12.5)
      expect(buildTheme(mode).components?.InputNumber?.inputFontSize).toBe(12.5)
      // WCAG 1.4.11: the clear icons have 3:1 against the field at rest and on hover.
      for (const tokens of [Select, Input]) {
        expect([tokens?.colorTextQuaternary, tokens?.colorIcon]).toEqual([p.text3, p.text2])
      }
      for (const icon of [p.text3, p.text2]) {
        expect(contrast(icon, p.bg), `${mode} ${icon}`).toBeGreaterThanOrEqual(3)
      }
      // `lineWidthFocus` on Input empties the CSS variable of the clear button's ring (antd.css).
      expect(Input).not.toHaveProperty('lineWidthFocus')
    }
  })
})

// Steps draws its marks through `ProgressSteps`. The tokens are pinned here, the two rail rules
// that no token expresses are read from `antd.css`, and the colours of the marks and titles are
// checked against every surface; `ProgressSteps.test.tsx` maps each state to its colour.
describe('Steps and ProgressSteps', () => {
  const antdCss = readFileSync(new URL('../styles/antd.css', import.meta.url), 'utf8')
  const SURFACES = ['bg', 'bgRaised', 'surface'] as const

  /** Declarations of the `antd.css` rule the pattern matches, written out on one line. */
  function declarations(selector: RegExp): string {
    const body = new RegExp(`${selector.source}\\s*\\{([^}]*)\\}`).exec(antdCss)?.[1] ?? ''
    return body.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')')
  }

  it('colours what Ant Design still paints with the link colour, never with the accent', () => {
    for (const mode of MODES) {
      const p = RV_PALETTE[mode]
      const steps = buildTheme(mode).components?.Steps
      expect([steps?.colorPrimary, steps?.colorPrimaryHover]).toEqual([p.link, p.link])
      expect(JSON.stringify(steps)).not.toContain(p.accent)
      expect(JSON.stringify(steps)).not.toContain(p.accentHover)
    }
  })

  it('sizes the custom-icon tokens to the 20px ring of a mark', () => {
    for (const mode of MODES) {
      const steps = buildTheme(mode).components?.Steps
      expect([steps?.customIconSize, steps?.customIconFontSize, steps?.customIconTop]).toEqual([
        20, 20, 0,
      ])
    }
  })

  it('keeps every title, note and number readable, and every coloured ring and glyph visible', () => {
    for (const mode of MODES) {
      const p = RV_PALETTE[mode]
      for (const surface of SURFACES) {
        // Titles and notes, and the 11px number of a waiting step: text.
        for (const text of [p.text, p.text2, p.text3]) {
          expect(
            contrast(text, p[surface]),
            `${mode} ${text} on ${surface}`,
          ).toBeGreaterThanOrEqual(4.5)
        }
        // Rings and glyphs of the step in progress, a finished, a failed and a stopped one: icons.
        for (const icon of [p.link, p.success, p.danger, p.warning]) {
          expect(
            contrast(icon, p[surface]),
            `${mode} ${icon} on ${surface}`,
          ).toBeGreaterThanOrEqual(3)
        }
      }
    }
  })

  it('draws the line between stages neutral and a finished stretch green', () => {
    expect(declarations(/\.ant-steps-item \.ant-steps-item-rail/)).toContain(
      '--ant-cmp-steps-item-solid-line-color: var(--rv-border-strong);',
    )
    expect(declarations(/\.ant-steps-item \.ant-steps-item-rail-finish/)).toContain(
      '--ant-cmp-steps-item-solid-line-color: var(--rv-success);',
    )
    const stepsRules = antdCss.match(/\.ant-steps[^{]*\{[^}]*\}/g) ?? []
    expect(stepsRules).toHaveLength(2)
    expect(stepsRules.join('\n')).not.toContain('--rv-accent')
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
    '--rv-surface-2': 'surface2',
    '--rv-surface-3': 'surface3',
    '--rv-border': 'border',
    '--rv-border-strong': 'borderStrong',
    '--rv-text': 'text',
    '--rv-text-2': 'text2',
    '--rv-text-3': 'text3',
    '--rv-accent': 'accent',
    '--rv-accent-hover': 'accentHover',
    '--rv-accent-fg': 'accentFg',
    '--rv-link': 'link',
    '--rv-success': 'success',
    '--rv-warning': 'warning',
    '--rv-high': 'high',
    '--rv-critical': 'critical',
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

  it('holds the fade duration of the TS constant, declared once for both modes', () => {
    const dark = block(":root,\n[data-rv-theme='dark']")
    expect(dark['--rv-motion-fade']).toBe(`${String(RV_MOTION_FADE_MS)}ms`)
    expect(block("[data-rv-theme='light']")).not.toHaveProperty('--rv-motion-fade')
  })

  it('lets a subtree force the dark palette inside a light page', () => {
    expect(css).toContain(":root,\n[data-rv-theme='dark'] {")
    expect(css).not.toContain(":root[data-rv-theme='light']")
  })
})
