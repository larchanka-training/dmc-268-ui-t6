import { LogoutOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Dropdown, Flex, type MenuProps, theme, Typography } from 'antd'
import { useState, type FC, type KeyboardEvent } from 'react'

import { useMe } from '../../../entities/user'
import { useAuthStore } from '../model/store'
import styles from './UserMenu.module.css'

const { Text } = Typography

export const UserMenu: FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const { data: user } = useMe(isAuthenticated)
  const logout = useAuthStore((state) => state.logout)
  const { token } = theme.useToken()
  const [open, setOpen] = useState(false)

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

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen((value) => !value)
    }
  }

  return (
    <Dropdown
      menu={{ items }}
      onOpenChange={setOpen}
      open={open}
      placement="bottomRight"
      trigger={['click']}
    >
      <Flex
        align="center"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Меню пользователя"
        className={styles.trigger}
        gap="small"
        onKeyDown={onTriggerKeyDown}
        role="button"
        tabIndex={0}
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
