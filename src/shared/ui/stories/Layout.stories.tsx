import type { Meta, StoryObj } from '@storybook/react-vite'
import { Avatar, Layout } from 'antd'
import { useState } from 'react'

import { IconRepositories, IconRuns } from '../icons/icons'
import { Logo } from '../Logo/Logo'
import { NavMenu } from '../NavMenu/NavMenu'

const meta: Meta<typeof Layout> = {
  title: 'Ant Design/Layout',
  component: Layout,
}

export default meta
type Story = StoryObj<typeof Layout>

const items = [
  { path: '/repositories', icon: <IconRepositories />, label: 'Репозитории' },
  { path: '/runs', icon: <IconRuns />, label: 'Прогоны' },
]

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
          <div style={{ padding: '0 8px' }}>
            <NavMenu items={items} label="Разделы" selectedPath="/repositories" />
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
