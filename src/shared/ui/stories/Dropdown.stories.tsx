import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  CheckOutlined,
  DesktopOutlined,
  LogoutOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons'
import { Button, Dropdown, Flex } from 'antd'
import { useState, type ReactNode } from 'react'

const meta: Meta<typeof Dropdown> = {
  title: 'Ant Design/Dropdown',
  component: Dropdown,
  decorators: [
    (Story) => (
      <div style={{ minHeight: 240 }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof Dropdown>

/** The user menu: the theme is a labelled list, the selected option carries a check mark. */
export const UserMenu: Story = {
  render: function UserMenuStory() {
    const [theme, setTheme] = useState('dark')
    const option = (key: string, icon: ReactNode, label: string) => ({
      key,
      icon,
      label: (
        <Flex align="center" justify="space-between">
          {label}
          {theme === key ? <CheckOutlined /> : null}
        </Flex>
      ),
      onClick: () => {
        setTheme(key)
      },
    })
    return (
      <Dropdown
        menu={{
          items: [
            {
              type: 'group',
              key: 'theme',
              label: 'Тема',
              children: [
                option('system', <DesktopOutlined />, 'Как в системе'),
                option('light', <SunOutlined />, 'Светлая'),
                option('dark', <MoonOutlined />, 'Тёмная'),
              ],
            },
            { type: 'divider' },
            { key: 'logout', danger: true, icon: <LogoutOutlined />, label: 'Выйти' },
          ],
        }}
        trigger={['click']}
      >
        <Button>skvertl</Button>
      </Dropdown>
    )
  },
}
