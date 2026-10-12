import type { Meta, StoryObj } from '@storybook/react-vite'
import { Layout } from 'antd'
import { useState } from 'react'

import { IconRepositories, IconRuns } from '../icons/icons'
import { NavMenu } from './NavMenu'

const items = [
  { path: '/repositories', icon: <IconRepositories />, label: 'Репозитории' },
  { path: '/runs', icon: <IconRuns />, label: 'Прогоны' },
]

const meta: Meta<typeof NavMenu> = {
  title: 'Свои компоненты/NavMenu',
  component: NavMenu,
  args: { items, label: 'Разделы', selectedPath: '/repositories' },
}

export default meta
type Story = StoryObj<typeof NavMenu>

/** The selected item is neutral grey, never blue. Items are 30px high, the indent is 8px. */
export const Default: Story = {
  render: function DefaultStory(args) {
    const [path, setPath] = useState(args.selectedPath)
    return (
      <div style={{ width: 208 }}>
        <NavMenu {...args} onNavigate={setPath} selectedPath={path} />
      </div>
    )
  },
}

/** Inside a collapsed sidebar only the icons stay; the label moves into a tooltip. */
export const Collapsed: Story = {
  render: (args) => (
    <Layout.Sider collapsed collapsedWidth={60} style={{ padding: '16px 8px' }} trigger={null}>
      <NavMenu {...args} />
    </Layout.Sider>
  ),
}
