import { Layout, theme } from 'antd'
import type { FC, ReactNode } from 'react'

import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'

const { Content } = Layout

export interface AppLayoutProps {
  children?: ReactNode
  currentPath?: string
  onNavigate?: (path: string) => void
  headerExtra?: ReactNode
}

export const AppLayout: FC<AppLayoutProps> = ({
  children,
  currentPath,
  onNavigate,
  headerExtra,
}) => {
  const { token } = theme.useToken()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader extra={headerExtra} />
      <Layout>
        <AppSidebar currentPath={currentPath} onNavigate={onNavigate} />
        <Content
          style={{
            padding: 24,
            background: token.colorBgLayout,
            minHeight: 'calc(100vh - 64px)',
            overflow: 'auto',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
