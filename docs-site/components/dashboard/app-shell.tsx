'use client'

/*
 * The dashboard shell, built from the app's own pieces: the design system from src/shared/ui and
 * the layout CSS of src/widgets/app-layout. Only the text is English. Used by /mockups/* only.
 */
import type { ReactNode } from 'react'
import { App as AntApp, Avatar, Button, Layout } from 'antd'
import { UpOutlined, UserOutlined } from '@ant-design/icons'
import {
  DesignSystemProvider,
  IconRepositories,
  IconRuns,
  IconSidebar,
  Logo,
  NavMenu,
  RowButton,
} from '../../../src/shared/ui'
import layoutStyles from '../../../src/widgets/app-layout/ui/AppLayout.module.css'
import userStyles from '../../../src/features/auth/ui/UserMenu.module.css'

const { Sider, Content } = Layout

const NAV = [
  { path: '/repositories', icon: <IconRepositories />, label: 'Repositories' },
  { path: '/runs', icon: <IconRuns />, label: 'Runs' },
]

export function AppShell({ active, children }: { active: string; children: ReactNode }) {
  return (
    <DesignSystemProvider mode="dark">
      <AntApp>
        <Layout className={layoutStyles.layout} hasSider>
          <Sider className={layoutStyles.sidebar} trigger={null} width={232}>
            <div className={layoutStyles.sidebarBody}>
              <div className={layoutStyles.sidebarTop}>
                <a className={layoutStyles.brand} href="#">
                  <Logo size={22} />
                  Reviewer
                </a>
                <Button
                  aria-label="Collapse menu"
                  icon={<IconSidebar />}
                  size="small"
                  type="text"
                />
              </div>
              <NavMenu items={NAV} label="Sections" selectedPath={active} />
              <div className={layoutStyles.sidebarUser}>
                <RowButton size="large">
                  <Avatar className={userStyles.avatar} icon={<UserOutlined />} size={28} />
                  <span className={userStyles.loginText}>maria</span>
                  <UpOutlined className={userStyles.chevron} />
                </RowButton>
              </div>
            </div>
          </Sider>
          <Content className={layoutStyles.content}>{children}</Content>
        </Layout>
      </AntApp>
    </DesignSystemProvider>
  )
}
