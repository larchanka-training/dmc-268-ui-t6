import { Menu } from 'antd'
import type { JSX, ReactNode } from 'react'

import { cx } from '../lib/cx'
import styles from './NavMenu.module.css'

export interface NavMenuItem {
  /** Address of the page; also the key of the item. */
  path: string
  icon: ReactNode
  label: string
}

export interface NavMenuProps {
  items: NavMenuItem[]
  /** `path` of the current page. */
  selectedPath?: string
  onNavigate?: (path: string) => void
  /** Accessible name of the navigation landmark. */
  label: string
  className?: string
}

/**
 * The navigation of the sidebar: Ant Design `Menu` with the indent and the item shape of the
 * design system, inside a `nav` landmark. Every item is a real link, so it opens in a new tab
 * and the current page is marked with `aria-current`. Inside a collapsed `Layout.Sider` the menu
 * folds to icons on its own.
 */
export function NavMenu(props: NavMenuProps): JSX.Element {
  const { items, selectedPath, onNavigate, label, className } = props
  return (
    <nav aria-label={label} className={cx(styles.nav, className)}>
      <Menu
        inlineIndent={8}
        items={items.map((item) => ({
          key: item.path,
          icon: item.icon,
          label: (
            <a
              aria-current={item.path === selectedPath ? 'page' : undefined}
              href={item.path}
              tabIndex={-1}
            >
              {item.label}
            </a>
          ),
        }))}
        mode="inline"
        onClick={({ key, domEvent }) => {
          // A click with a modifier belongs to the browser: it opens the link in a new tab.
          if (domEvent.metaKey || domEvent.ctrlKey || domEvent.shiftKey) {
            return
          }
          domEvent.preventDefault()
          onNavigate?.(key)
        }}
        selectedKeys={selectedPath === undefined ? [] : [selectedPath]}
      />
    </nav>
  )
}
