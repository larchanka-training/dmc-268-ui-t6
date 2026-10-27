import { LogoutOutlined, UpOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Dropdown, type MenuProps } from 'antd'
import { useRef, useState, type FC } from 'react'

import { useMe } from '../../../entities/user'
import { useTranslation } from '../../../shared/i18n'
import { RowButton } from '../../../shared/ui'
import { useAuthStore } from '../model/store'
import styles from './UserMenu.module.css'

export interface UserMenuProps {
  /** Items shown between the user block and "Sign out", for example the theme choice. */
  extraItems?: MenuProps['items']
  /** Shows only the avatar, for a collapsed sidebar. */
  compact?: boolean
}

export const UserMenu: FC<UserMenuProps> = ({ extraItems, compact = false }) => {
  const extra = extraItems ?? []
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const { data: user } = useMe(isAuthenticated)
  const logout = useAuthStore((state) => state.logout)
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null)
  const login = user?.login ?? t('layout.userMenu.fallbackLogin')

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
      label: t('layout.userMenu.logout'),
      onClick: () => {
        void logout()
      },
    },
  ]

  return (
    <Dropdown
      menu={{
        items,
        // Every item shows its whole label, so a tooltip would only repeat it. Ant Design adds one
        // to the items of a menu inside a folded sidebar (it reads the fold from the Sider), which
        // this dropdown is, though its own items are never folded.
        tooltip: false,
        // The menu closes on a choice and the focus goes back to the button that opened it,
        // but only after the key press is over: focused right away, the button would receive
        // the rest of the same Enter and open the menu again.
        onClick: () => {
          setOpen(false)
          window.setTimeout(() => {
            triggerRef.current?.focus()
          }, 0)
        },
      }}
      onOpenChange={setOpen}
      open={open}
      placement="topLeft"
      trigger={['click']}
    >
      <RowButton
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('layout.userMenu.label')}
        className={compact ? styles.compact : undefined}
        ref={triggerRef}
        size="large"
      >
        <Avatar
          alt={login}
          className={styles.avatar}
          icon={!user?.avatarUrl ? <UserOutlined /> : undefined}
          size={28}
          src={user?.avatarUrl ?? undefined}
        />
        {compact ? null : <span className={styles.loginText}>{login}</span>}
        {compact ? null : <UpOutlined className={styles.chevron} />}
      </RowButton>
    </Dropdown>
  )
}
