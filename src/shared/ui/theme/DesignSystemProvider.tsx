import '../styles/tokens.css'
import '../styles/antd.css'

import { ConfigProvider } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import { useEffect, type JSX, type ReactNode } from 'react'

import { Spinner } from '../Spinner/Spinner'
import { buildTheme } from './buildTheme'
import type { RvThemeMode } from './palette'

export interface DesignSystemProviderProps {
  mode: RvThemeMode
  children: ReactNode
}

/**
 * Single entry point of the design system: Ant Design theme, our CSS tokens and the overrides on
 * top of Ant Design. Everything rendered inside looks like Flat Console. The click ripple is off
 * because the design has none, and every `Spin` shows our loading ring instead of the default dots.
 */
export function DesignSystemProvider(props: DesignSystemProviderProps): JSX.Element {
  const { mode, children } = props
  useEffect(() => {
    document.documentElement.dataset.rvTheme = mode
  }, [mode])
  return (
    <ConfigProvider
      locale={ruRU}
      spin={{ indicator: <Spinner label={null} size="inherit" /> }}
      theme={buildTheme(mode)}
      wave={{ disabled: true }}
    >
      {children}
    </ConfigProvider>
  )
}
