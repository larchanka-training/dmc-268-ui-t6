import ruRU from 'antd/locale/ru_RU'
import { App as AntApp, ConfigProvider, theme } from 'antd'
import { useEffect, type FC, type ReactNode } from 'react'

import { useThemeStore } from '../../features/theme'

const ThemeBodySync: FC = () => {
  const { token } = theme.useToken()
  const mode = useThemeStore((state) => state.mode)

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = token.colorBgLayout
      document.body.style.color = token.colorText
      document.documentElement.style.colorScheme = mode
    }
  }, [token, mode])

  return null
}

export function UiProvider({ children }: { children: ReactNode }) {
  const mode = useThemeStore((state) => state.mode)

  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        components: {
          Menu: {
            activeBarBorderWidth: 0,
          },
        },
      }}
    >
      <AntApp>
        <ThemeBodySync />
        {children}
      </AntApp>
    </ConfigProvider>
  )
}
