import type { HTMLAttributes, JSX, ReactNode } from 'react'

import { cx } from '../lib/cx'
import styles from './CodeBlock.module.css'

export interface CodeBlockProps extends Pick<
  HTMLAttributes<HTMLPreElement>,
  'role' | 'tabIndex' | 'aria-label'
> {
  children: ReactNode
  className?: string
  variant?: 'plain' | 'box'
}

/** Preformatted text in the code font: a JSON payload, a log. A long line scrolls sideways. */
export function CodeBlock(props: CodeBlockProps): JSX.Element {
  const { children, className, variant = 'plain', ...rest } = props
  return (
    <pre className={cx(styles.code, variant === 'box' && styles.box, className)} {...rest}>
      {children}
    </pre>
  )
}
