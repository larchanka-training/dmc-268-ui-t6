import { LogoutOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Dropdown, Flex, type MenuProps, theme, Typography } from 'antd'
import type { FC } from 'react'

import { useMe } from '../../../entities/user'
import { useAuthStore } from '../model/store'
import styles from './UserMenu.module.css'

const { Text } = Typography

export const UserMenu: FC = () => {
  const { data: user } = useMe()
  const logout = useAuthStore((state) => state.logout)
  const { token } = theme.useToken()

  const items: MenuProps['items'] = [
    ...(user
      ? [
          {
            key: 'user-info',
            disabled: true,
            label: (
              <Flex vertical>
                <Text strong>{user.name ?? user.login}</Text>
                <Text style={{ fontSize: token.fontSizeSM }} type="secondary">
                  ID: {user.id}
                </Text>
              </Flex>
            ),
          },
          {
            type: 'divider' as const,
          },
        ]
      : []),
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
        className={styles.trigger}
        gap="small"
        role="button"
      >
        <Avatar
          alt={user?.login ?? 'Пользователь'}
          icon={!user?.avatarUrl ? <UserOutlined /> : undefined}
          size="small"
          src={user?.avatarUrl ?? undefined}
        />
        <Text className={styles.loginText} ellipsis strong>
          {user?.login ?? 'Пользователь'}
        </Text>
      </Flex>
    </Dropdown>
  )
}
