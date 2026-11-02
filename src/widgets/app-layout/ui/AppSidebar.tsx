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
import { useLanguageStore } from '../../../features/language'
import { useThemeStore, type ThemePreference } from '../../../features/theme'
import { mocksEnabledAtRuntime } from '../../../shared/config/buildFlags'
import { DOCS_URL, isMockMode } from '../../../shared/config/env'
import { LANGUAGE_NAMES, LANGUAGES, useTranslation } from '../../../shared/i18n'
import {
  IconAnalytics,
  IconAudit,
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

/**
 * The language choice is written the same way in every language, so a user who cannot read the
 * current one still finds it: the group title is not translated, and each option is the name of
 * the language in itself.
 */
const LANGUAGE_GROUP_TITLE = 'Language'
const LANGUAGE_OPTIONS = LANGUAGES.map((key) => ({ key, label: LANGUAGE_NAMES[key] }))

export interface AppSidebarProps {
  currentPath?: string
  onNavigate?: (path: string) => void
}

export const AppSidebar: FC<AppSidebarProps> = ({ currentPath = HOME_PATH, onNavigate }) => {
  const [collapsed, setCollapsed] = useState(false)
  const preference = useThemeStore((state) => state.preference)
  const setPreference = useThemeStore((state) => state.setPreference)
  const language = useLanguageStore((state) => state.language)
  const setLanguage = useLanguageStore((state) => state.setLanguage)
  const { t } = useTranslation()
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
    { path: '/repositories', icon: <IconRepositories />, label: t('layout.nav.repositories') },
    { path: '/runs', icon: <IconRuns />, label: t('layout.nav.runs') },
    { path: '/audit', icon: <IconAudit />, label: t('layout.nav.audit') },
    { path: '/analytics', icon: <IconAnalytics />, label: t('layout.nav.analytics') },
    ...(mocksEnabledAtRuntime(isMockMode)
      ? [{ path: '/review', icon: <IconReview />, label: t('layout.nav.review') }]
      : []),
  ]

  // A slash boundary, so `/analytics` is not treated as `/audit`.
  const selectedPath =
    navItems.find((item) => currentPath === item.path || currentPath.startsWith(`${item.path}/`))
      ?.path ?? HOME_PATH

  const goHome = (event: MouseEvent): void => {
    // A click with a modifier belongs to the browser: it opens the link in a new tab.
    // So does any click when nobody handles navigation: the link then simply works.
    if (onNavigate === undefined || event.metaKey || event.ctrlKey || event.shiftKey) {
      return
    }
    event.preventDefault()
    onNavigate(HOME_PATH)
  }

  // Each choice (the three themes, the two languages) is one radio group: assistive tech hears
  // which item is chosen. The `role` and `aria-checked` reach the menu item element; the type of
  // an Ant Design item omits them.
  const radioItem = (
    key: string,
    checked: boolean,
    icon: ReactNode,
    label: ReactNode,
    onSelect: () => void,
  ): MenuItem => {
    const item = {
      key,
      icon,
      role: 'menuitemradio',
      'aria-checked': checked,
      label: (
        <span className={styles.themeOption}>
          {label}
          {checked ? <CheckOutlined aria-hidden /> : null}
        </span>
      ),
      onClick: onSelect,
    }
    return item
  }

  const themeItem = (key: ThemePreference, icon: ReactNode, label: string): MenuItem =>
    radioItem(`theme-${key}`, preference === key, icon, label, () => {
      setPreference(key)
    })

  const languageItem = (option: (typeof LANGUAGE_OPTIONS)[number]): MenuItem =>
    radioItem(`language-${option.key}`, language === option.key, null, option.label, () => {
      setLanguage(option.key)
    })

  const themeItems: MenuProps['items'] = [
    {
      type: 'group',
      key: 'theme',
      label: t('layout.theme.title'),
      children: [
        themeItem('system', <DesktopOutlined />, t('layout.theme.system')),
        themeItem('light', <SunOutlined />, t('layout.theme.light')),
        themeItem('dark', <MoonOutlined />, t('layout.theme.dark')),
      ],
    },
    {
      type: 'group',
      key: 'language',
      label: LANGUAGE_GROUP_TITLE,
      children: LANGUAGE_OPTIONS.map(languageItem),
    },
    { type: 'divider' },
    {
      key: 'docs',
      icon: <ReadOutlined />,
      // Only a real link: a click, Enter on the focused link, a middle click and "copy link" all
      // work natively. No onClick handler, or Enter would open the docs twice (handler + link).
      label: (
        <a href={DOCS_URL} rel="noopener noreferrer" target="_blank">
          {t('layout.docs')}
        </a>
      ),
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
              aria-label={t('layout.expandMenu')}
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
                aria-label={t('layout.collapseMenu')}
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
          label={t('layout.nav.label')}
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
