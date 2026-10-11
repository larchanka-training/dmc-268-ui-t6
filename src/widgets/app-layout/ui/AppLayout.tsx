import { Layout } from 'antd'
import type { FC, ReactNode } from 'react'

import styles from './AppLayout.module.css'
import { AppSidebar } from './AppSidebar'

const { Content } = Layout

export interface AppLayoutProps {
  children?: ReactNode
  currentPath?: string
  onNavigate?: (path: string) => void
}

/** App shell: the sidebar carries the brand, the navigation and the user; pages own their titles. */
export const AppLayout: FC<AppLayoutProps> = ({ children, currentPath, onNavigate }) => {
  return (
    <Layout className={styles.layout} hasSider>
      <AppSidebar currentPath={currentPath} onNavigate={onNavigate} />
      <Content className={styles.content}>{children}</Content>
    </Layout>
  )
}
