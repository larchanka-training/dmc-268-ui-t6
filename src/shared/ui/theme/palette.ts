export type RvThemeMode = 'dark' | 'light'

/** Colours of one theme. The same values live in `styles/tokens.css` for plain CSS. */
export interface RvPalette {
  bg: string
  bgRaised: string
  surface: string
  surface3: string
  popover: string
  border: string
  borderStrong: string
  text: string
  text2: string
  text3: string
  accent: string
  accentHover: string
  link: string
  success: string
  warning: string
  danger: string
  hover: string
  selected: string
  buttonHover: string
  focusRing: string
}

export const RV_PALETTE: Record<RvThemeMode, RvPalette> = {
  dark: {
    bg: '#090d18',
    bgRaised: '#0c1121',
    surface: '#0f1526',
    surface3: '#1a2238',
    popover: '#141b2f',
    border: 'rgba(148, 163, 184, 0.12)',
    borderStrong: 'rgba(148, 163, 184, 0.2)',
    text: '#f8fafc',
    text2: '#94a3b8',
    text3: '#6b7a90',
    accent: '#2563eb',
    accentHover: '#3b74f0',
    link: '#60a5fa',
    success: '#4ade80',
    warning: '#fbbf24',
    danger: '#f87171',
    hover: 'rgba(148, 163, 184, 0.06)',
    selected: 'rgba(248, 250, 252, 0.08)',
    buttonHover: '#222737',
    focusRing: 'rgba(96, 165, 250, 0.25)',
  },
  light: {
    bg: '#ffffff',
    bgRaised: '#ffffff',
    surface: '#ffffff',
    surface3: '#e4e9f2',
    popover: '#ffffff',
    border: 'rgba(15, 23, 42, 0.09)',
    borderStrong: 'rgba(15, 23, 42, 0.16)',
    text: '#0b1220',
    text2: '#475569',
    text3: '#64748b',
    accent: '#2563eb',
    accentHover: '#3b74f0',
    link: '#1d4ed8',
    success: '#15803d',
    warning: '#a16207',
    danger: '#dc2626',
    hover: 'rgba(15, 23, 42, 0.04)',
    selected: 'rgba(15, 23, 42, 0.06)',
    buttonHover: '#ebeced',
    focusRing: 'rgba(29, 78, 216, 0.2)',
  },
}

export const RV_FONT_SANS =
  "'Inter Variable', 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
export const RV_FONT_MONO =
  "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, 'SFMono-Regular', menlo, monospace"
