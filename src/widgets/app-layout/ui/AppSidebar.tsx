import {
  AuditOutlined,
  CodeOutlined,
  FolderOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { Button, Layout, Menu, theme } from 'antd'
import { useState, type FC } from 'react'

import { mocksEnabledAtRuntime } from '../../../shared/config/buildFlags'
import { isMockMode } from '../../../shared/config/env'
import styles from './AppLayout.module.css'

const { Sider } = Layout

export interface AppSidebarProps {
  currentPath?: string
  onNavigate?: (path: string) => void
}

export const AppSidebar: FC<AppSidebarProps> = ({ currentPath = '/repositories', onNavigate }) => {
  const [collapsed, setCollapsed] = useState(false)
  const { token } = theme.useToken()

  const menuItems = [
    {
      key: '/repositories',
      icon: <FolderOutlined />,
      label: 'Репозитории',
    },
    {
      key: '/runs',
      icon: <AuditOutlined />,
      label: 'Прогоны',
    },
    ...(mocksEnabledAtRuntime(isMockMode)
      ? [
          {
            key: '/review',
            icon: <CodeOutlined />,
            label: 'Ревью',
          },
        ]
      : []),
  ]

  const selectedKey =
    menuItems.find((item) => currentPath.startsWith(item.key))?.key ?? '/repositories'

  return (
    <Sider
      breakpoint="lg"
      collapsed={collapsed}
      collapsedWidth={64}
      collapsible
      onCollapse={(value) => {
        setCollapsed(value)
      }}
      style={{
        borderRight: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
      }}
      trigger={null}
      width={220}
    >
      <div
        className={[
          styles.sidebarToggle,
          collapsed ? styles.sidebarToggleCollapsed : styles.sidebarToggleExpanded,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <Button
          aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => {
            setCollapsed(!collapsed)
          }}
          type="text"
        />
      </div>
      <Menu
        items={menuItems}
        mode="inline"
        onClick={({ key }) => {
          onNavigate?.(key)
        }}
        selectedKeys={[selectedKey]}
      />
    </Sider>
  )
}
