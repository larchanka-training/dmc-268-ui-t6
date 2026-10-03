import { Layout, theme } from 'antd'
import type { FC, ReactNode } from 'react'

import { AppHeader } from './AppHeader'
import styles from './AppLayout.module.css'
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
    <Layout className={styles.layout}>
      <AppHeader extra={headerExtra} />
      <Layout>
        <AppSidebar currentPath={currentPath} onNavigate={onNavigate} />
        <Content
          className={styles.content}
          style={{
            background: token.colorBgLayout,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
