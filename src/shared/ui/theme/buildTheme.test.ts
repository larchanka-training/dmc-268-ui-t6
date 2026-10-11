import { theme as antdTheme } from 'antd'
import { describe, expect, it } from 'vitest'

import { buildTheme } from './buildTheme'

describe('buildTheme', () => {
  it('uses the dark algorithm and the dark page background for the dark mode', () => {
    const config = buildTheme('dark')
    expect(config.algorithm).toBe(antdTheme.darkAlgorithm)
    expect(config.token?.colorBgLayout).toBe('#090d18')
    expect(config.token?.colorText).toBe('#f8fafc')
  })

  it('uses the default algorithm and a white page for the light mode', () => {
    const config = buildTheme('light')
    expect(config.algorithm).toBe(antdTheme.defaultAlgorithm)
    expect(config.token?.colorBgLayout).toBe('#ffffff')
    expect(config.token?.colorText).toBe('#0b1220')
  })

  it('keeps the control heights of the specification in both modes', () => {
    for (const mode of ['dark', 'light'] as const) {
      const { token } = buildTheme(mode)
      expect([token?.controlHeightSM, token?.controlHeight, token?.controlHeightLG]).toEqual([
        26, 32, 40,
      ])
    }
  })

  it('pins the exact accent on buttons so the dark algorithm cannot darken it', () => {
    const button = buildTheme('dark').components?.Button
    expect(button?.colorPrimary).toBe('#2563eb')
    expect(button?.colorPrimaryHover).toBe('#3b74f0')
  })

  it('gives a press its own colour step, darker than hover', () => {
    const button = buildTheme('dark').components?.Button
    expect(button?.colorPrimaryActive).toBe('#1d4fd0')
    expect(button?.defaultActiveBg).toBe('#2a3042')
    expect(button?.defaultActiveColor).toBe('#f8fafc')
  })

  it('keeps a secondary button neutral on hover', () => {
    const button = buildTheme('dark').components?.Button
    expect(button?.defaultHoverColor).toBe('#f8fafc')
    expect(button?.defaultHoverBg).toBe('#222737')
  })
})
