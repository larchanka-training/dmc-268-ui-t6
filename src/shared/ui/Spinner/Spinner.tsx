import type { JSX } from 'react'

import { cx } from '../lib/cx'
import styles from './Spinner.module.css'

export interface SpinnerProps {
  /** `inherit` takes the size from the font size of the parent, which is how Ant Design sizes it. */
  size?: 'sm' | 'md' | 'lg' | 'inherit'
  /** Accessible name. Pass `null` when the spinner only decorates something already labelled. */
  label?: string | null
  className?: string
}

/**
 * The loading ring of the design system. `DesignSystemProvider` installs it as the indicator of
 * every Ant Design `Spin`, so `<Spin />` and a loading `Table` show this ring too.
 */
export function Spinner(props: SpinnerProps): JSX.Element {
  const { size = 'md', label = 'Загрузка', className } = props
  if (label === null) {
    return <span aria-hidden="true" className={cx(styles.spinner, className)} data-size={size} />
  }
  return (
    <span
      aria-label={label}
      className={cx(styles.spinner, className)}
      data-size={size}
      role="status"
    />
  )
}
