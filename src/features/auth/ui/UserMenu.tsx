import { LogoutOutlined, UpOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Dropdown, type MenuProps } from 'antd'
import { useState, type FC } from 'react'

import { useMe } from '../../../entities/user'
import { useAuthStore } from '../model/store'
import styles from './UserMenu.module.css'

export interface UserMenuProps {
  /** Items shown between the user block and "Выйти", for example the theme choice. */
  extraItems?: MenuProps['items']
  /** Shows only the avatar, for a collapsed sidebar. */
  compact?: boolean
}

export const UserMenu: FC<UserMenuProps> = ({ extraItems, compact = false }) => {
  const extra = extraItems ?? []
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const { data: user } = useMe(isAuthenticated)
  const logout = useAuthStore((state) => state.logout)
  const [open, setOpen] = useState(false)
  const login = user?.login ?? 'Пользователь'

  const avatar = (
    <Avatar
      alt={login}
      className={styles.avatar}
      icon={!user?.avatarUrl ? <UserOutlined /> : undefined}
      size={28}
      src={user?.avatarUrl ?? undefined}
    />
  )

  const items: MenuProps['items'] = [
    ...(user
      ? [
          {
            key: 'user-info',
            disabled: true,
            className: styles.userInfo,
            label: (
              <span className={styles.userText}>
                <b>{user.name ?? user.login}</b>
                <small>ID: {user.id}</small>
              </span>
            ),
          },
          { type: 'divider' as const },
        ]
      : []),
    ...extra,
    ...(extra.length > 0 ? [{ type: 'divider' as const }] : []),
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
    <Dropdown
      menu={{ items }}
      onOpenChange={setOpen}
      open={open}
      placement="topLeft"
      trigger={['click']}
    >
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Меню пользователя"
        className={styles.trigger}
        data-compact={compact || undefined}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setOpen((value) => !value)
          }
        }}
        type="button"
      >
        {avatar}
        {compact ? null : (
          <>
            <span className={styles.loginText}>{login}</span>
            <UpOutlined className={styles.chevron} />
          </>
        )}
      </button>
    </Dropdown>
  )
}
