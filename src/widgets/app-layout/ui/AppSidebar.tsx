import {
  AuditOutlined,
  CodeOutlined,
  FolderOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { Button, Layout, Menu, theme } from 'antd'
import { useState, type FC } from 'react'

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
    {
      key: '/review',
      icon: <CodeOutlined />,
      label: 'Ревью',
    },
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
        style={{
          padding: '12px 16px',
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'flex-end',
        }}
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
        style={{ borderRight: 0 }}
      />
    </Sider>
  )
}
