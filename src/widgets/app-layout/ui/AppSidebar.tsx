import {
  CheckOutlined,
  CodeOutlined,
  DesktopOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons'
import { Layout, Menu, type MenuProps } from 'antd'
import { useEffect, useState, type FC, type ReactNode } from 'react'

import { UserMenu } from '../../../features/auth'
import { useThemeStore, type ThemePreference } from '../../../features/theme'
import { mocksEnabledAtRuntime } from '../../../shared/config/buildFlags'
import { isMockMode } from '../../../shared/config/env'
import { IconRepositories, IconRuns, IconSidebar, Logo } from '../../../shared/ui'
import styles from './AppLayout.module.css'

const { Sider } = Layout

const BRAND_NAME = 'Reviewer'

export interface AppSidebarProps {
  currentPath?: string
  onNavigate?: (path: string) => void
}

export const AppSidebar: FC<AppSidebarProps> = ({ currentPath = '/repositories', onNavigate }) => {
  const [collapsed, setCollapsed] = useState(false)
  const preference = useThemeStore((state) => state.preference)
  const setPreference = useThemeStore((state) => state.setPreference)

  // `[` folds and unfolds the sidebar, unless the user is typing.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target
      const typing = target instanceof HTMLElement && target.closest('input, textarea, select')
      if (event.key === '[' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        setCollapsed((value) => !value)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const menuItems = [
    { key: '/repositories', icon: <IconRepositories />, label: 'Репозитории' },
    { key: '/runs', icon: <IconRuns />, label: 'Прогоны' },
    ...(mocksEnabledAtRuntime(isMockMode)
      ? [{ key: '/review', icon: <CodeOutlined />, label: 'Ревью' }]
      : []),
  ]

  const selectedKey =
    menuItems.find((item) => currentPath.startsWith(item.key))?.key ?? '/repositories'

  const themeItem = (key: ThemePreference, icon: ReactNode, label: string) => ({
    key: `theme-${key}`,
    icon,
    label: (
      <span className={styles.themeOption}>
        {label}
        {preference === key ? <CheckOutlined aria-label="выбрано" /> : null}
      </span>
    ),
    onClick: () => {
      setPreference(key)
    },
  })

  const themeItems: MenuProps['items'] = [
    {
      type: 'group',
      key: 'theme',
      label: 'Тема',
      children: [
        themeItem('system', <DesktopOutlined />, 'Как в системе'),
        themeItem('light', <SunOutlined />, 'Светлая'),
        themeItem('dark', <MoonOutlined />, 'Тёмная'),
      ],
    },
  ]

  return (
    <Sider
      breakpoint="lg"
      className={styles.sidebar}
      collapsed={collapsed}
      collapsedWidth={60}
      collapsible
      onCollapse={(value) => {
        setCollapsed(value)
      }}
      trigger={null}
      width={232}
    >
      <div className={styles.sidebarTop} data-collapsed={collapsed || undefined}>
        {collapsed ? (
          // Folded: the mark itself unfolds the sidebar, so the rows below never move.
          <button
            aria-label="Развернуть меню"
            className={styles.expand}
            onClick={() => {
              setCollapsed(false)
            }}
            title="Развернуть меню ( [ )"
            type="button"
          >
            <span className={styles.expandLogo}>
              <Logo size={22} />
            </span>
            <span className={styles.expandIcon}>
              <IconSidebar />
            </span>
          </button>
        ) : (
          <>
            <span className={styles.brand}>
              <Logo size={22} />
              {BRAND_NAME}
            </span>
            <button
              aria-label="Свернуть меню"
              className={styles.toggle}
              onClick={() => {
                setCollapsed(true)
              }}
              title="Свернуть меню ( [ )"
              type="button"
            >
              <IconSidebar />
            </button>
          </>
        )}
      </div>

      <Menu
        className={styles.menu}
        items={menuItems}
        mode="inline"
        onClick={({ key }) => {
          onNavigate?.(key)
        }}
        selectedKeys={[selectedKey]}
      />

      <div className={styles.sidebarUser}>
        <UserMenu compact={collapsed} extraItems={themeItems} />
      </div>
    </Sider>
  )
}
