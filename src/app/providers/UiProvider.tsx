import ruRU from 'antd/locale/ru_RU'
import { App as AntApp, ConfigProvider, theme } from 'antd'
import { useEffect, type FC, type ReactNode } from 'react'

import { useThemeStore } from '../../features/theme'

const ThemeBodySync: FC = () => {
  const { token } = theme.useToken()

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = token.colorBgLayout
      document.body.style.color = token.colorText
    }
  }, [token])

  return null
}

export function UiProvider({ children }: { children: ReactNode }) {
  const mode = useThemeStore((state) => state.mode)

  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <AntApp>
        <ThemeBodySync />
        {children}
      </AntApp>
    </ConfigProvider>
  )
}
