import type { JSX } from 'react'

import { useTranslation } from '../../i18n'
import { cx } from '../lib/cx'
import styles from './Spinner.module.css'

export interface SpinnerProps {
  /** `inherit` takes the size from the font size of the parent, which is how Ant Design sizes it. */
  size?: 'sm' | 'md' | 'lg' | 'inherit'
  /**
   * Text for assistive tech, "Loading" in the current language by default. Pass `null` when the
   * spinner only decorates something already labelled.
   */
  label?: string | null
  className?: string
}

/**
 * The loading ring of the design system. `DesignSystemProvider` installs it as the indicator of
 * every Ant Design `Spin`, so `<Spin />` and a loading `Table` show this ring too. Under "reduce
 * motion" the ring keeps turning, three times slower: a stopped ring reads as a broken one.
 */
export function Spinner(props: SpinnerProps): JSX.Element {
  const { size = 'md', label, className } = props
  const { t } = useTranslation()
  if (label === null) {
    return <span aria-hidden="true" className={cx(styles.spinner, className)} data-size={size} />
  }
  return (
    <span className={cx(styles.spinner, className)} data-size={size} role="status">
      <span className={styles.label}>{label ?? t('common.loading')}</span>
    </span>
  )
}
