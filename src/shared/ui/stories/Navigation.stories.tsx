import type { Meta, StoryObj } from '@storybook/react-vite'
import { Avatar, Layout, Menu, type MenuProps } from 'antd'
import { useState } from 'react'

import { IconRepositories, IconRuns, IconSidebar } from '../icons/icons'
import { Logo } from '../Logo/Logo'

const meta: Meta<typeof Menu> = {
  title: 'Ant Design/Navigation',
  component: Menu,
}

export default meta
type Story = StoryObj<typeof Menu>

const items: MenuProps['items'] = [
  { key: 'repositories', icon: <IconRepositories />, label: 'Репозитории' },
  { key: 'runs', icon: <IconRuns />, label: 'Прогоны' },
  { key: 'disabled', icon: <IconSidebar />, label: 'Недоступно', disabled: true },
]

/** The selected item is neutral grey, never blue. Items are 30px high. */
export const InlineMenu: Story = {
  render: () => (
    <div style={{ width: 232 }}>
      <Menu defaultSelectedKeys={['repositories']} items={items} mode="inline" />
    </div>
  ),
}

/** Collapsed: only icons, the label moves into a tooltip. */
export const CollapsedMenu: Story = {
  render: () => (
    <div style={{ width: 60 }}>
      <Menu defaultSelectedKeys={['runs']} inlineCollapsed items={items} mode="inline" />
    </div>
  ),
}

/** Sidebar 232px, collapsed 60px. In the light theme the sidebar has its own background. */
export const PageLayout: Story = {
  parameters: { layout: 'fullscreen' },
  render: function PageLayoutStory() {
    const [collapsed, setCollapsed] = useState(false)
    return (
      <Layout style={{ minHeight: 360 }}>
        <Layout.Sider
          collapsed={collapsed}
          collapsedWidth={60}
          collapsible
          onCollapse={setCollapsed}
          style={{ borderInlineEnd: '1px solid var(--rv-border)' }}
          width={232}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 18px' }}>
            <Logo size={20} />
            {collapsed ? null : <strong>Reviewer</strong>}
          </div>
          <div style={{ padding: '0 10px' }}>
            <Menu defaultSelectedKeys={['repositories']} items={items} mode="inline" />
          </div>
        </Layout.Sider>
        <Layout.Content style={{ padding: '28px 32px' }}>Содержимое страницы</Layout.Content>
      </Layout>
    )
  },
}

export const Avatars: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Avatar size={24}>C</Avatar>
      <Avatar size={28}>C</Avatar>
      <Avatar>C</Avatar>
    </div>
  ),
}
