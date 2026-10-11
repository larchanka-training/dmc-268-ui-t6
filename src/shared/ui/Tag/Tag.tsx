import type { JSX, ReactNode } from 'react'

import { cx } from '../lib/cx'
import styles from './Tag.module.css'

export interface TagProps {
  /** Meaning of the tag. Colour never carries it alone: the label always says the same thing. */
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'high' | 'critical' | 'danger'
  /**
   * `dot` (default) reports a state. `solid` is reserved for what needs action: a critical
   * finding or a blocking verdict. `outline` is for metadata such as a branch or an engine.
   */
  variant?: 'dot' | 'solid' | 'outline'
  /** Animates the dot for a state that is in progress. Only with `variant="dot"`. */
  pulse?: boolean
  /** Icon before the label. Only with `variant="outline"`. */
  icon?: ReactNode
  className?: string
  children: ReactNode
}

export function Tag(props: TagProps): JSX.Element {
  const { tone = 'neutral', variant = 'dot', pulse = false, icon, className, children } = props
  return (
    <span className={cx(styles.tag, className)} data-tone={tone} data-variant={variant}>
      {variant === 'dot' ? (
        <span aria-hidden="true" className={styles.dot} data-pulse={pulse || undefined} />
      ) : null}
      {variant === 'outline' ? icon : null}
      {children}
    </span>
  )
}
