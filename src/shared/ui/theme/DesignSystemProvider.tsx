import '../styles/tokens.css'
import '../styles/antd.css'

import { ConfigProvider } from 'antd'
import enUS from 'antd/locale/en_US'
import ruRU from 'antd/locale/ru_RU'
import { useEffect, useMemo, useSyncExternalStore, type JSX, type ReactNode } from 'react'

import type { Language } from '../../i18n'
import { Spinner } from '../Spinner/Spinner'
import { buildTheme } from './buildTheme'
import type { RvThemeMode } from './palette'

export interface DesignSystemProviderProps {
  mode: RvThemeMode
  /**
   * Language of the texts built into Ant Design (pagination, empty states, date picker). Required:
   * a default would silently put antd into another language than the app.
   */
  language: Language
  children: ReactNode
}

const ANTD_LOCALE = { en: enUS, ru: ruRU } as const

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(onChange: () => void): () => void {
  const media = window.matchMedia(REDUCED_MOTION)
  media.addEventListener('change', onChange)
  return () => {
    media.removeEventListener('change', onChange)
  }
}

function readReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION).matches
}

/**
 * Single entry point of the design system: Ant Design theme, our CSS tokens and the overrides on
 * top of Ant Design. Everything rendered inside looks like Flat Console. The click ripple is off
 * because the design has none, every `Spin` shows our loading ring instead of the default dots,
 * and Ant Design animations stop while the system asks to reduce motion.
 */
export function DesignSystemProvider(props: DesignSystemProviderProps): JSX.Element {
  const { mode, language, children } = props
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, readReducedMotion, () => false)
  const theme = useMemo(() => buildTheme(mode, { reducedMotion }), [mode, reducedMotion])
  useEffect(() => {
    document.documentElement.dataset.rvTheme = mode
  }, [mode])
  return (
    <ConfigProvider
      locale={ANTD_LOCALE[language]}
      spin={{ indicator: <Spinner label={null} size="inherit" /> }}
      theme={theme}
      wave={{ disabled: true }}
    >
      {children}
    </ConfigProvider>
  )
}
