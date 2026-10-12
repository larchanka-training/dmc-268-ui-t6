export type RvThemeMode = 'dark' | 'light'

/** Colours of one theme. The same values live in `styles/tokens.css` for plain CSS. */
export interface RvPalette {
  bg: string
  bgRaised: string
  surface: string
  surface2: string
  surface3: string
  popover: string
  border: string
  borderStrong: string
  text: string
  text2: string
  text3: string
  accent: string
  accentHover: string
  /** Text on the accent. */
  accentFg: string
  link: string
  success: string
  warning: string
  high: string
  critical: string
  danger: string
  dangerHover: string
  dangerActive: string
  /** Text on a surface filled with `danger`. */
  dangerFg: string
  hover: string
  selected: string
  buttonHover: string
  buttonActive: string
  accentActive: string
  focusRing: string
  sidebar: string
  mask: string
  popoverShadow: string
  /** Background, stronger background and border of each status, for alerts and the diff. */
  successBg: string
  successBgStrong: string
  successBorder: string
  warningBg: string
  warningBgStrong: string
  warningBorder: string
  dangerBg: string
  dangerBgStrong: string
  dangerBorder: string
  infoBg: string
  infoBgStrong: string
  infoBorder: string
}

export const RV_PALETTE: Record<RvThemeMode, RvPalette> = {
  dark: {
    bg: '#090d18',
    bgRaised: '#0c1121',
    surface: '#0f1526',
    surface2: '#141b2f',
    surface3: '#1a2238',
    popover: '#141b2f',
    border: 'rgba(148, 163, 184, 0.12)',
    borderStrong: 'rgba(148, 163, 184, 0.2)',
    text: '#f8fafc',
    text2: '#94a3b8',
    text3: '#7786a0',
    accent: '#2563eb',
    accentHover: '#356eee',
    accentFg: '#ffffff',
    link: '#60a5fa',
    success: '#4ade80',
    warning: '#fbbf24',
    high: '#fb923c',
    critical: '#f97316',
    danger: '#f87171',
    dangerHover: '#fa8a8a',
    dangerActive: '#e06060',
    dangerFg: '#090d18',
    hover: 'rgba(148, 163, 184, 0.06)',
    selected: 'rgba(248, 250, 252, 0.08)',
    buttonHover: '#222737',
    buttonActive: '#2a3042',
    accentActive: '#1d4fd0',
    focusRing: 'rgba(96, 165, 250, 0.25)',
    sidebar: '#090d18',
    mask: 'rgba(0, 0, 0, 0.55)',
    popoverShadow: '0 8px 24px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(148, 163, 184, 0.2)',
    successBg: '#132a2c',
    successBgStrong: '#1a3e36',
    successBorder: '#20533f',
    warningBg: '#292621',
    warningBgStrong: '#413722',
    warningBorder: '#584922',
    dangerBg: '#281d2b',
    dangerBgStrong: '#402633',
    dangerBorder: '#58303b',
    infoBg: '#16233b',
    infoBgStrong: '#1e3251',
    infoBorder: '#274066',
  },
  light: {
    bg: '#ffffff',
    bgRaised: '#ffffff',
    surface: '#ffffff',
    surface2: '#f5f7fa',
    surface3: '#e4e9f2',
    popover: '#ffffff',
    border: 'rgba(15, 23, 42, 0.09)',
    borderStrong: 'rgba(15, 23, 42, 0.16)',
    text: '#0b1220',
    text2: '#475569',
    text3: '#627289',
    accent: '#2563eb',
    accentHover: '#356eee',
    accentFg: '#ffffff',
    link: '#1d4ed8',
    success: '#15803d',
    warning: '#a16207',
    high: '#c2410c',
    critical: '#b91c1c',
    danger: '#d92626',
    dangerHover: '#c52020',
    dangerActive: '#b01c1c',
    dangerFg: '#ffffff',
    hover: 'rgba(15, 23, 42, 0.04)',
    selected: 'rgba(15, 23, 42, 0.06)',
    buttonHover: '#ebeced',
    buttonActive: '#dfe2e6',
    accentActive: '#1d4fd0',
    focusRing: 'rgba(29, 78, 216, 0.2)',
    sidebar: '#f8f9fc',
    mask: 'rgba(15, 23, 42, 0.35)',
    popoverShadow: '0 8px 24px -12px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(15, 23, 42, 0.16)',
    successBg: '#e0f7e8',
    successBgStrong: '#c6f0d5',
    successBorder: '#b4d6c1',
    warningBg: '#f6efe6',
    warningBgStrong: '#eee3d2',
    warningBorder: '#e1cdb0',
    dangerBg: '#fdecec',
    dangerBgStrong: '#fbd6d6',
    dangerBorder: '#f4baba',
    infoBg: '#e8edfb',
    infoBgStrong: '#d6dff8',
    infoBorder: '#b7c6f3',
  },
}

export const RV_FONT_SANS =
  "'Inter Variable', 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
export const RV_FONT_MONO =
  "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, 'SFMono-Regular', menlo, monospace"
