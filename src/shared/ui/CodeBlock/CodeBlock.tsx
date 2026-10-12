import type { JSX, ReactNode } from 'react'

import { cx } from '../lib/cx'
import styles from './CodeBlock.module.css'

export interface CodeBlockProps {
  children: ReactNode
  className?: string
}

/** Preformatted text in the code font: a JSON payload, a log. A long line scrolls sideways. */
export function CodeBlock(props: CodeBlockProps): JSX.Element {
  const { children, className } = props
  return <pre className={cx(styles.code, className)}>{children}</pre>
}
