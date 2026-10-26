import { App as AntApp, theme } from 'antd'
import { useEffect, type FC, type ReactNode } from 'react'

import { useLanguageStore } from '../../features/language'
import { useThemeStore } from '../../features/theme'
import { DesignSystemProvider, PageLoaderHost } from '../../shared/ui'

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

/** The whole app renders inside the design system (Ф-20): one theme, one set of tokens. */
export function UiProvider({ children }: { children: ReactNode }) {
  const mode = useThemeStore((state) => state.mode)
  const language = useLanguageStore((state) => state.language)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return (
    <DesignSystemProvider language={language} mode={mode}>
      <AntApp>
        <ThemeBodySync />
        <PageLoaderHost />
        {children}
      </AntApp>
    </DesignSystemProvider>
  )
}
