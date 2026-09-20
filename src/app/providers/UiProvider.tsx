import ruRU from 'antd/locale/ru_RU'
import { ConfigProvider } from 'antd'
import type { ReactNode } from 'react'

export function UiProvider({ children }: { children: ReactNode }) {
  return <ConfigProvider locale={ruRU}>{children}</ConfigProvider>
}
