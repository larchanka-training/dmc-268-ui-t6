import {
  CheckOutlined,
  DesktopOutlined,
  MoonOutlined,
  ReadOutlined,
  SunOutlined,
} from '@ant-design/icons'
import { Button, Layout, type MenuProps } from 'antd'
import { useEffect, useRef, useState, type FC, type MouseEvent, type ReactNode } from 'react'

import { UserMenu } from '../../../features/auth'
import { useThemeStore, type ThemePreference } from '../../../features/theme'
import { mocksEnabledAtRuntime } from '../../../shared/config/buildFlags'
import { DOCS_URL, isMockMode } from '../../../shared/config/env'
import {
  IconRepositories,
  IconReview,
  IconRuns,
  IconSidebar,
  Logo,
  NavMenu,
} from '../../../shared/ui'
import styles from './AppLayout.module.css'

const { Sider } = Layout

const BRAND_NAME = 'Reviewer'
const HOME_PATH = '/repositories'

type MenuItem = NonNullable<MenuProps['items']>[number]

export interface AppSidebarProps {
  currentPath?: string
  onNavigate?: (path: string) => void
}

export const AppSidebar: FC<AppSidebarProps> = ({ currentPath = HOME_PATH, onNavigate }) => {
  const [collapsed, setCollapsed] = useState(false)
  const preference = useThemeStore((state) => state.preference)
  const setPreference = useThemeStore((state) => state.setPreference)
  const foldRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null)
  const unfoldRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null)
  const moveFocus = useRef(false)

  // Folding swaps one button for the other. When the user did it, the focus follows to the
  // button that undoes the action instead of falling back to the top of the page.
  useEffect(() => {
    if (moveFocus.current) {
      moveFocus.current = false
      ;(collapsed ? unfoldRef : foldRef).current?.focus()
    }
  }, [collapsed])

  const fold = (value: boolean): void => {
    moveFocus.current = true
    setCollapsed(value)
  }

  const navItems = [
    { path: '/repositories', icon: <IconRepositories />, label: 'Репозитории' },
    { path: '/runs', icon: <IconRuns />, label: 'Прогоны' },
    ...(mocksEnabledAtRuntime(isMockMode)
      ? [{ path: '/review', icon: <IconReview />, label: 'Ревью' }]
      : []),
  ]

  const selectedPath = navItems.find((item) => currentPath.startsWith(item.path))?.path ?? HOME_PATH

  const goHome = (event: MouseEvent): void => {
    // A click with a modifier belongs to the browser: it opens the link in a new tab.
    // So does any click when nobody handles navigation: the link then simply works.
    if (onNavigate === undefined || event.metaKey || event.ctrlKey || event.shiftKey) {
      return
    }
    event.preventDefault()
    onNavigate(HOME_PATH)
  }

  // The three themes are one radio group: assistive tech hears which one is chosen. The `role`
  // and `aria-checked` reach the menu item element; the type of an Ant Design item omits them.
  const themeItem = (key: ThemePreference, icon: ReactNode, label: string): MenuItem => {
    const item = {
      key: `theme-${key}`,
      icon,
      role: 'menuitemradio',
      'aria-checked': preference === key,
      label: (
        <span className={styles.themeOption}>
          {label}
          {preference === key ? <CheckOutlined aria-hidden /> : null}
        </span>
      ),
      onClick: () => {
        setPreference(key)
      },
    }
    return item
  }

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
    { type: 'divider' },
    {
      key: 'docs',
      icon: <ReadOutlined />,
      // A real link, so a click, a middle click and "copy link" work as on any link; Ant Design
      // stretches it over the whole row. The keyboard (Enter) reaches only the item's onClick.
      label: (
        <a href={DOCS_URL} rel="noreferrer" target="_blank">
          Документация
        </a>
      ),
      onClick: ({ domEvent }) => {
        if (domEvent.type === 'keydown') {
          window.open(DOCS_URL, '_blank', 'noopener,noreferrer')
        }
      },
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
      <div className={styles.sidebarBody} data-collapsed={collapsed || undefined}>
        <div className={styles.sidebarTop}>
          {collapsed ? (
            // Folded: the mark itself unfolds the sidebar, so the rows below never move.
            <Button
              aria-label="Развернуть меню"
              className={styles.unfold}
              icon={
                <span className={styles.unfoldMark}>
                  <span className={styles.unfoldLogo}>
                    <Logo size={22} />
                  </span>
                  <span className={styles.unfoldIcon}>
                    <IconSidebar />
                  </span>
                </span>
              }
              onClick={() => {
                fold(false)
              }}
              ref={unfoldRef}
              type="text"
            />
          ) : (
            <>
              <a className={styles.brand} href={HOME_PATH} onClick={goHome}>
                <Logo size={22} />
                {BRAND_NAME}
              </a>
              <Button
                aria-label="Свернуть меню"
                icon={<IconSidebar />}
                onClick={() => {
                  fold(true)
                }}
                ref={foldRef}
                size="small"
                type="text"
              />
            </>
          )}
        </div>

        <NavMenu
          items={navItems}
          label="Разделы"
          onNavigate={onNavigate}
          selectedPath={selectedPath}
        />

        <div className={styles.sidebarUser}>
          <UserMenu compact={collapsed} extraItems={themeItems} />
        </div>
      </div>
    </Sider>
  )
}
