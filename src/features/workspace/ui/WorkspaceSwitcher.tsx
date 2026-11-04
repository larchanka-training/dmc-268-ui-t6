import { ApartmentOutlined, CheckOutlined, UpOutlined } from '@ant-design/icons'
import { Dropdown, type MenuProps } from 'antd'
import { useRef, useState, type FC } from 'react'

import { useTranslation } from '../../../shared/i18n'
import { RowButton } from '../../../shared/ui'
import { useCurrentWorkspace } from '../model/useCurrentWorkspace'
import styles from './WorkspaceSwitcher.module.css'

export interface WorkspaceSwitcherProps {
  /** Shows only the icon, for a collapsed sidebar. */
  compact?: boolean
  /** Passed to `useCurrentWorkspace`: give it `isAuthenticated`. */
  enabled?: boolean
}

/**
 * Says which workspace is current. With several it is a menu to switch between them; with one there
 * is nothing to choose, so it is plain text and takes no focus.
 */
export const WorkspaceSwitcher: FC<WorkspaceSwitcherProps> = ({
  compact = false,
  enabled = true,
}) => {
  const { workspaces, current, select } = useCurrentWorkspace(enabled)
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null)

  if (current === null) {
    return null
  }

  const label = t('layout.workspace.current', { name: current.name })

  if (workspaces.length === 1) {
    return (
      <div className={compact ? styles.staticCompact : styles.static} title={label}>
        <ApartmentOutlined aria-hidden className={styles.icon} />
        <span className={styles.clipped}>{t('layout.workspace.title')}</span>
        <span className={compact ? styles.clipped : styles.name}>{current.name}</span>
      </div>
    )
  }

  // One radio group, as the theme and the language in the user menu. The `role` and `aria-checked`
  // reach the menu item element; the type of an Ant Design item omits them.
  const options = workspaces.map((workspace) => {
    const checked = workspace.id === current.id
    const item = {
      key: workspace.id,
      role: 'menuitemradio',
      'aria-checked': checked,
      label: (
        <span className={styles.option}>
          <span className={styles.optionText}>
            {workspace.name}
            <small>{t('layout.workspace.installation', { id: workspace.installationId })}</small>
          </span>
          {checked ? <CheckOutlined aria-hidden /> : null}
        </span>
      ),
      onClick: () => {
        select(workspace.id)
      },
    }
    return item
  })

  const items: MenuProps['items'] = [
    { type: 'group', key: 'workspaces', label: t('layout.workspace.title'), children: options },
  ]

  return (
    <Dropdown
      menu={{
        items,
        // Same reasons as the user menu: no tooltip repeating a whole label, and the focus goes back
        // to the button only after the key press is over, or the same Enter would reopen the menu.
        tooltip: false,
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
        aria-label={label}
        className={compact ? styles.triggerCompact : styles.trigger}
        ref={triggerRef}
        size="large"
        title={label}
      >
        <ApartmentOutlined aria-hidden className={styles.icon} />
        {compact ? null : <span className={styles.name}>{current.name}</span>}
        {compact ? null : <UpOutlined aria-hidden className={styles.chevron} />}
      </RowButton>
    </Dropdown>
  )
}
