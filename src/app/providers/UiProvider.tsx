import ruRU from 'antd/locale/ru_RU'
import { ConfigProvider, theme } from 'antd'
import type { ReactNode } from 'react'

import { useThemeStore } from '../../features/theme'

export function UiProvider({ children }: { children: ReactNode }) {
  const mode = useThemeStore((state) => state.mode)

  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      {children}
    </ConfigProvider>
  )
}
