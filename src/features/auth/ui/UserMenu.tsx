import { LogoutOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Dropdown, Flex, type MenuProps, Typography } from 'antd'
import type { FC } from 'react'

import { useMe } from '../../../entities/user'
import { useAuthStore } from '../model/store'

const { Text } = Typography

export const UserMenu: FC = () => {
  const { data: user } = useMe()
  const logout = useAuthStore((state) => state.logout)

  if (!user) return null

  const items: MenuProps['items'] = [
    {
      key: 'user-info',
      disabled: true,
      label: (
        <Flex vertical>
          <Text strong>{user.name ?? user.login}</Text>
          <Text style={{ fontSize: 12 }} type="secondary">
            ID: {user.id}
          </Text>
        </Flex>
      ),
    },
    {
      type: 'divider',
    },
    {
      danger: true,
      icon: <LogoutOutlined />,
      key: 'logout',
      label: 'Выйти',
      onClick: () => {
        void logout()
      },
    },
  ]

  return (
    <Dropdown menu={{ items }} placement="bottomRight" trigger={['click']}>
      <Flex
        align="center"
        aria-label="Меню пользователя"
        gap="small"
        role="button"
        style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}
      >
        <Avatar
          alt={user.login}
          icon={!user.avatarUrl ? <UserOutlined /> : undefined}
          size="small"
          src={user.avatarUrl ?? undefined}
        />
        <Text ellipsis strong style={{ maxWidth: 120 }}>
          {user.login}
        </Text>
      </Flex>
    </Dropdown>
  )
}
